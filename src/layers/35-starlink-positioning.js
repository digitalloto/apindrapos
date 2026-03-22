/**
 * UPIE Layer 35 — Starlink LEO Positioning
 * Patent Pending — AIMCRS
 *
 * What it does: Uses signals from SpaceX Starlink LEO satellites
 *   for positioning — 550km altitude = 1000x stronger than GPS signals
 *   Doppler shift + time-of-arrival from multiple LEO sats
 * Accuracy: 5-30 metres (improving rapidly with more sats)
 * Strength: Very strong signal (hard to jam), massive constellation, global
 * Weakness: Not designed for nav, signal structure changes, proprietary
 */

const PositioningLayer = require('./layer-base');

class StarlinkPositioningLayer extends PositioningLayer {
  constructor() {
    super({
      id: 35,
      name: 'Starlink LEO',
      accuracyRange: [5, 30],
      strength: '1000x stronger than GPS, massive constellation',
      weakness: 'Not designed for nav, proprietary, evolving',
      compensatedBy: 'GPS, Galileo, eLoran'
    });
  }
}

module.exports = StarlinkPositioningLayer;
