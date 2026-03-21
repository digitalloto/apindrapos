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

class FusionEngine {
  constructor(platformProfile) {
    this.allLayers = createAllLayers();
    this.confidenceScorer = new ConfidenceScorer();
    this.spoofDetector = new SpoofDetector();
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
    // ─── STEP 1: COLLECT ───
    const readings = this.collectReadings(truePosition);

    // ─── STEP 2: COMPARE ───
    const comparison = this.compareReadings(readings);

    // ─── STEP 3: CANCEL ERRORS ───
    const filtered = this.cancelErrors(comparison);

    // ─── STEP 4: OUTPUT ───
    const result = this.produceOutput(filtered);

    // Check for spoofing/jamming
    result.spoofAlerts = this.spoofDetector.analyse(readings, result);

    // Calculate confidence score
    result.confidence = this.confidenceScorer.calculate(filtered, result);

    // Store history for drift learning
    this.fusionCount++;
    this.history.push({ timestamp: Date.now(), result });
    if (this.history.length > 100) this.history.shift();

    this.lastFusedResult = result;
    return result;
  }

  // ─── STEP 1: COLLECT ───
  // Gather position readings from all active layers simultaneously
  collectReadings(truePosition) {
    const readings = [];
    for (const layer of this.allLayers) {
      if (!layer.active) continue;
      const reading = layer.generateReading(truePosition);
      if (reading) {
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
