/** Public, non-secret constants for the AgentStack MCP connector. */

export const PACKAGE_NAME = "@agentstack/mcp";
export const SERVER_NAME = "agentstack";
export const DEFAULT_MCP_URL = "https://agentstack.tech/mcp";

export const ENV = {
  /** User or project API key (sent as `X-API-Key`). Keys look like `ask_…`. */
  apiKey: "AGENTSTACK_API_KEY",
  /** OAuth / Device Code access token (sent as `Authorization: Bearer …`). */
  accessToken: "AGENTSTACK_ACCESS_TOKEN",
  /** Override the endpoint (for staging / self-test). Must be https unless localhost. */
  url: "AGENTSTACK_MCP_URL",
  /** Set to `1` for verbose bridge logs on stderr (never includes secrets). */
  debug: "AGENTSTACK_MCP_DEBUG",
} as const;

export const LINKS = {
  site: "https://agentstack.tech",
  docs: "https://agentstack.tech/mcp-docs",
  pricing: "https://agentstack.tech/pricing",
  apiKeys: "https://agentstack.tech/user/profile?tab=api",
  health: "https://agentstack.tech/mcp/health",
  actions: "https://agentstack.tech/mcp/actions",
  summary: "https://agentstack.tech/mcp/actions/summary",
  repo: "https://github.com/agentstacktech/AgentStack-MCP",
} as const;
