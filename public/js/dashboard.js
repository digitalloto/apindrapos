/**
 * UPIE Dashboard — 48 Layers — MiroFish Swarm — Client JavaScript
 * Patent Pending — AIMCRS
 *
 * Connects to server via WebSocket for real-time fusion data.
 * HUMAN IN THE LOOP — all data displayed for operator decision.
 */

// ═══════════════════════════════════════════
// ALL 48 LAYER DEFINITIONS — with categories
// ═══════════════════════════════════════════
const LAYER_DEFS = [
  // ═══ SATELLITE SYSTEMS ═══
  { id: 1,  name: 'GPS / GNSS',        cat: 'satellite' },
  { id: 2,  name: 'NAVIC (India)',      cat: 'satellite' },
  { id: 14, name: 'GLONASS (Russia)',   cat: 'satellite' },
  { id: 15, name: 'Galileo (Europe)',   cat: 'satellite' },
  { id: 16, name: 'BeiDou (China)',     cat: 'satellite' },
  { id: 26, name: 'QZSS (Japan)',       cat: 'satellite' },
  { id: 25, name: 'SBAS (WAAS/EGNOS)', cat: 'satellite' },
  { id: 27, name: 'RTK GPS',            cat: 'satellite' },
  { id: 28, name: 'PPP (Precise)',      cat: 'satellite' },
  { id: 35, name: 'Starlink LEO',       cat: 'satellite' },

  // ═══ CELESTIAL ═══
  { id: 4,  name: 'Star Tracking',     cat: 'celestial' },
  { id: 13, name: 'Sun/Moon Celestial', cat: 'celestial' },
  { id: 23, name: 'Pulsar XNAV',       cat: 'celestial' },
  { id: 46, name: 'Radio Astronomy',    cat: 'celestial' },

  // ═══ INTERNAL SENSORS ═══
  { id: 3,  name: 'INS Dead Reckoning', cat: 'internal' },
  { id: 12, name: 'Doppler Velocity',  cat: 'internal' },
  { id: 11, name: 'Barometric Alt',    cat: 'internal' },
  { id: 19, name: 'Radar Altimetry',   cat: 'internal' },
  { id: 45, name: 'Wheel Odometry',     cat: 'internal' },
  { id: 44, name: 'PDR (Pedestrian)',   cat: 'internal' },

  // ═══ GROUND/TERRAIN ═══
  { id: 5,  name: 'Terrain Matching',  cat: 'ground' },
  { id: 6,  name: 'Magnetic Anomaly',  cat: 'ground' },
  { id: 7,  name: 'Ground Emitters',   cat: 'ground' },
  { id: 17, name: 'Gravity Gradient',  cat: 'ground' },
  { id: 10, name: 'Acoustic (Water)',  cat: 'ground' },
  { id: 41, name: 'Ocean Current Map', cat: 'ground' },
  { id: 39, name: 'Seismic / Vibration', cat: 'ground' },

  // ═══ SIGNAL/WIRELESS ═══
  { id: 8,  name: 'WiFi Mapping',      cat: 'signal' },
  { id: 9,  name: 'Cell Tower',        cat: 'signal' },
  { id: 18, name: 'RF Fingerprint',    cat: 'signal' },
  { id: 21, name: 'eLoran Radio',      cat: 'signal' },
  { id: 33, name: '5G NR Positioning', cat: 'signal' },
  { id: 34, name: 'LoRa/LPWAN',        cat: 'signal' },
  { id: 29, name: 'UWB (Ultra-Wide)',  cat: 'signal' },
  { id: 30, name: 'BLE Beacon',        cat: 'signal' },
  { id: 37, name: 'VLC / Li-Fi',       cat: 'signal' },
  { id: 38, name: 'Infrared (IR)',     cat: 'signal' },
  { id: 47, name: 'Geomag Indoor FP', cat: 'signal' },
  { id: 48, name: 'Atmo Pressure Map', cat: 'signal' },

  // ═══ VISION/AI ═══
  { id: 20, name: 'Visual Odometry',   cat: 'vision' },
  { id: 32, name: 'Vision Landmark AI', cat: 'vision' },
  { id: 42, name: 'Satellite Imagery AI', cat: 'vision' },
  { id: 43, name: 'Shadow Analysis AI', cat: 'vision' },

  // ═══ FRONTIER ═══
  { id: 24, name: 'Quantum Compass',   cat: 'frontier' },
  { id: 22, name: 'Cosmic Ray/Muon',   cat: 'frontier' },
  { id: 31, name: 'LiDAR SLAM',        cat: 'frontier' },
  { id: 40, name: 'Radar SLAM / SAR', cat: 'frontier' },
  { id: 36, name: 'Ambient Sound FP', cat: 'frontier' }
];

// Category colors for map markers
const CAT_COLORS = {
  satellite: '#1a73e8',
  celestial: '#9b59b6',
  internal: '#e67e22',
  ground: '#2ecc71',
  signal: '#f1c40f',
  frontier: '#e74c3c',
  vision: '#00bcd4'
};

// Store last readings per layer for map
let lastLayerReadings = {};
let mapInstance = null;
let mapMarkers = {};
let fusedMarker = null;

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  buildLayerGrid();
  buildDemoGrid();
  setupControls();
  setupAutoNavControls();
  setupDeviceGps();
  setupFleetControls();
  setupNavigation();
  initMap();
  connectWebSocket();
});

function buildLayerGrid() {
  const grid = document.getElementById('layers-grid');
  grid.innerHTML = '';
  for (const layer of LAYER_DEFS) {
    const card = document.createElement('div');
    card.className = `layer-card inactive cat-${layer.cat}`;
    card.id = `layer-${layer.id}`;
    card.innerHTML = `
      <div class="layer-id">${layer.id}</div>
      <div class="layer-name">${layer.name}</div>
      <div class="layer-coords" id="layer-coords-${layer.id}">
        <span class="layer-lat">—</span>
        <span class="layer-lon">—</span>
      </div>
      <div class="layer-accuracy" id="layer-acc-${layer.id}">—</div>
      <div class="layer-ban-badge" id="layer-ban-${layer.id}" style="display:none">BANNED</div>
      <div class="layer-status-dot grey" id="layer-dot-${layer.id}"></div>
    `;
    card.addEventListener('click', () => toggleLayer(layer.id));
    grid.appendChild(card);
  }
}

// ═══════════════════════════════════════════
// MAP — Leaflet.js
// ═══════════════════════════════════════════
function initMap() {
  const mapEl = document.getElementById('position-map');
  if (!mapEl) return;

  mapInstance = L.map('position-map', {
    center: [13.0827, 80.2707], // Chennai, India — default
    zoom: 15,
    zoomControl: true,
    attributionControl: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(mapInstance);

  // Fused position marker (large, white)
  fusedMarker = L.circleMarker([13.0827, 80.2707], {
    radius: 10,
    color: '#fff',
    fillColor: '#fff',
    fillOpacity: 1,
    weight: 3
  }).addTo(mapInstance);
  fusedMarker.bindTooltip('FUSED POSITION', { permanent: false, direction: 'top' });
}

function updateMap(data, layers) {
  if (!mapInstance) return;

  // Update fused position marker
  if (data.lat !== null && data.lon !== null) {
    fusedMarker.setLatLng([data.lat, data.lon]);
    fusedMarker.setTooltipContent(
      `FUSED: ${data.lat.toFixed(6)}, ${data.lon.toFixed(6)}`
    );
  }

  // Update per-layer markers
  if (layers) {
    for (const layer of layers) {
      const reading = layer.lastReading;
      const def = LAYER_DEFS.find(d => d.id === layer.id);
      if (!def) continue;
      const color = CAT_COLORS[def.cat] || '#fff';

      if (reading && reading.lat !== null && reading.lon !== null && layer.active) {
        if (!mapMarkers[layer.id]) {
          // Create marker
          mapMarkers[layer.id] = L.circleMarker([reading.lat, reading.lon], {
            radius: 5,
            color: color,
            fillColor: color,
            fillOpacity: 0.7,
            weight: 1
          }).addTo(mapInstance);
        }
        mapMarkers[layer.id].setLatLng([reading.lat, reading.lon]);
        mapMarkers[layer.id].setStyle({
          color: layer.banned ? '#e74c3c' : color,
          fillColor: layer.banned ? '#e74c3c' : color,
          fillOpacity: layer.banned ? 0.3 : 0.7
        });
        mapMarkers[layer.id].bindTooltip(
          `${def.name} [${layer.id}]<br>${reading.lat.toFixed(6)}, ${reading.lon.toFixed(6)}<br>` +
          `Acc: ${Math.round(reading.accuracyMetres)}m` +
          (layer.banned ? '<br><b style="color:#e74c3c">BANNED</b>' : ''),
          { direction: 'top' }
        );
        mapMarkers[layer.id].setStyle({ opacity: 1 });
      } else if (mapMarkers[layer.id]) {
        // Hide inactive marker
        mapMarkers[layer.id].setStyle({ opacity: 0, fillOpacity: 0 });
      }
    }
  }

  // Center map on fused position (only on first data or big jump)
  if (data.lat !== null && data.fusionCycle <= 3) {
    mapInstance.setView([data.lat, data.lon], 15);
  }
}

// ═══════════════════════════════════════════
// CONTROLS
// ═══════════════════════════════════════════
function setupControls() {
  document.getElementById('btn-start').addEventListener('click', () => {
    fetch('/api/start', { method: 'POST' })
      .then(() => { document.getElementById('sim-status').textContent = 'RUNNING'; });
  });

  document.getElementById('btn-stop').addEventListener('click', () => {
    fetch('/api/stop', { method: 'POST' })
      .then(() => { document.getElementById('sim-status').textContent = 'STOPPED'; });
  });

  document.getElementById('btn-tick').addEventListener('click', () => {
    fetch('/api/tick', { method: 'POST' })
      .then(r => r.json())
      .then(data => updateDashboard(data, null));
  });

  document.getElementById('platform-select').addEventListener('change', (e) => {
    fetch('/api/platform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: e.target.value })
    });
  });

  document.getElementById('scenario-select').addEventListener('change', (e) => {
    fetch('/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: e.target.value })
    });
  });

  document.getElementById('fusion-mode-select').addEventListener('change', (e) => {
    fetch('/api/fusion-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: e.target.value })
    });
  });

  document.getElementById('precision-mode-select').addEventListener('change', (e) => {
    fetch('/api/precision-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: e.target.value })
    });
  });

  // Flight recorder controls
  document.getElementById('btn-record-start').addEventListener('click', () => {
    fetch('/api/recorder/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: document.getElementById('platform-select').value })
    }).then(() => {
      document.getElementById('rec-status').textContent = 'REC';
      document.getElementById('rec-status').className = 'edge-on';
    });
  });

  document.getElementById('btn-record-stop').addEventListener('click', () => {
    fetch('/api/recorder/stop', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        document.getElementById('rec-status').textContent = 'OFF';
        document.getElementById('rec-status').className = 'edge-off';
        // Update learning display
        if (data.lessons && data.lessons.knowledge) {
          updateLearningDisplay(data.lessons.knowledge);
        }
      });
  });

  // Load learning data on startup
  fetch('/api/learning/knowledge')
    .then(r => r.json())
    .then(data => updateLearningDisplay(data));
}

function updateLearningDisplay(knowledge) {
  document.getElementById('learn-flights').textContent = knowledge.totalFlightSessions || 0;
  document.getElementById('learn-hours').textContent = knowledge.totalFlightHours || 0;
  document.getElementById('learn-layers').textContent = knowledge.layersLearned || 0;
  document.getElementById('learn-platforms').textContent = knowledge.platformsLearned || 0;
}

function toggleLayer(layerId) {
  fetch('/api/layer/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ layerId })
  });
}

// ═══════════════════════════════════════════
// WEBSOCKET
// ═══════════════════════════════════════════
let ws = null;

function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'fusion') {
      updateDashboard(msg.data, msg.layers);
    } else if (msg.type === 'fleet') {
      updateFleetDashboard(msg.data);
    } else if (msg.type === 'demo') {
      addDemoLog(msg.step);
      // Auto-stop demo display if complete
      if (msg.step && msg.step.startsWith('Demo complete')) {
        stopDemo();
      }
    }
  });

  ws.addEventListener('close', () => {
    setTimeout(connectWebSocket, 2000);
  });
}

// ═══════════════════════════════════════════
// UPDATE DASHBOARD
// ═══════════════════════════════════════════
function updateDashboard(data, layers) {
  // Fused position
  document.getElementById('fused-lat').textContent =
    data.lat !== null ? data.lat.toFixed(6) : '—';
  document.getElementById('fused-lon').textContent =
    data.lon !== null ? data.lon.toFixed(6) : '—';
  document.getElementById('fused-alt').textContent =
    data.alt !== null ? data.alt.toFixed(2) + ' m' : '— m';

  // Meta
  document.getElementById('error-metres').textContent =
    data.errorMetres !== undefined ? data.errorMetres.toFixed(2) : '—';
  document.getElementById('fusion-cycle').textContent = data.fusionCycle || 0;
  document.getElementById('active-layers').textContent = data.activeLayerCount || 0;
  document.getElementById('valid-layers').textContent = data.validLayerCount || 0;
  document.getElementById('fusion-mode-display').textContent =
    data.fusionMode === 'swarm' ? 'SWARM' : 'WEIGHTED';

  // Confidence
  if (data.confidence) {
    updateGauge(data.confidence);
  }

  // Layers — with coordinates and auto-ban
  if (layers) {
    updateLayers(layers, data);
  }

  // Alerts
  if (data.spoofAlerts && data.spoofAlerts.length > 0) {
    updateAlerts(data.spoofAlerts);
  }

  // Auto-ban alerts
  if (data.autoBanAlerts && data.autoBanAlerts.length > 0) {
    updateAlerts(data.autoBanAlerts);
  }

  // Edge processor metrics
  if (data.edgeMetrics) {
    const em = data.edgeMetrics;
    document.getElementById('edge-status').textContent = 'ON';
    document.getElementById('edge-status').className = 'edge-on';
    document.getElementById('edge-noise').textContent =
      (em.totalNoiseRemoved || 0).toFixed(1) + ' m';
    document.getElementById('edge-spikes').textContent = em.totalSpikesRejected || 0;
    document.getElementById('edge-violations').textContent = em.trackViolations || 0;
  }

  // Motion tracker
  if (data.motionState) {
    const ms = data.motionState;
    document.getElementById('motion-speed').textContent =
      (ms.velocityMps || 0).toFixed(1) + ' m/s';
    document.getElementById('motion-heading').textContent =
      (ms.headingDeg || 0).toFixed(1) + '\u00B0';
    document.getElementById('motion-accel').textContent =
      (ms.accelerationMps2 || 0).toFixed(1) + ' m/s\u00B2';
    const manEl = document.getElementById('motion-manoeuvre');
    if (ms.manoeuvreDetected) {
      manEl.textContent = (ms.manoeuvreType || 'UNKNOWN').toUpperCase();
      manEl.style.color = '#e67e22';
    } else {
      manEl.textContent = 'NONE';
      manEl.style.color = '#2ecc71';
    }
  }

  // Autonomous Navigator
  if (data.autoNav) {
    updateAutoNav(data.autoNav);
  }

  // Onboard Navigator
  if (data.onboardNav) {
    const nav = data.onboardNav;
    document.getElementById('nav-origin').textContent = 'LOCKED';
    document.getElementById('nav-origin').className = 'edge-on';
    document.getElementById('nav-lat').textContent =
      nav.consensus && nav.consensus.lat ? nav.consensus.lat.toFixed(6) : '—';
    document.getElementById('nav-lon').textContent =
      nav.consensus && nav.consensus.lon ? nav.consensus.lon.toFixed(6) : '—';
    document.getElementById('nav-confidence').textContent = (nav.confidence || 0) + '%';
    document.getElementById('nav-trackers').textContent = nav.activeTrackers || 0;
    document.getElementById('nav-noise').textContent = nav.noiseTrackers || 0;
    document.getElementById('nav-spread').textContent =
      (nav.avgSpread || 0).toFixed(1) + ' m';
    document.getElementById('nav-cycles').textContent = nav.cycle || 0;
  }

  // Auto-ban stats
  if (data.autoBanStats) {
    const abs = data.autoBanStats;
    const el = document.getElementById('autoban-total');
    if (el) el.textContent = abs.totalBanned || 0;
    const el2 = document.getElementById('autoban-active');
    if (el2) el2.textContent = abs.currentlyBanned || 0;
    const el3 = document.getElementById('autoban-reinstated');
    if (el3) el3.textContent = abs.totalReinstated || 0;
    const el4 = document.getElementById('autoban-worst');
    if (el4) el4.textContent = abs.worstOffender || '—';
  }

  // Update map
  updateMap(data, layers);

  // Navigation display
  if (data.navigation) {
    updateNavDisplay(data.navigation);
  }

  // Recorder summary — poll every 10 cycles
  if (data.fusionCycle && data.fusionCycle % 10 === 0) {
    fetch('/api/recorder/summary')
      .then(r => r.json())
      .then(sum => {
        if (sum.recording) {
          document.getElementById('rec-status').textContent = 'REC';
          document.getElementById('rec-status').className = 'edge-on';
        }
        document.getElementById('rec-cycles').textContent = sum.totalCycles || 0;
        document.getElementById('rec-error').textContent =
          (sum.avgFusionError || 0).toFixed(1) + ' m';
        document.getElementById('rec-confidence').textContent =
          (sum.avgConfidence || 0) + '%';
      })
      .catch(() => {});
  }
}

function updateGauge(confidence) {
  const score = confidence.score;
  const gauge = document.querySelector('.gauge');
  const gaugeText = document.getElementById('gauge-text');
  const levelEl = document.getElementById('confidence-level');
  const messageEl = document.getElementById('confidence-message');

  let color = '#2ecc71';
  if (score < 40) color = '#e74c3c';
  else if (score < 60) color = '#e67e22';
  else if (score < 80) color = '#f1c40f';

  gauge.style.background = `conic-gradient(${color} ${score * 3.6}deg, #1e3a5f ${score * 3.6}deg)`;
  gaugeText.textContent = score + '%';
  gaugeText.style.color = color;
  levelEl.textContent = confidence.level;
  levelEl.style.color = color;
  messageEl.textContent = confidence.message;
}

function updateLayers(layers, data) {
  for (const layer of layers) {
    const card = document.getElementById(`layer-${layer.id}`);
    const dot = document.getElementById(`layer-dot-${layer.id}`);
    const acc = document.getElementById(`layer-acc-${layer.id}`);
    const coords = document.getElementById(`layer-coords-${layer.id}`);
    const banBadge = document.getElementById(`layer-ban-${layer.id}`);
    if (!card) continue;

    // Get category from LAYER_DEFS
    const def = LAYER_DEFS.find(d => d.id === layer.id);
    const catClass = def ? `cat-${def.cat}` : '';

    card.className = `layer-card ${catClass}`;

    // Update coordinates from last reading
    if (coords && layer.lastReading) {
      const r = layer.lastReading;
      if (r.lat !== null && r.lat !== undefined) {
        coords.querySelector('.layer-lat').textContent = r.lat.toFixed(4);
        coords.querySelector('.layer-lon').textContent = r.lon.toFixed(4);
      } else {
        coords.querySelector('.layer-lat').textContent = '—';
        coords.querySelector('.layer-lon').textContent = '—';
      }
      lastLayerReadings[layer.id] = r;
    }

    // Auto-ban badge
    if (banBadge) {
      if (layer.banned) {
        banBadge.style.display = 'block';
        card.classList.add('banned');
      } else {
        banBadge.style.display = 'none';
      }
    }

    if (!layer.active) {
      card.classList.add('inactive');
      dot.className = 'layer-status-dot grey';
      acc.textContent = 'OFF';
      if (coords) {
        coords.querySelector('.layer-lat').textContent = '—';
        coords.querySelector('.layer-lon').textContent = '—';
      }
    } else if (layer.banned) {
      card.classList.add('banned');
      dot.className = 'layer-status-dot red';
      acc.textContent = 'BANNED';
    } else if (layer.jammed) {
      card.classList.add('jammed');
      dot.className = 'layer-status-dot orange';
      acc.textContent = 'JAMMED';
    } else if (layer.spoofed) {
      card.classList.add('outlier');
      dot.className = 'layer-status-dot red';
      acc.textContent = 'SPOOFED';
    } else {
      card.classList.add('active');
      dot.className = 'layer-status-dot green';
      const range = layer.accuracyRange;
      acc.textContent = `${Math.round(range[0])}-${Math.round(range[1])}m`;
    }
  }
}

// ═══════════════════════════════════════════
// DEMO SYSTEM
// ═══════════════════════════════════════════

let currentDemo = null;

function buildDemoGrid() {
  fetch('/api/demos')
    .then(r => r.json())
    .then(demos => {
      const grid = document.getElementById('demo-grid');
      if (!grid) return;
      grid.innerHTML = '';
      for (const demo of demos) {
        const card = document.createElement('div');
        card.className = 'demo-card';
        card.id = `demo-${demo.id}`;
        card.innerHTML = `
          <div class="demo-name">${demo.name}</div>
          <div class="demo-desc">${demo.description}</div>
          <div class="demo-duration">${demo.duration}</div>
        `;
        card.addEventListener('click', () => runDemo(demo.id, demo.name));
        grid.appendChild(card);
      }
    })
    .catch(() => {});

  // Stop demo button
  const stopBtn = document.getElementById('btn-demo-stop');
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      fetch('/api/demo/stop', { method: 'POST' });
      stopDemo();
    });
  }
}

function runDemo(demoId, demoName) {
  // Clear previous demo state
  if (currentDemo) {
    const prevCard = document.getElementById(`demo-${currentDemo}`);
    if (prevCard) prevCard.classList.remove('running');
  }

  currentDemo = demoId;
  const card = document.getElementById(`demo-${demoId}`);
  if (card) card.classList.add('running');

  const statusText = document.getElementById('demo-running-text');
  const stopBtn = document.getElementById('btn-demo-stop');
  if (statusText) { statusText.textContent = `Running: ${demoName}`; statusText.className = 'active'; }
  if (stopBtn) stopBtn.style.display = 'inline-block';

  // Clear log
  const log = document.getElementById('demo-log');
  if (log) log.innerHTML = '';
  addDemoLog(`Started: ${demoName}`);

  fetch('/api/demo/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demoId })
  }).then(r => r.json()).then(data => {
    if (data.message) addDemoLog(data.message);
  });
}

function stopDemo() {
  if (currentDemo) {
    const card = document.getElementById(`demo-${currentDemo}`);
    if (card) card.classList.remove('running');
  }
  currentDemo = null;
  const statusText = document.getElementById('demo-running-text');
  const stopBtn = document.getElementById('btn-demo-stop');
  if (statusText) { statusText.textContent = 'No demo running'; statusText.className = ''; }
  if (stopBtn) stopBtn.style.display = 'none';
  addDemoLog('Demo stopped');
}

function addDemoLog(message) {
  const log = document.getElementById('demo-log');
  if (!log) return;
  const now = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'demo-log-entry';
  entry.innerHTML = `<span class="log-time">${now}</span><span class="log-step">${message}</span>`;
  log.insertBefore(entry, log.firstChild);
  // Keep max 20 entries
  while (log.children.length > 20) log.removeChild(log.lastChild);
}

// ═══════════════════════════════════════════
// AUTONOMOUS NAVIGATOR — Self-Reliant AI Brain
// ═══════════════════════════════════════════

function setupAutoNavControls() {
  const intervalSelect = document.getElementById('autonav-interval-select');
  if (intervalSelect) {
    intervalSelect.addEventListener('change', (e) => {
      fetch('/api/autonav/surface-interval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: parseInt(e.target.value) })
      });
    });
  }

  const surfaceBtn = document.getElementById('btn-autonav-surface');
  if (surfaceBtn) {
    surfaceBtn.addEventListener('click', () => {
      fetch('/api/autonav/force-surface', { method: 'POST' });
    });
  }

  const resetBtn = document.getElementById('btn-autonav-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      fetch('/api/autonav/reset', { method: 'POST' });
    });
  }
}

function updateAutoNav(autoNav) {
  if (!autoNav) return;

  // Mode
  const modeEl = document.getElementById('autonav-mode');
  if (modeEl) {
    modeEl.textContent = autoNav.mode;
    modeEl.className = 'autonav-mode';
    if (autoNav.mode === 'ACQUIRING') modeEl.classList.add('acquiring');
    else if (autoNav.mode === 'AUTONOMOUS') modeEl.classList.add('autonomous');
    else if (autoNav.mode === 'SURFACE_CHECK') modeEl.classList.add('surface-check');
  }

  // AI Position
  const pos = autoNav.autonomousPosition;
  document.getElementById('autonav-lat').textContent =
    pos && pos.lat !== null ? pos.lat.toFixed(6) : '—';
  document.getElementById('autonav-lon').textContent =
    pos && pos.lon !== null ? pos.lon.toFixed(6) : '—';
  document.getElementById('autonav-confidence').textContent =
    (autoNav.autonomousConfidence || 0) + '%';
  document.getElementById('autonav-next-surface').textContent =
    (autoNav.nextSurfaceIn || 0) + ' cycles';

  // Trust levels
  const aiTrust = document.getElementById('autonav-ai-trust');
  aiTrust.textContent = (autoNav.autonomousTrustLevel || 0) + '%';
  aiTrust.className = autoNav.autonomousTrustLevel >= 50 ? 'edge-on' : 'edge-off';

  const extTrust = document.getElementById('autonav-ext-trust');
  extTrust.textContent = (autoNav.externalTrustLevel || 0) + '%';
  extTrust.className = autoNav.externalTrustLevel >= 50 ? 'edge-on' : 'edge-off';

  document.getElementById('autonav-drift').textContent =
    (autoNav.driftAccumulated || 0).toFixed(1) + ' m';
  document.getElementById('autonav-corrections').textContent =
    (autoNav.correctionApplied || 0).toFixed(1) + ' m';

  // Anti-jam / Anti-spoof
  const jamEl = document.getElementById('autonav-jamming');
  if (autoNav.jammingDetected) {
    jamEl.textContent = 'DETECTED';
    jamEl.className = 'edge-off';
  } else {
    jamEl.textContent = 'CLEAR';
    jamEl.className = 'edge-on';
  }

  const spoofEl = document.getElementById('autonav-spoofing');
  if (autoNav.spoofingDetected) {
    spoofEl.textContent = 'REJECTED';
    spoofEl.className = 'edge-off';
  } else {
    spoofEl.textContent = 'CLEAR';
    spoofEl.className = 'edge-on';
  }

  // Stats
  const stats = autoNav.stats || {};
  document.getElementById('autonav-jam-count').textContent = stats.totalJammingEvents || 0;
  document.getElementById('autonav-spoof-count').textContent = stats.totalSpoofingRejected || 0;
  document.getElementById('autonav-surface-count').textContent = stats.totalSurfaceChecks || 0;
  document.getElementById('autonav-agreements').textContent = stats.totalAgreements || 0;
  document.getElementById('autonav-longest-solo').textContent =
    (stats.longestAutonomousStreak || 0) + ' cycles';
  document.getElementById('autonav-avg-dev').textContent =
    (stats.avgSurfaceDeviation || 0).toFixed(1) + ' m';

  // Surface check log
  if (autoNav.lastSurfaceResult) {
    addAutoNavLog(autoNav.lastSurfaceResult);
  }
}

let lastAutoNavLogMsg = '';
function addAutoNavLog(result) {
  if (!result || result.message === lastAutoNavLogMsg) return;
  lastAutoNavLogMsg = result.message;

  const log = document.getElementById('autonav-surface-log');
  if (!log) return;

  const now = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'demo-log-entry';

  let color = '#2ecc71';
  if (result.severity === 'HIGH' || result.severity === 'CRITICAL') color = '#e74c3c';
  else if (result.severity === 'MEDIUM') color = '#e67e22';

  entry.innerHTML = `<span class="log-time">${now}</span>` +
    `<span style="color:${color};font-weight:bold">[${result.type}]</span> ` +
    `<span class="log-step">${result.message}</span>`;
  log.insertBefore(entry, log.firstChild);
  while (log.children.length > 15) log.removeChild(log.lastChild);
}

// ═══════════════════════════════════════════
// DEVICE GPS — Real phone/browser GPS tracking
// ═══════════════════════════════════════════
let deviceGpsWatchId = null;
let deviceGpsUpdateCount = 0;
let deviceGpsFeedingToEngine = false;
let deviceGpsMarker = null;

function setupDeviceGps() {
  const startBtn = document.getElementById('btn-gps-start');
  const stopBtn = document.getElementById('btn-gps-stop');
  const feedBtn = document.getElementById('btn-gps-feed');
  const unfeedBtn = document.getElementById('btn-gps-unfeed');

  if (startBtn) startBtn.addEventListener('click', startDeviceGps);
  if (stopBtn) stopBtn.addEventListener('click', stopDeviceGps);
  if (feedBtn) feedBtn.addEventListener('click', startFeedingGps);
  if (unfeedBtn) unfeedBtn.addEventListener('click', stopFeedingGps);
}

function startDeviceGps() {
  if (!navigator.geolocation) {
    addDeviceGpsLog('Geolocation not supported by this browser/device');
    return;
  }

  document.getElementById('device-gps-status').textContent = 'ACQUIRING';
  document.getElementById('device-gps-status').className = 'edge-on';
  addDeviceGpsLog('Requesting device GPS position...');

  deviceGpsWatchId = navigator.geolocation.watchPosition(
    onDeviceGpsSuccess,
    onDeviceGpsError,
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    }
  );
}

function stopDeviceGps() {
  if (deviceGpsWatchId !== null) {
    navigator.geolocation.clearWatch(deviceGpsWatchId);
    deviceGpsWatchId = null;
  }
  stopFeedingGps();
  document.getElementById('device-gps-status').textContent = 'OFF';
  document.getElementById('device-gps-status').className = 'edge-off';
  addDeviceGpsLog('Device GPS tracking stopped');

  // Remove device marker from map
  if (deviceGpsMarker && mapInstance) {
    mapInstance.removeLayer(deviceGpsMarker);
    deviceGpsMarker = null;
  }
}

function onDeviceGpsSuccess(position) {
  const coords = position.coords;
  deviceGpsUpdateCount++;

  document.getElementById('device-gps-status').textContent = 'TRACKING';
  document.getElementById('device-gps-status').className = 'edge-on';
  document.getElementById('device-gps-lat').textContent = coords.latitude.toFixed(6);
  document.getElementById('device-gps-lon').textContent = coords.longitude.toFixed(6);
  document.getElementById('device-gps-accuracy').textContent = coords.accuracy.toFixed(1) + ' m';
  document.getElementById('device-gps-alt').textContent =
    coords.altitude !== null ? coords.altitude.toFixed(1) + ' m' : '— m';
  document.getElementById('device-gps-speed').textContent =
    coords.speed !== null ? coords.speed.toFixed(1) + ' m/s' : '— m/s';
  document.getElementById('device-gps-updates').textContent = deviceGpsUpdateCount;

  // Show device position on map
  if (mapInstance) {
    if (!deviceGpsMarker) {
      deviceGpsMarker = L.circleMarker([coords.latitude, coords.longitude], {
        radius: 8,
        color: '#00ff00',
        fillColor: '#00ff00',
        fillOpacity: 0.9,
        weight: 3
      }).addTo(mapInstance);
      deviceGpsMarker.bindTooltip('DEVICE GPS (Real)', { permanent: false, direction: 'top' });
    }
    deviceGpsMarker.setLatLng([coords.latitude, coords.longitude]);
    deviceGpsMarker.setTooltipContent(
      `DEVICE GPS: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}<br>Accuracy: ${coords.accuracy.toFixed(1)}m`
    );
  }

  // Feed to fusion engine if enabled
  if (deviceGpsFeedingToEngine) {
    feedGpsToEngine(coords);
  }

  if (deviceGpsUpdateCount === 1) {
    addDeviceGpsLog(`First fix: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)} (accuracy: ${coords.accuracy.toFixed(1)}m)`);
    // Center map on device position
    if (mapInstance) {
      mapInstance.setView([coords.latitude, coords.longitude], 16);
    }
  }
}

function onDeviceGpsError(error) {
  let msg = 'Unknown error';
  switch (error.code) {
    case 1: msg = 'Permission denied — enable location access'; break;
    case 2: msg = 'Position unavailable — GPS signal lost'; break;
    case 3: msg = 'Timeout — device GPS took too long'; break;
  }
  document.getElementById('device-gps-status').textContent = 'ERROR';
  document.getElementById('device-gps-status').className = 'edge-off';
  addDeviceGpsLog('GPS Error: ' + msg);
}

function startFeedingGps() {
  deviceGpsFeedingToEngine = true;
  document.getElementById('device-gps-fed').textContent = 'YES';
  document.getElementById('device-gps-fed').className = 'edge-on';
  document.getElementById('btn-gps-feed').style.display = 'none';
  document.getElementById('btn-gps-unfeed').style.display = 'inline-block';

  // Register as real sensor for GPS layer (id=1)
  fetch('/api/sensor/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ layerId: 1, sensorName: 'Device GPS (Browser)' })
  });

  addDeviceGpsLog('Now feeding real GPS data to fusion engine as Layer 1 (GPS/GNSS)');
}

function stopFeedingGps() {
  deviceGpsFeedingToEngine = false;
  document.getElementById('device-gps-fed').textContent = 'NO';
  document.getElementById('device-gps-fed').className = 'edge-off';
  document.getElementById('btn-gps-feed').style.display = 'inline-block';
  document.getElementById('btn-gps-unfeed').style.display = 'none';

  // Disconnect sensor — fall back to simulation
  fetch('/api/sensor/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ layerId: 1 })
  });

  addDeviceGpsLog('Stopped feeding GPS to engine — back to simulation');
}

function feedGpsToEngine(coords) {
  fetch('/api/sensor/feed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      layerId: 1,
      layerName: 'Device GPS (Real)',
      lat: coords.latitude,
      lon: coords.longitude,
      alt: coords.altitude,
      accuracyMetres: coords.accuracy,
      timestamp: Date.now()
    })
  });
}

function addDeviceGpsLog(message) {
  const log = document.getElementById('device-gps-log');
  if (!log) return;
  const now = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'demo-log-entry';
  entry.innerHTML = `<span class="log-time">${now}</span><span class="log-step">${message}</span>`;
  log.insertBefore(entry, log.firstChild);
  while (log.children.length > 10) log.removeChild(log.lastChild);
}

// ═══════════════════════════════════════════
// FLEET SWARM SYSTEM — Multi-Drone Controls
// ═══════════════════════════════════════════
let fleetDroneMarkers = {};

function setupFleetControls() {
  const initBtn = document.getElementById('btn-fleet-init');
  const startBtn = document.getElementById('btn-fleet-start');
  const stopBtn = document.getElementById('btn-fleet-stop');
  const evadeBtn = document.getElementById('btn-fleet-evade');
  const reformBtn = document.getElementById('btn-fleet-reform');
  const formSel = document.getElementById('fleet-formation-select');
  const scenSel = document.getElementById('fleet-scenario-select');
  const evaSel = document.getElementById('fleet-evasion-select');

  if (initBtn) initBtn.addEventListener('click', () => {
    fetch('/api/fleet/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ droneCount: 5, platform: 'small-drone', formation: formSel ? formSel.value : 'V_SHAPE' })
    }).then(r => r.json()).then(() => {
      document.getElementById('fleet-status').textContent = 'READY';
      document.getElementById('fleet-status').className = 'edge-on';
      addIntelLog('Fleet initialized with 5 drones');
    });
  });

  if (startBtn) startBtn.addEventListener('click', () => {
    fetch('/api/fleet/start', { method: 'POST' }).then(() => {
      document.getElementById('fleet-status').textContent = 'RUNNING';
      document.getElementById('fleet-status').className = 'edge-on';
    });
  });

  if (stopBtn) stopBtn.addEventListener('click', () => {
    fetch('/api/fleet/stop', { method: 'POST' }).then(() => {
      document.getElementById('fleet-status').textContent = 'STOPPED';
      document.getElementById('fleet-status').className = 'edge-off';
    });
  });

  if (evadeBtn) evadeBtn.addEventListener('click', () => {
    const pattern = evaSel ? evaSel.value : 'RANDOM_SCATTER';
    fetch('/api/fleet/evade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Manual evasion trigger', pattern })
    });
  });

  if (reformBtn) reformBtn.addEventListener('click', () => {
    fetch('/api/fleet/reform', { method: 'POST' });
  });

  if (formSel) formSel.addEventListener('change', (e) => {
    fetch('/api/fleet/formation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formation: e.target.value })
    });
  });

  if (scenSel) scenSel.addEventListener('change', (e) => {
    fetch('/api/fleet/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: e.target.value })
    });
  });

  // Intel buttons
  const exportBtn = document.getElementById('btn-intel-export');
  if (exportBtn) exportBtn.addEventListener('click', () => {
    fetch('/api/report/export')
      .then(r => r.json())
      .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `upie-training-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addIntelLog('Training data exported as JSON');
      });
  });

  const timelineBtn = document.getElementById('btn-intel-timeline');
  if (timelineBtn) timelineBtn.addEventListener('click', () => {
    fetch('/api/report/timeline')
      .then(r => r.json())
      .then(events => {
        const log = document.getElementById('intel-timeline-log');
        if (!log) return;
        log.innerHTML = '';
        for (const evt of events.slice(-50).reverse()) {
          addIntelLogEntry(log, evt);
        }
      });
  });
}

function updateFleetDashboard(fleetData) {
  if (!fleetData) return;

  const el = (id) => document.getElementById(id);
  if (el('fleet-drone-count')) el('fleet-drone-count').textContent = Object.keys(fleetData.droneResults || {}).length;

  if (fleetData.formation) {
    if (el('fleet-formation')) el('fleet-formation').textContent = fleetData.formation.formation || '—';
    if (el('fleet-integrity')) {
      const integrity = Math.round((fleetData.formation.formationIntegrity || 0) * 100);
      el('fleet-integrity').textContent = integrity + '%';
    }
  }

  if (el('fleet-threat')) {
    const threat = fleetData.threatLevel || 0;
    el('fleet-threat').textContent = threat;
    el('fleet-threat').style.color = threat > 70 ? '#e74c3c' : threat > 40 ? '#e67e22' : '#2ecc71';
  }

  if (fleetData.hiveMind && el('fleet-hivemind')) {
    const lastDec = fleetData.hiveMind.lastDecision;
    el('fleet-hivemind').textContent = lastDec ? lastDec.decision : 'ACTIVE';
  }

  if (fleetData.evasion && el('fleet-evasion')) {
    if (fleetData.evasion.evasionActive) {
      el('fleet-evasion').textContent = `EVADING (${fleetData.evasion.reformIn || 0})`;
      el('fleet-evasion').className = 'edge-off';
    } else {
      el('fleet-evasion').textContent = 'CLEAR';
      el('fleet-evasion').className = 'edge-on';
    }
  }

  if (fleetData.mesh && el('fleet-mesh-msgs')) {
    el('fleet-mesh-msgs').textContent = fleetData.mesh.totalMessagesSent || 0;
  }

  if (fleetData.droneResults) {
    updateFleetDroneGrid(fleetData.droneResults);
    updateFleetMap(fleetData.droneResults);
  }

  updateIntelDashboard(fleetData);
}

function updateFleetDroneGrid(droneResults) {
  const grid = document.getElementById('fleet-drone-grid');
  if (!grid) return;

  for (const [droneId, result] of Object.entries(droneResults)) {
    let card = document.getElementById(`fleet-drone-${droneId}`);
    if (!card) {
      card = document.createElement('div');
      card.className = 'layer-card cat-satellite active';
      card.id = `fleet-drone-${droneId}`;
      grid.appendChild(card);
    }

    const status = result.status || 'ACTIVE';
    const statusColor = status === 'EVADING' ? '#e74c3c' : status === 'RETURNING' ? '#e67e22' : '#2ecc71';
    const conf = result.confidence ? result.confidence.score : 0;

    card.className = `layer-card active ${status === 'EVADING' ? 'cat-frontier' : 'cat-satellite'}`;
    card.innerHTML = `
      <div class="layer-id">${droneId}</div>
      <div class="layer-name">${result.callsign || droneId}</div>
      <div class="layer-coords">
        <span class="layer-lat">${result.lat ? result.lat.toFixed(4) : '—'}</span>
        <span class="layer-lon">${result.lon ? result.lon.toFixed(4) : '—'}</span>
      </div>
      <div class="layer-accuracy" style="color:${statusColor}">${status}</div>
      <div class="layer-accuracy">Conf: ${conf}% | Batt: ${result.batteryPercent || 100}%</div>
    `;
  }
}

function updateFleetMap(droneResults) {
  if (!mapInstance) return;

  for (const [droneId, result] of Object.entries(droneResults)) {
    if (!result.lat || !result.lon) continue;

    const isEvading = result.status === 'EVADING';
    const color = isEvading ? '#e74c3c' : '#00e5ff';

    if (!fleetDroneMarkers[droneId]) {
      fleetDroneMarkers[droneId] = L.circleMarker([result.lat, result.lon], {
        radius: 7, color, fillColor: color, fillOpacity: 0.8, weight: 2
      }).addTo(mapInstance);
    }

    fleetDroneMarkers[droneId].setLatLng([result.lat, result.lon]);
    fleetDroneMarkers[droneId].setStyle({ color, fillColor: color });
    fleetDroneMarkers[droneId].bindTooltip(
      `${result.callsign || droneId}<br>${result.lat.toFixed(6)}, ${result.lon.toFixed(6)}<br>` +
      `Status: ${result.status} | Conf: ${result.confidence ? result.confidence.score : 0}%`,
      { direction: 'top' }
    );
  }
}

function updateIntelDashboard(fleetData) {
  const el = (id) => document.getElementById(id);

  if (fleetData && fleetData.cycle && fleetData.cycle % 10 === 0) {
    fetch('/api/report/intelligence')
      .then(r => r.json())
      .then(intel => {
        if (el('intel-bans')) el('intel-bans').textContent = intel.bans ? intel.bans.summary.totalBanEvents : 0;
        if (el('intel-spoofs')) el('intel-spoofs').textContent = intel.spoofs ? intel.spoofs.summary.activeSpoofs : 0;
        if (el('intel-jammers')) el('intel-jammers').textContent = intel.jammers ? intel.jammers.summary.estimatedJammers : 0;
        if (el('intel-timeline-count')) el('intel-timeline-count').textContent = intel.mission ? intel.mission.summary.totalEvents : 0;
        if (el('intel-critical')) el('intel-critical').textContent = intel.mission ? intel.mission.summary.criticalEvents : 0;
        if (el('intel-recording')) {
          el('intel-recording').textContent = intel.mission && intel.mission.recording ? 'REC' : 'OFF';
          el('intel-recording').className = intel.mission && intel.mission.recording ? 'edge-on' : 'edge-off';
        }
      }).catch(() => {});
  }
}

function addIntelLog(message) {
  const log = document.getElementById('intel-timeline-log');
  if (!log) return;
  const now = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'demo-log-entry';
  entry.innerHTML = `<span class="log-time">${now}</span><span class="log-step">${message}</span>`;
  log.insertBefore(entry, log.firstChild);
  while (log.children.length > 50) log.removeChild(log.lastChild);
}

let lastIntelEventId = '';
function addIntelLogEntry(log, evt) {
  if (evt.eventId === lastIntelEventId) return;
  lastIntelEventId = evt.eventId;
  const colors = { CRITICAL: '#e74c3c', HIGH: '#e67e22', MEDIUM: '#f1c40f', LOW: '#2ecc71', INFO: '#1a73e8' };
  const color = colors[evt.severity] || '#fff';
  const time = new Date(evt.timestamp).toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'demo-log-entry';
  entry.innerHTML = `<span class="log-time">${time}</span>` +
    `<span style="color:${color};font-weight:bold">[${evt.type}]</span> ` +
    `<span class="log-step">${evt.message || ''}</span>`;
  log.insertBefore(entry, log.firstChild);
  while (log.children.length > 50) log.removeChild(log.lastChild);
}

// ═══════════════════════════════════════════
// NAVIGATION — Destination + Waypoints
// ═══════════════════════════════════════════
let navWaypoints = [];
let navDestMarker = null;
let navRouteLine = null;
let navWpMarkers = [];

function setupNavigation() {
  const goBtn = document.getElementById('btn-nav-go');
  const addWpBtn = document.getElementById('btn-nav-add-wp');
  const startWpBtn = document.getElementById('btn-nav-start-wp');
  const stopBtn = document.getElementById('btn-nav-stop');
  const clearBtn = document.getElementById('btn-nav-clear');

  if (goBtn) goBtn.addEventListener('click', () => {
    const lat = parseFloat(document.getElementById('nav-dest-lat').value);
    const lon = parseFloat(document.getElementById('nav-dest-lon').value);
    const name = document.getElementById('nav-dest-name').value || undefined;
    const speed = parseFloat(document.getElementById('nav-speed').value) || 50;
    const mode = document.getElementById('nav-mode-select').value;

    if (isNaN(lat) || isNaN(lon)) return alert('Enter valid lat/lon');

    const endpoint = mode === 'fleet' ? '/api/fleet/navigate' : '/api/navigate';
    // Set speed first
    const speedEndpoint = mode === 'fleet' ? '/api/fleet/navigate/speed' : '/api/navigate/speed';
    fetch(speedEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed })
    });
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon, name })
    }).then(r => r.json()).then(d => {
      if (d.navigation) updateNavDisplay(d.navigation);
      showDestinationOnMap(lat, lon, name);
    });
  });

  if (addWpBtn) addWpBtn.addEventListener('click', () => {
    const lat = parseFloat(document.getElementById('nav-dest-lat').value);
    const lon = parseFloat(document.getElementById('nav-dest-lon').value);
    const name = document.getElementById('nav-dest-name').value || `WP-${navWaypoints.length + 1}`;
    if (isNaN(lat) || isNaN(lon)) return alert('Enter valid lat/lon');
    navWaypoints.push({ lat, lon, name });
    renderWaypointList();
    // Clear name field for next waypoint
    document.getElementById('nav-dest-name').value = '';
  });

  if (startWpBtn) startWpBtn.addEventListener('click', () => {
    if (navWaypoints.length === 0) return alert('Add at least one waypoint first');
    const speed = parseFloat(document.getElementById('nav-speed').value) || 50;
    const mode = document.getElementById('nav-mode-select').value;
    const missionType = document.getElementById('nav-mission-select').value;

    const endpoint = mode === 'fleet' ? '/api/fleet/waypoints' : '/api/navigate/waypoints';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints: navWaypoints, missionType, speed })
    }).then(r => r.json()).then(d => {
      if (d.navigation) updateNavDisplay(d.navigation);
      showRouteOnMap(navWaypoints);
    });
  });

  if (stopBtn) stopBtn.addEventListener('click', () => {
    const mode = document.getElementById('nav-mode-select').value;
    const endpoint = mode === 'fleet' ? '/api/fleet/navigate/stop' : '/api/navigate/stop';
    fetch(endpoint, { method: 'POST' }).then(r => r.json()).then(d => {
      if (d.navigation) updateNavDisplay(d.navigation);
    });
  });

  if (clearBtn) clearBtn.addEventListener('click', () => {
    navWaypoints = [];
    renderWaypointList();
    clearRouteFromMap();
  });

  // Click on map to set destination
  setTimeout(() => {
    if (mapInstance) {
      mapInstance.on('click', (e) => {
        document.getElementById('nav-dest-lat').value = e.latlng.lat.toFixed(6);
        document.getElementById('nav-dest-lon').value = e.latlng.lng.toFixed(6);
      });
    }
  }, 2000);
}

function updateNavDisplay(nav) {
  if (!nav) return;
  const el = (id) => document.getElementById(id);

  const statusEl = el('nav-status');
  if (statusEl) {
    statusEl.textContent = nav.status;
    statusEl.className = nav.status === 'NAVIGATING' || nav.status === 'PATROLLING' ? 'edge-on' : 'edge-off';
  }

  if (el('nav-distance')) {
    const d = nav.distanceToTarget || 0;
    el('nav-distance').textContent = d > 1000 ? (d / 1000).toFixed(1) + ' km' : d + ' m';
  }
  if (el('nav-bearing')) el('nav-bearing').textContent = (nav.bearingToTarget || 0) + '\u00B0';
  if (el('nav-eta')) {
    const s = nav.eta || 0;
    if (s > 3600) el('nav-eta').textContent = Math.round(s / 3600) + 'h ' + Math.round((s % 3600) / 60) + 'm';
    else if (s > 60) el('nav-eta').textContent = Math.round(s / 60) + 'm ' + (s % 60) + 's';
    else el('nav-eta').textContent = s + 's';
  }
  if (el('nav-wp-progress')) el('nav-wp-progress').textContent = `${nav.waypointsReached || 0}/${nav.waypointsTotal || 0}`;
  if (el('nav-travelled')) {
    const t = nav.totalDistanceTravelled || 0;
    el('nav-travelled').textContent = t > 1000 ? (t / 1000).toFixed(1) + ' km' : t + ' m';
  }
}

function renderWaypointList() {
  const container = document.getElementById('nav-waypoint-list');
  if (!container) return;
  if (navWaypoints.length === 0) {
    container.innerHTML = '<span style="color:#555">No waypoints added. Enter lat/lon and click ADD AS WAYPOINT.</span>';
    return;
  }
  container.innerHTML = navWaypoints.map((wp, i) =>
    `<span style="color:#1a73e8">[${i + 1}]</span> ${wp.name}: ${wp.lat.toFixed(4)}, ${wp.lon.toFixed(4)} `
  ).join(' → ');
}

function showDestinationOnMap(lat, lon, name) {
  if (!mapInstance) return;
  clearRouteFromMap();

  navDestMarker = L.circleMarker([lat, lon], {
    radius: 10, color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.8, weight: 3
  }).addTo(mapInstance);
  navDestMarker.bindTooltip(`TARGET: ${name || ''} ${lat.toFixed(4)}, ${lon.toFixed(4)}`, { permanent: true, direction: 'top' });
}

function showRouteOnMap(waypoints) {
  if (!mapInstance) return;
  clearRouteFromMap();

  const latlngs = waypoints.map(wp => [wp.lat, wp.lon]);
  navRouteLine = L.polyline(latlngs, { color: '#ff4444', weight: 2, dashArray: '8,8' }).addTo(mapInstance);

  waypoints.forEach((wp, i) => {
    const marker = L.circleMarker([wp.lat, wp.lon], {
      radius: 7, color: '#ff4444', fillColor: '#ff4444', fillOpacity: 0.7, weight: 2
    }).addTo(mapInstance);
    marker.bindTooltip(`WP-${i + 1}: ${wp.name || ''}`, { direction: 'top' });
    navWpMarkers.push(marker);
  });
}

function clearRouteFromMap() {
  if (navDestMarker && mapInstance) { mapInstance.removeLayer(navDestMarker); navDestMarker = null; }
  if (navRouteLine && mapInstance) { mapInstance.removeLayer(navRouteLine); navRouteLine = null; }
  for (const m of navWpMarkers) { if (mapInstance) mapInstance.removeLayer(m); }
  navWpMarkers = [];
}

function updateAlerts(alerts) {
  const list = document.getElementById('alerts-list');

  if (alerts.length === 0) {
    list.innerHTML = '<div class="alert-empty">No alerts — all systems nominal</div>';
    return;
  }

  const empty = list.querySelector('.alert-empty');
  if (empty) empty.remove();

  const existingAlerts = list.querySelectorAll('.alert-item');
  if (existingAlerts.length > 20) {
    list.removeChild(list.lastChild);
  }

  for (const alert of alerts) {
    const div = document.createElement('div');
    div.className = `alert-item ${alert.severity === 'MEDIUM' ? 'medium' : ''}`;
    div.innerHTML = `
      <span class="alert-type">${alert.type}</span> — ${alert.message}
      <span class="alert-action">${alert.action}</span>
    `;
    list.insertBefore(div, list.firstChild);
  }
}
