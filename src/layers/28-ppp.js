/**
 * UPIE Layer 28 — PPP (Precise Point Positioning)
 * Patent Pending — AIMCRS
 *
 * What it does: Uses precise satellite orbit/clock data + dual-frequency
 *   receivers to achieve decimetre accuracy WITHOUT a base station
 * Accuracy: 0.05-0.3 metres
 * Strength: No base station needed, global coverage, decimetre accuracy
 * Weakness: Takes 20-30 minutes to converge, needs clear sky
 */

const PositioningLayer = require('./layer-base');

class PppLayer extends PositioningLayer {
  constructor() {
    super({
      id: 28,
      name: 'PPP (Precise Point)',
      accuracyRange: [0.05, 0.3],
      strength: 'Global decimetre accuracy, no base station',
      weakness: 'Slow convergence (20+ min), needs dual-freq',
      compensatedBy: 'RTK, SBAS, INS'
    });
  }
}

module.exports = PppLayer;
