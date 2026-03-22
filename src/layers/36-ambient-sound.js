/**
 * UPIE Layer 36 — Ambient Sound Fingerprint
 * Patent Pending — AIMCRS
 *
 * What it does: Records ambient soundscape and matches against database
 *   of known sound signatures at specific locations
 *   Airport sounds, factory noise, traffic patterns, nature sounds
 * Accuracy: 50-500 metres
 * Strength: Completely passive, works in any conditions, unjammable
 * Weakness: Low accuracy, needs sound database, affected by temporary noise
 */

const PositioningLayer = require('./layer-base');

class AmbientSoundLayer extends PositioningLayer {
  constructor() {
    super({
      id: 36,
      name: 'Ambient Sound',
      accuracyRange: [50, 500],
      strength: 'Completely passive, unjammable, any conditions',
      weakness: 'Low accuracy, needs sound database',
      compensatedBy: 'Vision, RF Fingerprint, WiFi'
    });
  }
}

module.exports = AmbientSoundLayer;
