import express from 'express';
import userController from '../controller/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected route - requires a valid token
router.get('/profile', authMiddleware, userController.getProfile);

export default router;