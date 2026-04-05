// Connects to backend WebSocket and distributes live sensor data

let latestFarmData = null;
let latestZoneData = {};
const listeners = [];

export function onSensorUpdate(callback) {
    listeners.push(callback);
}

function notifyListeners() {
    listeners.forEach(cb => cb({ farm: latestFarmData, zones: latestZoneData }));
}

export function getLatestFarmData() { return latestFarmData; }
export function getLatestZoneData(zoneId) { return latestZoneData[zoneId] || null; }

export function initSensorWebSocket() {
    const farmId = localStorage.getItem('selectedFarmId');
    if (!farmId) return;

    // Use your backend server IP — same as ESP32 ws_host
    const host = window.location.hostname;
    const ws = new WebSocket(`ws://${host}:5001/ws`);

    ws.onopen = () => {
        console.log('[SENSOR WS] Connected to backend');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            // Only process sensor broadcasts, not save confirmations
            if (data.status) return;

            // Farm-wide data
            latestFarmData = {
                temperature: data.temperature,
                humidity:    data.humidity,
                lightOn:     data.light,
                fanOn:       data.fan,
                tankLow:     data.tank_low,
            };

            // Zone-specific data
            latestZoneData[data.zone_id] = {
                moisture: data.moisture_1,
                pumpOn:   data.pump,
            };

            notifyListeners();
        } catch (e) {
            console.warn('[SENSOR WS] Failed to parse message:', e);
        }
    };

    ws.onclose = () => {
        console.warn('[SENSOR WS] Disconnected. Reconnecting in 5s...');
        setTimeout(initSensorWebSocket, 5000);
    };

    ws.onerror = (err) => {
        console.error('[SENSOR WS] Error:', err);
    };

    return ws;
}