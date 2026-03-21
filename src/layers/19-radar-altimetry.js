/**
 * UPIE Layer 19 — Radar Altimetry
 * Patent Pending — AIMCRS
 *
 * What it does: Bounces a radar signal straight down at the ground.
 *   Measures the time for the signal to return = exact height above ground.
 *   Much more precise than barometric pressure for altitude.
 *
 * Why it matters:
 *   - Combined with terrain maps, height above ground = position
 *   - Works in any weather (radar penetrates rain, fog, clouds)
 *   - When combined with Terrain Matching (Layer 5), gives both
 *     horizontal AND vertical position from the ground
 *
 * Accuracy: 0.5-5 metres vertical (very precise)
 * Strength: All-weather altitude, very precise
 * Weakness: Active sensor — emits radar signal — can be detected
 * Compensated by: Barometric (passive) when stealth is needed
 */

const PositioningLayer = require('./layer-base');

class RadarAltimetryLayer extends PositioningLayer {
  constructor() {
    super({
      id: 19,
      name: 'Radar Altimetry',
      accuracyRange: [0.5, 5],
      strength: 'Very precise altitude, all weather',
      weakness: 'Active emission — detectable',
      compensatedBy: 'Barometric altitude for stealth'
    });
    this.altitudeOnly = true;  // only provides altitude
    this.stealthMode = false;  // if true, radar off to avoid detection
    this.heightAboveGround = 0;
  }

  generateReading(truePosition) {
    // In stealth mode, turn off radar to avoid detection
    if (this.stealthMode) {
      this.active = false;
      return null;
    }

    this.active = true;
    this.weight = 1.0;

    const reading = super.generateReading(truePosition);
    if (reading) {
      // Radar altimetry only gives altitude — not lat/lon
      reading.lat = null;
      reading.lon = null;
      reading.altitudeOnly = true;
      reading.alt = truePosition.alt + (Math.random() - 0.5) * this.getErrorMetres();
      reading.heightAboveGround = this.heightAboveGround;
    }
    return reading;
  }
}

module.exports = RadarAltimetryLayer;
