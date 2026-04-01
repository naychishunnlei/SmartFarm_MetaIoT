import express from 'express'
import objectController from '../controller/objectController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router({ mergeParams: true })
router.use(authMiddleware)

router.post('/', objectController.create)
router.get('/', objectController.getAllForFarm)
router.delete('/:objectId', objectController.delete)

export default router