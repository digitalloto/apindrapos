/**
 * UPIE Layer 2 — NAVIC (India's Own Satellite System)
 * Patent Pending — AIMCRS
 *
 * What it does: India's sovereign satellite navigation — primary Indian signal
 * Accuracy: 5m civilian, 1.5m military (encrypted)
 * Strength: Indian sovereign system, cannot be denied by foreign powers
 * Weakness: Satellite dependency — still needs sky visibility
 * Compensated by: INS + Ground Emitters
 *
 * DESIGN RULE: NAVIC is ALWAYS the primary Indian sovereign signal
 */

const PositioningLayer = require('./layer-base');

class NavicLayer extends PositioningLayer {
  constructor() {
    super({
      id: 2,
      name: 'NAVIC (Indian)',
      accuracyRange: [1.5, 5],  // military to civilian range
      strength: 'Indian sovereign system',
      weakness: 'Satellite dependency',
      compensatedBy: 'INS + Ground Emitters'
    });
    this.militaryMode = true;  // military encrypted signal — better accuracy
    this.regionalCoverage = true;  // NAVIC covers India + 1500km around
  }

  generateReading(truePosition) {
    // Military mode gives better accuracy (1.5m vs 5m)
    if (this.militaryMode) {
      this.accuracyRange = [1, 1.5];
    } else {
      this.accuracyRange = [3, 5];
    }

    // NAVIC has regional coverage — check if position is in range
    // India roughly: lat 6-37, lon 68-98
    const inRange = truePosition.lat >= 4 && truePosition.lat <= 39 &&
                    truePosition.lon >= 66 && truePosition.lon <= 100;

    if (!inRange) {
      this.active = false;
      return null;
    }

    this.active = true;
    // NAVIC gets highest weight — sovereign primary signal
    this.weight = 1.2;

    return super.generateReading(truePosition);
  }
}

module.exports = NavicLayer;
