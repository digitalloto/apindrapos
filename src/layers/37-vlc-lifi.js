/**
 * UPIE Layer 37 — VLC / Li-Fi Positioning
 * Patent Pending — AIMCRS
 *
 * What it does: Visible Light Communication — uses modulated LED light
 *   from ceiling fixtures for indoor positioning
 *   Each LED has a unique ID, receiver triangulates from multiple LEDs
 * Accuracy: 0.1-1 metres
 * Strength: Very high accuracy indoors, no RF interference, secure
 * Weakness: Line-of-sight only, indoor only, needs special LEDs
 */

const PositioningLayer = require('./layer-base');

class VlcLifiLayer extends PositioningLayer {
  constructor() {
    super({
      id: 37,
      name: 'VLC / Li-Fi',
      accuracyRange: [0.1, 1],
      strength: 'Sub-metre indoor, no RF interference, secure',
      weakness: 'Line-of-sight, indoor only, needs LED infra',
      compensatedBy: 'UWB, BLE, WiFi'
    });
  }
}

module.exports = VlcLifiLayer;
