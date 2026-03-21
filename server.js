/**
 * UPIE — Server
 * Patent Pending — AIMCRS
 *
 * Express server on port 5000
 * Serves the dashboard and WebSocket for real-time fusion data
 *
 * HUMAN IN THE LOOP: Dashboard shows data to operator. All decisions are human.
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const Simulator = require('./src/simulation/simulator');
const { getProfile, getAllProfiles, getProfileNames } = require('./src/platforms/platform-profiles');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 5000;

// Serve dashboard files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Create simulator instance
const simulator = new Simulator();
simulator.init(process.env.DEFAULT_PLATFORM || 'fighter');

// ═══════════════════════════════════════════
// REST API ENDPOINTS
// ═══════════════════════════════════════════

// Get current engine state
app.get('/api/state', (req, res) => {
  res.json(simulator.getState());
});

// Get all platform profiles
app.get('/api/platforms', (req, res) => {
  res.json(getAllProfiles());
});

// Change platform
app.post('/api/platform', (req, res) => {
  const { platform } = req.body;
  const wasRunning = simulator.running;
  if (wasRunning) simulator.stop();
  const profile = simulator.init(platform);
  if (wasRunning) simulator.start(broadcastResult);
  res.json({ success: true, profile });
});

// Change scenario
app.post('/api/scenario', (req, res) => {
  const { scenario } = req.body;
  simulator.setScenario(scenario);
  res.json({ success: true, scenario });
});

// Get available scenarios
app.get('/api/scenarios', (req, res) => {
  res.json(simulator.getScenarios());
});

// Start simulation
app.post('/api/start', (req, res) => {
  simulator.start(broadcastResult);
  res.json({ success: true, message: 'Simulation started' });
});

// Stop simulation
app.post('/api/stop', (req, res) => {
  simulator.stop();
  res.json({ success: true, message: 'Simulation stopped' });
});

// Single tick (manual step)
app.post('/api/tick', (req, res) => {
  if (!simulator.engine) simulator.init('fighter');
  const result = simulator.tick();
  res.json(result);
});

// Toggle a specific layer on/off
app.post('/api/layer/toggle', (req, res) => {
  const { layerId } = req.body;
  const layer = simulator.engine.allLayers.find(l => l.id === layerId);
  if (layer) {
    layer.active = !layer.active;
    res.json({ success: true, layerId, active: layer.active });
  } else {
    res.status(404).json({ error: 'Layer not found' });
  }
});

// ═══════════════════════════════════════════
// WEBSOCKET — Real-time fusion data to dashboard
// ═══════════════════════════════════════════

function broadcastResult(result) {
  const data = JSON.stringify({
    type: 'fusion',
    data: result,
    layers: simulator.engine.getLayerStatuses()
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  // Send current state on connect
  ws.send(JSON.stringify({
    type: 'init',
    data: simulator.getState()
  }));
});

// ═══════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════

server.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  UPIE — Universal Positioning Intelligence Engine');
  console.log('  Patent Pending — AIMCRS');
  console.log('  Abheet Prem Manghnani — Founder & Inventor');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Dashboard:  http://localhost:${PORT}`);
  console.log(`  Platform:   ${process.env.DEFAULT_PLATFORM || 'fighter'}`);
  console.log(`  Simulation: ${process.env.SIMULATION_MODE === 'true' ? 'ON' : 'OFF'}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('  HUMAN IN THE LOOP — AI assists, human decides, always.');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});
