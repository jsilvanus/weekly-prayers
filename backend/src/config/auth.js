import { ConfidentialClientApplication } from '@azure/msal-node';

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

export const msalClient = new ConfidentialClientApplication(msalConfig);

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
