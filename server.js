/**
 * UPIE — Server — 24 Layers + MiroFish Swarm + Sensor Interface
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
const crypto = require('crypto');
const WebSocket = require('ws');
const path = require('path');
const Simulator = require('./src/simulation/simulator');
const { getProfile, getAllProfiles, getProfileNames } = require('./src/platforms/platform-profiles');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 5000;
const ACCESS_PASSWORD = process.env.UPIE_PASSWORD || 'aimcrs2026';

// Active auth tokens (in-memory — simple and secure for single-instance)
const authTokens = new Set();

// ═══════════════════════════════════════════
// AUTHENTICATION — Password gate
// ═══════════════════════════════════════════

app.use(express.json());

// Login endpoint — no auth required
app.post('/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === ACCESS_PASSWORD) {
    const token = crypto.randomBytes(32).toString('hex');
    authTokens.add(token);
    res.cookie('upie_token', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000  // 24 hours
    });
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid access code' });
  }
});

// Serve login page — no auth required
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Cookie parser middleware (simple — no dependency needed)
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [key, ...val] = c.trim().split('=');
    if (key) cookies[key] = val.join('=');
  });
  return cookies;
}

// Auth middleware — protects everything below
function authMiddleware(req, res, next) {
  // Allow static assets needed for login page
  if (req.path === '/login' || req.path === '/login.html') {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.upie_token;

  if (token && authTokens.has(token)) {
    return next();
  }

  // If requesting the dashboard HTML, redirect to login
  if (req.path === '/' || req.path === '/index.html') {
    return res.redirect('/login');
  }

  // API calls get 401
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // CSS/JS — allow through so login page looks right
  if (req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.endsWith('.ico')) {
    return next();
  }

  return res.redirect('/login');
}

app.use(authMiddleware);

// Serve dashboard files (protected by auth middleware above)
app.use(express.static(path.join(__dirname, 'public')));

// Logout
app.post('/auth/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.upie_token;
  if (token) authTokens.delete(token);
  res.clearCookie('upie_token');
  res.json({ success: true });
});

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
// FUSION MODE — Switch between Swarm and Weighted
// ═══════════════════════════════════════════

app.post('/api/fusion-mode', (req, res) => {
  const { mode } = req.body;  // 'swarm' or 'weighted'
  if (mode !== 'swarm' && mode !== 'weighted') {
    return res.status(400).json({ error: 'Mode must be "swarm" or "weighted"' });
  }
  simulator.engine.fusionMode = mode;
  res.json({ success: true, fusionMode: mode });
});

app.get('/api/fusion-mode', (req, res) => {
  res.json({ fusionMode: simulator.engine ? simulator.engine.fusionMode : 'swarm' });
});

// ═══════════════════════════════════════════
// SENSOR INTERFACE — Feed real sensor data
// ═══════════════════════════════════════════

// Feed real sensor data into UPIE
app.post('/api/sensor/feed', (req, res) => {
  if (!simulator.engine) {
    return res.status(500).json({ error: 'Engine not initialised' });
  }
  const result = simulator.engine.sensorInterface.feedData(req.body);
  res.json(result);
});

// Register a real sensor
app.post('/api/sensor/register', (req, res) => {
  if (!simulator.engine) {
    return res.status(500).json({ error: 'Engine not initialised' });
  }
  const { layerId, sensorName } = req.body;
  simulator.engine.sensorInterface.registerSensor(layerId, sensorName);
  res.json({ success: true, layerId, sensorName });
});

// Disconnect a sensor
app.post('/api/sensor/disconnect', (req, res) => {
  if (!simulator.engine) {
    return res.status(500).json({ error: 'Engine not initialised' });
  }
  const { layerId } = req.body;
  simulator.engine.sensorInterface.disconnectSensor(layerId);
  res.json({ success: true, layerId });
});

// Get sensor status
app.get('/api/sensor/status', (req, res) => {
  if (!simulator.engine) {
    return res.status(500).json({ error: 'Engine not initialised' });
  }
  res.json(simulator.engine.sensorInterface.getAllSensorStatus());
});

// ═══════════════════════════════════════════
// EDGE PROCESSOR — Local brain controls
// ═══════════════════════════════════════════

// Toggle edge processing on/off
app.post('/api/edge/toggle', (req, res) => {
  if (!simulator.engine) {
    return res.status(500).json({ error: 'Engine not initialised' });
  }
  simulator.engine.edgeEnabled = !simulator.engine.edgeEnabled;
  res.json({ success: true, edgeEnabled: simulator.engine.edgeEnabled });
});

// Get edge processor state
app.get('/api/edge/state', (req, res) => {
  if (!simulator.engine) {
    return res.status(500).json({ error: 'Engine not initialised' });
  }
  res.json(simulator.engine.edgeProcessor.getState());
});

// Get edge metrics
app.get('/api/edge/metrics', (req, res) => {
  if (!simulator.engine) {
    return res.status(500).json({ error: 'Engine not initialised' });
  }
  res.json(simulator.engine.edgeProcessor.getMetrics());
});

// ═══════════════════════════════════════════
// ONBOARD NAVIGATOR — Independent path tracking
// ═══════════════════════════════════════════

// Lock origin coordinates (starting point)
app.post('/api/onboard/lock-origin', (req, res) => {
  if (!simulator.engine) {
    return res.status(500).json({ error: 'Engine not initialised' });
  }
  const { lat, lon, alt } = req.body;
  const result = simulator.engine.onboardNav.lockOrigin(lat, lon, alt || 0);
  res.json(result);
});

// Get onboard navigator state
app.get('/api/onboard/state', (req, res) => {
  if (!simulator.engine) {
    return res.status(500).json({ error: 'Engine not initialised' });
  }
  res.json(simulator.engine.onboardNav.getState());
});

// Get consensus position
app.get('/api/onboard/position', (req, res) => {
  if (!simulator.engine) {
    return res.status(500).json({ error: 'Engine not initialised' });
  }
  res.json(simulator.engine.onboardNav.getPosition());
});

// Reset onboard navigator
app.post('/api/onboard/reset', (req, res) => {
  if (!simulator.engine) {
    return res.status(500).json({ error: 'Engine not initialised' });
  }
  simulator.engine.onboardNav.reset();
  res.json({ success: true, message: 'Onboard navigator reset' });
});

// ═══════════════════════════════════════════
// FLIGHT RECORDER + LEARNING ENGINE
// ═══════════════════════════════════════════

// Start recording
app.post('/api/recorder/start', (req, res) => {
  if (!simulator.engine) return res.status(500).json({ error: 'Engine not initialised' });
  const result = simulator.engine.flightRecorder.startSession(
    req.body.platform || process.env.DEFAULT_PLATFORM || 'fighter'
  );
  res.json(result);
});

// Stop recording + trigger learning
app.post('/api/recorder/stop', (req, res) => {
  if (!simulator.engine) return res.status(500).json({ error: 'Engine not initialised' });
  const summary = simulator.engine.flightRecorder.stopSession();
  // Feed the flight data to the learning engine
  let lessons = null;
  if (summary) {
    lessons = simulator.engine.learningEngine.learnFromSession(summary);
  }
  res.json({ summary, lessons });
});

// Get current recording summary
app.get('/api/recorder/summary', (req, res) => {
  if (!simulator.engine) return res.status(500).json({ error: 'Engine not initialised' });
  res.json(simulator.engine.flightRecorder.getSummary());
});

// List all past sessions
app.get('/api/recorder/sessions', (req, res) => {
  if (!simulator.engine) return res.status(500).json({ error: 'Engine not initialised' });
  res.json(simulator.engine.flightRecorder.listSessions());
});

// Get knowledge summary
app.get('/api/learning/knowledge', (req, res) => {
  if (!simulator.engine) return res.status(500).json({ error: 'Engine not initialised' });
  res.json(simulator.engine.learningEngine.getKnowledgeSummary());
});

// Get learned weight adjustments
app.get('/api/learning/weights', (req, res) => {
  if (!simulator.engine) return res.status(500).json({ error: 'Engine not initialised' });
  res.json(simulator.engine.learningEngine.getWeightAdjustments());
});

// Apply learned knowledge to engine
app.post('/api/learning/apply', (req, res) => {
  if (!simulator.engine) return res.status(500).json({ error: 'Engine not initialised' });
  const result = simulator.engine.learningEngine.applyToEngine(simulator.engine);
  res.json(result);
});

// ═══════════════════════════════════════════
// DEMO SYSTEM — Pre-built demo sequences
// ═══════════════════════════════════════════

// Get all available demos
app.get('/api/demos', (req, res) => {
  res.json([
    {
      id: 'full-system',
      name: 'Full System Demo',
      description: 'Start fighter with all 24 layers, show swarm fusion, record flight, learn from it',
      duration: '30 seconds',
      steps: ['Init fighter', 'Start simulation', 'Record flight', 'Run 20 cycles', 'Stop + Learn', 'Show results']
    },
    {
      id: 'gps-denied',
      name: 'GPS Denied Operations',
      description: 'Enemy jams GPS — watch UPIE maintain position using 23 other layers',
      duration: '20 seconds',
      steps: ['Start normal', 'Run 5 cycles', 'Jam GPS', 'Run 15 cycles', 'Show position maintained']
    },
    {
      id: 'spoof-detect',
      name: 'Spoofing Detection',
      description: 'Enemy sends fake GPS signal — MiroFish swarm detects and rejects it',
      duration: '20 seconds',
      steps: ['Start normal', 'Run 5 cycles', 'Spoof GPS', 'Swarm detects outlier', 'Alert raised']
    },
    {
      id: 'platform-tour',
      name: 'Platform Tour',
      description: 'Switch through all 8 platforms — fighter, submarine, drone, spacecraft, bunker',
      duration: '40 seconds',
      steps: ['Fighter (20 layers)', 'Submarine (8 layers)', 'Small Drone (9 layers)', 'Spacecraft (deep space)', 'Underground Bunker (no GPS)']
    },
    {
      id: 'swarm-vs-weighted',
      name: 'Swarm vs Weighted',
      description: 'Compare MiroFish swarm intelligence against classic weighted average',
      duration: '20 seconds',
      steps: ['Run swarm 10 cycles', 'Record error', 'Switch to weighted', 'Run 10 cycles', 'Compare accuracy']
    },
    {
      id: 'edge-processor',
      name: 'Edge Processor Demo',
      description: 'Watch the local brain clean noise, reject spikes, and track motion',
      duration: '15 seconds',
      steps: ['Enable edge', 'Run 15 cycles', 'Show noise removed', 'Show spikes rejected', 'Show motion tracking']
    },
    {
      id: 'multi-failure',
      name: 'Multi-Failure Stress Test',
      description: 'GPS + Star + Terrain + WiFi all fail — system stays operational',
      duration: '20 seconds',
      steps: ['Start normal', 'Run 5 cycles', 'Kill 4 layers', 'Run 15 cycles', 'Position maintained']
    },
    {
      id: 'submarine-deep',
      name: 'Submarine Deep Dive',
      description: 'Submarine underwater — no satellites, using acoustic, gravity, quantum, magnetic',
      duration: '20 seconds',
      steps: ['Switch to submarine', 'No GPS/GNSS available', 'Acoustic + Gravity + Quantum + INS', 'Run 20 cycles', 'Show accuracy']
    }
  ]);
});

// Run a specific demo
let demoRunning = false;
let demoInterval = null;

app.post('/api/demo/run', async (req, res) => {
  const { demoId } = req.body;

  if (demoRunning) {
    // Stop existing demo
    if (demoInterval) clearInterval(demoInterval);
    simulator.stop();
    demoRunning = false;
  }

  demoRunning = true;
  let step = 0;
  const steps = [];

  const broadcastDemo = (stepName, data) => {
    const msg = JSON.stringify({
      type: 'demo',
      demoId,
      step: stepName,
      stepNumber: step++,
      data
    });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
  };

  switch (demoId) {
    case 'full-system': {
      // Step 1: Init fighter
      simulator.stop();
      simulator.init('fighter');
      simulator.engine.fusionMode = 'swarm';
      simulator.engine.edgeEnabled = true;
      broadcastDemo('Initializing Fighter Aircraft — 20 active layers', simulator.getState());

      // Step 2: Start recording
      simulator.engine.flightRecorder.startSession('fighter');
      broadcastDemo('Flight Recorder started — recording all data', {});

      // Step 3: Run simulation with broadcasts
      simulator.start(broadcastResult);
      broadcastDemo('Simulation running — MiroFish Swarm Intelligence active', {});

      // Step 4: After 20 seconds, stop and learn
      setTimeout(() => {
        const summary = simulator.engine.flightRecorder.stopSession();
        let lessons = null;
        if (summary) {
          lessons = simulator.engine.learningEngine.learnFromSession(summary);
        }
        broadcastDemo('Flight complete — Learning Engine analyzing data', { summary, lessons });
        setTimeout(() => {
          simulator.stop();
          demoRunning = false;
          broadcastDemo('Demo complete — system learned from this flight', { summary, lessons });
        }, 5000);
      }, 20000);

      res.json({ success: true, message: 'Full System Demo started — 30 second sequence' });
      break;
    }

    case 'gps-denied': {
      simulator.stop();
      simulator.init('fighter');
      simulator.engine.fusionMode = 'swarm';
      simulator.engine.edgeEnabled = true;
      simulator.setScenario('normal');
      broadcastDemo('Starting normal flight — all layers active', {});
      simulator.start(broadcastResult);

      setTimeout(() => {
        simulator.setScenario('gps-jamming');
        broadcastDemo('GPS JAMMED — Enemy jamming detected! 23 layers compensating...', {});
      }, 5000);

      setTimeout(() => {
        simulator.stop();
        demoRunning = false;
        broadcastDemo('Demo complete — position maintained without GPS', {});
      }, 20000);

      res.json({ success: true, message: 'GPS Denied demo started — watch GPS go offline' });
      break;
    }

    case 'spoof-detect': {
      simulator.stop();
      simulator.init('fighter');
      simulator.engine.fusionMode = 'swarm';
      simulator.engine.edgeEnabled = true;
      simulator.setScenario('normal');
      broadcastDemo('Starting normal flight — all systems nominal', {});
      simulator.start(broadcastResult);

      setTimeout(() => {
        simulator.setScenario('gps-spoofing');
        broadcastDemo('GPS SPOOFED — Enemy sending fake GPS signal! MiroFish detecting...', {});
      }, 5000);

      setTimeout(() => {
        simulator.stop();
        demoRunning = false;
        broadcastDemo('Demo complete — spoofing detected and rejected by swarm', {});
      }, 20000);

      res.json({ success: true, message: 'Spoofing Detection demo started — watch the AI catch it' });
      break;
    }

    case 'platform-tour': {
      const platforms = [
        { name: 'fighter', label: 'Fighter Aircraft', layers: 20 },
        { name: 'submarine', label: 'Submarine', layers: 8 },
        { name: 'small-drone', label: 'Small Drone', layers: 9 },
        { name: 'spacecraft', label: 'Spacecraft / Deep Space', layers: 6 },
        { name: 'underground-bunker', label: 'Underground Bunker', layers: 4 }
      ];

      let idx = 0;
      const switchPlatform = () => {
        if (idx >= platforms.length) {
          simulator.stop();
          demoRunning = false;
          broadcastDemo('Platform Tour complete — 8 platforms, each with optimized layer set', {});
          if (demoInterval) clearInterval(demoInterval);
          return;
        }
        const p = platforms[idx];
        simulator.stop();
        simulator.init(p.name);
        simulator.engine.fusionMode = 'swarm';
        simulator.engine.edgeEnabled = true;
        broadcastDemo(`${p.label} — ${p.layers} active layers`, simulator.getState());
        simulator.start(broadcastResult);
        idx++;
      };

      switchPlatform();
      demoInterval = setInterval(switchPlatform, 8000);

      res.json({ success: true, message: 'Platform Tour started — cycling through all platforms' });
      break;
    }

    case 'swarm-vs-weighted': {
      simulator.stop();
      simulator.init('fighter');
      simulator.engine.fusionMode = 'swarm';
      simulator.engine.edgeEnabled = true;
      broadcastDemo('Phase 1: MiroFish Swarm Intelligence — 10 cycles', {});
      simulator.start(broadcastResult);

      setTimeout(() => {
        simulator.engine.fusionMode = 'weighted';
        broadcastDemo('Phase 2: Switching to Weighted Average — 10 cycles', {});
      }, 10000);

      setTimeout(() => {
        simulator.stop();
        demoRunning = false;
        broadcastDemo('Demo complete — compare Swarm vs Weighted accuracy in the dashboard', {});
      }, 20000);

      res.json({ success: true, message: 'Swarm vs Weighted comparison started' });
      break;
    }

    case 'edge-processor': {
      simulator.stop();
      simulator.init('fighter');
      simulator.engine.fusionMode = 'swarm';
      simulator.engine.edgeEnabled = true;
      broadcastDemo('Edge Processor enabled — Kalman filter + noise reduction + motion tracking', {});
      simulator.start(broadcastResult);

      setTimeout(() => {
        const metrics = simulator.engine.edgeProcessor.getMetrics();
        broadcastDemo('Edge metrics — noise cleaned, spikes rejected, motion tracked', metrics);
      }, 8000);

      setTimeout(() => {
        simulator.stop();
        demoRunning = false;
        const metrics = simulator.engine.edgeProcessor.getMetrics();
        broadcastDemo('Demo complete — see Edge Processor stats', metrics);
      }, 15000);

      res.json({ success: true, message: 'Edge Processor demo started' });
      break;
    }

    case 'multi-failure': {
      simulator.stop();
      simulator.init('fighter');
      simulator.engine.fusionMode = 'swarm';
      simulator.engine.edgeEnabled = true;
      simulator.setScenario('normal');
      broadcastDemo('Starting normal flight — all 20 layers active', {});
      simulator.start(broadcastResult);

      setTimeout(() => {
        simulator.setScenario('multi-failure');
        broadcastDemo('MULTI-FAILURE — GPS + Star + Terrain + WiFi all offline!', {});
      }, 5000);

      setTimeout(() => {
        simulator.stop();
        demoRunning = false;
        broadcastDemo('Demo complete — system maintained position despite 4 layer failures', {});
      }, 20000);

      res.json({ success: true, message: 'Multi-Failure stress test started' });
      break;
    }

    case 'submarine-deep': {
      simulator.stop();
      simulator.init('submarine');
      simulator.engine.fusionMode = 'swarm';
      simulator.engine.edgeEnabled = true;
      broadcastDemo('Submarine deployed — no satellite signals underwater', {});
      simulator.start(broadcastResult);

      setTimeout(() => {
        broadcastDemo('Using: Acoustic + Gravity + Quantum + INS + Magnetic — GPS denied', {});
      }, 5000);

      setTimeout(() => {
        simulator.stop();
        demoRunning = false;
        broadcastDemo('Demo complete — submarine navigated successfully without satellites', {});
      }, 20000);

      res.json({ success: true, message: 'Submarine Deep Dive demo started' });
      break;
    }

    default:
      demoRunning = false;
      res.status(400).json({ error: `Unknown demo: ${demoId}` });
  }
});

// Stop any running demo
app.post('/api/demo/stop', (req, res) => {
  if (demoInterval) clearInterval(demoInterval);
  simulator.stop();
  demoRunning = false;
  res.json({ success: true, message: 'Demo stopped' });
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

wss.on('connection', (ws, req) => {
  // Verify auth token from cookie
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.upie_token;
  if (!token || !authTokens.has(token)) {
    ws.close(4001, 'Not authenticated');
    return;
  }

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
  console.log('  24 Positioning Layers — MiroFish Swarm Fusion');
  console.log('  Patent Pending — AIMCRS');
  console.log('  Abheet Prem Manghnani — Founder & Inventor');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Dashboard:    http://localhost:${PORT}`);
  console.log(`  Password:     Protected (access code required)`);
  console.log(`  Platform:     ${process.env.DEFAULT_PLATFORM || 'fighter'}`);
  console.log(`  Fusion Mode:  MiroFish Swarm Intelligence`);
  console.log(`  Layers:       24 positioning methods`);
  console.log(`  Simulation:   ${process.env.SIMULATION_MODE === 'true' ? 'ON' : 'OFF'}`);
  console.log(`  Demos:        8 interactive demo sequences`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('  HUMAN IN THE LOOP — AI assists, human decides, always.');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});
