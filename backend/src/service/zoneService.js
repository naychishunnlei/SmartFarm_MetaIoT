import farmRepository from '../data/farmRepository.js'
import zoneRepository from '../data/zoneRepository.js'

class ZoneService {
    async getZonesByFarmId(userId, farmId) {
        const farm = await farmRepository.findById(farmId)
        if (!farm) throw new Error('Farm not found')
        if (farm.user_id !== userId) throw new Error('Forbidden: you do not own this farm')

        return await zoneRepository.findByFarmId(farmId)
    }

    async createZone(userId, farmId, name) {
        const farm = await farmRepository.findById(farmId)
        if (!farm) throw new Error('Farm not found')
        if (farm.user_id !== userId) throw new Error('Forbidden: you do not own this farm')

        if (!name || !name.trim()) throw new Error('Zone name is required')

        return await zoneRepository.create(farmId, name.trim())
    }
}

export default new ZoneService()