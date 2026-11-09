import { query } from '../db/index.js';

/**
 * Get all tenants
 */
export async function getAllTenants() {
  const result = await query(
    `SELECT id, name, slug, type, parent_id, diocese, logo_url, color_palette, custom_color, created_at
     FROM tenants
     ORDER BY type DESC, name ASC`
  );
  return result.rows;
}

/**
 * Get tenant by slug or ID
 */
export async function getTenantBySlugOrId(identifier) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  const sql = isUuid
    ? 'SELECT * FROM tenants WHERE id = $1'
    : 'SELECT * FROM tenants WHERE slug = $1';

  const result = await query(sql, [identifier]);
  return result.rows[0] || null;
}

/**
 * Get tenant hierarchy including parent yhtymä and member parishes
 */
export async function getTenantHierarchy(identifier = 'tuomiokirkko') {
  let tenant = await getTenantBySlugOrId(identifier);

  // Fallback to default tuomiokirkko if not found
  if (!tenant) {
    const defaultRes = await query("SELECT * FROM tenants WHERE slug = 'tuomiokirkko' LIMIT 1");
    tenant = defaultRes.rows[0] || {
      id: 'e2000000-0000-0000-0000-000000000001',
      name: 'Tuomiokirkkoseurakunta',
      slug: 'tuomiokirkko',
      type: 'seurakunta',
      parent_id: 'e1000000-0000-0000-0000-000000000001',
      diocese: 'Tampereen hiippakunta',
      color_palette: 'cathedral_blue',
      custom_color: '#1e3a5f'
    };
  }

  let yhtyma = null;
  let sisterParishes = [];
  let allParishesInYhtyma = [];

  if (tenant.type === 'seurakunta' && tenant.parent_id) {
    // Current tenant is a parish belonging to an yhtymä
    const yhtymaRes = await query('SELECT * FROM tenants WHERE id = $1', [tenant.parent_id]);
    yhtyma = yhtymaRes.rows[0] || {
      id: tenant.parent_id,
      name: 'Tampereen seurakuntayhtymä',
      slug: 'tampereen-seurakuntayhtyma',
      type: 'seurakuntayhtyma'
    };

    const parishesRes = await query(
      'SELECT id, name, slug, type, parent_id, color_palette, custom_color FROM tenants WHERE parent_id = $1 ORDER BY name ASC',
      [tenant.parent_id]
    );

    allParishesInYhtyma = parishesRes.rows.length > 0 ? parishesRes.rows : [
      { id: 'e2000000-0000-0000-0000-000000000001', name: 'Tuomiokirkkoseurakunta', slug: 'tuomiokirkko', type: 'seurakunta' },
      { id: 'e2000000-0000-0000-0000-000000000002', name: 'Harjun seurakunta', slug: 'harju', type: 'seurakunta' },
      { id: 'e2000000-0000-0000-0000-000000000003', name: 'Messukylän seurakunta', slug: 'messukyla', type: 'seurakunta' }
    ];

    sisterParishes = allParishesInYhtyma.filter(p => p.id !== tenant.id);
  } else if (tenant.type === 'seurakuntayhtyma') {
    // Current tenant IS the yhtymä
    yhtyma = tenant;
    const parishesRes = await query(
      'SELECT id, name, slug, type, parent_id, color_palette, custom_color FROM tenants WHERE parent_id = $1 ORDER BY name ASC',
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
