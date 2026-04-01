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
        // Security Check 1: Verify the user owns the farm.
        const farm = await farmRepository.findById(farmId);
        if (!farm) {
            throw new Error('Farm not found.');
        }
        if (farm.user_id !== userId) {
            throw new Error('Forbidden: You do not have permission on this farm.');
        }

        // Security Check 2: Verify the object exists and belongs to this farm.
        const object = await objectRepository.findById(objectId);
        if (!object || object.farm_id !== farmId) {
            throw new Error('Object not found on this farm.');
        }

        // If all checks pass, delete the object.
        const deleted = await objectRepository.delete(objectId);
        if (!deleted) {
            throw new Error('Failed to delete the object.');
        }
    }
}

export default new ObjectService()