/**
 * UPIE — Ban Intelligence Report
 * Patent Pending — AIMCRS
 *
 * Tracks WHY signals were banned, WHEN, WHERE, and what they reported
 * vs what the school agreed on. Feeds into jammer localization.
 *
 * LAYER MODULE — can be enabled/disabled per mission
 */

class BanReport {
  constructor() {
    this.banEvents = [];
    this.reinstateEvents = [];
    this.enabled = true;
  }

  /**
   * Record a ban event with full intelligence context
   */
  recordBan(data) {
    if (!this.enabled) return null;

    const event = {
      eventId: `ban-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      cycle: data.cycle || 0,

      // WHAT was banned
      layerId: data.layerId,
      layerName: data.layerName,

      // WHY it was banned
      reason: data.reason || 'CONSECUTIVE_OUTLIER',
      deviationMetres: data.deviationMetres || 0,
      consecutiveFailures: data.consecutiveFailures || 0,

      // WHERE the drone was when ban happened
      dronePosition: {
        lat: data.droneLat || null,
        lon: data.droneLon || null,
        alt: data.droneAlt || null
      },

      // What the BANNED layer was reporting (ghost position)
      layerReportedPosition: {
        lat: data.layerLat || null,
        lon: data.layerLon || null,
        alt: data.layerAlt || null
      },

      // What the SCHOOL agreed on
      schoolAgreedPosition: {
        lat: data.fusedLat || null,
        lon: data.fusedLon || null,
        alt: data.fusedAlt || null
      },

      // Context
      confidenceAtBan: data.confidence || 0,
      activeLayersAtBan: data.activeLayers || 0,
      droneId: data.droneId || 'SINGLE',

      // Track reinstatement
      reinstated: false,
      reinstateTimestamp: null,
      banDurationCycles: 0
    };

    this.banEvents.push(event);
    return event;
  }

  /**
   * Record when a banned layer is reinstated
   */
  recordReinstate(layerId, cycle) {
    // Find the most recent unreinstated ban for this layer
    const ban = [...this.banEvents]
      .reverse()
      .find(e => e.layerId === layerId && !e.reinstated);

    if (ban) {
      ban.reinstated = true;
      ban.reinstateTimestamp = Date.now();
      ban.banDurationCycles = cycle - ban.cycle;

      this.reinstateEvents.push({
        eventId: ban.eventId,
        layerId,
        layerName: ban.layerName,
        banDurationCycles: ban.banDurationCycles,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get all ban events for a specific layer
   */
  getBansByLayer(layerId) {
    return this.banEvents.filter(e => e.layerId === layerId);
  }

  /**
   * Get all ban events near a geographic position (for jammer localization)
   */
  getBansNearPosition(lat, lon, radiusMetres) {
    return this.banEvents.filter(e => {
      if (!e.dronePosition.lat) return false;
      const dist = this._distanceMetres(
        lat, lon, e.dronePosition.lat, e.dronePosition.lon
      );
      return dist <= radiusMetres;
    });
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const layerBanCounts = {};
    for (const event of this.banEvents) {
      const key = `${event.layerId}-${event.layerName}`;
      if (!layerBanCounts[key]) {
        layerBanCounts[key] = {
          layerId: event.layerId,
          layerName: event.layerName,
          totalBans: 0,
          totalReinstates: 0,
          avgDeviation: 0,
          maxDeviation: 0,
          positions: []
        };
      }
      layerBanCounts[key].totalBans++;
      if (event.reinstated) layerBanCounts[key].totalReinstates++;
      layerBanCounts[key].avgDeviation += event.deviationMetres;
      layerBanCounts[key].maxDeviation = Math.max(
        layerBanCounts[key].maxDeviation, event.deviationMetres
      );
      if (event.dronePosition.lat) {
        layerBanCounts[key].positions.push(event.dronePosition);
      }
    }

    // Calculate averages
    for (const key of Object.keys(layerBanCounts)) {
      const entry = layerBanCounts[key];
      entry.avgDeviation = entry.totalBans > 0
        ? Math.round(entry.avgDeviation / entry.totalBans)
        : 0;
    }

    return {
      totalBanEvents: this.banEvents.length,
      totalReinstateEvents: this.reinstateEvents.length,
      currentlyBanned: this.banEvents.filter(e => !e.reinstated).length,
      layerBreakdown: Object.values(layerBanCounts),
      recentBans: this.banEvents.slice(-20),
      recentReinstates: this.reinstateEvents.slice(-10)
    };
  }

  /**
   * Get full report for export (AI training)
   */
  getFullReport() {
    return {
      banEvents: this.banEvents,
      reinstateEvents: this.reinstateEvents,
      summary: this.getSummary()
    };
  }

  /**
   * Reset for new mission
   */
  reset() {
    this.banEvents = [];
    this.reinstateEvents = [];
  }

  _distanceMetres(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLon = (lon2 - lon1) * 111320 * Math.cos(lat1 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
  }
}

module.exports = BanReport;
