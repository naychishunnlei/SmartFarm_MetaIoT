import farmService from "../../service/farmService.js"

class FarmController {
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
}

export default new FarmController()