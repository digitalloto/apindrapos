/**
 * UPIE Layer 33 — 5G NR Positioning
 * Patent Pending — AIMCRS
 *
 * What it does: Uses 5G New Radio signals for positioning via
 *   Time Difference of Arrival (TDOA), Angle of Arrival (AoA),
 *   and Round-Trip Time (RTT) measurements
 * Accuracy: 0.5-3 metres (mmWave), 3-10m (sub-6GHz)
 * Strength: Sub-metre accuracy in urban areas, indoor/outdoor
 * Weakness: Needs 5G coverage, mmWave blocked by walls
 */

const PositioningLayer = require('./layer-base');

class FiveGPositioningLayer extends PositioningLayer {
  constructor() {
    super({
      id: 33,
      name: '5G NR Positioning',
      accuracyRange: [0.5, 10],
      strength: 'Sub-metre urban accuracy, indoor capable',
      weakness: 'Needs 5G infrastructure, mmWave range limits',
      compensatedBy: 'Cell Tower, WiFi, UWB'
    });
  }
}

module.exports = FiveGPositioningLayer;
