/**
 * UPIE Layer 16 — BeiDou (China Satellite System)
 * Patent Pending — AIMCRS
 *
 * What it does: China's satellite navigation system.
 *   UPIE includes BeiDou for two reasons:
 *   1. More satellites = better accuracy in multi-constellation mode
 *   2. IMPORTANT: If China is an adversary, KNOWING their BeiDou signals
 *      helps detect if they are being manipulated or spoofed.
 *      Monitoring an adversary's navigation system is intelligence.
 *
 * Accuracy: 3-10 metres
 * Strength: Large constellation, good Asia-Pacific coverage
 * Weakness: Controlled by China — MUST be cross-validated heavily
 * Compensated by: All other layers — lowest trust weight of satellite systems
 *
 * SECURITY: BeiDou readings are ALWAYS cross-validated against NAVIC and GPS.
 *   Any disagreement triggers immediate alert to operator.
 */

const PositioningLayer = require('./layer-base');

class BeiDouLayer extends PositioningLayer {
  constructor() {
    super({
      id: 16,
      name: 'BeiDou (China)',
      accuracyRange: [3, 10],
      strength: 'Large constellation, Asia-Pacific coverage',
      weakness: 'Controlled by potential adversary',
      compensatedBy: 'All other layers — cross-validated heavily'
    });
    this.satellitesInView = 12;
    this.signalStrength = 1.0;
    this.trustLevel = 'LOW'; // adversary-controlled system
  }

  generateReading(truePosition) {
    if (this.signalStrength < 0.3) {
      this.jammed = true;
      return null;
    }

    this.jammed = false;
    this.active = true;
    this.accuracyRange = [3, 10];

    // Lowest weight of all satellite systems — adversary controlled
    // Still useful for accuracy when cross-validated
    this.weight = 0.5;

    const reading = super.generateReading(truePosition);
    if (reading) {
      reading.satellitesInView = this.satellitesInView;
      reading.trustLevel = this.trustLevel;
    }
    return reading;
  }
}

module.exports = BeiDouLayer;
