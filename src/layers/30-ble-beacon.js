/**
 * UPIE Layer 30 — BLE Beacon (Bluetooth Low Energy)
 * Patent Pending — AIMCRS
 *
 * What it does: Triangulates position using Bluetooth beacons (iBeacon, Eddystone)
 *   RSSI measurements from multiple beacons provide indoor positioning
 * Accuracy: 1-5 metres
 * Strength: Low power, cheap beacons, works indoors, phone-compatible
 * Weakness: Short range (~30m), affected by body/obstacles
 */

const PositioningLayer = require('./layer-base');

class BleBeaconLayer extends PositioningLayer {
  constructor() {
    super({
      id: 30,
      name: 'BLE Beacon',
      accuracyRange: [1, 5],
      strength: 'Low power, cheap, indoor positioning',
      weakness: 'Short range, body blocking, signal bounce',
      compensatedBy: 'UWB, WiFi, Dead Reckoning'
    });
  }
}

module.exports = BleBeaconLayer;
