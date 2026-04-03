import objectService from "../../service/objectService.js"

class ObjectController {
    async create(req,res){
        try {
            const userId = req.user.userId
            const farmId = parseInt(req.params.farmId, 10)
            const newObject = await objectService.createObject(userId, farmId, req.body)
            res.status(201).json(newObject)
        }catch (error) {
            if(error.message.startsWith('forbidden')){
                return res.status(403).json({ message: error.message })
            }
            if(error.message.startsWith('farm')){
                return res.status(404).json({ message: error.message})
            }

            res.status(400).json({ message: error.message })
        }
    }

    async getAllForFarm(req, res) {
        try {
            const userId = req.user.userId
            const farmId = parseInt(req.params.farmId, 10)
            const objects = await objectService.getObjectsByFarm(userId, farmId)
            res.status(200).json(objects)
        }catch (error) {
             if (error.message.startsWith('Forbidden')) {
                return res.status(403).json({ message: error.message })
            }
            if (error.message.startsWith('Farm not found')) {
                return res.status(404).json({ message: error.message })
            }
            res.status(500).json({ message: error.message })
        
        }
    }

    async delete(req, res) {
        try {
            const userId = req.user.userId
            const farmId = parseInt(req.params.farmId, 10)
            const objectId = parseInt(req.params.objectId, 10)

            await objectService.deleteObject(userId, farmId, objectId)
            
            res.status(204).send()
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

    async updateGrowth(req, res) {
        try {
            const userId = req.user.userId
            const farmId = parseInt(req.params.farmId, 10)
            const objectId = parseInt(req.params.objectId, 10)
            const { growth } = req.body

            if (growth === undefined) {
                return res.status(400).json({ message: 'Growth value is required' })
            }

            const updatedObject = await objectService.updateObjectGrowth(userId, farmId, objectId, growth)
            if (!updatedObject) {
                return res.status(404).json({ message: 'Object not found' })
            }
            
            res.status(200).json(updatedObject) 
        } catch (error) {
            if (error.message.startsWith('forbidden')) {
                    return res.status(403).json({ message: error.message })
            }
            res.status(400).json({ message: error.message })
        }
    }

    async deleteAll(req, res) {
        try {
            const userId = req.user.userId
            const farmId = parseInt(req.params.farmId, 10)
            
            const deletedCount = await objectService.deleteAllObjects(userId, farmId)
            res.status(200).json({ message: `Successfully deleted ${deletedCount} objects.` })
        } catch (error) {
            if (error.message.startsWith('Forbidden')) {
                return res.status(403).json({ message: error.message })
            }
            res.status(400).json({ message: error.message })
        }
    }

    async toggleDevice(req,res) {
        try {
            const userId = req.user.userId
            const farmId = parseInt(req.params.farmId, 10)
            const objectId = parseInt(req.params.objectId, 10)
            const { is_running } = req.body

            if (typeof is_running !== 'boolean') {
                return res.status(400).json({ message: 'is_running boolean value is required' })
            }

            const updatedObject = await objectService.toggleDevice(userId, farmId, objectId, is_running)
            if (!updatedObject) return res.status(404).json({ message: 'Object not found' })
            
            res.status(200).json(updatedObject)
        } catch (error) {
            if (error.message.startsWith('forbidden')) {
                return res.status(403).json({ message: error.message }) 
            }
            res.status(400).json({ message: error.message })
            
        }
    }

    async updateSensor(req, res) {
        try {
             const userId = req.user.userId
            const farmId = parseInt(req.params.farmId, 10)
            const objectId = parseInt(req.params.objectId, 10)
            const { sensor_value } = req.body

            if (sensor_value === undefined) {
                return res.status(400).json({ message: 'sensor_value is required' })
            }

            const updatedObject = await objectService.updateSensorData(userId, farmId, objectId, sensor_value)
            if (!updatedObject) return res.status(404).json({ message: 'Object not found' })
            
            res.status(200).json(updatedObject)
        }catch (error) {
            if (error.message.startsWith('forbidden')) {
                return res.status(403).json({ message: error.message })
            }
            res.status(400).json({ message: error.message })

        }
    }

    async updatePosition(req, res) {
        try {
            const userId = req.user.userId
            const farmId = parseInt(req.params.farmId, 10)
            const objectId = parseInt(req.params.objectId, 10)
            const { position_x, position_y, position_z } = req.body

            if (position_x === undefined || position_y === undefined || position_z === undefined) {
                return res.status(400).json({ message: 'position_x, position_y, and position_z are required' })
            }

            const updatedObject = await objectService.updateObjectPosition(userId, farmId, objectId, position_x, position_y, position_z)
            if (!updatedObject) return res.status(404).json({ message: 'Object not found' })
            
            res.status(200).json(updatedObject)
        } catch (error) {
            if (error.message.startsWith('Forbidden')) {
                return res.status(403).json({ message: error.message })
            }
            res.status(400).json({ message: error.message })
        }
    }

}

export default new ObjectController()