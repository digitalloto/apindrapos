/**
 * UPIE Layer 40 — Radar SLAM
 * Patent Pending — AIMCRS
 *
 * What it does: Uses radar returns to build a map and localise within it
 *   Works in rain, fog, smoke, dust — unlike LiDAR and camera
 *   Synthetic Aperture Radar (SAR) for terrain matching from air
 * Accuracy: 1-10 metres
 * Strength: All-weather, works through smoke/dust/fog, long range
 * Weakness: Lower resolution than LiDAR, complex processing
 */

const PositioningLayer = require('./layer-base');

class RadarSlamLayer extends PositioningLayer {
  constructor() {
    super({
      id: 40,
      name: 'Radar SLAM / SAR',
      accuracyRange: [1, 10],
      strength: 'All-weather, smoke/fog/dust penetration',
      weakness: 'Lower resolution than LiDAR, complex compute',
      compensatedBy: 'LiDAR SLAM, Terrain Matching, INS'
    });
  }
}

module.exports = RadarSlamLayer;
