/**
 * UPIE Layer 1 — GPS / GNSS
 * Patent Pending — AIMCRS
 *
 * What it does: Uses satellite signals to calculate position
 * Accuracy: 3-5 metres
 * Strength: Global coverage, works in any weather
 * Weakness: Can be JAMMED (signal blocked) or SPOOFED (fake signal sent)
 * Compensated by: All other 11 layers detect inconsistency
 */

const PositioningLayer = require('./layer-base');

class GpsGnssLayer extends PositioningLayer {
  constructor() {
    super({
      id: 1,
      name: 'GPS / GNSS',
      accuracyRange: [3, 5],
      strength: 'Global coverage, any weather',
      weakness: 'Jammable, Spoofable',
      compensatedBy: 'All other layers detect inconsistency'
    });
    this.satellitesInView = 12;
    this.signalStrength = 1.0;  // 0 = no signal, 1 = full signal
  }

  generateReading(truePosition) {
    // If signal strength is low, accuracy degrades
    if (this.signalStrength < 0.3) {
      this.jammed = true;
      return null;
    }

    // Degrade accuracy when signal is weak
    const originalRange = [...this.accuracyRange];
    if (this.signalStrength < 0.7) {
      this.accuracyRange = [5, 15];  // weaker signal = worse accuracy
    }

    const reading = super.generateReading(truePosition);

    this.accuracyRange = originalRange;

    if (reading) {
      reading.satellitesInView = this.satellitesInView;
      reading.signalStrength = this.signalStrength;
    }

    return reading;
  }
}

module.exports = GpsGnssLayer;
