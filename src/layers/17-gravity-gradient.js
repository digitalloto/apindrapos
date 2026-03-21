/**
 * UPIE Layer 17 — Gravity Gradient Navigation
 * Patent Pending — AIMCRS
 *
 * What it does: Measures tiny variations in Earth's gravity.
 *   Different rocks, minerals, and underground structures create
 *   slightly different gravity. These patterns are mapped.
 *   By measuring the exact gravity where you are and matching it
 *   to the map, you can determine your position.
 *
 * Why it matters:
 *   - Completely PASSIVE — no signals emitted, undetectable
 *   - Cannot be jammed or spoofed — gravity is a physical force
 *   - Works UNDERWATER — gravity passes through water perfectly
 *   - Works UNDERGROUND — gravity passes through rock
 *   - Perfect complement to Magnetic Anomaly (Layer 6)
 *
 * Accuracy: 100-500 metres (coarse but unjammable)
 * Strength: Passive, unjammable, works everywhere including underwater
 * Weakness: Requires pre-mapped gravity data, coarse accuracy
 * Compensated by: Fine-grained layers (GPS, NAVIC) for precision
 */

const PositioningLayer = require('./layer-base');

class GravityGradientLayer extends PositioningLayer {
  constructor() {
    super({
      id: 17,
      name: 'Gravity Gradient Nav',
      accuracyRange: [100, 500],
      strength: 'Passive, unjammable, works underwater/underground',
      weakness: 'Coarse accuracy, needs gravity maps',
      compensatedBy: 'GPS, NAVIC for precision'
    });
    this.gravityMapResolution = 'medium'; // low, medium, high
    this.gravityAnomaly = 0;  // measured anomaly in mGal
  }

  generateReading(truePosition) {
    this.active = true;

    // Map resolution affects accuracy
    const resMultiplier = { high: 0.5, medium: 1.0, low: 2.0 };
    const mult = resMultiplier[this.gravityMapResolution] || 1.0;
    this.accuracyRange = [100 * mult, 500 * mult];

    // Low accuracy but very reliable — consistent weight
    this.weight = 0.5;

    return super.generateReading(truePosition);
  }
}

module.exports = GravityGradientLayer;
