# UPIE — Development Guide for AI Assistants (Replit Agent / Claude / etc.)

## What This Project Is

UPIE (Universal Positioning Intelligence Engine) is a GPS-redundancy positioning fusion system.
It fuses 48 different positioning methods (GPS, GLONASS, INS, WiFi, star tracking, etc.) using
a "MiroFish Swarm Intelligence" algorithm to maintain accurate position even when GPS is jammed or spoofed.

Patent Pending — AIMCRS — Abheet Prem Manghnani

## Quick Start

```bash
npm install
npm start        # Runs on port 5000
npm test         # 41 tests (1 pre-existing failure: layer count test expects 24, got 48)
```

Default password: `aimcrs2026` (configurable via UPIE_PASSWORD env var)

## Tech Stack

- **Backend**: Node.js + Express.js (port 5000) + WebSocket (ws library)
- **Frontend**: Vanilla HTML/CSS/JS + Leaflet.js maps — NO frameworks
- **Database**: None — in-memory + file-based persistence in `/data`
- **No external APIs** — fully self-contained

## Project Structure

```
server.js                          — Express server, all API endpoints, WebSocket
public/
  index.html                       — Dashboard HTML (single page)
  login.html                       — Login page
  js/dashboard.js                  — Dashboard client JS (WebSocket, map, controls)
  css/dashboard.css                — All styles
src/
  engine/
    fusion-engine.js               — Core fusion engine (orchestrates everything)
    swarm-fusion.js                — MiroFish Swarm Intelligence algorithm
    confidence-scorer.js           — Weighted-mode confidence scoring
  layers/
    layer-base.js                  — Base class for all 48 layers
    01-gps-gnss.js ... 48-*.js     — Individual layer implementations
    create-all-layers.js           — Factory that creates all 48 layers
  platforms/
    platform-profiles.js           — 8 platform configs (fighter, submarine, drone, etc.)
  simulation/
    simulator.js                   — Simulation controller
    movement-sim.js                — Simulated movement patterns
  edge/
    edge-processor.js              — Kalman filter + noise reduction
    noise-reducer.js               — Per-layer Kalman filters
    motion-tracker.js              — Speed/heading/maneuver detection
    onboard-navigator.js           — Independent path tracking
    autonomous-navigator.js        — Self-reliant AI brain (anti-jam/spoof)
  sensors/
    sensor-interface.js            — Real sensor data input API
  learning/
    flight-recorder.js             — Black box recorder
    learning-engine.js             — Learns from recorded flights
test/
  engine.test.js                   — 41 unit tests
.env                               — Environment config
.replit                            — Replit run/deploy config
replit.nix                         — Nix packages (Node.js 20)
```

## Key API Endpoints

### Core
- `POST /api/start` — Start simulation
- `POST /api/stop` — Stop simulation
- `POST /api/tick` — Single fusion cycle
- `GET /api/state` — Current engine state

### Configuration
- `POST /api/platform` — Change platform (body: `{ platform: "fighter" }`)
- `POST /api/scenario` — Change scenario (body: `{ scenario: "gps-jamming" }`)
- `POST /api/fusion-mode` — Switch fusion algorithm (body: `{ mode: "swarm" }`)
- `POST /api/precision-mode` — Set precision level (body: `{ mode: "warfare" }`)
  - Modes: `standard`, `high`, `warfare`, `maximum`

### Device GPS (NEW)
- Browser uses `navigator.geolocation.watchPosition()` to get real device GPS
- `POST /api/sensor/register` — Register device GPS as real sensor
- `POST /api/sensor/feed` — Feed real GPS coordinates to fusion engine
- `POST /api/sensor/disconnect` — Stop feeding, return to simulation
- Dashboard has START TRACKING / FEED TO ENGINE buttons

### Demos
- `GET /api/demos` — List 8 built-in demos
- `POST /api/demo/run` — Run a demo (body: `{ demoId: "gps-denied" }`)

### Learning
- `POST /api/recorder/start` — Start recording flight data
- `POST /api/recorder/stop` — Stop recording + trigger learning
- `GET /api/learning/knowledge` — Get learned knowledge

## WebSocket Protocol

Connect to `ws://host:5000` (with auth cookie). Messages:

```json
{ "type": "fusion", "data": { "lat": ..., "lon": ..., "confidence": {...} }, "layers": [...] }
{ "type": "demo", "demoId": "...", "step": "...", "data": {...} }
{ "type": "init", "data": {...} }
```

## Recent Changes (Latest First)

### Device GPS + Precision Mode + Confidence Improvements
- **Device GPS Tracking**: Dashboard section that uses `navigator.geolocation` to track the
  phone/laptop running the dashboard. Can feed real GPS data into the fusion engine as Layer 1.
  Green marker shows device position on the map.
- **Precision Mode**: 4-level selector (Standard/High/Warfare/Maximum) that tunes swarm
  parameters for different accuracy requirements. Maximum mode runs 50 swarm iterations with
  1.5σ outlier threshold for sub-1m accuracy.
- **Confidence Scoring**: Changed from stepped brackets to continuous exponential decay for
  tightness. Added signal/vision diversity categories. Added GOOD level between HIGH and MODERATE.

## Known Issues

1. Test `createAllLayers returns 24 layers` fails — expects 24, project now has 48 layers. Test needs updating.
2. Device GPS requires HTTPS on mobile browsers (Chrome blocks geolocation on HTTP except localhost).
3. Confidence score in simulation mode typically 60-80% due to simulated noise — this is expected.
   Use Precision Mode "warfare" or "maximum" to push confidence higher.

## How Confidence Score Works (Swarm Mode)

4 factors, max 100 points:
1. **School Size** (0-35 pts): Ratio of fish in school vs total
2. **Tightness** (0-30 pts): Continuous exponential — `30 * exp(-radius/80)`
3. **Diversity** (0-20 pts): 6 categories (satellite, celestial, ground, internal, signal, vision)
4. **Outlier Penalty** (0-15 pts): Fewer outliers = higher score

Levels: MAXIMUM (95+), HIGH (85+), GOOD (70+), MODERATE (55+), LOW (40+), CRITICAL (<40)

## How to Improve Accuracy for Warfare

1. Use Precision Mode "warfare" or "maximum"
2. Feed real sensor data (Device GPS, or other sensors via `/api/sensor/feed`)
3. Record flights and let the learning engine optimize weights
4. More active layers = better diversity score = higher confidence
5. Real sensors eliminate simulation noise which is the main accuracy limiter

## Environment Variables (.env)

```
PORT=5000
SIMULATION_MODE=true
DEFAULT_PLATFORM=fighter
UPIE_PASSWORD=aimcrs2026
SIM_TRUE_LAT=13.0827
SIM_TRUE_LON=80.2707
SIM_TRUE_ALT=15.0
```
