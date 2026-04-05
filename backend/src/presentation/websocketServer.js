import { WebSocketServer } from 'ws'
import sensorRepository from '../data/sensorRepository.js'

const requiredFields = ['farm_id', 'zone_id', 'temperature', 'humidity', 'moisture_1', 'pump', 'fan', 'light']

function isValidSensorPayload(payload) {
    return requiredFields.every((field) => payload[field] !== undefined)
}

export default function initWebSocket(server) {
    const wss = new WebSocketServer({ server, path: '/ws' })

    wss.on('connection', (ws) => {
        console.log('ESP32 connected via WebSocket')

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString())
                if (!isValidSensorPayload(data)) {
                    console.log('Invalid payload:', data)
                    ws.send(JSON.stringify({ status: 'error', message: 'Invalid payload fields' }))
                    return
                }

                const saved = await sensorRepository.saveSensorData(data)
                ws.send(JSON.stringify({ status: 'saved', farm_log_id: saved.farm_log_id, zone_log_id: saved.zone_log_id }))

                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message.toString())
                    }
                })
            } catch (error) {
                console.error('Error processing sensor message:', error)
                ws.send(JSON.stringify({ status: 'error', message: 'Failed to save sensor data' }))
            }
        })

        ws.on('close', () => {
            console.log('ESP32 disconnected')
        })
    })

    return wss
}