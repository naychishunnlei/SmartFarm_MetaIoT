import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';
import userRoute from './presentation/routes/userRoute.js'; 
import objectRoutes from './presentation/routes/objectRoutes.js'
import farmRoute from './presentation/routes/farmRoute.js'

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

// API Routes
app.use('/api/users', userRoute)
app.use('/api/farms', farmRoute)
app.use('/api/farms/:farmId/objects', objectRoutes)

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: ' Server is running' });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});