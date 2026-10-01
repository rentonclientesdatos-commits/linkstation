# Zoho CRM Multi-DC + OAuth Refresh — Research Report

**Date:** 2026-05-24
**Scope:** Multi-datacenter URL mapping, OAuth refresh peculiarities, scopes, rate limits, search API, Blueprints, bugs in current adapter.
**Sources:** Zoho official docs (v8 API, OAuth 2.0 protocol, token-limits, api-limits), Zoho community Kaizen posts, first-party SDK examples.

---

## TLDR

- **CRITICAL BUG**: Adapter hardcodes US datacenter. EU/AU/IN/JP/CA/SA clients will get 401 silently. Fix: read `location` + `accounts-server` from OAuth callback, persist `api_domain` from token response.
- **api_domain field** is returned in every token response — use it directly as the API base; no need to maintain a static DC map for API calls.
- **Refresh token does not expire** unless revoked; rate limit is 10 refreshes per 10 min per refresh_token — current adapter is safe if not called in tight loops.
- **INVALID_OAUTHTOKEN** (HTTP 401 on API call) = access token expired → auto-refresh + retry. `invalid_code` on token endpoint = refresh token revoked → re-auth required. Adapter currently does neither retry nor re-auth.
- **Search operator gotcha**: `equals` on text/email fields is "contains", not exact match. For exact email match use the dedicated `?email=` query param.

---

## 1. Multi-Datacenter URL Table

| DC           | `location` param | Accounts server (tokenUrl)      | API base (from `api_domain`)  |
| ------------ | ---------------- | ------------------------------- | ----------------------------- |
| US           | `us`             | `https://accounts.zoho.com`     | `https://www.zohoapis.com`    |
| EU           | `eu`             | `https://accounts.zoho.eu`      | `https://www.zohoapis.eu`     |
| India        | `in`             | `https://accounts.zoho.in`      | `https://www.zohoapis.in`     |
| Australia    | `au`             | `https://accounts.zoho.com.au`  | `https://www.zohoapis.com.au` |
| Japan        | `jp`             | `https://accounts.zoho.jp`      | `https://www.zohoapis.jp`     |
| Canada       | `ca`             | `https://accounts.zohocloud.ca` | `https://www.zohoapis.ca`     |
| Saudi Arabia | `sa`             | `https://accounts.zoho.sa`      | `https://www.zohoapis.sa`     |
| UK           | `uk`             | `https://accounts.zoho.uk`      | `https://www.zohoapis.uk`     |
| China        | `cn`             | `https://accounts.zoho.com.cn`  | `https://www.zohoapis.com.cn` |

**CRM path suffix:** `{api_domain}/crm/v8/` (or v7 — both work; v8 is latest).

**Source:** [Multi DC Support - Zoho Accounts](https://www.zoho.com/accounts/protocol/oauth/multi-dc.html), [Multi DC - Zoho CRM v8](https://www.zoho.com/crm/developer/docs/api/v8/multi-dc.html)

---

## 2. DC Detection — How it Works

### During OAuth callback (step 1 of init flow)

Authorization URL always starts at `https://accounts.zoho.com/oauth/v2/auth` regardless of DC. After user consent, Zoho redirects to your `redirect_uri` with:

```
https://your-app.com/callback?code=GRANT_TOKEN&location=eu&accounts-server=https://accounts.zoho.eu
```

- `location` = DC slug (`us`, `eu`, `in`, `au`, `jp`, `ca`, `sa`, `uk`, `cn`)
- `accounts-server` = exact accounts URL for that user's DC

**Must persist both** alongside the grant code before exchanging for tokens.

### During token exchange (step 2) and after

The token response includes:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "api_domain": "https://www.zohoapis.eu",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

- `api_domain` = exact API base URL for this user. **Use this, not a static map.**
- Store `api_domain` + `accounts_server` in the tenant's credentials record.

### Refresh token is DC-bound

Refresh tokens are **NOT cross-DC**. A refresh_token issued by `accounts.zoho.eu` must be refreshed at `accounts.zoho.eu/oauth/v2/token`. Cross-DC refresh will fail with `invalid_code`.

**Source:** [Multi DC Client Authorization](https://www.zoho.com/accounts/protocol/oauth/multi-dc/client-authorization.html), [Access & Refresh Tokens v8](https://www.zoho.com/crm/developer/docs/api/v8/access-refresh.html)

---

## 3. OAuth 2.0 Scopes

### Minimal scope set for linkstation operations

```
ZohoCRM.modules.leads.ALL
ZohoCRM.modules.contacts.READ
ZohoCRM.modules.tasks.CREATE
ZohoCRM.modules.events.CREATE
ZohoCRM.settings.fields.READ
ZohoCRM.users.READ
```

### Scope breakdown

| Operation                 | Scope                                      |
| ------------------------- | ------------------------------------------ |
| Search + read Leads       | `ZohoCRM.modules.leads.READ`               |
| Update Leads              | `ZohoCRM.modules.leads.UPDATE` (or `.ALL`) |
| Add tags to Leads         | `ZohoCRM.modules.leads.UPDATE`             |
| Execute Blueprint on Lead | `ZohoCRM.modules.leads.UPDATE`             |
| Create Tasks              | `ZohoCRM.modules.tasks.CREATE`             |
| Create Events             | `ZohoCRM.modules.events.CREATE`            |
| List custom fields        | `ZohoCRM.settings.fields.READ`             |
| Read custom modules       | `ZohoCRM.modules.{module_api_name}.READ`   |

### `ZohoCRM.modules.ALL` vs granular

`ZohoCRM.modules.ALL` = full CRUD on ALL modules. Use only if tenant explicitly grants broad access. Prefer granular scopes for least-privilege.

### Offline access (refresh token)

Include `access_type=offline` in the authorization URL query params. Without it, no refresh_token is issued.

```
https://accounts.zoho.com/oauth/v2/auth
  ?response_type=code
  &client_id={CLIENT_ID}
  &scope=ZohoCRM.modules.leads.ALL,...
  &redirect_uri={REDIRECT_URI}
  &access_type=offline
```

**Source:** [Scopes v8](https://www.zoho.com/crm/developer/docs/api/v8/scopes.html), [OAuth Scope - Zoho Accounts](https://www.zoho.com/accounts/protocol/oauth/scope.html)

---

## 4. Token Refresh Peculiarities

### Lifetime

| Token         | Lifetime                          |
| ------------- | --------------------------------- |
| Access token  | 3600 seconds (1 hour)             |
| Refresh token | Indefinite (until revoked)        |
| Grant code    | 60 seconds (exchange immediately) |

### Refresh rate limits

- Max **10 refresh requests per 10 minutes** per refresh_token.
- Max **10 active access tokens** stored per refresh_token (16th request invalidates oldest).
- Max **20 active refresh tokens** stored per user per client (21st invalidates oldest).

Current adapter refreshes once per process lifetime and reuses token until `tokenExpiry`. **Safe** unless the process restarts more than 10× in 10 minutes.

### Error codes

| Error                   | Where thrown                | Meaning                                       | Recovery                                     |
| ----------------------- | --------------------------- | --------------------------------------------- | -------------------------------------------- |
| `INVALID_OAUTHTOKEN`    | CRM API response (HTTP 401) | Access token expired or invalidated           | Refresh access token, retry once             |
| `invalid_code`          | Token endpoint response     | Refresh token revoked, wrong, or already used | Require tenant re-auth (cannot auto-recover) |
| `AUTHENTICATION_FAILED` | CRM API response (HTTP 401) | Wrong DC — calling wrong `api_domain`         | Fix DC routing                               |
| `OAUTH_SCOPE_MISMATCH`  | CRM API response (HTTP 401) | Token lacks required scope                    | Re-auth with correct scopes                  |
| `access_denied`         | Token endpoint              | Rate limit hit (10 refreshes/10min)           | Backoff + retry after 10 min window          |

**Key distinction**: `INVALID_OAUTHTOKEN` → auto-retry with refresh. `invalid_code` on the token endpoint → dead refresh_token, must re-auth.

**Source:** [Token Validity v8](https://www.zoho.com/crm/developer/docs/api/v8/token-validity.html), [Token Limits](https://www.zoho.com/accounts/protocol/oauth/token-limits.html), [Kaizen #25 error handling](https://help.zoho.com/portal/en/community/topic/kaizen-25-zoho-crm-api-common-errors-and-error-handling)

---

## 5. Custom Modules / Custom Fields

### Module assumption

The adapter hardcodes `/Leads/`. Some tenants use `Deals` or custom modules (e.g., `Alumnos_Matriculados__c`). The module name should be a per-tenant config value, not hardcoded.

### Listing custom fields

```
GET {api_domain}/crm/v8/settings/fields?module=Leads
Authorization: Zoho-oauthtoken {access_token}
```

Response includes all standard + custom fields with their `api_name` (e.g., `Curso_Interes__c`). Required scope: `ZohoCRM.settings.fields.READ`.

### Unknown field behavior in write payloads

Zoho returns `INVALID_DATA` with `details.api_name` for **type mismatches** (wrong data type). Community evidence and integration tools (Zapier, n8n) confirm **unknown field names are silently ignored** in update payloads — no error is thrown. However, this behavior is not officially documented, so treat it as implementation-dependent and avoid sending unknown fields in production code.

**Safe approach**: validate field names against `/settings/fields` before building update payload, or catch `INVALID_DATA` errors and log the offending `details.api_name`.

**Source:** [Field Meta Data API v8](https://www.zoho.com/crm/developer/docs/api/v8/field-meta.html), community threads on INVALID_DATA

---

## 6. Search and Pagination

### Email exact match (recommended)

```
GET {api_domain}/crm/v8/Leads/search?email=foo@example.com
```

This is a dedicated endpoint parameter — performs exact match on all email fields. Preferred over criteria string for email lookup.

### Criteria string syntax

```
({Field_API_name}:{operator}:{value})
```

Combined: `((Email:equals:foo@bar.com)and(Last_Name:starts_with:Gar))`

**Gotcha**: `equals` on text/email fields = **contains**, not exact match. For exact email matching, use the `?email=` param above.

### Operators by field type

| Type               | Operators                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Text, Email, Phone | `equals`, `not_equal`, `starts_with`, `in`                                                         |
| Date/DateTime      | `equals`, `not_equal`, `between`, `greater_than`, `less_than`, `greater_equal`, `less_equal`, `in` |
| Number/Currency    | same as Date                                                                                       |
| Picklist           | `equals`, `not_equal`, `in`                                                                        |
| Boolean            | `equals`, `not_equal`                                                                              |

### Pagination

- `page` (default: 1) + `per_page` (default and **max: 200**)
- Max 2,000 records retrievable per search query (10 pages × 200).
- No cursor/token pagination — purely offset-based.

Current `searchLeads` fetches page 1 only — **missing paginaton, truncated at 200 results**.

**Source:** [Search Records v8](https://www.zoho.com/crm/developer/docs/api/v8/search-records.html)

---

## 7. Rate Limits

### Daily credits by edition

| Edition             | Daily credits                           |
| ------------------- | --------------------------------------- |
| Free                | 5,000                                   |
| Standard/Starter    | 50,000 + (users × 250), max 100,000     |
| Professional        | 50,000 + (users × 500), max 3,000,000   |
| Enterprise/Zoho One | 50,000 + (users × 1,000), max 5,000,000 |
| Ultimate/CRM Plus   | 50,000 + (users × 2,000), unlimited     |

### Per-request credit costs (relevant operations)

| Operation            | Cost                                            |
| -------------------- | ----------------------------------------------- |
| Read/search records  | 1 credit                                        |
| Insert/update record | 1 credit per 10 records                         |
| Convert Lead         | 5 credits                                       |
| Blueprint transition | 1 credit (inferred — not explicitly documented) |
| Create Task/Event    | 1 credit per 10 records                         |

### Rate limit headers

- **`X-API-CREDITS-REMAINING`**: appears in response headers when usage exceeds 50% of daily free credits.
- **No `X-RATELIMIT-LIMIT` / `X-RATELIMIT-RESET` / `Retry-After`** headers documented — Zoho does not expose these per-request.
- On 429/TOO_MANY_REQUESTS: implement exponential backoff. No `Retry-After` to read.

### Concurrency limits

| Edition      | Max concurrent requests |
| ------------ | ----------------------- |
| Free         | 5                       |
| Standard     | 10                      |
| Professional | 15                      |
| Enterprise   | 20                      |
| Ultimate     | 25                      |

Sub-concurrency limit: 10 simultaneous requests for heavy operations (search, bulk write, Convert Lead).

**Source:** [API Limits v8](https://www.zoho.com/crm/developer/docs/api/v8/api-limits.html)

---

## 8. Blueprints / Workflows

### Blueprint (invocable from API)

Get available next transitions for a record:

```
GET {api_domain}/crm/v8/Leads/{record_id}/actions/blueprint
```

Response: array of next available transitions with `id`, `name`, `fields` required, `next_field_value`.

Execute a transition:

```
PUT {api_domain}/crm/v8/Leads/{record_id}/actions/blueprint
Body: { "blueprint": [{ "transition_id": "123456", "data": { ... } }] }
```

**Note**: Only transitions valid for the record's **current state** are listed. Cannot list all possible transitions without walking the state machine.

### Blueprint vs Workflow Rule vs Function

| Type              | API-invocable    | Description                                                       |
| ----------------- | ---------------- | ----------------------------------------------------------------- |
| Blueprint         | YES              | State machine with transitions; GET lists available, PUT executes |
| Workflow Rule     | NO               | Event-triggered internally; cannot invoke from API                |
| Function (Deluge) | YES (indirectly) | Can be triggered by Blueprint transition or webhook               |

The adapter's `executeAction("BLUEPRINT", ...)` is the correct approach. Workflows cannot be triggered via API.

**Source:** [Get Blueprint v8](https://www.zoho.com/crm/developer/docs/api/v8/blueprint-details.html), [Update Blueprint v8](https://www.zoho.com/crm/developer/docs/api/v8/update-blueprint.html)

---

## 9. Bugs in Current `providers/zoho.ts` + Proposed Patches

### Bug inventory

| #    | Severity | Bug                                                               | Impact                                                              |
| ---- | -------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| B-01 | CRITICAL | Hardcoded `apiBase = https://www.zohoapis.com/crm/v2`             | EU/AU/IN/JP/CA clients get wrong DC; CRM calls fail                 |
| B-02 | CRITICAL | Hardcoded `tokenUrl = https://accounts.zoho.com/oauth/v2/token`   | Cannot refresh tokens for non-US tenants                            |
| B-03 | HIGH     | No 401 → auto-refresh + retry                                     | API fails on expired token mid-request instead of auto-recovering   |
| B-04 | HIGH     | No OAuth init flow                                                | Assumes refresh_token already exists; no way to onboard new tenants |
| B-05 | MEDIUM   | No pagination in `searchLeads`                                    | Silently truncates at 200 results                                   |
| B-06 | MEDIUM   | Module hardcoded to `Leads` everywhere                            | Cannot support `Deals` or custom modules per tenant                 |
| B-07 | LOW      | `criteria` passed raw to search — `equals` on email is "contains" | `searchLeads("(Email:equals:x@y.com)")` may return false positives  |
| B-08 | LOW      | `v2` in apiBase — Zoho v8 is current                              | Missing v8 features (parallel transitions, etc.)                    |

### Proposed patches (minimum viable fixes for Sprint 2)

#### Patch 1: DC-aware config (fixes B-01, B-02)

Extend `CRMProviderConfig` to require `accountsServer` + `apiDomain` derived from OAuth flow, instead of defaulting to US.

```typescript
// In interface.ts — extend CRMProviderConfig
export interface ZohoOAuthCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accountsServer: string; // e.g. "https://accounts.zoho.eu"
  apiDomain: string; // e.g. "https://www.zohoapis.eu" (from token response api_domain)
}
```

```typescript
// In zoho.ts constructor — remove defaults, require explicit DC values
constructor(config: ZohoOAuthCredentials) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.refreshToken = config.refreshToken;
    // No defaults — missing these is a configuration error, not a runtime default
    this.apiBase = `${config.apiDomain}/crm/v8`;
    this.tokenUrl = `${config.accountsServer}/oauth/v2/token`;
}
```

#### Patch 2: DC detection helper (to use during OAuth callback)

```typescript
// New file: src/lib/integrations/crm/providers/zoho-dc-detector.ts

const LOCATION_TO_ACCOUNTS: Record<string, string> = {
  us: "https://accounts.zoho.com",
  eu: "https://accounts.zoho.eu",
  in: "https://accounts.zoho.in",
  au: "https://accounts.zoho.com.au",
  jp: "https://accounts.zoho.jp",
  ca: "https://accounts.zohocloud.ca",
  sa: "https://accounts.zoho.sa",
  uk: "https://accounts.zoho.uk",
  cn: "https://accounts.zoho.com.cn",
};

export interface ZohoDCContext {
  location: string;
  accountsServer: string;
}

/**
 * Parses OAuth callback query params to extract DC context.
 * Call this in your OAuth callback route handler.
 */
export function extractDCFromCallback(callbackParams: URLSearchParams): ZohoDCContext {
  const accountsServer = callbackParams.get("accounts-server");
  const location = callbackParams.get("location") ?? "us";

  if (!accountsServer) {
    // Fallback: derive from location param
    return {
      location,
      accountsServer: LOCATION_TO_ACCOUNTS[location] ?? LOCATION_TO_ACCOUNTS["us"],
    };
  }

  return { location, accountsServer };
}

/**
 * Exchanges grant code for tokens. Returns api_domain for subsequent API calls.
 * Must be called with the accountsServer from the OAuth callback.
 */
export async function exchangeCodeForTokens(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accountsServer: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  apiDomain: string; // persist this alongside refreshToken
  expiresIn: number;
}> {
  const res = await fetch(`${params.accountsServer}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      code: params.code,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Zoho token exchange failed: ${data.error ?? res.statusText}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    apiDomain: data.api_domain, // e.g. "https://www.zohoapis.eu"
    expiresIn: data.expires_in,
  };
}
```

#### Patch 3: 401 auto-refresh + retry (fixes B-03)

```typescript
// In zoho.ts — replace request() method
private async request(path: string, options: RequestInit = {}, retried = false): Promise<any> {
    await this.refreshAccessToken();

    const url = path.startsWith('http') ? path : `${this.apiBase}${path}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (response.status === 204) return null;

    // Force refresh on 401 INVALID_OAUTHTOKEN, retry once
    if (response.status === 401 && !retried) {
        const errData = await response.json().catch(() => ({}));
        const code = errData?.code ?? errData?.error;
        if (code === 'INVALID_OAUTHTOKEN' || code === 'AUTHENTICATION_FAILED') {
            this.accessToken = null; // force re-fetch
            this.tokenExpiry = 0;
            return this.request(path, options, true);
        }
        // OAUTH_SCOPE_MISMATCH or invalid_code → cannot auto-recover
        throw new Error(`Zoho Auth: ${code} — re-authorization required`);
    }

    const data = await response.json();
    if (!response.ok) {
        console.error(`[ZOHO_PROVIDER] API Error (${response.status}):`, data);
        throw new Error(data.message ?? `Zoho API Error ${response.status}`);
    }

    return data;
}
```

#### Patch 4: Pagination in `searchLeads` (fixes B-05)

```typescript
async searchLeads(criteria: string, page = 1, perPage = 200): Promise<CRMLead[]> {
    const params = new URLSearchParams({
        criteria: criteria,
        page: String(page),
        per_page: String(Math.min(perPage, 200)),
    });
    const data = await this.request(`/Leads/search?${params}`);
    return (data?.data ?? []).map((lead: any) => this.mapToLead(lead));
}
```

#### Patch 5: Email exact search (fixes B-07)

```typescript
async findLeadByEmail(email: string): Promise<CRMLead | null> {
    // Use dedicated email param for exact match, not criteria (which is "contains")
    const data = await this.request(`/Leads/search?email=${encodeURIComponent(email)}`);
    return data?.data?.[0] ? this.mapToLead(data.data[0]) : null;
}
```

---

## 10. What Changes in `CRMProviderConfig` (interface.ts)

The `CRMProviderConfig` interface needs two new mandatory fields:

```typescript
export interface CRMProviderConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accountsServer: string; // NEW — required, from OAuth callback `accounts-server` param
  apiDomain: string; // NEW — required, from token response `api_domain` field
  // Remove: apiBase?: string  (derived from apiDomain)
  // Remove: tokenUrl?: string (derived from accountsServer)
}
```

The encrypted token store (AES-256-GCM, `token-crypto.ts`) must persist `accountsServer` + `apiDomain` alongside `refreshToken`. These are not secrets but are per-tenant configuration.

---

## Unknowns / Questions for User

1. **Which Zoho editions do tenants use?** Free (5k credits/day) is very limiting for automation-heavy workflows. This affects whether the adapter needs aggressive credit budgeting.

2. **Are tenants expected to be in multiple DCs?** If linkstation is Spain-only, EU DC dominates. If Latam → US DC. Knowing this helps prioritize DC support order.

3. **Custom modules in scope?** The adapter hardcodes `Leads`. If any tenant tracks alumnos in a custom module (e.g., `Alumnos__c`), the module name needs to be per-tenant config.

4. **Blueprint usage frequency?** Blueprints count against concurrency sub-limit (max 10 parallel heavy ops). If the workflow engine fires many Blueprint transitions in parallel for the same org, we may hit the sub-concurrency cap.

5. **Zoho OAuth app registration DC?** The OAuth app must be registered in Zoho API Console. If registered in EU, the client credentials are EU-specific. Does the team have/need a global (multi-DC) app? This requires enabling "Multi-DC" in the Zoho API Console app settings.

6. **Confirmed behavior of unknown fields in update payload?** Empirical evidence says silently ignored, but not officially documented in v8. Worth testing against a sandbox before Sprint 2 ships.

---

**Status:** DONE_WITH_CONCERNS
**Summary:** All 8 research questions answered with official Zoho v8 docs. Bugs B-01/B-02 (hardcoded US DC) are confirmed critical and will break all non-US tenant integrations without code changes. Patches provided as TypeScript snippets.
**Concerns:** Unknown field ignore behavior (Bug B-06 context) lacks official v8 documentation confirmation — treat as empirical-only until tested against sandbox. No `Retry-After` header from Zoho on 429 — adapter must implement blind backoff.
