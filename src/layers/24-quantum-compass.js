/**
 * UPIE Layer 24 — Quantum Compass / Quantum Inertial Navigation
 * Patent Pending — AIMCRS
 *
 * What it does: Uses quantum physics — specifically cold atom
 *   interferometry — to measure acceleration and rotation with
 *   extreme precision. Like a super-precise INS that does NOT drift.
 *
 *   Normal INS (Layer 3) uses mechanical/MEMS gyroscopes that drift.
 *   A quantum compass uses atoms cooled to near absolute zero — their
 *   quantum behaviour measures movement with zero drift.
 *
 * Why it matters:
 *   - NO DRIFT — the biggest weakness of INS is eliminated
 *   - No external signals needed — completely self-contained
 *   - Cannot be jammed, spoofed, or detected
 *   - UK Ministry of Defence has funded development (Imperial College)
 *   - Represents the FUTURE of navigation
 *
 * Accuracy: 1-10 metres (and does not degrade over time like INS)
 * Strength: No drift, no external dependency, unjammable
 * Weakness: Experimental — large/expensive hardware, sensitivity to vibration
 * Compensated by: Standard INS as fallback if quantum sensor fails
 *
 * NOTE: This is emerging technology. Hardware is being miniaturised.
 *   Including it in UPIE architecture makes the system future-proof.
 */

const PositioningLayer = require('./layer-base');

class QuantumCompassLayer extends PositioningLayer {
  constructor() {
    super({
      id: 24,
      name: 'Quantum Compass',
      accuracyRange: [1, 10],
      strength: 'No drift, no external signals, unjammable',
      weakness: 'Experimental, large hardware, vibration sensitive',
      compensatedBy: 'Standard INS as fallback'
    });
    this.sensorOperational = false;  // quantum sensor is delicate
    this.vibrationLevel = 0;         // 0 = still, 1 = heavy vibration
    this.coldAtomTemperatureOk = true;
  }

  generateReading(truePosition) {
    if (!this.sensorOperational) {
      this.active = false;
      return null;
    }

    // Heavy vibration disrupts the cold atoms
    if (this.vibrationLevel > 0.7) {
      this.active = false;
      return null;
    }

    this.active = true;

    // Vibration degrades accuracy
    const vibFactor = 1 + (this.vibrationLevel * 3);
    this.accuracyRange = [1 * vibFactor, 10 * vibFactor];

    // Very high trust when operational — no drift, no external dependency
    this.weight = Math.max(0.5, 1.3 - this.vibrationLevel);

    return super.generateReading(truePosition);
  }
}

module.exports = QuantumCompassLayer;
