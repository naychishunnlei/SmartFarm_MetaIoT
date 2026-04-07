import pool from '../config/database.js'

class FarmRepository {
    async findById(farmId) {
        const query = 'SELECT * FROM farms WHERE id = $1;'
        const result = await pool.query(query, [farmId])
        return result.rows[0]
    }

    async findByNameAndUser(name, userId) {
        const query = 'SELECT * FROM farms WHERE name = $1 AND user_id = $2;'
        const result = await pool.query(query, [name, userId])
        return result.rows[0]
    }

    async create({name, lat, lon, userId, location}) {
        const query = `
            INSERT INTO farms (name, user_id, latitude, longitude, location)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `
        // We use 'location || name' as a safety fallback in case location is undefined
        const values = [name, userId, lat, lon, location || name]
        const result = await pool.query(query, values)
        return result.rows[0]
    }

    async findByUserId(userId) {
        const query = 'SELECT * FROM farms WHERE user_id = $1 ORDER BY name ASC;'
        const result = await pool.query(query, [userId])
        return result.rows
    }

    async deleteByIdAndUser(farmId, userId) {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')

            // Verify ownership first
            const check = await client.query(
                'SELECT id FROM farms WHERE id = $1 AND user_id = $2',
                [farmId, userId]
            )
            if (check.rowCount === 0) {
                await client.query('ROLLBACK')
                return null
            }

            // Delete all child records in dependency order
            // 1. Zone sensor logs (references zones)
            await client.query(
                `DELETE FROM zone_sensor_logs WHERE zone_id IN (
                    SELECT id FROM zones WHERE farm_id = $1
                )`,
                [farmId]
            )

            // 2. Farm sensor logs (references farms)
            await client.query(
                'DELETE FROM farm_sensor_logs WHERE farm_id = $1',
                [farmId]
            )

            // 3. Objects (references farms and zones)
            await client.query(
                'DELETE FROM objects WHERE farm_id = $1',
                [farmId]
            )

            // 4. Zones (references farms)
            await client.query(
                'DELETE FROM zones WHERE farm_id = $1',
                [farmId]
            )

            // 5. Finally delete the farm itself
            const result = await client.query(
                'DELETE FROM farms WHERE id = $1 RETURNING *',
                [farmId]
            )

            await client.query('COMMIT')
            return result.rows[0]
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    }
}

export default new FarmRepository()