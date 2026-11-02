# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

- Use GitHub's private vulnerability reporting for this repository
  (**Security → Report a vulnerability**), or
- contact AgentStack through the channels listed at <https://agentstack.tech>.

Include the affected version, reproduction steps and impact. We aim to acknowledge reports promptly.

Scope: this repository contains only the open-source connector. Issues in the hosted AgentStack
service (`agentstack.tech`) are welcome through the same private channels.

## Handling credentials

- Prefer **OAuth** sign-in (remote URL configs with no headers). Your client stores the token.
- If you use an API key, keep it in an environment variable (`AGENTSTACK_API_KEY`) or your client's
  secret input (VS Code `${input:…}`), **not** in a committed file.
- `agentstack-mcp init` never writes a key into a config unless you pass `--embed-key`
  (Claude Desktop only); that file is then created with mode `0600`.
- The connector never logs key values; debug output (`AGENTSTACK_MCP_DEBUG=1`) only shows the auth type.
- Use least-privilege, project-scoped keys where possible and rotate them at
  <https://agentstack.tech/user/profile?tab=api> if exposed.
