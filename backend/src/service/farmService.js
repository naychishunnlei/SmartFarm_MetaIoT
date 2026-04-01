import farmRepository from '../data/farmRepository.js'

class FarmService {
    async createFarm(farmData, userId) {
        const { name, lat, lon, location } = farmData

        if (!name || lat === undefined || lon === undefined) {
            throw new Error('Farm name, lat, and lon are required.')
        }

        return await farmRepository.create({ name, lat, lon, userId, location })
    }

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

    async deleteFarm(farmId, userId) {
        const deletedFarm = await farmRepository.deleteByIdAndUser(farmId, userId)
        if (!deletedFarm) {
            throw new Error('Farm not found or unauthorized.')
        }
        return deletedFarm
    }
}

export default new FarmService()