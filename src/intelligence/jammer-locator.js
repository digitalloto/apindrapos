/**
 * UPIE — Jammer Locator
 * Patent Pending — AIMCRS
 *
 * Uses ban/jamming data from multiple drones to triangulate
 * the location of jamming transmitters. Estimates effective range.
 *
 * LAYER MODULE — can be enabled/disabled per mission
 */

class JammerLocator {
  constructor() {
    this.jamEvents = [];          // Raw jam detection events
    this.jammerEstimates = [];    // Estimated jammer positions
    this.jamZones = [];           // Areas where jamming is active
    this.enabled = true;
  }

  /**
   * Record a jamming detection from a drone
   */
  recordJamming(data) {
    if (!this.enabled) return null;

    const event = {
      eventId: `jam-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      cycle: data.cycle || 0,

      // Which drone detected it
      droneId: data.droneId || 'SINGLE',
      dronePosition: {
        lat: data.droneLat,
        lon: data.droneLon,
        alt: data.droneAlt || null
      },

      // Which layers were affected
      affectedLayers: data.affectedLayers || [],
      affectedLayerNames: data.affectedLayerNames || [],

      // Signal characteristics
      signalStrength: data.signalStrength || null,
      jammingType: data.jammingType || 'BROADBAND',

      // Is jamming still active?
      active: true,
      endTimestamp: null
    };

    this.jamEvents.push(event);

    // Update jam zones
    this._updateJamZones(event);

    // Try to estimate jammer position
    this._estimateJammerPosition();

    return event;
  }

  /**
   * Record when jamming stops at a position
   */
  recordJammingEnd(droneId, position) {
    // Mark active events from this drone as ended
    for (const event of this.jamEvents) {
      if (event.droneId === droneId && event.active) {
        event.active = false;
        event.endTimestamp = Date.now();
      }
    }

    // The boundary where jamming stops helps estimate jammer range
    this._updateJamZoneBoundary(droneId, position);
  }

  /**
   * Estimate jammer position using geometric intersection
   * With 1 drone: rough direction estimate
   * With 2+ drones: triangulation
   */
  _estimateJammerPosition() {
    // Group active jam events by time window (last 60 seconds)
    const recentEvents = this.jamEvents.filter(e =>
      e.active && (Date.now() - e.timestamp) < 60000
    );

    if (recentEvents.length === 0) return;

    // Get unique drone positions reporting jamming
    const dronePositions = {};
    for (const event of recentEvents) {
      dronePositions[event.droneId] = event.dronePosition;
    }

    const positions = Object.values(dronePositions).filter(p => p.lat !== null);

    if (positions.length === 0) return;

    let estimate;

    if (positions.length === 1) {
      // Single drone — can only estimate that jammer is nearby
      estimate = {
        estimateId: `jammer-est-${Date.now()}`,
        timestamp: Date.now(),
        estimatedPosition: {
          lat: positions[0].lat,
          lon: positions[0].lon
        },
        estimatedRadius: 5000, // Unknown — assume 5km
        confidence: 20,
        method: 'SINGLE_POINT',
        reportingDrones: Object.keys(dronePositions),
        affectedLayers: [...new Set(recentEvents.flatMap(e => e.affectedLayers))]
      };
    } else {
      // Multiple drones — triangulate
      // Jammer is likely at the centroid of all drones detecting it
      // (since jamming is typically omnidirectional)
      let sumLat = 0, sumLon = 0;
      for (const pos of positions) {
        sumLat += pos.lat;
        sumLon += pos.lon;
      }

      const centroid = {
        lat: sumLat / positions.length,
        lon: sumLon / positions.length
      };

      // Estimate radius: max distance from centroid to any detecting drone
      let maxDist = 0;
      for (const pos of positions) {
        const dist = this._distanceMetres(centroid.lat, centroid.lon, pos.lat, pos.lon);
        maxDist = Math.max(maxDist, dist);
      }

      // If drones that DON'T detect jamming are known, use them as boundary
      const radius = maxDist > 0 ? maxDist * 1.5 : 5000;

      estimate = {
        estimateId: `jammer-est-${Date.now()}`,
        timestamp: Date.now(),
        estimatedPosition: centroid,
        estimatedRadius: Math.round(radius),
        confidence: Math.min(80, 20 + positions.length * 15),
        method: positions.length >= 3 ? 'TRIANGULATED' : 'MULTI_DRONE',
        reportingDrones: Object.keys(dronePositions),
        affectedLayers: [...new Set(recentEvents.flatMap(e => e.affectedLayers))],
        droneCount: positions.length
      };
    }

    // Add or update estimate
    const existingIdx = this.jammerEstimates.findIndex(e =>
      this._distanceMetres(
        e.estimatedPosition.lat, e.estimatedPosition.lon,
        estimate.estimatedPosition.lat, estimate.estimatedPosition.lon
      ) < 1000
    );

    if (existingIdx >= 0) {
      // Update existing estimate with better data
      if (estimate.confidence > this.jammerEstimates[existingIdx].confidence) {
        this.jammerEstimates[existingIdx] = estimate;
      }
    } else {
      this.jammerEstimates.push(estimate);
    }
  }

  /**
   * Track zones where jamming is active
   */
  _updateJamZones(event) {
    if (!event.dronePosition.lat) return;

    // Find existing zone near this position
    const existingZone = this.jamZones.find(z =>
      this._distanceMetres(
        z.center.lat, z.center.lon,
        event.dronePosition.lat, event.dronePosition.lon
      ) < z.radius
    );

    if (existingZone) {
      existingZone.eventCount++;
      existingZone.lastSeen = Date.now();
      existingZone.droneIds.add(event.droneId);
    } else {
      this.jamZones.push({
        zoneId: `jamzone-${Date.now()}`,
        center: { ...event.dronePosition },
        radius: 2000, // Start with 2km estimate
        eventCount: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        droneIds: new Set([event.droneId]),
        affectedLayers: new Set(event.affectedLayers)
      });
    }
  }

  /**
   * When a drone exits jamming, use its position as boundary
   */
  _updateJamZoneBoundary(droneId, position) {
    if (!position || !position.lat) return;

    for (const zone of this.jamZones) {
      if (zone.droneIds.has(droneId)) {
        const dist = this._distanceMetres(
          zone.center.lat, zone.center.lon,
          position.lat, position.lon
        );
        // The boundary is approximately where jamming stopped
        zone.radius = Math.round((zone.radius + dist) / 2);
      }
    }
  }

  /**
   * Get all estimated jammer positions
   */
  getJammerEstimates() {
    return this.jammerEstimates;
  }

  /**
   * Get jamming zones
   */
  getJamZones() {
    return this.jamZones.map(z => ({
      ...z,
      droneIds: [...z.droneIds],
      affectedLayers: [...z.affectedLayers]
    }));
  }

  /**
   * Get summary for dashboard
   */
  getSummary() {
    return {
      totalJamEvents: this.jamEvents.length,
      activeJamEvents: this.jamEvents.filter(e => e.active).length,
      estimatedJammers: this.jammerEstimates.length,
      jamZones: this.getJamZones(),
      jammerEstimates: this.jammerEstimates,
      recentEvents: this.jamEvents.slice(-20)
    };
  }

  /**
   * Get full report for export
   */
  getFullReport() {
    return {
      jamEvents: this.jamEvents,
      jammerEstimates: this.jammerEstimates,
      jamZones: this.getJamZones(),
      summary: this.getSummary()
    };
  }

  reset() {
    this.jamEvents = [];
    this.jammerEstimates = [];
    this.jamZones = [];
  }

  _distanceMetres(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLon = (lon2 - lon1) * 111320 * Math.cos(lat1 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
  }
}

module.exports = JammerLocator;
