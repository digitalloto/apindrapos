# UPIE — Development Guide for AI Assistants (Replit Agent / Claude / etc.)

## What This Project Is

UPIE (Universal Positioning Intelligence Engine) is a GPS-redundancy positioning fusion system
with multi-drone swarm intelligence. It fuses 48 positioning methods using MiroFish Swarm
Intelligence to maintain accurate position even when GPS is jammed or spoofed. Supports
multi-drone fleets with formation flying, mesh communication, hive mind AI, and evasion tactics.

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
server.js                              — Express server, all API endpoints, WebSocket
public/
  index.html                           — Dashboard HTML (single page)
  login.html                           — Login page
  js/dashboard.js                      — Client JS (WebSocket, map, controls, fleet UI)
  css/dashboard.css                    — Styles
src/
  engine/
    fusion-engine.js                   — Core fusion engine (orchestrates everything)
    swarm-fusion.js                    — MiroFish Swarm Intelligence algorithm
    confidence-scorer.js               — Weighted-mode confidence scoring
    spoof-detector.js                  — Spoof detection (500m+ deviations, 1000m+ jumps)
  layers/
    layer-base.js                      — Base class for all 48 layers
    01-gps-gnss.js ... 48-*.js         — Individual layer implementations
    create-all-layers.js               — Factory that creates all 48 layers
  platforms/
    platform-profiles.js               — 8 platform configs (fighter, submarine, drone, etc.)
  simulation/
    simulator.js                       — Single-drone simulation controller
    movement-sim.js                    — Simulated movement patterns
  edge/
    edge-processor.js                  — Kalman filter + noise reduction
    noise-reducer.js                   — Per-layer Kalman filters
    motion-tracker.js                  — Speed/heading/maneuver detection
    onboard-navigator.js               — Independent path tracking
    autonomous-navigator.js            — Self-reliant AI brain (anti-jam/spoof)
  sensors/
    sensor-interface.js                — Real sensor data input API
  learning/
    flight-recorder.js                 — Black box recorder (JSONL per cycle)
    learning-engine.js                 — Learns from recorded flights
  intelligence/                        — Intelligence reporting modules
    ban-report.js                      — Ban event tracking + analysis (WHY/WHEN/WHERE)
    spoof-tracker.js                   — Ghost trail recording + pattern detection
    jammer-locator.js                  — Jammer triangulation from multi-drone data
    mission-report.js                  — Full audit trail + timeline + AI training export
  swarm/                               — Multi-drone swarm system
    drone-instance.js                  — Single drone wrapper (own Simulator + Engine)
    fleet-manager.js                   — Orchestrates N drones, coordinates all systems
    formation-controller.js            — V_SHAPE, LINE, DIAMOND, GRID, CIRCLE formations
    mesh-network.js                    — Power-efficient inter-drone communication
    swarm-intelligence.js              — Hive mind collective AI brain
    evasion-controller.js              — RANDOM_SCATTER, SUNBURST, SPLIT_PAIRS, TERRAIN_HUG
    navigation-controller.js           — Destination + waypoint navigation (ONE_WAY, PATROL, RETURN)
test/
  engine.test.js                       — 41 unit tests
.env                                   — Environment config
.replit                                — Replit run/deploy config
replit.nix                             — Nix packages (Node.js 20)
README.md                              — Full documentation
```

## Key API Endpoints

### Core (Single Drone)
- `POST /api/start` — Start simulation
- `POST /api/stop` — Stop simulation
- `POST /api/tick` — Single fusion cycle
- `GET /api/state` — Current engine state
- `POST /api/platform` — Change platform
- `POST /api/scenario` — Change scenario
- `POST /api/fusion-mode` — Switch fusion algorithm (swarm/weighted)
- `POST /api/precision-mode` — Set precision (standard/high/warfare/maximum)

### Fleet (Multi-Drone)
- `POST /api/fleet/init` — Initialize fleet: `{ droneCount: 5, platform, formation, spacing }`
- `POST /api/fleet/start` / `POST /api/fleet/stop` — Start/stop fleet
- `GET /api/fleet/state` — All drone positions + statuses
- `POST /api/fleet/add-drone` / `POST /api/fleet/remove-drone` — Manage drones
- `POST /api/fleet/formation` — Change formation: `{ formation: "DIAMOND", spacing: 300 }`
- `POST /api/fleet/scenario` — Set scenario for all drones
- `POST /api/fleet/evade` — Trigger evasion: `{ reason, pattern }`
- `POST /api/fleet/reform` — Force reform at new rally point
- `GET /api/fleet/drone/:id/state` — Single drone state
- `GET /api/fleet/hivemind` — Hive mind state
- `GET /api/fleet/mesh` — Mesh network status

### Intelligence Reports
- `GET /api/report/intelligence` — Full report (bans + spoofs + jammers + mission)
- `GET /api/report/bans` — Ban events with WHY/WHEN/WHERE
- `GET /api/report/spoofs` — Spoof trails, ghost positions, patterns
- `GET /api/report/jammers` — Estimated jammer locations + jam zones
- `GET /api/report/timeline` — Event timeline (filterable: `?type=SPOOF_DETECTED&severity=HIGH`)
- `GET /api/report/mission` — Full mission report
- `GET /api/report/export` — Export for AI training (structured JSON)

### Navigation (Single Drone)
- `POST /api/navigate` — Set destination: `{ lat, lon, name }`
- `POST /api/navigate/waypoints` — Set waypoints: `{ waypoints: [{lat,lon,name}], missionType, speed }`
- `GET /api/navigate/status` — Navigation status + ETA + distance + bearing
- `POST /api/navigate/stop` — Cancel navigation
- `POST /api/navigate/speed` — Set speed: `{ speed: 100 }`

### Fleet Navigation
- `POST /api/fleet/navigate` — Set fleet destination (leader navigates, followers hold formation)
- `POST /api/fleet/waypoints` — Set fleet waypoint route
- `GET /api/fleet/navigate/status` — Fleet navigation status
- `POST /api/fleet/navigate/stop` — Cancel fleet navigation
- `POST /api/fleet/navigate/speed` — Set fleet speed

### Sensors
- `POST /api/sensor/register` — Register real sensor
- `POST /api/sensor/feed` — Feed real sensor data
- `POST /api/sensor/disconnect` — Disconnect sensor

### Learning
- `POST /api/recorder/start` — Start recording
- `POST /api/recorder/stop` — Stop + learn
- `GET /api/learning/knowledge` — Learned knowledge
- `POST /api/learning/apply` — Apply learned weights

## WebSocket Protocol

Connect to `ws://host:5000` (with auth cookie):

```json
{ "type": "fusion", "data": { ... }, "layers": [ ... ] }
{ "type": "fleet", "data": { "droneResults": {}, "hiveMind": {}, "formation": {}, "evasion": {} } }
{ "type": "demo", "demoId": "...", "step": "..." }
{ "type": "init", "data": { ... }, "fleet": { ... } }
```

## Recent Changes (Latest First)

### Multi-Drone Swarm + Intelligence Reporting
- **Fleet Manager**: N drones, each with own UPIE system, coordinated by fleet manager
- **Formation Controller**: 5 formation types (V_SHAPE, LINE, DIAMOND, GRID, CIRCLE)
- **Mesh Network**: Power-efficient inter-drone comms with priority queue (EVADE > THREAT > FORMATION > HEARTBEAT)
- **Swarm Intelligence (Hive Mind)**: Cross-validates positions, detects swarm-level threats, makes evasion decisions
- **Evasion Controller**: 4 scatter patterns, auto-reform at random rally points
- **Ban Intelligence Report**: WHY/WHEN/WHERE signals banned, ghost vs real position
- **Spoof Tracker**: Ghost trails, pattern detection (CONSTANT_OFFSET, GRADUAL_DRIFT, SUDDEN_REDIRECT)
- **Jammer Locator**: Triangulates jammer positions from multi-drone data, estimates effective radius
- **Mission Report**: Full audit trail, event timeline, exportable for AI training
- **Dashboard**: Fleet control panel, drone grid, intelligence reports panel, timeline viewer

### Device GPS + Precision Mode + Confidence Improvements
- Device GPS tracking via `navigator.geolocation`
- Precision Mode (Standard/High/Warfare/Maximum)
- Continuous exponential confidence scoring

## Known Issues

1. Test `createAllLayers returns 24 layers` fails — expects 24, got 48. Test needs updating.
2. Device GPS requires HTTPS on mobile (works on localhost).
3. Confidence 60-80% in simulation is expected — use Precision Mode warfare/maximum to push higher.

## Key Architecture Notes for Modifying Code

- **Modular layers**: Each intelligence/swarm module can be enabled/disabled independently
- **FleetManager** wraps everything: it creates DroneInstance objects, each containing their own Simulator
- **Single-drone mode** still works — the original single-drone APIs are unchanged
- **All data structures** are plain JS objects — no database, no ORM
- **Intelligence modules** are stateful — call `.reset()` to clear between missions
- **Evasion** auto-triggers when hive mind threat level > 70 — configurable via `swarmIntelligence.evasionThreatThreshold`
- **Formation slots** are automatically reassigned when drones are added/removed

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
