/**
 * UPIE Layer 39 — Seismic / Vibration Positioning
 * Patent Pending — AIMCRS
 *
 * What it does: Detects ground vibrations and seismic waves
 *   Matches seismic signature against known geological profiles
 *   Also uses footstep/vehicle vibration patterns for indoor tracking
 * Accuracy: 50-500 metres (outdoor), 1-10m (indoor footstep)
 * Strength: Works underground, through any material, completely passive
 * Weakness: Low accuracy outdoors, needs seismic database
 */

const PositioningLayer = require('./layer-base');

class SeismicPositioningLayer extends PositioningLayer {
  constructor() {
    super({
      id: 39,
      name: 'Seismic / Vibration',
      accuracyRange: [10, 500],
      strength: 'Works underground, through walls, passive',
      weakness: 'Variable accuracy, needs seismic database',
      compensatedBy: 'Gravity Gradient, Magnetic Anomaly, Cosmic Ray'
    });
  }
}

module.exports = SeismicPositioningLayer;
