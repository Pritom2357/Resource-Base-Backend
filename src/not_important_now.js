// import pg from 'pg'
// import express from 'express'
// import session from 'express-session'
// import {v4 as uuidv4} from 'uuid'
// import bcrypt from 'bcrypt'
// import cors from 'cors'
// import dotenv from 'dotenv'
// import jwt from 'jsonwebtoken'
// import passport  from 'passport'
// import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
// import { Strategy as GitHubStrategy } from 'passport-github2'


// dotenv.config();
// const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
// const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
// const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY;
// const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY;


// const PORT = process.env.PORT || 3000;

// if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
//     console.error("ERROR: JWT secret keys not defined in environment variables!");
//     process.exit(1);
// }

// const {Client} = pg;

// const client = new Client({
//     host: 'localhost',
//     user: 'postgres',
//     port: 5432,
//     password: '1234',
//     database: 'Resource Base'
// });

// client.connect()
// .then(()=> console.log("Connected to database"))
// .catch(err => {
//     console.error("Database connection error: ", err);
//     process.exit(1);
// })


// const app = express();
// app.use(express.json());
// app.use(cors({
//     origin: "*", 
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true
// }));
// app.use(session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {secure: process.env.NODE_ENV === 'production'}
// }));

// app.use(passport.initialize());
// app.use(passport.session());

// passport.use(new GoogleStrategy({
//     clientID: process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     callbackURL: "http://localhost:3000/auth/google/callback"
// }, async (accessToken, refreshToken, profile, done)=>{
//     try {
//         let userQuery = "SELECT * FROM users WHERE provider_id = $1 AND provider_name = $2";
//         let result = await client.query(userQuery, [profile.id, 'google']);

//         if(result.rows.length > 0){
//             const user = result.rows[0];
//             delete user.password_hash;
//             return done(null, user);
//         }else{
//             const email = profile.emails?.[0]?.value;
//             if(!email){
//                 return done(new Error("Email required"));
//             }

//             const uuid = uuidv4();
//             const newUser = {
//                 id: uuid,
//                 username: profile.displayName || email.split('@')[0],
//                 email: email,
//                 provider_id: profile.id,
//                 provider_name: 'google'
//             };

//             const ssoHash = await bcrypt.hash('SSO_USER_'+profile.id, 10);

//             await client.query(
//                 "INSERT INTO users (id, username, email, provider_id, provider_name, password_hash) VALUES($1, $2, $3, $4, $5, $6)",
//                 [newUser.id, newUser.username, newUser.email, newUser.provider_id, newUser.provider_name, ssoHash]
//             );
//             return done(null, newUser);
//         }
//     } catch (error) {
//         return done(error);
//     }
// }));

// passport.use(new GitHubStrategy({
//     clientID: process.env.GITHUB_CLIENT_ID,
//     clientSecret: process.env.GITHUB_CLIENT_SECRET,
//     callbackURL: "http://localhost:3000/auth/github/callback",
//     scope: ['user:email']
// }, async(accessToken, refreshToken, profile, done)=>{
//     try {
//         let userQuery = "SELECT * FROM users WHERE provider_id=$1 AND provider_name=$2";
//         let result = await client.query(userQuery, [profile.id, 'github']);

//         if(result.rows.length>0){
//             const user = result.rows[0];
//             delete user.password_hash;
//             return done(null, user);
//         }else{
//             const email = profile.emails?.[0]?.value;
//             if(!email){
//                 return done(new Error("Email required"));
//             }

//             const uuid = uuidv4();
//             const newUser = {
//                 id: uuid,
//                 username: profile.username || profile.displayName,
//                 email: email,
//                 provider_id: profile.id,
//                 provider_name: 'github'
//             };

//             const ssoHash = await bcrypt.hash('SSO_USER_'+profile.id, 10);

//             await client.query(
//                 "INSERT INTO users (id, username, email, provider_id, provider_name, password_hash) VALUES ($1, $2, $3, $4, $5, $6)",
//                 [newUser.id, newUser.username, newUser.email, newUser.provider_id, newUser.provider_name, ssoHash]
//             );

//             return done(null, newUser);
//         }
//     } catch (error) {
//         return done(error);
//     }
// }));

// passport.serializeUser((user, done)=>{
//     done(null, user.id);
// });

// passport.deserializeUser(async (id, done)=>{
//     try {
//         const result = await client.query(
//             "SELECT id, username, email, provider_id, provider_name, password_hash FROM users WHERE id=$1", [id]
//         );

//         if(result.rows.length > 0){
//             const user = result.rows[0];
//             delete user.password_hash;
//             done(null, result.rows[0]);
//         }else{
//             done(new Error('User not found'));
//         }
//     } catch (error) {
//         done(error);
//     }
// })

// const storeRefreshToken = async (token, userId, expiresIn) => {
//     const expiryValue = parseInt(expiresIn);
//     const expiryUnit = expiresIn.slice(-1);

//     let expiresAt = new Date();
//     if(expiryUnit === 'd') expiresAt.setDate(expiresAt.getDate() + expiryValue);
//     else if(expiryUnit === 'h') expiresAt.setHours(expiresAt.getHours()+expiryValue);
//     else if(expiryUnit === 'm') expiresAt.setMinutes(expiresAt.getMinutes()+expiryValue);

//     const query = `
//         INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)
//     `;

//     await client.query(query, [token, userId, expiresAt]);
// }

// const findRefreshToken = async (token) => {
//     const tokenQuery = `
//         SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW() AND revoked = false
//     `;

//     const result = await client.query(tokenQuery, [token]);
//     return result.rows[0];
// };

// const  deleteRefreshToken = async (token)=>{
//     const deleteQuery = `
//         UPDATE refresh_tokens
//         SET revoked = TRUE, revoked_reason = 'User logout'
//         WHERE token = $1
//     `

//     await client.query(deleteQuery, [token]);
// };

// const deleteUserRefreshTokens = async (userId) => {
//     const query = `
//         UPDATE refresh_tokens
//         SET revoked = TRUE, revoked_reason = 'User initiated logout all'
//         WHERE user_id = $1 AND revoked = FALSE
//     `

//     await client.query(query, [userId]);
// }

// const authenticateToken = (req, res, next) => {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];

//     if(!token){
//         return res.status(401).json({
//             error: "Access token required"
//         });
//     }

//     jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user)=>{
//         if(err){
//             return res.status(403).json({
//                 error: "Invalid access token"
//             });
//         }
//         req.user = user;
//         next();
//     })
// }


// app.post('/login', async (req, res)=>{
//     try {
//         const {email, password, remember} = req.body;

//         if(!email || !password){
//             return res.status(400).json({
//                 error: "Missing required fields"
//             });
//         }

//         const userQuery = "SELECT id, username, email, password_hash FROM users WHERE email = $1";

//         const result = await client.query(userQuery, [email]);

//         if(result.rows.length === 0){
//             return res.status(401).json({
//                 error: "Invalid email or password"
//             });
//         }

//         const user = result.rows[0];

//         const passwordMatch = await bcrypt.compare(password, user.password_hash);

//         if(!passwordMatch){
//             return res.status(401).json({
//                 error: "Invalid email or password"
//             })
//         }

//         delete user.password_hash;

//         const accessTokenExpiry = ACCESS_TOKEN_EXPIRY;
//         const refreshTokenExpiry = remember ? '30d' : REFRESH_TOKEN_EXPIRY;

//         const accessToken = jwt.sign(user, ACCESS_TOKEN_SECRET, {expiresIn: accessTokenExpiry});
//         const refreshToken = jwt.sign(user, REFRESH_TOKEN_SECRET, {expiresIn: refreshTokenExpiry});

//         await storeRefreshToken(refreshToken, user.id, refreshTokenExpiry);

//         res.status(200).json({
//             success: true,
//             message: "User logged in successfully",
//             user,
//             accessToken,
//             refreshToken
//         });
//     } catch (error) {
//         console.error("Login error: ", error);
//         res.status(500).json({
//             error: "login failed",
//             message: error.message
//         })        
//     }
// });

// app.post('/token', async (req, res)=>{
//     try {
//         const {refreshToken} = req.body;

//         if(!refreshToken){
//             return res.status(401).json({
//                 error: "Refresh token required"
//             });
//         }
//         const tokenRecord = await findRefreshToken(refreshToken);
//         if(!tokenRecord){
//             return res.status(403).json({
//                 error: "Invalid or expired refresh token"
//             });
//         }

//         jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, user)=>{
//             if(err){
//                 return res.status(403).json({
//                     error: "Invalid refresh token",
//                 });
//             }

//             const userData = {id: user.id, username: user.username, email: user.email};
//             const accessToken = jwt.sign(userData, ACCESS_TOKEN_SECRET, {expiresIn: ACCESS_TOKEN_EXPIRY});
//             res.json({accessToken});
//         });
//     } catch (error) {
//         console.error("Token refresh error:", error);
//         res.status(500).json({
//             error: "Token refresh failed",
//             message: error.message
//         });
//     }
// });

// app.post('/logout', async (req, res)=>{
//     try {
//         const {refreshToken} = req.body;

//         if(refreshToken){
//             await deleteRefreshToken(refreshToken);
//         }
//         res.status(204).send();
//     } catch (error) {
//         console.error("Logout error: ", error);
//         res.status(500).json({
//             error: "Logout failed",
//             message: error.message
//         })
//     }
// });

// app.post('/logout/all', authenticateToken, async (req, res)=>{
//     try {
//         await deleteUserRefreshTokens(req.user.id);
//         res.status(204).send();
//     } catch (error) {
//         console.error("Logout all error: ", error);
//         res.status(500).json({
//             error: "Logout all failed", 
//             message: error.message
//         });
//     }
// });

// app.get('/protected', authenticateToken, (req, res) => {
//     res.json({
//         message: "Protected route accessed successfully",
//         user: req.user
//     });
// });

// app.post('/register', async (req, res)=>{
//     try {
//         const uuid = uuidv4();
//         const {username, email, password} =  req.body;

//         if(!username || !email || !password){
//             return res.status(400).json({
//                 error: "Missing required fields"
//             });
//         }

//         const saltRounds = 10;
//         const hashedPassword = await bcrypt.hash(password, saltRounds);

//         const dataQuery = "INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4)";
        
//         await client.query(dataQuery, [uuid, username, email, hashedPassword]);

//         res.status(201).json({
//             success: true,
//             message: "User registered successfully",
//             userId: uuid
//         });
//     } catch (error) {
//         console.error("Registration error: ", error);

//         if(error.code === '23505'){
//             return res.status(409).json({
//                 error: "User already exists"
//             });
//         }

//         res.status(500).json({
//             error: "Registration failed",
//             message: error.message
//         });
//     }
// });

// const cleanupExpiredTokens = async () => {
//     const query = `
//         DELETE FROM refresh_tokens
//         WHERE expires_at < NOW()
//     `;

//     try {
//         await client.query(query);
//         console.log("Expired tokens cleaned up");
//     } catch (error) {
//         console.error("Token cleanup error: ", error);
//     }
// };

// setInterval(cleanupExpiredTokens, 24*60*60*1000);

// // I have not defines any role in the users table, left for future
// // app.post('/admin/cleanup-tokens', authenticateToken, async (req, res) => {
// //     try {
// //         if (req.user.role !== 'admin') {
// //             return res.status(403).json({ error: "Admin access required" });
// //         }
        
// //         await cleanupExpiredTokens();
// //         res.status(200).json({ message: "Expired tokens cleaned up" });
// //     } catch (error) {
// //         res.status(500).json({ error: error.message });
// //     }
// // });

// app.get('/auth/google', 
//     passport.authenticate('google', {scope: ['profile', 'email']})
// );

// app.get('/auth/google/callback',
//     passport.authenticate('google', {failureRedirect: '/login'}),
//     async (req, res)=>{
//         try {
//             const user = req.user;
//             const accessToken = jwt.sign(user, ACCESS_TOKEN_SECRET, {expiresIn: ACCESS_TOKEN_EXPIRY});
//             const refreshToken = jwt.sign(user, REFRESH_TOKEN_SECRET, {expiresIn: REFRESH_TOKEN_EXPIRY});

//             await storeRefreshToken(refreshToken, user.id, REFRESH_TOKEN_EXPIRY);

//             const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
//             res.redirect(`${frontendUrl}/oauth-callback?`+`accessToken=${accessToken}&`+`refreshToken=${refreshToken}&`+`user=${encodeURIComponent(JSON.stringify(user))}`);
//         } catch (error) {
//             console.error("OAuth callback error: ", error);
//             res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=Authentication%20failed`)
//         }
//     }
// );

// app.get('/auth/github', 
//     passport.authenticate('github', {scope: ['user:email']})
// );

// app.get('/auth/github/callback',
//     passport.authenticate('github', {failureRedirect: '/login'}),
//     async (req, res)=>{
//         try {
//             const user = req.user;
//             const accessToken = jwt.sign(user, ACCESS_TOKEN_SECRET, {expiresIn: ACCESS_TOKEN_EXPIRY});
//             const refreshToken = jwt.sign(user, REFRESH_TOKEN_SECRET, {expiresIn: REFRESH_TOKEN_EXPIRY});

//             await storeRefreshToken(refreshToken, user.id, REFRESH_TOKEN_EXPIRY);

//             const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
//             res.redirect(`${frontendUrl}/oauth-callback?` + 
//                 `accessToken=${accessToken}&` +
//                 `refreshToken=${refreshToken}&` +
//                 `user=${encodeURIComponent(JSON.stringify(user))}`);
//         } catch (error) {
//             console.error("OAuth callback error: ", error);
//             res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=Authentication%20failed`);
//         }
//     }
// )


// app.listen(PORT, ()=>{
//     console.log(`server is running on http://localhost:${PORT}`);
// })



// //wrote for checking database tables
// // client.query(`
// //     SELECT column_name, data_type
// //     FROM information_schema.columns
// //     WHERE table_name = 'tags' ;
// // `, (err, result)=>{
// //     if(err){
// //         console.log('Error checking table structure: ', err);
// //     }else{
// //         console.log('Table structure: ', result.rows);
// //     }
// // });
