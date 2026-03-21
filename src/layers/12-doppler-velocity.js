/**
 * UPIE Layer 12 — Doppler Velocity
 * Patent Pending — AIMCRS
 *
 * What it does: Measures speed very accurately using the Doppler effect
 *   (the way a siren's pitch changes as an ambulance passes — same principle)
 *   Feeds velocity into INS calculation to improve position tracking
 * Accuracy: Velocity 0.1 m/s (very precise speed measurement)
 * Strength: Speed measurement very accurate
 * Weakness: Does not give position directly — only speed
 * Compensated by: Feeds into INS calculation to reduce drift
 */

const PositioningLayer = require('./layer-base');

class DopplerVelocityLayer extends PositioningLayer {
  constructor() {
    super({
      id: 12,
      name: 'Doppler Velocity',
      accuracyRange: [0.1, 0.5],  // velocity accuracy in m/s
      strength: 'Speed very accurate',
      weakness: 'Position not direct',
      compensatedBy: 'Feeds into INS calculation'
    });
    this.velocityOnly = true;  // flag: this layer only provides velocity
  }

  generateReading(truePosition) {
    const reading = super.generateReading(truePosition);
    if (reading) {
      // This layer provides velocity, not position
      reading.lat = null;
      reading.lon = null;
      reading.alt = null;
      reading.velocityOnly = true;
      // Simulated velocity
      reading.velocityMps = 250 + (Math.random() - 0.5) * 0.1;  // ~250 m/s with 0.1 accuracy
      reading.heading = 45 + (Math.random() - 0.5) * 0.5;  // heading in degrees
    }
    return reading;
  }
}

module.exports = DopplerVelocityLayer;
