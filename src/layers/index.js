/**
 * UPIE — All 12 Positioning Layers
 * Patent Pending — AIMCRS
 *
 * This file loads all 12 positioning layers and exports them as one package.
 */

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

function createAllLayers() {
  return [
    new GpsGnssLayer(),
    new NavicLayer(),
    new InsDeadReckoningLayer(),
    new StarTrackingLayer(),
    new TerrainMatchingLayer(),
    new MagneticAnomalyLayer(),
    new GroundEmittersLayer(),
    new WifiMappingLayer(),
    new CellTowerLayer(),
    new AcousticTriangulationLayer(),
    new BarometricAltitudeLayer(),
    new DopplerVelocityLayer()
  ];
}

module.exports = {
  createAllLayers,
  GpsGnssLayer,
  NavicLayer,
  InsDeadReckoningLayer,
  StarTrackingLayer,
  TerrainMatchingLayer,
  MagneticAnomalyLayer,
  GroundEmittersLayer,
  WifiMappingLayer,
  CellTowerLayer,
  AcousticTriangulationLayer,
  BarometricAltitudeLayer,
  DopplerVelocityLayer
};
