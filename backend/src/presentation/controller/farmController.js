import farmService from "../../service/farmService.js"

class FarmController {
    async create(req, res) {
        try {
            const userId = req.user.userId;
            const farm = await farmService.createFarm(req.body, userId);
            res.status(201).json(farm);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    async getOrCreate(req, res) {
        try {
            const userId = req.user.userId; // From authMiddleware
            const farm = await farmService.getOrCreateFarm(req.body, userId);
            // Use status 200 for OK (found) or 201 for Created, or just 200 for simplicity.
            res.status(200).json(farm);
        } catch (error) {
            // This will now likely only be for database or validation errors
            res.status(400).json({ message: error.message });
        }
    }

    async getAllForUser(req, res) {
        try {
            const userId = req.user.userId;
            const farms = await farmService.getFarmsByUserId(userId);
            res.status(200).json(farms);
        } catch (error) {
            res.status(500).json({ message: 'Failed to retrieve farms.' });
        }
    }

    async delete(req, res) {
        try {
            const userId = req.user.userId;
            const farmId = Number(req.params.farmId);

            if (!Number.isInteger(farmId) || farmId <= 0) {
                return res.status(400).json({ message: 'Invalid farm ID.' });
            }

            const deletedFarm = await farmService.deleteFarm(farmId, userId);
            return res.status(200).json({
                message: 'Farm deleted successfully.',
                farm: deletedFarm
            });
        } catch (error) {
            if (error.message.includes('not found')) {
                return res.status(404).json({ message: error.message });
            }
            return res.status(400).json({ message: error.message });
        }
    }
}

export default new FarmController()