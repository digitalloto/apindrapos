/**
 * UPIE Layer 8 — WiFi Signal Mapping
 * Patent Pending — AIMCRS — NOVEL CONTRIBUTION
 *
 * What it does: Detects WiFi signals from buildings and structures
 *   Maps signal strengths and directions to calculate position
 *   Uses ENEMY WiFi as navigation landmarks — they cannot quickly
 *   remove WiFi without disrupting their own operations
 *
 * Additional capability: WiFi through-wall sensing
 *   Uses WiFi signal reflections to detect movement and map structures
 *   THROUGH WALLS — enabling terminal guidance identification
 *   Addresses critical problem identified by Group Captain Surya Prakash:
 *   "At 10-20 feet above a target you cannot tell if it is a school or a bunker"
 *
 * Accuracy: 10-30 metres
 * Strength: Signals already exist — uses existing infrastructure
 * Weakness: Enemy can turn off WiFi (but disrupts their own operations)
 * Compensated by: Multiple sources used together
 */

const PositioningLayer = require('./layer-base');

class WifiMappingLayer extends PositioningLayer {
  constructor() {
    super({
      id: 8,
      name: 'WiFi Signal Mapping',
      accuracyRange: [10, 30],
      strength: 'Uses existing signals as landmarks',
      weakness: 'Enemy can turn off WiFi',
      compensatedBy: 'Multiple sources used together'
    });
    this.accessPointsDetected = 0;
    this.throughWallSensingActive = false;
    this.structureMapAvailable = false;
  }

  generateReading(truePosition) {
    // Simulate WiFi access points in range
    // Urban areas have many, rural areas have few
    if (this.accessPointsDetected < 2) {
      this.active = false;
      return null;
    }

    this.active = true;

    // More APs = better accuracy
    const apFactor = Math.max(1, 10 / this.accessPointsDetected);
    this.accuracyRange = [10 * apFactor, 30 * apFactor];
    this.weight = Math.min(1.0, this.accessPointsDetected / 10);

    const reading = super.generateReading(truePosition);
    if (reading) {
      reading.accessPointsDetected = this.accessPointsDetected;
      reading.throughWallSensing = this.throughWallSensingActive;
    }
    return reading;
  }

  // Terminal guidance — map what is inside a structure using WiFi reflections
  // Human in the loop — this data goes to operator, never acts autonomously
  getThroughWallMap() {
    if (!this.throughWallSensingActive) return null;
    return {
      sensingActive: true,
      structureDetected: this.structureMapAvailable,
      note: 'HUMAN DECISION REQUIRED — AI provides data, operator decides'
    };
  }
}

module.exports = WifiMappingLayer;
