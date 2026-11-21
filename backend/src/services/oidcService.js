/**
 * Role rank mapping for weekly-prayers / rukous
 * user (1) < prayer_group (1.5) < bishop = worker (2) < coordinator (3) < admin (4)
 */
export const ROLE_RANK = {
  user: 1,
  prayer_group: 1.5,
  bishop: 2,
  worker: 2,
  coordinator: 3,
  admin: 4,
};

/**
 * Map OIDC groups array to role and optional tenant slug.
 * Supports:
 *  1. Group pattern: parish/<tenant>/rukous-<role> or parish/<tenant>/prayers-<role>
 *     (e.g. parish/riihimaki/rukous-admin or parish/riihimaki/prayers-admin)
 *  2. Explicit JSON map: OIDC_GROUP_ROLE_MAP
 *
 * @param {string[]} groups Array of group strings from OIDC claims
 * @param {Record<string, string | { tenant?: string, role: string }>} [groupRoleMap]
 * @param {string} [defaultTenantSlug]
 * @returns {{ role: string, tenantSlug: string | null }}
 */
export function mapGroupsToRoleAndTenant(groups, groupRoleMap = {}, defaultTenantSlug = null) {
  let highestRole = 'user';
  let highestRank = ROLE_RANK.user || 1;
  let resolvedTenantSlug = defaultTenantSlug || null;

  // Normalize groupRoleMap
  const normalizedMap = {};
  if (groupRoleMap && typeof groupRoleMap === 'object') {
    for (const [k, v] of Object.entries(groupRoleMap)) {
      const key = k.replace(/^\/+/, '');
      if (typeof v === 'string') {
        normalizedMap[key] = { role: v, tenant: defaultTenantSlug };
      } else if (v && typeof v === 'object' && v.role) {
        normalizedMap[key] = { role: v.role, tenant: v.tenant || defaultTenantSlug };
      }
    }
  }

  // Regex pattern for parish/<tenant>/(rukous|prayers)-<role>
  // e.g. parish/riihimaki/rukous-admin -> tenant: riihimaki, role: admin
  // e.g. parish/riihimaki/rukous-worker -> tenant: riihimaki, role: worker
  // e.g. parish/tuomiokirkko/rukous-coordinator -> tenant: tuomiokirkko, role: coordinator
  // Also supports prayers- prefix for backward compatibility
  const groupRegex = /^parish\/([^/]+)\/(?:rukous|prayers)-([a-zA-Z0-9_-]+)$/;

  for (const rawGroup of groups) {
    const g = String(rawGroup).replace(/^\/+/, '');

    // 1. Check explicit map first
    if (normalizedMap[g]) {
      const { role, tenant } = normalizedMap[g];
      const rank = ROLE_RANK[role] || 0;
      if (rank > highestRank) {
        highestRank = rank;
        highestRole = role;
        if (tenant) resolvedTenantSlug = tenant;
      }
      continue;
    }

    // 2. Check pattern parish/<tenant>/(rukous|prayers)-<role>
    const match = g.match(groupRegex);
    if (match) {
      const tenant = match[1];
      let role = match[2];

      // Normalize role names (e.g. prayer-group -> prayer_group)
      if (role === 'prayer-group') role = 'prayer_group';

      if (ROLE_RANK[role]) {
        const rank = ROLE_RANK[role];
        if (rank > highestRank) {
          highestRank = rank;
          highestRole = role;
          resolvedTenantSlug = tenant;
        } else if (rank === highestRank && !resolvedTenantSlug) {
          resolvedTenantSlug = tenant;
        }
      }
    }
  }

  return {
    role: highestRole,
    tenantSlug: resolvedTenantSlug,
  };
}
