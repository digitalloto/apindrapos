/**
 * UPIE — MiroFish Swarm Intelligence Fusion Engine
 * Patent Pending — AIMCRS
 *
 * WHAT THIS IS (simple explanation):
 *   Imagine a school of fish swimming together. Each fish is one
 *   positioning layer. Each fish has its own idea of where it is.
 *   The school naturally moves toward agreement:
 *
 *   - Fish that are close together form the main school
 *   - A fish swimming alone (spoofed layer) gets ignored
 *   - Bigger fish (more accurate layers) pull smaller fish toward them
 *   - The center of the school = the fused position
 *   - How tightly the school is grouped = the confidence score
 *
 * WHY SWARM IS BETTER THAN WEIGHTED AVERAGE:
 *   1. Natural outlier rejection — lone fish are obviously wrong
 *   2. Adaptive — the swarm self-organises every cycle
 *   3. No fixed weights — influence is based on agreement with the school
 *   4. Emergent intelligence — the group is smarter than any individual
 *   5. Robust — removing one fish doesn't break the school
 *
 * INSPIRED BY: MiroFish swarm intelligence (github.com/666ghj/MiroFish)
 *   Adapted for positioning fusion instead of optimization.
 *
 * HUMAN IN THE LOOP: Swarm provides position to operator. Human decides.
 */

class SwarmFish {
  constructor(layerReading, layer) {
    // Each fish carries its layer's position estimate
    this.layerId = layerReading.layerId;
    this.layerName = layerReading.layerName;
    this.originalLat = layerReading.lat;
    this.originalLon = layerReading.lon;
    this.originalAlt = layerReading.alt;
    // Current position (moves toward school during swarming)
    this.lat = layerReading.lat;
    this.lon = layerReading.lon;
    this.alt = layerReading.alt || 0;
    // Fish properties
    this.accuracy = layerReading.accuracyMetres;
    this.layerWeight = layer ? layer.weight : 1.0;
    // "Size" of fish = how accurate/trustworthy (bigger = more influence)
    this.size = this.calculateSize();
    // Is this fish part of the school or swimming alone?
    this.inSchool = true;
    this.distanceToSchoolCentre = 0;
    // Velocity — how fast the fish is moving toward the school
    this.velocityLat = 0;
    this.velocityLon = 0;
  }

  // Bigger fish = more accurate layer = more influence
  calculateSize() {
    // Inverse of accuracy — 1m accuracy = size 10, 1000m accuracy = size 0.01
    const accuracyFactor = 10 / Math.max(this.accuracy, 0.1);
    return Math.min(10, accuracyFactor * this.layerWeight);
  }
}

class SwarmFusionEngine {
  constructor() {
    // Swarm parameters — tuned for positioning fusion
    this.swarmIterations = 5;      // how many times fish adjust positions
    this.schoolRadius = 0;         // calculated dynamically each cycle
    this.cohesionStrength = 0.3;   // how strongly fish pull toward school
    this.separationDistance = 0;    // minimum distance between fish
    this.alignmentStrength = 0.1;  // how strongly fish match direction
    this.outlierThreshold = 3.0;   // standard deviations to be outlier
  }

  /**
   * MAIN SWARM FUSION — runs each cycle
   *
   * Input: array of readings from positioning layers + layer objects
   * Output: fused position, confidence, alerts
   */
  fuse(positionReadings, altitudeReadings, allLayers) {
    if (positionReadings.length === 0) {
      return {
        lat: null, lon: null, alt: null,
        confidence: 0, method: 'swarm',
        schoolSize: 0, outerFish: 0,
        status: 'NO_POSITION'
      };
    }

    // ─── STEP 1: CREATE FISH ───
    // Each position reading becomes a fish in the swarm
    const fish = positionReadings.map(reading => {
      const layer = allLayers.find(l => l.id === reading.layerId);
      return new SwarmFish(reading, layer);
    });

    // ─── STEP 2: FIND INITIAL SCHOOL CENTRE ───
    // Weighted centre based on fish size (bigger fish matter more)
    let centre = this.calculateWeightedCentre(fish);

    // ─── STEP 3: SWARM ITERATIONS ───
    // Fish move toward the school centre over multiple iterations
    // This is where the magic happens — like MiroFish optimization
    for (let i = 0; i < this.swarmIterations; i++) {
      // Calculate school radius — how spread out the fish are
      this.schoolRadius = this.calculateSchoolRadius(fish, centre);

      // Each fish adjusts its position
      for (const f of fish) {
        this.updateFishPosition(f, centre, fish, i);
      }

      // Recalculate centre after fish moved
      // Only include fish that are in the school
      const schoolFish = fish.filter(f => f.inSchool);
      if (schoolFish.length > 0) {
        centre = this.calculateWeightedCentre(schoolFish);
      }
    }

    // ─── STEP 4: IDENTIFY OUTLIER FISH ───
    // Fish swimming alone = possible spoofing/failure
    const schoolFish = fish.filter(f => f.inSchool);
    const outerFish = fish.filter(f => !f.inSchool);

    // ─── STEP 5: CALCULATE FINAL POSITION ───
    // Centre of the school = fused position
    const fusedCentre = this.calculateWeightedCentre(schoolFish);

    // ─── STEP 6: CALCULATE ALTITUDE ───
    // Combine position fish altitudes with altitude-specialist readings
    let fusedAlt = this.calculateAltitude(schoolFish, altitudeReadings);

    // ─── STEP 7: CALCULATE SWARM CONFIDENCE ───
    // Tight school = high confidence, spread school = low confidence
    const confidence = this.calculateSwarmConfidence(schoolFish, outerFish, fish);

    return {
      lat: Math.round(fusedCentre.lat * 1000000) / 1000000,
      lon: Math.round(fusedCentre.lon * 1000000) / 1000000,
      alt: Math.round(fusedAlt * 100) / 100,
      method: 'swarm',
      schoolSize: schoolFish.length,
      outerFish: outerFish.length,
      outerFishNames: outerFish.map(f => f.layerName),
      schoolTightness: this.schoolRadius,
      confidence,
      status: 'POSITION_FIXED',
      timestamp: Date.now(),
      // Detailed fish data for dashboard
      fishData: fish.map(f => ({
        layerId: f.layerId,
        layerName: f.layerName,
        originalLat: f.originalLat,
        originalLon: f.originalLon,
        swarmLat: f.lat,
        swarmLon: f.lon,
        size: f.size,
        inSchool: f.inSchool,
        distanceToSchool: f.distanceToSchoolCentre
      }))
    };
  }

  // ═══════════════════════════════════════════
  // SWARM BEHAVIOURS — How each fish moves
  // ═══════════════════════════════════════════

  updateFishPosition(fish, centre, allFish, iteration) {
    // Calculate distance from this fish to school centre
    fish.distanceToSchoolCentre = this.distanceMetres(
      fish.lat, fish.lon, centre.lat, centre.lon
    );

    // Dynamic outlier detection — fish too far from school
    // Threshold tightens with each iteration (school gets tighter)
    const iterationFactor = 1.0 - (iteration * 0.1);
    const threshold = Math.max(this.schoolRadius * this.outlierThreshold * iterationFactor, 50);

    if (fish.distanceToSchoolCentre > threshold) {
      fish.inSchool = false;
      // Outlier fish do NOT move — they stay at their original position
      // for the operator to see
      return;
    }

    fish.inSchool = true;

    // ─── BEHAVIOUR 1: COHESION ───
    // Pull toward school centre — like fish wanting to stay with the group
    // Stronger pull for smaller fish (less accurate layers follow the group)
    const cohesionForce = this.cohesionStrength / Math.max(fish.size, 0.1);

    // ─── BEHAVIOUR 2: SIZE-BASED INFLUENCE ───
    // Bigger fish (more accurate) pull others toward them
    // This means accurate layers naturally dominate the school position
    let influenceLat = 0;
    let influenceLon = 0;
    let totalInfluence = 0;

    for (const other of allFish) {
      if (other === fish || !other.inSchool) continue;
      const dist = this.distanceMetres(fish.lat, fish.lon, other.lat, other.lon);
      if (dist < 0.001) continue; // avoid division by zero

      // Influence proportional to the OTHER fish's size
      const influence = other.size / Math.max(dist, 1);
      influenceLat += (other.lat - fish.lat) * influence;
      influenceLon += (other.lon - fish.lon) * influence;
      totalInfluence += influence;
    }

    if (totalInfluence > 0) {
      influenceLat /= totalInfluence;
      influenceLon /= totalInfluence;
    }

    // ─── APPLY MOVEMENT ───
    // Move toward school centre (cohesion) + toward bigger fish (influence)
    const moveStrength = Math.min(0.5, cohesionForce);
    fish.lat += (centre.lat - fish.lat) * moveStrength + influenceLat * this.alignmentStrength;
    fish.lon += (centre.lon - fish.lon) * moveStrength + influenceLon * this.alignmentStrength;
  }

  // ═══════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════

  // Weighted centre of fish — bigger fish pull centre toward them
  calculateWeightedCentre(fish) {
    if (fish.length === 0) return { lat: 0, lon: 0 };

    let totalWeight = 0;
    let wLat = 0;
    let wLon = 0;

    for (const f of fish) {
      const w = f.size;
      wLat += f.lat * w;
      wLon += f.lon * w;
      totalWeight += w;
    }

    return {
      lat: wLat / totalWeight,
      lon: wLon / totalWeight
    };
  }

  // How spread out the school is
  calculateSchoolRadius(fish, centre) {
    if (fish.length < 2) return 100; // default
    let totalDist = 0;
    for (const f of fish) {
      totalDist += this.distanceMetres(f.lat, f.lon, centre.lat, centre.lon);
    }
    return totalDist / fish.length;
  }

  // Calculate altitude from school fish + altitude specialists
  calculateAltitude(schoolFish, altitudeReadings) {
    let totalWeight = 0;
    let weightedAlt = 0;

    for (const f of schoolFish) {
      if (f.alt !== null && f.alt !== undefined) {
        const w = f.size;
        weightedAlt += f.alt * w;
        totalWeight += w;
      }
    }

    // Add altitude specialist readings (barometric, radar altimetry)
    if (altitudeReadings) {
      for (const alt of altitudeReadings) {
        if (alt.alt !== null) {
          const w = 1 / Math.max(alt.accuracyMetres, 0.1);
          weightedAlt += alt.alt * w;
          totalWeight += w;
        }
      }
    }

    return totalWeight > 0 ? weightedAlt / totalWeight : 0;
  }

  // Swarm-based confidence scoring — continuous scoring for higher resolution
  calculateSwarmConfidence(schoolFish, outerFish, allFish) {
    const total = allFish.length;
    if (total === 0) return { score: 0, level: 'CRITICAL', message: 'No fish in swarm' };

    // Factor 1: School size ratio (0-35 points) — continuous
    const schoolRatio = schoolFish.length / total;
    let schoolScore = Math.round(schoolRatio * 35);

    // Factor 2: School tightness — CONTINUOUS scoring instead of stepped brackets (0-30 points)
    // Uses exponential decay: tighter school = exponentially higher score
    // 0m = 30pts, 5m = 28pts, 20m = 24pts, 50m = 18pts, 200m = 8pts, 500m+ = 3pts
    let tightnessScore;
    if (this.schoolRadius <= 0.5) {
      tightnessScore = 30;
    } else {
      tightnessScore = Math.max(3, Math.round(30 * Math.exp(-this.schoolRadius / 80)));
    }

    // Factor 3: Fish diversity — different types of layers (0-20 points)
    // Added signal and vision categories for more diversity points
    const layerIds = schoolFish.map(f => f.layerId);
    const hasSatellite = layerIds.some(id => [1, 2, 14, 15, 16, 25, 26, 27, 28, 35].includes(id));
    const hasCelestial = layerIds.some(id => [4, 13, 23, 46].includes(id));
    const hasGround = layerIds.some(id => [5, 6, 7, 10, 17, 39, 41].includes(id));
    const hasInternal = layerIds.some(id => [3, 11, 12, 19, 44, 45].includes(id));
    const hasSignal = layerIds.some(id => [8, 9, 18, 21, 29, 30, 33, 34, 37, 38, 47, 48].includes(id));
    const hasVision = layerIds.some(id => [20, 31, 32, 40, 42, 43].includes(id));
    let diversityScore = 0;
    if (hasSatellite) diversityScore += 4;
    if (hasCelestial) diversityScore += 4;
    if (hasGround) diversityScore += 3;
    if (hasInternal) diversityScore += 3;
    if (hasSignal) diversityScore += 3;
    if (hasVision) diversityScore += 3;

    // Factor 4: No outliers is good (0-15 points)
    let outlierScore = 15;
    if (outerFish.length >= 4) outlierScore = 0;
    else if (outerFish.length >= 3) outlierScore = 5;
    else if (outerFish.length >= 1) outlierScore = 10;

    const totalScore = Math.min(100, schoolScore + tightnessScore + diversityScore + outlierScore);

    let level, message;
    if (totalScore >= 95) {
      level = 'MAXIMUM';
      message = 'Swarm consensus is tight — maximum trust — warfare ready';
    } else if (totalScore >= 85) {
      level = 'HIGH';
      message = 'Strong school agreement — precision strike capable';
    } else if (totalScore >= 70) {
      level = 'GOOD';
      message = 'Good school formation — suitable for navigation and troop movement';
    } else if (totalScore >= 55) {
      level = 'MODERATE';
      message = 'School forming but some fish distant — verify before acting';
    } else if (totalScore >= 40) {
      level = 'LOW';
      message = 'School scattered — possible interference — seek confirmation';
    } else {
      level = 'CRITICAL';
      message = 'SWARM DISRUPTED — major attack or failure — ALERT OPERATOR';
    }

    return { score: totalScore, level, message, timestamp: Date.now() };
  }

  // Distance between two coordinates in metres
  distanceMetres(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * 111320;
    const dLon = (lon2 - lon1) * 111320 * Math.cos(lat1 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
  }
}

module.exports = SwarmFusionEngine;
