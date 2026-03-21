/**
 * UPIE Layer 4 — Star Tracking
 * Patent Pending — AIMCRS
 *
 * What it does: Uses a camera pointed at the sky to identify stars
 *   and calculate exact position from their known positions
 * Accuracy: 10-50 metres
 * Strength: UNJAMMABLE — nobody can jam the stars
 *   Provides absolute position fix — not relative
 * Weakness: Requires clear sky — clouds block the view
 * Compensated by: INS carries through cloud cover
 */

const PositioningLayer = require('./layer-base');

class StarTrackingLayer extends PositioningLayer {
  constructor() {
    super({
      id: 4,
      name: 'Star Tracking',
      accuracyRange: [10, 50],
      strength: 'Unjammable absolute fix',
      weakness: 'Requires clear sky',
      compensatedBy: 'INS carries through cloud'
    });
    this.skyVisibility = 1.0;  // 0 = fully clouded, 1 = clear sky
    this.isNight = true;       // stars more visible at night
    this.starsIdentified = 0;
  }

  generateReading(truePosition) {
    // Need at least some sky visibility
    if (this.skyVisibility < 0.2) {
      this.active = false;
      return null;
    }

    this.active = true;

    // Night + clear sky = best accuracy
    // Day = can still track bright stars but worse accuracy
    let accuracyMultiplier = 1.0;
    if (!this.isNight) accuracyMultiplier = 2.0;
    if (this.skyVisibility < 0.5) accuracyMultiplier *= 1.5;

    this.accuracyRange = [
      10 * accuracyMultiplier,
      50 * accuracyMultiplier
    ];

    this.starsIdentified = Math.floor(this.skyVisibility * (this.isNight ? 50 : 10));

    const reading = super.generateReading(truePosition);
    if (reading) {
      reading.starsIdentified = this.starsIdentified;
      reading.skyVisibility = this.skyVisibility;
    }
    return reading;
  }
}

module.exports = StarTrackingLayer;
