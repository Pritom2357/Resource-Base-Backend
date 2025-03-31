import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config();

const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    port: process.env.DB_PORT || 5432,
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'Resource Base'
})

export default pool;