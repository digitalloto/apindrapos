/**
 * UPIE Layer 48 — Atmospheric Pressure Mapping
 * Patent Pending — AIMCRS
 *
 * What it does: Uses absolute barometric pressure readings compared against
 *   real-time weather station network pressure maps
 *   Pressure varies geographically — creates a "pressure landscape"
 * Accuracy: 50-500 metres (horizontal), 0.5-3m (vertical)
 * Strength: Passive, works in any conditions, altitude + rough position
 * Weakness: Weather-dependent, low horizontal accuracy, needs station data
 */

const PositioningLayer = require('./layer-base');

class AtmosphericPressureMapLayer extends PositioningLayer {
  constructor() {
    super({
      id: 48,
      name: 'Atmo Pressure Map',
      accuracyRange: [50, 500],
      strength: 'Passive, any conditions, altitude precision',
      weakness: 'Low horizontal accuracy, needs weather data',
      compensatedBy: 'Barometric Alt, Gravity Gradient, GPS'
    });
  }
}

module.exports = AtmosphericPressureMapLayer;
