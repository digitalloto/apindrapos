/**
 * UPIE Layer 23 — Pulsar Navigation (XNAV)
 * Patent Pending — AIMCRS
 *
 * What it does: Pulsars are dead stars that spin incredibly fast
 *   and emit X-ray pulses at PERFECTLY regular intervals.
 *   They are like natural GPS satellites — but placed by the universe.
 *   By measuring the exact timing of pulses from multiple pulsars,
 *   position can be calculated ANYWHERE — on Earth, in space,
 *   on another planet.
 *
 * Why it matters:
 *   - ABSOLUTELY unjammable — nobody can jam a star
 *   - Works EVERYWHERE in the solar system — not just on Earth
 *   - NASA has demonstrated this on the International Space Station
 *     (SEXTANT experiment, 2018)
 *   - Accuracy improves with observation time
 *   - The ultimate backup — if all Earth-based systems fail,
 *     pulsars still work
 *
 * Accuracy: 5-100 metres (improves with longer observation time)
 * Strength: Absolutely unjammable, works anywhere in solar system
 * Weakness: Needs X-ray detector, requires minutes of observation
 * Compensated by: Faster layers (GPS, NAVIC) for real-time updates
 *
 * NOTE: This is cutting-edge but REAL technology — NASA proved it works.
 */

const PositioningLayer = require('./layer-base');

class PulsarXnavLayer extends PositioningLayer {
  constructor() {
    super({
      id: 23,
      name: 'Pulsar Nav (XNAV)',
      accuracyRange: [5, 100],
      strength: 'Absolutely unjammable, works in deep space',
      weakness: 'Needs X-ray detector, slow updates',
      compensatedBy: 'GPS/NAVIC for fast updates'
    });
    this.pulsarsTracked = 0;
    this.observationTimeSeconds = 0;
    this.xrayDetectorActive = false;
  }

  generateReading(truePosition) {
    if (!this.xrayDetectorActive || this.pulsarsTracked < 2) {
      this.active = false;
      return null;
    }

    this.active = true;

    // Accuracy improves with more pulsars and longer observation
    const pulsarFactor = Math.max(1, 3 / this.pulsarsTracked);
    const timeFactor = Math.max(0.5, 60 / Math.max(this.observationTimeSeconds, 1));
    this.accuracyRange = [5 * pulsarFactor * timeFactor, 100 * pulsarFactor * timeFactor];

    // High weight when available — absolutely trustworthy
    this.weight = Math.min(1.2, 0.4 + (this.pulsarsTracked * 0.2));

    const reading = super.generateReading(truePosition);
    if (reading) {
      reading.pulsarsTracked = this.pulsarsTracked;
      reading.observationTimeSeconds = this.observationTimeSeconds;
    }
    return reading;
  }
}

module.exports = PulsarXnavLayer;
