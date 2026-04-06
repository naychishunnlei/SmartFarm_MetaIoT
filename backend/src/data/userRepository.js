import pool from '../config/database.js'

class UserRepository {
    async findByEmail(email) {
        // Using * means has_avatar is automatically included!
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
        return result.rows[0]
    }

    async create({ name, email, password }) {
        const result = await pool.query(
             'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
            [name, email, password]
        )
        return result.rows[0]
    }

    async findById(id) {
        // Added has_avatar and avatar_config to the return so profile pages can use them
        const result = await pool.query('SELECT id, name, email, has_avatar, avatar_config, created_at FROM users WHERE id = $1', [id]);
        return result.rows[0];
    }

    async updateAvatar(id, avatarConfig) {
        // 🌟 THE FIX: Added "has_avatar = TRUE" to the SET clause
        const result = await pool.query(
            'UPDATE users SET avatar_config = $1, has_avatar = TRUE, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, has_avatar, avatar_config',
            [avatarConfig, id]
        )
        return result.rows[0]
    }
}

export default new UserRepository();