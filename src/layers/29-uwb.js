/**
 * UPIE Layer 29 — UWB (Ultra-Wideband)
 * Patent Pending — AIMCRS
 *
 * What it does: Uses ultra-short radio pulses for centimetre-accurate ranging
 *   Time-of-flight measurement between UWB anchors and tag
 * Accuracy: 0.1-0.3 metres
 * Strength: Centimetre indoor accuracy, penetrates walls, low interference
 * Weakness: Short range (~100m), needs pre-installed anchors
 */

const PositioningLayer = require('./layer-base');

class UwbLayer extends PositioningLayer {
  constructor() {
    super({
      id: 29,
      name: 'UWB (Ultra-Wideband)',
      accuracyRange: [0.1, 0.3],
      strength: 'Centimetre indoor accuracy, wall penetration',
      weakness: 'Short range, needs anchor infrastructure',
      compensatedBy: 'WiFi, BLE, Cell Tower'
    });
  }
}

module.exports = UwbLayer;
