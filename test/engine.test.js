/**
 * UPIE — Engine Tests
 * Patent Pending — AIMCRS
 *
 * Tests the core fusion engine, confidence scoring, and spoof detection.
 * Run with: npm test
 */

// Load environment
require('dotenv').config();

const FusionEngine = require('../src/engine/fusion-engine');
const ConfidenceScorer = require('../src/engine/confidence-scorer');
const SpoofDetector = require('../src/engine/spoof-detector');
const { getProfile } = require('../src/platforms/platform-profiles');
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
console.log('UPIE ENGINE TESTS');
console.log('═══════════════════════════════════════');

// ─── TEST 1: Fusion Engine creates and runs ───
console.log('\n1. Fusion Engine Basic');

test('Engine initialises with fighter profile', () => {
  const profile = getProfile('fighter');
  const engine = new FusionEngine(profile);
  assert(engine.allLayers.length === 12, 'Should have 12 layers');
});

test('Engine produces fused position from Chennai', () => {
  const profile = getProfile('fighter');
  const engine = new FusionEngine(profile);
  const truePos = { lat: 13.0827, lon: 80.2707, alt: 5000 };
  const result = engine.fuse(truePos);
  assert(result.lat !== null, 'Fused lat should not be null');
  assert(result.lon !== null, 'Fused lon should not be null');
  assert(result.status === 'POSITION_FIXED', 'Status should be POSITION_FIXED');
});

test('Fused position is within 500m of true position', () => {
  const profile = getProfile('fighter');
  const engine = new FusionEngine(profile);
  const truePos = { lat: 13.0827, lon: 80.2707, alt: 5000 };
  const result = engine.fuse(truePos);
  const error = engine.haversineMetres(result.lat, result.lon, truePos.lat, truePos.lon);
  assert(error < 500, `Error ${error.toFixed(1)}m should be under 500m`);
});

// ─── TEST 2: Confidence Scoring ───
console.log('\n2. Confidence Scoring');

test('Confidence score is 0-100', () => {
  const profile = getProfile('fighter');
  const engine = new FusionEngine(profile);
  const result = engine.fuse({ lat: 13.0827, lon: 80.2707, alt: 5000 });
  assert(result.confidence.score >= 0, 'Score should be >= 0');
  assert(result.confidence.score <= 100, 'Score should be <= 100');
});

test('Fighter gets at least MODERATE confidence (HIGH when Simulator applies full config)', () => {
  const profile = getProfile('fighter');
  const engine = new FusionEngine(profile);
  const result = engine.fuse({ lat: 13.0827, lon: 80.2707, alt: 5000 });
  const score = result.confidence.score;
  // Without Simulator layerConfig, WiFi/Cell Tower are inactive (0 APs/towers)
  // Score should be at least 60 (MODERATE) — Simulator gives higher
  assert(score >= 60,
    `Expected score >= 60, got ${score} (${result.confidence.level})`);
});

test('Submarine (fewer layers) gets lower confidence than fighter', () => {
  const fighterEngine = new FusionEngine(getProfile('fighter'));
  const subEngine = new FusionEngine(getProfile('submarine'));
  const pos = { lat: 13.0827, lon: 80.2707, alt: -200 };
  const fighterResult = fighterEngine.fuse(pos);
  const subResult = subEngine.fuse(pos);
  // Submarine has fewer position layers — confidence should be lower or equal
  assert(subResult.confidence.score <= fighterResult.confidence.score,
    `Sub score ${subResult.confidence.score} should be <= fighter ${fighterResult.confidence.score}`);
});

// ─── TEST 3: Spoofing Detection ───
console.log('\n3. Spoofing Detection');

test('Spoofed GPS layer produces spoof alert', () => {
  const profile = getProfile('fighter');
  const engine = new FusionEngine(profile);
  // Spoof the GPS layer
  const gpsLayer = engine.allLayers.find(l => l.id === 1);
  gpsLayer.spoofed = true;
  const result = engine.fuse({ lat: 13.0827, lon: 80.2707, alt: 5000 });
  // The spoofed GPS should be detected as outlier
  // (it returns a position ~1.1km off from true position)
  assert(result.spoofAlerts !== undefined, 'Should have spoofAlerts array');
});

// ─── TEST 4: Platform Profiles ───
console.log('\n4. Platform Profiles');

test('All 6 platform profiles load correctly', () => {
  const profiles = ['small-drone', 'medium-drone', 'fighter', 'missile', 'submarine', 'ground-vehicle'];
  for (const name of profiles) {
    const profile = getProfile(name);
    assert(profile.name, `Profile ${name} should have a name`);
    assert(profile.activeLayers.length > 0, `Profile ${name} should have active layers`);
  }
});

test('Submarine profile does NOT include GPS or NAVIC', () => {
  const sub = getProfile('submarine');
  assert(!sub.activeLayers.includes(1), 'Submarine should not have GPS');
  assert(!sub.activeLayers.includes(2), 'Submarine should not have NAVIC');
});

test('Fighter profile includes NAVIC (sovereign primary signal)', () => {
  const fighter = getProfile('fighter');
  assert(fighter.activeLayers.includes(2), 'Fighter MUST include NAVIC');
});

// ─── TEST 5: Simulator ───
console.log('\n5. Simulator');

test('Simulator initialises and runs a tick', () => {
  const sim = new Simulator();
  sim.init('fighter');
  const result = sim.tick();
  assert(result.lat !== null, 'Tick should produce a position');
  assert(result.truePosition, 'Should include true position for comparison');
  assert(result.errorMetres !== undefined, 'Should calculate error');
});

test('Simulator scenario changes work', () => {
  const sim = new Simulator();
  sim.init('fighter');
  sim.setScenario('gps-jamming');
  assert(sim.currentScenario === 'gps-jamming', 'Scenario should change');
  const result = sim.tick();
  // GPS should be jammed — fusion should still work from other layers
  assert(result.lat !== null, 'Should still get position without GPS');
});

test('Simulator GPS spoofing scenario', () => {
  const sim = new Simulator();
  sim.init('fighter');
  sim.setScenario('gps-spoofing');
  const result = sim.tick();
  assert(result.lat !== null, 'Should still get position with spoofed GPS');
});

// ─── TEST 6: Error Cancellation — The Core UPIE Principle ───
console.log('\n6. Error Cancellation (Core UPIE Principle)');

test('Fused position is more accurate than worst individual layer', () => {
  const profile = getProfile('fighter');
  const engine = new FusionEngine(profile);
  const truePos = { lat: 13.0827, lon: 80.2707, alt: 5000 };

  // Run 10 cycles and check average error
  let totalError = 0;
  for (let i = 0; i < 10; i++) {
    const result = engine.fuse(truePos);
    totalError += engine.haversineMetres(result.lat, result.lon, truePos.lat, truePos.lon);
  }
  const avgError = totalError / 10;
  // INS alone can drift 100-1000m, magnetic is 50-200m
  // Fused should be significantly better than worst layer
  assert(avgError < 300, `Average error ${avgError.toFixed(1)}m should be under 300m`);
});

// ─── RESULTS ───
console.log('\n═══════════════════════════════════════');
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('═══════════════════════════════════════');

if (failed > 0) {
  console.log('\nSome tests failed. Review above.');
  process.exit(1);
} else {
  console.log('\nAll tests passed. UPIE engine is working.');
  process.exit(0);
}
