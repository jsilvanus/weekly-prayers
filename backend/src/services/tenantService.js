import { query } from '../db/index.js';

/**
 * Get all tenants
 */
export async function getAllTenants() {
  const result = await query(
    `SELECT t.id, t.name, t.slug, t.type, t.parent_id, t.diocese, t.logo_url, 
            t.color_palette, t.custom_color, t.domain, t.created_at, t.updated_at,
            p.name as parent_name,
            (SELECT COUNT(*) FROM prayer_requests pr WHERE pr.tenant_id = t.id) as prayer_count,
            (SELECT COUNT(*) FROM tenants sub WHERE sub.parent_id = t.id) as member_count
     FROM tenants t
     LEFT JOIN tenants p ON t.parent_id = p.id
     ORDER BY t.type DESC, t.name ASC`
  );
  return result.rows;
}

/**
 * Helper to clean host/domain strings (strips protocol, port, trailing slashes)
 */
function cleanHost(host) {
  if (!host) return '';
  let str = String(host).trim().toLowerCase();
  // Strip protocol if present
  str = str.replace(/^[a-z]+:\/\//i, '');
  // Strip trailing slashes
  str = str.replace(/\/+$/, '');
  // Strip port
  str = str.split(':')[0];
  return str;
}

/**
 * Splits comma-separated domain string into normalized array of domains
 */
export function parseDomains(domainStr) {
  if (!domainStr) return [];
  return String(domainStr)
    .split(',')
    .map(d => cleanHost(d))
    .filter(Boolean);
}

/**
 * Get tenant by slug, domain, hostname or UUID
 * Supports:
 * - Direct slug or UUID
 * - Multiple comma-separated domains (e.g. "riihimaenseurakunta.fi, riihimaki.rukous.fi")
 * - Subdomain routing (e.g. "riihimaki.rukous.fi" -> slug "riihimaki")
 * - Prefixed hostnames (e.g. "rukous.riihimaenseurakunta.fi" -> "riihimaenseurakunta.fi")
 * - Path-based hostnames (e.g. "palvelin.fi/rukous")
 */
export async function getTenantBySlugOrId(identifier) {
  if (!identifier) return null;

  const raw = String(identifier).trim();
  const cleaned = cleanHost(raw);
  const hostOnly = cleaned.split('/')[0];

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleaned);
  if (isUuid) {
    const res = await query('SELECT * FROM tenants WHERE id = $1', [cleaned]);
    if (res.rows[0]) return res.rows[0];
  }

  // 1. Check exact slug
  let res = await query('SELECT * FROM tenants WHERE slug = $1', [cleaned]);
  if (res.rows[0]) return res.rows[0];

  if (hostOnly !== cleaned) {
    res = await query('SELECT * FROM tenants WHERE slug = $1', [hostOnly]);
    if (res.rows[0]) return res.rows[0];
  }

  // 2. Check comma-separated domains for all tenants with domains
  const allDomainTenants = await query('SELECT * FROM tenants WHERE domain IS NOT NULL');
  for (const row of allDomainTenants.rows) {
    const domains = parseDomains(row.domain);
    for (const d of domains) {
      if (d === cleaned || d === hostOnly) {
        return row;
      }
      if (cleaned.includes('/') && d === cleaned) {
        return row;
      }
    }
  }

  // 3. Subdomain matching:
  // e.g. "riihimaki.rukous.fi" -> subdomain "riihimaki" matches tenant slug
  if (hostOnly.includes('.')) {
    const parts = hostOnly.split('.');
    const potentialSlug = parts[0];
    if (potentialSlug && !['www', 'rukous', 'api', 'app', 'kehitys'].includes(potentialSlug)) {
      res = await query('SELECT * FROM tenants WHERE slug = $1', [potentialSlug]);
      if (res.rows[0]) return res.rows[0];
    }
  }

  // 4. Strip 'rukous.' prefix if present (e.g. rukous.riihimaenseurakunta.fi -> riihimaenseurakunta.fi)
  if (hostOnly.startsWith('rukous.')) {
    const stripped = hostOnly.replace(/^rukous\./, '');
    for (const row of allDomainTenants.rows) {
      const domains = parseDomains(row.domain);
      if (domains.includes(stripped)) return row;
    }
    res = await query('SELECT * FROM tenants WHERE slug = $1', [stripped]);
    if (res.rows[0]) return res.rows[0];
  }

  return null;
}

/**
 * Get tenant hierarchy including parent yhtymä and member parishes
 */
export async function getTenantHierarchy(identifier = null) {
  const defaultSlug = process.env.DEFAULT_TENANT_SLUG || 'riihimaki';
  let tenant = null;

  if (identifier) {
    tenant = await getTenantBySlugOrId(identifier);
  }

  // Fallback to default tenant slug or first available tenant
  if (!tenant) {
    tenant = await getTenantBySlugOrId(defaultSlug);
  }

  if (!tenant) {
    const fallbackRes = await query("SELECT * FROM tenants WHERE slug = 'tuomiokirkko' OR slug = 'riihimaki' LIMIT 1");
    tenant = fallbackRes.rows[0] || null;
  }

  if (!tenant) {
    const anyRes = await query('SELECT * FROM tenants ORDER BY created_at ASC LIMIT 1');
    tenant = anyRes.rows[0] || {
      id: 'e2000000-0000-0000-0000-000000000010',
      name: 'Riihimäen seurakunta',
      slug: 'riihimaki',
      type: 'seurakunta',
      parent_id: null,
      diocese: 'Tampereen hiippakunta',
      color_palette: 'cathedral_blue',
      custom_color: '#1e3a5f',
      domain: 'riihimaenseurakunta.fi'
    };
  }

  let yhtyma = null;
  let sisterParishes = [];
  let allParishesInYhtyma = [];

  if (tenant.type === 'seurakunta' && tenant.parent_id) {
    // Current tenant is a parish belonging to an yhtymä
    const yhtymaRes = await query('SELECT * FROM tenants WHERE id = $1', [tenant.parent_id]);
    yhtyma = yhtymaRes.rows[0] || null;

    const parishesRes = await query(
      'SELECT id, name, slug, type, parent_id, color_palette, custom_color, domain FROM tenants WHERE parent_id = $1 ORDER BY name ASC',
      [tenant.parent_id]
    );

    allParishesInYhtyma = parishesRes.rows;
    sisterParishes = allParishesInYhtyma.filter(p => p.id !== tenant.id);
  } else if (tenant.type === 'seurakuntayhtyma') {
    // Current tenant IS the yhtymä
    yhtyma = tenant;
    const parishesRes = await query(
      'SELECT id, name, slug, type, parent_id, color_palette, custom_color, domain FROM tenants WHERE parent_id = $1 ORDER BY name ASC',
      [tenant.id]
    );
    allParishesInYhtyma = parishesRes.rows;
    sisterParishes = allParishesInYhtyma;
  } else {
    // Standalone parish not part of any yhtymä
    allParishesInYhtyma = [tenant];
  }

  return {
    tenant,
    yhtyma,
    isPartOfYhtyma: !!yhtyma,
    sisterParishes,
    allParishesInYhtyma
  };
}

/**
 * Create a new tenant
 */
export async function createTenant(data = {}) {
  const {
    name,
    slug,
    type = 'seurakunta',
    parent_id = null,
    diocese = 'Tampereen hiippakunta',
    logo_url = null,
    color_palette = 'cathedral_blue',
    custom_color = '#1e3a5f',
    domain = null,
  } = data;

  if (!name || !name.trim()) {
    throw new Error('Tenant name is required');
  }

  const cleanSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).trim();
  const cleanDomain = domain ? parseDomains(domain).join(', ') : null;

  // Check slug uniqueness
  const existing = await query('SELECT id FROM tenants WHERE slug = $1', [cleanSlug]);
  if (existing.rows.length > 0) {
    throw new Error(`Tenant slug '${cleanSlug}' is already in use`);
  }

  const sql = `
    INSERT INTO tenants (
      name, slug, type, parent_id, diocese, logo_url, color_palette, custom_color, domain, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    RETURNING *
  `;

  const values = [
    name.trim(),
    cleanSlug,
    type,
    parent_id || null,
    diocese ? diocese.trim() : 'Tampereen hiippakunta',
    logo_url || null,
    color_palette || 'cathedral_blue',
    custom_color || '#1e3a5f',
    cleanDomain || null,
  ];

  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Update tenant details (e.g. name, diocese, colors, domain)
 */
export async function updateTenant(identifier, updates = {}) {
  const tenant = await getTenantBySlugOrId(identifier);
  if (!tenant) return null;

  const fields = [];
  const values = [];
  let idx = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(updates.name.trim());
  }
  if (updates.slug !== undefined) {
    const cleanSlug = updates.slug.trim().toLowerCase();
    // Ensure slug not taken by other tenant
    const existing = await query('SELECT id FROM tenants WHERE slug = $1 AND id != $2', [cleanSlug, tenant.id]);
    if (existing.rows.length > 0) {
      throw new Error(`Slug '${cleanSlug}' is already in use by another tenant`);
    }
    fields.push(`slug = $${idx++}`);
    values.push(cleanSlug);
  }
  if (updates.type !== undefined) {
    fields.push(`type = $${idx++}`);
    values.push(updates.type);
  }
  if (updates.parent_id !== undefined) {
    fields.push(`parent_id = $${idx++}`);
    values.push(updates.parent_id || null);
  }
  if (updates.diocese !== undefined) {
    fields.push(`diocese = $${idx++}`);
    values.push(updates.diocese ? updates.diocese.trim() : null);
  }
  if (updates.color_palette !== undefined) {
    fields.push(`color_palette = $${idx++}`);
    values.push(updates.color_palette);
  }
  if (updates.custom_color !== undefined) {
    fields.push(`custom_color = $${idx++}`);
    values.push(updates.custom_color);
  }
  if (updates.logo_url !== undefined) {
    fields.push(`logo_url = $${idx++}`);
    values.push(updates.logo_url || null);
  }
  if (updates.domain !== undefined) {
    const cleanDomain = updates.domain ? parseDomains(updates.domain).join(', ') : null;
    fields.push(`domain = $${idx++}`);
    values.push(cleanDomain);
  }

  if (fields.length === 0) return tenant;

  fields.push(`updated_at = NOW()`);
  values.push(tenant.id);

  const sql = `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Delete a tenant
 */
export async function deleteTenant(identifier) {
  const tenant = await getTenantBySlugOrId(identifier);
  if (!tenant) return null;

  // Check if tenant has children (member parishes)
  const childCheck = await query('SELECT id FROM tenants WHERE parent_id = $1 LIMIT 1', [tenant.id]);
  if (childCheck.rows.length > 0) {
    throw new Error('Cannot delete a parish union that still has member parishes. Remove or reassign them first.');
  }

  const result = await query('DELETE FROM tenants WHERE id = $1 RETURNING *', [tenant.id]);
  return result.rows[0];
}
