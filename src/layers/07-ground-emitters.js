/**
 * UPIE Layer 7 — Ground Based Emitters
 * Patent Pending — AIMCRS
 *
 * What it does: Radio beacons at known positions on the ground
 *   broadcast signals. The platform measures signal timing
 *   to calculate exact distance from each beacon.
 * Accuracy: 1-5 metres (very accurate near bases)
 * Strength: Very accurate within range — cancels maximum error near friendly bases
 *   (Validated by Group Captain Surya Prakash)
 * Weakness: Fixed range — only works near the emitters
 * Compensated by: Long range covered by INS
 */

const PositioningLayer = require('./layer-base');

class GroundEmittersLayer extends PositioningLayer {
  constructor() {
    super({
      id: 7,
      name: 'Ground Based Emitters',
      accuracyRange: [1, 5],
      strength: 'Very accurate near base',
      weakness: 'Fixed range from emitter',
      compensatedBy: 'Long range covered by INS'
    });
    this.maxRangeKm = 50;  // effective range from nearest emitter
    this.distanceFromNearestKm = 0;  // simulated distance
    this.emittersInRange = 3;
  }

  generateReading(truePosition) {
    // Beyond range — layer cannot help
    if (this.distanceFromNearestKm > this.maxRangeKm) {
      this.active = false;
      return null;
    }

    this.active = true;

    // Accuracy degrades with distance
    const distanceFactor = this.distanceFromNearestKm / this.maxRangeKm;
    this.accuracyRange = [
      1 + (distanceFactor * 10),
      5 + (distanceFactor * 50)
    ];

    // More emitters in range = better accuracy
    this.weight = Math.min(1.5, 0.5 + (this.emittersInRange * 0.3));

    return super.generateReading(truePosition);
  }
}

module.exports = GroundEmittersLayer;
