import WebSocket, { WebSocketServer } from 'ws';
import pool from '../config/database.js';
import sensorRepository from '../data/sensorRepository.js';

// 1. Updated to match the new ESP32 payload
const requiredFields = [
    'hardware_id',
    'zone_id',
    'temperature',
    'humidity',
    //'light_lux',
    'moisture_1',
    'pump',
    'fan',
    'light'
]

// Store active device connections by hardware_id
const deviceConnections = new Map();

function isValidSensorPayload(payload) {
    return requiredFields.every((field) => payload[field] !== undefined)
}

export function sendCommandToDevice(hardware_id, command) {
    const ws = deviceConnections.get(hardware_id);
    if (ws && ws.readyState === WebSocket.OPEN) {
        const msg = JSON.stringify(command);
        console.log(`[CONTROL] Sending to ${hardware_id}: ${msg}`);
        ws.send(msg);
        return true;
    } else {
        console.warn(`[CONTROL] Device ${hardware_id} not connected (readyState: ${ws?.readyState || 'N/A'})`);
    }
    return false;
}

// Called on every discovery. Adds or removes zones (and their default objects)
// so the DB always matches what the ESP32 is reporting.
async function syncZonesForHardware(hardware_id, reportedZoneCount) {
    const client = await pool.connect();
    try {
        // Find the farm linked to this hardware
        const farmResult = await client.query(
            'SELECT * FROM farms WHERE hardware_id = $1 LIMIT 1',
            [hardware_id]
        );
        if (farmResult.rowCount === 0) return; // farm not created yet — nothing to sync

        const farm = farmResult.rows[0];
        const farmId = farm.id;

        const zonesResult = await client.query(
            'SELECT * FROM zones WHERE farm_id = $1 ORDER BY id ASC',
            [farmId]
        );
        const existingZones = zonesResult.rows;
        const currentCount = existingZones.length;

        if (currentCount === reportedZoneCount) {
            console.log(`[SYNC] Farm ${farmId} already has ${currentCount} zone(s) — no change needed.`);
            return;
        }

        await client.query('BEGIN');

        if (reportedZoneCount > currentCount) {
            // ── Add missing zones ─────────────────────────────────────────────
            console.log(`[SYNC] Farm ${farmId}: adding zones ${currentCount + 1}–${reportedZoneCount}`);
            for (let i = currentCount + 1; i <= reportedZoneCount; i++) {
                const zoneRes = await client.query(
                    'INSERT INTO zones (farm_id, name) VALUES ($1, $2) RETURNING *',
                    [farmId, `Zone ${i}`]
                );
                const newZone = zoneRes.rows[0];
                const zoneIndex = i - 1;

                // Mirror the layout logic from autoProvisionFarm
                const zStart  = -6 + zoneIndex * 4;
                const zEnd    = zStart + 4;
                const zCenter = (zStart + zEnd) / 2;
                const xCenter = zoneIndex * 5;

                // soilBed
                await client.query(
                    `INSERT INTO objects (farm_id, zone_id, object_name, category, position_x, position_y, position_z, metadata)
                     VALUES ($1,$2,'soilBed','infrastructure',$3,0,$4,'{}')`,
                    [farmId, newZone.id, xCenter, zCenter]
                );
                // moistureSensor
                await client.query(
                    `INSERT INTO objects (farm_id, zone_id, object_name, category, position_x, position_y, position_z, metadata)
                     VALUES ($1,$2,'moistureSensor','iot',$3,0.1,$4,$5)`,
                    [farmId, newZone.id, xCenter, zCenter, JSON.stringify({ is_running: false, sensor_value: 0 })]
                );
                // waterPump
                await client.query(
                    `INSERT INTO objects (farm_id, zone_id, object_name, category, position_x, position_y, position_z, metadata)
                     VALUES ($1,$2,'waterPump','iot',$3,0.1,$4,$5)`,
                    [farmId, newZone.id, xCenter - 2, zStart, JSON.stringify({ is_running: false, sensor_value: 0 })]
                );
                // 3 sprinklers
                const sprinklerPositions = [
                    { x: xCenter - 1.5, z: zStart + 1.5 },
                    { x: xCenter,       z: zCenter       },
                    { x: xCenter + 1.5, z: zEnd   - 1.5  },
                ];
                for (const pos of sprinklerPositions) {
                    await client.query(
                        `INSERT INTO objects (farm_id, zone_id, object_name, category, position_x, position_y, position_z, metadata)
                         VALUES ($1,$2,'sprinkler','iot',$3,0.1,$4,$5)`,
                        [farmId, newZone.id, pos.x, pos.z, JSON.stringify({ is_running: false, sensor_value: 0 })]
                    );
                }
                console.log(`[SYNC] Zone ${i} created with default objects for farm ${farmId}.`);
            }
        } else {
            // ── Remove extra zones (last N zones + their objects) ─────────────
            const toRemove = existingZones.slice(reportedZoneCount);
            console.log(`[SYNC] Farm ${farmId}: removing ${toRemove.length} extra zone(s)`);
            for (const zone of toRemove) {
                await client.query('DELETE FROM zone_sensor_logs WHERE zone_id = $1', [zone.id]);
                await client.query('DELETE FROM objects WHERE zone_id = $1', [zone.id]);
                await client.query('DELETE FROM zones WHERE id = $1', [zone.id]);
                console.log(`[SYNC] Zone ${zone.id} (${zone.name}) removed from farm ${farmId}.`);
            }
        }

        await client.query('COMMIT');
        console.log(`[SYNC] Farm ${farmId} now has ${reportedZoneCount} zone(s).`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[SYNC] Zone sync failed:', err.message);
    } finally {
        client.release();
    }
}

export default function initWebSocket(server) {
    const wss = new WebSocketServer({ server, path: '/ws' })

    wss.on('connection', (ws) => {
        console.log('Device connected via WebSocket')
        let connectedHardwareId = null;

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString())

                // 🌟 NEW: Handle Discovery Handshake
                if (data.type === 'discovery') {
                    console.log(`[DISCOVERY] Device ${data.hardware_id} is reporting its specs...`);

                    const { hardware_id, zones, has_dht, has_light } = data;
                    connectedHardwareId = hardware_id;

                    // Store the connection
                    deviceConnections.set(hardware_id, ws);

                    const discoveryQuery = `
                        INSERT INTO hardware_registry (hardware_id, zone_count, has_dht, has_light, last_seen)
                        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                        ON CONFLICT (hardware_id)
                        DO UPDATE SET
                            zone_count = EXCLUDED.zone_count,
                            has_dht = EXCLUDED.has_dht,
                            has_light = EXCLUDED.has_light,
                            last_seen = CURRENT_TIMESTAMP;
                    `;

                    await pool.query(discoveryQuery, [hardware_id, zones, has_dht, has_light]);
                    console.log(`[DISCOVERY] Specs for ${hardware_id} saved to registry.`);

                    // ── Auto-sync zones for any farm linked to this hardware ──
                    await syncZonesForHardware(hardware_id, zones);

                    ws.send(JSON.stringify({ status: "recognized", message: "Hardware specs registered" }));
                    return;
                }

                // 2. Validate standard sensor payload
                if (!isValidSensorPayload(data)) {
                    console.log('Invalid payload:', data)
                    ws.send(JSON.stringify({ status: 'error', message: 'Invalid payload fields' }))
                    return
                }

                // Store hardware_id from sensor data if not yet stored
                if (!connectedHardwareId) {
                    connectedHardwareId = data.hardware_id;
                    deviceConnections.set(data.hardware_id, ws);
                }

                // 3. Save sensor data
                const saved = await sensorRepository.saveSensorData(data)
                ws.send(JSON.stringify({ status: 'saved', farm_log_id: saved.farm_log_id, zone_log_id: saved.zone_log_id }))

                // 4. Broadcast to frontend clients, enriched with farm_id and global_zone_id
                // so the frontend can match data to the correct farm and zone objects
                const broadcast = JSON.stringify({
                    ...data,
                    farm_id: saved.farm_id,
                    global_zone_id: saved.global_zone_id
                })
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(broadcast)
                    }
                })
            } catch (error) {
                console.error('Error processing message:', error.message)
                ws.send(JSON.stringify({
                    status: 'error',
                    message: error.message || 'Failed to process message'
                }))
            }
        })

        // Keep connection alive — ESP32 WebSocketsClient drops if no traffic for ~15s
        const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.ping();
        }, 10000);

        ws.on('close', () => {
            clearInterval(pingInterval);
            if (connectedHardwareId) {
                // Only remove from map if this is still the active socket.
                // If the ESP32 reconnected quickly, discovery already replaced it —
                // deleting here would wipe the new valid entry.
                if (deviceConnections.get(connectedHardwareId) === ws) {
                    deviceConnections.delete(connectedHardwareId);
                    console.log(`[WS] ESP32 ${connectedHardwareId} disconnected`);
                } else {
                    console.log(`[WS] Stale socket closed for ${connectedHardwareId} — active connection preserved`);
                }
            }
            // Browser clients (no hardware_id) silently close — no log noise
        })
    })

    return wss
}