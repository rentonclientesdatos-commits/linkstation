# Researcher Report 01 — HubSpot CRM v3 API + OAuth 2.0

**Date:** 2026-05-24
**Scope:** HubSpot Public App OAuth 2.0 flow, CRM v3 endpoints, rate limits, field mapping, SDK vs fetch, webhook signature verification.
**Target:** `src/lib/integrations/crm/providers/hubspot.ts` implementing `ICRMProvider`.

---

## TLDR

- **Public App + OAuth 2.0 mandatory** for multi-tenant (one set of tokens per `portal_id`).
- **Access token: 30 min TTL**; refresh tokens do not expire unless app uninstalled or revoked.
- **Token endpoint:** `https://api.hubapi.com/oauth/v1/token` (NOT `v3` — two endpoints exist, v1 is production-stable).
- **Search API hard cap: 4 req/s** across ALL search endpoints combined — this is the binding constraint for `searchLeads()`.
- **Reject `@hubspot/api-client` SDK**: 13.5.0 is ~40MB unpacked, `node-fetch`-based (incompatible with Next.js Edge Runtime), non-tree-shakeable. Raw `fetch` is the right call per KISS+YAGNI.

---

## 1. OAuth 2.0 Flow

### URLs

| Step                           | URL                                                     |
| ------------------------------ | ------------------------------------------------------- |
| Authorization                  | `https://app.hubspot.com/oauth/authorize`               |
| Token exchange / refresh       | `https://api.hubapi.com/oauth/v1/token`                 |
| Token introspection (optional) | `https://api.hubapi.com/oauth/v1/access-tokens/{token}` |

> Note: A second token endpoint `https://api.hubspot.com/oauth/v3/token` exists and is referenced in newer blog posts. Both appear to work. **Use v1 (`api.hubapi.com`)** — it is the endpoint in the official legacy-stable OAuth guide and in all production case studies reviewed.

### Authorize URL construction

```
https://app.hubspot.com/oauth/authorize
  ?client_id=CLIENT_ID
  &scope=crm.objects.contacts.read%20crm.objects.contacts.write%20crm.schemas.contacts.read%20crm.objects.deals.read%20crm.objects.tasks.write%20crm.objects.notes.write
  &redirect_uri=https%3A%2F%2Fyourapp.com%2Fauth%2Fhubspot%2Fcallback
  &state=RANDOM_STATE_CSRF_TOKEN
```

`optional_scopes` param also supported — use it for scopes the app degrades gracefully without.

### Scopes mínimos requeridos

| Capability                      | Scope                                                       |
| ------------------------------- | ----------------------------------------------------------- |
| Leer contactos                  | `crm.objects.contacts.read`                                 |
| Crear/actualizar contactos      | `crm.objects.contacts.write`                                |
| Leer custom properties (schema) | `crm.schemas.contacts.read`                                 |
| Leer deals                      | `crm.objects.deals.read`                                    |
| Crear tasks                     | `crm.objects.tasks.write` (or use `tickets` scope — see §2) |
| Crear meetings/notes/calls      | `crm.objects.notes.write`                                   |
| Añadir a listas estáticas       | `crm.lists.write`                                           |
| Leer listas                     | `crm.lists.read`                                            |

> HubSpot's scope documentation for engagements/tasks is incomplete in their public scope table. Community consensus: `crm.objects.tasks.write` works for tasks; meetings and notes are covered by their respective object scopes. Verify during app registration — HubSpot shows available scopes in the developer portal UI.

### Token lifetimes

- **Access token:** 1800 s (30 min). Response includes `expires_in: 1800`.
- **Refresh token:** **Does not expire** under normal conditions. Invalidated by: (a) user uninstalls app, (b) developer revokes manually, (c) scope change on the app. Always store the latest refresh token returned (HubSpot may rotate it).

### Token refresh flow

```
POST https://api.hubapi.com/oauth/v1/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&client_id=CLIENT_ID
&client_secret=CLIENT_SECRET
&refresh_token=STORED_REFRESH_TOKEN
```

Response: `{ access_token, refresh_token, expires_in, token_type }`.

**Key implementation detail:** refresh 5 min before expiry (at `expires_in - 300 s`), not on 401. Waiting for 401 causes request failure during token swap.

### Redirect URI

- Must be registered exactly in the HubSpot developer portal (including protocol and path).
- **One URI per app** in the basic flow. Wildcard subdomains are NOT supported.
- For multi-tenant SaaS: use a single redirect URI on your platform (`/auth/hubspot/callback`), then route by `state` param or session.

### App type decision

| Type           | Use case                      | Auth                        |
| -------------- | ----------------------------- | --------------------------- |
| **Public App** | Multi-tenant SaaS — MANDATORY | OAuth 2.0 per-portal tokens |
| Private App    | Single-portal internal tool   | Long-lived static token     |
| Static API Key | **Deprecated** — do not use   | —                           |

**Verdict: Public App, OAuth 2.0.** Multi-tenant requirement makes this non-negotiable. Each tenant's `portal_id` (returned in the token exchange response as `hub_id`) is the key for token storage.

---

## 2. API Endpoints Clave (v3)

All endpoints: `https://api.hubapi.com`

### Contactos CRUD

| Op           | Method | Path                                                                             |
| ------------ | ------ | -------------------------------------------------------------------------------- |
| Crear        | POST   | `/crm/v3/objects/contacts`                                                       |
| Leer por ID  | GET    | `/crm/v3/objects/contacts/{contactId}?properties=firstname,lastname,email,phone` |
| Actualizar   | PATCH  | `/crm/v3/objects/contacts/{contactId}`                                           |
| Buscar       | POST   | `/crm/v3/objects/contacts/search`                                                |
| Batch create | POST   | `/crm/v3/objects/contacts/batch/create`                                          |
| Batch update | POST   | `/crm/v3/objects/contacts/batch/update` (max 100/req)                            |

### Search body syntax

```json
POST /crm/v3/objects/contacts/search
{
  "filterGroups": [
    {
      "filters": [
        {
          "propertyName": "email",
          "operator": "EQ",
          "value": "lead@example.com"
        }
      ]
    }
  ],
  "properties": ["firstname", "lastname", "email", "phone", "country"],
  "limit": 100,
  "after": "CURSOR_FROM_PREVIOUS_RESPONSE"
}
```

Available operators: `EQ`, `NEQ`, `LT`, `LTE`, `GT`, `GTE`, `BETWEEN`, `IN`, `NOT_IN`, `HAS_PROPERTY`, `NOT_HAS_PROPERTY`, `CONTAINS_TOKEN`, `NOT_CONTAINS_TOKEN`.

Pagination: response includes `paging.next.after` — pass as `after` in next request. **Hard limit: 10,000 records per search query** (use property-based segmentation to go beyond). Max per page: 200.

Up to 6 `filterGroups` (OR between groups, AND within a group).

### Custom Properties

```
GET  /crm/v3/properties/contacts                         → list all
POST /crm/v3/properties/contacts                         → create
GET  /crm/v3/properties/contacts/{propertyName}          → get single
```

Create body:

```json
{
  "groupName": "contactinformation",
  "name": "af_curso_interes",
  "label": "Curso de interés (AF)",
  "type": "string",
  "fieldType": "text"
}
```

String values: max 65,536 chars. Property `name` (internal): lowercase, underscores, no spaces.

### Tags → HubSpot Lists

HubSpot does NOT have a "tags" concept on contacts. Equivalent: **static lists** via Lists API v3.

```
POST /crm/v3/lists/{listId}/memberships/add-from-ids
Body: { "recordIdsToAdd": ["contact_id_1", "contact_id_2"] }
```

Get all lists: `GET /crm/v3/lists/?objectTypeId=0-1` (contacts).

> **Warning:** The v1 Contact Lists API sunsets **2026-04-30**. Must use v3 (`/crm/v3/lists/`). There are known community reports of sporadic empty-response bugs on list membership add — implement retry logic.

`addTags()` implementation strategy:

1. Accept tags as list names or IDs.
2. Resolve list IDs via `GET /crm/v3/lists/?name={tag}` (or cache list name→ID map).
3. Add contact to each list via `/memberships/add-from-ids`.

### Engagements (Meetings, Tasks, Notes, Calls)

HubSpot v3 treats each engagement type as its own CRM object:

| Type     | Endpoint                   |
| -------- | -------------------------- |
| Tasks    | `/crm/v3/objects/tasks`    |
| Meetings | `/crm/v3/objects/meetings` |
| Notes    | `/crm/v3/objects/notes`    |
| Calls    | `/crm/v3/objects/calls`    |

**Create task associated to contact:**

```json
POST /crm/v3/objects/tasks
{
  "properties": {
    "hs_task_subject": "Llamar al lead",
    "hs_task_body": "Descripción...",
    "hs_task_status": "NOT_STARTED",
    "hs_task_priority": "HIGH",
    "hs_timestamp": "2026-06-01T10:00:00Z"
  },
  "associations": [
    {
      "to": { "id": "CONTACT_ID" },
      "types": [{ "associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 204 }]
    }
  ]
}
```

**Create meeting associated to contact:**

```json
POST /crm/v3/objects/meetings
{
  "properties": {
    "hs_meeting_title": "Demo inicial",
    "hs_meeting_start_time": "1748779200000",
    "hs_meeting_end_time": "1748782800000",
    "hs_meeting_body": "Descripción..."
  },
  "associations": [
    {
      "to": { "id": "CONTACT_ID" },
      "types": [{ "associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 212 }]
    }
  ]
}
```

> **Critical:** Meeting timestamps are **epoch milliseconds** (not ISO 8601). Task `hs_timestamp` accepts ISO 8601. This inconsistency is real and documented in community threads — the adapter must handle both formats.

### Workflows (executeAction)

HubSpot **does NOT expose a direct "enroll contact in workflow" API endpoint** in production v3. The Workflows v4 API (beta) allows CRUD on workflow definitions but not programmatic enrollment of individual contacts.

Workaround pattern (production-viable):

1. Set a custom contact property (e.g., `af_workflow_trigger = "send_nurture_email"`).
2. The HubSpot workflow listens to `contact property X changes to Y` as enrollment trigger.
3. The API call to PATCH the property indirectly triggers the workflow.

This means `executeAction()` in the HubSpot adapter = PATCH a trigger property on the contact. The `actionId` maps to a property name/value pair. Document this as a project-specific convention.

---

## 3. Rate Limits

| Scope                 | Limit                           | Notes                                                                            |
| --------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| General burst (OAuth) | 110 req / 10 s                  | Per portal, for marketplace apps                                                 |
| Search API            | **4 req / s** (= 40 req / 10 s) | Across ALL search endpoints combined — binding constraint                        |
| Daily (Pro accounts)  | 650,000 req / day               | No daily limit for OAuth apps per HubSpot docs (conflicting info — see unknowns) |
| Batch size            | 100 records / req               | Batch create/update                                                              |
| Search results        | 10,000 max per query            | Hard cap — paginate with property filters                                        |

### Response headers

```
X-HubSpot-RateLimit-Remaining         → requests left in current window
X-HubSpot-RateLimit-Max               → max requests in window
X-HubSpot-RateLimit-Interval-Milliseconds → window size in ms
X-HubSpot-RateLimit-Daily             → daily limit (not present for OAuth apps)
X-HubSpot-RateLimit-Daily-Remaining   → remaining daily (not present for OAuth apps)
```

> `X-HubSpot-RateLimit-Secondly` and `X-HubSpot-RateLimit-Secondly-Remaining` are deprecated — ignore them.

### Retry strategy

On **429**: read `Retry-After` header (seconds). If absent, use exponential backoff: 1s, 2s, 4s, 8s, cap at 32s.
On **5xx**: retry with exponential backoff, max 3 attempts.
On **search API 429**: always wait at least 250ms (= 1/4 req/s) before retry. Consider a simple in-process rate limiter (tokens bucket, 4 req/s) for `searchLeads()`.

---

## 4. Webhooks (Post-MVP reference)

Not required for MVP but document for Fase 3 implementation:

- Subscribe via: `POST https://api.hubapi.com/webhooks/v3/{appId}/subscriptions`
- Key events: `contact.creation`, `contact.propertyChange`, `contact.deletion`, `deal.creation`
- Signature verification: **v3 signature** — header `X-HubSpot-Signature-V3` + `X-HubSpot-Request-Timestamp`

**Verification algorithm (v3):**

1. Reject if `X-HubSpot-Request-Timestamp` is > 5 min old.
2. Decode URL-encoded chars in request URI.
3. Concatenate: `METHOD + fullURL + requestBody + timestamp` (utf-8 string).
4. HMAC-SHA-256 using app client secret as key.
5. Base64-encode the hash.
6. Constant-time compare with `X-HubSpot-Signature-V3`.

> Note: v3 signatures are Base64 (not hex). Use `timingSafeEqual` from Node `crypto` to prevent timing attacks.

---

## 5. Field Mapping: Proyecto → HubSpot

| Project field      | HubSpot property (internal name)                                             | Type               | Notes                                                                                                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nombre`           | `firstname`                                                                  | string             | —                                                                                                                                                                                                                              |
| `apellido`         | `lastname`                                                                   | string             | —                                                                                                                                                                                                                              |
| `email`            | `email`                                                                      | string             | Unique identifier — HubSpot deduplicates by email                                                                                                                                                                              |
| `telefono`         | `phone`                                                                      | string             | Auto-formatted by HubSpot per country code                                                                                                                                                                                     |
| `pais`             | `country`                                                                    | string             | Free text; no ISO enforcement in API                                                                                                                                                                                           |
| `origen`           | `hs_lead_status` (partial) OR custom `af_origen`                             | enumeration/string | `hs_lead_status` tracks buyer cycle stage, not traffic source. True source equivalent is `hs_original_source` (read-only, set by HubSpot) or `hs_analytics_source`. For writable lead origin: use custom property `af_origen`. |
| `segmentacion`     | Lists membership (static lists as tags)                                      | —                  | Map to list add/remove operations                                                                                                                                                                                              |
| `metadata` (jsonb) | **Custom properties, typed** (preferred) OR single `af_metadata_json` string | string/typed       | See recommendation below                                                                                                                                                                                                       |

### `metadata` field strategy

**Recommendation: typed custom properties over JSON blob.**

- Create one custom property per known metadata key (e.g., `af_curso_interes`, `af_presupuesto`, `af_nivel_educacion`).
- Advantages: HubSpot can filter/segment on typed fields; workflows can use them as triggers.
- Disadvantage: requires provisioning properties on first connect (call `POST /crm/v3/properties/contacts` per property if not exists).
- Fallback for truly dynamic/unknown keys: store as `af_metadata_extra` (type: `string`, fieldType: `textarea`, 65k char limit) with JSON-serialized content.

**Not recommended:** single JSON blob for all metadata — HubSpot can't query into it, negating the CRM value.

---

## 6. Diferencias técnicas vs Zoho

| Dimension                | Zoho CRM                                                                    | HubSpot CRM                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Error format**         | `{ data: [{ status: "error", code: "...", message: "...", details: {} }] }` | `{ status: "error", message: "...", error: "...", correlationId: "..." }` or `{ category, subCategory, message }` — **inconsistent by endpoint** |
| **Paginación**           | Offset-based (`page`, `per_page`)                                           | **Cursor-based** (`after` = opaque string from `paging.next.after`)                                                                              |
| **Fechas**               | ISO 8601 strings throughout                                                 | **Mixed**: contact properties = ISO 8601; meeting timestamps = **epoch ms**; some filter values require epoch ms. Must handle both in adapter.   |
| **Multi-tenancy**        | One portal per OAuth credential set                                         | Same — but HubSpot calls it `portal_id` / `hub_id`. Returned in token response.                                                                  |
| **Tags concept**         | Native `tag_names` field on Leads                                           | **No tags** — use static list membership as equivalent                                                                                           |
| **Blueprints/Workflows** | Direct API to transition Blueprint state                                    | No direct enrollment API — indirect via property-change trigger                                                                                  |
| **Auth header**          | `Zoho-oauthtoken {token}`                                                   | `Bearer {token}` (standard)                                                                                                                      |
| **Rate limit signal**    | `X-RATELIMIT-LIMIT` header                                                  | `X-HubSpot-RateLimit-Remaining` family                                                                                                           |
| **Search object**        | Contacts are "Leads" module                                                 | Contacts are "contacts" (`/crm/v3/objects/contacts`) — no separate Lead object by default                                                        |

**Adapter design implication:** The `mapToLead()` function in HubSpot adapter must normalize epoch-ms dates to ISO 8601 on read, and convert ISO 8601 to epoch-ms when writing meeting timestamps. This conversion belongs in the adapter, not in shared code.

---

## 7. SDK vs Fetch puro

### `@hubspot/api-client` v13.5.0

| Factor           | Assessment                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Size             | ~40MB unpacked; depends on `node-fetch` — **incompatible with Next.js Edge Runtime and App Router server components without polyfill** |
| TypeScript       | Included but "some examples won't work in TypeScript without changes" per npm page                                                     |
| OAuth refresh    | Provides `oauth.tokensApi.createToken()` but does NOT auto-refresh expired tokens — you still manage the refresh loop                  |
| Rate limiting    | Includes `bottleneck` dependency for rate limiting — useful but duplicates infrastructure you'd otherwise control                      |
| Tree-shaking     | **Not tree-shakeable** — full SDK loaded even for single endpoint                                                                      |
| Weekly DLs       | 445k/week — well-maintained, not abandoned                                                                                             |
| Breaking changes | Major version bumps are frequent (v8→v10→v13) — upgrade burden                                                                         |

### Verdict: **Fetch puro**

Rationale:

1. **Edge Runtime compat**: Next.js 16 App Router may run server actions in Edge Runtime — `node-fetch` breaks this. Native `fetch` (available in Node 18+/Edge) works everywhere.
2. **KISS**: The Zoho adapter pattern (private `request()` wrapper + `refreshAccessToken()`) is already proven and covers 100% of what's needed. Copy that pattern.
3. **Bundle size**: SDK adds ~40MB unpacked for zero functional gain given our wrapper pattern.
4. **ADR applies**: project rule requires ADR for any new prod dependency. The SDK adds 7 dependencies (bottleneck, node-fetch, lodash.merge, form-data, es6-promise, etc.) — all avoidable.
5. **Only risk**: must manually type HubSpot request/response shapes — acceptable given the small surface area of `ICRMProvider`.

---

## Code Snippets

### OAuth Refresh + Proactive Token Management (mirrors Zoho pattern)

```typescript
private async refreshAccessToken(): Promise<void> {
  if (this.accessToken && Date.now() < this.tokenExpiry) return;

  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`HubSpot Auth Error: ${data.message || response.statusText}`);
  }

  this.accessToken = data.access_token;
  // Refresh 5 min before expiry (expires_in = 1800s typically)
  this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  // HubSpot may rotate refresh_token — persist if returned
  if (data.refresh_token) {
    this.refreshToken = data.refresh_token;
    // Caller must persist updated refreshToken to encrypted storage
    this.onTokenRotated?.(data.refresh_token);
  }
}
```

### Create Contact

```typescript
async createContact(fields: Record<string, string>): Promise<string> {
  const response = await this.request("/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        firstname: fields.nombre,
        lastname: fields.apellido,
        email: fields.email,
        phone: fields.telefono,
        country: fields.pais,
      },
    }),
  });
  return response.id; // HubSpot returns { id, properties, ... }
}
```

### Search by Email

```typescript
async searchLeads(criteria: string): Promise<CRMLead[]> {
  // criteria = "email:lead@example.com" convention (match Zoho adapter pattern)
  const [field, value] = criteria.includes(":")
    ? criteria.split(":")
    : ["email", criteria];

  const data = await this.request("/crm/v3/objects/contacts/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [{
        filters: [{
          propertyName: field,
          operator: "EQ",
          value: value,
        }],
      }],
      properties: ["firstname", "lastname", "email", "phone", "country", "hs_lead_status"],
      limit: 100,
    }),
  });

  return (data?.results || []).map((contact: any) => this.mapToLead(contact));
}

private mapToLead(raw: any): CRMLead {
  const p = raw.properties || {};
  return {
    id: raw.id,
    fields: {
      nombre: p.firstname || "",
      apellido: p.lastname || "",
      email: p.email || "",
      telefono: p.phone || "",
      pais: p.country || "",
      origen: p.hs_lead_status || "",
    },
    raw,
  };
}
```

### Create Task (with contact association)

```typescript
async createTask(leadId: string, taskData: { subject: string; description?: string; dueDate?: string; priority?: string }) {
  return this.request("/crm/v3/objects/tasks", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_task_subject: taskData.subject,
        hs_task_body: taskData.description || "",
        hs_task_status: "NOT_STARTED",
        hs_task_priority: taskData.priority?.toUpperCase() || "MEDIUM",
        hs_timestamp: taskData.dueDate || new Date().toISOString(),
      },
      associations: [{
        to: { id: leadId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 204 }],
      }],
    }),
  });
}
```

### Create Meeting (epoch ms timestamps)

```typescript
async createEvent(leadId: string, eventData: { subject: string; startTime: string; durationMinutes: number; description?: string }) {
  const startMs = new Date(eventData.startTime).getTime();
  const endMs = startMs + eventData.durationMinutes * 60_000;

  return this.request("/crm/v3/objects/meetings", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_meeting_title: eventData.subject,
        hs_meeting_start_time: startMs.toString(),  // epoch ms as string
        hs_meeting_end_time: endMs.toString(),       // epoch ms as string
        hs_meeting_body: eventData.description || "",
      },
      associations: [{
        to: { id: leadId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 212 }],
      }],
    }),
  });
}
```

---

## Unknowns / Preguntas para el Equipo

1. **Refresh token rotation:** HubSpot docs say refresh tokens don't expire, but production blog posts mention "they may return a new refresh_token." The adapter snippet above handles this via `onTokenRotated` callback — confirm whether the encrypted token store in `token-crypto.ts` supports live rotation (i.e., does it re-encrypt and persist the new value mid-session?).

2. **Exact scope for `crm.objects.tasks.write`**: HubSpot's public scope table does not explicitly list tasks. During HubSpot app registration, verify this scope name is accepted in the developer portal. Community posts confirm it works but docs are thin.

3. **`executeAction` convention**: Mapped to "set a trigger property on the contact." The team needs to define which custom contact property acts as the workflow trigger (e.g., `af_workflow_trigger`) and register it in HubSpot first. This is a business-level decision, not a code decision.

4. **`addTags` list resolution**: Should the adapter accept list names (string labels) and resolve to list IDs on each call, or should the integration UI let tenants map tag strings to HubSpot list IDs at setup time (stored in tenant config)? The second option avoids a list lookup API call per `addTags` invocation and is more robust.

5. **Daily rate limit for OAuth apps**: Official docs say "no daily limit for OAuth apps." The `X-HubSpot-RateLimit-Daily` header is absent for OAuth calls. But Pro/Enterprise accounts have 650k/1M daily limits for API key calls. Confirm at runtime by inspecting headers after first API call.

6. **`CRMProviderConfig.tokenUrl`** field in the existing interface: the Zoho adapter uses this as the OAuth token URL. For HubSpot, this field could carry the `api.hubapi.com/oauth/v1/token` URL. No change to the interface needed, but the HubSpot adapter constructor should default it correctly.

7. **Portal ID storage**: when the OAuth callback completes and tokens are issued, the `hub_id` / `portal_id` is returned. Where in linkstation's database schema does this live? Needed for keying encrypted tokens per tenant. If not yet defined, Sprint 2 must include a migration.

---

## Sources

- [HubSpot OAuth Token Management (official blog)](https://developers.hubspot.com/blog/oauth-token-management-hubspot-integrations)
- [HubSpot Scalable OAuth Implementation](https://developers.hubspot.com/blog/the-scalable-way-to-implement-hubspot-oauth-in-public-apps)
- [Public vs Private App guide (official)](https://developers.hubspot.com/blog/hubspot-integration-choosing-private-public-hubspot-apps)
- [HubSpot API Usage Guidelines & Limits](https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines)
- [CRM Search API Rate Limit Changelog](https://developers.hubspot.com/changelog/crm-search-api-rate-limit-increase)
- [Properties API v3 Guide](https://developers.hubspot.com/docs/api-reference/crm-properties-v3/guide)
- [Search Contacts API Reference](https://developers.hubspot.com/docs/api-reference/crm-contacts-v3/search/post-crm-v3-objects-contacts-search)
- [Lists API v1→v3 Migration Guide](https://developers.hubspot.com/docs/api-reference/crm-lists-v3/v1-migration-guide)
- [Webhook Signature v3 Changelog](https://developers.hubspot.com/changelog/introducing-version-3-of-webhook-signatures)
- [Working with OAuth (legacy apps)](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/working-with-oauth)
- [Rate limit headers changelog](https://developers.hubspot.com/changelog/2018-11-06-rate-limit-information-headers-will-be-included-in-http-responses)
- [@hubspot/api-client npm](https://www.npmjs.com/package/@hubspot/api-client)
- [HubSpot default contact properties](https://knowledge.hubspot.com/properties/hubspots-default-contact-properties)

---

**Status:** DONE_WITH_CONCERNS
**Summary:** All 7 research questions answered with sufficient depth for implementation. Fetch-pure adapter is definitively better than SDK for this stack.
**Concerns:** (1) HubSpot scope table incomplete for tasks/engagements — verify in developer portal during app registration before coding. (2) Refresh token rotation behavior needs runtime confirmation — adapter snippet includes defensive handling but test against real HubSpot portal. (3) The `executeAction → workflow` pattern via property-change is a significant semantic departure from Zoho's Blueprint API; team should align on the `af_workflow_trigger` convention before implementing.
