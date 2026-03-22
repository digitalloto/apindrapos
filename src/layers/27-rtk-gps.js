/**
 * UPIE Layer 27 — RTK GPS (Real-Time Kinematic)
 * Patent Pending — AIMCRS
 *
 * What it does: Uses a ground base station + carrier phase measurements
 *   to achieve centimetre-level GPS accuracy in real time
 * Accuracy: 0.01-0.05 metres (1-5 centimetres!)
 * Strength: Centimetre accuracy — best possible satellite positioning
 * Weakness: Needs base station within ~30km, expensive equipment
 */

const PositioningLayer = require('./layer-base');

class RtkGpsLayer extends PositioningLayer {
  constructor() {
    super({
      id: 27,
      name: 'RTK GPS',
      accuracyRange: [0.01, 0.05],
      strength: 'Centimetre accuracy, real-time corrections',
      weakness: 'Needs base station, short range, expensive',
      compensatedBy: 'PPP, SBAS, Standard GPS'
    });
  }
}

module.exports = RtkGpsLayer;
