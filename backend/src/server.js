import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { connectDatabase } from './config/database.js';
import farmRoute from './presentation/routes/farmRoute.js';
import objectRoutes from './presentation/routes/objectRoutes.js';
import userRoute from './presentation/routes/userRoute.js';
import initWebSocket from './presentation/websocketServer.js';

dotenv.config();

const app = express();
const server = createServer(app);

const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Connect to Database
connectDatabase();

// Start WebSocket server for ESP32 sensor stream
initWebSocket(server);

// API Routes
app.use('/api/users', userRoute)
app.use('/api/farms', farmRoute)
app.use('/api/farms/:farmId/objects', objectRoutes)

// Root route for quick server verification in browser
app.get('/', (req, res) => {
    res.json({
        message: 'SmartFarm backend is running',
        health: '/api/health'
    });
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: ' Server is running' });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});