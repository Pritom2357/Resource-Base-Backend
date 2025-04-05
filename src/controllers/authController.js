import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {v4 as uuidv4} from 'uuid';
import * as userModel from '../models/userModel.js';
import * as tokenModel from '../models/tokenModel.js';
import authConfig from '../config/auth.js';
// import auth from '../config/auth';

export async function register(req, res) {
    try {
        const {username, email, password} = req.body;

        if(!username || !email || !password){
            return res.status(400).json({
                error: "Missing required fields"
            });
        }

        const existingUser = await userModel.findUserByEmail(email);

        if(existingUser){
            return res.status(409).json({
                error: "User already exists"
            });
        }

        const user = await userModel.createUser({username, email, password});

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            userId: user.id
        })
    } catch (error) {
        console.error("Registration error: ", error);
        res.status(500).json({
            error: "Registration failed",
            message: error.message
        })
    }
}

export async function login(req, res) {
    try {
        const { email, password, remember } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Missing required fields"
            });
        }

        const user = await userModel.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const userData = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        const accessTokenExpiry = authConfig.accessToken.expiry;
        const refreshTokenExpiry = remember ? '30d' : authConfig.refreshToken.expiry;

        const accessToken = jwt.sign(userData, authConfig.accessToken.secret, { expiresIn: accessTokenExpiry });
        const refreshToken = jwt.sign(userData, authConfig.refreshToken.secret, { expiresIn: refreshTokenExpiry });

        await tokenModel.storeRefreshToken(refreshToken, user.id, refreshTokenExpiry);

        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            user: userData,
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            error: "Login failed",
            message: error.message
        });
    }
}

export async function refreshToken(req, res) {
    try {
        const {refreshToken} = req.body;

        if(!refreshToken){
            return res.status(401).json({
                error: "Refresh token required"
            });
        }

        const tokenRecord = await tokenModel.findRefreshToken(refreshToken);
        
        if(!tokenRecord){
            return res.status(403).json({
                error: "Invalid or expired refresh token"
            });
        }

        jwt.verify(refreshToken, authConfig.refreshToken.secret, (err, user)=>{
            if(err){
                return res.status(403).json({
                    error: "Invalid refresh token"
                });
            }

            const userData = {
                id: user.id,
                username: user.username,
                email: user.email
            };

            const accessToken = jwt.sign(userData, authConfig.accessToken.secret, {expiresIn: authConfig.accessToken.expiry});

            res.json({
                accessToken
            });
        })
    } catch (error) {
        console.error("Refresh token generation error: ", error);
        res.status(500).json({
            error: "Refresh token error",
            message: error.message
        })
    }
}

export async function logout(req, res) {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await tokenModel.deleteRefreshToken(refreshToken);
        }
        
        res.status(204).send();
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({
            error: "Logout failed",
            message: error.message
        });
    }
}

export async function logoutAll(req, res) {
    try {
        await tokenModel.deleteUserRefreshTokens(req.user.id);
        res.status(204).send();
    } catch (error) {
        console.error("Logout all error:", error);
        res.status(500).json({
            error: "Logout all failed",
            message: error.message
        });
    }
}

export async function googleCallback(req, res) {
    try {
        const user = req.user;
        const accessToken = jwt.sign(user, authConfig.accessToken.secret, { expiresIn: authConfig.accessToken.expiry });
        const refreshToken = jwt.sign(user, authConfig.refreshToken.secret, { expiresIn: authConfig.refreshToken.expiry });

        await tokenModel.storeRefreshToken(refreshToken, user.id, authConfig.refreshToken.expiry);

        const frontendUrl = authConfig.frontend.url;
        res.redirect(
            `${frontendUrl}/oauth-callback?` +
            `accessToken=${accessToken}&` +
            `refreshToken=${refreshToken}&` +
            `user=${encodeURIComponent(JSON.stringify(user))}`
        );
    } catch (error) {
        console.error("OAuth callback error:", error);
        res.redirect(`${authConfig.frontend.url}/login?error=Authentication%20failed`);
    }
}

export async function githubCallback(req, res) {
    try {
        const user = req.user;
        const accessToken = jwt.sign(user, authConfig.accessToken.secret, { expiresIn: authConfig.accessToken.expiry });
        const refreshToken = jwt.sign(user, authConfig.refreshToken.secret, { expiresIn: authConfig.refreshToken.expiry });

        await tokenModel.storeRefreshToken(refreshToken, user.id, authConfig.refreshToken.expiry);

        const frontendUrl = authConfig.frontend.url;
        res.redirect(
            `${frontendUrl}/oauth-callback?` +
            `accessToken=${accessToken}&` +
            `refreshToken=${refreshToken}&` +
            `user=${encodeURIComponent(JSON.stringify(user))}`
        );
    } catch (error) {
        console.error("OAuth callback error:", error);
        res.redirect(`${authConfig.frontend.url}/login?error=Authentication%20failed`);
    }
}


export async function changePassword(req, res) {
    try {
        const userId = req.user.id;
        const {currentPassword, newPassword} = req.body;

        if(!currentPassword || !newPassword){
            return res.status(400).json({
                error: "Both current and new Password are required"
            });
        }

        if(newPassword.length < 8){
            return res.status(400).json({
                error: "New password must be at least 8 characters long"
            });
        }

        const user = await userModel.findUserById(userId);
        if(!user){
            return res.status(404).json({
                error: "User not found"
            });
        }

        const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if(!passwordMatch){
            return res.status(401).json({
                error: "Current password is incorrect"
            });
        }

        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        await userModel.updatePassword(userId, newPasswordHash);

        res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });
    } catch (error) {
        console.error("Password change error:", error);
        res.status(500).json({
            error: "Failed to change password",
            message: error.message
        });
    }
}