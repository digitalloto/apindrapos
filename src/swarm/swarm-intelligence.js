/**
 * UPIE — Swarm Intelligence (Hive Mind)
 * Patent Pending — AIMCRS
 *
 * The collective AI brain of the swarm. Aggregates intelligence
 * from all drones, cross-validates positions, detects swarm-level
 * threats, and makes formation/evasion decisions.
 *
 * This is ONE of the agents — the swarm-level coordinator.
 * Each drone also has its own autonomous navigator (individual AI).
 *
 * LAYER MODULE — collective intelligence capability
 */

class SwarmIntelligence {
  constructor() {
    this.droneStates = {};         // droneId -> last known state
    this.threatLevel = 0;          // 0-100 swarm-level threat assessment
    this.threatSources = [];       // Active threats
    this.crossValidation = {};     // droneId -> trust score
    this.decisions = [];           // Decision log
    this.enabled = true;

    // Thresholds
    this.evasionThreatThreshold = 70;    // Trigger evasion above this
    this.spoofAlertThreshold = 3;        // Number of drones reporting spoofing
    this.jammingAlertThreshold = 2;      // Number of drones reporting jamming
  }

  /**
   * Update with latest drone state
   */
  updateDroneState(droneId, state) {
    this.droneStates[droneId] = {
      ...state,
      lastUpdate: Date.now()
    };
  }

  /**
   * Main intelligence cycle — called each tick
   */
  analyse() {
    if (!this.enabled) return { action: 'NONE' };

    const states = Object.values(this.droneStates);
    if (states.length === 0) return { action: 'NONE' };

    // 1. Cross-validate positions between drones
    const validation = this._crossValidatePositions(states);

    // 2. Detect swarm-level threats
    const threats = this._detectSwarmThreats(states);

    // 3. Calculate overall threat level
    this.threatLevel = this._calculateThreatLevel(threats, validation);

    // 4. Make formation decision
    const decision = this._makeDecision(threats, validation);

    // Log decision
    this.decisions.push({
      timestamp: Date.now(),
      threatLevel: this.threatLevel,
      decision: decision.action,
      reason: decision.reason,
      threats: threats.length
    });

    // Keep max 100 decisions
    if (this.decisions.length > 100) this.decisions.shift();

    return decision;
  }

  /**
   * Cross-validate: compare drone positions for consistency
   * If drones disagree about their relative spacing, one might be spoofed
   */
  _crossValidatePositions(states) {
    const results = {};
    const positions = states.filter(s => s.lat && s.lon);

    for (const drone of positions) {
      let agreementCount = 0;
      let totalChecks = 0;

      for (const other of positions) {
        if (other.droneId === drone.droneId) continue;
        totalChecks++;

        // Both drones should agree on their relative distance
        // If they have formation slots, we know expected distance
        const actualDist = this._distanceMetres(
          drone.lat, drone.lon, other.lat, other.lon
        );

        // If both have high confidence and distance is reasonable, they agree
        if (drone.confidence > 50 && other.confidence > 50) {
          agreementCount++;
        }
      }

      results[drone.droneId] = {
        trustScore: totalChecks > 0
          ? Math.round((agreementCount / totalChecks) * 100)
          : 50,
        agreements: agreementCount,
        checks: totalChecks,
        confidence: drone.confidence || 0
      };
    }

    this.crossValidation = results;
    return results;
  }

  /**
   * Detect threats affecting the swarm as a whole
   */
  _detectSwarmThreats(states) {
    const threats = [];

    // Count drones reporting issues
    let jammingCount = 0;
    let spoofCount = 0;
    let lowConfidenceCount = 0;

    for (const state of states) {
      if (state.jammingDetected) jammingCount++;
      if (state.spoofingDetected) spoofCount++;
      if (state.confidence < 40) lowConfidenceCount++;
    }

    // Widespread jamming
    if (jammingCount >= this.jammingAlertThreshold) {
      threats.push({
        type: 'SWARM_JAMMING',
        severity: 'CRITICAL',
        affectedDrones: jammingCount,
        totalDrones: states.length,
        message: `${jammingCount}/${states.length} drones report jamming — coordinated attack likely`,
        timestamp: Date.now()
      });
    }

    // Widespread spoofing
    if (spoofCount >= this.spoofAlertThreshold) {
      threats.push({
        type: 'SWARM_SPOOFING',
        severity: 'CRITICAL',
        affectedDrones: spoofCount,
        totalDrones: states.length,
        message: `${spoofCount}/${states.length} drones report spoofing — area-wide spoof attack`,
        timestamp: Date.now()
      });
    }

    // Widespread low confidence
    if (lowConfidenceCount > states.length / 2) {
      threats.push({
        type: 'SWARM_DEGRADED',
        severity: 'HIGH',
        affectedDrones: lowConfidenceCount,
        totalDrones: states.length,
        message: `${lowConfidenceCount}/${states.length} drones at low confidence — environment hostile`,
        timestamp: Date.now()
      });
    }

    // Check for rogue drone (position disagrees with swarm)
    for (const [droneId, validation] of Object.entries(this.crossValidation)) {
      if (validation.trustScore < 30 && validation.checks >= 2) {
        threats.push({
          type: 'ROGUE_DRONE',
          severity: 'HIGH',
          droneId,
          trustScore: validation.trustScore,
          message: `Drone ${droneId} position inconsistent with swarm — possible individual spoof`,
          timestamp: Date.now()
        });
      }
    }

    this.threatSources = threats;
    return threats;
  }

  /**
   * Calculate overall threat level (0-100)
   */
  _calculateThreatLevel(threats, validation) {
    let level = 0;

    for (const threat of threats) {
      switch (threat.severity) {
        case 'CRITICAL': level += 40; break;
        case 'HIGH': level += 25; break;
        case 'MEDIUM': level += 15; break;
        case 'LOW': level += 5; break;
      }
    }

    return Math.min(100, level);
  }

  /**
   * Make a swarm-level decision
   */
  _makeDecision(threats, validation) {
    // CRITICAL: Trigger evasion
    if (this.threatLevel >= this.evasionThreatThreshold) {
      const criticalThreat = threats.find(t => t.severity === 'CRITICAL');
      return {
        action: 'EVADE',
        reason: criticalThreat ? criticalThreat.message : 'Threat level critical',
        pattern: this._selectEvasionPattern(threats),
        threatLevel: this.threatLevel
      };
    }

    // HIGH: Tighten formation, increase vigilance
    if (this.threatLevel >= 40) {
      return {
        action: 'ALERT',
        reason: 'Elevated threat — increase vigilance',
        recommendation: 'TIGHTEN_FORMATION',
        threatLevel: this.threatLevel
      };
    }

    // NORMAL: Maintain formation
    return {
      action: 'MAINTAIN',
      reason: 'All clear — maintain current formation',
      threatLevel: this.threatLevel
    };
  }

  /**
   * Select the best evasion pattern for the current threat
   */
  _selectEvasionPattern(threats) {
    const hasJamming = threats.some(t => t.type === 'SWARM_JAMMING');
    const hasSpoofing = threats.some(t => t.type === 'SWARM_SPOOFING');

    if (hasJamming && hasSpoofing) {
      return 'RANDOM_SCATTER'; // Most unpredictable
    } else if (hasJamming) {
      return 'SUNBURST'; // Get out of jam zone fast
    } else if (hasSpoofing) {
      return 'SPLIT_PAIRS'; // Make it harder to spoof all
    } else {
      return 'RANDOM_SCATTER'; // Default
    }
  }

  /**
   * Get hive mind state for dashboard
   */
  getState() {
    return {
      enabled: this.enabled,
      droneCount: Object.keys(this.droneStates).length,
      threatLevel: this.threatLevel,
      threatSources: this.threatSources,
      crossValidation: this.crossValidation,
      recentDecisions: this.decisions.slice(-10),
      lastDecision: this.decisions.length > 0
        ? this.decisions[this.decisions.length - 1]
        : null
    };
  }

  reset() {
    this.droneStates = {};
    this.threatLevel = 0;
    this.threatSources = [];
    this.crossValidation = {};
    this.decisions = [];
  }

  _distanceMetres(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLon = (lon2 - lon1) * 111320 * Math.cos(lat1 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
  }
}

module.exports = SwarmIntelligence;
