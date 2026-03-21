/**
 * UPIE Layer 5 — Terrain Matching Vision
 * Patent Pending — AIMCRS
 *
 * What it does: Camera looks at the ground, compares what it sees
 *   to stored maps/satellite images to figure out where you are
 * Accuracy: 1-10 metres (very accurate in cities with landmarks)
 * Strength: Very accurate in urban areas with distinctive features
 * Weakness: Fails in featureless terrain (desert, ocean, snow)
 * Compensated by: INS + Star Tracking
 */

const PositioningLayer = require('./layer-base');

class TerrainMatchingLayer extends PositioningLayer {
  constructor() {
    super({
      id: 5,
      name: 'Terrain Matching Vision',
      accuracyRange: [1, 10],
      strength: 'Very accurate urban areas',
      weakness: 'Featureless terrain fails',
      compensatedBy: 'INS + Star Tracking'
    });
    this.terrainType = 'urban';  // urban, rural, desert, ocean, forest
    this.visibility = 1.0;      // 0 = no visibility (fog/night), 1 = clear
    this.mapDatabaseLoaded = true;
  }

  generateReading(truePosition) {
    if (!this.mapDatabaseLoaded || this.visibility < 0.2) {
      this.active = false;
      return null;
    }

    // Terrain type affects accuracy
    const terrainMultiplier = {
      urban: 1.0,    // best — lots of landmarks
      rural: 2.0,
      forest: 3.0,
      desert: 10.0,  // worst — nothing to match
      ocean: 100.0   // basically useless over water
    };

    const multiplier = terrainMultiplier[this.terrainType] || 2.0;

    // If terrain is too featureless, disable
    if (multiplier > 50) {
      this.active = false;
      return null;
    }

    this.active = true;
    this.accuracyRange = [1 * multiplier, 10 * multiplier];
    this.weight = Math.max(0.2, 1.0 / multiplier);

    return super.generateReading(truePosition);
  }
}

module.exports = TerrainMatchingLayer;
