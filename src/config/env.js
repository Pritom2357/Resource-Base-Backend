import dotenv from 'dotenv';

dotenv.config();

export default {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV,
  server: {
    port: parseInt(process.env.PORT || '3000', 10)
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'Resource Base'
  },
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
  }
};