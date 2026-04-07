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

                    // This will now work because 'pool' is imported!
                    await pool.query(discoveryQuery, [hardware_id, zones, has_dht, has_light]);
                    console.log(`[DISCOVERY] Specs for ${hardware_id} saved to registry.`);

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

        ws.on('close', () => {
            console.log('Device disconnected')
            if (connectedHardwareId) {
                deviceConnections.delete(connectedHardwareId);
            }
        })
    })

    return wss
}