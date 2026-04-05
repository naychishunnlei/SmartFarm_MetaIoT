import zoneService from '../../service/zoneService.js'

class ZoneController {
    async getAllForFarm(req, res) {
        try {
            const userId = req.user.userId
            const farmId = parseInt(req.params.farmId, 10)

            const zones = await zoneService.getZonesByFarmId(userId, farmId)
            res.status(200).json(zones)
        } catch (error) {
            if (error.message.startsWith('Forbidden')) {
                return res.status(403).json({ message: error.message })
            }
            if (error.message.includes('not found')) {
                return res.status(404).json({ message: error.message })
            }
            res.status(500).json({ message: error.message })
        }
    }

    async create(req, res) {
        try {
            const userId = req.user.userId
            const farmId = parseInt(req.params.farmId, 10)
            const { name } = req.body

            const zone = await zoneService.createZone(userId, farmId, name)
            res.status(201).json(zone)
        } catch (error) {
            if (error.message.startsWith('Forbidden')) {
                return res.status(403).json({ message: error.message })
            }
            if (error.message.includes('not found')) {
                return res.status(404).json({ message: error.message })
            }
            res.status(400).json({ message: error.message })
        }
    }
}

export default new ZoneController()