/**
 * UPIE — All 48 Positioning Layers
 * Patent Pending — AIMCRS
 *
 * This file loads ALL 48 positioning layers and exports them as one package.
 * Every known method of determining position on Earth (and beyond) is included.
 *
 * CATEGORIES:
 *   SATELLITE  — Space-based systems (GPS, GLONASS, Galileo, BeiDou, NAVIC, QZSS, SBAS, Starlink)
 *   CELESTIAL  — Stars, sun, moon, pulsars, radio astronomy
 *   INTERNAL   — Onboard sensors (INS, Doppler, Barometric, Radar Alt, Wheel, PDR)
 *   GROUND     — Terrain, magnetic, gravity, acoustic, ocean, seismic
 *   SIGNAL     — Radio/wireless (WiFi, Cell, RF, eLoran, 5G, LoRa, BLE, UWB)
 *   FRONTIER   — Cutting-edge (Quantum, Cosmic Ray, LiDAR SLAM, VLC/Li-Fi)
 *   VISION     — Camera/AI-based (Visual Odometry, Landmark AI, Satellite Imagery, Shadow)
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

// Layers 13-24 — expanded coverage
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

// Layers 25-48 — EVERY method known to mankind
const SbasWaasLayer = require('./25-sbas-waas');
const QzssLayer = require('./26-qzss-japan');
const RtkGpsLayer = require('./27-rtk-gps');
const PppLayer = require('./28-ppp');
const UwbLayer = require('./29-uwb');
const BleBeaconLayer = require('./30-ble-beacon');
const LidarSlamLayer = require('./31-lidar-slam');
const VisionLandmarkLayer = require('./32-vision-landmark');
const FiveGPositioningLayer = require('./33-5g-positioning');
const LoraPositioningLayer = require('./34-lora-positioning');
const StarlinkPositioningLayer = require('./35-starlink-positioning');
const AmbientSoundLayer = require('./36-ambient-sound');
const VlcLifiLayer = require('./37-vlc-lifi');
const InfraredPositioningLayer = require('./38-infrared-positioning');
const SeismicPositioningLayer = require('./39-seismic-positioning');
const RadarSlamLayer = require('./40-radar-slam');
const OceanCurrentLayer = require('./41-ocean-current');
const SatelliteImageryLayer = require('./42-satellite-imagery');
const ShadowAnalysisLayer = require('./43-shadow-analysis');
const PdrPedestrianLayer = require('./44-pdr-pedestrian');
const WheelOdometryLayer = require('./45-wheel-odometry');
const RadioAstronomyLayer = require('./46-radio-astronomy');
const GeomagneticFingerprintLayer = require('./47-geomagnetic-fingerprint');
const AtmosphericPressureMapLayer = require('./48-atmospheric-pressure-map');

function createAllLayers() {
  return [
    // ═══ SATELLITE SYSTEMS ═══
    new GpsGnssLayer(),           // 1  — GPS/GNSS (USA)
    new NavicLayer(),              // 2  — NAVIC (India — PRIMARY)
    new GlonassLayer(),            // 14 — GLONASS (Russia)
    new GalileoLayer(),            // 15 — Galileo (Europe)
    new BeiDouLayer(),             // 16 — BeiDou (China — monitored)
    new QzssLayer(),               // 26 — QZSS (Japan)
    new SbasWaasLayer(),           // 25 — SBAS/WAAS corrections
    new RtkGpsLayer(),             // 27 — RTK GPS (centimetre)
    new PppLayer(),                // 28 — PPP (decimetre)
    new StarlinkPositioningLayer(), // 35 — Starlink LEO

    // ═══ CELESTIAL SYSTEMS ═══
    new StarTrackingLayer(),       // 4  — Star tracking
    new SunMoonTrackingLayer(),    // 13 — Sun/Moon celestial
    new PulsarXnavLayer(),         // 23 — Pulsar XNAV (dead stars)
    new RadioAstronomyLayer(),     // 46 — Radio astronomy

    // ═══ INTERNAL SENSORS ═══
    new InsDeadReckoningLayer(),   // 3  — INS dead reckoning
    new DopplerVelocityLayer(),    // 12 — Doppler velocity
    new BarometricAltitudeLayer(), // 11 — Barometric altitude
    new RadarAltimetryLayer(),     // 19 — Radar altimetry
    new WheelOdometryLayer(),      // 45 — Wheel odometry
    new PdrPedestrianLayer(),      // 44 — Pedestrian dead reckoning

    // ═══ GROUND/TERRAIN/OCEAN ═══
    new TerrainMatchingLayer(),    // 5  — Terrain matching
    new MagneticAnomalyLayer(),    // 6  — Magnetic anomaly
    new GroundEmittersLayer(),     // 7  — Ground radio emitters
    new GravityGradientLayer(),    // 17 — Gravity gradient
    new AcousticTriangulationLayer(), // 10 — Acoustic (underwater)
    new OceanCurrentLayer(),       // 41 — Ocean current mapping
    new SeismicPositioningLayer(), // 39 — Seismic/vibration

    // ═══ SIGNAL/WIRELESS ═══
    new WifiMappingLayer(),        // 8  — WiFi fingerprint
    new CellTowerLayer(),          // 9  — Cell tower
    new RfFingerprintingLayer(),   // 18 — RF fingerprint
    new EloranLayer(),             // 21 — eLoran radio
    new FiveGPositioningLayer(),   // 33 — 5G NR positioning
    new LoraPositioningLayer(),    // 34 — LoRa/LPWAN
    new UwbLayer(),                // 29 — Ultra-Wideband
    new BleBeaconLayer(),          // 30 — BLE Beacon
    new VlcLifiLayer(),            // 37 — VLC/Li-Fi
    new InfraredPositioningLayer(), // 38 — Infrared
    new GeomagneticFingerprintLayer(), // 47 — Geomagnetic indoor
    new AtmosphericPressureMapLayer(), // 48 — Atmospheric pressure

    // ═══ VISION/AI ═══
    new VisualOdometryLayer(),     // 20 — Visual odometry
    new VisionLandmarkLayer(),     // 32 — Vision landmark AI
    new SatelliteImageryLayer(),   // 42 — Satellite imagery matching
    new ShadowAnalysisLayer(),     // 43 — Shadow analysis AI

    // ═══ FRONTIER/QUANTUM ═══
    new QuantumCompassLayer(),     // 24 — Quantum compass
    new CosmicRayMuonLayer(),      // 22 — Cosmic ray/muon
    new LidarSlamLayer(),          // 31 — LiDAR SLAM
    new RadarSlamLayer(),          // 40 — Radar SLAM/SAR
    new AmbientSoundLayer()        // 36 — Ambient sound fingerprint
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
  PulsarXnavLayer, QuantumCompassLayer,
  SbasWaasLayer, QzssLayer, RtkGpsLayer, PppLayer,
  UwbLayer, BleBeaconLayer, LidarSlamLayer, VisionLandmarkLayer,
  FiveGPositioningLayer, LoraPositioningLayer, StarlinkPositioningLayer,
  AmbientSoundLayer, VlcLifiLayer, InfraredPositioningLayer,
  SeismicPositioningLayer, RadarSlamLayer, OceanCurrentLayer,
  SatelliteImageryLayer, ShadowAnalysisLayer, PdrPedestrianLayer,
  WheelOdometryLayer, RadioAstronomyLayer, GeomagneticFingerprintLayer,
  AtmosphericPressureMapLayer
};
