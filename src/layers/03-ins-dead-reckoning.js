/**
 * UPIE Layer 3 — INS Dead Reckoning
 * Patent Pending — AIMCRS
 *
 * What it does: Tracks movement using internal gyroscopes and accelerometers
 *   "Dead reckoning" = calculating where you are based on where you started
 *   and how you moved since then
 * Accuracy: 100m to 1km (gets worse over time — this is called "drift")
 * Strength: Zero external dependency — works indoors, underground, underwater
 * Weakness: Drifts over time — error grows the longer you rely on it alone
 * Compensated by: GPS + NAVIC periodic reset
 */

const PositioningLayer = require('./layer-base');

class InsDeadReckoningLayer extends PositioningLayer {
  constructor() {
    super({
      id: 3,
      name: 'INS Dead Reckoning',
      accuracyRange: [100, 1000],
      strength: 'Zero external dependency',
      weakness: 'Drifts over time',
      compensatedBy: 'GPS + NAVIC periodic reset'
    });
    this.lastResetTime = Date.now();
    this.driftRateMetresPerSecond = 0.05;  // typical INS drift
    this.platformDriftLearnedRate = null;  // UPIE learns this over time
  }

  generateReading(truePosition) {
    // Calculate how long since last GPS/NAVIC reset
    const secondsSinceReset = (Date.now() - this.lastResetTime) / 1000;

    // Drift grows over time — this is the key weakness of INS
    const driftRate = this.platformDriftLearnedRate || this.driftRateMetresPerSecond;
    const currentDrift = secondsSinceReset * driftRate;

    // Accuracy degrades with drift
    this.accuracyRange = [
      Math.min(100 + currentDrift, 2000),
      Math.min(1000 + currentDrift, 5000)
    ];

    // Weight decreases as drift increases
    this.weight = Math.max(0.3, 1.0 - (currentDrift / 5000));

    return super.generateReading(truePosition);
  }

  // Called when GPS or NAVIC provides a fix — resets the drift clock
  resetDrift() {
    this.lastResetTime = Date.now();
    this.accuracyRange = [100, 1000];
    this.weight = 1.0;
  }

  // UPIE learning — record actual drift for this specific platform
  learnDriftRate(measuredDrift, timePeriod) {
    this.platformDriftLearnedRate = measuredDrift / timePeriod;
  }
}

module.exports = InsDeadReckoningLayer;
