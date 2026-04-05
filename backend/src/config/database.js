import dotenv from 'dotenv'
import pg from 'pg'


dotenv.config()

const { Pool } = pg
const pool = new Pool ({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'farmverse',

    max: 20, // Maximum number of connections in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Fail fast if the DB stops responding
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