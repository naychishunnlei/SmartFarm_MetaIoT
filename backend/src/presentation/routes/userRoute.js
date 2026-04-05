import express from 'express';
import userController from '../controller/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();


router.post('/register', userController.register)
router.post('/login', userController.login)
router.get('/profile', authMiddleware, userController.getProfile)
router.put('/avatar', authMiddleware, userController.updateAvatar)

export default router;