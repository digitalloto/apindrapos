/**
 * UPIE — Onboard Navigator
 * Patent Pending — AIMCRS
 *
 * ═══════════════════════════════════════════════════════════════
 * WHAT THIS IS (simple explanation for Abheet):
 *
 *   Imagine you're standing at your front door. You know EXACTLY
 *   where that door is — latitude, longitude, altitude.
 *   That's your ORIGIN — your starting point.
 *
 *   Now you start walking. You have 10 different ways to measure
 *   your movement:
 *     - A pedometer counts your steps
 *     - A compass tells your direction
 *     - A GPS tracks your position
 *     - A speedometer measures your speed
 *     - Your eyes look at landmarks
 *     ...and more
 *
 *   EACH ONE independently calculates where you are now
 *   based on where you started + how you moved.
 *
 *   Every second, they all COMPARE their answers:
 *     "I think we're at position X"
 *     "I think we're at position Y"
 *     "I think we're at position Z"
 *
 *   If 8 out of 10 agree, and 2 disagree — the 2 are NOISE.
 *   Remove them. The remaining 8 average out to give you
 *   an incredibly precise position.
 *
 *   Over time, some systems drift (like INS). The cross-checking
 *   catches the drift EARLY — before it becomes a big error —
 *   and corrects it.
 *
 * THE KEY DIFFERENCE from regular fusion:
 *   Regular fusion: each layer gives an ABSOLUTE position
 *   Onboard Navigator: each layer tracks RELATIVE MOVEMENT from
 *     a known start point, independently calculating lat/lon
 *
 * ═══════════════════════════════════════════════════════════════
 *
 * RUNS ON THE DEVICE — completely self-contained.
 * HUMAN IN THE LOOP — all data goes to operator.
 */

/**
 * PathTracker — one per positioning layer
 *
 * Each PathTracker independently calculates position from the origin
 * by accumulating movement (speed x direction x time) since start.
 */
class PathTracker {
  constructor(layerId, layerName, config) {
    this.layerId = layerId;
    this.layerName = layerName;

    // The starting point — known exactly
    this.origin = { lat: 0, lon: 0, alt: 0 };

    // Current calculated position
    this.position = { lat: 0, lon: 0, alt: 0 };

    // Movement accumulation
    this.totalDistanceMetres = 0;
    this.totalTimeSeconds = 0;
    this.lastUpdateTime = null;

    // Velocity tracking
    this.velocityNorth = 0;   // m/s northward
    this.velocityEast = 0;    // m/s eastward
    this.velocityVertical = 0; // m/s up/down

    // Drift tracking — how much this tracker disagrees with consensus
    this.driftHistory = [];    // last 50 drift measurements
    this.maxDriftHistory = 50;
    this.avgDrift = 0;         // average drift in metres
    this.driftRate = 0;        // metres of drift per second
    this.driftCorrected = 0;   // how much drift has been corrected

    // Trust score — starts at 1.0, decreases if tracker keeps drifting
    this.trust = 1.0;

    // Layer-specific accuracy (metres) — how noisy this layer typically is
    this.baseAccuracy = config.baseAccuracy || 10;

    // Is this tracker active?
    this.active = true;

    // Readings counter
    this.readingCount = 0;
  }

  /**
   * Set the origin — the EXACT starting coordinates
   * Every PathTracker gets the same origin
   */
  setOrigin(lat, lon, alt) {
    this.origin = { lat, lon, alt: alt || 0 };
    this.position = { lat, lon, alt: alt || 0 };
    this.totalDistanceMetres = 0;
    this.totalTimeSeconds = 0;
    this.lastUpdateTime = null;  // null so first reading is accepted
    this.driftHistory = [];
    this.avgDrift = 0;
    this.driftRate = 0;
    this.trust = 1.0;
    this.readingCount = 0;
  }

  /**
   * Feed a new reading from this layer's sensor
   *
   * Two input modes:
   * A) ABSOLUTE position reading — layer gives lat/lon directly
   *    The tracker calculates movement from previous position
   * B) VELOCITY reading — layer gives speed and direction
   *    The tracker accumulates movement over time
   */
  updateFromAbsolutePosition(lat, lon, alt, timestamp) {
    const now = timestamp || Date.now();
    if (!this.lastUpdateTime) {
      this.lastUpdateTime = now;
      this.position = { lat, lon, alt: alt || this.position.alt };
      this.readingCount++;
      return this.position;
    }

    const dt = (now - this.lastUpdateTime) / 1000; // seconds
    if (dt <= 0) return this.position;

    // Calculate velocity from position change
    const dNorth = (lat - this.position.lat) * 111320;
    const dEast = (lon - this.position.lon) * 111320 *
      Math.cos(lat * Math.PI / 180);
    const dVert = (alt || 0) - (this.position.alt || 0);

    this.velocityNorth = dNorth / dt;
    this.velocityEast = dEast / dt;
    this.velocityVertical = dVert / dt;

    // Update position
    this.position = { lat, lon, alt: alt || this.position.alt };

    // Accumulate distance
    const distance = Math.sqrt(dNorth * dNorth + dEast * dEast);
    this.totalDistanceMetres += distance;
    this.totalTimeSeconds += dt;

    this.lastUpdateTime = now;
    this.readingCount++;
    return this.position;
  }

  updateFromVelocity(velocityNorth, velocityEast, velocityVertical, timestamp) {
    const now = timestamp || Date.now();
    if (!this.lastUpdateTime) {
      this.lastUpdateTime = now;
      return this.position;
    }

    const dt = (now - this.lastUpdateTime) / 1000;
    if (dt <= 0) return this.position;

    this.velocityNorth = velocityNorth;
    this.velocityEast = velocityEast;
    this.velocityVertical = velocityVertical || 0;

    // Accumulate position from velocity
    const dNorthMetres = velocityNorth * dt;
    const dEastMetres = velocityEast * dt;
    const dVertMetres = this.velocityVertical * dt;

    // Convert metres to degrees
    this.position.lat += dNorthMetres / 111320;
    this.position.lon += dEastMetres /
      (111320 * Math.cos(this.position.lat * Math.PI / 180));
    this.position.alt += dVertMetres;

    const distance = Math.sqrt(dNorthMetres * dNorthMetres + dEastMetres * dEastMetres);
    this.totalDistanceMetres += distance;
    this.totalTimeSeconds += dt;

    this.lastUpdateTime = now;
    this.readingCount++;
    return this.position;
  }

  /**
   * Record drift — how far this tracker is from the consensus position
   * Called by the CrossCheckEngine after consensus is calculated
   */
  recordDrift(consensusLat, consensusLon) {
    const dNorth = (this.position.lat - consensusLat) * 111320;
    const dEast = (this.position.lon - consensusLon) * 111320 *
      Math.cos(this.position.lat * Math.PI / 180);
    const drift = Math.sqrt(dNorth * dNorth + dEast * dEast);

    this.driftHistory.push({ drift, timestamp: Date.now() });
    if (this.driftHistory.length > this.maxDriftHistory) {
      this.driftHistory.shift();
    }

    // Calculate average drift
    const totalDrift = this.driftHistory.reduce((sum, d) => sum + d.drift, 0);
    this.avgDrift = totalDrift / this.driftHistory.length;

    // Calculate drift rate (how fast drift is growing)
    if (this.driftHistory.length >= 2) {
      const first = this.driftHistory[0];
      const last = this.driftHistory[this.driftHistory.length - 1];
      const timeDiff = (last.timestamp - first.timestamp) / 1000;
      if (timeDiff > 0) {
        this.driftRate = (last.drift - first.drift) / timeDiff;
      }
    }

    // Adjust trust based on drift
    if (this.avgDrift < 10) this.trust = Math.min(1.0, this.trust + 0.01);
    else if (this.avgDrift < 50) this.trust = Math.max(0.5, this.trust - 0.01);
    else if (this.avgDrift < 200) this.trust = Math.max(0.3, this.trust - 0.02);
    else this.trust = Math.max(0.1, this.trust - 0.05);

    return drift;
  }

  /**
   * Apply correction — nudge this tracker toward the consensus
   * This is how noise gets cancelled: drifting trackers get pulled back
   */
  applyCorrection(consensusLat, consensusLon, strength) {
    // strength: 0 = no correction, 1 = snap to consensus
    // typical: 0.1-0.3 = gentle nudge
    const correctionStrength = Math.min(strength, 0.5);

    const corrLat = (consensusLat - this.position.lat) * correctionStrength;
    const corrLon = (consensusLon - this.position.lon) * correctionStrength;

    this.position.lat += corrLat;
    this.position.lon += corrLon;

    this.driftCorrected += Math.abs(corrLat * 111320) + Math.abs(corrLon * 111320);
  }

  /**
   * Get tracker state — for dashboard
   */
  getState() {
    return {
      layerId: this.layerId,
      layerName: this.layerName,
      position: { ...this.position },
      origin: { ...this.origin },
      totalDistanceMetres: Math.round(this.totalDistanceMetres),
      totalTimeSeconds: Math.round(this.totalTimeSeconds),
      velocityNorth: Math.round(this.velocityNorth * 100) / 100,
      velocityEast: Math.round(this.velocityEast * 100) / 100,
      avgDrift: Math.round(this.avgDrift * 100) / 100,
      driftRate: Math.round(this.driftRate * 1000) / 1000,
      trust: Math.round(this.trust * 100) / 100,
      readingCount: this.readingCount,
      active: this.active
    };
  }
}

module.exports = PathTracker;
