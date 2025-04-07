import * as userModel from '../models/userModel.js';
import * as resourceModel from '../models/resourceModel.js';
import * as uploadController from '../controllers/uploadController.js';
import bcrypt from 'bcrypt'

export async function getProfile(req, res) {
    try {
        const userId = req.user.id;
        const user = await userModel.findUserById(userId);

        if(!user){
            return res.status(404).json({
                error: "User not found"
            });
        }

        const safeUserData = {
            id: user.id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            description: user.description,
            photo: user.photo,
            location: user.location, 
            social_links: user.social_links, 
            created_at: user.created_at,
            updated_at: user.updated_at,
            last_login: user.last_login
        };
        
        res.json(safeUserData);

    } catch (error) {
         console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
}

export async function updateProfile(req, res) {
    try {
        const userId = req.user.id;
        const {username, fullname, description, photo, social_links, location} = req.body;

        const existingUser = await userModel.findUserById(userId);

        if(!existingUser){
            return res.status(404).json({
                error: "User not found"
            });
        }

        if(username && username !== existingUser.username){
            const usernameExists = await userModel.findUserByUsername(username);
            if(usernameExists){
                return res.status(409).json({
                    error: "username already taken"
                });
            }
        }

        console.log(req.body.social_links);
        
        if(req.body.social_links){
            if(typeof req.body.social_links === 'string'){
                try {
                    req.body.social_links = JSON.parse(req.body.social_links);
                } catch (error) {
                    req.body.social_links = []
                }
            }

            if(Array.isArray(req.body.social_links)){
                try {
                    const jsonString = JSON.stringify(req.body.social_links);
                    JSON.parse(jsonString);
                } catch (error) {
                    console.error('Invalid social_links JSON structure:', error);
                    req.body.social_links = [];
                }
            }
        }

        console.log(req.body.social_links);

        if (Array.isArray(req.body.social_links)) {

            const cleanLinks = req.body.social_links.map(link => {
                return {
                    name: String(link.name).trim(),
                    url: link.url
                };
            });
            
            req.body.social_links = cleanLinks;
        }

        const socialLinksJson = JSON.stringify(req.body.social_links || []);

        const updateUser = await userModel.updateUser(userId, {
            username,
            fullname,
            description,
            photo,
            social_links: socialLinksJson,
            location
        });

        const safeUserData = {
            id: updateUser.id,
            username: updateUser.username,
            email: updateUser.email,
            fullname: updateUser.fullname,
            description: updateUser.description,
            photo: updateUser.photo,
            social_links: updateUser.social_links,
            location: updateUser.location,
            created_at: updateUser.created_at,
            updated_at: updateUser.updated_at
        };

        res.json(safeUserData);
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
}

export async function getPublicProfile(req, res) {
    try {
        const {username} = req.params;
        const user = await userModel.findUserByUsername(username);

        if(!user){
            return res.status(404).json({
                error: "User not found"
            });
        }

        const publicUserData = {
            id: user.id,
            username: user.username,
            fullname: user.fullname,
            description: user.description,
            photo: user.photo,
            location: user.location, 
            social_links: user.social_links || [], 
            created_at: user.created_at,
            updated_at: user.updated_at, 
            last_login: user.last_login 
        };
        // console.log(publicUserData);
        

        res.json(publicUserData);
    } catch (error) {
        console.error('Error fetching public profile:', error);
        res.status(500).json({ error: 'Failed to fetch public profile' });
    }
}

export async function getUserResources(req, res) {
    try {
        const {username} = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const user = await userModel.findUserByUsername(username);
        if(!user){
            return res.status(404).json({
                error: "User not found"
            });
        }

        const resources = await resourceModel.getUserResources(user.id, limit, offset);

        res.json(resources);
    } catch (error) {
        console.error('Error fetching user resources:', error);
        res.status(500).json({ error: 'Failed to fetch user resources' });
    }
}

export async function trackUserActivity(req, res, next) {
    try {
        if(req.user && req.user.id){
            userModel.updateLastActive(req.user.id).catch(err => {
                console.error("Error updating last active status: ", err);
            });
        }

        next();
    } catch (error) {
        console.error('Activity tracking error:', error);
        next();
    }
}

export async function getUserViewedTags(req, res) {
    try {
        const { username } = req.params;
        
        const user = await userModel.findUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const viewedTags = await userModel.getUserViewedTags(user.id);
        res.json(viewedTags);
    } catch (error) {
        console.error('Error fetching user viewed tags:', error);
        res.status(500).json({ error: 'Failed to fetch user viewed tags' });
    }
};

export async function getAllUsers(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const data = await userModel.getAllUsers(limit, offset);

        res.json(data);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}

export async function savePreferences(req, res) {
    try {
        const userId = req.user.id;
        const {tags, categories} = req.body;

        if((!tags || !Array.isArray(tags)) && (!categories || !Array.isArray(categories))){
            return res.status(400).json({
                error: "Tags or categories must be provided as an array"
            });
        }
        const result = await userModel.updateUserPreferences(userId, tags, categories);

        res.json({
            success: true,
            preferences: result
        });
    } catch (error) {
        console.error('Error saving user preferences:', error);
        res.status(500).json({ error: 'Failed to save preferences' });
    }
}

export async function getUserPreferences(req, res) {
    try {
        const userId = req.user.id;
        const preferences = await userModel.getUserPreferences(userId);

        res.json(preferences);
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
}

export async function getUserWeeklyStats(req, res) {
    try {
        const userId = req.user.id;
        const stats = await userModel.getUserWeeklyStats(userId);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching user weekly stats:', error);
        res.status(500).json({ error: 'Failed to fetch weekly stats' });    
    }
}