/**
 * UPIE — Simulation Controller
 * Patent Pending — AIMCRS
 *
 * This runs the entire UPIE engine in simulation mode.
 * It generates a moving platform with a known true position,
 * feeds it through all 12 layers, and lets you see the fusion
 * engine working in real time.
 *
 * Simulation scenarios:
 *   1. Normal flight — all systems working
 *   2. GPS jamming — GPS goes offline, other layers compensate
 *   3. GPS spoofing — fake GPS signal, AI detects and removes it
 *   4. Multiple layer failure — stress test
 *   5. Custom — operator sets conditions manually
 */

const FusionEngine = require('../engine/fusion-engine');
const { getProfile, getProfileNames } = require('../platforms/platform-profiles');
const NavigationController = require('../swarm/navigation-controller');

class Simulator {
  constructor() {
    this.engine = null;
    this.running = false;
    this.interval = null;
    this.tickRate = 1000;       // milliseconds between fusion cycles
    this.currentScenario = 'normal';
    this.tickCount = 0;
    this.onTick = null;         // callback for each fusion result

    // True position — what the platform's ACTUAL position is
    // Chennai, India — default simulation location
    this.truePosition = {
      lat: parseFloat(process.env.SIM_TRUE_LAT) || 13.0827,
      lon: parseFloat(process.env.SIM_TRUE_LON) || 80.2707,
      alt: parseFloat(process.env.SIM_TRUE_ALT) || 15.0
    };

    // Movement simulation
    this.speedMps = 250;          // metres per second (fighter speed)
    this.headingDeg = 45;         // northeast
    this.moving = true;

    // Navigation — destination-aware movement
    this.navController = new NavigationController();
  }

  // Initialise with a platform profile
  init(platformName) {
    const profile = getProfile(platformName || 'fighter');
    this.engine = new FusionEngine(profile);

    // Apply layer-specific config from profile
    if (profile.layerConfig) {
      for (const [layerId, config] of Object.entries(profile.layerConfig)) {
        const layer = this.engine.allLayers.find(l => l.id === parseInt(layerId));
        if (layer) {
          Object.assign(layer, config);
        }
      }
    }

    return profile;
  }

  // Start the simulation loop
  start(tickCallback) {
    if (!this.engine) this.init('fighter');
    this.running = true;
    this.onTick = tickCallback;

    this.interval = setInterval(() => {
      this.tick();
    }, this.tickRate);
  }

  // Stop simulation
  stop() {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  // One simulation tick
  tick() {
    this.tickCount++;

    // Move the true position if platform is moving
    if (this.moving) {
      this.movePosition();
    }

    // Apply scenario effects
    this.applyScenario();

    // Run the fusion engine
    const result = this.engine.fuse(this.truePosition);

    // Add true position for comparison (simulation only — real system wouldn't have this)
    result.truePosition = { ...this.truePosition };
    result.scenario = this.currentScenario;
    result.tickCount = this.tickCount;
    result.navigation = this.navController.getState();

    // Calculate error — how far is the fused position from truth?
    if (result.lat !== null) {
      result.errorMetres = this.engine.haversineMetres(
        result.lat, result.lon,
        this.truePosition.lat, this.truePosition.lon
      );
      result.errorMetres = Math.round(result.errorMetres * 100) / 100;
    }

    // Send to dashboard via callback
    if (this.onTick) {
      this.onTick(result);
    }

    return result;
  }

  // Move the platform — uses navigation controller if destination is set
  movePosition() {
    // Check if navigation controller has an active destination
    const navVector = this.navController.getMovementVector(
      this.truePosition.lat, this.truePosition.lon
    );

    let heading, speed;
    if (navVector) {
      heading = navVector.heading;
      speed = navVector.speedMps;
      // Track distance travelled
      const dist = speed * (this.tickRate / 1000);
      this.navController.totalDistanceTravelled += dist;
    } else {
      heading = this.headingDeg;
      speed = this.speedMps;
    }

    const distancePerTick = speed * (this.tickRate / 1000);
    const headingRad = heading * Math.PI / 180;
    const dLat = (distancePerTick * Math.cos(headingRad)) / 111320;
    const dLon = (distancePerTick * Math.sin(headingRad)) /
      (111320 * Math.cos(this.truePosition.lat * Math.PI / 180));
    this.truePosition.lat += dLat;
    this.truePosition.lon += dLon;
  }

  // Apply scenario-specific conditions
  applyScenario() {
    const gps = this.engine.allLayers.find(l => l.id === 1);
    const ins = this.engine.allLayers.find(l => l.id === 3);

    switch (this.currentScenario) {
      case 'normal':
        // All systems nominal
        if (gps) { gps.jammed = false; gps.spoofed = false; gps.signalStrength = 1.0; }
        break;

      case 'gps-jamming':
        // GPS signal blocked — other layers must compensate
        if (gps) { gps.jammed = true; gps.signalStrength = 0; }
        break;

      case 'gps-spoofing':
        // Fake GPS signal — AI should detect disagreement with other layers
        if (gps) { gps.spoofed = true; gps.jammed = false; gps.signalStrength = 1.0; }
        break;

      case 'multi-failure':
        // Multiple layers fail — stress test
        if (gps) { gps.jammed = true; }
        this.engine.allLayers.forEach(l => {
          if ([4, 5, 8].includes(l.id)) l.active = false;
        });
        break;

      case 'custom':
        // Operator sets conditions via dashboard — no automatic changes
        break;
    }
  }

  // Change scenario
  setScenario(scenarioName) {
    // Reset all layers first
    this.engine.allLayers.forEach(l => {
      l.jammed = false;
      l.spoofed = false;
    });
    this.currentScenario = scenarioName;
  }

  // Get all available scenarios
  getScenarios() {
    return [
      { id: 'normal', name: 'Normal Flight', description: 'All systems working perfectly' },
      { id: 'gps-jamming', name: 'GPS Jamming', description: 'GPS signal blocked by enemy' },
      { id: 'gps-spoofing', name: 'GPS Spoofing', description: 'Fake GPS signal — AI detects it' },
      { id: 'multi-failure', name: 'Multiple Failures', description: 'GPS + Star + Terrain + WiFi offline' },
      { id: 'custom', name: 'Custom', description: 'Set your own conditions' }
    ];
  }

  // Get full engine state for API
  getState() {
    return {
      running: this.running,
      scenario: this.currentScenario,
      tickCount: this.tickCount,
      truePosition: this.truePosition,
      lastResult: this.engine ? this.engine.getLastResult() : null,
      layerStatuses: this.engine ? this.engine.getLayerStatuses() : [],
      platformProfiles: getProfileNames()
    };
  }
}

module.exports = Simulator;
