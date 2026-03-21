/**
 * UPIE — All 24 Positioning Layers
 * Patent Pending — AIMCRS
 *
 * This file loads all 24 positioning layers and exports them as one package.
 * Every known method of determining position on Earth is included.
 */

// Original 12 layers
const GpsGnssLayer = require('./01-gps-gnss');
const NavicLayer = require('./02-navic');
const InsDeadReckoningLayer = require('./03-ins-dead-reckoning');
const StarTrackingLayer = require('./04-star-tracking');
const TerrainMatchingLayer = require('./05-terrain-matching');
const MagneticAnomalyLayer = require('./06-magnetic-anomaly');
const GroundEmittersLayer = require('./07-ground-emitters');
const WifiMappingLayer = require('./08-wifi-mapping');
const CellTowerLayer = require('./09-cell-tower');
const AcousticTriangulationLayer = require('./10-acoustic-triangulation');
const BarometricAltitudeLayer = require('./11-barometric-altitude');
const DopplerVelocityLayer = require('./12-doppler-velocity');

// New 12 layers — expanded coverage
const SunMoonTrackingLayer = require('./13-sun-moon-tracking');
const GlonassLayer = require('./14-glonass');
const GalileoLayer = require('./15-galileo');
const BeiDouLayer = require('./16-beidou');
const GravityGradientLayer = require('./17-gravity-gradient');
const RfFingerprintingLayer = require('./18-rf-fingerprinting');
const RadarAltimetryLayer = require('./19-radar-altimetry');
const VisualOdometryLayer = require('./20-visual-odometry');
const EloranLayer = require('./21-eloran');
const CosmicRayMuonLayer = require('./22-cosmic-ray-muon');
const PulsarXnavLayer = require('./23-pulsar-xnav');
const QuantumCompassLayer = require('./24-quantum-compass');

function createAllLayers() {
  return [
    new GpsGnssLayer(),           // 1  — Satellite (USA)
    new NavicLayer(),              // 2  — Satellite (India — PRIMARY)
    new InsDeadReckoningLayer(),   // 3  — Internal sensors
    new StarTrackingLayer(),       // 4  — Night sky — unjammable
    new TerrainMatchingLayer(),    // 5  — Camera vs maps
    new MagneticAnomalyLayer(),    // 6  — Earth's magnetic field
    new GroundEmittersLayer(),     // 7  — Radio beacons
    new WifiMappingLayer(),        // 8  — WiFi as landmarks
    new CellTowerLayer(),          // 9  — Mobile towers
    new AcousticTriangulationLayer(), // 10 — Underwater sound
    new BarometricAltitudeLayer(), // 11 — Air pressure altitude
    new DopplerVelocityLayer(),    // 12 — Speed measurement
    new SunMoonTrackingLayer(),    // 13 — Daytime celestial
    new GlonassLayer(),            // 14 — Satellite (Russia)
    new GalileoLayer(),            // 15 — Satellite (Europe)
    new BeiDouLayer(),             // 16 — Satellite (China — monitored)
    new GravityGradientLayer(),    // 17 — Gravity field
    new RfFingerprintingLayer(),   // 18 — Radio signal fingerprint
    new RadarAltimetryLayer(),     // 19 — Radar height
    new VisualOdometryLayer(),     // 20 — Camera movement tracking
    new EloranLayer(),             // 21 — Ground radio (1M x stronger than GPS)
    new CosmicRayMuonLayer(),      // 22 — Works underground
    new PulsarXnavLayer(),         // 23 — Dead star timing — unjammable
    new QuantumCompassLayer()      // 24 — Quantum physics — no drift
  ];
}

module.exports = {
  createAllLayers,
  GpsGnssLayer, NavicLayer, InsDeadReckoningLayer, StarTrackingLayer,
  TerrainMatchingLayer, MagneticAnomalyLayer, GroundEmittersLayer,
  WifiMappingLayer, CellTowerLayer, AcousticTriangulationLayer,
  BarometricAltitudeLayer, DopplerVelocityLayer,
  SunMoonTrackingLayer, GlonassLayer, GalileoLayer, BeiDouLayer,
  GravityGradientLayer, RfFingerprintingLayer, RadarAltimetryLayer,
  VisualOdometryLayer, EloranLayer, CosmicRayMuonLayer,
  PulsarXnavLayer, QuantumCompassLayer
};
