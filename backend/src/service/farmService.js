import farmRepository from '../data/farmRepository.js'

class FarmService {
    async getOrCreateFarm(farmData, userId) {
        const { name, lat, lon } = farmData

        // Prevent duplicate farm names for the same user
        const existingFarm = await farmRepository.findByNameAndUser(name, userId)
        if (existingFarm) {
            return existingFarm
        }

        return await farmRepository.create({ name, lat, lon, userId })
    }

    async getFarmsByUserId(userId) {
        return await farmRepository.findByUserId(userId)
    }
}

export default new FarmService()