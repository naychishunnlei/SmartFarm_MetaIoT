// Handles all live sensor visuals:
// - Floating HTML labels above objects
// - Zone ground color changes
// - Side panel live stats
// - Click-to-inspect panel

import { getLatestFarmData, getLatestZoneData, onSensorUpdate } from './sensorService.js';
import { toggleDevice } from './apiService.js';

let camera, renderer, scene, objectsRef;
let labelMap = new Map();       // objectId → DOM element
let inspectPanel = null;
let inspectTarget = null;
let zoneMeshMap = new Map();    // zoneId → ground mesh for color changes

// ─── INIT ────────────────────────────────────────────────────────────────────
export function initSensorOverlay(context) {
    camera   = context.camera;
    renderer = context.renderer;
    scene    = context.scene;
    objectsRef = context.objectsRef;

    createInspectPanel();
    createSidePanelSection();

    onSensorUpdate(({ farm, zones }) => {
        updateObjectUserData(farm, zones);
        updateSidePanel(farm, zones);
        updateZoneGroundColors(zones);
    });
}

// ─── UPDATE OBJECT userData FROM LIVE SENSOR DATA ────────────────────────────
function updateObjectUserData(farm, zones) {
    if (!objectsRef) return;

    objectsRef.forEach(obj => {
        const type = obj.userData.type;
        const zoneId = obj.userData.zone_id || obj.userData.zoneId || 1;
        const zoneData = getLatestZoneData(zoneId);

        // Push live values into userData so summarizeZones() picks them up
        if (type === 'tempSensor' && farm) {
            obj.userData.sensorValue = farm.temperature;
            obj.userData.humidityValue = farm.humidity;
        }
        if (type === 'humiditySensor' && farm) {
            obj.userData.sensorValue = farm.humidity;
        }
        if (type === 'moistureSensor' && zoneData) {
            // Convert raw ADC (0-4095) to 0-100%
            const pct = Math.max(0, Math.min(100, 100 - (zoneData.moisture / 4095) * 100));
            obj.userData.sensorValue = pct;
        }

        // Fan & light actuator state — skip if user has manually overridden
        if (type === 'fan' && farm) {
            obj.userData.isRunning = farm.fanOn;
        }
        if ((type === 'waterPump' || type === 'sprinkler') && zoneData) {
            const pct = Math.max(0, Math.min(100, 100 - (zoneData.moisture / 4095) * 100));
            if (obj.userData.manualOverride === 'on') {
                // Auto-clear override when moisture recovers (pump did its job)
                if (pct >= 50) {
                    obj.userData.manualOverride = false;
                    obj.userData.isRunning = zoneData.pumpOn;
                }
            } else if (obj.userData.manualOverride === 'off') {
                // Auto-clear override when moisture drops low (auto takes over again)
                if (pct <= 30) {
                    obj.userData.manualOverride = false;
                    obj.userData.isRunning = zoneData.pumpOn;
                }
            } else {
                obj.userData.isRunning = zoneData.pumpOn;
            }
        }
    });

    // Drive the static street light from ESP32 signal
    if (farm && window._setStaticLightFromSensor) {
        window._setStaticLightFromSensor(farm.lightOn);
    }

    // Tell dashboard to re-render
    if (window.updateFarmDashboard) window.updateFarmDashboard();
}

// ─── FLOATING LABELS (called every frame from animate loop) ──────────────────
export function updateFloatingLabels() {
    if (!camera || !renderer || !objectsRef) return;

    const canvas   = renderer.domElement;
    const container = document.getElementById('farm-container');
    if (!container) return;

    const seen = new Set();

    objectsRef.forEach(obj => {
        const type = obj.userData.type;
        const id   = obj.userData.id || obj.uuid;

        // Only show labels on IoT sensors/actuators
        const showTypes = ['moistureSensor','tempSensor','humiditySensor','waterPump','fan','sprinkler','streetLight'];
        if (!showTypes.includes(type)) return;

        seen.add(id);

        // Create label DOM element if it doesn't exist
        if (!labelMap.has(id)) {
            const el = document.createElement('div');
            el.className = 'sensor-float-label';
            el.dataset.id = id;
            container.appendChild(el);
            labelMap.set(id, el);
        }

        const el = labelMap.get(id);

        // Project 3D position to screen
        const worldPos = new THREE.Vector3();
        obj.getWorldPosition(worldPos);
        worldPos.y += 1.2; // float above the object

        const projected = worldPos.clone().project(camera);
        const x = (projected.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (-projected.y * 0.5 + 0.5) * canvas.clientHeight;

        // Hide if behind camera
        if (projected.z > 1) {
            el.style.display = 'none';
            return;
        }

        el.style.display = 'block';
        el.style.left = `${x}px`;
        el.style.top  = `${y}px`;

        // Build label text
        el.innerHTML = buildLabelHTML(obj);

        // Make pump and light labels clickable
        if (type === 'waterPump' || type === 'sprinkler') {
            el.style.pointerEvents = 'auto';
            el.style.cursor = 'pointer';
            el.onclick = () => {
                const zoneId = obj.userData.zoneId || obj.userData.zone_id;
                window._toggleZonePump(zoneId, !obj.userData.isRunning);
            };
        } else if (type === 'streetLight') {
            el.style.pointerEvents = 'auto';
            el.style.cursor = 'pointer';
            el.onclick = () => window._manualToggleStaticLight(!(window._currentStaticLightState));
        } else {
            el.style.pointerEvents = 'none';
            el.onclick = null;
        }
    });

    // Remove labels for objects no longer in scene
    labelMap.forEach((el, id) => {
        if (!seen.has(id)) {
            el.remove();
            labelMap.delete(id);
        }
    });
}

function buildLabelHTML(obj) {
    const type  = obj.userData.type;
    const zoneId = obj.userData.zone_id || obj.userData.zoneId || 1;
    const farm  = getLatestFarmData();
    const zone  = getLatestZoneData(zoneId);

    switch (type) {
        case 'tempSensor':
            return farm
                ? `<span class="label-icon">🌡️</span><span>${farm.temperature?.toFixed(1)}°C</span>`
                : `<span class="label-icon">🌡️</span><span>--</span>`;

        case 'humiditySensor':
            return farm
                ? `<span class="label-icon">💦</span><span>${farm.humidity?.toFixed(0)}%</span>`
                : `<span class="label-icon">💦</span><span>--</span>`;

        case 'moistureSensor': {
            if (!zone) return `<span class="label-icon">💧</span><span>--</span>`;
            const pct = Math.max(0, Math.min(100, 100 - (zone.moisture / 4095) * 100));
            const color = pct < 30 ? '#ff4444' : pct < 50 ? '#ffaa00' : '#44ff88';
            return `<span class="label-icon">💧</span><span style="color:${color}">${pct.toFixed(0)}%</span>`;
        }

        case 'waterPump':
        case 'sprinkler': {
            const on = obj.userData.isRunning;
            return `<span class="label-icon">⛽</span><span style="color:${on ? '#44ff88' : '#aaaaaa'}">${on ? 'ON' : 'OFF'}</span><span style="margin-left:4px;font-size:9px;opacity:0.7">${obj.userData.manualOverride ? '🔧' : ''}</span>`;
        }

        case 'fan': {
            const on = farm?.fanOn;
            return `<span class="label-icon">🌀</span><span style="color:${on ? '#44ff88' : '#aaaaaa'}">${on ? 'ON' : 'OFF'}</span>`;
        }

        case 'streetLight': {
            const on = window._currentStaticLightState ?? farm?.lightOn;
            return `<span class="label-icon">💡</span><span style="color:${on ? '#ffee44' : '#aaaaaa'}">${on ? 'ON' : 'OFF'}</span><span style="margin-left:4px;font-size:9px;opacity:0.7">${window._staticLightManualOverride ? '🔧' : ''}</span>`;
        }

        default:
            return '';
    }
}

// ─── ZONE GROUND COLOR ───────────────────────────────────────────────────────
export function registerZoneMesh(zoneId, mesh) {
    zoneMeshMap.set(zoneId, mesh);
}

function updateZoneGroundColors(zones) {
    Object.entries(zones).forEach(([zoneId, data]) => {
        const mesh = zoneMeshMap.get(parseInt(zoneId));
        if (!mesh) return;

        const pct = Math.max(0, Math.min(100, 100 - (data.moisture / 4095) * 100));
        if (pct < 30) {
            mesh.material.color.setHex(0xc8a26a); // dry brown
        } else if (pct < 50) {
            mesh.material.color.setHex(0x8fbc8f); // medium green
        } else {
            mesh.material.color.setHex(0x4a7c4e); // healthy dark green
        }
    });
}

// ─── SIDE PANEL LIVE STATS ───────────────────────────────────────────────────
let _lastFarm = null;
let _lastZones = {};

function createSidePanelSection() {
    const dashboard = document.getElementById('zone-dashboard-scroll') || document.getElementById('zone-dashboard');
    if (!dashboard) return;

    const section = document.createElement('div');
    section.id = 'live-sensor-panel';
    section.innerHTML = `
        <div class="zone-dashboard-header" style="margin-top:16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top:12px;">
            <div class="zone-dashboard-kicker">ESP32 Live</div>
            <h2>Farm Sensors</h2>
        </div>
        <div id="live-farm-stats" style="padding: 8px 0;"></div>
        <div id="live-zone-stats"></div>
    `;
    dashboard.appendChild(section);

    // Expose refresh so farm-core window helpers can call it
    window._refreshSidePanel = () => updateSidePanel(_lastFarm, _lastZones);
}

function ctrlBtn(label, onclick, color = '#444') {
    return `<button onclick="${onclick}" style="font-size:11px; padding:3px 8px; border:none; border-radius:4px; background:${color}; color:white; cursor:pointer; margin-left:6px;">${label}</button>`;
}

function updateSidePanel(farm, zones) {
    _lastFarm = farm ?? _lastFarm;
    _lastZones = zones ?? _lastZones;

    const farmStatsEl = document.getElementById('live-farm-stats');
    if (farmStatsEl && _lastFarm) {
        const f = _lastFarm;
        const lightOn = window._currentStaticLightState ?? f.lightOn;
        const isManualLight = !!window._staticLightManualOverride;

        farmStatsEl.innerHTML = `
            <div class="zone-stats" style="margin-bottom:8px;">
                <div class="zone-stat"><span class="zone-stat-label">Temp</span><span class="zone-stat-value">${f.temperature?.toFixed(1)}°C</span></div>
                <div class="zone-stat"><span class="zone-stat-label">Humidity</span><span class="zone-stat-value">${f.humidity?.toFixed(0)}%</span></div>
                <div class="zone-stat"><span class="zone-stat-label">Fan</span><span class="zone-stat-value">${f.fanOn ? '🟢 ON' : '⚫ OFF'}</span></div>
                <div class="zone-stat" style="grid-column: span 2; display:flex; align-items:center; justify-content:space-between;">
                    <div>
                        <span class="zone-stat-label">Light${isManualLight ? ' 🔧' : ''}</span>
                        <span class="zone-stat-value" style="margin-top:4px;">${lightOn ? '🟡 ON' : '⚫ OFF'}</span>
                    </div>
                    <div style="display:flex; gap:6px;">
                        ${ctrlBtn(lightOn ? 'Turn OFF' : 'Turn ON', `window._manualToggleStaticLight(${!lightOn})`, lightOn ? '#cc4444' : '#44bb66')}
                        ${isManualLight ? ctrlBtn('Auto', `window._resumeAutoStaticLight()`, '#555') : ''}
                    </div>
                </div>
            </div>
        `;
    }

    const zoneContainer = document.getElementById('live-zone-stats');
    if (!zoneContainer) return;

    zoneContainer.innerHTML = Object.entries(_lastZones).map(([zoneId, data]) => {
        const pct = Math.max(0, Math.min(100, 100 - (data.moisture / 4095) * 100));
        const color = pct < 30 ? '#ff4444' : pct < 50 ? '#ffaa00' : '#44ff88';
        const pump = findPumpForZone(parseInt(zoneId));
        const pumpOn = pump ? pump.userData.isRunning : data.pumpOn;
        const isManualPump = pump?.userData?.manualOverride;
        return `
            <div class="zone-card" style="margin-top:8px;">
                <div class="zone-card-header">
                    <div class="zone-card-title">Zone ${zoneId}</div>
                </div>
                <div class="zone-stats">
                    <div class="zone-stat">
                        <span class="zone-stat-label">Moisture</span>
                        <span class="zone-stat-value" style="color:${color}">${pct.toFixed(0)}%</span>
                    </div>
                    <div class="zone-stat" style="grid-column: span 2; display:flex; align-items:center; justify-content:space-between;">
                        <div>
                            <span class="zone-stat-label">Pump${isManualPump ? ' 🔧' : ''}</span>
                            <span class="zone-stat-value" style="margin-top:4px;">${pumpOn ? '🟢 ON' : '⚫ OFF'}</span>
                        </div>
                        <div style="display:flex; gap:6px;">
                            ${pump ? ctrlBtn(pumpOn ? 'Turn OFF' : 'Turn ON', `window._toggleZonePump(${zoneId},${!pumpOn})`, pumpOn ? '#cc4444' : '#44bb66') : ''}
                            ${isManualPump ? ctrlBtn('Auto', `window._resumeZonePump(${zoneId})`, '#555') : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function findPumpForZone(zoneId) {
    if (!objectsRef) return null;
    return objectsRef.find(o =>
        (o.userData.type === 'waterPump' || o.userData.type === 'sprinkler') &&
        (o.userData.zoneId === zoneId || o.userData.zone_id === zoneId)
    ) || null;
}

// Zone pump toggle (manual override)
window._toggleZonePump = async function(zoneId, newState) {
    const pump = findPumpForZone(parseInt(zoneId));
    if (!pump) return;
    const farmId = localStorage.getItem('selectedFarmId');
    const objectId = pump.userData.id;
    if (!farmId || !objectId) return;
    try {
        await toggleDevice(farmId, objectId, newState);
        pump.userData.isRunning = newState;
        pump.userData.manualOverride = newState ? 'on' : 'off';
        window._refreshSidePanel?.();
    } catch(e) {
        console.error('[Zone Pump] Toggle failed:', e);
    }
};

window._resumeZonePump = function(zoneId) {
    const pump = findPumpForZone(parseInt(zoneId));
    if (pump) {
        pump.userData.manualOverride = false;
        window._refreshSidePanel?.();
    }
};

// ─── CLICK TO INSPECT ────────────────────────────────────────────────────────
export function handleSensorClick(object) {
    const type = object?.userData?.type;
    if (!type) return;

    const showTypes = ['moistureSensor','tempSensor','humiditySensor','waterPump','fan','sprinkler','streetLight'];
    if (!showTypes.includes(type)) return;

    inspectTarget = object;
    showInspectPanel(object);
}

// ─── MANUAL OVERRIDE HELPERS ─────────────────────────────────────────────────
function overrideBtn(newState) {
    const label = newState ? 'Turn ON' : 'Turn OFF';
    const color = newState ? '#44bb66' : '#cc4444';
    return `<button onclick="window._farmToggleDevice(${newState})"
        style="margin-top:8px; width:100%; background:${color}; border:none; color:white;
        padding:7px; border-radius:6px; cursor:pointer; font-weight:bold;">
        🔧 ${label} (Manual)
    </button>`;
}

// Exposed to window so inline onclick works
window._farmToggleDevice = async function(newState) {
    if (!inspectTarget) return;
    const farmId = localStorage.getItem('selectedFarmId');
    const objectId = inspectTarget.userData.id;
    if (!farmId || !objectId) return;
    try {
        await toggleDevice(farmId, objectId, newState);
        inspectTarget.userData.isRunning = newState;
        inspectTarget.userData.manualOverride = true;
        showInspectPanel(inspectTarget);
    } catch(e) {
        console.error('[Override] Toggle failed:', e);
    }
};

window._clearOverride = function() {
    if (!inspectTarget) return;
    inspectTarget.userData.manualOverride = false;
    showInspectPanel(inspectTarget);
};

function createInspectPanel() {
    inspectPanel = document.createElement('div');
    inspectPanel.id = 'sensor-inspect-panel';
    inspectPanel.style.cssText = `
        display: none;
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: rgba(20, 30, 20, 0.92);
        border: 1px solid rgba(100, 200, 100, 0.3);
        border-radius: 12px;
        padding: 16px;
        min-width: 220px;
        color: white;
        font-family: 'Roboto Mono', monospace;
        font-size: 13px;
        z-index: 1000;
        backdrop-filter: blur(8px);
    `;
    document.getElementById('farm-container')?.appendChild(inspectPanel);
}

function showInspectPanel(obj) {
    if (!inspectPanel) return;

    const type   = obj.userData.type;
    const zoneId = obj.userData.zone_id || obj.userData.zoneId || 1;
    const farm   = getLatestFarmData();
    const zone   = getLatestZoneData(zoneId);

    let content = `<div style="font-weight:bold; margin-bottom:10px; color:#88ff88">${getLabel(type)}</div>`;
    content += `<div style="color:#aaa; margin-bottom:8px; font-size:11px">Zone ${zoneId}</div>`;

    switch (type) {
        case 'tempSensor':
            content += row('Temperature', farm ? `${farm.temperature?.toFixed(1)}°C` : '--');
            content += row('Humidity',    farm ? `${farm.humidity?.toFixed(0)}%`      : '--');
            break;
        case 'humiditySensor':
            content += row('Humidity', farm ? `${farm.humidity?.toFixed(0)}%` : '--');
            break;
        case 'moistureSensor': {
            const pct = zone ? Math.max(0, Math.min(100, 100 - (zone.moisture / 4095) * 100)).toFixed(0) : '--';
            const raw = zone ? zone.moisture : '--';
            content += row('Moisture', `${pct}%`);
            content += row('Raw ADC',  raw);
            break;
        }
        case 'fan':
            content += row('Status', farm?.fanOn ? '🟢 Running' : '⚫ Off');
            content += row('Trigger', farm?.temperature > 24 ? 'Temp > 24°C' : 'Normal');
            break;
        case 'waterPump':
        case 'sprinkler': {
            const pct = zone ? Math.max(0, Math.min(100, 100 - (zone.moisture / 4095) * 100)).toFixed(0) : '--';
            const isOn = obj.userData.isRunning;
            content += row('Status', isOn ? '🟢 Running' : '⚫ Off');
            content += row('Moisture', `${pct}%`);
            if (obj.userData.manualOverride) content += row('Mode', '🔧 Manual Override');
            content += overrideBtn(!isOn);
            if (obj.userData.manualOverride) {
                content += `<button onclick="window._clearOverride()" style="margin-top:4px; width:100%; background:rgba(255,255,255,0.07); border:none; color:#aaa; padding:5px; border-radius:6px; cursor:pointer; font-size:11px;">↩ Resume Auto</button>`;
            }
            break;
        }
        case 'streetLight': {
            const isOn = obj.userData.isRunning;
            content += row('Status', isOn ? '🟡 ON' : '⚫ OFF');
            if (obj.userData.manualOverride) content += row('Mode', '🔧 Manual Override');
            else content += row('Control', 'Auto (ESP32)');
            content += overrideBtn(!isOn);
            if (obj.userData.manualOverride) {
                content += `<button onclick="window._clearOverride()" style="margin-top:4px; width:100%; background:rgba(255,255,255,0.07); border:none; color:#aaa; padding:5px; border-radius:6px; cursor:pointer; font-size:11px;">↩ Resume Auto</button>`;
            }
            break;
        }
    }

    content += `<button onclick="document.getElementById('sensor-inspect-panel').style.display='none'"
        style="margin-top:12px; width:100%; background:rgba(255,255,255,0.1);
        border:none; color:white; padding:6px; border-radius:6px; cursor:pointer;">
        Close
    </button>`;

    inspectPanel.innerHTML = content;
    inspectPanel.style.display = 'block';
}

function row(label, value) {
    return `
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span style="color:#aaa">${label}</span>
            <span style="color:#fff; font-weight:bold">${value}</span>
        </div>
    `;
}

function getLabel(type) {
    const labels = {
        tempSensor: '🌡️ Temperature Sensor',
        humiditySensor: '💦 Humidity Sensor',
        moistureSensor: '💧 Moisture Sensor',
        waterPump: '⛽ Water Pump',
        sprinkler: '🚿 Sprinkler',
        fan: '🌀 Fan',
        streetLight: '💡 Street Light',
    };
    return labels[type] || type;
}