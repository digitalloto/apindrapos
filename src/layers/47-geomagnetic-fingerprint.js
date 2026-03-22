/**
 * UPIE Layer 47 — Geomagnetic Indoor Fingerprint
 * Patent Pending — AIMCRS
 *
 * What it does: Maps the unique magnetic field distortions inside buildings
 *   Steel structures, wiring, and pipes create unique magnetic signatures
 *   Phone magnetometer matches current reading against magnetic map
 * Accuracy: 1-10 metres (indoors)
 * Strength: No infrastructure needed, works with phone magnetometer
 * Weakness: Indoor only, needs pre-mapped building, changes with furniture
 */

const PositioningLayer = require('./layer-base');

class GeomagneticFingerprintLayer extends PositioningLayer {
  constructor() {
    super({
      id: 47,
      name: 'Geomag Indoor FP',
      accuracyRange: [1, 10],
      strength: 'No infrastructure, phone magnetometer works',
      weakness: 'Indoor only, needs pre-mapping, changes over time',
      compensatedBy: 'WiFi, BLE, PDR, UWB'
    });
  }
}

module.exports = GeomagneticFingerprintLayer;
