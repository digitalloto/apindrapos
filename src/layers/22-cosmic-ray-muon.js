/**
 * UPIE Layer 22 — Cosmic Ray / Muon Navigation
 * Patent Pending — AIMCRS
 *
 * What it does: Cosmic rays from deep space constantly hit Earth.
 *   When they hit the atmosphere, they create particles called MUONS.
 *   Muons pass through EVERYTHING — rock, water, metal, buildings.
 *   By measuring muon flux (how many hit the detector per second)
 *   and their angles, position can be determined.
 *
 * Why it matters:
 *   - Works UNDERGROUND — the ONLY positioning system that works
 *     deep underground where no signal of any kind can reach
 *   - Works inside buildings, bunkers, tunnels, mines
 *   - Cannot be jammed — cosmic rays come from the entire universe
 *   - Experimental but advancing rapidly
 *
 * Accuracy: 100-1000 metres (coarse but works where NOTHING else does)
 * Strength: Works underground/inside structures, unjammable
 * Weakness: Coarse accuracy, requires muon detector hardware
 * Compensated by: All other layers when above ground
 */

const PositioningLayer = require('./layer-base');

class CosmicRayMuonLayer extends PositioningLayer {
  constructor() {
    super({
      id: 22,
      name: 'Cosmic Ray / Muon',
      accuracyRange: [100, 1000],
      strength: 'Works underground, unjammable',
      weakness: 'Coarse accuracy, needs detector',
      compensatedBy: 'All other layers above ground'
    });
    this.isUnderground = false;
    this.detectorSensitivity = 'medium'; // low, medium, high
    this.muonFluxRate = 0; // muons per second per square metre
  }

  generateReading(truePosition) {
    // Most valuable underground — but works everywhere
    this.active = true;

    const sensMultiplier = { high: 0.5, medium: 1.0, low: 2.0 };
    const mult = sensMultiplier[this.detectorSensitivity] || 1.0;
    this.accuracyRange = [100 * mult, 1000 * mult];

    // Low weight due to low accuracy — but invaluable underground
    // where no other layer works
    this.weight = this.isUnderground ? 0.8 : 0.3;

    return super.generateReading(truePosition);
  }
}

module.exports = CosmicRayMuonLayer;
