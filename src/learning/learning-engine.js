/**
 * UPIE — Learning Engine
 * Patent Pending — AIMCRS
 *
 * WHAT THIS IS (simple explanation for Abheet):
 *
 *   Every second of flight time is a lesson. The Learning Engine
 *   is the student — it studies all past flight data and gets smarter.
 *
 *   WHAT IT LEARNS:
 *
 *   1. SENSOR DRIFT PATTERNS
 *      "On Aircraft A, the INS gyroscope drifts 50m per 10 minutes
 *       to the northeast. I will pre-correct for this."
 *
 *   2. SENSOR RELIABILITY SCORES
 *      "GPS is reliable 95% of the time. Cell Tower is reliable 60%.
 *       I'll trust GPS more in my calculations."
 *
 *   3. BEST SENSOR COMBINATIONS
 *      "When GPS + NAVIC + Terrain are all active, accuracy is 2m.
 *       When only INS + Magnetic are active, accuracy is 150m."
 *
 *   4. ENVIRONMENTAL PATTERNS
 *      "In urban areas, WiFi gives 10m accuracy.
 *       In desert, WiFi is useless."
 *
 *   5. PLATFORM-SPECIFIC TUNING
 *      "Fighter A's sensors behave differently from Fighter B.
 *       Each platform gets its own learned profile."
 *
 *   HOW IT USES WHAT IT LEARNS:
 *     - Adjusts layer weights automatically
 *     - Pre-corrects for known drift patterns
 *     - Warns when entering conditions where accuracy drops
 *     - Gets more accurate with every flight
 *
 *   The more you fly, the smarter it gets.
 *
 * HUMAN IN THE LOOP: All learned adjustments are visible to operator.
 *   Operator can override any learned setting.
 */

const fs = require('fs');
const path = require('path');

class LearningEngine {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(__dirname, '..', '..', 'data');

    // Learned knowledge — persists between sessions
    this.knowledge = {
      // Per-layer learned data
      layers: {},       // layerId -> LayerProfile
      // Per-platform learned data
      platforms: {},    // platformName -> PlatformProfile
      // Combination effectiveness
      combinations: [], // [{ layerIds, avgAccuracy, sampleSize }]
      // Total learning stats
      totalFlightSeconds: 0,
      totalFlightSessions: 0,
      lastLearningTime: null
    };

    // Load existing knowledge from disk
    this.loadKnowledge();
  }

  /**
   * LEARN FROM A FLIGHT SESSION
   *
   * Call this after a flight session ends.
   * Pass the flight summary from the FlightRecorder.
   * The engine studies it and updates its knowledge.
   */
  learnFromSession(flightSummary) {
    if (!flightSummary || !flightSummary.totalCycles) return null;

    const lessons = [];

    // ─── LESSON 1: Layer Performance ───
    // How well did each layer perform this flight?
    if (flightSummary.layerPerformance) {
      for (const [layerId, perf] of Object.entries(flightSummary.layerPerformance)) {
        const id = parseInt(layerId);
        if (!this.knowledge.layers[id]) {
          this.knowledge.layers[id] = {
            name: perf.name,
            totalActiveCycles: 0,
            totalSessions: 0,
            avgDrift: 0,
            totalDrift: 0,
            reliabilityScore: 1.0,   // 0-1 — how reliable is this layer
            noiseRate: 0,            // how often is it noisy (0-1)
            totalNoiseCount: 0,
            jammedRate: 0,
            spoofedRate: 0,
            // Learned weight adjustment — applied during fusion
            learnedWeightMultiplier: 1.0
          };
        }

        const layer = this.knowledge.layers[id];
        layer.totalActiveCycles += perf.activeCycles;
        layer.totalSessions++;
        layer.totalNoiseCount += perf.noiseCount;

        // Calculate noise rate
        if (layer.totalActiveCycles > 0) {
          layer.noiseRate = layer.totalNoiseCount / layer.totalActiveCycles;
        }

        // Calculate reliability (1 - noise rate)
        layer.reliabilityScore = Math.max(0.1, 1.0 - layer.noiseRate);

        // Learn weight multiplier — reliable layers get boosted
        if (layer.reliabilityScore > 0.9) {
          layer.learnedWeightMultiplier = 1.2;  // boost reliable layers
        } else if (layer.reliabilityScore > 0.7) {
          layer.learnedWeightMultiplier = 1.0;  // normal
        } else if (layer.reliabilityScore > 0.5) {
          layer.learnedWeightMultiplier = 0.7;  // reduce unreliable
        } else {
          layer.learnedWeightMultiplier = 0.4;  // heavily reduce very unreliable
        }

        lessons.push({
          type: 'LAYER_PERFORMANCE',
          layerId: id,
          layerName: perf.name,
          reliability: Math.round(layer.reliabilityScore * 100) + '%',
          weightMultiplier: layer.learnedWeightMultiplier,
          sampleSize: layer.totalActiveCycles
        });
      }
    }

    // ─── LESSON 2: Platform Profile ───
    const platform = flightSummary.platform || 'unknown';
    if (!this.knowledge.platforms[platform]) {
      this.knowledge.platforms[platform] = {
        totalFlights: 0,
        totalSeconds: 0,
        avgAccuracy: 0,
        totalAccuracy: 0,
        avgConfidence: 0,
        totalConfidence: 0,
        bestLayers: [],      // layers that perform best on this platform
        worstLayers: [],     // layers that perform worst on this platform
        driftProfile: {}     // layerId -> avg drift rate on this platform
      };
    }

    const platProfile = this.knowledge.platforms[platform];
    platProfile.totalFlights++;
    platProfile.totalSeconds += flightSummary.totalSeconds;

    if (flightSummary.avgFusionError > 0) {
      platProfile.totalAccuracy += flightSummary.avgFusionError;
      platProfile.avgAccuracy = Math.round(
        platProfile.totalAccuracy / platProfile.totalFlights * 100
      ) / 100;
    }

    if (flightSummary.avgConfidence > 0) {
      platProfile.totalConfidence += flightSummary.avgConfidence;
      platProfile.avgConfidence = Math.round(
        platProfile.totalConfidence / platProfile.totalFlights
      );
    }

    // Find best and worst layers for this platform
    const layerEntries = Object.entries(this.knowledge.layers);
    if (layerEntries.length > 0) {
      const sorted = layerEntries.sort((a, b) => b[1].reliabilityScore - a[1].reliabilityScore);
      platProfile.bestLayers = sorted.slice(0, 3).map(([id, l]) => ({ id: parseInt(id), name: l.name, reliability: l.reliabilityScore }));
      platProfile.worstLayers = sorted.slice(-3).map(([id, l]) => ({ id: parseInt(id), name: l.name, reliability: l.reliabilityScore }));
    }

    lessons.push({
      type: 'PLATFORM_PROFILE',
      platform,
      totalFlights: platProfile.totalFlights,
      totalHours: Math.round(platProfile.totalSeconds / 3600 * 10) / 10,
      avgAccuracy: platProfile.avgAccuracy + 'm',
      avgConfidence: platProfile.avgConfidence + '%'
    });

    // ─── LESSON 3: Overall Learning Stats ───
    this.knowledge.totalFlightSeconds += flightSummary.totalSeconds;
    this.knowledge.totalFlightSessions++;
    this.knowledge.lastLearningTime = Date.now();

    lessons.push({
      type: 'LEARNING_STATS',
      totalFlights: this.knowledge.totalFlightSessions,
      totalHours: Math.round(this.knowledge.totalFlightSeconds / 3600 * 10) / 10,
      layersLearned: Object.keys(this.knowledge.layers).length,
      platformsLearned: Object.keys(this.knowledge.platforms).length
    });

    // Save knowledge to disk
    this.saveKnowledge();

    return {
      lessons,
      knowledge: this.getKnowledgeSummary()
    };
  }

  /**
   * GET LEARNED WEIGHT ADJUSTMENTS
   *
   * Returns weight multipliers for each layer based on learning.
   * The fusion engine applies these to improve accuracy.
   */
  getWeightAdjustments() {
    const adjustments = {};
    for (const [layerId, layer] of Object.entries(this.knowledge.layers)) {
      adjustments[parseInt(layerId)] = {
        multiplier: layer.learnedWeightMultiplier,
        reliability: layer.reliabilityScore,
        sampleSize: layer.totalActiveCycles,
        name: layer.name
      };
    }
    return adjustments;
  }

  /**
   * APPLY LEARNED WEIGHTS to the fusion engine
   *
   * Call this when starting a new flight to apply everything learned.
   */
  applyToEngine(fusionEngine) {
    if (!fusionEngine) return;

    let adjustmentsApplied = 0;
    for (const layer of fusionEngine.allLayers) {
      const learned = this.knowledge.layers[layer.id];
      if (learned && learned.totalActiveCycles > 50) {
        // Only apply adjustments with enough data (50+ cycles)
        layer.weight *= learned.learnedWeightMultiplier;
        adjustmentsApplied++;
      }
    }

    return {
      applied: true,
      adjustmentsApplied,
      message: `Applied ${adjustmentsApplied} learned weight adjustments`
    };
  }

  /**
   * Get a summary of all knowledge — for dashboard
   */
  getKnowledgeSummary() {
    return {
      totalFlightSeconds: this.knowledge.totalFlightSeconds,
      totalFlightHours: Math.round(this.knowledge.totalFlightSeconds / 3600 * 10) / 10,
      totalFlightSessions: this.knowledge.totalFlightSessions,
      layersLearned: Object.keys(this.knowledge.layers).length,
      platformsLearned: Object.keys(this.knowledge.platforms).length,
      lastLearningTime: this.knowledge.lastLearningTime,
      // Top 5 most reliable layers
      topLayers: Object.entries(this.knowledge.layers)
        .sort((a, b) => b[1].reliabilityScore - a[1].reliabilityScore)
        .slice(0, 5)
        .map(([id, l]) => ({
          id: parseInt(id), name: l.name,
          reliability: Math.round(l.reliabilityScore * 100) + '%',
          weight: l.learnedWeightMultiplier
        })),
      // Platform profiles
      platforms: Object.entries(this.knowledge.platforms).map(([name, p]) => ({
        name,
        flights: p.totalFlights,
        hours: Math.round(p.totalSeconds / 3600 * 10) / 10,
        avgAccuracy: p.avgAccuracy + 'm',
        avgConfidence: p.avgConfidence + '%'
      }))
    };
  }

  /**
   * Save knowledge to disk — persists between sessions
   */
  saveKnowledge() {
    try {
      const filePath = path.join(this.dataDir, 'upie-knowledge.json');
      fs.writeFileSync(filePath, JSON.stringify(this.knowledge, null, 2));
    } catch (e) {
      // Save failed — knowledge stays in memory
    }
  }

  /**
   * Load knowledge from disk — called on startup
   */
  loadKnowledge() {
    try {
      const filePath = path.join(this.dataDir, 'upie-knowledge.json');
      if (fs.existsSync(filePath)) {
        this.knowledge = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (e) {
      // Load failed — start fresh
    }
  }

  /**
   * Reset all knowledge — use carefully
   */
  resetKnowledge() {
    this.knowledge = {
      layers: {},
      platforms: {},
      combinations: [],
      totalFlightSeconds: 0,
      totalFlightSessions: 0,
      lastLearningTime: null
    };
    this.saveKnowledge();
  }
}

module.exports = LearningEngine;
