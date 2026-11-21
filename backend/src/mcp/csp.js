// Content-Security-Policy for embedded OAuth authorization server HTML pages.
// formAction extends form-action 'self': browsers also apply form-action to redirects followed by a form submission.
export function contentSecurityPolicy(formAction = []) {
  return "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action " +
    ["'self'", ...formAction].join(' ');
}

// CSP source for a redirect URI: its origin, or its scheme for custom schemes (e.g. `cursor:`).
export function redirectSource(uri) {
  try {
    const url = new URL(uri);
    return url.origin === 'null' ? url.protocol : url.origin;
  } catch (e) {
    return "'self'";
  }
}
