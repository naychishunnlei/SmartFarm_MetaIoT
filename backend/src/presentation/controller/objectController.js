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
                return res.status(403).json({ message: error.message });
            }
            if (error.message.startsWith('Farm not found')) {
                return res.status(404).json({ message: error.message });
            }
            res.status(500).json({ message: error.message });
        
        }
    }

    async delete(req, res) {
        try {
            const userId = req.user.userId;
            const farmId = parseInt(req.params.farmId, 10);
            const objectId = parseInt(req.params.objectId, 10);

            await objectService.deleteObject(userId, farmId, objectId);
            
            // Send a 204 No Content response for a successful deletion.
            res.status(204).send();
        } catch (error) {
            if (error.message.startsWith('Forbidden')) {
                return res.status(403).json({ message: error.message });
            }
            if (error.message.includes('not found')) {
                return res.status(404).json({ message: error.message });
            }
            res.status(400).json({ message: error.message });
        }
    }
}

export default new ObjectController()