/**
 * UPIE — Mission Report
 * Patent Pending — AIMCRS
 *
 * Full audit trail: everything that happened, when, where.
 * Timeline of all events for AI training and mistake analysis.
 * Exportable as JSON for post-mission review.
 *
 * LAYER MODULE — can be enabled/disabled per mission
 */

class MissionReport {
  constructor() {
    this.missionId = null;
    this.startTime = null;
    this.timeline = [];          // Chronological event log
    this.positionHistory = [];   // Position snapshots
    this.enabled = true;
    this.recording = false;
  }

  /**
   * Start a new mission report
   */
  startMission(missionId, config) {
    this.missionId = missionId || `mission-${Date.now()}`;
    this.startTime = Date.now();
    this.timeline = [];
    this.positionHistory = [];
    this.recording = true;

    this.addEvent('MISSION_START', {
      missionId: this.missionId,
      config: config || {},
      message: 'Mission recording started'
    });

    return { missionId: this.missionId, startTime: this.startTime };
  }

  /**
   * Stop mission recording
   */
  stopMission() {
    this.addEvent('MISSION_END', {
      missionId: this.missionId,
      duration: Date.now() - this.startTime,
      totalEvents: this.timeline.length,
      message: 'Mission recording stopped'
    });
    this.recording = false;
    return this.getFullReport();
  }

  /**
   * Add an event to the timeline
   */
  addEvent(type, data) {
    if (!this.recording && type !== 'MISSION_START') return;

    const event = {
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      secondsSinceMission: this.startTime ? (Date.now() - this.startTime) / 1000 : 0,
      type,
      severity: data.severity || this._getDefaultSeverity(type),
      ...data
    };

    this.timeline.push(event);

    // Keep max 10000 events
    if (this.timeline.length > 10000) {
      this.timeline.shift();
    }

    return event;
  }

  /**
   * Record a position snapshot (called each fusion cycle)
   */
  recordPosition(data) {
    if (!this.recording) return;

    this.positionHistory.push({
      timestamp: Date.now(),
      cycle: data.cycle,
      lat: data.lat,
      lon: data.lon,
      alt: data.alt,
      confidence: data.confidence,
      error: data.errorMetres,
      activeLayers: data.activeLayers,
      droneId: data.droneId || 'SINGLE'
    });

    // Keep max 5000 positions
    if (this.positionHistory.length > 5000) {
      this.positionHistory.shift();
    }
  }

  /**
   * Record specific event types with appropriate data
   */
  recordBan(banEvent) {
    this.addEvent('LAYER_BANNED', {
      severity: 'HIGH',
      layerId: banEvent.layerId,
      layerName: banEvent.layerName,
      reason: banEvent.reason,
      deviationMetres: banEvent.deviationMetres,
      position: banEvent.dronePosition,
      message: `${banEvent.layerName} banned: ${Math.round(banEvent.deviationMetres)}m off for ${banEvent.consecutiveFailures} cycles`
    });
  }

  recordReinstate(layerId, layerName) {
    this.addEvent('LAYER_REINSTATED', {
      severity: 'LOW',
      layerId,
      layerName,
      message: `${layerName} reinstated — back in school`
    });
  }

  recordSpoof(spoofData) {
    this.addEvent('SPOOF_DETECTED', {
      severity: 'HIGH',
      layerId: spoofData.layerId,
      layerName: spoofData.layerName,
      deviationMetres: spoofData.deviationMetres,
      ghostPosition: { lat: spoofData.ghostLat, lon: spoofData.ghostLon },
      actualPosition: { lat: spoofData.actualLat, lon: spoofData.actualLon },
      message: `Spoofing on ${spoofData.layerName}: ghost at ${Math.round(spoofData.deviationMetres)}m away`
    });
  }

  recordJamming(jamData) {
    this.addEvent('JAMMING_DETECTED', {
      severity: 'HIGH',
      affectedLayers: jamData.affectedLayers,
      position: jamData.dronePosition,
      message: `Jamming detected affecting ${jamData.affectedLayers.length} layers`
    });
  }

  recordFormationChange(fromFormation, toFormation, reason) {
    this.addEvent('FORMATION_CHANGE', {
      severity: 'MEDIUM',
      from: fromFormation,
      to: toFormation,
      reason,
      message: `Formation changed: ${fromFormation} → ${toFormation} (${reason})`
    });
  }

  recordEvasion(reason, pattern) {
    this.addEvent('EVASION_TRIGGERED', {
      severity: 'CRITICAL',
      reason,
      pattern,
      message: `EVASION: ${pattern} scatter triggered — ${reason}`
    });
  }

  recordReform(newRallyPoint) {
    this.addEvent('FORMATION_REFORM', {
      severity: 'MEDIUM',
      rallyPoint: newRallyPoint,
      message: 'Swarm reforming at new rally point'
    });
  }

  recordConfidenceChange(oldScore, newScore, oldLevel, newLevel) {
    if (oldLevel !== newLevel) {
      this.addEvent('CONFIDENCE_CHANGE', {
        severity: newScore < oldScore ? 'MEDIUM' : 'LOW',
        oldScore,
        newScore,
        oldLevel,
        newLevel,
        message: `Confidence: ${oldLevel} ${oldScore}% → ${newLevel} ${newScore}%`
      });
    }
  }

  /**
   * Get timeline filtered by type
   */
  getTimeline(filters) {
    let events = this.timeline;

    if (filters) {
      if (filters.type) {
        events = events.filter(e => e.type === filters.type);
      }
      if (filters.severity) {
        events = events.filter(e => e.severity === filters.severity);
      }
      if (filters.since) {
        events = events.filter(e => e.timestamp >= filters.since);
      }
      if (filters.droneId) {
        events = events.filter(e => !e.droneId || e.droneId === filters.droneId);
      }
    }

    return events;
  }

  /**
   * Get full mission report for export
   */
  getFullReport() {
    const eventCounts = {};
    const severityCounts = {};
    for (const event of this.timeline) {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
      severityCounts[event.severity] = (severityCounts[event.severity] || 0) + 1;
    }

    return {
      missionId: this.missionId,
      startTime: this.startTime,
      endTime: this.recording ? null : Date.now(),
      duration: this.startTime ? Date.now() - this.startTime : 0,
      recording: this.recording,

      summary: {
        totalEvents: this.timeline.length,
        totalPositions: this.positionHistory.length,
        eventCounts,
        severityCounts,
        criticalEvents: this.timeline.filter(e => e.severity === 'CRITICAL').length,
        highEvents: this.timeline.filter(e => e.severity === 'HIGH').length
      },

      timeline: this.timeline,
      positionHistory: this.positionHistory
    };
  }

  /**
   * Export for AI training — structured format
   */
  exportForTraining() {
    return {
      metadata: {
        missionId: this.missionId,
        startTime: this.startTime,
        duration: Date.now() - this.startTime,
        exportTime: Date.now(),
        version: 'UPIE-v2-swarm'
      },
      events: this.timeline,
      positions: this.positionHistory,
      labels: {
        totalThreats: this.timeline.filter(e =>
          ['SPOOF_DETECTED', 'JAMMING_DETECTED', 'EVASION_TRIGGERED'].includes(e.type)
        ).length,
        totalBans: this.timeline.filter(e => e.type === 'LAYER_BANNED').length,
        totalEvasions: this.timeline.filter(e => e.type === 'EVASION_TRIGGERED').length
      }
    };
  }

  reset() {
    this.missionId = null;
    this.startTime = null;
    this.timeline = [];
    this.positionHistory = [];
    this.recording = false;
  }

  _getDefaultSeverity(type) {
    const severities = {
      MISSION_START: 'INFO',
      MISSION_END: 'INFO',
      LAYER_BANNED: 'HIGH',
      LAYER_REINSTATED: 'LOW',
      SPOOF_DETECTED: 'HIGH',
      JAMMING_DETECTED: 'HIGH',
      EVASION_TRIGGERED: 'CRITICAL',
      FORMATION_CHANGE: 'MEDIUM',
      FORMATION_REFORM: 'MEDIUM',
      CONFIDENCE_CHANGE: 'LOW'
    };
    return severities[type] || 'INFO';
  }
}

module.exports = MissionReport;
