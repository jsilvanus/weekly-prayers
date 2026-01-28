import { msalClient, authConfig } from '../config/auth.js';

export async function getAuthorizationUrl(state) {
  const authCodeUrlParameters = {
    scopes: authConfig.scopes,
    redirectUri: authConfig.redirectUri,
    state: state || '',
  };

  return await msalClient.getAuthCodeUrl(authCodeUrlParameters);
}

export async function exchangeCodeForTokens(code) {
  const tokenRequest = {
    code,
    scopes: authConfig.scopes,
    redirectUri: authConfig.redirectUri,
  };

  const response = await msalClient.acquireTokenByCode(tokenRequest);
  return response;
}

export function parseUserFromToken(tokenResponse) {
  const account = tokenResponse.account;

  return {
    microsoftOid: account.homeAccountId.split('.')[0],
    email: account.username,
    name: account.name || account.username,
  };
}
