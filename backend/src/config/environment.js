import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
    server: {
        port: process.env.PORT || 5001,
        nodeEnv: process.env.NODE_ENV || 'development',
    },
    database: {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173'],
    }
};