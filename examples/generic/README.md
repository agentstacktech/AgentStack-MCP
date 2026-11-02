# Generic Streamable HTTP

| Field | Value |
|---|---|
| URL | `https://agentstack.tech/mcp` |
| Transport | MCP Streamable HTTP (POST JSON-RPC; responses are `application/json`) |
| Auth | OAuth 2.1 (PKCE S256, DCR) **or** `X-API-Key: ask_…` **or** `Authorization: Bearer <token>` |
| OAuth metadata | `https://agentstack.tech/.well-known/oauth-protected-resource/mcp` |
| Tools | one tool, `agentstack.execute` (batches of catalog actions) |

`initialize` and `tools/list` work without credentials; `tools/call` returns HTTP 401 with a
`WWW-Authenticate: Bearer resource_metadata=…` header until you authenticate.

```bash
# initialize (no key needed)
curl -s https://agentstack.tech/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'

# list tools (no key needed)
curl -s https://agentstack.tech/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# call a tool (key required)
curl -s https://agentstack.tech/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -H "X-API-Key: $AGENTSTACK_API_KEY" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"agentstack.execute","arguments":{"steps":[{"id":"me","action":"auth.get_profile","params":{}}]}}}'
```

## stdio-only clients

Any client that only speaks stdio can use the bridge:

```json
{ "command": "npx", "args": ["-y", "@agentstack/mcp"], "env": { "AGENTSTACK_API_KEY": "ask_…" } }
```
