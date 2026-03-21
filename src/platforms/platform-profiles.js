/**
 * UPIE — Platform Profiles
 * Patent Pending — AIMCRS
 *
 * Not every platform can carry all 12 layers.
 * A small drone cannot carry a star tracker.
 * A missile only needs layers relevant to its mission.
 *
 * UPIE is MODULAR — same AI engine, different sensor stack per platform.
 *
 * Profiles validated by Group Captain Surya Prakash (Retd.) IAF
 * Consultation: 21 March 2026
 *
 * Layer IDs:
 *   1=GPS  2=NAVIC  3=INS  4=Star  5=Terrain  6=Magnetic
 *   7=Ground Emitters  8=WiFi  9=Cell Tower  10=Acoustic
 *   11=Barometric  12=Doppler
 */

const PLATFORM_PROFILES = {

  'small-drone': {
    name: 'Small Reconnaissance Drone',
    weightClass: 'Ultra Light',
    description: 'Small drone — lightweight sensors only',
    activeLayers: [1, 2, 3, 8, 11, 5],
    // GPS, NAVIC, INS, WiFi, Barometric, Terrain Vision
    layerConfig: {
      8: { accessPointsDetected: 5 },   // WiFi — urban operations
      5: { terrainType: 'urban', visibility: 0.8 }
    }
  },

  'medium-drone': {
    name: 'Medium Drone / UAV',
    weightClass: 'Light',
    description: 'Medium UAV — more sensor capacity',
    activeLayers: [1, 2, 3, 5, 8, 9, 11],
    // GPS, NAVIC, INS, Terrain, WiFi, Cell Tower, Barometric
    layerConfig: {
      8: { accessPointsDetected: 8 },
      9: { towersInRange: 4 },
      5: { terrainType: 'urban', visibility: 0.9 }
    }
  },

  'fighter': {
    name: 'Fighter Aircraft',
    weightClass: 'Standard',
    description: 'Fighter — all layers except underwater acoustic',
    activeLayers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12],
    // Everything except acoustic (Layer 10 — underwater only)
    layerConfig: {
      4: { skyVisibility: 0.9, isNight: false },
      7: { distanceFromNearestKm: 20, emittersInRange: 3 },
      8: { accessPointsDetected: 3 },
      9: { towersInRange: 5 }
    }
  },

  'missile': {
    name: 'Cruise Missile',
    weightClass: 'Compact',
    description: 'Missile — INS primary, terrain matching, star tracking',
    activeLayers: [1, 2, 3, 4, 5, 11],
    // GPS, NAVIC, INS, Star Tracking, Terrain, Barometric
    layerConfig: {
      4: { skyVisibility: 0.7, isNight: true },
      5: { terrainType: 'rural', visibility: 0.8 }
    }
  },

  'submarine': {
    name: 'Submarine',
    weightClass: 'Standard',
    description: 'Submarine — underwater specialist — GPS denied environment',
    activeLayers: [3, 6, 10, 11, 12],
    // INS, Magnetic Anomaly, Acoustic, Barometric, Doppler
    // NO GPS/NAVIC — signals do not penetrate water
    layerConfig: {
      10: { isUnderwater: true, nodesInRange: 4, depthMetres: 200 },
      6: { mapResolution: 'high' }
    }
  },

  'ground-vehicle': {
    name: 'Ground Vehicle',
    weightClass: 'Standard',
    description: 'Ground vehicle — urban/terrain specialist',
    activeLayers: [1, 2, 3, 5, 8, 9, 11],
    // GPS, NAVIC, INS, Terrain, WiFi, Cell Tower, Barometric
    layerConfig: {
      8: { accessPointsDetected: 15 },  // lots of WiFi on ground
      9: { towersInRange: 6 },
      5: { terrainType: 'urban', visibility: 0.9 }
    }
  }
};

function getProfile(platformName) {
  return PLATFORM_PROFILES[platformName] || PLATFORM_PROFILES['fighter'];
}

function getAllProfiles() {
  return PLATFORM_PROFILES;
}

function getProfileNames() {
  return Object.keys(PLATFORM_PROFILES);
}

module.exports = { getProfile, getAllProfiles, getProfileNames, PLATFORM_PROFILES };
