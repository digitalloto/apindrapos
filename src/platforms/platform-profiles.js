/**
 * UPIE — Platform Profiles — 24 Layers
 * Patent Pending — AIMCRS
 *
 * Not every platform can carry all 24 layers.
 * UPIE is MODULAR — same AI engine, different sensor stack per platform.
 *
 * Profiles validated by Group Captain Surya Prakash (Retd.) IAF
 * Consultation: 21 March 2026
 *
 * Layer IDs:
 *   SATELLITE:   1=GPS  2=NAVIC  14=GLONASS  15=Galileo  16=BeiDou
 *   CELESTIAL:   4=Star Tracking  13=Sun/Moon  23=Pulsar XNAV
 *   INTERNAL:    3=INS  12=Doppler  24=Quantum Compass
 *   GROUND:      5=Terrain  6=Magnetic  7=Ground Emitters  17=Gravity
 *   SIGNAL:      8=WiFi  9=Cell Tower  18=RF Fingerprint  21=eLoran
 *   ALTITUDE:    11=Barometric  19=Radar Altimetry
 *   UNDERWATER:  10=Acoustic Triangulation
 *   CAMERA:      20=Visual Odometry
 *   FRONTIER:    22=Cosmic Ray/Muon  23=Pulsar  24=Quantum
 */

const PLATFORM_PROFILES = {

  'small-drone': {
    name: 'Small Reconnaissance Drone',
    weightClass: 'Ultra Light',
    description: 'Small drone — lightweight sensors only — urban ops',
    activeLayers: [1, 2, 3, 5, 8, 11, 14, 15, 20],
    // GPS, NAVIC, INS, Terrain, WiFi, Barometric, GLONASS, Galileo, Visual Odometry
    layerConfig: {
      8: { accessPointsDetected: 5 },
      5: { terrainType: 'urban', visibility: 0.8 },
      20: { visibility: 0.8, featureDensity: 0.9 }
    }
  },

  'medium-drone': {
    name: 'Medium Drone / UAV',
    weightClass: 'Light',
    description: 'Medium UAV — expanded sensor suite',
    activeLayers: [1, 2, 3, 5, 8, 9, 11, 13, 14, 15, 18, 20],
    // + Sun/Moon, GLONASS, Galileo, RF Fingerprint, Visual Odometry
    layerConfig: {
      8: { accessPointsDetected: 8 },
      9: { towersInRange: 4 },
      5: { terrainType: 'urban', visibility: 0.9 },
      18: { signalSourcesDetected: 8, environmentType: 'urban' },
      20: { visibility: 0.9, featureDensity: 0.8 },
      13: { isDaytime: true, skyVisibility: 0.8 }
    }
  },

  'fighter': {
    name: 'Fighter Aircraft',
    weightClass: 'Standard',
    description: 'Fighter — maximum layer count — all except underwater',
    activeLayers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    // 20 layers — everything except underwater(10), cosmic(22), pulsar(23), quantum(24)
    layerConfig: {
      4: { skyVisibility: 0.9, isNight: false },
      7: { distanceFromNearestKm: 20, emittersInRange: 3 },
      8: { accessPointsDetected: 3 },
      9: { towersInRange: 5 },
      13: { isDaytime: true, skyVisibility: 0.9 },
      18: { signalSourcesDetected: 5, environmentType: 'suburban' },
      20: { visibility: 0.9, featureDensity: 0.6 },
      21: { inCoverageArea: true, stationsInRange: 3 }
    }
  },

  'missile': {
    name: 'Cruise Missile',
    weightClass: 'Compact',
    description: 'Missile — INS primary, terrain matching, star tracking',
    activeLayers: [1, 2, 3, 4, 5, 11, 12, 13, 14, 15, 19],
    // GPS, NAVIC, INS, Star, Terrain, Barometric, Doppler, Sun/Moon, GLONASS, Galileo, Radar Alt
    layerConfig: {
      4: { skyVisibility: 0.7, isNight: true },
      5: { terrainType: 'rural', visibility: 0.8 },
      13: { isDaytime: false, skyVisibility: 0.7 }
    }
  },

  'submarine': {
    name: 'Submarine',
    weightClass: 'Standard',
    description: 'Submarine — underwater specialist — GPS denied',
    activeLayers: [3, 6, 10, 11, 12, 17, 22, 24],
    // INS, Magnetic, Acoustic, Barometric, Doppler, Gravity, Cosmic Ray, Quantum
    // NO satellite layers — signals do not penetrate water
    layerConfig: {
      10: { isUnderwater: true, nodesInRange: 4, depthMetres: 200 },
      6: { mapResolution: 'high' },
      17: { gravityMapResolution: 'high' },
      22: { isUnderground: true, detectorSensitivity: 'high' },
      24: { sensorOperational: true, vibrationLevel: 0.2 }
    }
  },

  'ground-vehicle': {
    name: 'Ground Vehicle',
    weightClass: 'Standard',
    description: 'Ground vehicle — urban/terrain specialist',
    activeLayers: [1, 2, 3, 5, 8, 9, 11, 14, 15, 18, 20, 21],
    // GPS, NAVIC, INS, Terrain, WiFi, Cell, Barometric, GLONASS, Galileo, RF, Visual, eLoran
    layerConfig: {
      8: { accessPointsDetected: 15 },
      9: { towersInRange: 6 },
      5: { terrainType: 'urban', visibility: 0.9 },
      18: { signalSourcesDetected: 15, environmentType: 'urban' },
      20: { visibility: 0.9, featureDensity: 1.0 },
      21: { inCoverageArea: true, stationsInRange: 3 }
    }
  },

  'underground-bunker': {
    name: 'Underground / Bunker',
    weightClass: 'Compact',
    description: 'Underground — no sky, no satellite, no radio — extreme GPS denied',
    activeLayers: [3, 6, 17, 22, 24],
    // INS, Magnetic, Gravity, Cosmic Ray, Quantum Compass
    // The ONLY layers that work deep underground
    layerConfig: {
      22: { isUnderground: true, detectorSensitivity: 'high' },
      24: { sensorOperational: true, vibrationLevel: 0.1 },
      17: { gravityMapResolution: 'medium' }
    }
  },

  'spacecraft': {
    name: 'Spacecraft / Deep Space',
    weightClass: 'Standard',
    description: 'Deep space — pulsar navigation is the primary system',
    activeLayers: [3, 4, 12, 13, 23, 24],
    // INS, Star Tracking, Doppler, Sun/Moon, Pulsar XNAV, Quantum Compass
    // No ground-based layers — too far from Earth
    layerConfig: {
      23: { xrayDetectorActive: true, pulsarsTracked: 4, observationTimeSeconds: 120 },
      4: { skyVisibility: 1.0, isNight: true },
      13: { isDaytime: false, skyVisibility: 1.0 },
      24: { sensorOperational: true, vibrationLevel: 0.05 }
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
