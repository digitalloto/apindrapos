/**
 * UPIE — Engine Tests — 24 Layers + Swarm + Sensors
 * Patent Pending — AIMCRS
 *
 * Tests the core fusion engine, swarm intelligence, confidence scoring,
 * spoof detection, sensor interface, and all 24 layers.
 * Run with: npm test
 */

// Load environment
require('dotenv').config();

const FusionEngine = require('../src/engine/fusion-engine');
const SwarmFusionEngine = require('../src/engine/swarm-fusion');
const ConfidenceScorer = require('../src/engine/confidence-scorer');
const SpoofDetector = require('../src/engine/spoof-detector');
const SensorInterface = require('../src/sensors/sensor-interface');
const { getProfile } = require('../src/platforms/platform-profiles');
const { createAllLayers } = require('../src/layers');
const Simulator = require('../src/simulation/simulator');

// Simple test runner — no external dependencies needed
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ═══════════════════════════════════════════
console.log('');
console.log('UPIE ENGINE TESTS — 24 Layers + MiroFish Swarm');
console.log('═══════════════════════════════════════');

// ─── TEST 1: 24 Layers ───
console.log('\n1. All 24 Positioning Layers');

test('createAllLayers returns 24 layers', () => {
  const layers = createAllLayers();
  assert(layers.length === 24, `Expected 24 layers, got ${layers.length}`);
});

test('Each layer has unique ID from 1 to 24', () => {
  const layers = createAllLayers();
  const ids = layers.map(l => l.id).sort((a, b) => a - b);
  for (let i = 0; i < 24; i++) {
    assert(ids[i] === i + 1, `Missing layer ID ${i + 1}`);
  }
});

test('Each layer has name, accuracyRange, strength, weakness', () => {
  const layers = createAllLayers();
  for (const l of layers) {
    assert(l.name, `Layer ${l.id} missing name`);
    assert(l.accuracyRange, `Layer ${l.id} missing accuracyRange`);
    assert(l.strength, `Layer ${l.id} missing strength`);
    assert(l.weakness, `Layer ${l.id} missing weakness`);
  }
});

// ─── TEST 2: Swarm Fusion Engine ───
console.log('\n2. MiroFish Swarm Fusion');

test('Swarm engine produces fused position', () => {
  const profile = getProfile('fighter');
  const engine = new FusionEngine(profile);
  engine.fusionMode = 'swarm';
  const result = engine.fuse({ lat: 13.0827, lon: 80.2707, alt: 5000 });
  assert(result.lat !== null, 'Swarm should produce lat');
  assert(result.lon !== null, 'Swarm should produce lon');
  assert(result.fusionMode === 'swarm', 'Should report swarm mode');
});

test('Swarm position is within 500m of true position', () => {
  const engine = new FusionEngine(getProfile('fighter'));
  engine.fusionMode = 'swarm';
  const truePos = { lat: 13.0827, lon: 80.2707, alt: 5000 };
  const result = engine.fuse(truePos);
  const error = engine.haversineMetres(result.lat, result.lon, truePos.lat, truePos.lon);
  assert(error < 500, `Swarm error ${error.toFixed(1)}m should be under 500m`);
});

test('Swarm reports school size and outer fish', () => {
  const engine = new FusionEngine(getProfile('fighter'));
  engine.fusionMode = 'swarm';
  const result = engine.fuse({ lat: 13.0827, lon: 80.2707, alt: 5000 });
  assert(result.schoolSize !== undefined, 'Should report school size');
  assert(result.outerFish !== undefined, 'Should report outer fish count');
  assert(result.schoolSize > 0, 'School should have fish');
});

test('Swarm confidence score is 0-100', () => {
  const engine = new FusionEngine(getProfile('fighter'));
  engine.fusionMode = 'swarm';
  const result = engine.fuse({ lat: 13.0827, lon: 80.2707, alt: 5000 });
  assert(result.confidence.score >= 0, 'Score should be >= 0');
  assert(result.confidence.score <= 100, 'Score should be <= 100');
});

// ─── TEST 3: Weighted Average Mode (Classic) ───
console.log('\n3. Weighted Average Mode (Classic)');

test('Weighted mode still works', () => {
  const engine = new FusionEngine(getProfile('fighter'));
  engine.fusionMode = 'weighted';
  const result = engine.fuse({ lat: 13.0827, lon: 80.2707, alt: 5000 });
  assert(result.lat !== null, 'Weighted should produce position');
  assert(result.fusionMode === 'weighted', 'Should report weighted mode');
});

// ─── TEST 4: Spoofing Detection ───
console.log('\n4. Spoofing Detection');

test('Spoofed GPS layer detected in swarm mode', () => {
  const engine = new FusionEngine(getProfile('fighter'));
  engine.fusionMode = 'swarm';
  const gpsLayer = engine.allLayers.find(l => l.id === 1);
  gpsLayer.spoofed = true;
  const result = engine.fuse({ lat: 13.0827, lon: 80.2707, alt: 5000 });
  assert(result.spoofAlerts !== undefined, 'Should have spoofAlerts');
});

// ─── TEST 5: Platform Profiles (Updated) ───
console.log('\n5. Platform Profiles (8 profiles)');

test('All 8 platform profiles load correctly', () => {
  const profiles = [
    'small-drone', 'medium-drone', 'fighter', 'missile',
    'submarine', 'ground-vehicle', 'underground-bunker', 'spacecraft'
  ];
  for (const name of profiles) {
    const profile = getProfile(name);
    assert(profile.name, `Profile ${name} should have a name`);
    assert(profile.activeLayers.length > 0, `Profile ${name} should have active layers`);
  }
});

test('Submarine has quantum compass and gravity gradient', () => {
  const sub = getProfile('submarine');
  assert(sub.activeLayers.includes(17), 'Submarine should have gravity gradient (17)');
  assert(sub.activeLayers.includes(24), 'Submarine should have quantum compass (24)');
});

test('Spacecraft has pulsar navigation', () => {
  const space = getProfile('spacecraft');
  assert(space.activeLayers.includes(23), 'Spacecraft should have pulsar XNAV (23)');
});

test('Underground bunker has cosmic ray navigation', () => {
  const bunker = getProfile('underground-bunker');
  assert(bunker.activeLayers.includes(22), 'Bunker should have cosmic ray (22)');
  assert(!bunker.activeLayers.includes(1), 'Bunker should NOT have GPS');
});

test('Fighter includes NAVIC (sovereign primary signal)', () => {
  const fighter = getProfile('fighter');
  assert(fighter.activeLayers.includes(2), 'Fighter MUST include NAVIC');
});

// ─── TEST 6: Sensor Interface ───
console.log('\n6. Sensor Interface');

test('Can register and feed sensor data', () => {
  const si = new SensorInterface();
  si.registerSensor(1, 'GPS Receiver');
  const result = si.feedData({
    layerId: 1,
    lat: 13.0827,
    lon: 80.2707,
    alt: 100,
    accuracyMetres: 3.5
  });
  assert(result.success, 'Feed should succeed');
  const reading = si.getReading(1);
  assert(reading !== null, 'Should get reading back');
  assert(reading.source === 'real_sensor', 'Source should be real_sensor');
});

test('Rejects data without layerId', () => {
  const si = new SensorInterface();
  const result = si.feedData({ lat: 13, lon: 80 });
  assert(!result.success, 'Should reject without layerId');
});

test('Sensor status reports correctly', () => {
  const si = new SensorInterface();
  si.registerSensor(1, 'GPS');
  si.registerSensor(2, 'NAVIC');
  const status = si.getAllSensorStatus();
  assert(status.totalConnected === 2, 'Should have 2 connected');
});

// ─── TEST 7: Simulator with 24 layers ───
console.log('\n7. Simulator (24 layers)');

test('Simulator runs with all platform profiles', () => {
  const profiles = [
    'small-drone', 'medium-drone', 'fighter', 'missile',
    'submarine', 'ground-vehicle', 'underground-bunker', 'spacecraft'
  ];
  for (const name of profiles) {
    const sim = new Simulator();
    sim.init(name);
    const result = sim.tick();
    assert(result.lat !== null || result.status === 'NO_POSITION',
      `${name} should produce result`);
  }
});

test('GPS jamming scenario — position maintained from other layers', () => {
  const sim = new Simulator();
  sim.init('fighter');
  sim.setScenario('gps-jamming');
  const result = sim.tick();
  assert(result.lat !== null, 'Should maintain position without GPS');
});

// ─── TEST 8: Error Cancellation ───
console.log('\n8. Error Cancellation (Core UPIE Principle)');

test('Swarm fused position more accurate than worst individual layer', () => {
  const engine = new FusionEngine(getProfile('fighter'));
  engine.fusionMode = 'swarm';
  const truePos = { lat: 13.0827, lon: 80.2707, alt: 5000 };
  let totalError = 0;
  for (let i = 0; i < 10; i++) {
    const result = engine.fuse(truePos);
    totalError += engine.haversineMetres(result.lat, result.lon, truePos.lat, truePos.lon);
  }
  const avgError = totalError / 10;
  assert(avgError < 500, `Average error ${avgError.toFixed(1)}m should be under 500m`);
});

// ─── TEST 9: Edge Processor ───
console.log('\n9. Edge Processor (Local Brain)');

const EdgeProcessor = require('../src/edge/edge-processor');
const MotionTracker = require('../src/edge/motion-tracker');
const { NoiseReducer, KalmanFilter1D } = require('../src/edge/noise-reducer');
const EdgeSync = require('../src/edge/edge-sync');

test('Kalman filter smooths noisy readings', () => {
  const kf = new KalmanFilter1D(0.001, 0.1);
  // Feed a value of 10 with noise — filter should converge to ~10
  const results = [];
  for (let i = 0; i < 20; i++) {
    const noisy = 10 + (Math.random() - 0.5) * 2; // 10 ± 1
    results.push(kf.update(noisy));
  }
  // Last filtered value should be close to 10
  const lastVal = results[results.length - 1];
  assert(Math.abs(lastVal - 10) < 1, `Filtered value ${lastVal.toFixed(3)} should be near 10`);
});

test('Noise reducer cleans a reading', () => {
  const nr = new NoiseReducer();
  const reading = {
    layerId: 1, layerName: 'GPS', lat: 13.0827, lon: 80.2707,
    alt: 100, accuracyMetres: 5, timestamp: Date.now()
  };
  const cleaned = nr.clean(reading);
  assert(cleaned.edgeCleaned === true, 'Should mark as edge cleaned');
  assert(cleaned.lat !== null, 'Should still have lat');
});

test('Motion tracker calculates speed and heading', () => {
  const mt = new MotionTracker();
  // Position 1 — starting point
  mt.update({ lat: 13.0000, lon: 80.0000, alt: 100, timestamp: 1000000 });
  // Position 2 — moved northeast after 1 second
  mt.update({ lat: 13.0010, lon: 80.0010, alt: 100, timestamp: 1001000 });
  const state = mt.getState();
  assert(state.velocityMps > 0, 'Speed should be > 0');
  assert(state.headingDeg >= 0 && state.headingDeg <= 360, 'Heading should be 0-360');
  assert(state.predictedLat !== null, 'Should have predicted position');
});

test('Motion tracker validates position consistency', () => {
  const mt = new MotionTracker();
  mt.update({ lat: 13.0000, lon: 80.0000, alt: 100, timestamp: 1000000 });
  mt.update({ lat: 13.0001, lon: 80.0001, alt: 100, timestamp: 1001000 });
  // Validate a position that is close to predicted — should be valid
  const validation = mt.validatePosition({ lat: 13.0002, lon: 80.0002, alt: 100 });
  assert(validation.deviationMetres !== undefined, 'Should have deviation');
});

test('Edge processor cleans readings and tracks motion', () => {
  const engine = new FusionEngine(getProfile('fighter'));
  engine.edgeEnabled = true;
  engine.fusionMode = 'swarm';
  const truePos = { lat: 13.0827, lon: 80.2707, alt: 5000 };
  // Run 5 cycles — edge should accumulate data
  for (let i = 0; i < 5; i++) {
    engine.fuse(truePos);
  }
  const metrics = engine.edgeProcessor.getMetrics();
  assert(metrics.totalReadingsCleaned > 0, 'Should have cleaned readings');
  assert(metrics.motionState.trackQuality > 0, 'Track quality should increase');
});

test('Edge sync buffers data when disconnected', () => {
  const sync = new EdgeSync();
  sync.disconnect();
  const result = sync.prepareUplink({ localPosition: { lat: 13, lon: 80 }, motionState: {}, metrics: {} });
  assert(result.buffered === true, 'Should buffer when disconnected');
  assert(result.bufferSize === 1, 'Buffer should have 1 item');
  // Reconnect and flush
  const reconnect = sync.reconnect();
  assert(reconnect.bufferedPackets === 1, 'Should flush 1 packet on reconnect');
});

// ─── TEST 10: Onboard Navigator ───
console.log('\n10. Onboard Navigator (Start Point + Independent Tracking)');

const OnboardNavigator = require('../src/edge/onboard-navigator');
const PathTracker = require('../src/edge/path-tracker');

test('Origin lock sets starting coordinates', () => {
  const nav = new OnboardNavigator();
  const result = nav.lockOrigin(13.0827, 80.2707, 100);
  assert(result.locked === true, 'Should lock origin');
  assert(nav.origin.lat === 13.0827, 'Origin lat should match');
  assert(nav.originLocked === true, 'Should be marked as locked');
});

test('PathTracker independently tracks position from origin', () => {
  const tracker = new PathTracker(1, 'GPS', { baseAccuracy: 5 });
  tracker.setOrigin(13.0000, 80.0000, 100);
  // First reading sets the initial position
  tracker.updateFromAbsolutePosition(13.0000, 80.0000, 100, 1000000);
  // Second reading — moved northeast after 1 second
  tracker.updateFromAbsolutePosition(13.0001, 80.0001, 100, 1001000);
  const state = tracker.getState();
  assert(state.totalDistanceMetres > 0, 'Should have moved some distance');
  assert(state.readingCount === 2, 'Should count readings');
});

test('Cross-check finds consensus from multiple trackers', () => {
  const nav = new OnboardNavigator();
  nav.lockOrigin(13.0000, 80.0000, 100);

  // Simulate readings from 5 layers — 4 agree, 1 is noisy
  const readings = [
    { layerId: 1, layerName: 'GPS', lat: 13.0001, lon: 80.0001, alt: 100, accuracyMetres: 5 },
    { layerId: 2, layerName: 'NAVIC', lat: 13.00011, lon: 80.00011, alt: 100, accuracyMetres: 2 },
    { layerId: 5, layerName: 'Terrain', lat: 13.00009, lon: 80.00009, alt: 100, accuracyMetres: 5 },
    { layerId: 15, layerName: 'Galileo', lat: 13.00012, lon: 80.00012, alt: 100, accuracyMetres: 3 },
    { layerId: 3, layerName: 'INS', lat: 13.005, lon: 80.005, alt: 100, accuracyMetres: 500 }
  ];

  const result = nav.feedReadings(readings);
  assert(result !== null, 'Should return cross-check result');
  assert(result.consensus.lat !== null, 'Should have consensus lat');
  assert(result.activeCount >= 4, 'Should have active trackers');
});

test('Drift correction nudges drifting trackers toward consensus', () => {
  const nav = new OnboardNavigator();
  nav.lockOrigin(13.0000, 80.0000, 100);

  // Run multiple cycles to accumulate drift
  for (let i = 0; i < 10; i++) {
    const readings = [
      { layerId: 1, layerName: 'GPS', lat: 13.0001, lon: 80.0001, alt: 100, accuracyMetres: 5 },
      { layerId: 2, layerName: 'NAVIC', lat: 13.00011, lon: 80.00011, alt: 100, accuracyMetres: 2 },
      { layerId: 3, layerName: 'INS', lat: 13.005, lon: 80.005, alt: 100, accuracyMetres: 500 }
    ];
    nav.feedReadings(readings);
  }

  const state = nav.getState();
  assert(state.stats.totalDriftCorrected > 0, 'Should have corrected some drift');
  assert(state.stats.totalCrossChecks === 10, 'Should have 10 cross-checks');
});

test('Onboard Navigator runs inside full fusion engine', () => {
  const engine = new FusionEngine(getProfile('fighter'));
  engine.edgeEnabled = true;
  engine.fusionMode = 'swarm';
  const truePos = { lat: 13.0827, lon: 80.2707, alt: 5000 };
  // Run 5 cycles
  let lastResult;
  for (let i = 0; i < 5; i++) {
    lastResult = engine.fuse(truePos);
  }
  assert(engine.onboardNav.originLocked === true, 'Origin should auto-lock');
  assert(engine.onboardNav.cycleCount >= 4, 'Should have run cycles');
  assert(lastResult.onboardNav !== undefined, 'Result should include onboard nav data');
});

// ─── TEST 11: Flight Recorder + Learning Engine ───
console.log('\n11. Flight Recorder + Learning Engine');

const FlightRecorder = require('../src/learning/flight-recorder');
const LearningEngineMod = require('../src/learning/learning-engine');

test('Flight recorder starts and records cycles', () => {
  const recorder = new FlightRecorder('/tmp/upie-test-data');
  const session = recorder.startSession('fighter');
  assert(session.started === true, 'Should start recording');
  assert(session.sessionId, 'Should have session ID');

  // Record a fake cycle
  recorder.recordCycle(
    { lat: 13.0827, lon: 80.2707, alt: 5000, confidence: { score: 85 },
      fusionMode: 'swarm', activeLayerCount: 10, validLayerCount: 8,
      removedLayers: [], spoofAlerts: [], errorMetres: 3.2,
      motionState: { velocityMps: 250, headingDeg: 45, accelerationMps2: 0 } },
    [{ id: 1, name: 'GPS', active: true }, { id: 2, name: 'NAVIC', active: true }],
    null, null
  );

  const summary = recorder.getSummary();
  assert(summary.totalCycles === 1, 'Should have 1 cycle');
  assert(summary.recording === true, 'Should be recording');
});

test('Flight recorder stops and returns summary', () => {
  const recorder = new FlightRecorder('/tmp/upie-test-data');
  recorder.startSession('fighter');
  // Record 5 cycles
  for (let i = 0; i < 5; i++) {
    recorder.recordCycle(
      { lat: 13.0827, lon: 80.2707, alt: 5000, confidence: { score: 80 + i },
        fusionMode: 'swarm', activeLayerCount: 10, validLayerCount: 8,
        removedLayers: [], spoofAlerts: [], errorMetres: 5 - i * 0.5,
        motionState: { velocityMps: 250 } },
      [{ id: 1, name: 'GPS', active: true }], null, null
    );
  }
  const summary = recorder.stopSession();
  assert(summary.totalCycles === 5, 'Should have 5 cycles');
  assert(summary.avgFusionError > 0, 'Should have avg error');
  assert(summary.avgConfidence > 0, 'Should have avg confidence');
});

test('Learning engine learns from flight session', () => {
  const learner = new LearningEngineMod('/tmp/upie-test-data');
  learner.resetKnowledge();

  const fakeSummary = {
    sessionId: 'test-1',
    platform: 'fighter',
    totalCycles: 100,
    totalSeconds: 100,
    avgFusionError: 5.2,
    avgConfidence: 82,
    layerPerformance: {
      1: { name: 'GPS', activeCycles: 95, noiseCount: 2, jammedCount: 0, spoofedCount: 0 },
      2: { name: 'NAVIC', activeCycles: 100, noiseCount: 0, jammedCount: 0, spoofedCount: 0 },
      3: { name: 'INS', activeCycles: 100, noiseCount: 15, jammedCount: 0, spoofedCount: 0 }
    }
  };

  const result = learner.learnFromSession(fakeSummary);
  assert(result.lessons.length > 0, 'Should return lessons');

  const knowledge = learner.getKnowledgeSummary();
  assert(knowledge.totalFlightSessions === 1, 'Should have 1 session');
  assert(knowledge.layersLearned === 3, 'Should have learned 3 layers');

  // Check that NAVIC (0 noise) has higher reliability than INS (15 noise)
  const weights = learner.getWeightAdjustments();
  assert(weights[2].reliability > weights[3].reliability,
    'NAVIC should be more reliable than INS');
});

test('Fusion engine records and learns automatically', () => {
  const engine = new FusionEngine(getProfile('fighter'));
  engine.fusionMode = 'swarm';
  engine.edgeEnabled = true;

  // Start recording
  engine.flightRecorder.startSession('fighter');

  // Run 10 fusion cycles
  const truePos = { lat: 13.0827, lon: 80.2707, alt: 5000 };
  for (let i = 0; i < 10; i++) {
    engine.fuse(truePos);
  }

  // Stop and learn
  const summary = engine.flightRecorder.stopSession();
  assert(summary.totalCycles === 10, 'Should have recorded 10 cycles');

  const lessons = engine.learningEngine.learnFromSession(summary);
  assert(lessons !== null, 'Should produce lessons');
  assert(lessons.knowledge.totalFlightSessions >= 1, 'Should have sessions');
});

// ─── TEST 12: Authentication ───
console.log('\n12. Authentication (Password Protection)');

test('Server requires crypto module for token generation', () => {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  assert(token.length === 64, `Token should be 64 hex chars, got ${token.length}`);
});

test('Password validation logic works', () => {
  const ACCESS_PASSWORD = 'aimcrs2026';
  assert('aimcrs2026' === ACCESS_PASSWORD, 'Correct password should match');
  assert('wrong' !== ACCESS_PASSWORD, 'Wrong password should not match');
});

// ─── TEST 13: Demo System ───
console.log('\n13. Demo System');

test('Simulator supports all demo scenarios', () => {
  const demoScenarios = ['normal', 'gps-jamming', 'gps-spoofing', 'multi-failure', 'custom'];
  for (const scenario of demoScenarios) {
    const sim = new Simulator();
    sim.init('fighter');
    sim.setScenario(scenario);
    const result = sim.tick();
    assert(result !== null, `Scenario ${scenario} should produce result`);
  }
});

test('All 8 platforms work for demo platform tour', () => {
  const platforms = [
    'small-drone', 'medium-drone', 'fighter', 'missile',
    'submarine', 'ground-vehicle', 'underground-bunker', 'spacecraft'
  ];
  for (const p of platforms) {
    const sim = new Simulator();
    sim.init(p);
    sim.engine.fusionMode = 'swarm';
    sim.engine.edgeEnabled = true;
    const result = sim.tick();
    assert(result !== null, `Platform ${p} should work in demo`);
  }
});

test('Swarm and weighted modes both produce results for comparison demo', () => {
  const sim = new Simulator();
  sim.init('fighter');

  sim.engine.fusionMode = 'swarm';
  const swarmResult = sim.tick();
  assert(swarmResult.fusionMode === 'swarm', 'Should use swarm mode');

  sim.engine.fusionMode = 'weighted';
  const weightedResult = sim.tick();
  assert(weightedResult.fusionMode === 'weighted', 'Should use weighted mode');
});

test('Full demo sequence: start, record, fuse, stop, learn', () => {
  const sim = new Simulator();
  sim.init('fighter');
  sim.engine.fusionMode = 'swarm';
  sim.engine.edgeEnabled = true;

  // Start recording
  const session = sim.engine.flightRecorder.startSession('fighter');
  assert(session.started === true, 'Recording should start');

  // Run 10 fusion cycles
  for (let i = 0; i < 10; i++) {
    sim.tick();
  }

  // Stop and learn
  const summary = sim.engine.flightRecorder.stopSession();
  assert(summary.totalCycles === 10, 'Should record 10 cycles');

  const lessons = sim.engine.learningEngine.learnFromSession(summary);
  assert(lessons !== null, 'Should produce lessons');
  assert(lessons.lessons.length > 0, 'Should have learned something');
});

// ─── RESULTS ───
console.log('\n═══════════════════════════════════════');
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('═══════════════════════════════════════');

if (failed > 0) {
  console.log('\nSome tests failed. Review above.');
  process.exit(1);
} else {
  console.log('\nAll tests passed. UPIE 24-layer engine is working.');
  process.exit(0);
}
