/**
 * UPIE — Spoofing and Jamming Detector
 * Patent Pending — AIMCRS
 *
 * How it works (simple explanation):
 *   When an enemy tries to SPOOF GPS — sending a fake signal to trick the platform —
 *   the AI detects it immediately because the spoofed GPS reading
 *   DISAGREES with the other 11 positioning layers.
 *
 *   When JAMMING occurs — GPS signal is blocked entirely —
 *   the AI detects the loss, notes the time, and continues
 *   providing exact position from the remaining layers.
 *
 *   The platform never knows it was attacked —
 *   it simply keeps navigating accurately.
 *
 * HUMAN IN THE LOOP: All alerts go to operator. AI detects, human decides.
 */

class SpoofDetector {
  constructor() {
    this.alerts = [];
    this.jammingDetected = {};     // layerId -> timestamp
    this.spoofingDetected = {};    // layerId -> timestamp
    this.previousReadings = {};    // layerId -> last reading
  }

  analyse(readings, fusedResult) {
    const alerts = [];

    // Check each reading for signs of spoofing or jamming
    for (const reading of readings) {
      // ── SPOOFING DETECTION ──
      // If this reading was flagged as an outlier, it might be spoofed
      if (reading.isOutlier && reading.distanceFromMedian > 500) {
        const alert = {
          type: 'SPOOF_SUSPECTED',
          layerId: reading.layerId,
          layerName: reading.layerName,
          deviation: Math.round(reading.distanceFromMedian),
          message: `${reading.layerName} reading deviates by ${Math.round(reading.distanceFromMedian)}m — POSSIBLE SPOOFING — layer removed from fusion`,
          severity: 'HIGH',
          action: 'HUMAN REVIEW REQUIRED — layer has been automatically excluded',
          timestamp: Date.now()
        };
        alerts.push(alert);
        this.spoofingDetected[reading.layerId] = Date.now();
      }

      // ── SUDDEN JUMP DETECTION ──
      // If a layer's reading suddenly jumps far from its previous reading
      const prev = this.previousReadings[reading.layerId];
      if (prev && reading.lat !== null && prev.lat !== null) {
        const jumpMetres = this.quickDistance(
          prev.lat, prev.lon, reading.lat, reading.lon
        );
        // More than 1km jump in one cycle = suspicious
        if (jumpMetres > 1000) {
          alerts.push({
            type: 'SUDDEN_JUMP',
            layerId: reading.layerId,
            layerName: reading.layerName,
            jumpMetres: Math.round(jumpMetres),
            message: `${reading.layerName} jumped ${Math.round(jumpMetres)}m in one cycle — SUSPICIOUS`,
            severity: 'MEDIUM',
            action: 'HUMAN REVIEW — may indicate spoofing attack start',
            timestamp: Date.now()
          });
        }
      }

      this.previousReadings[reading.layerId] = reading;
    }

    // ── JAMMING DETECTION ──
    // Check for layers that SHOULD be active but returned no reading
    // (This is checked at a higher level — layers return null when jammed)

    this.alerts = alerts;
    return alerts;
  }

  // Quick approximate distance in metres
  quickDistance(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLon = (lon2 - lon1) * 111320 * Math.cos(lat1 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
  }

  getAlerts() {
    return this.alerts;
  }
}

module.exports = SpoofDetector;
