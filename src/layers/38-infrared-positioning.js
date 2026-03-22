/**
 * UPIE Layer 38 — Infrared Positioning
 * Patent Pending — AIMCRS
 *
 * What it does: Uses infrared beacons and sensors for positioning
 *   Active IR badges tracked by ceiling-mounted IR receivers
 *   Also thermal imaging for terrain/structure matching
 * Accuracy: 0.5-5 metres
 * Strength: Works in darkness, no visible light needed, room-level accuracy
 * Weakness: Short range, line-of-sight, affected by sunlight
 */

const PositioningLayer = require('./layer-base');

class InfraredPositioningLayer extends PositioningLayer {
  constructor() {
    super({
      id: 38,
      name: 'Infrared (IR)',
      accuracyRange: [0.5, 5],
      strength: 'Works in darkness, room-level accuracy',
      weakness: 'Short range, line-of-sight, sunlight interference',
      compensatedBy: 'UWB, BLE, Vision Landmark'
    });
  }
}

module.exports = InfraredPositioningLayer;
