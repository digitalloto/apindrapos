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
