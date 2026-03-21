/**
 * UPIE Layer 10 — Acoustic Triangulation (Underwater)
 * Patent Pending — AIMCRS
 *
 * What it does: Uses underwater acoustic nodes that broadcast timing pings
 *   The submarine/UUV measures timing from multiple nodes to triangulate
 *   GPS does NOT penetrate water — acoustic signals DO
 *
 * Accuracy: 1-10 metres
 * Strength: Works in GPS-denied underwater environment
 * Weakness: Only works underwater — above water use other layers
 * Compensated by: Surface layers for air/land platforms
 *
 * Links to: APINDRA Maritime Domain Extension — underwater IoT mesh network
 */

const PositioningLayer = require('./layer-base');

class AcousticTriangulationLayer extends PositioningLayer {
  constructor() {
    super({
      id: 10,
      name: 'Acoustic Triangulation',
      accuracyRange: [1, 10],
      strength: 'GPS-denied underwater',
      weakness: 'Underwater only',
      compensatedBy: 'Surface layers for air/land'
    });
    this.isUnderwater = false;
    this.nodesInRange = 0;
    this.depthMetres = 0;
  }

  generateReading(truePosition) {
    // Only works underwater
    if (!this.isUnderwater || this.nodesInRange < 2) {
      this.active = false;
      return null;
    }

    this.active = true;

    // More nodes = better triangulation
    const nodeFactor = Math.max(1, 3 / this.nodesInRange);
    this.accuracyRange = [1 * nodeFactor, 10 * nodeFactor];

    // Deep water — acoustic signals degrade
    if (this.depthMetres > 500) {
      this.accuracyRange[0] *= 2;
      this.accuracyRange[1] *= 2;
    }

    this.weight = Math.min(1.2, 0.4 + (this.nodesInRange * 0.2));

    const reading = super.generateReading(truePosition);
    if (reading) {
      reading.nodesInRange = this.nodesInRange;
      reading.depthMetres = this.depthMetres;
    }
    return reading;
  }
}

module.exports = AcousticTriangulationLayer;
