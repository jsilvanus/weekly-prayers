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
 * Convert wildcard pattern (e.g. "parish/* /rukous-worker") into RegExp with capture groups.
 * @param {string} pattern
 * @returns {RegExp}
 */
function wildcardPatternToRegex(pattern) {
  // Escape regex specials except '*'
  const escaped = pattern
    .replace(/^\/+/, '')
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '([^/]+)');
  return new RegExp(`^${escaped}$`);
}

/**
 * Map OIDC groups array to role and optional tenant slug.
 * Supports:
 *  1. Automatic convention pattern:
 *     parish/<tenant>/rukous-<role> or parish/<tenant>/prayers-<role>
 *     (e.g. parish/riihimaki/rukous-worker -> tenant: riihimaki, role: worker)
 *  2. Explicit wildcard mapping in OIDC_GROUP_ROLE_MAP:
 *     e.g. "parish/* /rukous-worker": "worker" -> wildcard '*' captures the tenant slug!
 *     e.g. "parish/* /rukous-admin": "admin"
 *  3. Explicit exact mapping in OIDC_GROUP_ROLE_MAP:
 *     e.g. "parish/riihimaki/rukous-admin": "admin"
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

  // Compile exact and wildcard patterns from groupRoleMap
  const exactMap = {};
  const wildcardPatterns = [];

  if (groupRoleMap && typeof groupRoleMap === 'object') {
    for (const [k, v] of Object.entries(groupRoleMap)) {
      const cleanKey = k.replace(/^\/+/, '');
      const role = typeof v === 'string' ? v : v?.role;
      const explicitTenant = typeof v === 'object' ? v?.tenant : null;

      if (!role) continue;

      if (cleanKey.includes('*')) {
        wildcardPatterns.push({
          regex: wildcardPatternToRegex(cleanKey),
          role,
          explicitTenant,
        });
      } else {
        exactMap[cleanKey] = {
          role,
          tenant: explicitTenant || defaultTenantSlug,
        };
      }
    }
  }

  // Built-in automatic convention: parish/<tenant>/(rukous|prayers)-<role>
  const conventionRegex = /^parish\/([^/]+)\/(?:rukous|prayers)-([a-zA-Z0-9_-]+)$/;

  for (const rawGroup of groups) {
    const g = String(rawGroup).replace(/^\/+/, '');

    // 1. Exact match in groupRoleMap
    if (exactMap[g]) {
      const { role, tenant } = exactMap[g];
      const rank = ROLE_RANK[role] || 0;
      if (rank > highestRank) {
        highestRank = rank;
        highestRole = role;
        if (tenant) resolvedTenantSlug = tenant;
      }
      continue;
    }

    // 2. Wildcard match in groupRoleMap (e.g. parish/*/rukous-worker)
    let matchedWildcard = false;
    for (const wp of wildcardPatterns) {
      const match = g.match(wp.regex);
      if (match) {
        matchedWildcard = true;
        const capturedTenant = wp.explicitTenant || match[1] || defaultTenantSlug;
        let role = wp.role;
        if (role === 'prayer-group') role = 'prayer_group';

        const rank = ROLE_RANK[role] || 0;
        if (rank > highestRank) {
          highestRank = rank;
          highestRole = role;
          if (capturedTenant) resolvedTenantSlug = capturedTenant;
        } else if (rank === highestRank && capturedTenant && !resolvedTenantSlug) {
          resolvedTenantSlug = capturedTenant;
        }
        break;
      }
    }
    if (matchedWildcard) continue;

    // 3. Automatic convention: parish/<tenant>/(rukous|prayers)-<role>
    const convMatch = g.match(conventionRegex);
    if (convMatch) {
      const tenant = convMatch[1];
      let role = convMatch[2];

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
