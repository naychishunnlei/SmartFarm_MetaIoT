import pool from '../config/database.js'

class ObjectRepository {
    async create(objectData) {
        const { farm_id, object_name, category, position_x, position_y, position_z, growth, is_running, sensor_value} = objectData

        let metadata = {};
        if (category === 'crops') {
            metadata.growth = growth !== undefined ? growth : 0.4;
        } else if (category === 'iot') {
            metadata.is_running = is_running !== undefined ? is_running : false;
            metadata.sensor_value = sensor_value !== undefined ? sensor_value : 0.0;
        }

        const query = `
            INSERT INTO objects (farm_id, object_name, category, position_x, position_y, position_z, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `
        const values = [farm_id, object_name, category, position_x, position_y, position_z, metadata]
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
        const query = `UPDATE objects 
            SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('growth', $1::numeric), 
                updated_at = NOW() 
            WHERE id = $2 
            RETURNING *;`
        const result = await pool.query(query, [growth, id])
        return result.rows[0]
    }

    async updateIsRunning(id, isRunning) {
        const query = `
            UPDATE objects
            SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('is_running', $1::boolean),
                updated_at = NOW()
            WHERE id = $2
            RETURNING *;
        `
        const result = await pool.query(query, [isRunning, id])
        return result.rows[0]
    }

    async updateSensorValue(id, value) {
        const query = `
            UPDATE objects 
            SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sensor_value', $1::numeric), 
                updated_at = NOW() 
            WHERE id = $2 
            RETURNING *;`
        const result = await pool.query(query, [value, id])
        return result.rows[0]
    }
}

export default new ObjectRepository()