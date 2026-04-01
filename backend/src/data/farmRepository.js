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
}

export default new FarmRepository()