import WebSocket, { WebSocketServer } from 'ws'; // Required for the WebSocket.OPEN constant
import sensorRepository from '../data/sensorRepository.js'

// 1. Updated to match the new ESP32 payload (hardware_id instead of farm_id)
const requiredFields = [
    'hardware_id', 
    'zone_id', 
    'temperature', 
    'humidity', 
    'light_lux', // Added since ESP32 sends this explicitly
    'moisture_1', 
    'pump', 
    'fan', 
    'light'
]

function isValidSensorPayload(payload) {
    return requiredFields.every((field) => payload[field] !== undefined)
}

export default function initWebSocket(server) {
    const wss = new WebSocketServer({ server, path: '/ws' })

    wss.on('connection', (ws) => {
        console.log('Device connected via WebSocket')

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString())
                
                if (!isValidSensorPayload(data)) {
                    console.log('Invalid payload:', data)
                    ws.send(JSON.stringify({ status: 'error', message: 'Invalid payload fields' }))
                    return
                }

                // 2. Save using the updated repository that handles hardware_id lookup
                const saved = await sensorRepository.saveSensorData(data)
                ws.send(JSON.stringify({ status: 'saved', farm_log_id: saved.farm_log_id, zone_log_id: saved.zone_log_id }))

                // 3. Broadcast to all other connected clients (e.g., Frontend React/Vue dashboard)
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message.toString())
                    }
                })
            } catch (error) {
                // Log the specific error (e.g., "Device not registered")
                console.error('Error processing sensor message:', error.message)
                
                // Send the specific error message back so you can see it in the ESP32 Serial Monitor
                ws.send(JSON.stringify({ 
                    status: 'error', 
                    message: error.message || 'Failed to save sensor data' 
                }))
            }
        })

        ws.on('close', () => {
            console.log('Device disconnected')
        })
    })

    return wss
}