/**
 * UPIE — Spoof Tracker
 * Patent Pending — AIMCRS
 *
 * Tracks WHERE spoofed signals are trying to lead drones.
 * Records ghost trails, detects spoof patterns, estimates spoofer intent.
 *
 * LAYER MODULE — can be enabled/disabled per mission
 */

class SpoofTracker {
  constructor() {
    this.activeTrails = {};   // layerId -> SpoofTrail
    this.completedTrails = [];
    this.enabled = true;
  }

  /**
   * Record a spoof detection — adds to the ghost trail
   */
  recordSpoof(data) {
    if (!this.enabled) return null;

    const layerId = data.layerId;

    // Start new trail or continue existing one
    if (!this.activeTrails[layerId]) {
      this.activeTrails[layerId] = {
        trailId: `spoof-${Date.now()}-${layerId}`,
        startTimestamp: Date.now(),
        startCycle: data.cycle || 0,
        spoofedLayerId: layerId,
        spoofedLayerName: data.layerName || `Layer ${layerId}`,
        droneId: data.droneId || 'SINGLE',

        // Ghost positions — where the spoofer wants us to go
        ghostPositions: [],
        // Actual positions — where we actually are
        actualPositions: [],

        // Analysis fields
        spoofVector: null,
        estimatedSpoofOrigin: null,
        maxDeviation: 0,
        spoofPattern: 'UNKNOWN'
      };
    }

    const trail = this.activeTrails[layerId];

    // Record ghost position (what the spoofer is feeding)
    trail.ghostPositions.push({
      lat: data.ghostLat,
      lon: data.ghostLon,
      alt: data.ghostAlt || null,
      timestamp: Date.now(),
      cycle: data.cycle || 0,
      deviation: data.deviationMetres || 0
    });

    // Record actual position (where we really are)
    trail.actualPositions.push({
      lat: data.actualLat,
      lon: data.actualLon,
      alt: data.actualAlt || null,
      timestamp: Date.now(),
      cycle: data.cycle || 0
    });

    // Update max deviation
    trail.maxDeviation = Math.max(trail.maxDeviation, data.deviationMetres || 0);

    // Analyse spoof vector (direction the spoofer is pulling)
    this._analyseSpoofVector(trail);

    // Detect spoof pattern
    this._detectPattern(trail);

    return trail;
  }

  /**
   * End a spoof trail (layer reinstated or spoofing stopped)
   */
  endTrail(layerId) {
    const trail = this.activeTrails[layerId];
    if (!trail) return null;

    trail.endTimestamp = Date.now();
    trail.durationMs = trail.endTimestamp - trail.startTimestamp;
    trail.totalGhostPoints = trail.ghostPositions.length;

    // Final analysis
    this._analyseSpoofVector(trail);
    this._estimateSpoofOrigin(trail);

    this.completedTrails.push(trail);
    delete this.activeTrails[layerId];
    return trail;
  }

  /**
   * Calculate the direction the spoofer is trying to pull the drone
   */
  _analyseSpoofVector(trail) {
    if (trail.ghostPositions.length < 2) return;

    const recent = trail.ghostPositions.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];

    const dLat = last.lat - first.lat;
    const dLon = last.lon - first.lon;

    // Bearing from first ghost to last ghost
    const bearing = Math.atan2(dLon, dLat) * (180 / Math.PI);
    const normalizedBearing = (bearing + 360) % 360;

    // Speed of ghost drift (metres per second)
    const distMetres = this._distanceMetres(first.lat, first.lon, last.lat, last.lon);
    const dtSeconds = (last.timestamp - first.timestamp) / 1000;
    const speedMps = dtSeconds > 0 ? distMetres / dtSeconds : 0;

    trail.spoofVector = {
      bearing: Math.round(normalizedBearing * 10) / 10,
      speedMps: Math.round(speedMps * 100) / 100,
      directionName: this._bearingToDirection(normalizedBearing),
      totalDriftMetres: Math.round(distMetres)
    };
  }

  /**
   * Detect what kind of spoofing pattern is being used
   */
  _detectPattern(trail) {
    if (trail.ghostPositions.length < 3) {
      trail.spoofPattern = 'INSUFFICIENT_DATA';
      return;
    }

    const ghosts = trail.ghostPositions;
    const actuals = trail.actualPositions;

    // Check for constant offset
    const offsets = ghosts.map((g, i) => {
      if (!actuals[i]) return null;
      return {
        dLat: g.lat - actuals[i].lat,
        dLon: g.lon - actuals[i].lon
      };
    }).filter(o => o !== null);

    if (offsets.length < 3) return;

    const latVariance = this._variance(offsets.map(o => o.dLat));
    const lonVariance = this._variance(offsets.map(o => o.dLon));

    if (latVariance < 0.00001 && lonVariance < 0.00001) {
      trail.spoofPattern = 'CONSTANT_OFFSET';
    } else {
      // Check if deviations are increasing (gradual drift)
      const deviations = ghosts.map(g => g.deviation);
      const isIncreasing = deviations.length > 3 &&
        deviations[deviations.length - 1] > deviations[0] * 1.5;

      if (isIncreasing) {
        trail.spoofPattern = 'GRADUAL_DRIFT';
      } else {
        // Check for sudden redirects
        const jumps = [];
        for (let i = 1; i < ghosts.length; i++) {
          const dist = this._distanceMetres(
            ghosts[i - 1].lat, ghosts[i - 1].lon,
            ghosts[i].lat, ghosts[i].lon
          );
          jumps.push(dist);
        }
        const maxJump = Math.max(...jumps);
        const avgJump = jumps.reduce((a, b) => a + b, 0) / jumps.length;

        if (maxJump > avgJump * 5) {
          trail.spoofPattern = 'SUDDEN_REDIRECT';
        } else {
          trail.spoofPattern = 'CONTINUOUS_DRIFT';
        }
      }
    }
  }

  /**
   * Estimate where the spoofer transmitter might be located
   */
  _estimateSpoofOrigin(trail) {
    if (trail.ghostPositions.length < 2 || trail.actualPositions.length < 2) return;

    // Simple heuristic: spoofer is likely in the direction opposite to the ghost drift
    // The ghost tries to PULL the drone toward the spoofer or away from a target
    const actual = trail.actualPositions[0];
    const ghost = trail.ghostPositions[trail.ghostPositions.length - 1];

    // Estimate: spoofer is between the actual position and ghost position
    // Closer to the ghost side (the signal comes FROM somewhere to create that offset)
    trail.estimatedSpoofOrigin = {
      lat: (actual.lat + ghost.lat * 2) / 3,
      lon: (actual.lon + ghost.lon * 2) / 3,
      confidence: trail.ghostPositions.length > 10 ? 'MEDIUM' : 'LOW',
      method: 'VECTOR_EXTRAPOLATION'
    };
  }

  /**
   * Get all active spoof trails
   */
  getActiveTrails() {
    return Object.values(this.activeTrails);
  }

  /**
   * Get summary of all spoofing activity
   */
  getSummary() {
    const allTrails = [
      ...Object.values(this.activeTrails),
      ...this.completedTrails
    ];

    return {
      activeSpoofs: Object.keys(this.activeTrails).length,
      completedSpoofs: this.completedTrails.length,
      totalSpoofEvents: allTrails.length,
      patterns: this._countPatterns(allTrails),
      activeTrails: Object.values(this.activeTrails).map(t => ({
        trailId: t.trailId,
        layerName: t.spoofedLayerName,
        ghostPoints: t.ghostPositions.length,
        maxDeviation: t.maxDeviation,
        pattern: t.spoofPattern,
        vector: t.spoofVector
      })),
      completedTrails: this.completedTrails.slice(-10).map(t => ({
        trailId: t.trailId,
        layerName: t.spoofedLayerName,
        duration: t.durationMs,
        maxDeviation: t.maxDeviation,
        pattern: t.spoofPattern,
        estimatedOrigin: t.estimatedSpoofOrigin
      }))
    };
  }

  /**
   * Get full report for export
   */
  getFullReport() {
    return {
      activeTrails: this.activeTrails,
      completedTrails: this.completedTrails,
      summary: this.getSummary()
    };
  }

  reset() {
    this.activeTrails = {};
    this.completedTrails = [];
  }

  _countPatterns(trails) {
    const counts = {};
    for (const t of trails) {
      counts[t.spoofPattern] = (counts[t.spoofPattern] || 0) + 1;
    }
    return counts;
  }

  _variance(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / arr.length;
  }

  _distanceMetres(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLon = (lon2 - lon1) * 111320 * Math.cos(lat1 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
  }

  _bearingToDirection(bearing) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(bearing / 45) % 8];
  }
}

module.exports = SpoofTracker;
