import { ConfidentialClientApplication } from '@azure/msal-node';
import * as oidc from 'openid-client';

const hasAzureConfig = Boolean(process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID);

let msalClientInstance = null;
if (hasAzureConfig) {
  const msalConfig = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`MSAL [${level}]: ${message}`);
          }
        },
        piiLoggingEnabled: false,
        logLevel: 3, // Info
      },
    },
  };
  msalClientInstance = new ConfidentialClientApplication(msalConfig);
}

export const msalClient = msalClientInstance;

export const authConfig = {
  redirectUri: process.env.AZURE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
  scopes: ['openid', 'profile', 'email', 'User.Read'],
  postLogoutRedirectUri: process.env.FRONTEND_URL || 'http://localhost:5173',
};

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  algorithm: 'HS256',
};

// OIDC / Tunnus configuration
let oidcConfigPromise = null;

export function parseGroupRoleMap(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse OIDC_GROUP_ROLE_MAP:', err);
    return {};
  }
}

export const oidcConfig = {
  issuer: process.env.OIDC_ISSUER || '',
  clientId: process.env.OIDC_CLIENT_ID || '',
  clientSecret: process.env.OIDC_CLIENT_SECRET || '',
  redirectUri: process.env.OIDC_REDIRECT_URI || '',
  postLogoutRedirectUri: process.env.OIDC_POST_LOGOUT_REDIRECT_URI || process.env.FRONTEND_URL || '',
  scopes: process.env.OIDC_SCOPES || 'openid profile email groups',
  groupRoleMap: parseGroupRoleMap(process.env.OIDC_GROUP_ROLE_MAP),
  defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG || 'tuomiokirkko',
  enabled: Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID),
};

export async function getOidcServerConfig() {
  if (!oidcConfig.issuer || !oidcConfig.clientId) {
    throw new Error('OIDC is not configured (OIDC_ISSUER and OIDC_CLIENT_ID required)');
  }
  if (!oidcConfigPromise) {
    const issuerUrl = new URL(oidcConfig.issuer);
    if (oidcConfig.clientSecret) {
      oidcConfigPromise = oidc.discovery(
        issuerUrl,
        oidcConfig.clientId,
        oidcConfig.clientSecret,
        oidc.ClientSecretPost(oidcConfig.clientSecret)
      );
    } else {
      oidcConfigPromise = oidc.discovery(issuerUrl, oidcConfig.clientId);
    }
  }
  return oidcConfigPromise;
}

export function resetOidcServerConfig() {
  oidcConfigPromise = null;
}
