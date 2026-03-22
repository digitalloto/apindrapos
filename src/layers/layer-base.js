/**
 * UPIE — Base Positioning Layer
 * Patent Pending — AIMCRS
 *
 * Every positioning layer extends this base.
 * Each layer produces: { lat, lon, alt, accuracy, layerId, layerName, timestamp, active }
 */

class PositioningLayer {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.accuracyRange = config.accuracyRange;   // [min metres, max metres]
    this.strength = config.strength;
    this.weakness = config.weakness;
    this.compensatedBy = config.compensatedBy;
    this.active = true;
    this.jammed = false;
    this.spoofed = false;
    this.banned = false;          // Auto-ban: layer excluded from fusion
    this.banCount = 0;            // How many times this layer has been banned
    this.consecutiveOutliers = 0; // Consecutive cycles as outlier
    this.weight = 1.0;   // AI adjusts this based on conditions
    this.lastReading = null;
  }

  // Add random noise to simulate real sensor error
  // errorMetres = how many metres of error to add
  addNoise(trueValue, errorMetres) {
    // 1 degree of latitude ≈ 111,320 metres
    const errorDegrees = errorMetres / 111320;
    // Gaussian-like noise using Box-Muller transform
    const u1 = Math.max(0.0001, Math.random());  // avoid log(0)
    const u2 = Math.random();
    let gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    // Clamp to ±2 standard deviations — prevents extreme outlier noise
    gaussian = Math.max(-2, Math.min(2, gaussian));
    return trueValue + (gaussian * errorDegrees);
  }

  // Random error within this layer's accuracy range
  getErrorMetres() {
    const [min, max] = this.accuracyRange;
    return min + Math.random() * (max - min);
  }

  // Generate a simulated reading — override in subclass for special behaviour
  generateReading(truePosition) {
    if (!this.active || this.jammed) {
      return null;
    }

    const errorMetres = this.getErrorMetres();
    const reading = {
      layerId: this.id,
      layerName: this.name,
      lat: this.addNoise(truePosition.lat, errorMetres),
      lon: this.addNoise(truePosition.lon, errorMetres),
      alt: truePosition.alt + (Math.random() - 0.5) * (errorMetres * 0.3),
      accuracyMetres: errorMetres,
      timestamp: Date.now(),
      active: true,
      jammed: false,
      spoofed: false
    };

    // If spoofed — return deliberately wrong position
    if (this.spoofed) {
      reading.lat += 0.01;  // ~1.1km offset
      reading.lon += 0.01;
      reading.spoofed = true;  // internal flag — real spoof wouldn't have this
    }

    this.lastReading = reading;
    return reading;
  }

  // Get layer status for dashboard
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      active: this.active,
      jammed: this.jammed,
      spoofed: this.spoofed,
      banned: this.banned,
      banCount: this.banCount,
      consecutiveOutliers: this.consecutiveOutliers,
      weight: this.weight,
      accuracyRange: this.accuracyRange,
      strength: this.strength,
      weakness: this.weakness,
      lastReading: this.lastReading
    };
  }
}

module.exports = PositioningLayer;
