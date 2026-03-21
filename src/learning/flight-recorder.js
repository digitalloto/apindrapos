/**
 * UPIE — Flight Recorder (Black Box for Positioning)
 * Patent Pending — AIMCRS
 *
 * WHAT THIS IS (simple explanation for Abheet):
 *
 *   Imagine a security camera that watches EVERY sensor, EVERY second.
 *   It records:
 *     - What each of the 24 sensors said
 *     - What the swarm consensus was
 *     - Which sensors were wrong (noise/spoofed)
 *     - How much drift each sensor had
 *     - What the confidence score was
 *     - Speed, heading, altitude, manoeuvres
 *     - What the onboard navigator calculated
 *     - What the edge processor cleaned
 *
 *   After the flight, you have a COMPLETE record of every
 *   positioning decision made. The Learning Engine then
 *   studies this record to get smarter.
 *
 *   Think of it like this:
 *     Flight 1: INS drifts 50m in 10 minutes on Aircraft A
 *     Flight 2: INS drifts 48m in 10 minutes on Aircraft A
 *     Flight 3: INS drifts 52m in 10 minutes on Aircraft A
 *     LEARNING: "On Aircraft A, INS drifts ~50m per 10 minutes.
 *               I will pre-correct for this on Flight 4."
 *
 * STORES DATA LOCALLY — no external dependency.
 * HUMAN IN THE LOOP — operator can review all recorded data.
 */

const fs = require('fs');
const path = require('path');

class FlightRecorder {
  constructor(dataDir) {
    // Where to store flight data
    this.dataDir = dataDir || path.join(__dirname, '..', '..', 'data');

    // Current flight session
    this.sessionId = null;
    this.sessionStartTime = null;
    this.recording = false;

    // In-memory buffer — writes to disk periodically
    this.buffer = [];
    this.maxBufferSize = 100;  // flush every 100 records

    // Flight summary — updated every cycle
    this.summary = {
      sessionId: null,
      platform: null,
      startTime: null,
      endTime: null,
      totalCycles: 0,
      totalSeconds: 0,
      // Accuracy tracking
      avgFusionError: 0,
      minFusionError: Infinity,
      maxFusionError: 0,
      totalFusionError: 0,
      // Layer performance
      layerPerformance: {},   // layerId -> { avgDrift, noiseCount, outlierCount }
      // Confidence tracking
      avgConfidence: 0,
      minConfidence: 100,
      maxConfidence: 0,
      totalConfidence: 0,
      // Alerts
      totalAlerts: 0,
      alertsByType: {},
      // Edge metrics
      totalNoiseRemoved: 0,
      totalSpikesRejected: 0,
      totalDriftCorrected: 0,
      // Movement
      totalDistanceMetres: 0,
      maxSpeedMps: 0,
      avgSpeedMps: 0,
      totalSpeedSum: 0
    };

    // Ensure data directory exists
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (e) {
      // Data dir creation failed — will use memory only
    }
  }

  /**
   * Start recording a new flight session
   */
  startSession(platform) {
    this.sessionId = `flight-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    this.sessionStartTime = Date.now();
    this.recording = true;
    this.buffer = [];

    this.summary = {
      sessionId: this.sessionId,
      platform: platform || 'unknown',
      startTime: this.sessionStartTime,
      endTime: null,
      totalCycles: 0,
      totalSeconds: 0,
      avgFusionError: 0,
      minFusionError: Infinity,
      maxFusionError: 0,
      totalFusionError: 0,
      layerPerformance: {},
      avgConfidence: 0,
      minConfidence: 100,
      maxConfidence: 0,
      totalConfidence: 0,
      totalAlerts: 0,
      alertsByType: {},
      totalNoiseRemoved: 0,
      totalSpikesRejected: 0,
      totalDriftCorrected: 0,
      totalDistanceMetres: 0,
      maxSpeedMps: 0,
      avgSpeedMps: 0,
      totalSpeedSum: 0
    };

    return {
      sessionId: this.sessionId,
      started: true,
      message: `Recording started — session ${this.sessionId}`
    };
  }

  /**
   * Record one fusion cycle — called every tick
   *
   * This is the MAIN recording function.
   * It captures everything from one fusion cycle.
   */
  recordCycle(fusionResult, layerStatuses, edgeMetrics, onboardNavState) {
    if (!this.recording) return;

    const timestamp = Date.now();
    const cycle = this.summary.totalCycles;

    // ─── BUILD THE RECORD ───
    const record = {
      cycle,
      timestamp,
      secondsSinceStart: (timestamp - this.sessionStartTime) / 1000,

      // Fused position
      fusedPosition: {
        lat: fusionResult.lat,
        lon: fusionResult.lon,
        alt: fusionResult.alt
      },
      fusionMode: fusionResult.fusionMode,
      confidence: fusionResult.confidence ? fusionResult.confidence.score : 0,
      confidenceLevel: fusionResult.confidence ? fusionResult.confidence.level : 'UNKNOWN',

      // Error (if true position known — simulation mode)
      errorMetres: fusionResult.errorMetres || null,

      // Layer snapshot — what each layer reported
      activeLayerCount: fusionResult.activeLayerCount,
      validLayerCount: fusionResult.validLayerCount,
      removedLayers: fusionResult.removedLayers || [],

      // Motion state
      speed: fusionResult.motionState ? fusionResult.motionState.velocityMps : 0,
      heading: fusionResult.motionState ? fusionResult.motionState.headingDeg : 0,
      acceleration: fusionResult.motionState ? fusionResult.motionState.accelerationMps2 : 0,
      manoeuvre: fusionResult.motionState ? fusionResult.motionState.manoeuvreType : null,

      // Alerts this cycle
      alerts: (fusionResult.spoofAlerts || []).map(a => ({
        type: a.type,
        severity: a.severity,
        message: a.message
      })),

      // Onboard navigator consensus
      onboardConsensus: fusionResult.onboardNav ? fusionResult.onboardNav.consensus : null,
      onboardConfidence: fusionResult.onboardNav ? fusionResult.onboardNav.confidence : 0,
      navSpread: fusionResult.onboardNav ? fusionResult.onboardNav.avgSpread : 0,
      noiseTrackers: fusionResult.onboardNav ? fusionResult.onboardNav.noiseTrackers : 0
    };

    // ─── UPDATE SUMMARY STATISTICS ───
    this.summary.totalCycles++;
    this.summary.totalSeconds = (timestamp - this.sessionStartTime) / 1000;

    // Error tracking
    if (record.errorMetres !== null && record.errorMetres !== undefined) {
      this.summary.totalFusionError += record.errorMetres;
      this.summary.avgFusionError = this.summary.totalFusionError / this.summary.totalCycles;
      this.summary.minFusionError = Math.min(this.summary.minFusionError, record.errorMetres);
      this.summary.maxFusionError = Math.max(this.summary.maxFusionError, record.errorMetres);
    }

    // Confidence tracking
    if (record.confidence > 0) {
      this.summary.totalConfidence += record.confidence;
      this.summary.avgConfidence = Math.round(this.summary.totalConfidence / this.summary.totalCycles);
      this.summary.minConfidence = Math.min(this.summary.minConfidence, record.confidence);
      this.summary.maxConfidence = Math.max(this.summary.maxConfidence, record.confidence);
    }

    // Alert tracking
    for (const alert of record.alerts) {
      this.summary.totalAlerts++;
      this.summary.alertsByType[alert.type] = (this.summary.alertsByType[alert.type] || 0) + 1;
    }

    // Speed tracking
    if (record.speed > 0) {
      this.summary.totalSpeedSum += record.speed;
      this.summary.avgSpeedMps = Math.round(this.summary.totalSpeedSum / this.summary.totalCycles * 100) / 100;
      this.summary.maxSpeedMps = Math.max(this.summary.maxSpeedMps, record.speed);
    }

    // Layer performance — track per-layer accuracy over time
    if (layerStatuses) {
      for (const layer of layerStatuses) {
        if (!this.summary.layerPerformance[layer.id]) {
          this.summary.layerPerformance[layer.id] = {
            name: layer.name,
            activeCycles: 0,
            totalDrift: 0,
            avgDrift: 0,
            noiseCount: 0,
            jammedCount: 0,
            spoofedCount: 0
          };
        }
        const perf = this.summary.layerPerformance[layer.id];
        if (layer.active) perf.activeCycles++;
        if (layer.jammed) perf.jammedCount++;
        if (layer.spoofed) perf.spoofedCount++;
      }
    }

    // Edge metrics
    if (edgeMetrics) {
      this.summary.totalNoiseRemoved = edgeMetrics.totalNoiseRemoved || 0;
      this.summary.totalSpikesRejected = edgeMetrics.totalSpikesRejected || 0;
    }

    // ─── BUFFER THE RECORD ───
    this.buffer.push(record);

    // Flush to disk periodically
    if (this.buffer.length >= this.maxBufferSize) {
      this.flushToDisk();
    }

    return record;
  }

  /**
   * Stop recording — end the flight session
   */
  stopSession() {
    if (!this.recording) return null;

    this.recording = false;
    this.summary.endTime = Date.now();
    this.summary.totalSeconds = (this.summary.endTime - this.sessionStartTime) / 1000;

    // Round summary values
    this.summary.avgFusionError = Math.round(this.summary.avgFusionError * 100) / 100;
    this.summary.minFusionError = this.summary.minFusionError === Infinity ? 0 : Math.round(this.summary.minFusionError * 100) / 100;
    this.summary.maxFusionError = Math.round(this.summary.maxFusionError * 100) / 100;
    this.summary.maxSpeedMps = Math.round(this.summary.maxSpeedMps * 100) / 100;

    // Flush remaining buffer
    this.flushToDisk();

    // Save summary
    this.saveSummary();

    return { ...this.summary };
  }

  /**
   * Flush buffer to disk as JSON lines file
   */
  flushToDisk() {
    if (this.buffer.length === 0) return;

    try {
      const filePath = path.join(this.dataDir, `${this.sessionId}-data.jsonl`);
      const lines = this.buffer.map(r => JSON.stringify(r)).join('\n') + '\n';
      fs.appendFileSync(filePath, lines);
      this.buffer = [];
    } catch (e) {
      // Disk write failed — keep in memory
    }
  }

  /**
   * Save flight summary to disk
   */
  saveSummary() {
    try {
      const filePath = path.join(this.dataDir, `${this.sessionId}-summary.json`);
      fs.writeFileSync(filePath, JSON.stringify(this.summary, null, 2));
    } catch (e) {
      // Summary save failed
    }
  }

  /**
   * Get the current flight summary — for dashboard
   */
  getSummary() {
    return { ...this.summary, recording: this.recording };
  }

  /**
   * List all past flight sessions
   */
  listSessions() {
    try {
      const files = fs.readdirSync(this.dataDir)
        .filter(f => f.endsWith('-summary.json'))
        .map(f => {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(this.dataDir, f), 'utf8'));
            return {
              sessionId: data.sessionId,
              platform: data.platform,
              startTime: data.startTime,
              totalCycles: data.totalCycles,
              totalSeconds: data.totalSeconds,
              avgFusionError: data.avgFusionError,
              avgConfidence: data.avgConfidence
            };
          } catch (e) {
            return null;
          }
        })
        .filter(s => s !== null);
      return files;
    } catch (e) {
      return [];
    }
  }

  /**
   * Load a past flight session summary
   */
  loadSession(sessionId) {
    try {
      const filePath = path.join(this.dataDir, `${sessionId}-summary.json`);
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return null;
    }
  }
}

module.exports = FlightRecorder;
