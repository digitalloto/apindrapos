/**
 * UPIE Edge — Edge Processor (The Local Brain)
 * Patent Pending — AIMCRS
 *
 * WHAT THIS IS (simple explanation):
 *   This is a MINI UPIE that runs ON the platform (drone, fighter, submarine).
 *   It does three jobs:
 *
 *   1. CLEANS data — runs Kalman filter on every sensor reading
 *      BEFORE it enters the main fusion swarm
 *
 *   2. TRACKS motion — knows speed, direction, heading, acceleration
 *      Can PREDICT where the platform will be next
 *
 *   3. VALIDATES — compares fused position against predicted position
 *      If they disagree too much, raises alert (possible spoofing)
 *
 * KEY DESIGN PRINCIPLE:
 *   The edge processor can work STANDALONE — if it loses connection
 *   to the main system, it continues providing position from its
 *   local calculations. When connection resumes, it syncs.
 *
 * HOW IT FITS IN THE DATA FLOW:
 *
 *   [24 Sensors] → [EDGE: Clean + Track] → [SWARM: Fuse] → [OPERATOR]
 *        raw data        cleaned data        fused position     decision
 *
 * RUNS ON EDGE DEVICE — works even when disconnected.
 * HUMAN IN THE LOOP — provides data to operator, never decides.
 */

const { NoiseReducer } = require('./noise-reducer');
const MotionTracker = require('./motion-tracker');

class EdgeProcessor {
  constructor() {
    this.noiseReducer = new NoiseReducer();
    this.motionTracker = new MotionTracker();

    // Edge state
    this.running = true;
    this.connected = true;        // connected to main UPIE system
    this.processedCount = 0;
    this.lastProcessedTime = null;

    // Local fusion — used when disconnected from main system
    this.localPosition = null;
    this.localConfidence = 0;

    // Edge metrics — how much the edge processor is helping
    this.metrics = {
      totalReadingsCleaned: 0,
      totalSpikesRejected: 0,
      totalNoiseRemoved: 0,       // cumulative metres of noise removed
      trackValidations: 0,
      trackViolations: 0,         // times position disagreed with prediction
      avgNoisePerReading: 0
    };
  }

  /**
   * MAIN EDGE PIPELINE — process all readings before fusion
   *
   * Input: array of raw readings from all 24 layers
   * Output: array of CLEANED readings ready for the swarm
   *
   * This runs BEFORE the swarm fusion engine
   */
  processReadings(readings) {
    const cleaned = [];

    for (const reading of readings) {
      // Clean each reading through Kalman filter + spike detection
      const cleanedReading = this.noiseReducer.clean(reading);
      if (cleanedReading) {
        cleaned.push(cleanedReading);
        this.metrics.totalReadingsCleaned++;
      }
    }

    this.processedCount++;
    this.lastProcessedTime = Date.now();

    // Update metrics
    const stats = this.noiseReducer.getStats();
    let totalNoise = 0;
    let totalSpikes = 0;
    let totalProcessed = 0;
    for (const layerStats of Object.values(stats)) {
      totalNoise += layerStats.noiseReduced;
      totalSpikes += layerStats.spikesRejected;
      totalProcessed += layerStats.readingsProcessed;
    }
    this.metrics.totalNoiseRemoved = Math.round(totalNoise * 100) / 100;
    this.metrics.totalSpikesRejected = totalSpikes;
    this.metrics.avgNoisePerReading = totalProcessed > 0
      ? Math.round((totalNoise / totalProcessed) * 100) / 100
      : 0;

    return cleaned;
  }

  /**
   * After fusion — update motion tracker and validate position
   *
   * Call this AFTER the swarm produces a fused position
   * Returns validation result — does the position make sense?
   */
  postFusionUpdate(fusedResult) {
    if (!fusedResult || fusedResult.lat === null) return null;

    // Update motion tracker with the new fused position
    const motionState = this.motionTracker.update({
      lat: fusedResult.lat,
      lon: fusedResult.lon,
      alt: fusedResult.alt,
      timestamp: fusedResult.timestamp || Date.now()
    });

    // Validate — does this position match our predicted track?
    const validation = this.motionTracker.validatePosition(fusedResult);
    this.metrics.trackValidations++;

    if (!validation.valid) {
      this.metrics.trackViolations++;
    }

    // Store local position for standalone mode
    this.localPosition = {
      lat: fusedResult.lat,
      lon: fusedResult.lon,
      alt: fusedResult.alt,
      timestamp: Date.now()
    };

    return {
      motionState,
      validation,
      edgeMetrics: this.getMetrics()
    };
  }

  /**
   * STANDALONE MODE — when disconnected from main system
   * Uses motion tracker prediction as the best estimate
   */
  getStandalonePosition() {
    if (!this.localPosition) return null;

    const state = this.motionTracker.getState();
    if (state.predictedLat) {
      return {
        lat: state.predictedLat,
        lon: state.predictedLon,
        alt: state.predictedAlt,
        source: 'edge_prediction',
        confidence: Math.max(10, state.trackQuality - 20),
        message: 'DISCONNECTED — using edge motion prediction',
        timestamp: Date.now()
      };
    }

    // Fall back to last known position
    return {
      ...this.localPosition,
      source: 'edge_last_known',
      confidence: 5,
      message: 'DISCONNECTED — using last known position — STALE',
      timestamp: Date.now()
    };
  }

  /**
   * Get edge processor metrics — for dashboard
   */
  getMetrics() {
    return {
      ...this.metrics,
      running: this.running,
      connected: this.connected,
      processedCycles: this.processedCount,
      motionState: this.motionTracker.getState(),
      noiseStats: this.noiseReducer.getStats()
    };
  }

  /**
   * Get full edge state — for API
   */
  getState() {
    return {
      running: this.running,
      connected: this.connected,
      processedCount: this.processedCount,
      lastProcessedTime: this.lastProcessedTime,
      motionState: this.motionTracker.getState(),
      metrics: this.getMetrics(),
      localPosition: this.localPosition
    };
  }

  /**
   * Reset — used when platform changes
   */
  reset() {
    this.noiseReducer.reset();
    this.motionTracker.reset();
    this.processedCount = 0;
    this.localPosition = null;
    this.metrics = {
      totalReadingsCleaned: 0,
      totalSpikesRejected: 0,
      totalNoiseRemoved: 0,
      trackValidations: 0,
      trackViolations: 0,
      avgNoisePerReading: 0
    };
  }
}

module.exports = EdgeProcessor;
