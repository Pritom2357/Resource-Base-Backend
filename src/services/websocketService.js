import {Server} from 'socket.io';
import jwt, { decode } from 'jsonwebtoken';

const userConnections = new Map();

/**
 * Initialize Socket.io
 * @param {object} server - HTTP server instance
 * @param {string} jwtSecret - Secret for JWT verification
 */

export function initializeSocketServer(server, jwtSecret){
    const io = new Server(server, {
        cors: {
            origin: ["http://localhost:5173", "https://resource-base.vercel.app"],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.use((socket, next)=>{
        try {
            const token = socket.handshake.auth.token;
            if(!token){
                return next(new Error("Authentication error: No token provided"))
            }

            const decoded = jwt.verify(token, jwtSecret);
            socket.userId = decoded.id;
            next();
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket)=>{
        const userId = socket.userId;

        console.log(`User ${userId} connected with socket ${socket.id}`);

        if(!userConnections.has(userId)){
            userConnections.set(userId, new Set());
        }
        userConnections.get(userId).add(socket.id);

        socket.on('disconnect', ()=>{
            if(userConnections.has(userId)){
                userConnections.get(userId).delete(socket.id);
                if(userConnections.get(userId).size === 0){
                    userConnections.delete(userId);
                }
            }
            console.log(`User ${userId} disconnected from socket ${socket.id}`);
        })
    })

    return {io, userConnections};
}

/**
 * Send notification to a specific user
 * @param {object} io - socket.io server instance
 * @param {string} userId - ID of the user to notify
 * @param {object} notification - Notification data
 */

export function sendNotification(io, userConnections, userId, notification) {
    try {
        const userSockets = userConnections.get(userId);

        if(userSockets && userSockets.size > 0){
            console.log(`Sending notification to user ${userId} through ${userSockets.size} sockets`);

            userSockets.forEach(socketId => {
                io.to(socketId).emit('notification', notification);
            });

            return true;
        } else {
            console.log(`User ${userId} not connected, notification queued for later`);
            return false;
        }
    } catch (error) {
        console.error('Error sending notification via socket:', error);
        return false;
    }
}