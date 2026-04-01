import express from 'express';
import farmController from '../controller/farmController.js';
import { authMiddleware } from '../middleware/auth.js'


const router = express.Router();
router.use(authMiddleware);

// POST /api/farms - Gets or creates a farm for the user
router.post('/', farmController.getOrCreate)
router.get('/', farmController.getAllForUser)

export default router;
