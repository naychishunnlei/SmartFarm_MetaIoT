import objectRepository from "../data/objectRepository.js"
import farmRepository from "../data/farmRepository.js"

class ObjectService {
    async createObject(userId, farmId, objectData) {
        const farm = await farmRepository.findById(farmId)
        if (!farm) throw new Error('farm not found')
        if (farm.user_id !== userId) throw new Error('forbidden: you dont own this farm')
        
        const dataToCreate = {...objectData, farm_id:farmId}
        return await objectRepository.create(dataToCreate)
    }

    async getObjectsByFarm(userId, farmId) {
        const farm = await farmRepository.findById(farmId)
        if(!farm) throw new Error('farm not found')
        if (farm.user_id !== userId) throw new Error('forbidden')
        
            return await objectRepository.findByFarmId(farmId)
    }

     async deleteObject(userId, farmId, objectId) {
        const farm = await farmRepository.findById(farmId);
        if (!farm) {
            throw new Error('Farm not found.');
        }
        if (farm.user_id !== userId) {
            throw new Error('Forbidden: You do not have permission on this farm.');
        }
        const object = await objectRepository.findById(objectId);
        if (!object || object.farm_id !== farmId) {
            throw new Error('Object not found on this farm.');
        }

        const deleted = await objectRepository.delete(objectId);
        if (!deleted) {
            throw new Error('Failed to delete the object.');
        }
    }

    async deleteAllObjects(userId, farmId) {
        const farm = await farmRepository.findById(farmId)
        if (!farm || farm.user_id !== userId) {
            throw new Error('Forbidden: You do not have permission on this farm.');
        }
        return await objectRepository.deleteAll(farmId)

    }

    async updateObjectGrowth(userId, farmId, objectId, growth) {
        const farm = await farmRepository.findById(farmId)
        if (!farm || farm.user_id !== userId) {
            throw new Error('forbidden: do not belong to this farm')
        }
        return await objectRepository.updateGrowth(objectId, growth)
    }

    async toggleDevice(userId, farmId, objectId, isRunning) {
        const farm = await farmRepository.findById(farmId)
        if (!farm || farm.user_id !== userId) {
            throw new Error('forbidden: do not belong to this farm')
        }
        return await objectRepository.updateIsRunning(objectId, isRunning)
    }

    async updateSensorData(userId, farmId, objectId, value) {
        const farm = await farmRepository.findById(farmId)
        if (!farm || farm.user_id !== userId) {
            throw new Error('forbidden: do not belong to this farm')
        }
        return await objectRepository.updateSensorValue(objectId, value)
    }

    async updateObjectPosition(userId, farmId, objectId, x, y, z) {
        const farm = await farmRepository.findById(farmId)
        if (!farm || farm.user_id !== userId) {
            throw new Error('Forbidden: You do not have permission on this farm.');
        }
        return await objectRepository.updatePosition(objectId, x, y, z)
    }
}

export default new ObjectService()