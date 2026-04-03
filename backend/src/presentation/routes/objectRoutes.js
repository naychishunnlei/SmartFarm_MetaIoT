import express from 'express'
import objectController from '../controller/objectController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router({ mergeParams: true })
router.use(authMiddleware)

router.post('/', objectController.create)
router.get('/', objectController.getAllForFarm)
router.delete('/:objectId', objectController.delete)
router.delete('/', objectController.deleteAll)
router.put('/:objectId/growth', objectController.updateGrowth)
router.put('/:objectId/toggle', objectController.toggleDevice)
router.put('/:objectId/sensor', objectController.updateSensor)
router.put('/:objectId/position', objectController.updatePosition)


export default router