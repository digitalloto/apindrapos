/**
 * UPIE — Formation Controller
 * Patent Pending — AIMCRS
 *
 * Manages swarm formation patterns. Assigns each drone a slot
 * relative to the leader. Supports V-shape, line, diamond, grid, circle.
 *
 * LAYER MODULE — formation capability
 */

class FormationController {
  constructor() {
    this.formation = 'V_SHAPE';
    this.leaderDroneId = null;
    this.slots = {};              // droneId -> { offsetLat, offsetLon, role }
    this.spacingMetres = 200;     // Distance between drones
    this.enabled = true;
  }

  /**
   * Set the active formation type
   */
  setFormation(type, spacingMetres) {
    const valid = ['V_SHAPE', 'LINE', 'DIAMOND', 'GRID', 'CIRCLE', 'NONE'];
    if (!valid.includes(type)) return false;
    this.formation = type;
    if (spacingMetres) this.spacingMetres = spacingMetres;
    return true;
  }

  /**
   * Assign drones to formation slots
   * First drone becomes leader
   */
  assignSlots(droneIds) {
    if (droneIds.length === 0) return {};

    this.leaderDroneId = droneIds[0];
    this.slots = {};

    // Leader gets center position (no offset)
    this.slots[this.leaderDroneId] = {
      role: 'LEADER',
      offsetLat: 0,
      offsetLon: 0,
      slotIndex: 0
    };

    // Followers get formation-specific offsets
    const followers = droneIds.slice(1);
    const offsets = this._calculateOffsets(followers.length);

    for (let i = 0; i < followers.length; i++) {
      this.slots[followers[i]] = {
        role: 'FOLLOWER',
        offsetLat: offsets[i].lat,
        offsetLon: offsets[i].lon,
        slotIndex: i + 1
      };
    }

    return this.slots;
  }

  /**
   * Get the target position for a drone given the leader's position
   */
  getTargetPosition(droneId, leaderLat, leaderLon, leaderAlt) {
    const slot = this.slots[droneId];
    if (!slot) return null;

    return {
      lat: leaderLat + slot.offsetLat,
      lon: leaderLon + slot.offsetLon,
      alt: leaderAlt || 100
    };
  }

  /**
   * Check if a drone is at its assigned slot (within tolerance)
   */
  isInFormation(droneId, actualLat, actualLon, leaderLat, leaderLon) {
    const target = this.getTargetPosition(droneId, leaderLat, leaderLon);
    if (!target) return false;

    const dist = this._distanceMetres(actualLat, actualLon, target.lat, target.lon);
    return dist < this.spacingMetres * 0.5; // 50% tolerance
  }

  /**
   * Get formation status for all drones
   */
  getFormationStatus(droneStates, leaderPosition) {
    if (!leaderPosition) return { formation: this.formation, drones: [] };

    const statuses = [];
    for (const [droneId, slot] of Object.entries(this.slots)) {
      const drone = droneStates[droneId];
      const target = this.getTargetPosition(
        droneId, leaderPosition.lat, leaderPosition.lon, leaderPosition.alt
      );

      let dist = null;
      let inPosition = false;
      if (drone && target) {
        dist = Math.round(this._distanceMetres(
          drone.lat, drone.lon, target.lat, target.lon
        ));
        inPosition = dist < this.spacingMetres * 0.5;
      }

      statuses.push({
        droneId,
        role: slot.role,
        slotIndex: slot.slotIndex,
        targetLat: target ? target.lat : null,
        targetLon: target ? target.lon : null,
        distanceToSlot: dist,
        inPosition
      });
    }

    return {
      formation: this.formation,
      spacing: this.spacingMetres,
      leader: this.leaderDroneId,
      drones: statuses,
      formationIntegrity: statuses.filter(s => s.inPosition).length / Math.max(statuses.length, 1)
    };
  }

  /**
   * Calculate formation offsets based on type
   * Offsets are in degrees (roughly: 1 degree = 111320 metres)
   */
  _calculateOffsets(followerCount) {
    const s = this.spacingMetres / 111320; // Convert metres to degrees

    switch (this.formation) {
      case 'V_SHAPE':
        return this._vShapeOffsets(followerCount, s);
      case 'LINE':
        return this._lineOffsets(followerCount, s);
      case 'DIAMOND':
        return this._diamondOffsets(followerCount, s);
      case 'GRID':
        return this._gridOffsets(followerCount, s);
      case 'CIRCLE':
        return this._circleOffsets(followerCount, s);
      default:
        return this._vShapeOffsets(followerCount, s);
    }
  }

  _vShapeOffsets(count, s) {
    const offsets = [];
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 1 : -1;           // Alternate left/right
      const rank = Math.floor(i / 2) + 1;           // How far back
      offsets.push({
        lat: -rank * s,                              // Behind leader
        lon: side * rank * s * 0.7                   // Spread sideways
      });
    }
    return offsets;
  }

  _lineOffsets(count, s) {
    const offsets = [];
    for (let i = 0; i < count; i++) {
      offsets.push({
        lat: -(i + 1) * s,  // Directly behind leader
        lon: 0
      });
    }
    return offsets;
  }

  _diamondOffsets(count, s) {
    const positions = [
      { lat: 0, lon: s },      // Right
      { lat: 0, lon: -s },     // Left
      { lat: -s, lon: 0 },     // Behind
      { lat: s, lon: 0 },      // Front (rare)
      { lat: -s, lon: s },     // Back-right
      { lat: -s, lon: -s },    // Back-left
      { lat: s, lon: s },      // Front-right
      { lat: s, lon: -s }      // Front-left
    ];
    return positions.slice(0, count);
  }

  _gridOffsets(count, s) {
    const offsets = [];
    const cols = Math.ceil(Math.sqrt(count + 1));
    let idx = 0;
    for (let row = 0; idx < count; row++) {
      for (let col = 0; col < cols && idx < count; col++) {
        // Skip (0,0) — that's the leader
        if (row === 0 && col === 0) continue;
        offsets.push({
          lat: -row * s,
          lon: (col - Math.floor(cols / 2)) * s
        });
        idx++;
      }
    }
    return offsets;
  }

  _circleOffsets(count, s) {
    const offsets = [];
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count;
      offsets.push({
        lat: Math.cos(angle) * s,
        lon: Math.sin(angle) * s
      });
    }
    return offsets;
  }

  _distanceMetres(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLon = (lon2 - lon1) * 111320 * Math.cos(lat1 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
  }
}

module.exports = FormationController;
