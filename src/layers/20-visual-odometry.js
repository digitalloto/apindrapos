/**
 * UPIE Layer 20 — Visual Odometry
 * Patent Pending — AIMCRS
 *
 * What it does: A camera looks at the world and tracks how the view
 *   changes from frame to frame. By measuring how objects move in
 *   the camera image, it calculates how the platform itself moved.
 *
 *   Think of it like this: if you look out a car window and see
 *   a tree moving to the left, you know the car moved to the right.
 *   Visual Odometry does this with mathematical precision.
 *
 * Why it matters:
 *   - Like INS (Layer 3) but uses a camera instead of gyroscopes
 *   - Can detect very small movements
 *   - Helps correct INS drift between GPS fixes
 *   - Especially useful for drones flying close to the ground
 *
 * Accuracy: 0.5-5 metres (very good when features are visible)
 * Strength: Very precise movement tracking, no external signals needed
 * Weakness: Needs visible features — fails in dark/fog/featureless terrain
 * Compensated by: INS carries through low-visibility periods
 */

const PositioningLayer = require('./layer-base');

class VisualOdometryLayer extends PositioningLayer {
  constructor() {
    super({
      id: 20,
      name: 'Visual Odometry',
      accuracyRange: [0.5, 5],
      strength: 'Precise movement tracking, no signals needed',
      weakness: 'Needs visible features',
      compensatedBy: 'INS in low visibility'
    });
    this.visibility = 1.0;       // 0 = dark/fog, 1 = clear
    this.featureDensity = 1.0;   // 0 = featureless, 1 = rich features
    this.frameRate = 30;         // camera frames per second
    this.driftAccumulated = 0;   // drift over time like INS
    this.lastResetTime = Date.now();
  }

  generateReading(truePosition) {
    if (this.visibility < 0.2 || this.featureDensity < 0.1) {
      this.active = false;
      return null;
    }

    this.active = true;

    // Drift accumulates over time (like INS but slower)
    const secondsSinceReset = (Date.now() - this.lastResetTime) / 1000;
    const drift = secondsSinceReset * 0.01; // much slower drift than INS

    const qualityFactor = this.visibility * this.featureDensity;
    this.accuracyRange = [
      Math.min(0.5 + drift, 50) / qualityFactor,
      Math.min(5 + drift, 100) / qualityFactor
    ];

    this.weight = Math.max(0.3, qualityFactor);

    return super.generateReading(truePosition);
  }

  resetDrift() {
    this.lastResetTime = Date.now();
    this.driftAccumulated = 0;
  }
}

module.exports = VisualOdometryLayer;
