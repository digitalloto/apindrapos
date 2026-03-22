/**
 * UPIE — Fleet Manager
 * Patent Pending — AIMCRS
 *
 * Orchestrates N drones. Each drone has its own UPIE system.
 * The Fleet Manager coordinates formation, communication,
 * intelligence sharing, and collective decision-making.
 *
 * LAYER MODULE — multi-drone capability
 */

const DroneInstance = require('./drone-instance');
const FormationController = require('./formation-controller');
const MeshNetwork = require('./mesh-network');
const SwarmIntelligence = require('./swarm-intelligence');
const EvasionController = require('./evasion-controller');
const BanReport = require('../intelligence/ban-report');
const SpoofTracker = require('../intelligence/spoof-tracker');
const JammerLocator = require('../intelligence/jammer-locator');
const MissionReport = require('../intelligence/mission-report');

class FleetManager {
  constructor() {
    this.drones = {};                // droneId -> DroneInstance
    this.formationController = new FormationController();
    this.meshNetwork = new MeshNetwork();
    this.swarmIntelligence = new SwarmIntelligence();
    this.evasionController = new EvasionController();

    // Fleet-level intelligence
    this.banReport = new BanReport();
    this.spoofTracker = new SpoofTracker();
    this.jammerLocator = new JammerLocator();
    this.missionReport = new MissionReport();

    // Fleet state
    this.running = false;
    this.tickInterval = null;
    this.tickRate = 1000;           // ms between ticks
    this.cycle = 0;
  }

  /**
   * Add a drone to the fleet
   */
  addDrone(droneId, config) {
    const drone = new DroneInstance(droneId, config || {});
    this.drones[droneId] = drone;
    this.meshNetwork.registerNode(droneId);

    // Re-assign formation slots
    this._reassignFormation();

    return drone.getState();
  }

  /**
   * Remove a drone from the fleet
   */
  removeDrone(droneId) {
    delete this.drones[droneId];
    this.meshNetwork.removeNode(droneId);
    this._reassignFormation();
  }

  /**
   * Initialize fleet with N drones
   */
  initFleet(droneCount, config) {
    this.reset();
    const startLat = (config && config.startLat) || 13.0827;
    const startLon = (config && config.startLon) || 80.2707;
    const platform = (config && config.platform) || 'small-drone';

    for (let i = 0; i < droneCount; i++) {
      const droneId = `DRONE-${i + 1}`;
      this.addDrone(droneId, {
        platform,
        callsign: undefined, // Auto-generate
        startLat: startLat + (Math.random() - 0.5) * 0.002,
        startLon: startLon + (Math.random() - 0.5) * 0.002,
        startAlt: 100 + Math.random() * 50
      });
    }

    // Set formation
    this.formationController.setFormation(
      (config && config.formation) || 'V_SHAPE',
      (config && config.spacing) || 200
    );
    this._reassignFormation();

    // Start mission report
    this.missionReport.startMission(null, {
      droneCount,
      platform,
      formation: this.formationController.formation,
      startPosition: { lat: startLat, lon: startLon }
    });

    return this.getFleetState();
  }

  /**
   * Run one tick for all drones
   */
  tick() {
    this.cycle++;

    const results = {};
    const dronePositions = {};

    // 1. Each drone runs its own fusion cycle
    for (const [droneId, drone] of Object.entries(this.drones)) {
      // If evading, execute evasion movement
      if (drone.evasionMode) {
        drone.evasionStep();
      }
      // If returning to formation, move toward slot
      else if (drone.status === 'RETURNING' && this.formationController.leaderDroneId) {
        const leaderPos = this.drones[this.formationController.leaderDroneId]?.simulator.truePosition;
        if (leaderPos) {
          const target = this.formationController.getTargetPosition(droneId, leaderPos.lat, leaderPos.lon, leaderPos.alt);
          if (target) {
            drone.moveToward(target.lat, target.lon, target.alt);
            // Check if close enough to confirm in formation
            const dist = this._distanceMetres(
              drone.simulator.truePosition.lat, drone.simulator.truePosition.lon,
              target.lat, target.lon
            );
            if (dist < this.formationController.spacingMetres * 0.3) {
              drone.confirmInFormation();
            }
          }
        }
      }
      // If active in formation, hold position
      else if (drone.status === 'ACTIVE' && this.formationController.leaderDroneId) {
        const leaderDrone = this.drones[this.formationController.leaderDroneId];
        if (leaderDrone && droneId !== this.formationController.leaderDroneId) {
          const leaderPos = leaderDrone.simulator.truePosition;
          const target = this.formationController.getTargetPosition(droneId, leaderPos.lat, leaderPos.lon, leaderPos.alt);
          if (target) {
            drone.moveToward(target.lat, target.lon, target.alt);
          }
        }
      }

      // Run fusion
      const result = drone.tick();
      results[droneId] = result;
      dronePositions[droneId] = {
        lat: drone.simulator.truePosition.lat,
        lon: drone.simulator.truePosition.lon,
        alt: drone.simulator.truePosition.alt
      };

      // Send heartbeat over mesh
      this.meshNetwork.sendHeartbeat(droneId, drone.getHeartbeat());

      // Record position in mission report
      this.missionReport.recordPosition({
        cycle: this.cycle,
        lat: result.lat,
        lon: result.lon,
        alt: result.alt,
        confidence: result.confidence ? result.confidence.score : 0,
        errorMetres: result.errorMetres,
        activeLayers: result.activeLayerCount,
        droneId
      });

      // Update hive mind with drone state
      this.swarmIntelligence.updateDroneState(droneId, {
        droneId,
        lat: result.lat,
        lon: result.lon,
        confidence: result.confidence ? result.confidence.score : 0,
        jammingDetected: result.autoNav ? result.autoNav.jammingDetected : false,
        spoofingDetected: result.autoNav ? result.autoNav.spoofingDetected : false,
        status: drone.status
      });

      // Process alerts — feed into intelligence modules
      if (result.autoBanAlerts) {
        for (const alert of result.autoBanAlerts) {
          if (alert.type === 'AUTO_BAN') {
            const banEvent = this.banReport.recordBan({
              cycle: this.cycle,
              layerId: alert.layerId,
              layerName: alert.layerName || `Layer ${alert.layerId}`,
              deviationMetres: alert.deviation || 0,
              consecutiveFailures: 5,
              droneLat: result.lat,
              droneLon: result.lon,
              droneAlt: result.alt,
              fusedLat: result.lat,
              fusedLon: result.lon,
              confidence: result.confidence ? result.confidence.score : 0,
              activeLayers: result.activeLayerCount,
              droneId
            });
            if (banEvent) this.missionReport.recordBan(banEvent);
          }
        }
      }

      if (result.spoofAlerts) {
        for (const alert of result.spoofAlerts) {
          if (alert.type === 'SPOOF_SUSPECTED') {
            this.spoofTracker.recordSpoof({
              layerId: alert.layerId,
              layerName: alert.layerName || `Layer ${alert.layerId}`,
              cycle: this.cycle,
              ghostLat: alert.ghostLat || result.lat + 0.005,
              ghostLon: alert.ghostLon || result.lon + 0.005,
              actualLat: result.lat,
              actualLon: result.lon,
              deviationMetres: alert.deviation || 500,
              droneId
            });
            this.missionReport.recordSpoof({
              layerId: alert.layerId,
              layerName: alert.layerName,
              deviationMetres: alert.deviation || 500,
              ghostLat: result.lat + 0.005,
              ghostLon: result.lon + 0.005,
              actualLat: result.lat,
              actualLon: result.lon
            });
          }
        }
      }
    }

    // 2. Hive mind analyses all drone data
    const hiveMindDecision = this.swarmIntelligence.analyse();

    // 3. Act on hive mind decision
    if (hiveMindDecision.action === 'EVADE' && !this.evasionController.evasionActive) {
      const droneIds = Object.keys(this.drones);
      const positions = droneIds.map(id => dronePositions[id]);

      this.evasionController.triggerEvasion(
        hiveMindDecision.reason,
        hiveMindDecision.pattern,
        droneIds,
        positions,
        this.cycle
      );

      // Tell all drones to evade
      for (const droneId of droneIds) {
        const vector = this.evasionController.getEvasionVector(droneId);
        this.drones[droneId].startEvasion(vector, this.cycle);
      }

      // Broadcast evasion over mesh
      this.meshNetwork.sendEvasionTrigger(
        hiveMindDecision.reason,
        hiveMindDecision.pattern,
        this.evasionController.reformAfterCycles
      );

      this.missionReport.recordEvasion(hiveMindDecision.reason, hiveMindDecision.pattern);
    }

    // 4. Check if evasion should end
    if (this.evasionController.evasionActive) {
      const evasionStatus = this.evasionController.tick(this.cycle);

      if (evasionStatus.action === 'REFORM') {
        this.evasionController.reform();

        // Tell all drones to return to formation
        for (const drone of Object.values(this.drones)) {
          drone.stopEvasion();
        }

        this.meshNetwork.sendFormationCommand({
          command: 'REFORM',
          formation: this.formationController.formation,
          rallyPoint: this.evasionController.rallyPoint
        });

        this.missionReport.recordReform(this.evasionController.rallyPoint);
      }
    }

    // 5. Reset mesh bandwidth
    this.meshNetwork.resetCycleBandwidth();

    return {
      cycle: this.cycle,
      droneResults: results,
      hiveMind: this.swarmIntelligence.getState(),
      formation: this.formationController.getFormationStatus(dronePositions),
      evasion: this.evasionController.getState(),
      mesh: this.meshNetwork.getStatus(),
      threatLevel: this.swarmIntelligence.threatLevel
    };
  }

  /**
   * Start continuous simulation
   */
  start(onTick) {
    if (this.running) return;
    this.running = true;

    this.tickInterval = setInterval(() => {
      const result = this.tick();
      if (onTick) onTick(result);
    }, this.tickRate);
  }

  /**
   * Stop simulation
   */
  stop() {
    this.running = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Get full fleet state for dashboard
   */
  getFleetState() {
    const droneStates = {};
    const dronePositions = {};

    for (const [droneId, drone] of Object.entries(this.drones)) {
      droneStates[droneId] = drone.getState();
      dronePositions[droneId] = drone.simulator.truePosition;
    }

    return {
      droneCount: Object.keys(this.drones).length,
      running: this.running,
      cycle: this.cycle,
      drones: droneStates,
      formation: this.formationController.getFormationStatus(dronePositions),
      hiveMind: this.swarmIntelligence.getState(),
      evasion: this.evasionController.getState(),
      mesh: this.meshNetwork.getStatus(),
      intelligence: {
        bans: this.banReport.getSummary(),
        spoofs: this.spoofTracker.getSummary(),
        jammers: this.jammerLocator.getSummary()
      },
      mission: this.missionReport.getFullReport()
    };
  }

  /**
   * Change formation
   */
  setFormation(type, spacing) {
    const old = this.formationController.formation;
    this.formationController.setFormation(type, spacing);
    this._reassignFormation();
    this.missionReport.recordFormationChange(old, type, 'Manual change');
    return this.formationController.getFormationStatus({});
  }

  /**
   * Trigger manual evasion
   */
  triggerEvasion(reason, pattern) {
    const droneIds = Object.keys(this.drones);
    const positions = droneIds.map(id => this.drones[id].simulator.truePosition);

    this.evasionController.triggerEvasion(reason, pattern || 'RANDOM_SCATTER', droneIds, positions, this.cycle);

    for (const droneId of droneIds) {
      const vector = this.evasionController.getEvasionVector(droneId);
      this.drones[droneId].startEvasion(vector, this.cycle);
    }

    this.missionReport.recordEvasion(reason, pattern || 'RANDOM_SCATTER');
    return this.evasionController.getState();
  }

  /**
   * Force reform
   */
  forceReform() {
    this.evasionController.reform();
    for (const drone of Object.values(this.drones)) {
      drone.stopEvasion();
    }
    this._reassignFormation();
    this.missionReport.recordReform(this.evasionController.rallyPoint);
    return this.evasionController.getState();
  }

  /**
   * Set scenario for all drones
   */
  setScenario(scenario) {
    for (const drone of Object.values(this.drones)) {
      drone.simulator.setScenario(scenario);
    }
  }

  /**
   * Get intelligence reports
   */
  getIntelligenceReport() {
    return {
      bans: this.banReport.getFullReport(),
      spoofs: this.spoofTracker.getFullReport(),
      jammers: this.jammerLocator.getFullReport(),
      mission: this.missionReport.getFullReport(),
      trainingExport: this.missionReport.exportForTraining()
    };
  }

  /**
   * Reset everything
   */
  reset() {
    this.stop();
    this.drones = {};
    this.cycle = 0;
    this.formationController = new FormationController();
    this.meshNetwork.reset();
    this.swarmIntelligence.reset();
    this.evasionController.reset();
    this.banReport.reset();
    this.spoofTracker.reset();
    this.jammerLocator.reset();
    this.missionReport.reset();
  }

  _reassignFormation() {
    const droneIds = Object.keys(this.drones);
    if (droneIds.length > 0) {
      this.formationController.assignSlots(droneIds);
      for (const [droneId, slot] of Object.entries(this.formationController.slots)) {
        if (this.drones[droneId]) {
          this.drones[droneId].formationSlot = slot;
        }
      }
    }
  }

  _distanceMetres(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLon = (lon2 - lon1) * 111320 * Math.cos(lat1 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
  }
}

module.exports = FleetManager;
