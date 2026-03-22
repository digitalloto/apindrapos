/**
 * UPIE Layer 26 — QZSS (Japan)
 * Patent Pending — AIMCRS
 *
 * What it does: Quasi-Zenith Satellite System — Japan's regional satellite nav
 *   Provides centimetre-level accuracy over Asia-Oceania
 * Accuracy: 1-5 metres (standalone), sub-metre with corrections
 * Strength: High elevation angle over Japan/Asia — works in urban canyons
 * Weakness: Regional (Asia-Oceania only)
 */

const PositioningLayer = require('./layer-base');

class QzssLayer extends PositioningLayer {
  constructor() {
    super({
      id: 26,
      name: 'QZSS (Japan)',
      accuracyRange: [1, 5],
      strength: 'High angle signal, urban canyon penetration',
      weakness: 'Asia-Oceania only, small constellation',
      compensatedBy: 'GPS, Galileo, BeiDou'
    });
  }
}

module.exports = QzssLayer;
