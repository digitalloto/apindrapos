/**
 * UPIE Dashboard — 24 Layers — MiroFish Swarm — Client JavaScript
 * Patent Pending — AIMCRS
 *
 * Connects to server via WebSocket for real-time fusion data.
 * HUMAN IN THE LOOP — all data displayed for operator decision.
 */

// ═══════════════════════════════════════════
// ALL 24 LAYER DEFINITIONS — with categories
// ═══════════════════════════════════════════
const LAYER_DEFS = [
  // Row 1: Satellite systems
  { id: 1,  name: 'GPS / GNSS',        cat: 'satellite' },
  { id: 2,  name: 'NAVIC (India)',      cat: 'satellite' },
  { id: 14, name: 'GLONASS (Russia)',   cat: 'satellite' },
  { id: 15, name: 'Galileo (Europe)',   cat: 'satellite' },
  { id: 16, name: 'BeiDou (China)',     cat: 'satellite' },
  { id: 4,  name: 'Star Tracking',     cat: 'celestial' },
  // Row 2: Celestial + Internal
  { id: 13, name: 'Sun/Moon Celestial', cat: 'celestial' },
  { id: 23, name: 'Pulsar XNAV',       cat: 'celestial' },
  { id: 3,  name: 'INS Dead Reckoning', cat: 'internal' },
  { id: 12, name: 'Doppler Velocity',  cat: 'internal' },
  { id: 24, name: 'Quantum Compass',   cat: 'frontier' },
  { id: 20, name: 'Visual Odometry',   cat: 'ground' },
  // Row 3: Ground + Terrain
  { id: 5,  name: 'Terrain Matching',  cat: 'ground' },
  { id: 6,  name: 'Magnetic Anomaly',  cat: 'ground' },
  { id: 7,  name: 'Ground Emitters',   cat: 'ground' },
  { id: 17, name: 'Gravity Gradient',  cat: 'ground' },
  { id: 10, name: 'Acoustic (Water)',  cat: 'ground' },
  { id: 22, name: 'Cosmic Ray/Muon',   cat: 'frontier' },
  // Row 4: Signal + Altitude
  { id: 8,  name: 'WiFi Mapping',      cat: 'signal' },
  { id: 9,  name: 'Cell Tower',        cat: 'signal' },
  { id: 18, name: 'RF Fingerprint',    cat: 'signal' },
  { id: 21, name: 'eLoran Radio',      cat: 'signal' },
  { id: 11, name: 'Barometric Alt',    cat: 'internal' },
  { id: 19, name: 'Radar Altimetry',   cat: 'internal' }
];

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  buildLayerGrid();
  setupControls();
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
      <div class="layer-accuracy" id="layer-acc-${layer.id}">—</div>
      <div class="layer-status-dot grey" id="layer-dot-${layer.id}"></div>
    `;
    card.addEventListener('click', () => toggleLayer(layer.id));
    grid.appendChild(card);
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

  // Layers
  if (layers) {
    updateLayers(layers);
  }

  // Alerts
  if (data.spoofAlerts && data.spoofAlerts.length > 0) {
    updateAlerts(data.spoofAlerts);
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

function updateLayers(layers) {
  for (const layer of layers) {
    const card = document.getElementById(`layer-${layer.id}`);
    const dot = document.getElementById(`layer-dot-${layer.id}`);
    const acc = document.getElementById(`layer-acc-${layer.id}`);
    if (!card) continue;

    // Get category from LAYER_DEFS
    const def = LAYER_DEFS.find(d => d.id === layer.id);
    const catClass = def ? `cat-${def.cat}` : '';

    card.className = `layer-card ${catClass}`;

    if (!layer.active) {
      card.classList.add('inactive');
      dot.className = 'layer-status-dot grey';
      acc.textContent = 'OFF';
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
