import pool from '../config/database.js'

class ZoneRepository {
    async findByFarmId(farmId) {
        const result = await pool.query(
            'SELECT * FROM zones WHERE farm_id = $1 ORDER BY id ASC',
            [farmId]
        )
        return result.rows
    }

    async findById(zoneId) {
        const result = await pool.query(
            'SELECT * FROM zones WHERE id = $1',
            [zoneId]
        )
        return result.rows[0] || null
    }

    async create(farmId, name) {
        const result = await pool.query(
            'INSERT INTO zones (farm_id, name) VALUES ($1, $2) RETURNING *',
            [farmId, name]
        )
        return result.rows[0]
    }

    async deleteByFarmId(farmId) {
        const result = await pool.query(
            'DELETE FROM zones WHERE farm_id = $1 RETURNING *',
            [farmId]
        )
        return result.rows
    }
}

export default new ZoneRepository()