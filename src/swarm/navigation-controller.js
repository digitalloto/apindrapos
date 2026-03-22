/**
 * UPIE — Navigation Controller
 * Patent Pending — AIMCRS
 *
 * Destination-aware navigation. Set a target GPS coordinate (or place name)
 * and the drone flies there. Supports waypoint lists, patrol loops, and return trips.
 *
 * Mission types:
 *   ONE_WAY  — Fly to destination and stop
 *   PATROL   — Loop through waypoints continuously
 *   RETURN   — Fly to destination, then fly back to start
 *
 * LAYER MODULE — navigation capability
 */

class NavigationController {
  constructor() {
    this.waypoints = [];           // Array of { lat, lon, alt, name, reached }
    this.currentWaypointIndex = 0;
    this.missionType = 'ONE_WAY';  // ONE_WAY | PATROL | RETURN
    this.speedMps = 50;            // Cruise speed in m/s (configurable)
    this.arrivalRadius = 50;       // metres — "close enough" to waypoint
    this.status = 'IDLE';          // IDLE | NAVIGATING | ARRIVED | PATROLLING
    this.enabled = true;

    // Origin — where the drone started (for RETURN missions)
    this.origin = null;

    // Live navigation data
    this.distanceToTarget = 0;
    this.bearingToTarget = 0;
    this.eta = 0;                  // seconds
    this.totalDistanceRemaining = 0;
    this.totalDistanceTravelled = 0;

    // Stats
    this.waypointsReached = 0;
    this.patrolLaps = 0;
    this.startTime = null;
  }

  /**
   * Set a single destination
   */
  setDestination(lat, lon, alt, name) {
    this.waypoints = [{
      lat, lon,
      alt: alt || 100,
      name: name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      reached: false
    }];
    this.currentWaypointIndex = 0;
    this.status = 'NAVIGATING';
    this.startTime = Date.now();
    return this.getState();
  }

  /**
   * Set multiple waypoints
   */
  setWaypoints(waypointList, missionType) {
    this.waypoints = waypointList.map((wp, i) => ({
      lat: wp.lat,
      lon: wp.lon,
      alt: wp.alt || 100,
      name: wp.name || `WP-${i + 1}`,
      reached: false
    }));
    this.currentWaypointIndex = 0;
    this.missionType = missionType || 'ONE_WAY';
    this.status = 'NAVIGATING';
    this.startTime = Date.now();
    return this.getState();
  }

  /**
   * Lock origin for RETURN missions
   */
  lockOrigin(lat, lon, alt) {
    this.origin = { lat, lon, alt: alt || 100, name: 'ORIGIN' };
  }

  /**
   * Get movement vector — called each tick by the simulator
   * Returns { heading, speedMps } to steer the drone
   * Returns null if no active navigation (use default movement)
   */
  getMovementVector(currentLat, currentLon) {
    if (!this.enabled || this.status === 'IDLE' || this.status === 'ARRIVED') {
      return null;
    }

    if (this.waypoints.length === 0) {
      return null;
    }

    const target = this.waypoints[this.currentWaypointIndex];
    if (!target) {
      this.status = 'ARRIVED';
      return null;
    }

    // Calculate distance and bearing to current waypoint
    this.distanceToTarget = this._distanceMetres(currentLat, currentLon, target.lat, target.lon);
    this.bearingToTarget = this._bearing(currentLat, currentLon, target.lat, target.lon);
    this.eta = this.speedMps > 0 ? Math.round(this.distanceToTarget / this.speedMps) : 0;

    // Calculate total remaining distance (all remaining waypoints)
    this.totalDistanceRemaining = this.distanceToTarget;
    for (let i = this.currentWaypointIndex + 1; i < this.waypoints.length; i++) {
      const prev = this.waypoints[i - 1];
      const next = this.waypoints[i];
      this.totalDistanceRemaining += this._distanceMetres(prev.lat, prev.lon, next.lat, next.lon);
    }

    // Check if we've arrived at current waypoint
    if (this.distanceToTarget <= this.arrivalRadius) {
      return this._onWaypointReached(currentLat, currentLon);
    }

    return {
      heading: this.bearingToTarget,
      speedMps: this.speedMps
    };
  }

  /**
   * Handle waypoint arrival — advance to next or complete mission
   */
  _onWaypointReached(currentLat, currentLon) {
    const target = this.waypoints[this.currentWaypointIndex];
    target.reached = true;
    this.waypointsReached++;

    // Move to next waypoint
    this.currentWaypointIndex++;

    // Check if all waypoints reached
    if (this.currentWaypointIndex >= this.waypoints.length) {
      switch (this.missionType) {
        case 'PATROL':
          // Loop back to first waypoint
          this.currentWaypointIndex = 0;
          this.patrolLaps++;
          // Reset reached flags
          for (const wp of this.waypoints) wp.reached = false;
          this.status = 'PATROLLING';
          break;

        case 'RETURN':
          // Add origin as final waypoint and switch to ONE_WAY
          if (this.origin) {
            this.waypoints.push({ ...this.origin, reached: false });
            this.missionType = 'ONE_WAY';
            this.status = 'NAVIGATING';
          } else {
            this.status = 'ARRIVED';
            return null;
          }
          break;

        case 'ONE_WAY':
        default:
          this.status = 'ARRIVED';
          return null;
      }
    }

    // Navigate to next waypoint
    const next = this.waypoints[this.currentWaypointIndex];
    if (next) {
      this.bearingToTarget = this._bearing(currentLat, currentLon, next.lat, next.lon);
      this.distanceToTarget = this._distanceMetres(currentLat, currentLon, next.lat, next.lon);
      return {
        heading: this.bearingToTarget,
        speedMps: this.speedMps
      };
    }

    return null;
  }

  /**
   * Stop navigation
   */
  stop() {
    this.status = 'IDLE';
    return this.getState();
  }

  /**
   * Set cruise speed
   */
  setSpeed(speedMps) {
    this.speedMps = Math.max(1, Math.min(3000, speedMps));
  }

  /**
   * Get current navigation state
   */
  getState() {
    const currentWaypoint = this.waypoints[this.currentWaypointIndex] || null;
    const finalWaypoint = this.waypoints.length > 0
      ? this.waypoints[this.waypoints.length - 1]
      : null;

    return {
      status: this.status,
      missionType: this.missionType,
      speedMps: this.speedMps,
      arrivalRadius: this.arrivalRadius,

      // Current target
      currentWaypoint: currentWaypoint ? {
        index: this.currentWaypointIndex,
        name: currentWaypoint.name,
        lat: currentWaypoint.lat,
        lon: currentWaypoint.lon,
        alt: currentWaypoint.alt
      } : null,

      // Final destination
      destination: finalWaypoint ? {
        name: finalWaypoint.name,
        lat: finalWaypoint.lat,
        lon: finalWaypoint.lon,
        alt: finalWaypoint.alt
      } : null,

      // Live data
      distanceToTarget: Math.round(this.distanceToTarget),
      bearingToTarget: Math.round(this.bearingToTarget * 10) / 10,
      eta: this.eta,
      totalDistanceRemaining: Math.round(this.totalDistanceRemaining),

      // Waypoint list
      waypoints: this.waypoints.map((wp, i) => ({
        index: i,
        name: wp.name,
        lat: wp.lat,
        lon: wp.lon,
        alt: wp.alt,
        reached: wp.reached,
        current: i === this.currentWaypointIndex
      })),

      // Stats
      waypointsReached: this.waypointsReached,
      waypointsTotal: this.waypoints.length,
      patrolLaps: this.patrolLaps,
      elapsedSeconds: this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0,
      totalDistanceTravelled: Math.round(this.totalDistanceTravelled)
    };
  }

  reset() {
    this.waypoints = [];
    this.currentWaypointIndex = 0;
    this.status = 'IDLE';
    this.distanceToTarget = 0;
    this.bearingToTarget = 0;
    this.eta = 0;
    this.totalDistanceRemaining = 0;
    this.totalDistanceTravelled = 0;
    this.waypointsReached = 0;
    this.patrolLaps = 0;
    this.startTime = null;
  }

  _distanceMetres(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLon = (lon2 - lon1) * 111320 * Math.cos(lat1 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
  }

  _bearing(lat1, lon1, lat2, lon2) {
    const dLon = lon2 - lon1;
    const dLat = lat2 - lat1;
    const bearing = Math.atan2(dLon, dLat) * (180 / Math.PI);
    return (bearing + 360) % 360;
  }
}

module.exports = NavigationController;
