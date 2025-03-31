import pool from '../config/db.js';

export async function storeRefreshToken(token, userId, expiresIn) {
  const expiryValue = parseInt(expiresIn);
  const expiryUnit = expiresIn.slice(-1);

  let expiresAt = new Date();
  if (expiryUnit === 'd') expiresAt.setDate(expiresAt.getDate() + expiryValue);
  else if (expiryUnit === 'h') expiresAt.setHours(expiresAt.getHours() + expiryValue);
  else if (expiryUnit === 'm') expiresAt.setMinutes(expiresAt.getMinutes() + expiryValue);

  const query = "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)";
  await pool.query(query, [token, userId, expiresAt]);
}

export async function findRefreshToken(token) {
  const query = "SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW() AND revoked = false";
  const result = await pool.query(query, [token]);
  return result.rows[0];
}

export async function deleteRefreshToken(token) {
  const query = "UPDATE refresh_tokens SET revoked = TRUE, revoked_reason = 'User logout' WHERE token = $1";
  await pool.query(query, [token]);
}

export async function deleteUserRefreshTokens(userId) {
  const query = "UPDATE refresh_tokens SET revoked = TRUE, revoked_reason = 'User initiated logout all' WHERE user_id = $1 AND revoked = FALSE";
  await pool.query(query, [userId]);
}

export async function cleanupExpiredTokens() {
  const query = "DELETE FROM refresh_tokens WHERE expires_at < NOW()";
  await pool.query(query);
}