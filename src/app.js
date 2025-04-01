import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session'
import pgSession from 'connect-pg-simple';
import passport from 'passport'

import authRoutes from './routes/authRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import userRoutes from './routes/userRoutes.js';
import statusRoutes from './routes/statusRoutes.js';

import { errorHandler, notFound } from './middleware/errorMiddleware.js';

import configurePassport from './config/passport.js';
import authConfig from './config/auth.js';
// import auth from './config/auth.js';

const app = express();

app.use(helmet());
app.use(cors({
    origin: [
        'https://resource-base-frontend-production.up.railway.app',
        process.env.FRONTEND_URL,
        'http://localhost:5173'
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

app.use(session({
    // store: new pgSession({
    //     conString: process.env.DATABASE_URL,
    //     tableName: 'session',
    //     createTableIfMissing: true,
    //     ssl: {rejectUnauthorized: false}
    // }),
    secret: authConfig.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: authConfig.session.secure,
        httpOnly: true,
        sameSite: 'lax'
    }
}))

app.use(passport.initialize());
app.use(passport.session());
configurePassport();

app.use('/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/status', statusRoutes);

app.get('/', (req, res)=>{
    res.json({
        message: "Resource Base API",
        version: '1.0.0',
        status: 'ok'
    });
});

app.use(notFound);
app.use(errorHandler);

export default app;