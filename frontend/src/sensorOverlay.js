// Handles all live sensor visuals:
// - Floating HTML labels above objects
// - Zone ground color changes
// - Side panel live stats
// - Click-to-inspect panel

import { toggleDevice } from './apiService.js';
import { getLatestFarmData, getLatestZoneData, isSensorOnline, onSensorUpdate } from './sensorService.js';

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

        // Light actuator state — skip if user has manually overridden
        if (type === 'streetLight' && farm && !window._staticLightManualOverride) {
            obj.userData.isRunning = farm.lightOn;
        }
        if ((type === 'waterPump' || type === 'sprinkler') && zoneData) {
            // If not manually overridden, sync with sensor data from ESP32
            if (!obj.userData.manualOverride) {
                obj.userData.isRunning = zoneData.pumpOn;
            }
            // If manually overridden, keep the local state until user explicitly clears it
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
        const showTypes = ['moistureSensor','tempSensor','humiditySensor','waterPump','streetLight'];
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
            const emoji = type === 'waterPump' ? '⛽' : '🚿';
            if (!isSensorOnline()) return `<span class="label-icon">${emoji}</span><span style="color:#888">--</span>`;
            const on = obj.userData.isRunning;
            const farm = getLatestFarmData();
            const tankLow = farm?.tankLow;
            const zoneId2 = obj.userData.zoneId || obj.userData.zone_id;
            const zoneData2 = getLatestZoneData(zoneId2);
            const moisture2 = zoneData2?.moisture ?? 0;
            const pct2 = Math.max(0, Math.min(100, 100 - (moisture2 / 4095) * 100));
            const soilDry = pct2 < 30;
            const tankWarning = !on && soilDry && tankLow ? `<span style="margin-left:4px;font-size:9px;color:#ff6644;">⚠️tank</span>` : '';
            return `<span class="label-icon">${emoji}</span><span style="color:${on ? '#44ff88' : '#aaaaaa'}">${on ? 'ON' : 'OFF'}</span>${tankWarning}<span style="margin-left:4px;font-size:9px;opacity:0.7">${obj.userData.manualOverride ? '🔧' : ''}</span>`;
        }

        case 'streetLight': {
            if (!isSensorOnline()) return `<span class="label-icon">💡</span><span style="color:#888">--</span>`;
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

    // Analytics panel goes at the TOP
    const analyticsSection = document.createElement('div');
    analyticsSection.id = 'analytics-panel';
    analyticsSection.innerHTML = `
        <div style="margin-bottom:16px; padding-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div>
                    <div style="font-size:10px; letter-spacing:1px; color:#aaa; text-transform:uppercase; margin-bottom:2px;">Historical</div>
                    <div style="font-size:16px; font-weight:700; color:white;">Analytics</div>
                </div>
                <button id="analytics-refresh-btn" style="
                    background:rgba(124,109,249,0.2); border:1px solid rgba(124,109,249,0.4);
                    color:#ccc; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:12px;">
                    ⟳ Refresh
                </button>
            </div>

            <div style="display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap;">
                <select id="analytics-limit" style="
                    flex:1; background:#1a1a2e; border:1px solid rgba(255,255,255,0.15);
                    color:#ddd; padding:5px 8px; border-radius:6px; font-size:12px; cursor:pointer;">
                    <option value="120">Last 3 hours</option>
                    <option value="240" selected>Last 6 hours</option>
                    <option value="480">Last 12 hours</option>
                    <option value="960">Last 24 hours</option>
                </select>
                <button id="analytics-excel-btn" style="
                    background:rgba(68,187,102,0.2); border:1px solid rgba(68,187,102,0.4);
                    color:#88ee99; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:12px;">
                    ⬇ Excel
                </button>
            </div>

            <div id="analytics-status" style="font-size:11px; color:#aaa; margin-bottom:6px; min-height:16px;"></div>
            <canvas id="analytics-chart" style="width:100%; max-height:220px;"></canvas>
        </div>
    `;
    dashboard.insertBefore(analyticsSection, dashboard.firstChild);

    // Live sensors panel goes below analytics
    const section = document.createElement('div');
    section.id = 'live-sensor-panel';
    section.innerHTML = `
        <div class="zone-dashboard-header" style="margin-bottom:16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom:12px;">
            <div class="zone-dashboard-kicker">ESP32 Live</div>
            <h2>Farm Sensors</h2>
        </div>
        <div id="live-farm-stats" style="padding: 8px 0;"></div>
        <div id="live-zone-stats"></div>
    `;
    dashboard.insertBefore(section, dashboard.querySelector('#live-sensor-panel') || analyticsSection.nextSibling);

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
        const online = isSensorOnline();
        const lightOn = online ? (window._currentStaticLightState ?? f.lightOn) : false;
        const isManualLight = !!window._staticLightManualOverride;

        const tankLow = online && f.tankLow;
        farmStatsEl.innerHTML = `
            ${tankLow ? `<div style="background:#cc2222;color:white;padding:6px 10px;border-radius:6px;margin-bottom:8px;font-weight:bold;font-size:12px;text-align:center;">⚠️ WATER TANK LOW — Pumps disabled</div>` : ''}
            <div class="zone-stats" style="margin-bottom:8px;">
                <div class="zone-stat"><span class="zone-stat-label">Temp</span><span class="zone-stat-value">${online ? f.temperature?.toFixed(1) + '°C' : '--'}</span></div>
                <div class="zone-stat"><span class="zone-stat-label">Humidity</span><span class="zone-stat-value">${online ? f.humidity?.toFixed(0) + '%' : '--'}</span></div>
                <div class="zone-stat"><span class="zone-stat-label">Tank</span><span class="zone-stat-value" style="color:${online ? (tankLow ? '#ff4444' : '#44ff88') : '#888'}">${online ? (tankLow ? '🔴 LOW' : '🟢 OK') : '--'}</span></div>
                <div class="zone-stat" style="grid-column: span 2; display:flex; align-items:center; justify-content:space-between;">
                    <div>
                        <span class="zone-stat-label">Light${isManualLight ? ' 🔧' : ''}</span>
                        <span class="zone-stat-value" style="margin-top:4px;">${online ? (lightOn ? '🟡 ON' : '⚫ OFF') : '⚫ --'}</span>
                    </div>
                    <div style="display:flex; gap:6px;">
                        ${online ? ctrlBtn(lightOn ? 'Turn OFF' : 'Turn ON', `window._manualToggleStaticLight(${!lightOn})`, lightOn ? '#cc4444' : '#44bb66') : ''}
                        ${isManualLight ? ctrlBtn('Auto', `window._resumeAutoStaticLight()`, '#555') : ''}
                    </div>
                </div>
            </div>
        `;
    }

    const zoneContainer = document.getElementById('live-zone-stats');
    if (!zoneContainer) return;

    const isOnline = isSensorOnline();
    const zoneNameMap = window._zoneNameMap;
    zoneContainer.innerHTML = Object.entries(_lastZones).map(([zoneId, data]) => {
        const zoneName = zoneNameMap?.get(Number(zoneId)) ?? `Zone ${zoneId}`;
        const pct = Math.max(0, Math.min(100, 100 - (data.moisture / 4095) * 100));
        const color = pct < 30 ? '#ff4444' : pct < 50 ? '#ffaa00' : '#44ff88';
        const pump = findPumpForZone(parseInt(zoneId));
        const pumpOn = isOnline ? (pump ? pump.userData.isRunning : data.pumpOn) : false;
        const isManualPump = pump?.userData?.manualOverride;
        const tankLow = isOnline && _lastFarm?.tankLow;
        const isDry = isOnline && pct < 30;
        // Explain why pump is off when soil is dry but pump isn't running
        const pumpOffReason = isOnline && !pumpOn && isDry
            ? (tankLow ? ' — tank empty' : ' — auto')
            : '';
        return `
            <div class="zone-card" style="margin-top:8px;">
                <div class="zone-card-header">
                    <div class="zone-card-title">${zoneName}</div>
                </div>
                <div class="zone-stats">
                    <div class="zone-stat">
                        <span class="zone-stat-label">Moisture</span>
                        <span class="zone-stat-value" style="color:${isOnline ? color : '#888'}">${isOnline ? pct.toFixed(0) + '%' : '--'}</span>
                    </div>
                    <div class="zone-stat" style="grid-column: span 2; display:flex; align-items:center; justify-content:space-between;">
                        <div>
                            <span class="zone-stat-label">Pump${isManualPump ? ' 🔧' : ''}</span>
                            <span class="zone-stat-value" style="margin-top:4px;">${isOnline ? (pumpOn ? '🟢 ON' : `⚫ OFF<span style="color:#ff8844;font-size:10px;">${pumpOffReason}</span>`) : '⚫ --'}</span>
                        </div>
                        <div style="display:flex; gap:6px;">
                            ${isOnline && pump ? ctrlBtn(pumpOn ? 'Turn OFF' : 'Turn ON', `window._toggleZonePump(${zoneId},${!pumpOn})`, pumpOn ? '#cc4444' : '#44bb66') : ''}
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
    // Prioritize finding the actual pump, not sprinklers
    return objectsRef.find(o =>
        o.userData.type === 'waterPump' &&
        (o.userData.zoneId === zoneId || o.userData.zone_id === zoneId)
    );
}

// Zone pump toggle (manual override)
window._toggleZonePump = async function(zoneId, newState) {
    // Block turning pump ON when tank is low
    if (newState && getLatestFarmData()?.tankLow) {
        alert('Cannot turn pump ON — water tank is empty.');
        return;
    }
    const pump = findPumpForZone(parseInt(zoneId));
    if (!pump) return;
    const farmId = localStorage.getItem('selectedFarmId');
    const objectId = pump.userData.dbId;
    if (!farmId || !objectId) return;
    try {
        await toggleDevice(farmId, objectId, newState);
        pump.userData.isRunning = newState;
        pump.userData.manualOverride = true;
        window._refreshSidePanel?.();
    } catch(e) {
        console.error('[Zone Pump] Toggle failed:', e);
    }
};

window._resumeZonePump = async function(zoneId) {
    const zid = parseInt(zoneId);
    const pump = findPumpForZone(zid);
    if (!pump) return;

    // Clear override on pump AND all sprinklers in this zone
    if (objectsRef) {
        objectsRef.forEach(o => {
            if ((o.userData.type === 'waterPump' || o.userData.type === 'sprinkler') &&
                (o.userData.zoneId === zid || o.userData.zone_id === zid)) {
                o.userData.manualOverride = false;
            }
        });
    }

    // Determine correct auto state from latest moisture reading
    const zoneData = getLatestZoneData(zid);
    const DRY_THRESHOLD = 2500; // matches ESP32
    const shouldBeOn = zoneData ? zoneData.moisture > DRY_THRESHOLD : false;

    // Send command so ESP32 reflects the auto decision immediately
    const farmId = localStorage.getItem('selectedFarmId');
    const objectId = pump.userData.dbId;
    if (farmId && objectId) {
        try {
            await toggleDevice(farmId, objectId, shouldBeOn);
        } catch(e) {
            console.warn('[Pump] Resume auto command failed:', e);
        }
    }

    // Update visuals immediately — don't wait for next sensor tick
    if (objectsRef) {
        objectsRef.forEach(o => {
            if ((o.userData.type === 'waterPump' || o.userData.type === 'sprinkler') &&
                (o.userData.zoneId === zid || o.userData.zone_id === zid)) {
                o.userData.isRunning = shouldBeOn;
            }
        });
    }

    window._refreshSidePanel?.();
};

// ─── CLICK TO INSPECT ────────────────────────────────────────────────────────
export function handleSensorClick(object, clickX, clickY) {
    const type = object?.userData?.type;
    if (!type) return;

    const showTypes = ['moistureSensor','tempSensor','humiditySensor','waterPump','sprinkler','streetLight'];
    const isCrop = object?.userData?.category === 'crops';
    if (!showTypes.includes(type) && !isCrop) return;

    inspectTarget = object;
    showInspectPanel(object, clickX, clickY);
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
    const type = inspectTarget.userData.type;

    // Block pump/sprinkler ON when tank is low
    if (newState && (type === 'waterPump' || type === 'sprinkler') && getLatestFarmData()?.tankLow) {
        alert('Cannot turn pump ON — water tank is empty.');
        return;
    }

    // streetLight: delegate entirely to _manualToggleStaticLight which correctly
    // sets BOTH the module-level staticLightManualOverride AND window property,
    // updates the visual, and sends the command to the ESP32.
    if (type === 'streetLight') {
        inspectTarget.userData.manualOverride = true;
        await window._manualToggleStaticLight?.(newState);
        showInspectPanel(inspectTarget);
        return;
    }

    const farmId = localStorage.getItem('selectedFarmId');
    const objectId = inspectTarget.userData.dbId;
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

window._clearOverride = async function() {
    if (!inspectTarget) return;
    const type  = inspectTarget.userData.type;
    const zoneId = inspectTarget.userData.zoneId || inspectTarget.userData.zone_id;

    if (type === 'waterPump' || type === 'sprinkler') {
        // Delegate to zone resume so sprinklers sync too
        await window._resumeZonePump(zoneId);
    } else if (type === 'streetLight') {
        // Clear override — delegate to farm-core's auto-light resume
        inspectTarget.userData.manualOverride = false;
        window._resumeAutoStaticLight?.();
    }

    showInspectPanel(inspectTarget);
};

function createInspectPanel() {
    inspectPanel = document.createElement('div');
    inspectPanel.id = 'sensor-inspect-panel';
    inspectPanel.style.cssText = `
        display: none;
        position: fixed;
        background: rgba(20, 30, 20, 0.92);
        border: 1px solid rgba(100, 200, 100, 0.3);
        border-radius: 12px;
        padding: 16px;
        min-width: 220px;
        max-width: 260px;
        color: white;
        font-family: 'Roboto Mono', monospace;
        font-size: 13px;
        z-index: 1500;
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    `;
    document.getElementById('farm-container')?.appendChild(inspectPanel);

    // Close on click-outside
    document.addEventListener('click', (e) => {
        if (inspectPanel && inspectPanel.style.display !== 'none') {
            if (!inspectPanel.contains(e.target) && e.target !== inspectTarget?.userData?.element) {
                inspectPanel.style.display = 'none';
            }
        }
    });
}

let _inspectClickX = 0;
let _inspectClickY = 0;

function showInspectPanel(obj, clickX, clickY) {
    if (!inspectPanel) return;
    if (clickX !== undefined) { _inspectClickX = clickX; _inspectClickY = clickY; }

    const type   = obj.userData.type;
    const zoneId = obj.userData.zone_id || obj.userData.zoneId || 1;
    const farm   = getLatestFarmData();
    const zone   = getLatestZoneData(zoneId);

    const znMap = window._zoneNameMap;
    const znLabel = znMap?.get(Number(zoneId)) ?? `Zone ${zoneId}`;
    let content = `<div style="font-weight:bold; margin-bottom:10px; color:#88ff88">${getLabel(type)}</div>`;

    if (obj.userData.category === 'crops') {
        const growth = obj.userData.growth ?? 0;
        const pct = Math.round(growth * 100);
        const color = pct >= 100 ? '#44ff88' : pct >= 50 ? '#ffaa00' : '#ff6644';
        content += row('Growth', `<span style="color:${color}">${pct}%</span>`);
        content += row('Stage', pct >= 100 ? '🌿 Mature' : pct >= 50 ? '🌱 Growing' : '🌰 Seedling');
        content += `<button onclick="document.getElementById('sensor-inspect-panel').style.display='none'"
            style="margin-top:12px; width:100%; background:rgba(255,255,255,0.1);
            border:none; color:white; padding:6px; border-radius:6px; cursor:pointer;">
            Close
        </button>`;
        inspectPanel.innerHTML = content;
        inspectPanel.style.display = 'block';
        requestAnimationFrame(() => {
            const pw = inspectPanel.offsetWidth  || 240;
            const ph = inspectPanel.offsetHeight || 200;
            const margin = 16;
            const offset = 8;

            let x = _inspectClickX + offset;
            let y = _inspectClickY - (ph / 2);

            if (x + pw > window.innerWidth - margin) {
                x = _inspectClickX - pw - offset;
            }

            x = Math.max(margin, Math.min(window.innerWidth - pw - margin, x));
            y = Math.max(margin, Math.min(window.innerHeight - ph - margin, y));
            inspectPanel.style.left = `${x}px`;
            inspectPanel.style.top  = `${y}px`;
        });
        return;
    }

    content += `<div style="color:#aaa; margin-bottom:8px; font-size:11px">${znLabel}</div>`;

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
            // Use _currentStaticLightState as the authoritative source (set by applyStaticLightState)
            const isOn = window._currentStaticLightState ?? obj.userData.isRunning ?? false;
            content += row('Status', isOn ? '🟡 ON' : '⚫ OFF');
            const isManual = window._staticLightManualOverride || obj.userData.manualOverride;
            if (isManual) content += row('Mode', '🔧 Manual Override');
            else content += row('Control', 'Auto (ESP32)');
            content += overrideBtn(!isOn);
            if (isManual) {
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

    // Position panel near the object (to the right or above, with smart boundaries)
    requestAnimationFrame(() => {
        const pw = inspectPanel.offsetWidth  || 240;
        const ph = inspectPanel.offsetHeight || 200;
        const margin = 16;
        const offset = 8;  // offset from click point

        // Try right side first
        let x = _inspectClickX + offset;
        let y = _inspectClickY - (ph / 2);  // vertically center on click

        // If too far right, move to left
        if (x + pw > window.innerWidth - margin) {
            x = _inspectClickX - pw - offset;
        }

        // Clamp to screen
        x = Math.max(margin, Math.min(window.innerWidth - pw - margin, x));
        y = Math.max(margin, Math.min(window.innerHeight - ph - margin, y));

        inspectPanel.style.left = `${x}px`;
        inspectPanel.style.top  = `${y}px`;
    });
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
        tomato: '🍅 Tomato',
        carrot: '🥕 Carrot',
        corn: '🌽 Corn',
        wheat: '🌾 Wheat',
        sunflower: '🌻 Sunflower',
        cabbage: '🥬 Cabbage',
    };
    return labels[type] || type;
}