/**
 * UPIE — Onboard Navigator
 * Patent Pending — AIMCRS
 *
 * THE COMPLETE ONBOARD POSITIONING SYSTEM
 *
 * How it works (simple explanation):
 *
 *   1. ORIGIN LOCK: Platform starts at known exact coordinates
 *      (a base, a runway, a dock — coordinates known precisely)
 *
 *   2. INDEPENDENT TRACKING: Every sensor independently tracks
 *      movement from that starting point — each one calculates
 *      its OWN latitude and longitude
 *
 *   3. CROSS-CHECK: Every cycle, all trackers compare their answers
 *      The ones that agree form the CONSENSUS
 *      The ones that disagree are NOISE
 *
 *   4. NOISE CANCELLATION: Noisy trackers get gently pulled back
 *      toward the consensus. Over time, all trackers converge
 *      on the true position.
 *
 *   5. DRIFT LEARNING: The system learns HOW MUCH each sensor
 *      drifts on THIS SPECIFIC PLATFORM. After 100 cycles,
 *      it predicts and pre-corrects drift before it happens.
 *
 * RESULT: A position that is more accurate than ANY single sensor
 *   because the noise from each sensor cancels out against the others.
 *
 * RUNS ON THE DEVICE — completely self-contained.
 * HUMAN IN THE LOOP — all data goes to operator.
 */

const PathTracker = require('./path-tracker');

class OnboardNavigator {
  constructor() {
    // Origin — the exact starting coordinates
    this.originLocked = false;
    this.origin = { lat: 0, lon: 0, alt: 0 };
    this.originLockTime = null;

    // One PathTracker per positioning layer
    this.trackers = {};  // layerId -> PathTracker

    // Consensus position — the agreed position after noise cancellation
    this.consensus = { lat: null, lon: null, alt: null };
    this.consensusConfidence = 0;

    // How strongly to correct drifting trackers (0-1)
    // Low = gentle nudge, High = strong pull toward consensus
    this.correctionStrength = 0.15;

    // Cross-check results
    this.lastCrossCheck = null;
    this.cycleCount = 0;

    // Drift learning — platform-specific drift models
    this.driftModels = {};  // layerId -> { predictedDriftRate, confidence }

    // Statistics
    this.stats = {
      totalCrossChecks: 0,
      totalNoiseRejected: 0,    // times a tracker was marked as noise
      totalDriftCorrected: 0,   // total metres of drift corrected
      avgConsensusSpread: 0,    // how tight the consensus group is
      bestTracker: null,        // which tracker is most consistent
      worstTracker: null        // which tracker drifts the most
    };
  }

  /**
   * STEP 1: LOCK THE ORIGIN
   *
   * Set the exact starting coordinates.
   * Every tracker starts from this same point.
   * Call this once when the platform is at a known position
   * (base, runway, dock, launch pad).
   */
  lockOrigin(lat, lon, alt) {
    this.origin = { lat, lon, alt: alt || 0 };
    this.originLocked = true;
    this.originLockTime = Date.now();
    this.consensus = { lat, lon, alt: alt || 0 };
    this.cycleCount = 0;

    // Reset all existing trackers to the new origin
    for (const tracker of Object.values(this.trackers)) {
      tracker.setOrigin(lat, lon, alt);
    }

    return {
      locked: true,
      origin: { ...this.origin },
      timestamp: this.originLockTime,
      message: `Origin locked at ${lat.toFixed(6)}, ${lon.toFixed(6)}`
    };
  }

  /**
   * STEP 2: REGISTER A TRACKER
   *
   * Create a PathTracker for a positioning layer.
   * Each layer gets its own independent tracker.
   */
  registerTracker(layerId, layerName, config) {
    const tracker = new PathTracker(layerId, layerName, config || {});
    if (this.originLocked) {
      tracker.setOrigin(this.origin.lat, this.origin.lon, this.origin.alt);
    }
    this.trackers[layerId] = tracker;
    return tracker;
  }

  /**
   * STEP 3: FEED SENSOR DATA
   *
   * Feed readings from all layers. Each tracker independently
   * updates its position based on its sensor's data.
   *
   * Input: array of readings from the fusion engine's collect step
   *   Each reading has: { layerId, lat, lon, alt, timestamp }
   */
  feedReadings(readings) {
    if (!this.originLocked) return null;

    const timestamp = Date.now();

    for (const reading of readings) {
      let tracker = this.trackers[reading.layerId];

      // Auto-register tracker if it doesn't exist
      if (!tracker) {
        tracker = this.registerTracker(
          reading.layerId,
          reading.layerName || `Layer ${reading.layerId}`,
          { baseAccuracy: reading.accuracyMetres || 10 }
        );
      }

      if (!tracker.active) continue;

      // Feed the reading — tracker updates its own position
      if (reading.lat !== null && reading.lon !== null) {
        // Absolute position reading
        tracker.updateFromAbsolutePosition(
          reading.lat, reading.lon, reading.alt, timestamp
        );
      } else if (reading.velocityOnly) {
        // Velocity-only reading (like Doppler)
        tracker.updateFromVelocity(
          reading.velocityNorth || 0,
          reading.velocityEast || 0,
          reading.velocityVertical || 0,
          timestamp
        );
      }
    }

    // STEP 4: CROSS-CHECK — compare all trackers and find consensus
    const crossCheck = this.crossCheck();

    // STEP 5: CORRECT — nudge drifting trackers toward consensus
    this.correctDrift();

    // STEP 6: UPDATE DRIFT MODELS — learn this platform's drift patterns
    this.updateDriftModels();

    this.cycleCount++;
    return crossCheck;
  }

  /**
   * STEP 4: CROSS-CHECK
   *
   * All trackers compare their positions.
   * Find which ones agree (consensus group) and which disagree (noise).
   */
  crossCheck() {
    const activeTrackers = Object.values(this.trackers).filter(t =>
      t.active && t.readingCount > 0
    );

    if (activeTrackers.length < 2) {
      // Can't cross-check with less than 2 trackers
      if (activeTrackers.length === 1) {
        this.consensus = { ...activeTrackers[0].position };
        this.consensusConfidence = 30;
      }
      return this.lastCrossCheck;
    }

    // Calculate weighted median position (trust-weighted)
    const positions = activeTrackers.map(t => ({
      layerId: t.layerId,
      layerName: t.layerName,
      lat: t.position.lat,
      lon: t.position.lon,
      alt: t.position.alt,
      trust: t.trust,
      accuracy: t.baseAccuracy
    }));

    // Sort by trust — most trusted trackers define the consensus
    positions.sort((a, b) => b.trust - a.trust);

    // Weighted consensus — higher trust = more influence
    let totalWeight = 0;
    let wLat = 0;
    let wLon = 0;
    let wAlt = 0;

    for (const pos of positions) {
      const weight = pos.trust / Math.max(pos.accuracy, 1);
      wLat += pos.lat * weight;
      wLon += pos.lon * weight;
      wAlt += pos.alt * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) return this.lastCrossCheck;

    const consensusLat = wLat / totalWeight;
    const consensusLon = wLon / totalWeight;
    const consensusAlt = wAlt / totalWeight;

    // Now check each tracker's distance from consensus
    const trackerResults = [];
    let totalSpread = 0;
    let noiseCount = 0;

    for (const tracker of activeTrackers) {
      const dNorth = (tracker.position.lat - consensusLat) * 111320;
      const dEast = (tracker.position.lon - consensusLon) * 111320 *
        Math.cos(tracker.position.lat * Math.PI / 180);
      const distance = Math.sqrt(dNorth * dNorth + dEast * dEast);

      // Record drift for this tracker
      tracker.recordDrift(consensusLat, consensusLon);

      // Is this tracker noise? (too far from consensus)
      // Threshold scales with the tracker's expected accuracy
      const noiseThreshold = Math.max(tracker.baseAccuracy * 3, 50);
      const isNoise = distance > noiseThreshold;

      if (isNoise) noiseCount++;
      totalSpread += distance;

      trackerResults.push({
        layerId: tracker.layerId,
        layerName: tracker.layerName,
        distance: Math.round(distance * 100) / 100,
        trust: Math.round(tracker.trust * 100) / 100,
        isNoise,
        avgDrift: Math.round(tracker.avgDrift * 100) / 100
      });
    }

    // Update consensus
    this.consensus = {
      lat: Math.round(consensusLat * 1000000) / 1000000,
      lon: Math.round(consensusLon * 1000000) / 1000000,
      alt: Math.round(consensusAlt * 100) / 100
    };

    // Calculate consensus confidence
    const avgSpread = totalSpread / activeTrackers.length;
    const agreeingTrackers = activeTrackers.length - noiseCount;
    let confidence = 0;
    // More trackers agreeing = higher confidence
    confidence += Math.min(40, agreeingTrackers * 5);
    // Tighter spread = higher confidence
    if (avgSpread < 5) confidence += 30;
    else if (avgSpread < 20) confidence += 25;
    else if (avgSpread < 50) confidence += 20;
    else if (avgSpread < 200) confidence += 10;
    // More cycles = more data = higher confidence
    confidence += Math.min(20, this.cycleCount * 0.5);
    // No noise is good
    if (noiseCount === 0) confidence += 10;

    this.consensusConfidence = Math.min(100, Math.round(confidence));

    // Update statistics
    this.stats.totalCrossChecks++;
    this.stats.totalNoiseRejected += noiseCount;
    this.stats.avgConsensusSpread = Math.round(avgSpread * 100) / 100;

    // Find best and worst trackers
    const sorted = [...trackerResults].sort((a, b) => a.avgDrift - b.avgDrift);
    if (sorted.length > 0) {
      this.stats.bestTracker = sorted[0].layerName;
      this.stats.worstTracker = sorted[sorted.length - 1].layerName;
    }

    this.lastCrossCheck = {
      consensus: { ...this.consensus },
      confidence: this.consensusConfidence,
      trackers: trackerResults,
      activeCount: activeTrackers.length,
      noiseCount,
      avgSpread: Math.round(avgSpread * 100) / 100,
      cycle: this.cycleCount,
      timestamp: Date.now()
    };

    return this.lastCrossCheck;
  }

  /**
   * STEP 5: CORRECT DRIFT
   *
   * Gently pull drifting trackers back toward the consensus.
   * This is how noise gets CANCELLED — over time, all trackers
   * converge on the true position.
   *
   * Important: correction is GENTLE — we don't snap trackers
   * to the consensus. We nudge them. This preserves real
   * movement information while removing drift.
   */
  correctDrift() {
    if (!this.consensus.lat) return;

    let totalCorrected = 0;

    for (const tracker of Object.values(this.trackers)) {
      if (!tracker.active || tracker.readingCount === 0) continue;

      // Correction strength scales with how much this tracker is drifting
      // High drift = stronger correction
      // Low drift = gentle or no correction
      let strength = this.correctionStrength;

      if (tracker.avgDrift < 5) {
        strength = 0; // tracker is accurate — don't touch it
      } else if (tracker.avgDrift < 20) {
        strength *= 0.5; // mild drift — gentle correction
      } else if (tracker.avgDrift > 200) {
        strength *= 2; // heavy drift — stronger correction
      }

      // Low-trust trackers get corrected more aggressively
      if (tracker.trust < 0.5) {
        strength *= 1.5;
      }

      const beforeLat = tracker.position.lat;
      tracker.applyCorrection(this.consensus.lat, this.consensus.lon, strength);
      const correctionMetres = Math.abs(tracker.position.lat - beforeLat) * 111320;
      totalCorrected += correctionMetres;
    }

    this.stats.totalDriftCorrected += totalCorrected;
  }

  /**
   * STEP 6: LEARN DRIFT PATTERNS
   *
   * Over time, the system learns how much each sensor drifts
   * on THIS SPECIFIC platform. A gyroscope in Aircraft A
   * might drift differently than the same model in Aircraft B.
   *
   * After enough data, the system can PREDICT drift and
   * pre-correct it before it becomes an error.
   */
  updateDriftModels() {
    for (const tracker of Object.values(this.trackers)) {
      if (tracker.driftHistory.length < 10) continue; // need enough data

      this.driftModels[tracker.layerId] = {
        layerName: tracker.layerName,
        predictedDriftRate: tracker.driftRate,
        avgDrift: tracker.avgDrift,
        confidence: Math.min(100, tracker.driftHistory.length * 2),
        sampleSize: tracker.driftHistory.length
      };
    }
  }

  /**
   * Get the current agreed position — the final output
   */
  getPosition() {
    return {
      ...this.consensus,
      confidence: this.consensusConfidence,
      originLocked: this.originLocked,
      origin: { ...this.origin },
      timeSinceOrigin: this.originLockTime ? Date.now() - this.originLockTime : 0,
      cycle: this.cycleCount,
      source: 'onboard_navigator'
    };
  }

  /**
   * Get full state — for dashboard and API
   */
  getState() {
    return {
      originLocked: this.originLocked,
      origin: { ...this.origin },
      originLockTime: this.originLockTime,
      consensus: { ...this.consensus },
      consensusConfidence: this.consensusConfidence,
      cycleCount: this.cycleCount,
      trackerCount: Object.keys(this.trackers).length,
      trackers: Object.values(this.trackers).map(t => t.getState()),
      driftModels: this.driftModels,
      stats: { ...this.stats },
      lastCrossCheck: this.lastCrossCheck
    };
  }

  /**
   * Reset everything — used when platform repositions to new origin
   */
  reset() {
    this.originLocked = false;
    this.origin = { lat: 0, lon: 0, alt: 0 };
    this.originLockTime = null;
    this.trackers = {};
    this.consensus = { lat: null, lon: null, alt: null };
    this.consensusConfidence = 0;
    this.cycleCount = 0;
    this.driftModels = {};
    this.stats = {
      totalCrossChecks: 0, totalNoiseRejected: 0,
      totalDriftCorrected: 0, avgConsensusSpread: 0,
      bestTracker: null, worstTracker: null
    };
  }
}

module.exports = OnboardNavigator;
