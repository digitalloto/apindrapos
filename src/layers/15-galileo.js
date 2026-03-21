/**
 * UPIE Layer 15 — Galileo (European Satellite System)
 * Patent Pending — AIMCRS
 *
 * What it does: European Union's satellite navigation system.
 *   Most accurate civilian satellite system in the world.
 *   Using GPS + NAVIC + GLONASS + Galileo = maximum satellite coverage.
 *
 * Accuracy: 1-3 metres (best civilian accuracy of any satellite system)
 * Strength: Most accurate civilian GNSS, independent European system
 * Weakness: Controlled by EU — could be restricted in conflict
 * Compensated by: NAVIC (Indian sovereign) + GPS + non-satellite layers
 */

const PositioningLayer = require('./layer-base');

class GalileoLayer extends PositioningLayer {
  constructor() {
    super({
      id: 15,
      name: 'Galileo (Europe)',
      accuracyRange: [1, 3],
      strength: 'Most accurate civilian GNSS',
      weakness: 'Controlled by EU',
      compensatedBy: 'NAVIC + GPS + non-satellite layers'
    });
    this.satellitesInView = 10;
    this.signalStrength = 1.0;
    this.highAccuracyService = true; // Galileo HAS — better than GPS
  }

  generateReading(truePosition) {
    if (this.signalStrength < 0.3) {
      this.jammed = true;
      return null;
    }

    this.jammed = false;
    this.active = true;

    if (this.highAccuracyService) {
      this.accuracyRange = [1, 2];
    } else {
      this.accuracyRange = [2, 3];
    }

    this.weight = 0.9; // high trust — very accurate system

    const reading = super.generateReading(truePosition);
    if (reading) {
      reading.satellitesInView = this.satellitesInView;
      reading.highAccuracyService = this.highAccuracyService;
    }
    return reading;
  }
}

module.exports = GalileoLayer;
