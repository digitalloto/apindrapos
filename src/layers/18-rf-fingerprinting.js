/**
 * UPIE Layer 18 — Radio Frequency Fingerprinting
 * Patent Pending — AIMCRS
 *
 * What it does: Every location has a unique "fingerprint" of radio signals.
 *   AM/FM radio stations, TV broadcasts, military radios, emergency services,
 *   aviation comms — they all create a unique pattern of signal strengths
 *   and directions at every point on Earth.
 *
 *   UPIE records this fingerprint and matches it against a database
 *   of known fingerprints to determine position.
 *
 * Why it matters:
 *   - Uses signals that ALREADY EXIST — no new infrastructure
 *   - Very hard to spoof — would need to fake dozens of radio sources
 *   - Works in cities where radio signals are dense
 *   - Complementary to WiFi Mapping (Layer 8) and Cell Tower (Layer 9)
 *
 * Accuracy: 20-200 metres (depends on signal density)
 * Strength: Uses existing radio environment, hard to spoof
 * Weakness: Needs pre-mapped RF database, less effective in rural areas
 * Compensated by: Satellite layers in rural, WiFi/Cell in urban
 */

const PositioningLayer = require('./layer-base');

class RfFingerprintingLayer extends PositioningLayer {
  constructor() {
    super({
      id: 18,
      name: 'RF Fingerprinting',
      accuracyRange: [20, 200],
      strength: 'Uses existing radio signals, hard to spoof',
      weakness: 'Needs RF database, less in rural',
      compensatedBy: 'Satellite layers in rural areas'
    });
    this.signalSourcesDetected = 0;
    this.environmentType = 'urban'; // urban, suburban, rural
    this.rfDatabaseLoaded = true;
  }

  generateReading(truePosition) {
    if (this.signalSourcesDetected < 3 || !this.rfDatabaseLoaded) {
      this.active = false;
      return null;
    }

    this.active = true;

    // More signal sources = better fingerprint match
    const sourceFactor = Math.max(1, 10 / this.signalSourcesDetected);
    const envMultiplier = { urban: 1.0, suburban: 2.0, rural: 5.0 };
    const mult = envMultiplier[this.environmentType] || 2.0;

    this.accuracyRange = [20 * sourceFactor * mult, 200 * sourceFactor * mult];
    this.weight = Math.min(0.8, this.signalSourcesDetected / 15);

    const reading = super.generateReading(truePosition);
    if (reading) {
      reading.signalSourcesDetected = this.signalSourcesDetected;
      reading.environmentType = this.environmentType;
    }
    return reading;
  }
}

module.exports = RfFingerprintingLayer;
