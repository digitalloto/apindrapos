/**
 * UPIE — Confidence Scorer — THE NOVEL CONTRIBUTION
 * Patent Pending — AIMCRS
 *
 * Current navigation systems give you a position.
 * UPIE gives you a position AND tells you how much to trust it.
 *
 * Confidence Levels:
 *   95-100%  Exact position — maximum trust — 8+ layers agree
 *   80-94%   High accuracy — minor uncertainty — 5-7 layers agree
 *   60-79%   Moderate — some sources disrupted — 3-4 layers agree
 *   40-59%   Low — significant interference — 2 layers agree
 *   Below 40% Critical — major attack or failure — 0-1 layers reliable
 *
 * HUMAN IN THE LOOP: Confidence score helps operator decide how to act.
 * High confidence = act with full trust. Low confidence = seek confirmation.
 */

class ConfidenceScorer {
  constructor() {
    this.lastScore = 0;
    this.scoreHistory = [];
  }

  calculate(filteredData, fusedResult) {
    if (!fusedResult || fusedResult.status === 'NO_POSITION') {
      return this.buildScore(0, 'CRITICAL', 'No valid position — ALERT OPERATOR');
    }

    const { validReadings, totalActive, totalValid, altitudeReadings, velocityReadings } = filteredData;

    // Count ALL contributing layers — position + altitude + velocity
    // Altitude and velocity layers assist even though they don't give lat/lon
    const altCount = altitudeReadings ? altitudeReadings.length : 0;
    const velCount = velocityReadings ? velocityReadings.length : 0;
    const totalContributing = totalValid + altCount + velCount;

    // ── Factor 1: How many layers contribute (0-40 points) ──
    let layerAgreementScore = 0;
    if (totalContributing >= 8) layerAgreementScore = 40;
    else if (totalContributing >= 5) layerAgreementScore = 30;
    else if (totalContributing >= 3) layerAgreementScore = 20;
    else if (totalContributing >= 2) layerAgreementScore = 10;
    else layerAgreementScore = 5;

    // ── Factor 2: How close readings are to each other (0-30 points) ──
    let agreementScore = 0;
    if (validReadings && validReadings.length >= 2) {
      const distances = validReadings
        .filter(r => r.distanceFromMedian !== undefined)
        .map(r => r.distanceFromMedian);

      if (distances.length > 0) {
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        // Under 5m average distance = perfect agreement
        if (avgDistance < 5) agreementScore = 30;
        else if (avgDistance < 20) agreementScore = 25;
        else if (avgDistance < 50) agreementScore = 20;
        else if (avgDistance < 200) agreementScore = 15;
        else if (avgDistance < 500) agreementScore = 10;
        else agreementScore = 5;
      }
    }

    // ── Factor 3: Were any layers removed as outliers? (0-15 points) ──
    // Removing 1-2 outliers is normal and shows the system is working correctly
    // Only penalize heavily if many layers are being removed (possible wide attack)
    const removedCount = filteredData.removedReadings
      ? filteredData.removedReadings.length : 0;
    let outlierScore = 15;
    if (removedCount >= 4) outlierScore = 0;
    else if (removedCount >= 3) outlierScore = 5;
    else if (removedCount >= 1) outlierScore = 10;

    // ── Factor 4: Are key layers present? (0-15 points) ──
    let keyLayerScore = 0;
    if (validReadings) {
      const layerIds = validReadings.map(r => r.layerId);
      // NAVIC present = +5 (primary sovereign signal)
      if (layerIds.includes(2)) keyLayerScore += 5;
      // GPS present = +3
      if (layerIds.includes(1)) keyLayerScore += 3;
      // Star tracking present = +4 (unjammable)
      if (layerIds.includes(4)) keyLayerScore += 4;
      // Any other layer = +1 each, max 3
      const others = layerIds.filter(id => ![1, 2, 4].includes(id));
      keyLayerScore += Math.min(3, others.length);
    }

    // ── Total confidence score ──
    const totalScore = Math.min(100,
      layerAgreementScore + agreementScore + outlierScore + keyLayerScore
    );

    // Determine confidence level and operator guidance
    let level, message;
    if (totalScore >= 95) {
      level = 'MAXIMUM';
      message = 'Exact position — maximum trust — act with full confidence';
    } else if (totalScore >= 80) {
      level = 'HIGH';
      message = 'High accuracy — minor uncertainty — act with awareness';
    } else if (totalScore >= 60) {
      level = 'MODERATE';
      message = 'Moderate — some sources disrupted — verify before acting';
    } else if (totalScore >= 40) {
      level = 'LOW';
      message = 'Low confidence — significant interference — seek confirmation';
    } else {
      level = 'CRITICAL';
      message = 'CRITICAL — major attack or failure — ALERT OPERATOR IMMEDIATELY';
    }

    return this.buildScore(totalScore, level, message);
  }

  buildScore(score, level, message) {
    const result = {
      score: Math.round(score),
      level,
      message,
      timestamp: Date.now()
    };
    this.lastScore = result;
    this.scoreHistory.push(result);
    if (this.scoreHistory.length > 50) this.scoreHistory.shift();
    return result;
  }
}

module.exports = ConfidenceScorer;
