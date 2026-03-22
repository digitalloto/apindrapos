/**
 * UPIE — Drone Instance
 * Patent Pending — AIMCRS
 *
 * Each drone is an independent UPIE system with its own:
 *   - Fusion Engine (48 layers)
 *   - Autonomous Navigator
 *   - Intelligence modules (ban report, spoof tracker)
 *   - Position, heading, status
 *
 * Wraps existing single-drone components with a drone ID.
 *
 * LAYER MODULE — multi-drone capability
 */

const Simulator = require('../simulation/simulator');
const BanReport = require('../intelligence/ban-report');
const SpoofTracker = require('../intelligence/spoof-tracker');

class DroneInstance {
  constructor(droneId, config) {
    this.id = droneId;
    this.callsign = config.callsign || this._generateCallsign();
    this.platform = config.platform || 'small-drone';

    // Core UPIE system — each drone gets its own
    this.simulator = new Simulator();
    this.simulator.init(this.platform);

    // Set starting position
    if (config.startLat !== undefined && config.startLon !== undefined) {
      this.simulator.truePosition.lat = config.startLat;
      this.simulator.truePosition.lon = config.startLon;
      this.simulator.truePosition.alt = config.startAlt || 100;
    }

    // Intelligence modules
    this.banReport = new BanReport();
    this.spoofTracker = new SpoofTracker();

    // Drone state
    this.status = 'ACTIVE';       // ACTIVE, EVADING, RETURNING, LOST, DESTROYED
    this.formationSlot = null;    // Assigned slot in formation
    this.targetPosition = null;   // Where this drone should be (from formation)

    // Evasion state
    this.evasionMode = false;
    this.evasionVector = null;    // Direction to scatter
    this.evasionStartCycle = 0;

    // Communication
    this.lastHeartbeat = null;
    this.messagesReceived = 0;
    this.messagesSent = 0;

    // Health
    this.batteryPercent = 100;
    this.signalStrength = 100;
  }

  /**
   * Run one fusion cycle for this drone
   */
  tick() {
    const result = this.simulator.tick();

    // Attach drone ID to result
    result.droneId = this.id;
    result.callsign = this.callsign;
    result.status = this.status;
    result.formationSlot = this.formationSlot;
    result.evasionMode = this.evasionMode;
    result.batteryPercent = this.batteryPercent;

    // Simulate battery drain
    this.batteryPercent = Math.max(0, this.batteryPercent - 0.01);

    return result;
  }

  /**
   * Get current state
   */
  getState() {
    const simState = this.simulator.getState();
    return {
      droneId: this.id,
      callsign: this.callsign,
      platform: this.platform,
      status: this.status,
      position: this.simulator.truePosition,
      fusedPosition: simState.fusedPosition || null,
      confidence: simState.confidence || 0,
      formationSlot: this.formationSlot,
      evasionMode: this.evasionMode,
      batteryPercent: Math.round(this.batteryPercent),
      signalStrength: this.signalStrength,
      activeLayers: simState.activeLayerCount || 0,
      messagesReceived: this.messagesReceived,
      messagesSent: this.messagesSent
    };
  }

  /**
   * Get heartbeat — compact position data for mesh network
   */
  getHeartbeat() {
    const pos = this.simulator.truePosition;
    this.lastHeartbeat = {
      droneId: this.id,
      lat: pos.lat,
      lon: pos.lon,
      alt: pos.alt,
      confidence: this.simulator.engine
        ? (this.simulator.engine.lastResult?.confidence?.score || 0)
        : 0,
      status: this.status,
      batteryPercent: Math.round(this.batteryPercent),
      timestamp: Date.now()
    };
    return this.lastHeartbeat;
  }

  /**
   * Move drone toward a target position (for formation holding)
   */
  moveToward(targetLat, targetLon, targetAlt) {
    this.targetPosition = { lat: targetLat, lon: targetLon, alt: targetAlt || 100 };

    // Adjust true position toward target (simulation)
    const pos = this.simulator.truePosition;
    const moveRate = 0.3; // How fast to converge

    pos.lat += (targetLat - pos.lat) * moveRate;
    pos.lon += (targetLon - pos.lon) * moveRate;
    if (targetAlt) pos.alt += (targetAlt - pos.alt) * moveRate;
  }

  /**
   * Start evasion — scatter in a random direction
   */
  startEvasion(vector, cycle) {
    this.evasionMode = true;
    this.status = 'EVADING';
    this.evasionVector = vector || this._randomEvasionVector();
    this.evasionStartCycle = cycle;
  }

  /**
   * Execute one evasion movement step
   */
  evasionStep() {
    if (!this.evasionMode || !this.evasionVector) return;

    const pos = this.simulator.truePosition;
    // Move in evasion direction — fast and unpredictable
    const speed = 0.001 + Math.random() * 0.001; // Random speed variation
    pos.lat += Math.cos(this.evasionVector.heading * Math.PI / 180) * speed;
    pos.lon += Math.sin(this.evasionVector.heading * Math.PI / 180) * speed;

    // Add jitter for unpredictability
    pos.lat += (Math.random() - 0.5) * 0.0002;
    pos.lon += (Math.random() - 0.5) * 0.0002;
  }

  /**
   * Stop evasion and return to formation
   */
  stopEvasion() {
    this.evasionMode = false;
    this.status = 'RETURNING';
    this.evasionVector = null;
  }

  /**
   * Mark as back in formation
   */
  confirmInFormation() {
    this.status = 'ACTIVE';
  }

  _randomEvasionVector() {
    return {
      heading: Math.random() * 360,
      speed: 200 + Math.random() * 300 // 200-500 m/s burst
    };
  }

  _generateCallsign() {
    const prefixes = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO',
      'FOXTROT', 'GOLF', 'HOTEL', 'INDIA', 'JULIET'];
    const num = Math.floor(Math.random() * 99) + 1;
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${num}`;
  }
}

module.exports = DroneInstance;
