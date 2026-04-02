import pool from '../config/database.js'

class ObjectRepository {
    async create(objectData) {
        const { farm_id, object_name, category, position_x, position_y, position_z} = objectData
        const query = `
            INSERT INTO objects (farm_id, object_name, category, position_x, position_y, position_z)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `
        const values = [farm_id, object_name, category, position_x, position_y, position_z]
        const result = await pool.query(query, values)
        return result.rows[0]
    }

    async findByFarmId(farmId) {
        const query = 'SELECT * FROM objects WHERE farm_id = $1 ORDER BY id ASC;'
        const result = await pool.query(query, [farmId])
        return result.rows
    }

    async findById(id) {
        const query = 'SELECT * FROM objects WHERE id = $1;'
        const result = await pool.query(query, [id])
        return result.rows[0]
    }

    async deleteAll(farmId) {
        const result = await pool.query('DELETE FROM objects WHERE farm_id = $1;', [farmId])
        return result.rowCount
    }

    async delete(id) {
        const result = await pool.query('DELETE FROM objects WHERE id = $1', [id]);
        return result.rowCount > 0
    }

    async updateGrowth(id, growth) {
        const query = 'UPDATE objects SET growth = $1, updated_at = NOW() WHERE id = $2 RETURNING *;'
        const result = await pool.query(query, [growth, id])
        return result.rows[0]
    }
}

export default new ObjectRepository()