/**
 * UPIE Layer 13 — Sun / Moon Celestial Tracking
 * Patent Pending — AIMCRS
 *
 * What it does: During DAYTIME, uses the sun's position in the sky
 *   to calculate exact location. At night or twilight, uses the moon.
 *   The sun and moon are at precisely known positions at every second
 *   of every day — if you know the time and measure the angle to the
 *   sun, you can calculate where on Earth you are.
 *
 * Why it matters: Star Tracking (Layer 4) works best at night.
 *   This layer fills the DAYTIME GAP — together they give 24-hour
 *   celestial navigation coverage.
 *
 * Accuracy: 20-100 metres (sun is bright and easy to track precisely)
 * Strength: Works during daytime when stars are invisible. Unjammable.
 * Weakness: Requires sky visibility — clouds/fog block the sun
 * Compensated by: Star Tracking at night, INS through cloud
 */

const PositioningLayer = require('./layer-base');

class SunMoonTrackingLayer extends PositioningLayer {
  constructor() {
    super({
      id: 13,
      name: 'Sun/Moon Celestial',
      accuracyRange: [20, 100],
      strength: 'Daytime celestial nav, unjammable',
      weakness: 'Requires sky visibility',
      compensatedBy: 'Star Tracking at night, INS through cloud'
    });
    this.isDaytime = true;
    this.skyVisibility = 1.0;   // 0 = overcast, 1 = clear
    this.celestialBody = 'sun'; // sun or moon
    this.timeAccuracy = 0.001;  // seconds — precise time needed
  }

  generateReading(truePosition) {
    if (this.skyVisibility < 0.3) {
      this.active = false;
      return null;
    }

    this.active = true;

    // Sun gives better accuracy than moon (brighter, sharper edge)
    let accuracyMultiplier = 1.0;
    if (this.isDaytime) {
      this.celestialBody = 'sun';
      accuracyMultiplier = 1.0;  // best
    } else {
      this.celestialBody = 'moon';
      accuracyMultiplier = 2.0;  // moon is dimmer, less precise
    }

    // Cloud cover degrades accuracy
    if (this.skyVisibility < 0.6) accuracyMultiplier *= 1.5;

    this.accuracyRange = [20 * accuracyMultiplier, 100 * accuracyMultiplier];
    this.weight = Math.max(0.4, this.skyVisibility * 0.8);

    const reading = super.generateReading(truePosition);
    if (reading) {
      reading.celestialBody = this.celestialBody;
      reading.skyVisibility = this.skyVisibility;
    }
    return reading;
  }
}

module.exports = SunMoonTrackingLayer;
