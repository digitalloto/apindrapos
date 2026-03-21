/**
 * UPIE Edge — Noise Reducer (Kalman Filter + Smoothing)
 * Patent Pending — AIMCRS
 *
 * WHAT THIS DOES (simple explanation):
 *   Every sensor reading has "noise" — small random errors that make
 *   the reading jump around. Like a shaky hand holding a compass —
 *   the needle wobbles even when you're standing still.
 *
 *   The Noise Reducer CLEANS each reading before it enters the fusion engine:
 *
 *   1. KALMAN FILTER — the gold standard for navigation noise reduction
 *      Think of it as: "I have a guess of where I am (prediction),
 *      and I have a new measurement. The truth is somewhere in between.
 *      If my prediction is very confident, I trust it more.
 *      If the measurement is very accurate, I trust it more."
 *
 *   2. SLIDING WINDOW — averages the last N readings to smooth out jitter
 *
 *   3. SPIKE FILTER — catches sudden impossible jumps (sensor glitches)
 *      Example: GPS says you jumped 5km in 0.1 seconds — impossible,
 *      reject that reading
 *
 * WHY IT MATTERS:
 *   Clean data in = better fusion out
 *   The swarm fish get CLEAN readings instead of noisy ones
 *   Less noise = tighter school = higher confidence score
 *
 * RUNS ON EDGE DEVICE — processes data before sending to main system
 */

class KalmanFilter1D {
  /**
   * A simple 1-dimensional Kalman filter
   *
   * processNoise = how much the real value changes between measurements
   *   (high for fast-moving platforms, low for slow/stationary)
   * measurementNoise = how noisy the sensor is
   *   (high for inaccurate sensors like INS, low for accurate like NAVIC)
   */
  constructor(processNoise, measurementNoise) {
    this.Q = processNoise;       // process noise (how much reality changes)
    this.R = measurementNoise;   // measurement noise (how noisy the sensor is)
    this.x = null;               // current estimate (null = not initialised)
    this.P = 1;                  // estimate uncertainty
  }

  /**
   * Feed a new measurement and get the cleaned (filtered) value back
   */
  update(measurement) {
    if (this.x === null) {
      // First measurement — just accept it
      this.x = measurement;
      this.P = this.R;
      return this.x;
    }

    // ── PREDICT STEP ──
    // Assume the value hasn't changed much (prediction = last estimate)
    // But increase uncertainty because time has passed
    this.P = this.P + this.Q;

    // ── UPDATE STEP ──
    // How much to trust the new measurement vs our prediction
    // K = 0 means "ignore measurement, trust prediction"
    // K = 1 means "ignore prediction, trust measurement"
    const K = this.P / (this.P + this.R);

    // New estimate = blend of prediction and measurement
    this.x = this.x + K * (measurement - this.x);

    // Update uncertainty
    this.P = (1 - K) * this.P;

    return this.x;
  }

  reset() {
    this.x = null;
    this.P = 1;
  }
}

class NoiseReducer {
  constructor() {
    // One Kalman filter per layer, per dimension (lat, lon, alt)
    this.filters = {};  // layerId -> { lat: KalmanFilter, lon: KalmanFilter, alt: KalmanFilter }

    // Sliding window for each layer — last N readings for averaging
    this.windows = {};  // layerId -> [reading1, reading2, ...]
    this.windowSize = 5;

    // Spike detection — maximum plausible movement per second
    this.maxSpeedMps = 3000;  // Mach 2.5 — fastest expected military platform
    this.lastReadings = {};   // layerId -> last reading with timestamp

    // Statistics per layer — how much noise was removed
    this.stats = {};  // layerId -> { readingsProcessed, spikesRejected, noiseReduced }
  }

  /**
   * Clean a reading from a specific layer
   *
   * Input: raw reading from a positioning layer
   * Output: cleaned reading with reduced noise
   *
   * The reading object is modified in place AND returned
   */
  clean(reading) {
    if (!reading || reading.lat === null || reading.lon === null) {
      return reading; // altitude-only and velocity-only pass through
    }

    const layerId = reading.layerId;

    // Initialise filters for this layer if needed
    if (!this.filters[layerId]) {
      this.initLayer(layerId, reading.accuracyMetres);
    }

    // Initialise stats
    if (!this.stats[layerId]) {
      this.stats[layerId] = { readingsProcessed: 0, spikesRejected: 0, noiseReduced: 0 };
    }

    this.stats[layerId].readingsProcessed++;

    // ── STEP 1: SPIKE FILTER ──
    // Reject readings that represent impossible movement
    if (this.isSpikeReading(reading)) {
      this.stats[layerId].spikesRejected++;
      // Return the last good reading instead
      const lastGood = this.lastReadings[layerId];
      if (lastGood) {
        reading.lat = lastGood.lat;
        reading.lon = lastGood.lon;
        reading.spikeFiltered = true;
      }
      return reading;
    }

    // Store original values to measure noise reduction
    const origLat = reading.lat;
    const origLon = reading.lon;

    // ── STEP 2: KALMAN FILTER ──
    // Smooth out random noise using mathematical prediction
    const filters = this.filters[layerId];
    reading.lat = filters.lat.update(reading.lat);
    reading.lon = filters.lon.update(reading.lon);
    if (reading.alt !== null) {
      reading.alt = filters.alt.update(reading.alt);
    }

    // ── STEP 3: SLIDING WINDOW AVERAGE ──
    // Further smooth by averaging with recent readings
    reading = this.applyWindow(layerId, reading);

    // Record noise reduction
    const dLat = Math.abs(origLat - reading.lat) * 111320;
    const dLon = Math.abs(origLon - reading.lon) * 111320;
    const noiseRemoved = Math.sqrt(dLat * dLat + dLon * dLon);
    this.stats[layerId].noiseReduced += noiseRemoved;

    // Mark as cleaned
    reading.edgeCleaned = true;

    // Save as last good reading
    this.lastReadings[layerId] = {
      lat: reading.lat,
      lon: reading.lon,
      alt: reading.alt,
      timestamp: reading.timestamp
    };

    return reading;
  }

  /**
   * Detect spike readings — impossible movement
   * Example: GPS says you teleported 50km in 1 second
   */
  isSpikeReading(reading) {
    const last = this.lastReadings[reading.layerId];
    if (!last) return false; // first reading — no spike possible

    const dt = (reading.timestamp - last.timestamp) / 1000; // seconds
    if (dt <= 0) return false;

    // Calculate distance moved
    const dLat = (reading.lat - last.lat) * 111320;
    const dLon = (reading.lon - last.lon) * 111320 *
      Math.cos(reading.lat * Math.PI / 180);
    const distance = Math.sqrt(dLat * dLat + dLon * dLon);

    // Speed = distance / time
    const speed = distance / dt;

    // If speed exceeds maximum plausible speed, it's a spike
    return speed > this.maxSpeedMps;
  }

  /**
   * Apply sliding window average — smooths out short-term jitter
   */
  applyWindow(layerId, reading) {
    if (!this.windows[layerId]) {
      this.windows[layerId] = [];
    }

    const window = this.windows[layerId];
    window.push({ lat: reading.lat, lon: reading.lon, alt: reading.alt });

    // Keep only last N readings
    if (window.length > this.windowSize) {
      window.shift();
    }

    // Average all readings in the window
    if (window.length >= 2) {
      let sumLat = 0, sumLon = 0, sumAlt = 0;
      for (const w of window) {
        sumLat += w.lat;
        sumLon += w.lon;
        sumAlt += (w.alt || 0);
      }
      reading.lat = sumLat / window.length;
      reading.lon = sumLon / window.length;
      if (reading.alt !== null) {
        reading.alt = sumAlt / window.length;
      }
    }

    return reading;
  }

  /**
   * Initialise Kalman filters for a new layer
   * Process noise and measurement noise are tuned based on layer accuracy
   */
  initLayer(layerId, accuracyMetres) {
    // Convert accuracy metres to degrees for Kalman filter
    const accDegrees = (accuracyMetres || 10) / 111320;

    // Process noise: how much the real position changes between readings
    // Higher for fast platforms, lower for slow/stationary
    const processNoise = accDegrees * 0.1;

    // Measurement noise: based on layer accuracy
    const measurementNoise = accDegrees;

    this.filters[layerId] = {
      lat: new KalmanFilter1D(processNoise, measurementNoise),
      lon: new KalmanFilter1D(processNoise, measurementNoise),
      alt: new KalmanFilter1D(processNoise * 111320, accuracyMetres || 10)
    };
  }

  /**
   * Get noise reduction statistics — for dashboard
   */
  getStats() {
    return this.stats;
  }

  /**
   * Reset all filters — used when platform changes
   */
  reset() {
    this.filters = {};
    this.windows = {};
    this.lastReadings = {};
    this.stats = {};
  }
}

module.exports = { NoiseReducer, KalmanFilter1D };
