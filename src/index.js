import app from './app.js';
import dotenv from 'dotenv';
import pool from './config/db.js';
import { cleanupExpiredTokens } from './models/tokenModel.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

pool.query('SELECT NOW()')
.then(()=>{
    console.log('✅ Connected to database');
    startServer();
})
.catch(err=>{
    console.error('❌ Database connection error:', err);
    console.warn('⚠️ Starting server without database connection...');
    startServer();
});

function startServer(){
    const server = app.listen(PORT, ()=>{
        console.log(`🚀 Server running on http://localhost:${PORT}`);  
    });

    setInterval(cleanupExpiredTokens, 24*60*60*1000);

    setupGracefulShutdown(server);
}

function setupGracefulShutdown(server){
    process.on('SIGTERM', ()=> gracefulShutdown(server, 'SIGTERM'));
    process.on('SIGINT', ()=> gracefulShutdown(server, 'SIGINT'));

    process.on('uncaughtException', (error) => {
        console.error('💥 UNCAUGHT EXCEPTION:', error);
        gracefulShutdown(server, 'UNCAUGHT EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('💥 UNHANDLED REJECTION:', reason);
    });
}

function gracefulShutdown(server, signal){
    console.log(`⏹️ ${signal} signal received, shutting down gracefully`);
    
    server.close(()=>{
        console.log('🛑 Server closed');
        
        pool.end().then(()=>{
            console.log('🔌 Database connections closed');
            process.exit(0);
        }).catch(err => {
            console.error('Error closing database connections:', err);
            process.exit(1);
        });

        setTimeout(()=>{
            console.error('⚠️ Forcing shutdown after timeout');
            process.exit(1);
        }, 10000)
    });
}