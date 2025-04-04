import cloudinary from "../config/cloudinaryConfig.js";
import multer from 'multer';
import * as userModel from '../models/userModel'

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {fileSize: 10*1024*1024},
    fileFilter: (req, file, cb)=>{
        if(file.mimetype.startsWith('image/')){
            cb(null, true);
        }else{
            cb(new Error("Only image files are accepted"), false);
        }
    }
}).single('image');

export const handleImageUpload = (req, res, next)=>{
    upload(req, res, (err)=>{
        if(err){
            return res.status(400).json({
                error: err.message
            });
        }
        next();
    });
}

export const uploadImage = async (req, res)=>{
    if(!req.file){
        return res.status(400).json({
            error: "No image file provided"
        });
    }

    try {
        const fileStr = req.file.buffer.toString('base64');
        const fileType = req.file.mimetype;

        const uploadResult = await cloudinary.uploader.upload(
            `data:${fileType};base64,${fileStr}`,
            {
                folder: `resource-base/users/${req.user.id}/profile`,
                public_id: `profile_${Date.now()}`,
                overwrite: true
            }
        );

        res.json({
            success: true,
            imageUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id
        });

        
    } catch (error) {
        console.error("Cloudinary upload error: ", error);
        res.status(500).json({
            error: "Failed to upload image to Cloudinary: " + error.message
        });
    }
};

export const updateProfileWithImage = async (req, res) => {
    if(!req.file){
        return res.status(400).json({
            error: "No image file provided"
        });
    }

    try {
        const fileStr = req.file.buffer.toString('base64');
        const fileType = req.file.mimetype;

        const uploadResult = await cloudinary.uploader.upload(
            `data:${fileType};base64,${fileStr}`,
            {
                folder: `resource-base/users/${req.user.id}/profile`,
                public_id: `profile_${Date.now()}`,
                overwrite: true
            }
        );

        const userData = {...req.body, photo:uploadResult.secure_url};
        const updateUser = await userModel.updateUser(req.user.id, userData);

        res.json({
            success: true,
            imageUrl: uploadResult.secure_url,
            user: {
                id: updateUser.id,
                username: updateUser.username,
                photo: updateUser.photo
            }
        });
    } catch (error) {
        console.error('Error updating profile with image:', error);
        res.status(500).json({ error: 'Failed to upload image and update profile' });
    }
}

export const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
}

export const generateImageUrl = (publicId, options = {}) => {
    return cloudinary.url(publicId, options);
};