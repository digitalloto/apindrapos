/**
 * UPIE Layer 31 — LiDAR SLAM
 * Patent Pending — AIMCRS
 *
 * What it does: Simultaneous Localization And Mapping using laser scanning
 *   Builds 3D map of surroundings while tracking position within it
 * Accuracy: 0.05-0.5 metres
 * Strength: Extremely precise, works in GPS-denied environments, builds maps
 * Weakness: Expensive sensor, computationally heavy, affected by rain/fog
 */

const PositioningLayer = require('./layer-base');

class LidarSlamLayer extends PositioningLayer {
  constructor() {
    super({
      id: 31,
      name: 'LiDAR SLAM',
      accuracyRange: [0.05, 0.5],
      strength: 'Ultra-precise 3D mapping, GPS-denied capable',
      weakness: 'Expensive, compute-heavy, weather-affected',
      compensatedBy: 'Visual Odometry, Radar SLAM, INS'
    });
  }
}

module.exports = LidarSlamLayer;
