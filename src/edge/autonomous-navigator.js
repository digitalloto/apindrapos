/**
 * UPIE — Autonomous Navigator — THE SELF-RELIANT BRAIN
 * Patent Pending — AIMCRS
 *
 * WHAT THIS DOES (simple explanation):
 *
 *   Think of it like a submarine captain:
 *
 *   1. INITIAL FIX: Use ALL 24 layers to get an EXACT position
 *      (every system agrees — this is ground truth)
 *
 *   2. GO DARK: The onboard AI takes over and navigates INDEPENDENTLY
 *      using dead reckoning, motion prediction, and internal sensors
 *      It does NOT rely on any external signals (GPS, WiFi, etc.)
 *
 *   3. SURFACE CHECK: Periodically (every N cycles), the AI "surfaces"
 *      to compare its own calculated position against ALL external layers
 *      If they agree → confidence stays high, go dark again
 *      If they disagree → something is wrong — either AI drifted or
 *      external signals are being jammed/spoofed
 *
 *   4. SELF-CORRECT: If the AI's position drifted, gently correct it
 *      If external signals look spoofed, IGNORE them and trust the AI
 *
 * WHY THIS MAKES UPIE ANTI-JAM, ANTI-SPOOF, ANTI-EXTERNAL:
 *
 *   - ANTI-JAM: Jammer takes out GPS? AI doesn't care — it's navigating
 *     on its own using dead reckoning. It only checks external signals
 *     occasionally. Jammer would need to jam ALL 24 systems simultaneously.
 *
 *   - ANTI-SPOOF: Fake GPS signal? AI knows where it SHOULD be based on
 *     its own calculations. If GPS says "you're 500km away" but AI says
 *     "I've been tracking every metre of movement and I'm HERE" — AI wins.
 *
 *   - ANTI-EXTERNAL: System works even if ALL external signals disappear.
 *     The onboard AI has its own position from dead reckoning, motion
 *     tracking, and internal sensors (INS, Doppler, Barometric, Quantum).
 *
 * HUMAN IN THE LOOP — Always. The operator sees everything:
 *   - AI's independent position
 *   - External layers' position
 *   - Agreement/disagreement
 *   - AI's confidence in its own calculation
 *   - Recommended action
 */

class AutonomousNavigator {
  constructor() {
    // ═══ PHASE 1: INITIAL FIX ═══
    // The exact position from all 24 layers agreeing
    this.initialFix = null;          // { lat, lon, alt, confidence, timestamp, layerCount }
    this.fixLocked = false;          // true once we have a trusted initial fix

    // ═══ PHASE 2: AUTONOMOUS MODE ═══
    // The AI's own calculated position (independent of external signals)
    this.autonomousPosition = { lat: null, lon: null, alt: null };
    this.autonomousConfidence = 0;   // 0-100 — how much AI trusts itself
    this.mode = 'ACQUIRING';         // ACQUIRING → AUTONOMOUS → SURFACE_CHECK → AUTONOMOUS

    // Dead reckoning state — AI tracks its own movement
    this.velocity = { north: 0, east: 0, vertical: 0 }; // m/s
    this.heading = 0;                // degrees
    this.lastUpdateTime = null;

    // ═══ PHASE 3: SURFACE CHECK ═══
    // Periodic check against external layers
    this.surfaceInterval = 10;       // Check every N cycles (configurable)
    this.cyclesSinceLastSurface = 0;
    this.totalCycles = 0;
    this.surfaceHistory = [];        // Log of all surface checks
    this.maxSurfaceHistory = 50;

    // ═══ PHASE 4: SELF-CORRECTION ═══
    this.driftAccumulated = 0;       // total metres of drift detected
    this.correctionApplied = 0;      // total metres of correction
    this.externalTrustLevel = 100;   // 0-100 — drops when external signals look wrong
    this.autonomousTrustLevel = 50;  // 0-100 — rises as AI proves accurate

    // ═══ ANTI-JAM / ANTI-SPOOF DETECTION ═══
    this.jammingDetected = false;
    this.spoofingDetected = false;
    this.lastExternalPosition = null;
    this.externalDisagreementCount = 0;
    this.externalAgreementCount = 0;

    // ═══ INTERNAL SENSORS (always available — can't be jammed) ═══
    this.internalLayerIds = [3, 11, 12, 24]; // INS, Barometric, Doppler, Quantum
    this.internalPosition = { lat: null, lon: null, alt: null };

    // ═══ STATISTICS ═══
    this.stats = {
      totalSurfaceChecks: 0,
      totalAgreements: 0,
      totalDisagreements: 0,
      totalDriftCorrected: 0,    // metres
      totalJammingEvents: 0,
      totalSpoofingRejected: 0,
      longestAutonomousStreak: 0, // cycles without external help
      currentAutonomousStreak: 0,
      avgSurfaceDeviation: 0,    // average disagreement in metres
      autonomousAccuracy: 0      // how accurate AI has been (compared to surface checks)
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: ACQUIRE INITIAL FIX
  // Use ALL available layers to get exact position
  // ═══════════════════════════════════════════════════════════

  /**
   * Feed a fused position from the main engine.
   * During ACQUIRING phase, we wait for a high-confidence fix.
   * Once we have it, we lock it and go autonomous.
   *
   * @param {Object} fusedResult - The main engine's fused position
   * @param {Array} readings - Raw readings from all layers
   * @param {Object} motionState - From motion tracker (velocity, heading, etc.)
   * @returns {Object} - Autonomous navigator state
   */
  update(fusedResult, readings, motionState) {
    if (!fusedResult || fusedResult.lat === null) {
      return this.getState();
    }

    const now = Date.now();
    this.totalCycles++;

    // ─── PHASE 1: ACQUIRING — waiting for good initial fix ───
    if (!this.fixLocked) {
      return this._acquireInitialFix(fusedResult, readings, now);
    }

    // ─── UPDATE INTERNAL SENSORS ───
    // These always work — can't be jammed externally
    this._updateInternalPosition(readings, now);

    // ─── PHASE 2: AUTONOMOUS NAVIGATION ───
    // Use dead reckoning + motion state to update AI's own position
    this._updateAutonomousPosition(motionState, now);

    // ─── PHASE 3: SURFACE CHECK ───
    this.cyclesSinceLastSurface++;

    if (this.cyclesSinceLastSurface >= this.surfaceInterval) {
      return this._surfaceCheck(fusedResult, readings, now);
    }

    // Between surface checks — AI is flying solo
    this.stats.currentAutonomousStreak++;
    if (this.stats.currentAutonomousStreak > this.stats.longestAutonomousStreak) {
      this.stats.longestAutonomousStreak = this.stats.currentAutonomousStreak;
    }

    return this.getState();
  }

  // ═══════════════════════════════════════════════════════════
  // INTERNAL: Acquire initial fix
  // ═══════════════════════════════════════════════════════════
  _acquireInitialFix(fusedResult, readings, now) {
    const confidence = fusedResult.confidence ? fusedResult.confidence.score : 0;
    const layerCount = fusedResult.activeLayerCount || 0;

    // Need at least 60% confidence and 3+ layers for initial fix
    if (confidence >= 60 && layerCount >= 3) {
      this.initialFix = {
        lat: fusedResult.lat,
        lon: fusedResult.lon,
        alt: fusedResult.alt || 0,
        confidence,
        layerCount,
        timestamp: now
      };
      this.fixLocked = true;
      this.autonomousPosition = {
        lat: fusedResult.lat,
        lon: fusedResult.lon,
        alt: fusedResult.alt || 0
      };
      this.autonomousConfidence = confidence;
      this.lastUpdateTime = now;
      this.mode = 'AUTONOMOUS';

      return this.getState();
    }

    // Not enough confidence yet — keep acquiring
    this.mode = 'ACQUIRING';
    return this.getState();
  }

  // ═══════════════════════════════════════════════════════════
  // INTERNAL: Update AI's own position using dead reckoning
  // ═══════════════════════════════════════════════════════════
  _updateAutonomousPosition(motionState, now) {
    if (!this.lastUpdateTime) {
      this.lastUpdateTime = now;
      return;
    }

    const dt = (now - this.lastUpdateTime) / 1000; // seconds
    if (dt <= 0 || dt > 10) { // skip if too long gap
      this.lastUpdateTime = now;
      return;
    }

    // Use motion tracker data if available
    if (motionState) {
      this.velocity.north = motionState.velocityNorth || 0;
      this.velocity.east = motionState.velocityEast || 0;
      this.velocity.vertical = motionState.velocityVertical || 0;
      this.heading = motionState.headingDeg || 0;
    }

    // Dead reckoning: new position = old position + velocity * time
    const dNorth = this.velocity.north * dt;  // metres north
    const dEast = this.velocity.east * dt;    // metres east
    const dVert = this.velocity.vertical * dt;

    // Convert metres to lat/lon
    this.autonomousPosition.lat += dNorth / 111320;
    this.autonomousPosition.lon += dEast / (111320 *
      Math.cos(this.autonomousPosition.lat * Math.PI / 180));
    this.autonomousPosition.alt += dVert;

    // Round for precision
    this.autonomousPosition.lat = Math.round(this.autonomousPosition.lat * 1000000) / 1000000;
    this.autonomousPosition.lon = Math.round(this.autonomousPosition.lon * 1000000) / 1000000;
    this.autonomousPosition.alt = Math.round(this.autonomousPosition.alt * 100) / 100;

    this.lastUpdateTime = now;

    // Confidence slowly decays when autonomous (drift accumulates)
    // Lose ~0.5% per cycle when flying solo
    this.autonomousConfidence = Math.max(10,
      this.autonomousConfidence - 0.5
    );
  }

  // ═══════════════════════════════════════════════════════════
  // INTERNAL: Update position from internal (unjammable) sensors
  // ═══════════════════════════════════════════════════════════
  _updateInternalPosition(readings, now) {
    if (!readings || readings.length === 0) return;

    // Filter to only internal sensors (INS, Barometric, Doppler, Quantum)
    const internalReadings = readings.filter(r =>
      this.internalLayerIds.includes(r.layerId) &&
      r.lat !== null && r.lon !== null
    );

    if (internalReadings.length === 0) return;

    // Weighted average of internal sensors
    let totalWeight = 0;
    let wLat = 0, wLon = 0, wAlt = 0;

    for (const r of internalReadings) {
      const weight = 1 / Math.max(r.accuracyMetres || 10, 1);
      wLat += r.lat * weight;
      wLon += r.lon * weight;
      wAlt += (r.alt || 0) * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      this.internalPosition = {
        lat: Math.round((wLat / totalWeight) * 1000000) / 1000000,
        lon: Math.round((wLon / totalWeight) * 1000000) / 1000000,
        alt: Math.round((wAlt / totalWeight) * 100) / 100
      };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: SURFACE CHECK
  // Compare AI's position against all external layers
  // ═══════════════════════════════════════════════════════════
  _surfaceCheck(fusedResult, readings, now) {
    this.cyclesSinceLastSurface = 0;
    this.mode = 'SURFACE_CHECK';
    this.stats.totalSurfaceChecks++;

    const externalLat = fusedResult.lat;
    const externalLon = fusedResult.lon;
    const externalConfidence = fusedResult.confidence ? fusedResult.confidence.score : 0;
    const externalLayerCount = fusedResult.activeLayerCount || 0;

    // Calculate deviation between AI and external
    const dNorth = (externalLat - this.autonomousPosition.lat) * 111320;
    const dEast = (externalLon - this.autonomousPosition.lon) * 111320 *
      Math.cos(this.autonomousPosition.lat * Math.PI / 180);
    const deviation = Math.sqrt(dNorth * dNorth + dEast * dEast);

    // Also compare against internal sensors
    let internalDeviation = 0;
    if (this.internalPosition.lat !== null) {
      const iN = (this.internalPosition.lat - this.autonomousPosition.lat) * 111320;
      const iE = (this.internalPosition.lon - this.autonomousPosition.lon) * 111320 *
        Math.cos(this.autonomousPosition.lat * Math.PI / 180);
      internalDeviation = Math.sqrt(iN * iN + iE * iE);
    }

    // ─── DECISION LOGIC ───
    let action = 'CONTINUE';
    let surfaceResult;

    if (deviation < 50) {
      // ═══ AGREEMENT: AI and external agree (within 50m) ═══
      // This is great — both sources confirm position
      this.externalAgreementCount++;
      this.externalDisagreementCount = Math.max(0, this.externalDisagreementCount - 1);
      this.jammingDetected = false;
      this.spoofingDetected = false;

      // Gently correct AI toward external (trust external when they agree)
      const correctionStrength = 0.3; // 30% pull toward external
      this.autonomousPosition.lat += (externalLat - this.autonomousPosition.lat) * correctionStrength;
      this.autonomousPosition.lon += (externalLon - this.autonomousPosition.lon) * correctionStrength;
      this.autonomousPosition.lat = Math.round(this.autonomousPosition.lat * 1000000) / 1000000;
      this.autonomousPosition.lon = Math.round(this.autonomousPosition.lon * 1000000) / 1000000;

      // Boost confidence — external confirms AI
      this.autonomousConfidence = Math.min(100,
        Math.max(this.autonomousConfidence, externalConfidence) + 5
      );

      // Increase external trust
      this.externalTrustLevel = Math.min(100, this.externalTrustLevel + 10);
      this.autonomousTrustLevel = Math.min(100, this.autonomousTrustLevel + 5);

      this.correctionApplied += deviation * correctionStrength;
      this.stats.totalDriftCorrected += deviation * correctionStrength;
      this.stats.totalAgreements++;

      action = 'CONFIRMED';
      surfaceResult = {
        type: 'AGREEMENT',
        deviation: Math.round(deviation * 100) / 100,
        message: `Surface check: AI and ${externalLayerCount} layers agree within ${Math.round(deviation)}m`,
        severity: 'LOW',
        recommendation: 'Position confirmed — returning to autonomous mode'
      };

    } else if (deviation < 200 && externalConfidence >= 70) {
      // ═══ MILD DISAGREEMENT: Small drift, external looks good ═══
      // AI probably drifted — correct toward external
      const correctionStrength = 0.5;
      this.autonomousPosition.lat += (externalLat - this.autonomousPosition.lat) * correctionStrength;
      this.autonomousPosition.lon += (externalLon - this.autonomousPosition.lon) * correctionStrength;
      this.autonomousPosition.lat = Math.round(this.autonomousPosition.lat * 1000000) / 1000000;
      this.autonomousPosition.lon = Math.round(this.autonomousPosition.lon * 1000000) / 1000000;

      this.driftAccumulated += deviation;
      this.correctionApplied += deviation * correctionStrength;
      this.stats.totalDriftCorrected += deviation * correctionStrength;
      this.stats.totalAgreements++;
      this.externalAgreementCount++;

      // Moderate confidence
      this.autonomousConfidence = Math.min(100,
        (this.autonomousConfidence + externalConfidence) / 2 + 5
      );

      action = 'CORRECTED';
      surfaceResult = {
        type: 'DRIFT_CORRECTED',
        deviation: Math.round(deviation * 100) / 100,
        message: `Surface check: AI drifted ${Math.round(deviation)}m — corrected`,
        severity: 'MEDIUM',
        recommendation: 'Drift corrected — returning to autonomous mode'
      };

    } else if (externalConfidence < 40 || externalLayerCount < 3) {
      // ═══ EXTERNAL UNRELIABLE: Few layers or low confidence ═══
      // This could mean jamming — external signals are degraded
      this.externalDisagreementCount++;
      this.jammingDetected = true;
      this.stats.totalJammingEvents++;

      // TRUST THE AI — external is unreliable
      this.externalTrustLevel = Math.max(0, this.externalTrustLevel - 20);
      this.autonomousTrustLevel = Math.min(100, this.autonomousTrustLevel + 10);

      // Use internal sensors to cross-check AI
      if (internalDeviation < 100 && this.internalPosition.lat !== null) {
        // Internal sensors agree with AI — strong evidence AI is right
        this.autonomousConfidence = Math.min(100, this.autonomousConfidence + 10);
      }

      action = 'JAMMING_SUSPECTED';
      surfaceResult = {
        type: 'JAMMING_SUSPECTED',
        deviation: Math.round(deviation * 100) / 100,
        message: `JAMMING SUSPECTED — only ${externalLayerCount} layers, ${externalConfidence}% confidence`,
        severity: 'HIGH',
        recommendation: 'AI navigating independently — external signals unreliable'
      };

    } else {
      // ═══ MAJOR DISAGREEMENT: AI and external significantly differ ═══
      // Could be spoofing or accumulated AI drift
      this.externalDisagreementCount++;

      // Check: does internal sensor agree with AI or external?
      if (this.internalPosition.lat !== null) {
        const extToIntN = (externalLat - this.internalPosition.lat) * 111320;
        const extToIntE = (externalLon - this.internalPosition.lon) * 111320 *
          Math.cos(this.internalPosition.lat * Math.PI / 180);
        const extToIntDev = Math.sqrt(extToIntN * extToIntN + extToIntE * extToIntE);

        if (internalDeviation < extToIntDev) {
          // Internal sensors agree with AI more than external
          // This means external is likely SPOOFED
          this.spoofingDetected = true;
          this.stats.totalSpoofingRejected++;
          this.externalTrustLevel = Math.max(0, this.externalTrustLevel - 30);
          this.autonomousTrustLevel = Math.min(100, this.autonomousTrustLevel + 15);

          action = 'SPOOFING_REJECTED';
          surfaceResult = {
            type: 'SPOOFING_DETECTED',
            deviation: Math.round(deviation * 100) / 100,
            message: `SPOOFING DETECTED — External deviates ${Math.round(deviation)}m, internal sensors confirm AI position`,
            severity: 'CRITICAL',
            recommendation: 'REJECTING external signals — AI + internal sensors trusted'
          };
        } else {
          // Internal sensors agree with external — AI has drifted badly
          // Hard correct AI
          const correctionStrength = 0.7;
          this.autonomousPosition.lat += (externalLat - this.autonomousPosition.lat) * correctionStrength;
          this.autonomousPosition.lon += (externalLon - this.autonomousPosition.lon) * correctionStrength;
          this.autonomousPosition.lat = Math.round(this.autonomousPosition.lat * 1000000) / 1000000;
          this.autonomousPosition.lon = Math.round(this.autonomousPosition.lon * 1000000) / 1000000;

          this.driftAccumulated += deviation;
          this.stats.totalDriftCorrected += deviation * correctionStrength;
          this.autonomousConfidence = Math.max(30, externalConfidence - 10);
          this.stats.totalDisagreements++;

          action = 'HARD_CORRECTED';
          surfaceResult = {
            type: 'AI_DRIFT_CORRECTED',
            deviation: Math.round(deviation * 100) / 100,
            message: `AI drifted ${Math.round(deviation)}m — hard correction applied (internal sensors confirm external)`,
            severity: 'HIGH',
            recommendation: 'AI position reset — increasing surface check frequency'
          };

          // Increase surface check frequency when AI is drifting
          this.surfaceInterval = Math.max(3, this.surfaceInterval - 2);
        }
      } else {
        // No internal sensor data — can't determine who's right
        // Conservative: partial correction toward external
        const correctionStrength = 0.3;
        this.autonomousPosition.lat += (externalLat - this.autonomousPosition.lat) * correctionStrength;
        this.autonomousPosition.lon += (externalLon - this.autonomousPosition.lon) * correctionStrength;
        this.autonomousPosition.lat = Math.round(this.autonomousPosition.lat * 1000000) / 1000000;
        this.autonomousPosition.lon = Math.round(this.autonomousPosition.lon * 1000000) / 1000000;

        this.stats.totalDisagreements++;

        action = 'UNCERTAIN';
        surfaceResult = {
          type: 'DISAGREEMENT_UNCERTAIN',
          deviation: Math.round(deviation * 100) / 100,
          message: `AI and external disagree by ${Math.round(deviation)}m — no internal sensors to arbitrate`,
          severity: 'HIGH',
          recommendation: 'HUMAN REVIEW REQUIRED — partial correction applied'
        };
      }
    }

    // Record surface check
    this.surfaceHistory.push({
      cycle: this.totalCycles,
      timestamp: now,
      aiPosition: { ...this.autonomousPosition },
      externalPosition: { lat: externalLat, lon: externalLon },
      deviation: Math.round(deviation * 100) / 100,
      action,
      result: surfaceResult
    });

    if (this.surfaceHistory.length > this.maxSurfaceHistory) {
      this.surfaceHistory.shift();
    }

    // Update running average deviation
    const totalDev = this.surfaceHistory.reduce((sum, s) => sum + s.deviation, 0);
    this.stats.avgSurfaceDeviation = Math.round(
      (totalDev / this.surfaceHistory.length) * 100
    ) / 100;

    // Reset autonomous streak counter
    this.stats.currentAutonomousStreak = 0;

    // Return to autonomous mode
    this.mode = 'AUTONOMOUS';
    this.lastSurfaceResult = surfaceResult;

    return this.getState();
  }

  // ═══════════════════════════════════════════════════════════
  // CONFIGURE
  // ═══════════════════════════════════════════════════════════

  /**
   * Set how often the AI surfaces to check external layers
   * Lower = more frequent checks (less autonomous, more accurate)
   * Higher = fewer checks (more autonomous, more drift risk)
   */
  setSurfaceInterval(cycles) {
    this.surfaceInterval = Math.max(3, Math.min(100, cycles));
  }

  /**
   * Force a surface check on the next cycle
   */
  forceSurfaceCheck() {
    this.cyclesSinceLastSurface = this.surfaceInterval;
  }

  /**
   * Reset — start over (new mission)
   */
  reset() {
    this.initialFix = null;
    this.fixLocked = false;
    this.autonomousPosition = { lat: null, lon: null, alt: null };
    this.autonomousConfidence = 0;
    this.mode = 'ACQUIRING';
    this.velocity = { north: 0, east: 0, vertical: 0 };
    this.heading = 0;
    this.lastUpdateTime = null;
    this.cyclesSinceLastSurface = 0;
    this.totalCycles = 0;
    this.surfaceHistory = [];
    this.driftAccumulated = 0;
    this.correctionApplied = 0;
    this.externalTrustLevel = 100;
    this.autonomousTrustLevel = 50;
    this.jammingDetected = false;
    this.spoofingDetected = false;
    this.lastExternalPosition = null;
    this.externalDisagreementCount = 0;
    this.externalAgreementCount = 0;
    this.internalPosition = { lat: null, lon: null, alt: null };
    this.lastSurfaceResult = null;
    this.surfaceInterval = 10;
    this.stats = {
      totalSurfaceChecks: 0,
      totalAgreements: 0,
      totalDisagreements: 0,
      totalDriftCorrected: 0,
      totalJammingEvents: 0,
      totalSpoofingRejected: 0,
      longestAutonomousStreak: 0,
      currentAutonomousStreak: 0,
      avgSurfaceDeviation: 0,
      autonomousAccuracy: 0
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GET STATE — for dashboard and API
  // ═══════════════════════════════════════════════════════════
  getState() {
    return {
      mode: this.mode,
      fixLocked: this.fixLocked,
      initialFix: this.initialFix ? { ...this.initialFix } : null,
      autonomousPosition: { ...this.autonomousPosition },
      autonomousConfidence: Math.round(this.autonomousConfidence),
      internalPosition: { ...this.internalPosition },
      surfaceInterval: this.surfaceInterval,
      cyclesSinceLastSurface: this.cyclesSinceLastSurface,
      nextSurfaceIn: Math.max(0, this.surfaceInterval - this.cyclesSinceLastSurface),
      totalCycles: this.totalCycles,
      externalTrustLevel: Math.round(this.externalTrustLevel),
      autonomousTrustLevel: Math.round(this.autonomousTrustLevel),
      jammingDetected: this.jammingDetected,
      spoofingDetected: this.spoofingDetected,
      driftAccumulated: Math.round(this.driftAccumulated * 100) / 100,
      correctionApplied: Math.round(this.correctionApplied * 100) / 100,
      lastSurfaceResult: this.lastSurfaceResult || null,
      stats: { ...this.stats }
    };
  }

  /**
   * Get the AI's best position estimate
   * Used when external signals are unavailable
   */
  getPosition() {
    return {
      lat: this.autonomousPosition.lat,
      lon: this.autonomousPosition.lon,
      alt: this.autonomousPosition.alt,
      confidence: Math.round(this.autonomousConfidence),
      mode: this.mode,
      source: 'autonomous_navigator'
    };
  }
}

module.exports = AutonomousNavigator;
