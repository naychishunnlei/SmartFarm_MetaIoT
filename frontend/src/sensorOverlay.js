// Handles all live sensor visuals:
// - Floating HTML labels above objects
// - Zone ground color changes
// - Side panel live stats
// - Click-to-inspect panel

import { getLatestFarmData, getLatestZoneData, onSensorUpdate } from './sensorService.js';

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
        }
        if (type === 'humiditySensor' && farm) {
            obj.userData.sensorValue = farm.humidity;
        }
        if (type === 'moistureSensor' && zoneData) {
            // Convert raw ADC (0-4095) to 0-100%
            const pct = Math.max(0, Math.min(100, 100 - (zoneData.moisture / 4095) * 100));
            obj.userData.sensorValue = pct;
        }

        // Fan & light actuator state
        if (type === 'fan' && farm) {
            obj.userData.isRunning = farm.fanOn;
        }
        if (type === 'streetLight' && farm) {
            obj.userData.isRunning = farm.lightOn;
        }
        if ((type === 'waterPump' || type === 'sprinkler') && zoneData) {
            obj.userData.isRunning = zoneData.pumpOn;
        }
    });

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
            const on = zone?.pumpOn;
            return `<span class="label-icon">⛽</span><span style="color:${on ? '#44ff88' : '#aaaaaa'}">${on ? 'ON' : 'OFF'}</span>`;
        }

        case 'fan': {
            const on = farm?.fanOn;
            return `<span class="label-icon">🌀</span><span style="color:${on ? '#44ff88' : '#aaaaaa'}">${on ? 'ON' : 'OFF'}</span>`;
        }

        case 'streetLight': {
            const on = farm?.lightOn;
            return `<span class="label-icon">💡</span><span style="color:${on ? '#ffee44' : '#aaaaaa'}">${on ? 'ON' : 'OFF'}</span>`;
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
function createSidePanelSection() {
    const dashboard = document.getElementById('zone-dashboard');
    if (!dashboard) return;

    const section = document.createElement('div');
    section.id = 'live-sensor-panel';
    section.innerHTML = `
        <div class="zone-dashboard-header" style="margin-top:16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top:12px;">
            <div class="zone-dashboard-kicker">ESP32 Live</div>
            <h2>Farm Sensors</h2>
        </div>
        <div id="live-farm-stats" class="zone-stats" style="padding: 8px 0;">
            <div class="zone-stat"><span class="zone-stat-label">Temp</span><span class="zone-stat-value" id="live-temp">--</span></div>
            <div class="zone-stat"><span class="zone-stat-label">Humidity</span><span class="zone-stat-value" id="live-humidity">--</span></div>
            <div class="zone-stat"><span class="zone-stat-label">Fan</span><span class="zone-stat-value" id="live-fan">--</span></div>
            <div class="zone-stat"><span class="zone-stat-label">Light</span><span class="zone-stat-value" id="live-light">--</span></div>
        </div>
        <div id="live-zone-stats"></div>
    `;
    dashboard.appendChild(section);
}

function updateSidePanel(farm, zones) {
    if (farm) {
        const tempEl     = document.getElementById('live-temp');
        const humEl      = document.getElementById('live-humidity');
        const fanEl      = document.getElementById('live-fan');
        const lightEl    = document.getElementById('live-light');

        if (tempEl)   tempEl.textContent   = `${farm.temperature?.toFixed(1)}°C`;
        if (humEl)    humEl.textContent    = `${farm.humidity?.toFixed(0)}%`;
        if (fanEl)    fanEl.textContent    = farm.fanOn   ? '🟢 ON' : '⚫ OFF';
        if (lightEl)  lightEl.textContent  = farm.lightOn ? '🟡 ON' : '⚫ OFF';
    }

    const zoneContainer = document.getElementById('live-zone-stats');
    if (!zoneContainer) return;

    zoneContainer.innerHTML = Object.entries(zones).map(([zoneId, data]) => {
        const pct = Math.max(0, Math.min(100, 100 - (data.moisture / 4095) * 100));
        const color = pct < 30 ? '#ff4444' : pct < 50 ? '#ffaa00' : '#44ff88';
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
                    <div class="zone-stat">
                        <span class="zone-stat-label">Pump</span>
                        <span class="zone-stat-value">${data.pumpOn ? '🟢 ON' : '⚫ OFF'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ─── CLICK TO INSPECT ────────────────────────────────────────────────────────
export function handleSensorClick(object) {
    const type = object?.userData?.type;
    if (!type) return;

    const showTypes = ['moistureSensor','tempSensor','humiditySensor','waterPump','fan','sprinkler','streetLight'];
    if (!showTypes.includes(type)) return;

    inspectTarget = object;
    showInspectPanel(object);
}

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
            content += row('Trigger', farm?.temperature > 30 ? 'Temp > 30°C' : 'Normal');
            break;
        case 'waterPump':
        case 'sprinkler': {
            const pct = zone ? Math.max(0, Math.min(100, 100 - (zone.moisture / 4095) * 100)).toFixed(0) : '--';
            content += row('Status',   zone?.pumpOn ? '🟢 Running' : '⚫ Off');
            content += row('Moisture', `${pct}%`);
            break;
        }
        case 'streetLight':
            content += row('Status',  farm?.lightOn ? '🟡 ON' : '⚫ OFF');
            content += row('Control', 'Time-based (6pm–6am)');
            break;
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