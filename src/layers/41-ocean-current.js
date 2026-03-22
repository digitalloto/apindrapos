/**
 * UPIE Layer 41 — Ocean Current Mapping
 * Patent Pending — AIMCRS
 *
 * What it does: Measures ocean current speed, direction, temperature, salinity
 *   and matches against known oceanographic databases
 *   Used by submarines and underwater vehicles
 * Accuracy: 100-1000 metres
 * Strength: Works at any depth, completely passive, unjammable
 * Weakness: Ocean only, low accuracy, currents change seasonally
 */

const PositioningLayer = require('./layer-base');

class OceanCurrentLayer extends PositioningLayer {
  constructor() {
    super({
      id: 41,
      name: 'Ocean Current Map',
      accuracyRange: [100, 1000],
      strength: 'Any depth, passive, unjammable undersea',
      weakness: 'Ocean only, low accuracy, seasonal changes',
      compensatedBy: 'Acoustic, Gravity Gradient, INS'
    });
  }
}

module.exports = OceanCurrentLayer;
