# Transport & auth reference

Observed against the public endpoint on 2026-11-02 (server `agentstack` 0.4.24). The service may evolve;
the live endpoint is authoritative.

| Item | Behaviour |
|---|---|
| Endpoint | `POST https://agentstack.tech/mcp` (MCP Streamable HTTP) |
| Responses | `application/json` (no SSE stream needed); no `Mcp-Session-Id` returned (stateless) |
| Protocol versions | `2026-07-28`, `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05` accepted at `initialize` |
| Unauthenticated | `initialize`, `tools/list`, `prompts/list` succeed |
| `tools/call` without auth | HTTP 401, `code: auth_required`, `WWW-Authenticate: Bearer resource_metadata="https://agentstack.tech/.well-known/oauth-protected-resource/mcp"` |
| Auth headers | `X-API-Key: ask_…` or `Authorization: Bearer <token>` |
| OAuth | issuer `https://agentstack.tech/mcp`; authorize/token/register under `/mcp/.well-known/oauth-*`; PKCE `S256`; DCR; scopes `openid tools:read tools:invoke` |
| Tools | one: `agentstack.execute` — `{ steps: [{id, action, params}], context: {project_id}, options: {async, idempotency_key, …} }`, up to 50 steps |
| Catalog | live counts at `GET /mcp/actions/summary`; health at `GET /mcp/health` |
| Icon | `https://agentstack.tech/mcp/icon` (PNG) |

## How the bridge maps this

- `AGENTSTACK_ACCESS_TOKEN` → `Authorization: Bearer …` (takes precedence)
- `AGENTSTACK_API_KEY` → `X-API-Key: …`
- neither → unauthenticated: listing works, calls return MCP error `-32001` telling the user to set a key.
- Other upstream failures on a request become JSON-RPC `-32603` errors so the client never hangs.
