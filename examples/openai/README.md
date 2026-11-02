# OpenAI / ChatGPT

## ChatGPT (connectors / apps)

1. In ChatGPT, open the connectors / apps settings (menu names and developer-mode requirements vary by plan).
2. Create a connector with the MCP server URL `https://agentstack.tech/mcp`.
3. Choose **OAuth**. AgentStack supports Dynamic Client Registration, so ChatGPT registers itself:
   - authorize: `https://agentstack.tech/mcp/.well-known/oauth-authorize`
   - token: `https://agentstack.tech/mcp/.well-known/oauth-token`
   - register: `https://agentstack.tech/mcp/.well-known/oauth-register`
   - scopes: `openid tools:read tools:invoke`
4. Sign in to AgentStack when prompted.

The official ChatGPT/Codex plugin lives at <https://github.com/agentstacktech/gpt-plugin>.

## OpenAI Responses API

See [`responses-api.json`](./responses-api.json) for a remote-MCP tool definition. Load the key from your
secret store or environment at request time; never commit it.

```bash
curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "model": "<any Responses-API model with remote MCP support>",
  "tools": [{
    "type": "mcp",
    "server_label": "agentstack",
    "server_url": "https://agentstack.tech/mcp",
    "headers": { "X-API-Key": "$AGENTSTACK_API_KEY" },
    "require_approval": "always"
  }],
  "input": "Run auth.get_profile via agentstack.execute."
}
JSON
```
