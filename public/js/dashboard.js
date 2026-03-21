/**
 * UPIE Dashboard — Client-side JavaScript
 * Patent Pending — AIMCRS
 *
 * Connects to server via WebSocket for real-time fusion data.
 * Updates dashboard every fusion cycle.
 * HUMAN IN THE LOOP — all data displayed for operator decision.
 */

// ═══════════════════════════════════════════
// LAYER DEFINITIONS — for building the grid
// ═══════════════════════════════════════════
const LAYER_DEFS = [
  { id: 1, name: 'GPS / GNSS' },
  { id: 2, name: 'NAVIC (Indian)' },
  { id: 3, name: 'INS Dead Reckoning' },
  { id: 4, name: 'Star Tracking' },
  { id: 5, name: 'Terrain Matching' },
  { id: 6, name: 'Magnetic Anomaly' },
  { id: 7, name: 'Ground Emitters' },
  { id: 8, name: 'WiFi Mapping' },
  { id: 9, name: 'Cell Tower' },
  { id: 10, name: 'Acoustic (Underwater)' },
  { id: 11, name: 'Barometric Alt' },
  { id: 12, name: 'Doppler Velocity' }
];

// ═══════════════════════════════════════════
// INIT — Build layer grid on page load
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
    card.className = 'layer-card inactive';
    card.id = `layer-${layer.id}`;
    card.innerHTML = `
      <div class="layer-id">${layer.id}</div>
      <div class="layer-name">${layer.name}</div>
      <div class="layer-accuracy" id="layer-acc-${layer.id}">—</div>
      <div class="layer-status-dot grey" id="layer-dot-${layer.id}"></div>
    `;
    // Click to toggle layer
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
}

function toggleLayer(layerId) {
  fetch('/api/layer/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ layerId })
  });
}

// ═══════════════════════════════════════════
// WEBSOCKET — Real-time data from server
// ═══════════════════════════════════════════
let ws = null;

function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'fusion') {
      updateDashboard(msg.data, msg.layers);
    } else if (msg.type === 'init') {
      // Initial state
    }
  });

  ws.addEventListener('close', () => {
    // Reconnect after 2 seconds
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

  // Confidence gauge
  if (data.confidence) {
    updateGauge(data.confidence);
  }

  // Layer statuses
  if (layers) {
    updateLayers(layers);
  }

  // Alerts
  if (data.spoofAlerts && data.spoofAlerts.length > 0) {
    updateAlerts(data.spoofAlerts);
  }
}

function updateGauge(confidence) {
  const score = confidence.score;
  const gauge = document.querySelector('.gauge');
  const gaugeText = document.getElementById('gauge-text');
  const levelEl = document.getElementById('confidence-level');
  const messageEl = document.getElementById('confidence-message');

  // Update gauge visual — conic gradient
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

    // Reset classes
    card.className = 'layer-card';

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

  // Add new alerts at the top — keep last 20
  const existingAlerts = list.querySelectorAll('.alert-item');
  if (existingAlerts.length > 20) {
    list.removeChild(list.lastChild);
  }

  // Remove the "no alerts" message if present
  const empty = list.querySelector('.alert-empty');
  if (empty) empty.remove();

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
