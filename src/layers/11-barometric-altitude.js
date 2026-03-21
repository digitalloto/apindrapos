/**
 * UPIE Layer 11 — Barometric Altitude
 * Patent Pending — AIMCRS
 *
 * What it does: Measures air pressure to calculate altitude (height)
 *   Air pressure decreases as you go higher — very predictable relationship
 * Accuracy: 1-10 metres VERTICAL only
 * Strength: Very accurate altitude measurement
 * Weakness: Only gives height — no horizontal position
 * Compensated by: Combined with horizontal layers for full 3D position
 */

const PositioningLayer = require('./layer-base');

class BarometricAltitudeLayer extends PositioningLayer {
  constructor() {
    super({
      id: 11,
      name: 'Barometric Altitude',
      accuracyRange: [1, 10],
      strength: 'Very accurate altitude',
      weakness: 'Horizontal only aids',
      compensatedBy: 'Combined with horizontal layers'
    });
    this.pressureHpa = 1013.25;  // standard sea level pressure
    this.altitudeOnly = true;    // flag: this layer only provides altitude
  }

  generateReading(truePosition) {
    const reading = super.generateReading(truePosition);
    if (reading) {
      // This layer is special — only altitude is accurate
      // Lat/lon are not meaningful from barometric pressure
      reading.lat = null;
      reading.lon = null;
      reading.altitudeOnly = true;
      // Alt reading is good
      reading.alt = truePosition.alt + (Math.random() - 0.5) * this.getErrorMetres();
      reading.pressureHpa = this.pressureHpa;
    }
    return reading;
  }
}

module.exports = BarometricAltitudeLayer;
