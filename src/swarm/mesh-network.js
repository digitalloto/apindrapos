/**
 * UPIE — Mesh Network
 * Patent Pending — AIMCRS
 *
 * Inter-drone communication system. Power-efficient mesh protocol
 * with priority queuing. Drones share position, threats, and commands.
 *
 * Message types (by priority):
 *   EVADE (emergency) > THREAT > FORMATION > HEARTBEAT
 *
 * LAYER MODULE — communication capability
 */

class MeshNetwork {
  constructor() {
    this.nodes = {};             // droneId -> MeshNode
    this.messageLog = [];        // All messages sent (for audit)
    this.bandwidthBudget = 1000; // bytes per cycle per drone
    this.enabled = true;

    // Stats
    this.totalMessagesSent = 0;
    this.totalBytesTransferred = 0;
  }

  /**
   * Register a drone as a network node
   */
  registerNode(droneId) {
    this.nodes[droneId] = {
      droneId,
      inbox: [],
      lastHeartbeat: null,
      connected: true,
      bandwidthUsed: 0
    };
  }

  /**
   * Remove a drone from the network
   */
  removeNode(droneId) {
    delete this.nodes[droneId];
  }

  /**
   * Broadcast message to ALL drones
   */
  broadcast(fromDroneId, message) {
    if (!this.enabled) return 0;

    const msg = this._createMessage(fromDroneId, 'ALL', message);
    let delivered = 0;

    for (const [nodeId, node] of Object.entries(this.nodes)) {
      if (nodeId !== fromDroneId && node.connected) {
        node.inbox.push({ ...msg });
        delivered++;
      }
    }

    this.messageLog.push(msg);
    this.totalMessagesSent++;
    this.totalBytesTransferred += msg.sizeBytes;

    // Update sender stats
    if (this.nodes[fromDroneId]) {
      this.nodes[fromDroneId].bandwidthUsed += msg.sizeBytes;
    }

    return delivered;
  }

  /**
   * Send message to a specific drone
   */
  sendTo(fromDroneId, toDroneId, message) {
    if (!this.enabled) return false;

    const node = this.nodes[toDroneId];
    if (!node || !node.connected) return false;

    const msg = this._createMessage(fromDroneId, toDroneId, message);
    node.inbox.push(msg);

    this.messageLog.push(msg);
    this.totalMessagesSent++;
    this.totalBytesTransferred += msg.sizeBytes;

    return true;
  }

  /**
   * Get pending messages for a drone (sorted by priority)
   */
  getMessages(droneId) {
    const node = this.nodes[droneId];
    if (!node) return [];

    // Sort by priority: EVADE > THREAT > FORMATION > HEARTBEAT
    const priorityOrder = { EVADE: 0, THREAT: 1, FORMATION: 2, HEARTBEAT: 3 };
    const messages = node.inbox.sort((a, b) =>
      (priorityOrder[a.data.type] || 99) - (priorityOrder[b.data.type] || 99)
    );

    // Clear inbox
    node.inbox = [];

    return messages;
  }

  /**
   * Send heartbeat (compact position update)
   */
  sendHeartbeat(droneId, heartbeat) {
    return this.broadcast(droneId, {
      type: 'HEARTBEAT',
      ...heartbeat
    });
  }

  /**
   * Send threat alert
   */
  sendThreatAlert(droneId, threat) {
    return this.broadcast(droneId, {
      type: 'THREAT',
      ...threat
    });
  }

  /**
   * Send formation command (from hive mind)
   */
  sendFormationCommand(command) {
    return this.broadcast('HIVE_MIND', {
      type: 'FORMATION',
      ...command
    });
  }

  /**
   * Send evasion trigger (emergency broadcast)
   */
  sendEvasionTrigger(reason, pattern, reformAfter) {
    return this.broadcast('HIVE_MIND', {
      type: 'EVADE',
      reason,
      scatterPattern: pattern,
      reformAfter
    });
  }

  /**
   * Reset bandwidth counters (called each cycle)
   */
  resetCycleBandwidth() {
    for (const node of Object.values(this.nodes)) {
      node.bandwidthUsed = 0;
    }
  }

  /**
   * Get network status
   */
  getStatus() {
    return {
      totalNodes: Object.keys(this.nodes).length,
      connectedNodes: Object.values(this.nodes).filter(n => n.connected).length,
      totalMessagesSent: this.totalMessagesSent,
      totalBytesTransferred: this.totalBytesTransferred,
      avgBytesPerMessage: this.totalMessagesSent > 0
        ? Math.round(this.totalBytesTransferred / this.totalMessagesSent)
        : 0,
      nodes: Object.values(this.nodes).map(n => ({
        droneId: n.droneId,
        connected: n.connected,
        pendingMessages: n.inbox.length,
        bandwidthUsed: n.bandwidthUsed
      })),
      recentMessages: this.messageLog.slice(-20).map(m => ({
        from: m.from,
        to: m.to,
        type: m.data.type,
        timestamp: m.timestamp,
        sizeBytes: m.sizeBytes
      }))
    };
  }

  reset() {
    this.nodes = {};
    this.messageLog = [];
    this.totalMessagesSent = 0;
    this.totalBytesTransferred = 0;
  }

  _createMessage(from, to, data) {
    return {
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      from,
      to,
      data,
      timestamp: Date.now(),
      sizeBytes: this._estimateSize(data)
    };
  }

  /**
   * Estimate message size in bytes (for power budget)
   */
  _estimateSize(data) {
    switch (data.type) {
      case 'HEARTBEAT': return 40;  // Compact: id + lat/lon/alt + confidence
      case 'THREAT': return 80;     // Medium: position + type + severity + layers
      case 'FORMATION': return 30;  // Small: command + formation + slot
      case 'EVADE': return 20;      // Tiny: reason + pattern + timer
      default: return 60;
    }
  }
}

module.exports = MeshNetwork;
