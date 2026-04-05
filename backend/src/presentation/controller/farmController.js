import pool from '../../config/database.js';
import farmService from "../../service/farmService.js";

class FarmController {
    async create(req, res) {
        try {
            // 1. Grab userId securely from the auth middleware, NOT the request body!
            //const userId = req.user.userId;
            const userId = 1;
            const { name, location, hardware_id } = req.body;

            // Basic validation
            if (!name || !location || !hardware_id) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // Check if the hardware_id is already claimed
                const checkQuery = `SELECT id FROM farms WHERE hardware_id = $1`;
                const checkResult = await client.query(checkQuery, [hardware_id]);
                
                if (checkResult.rowCount > 0) {
                    throw new Error('This device is already claimed by another user.');
                }

                // Insert the new farm
                const insertFarmQuery = `
                    INSERT INTO farms (user_id, name, location, hardware_id)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *;
                `;
                const farmResult = await client.query(insertFarmQuery, [userId, name, location, hardware_id]);
                const newFarm = farmResult.rows[0];

                // Create a default zone for this farm
                const insertZoneQuery = `
                    INSERT INTO zones (farm_id, name)
                    VALUES ($1, $2)
                    RETURNING *;
                `;
                const zoneResult = await client.query(insertZoneQuery, [newFarm.id, 'Main Zone']);
                const newZone = zoneResult.rows[0];

                await client.query('COMMIT');

                res.status(201).json({
                    message: 'Farm successfully claimed!',
                    farm: newFarm,
                    zone: newZone
                });

            } catch (error) {
                await client.query('ROLLBACK');
                
                if (error.message.includes('already claimed')) {
                    return res.status(409).json({ error: error.message });
                }
                throw error; // Pass to outer catch block
            } finally {
                client.release();
            }

        } catch (error) {
            console.error('Error creating farm:', error);
            res.status(500).json({ message: 'Internal server error while claiming farm' });
        }
    }

    // --- RESTORED ORIGINAL FUNCTIONS ---

    async getOrCreate(req, res) {
        try {
            const userId = req.user.userId; 
            const farm = await farmService.getOrCreateFarm(req.body, userId);
            res.status(200).json(farm);
        } catch (error) {
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

// Export the class instance exactly how you had it originally
export default new FarmController();