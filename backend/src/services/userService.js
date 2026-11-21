import { query } from '../db/index.js';

export async function findUserByMicrosoftOid(microsoftOid) {
  if (!microsoftOid) return null;
  const result = await query(
    'SELECT * FROM users WHERE microsoft_oid = $1',
    [microsoftOid]
  );
  return result.rows[0] || null;
}

export async function findUserByOidcSub(oidcSub) {
  if (!oidcSub) return null;
  const result = await query(
    'SELECT * FROM users WHERE oidc_sub = $1',
    [oidcSub]
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
  if (!email) return null;
  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

export async function createUser({ microsoftOid = null, oidcSub = null, email, name, role = 'user', tenantId = null }) {
  const result = await query(
    `INSERT INTO users (microsoft_oid, oidc_sub, email, name, role, tenant_id, last_login)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [microsoftOid, oidcSub, email, name, role, tenantId]
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

export async function updateUser(id, { email, name, role, tenantId, oidcSub }) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (email !== undefined) {
    fields.push(`email = $${idx++}`);
    values.push(email);
  }
  if (name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(name);
  }
  if (role !== undefined) {
    fields.push(`role = $${idx++}`);
    values.push(role);
  }
  if (tenantId !== undefined) {
    fields.push(`tenant_id = $${idx++}`);
    values.push(tenantId);
  }
  if (oidcSub !== undefined) {
    fields.push(`oidc_sub = $${idx++}`);
    values.push(oidcSub);
  }

  if (fields.length === 0) return findUserById(id);

  values.push(id);
  const result = await query(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${idx}
     RETURNING *`,
    values
  );
  return result.rows[0];
}

function isEmailInAdminList(email) {
  if (!email || !process.env.ADMIN_EMAILS) return false;
  const adminList = process.env.ADMIN_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminList.includes(email.trim().toLowerCase());
}

async function shouldPromoteToAdmin(email) {
  if (isEmailInAdminList(email)) {
    return true;
  }
  const result = await query("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
  const adminCount = parseInt(result.rows[0]?.count || '0', 10);
  return adminCount === 0;
}

export async function findOrCreateUser({ microsoftOid, email, name }) {
  // Try to find existing user by microsoftOid or email
  let user = await findUserByMicrosoftOid(microsoftOid);
  if (!user && email) {
    user = await findUserByEmail(email);
    if (user && !user.microsoft_oid) {
      await query('UPDATE users SET microsoft_oid = $1 WHERE id = $2', [microsoftOid, user.id]);
      user.microsoft_oid = microsoftOid;
    }
  }

  const effectiveEmail = email || user?.email;
  const promote = await shouldPromoteToAdmin(effectiveEmail);

  if (user) {
    const updates = {};
    if (email && user.email !== email) updates.email = email;
    if (name && user.name !== name) updates.name = name;
    if (promote && user.role !== 'admin') {
      updates.role = 'admin';
    }

    if (Object.keys(updates).length > 0) {
      user = await updateUser(user.id, updates);
    }
    user = await updateUserLogin(user.id);
  } else {
    // Create new user
    user = await createUser({
      microsoftOid,
      email,
      name,
      role: promote ? 'admin' : 'user',
    });
  }

  return user;
}

export async function syncOidcUser({ oidcSub, email, name, role, tenantId }) {
  // 1. Try to find by oidc_sub
  let user = await findUserByOidcSub(oidcSub);

  // 2. Fall back to email matching
  if (!user && email) {
    user = await findUserByEmail(email);
    if (user) {
      // Link oidc_sub to existing user
      await query('UPDATE users SET oidc_sub = $1 WHERE id = $2', [oidcSub, user.id]);
      user.oidc_sub = oidcSub;
    }
  }

  const effectiveEmail = email || user?.email;
  const promote = await shouldPromoteToAdmin(effectiveEmail);

  if (user) {
    const updates = {};
    if (email && user.email !== email) updates.email = email;
    if (name && user.name !== name) updates.name = name;
    if (promote) {
      if (user.role !== 'admin') updates.role = 'admin';
    } else if (role && user.role !== role) {
      updates.role = role;
    }
    if (tenantId !== undefined && user.tenant_id !== tenantId) updates.tenantId = tenantId;

    if (Object.keys(updates).length > 0) {
      user = await updateUser(user.id, updates);
    }
    user = await updateUserLogin(user.id);
  } else {
    user = await createUser({
      oidcSub,
      email: email || `${oidcSub}@oidc.local`,
      name: name || email || oidcSub,
      role: promote ? 'admin' : (role || 'user'),
      tenantId: tenantId || null,
    });
  }

  return user;
}

export async function getAllUsers() {
  const result = await query(
    'SELECT id, email, name, role, tenant_id, created_at, last_login FROM users ORDER BY created_at DESC'
  );
  return result.rows;
}

export async function updateUserRole(id, role) {
  const validRoles = ['admin', 'bishop', 'coordinator', 'worker', 'prayer_group', 'user'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
  }

  const result = await query(
    `UPDATE users SET role = $1
     WHERE id = $2
     RETURNING id, email, name, role, tenant_id, created_at, last_login`,
    [role, id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}
