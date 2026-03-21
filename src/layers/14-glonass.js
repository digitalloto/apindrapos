/**
 * UPIE Layer 14 — GLONASS (Russia Satellite System)
 * Patent Pending — AIMCRS
 *
 * What it does: Russia's satellite navigation system.
 *   Works like GPS but uses different satellites in different orbits.
 *   Using GLONASS + GPS + NAVIC together means more satellites visible
 *   at any time = better accuracy and reliability.
 *
 * Accuracy: 5-10 metres
 * Strength: Independent satellite constellation — different orbits from GPS
 * Weakness: Controlled by Russia — could be denied in conflict
 * Compensated by: GPS + NAVIC + Galileo provide backup
 *
 * NOTE: Even if Russia denies GLONASS, UPIE detects the loss
 *   and continues with other satellite systems + non-satellite layers.
 */

const PositioningLayer = require('./layer-base');

class GlonassLayer extends PositioningLayer {
  constructor() {
    super({
      id: 14,
      name: 'GLONASS (Russia)',
      accuracyRange: [5, 10],
      strength: 'Independent satellite constellation',
      weakness: 'Controlled by Russia',
      compensatedBy: 'GPS + NAVIC + Galileo'
    });
    this.satellitesInView = 8;
    this.signalStrength = 1.0;
  }

  generateReading(truePosition) {
    if (this.signalStrength < 0.3) {
      this.jammed = true;
      return null;
    }

    this.jammed = false;
    this.active = true;

    // Degrade accuracy with weak signal
    if (this.signalStrength < 0.7) {
      this.accuracyRange = [10, 25];
    } else {
      this.accuracyRange = [5, 10];
    }

    this.weight = 0.8; // slightly lower trust — foreign system

    const reading = super.generateReading(truePosition);
    if (reading) {
      reading.satellitesInView = this.satellitesInView;
      reading.signalStrength = this.signalStrength;
    }
    return reading;
  }
}

module.exports = GlonassLayer;
