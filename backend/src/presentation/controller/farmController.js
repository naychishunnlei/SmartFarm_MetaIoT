import pool from '../../config/database.js';
import farmService from "../../service/farmService.js";

class FarmController {
    async create(req, res) {
        try {
            // 1. User context - Now pulling securely from your auth token
            const userId = req.user.userId; 
            
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized: User ID not found' });
            }

            const { name, location, hardware_id, latitude, longitude } = req.body;

            // Basic validation including map coordinates
            if (!name || !location || !hardware_id || latitude === undefined || longitude === undefined) {
                return res.status(400).json({ error: 'Missing required fields (name, location, hardware_id, or coordinates)' });
            }

            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // 2. Hardware Verification
                const registryQuery = `SELECT * FROM hardware_registry WHERE hardware_id = $1`;
                const registryResult = await client.query(registryQuery, [hardware_id]);

                if (registryResult.rowCount === 0) {
                    throw new Error('Device not found in registry. Please power on your ESP32 first so it can register.');
                }

                const { zone_count, has_dht, has_light } = registryResult.rows[0];

                // 3. Ownership Check
                const checkQuery = `SELECT id FROM farms WHERE hardware_id = $1`;
                const checkResult = await client.query(checkQuery, [hardware_id]);
                
                if (checkResult.rowCount > 0) {
                    throw new Error('This device is already claimed by another user.');
                }

                // 4. Create Farm Entry
                const insertFarmQuery = `
                    INSERT INTO farms (user_id, name, location, hardware_id, latitude, longitude)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *;
                `;
                const farmResult = await client.query(insertFarmQuery, [userId, name, location, hardware_id, latitude, longitude]);
                const newFarm = farmResult.rows[0];

                // 5. AUTO-PROVISION: Setup logical zones and physical 3D models
                const createdZones = [];
                for (let i = 1; i <= zone_count; i++) {
                    // Create the database zone
                    const insertZoneQuery = `
                        INSERT INTO zones (farm_id, name, local_index)
                        VALUES ($1, $2, $3)
                        RETURNING *;
                    `;
                    const zoneResult = await client.query(insertZoneQuery, [newFarm.id, `Zone ${i}`, i]);
                    const newZone = zoneResult.rows[0];
                    createdZones.push(newZone);

                    // AUTO-RENDER: Add 3D Moisture Probe (Matches 'moistureSensor' in objects.js)
                    await client.query(
                        `INSERT INTO objects (farm_id, zone_id, object_name, category, position_x, position_y, position_z, metadata)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [newFarm.id, newZone.id, 'moistureSensor', 'iot', (i * 3) - 3, 0, 0, JSON.stringify({ is_running: false, sensor_value: 0 })]
                    );

                    // AUTO-RENDER: Add 3D Water Pump (Matches 'waterPump' in objects.js)
                    await client.query(
                        `INSERT INTO objects (farm_id, zone_id, object_name, category, position_x, position_y, position_z, metadata)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [newFarm.id, newZone.id, 'waterPump', 'iot', (i * 3) - 3, 0, 2, JSON.stringify({ is_running: false, sensor_value: 0 })]
                    );
                }

                // 6. AUTO-RENDER: Global Farm Hardware
                if (has_dht) {
                    // Matches 'tempSensor' in objects.js
                    await client.query(
                        `INSERT INTO objects (farm_id, object_name, category, position_x, position_y, position_z, metadata)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [newFarm.id, 'tempSensor', 'iot', -4, 0, -4, JSON.stringify({ is_running: false, sensor_value: 0 })]
                    );
                }

await client.query('COMMIT');

                res.status(201).json({
                    message: 'Farm successfully claimed and 3D sensors auto-generated!',
                    farm: newFarm,
                    zones: createdZones
                });

            } catch (error) {
                await client.query('ROLLBACK');
                console.error("Transaction Error:", error.message);
                res.status(error.message.includes('not found') ? 404 : 400).json({ error: error.message });
            } finally {
                client.release();
            }

        } catch (error) {
            console.error('Error creating farm:', error);
            res.status(500).json({ message: 'Internal server error while claiming farm' });
        }
    }

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
            console.error("Error fetching farms:", error);
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

export default new FarmController();