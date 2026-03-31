import pg from 'pg'
import dotenv from 'dotenv'


dotenv.config()

const { Pool } = pg
const pool = new Pool ({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'farmverse'
})

export async function connectDatabase() {
    try {
        const result = await pool.query('SELECT NOW()')
        console.log('database connected at:', result.rows[0])
        return pool
    }catch (error) {
        console.log('database connection fail')
        process.exit(1)
    }
}

export default pool