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
  const {username, fullname, description, photo, social_links} = userData;

  const query = `
    UPDATE users
    SET
      username = COALESCE($1, username),
      fullname = COALESCE($2, fullname),
      description = COALESCE($3, description),
      photo = COALESCE($4, photo),
      social_links = COALESCE($5, social_links),
      updated_at = NOW()
    WHERE id = $6
    RETURNING *
    `;

    const values = [username, fullname, description, photo, social_links, userId];

    const result = await pool.query(query, values);
    return result.rows[0];
}

export async function updateLastActive(userId) {
  try {
    const query = `
      UPDATE users
      SET last_login = NOW()
      WHERE id = $1
    `;

    await pool.query(query, [userId]);
    return true;
  } catch (error) {
    console.error("Error updating last active status:", error);
    return false;
  }
}
