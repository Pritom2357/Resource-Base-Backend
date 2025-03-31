import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.js'

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if(!token){
        return res.status(401).json({
            error: "Access token required"
        });
    }

    jwt.verify(token, authConfig.accessToken.secret, (err, user)=>{
        if(err){
            return res.status(403).json({
                error: "Invalid access token"
            });
        }
        req.user = user;
        next();
    })
}

export {authenticateToken};