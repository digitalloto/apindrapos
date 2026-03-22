/**
 * UPIE — Evasion Controller
 * Patent Pending — AIMCRS
 *
 * When threat is detected: break formation, scatter randomly,
 * each drone moves unpredictably. Reform when safe.
 *
 * Evasion patterns:
 *   RANDOM_SCATTER — each drone picks random heading (hardest to predict)
 *   SUNBURST — scatter outward from formation center
 *   SPLIT_PAIRS — split into pairs going opposite directions
 *   TERRAIN_HUG — drop altitude and use terrain for cover
 *
 * LAYER MODULE — evasion capability
 */

class EvasionController {
  constructor() {
    this.evasionActive = false;
    this.scatterPattern = 'RANDOM_SCATTER';
    this.reason = null;
    this.startCycle = 0;
    this.reformAfterCycles = 30;    // How long to scatter before reforming
    this.cyclesSinceEvasion = 0;
    this.evasionVectors = {};       // droneId -> vector
    this.rallyPoint = null;         // Where to reform (NOT original position)
    this.enabled = true;

    // Stats
    this.totalEvasions = 0;
    this.totalReforms = 0;
    this.evasionHistory = [];
  }

  /**
   * Trigger evasion — all drones scatter
   */
  triggerEvasion(reason, pattern, droneIds, dronePositions, cycle) {
    if (!this.enabled) return null;

    this.evasionActive = true;
    this.scatterPattern = pattern || 'RANDOM_SCATTER';
    this.reason = reason;
    this.startCycle = cycle;
    this.cyclesSinceEvasion = 0;
    this.totalEvasions++;

    // Generate evasion vector for each drone
    this.evasionVectors = {};
    const centerLat = dronePositions.length > 0
      ? dronePositions.reduce((s, p) => s + p.lat, 0) / dronePositions.length
      : 0;
    const centerLon = dronePositions.length > 0
      ? dronePositions.reduce((s, p) => s + p.lon, 0) / dronePositions.length
      : 0;

    for (let i = 0; i < droneIds.length; i++) {
      const droneId = droneIds[i];
      const pos = dronePositions[i] || { lat: centerLat, lon: centerLon };

      switch (this.scatterPattern) {
        case 'RANDOM_SCATTER':
          this.evasionVectors[droneId] = {
            heading: Math.random() * 360,
            speed: 200 + Math.random() * 300,
            jitter: true
          };
          break;

        case 'SUNBURST':
          // Scatter outward from center
          const angle = Math.atan2(pos.lon - centerLon, pos.lat - centerLat);
          this.evasionVectors[droneId] = {
            heading: (angle * 180 / Math.PI + 360) % 360,
            speed: 300 + Math.random() * 200,
            jitter: false
          };
          break;

        case 'SPLIT_PAIRS':
          // Pairs go opposite directions
          const pairAngle = Math.floor(i / 2) * (360 / Math.ceil(droneIds.length / 2));
          this.evasionVectors[droneId] = {
            heading: i % 2 === 0 ? pairAngle : (pairAngle + 180) % 360,
            speed: 250 + Math.random() * 150,
            jitter: true
          };
          break;

        case 'TERRAIN_HUG':
          // Random lateral + drop altitude
          this.evasionVectors[droneId] = {
            heading: Math.random() * 360,
            speed: 150 + Math.random() * 100,
            dropAltitude: true,
            jitter: true
          };
          break;
      }
    }

    // Set rally point — NOT the original position (unpredictable)
    this.rallyPoint = {
      lat: centerLat + (Math.random() - 0.5) * 0.01,  // Random offset ~500m
      lon: centerLon + (Math.random() - 0.5) * 0.01,
      alt: 100
    };

    const event = {
      cycle,
      reason,
      pattern: this.scatterPattern,
      droneCount: droneIds.length,
      timestamp: Date.now(),
      rallyPoint: { ...this.rallyPoint }
    };
    this.evasionHistory.push(event);

    return event;
  }

  /**
   * Get evasion vector for a specific drone
   */
  getEvasionVector(droneId) {
    return this.evasionVectors[droneId] || null;
  }

  /**
   * Advance evasion by one cycle — check if time to reform
   */
  tick(cycle) {
    if (!this.evasionActive) return { action: 'NONE' };

    this.cyclesSinceEvasion++;

    if (this.cyclesSinceEvasion >= this.reformAfterCycles) {
      return { action: 'REFORM', rallyPoint: this.rallyPoint };
    }

    return {
      action: 'EVADING',
      cyclesRemaining: this.reformAfterCycles - this.cyclesSinceEvasion,
      pattern: this.scatterPattern
    };
  }

  /**
   * Reform the swarm — called when safe
   */
  reform() {
    this.evasionActive = false;
    this.evasionVectors = {};
    this.totalReforms++;

    return {
      reforming: true,
      rallyPoint: this.rallyPoint,
      totalEvasions: this.totalEvasions,
      totalReforms: this.totalReforms
    };
  }

  /**
   * Force immediate reform (manual override)
   */
  forceReform() {
    return this.reform();
  }

  /**
   * Check if it's safe to reform (no active threats)
   */
  isSafeToReform(threatLevel) {
    return !this.evasionActive ||
      (this.cyclesSinceEvasion >= this.reformAfterCycles && threatLevel < 50);
  }

  /**
   * Get current evasion state
   */
  getState() {
    return {
      evasionActive: this.evasionActive,
      pattern: this.scatterPattern,
      reason: this.reason,
      cyclesSinceEvasion: this.cyclesSinceEvasion,
      reformIn: this.evasionActive
        ? Math.max(0, this.reformAfterCycles - this.cyclesSinceEvasion)
        : 0,
      rallyPoint: this.rallyPoint,
      dronesEvading: Object.keys(this.evasionVectors).length,
      totalEvasions: this.totalEvasions,
      totalReforms: this.totalReforms,
      history: this.evasionHistory.slice(-10)
    };
  }

  reset() {
    this.evasionActive = false;
    this.evasionVectors = {};
    this.rallyPoint = null;
    this.reason = null;
    this.cyclesSinceEvasion = 0;
    this.totalEvasions = 0;
    this.totalReforms = 0;
    this.evasionHistory = [];
  }
}

module.exports = EvasionController;
