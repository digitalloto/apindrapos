/**
 * UPIE Layer 9 — Cell Tower Triangulation
 * Patent Pending — AIMCRS — NOVEL CONTRIBUTION
 *
 * What it does: Calculates position from mobile cell tower signals
 *   exactly like a phone does — but as a military navigation input
 *   Uses ENEMY cell towers — they cannot remove them without
 *   destroying their own communications
 *
 * Accuracy: 50-300 metres
 * Strength: Ubiquitous coverage — cell towers everywhere in populated areas
 * Weakness: Requires cell coverage — not available in remote wilderness
 * Compensated by: Other layers in remote areas
 */

const PositioningLayer = require('./layer-base');

class CellTowerLayer extends PositioningLayer {
  constructor() {
    super({
      id: 9,
      name: 'Cell Tower Triangulation',
      accuracyRange: [50, 300],
      strength: 'Ubiquitous coverage',
      weakness: 'Requires cell coverage',
      compensatedBy: 'Other layers in remote areas'
    });
    this.towersInRange = 0;
    this.inHostileTerritory = false;
  }

  generateReading(truePosition) {
    if (this.towersInRange < 1) {
      this.active = false;
      return null;
    }

    this.active = true;

    // More towers = better triangulation
    const towerFactor = Math.max(1, 3 / this.towersInRange);
    this.accuracyRange = [50 * towerFactor, 300 * towerFactor];

    // In hostile territory, weight slightly lower — enemy could manipulate
    this.weight = this.inHostileTerritory ? 0.6 : 0.8;

    const reading = super.generateReading(truePosition);
    if (reading) {
      reading.towersInRange = this.towersInRange;
      reading.hostileTerritory = this.inHostileTerritory;
    }
    return reading;
  }
}

module.exports = CellTowerLayer;
