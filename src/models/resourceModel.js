import pool from '../config/db.js';
import {v4 as uuidv4} from 'uuid';


export async function getResources(limit=20, offset=0, sortBy='vote_count') {
    const validSortOptions = {
        'vote_count': '((SELECT COUNT(*) FROM votes v WHERE v.resource_id=r.id AND vote_type=\'up\') - (SELECT COUNT(*) FROM votes v WHERE v.resource_id=r.id AND vote_type=\'down\')) DESC',
        'newest': 'r.created_at DESC',
        'bookmarks': 'bookmark_count DESC'
    };

    const sortOption = validSortOptions[sortBy] || validSortOptions['vote_count'];

    const query = `
    SELECT r.*,
    (SELECT COUNT(*) FROM votes v WHERE v.resource_id=r.id AND vote_type='up') - 
    (SELECT COUNT(*) FROM votes v WHERE v.resource_id=r.id AND vote_type='down') as vote_count,
    (SELECT COUNT(*) FROM comments c WHERE c.resource_id=r.id) as comment_count,
    (SELECT COUNT(*) FROM bookmarks b WHERE b.resource_id=r.id) as bookmark_count, 
    u.username as author_username,
    (SELECT json_agg(t.tag_name) FROM resource_tags rt
     JOIN tags t ON rt.tag_id = t.id
     WHERE rt.post_id = r.id) as tags
    FROM resource_posts r
    JOIN users u ON r.user_id = u.id
    ORDER BY ${sortOption}
    LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    return result.rows;
}

export async function createPost(postData) {
    const {postTitle, postDescription, userId, category, resources=[], tags=[]} = postData;
    const postId = uuidv4();

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        await client.query(
            "INSERT INTO resource_posts (id, post_title, post_description, user_id, category_id, vote_count, comment_count, created_at) VALUES($1, $2, $3, $4, $5, 0, 0, NOW())", 
            [postId, postTitle, postDescription, userId, category]
        );

        for(const resource of resources){
            const resourceId = uuidv4();

            await client.query(
                "INSERT INTO resources (id, name, url, description, thumbnail_url, favicon_url, site_name) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                [
                    resourceId, 
                    resource.title, 
                    resource.url, 
                    resource.description,
                    resource.thumbnail_url, 
                    resource.favicon_url,   
                    resource.site_name      
                ]
            );

            await client.query(
                "INSERT INTO post_resources (post_id, resource_id) VALUES ($1, $2)", [postId, resourceId]
            );
        }

        if(tags && tags.length > 0){
            for(const tagName of tags){
                const tagResult = await client.query(
                    "SELECT id FROM tags WHERE tag_name=$1", 
                    [tagName]
                );
                
                let tagId;
                if(tagResult.rows.length === 0){
                    tagId = uuidv4();
                    await client.query(
                        "INSERT INTO tags (id, tag_name) VALUES ($1, $2)", [tagId, tagName]
                    );
                }else{
                    tagId = tagResult.rows[0].id;
                }

                await client.query(
                    "INSERT INTO resource_tags (post_id, tag_id) VALUES ($1, $2)", [postId, tagId]
                );
            }
        }

        await client.query('COMMIT');

        return {
            success: true,
            postId,
            resourceCount: resources.length
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error creating resource:", error);
        throw error;
    } finally{
        client.release();
    }
};

export async function editPost(postId, updates) {
    const  {postTitle, postDescription, category, addResources, updateResources, removeResources, addTags, removeTags} = updates;
    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        if(postTitle || postDescription || category){
            await client.query(
                `UPDATE resource_posts
                SET post_title = COALESCE($1, post_title),
                    post_description = COALESCE($2, post_description),
                    category_id = COALESCE($3, category_id)
                WHERE id = $4`,
                [postTitle, postDescription, category, postId]
            );
        }

        if(addResources && addResources.length > 0){
            for(const resource of addResources){
                const resourceId = uuidv4();
                await client.query(
                    "INSERT INTO resources (id, name, url, description) VALUES ($1, $2, $3, $4)", [resourceId, resource.title, resource.url, resource.description]
                );

                await client.query(
                    "INSERT INTO post_resources (post_id, resource_id) VALUES ($1, $2)", [postId, resourceId]
                );
            }
        }

        if(updateResources && updateResources.length > 0){
            for(const resource of updateResources){
                await client.query(
                    `UPDATE resources
                    SET name = COALESCE($1, name),
                        url = COALESCE($2, url),
                        description = COALESCE($3, description),
                        thumbnail_url = COALESCE($4, thumbnail_url),
                        favicon_url = COALESCE($5, favicon_url),
                        site_name = COALESCE($6, site_name)
                    WHERE id = $7`, 
                    [
                        resource.title, 
                        resource.url, 
                        resource.description, 
                        resource.thumbnail_url,
                        resource.favicon_url,
                        resource.site_name,
                        resource.id
                    ]
                );
            }
        }

        if(removeResources && removeResources.length > 0){
            for(const resourceId of removeResources){
                await client.query(
                    "DELETE FROM post_resources WHERE post_id = $1 AND resource_id = $2",
                    [postId, resourceId]
                );

                const usageCheck = await client.query(
                    "SELECT COUNT(*) FROM post_resources WHERE resource_id = $1", [resourceId]
                );

                if(parseInt(usageCheck.rows[0].count) === 0){
                    await client.query(
                        "DELETE FROM resources WHERE id = $1", [resourceId]
                    );
                }
            }
        }

        if(addTags && addTags.length > 0){
            for(const tagName of addTags){
                const tagResult = await client.query(
                    "SELECT id FROM tags WHERE tag_name = $1", [tagName]
                );
                
                let tagId;
                if(tagResult.rows.length === 0){
                    tagId = uuidv4();

                    await client.query(
                        "INSERT INTO tags (id, tag_name) VALUES ($1, $2)",
                        [tagId, tagName]
                    );
                }else{
                    tagId = tagResult.rows[0].id;
                }

                await client.query(
                    "INSERT INTO resource_tags (post_id, tag_id) VALUES ($1, $2)", [postId, tagId]
                );
            }
        }

        if(removeTags && removeTags.length > 0){
            for(const tagName of removeTags){
                const tagResult = await client.query(
                    "SELECT id FROM tags WHERE tag_name = $1", [tagName]
                );

                if(tagResult.rows.length !== 0){
                    const tagId = tagResult.rows[0].id;
                    await client.query(
                        "DELETE FROM resource_tags WHERE post_id = $1 AND tag_id = $2", [postId, tagId]
                    );

                    const usageTag = await client.query(
                        "SELECT COUNT(*) FROM tags WHERE id = $1", [tagId]
                    );

                    if(parseInt(usageTag.rows[0].count) === 0){
                        await client.query(
                            "DELETE FROM tags WHERE id = $1", [tagId]
                        );
                    }
                }
            }
        }

        await client.query('COMMIT');
        return { success:true }
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error editing post:", error);
        throw error;
    } finally {
        client.release();
    }
};

export async function getPost(postId) {
    const query = `
    SELECT 
        p.*,
        c.id as category_id,
        c.name as category_name,
        (SELECT COUNT(*) FROM votes WHERE resource_id = p.id AND vote_type = 'up') - 
        (SELECT COUNT(*) FROM votes WHERE resource_id = p.id AND vote_type = 'down') as vote_count,
        u.username as author_username,
        json_agg(json_build_object(
            'id', r.id,
            'title', r.name,
            'description', r.description,
            'url', r.url,
            'thumbnail_url', r.thumbnail_url,
            'favicon_url', r.favicon_url,
            'site_name', r.site_name
        )) as resources,
        (SELECT json_agg(t.tag_name) FROM resource_tags rt 
         JOIN tags t ON rt.tag_id = t.id 
         WHERE rt.post_id = p.id) as tags
    FROM resource_posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN post_resources pr ON p.id = pr.post_id
    LEFT JOIN resources r ON pr.resource_id = r.id
    WHERE p.id = $1
    GROUP BY p.id, u.username, c.id
    `;
    
    const result = await pool.query(query, [postId]);
    return result.rows[0];
};

export async function voteOnPost(userId, postId, voteType) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existingVote = await client.query(
            "SELECT * FROM votes WHERE user_id = $1 AND resource_id = $2", [userId, postId]
        );

        if(existingVote.rows.length > 0){
            if(existingVote.rows[0].vote_type !== voteType){
                await client.query(
                    "UPDATE votes SET vote_type = $1, created_at = NOW() WHERE id=$2", [voteType, existingVote.rows[0].id]
                );
            }else{
                await client.query(
                    "DELETE FROM votes WHERE id=$1", [existingVote.rows[0].id]
                );
            }
        }else{
            await client.query(
                "INSERT INTO votes (id, user_id, resource_id, vote_type, created_at) VALUES ($1, $2, $3, $4, NOW())", [uuidv4(), userId, postId, voteType]
            );
        }

        await client.query('COMMIT');
        return {
            success: true
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error voting on post: ", error);
        throw error;
    } finally{
        client.release();
    }
};

export async function toggleBookmark(userId, postId) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existingBookmark = await client.query(
            "SELECT * FROM bookmarks WHERE user_id = $1 AND resource_id = $2", [userId, postId]
        );

        if(existingBookmark.rows.length > 0){
            await client.query(
                "DELETE FROM bookmarks WHERE id = $1",
                [existingBookmark.rows[0].id]
            );

            await client.query('COMMIT');

            return {
                success: true,
                action: 'removed'
            };
        }else{
            await client.query(
                "INSERT INTO bookmarks (id, user_id, resource_id, created_at) VALUES ($1, $2, $3, NOW())", [uuidv4(), userId, postId]
            );

            await client.query('COMMIT');
            return {
                success: true,
                action: 'added'
            };
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error toggling bookmark:", error);
        throw error;
    } finally{
        client.release();
    }
};

export async function addComment(userId, postId, comment) {
    const client = await pool.connect();
    const commentId = uuidv4();

    try {
        await client.query('BEGIN');

        await client.query(
            "INSERT INTO comments (id, user_id, resource_id, comment, like_count, created_at) VALUES ($1, $2, $3, $4, 0, NOW())", [commentId, userId, postId, comment]
        );

        await client.query(
            "UPDATE resource_posts SET comment_count = comment_count + 1 WHERE id = $1", [postId]
        );

        await client.query('COMMIT');
        return {
            success: true,
            commentId
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error adding comment:", error);
        throw error;
    } finally{
        client.release();
    }
};

export async function getPostComments(postId, limit=20, offset=0) {
    const query = `
    SELECT c.*, u.username as author_username
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.resource_id = $1
    ORDER BY c.created_at DESC
    LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [postId, limit, offset]);
    return result.rows;
};

export async function searchResources(searchTerm, limit=20) {
    const query = `
    SELECT r.*,
    (SELECT COUNT(*) FROM votes WHERE resource_id=r.id AND vote_type='up') - 
    (SELECT COUNT(*) FROM votes WHERE resource_id=r.id AND vote_type='down') as vote_count,
    (SELECT COUNT(*) FROM comments WHERE resource_id = r.id) as comment_count,
    (SELECT COUNT(*) FROM bookmarks WHERE resource_id=r.id) as bookmark_count, 
    u.username as author_username
    FROM resource_posts r
    JOIN users u ON r.user_id = u.id
    WHERE 
        r.post_title ILIKE $1 OR
        r.post_description ILIKE $1 OR
        EXISTS (
            SELECT 1 FROM tags t
            JOIN resource_tags rt ON rt.tag_id = t.id
            WHERE rt.post_id = r.id AND t.tag_name ILIKE $1
        )
    ORDER BY r.created_at DESC
    LIMIT $2
    `;
    
    const result = await pool.query(query, [`%${searchTerm}%`, limit]);
    return result.rows;
}

export async function getUserResources(userId, limit=20, offset=0) {
    const query = `
      SELECT r.*,
        (SELECT COUNT(*) FROM votes WHERE resource_id=r.id AND vote_type='up') - 
        (SELECT COUNT(*) FROM votes WHERE resource_id=r.id AND vote_type='down') as vote_count,
        (SELECT COUNT(*) FROM comments WHERE resource_id = r.id) as comment_count,
        (SELECT COUNT(*) FROM bookmarks WHERE resource_id=r.id) as bookmark_count, 
        u.username as author_username
      FROM resource_posts r
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

export async function getPopularTags(limit = 10) {
    const query = `
        SELECT t.tag_name, COUNT(rt.tag_id) as count
        FROM tags t
        JOIN resource_tags rt ON t.id = rt.tag_id
        GROUP BY t.tag_name
        ORDER BY count DESC
        LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
}

export async function getCategories() {
    try {
        const query = `
        SELECT id, name
        FROM categories
        ORDER BY name ASC
        `;

        const result = await pool.query(query);
        if(result.rows.length > 0){
            return result.rows;
        }else{
            return [
                { id: 'frontend', name: 'Frontend Development', description: 'Resources for frontend technologies' },
                { id: 'backend', name: 'Backend Development', description: 'Server-side programming and APIs' },
                { id: 'devops', name: 'DevOps', description: 'Deployment, CI/CD, and infrastructure' },
                { id: 'mobile', name: 'Mobile Development', description: 'iOS, Android and cross-platform apps' },
                { id: 'design', name: 'UI/UX Design', description: 'User interface and experience design' },
                { id: 'database', name: 'Database', description: 'SQL, NoSQL and data management' },
                { id: 'security', name: 'Security', description: 'Web security and best practices' },
                { id: 'career', name: 'Career', description: 'Professional development for developers' }
            ];
        }
    } catch (error) {
        console.error("Error fetching categories:", error);
        throw error;
    }
}

export async function checkSimilarResources(url) {
    try {
        let domain = '';

        try {
            const urlObj = new URL(url);
            domain = urlObj.hostname;
        } catch (error) {
            console.error("Invalid URL format: ", error);
            domain = url;
        }

        const query = `
        SELECT
            p.id,
            p.post_title as title,
            p.created_at,
            u.username as author_username
        FROM resources r
        JOIN post_resources pr ON r.id = pr.resource_id
        JOIN resource_posts p ON pr.post_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE r.url = $1
        OR r.url LIKE $2
        GROUP BY p.id, u.username
        LIMIT 5
        `;

        const result = await pool.query(query, [url, `%${domain}%`]);
        return result.rows;
    } catch (error) {
        console.error("Error checking similar resources:", error);
        throw error;
    }
}

export async function incrementViewCount(postId, userId = null) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if (userId) {
            const viewExists = await client.query(
                `SELECT id FROM resource_views
                WHERE resource_id = $1 AND user_id = $2
                AND viewed_at > NOW() - INTERVAL '24 hours'`,
                [postId, userId]
            );

            if (viewExists.rows.length === 0) {
                await client.query(
                    `UPDATE resource_posts
                    SET view_count = view_count + 1
                    WHERE id = $1`,
                    [postId]
                );

                const viewId = uuidv4();
                await client.query(
                    `INSERT INTO resource_views (id, resource_id, user_id, viewed_at) VALUES ($1, $2, $3, NOW())`,
                    [viewId, postId, userId]
                );
            }
        } else {
            await client.query(
                `UPDATE resource_posts
                SET view_count = view_count + 1
                WHERE id = $1`,
                [postId]
            );
        }

        await client.query('COMMIT');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error incrementing view count:", error);
        throw error;
    } finally {
        client.release();
    }
}

export async function getUserVoteOnResource(userId, postId) {
    try {
        const query = `
            SELECT vote_type
            FROM votes
            WHERE user_id = $1 AND resource_id = $2
        `;

        const result = await pool.query(query, [userId, postId]);

        if(result.rows.length === 0){
            return {voteType: null};
        }

        return {
            voteType: result.rows[0].vote_type
        }
    } catch (error) {
        console.error("Error getting user vote:", error);
        throw error;
    }
}

export async function getBookmarkStatus(userId, postId) {
    try {
        const query = `
            SELECT id
            FROM bookmarks
            WHERE user_id = $1 AND resource_id = $2
        `;

        const result = await pool.query(query, [userId, postId]);

        return {isBookmarked: result.rows.length > 0};
    } catch (error) {
        console.error("Error checking bookmark status:", error);
        throw error;
    }
}

export async function getUserResourceCount(userId) {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM resource_posts WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || { count: 0 };
  } catch (error) {
    console.error('Error getting user resource count:', error);
    throw error;
  }
}

export async function searchResourcesByTag(tagName, limit=20) {
    const query = `
    SELECT r.*,
    (SELECT COUNT(*) FROM votes WHERE resource_id=r.id AND vote_type='up') - 
    (SELECT COUNT(*) FROM votes WHERE resource_id=r.id AND vote_type='down') as vote_count,
    (SELECT COUNT(*) FROM comments WHERE resource_id = r.id) as comment_count,
    (SELECT COUNT(*) FROM bookmarks WHERE resource_id=r.id) as bookmark_count, 
    u.username as author_username,
    (SELECT json_agg(t.tag_name) FROM resource_tags rt
     JOIN tags t ON rt.tag_id = t.id
     WHERE rt.post_id = r.id) as tags
    FROM resource_posts r
    JOIN users u ON r.user_id = u.id
    WHERE EXISTS (
        SELECT 1 FROM tags t
        JOIN resource_tags rt ON rt.tag_id = t.id
        WHERE rt.post_id = r.id AND t.tag_name ILIKE $1
    )
    ORDER BY 
        (SELECT COUNT(*) FROM votes WHERE resource_id=r.id AND vote_type='up') - 
        (SELECT COUNT(*) FROM votes WHERE resource_id=r.id AND vote_type='down') DESC
    LIMIT $2
    `;

    const result = await pool.query(query, [tagName, limit]);
    return result.rows;
}