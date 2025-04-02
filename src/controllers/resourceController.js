import * as resourceModel from '../models/resourceModel.js'

export async function getResources(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const sortBy = req.query.sortBy || 'vote_count';

        const resources = await resourceModel.getResources(limit, offset, sortBy);

        res.json(resources);
    } catch (error) {
        console.error("Error fetching resources: ", error);
        res.status(500).json({
            error: "Failed to fetch resources"
        });
    }
}

export async function getResource(req, res) {
    try {
        const postId = req.params.id;
        const resource = await resourceModel.getPost(postId);

        if(!resource){
            return res.status(404).json({
                error: "Resource not found"
            });
        }
        res.json(resource);
    } catch (error) {
        console.error('Error fetching resource:', error);
        res.status(500).json({ error: 'Failed to fetch resource' });
    }
}

export async function createResource(req, res) {
    try {
        const {postTitle, postDescription, resources, tags} = req.body;
        const userId = req.user.id;

        const result = await resourceModel.createPost({
            postTitle,
            postDescription,
            userId,
            resources,
            tags
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating resource:', error);
        res.status(500).json({ error: 'Failed to create resource' });
    }
}

export async function updateResource(req, res) {
    try {
        const postId = req.params.id;
        const updates = req.body;

        const resource = await resourceModel.getPost(postId);

        if(!resource){
            return res.status(404).json({
                error: "Resource not found"
            })
        }

        if(resource.user_id !== req.user.id){
            return res.status(403).json({ error: 'You can only edit your own resources' });
        }

        const result = await resourceModel.editPost(postId, updates);
        res.json(result);

    } catch (error) {
        console.error('Error updating resource:', error);
        res.status(500).json({ error: 'Failed to update resource' });
    }
}

export async function voteOnResource(req, res) {
    try {
        const {voteType} = req.body;
        const postId = req.params.id;
        const userId = req.user.id;

        if(!['up', 'down'].includes(voteType)){
            return res.status(400).json({
                error: "Invalid vote type"
            });
        }

        const result = await resourceModel.voteOnPost(userId, postId, voteType);
        res.json(result);
    } catch (error) {
        console.error('Error voting on resource:', error);
        res.status(500).json({ error: 'Failed to vote on resource' });
    }
}

export async function toggleBookmark(req, res) {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const result = await resourceModel.toggleBookmark(userId, postId);
        res.json(result);
    } catch (error) {
        console.error('Error toggling bookmark:', error);
        res.status(500).json({ error: 'Failed to toggle bookmark' }); 
    }
}

export async function addComment(req, res) {
    try {
        const {comment}  = req.body;
        const postId = req.params.id;
        const userId = req.user.id;

        if(!comment){
            return res.status(400).json({ error: 'Comment text is required' });
        }

        const result = await resourceModel.addComment(userId, postId, comment);

        res.json(result);

    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
}

export async function getResourceComments(req, res) {
    try {
        const postId = req.params.id;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const comments = await resourceModel.getPostComments(postId, limit, offset);

        res.json(comments);

    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
}

export async function searchResources(req, res) {
    try {
        const {q} = req.query;
        const limit = parseInt(req.query.limit) || 20;
        
        if(!q){
            return res.status(400).json({
                error: "Search query 'q' is required to initiate search"
            });
        }

        const results = await resourceModel.searchResources(q, limit);
        
        res.json(results);

    } catch (error) {
        console.error('Error searching resources:', error);
        res.status(500).json({ error: 'Failed to search resources' });
    }
}

export async function getPopularTags(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        
        const result = await resourceModel.getPopularTags(limit);
        res.json(result);
    } catch (error) {
        console.error('Error fetching popular tags:', error);
        res.status(500).json({ error: 'Failed to fetch popular tags' });
    }
}

export async function getCategories(req, res) {
    try {
        const categories = await resourceModel.getCategories();
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
}