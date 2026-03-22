/**
 * UPIE Layer 44 — PDR (Pedestrian Dead Reckoning)
 * Patent Pending — AIMCRS
 *
 * What it does: Tracks human movement using accelerometer, gyroscope, magnetometer
 *   Counts steps, estimates stride length, tracks heading changes
 *   Works completely independently from any external signal
 * Accuracy: 2-20 metres (over short distances)
 * Strength: Works indoors, underground, no infrastructure needed
 * Weakness: Drift accumulates over time, varies by walking style
 */

const PositioningLayer = require('./layer-base');

class PdrPedestrianLayer extends PositioningLayer {
  constructor() {
    super({
      id: 44,
      name: 'PDR (Pedestrian DR)',
      accuracyRange: [2, 20],
      strength: 'No infrastructure, works anywhere human walks',
      weakness: 'Drift over time, walking style dependent',
      compensatedBy: 'INS, WiFi, BLE, UWB'
    });
  }
}

module.exports = PdrPedestrianLayer;
