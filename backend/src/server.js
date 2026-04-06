import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { connectDatabase } from './config/database.js';
import farmRoute from './presentation/routes/farmRoute.js';
import objectRoutes from './presentation/routes/objectRoutes.js';
import userRoute from './presentation/routes/userRoute.js';
import zoneRoute from './presentation/routes/zoneRoute.js';
import initWebSocket from './presentation/websocketServer.js';

dotenv.config();

const app = express();
const server = createServer(app);

const corsOptions = {
    // Added 5500 to support local HTML testing via Live Server
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Connect to Database
connectDatabase();

// 🌟 NEW: Start WebSocket server AND attach it to Express
const wss = initWebSocket(server);
app.set('wss', wss); // This allows your route controllers to talk to the ESP32!

// API Routes
app.use('/api/users', userRoute)
app.use('/api/farms', farmRoute)
app.use('/api/farms/:farmId/objects', objectRoutes)
app.use('/api/farms/:farmId/zones', zoneRoute)

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: ' Server is running' });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});