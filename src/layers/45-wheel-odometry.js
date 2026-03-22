/**
 * UPIE Layer 45 — Wheel Odometry
 * Patent Pending — AIMCRS
 *
 * What it does: Measures wheel rotations to calculate distance travelled
 *   Combined with steering angle → tracks vehicle path
 *   Every car, tank, and rover has wheel sensors
 * Accuracy: 1-10 metres (over short distances)
 * Strength: Always available on wheeled vehicles, very reliable
 * Weakness: Wheel slip, tire pressure changes, surface dependent
 */

const PositioningLayer = require('./layer-base');

class WheelOdometryLayer extends PositioningLayer {
  constructor() {
    super({
      id: 45,
      name: 'Wheel Odometry',
      accuracyRange: [1, 10],
      strength: 'Always available on vehicles, very reliable',
      weakness: 'Wheel slip, tire wear, surface dependent',
      compensatedBy: 'INS, Visual Odometry, GPS'
    });
  }
}

module.exports = WheelOdometryLayer;
