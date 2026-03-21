/**
 * UPIE — Sensor Interface
 * Patent Pending — AIMCRS
 *
 * WHAT THIS IS (simple explanation):
 *   This is the "plug" where real hardware sensors connect to UPIE.
 *   Right now we use SIMULATED data for testing.
 *   When real hardware is ready, each sensor sends its data through
 *   this interface — the rest of UPIE works exactly the same.
 *
 * HOW IT WORKS:
 *   1. A real sensor (GPS receiver, IMU, camera, etc.) sends raw data
 *   2. This interface converts it into UPIE's standard format
 *   3. The fusion engine uses it just like simulated data
 *
 * SUPPORTED INPUT METHODS:
 *   - Direct function call (for embedded systems)
 *   - HTTP POST to /api/sensor/feed (for networked sensors)
 *   - WebSocket stream (for continuous real-time data)
 *
 * HUMAN IN THE LOOP: Sensor data feeds into fusion engine.
 *   All decisions remain with the human operator.
 */

class SensorInterface {
  constructor() {
    // Store latest reading from each real sensor
    this.sensorReadings = {};  // layerId -> latest reading
    this.sensorStatus = {};    // layerId -> { connected, lastUpdate, errorCount }
    this.useRealSensors = {};  // layerId -> true/false (override simulation)
  }

  /**
   * Register a real sensor for a specific layer
   *
   * Example: registerSensor(1, 'GPS Receiver Module')
   *   This tells UPIE: "Layer 1 (GPS) now has a real sensor plugged in"
   */
  registerSensor(layerId, sensorName) {
    this.sensorStatus[layerId] = {
      name: sensorName,
      connected: true,
      lastUpdate: null,
      errorCount: 0,
      readingCount: 0
    };
    this.useRealSensors[layerId] = true;
  }

  /**
   * Disconnect a sensor — fall back to simulation for this layer
   */
  disconnectSensor(layerId) {
    this.useRealSensors[layerId] = false;
    if (this.sensorStatus[layerId]) {
      this.sensorStatus[layerId].connected = false;
    }
  }

  /**
   * Feed real sensor data into UPIE
   *
   * Expected data format:
   * {
   *   layerId: 1,              // which layer this data is for
   *   lat: 13.0827,            // latitude (null if not applicable)
   *   lon: 80.2707,            // longitude (null if not applicable)
   *   alt: 100.5,              // altitude in metres (null if not applicable)
   *   accuracyMetres: 3.2,     // how accurate this reading is
   *   timestamp: 1711000000,   // when the reading was taken
   *   raw: {}                  // optional — raw sensor data for debugging
   * }
   */
  feedData(data) {
    // Validate required fields
    if (!data || typeof data.layerId !== 'number') {
      return { success: false, error: 'Missing layerId' };
    }

    if (data.accuracyMetres === undefined || data.accuracyMetres === null) {
      return { success: false, error: 'Missing accuracyMetres' };
    }

    // Build standard UPIE reading
    const reading = {
      layerId: data.layerId,
      layerName: data.layerName || `Sensor ${data.layerId}`,
      lat: data.lat !== undefined ? data.lat : null,
      lon: data.lon !== undefined ? data.lon : null,
      alt: data.alt !== undefined ? data.alt : null,
      accuracyMetres: data.accuracyMetres,
      timestamp: data.timestamp || Date.now(),
      active: true,
      jammed: false,
      spoofed: false,
      source: 'real_sensor',
      altitudeOnly: data.altitudeOnly || false,
      velocityOnly: data.velocityOnly || false,
      raw: data.raw || null
    };

    // Store the reading
    this.sensorReadings[data.layerId] = reading;

    // Update sensor status
    if (this.sensorStatus[data.layerId]) {
      this.sensorStatus[data.layerId].lastUpdate = Date.now();
      this.sensorStatus[data.layerId].readingCount++;
    }

    return { success: true, reading };
  }

  /**
   * Get reading for a specific layer
   * Returns real sensor data if available, null otherwise
   */
  getReading(layerId) {
    if (!this.useRealSensors[layerId]) return null;
    const reading = this.sensorReadings[layerId];
    if (!reading) return null;

    // Check if reading is stale (older than 5 seconds)
    const age = Date.now() - reading.timestamp;
    if (age > 5000) {
      reading.stale = true;
      // Degrade accuracy for stale readings
      reading.accuracyMetres *= 1.5;
    }

    return reading;
  }

  /**
   * Check if a layer should use real sensor data
   */
  isRealSensor(layerId) {
    return this.useRealSensors[layerId] === true;
  }

  /**
   * Get status of all connected sensors — for dashboard
   */
  getAllSensorStatus() {
    return {
      connectedSensors: Object.keys(this.useRealSensors)
        .filter(id => this.useRealSensors[id])
        .map(id => ({
          layerId: parseInt(id),
          ...this.sensorStatus[id]
        })),
      totalConnected: Object.values(this.useRealSensors).filter(v => v).length,
      totalLayers: 24
    };
  }
}

module.exports = SensorInterface;
