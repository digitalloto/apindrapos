/**
 * UPIE Edge — Edge-Cloud Sync Protocol
 * Patent Pending — AIMCRS
 *
 * WHAT THIS DOES (simple explanation):
 *   The edge device (on the drone/fighter/submarine) needs to talk
 *   to the main UPIE system (on the ground station/command centre).
 *
 *   This handles the conversation:
 *
 *   EDGE → MAIN:
 *     "Here's my cleaned sensor data and motion state"
 *     "I'm at position X going heading Y at speed Z"
 *     "I detected a possible spoof on GPS"
 *
 *   MAIN → EDGE:
 *     "Your position looks correct — confirmed"
 *     "Correction: your INS is drifting — reset it"
 *     "New threat detected — change to GPS-denied mode"
 *
 *   IF DISCONNECTED:
 *     Edge keeps running locally
 *     Stores data in buffer
 *     When reconnected — sends all buffered data at once
 *
 * RUNS ON EDGE DEVICE.
 * HUMAN IN THE LOOP — sync data goes to operator dashboard.
 */

class EdgeSync {
  constructor() {
    // Connection state
    this.connected = false;
    this.lastSyncTime = null;
    this.syncCount = 0;

    // Buffer for storing data when disconnected
    this.outBuffer = [];       // data waiting to be sent to main system
    this.maxBufferSize = 500;  // max readings to store offline

    // Corrections received from main system
    this.corrections = [];     // pending corrections to apply

    // Sync metrics
    this.metrics = {
      totalSyncs: 0,
      totalBuffered: 0,
      totalCorrections: 0,
      disconnectionCount: 0,
      longestDisconnection: 0,   // milliseconds
      lastDisconnectTime: null
    };
  }

  /**
   * Prepare data packet to send to main system
   * Called every fusion cycle on the edge device
   */
  prepareUplink(edgeState) {
    const packet = {
      type: 'edge_uplink',
      timestamp: Date.now(),
      // Current position and motion
      position: edgeState.localPosition,
      motionState: edgeState.motionState,
      // Metrics about edge processing
      metrics: {
        processedCycles: edgeState.processedCount,
        noiseRemoved: edgeState.metrics.totalNoiseRemoved,
        spikesRejected: edgeState.metrics.totalSpikesRejected,
        trackViolations: edgeState.metrics.trackViolations
      }
    };

    if (this.connected) {
      this.syncCount++;
      this.lastSyncTime = Date.now();
      this.metrics.totalSyncs++;
      return { sent: true, packet };
    }

    // Not connected — buffer the data
    this.outBuffer.push(packet);
    if (this.outBuffer.length > this.maxBufferSize) {
      this.outBuffer.shift(); // drop oldest if buffer full
    }
    this.metrics.totalBuffered++;

    return { sent: false, buffered: true, bufferSize: this.outBuffer.length };
  }

  /**
   * Process a correction received from the main system
   *
   * Corrections tell the edge device to adjust:
   *   - Reset INS drift clock
   *   - Adjust sensor weights
   *   - Switch scenario mode
   *   - Apply position correction
   */
  receiveCorrection(correction) {
    this.corrections.push({
      ...correction,
      receivedAt: Date.now(),
      applied: false
    });
    this.metrics.totalCorrections++;
    return { received: true };
  }

  /**
   * Get pending corrections that haven't been applied yet
   */
  getPendingCorrections() {
    return this.corrections.filter(c => !c.applied);
  }

  /**
   * Mark a correction as applied
   */
  markCorrectionApplied(index) {
    if (this.corrections[index]) {
      this.corrections[index].applied = true;
    }
  }

  /**
   * Handle reconnection — flush the buffer
   * Returns all buffered data as one batch
   */
  reconnect() {
    const wasDisconnected = !this.connected;
    this.connected = true;

    if (wasDisconnected && this.metrics.lastDisconnectTime) {
      const disconnectDuration = Date.now() - this.metrics.lastDisconnectTime;
      this.metrics.longestDisconnection = Math.max(
        this.metrics.longestDisconnection, disconnectDuration
      );
    }

    // Flush buffer
    const buffered = [...this.outBuffer];
    this.outBuffer = [];

    return {
      reconnected: true,
      bufferedPackets: buffered.length,
      data: buffered
    };
  }

  /**
   * Handle disconnection
   */
  disconnect() {
    this.connected = false;
    this.metrics.disconnectionCount++;
    this.metrics.lastDisconnectTime = Date.now();
    return { disconnected: true, bufferActive: true };
  }

  /**
   * Get sync status — for dashboard
   */
  getStatus() {
    return {
      connected: this.connected,
      lastSyncTime: this.lastSyncTime,
      syncCount: this.syncCount,
      bufferSize: this.outBuffer.length,
      pendingCorrections: this.corrections.filter(c => !c.applied).length,
      metrics: this.metrics
    };
  }
}

module.exports = EdgeSync;
