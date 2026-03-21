/**
 * UPIE Layer 21 — eLoran (Enhanced Long Range Navigation)
 * Patent Pending — AIMCRS
 *
 * What it does: Ground-based radio towers broadcast very powerful
 *   low-frequency signals. These signals travel thousands of kilometres.
 *   By measuring the timing difference between signals from multiple
 *   towers, exact position is calculated.
 *
 * Why it matters:
 *   - Signal is 1 MILLION times stronger than GPS — extremely hard to jam
 *   - Covers entire countries from just a few towers
 *   - Multiple countries bringing this back as GPS backup
 *   - India is building its own eLoran network
 *   - Works indoors and in urban canyons where GPS fails
 *
 * Accuracy: 10-50 metres
 * Strength: Extremely powerful signal, very hard to jam, continental range
 * Weakness: Requires ground stations — only available in covered regions
 * Compensated by: Satellite layers where eLoran is unavailable
 */

const PositioningLayer = require('./layer-base');

class EloranLayer extends PositioningLayer {
  constructor() {
    super({
      id: 21,
      name: 'eLoran Ground Radio',
      accuracyRange: [10, 50],
      strength: '1M times stronger than GPS, very hard to jam',
      weakness: 'Needs ground stations in region',
      compensatedBy: 'Satellite layers where unavailable'
    });
    this.stationsInRange = 0;
    this.signalStrength = 1.0;
    this.inCoverageArea = false;
  }

  generateReading(truePosition) {
    if (!this.inCoverageArea || this.stationsInRange < 2) {
      this.active = false;
      return null;
    }

    this.active = true;

    // More stations = better accuracy
    const stationFactor = Math.max(1, 3 / this.stationsInRange);
    this.accuracyRange = [10 * stationFactor, 50 * stationFactor];

    // Very strong signal = high reliability
    this.weight = Math.min(1.1, 0.5 + (this.stationsInRange * 0.2));

    const reading = super.generateReading(truePosition);
    if (reading) {
      reading.stationsInRange = this.stationsInRange;
    }
    return reading;
  }
}

module.exports = EloranLayer;
