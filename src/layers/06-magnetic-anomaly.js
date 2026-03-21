/**
 * UPIE Layer 6 — Magnetic Anomaly Navigation
 * Patent Pending — AIMCRS
 *
 * What it does: Measures tiny variations in Earth's magnetic field
 *   Different rocks/minerals create different magnetic patterns
 *   These patterns are mapped — matching your reading to the map gives position
 * Accuracy: 50-200 metres
 * Strength: Completely passive — no signals emitted — undetectable
 * Weakness: Local magnetic distortion (near metal structures, power lines)
 * Compensated by: Cross-validated by other layers
 */

const PositioningLayer = require('./layer-base');

class MagneticAnomalyLayer extends PositioningLayer {
  constructor() {
    super({
      id: 6,
      name: 'Magnetic Anomaly Nav',
      accuracyRange: [50, 200],
      strength: 'Passive, no emissions',
      weakness: 'Local magnetic distortion',
      compensatedBy: 'Cross-validated by other layers'
    });
    this.magneticInterference = 0;  // 0 = clean, 1 = heavy interference
    this.mapResolution = 'medium';  // low, medium, high
  }

  generateReading(truePosition) {
    // Heavy interference makes readings unreliable
    if (this.magneticInterference > 0.8) {
      this.weight = 0.2;
    } else {
      this.weight = Math.max(0.3, 1.0 - this.magneticInterference);
    }

    // Map resolution affects accuracy
    const resMultiplier = { high: 0.5, medium: 1.0, low: 2.0 };
    const mult = resMultiplier[this.mapResolution] || 1.0;
    this.accuracyRange = [50 * mult, 200 * mult];

    return super.generateReading(truePosition);
  }
}

module.exports = MagneticAnomalyLayer;
