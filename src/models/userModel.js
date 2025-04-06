import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export async function findUserByEmail(email) {
  const query = "SELECT * FROM users WHERE email = $1";
  const result = await pool.query(query, [email]);
  return result.rows[0];
}

export async function findUserById(id) {
  const query = "SELECT * FROM users WHERE id = $1";
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

export async function findUserByProvider(providerId, providerName) {
  const query = "SELECT * FROM users WHERE provider_id = $1 AND provider_name = $2";
  const result = await pool.query(query, [providerId, providerName]);
  return result.rows[0];
}

export async function createUser(userData) {
  const { username, email, password } = userData;
  const id = uuidv4();
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  const query = "INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING *";
  const result = await pool.query(query, [id, username, email, passwordHash]);
  return result.rows[0];
}

export async function createOAuthUser(userData) {
  const { username, email, providerId, providerName } = userData;
  const id = uuidv4();
  const ssoHash = await bcrypt.hash('SSO_USER_' + providerId, 10);
  
  const query = "INSERT INTO users (id, username, email, provider_id, provider_name, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *";
  const result = await pool.query(query, [id, username, email, providerId, providerName, ssoHash]);
  return result.rows[0];
}

export async function findUserByUsername(username) {
  const query = "SELECT * FROM users WHERE username = $1";
  const result = await pool.query(query, [username]);
  return result.rows[0];
}

export async function updateUser(userId, userData) {
  const {username, fullname, description, photo, social_links, location} = userData;

  const query = `
    UPDATE users
    SET
      username = COALESCE($1, username),
      fullname = COALESCE($2, fullname),
      description = COALESCE($3, description),
      photo = COALESCE($4, photo),
      social_links = COALESCE($5, social_links),
      location = COALESCE($6, location),
      updated_at = NOW()
    WHERE id = $7
    RETURNING *
    `;

    const values = [username, fullname, description, photo, social_links, location, userId];

    const result = await pool.query(query, values);
    return result.rows[0];
}

export async function updateLastActive(userId) {
  try {
    const query = `
      UPDATE users
      SET last_login = NOW()
      WHERE id = $1
      AND (last_login IS NULL OR NOW() - last_login > INTERVAL '5 minutes')
    `;
    
    await pool.query(query, [userId]);
    return true;
  } catch (error) {
    console.error("Error updating last active status:", error);
    return false;
  }
}

export async function getUserViewedTags(userId) {
    try {
        const query = `
            SELECT t.tag_name, COUNT(t.tag_name) as count
            FROM resource_views rv
            JOIN resource_posts rp ON rv.resource_id = rp.id
            JOIN resource_tags rt ON rp.id = rt.post_id
            JOIN tags t ON rt.tag_id = t.id
            WHERE rv.user_id = $1
            GROUP BY t.tag_name
            ORDER BY count DESC
        `;
        
        const result = await pool.query(query, [userId]);
        return result.rows;
    } catch (error) {
        console.error('Error getting user viewed tags:', error);
        return [];
    }
}

export async function updatePassword(userId, newPasswordHash) {
  const query = `
    UPDATE users
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, username, email
  `;

  const result = await pool.query(query, [newPasswordHash, userId]);
  return result.rows[0];
}

export async function getAllUsers(limit = 20, offset = 0) {
   try {
    const query = `
      SELECT
        id, username, photo, location, last_login, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `SELECT COUNT(*) FROM users`;

    const [usersResult, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery)
    ]);

    const userIds = usersResult.rows.map(user => user.id);
    const resourceCountsQuery = `
      SELECT user_id, COUNT(*) as resource_count
      FROM resource_posts
      WHERE user_id = ANY($1)
      GROUP BY user_id
    `;

    const resourceCounts = await pool.query(resourceCountsQuery, [userIds]);

    const resourceCountMap = {};
    resourceCounts.rows.forEach(row => {
      resourceCountMap[row.user_id] = parseInt(row.resource_count)
    });

    const users = usersResult.rows.map(user => ({
      ...user,
      resource_count: resourceCountMap[user.id] || 0
    }));

    return {
      users,
      pagination: {
        totalCount: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count)/limit),
        currentPage: Math.floor(offset/limit) + 1,
        pageSize: limit
      }
    }
   } catch (error) {
    console.error('Error fetching all users:', error);
    throw error;
   }
}
