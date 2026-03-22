/**
 * UPIE Layer 25 — SBAS (WAAS/EGNOS/GAGAN/MSAS)
 * Patent Pending — AIMCRS
 *
 * What it does: Satellite-Based Augmentation System — corrections broadcast from
 *   geostationary satellites to improve GPS accuracy from 5m to <1m
 * Accuracy: 0.5-2 metres
 * Strength: Sub-metre accuracy, wide coverage, free service
 * Weakness: Regional (WAAS=Americas, EGNOS=Europe, GAGAN=India, MSAS=Japan)
 */

const PositioningLayer = require('./layer-base');

class SbasWaasLayer extends PositioningLayer {
  constructor() {
    super({
      id: 25,
      name: 'SBAS (WAAS/EGNOS)',
      accuracyRange: [0.5, 2],
      strength: 'Sub-metre GPS correction, free',
      weakness: 'Regional coverage, needs GPS base',
      compensatedBy: 'GPS, RTK, PPP'
    });
  }
}

module.exports = SbasWaasLayer;
