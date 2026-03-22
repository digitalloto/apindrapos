# UPIE — Universal Positioning Intelligence Engine

**Patent Pending — AIMCRS — Abheet Prem Manghnani**

UPIE is a GPS-redundancy positioning fusion system with multi-drone swarm intelligence. It fuses 48 different positioning methods using the MiroFish Swarm Intelligence algorithm to maintain accurate position even when GPS is jammed, spoofed, or denied.

## What Makes UPIE Different

- **48 Positioning Layers** — GPS, GLONASS, Galileo, BeiDou, NAVIC, INS, Star Tracking, WiFi, Cell Towers, Terrain Matching, Quantum Compass, and 37 more
- **MiroFish Swarm Intelligence** — Bio-inspired fusion algorithm where each layer is a "fish" in a school. The school naturally rejects outliers (spoofed/jammed signals) and converges on the true position
- **Multi-Drone Swarm** — N drones flying in formation with collective hive mind AI, mesh communication, and evasion tactics
- **Intelligence Reporting** — Tracks WHY signals are banned, WHERE jammers are, WHERE spoofing signals try to lead drones
- **Human In The Loop** — AI assists, human decides, always

## Quick Start

```bash
npm install
npm start          # Dashboard at http://localhost:5000
```

**Password:** `aimcrs2026` (configurable via `UPIE_PASSWORD` env var)

## Architecture — Modular Layer System

Everything is a pluggable layer. Enable/disable per mission:

```
CORE (always active)
├── 48 Positioning Layers (GPS, GNSS, INS, WiFi, Star Tracking, etc.)
├── MiroFish Swarm Fusion Engine
├── Edge Processor (Kalman filter, noise reduction, spike detection)
├── Confidence Scorer (0-100 with level: MAXIMUM/HIGH/GOOD/MODERATE/LOW/CRITICAL)
└── Precision Mode (Standard/High/Warfare/Maximum)

INTELLIGENCE LAYERS (enable per mission)
├── Ban Intelligence Report — WHY/WHEN/WHERE signals were banned
├── Spoof Tracker — Ghost trails, spoof patterns, estimated spoofer origin
├── Jammer Locator — Triangulate jammer positions from multi-drone data
└── Mission Report — Full audit timeline, exportable for AI training

SWARM LAYERS (enable per mission)
├── Fleet Manager — N drones, each with own UPIE system
├── Formation Controller — V-Shape, Line, Diamond, Grid, Circle
├── Mesh Network — Power-efficient inter-drone communication
├── Swarm Intelligence (Hive Mind) — Collective AI brain
└── Evasion Controller — Random Scatter, Sunburst, Split Pairs, Terrain Hug

SENSOR LAYERS (enable per mission)
├── Device GPS — Browser geolocation (phone/laptop GPS)
└── Sensor Interface — Plug in real hardware sensors via API
```

## The 48 Positioning Layers

### Satellite Systems (10)
| # | Layer | Accuracy | Notes |
|---|-------|----------|-------|
| 1 | GPS / GNSS | 3-5m | Standard US system |
| 2 | NAVIC (India) | 1.5-5m | 1-1.5m in military mode |
| 14 | GLONASS (Russia) | 5-10m | |
| 15 | Galileo (Europe) | 3-5m | |
| 16 | BeiDou (China) | 5-10m | |
| 25 | SBAS (WAAS/EGNOS) | 3-5m | GPS correction |
| 26 | QZSS (Japan) | 2-5m | Regional |
| 27 | RTK GPS | 0.01-0.1m | Centimetre-level |
| 28 | PPP (Precise Point) | 0.1-1m | Decimetre-level |
| 35 | Starlink LEO | 5-20m | LEO constellation |

### Celestial (4)
| # | Layer | Accuracy | Notes |
|---|-------|----------|-------|
| 4 | Star Tracking | 10-50m | Unjammable |
| 13 | Sun/Moon Celestial | 50-500m | |
| 23 | Pulsar XNAV | 10-100m | Unjammable, deep space |
| 46 | Radio Astronomy | 100-1000m | |

### Internal Sensors (6)
| # | Layer | Accuracy | Notes |
|---|-------|----------|-------|
| 3 | INS Dead Reckoning | 5-20m | Gyro + accelerometer |
| 11 | Barometric Altitude | 1-10m | Altitude only |
| 12 | Doppler Velocity | 0.1-1 m/s | Velocity only |
| 19 | Radar Altimetry | 0.5-5m | Altitude only |
| 44 | PDR (Pedestrian) | 1-5m | Walking motion |
| 45 | Wheel Odometry | 1-10m | Vehicle motion |

### Ground/Terrain (7)
| # | Layer | Accuracy | Notes |
|---|-------|----------|-------|
| 5 | Terrain Matching | 1-10m | Up to 100m in desert |
| 6 | Magnetic Anomaly | 50-200m | |
| 7 | Ground Emitters | 10-50m | |
| 10 | Acoustic (Underwater) | 5-50m | |
| 17 | Gravity Gradient | 100-500m | |
| 39 | Seismic / Vibration | 100-1000m | |
| 41 | Ocean Current Map | 100-500m | Maritime |

### Signal/Wireless (12)
| # | Layer | Accuracy | Notes |
|---|-------|----------|-------|
| 8 | WiFi Mapping | 10-30m | |
| 9 | Cell Tower | 100-500m | |
| 18 | RF Fingerprint | 50-200m | |
| 21 | eLoran Radio | 100-200m | |
| 29 | UWB (Ultra-Wideband) | 0.1-0.3m | Short range 100m |
| 30 | BLE Beacon | 1-5m | Short range 30m |
| 33 | 5G NR Positioning | 10-100m | |
| 34 | LoRa/LPWAN | 50-500m | |
| 37 | VLC / Li-Fi | 1-10m | Line-of-sight |
| 38 | Infrared (IR) | 5-50m | Line-of-sight |
| 47 | Geomagnetic Indoor FP | 5-50m | |
| 48 | Atmospheric Pressure | 50-500m | |

### Vision/AI (4)
| # | Layer | Accuracy | Notes |
|---|-------|----------|-------|
| 20 | Visual Odometry | 1-10m | Camera-based |
| 32 | Vision Landmark AI | 1-10m | AI recognition |
| 42 | Satellite Imagery AI | 10-100m | |
| 43 | Shadow Analysis AI | 10-100m | |

### Frontier/Quantum (5)
| # | Layer | Accuracy | Notes |
|---|-------|----------|-------|
| 22 | Cosmic Ray/Muon | 500-5000m | Experimental |
| 24 | Quantum Compass | 50-500m | Experimental |
| 31 | LiDAR SLAM | 0.5-2m | |
| 36 | Ambient Sound FP | 10-100m | |
| 40 | Radar SLAM / SAR | 1-10m | |

## MiroFish Swarm Intelligence — How It Works

Each positioning layer is a "fish" in a school:

1. **Fish are created** — Each layer's reading becomes a fish with a size proportional to its accuracy
2. **School forms** — Fish swim toward each other over 5-50 iterations (depending on precision mode)
3. **Outliers expelled** — Fish too far from the school center are marked as outliers (spoofed/jammed)
4. **Position calculated** — The weighted center of the school = fused position
5. **Confidence scored** — How tight the school is + how many fish agree = confidence score

**Why swarm beats weighted average:**
- Natural outlier rejection — a spoofed GPS signal is just a "lone fish" the school ignores
- Adaptive — no fixed weights, influence is based on real-time agreement
- Robust — removing one layer doesn't break the system

## Precision Modes

| Mode | Iterations | Outlier Threshold | Target | Use Case |
|------|-----------|-------------------|--------|----------|
| Standard | 5 | 3.0σ | 10-50m | General navigation |
| High | 10 | 2.5σ | 5-10m | Troop movement |
| Warfare | 20 | 2.0σ | <5m | Precision strike |
| Maximum | 50 | 1.5σ | <1m | Missile guidance |

## Multi-Drone Swarm System

### Fleet Manager
Each drone gets its own complete UPIE system (48 layers + fusion engine + autonomous navigator). The Fleet Manager orchestrates N drones simultaneously.

```
POST /api/fleet/init      { droneCount: 5, platform: "small-drone", formation: "V_SHAPE" }
POST /api/fleet/start     Start all drones
POST /api/fleet/stop      Stop all drones
GET  /api/fleet/state     All drone positions + statuses
```

### Formation Controller
5 formation types:
- **V_SHAPE** — Leader at front, drones spread behind at 45-degree angles
- **LINE** — Single file, useful for narrow corridors
- **DIAMOND** — Diamond pattern for all-around coverage
- **GRID** — Square grid for area coverage/search
- **CIRCLE** — Circular pattern around a center point

```
POST /api/fleet/formation  { formation: "DIAMOND", spacing: 300 }
```

### Mesh Network
Power-efficient inter-drone communication with priority queuing:

| Priority | Message Type | Size | Content |
|----------|-------------|------|---------|
| 1 (highest) | EVADE | 20 bytes | Emergency scatter command |
| 2 | THREAT | 80 bytes | Jamming/spoofing alert |
| 3 | FORMATION | 30 bytes | Formation change command |
| 4 (lowest) | HEARTBEAT | 40 bytes | Position + confidence |

### Swarm Intelligence (Hive Mind)
The collective AI brain that:
- **Cross-validates** drone positions against each other
- **Detects swarm-level threats** (multiple drones reporting jamming = coordinated attack)
- **Identifies rogue drones** (position inconsistent with swarm = individually spoofed)
- **Makes formation decisions** (maintain, tighten, or scatter)

### Evasion Tactics
When threat level exceeds threshold, the hive mind triggers evasion:

| Pattern | Behaviour | Best Against |
|---------|-----------|-------------|
| RANDOM_SCATTER | Each drone picks random heading + speed burst | General threats (hardest to predict) |
| SUNBURST | All drones scatter outward from center | Jamming (escape jam zone fast) |
| SPLIT_PAIRS | Drones split into pairs going opposite directions | Spoofing (harder to spoof all) |
| TERRAIN_HUG | Drop altitude + random lateral movement | Incoming strikes |

After evasion timer expires, the hive mind:
1. Checks if threat is still active
2. Selects a NEW rally point (not original position — unpredictable)
3. Broadcasts REFORM command
4. Drones converge on new rally point and resume formation

```
POST /api/fleet/evade     { reason: "Incoming missile", pattern: "RANDOM_SCATTER" }
POST /api/fleet/reform    Force reform at new rally point
```

## Intelligence Reporting

### Ban Intelligence Report
When a signal is banned, UPIE records:
- **WHY**: Deviation amount, consecutive failures, reason
- **WHEN**: Timestamp, cycle number
- **WHERE**: Drone position when ban happened
- **Ghost vs Reality**: What the banned signal claimed vs what the school agreed on

```
GET /api/report/bans      Full ban report with all events
```

### Spoof Tracker
Follows where spoofed signals are trying to lead drones:
- **Ghost trail** — Series of positions the spoofer wants the drone to go
- **Spoof vector** — Direction and speed of the ghost drift
- **Pattern detection** — CONSTANT_OFFSET, GRADUAL_DRIFT, SUDDEN_REDIRECT, CONTINUOUS_DRIFT
- **Estimated spoofer origin** — Where the transmitter might be

```
GET /api/report/spoofs    Spoof trails and analysis
```

### Jammer Locator
Uses multi-drone data to estimate jammer positions:
- Single drone: rough estimate (jammer is nearby)
- 2 drones: better estimate (centroid)
- 3+ drones: triangulated position with estimated effective radius

```
GET /api/report/jammers   Estimated jammer positions + jam zones
```

### Mission Report / Audit Trail
Complete timeline of everything:
- Position changes, confidence changes
- Bans, reinstates
- Spoof detections, jamming detections
- Formation changes, evasion triggers, reforms
- Exportable as JSON for AI training

```
GET /api/report/mission     Full mission report
GET /api/report/timeline    Event timeline (filterable by type/severity)
GET /api/report/export      Export for AI training (structured JSON)
```

## Device GPS Tracking

The dashboard can use your phone/laptop's real GPS:
1. Click **START TRACKING** — uses `navigator.geolocation`
2. Your real position appears as a green marker on the map
3. Click **FEED TO ENGINE** — your real GPS replaces the simulated GPS layer
4. The fusion engine uses your actual GPS alongside all other layers

Requires HTTPS on mobile (works on localhost).

## Platform Profiles

8 pre-configured platform types, each with optimized layer selection:

| Platform | Active Layers | Key Layers |
|----------|--------------|------------|
| Fighter Aircraft | 20 | GPS, INS, Star Tracking, Terrain, Radar |
| Small Drone | 9 | GPS, INS, WiFi, Cell Tower, Visual |
| Medium Drone / UAV | 12 | GPS, INS, Terrain, Star Tracking, WiFi |
| Cruise Missile | 11 | GPS, INS, Terrain, Star Tracking, Radar |
| Submarine | 8 | Acoustic, Gravity, INS, Magnetic, Quantum |
| Ground Vehicle | 12 | GPS, INS, WiFi, Cell, Wheel Odometry |
| Underground Bunker | 4 | INS, Magnetic, Seismic, Gravity (no GPS) |
| Spacecraft | 6 | Star Tracking, Pulsar XNAV, Celestial (no GPS) |

## API Reference

### Core (Single Drone)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/start` | Start simulation |
| POST | `/api/stop` | Stop simulation |
| POST | `/api/tick` | Single fusion cycle |
| GET | `/api/state` | Current engine state |
| POST | `/api/platform` | Change platform |
| POST | `/api/scenario` | Change scenario (normal, gps-jamming, gps-spoofing, multi-failure) |
| POST | `/api/fusion-mode` | Switch fusion algorithm (swarm/weighted) |
| POST | `/api/precision-mode` | Set precision level (standard/high/warfare/maximum) |
| POST | `/api/layer/toggle` | Toggle layer on/off |

### Sensor Interface
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sensor/register` | Register real sensor |
| POST | `/api/sensor/feed` | Feed real sensor data |
| POST | `/api/sensor/disconnect` | Disconnect sensor |
| GET | `/api/sensor/status` | Get all sensor statuses |

### Fleet (Multi-Drone)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fleet/init` | Initialize fleet with N drones |
| POST | `/api/fleet/start` | Start fleet simulation |
| POST | `/api/fleet/stop` | Stop fleet simulation |
| GET | `/api/fleet/state` | All drone states |
| POST | `/api/fleet/add-drone` | Add drone to fleet |
| POST | `/api/fleet/remove-drone` | Remove drone from fleet |
| POST | `/api/fleet/formation` | Change formation |
| POST | `/api/fleet/scenario` | Set scenario for all drones |
| POST | `/api/fleet/evade` | Trigger evasion |
| POST | `/api/fleet/reform` | Force reform |
| GET | `/api/fleet/drone/:id/state` | Single drone state |
| GET | `/api/fleet/hivemind` | Hive mind state |
| GET | `/api/fleet/mesh` | Mesh network status |

### Intelligence Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/report/intelligence` | Full intelligence report |
| GET | `/api/report/bans` | Ban events with intelligence |
| GET | `/api/report/spoofs` | Spoof trails and analysis |
| GET | `/api/report/jammers` | Estimated jammer locations |
| GET | `/api/report/timeline` | Event timeline (filterable) |
| GET | `/api/report/mission` | Full mission report |
| GET | `/api/report/export` | Export for AI training |

### Edge Processor & Navigators
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/edge/toggle` | Toggle edge processing |
| GET | `/api/edge/state` | Edge processor state |
| GET | `/api/edge/metrics` | Edge metrics |
| POST | `/api/onboard/lock-origin` | Lock starting coordinates |
| GET | `/api/onboard/position` | Onboard navigator position |
| GET | `/api/autonav/state` | Autonomous navigator state |
| POST | `/api/autonav/force-surface` | Force surface check |

### Learning Engine
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/recorder/start` | Start recording flight data |
| POST | `/api/recorder/stop` | Stop + trigger learning |
| GET | `/api/learning/knowledge` | Learned knowledge summary |
| POST | `/api/learning/apply` | Apply learned weights |

### Demos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/demos` | List 8 built-in demos |
| POST | `/api/demo/run` | Run a demo |
| POST | `/api/demo/stop` | Stop running demo |

## WebSocket Protocol

Connect to `ws://host:5000` with auth cookie. Message types:

```json
// Single drone fusion data
{ "type": "fusion", "data": { ... }, "layers": [ ... ] }

// Multi-drone fleet data
{ "type": "fleet", "data": { "droneResults": {}, "hiveMind": {}, "formation": {}, "evasion": {} } }

// Demo step
{ "type": "demo", "demoId": "...", "step": "..." }

// Initial state on connect
{ "type": "init", "data": { ... }, "fleet": { ... } }
```

## Project Structure

```
server.js                              — Express server, all API endpoints
public/
  index.html                           — Dashboard (single page)
  login.html                           — Login page
  js/dashboard.js                      — Client JS (WebSocket, map, controls)
  css/dashboard.css                    — Styles
src/
  engine/
    fusion-engine.js                   — Core fusion engine
    swarm-fusion.js                    — MiroFish Swarm Intelligence
    confidence-scorer.js               — Confidence scoring
    spoof-detector.js                  — Spoof detection
  layers/
    layer-base.js                      — Base class for all layers
    01-gps-gnss.js ... 48-*.js         — 48 layer implementations
    create-all-layers.js               — Layer factory
  platforms/
    platform-profiles.js               — 8 platform configs
  simulation/
    simulator.js                       — Single-drone simulation
    movement-sim.js                    — Movement patterns
  edge/
    edge-processor.js                  — Kalman + noise reduction
    noise-reducer.js                   — Per-layer Kalman filters
    motion-tracker.js                  — Speed/heading detection
    onboard-navigator.js               — Independent path tracking
    autonomous-navigator.js            — Self-reliant AI brain
  sensors/
    sensor-interface.js                — Real sensor input API
  learning/
    flight-recorder.js                 — Black box recorder
    learning-engine.js                 — Learns from flights
  intelligence/                        — NEW: Intelligence modules
    ban-report.js                      — Ban event tracking + analysis
    spoof-tracker.js                   — Spoof trail recording + patterns
    jammer-locator.js                  — Jammer triangulation
    mission-report.js                  — Full audit trail + export
  swarm/                               — NEW: Multi-drone swarm
    drone-instance.js                  — Single drone wrapper
    fleet-manager.js                   — Orchestrates N drones
    formation-controller.js            — Formation types + slots
    mesh-network.js                    — Inter-drone communication
    swarm-intelligence.js              — Hive mind collective AI
    evasion-controller.js              — Scatter/reform tactics
test/
  engine.test.js                       — Test suite
.env                                   — Environment config
.replit                                — Replit config
```

## Environment Variables

```env
PORT=5000
UPIE_PASSWORD=aimcrs2026
SIMULATION_MODE=true
DEFAULT_PLATFORM=fighter
SIM_TRUE_LAT=13.0827
SIM_TRUE_LON=80.2707
SIM_TRUE_ALT=15.0
```

## How to Deploy on Replit

1. Import the repo into Replit
2. The `.replit` file is pre-configured — just click Run
3. Server starts on port 5000, mapped to port 80
4. Access the dashboard and log in with the password

## How to Add New Layers

All layers follow the same pattern. To add a new positioning method:

1. Create `src/layers/49-your-layer.js` extending `LayerBase`
2. Implement `generateReading(truePosition, conditions)` — return `{ lat, lon, alt, accuracyMetres }`
3. Add it to `src/layers/create-all-layers.js`
4. Add it to `LAYER_DEFS` in `public/js/dashboard.js`
5. The fusion engine automatically picks it up

## How to Train the AI

1. Start a fleet simulation with a scenario (GPS jamming, spoofing, etc.)
2. Run for several minutes
3. Click **EXPORT FOR AI TRAINING** — downloads a structured JSON file
4. The JSON contains: all events, positions, threats, bans, spoofs, with timestamps
5. Use this data to train models for:
   - Predicting jamming before it happens
   - Optimizing layer weights per environment
   - Learning evasion patterns that work best

## License

UNLICENSED — Patent Pending — AIMCRS — All Rights Reserved

## Author

Abheet Prem Manghnani — AIMCRS — Chennai, India

HUMAN IN THE LOOP — AI assists, human decides, always.
