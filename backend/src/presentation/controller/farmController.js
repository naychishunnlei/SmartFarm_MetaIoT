import pool from '../../config/database.js';
import farmService from "../../service/farmService.js";
import sensorRepository from '../../data/sensorRepository.js';
import farmRepository from '../../data/farmRepository.js';
import { sendCommandToDevice } from '../websocketServer.js';

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

                const { zone_count } = registryResult.rows[0];

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

                // 5. Create Zones based on hardware zone_count
                const createdZones = [];
                for (let i = 1; i <= zone_count; i++) {
                    const insertZoneQuery = `
                        INSERT INTO zones (farm_id, name, local_index)
                        VALUES ($1, $2, $3)
                        RETURNING *;
                    `;
                    const zoneResult = await client.query(insertZoneQuery, [newFarm.id, `Zone ${i}`, i]);
                    createdZones.push(zoneResult.rows[0]);
                }

await client.query('COMMIT');

                res.status(201).json({
                    message: 'Farm successfully claimed!',
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

    async autoProvisionFarm(req, res) {
        try {
            const userId = req.user.userId;
            const farmId = Number(req.params.farmId);

            if (!Number.isInteger(farmId) || farmId <= 0) {
                return res.status(400).json({ error: 'Invalid farm ID.' });
            }

            const { crops = [] } = req.body;

            if (!Array.isArray(crops)) {
                return res.status(400).json({ error: 'crops must be an array' });
            }

            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // Verify farm ownership
                const farmQuery = `SELECT * FROM farms WHERE id = $1 AND user_id = $2`;
                const farmResult = await client.query(farmQuery, [farmId, userId]);

                if (farmResult.rowCount === 0) {
                    throw new Error('Farm not found or you do not have permission to modify it.');
                }

                const farm = farmResult.rows[0];

                // Get hardware info and zone count
                const hardwareQuery = `SELECT * FROM hardware_registry WHERE hardware_id = $1`;
                const hardwareResult = await client.query(hardwareQuery, [farm.hardware_id]);

                if (hardwareResult.rowCount === 0) {
                    throw new Error('Hardware registry entry not found for this farm.');
                }

                const { zone_count, has_dht, has_light } = hardwareResult.rows[0];

                // Get existing zones
                const zonesQuery = `SELECT * FROM zones WHERE farm_id = $1 ORDER BY id ASC`;
                const zonesResult = await client.query(zonesQuery, [farmId]);
                const zones = zonesResult.rows;

                if (zones.length === 0) {
                    throw new Error('No zones found for this farm. Zones should have been created during farm setup.');
                }

                // Distribute crops across zones
                const cropsPerZone = Math.ceil(crops.length / zone_count);
                let cropIndex = 0;

                for (const zone of zones) {
                    const zoneIndex = zones.indexOf(zone);

                    // Farm rows run along X (-8 to +8), stacked in Z.
                    // 3 zones × 5 rows each, spaced 1 unit apart:
                    //   Zone 0: rows at z = -7,-6,-5,-4,-3  (firstRow = -7)
                    //   Zone 1: rows at z = -2,-1, 0, 1, 2  (firstRow = -2)
                    //   Zone 2: rows at z =  3, 4, 5, 6, 7  (firstRow =  3)
                    const firstRow = -7 + zoneIndex * 5;
                    const zCenter = firstRow + 2;  // middle row of zone

                    // Get crops for this zone
                    const cropsThisZone = [];
                    for (let c = 0; c < cropsPerZone && cropIndex < crops.length; c++) {
                        cropsThisZone.push(crops[cropIndex]);
                        cropIndex++;
                    }

                    // Place crops on the soil rows (one crop per row, centered on x=0)
                    let cropPositions = [];
                    const n = cropsThisZone.length;
                    if (n === 1) {
                        cropPositions = [{ x: 0, z: firstRow + 2 }];
                    } else if (n === 2) {
                        cropPositions = [
                            { x: -1, z: firstRow + 2 },
                            { x:  1, z: firstRow + 2 }
                        ];
                    } else if (n === 3) {
                        cropPositions = [
                            { x: 0, z: firstRow + 1 },
                            { x: 0, z: firstRow + 2 },
                            { x: 0, z: firstRow + 3 }
                        ];
                    } else if (n === 4) {
                        cropPositions = [
                            { x: -1, z: firstRow + 1 },
                            { x:  1, z: firstRow + 1 },
                            { x: -1, z: firstRow + 3 },
                            { x:  1, z: firstRow + 3 }
                        ];
                    } else {
                        // 5+ crops: one per row
                        cropPositions = [0, 1, 2, 3, 4].map(r => ({ x: 0, z: firstRow + r }));
                        for (let extra = 5; extra < n; extra++) {
                            cropPositions.push({
                                x: (Math.random() - 0.5) * 4,
                                z: firstRow + Math.floor(Math.random() * 5)
                            });
                        }
                    }

                    // Plant crops
                    for (let idx = 0; idx < cropsThisZone.length; idx++) {
                        await client.query(
                            `INSERT INTO objects (farm_id, zone_id, object_name, category, position_x, position_y, position_z, metadata)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                            [farmId, zone.id, cropsThisZone[idx], 'crops', cropPositions[idx].x, 0.2, cropPositions[idx].z, JSON.stringify({ growth: 0.4 })]
                        );
                    }

                    // 1 Moisture Sensor — center of zone
                    await client.query(
                        `INSERT INTO objects (farm_id, zone_id, object_name, category, position_x, position_y, position_z, metadata)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [farmId, zone.id, 'moistureSensor', 'iot', 0, 0.1, zCenter, JSON.stringify({ is_running: false, sensor_value: 0 })]
                    );

                    // 1 Water Pump — left side, middle of zone
                    await client.query(
                        `INSERT INTO objects (farm_id, zone_id, object_name, category, position_x, position_y, position_z, metadata)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [farmId, zone.id, 'waterPump', 'iot', -7, 0.1, zCenter, JSON.stringify({ is_running: false, sensor_value: 0 })]
                    );

                    // 3 Sprinklers — between rows, spread across zone width
                    const sprinklerPositions = [
                        { x: -4, z: firstRow + 0.5 },  // between row 1 & 2, left
                        { x:  0, z: firstRow + 2.5 },  // between row 3 & 4, center
                        { x:  4, z: firstRow + 3.5 },  // between row 4 & 5, right
                    ];
                    for (const pos of sprinklerPositions) {
                        await client.query(
                            `INSERT INTO objects (farm_id, zone_id, object_name, category, position_x, position_y, position_z, metadata)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                            [farmId, zone.id, 'sprinkler', 'iot', pos.x, 0.1, pos.z, JSON.stringify({ is_running: false, sensor_value: 0 })]
                        );
                    }
                }

                // Global Temperature Sensor if hardware has DHT
                if (has_dht) {
                    await client.query(
                        `INSERT INTO objects (farm_id, object_name, category, position_x, position_y, position_z, metadata)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [farmId, 'tempSensor', 'iot', -4, 0, -4, JSON.stringify({ is_running: false, sensor_value: 0 })]
                    );
                }

                // Global Street Light — outside the top-left corner of the fence, arm points into the farm
                await client.query(
                    `INSERT INTO objects (farm_id, object_name, category, position_x, position_y, position_z, metadata)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [farmId, 'streetLight', 'iot', -10, 0, 9, JSON.stringify({ is_running: false, sensor_value: 0 })]
                );

                await client.query('COMMIT');

                res.status(200).json({
                    message: 'Farm auto-provisioned with objects successfully!',
                    farm: farm
                });

            } catch (error) {
                await client.query('ROLLBACK');
                console.error("Auto-provision Error:", error.message);
                res.status(error.message.includes('not found') ? 404 : 400).json({ error: error.message });
            } finally {
                client.release();
            }

        } catch (error) {
            console.error('Error auto-provisioning farm:', error);
            res.status(500).json({ message: 'Internal server error while auto-provisioning farm' });
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

    async getSensorHistory(req, res) {
        try {
            const farmId = Number(req.params.farmId);
            const limit = Math.min(Number(req.query.limit) || 50, 200);
            const data = await sensorRepository.getSensorHistory(farmId, limit);
            res.json(data);
        } catch (error) {
            console.error('Error fetching sensor history:', error);
            res.status(500).json({ message: error.message });
        }
    }

    async controlDevice(req, res) {
        try {
            const userId = req.user.userId;
            const farmId = parseInt(req.params.farmId, 10);
            const { device, state } = req.body;

            if (!device || state === undefined) {
                return res.status(400).json({ message: 'device and state are required' });
            }

            const farm = await farmRepository.findById(farmId);
            if (!farm || farm.user_id !== userId) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            // state: true→1, false→0, null→-1 (resume auto)
            const espState = state === null ? -1 : (state ? 1 : 0);
            const command = { type: 'control', device, zone_id: null, state: espState };
            const sent = sendCommandToDevice(farm.hardware_id, command);

            if (!sent) {
                console.warn(`[CONTROL] Device ${farm.hardware_id} not connected — light command not delivered`);
            }

            res.status(200).json({ sent, device, state });
        } catch (error) {
            res.status(500).json({ message: error.message });
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