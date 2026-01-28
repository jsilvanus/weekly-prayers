import { query } from '../db/index.js';

export async function findUserByMicrosoftOid(microsoftOid) {
  const result = await query(
    'SELECT * FROM users WHERE microsoft_oid = $1',
    [microsoftOid]
  );
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function findUserByEmail(email) {
  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

export async function createUser({ microsoftOid, email, name, role = 'user' }) {
  const result = await query(
    `INSERT INTO users (microsoft_oid, email, name, role, last_login)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [microsoftOid, email, name, role]
  );
  return result.rows[0];
}

export async function updateUserLogin(id) {
  const result = await query(
    `UPDATE users SET last_login = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0];
}

export async function updateUser(id, { email, name }) {
  const result = await query(
    `UPDATE users SET email = $1, name = $2
     WHERE id = $3
     RETURNING *`,
    [email, name, id]
  );
  return result.rows[0];
}

export async function findOrCreateUser({ microsoftOid, email, name }) {
  // Try to find existing user
  let user = await findUserByMicrosoftOid(microsoftOid);

  if (user) {
    // Update last login and potentially email/name if changed
    if (user.email !== email || user.name !== name) {
      user = await updateUser(user.id, { email, name });
    }
    user = await updateUserLogin(user.id);
  } else {
    // Create new user
    user = await createUser({ microsoftOid, email, name });
  }

  return user;
}

export async function getAllUsers() {
  const result = await query(
    'SELECT id, email, name, role, created_at, last_login FROM users ORDER BY created_at DESC'
  );
  return result.rows;
}

export async function updateUserRole(id, role) {
  const validRoles = ['admin', 'worker', 'user'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
  }

  const result = await query(
    `UPDATE users SET role = $1
     WHERE id = $2
     RETURNING id, email, name, role, created_at, last_login`,
    [role, id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}
