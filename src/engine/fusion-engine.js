/**
 * UPIE — AI Fusion Engine — THE CORE BRAIN
 * Patent Pending — AIMCRS
 *
 * This is the heart of UPIE. It does 4 things:
 *
 * STEP 1 — COLLECT: Gather readings from all active positioning layers
 * STEP 2 — COMPARE: Check which readings agree with each other
 * STEP 3 — CANCEL ERRORS: Remove readings that disagree with the majority
 * STEP 4 — OUTPUT: Produce one exact coordinate + confidence score
 *
 * HUMAN IN THE LOOP: This engine provides data to human operators.
 * It NEVER makes decisions. It calculates, presents, recommends.
 * The human decides. Always.
 */

const { createAllLayers } = require('../layers');
const ConfidenceScorer = require('./confidence-scorer');
const SpoofDetector = require('./spoof-detector');
const SwarmFusionEngine = require('./swarm-fusion');
const SensorInterface = require('../sensors/sensor-interface');
const EdgeProcessor = require('../edge/edge-processor');
const OnboardNavigator = require('../edge/onboard-navigator');
const AutonomousNavigator = require('../edge/autonomous-navigator');
const { FlightRecorder, LearningEngine } = require('../learning');

class FusionEngine {
  constructor(platformProfile) {
    this.allLayers = createAllLayers();
    this.confidenceScorer = new ConfidenceScorer();
    this.spoofDetector = new SpoofDetector();
    this.sensorInterface = new SensorInterface();
    this.swarmEngine = new SwarmFusionEngine();
    this.edgeProcessor = new EdgeProcessor();
    this.onboardNav = new OnboardNavigator();
    this.autoNav = new AutonomousNavigator();
    this.flightRecorder = new FlightRecorder();
    this.learningEngine = new LearningEngine();
    this.edgeEnabled = true;    // edge processing on by default
    this.fusionMode = 'swarm';  // 'swarm' (MiroFish) or 'weighted' (simple average)
    this.activeLayers = [];
    this.lastFusedResult = null;
    this.fusionCount = 0;
    this.history = [];  // last 100 results for drift learning

    // Apply platform profile — which layers are active
    if (platformProfile) {
      this.applyPlatformProfile(platformProfile);
    }
  }

  // Set which layers are active based on platform type
  applyPlatformProfile(profile) {
    const activeIds = profile.activeLayers || [];
    this.allLayers.forEach(layer => {
      layer.active = activeIds.includes(layer.id);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // MAIN FUSION CYCLE — runs every fraction of a second
  // ═══════════════════════════════════════════════════════════
  fuse(truePosition) {
    // ─── STEP 1: COLLECT raw readings ───
    let readings = this.collectReadings(truePosition);

    // ─── STEP 1.5: EDGE PROCESSING — clean readings before fusion ───
    // Kalman filter + spike detection + sliding window smoothing
    if (this.edgeEnabled) {
      readings = this.edgeProcessor.processReadings(readings);
    }

    // Separate banned readings — still tracked but excluded from fusion
    const allReadings = readings; // keep all for auto-ban tracking
    const activeReadings = readings.filter(r => !r._banned);

    let result;

    if (this.fusionMode === 'swarm') {
      // ═══ MIROFISH SWARM MODE ═══
      // Each layer is a fish — swarm finds consensus position
      const positionReadings = activeReadings.filter(r => r.lat !== null && r.lon !== null);
      const altitudeReadings = activeReadings.filter(r => r.altitudeOnly);
      const swarmResult = this.swarmEngine.fuse(positionReadings, altitudeReadings, this.allLayers);

      result = {
        ...swarmResult,
        activeLayerCount: activeReadings.length,
        validLayerCount: swarmResult.schoolSize,
        removedLayerCount: swarmResult.outerFish,
        removedLayers: swarmResult.outerFishNames || [],
        fusionMode: 'swarm'
      };

      // Spoof detection from outer fish
      result.spoofAlerts = this.spoofDetector.analyse(activeReadings, result);

    } else {
      // ═══ WEIGHTED AVERAGE MODE ═══
      // Classic approach — compare, cancel errors, weighted output
      const comparison = this.compareReadings(activeReadings);
      const filtered = this.cancelErrors(comparison);
      result = this.produceOutput(filtered);
      result.fusionMode = 'weighted';
      result.spoofAlerts = this.spoofDetector.analyse(activeReadings, result);
      result.confidence = this.confidenceScorer.calculate(filtered, result);
    }

    // ─── POST-FUSION: Edge motion tracking + validation ───
    if (this.edgeEnabled) {
      const edgeResult = this.edgeProcessor.postFusionUpdate(result);
      if (edgeResult) {
        result.motionState = edgeResult.motionState;
        result.trackValidation = edgeResult.validation;
        result.edgeMetrics = edgeResult.edgeMetrics;
        // Add track violation as spoof alert if detected
        if (edgeResult.validation && !edgeResult.validation.valid) {
          result.spoofAlerts = result.spoofAlerts || [];
          result.spoofAlerts.push({
            type: 'TRACK_VIOLATION',
            message: edgeResult.validation.message,
            severity: edgeResult.validation.severity || 'MEDIUM',
            action: 'HUMAN REVIEW — position inconsistent with predicted track',
            timestamp: Date.now()
          });
        }
      }

      // ─── ONBOARD NAVIGATOR: Independent path tracking + cross-check ───
      // Auto-lock origin on first fused position if not already locked
      if (!this.onboardNav.originLocked && result.lat !== null) {
        this.onboardNav.lockOrigin(result.lat, result.lon, result.alt);
      }
      // Feed all readings into independent path trackers
      if (this.onboardNav.originLocked) {
        const navResult = this.onboardNav.feedReadings(readings);
        if (navResult) {
          result.onboardNav = {
            consensus: navResult.consensus,
            confidence: navResult.confidence,
            activeTrackers: navResult.activeCount,
            noiseTrackers: navResult.noiseCount,
            avgSpread: navResult.avgSpread,
            cycle: navResult.cycle
          };
        }
      }
    }

    // ─── AUTONOMOUS NAVIGATOR: Self-reliant AI brain ───
    // Feeds fused result + raw readings + motion state
    // AI navigates independently and surfaces periodically to cross-check
    {
      const autoNavResult = this.autoNav.update(
        result,
        readings,
        result.motionState || null
      );
      if (autoNavResult) {
        result.autoNav = {
          mode: autoNavResult.mode,
          fixLocked: autoNavResult.fixLocked,
          autonomousPosition: autoNavResult.autonomousPosition,
          autonomousConfidence: autoNavResult.autonomousConfidence,
          internalPosition: autoNavResult.internalPosition,
          nextSurfaceIn: autoNavResult.nextSurfaceIn,
          surfaceInterval: autoNavResult.surfaceInterval,
          externalTrustLevel: autoNavResult.externalTrustLevel,
          autonomousTrustLevel: autoNavResult.autonomousTrustLevel,
          jammingDetected: autoNavResult.jammingDetected,
          spoofingDetected: autoNavResult.spoofingDetected,
          driftAccumulated: autoNavResult.driftAccumulated,
          lastSurfaceResult: autoNavResult.lastSurfaceResult,
          stats: autoNavResult.stats
        };

        // If autonomous navigator detects spoofing, add alert
        if (autoNavResult.lastSurfaceResult &&
            autoNavResult.lastSurfaceResult.type === 'SPOOFING_DETECTED') {
          result.spoofAlerts = result.spoofAlerts || [];
          result.spoofAlerts.push({
            type: 'AUTO_NAV_SPOOF',
            message: autoNavResult.lastSurfaceResult.message,
            severity: 'CRITICAL',
            action: autoNavResult.lastSurfaceResult.recommendation,
            timestamp: Date.now()
          });
        }

        // If jamming detected, add alert
        if (autoNavResult.lastSurfaceResult &&
            autoNavResult.lastSurfaceResult.type === 'JAMMING_SUSPECTED') {
          result.spoofAlerts = result.spoofAlerts || [];
          result.spoofAlerts.push({
            type: 'AUTO_NAV_JAMMING',
            message: autoNavResult.lastSurfaceResult.message,
            severity: 'HIGH',
            action: autoNavResult.lastSurfaceResult.recommendation,
            timestamp: Date.now()
          });
        }
      }
    }

    // ─── AUTO-BAN: Detect and ban consistently wrong layers ───
    result.autoBanAlerts = this._autoBanCheck(allReadings, result);
    result.autoBanStats = this._getAutoBanStats();

    // ─── FLIGHT RECORDER: Log this cycle ───
    if (this.flightRecorder.recording) {
      this.flightRecorder.recordCycle(
        result,
        this.getLayerStatuses(),
        result.edgeMetrics,
        result.onboardNav
      );
    }

    // Store history for drift learning
    this.fusionCount++;
    result.fusionCycle = this.fusionCount;
    this.history.push({ timestamp: Date.now(), result });
    if (this.history.length > 100) this.history.shift();

    this.lastFusedResult = result;
    return result;
  }

  // ─── STEP 1: COLLECT ───
  // Gather position readings from all active layers simultaneously
  // Uses REAL sensor data when available, simulated data otherwise
  collectReadings(truePosition) {
    const readings = [];
    for (const layer of this.allLayers) {
      if (!layer.active) continue;

      // Check if real sensor data is available for this layer
      const realReading = this.sensorInterface.getReading(layer.id);
      if (realReading) {
        if (layer.banned) realReading._banned = true;
        readings.push(realReading);
        continue;
      }

      // Fall back to simulation
      const reading = layer.generateReading(truePosition);
      if (reading) {
        if (layer.banned) reading._banned = true;
        readings.push(reading);
      }
    }
    return readings;
  }

  // ─── STEP 2: COMPARE ───
  // Compare all readings against each other
  // Calculate statistical agreement between them
  compareReadings(readings) {
    // Separate position readings from altitude-only and velocity-only
    const positionReadings = readings.filter(r => r.lat !== null && r.lon !== null);
    const altitudeReadings = readings.filter(r => r.altitudeOnly);
    const velocityReadings = readings.filter(r => r.velocityOnly);

    if (positionReadings.length === 0) {
      return { positionReadings: [], altitudeReadings, velocityReadings, outliers: [] };
    }

    // Calculate median position — the "middle" of all readings
    const medianLat = this.median(positionReadings.map(r => r.lat));
    const medianLon = this.median(positionReadings.map(r => r.lon));

    // Calculate how far each reading is from the median
    for (const reading of positionReadings) {
      reading.distanceFromMedian = this.haversineMetres(
        reading.lat, reading.lon, medianLat, medianLon
      );
    }

    // Find outliers — readings that are too far from the median
    // "Too far" = more than 3x the median distance (statistical outlier)
    const distances = positionReadings.map(r => r.distanceFromMedian);
    const medianDistance = this.median(distances);
    const outlierThreshold = Math.max(medianDistance * 3, 50); // at least 50m threshold

    const outliers = [];
    for (const reading of positionReadings) {
      if (reading.distanceFromMedian > outlierThreshold) {
        reading.isOutlier = true;
        outliers.push(reading);
      } else {
        reading.isOutlier = false;
      }
    }

    return { positionReadings, altitudeReadings, velocityReadings, outliers };
  }

  // ─── STEP 3: CANCEL ERRORS ───
  // Remove outlier readings, weight remaining by accuracy
  cancelErrors(comparison) {
    const { positionReadings, altitudeReadings, velocityReadings, outliers } = comparison;

    // Remove outliers — these are the readings that disagree with the majority
    const validReadings = positionReadings.filter(r => !r.isOutlier);

    // Flag outlier layers in the spoof detector
    for (const outlier of outliers) {
      const layer = this.allLayers.find(l => l.id === outlier.layerId);
      if (layer) {
        layer.weight *= 0.5;  // reduce trust in this layer
      }
    }

    return {
      validReadings,
      removedReadings: outliers,
      altitudeReadings,
      velocityReadings,
      totalActive: positionReadings.length + altitudeReadings.length + velocityReadings.length,
      totalValid: validReadings.length
    };
  }

  // ─── STEP 4: OUTPUT ───
  // Produce one exact coordinate with weighted average
  produceOutput(filtered) {
    const { validReadings, altitudeReadings, velocityReadings } = filtered;

    if (validReadings.length === 0) {
      return {
        lat: null, lon: null, alt: null,
        confidence: 0,
        activeLayerCount: filtered.totalActive,
        validLayerCount: 0,
        status: 'NO_POSITION',
        message: 'ALERT — No valid position readings — HUMAN ACTION REQUIRED',
        timestamp: Date.now()
      };
    }

    // Weighted average — layers with better accuracy get more say
    // IMPORTANT: Position weight and altitude weight are tracked SEPARATELY
    // because altitude-only layers (barometric) should not dilute lat/lon
    let posWeight = 0;
    let altWeight = 0;
    let weightedLat = 0;
    let weightedLon = 0;
    let weightedAlt = 0;

    for (const reading of validReadings) {
      const layer = this.allLayers.find(l => l.id === reading.layerId);
      // Weight = layer weight / accuracy (lower accuracy number = better = higher weight)
      const accuracyWeight = 1 / Math.max(reading.accuracyMetres, 0.1);
      const combinedWeight = (layer ? layer.weight : 1.0) * accuracyWeight;

      weightedLat += reading.lat * combinedWeight;
      weightedLon += reading.lon * combinedWeight;
      posWeight += combinedWeight;

      if (reading.alt !== null) {
        weightedAlt += reading.alt * combinedWeight;
        altWeight += combinedWeight;
      }
    }

    // Add barometric altitude readings (these are altitude specialists)
    for (const altReading of altitudeReadings) {
      if (altReading.alt !== null) {
        const baroWeight = 1 / Math.max(altReading.accuracyMetres, 0.1);
        weightedAlt += altReading.alt * baroWeight;
        altWeight += baroWeight;
      }
    }

    const fusedLat = weightedLat / posWeight;
    const fusedLon = weightedLon / posWeight;
    const fusedAlt = altWeight > 0 ? weightedAlt / altWeight : 0;

    return {
      lat: Math.round(fusedLat * 1000000) / 1000000,
      lon: Math.round(fusedLon * 1000000) / 1000000,
      alt: Math.round(fusedAlt * 100) / 100,
      activeLayerCount: filtered.totalActive,
      validLayerCount: filtered.totalValid,
      removedLayerCount: filtered.removedReadings ? filtered.removedReadings.length : 0,
      removedLayers: filtered.removedReadings
        ? filtered.removedReadings.map(r => r.layerName)
        : [],
      status: 'POSITION_FIXED',
      timestamp: Date.now(),
      fusionCycle: this.fusionCount
    };
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  // Calculate median of an array (the middle value)
  median(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Distance between two coordinates in metres (Haversine formula)
  haversineMetres(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in metres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ═══════════════════════════════════════════════════════════
  // AUTO-BAN SYSTEM
  // If a layer is consistently an outlier (coordinates way off from
  // the consensus), automatically ban it from fusion calculations.
  // The human operator sees which layers are banned and can override.
  // ═══════════════════════════════════════════════════════════

  _autoBanCheck(readings, result) {
    const alerts = [];
    if (result.lat === null || result.lon === null) return alerts;

    const BAN_THRESHOLD = 5;       // consecutive outlier cycles before ban
    const REINSTATE_CYCLES = 20;   // how many cycles before re-testing a banned layer
    const OUTLIER_DISTANCE = 200;  // metres — deviation threshold

    for (const layer of this.allLayers) {
      if (!layer.active) continue;

      // Find this layer's reading
      const reading = readings.find(r => r.layerId === layer.id);
      if (!reading || reading.lat === null || reading.lon === null) continue;

      // Skip altitude-only and velocity-only
      if (reading.altitudeOnly || reading.velocityOnly) continue;

      // Calculate distance from fused position
      const deviation = this.haversineMetres(
        reading.lat, reading.lon, result.lat, result.lon
      );

      if (deviation > OUTLIER_DISTANCE) {
        layer.consecutiveOutliers++;

        // BAN: layer has been consistently wrong
        if (layer.consecutiveOutliers >= BAN_THRESHOLD && !layer.banned) {
          layer.banned = true;
          layer.banCount++;
          layer.weight = 0.1; // near-zero weight
          alerts.push({
            type: 'AUTO_BAN',
            message: `Layer ${layer.id} (${layer.name}) BANNED — ${Math.round(deviation)}m off for ${layer.consecutiveOutliers} consecutive cycles`,
            severity: 'HIGH',
            action: `Layer excluded from fusion — click layer card to manually override`,
            timestamp: Date.now()
          });
        }
      } else {
        // Layer agrees with consensus
        if (layer.banned) {
          // Reinstate if it's been good
          layer.consecutiveOutliers = Math.max(0, layer.consecutiveOutliers - 2);
          if (layer.consecutiveOutliers <= 0) {
            layer.banned = false;
            layer.weight = Math.max(0.5, layer.weight); // restore some weight
            alerts.push({
              type: 'AUTO_REINSTATE',
              message: `Layer ${layer.id} (${layer.name}) REINSTATED — position now agrees with consensus`,
              severity: 'LOW',
              action: `Layer restored to fusion — monitoring continues`,
              timestamp: Date.now()
            });
          }
        } else {
          layer.consecutiveOutliers = Math.max(0, layer.consecutiveOutliers - 1);
        }
      }
    }

    return alerts;
  }

  _getAutoBanStats() {
    const banned = this.allLayers.filter(l => l.banned);
    const totalBans = this.allLayers.reduce((sum, l) => sum + l.banCount, 0);
    const totalReinstated = totalBans - banned.length;

    // Find worst offender
    let worstLayer = null;
    let worstBans = 0;
    for (const layer of this.allLayers) {
      if (layer.banCount > worstBans) {
        worstBans = layer.banCount;
        worstLayer = layer;
      }
    }

    return {
      currentlyBanned: banned.length,
      totalBanned: totalBans,
      totalReinstated: Math.max(0, totalReinstated),
      bannedLayers: banned.map(l => ({ id: l.id, name: l.name, banCount: l.banCount })),
      worstOffender: worstLayer ? `${worstLayer.name} (${worstBans}x)` : '—'
    };
  }

  // Get status of all layers for the dashboard
  getLayerStatuses() {
    return this.allLayers.map(layer => layer.getStatus());
  }

  // Get the last fused result
  getLastResult() {
    return this.lastFusedResult;
  }
}

module.exports = FusionEngine;
