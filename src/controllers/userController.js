import * as userModel from '../models/userModel.js';
import * as resourceModel from '../models/resourceModel.js';

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
            location: user.location, // Add location field
            social_links: user.social_links, // This is already handled as JSON
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
        const {username, fullname, description, photo, social_links} = req.body;

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

        const updateUser = await userModel.updateUser(userId, {
            username,
            fullname,
            description,
            photo,
            social_links
        });

        const safeUserData = {
            id: updateUser.id,
            username: updateUser.username,
            email: updateUser.email,
            fullname: updateUser.fullname,
            description: updateUser.description,
            photo: updateUser.photo,
            social_links: updateUser.social_links,
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
        console.log(publicUserData);
        

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