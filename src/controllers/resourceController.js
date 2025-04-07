import * as resourceModel from '../models/resourceModel.js';
import { parse } from 'node-html-parser';
import fetch from 'node-fetch'
import pool from '../config/db.js';
import { calculateSimilarity } from '../utils/stringUtils.js';
import * as notificationModel from '../models/notificationModel.js';

export async function getResources(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const sortBy = req.query.sortBy || 'vote_count';

        const result = await resourceModel.getResources(limit, offset, sortBy);
        res.json(result); 
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

export async function createResource(req, res, next) {
    try {
        const {postTitle, postDescription, category, resources, tags} = req.body;
        const userId = req.user.id;

        let category_name = 'Uncategorized';
        if (category) {
            try {
                const categoryResult = await pool.query('SELECT name FROM categories WHERE id = $1', [category]);
                if (categoryResult.rows.length > 0) {
                    category_name = categoryResult.rows[0].name;
                }
            } catch (err) {
                console.error("Error fetching category name:", err);
            }
        }

        const result = await resourceModel.createPost({
            postTitle,
            postDescription,
            userId,
            category,
            resources,
            tags,
            category_name 
        });

        if (tags && tags.length > 0) {
            const tagQuery = "SELECT id FROM tags WHERE tag_name = ANY($1)";
            const tagResult = await pool.query(tagQuery, [tags]);
            const tagIds = tagResult.rows.map(row => row.id);
            
            if (tagIds.length > 0) {
                await notificationModel.createSimilarResourceNotification(req, result.postId, tagIds);
            }
        }

        res.status(201).json(result);
        next(); 
    } catch (error) {
        console.error('Error creating resource:', error);
        res.status(500).json({ error: 'Failed to create resource' });
    }
}

export async function updateResource(req, res) {
    try {
        const postId = req.params.id;
        const updates = req.body;
        const userId = req.user.id;

        const resource = await resourceModel.getPost(postId);

        if(!resource){
            return res.status(404).json({
                error: "Resource not found"
            })
        }

        console.log("Existing resource: ", resource);
        console.log("Updates: ", updates);
        

        if(resource.user_id !== userId){
            return res.status(403).json({ error: 'You can only edit your own resources' });
        }

        const formattedUpdates = {
            postTitle: updates.postTitle,
            postDescription: updates.postDescription,
            category: updates.category
        };

        if (updates.resources && updates.resources.length > 0) {
            const existingResources = resource.resources || [];
            const existingIds = existingResources.map(r => r.id);
            
            formattedUpdates.updateResources = updates.resources
                .filter(res => res.id && existingIds.includes(res.id))
                .map(res => {
                    const existingResource = existingResources.find(er => er.id === res.id);
                    
                    return {
                        id: res.id,
                        title: res.title,
                        url: res.url,
                        description: res.description,
                        thumbnail_url: res.thumbnail_url !== undefined ? res.thumbnail_url : existingResource.thumbnail_url,
                        favicon_url: res.favicon_url !== undefined ? res.favicon_url : existingResource.favicon_url,
                        site_name: res.site_name !== undefined ? res.site_name : existingResource.site_name
                    };
                });
                
            formattedUpdates.addResources = updates.resources
                .filter(res => !res.id || !existingIds.includes(res.id))
                .map(res => ({
                    title: res.title,
                    url: res.url,
                    description: res.description,
                    thumbnail_url: res.thumbnail_url,
                    favicon_url: res.favicon_url,
                    site_name: res.site_name
                }));
            
            const updatedIds = updates.resources
                .filter(res => res.id)
                .map(res => res.id);
            
            formattedUpdates.removeResources = existingIds
                .filter(id => !updatedIds.includes(id));
        }

        if (updates.tags) {
            const existingTags = resource.tags || [];
            formattedUpdates.addTags = updates.tags
                .filter(tag => !existingTags.includes(tag));
            formattedUpdates.removeTags = existingTags
                .filter(tag => !updates.tags.includes(tag));
        }

        console.log("Formatted updates for backend:", formattedUpdates);

        const result = await resourceModel.editPost(postId, formattedUpdates);
        
        await notificationModel.createResourceUpdateNotification(req, postId, userId);
        
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

        if(!['up', 'down', 'none'].includes(voteType)){
            return res.status(400).json({
                error: "Invalid vote type"
            });
        }

        const result = await resourceModel.voteOnPost(userId, postId, voteType);
        
        if (voteType === 'up') {
            await notificationModel.createVoteNotification(req, postId, userId, 'added');
        } else{
            await notificationModel.createVoteNotification(req, postId, userId, 'removed');
        }
        
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
        
        await notificationModel.createCommentNotification(req, postId, userId, comment);

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
        const {q, tag, category} = req.query;
        const limit = parseInt(req.query.limit) || 20;
        
        let results;

        if(tag){
            results = await resourceModel.searchResourcesByTag(tag, limit);
        } else if (category){
            results = await resourceModel.searchResourcesByCategory(category, limit);
        } else if(q){
            results = await resourceModel.searchResources(q, limit);
        } else {
            return res.status(400).json({
                error: "Search query 'q' or 'tag' or 'category' is required"
            });
        }

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

export async function checkSimilarity(req, res) {
    try {
        const {url} = req.query;

        if(!url){
            return res.status(400).json({
                error: "URL parameter is required"
            });
        }

        const similar = await resourceModel.checkSimilarResources(url);
        res.json({similar});
    } catch (error) {
        console.error('Error checking similarity:', error);
        res.status(500).json({ error: 'Failed to check similarity' });
    }
}

export async function extractUrlMetadata(req, res) {
    try {
        const {url} = req.query;

        if(!url){
            return res.status(400).json({
                error: "URL parameter is required"
            });
        }

        if(url.includes('youtube.com/watch') || url.includes('youtu.be/')){
            let videoId = '';
            if(url.includes('youtube.com/watch')){
                videoId = new URL(url).searchParams.get('v');
            } else if(url.includes('youtu.be/')){
                videoId = url.split('youtu.be/')[1].split('?')[0];
            }
            
            if(videoId){
                return res.json({
                    success: true,
                    metadata: {
                        title: "YouTube Video",
                        description: "",
                        image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                        favicon: "https://www.youtube.com/favicon.ico",
                        siteName: "YouTube"
                    }
                });
            }
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = await response.text();
        const root = parse(html);

        const metadata = {
            title: '',
            description: '',
            image: '',
            favicon: '',
            siteName: ''
        };

        const ogTitle = root.querySelector('meta[property="og:title"]');
        const titleTag = root.querySelector('title');
        metadata.title = ogTitle ? ogTitle.getAttribute('content') : (titleTag ? titleTag.text : '');

        const ogDesc = root.querySelector('meta[property="og:description"]');
        const metaDesc = root.querySelector('meta[name="description"]');
        metadata.description = ogDesc ? ogDesc.getAttribute('content') : (metaDesc ? metaDesc.getAttribute('content') : '');

        const ogImage = root.querySelector('meta[property="og:image"]');
        metadata.image = ogImage ? ogImage.getAttribute('content') : '';

        let favicon = root.querySelector('link[rel="icon"]') || 
                      root.querySelector('link[rel="shortcut icon"]') ||
                      root.querySelector('link[rel="apple-touch-icon"]');

        if(favicon){
            let faviconUrl = favicon.getAttribute('href');

            if(faviconUrl && !faviconUrl.startsWith('http')){
                const urlObj = new URL(url);
                
                if(faviconUrl.startsWith('/')){
                    faviconUrl = `${urlObj.protocol}//${urlObj.host}${faviconUrl}`;
                }else{
                    faviconUrl = `${urlObj.protocol}//${urlObj.host}/${faviconUrl}`;
                }
            }
            metadata.favicon = faviconUrl;
        }else{
            const urlObj = new URL(url);
            metadata.favicon = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
        }

        const ogSite = root.querySelector('meta[property="og:site_name"]');
        if(ogSite){
            metadata.siteName = ogSite.getAttribute('content');
        }else{
            const urlObj = new URL(url);
            metadata.siteName = urlObj.hostname.replace('www.', '');
        }

        res.json({
            success: true,
            metadata
        })
    } catch (error) {
        console.error('Error extracting metadata:', error);
        res.status(500).json({ error: 'Failed to extract metadata' });
    }
}

export async function recordView(req, res) {
    try {
        const postId = req.params.id;
        const userId = req.user ? req.user.id : null;

        await resourceModel.incrementViewCount(postId, userId);

        res.json({
            success: true
        });
    } catch (error) {
        console.error('Error recording view:', error);
        res.status(500).json({ error: 'Failed to record view' });
    }
}

export async function getUserVote(req, res) {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const result = await resourceModel.getUserVoteOnResource(userId, postId);
        res.json(result);

    } catch (error) {
        console.error('Error getting user vote:', error);
        res.status(500).json({ error: 'Failed to get user vote' });
    }
}

export async function getBookmarkStatus(req, res) {
    try {
        
        const postId = req.params.id;
        const userId = req.user.id;

        const result = await resourceModel.getBookmarkStatus(userId, postId);
        res.json(result);
    } catch (error) {
        console.error('Error checking bookmark status:', error);
        res.status(500).json({ error: 'Failed to check bookmark status' });
    }
}

export async function getUserBookmarks(req, res) {
    try {
        const userId = req.user.id;

        const bookmarkedResources = await resourceModel.getUserBookmarks(userId);

        res.json(bookmarkedResources);
    } catch (error) {
        console.error('Error fetching user bookmarks:', error);
        res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
}

export async function findOrCreateTag(req, res) {
    try {
        const {tagName} = req.body;

        if(!tagName || typeof tagName !== 'string'){
            return res.status(400).json({
                error: "Tag name is required"
            });
        }

        const normalizedTag = tagName.toLowerCase().trim();

        const exactMatch = await resourceModel.findTagByName(normalizedTag);

        if(exactMatch){
            return res.json({
                tag: exactMatch,
                status: 'exact_match'
            });
        }

        const similarTags = await resourceModel.findSimilarTags(normalizedTag);

        const tagSimilarities = similarTags.map(tag=>{
            const similarity = calculateSimilarity(normalizedTag, tag.tag_name.toLowerCase());
            return {
                ...tag,
                similarity: parseFloat(similarity.toFixed(2))
            };
        });

        const highSimilarityTags = tagSimilarities.filter(tag => tag.similarity >= 0.8);

        if(highSimilarityTags.length > 0){
            return res.json({
                similarTags: highSimilarityTags,
                status: 'similar_found',
                originalTag: normalizedTag
            });
        }

        const newTag = await resourceModel.createTag(normalizedTag);

        res.json({
            tag: newTag,
            status: 'created'
        });
    } catch (error) {
        console.error("Error in tag management: ", error);
        res.status(500).json({
            error: "Failed to process tag"
        });
    }
}

export async function getPersonalizedResources(req, res) {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        
        const result = await resourceModel.getPersonalizedResources(userId, limit, offset);
        res.json(result);
    } catch (error) {
        console.error('Error fetching personalized resources:', error);
        res.status(500).json({ error: 'Failed to fetch personalized resources' });
    }
}

export async function getSimilarResources(req, res) {
    try {
        const { resourceId, tags } = req.query;
        
        if (!resourceId || !tags) {
            return res.status(400).json({ error: 'Both resourceId and tags parameters are required' });
        }
        
        // Parse tags properly, ensuring it's handled as an array
        let tagArray;
        if (typeof tags === 'string') {
            tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
        } else if (Array.isArray(tags)) {
            tagArray = tags;
        } else {
            return res.status(400).json({ error: 'Invalid tags parameter format' });
        }
        
        if (tagArray.length === 0) {
            return res.json([]);
        }
        
        const limit = parseInt(req.query.limit) || 5;
        
        const result = await resourceModel.getSimilarResources(resourceId, tagArray, limit);
        res.json(result);
    } catch (error) {
        console.error('Error fetching similar resources:', error);
        res.status(500).json({ error: 'Failed to fetch similar resources' });
    }
}