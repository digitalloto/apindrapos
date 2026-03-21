/**
 * UPIE Edge — Motion Tracker
 * Patent Pending — AIMCRS
 *
 * WHAT THIS DOES (simple explanation):
 *   Imagine you're in a car. You know you were at Point A one second ago.
 *   You know you're going 60 km/h heading north.
 *   You can PREDICT that right now you're ~17 metres north of Point A.
 *
 *   This module does exactly that — but with military precision:
 *   - Tracks position history (where you WERE)
 *   - Calculates velocity (how FAST and which DIRECTION)
 *   - Calculates acceleration (speeding up or slowing down)
 *   - Predicts next position (where you WILL BE)
 *   - Detects sudden manoeuvres (sharp turn, dive, climb)
 *
 * WHY IT MATTERS FOR UPIE:
 *   If the fusion engine says "you're at position X" but the motion tracker
 *   says "based on your speed and direction, you SHOULD be at position Y"
 *   and X and Y disagree a lot — something is wrong. Maybe a sensor is spoofed.
 *   This adds another layer of cross-validation.
 *
 * RUNS ON EDGE DEVICE — works even when disconnected from main system.
 * HUMAN IN THE LOOP — provides data to operator, never decides.
 */

class MotionTracker {
  constructor() {
    // Position history — last N readings for trend calculation
    this.history = [];          // array of { lat, lon, alt, timestamp }
    this.maxHistory = 100;      // keep last 100 positions

    // Current motion state
    this.currentState = {
      lat: null,
      lon: null,
      alt: null,
      // Velocity — how fast and which direction
      velocityMps: 0,           // metres per second
      velocityNorth: 0,         // northward component (m/s)
      velocityEast: 0,          // eastward component (m/s)
      velocityVertical: 0,      // vertical component (m/s)
      headingDeg: 0,            // compass heading (0=north, 90=east, 180=south, 270=west)
      // Acceleration — speeding up or slowing down
      accelerationMps2: 0,      // metres per second per second
      // Predicted next position
      predictedLat: null,
      predictedLon: null,
      predictedAlt: null,
      // Manoeuvre detection
      manoeuvreDetected: false,
      manoeuvreType: null,      // 'turn', 'climb', 'dive', 'acceleration', 'deceleration'
      // Quality
      trackQuality: 0,          // 0-100 — how confident we are in the track
      timestamp: null
    };

    // Thresholds for manoeuvre detection
    this.turnThresholdDegPerSec = 15;    // degrees per second
    this.accelThresholdMps2 = 5;         // 5 m/s² = noticeable acceleration
    this.climbThresholdMps = 10;         // 10 m/s vertical = climb/dive
  }

  /**
   * Feed a new fused position into the motion tracker
   * Call this every fusion cycle with the latest fused result
   *
   * position = { lat, lon, alt, timestamp }
   */
  update(position) {
    if (!position || position.lat === null || position.lon === null) {
      return this.currentState;
    }

    const now = position.timestamp || Date.now();

    // Add to history
    this.history.push({
      lat: position.lat,
      lon: position.lon,
      alt: position.alt || 0,
      timestamp: now
    });

    // Trim history to max size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Need at least 2 positions to calculate motion
    if (this.history.length < 2) {
      this.currentState.lat = position.lat;
      this.currentState.lon = position.lon;
      this.currentState.alt = position.alt;
      this.currentState.timestamp = now;
      this.currentState.trackQuality = 10;
      return this.currentState;
    }

    // Calculate motion from last two positions
    const prev = this.history[this.history.length - 2];
    const curr = this.history[this.history.length - 1];
    const dt = (curr.timestamp - prev.timestamp) / 1000; // seconds

    if (dt <= 0) return this.currentState;

    // ─── VELOCITY CALCULATION ───
    // Distance moved in metres
    const dNorth = (curr.lat - prev.lat) * 111320;  // metres north
    const dEast = (curr.lon - prev.lon) * 111320 *
      Math.cos(curr.lat * Math.PI / 180);           // metres east
    const dVert = (curr.alt || 0) - (prev.alt || 0); // metres vertical

    const velocityNorth = dNorth / dt;
    const velocityEast = dEast / dt;
    const velocityVertical = dVert / dt;

    // Total horizontal speed
    const velocityMps = Math.sqrt(velocityNorth * velocityNorth + velocityEast * velocityEast);

    // ─── HEADING CALCULATION ───
    // Which direction are we going? (compass bearing)
    let headingDeg = Math.atan2(velocityEast, velocityNorth) * 180 / Math.PI;
    if (headingDeg < 0) headingDeg += 360;

    // ─── ACCELERATION CALCULATION ───
    let accelerationMps2 = 0;
    if (this.history.length >= 3) {
      const prevVel = this.currentState.velocityMps;
      accelerationMps2 = (velocityMps - prevVel) / dt;
    }

    // ─── MANOEUVRE DETECTION ───
    let manoeuvreDetected = false;
    let manoeuvreType = null;

    // Check for sharp turn
    if (this.currentState.headingDeg !== null) {
      let headingChange = Math.abs(headingDeg - this.currentState.headingDeg);
      if (headingChange > 180) headingChange = 360 - headingChange;
      const turnRate = headingChange / dt;
      if (turnRate > this.turnThresholdDegPerSec) {
        manoeuvreDetected = true;
        manoeuvreType = 'turn';
      }
    }

    // Check for climb/dive
    if (Math.abs(velocityVertical) > this.climbThresholdMps) {
      manoeuvreDetected = true;
      manoeuvreType = velocityVertical > 0 ? 'climb' : 'dive';
    }

    // Check for acceleration/deceleration
    if (Math.abs(accelerationMps2) > this.accelThresholdMps2) {
      manoeuvreDetected = true;
      manoeuvreType = accelerationMps2 > 0 ? 'acceleration' : 'deceleration';
    }

    // ─── PREDICT NEXT POSITION ───
    // Based on current velocity, where will we be in 1 second?
    const predDNorth = velocityNorth * 1.0;  // 1 second prediction
    const predDEast = velocityEast * 1.0;
    const predictedLat = curr.lat + (predDNorth / 111320);
    const predictedLon = curr.lon + (predDEast /
      (111320 * Math.cos(curr.lat * Math.PI / 180)));
    const predictedAlt = (curr.alt || 0) + velocityVertical;

    // ─── TRACK QUALITY ───
    // More history = better quality, consistent motion = better quality
    let trackQuality = Math.min(100, this.history.length * 5);
    if (manoeuvreDetected) trackQuality *= 0.7; // less confident during manoeuvres

    // ─── UPDATE STATE ───
    this.currentState = {
      lat: curr.lat,
      lon: curr.lon,
      alt: curr.alt,
      velocityMps: Math.round(velocityMps * 100) / 100,
      velocityNorth: Math.round(velocityNorth * 100) / 100,
      velocityEast: Math.round(velocityEast * 100) / 100,
      velocityVertical: Math.round(velocityVertical * 100) / 100,
      headingDeg: Math.round(headingDeg * 10) / 10,
      accelerationMps2: Math.round(accelerationMps2 * 100) / 100,
      predictedLat: Math.round(predictedLat * 1000000) / 1000000,
      predictedLon: Math.round(predictedLon * 1000000) / 1000000,
      predictedAlt: Math.round(predictedAlt * 100) / 100,
      manoeuvreDetected,
      manoeuvreType,
      trackQuality: Math.round(trackQuality),
      timestamp: now
    };

    return this.currentState;
  }

  /**
   * Check if a new fused position is CONSISTENT with predicted motion
   * Returns deviation in metres — if very high, something might be spoofed
   *
   * This is the KEY cross-validation:
   *   "I predicted you'd be HERE based on your movement.
   *    The sensors say you're THERE. How far apart are they?"
   */
  validatePosition(fusedPosition) {
    if (!this.currentState.predictedLat || !fusedPosition || fusedPosition.lat === null) {
      return { valid: true, deviationMetres: 0, message: 'Not enough data to validate' };
    }

    const dNorth = (fusedPosition.lat - this.currentState.predictedLat) * 111320;
    const dEast = (fusedPosition.lon - this.currentState.predictedLon) * 111320 *
      Math.cos(fusedPosition.lat * Math.PI / 180);
    const deviation = Math.sqrt(dNorth * dNorth + dEast * dEast);

    // Allow more deviation during manoeuvres (platform is turning/climbing)
    const threshold = this.currentState.manoeuvreDetected ? 500 : 100;

    if (deviation > threshold) {
      return {
        valid: false,
        deviationMetres: Math.round(deviation),
        message: `Position deviates ${Math.round(deviation)}m from predicted track — VERIFY`,
        severity: deviation > 1000 ? 'HIGH' : 'MEDIUM'
      };
    }

    return {
      valid: true,
      deviationMetres: Math.round(deviation),
      message: 'Position consistent with track'
    };
  }

  /**
   * Get current motion state — for dashboard
   */
  getState() {
    return { ...this.currentState, historyLength: this.history.length };
  }

  /**
   * Reset tracker — used when platform profile changes
   */
  reset() {
    this.history = [];
    this.currentState = {
      lat: null, lon: null, alt: null,
      velocityMps: 0, velocityNorth: 0, velocityEast: 0, velocityVertical: 0,
      headingDeg: 0, accelerationMps2: 0,
      predictedLat: null, predictedLon: null, predictedAlt: null,
      manoeuvreDetected: false, manoeuvreType: null,
      trackQuality: 0, timestamp: null
    };
  }
}

module.exports = MotionTracker;
