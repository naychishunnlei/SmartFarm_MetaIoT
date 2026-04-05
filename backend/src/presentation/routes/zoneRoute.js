import express from 'express'
import zoneController from '../controller/zoneController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router({ mergeParams: true })
router.use(authMiddleware)

router.get('/', zoneController.getAllForFarm)
router.post('/', zoneController.create)

export default router