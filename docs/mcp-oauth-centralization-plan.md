# Weekly Prayers (Rukous) MCP OAuth Centralization & Relay Plan

## Context & The Hybrid Requirement

Weekly Prayers serves two distinct audiences through its MCP interface:
1. **Public / Anonymous Parishioners**: Selaa julkisia rukousaiheita, lue Päivän sana, lähetä julkisia esirukouspyyntöjä. No identity or Tunnus account is required.
2. **Parish Employees & Moderators (Työntekijät & Ylläpitäjät)**: Access non-public prayer requests, moderate incoming requests, manage categories. Requires authenticated identity from Tunnus.

In Weekly Prayers, remote AI clients (like ChatGPT and Claude) must perform an OAuth handshake to connect. To support parishioners without forcing them to create an account, Weekly Prayers' sign-in screen offers:
* **"Jatka anonyymisti (Continue anonymously)"** -> issues a local anonymous token (`sub: 'anonymous'`).
* **"Kirjaudu työntekijänä (Log in as staff)"** -> authenticates employee identity.

---

## Strategy: Hybrid Relay & Resource Server

The centralization approach handles this hybrid model cleanly:

```
                            AI Client (ChatGPT / Claude)
                                         │
                   1. Initiates OAuth    │
                                         v
                    +-----------------------------------------+
                    |  Weekly Prayers /oauth/authorize screen |
                    +-----------------------------------------+
                                 │                 │
                "Jatka anonyymisti"│                 │ "Kirjaudu työntekijänä"
                                 │                 │
                                 v                 v
            +--------------------------+    +--------------------------+
            |  Local Anonymous Grant   |    | Relay to Tunnus Central  |
            |  (sub: 'anonymous')      |    | (${OIDC_ISSUER}/auth     |
            |  Local HS256 JWT         |    |  resource=.../mcp)       |
            +--------------------------+    +--------------------------+
                                                           │
                                                           v
                                            +--------------------------+
                                            | Authenticated Grant      |
                                            | Stored in Tunnus &       |
                                            | Visible on /account      |
                                            +--------------------------+
```

### 1. The Interstitial Authorize Screen (`/oauth/authorize`)
Keep Weekly Prayers' custom consent page as an interstitial:
- **Button 1 ("Jatka anonyymisti")**:
  - Handled locally by Weekly Prayers.
  - Generates authorization code with `sub: 'anonymous'`.
  - Exchanges for local access token with `sub: 'anonymous'`.
  - Completely self-contained; does not create records in Tunnus.
- **Button 2 ("Kirjaudu seurakunnan tunnuksella (Tunnus)")**:
  - Replaces the legacy local email/password inputs.
  - Redirects the browser to `${OIDC_ISSUER}/auth?client_id=...&resource=${publicUrl}/mcp&...`.
  - When Tunnus completes authentication, the client receives an RS256 token from Tunnus.

### 2. Dual-Layer Token Verification on `POST /mcp`
When requests arrive at `POST /mcp`:
- **Path A (Tunnus RS256 JWT)**:
  - Verified via Tunnus JWKS (`${OIDC_ISSUER}/jwks`).
  - `sub` is a valid user UUID matching an employee in `users.sub`.
  - Context gets `isAnonymous: false, role: user.role`.
- **Path B (Local Anonymous Token)**:
  - Verified via local secret/verifier.
  - `sub === 'anonymous'`.
  - Context gets `isAnonymous: true, role: 'anonymous'`.
  - Allows public tools (read public prayers, daily verse, submit prayer request), denies moderation/admin tools.

### 3. Centralized Governance on Tunnus `/account`
- **Anonymous connections**: Do not appear on Tunnus `/account` because there is no user account associated with them (privacy-preserving and no database pollution).
- **Employee connections**: Appear under "Authorized applications" on Tunnus `/account` ("Weekly Prayers - Claude Desktop").
- **Back-Channel Revocation (`POST /api/auth/backchannel`)**:
  - When an employee revokes Weekly Prayers from Tunnus `/account`, Tunnus sends a back-channel signal to Weekly Prayers.
  - Weekly Prayers invalidates that specific employee's sessions and tokens immediately.
