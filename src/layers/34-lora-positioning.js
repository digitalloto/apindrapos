/**
 * UPIE Layer 34 — LoRa/LPWAN Positioning
 * Patent Pending — AIMCRS
 *
 * What it does: Uses LoRaWAN gateways for TDOA-based positioning
 *   Long-range, low-power radio positioning for IoT devices
 * Accuracy: 20-200 metres
 * Strength: Extremely long range (15km+), ultra-low power, cheap
 * Weakness: Low accuracy, slow update rate, sparse infrastructure
 */

const PositioningLayer = require('./layer-base');

class LoraPositioningLayer extends PositioningLayer {
  constructor() {
    super({
      id: 34,
      name: 'LoRa/LPWAN',
      accuracyRange: [20, 200],
      strength: 'Ultra-long range (15km+), ultra-low power',
      weakness: 'Low accuracy, slow updates, sparse coverage',
      compensatedBy: 'Cell Tower, WiFi, GPS'
    });
  }
}

module.exports = LoraPositioningLayer;
