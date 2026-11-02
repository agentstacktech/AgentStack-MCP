import os from "node:os";
import path from "node:path";
import { DEFAULT_MCP_URL, ENV, PACKAGE_NAME, SERVER_NAME } from "./constants.js";

export const CLIENTS = ["cursor", "claude-desktop", "vscode", "windsurf"] as const;
export type ClientId = (typeof CLIENTS)[number];

/**
 * - `remote`: the client talks to https://agentstack.tech/mcp directly (OAuth on 401,
 *    or an API key header taken from an env var at runtime).
 * - `stdio`:  the client launches `npx -y @agentstack/mcp`, which bridges to the remote endpoint.
 */
export type Mode = "remote" | "stdio";

export interface ClientSpec {
  id: ClientId;
  label: string;
  /** Top-level key holding the servers map. */
  rootKey: "mcpServers" | "servers";
  modes: Mode[];
  defaultMode: Mode;
  /** Config file for the given scope. */
  configPath(opts: { scope: "global" | "project"; cwd: string; home: string; platform: NodeJS.Platform; appData?: string }): string;
  /** The server entry to write. `withKey` adds an API-key header via the client's own env/secret mechanism. */
  entry(mode: Mode, withKey: boolean, literalKey?: string): Record<string, unknown>;
  /** Extra top-level keys (e.g. VS Code `inputs`). */
  extras?(mode: Mode, withKey: boolean): Record<string, unknown>;
}

export const KEY_PLACEHOLDER = "ask_REPLACE_WITH_YOUR_KEY";

export const NPX_ARGS = ["-y", PACKAGE_NAME];

function stdioEntry(envValue?: string): Record<string, unknown> {
  const entry: Record<string, unknown> = { command: "npx", args: [...NPX_ARGS] };
  if (envValue) entry.env = { [ENV.apiKey]: envValue };
  return entry;
}

const homeConfig = (rel: string[]) => ({ home }: { home: string }) => path.join(home, ...rel);

export const SPECS: Record<ClientId, ClientSpec> = {
  cursor: {
    id: "cursor",
    label: "Cursor",
    rootKey: "mcpServers",
    modes: ["remote", "stdio"],
    defaultMode: "remote",
    configPath: ({ scope, cwd, home }) =>
      scope === "project" ? path.join(cwd, ".cursor", "mcp.json") : path.join(home, ".cursor", "mcp.json"),
    entry: (mode, withKey) =>
      mode === "stdio"
        ? stdioEntry(withKey ? `\${env:${ENV.apiKey}}` : undefined)
        : {
            url: DEFAULT_MCP_URL,
            ...(withKey ? { headers: { "X-API-Key": `\${env:${ENV.apiKey}}` } } : {}),
          },
  },
  "claude-desktop": {
    id: "claude-desktop",
    label: "Claude Desktop",
    rootKey: "mcpServers",
    modes: ["stdio"],
    defaultMode: "stdio",
    configPath: ({ home, platform, appData }) => {
      if (platform === "darwin") return path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
      if (platform === "win32") return path.join(appData ?? path.join(home, "AppData", "Roaming"), "Claude", "claude_desktop_config.json");
      return path.join(home, ".config", "Claude", "claude_desktop_config.json");
    },
    // Claude Desktop launches local (stdio) servers and does not expand env vars in this
    // file, so a placeholder is written unless the user opts in with --embed-key.
    entry: (_mode, _withKey, literalKey) => stdioEntry(literalKey ?? KEY_PLACEHOLDER),
  },
  vscode: {
    id: "vscode",
    label: "VS Code",
    rootKey: "servers",
    modes: ["remote", "stdio"],
    defaultMode: "remote",
    configPath: ({ cwd }) => path.join(cwd, ".vscode", "mcp.json"),
    entry: (mode, withKey) =>
      mode === "stdio"
        ? { type: "stdio", ...stdioEntry(withKey ? "${input:agentstack-api-key}" : undefined) }
        : {
            type: "http",
            url: DEFAULT_MCP_URL,
            ...(withKey ? { headers: { "X-API-Key": "${input:agentstack-api-key}" } } : {}),
          },
    extras: (_mode, withKey) =>
      withKey
        ? {
            inputs: [
              {
                type: "promptString",
                id: "agentstack-api-key",
                description: "AgentStack API key (ask_…)",
                password: true,
              },
            ],
          }
        : {},
  },
  windsurf: {
    id: "windsurf",
    label: "Windsurf",
    rootKey: "mcpServers",
    modes: ["remote", "stdio"],
    defaultMode: "remote",
    configPath: homeConfig([".codeium", "windsurf", "mcp_config.json"]),
    entry: (mode, withKey) =>
      mode === "stdio"
        ? stdioEntry(withKey ? `\${env:${ENV.apiKey}}` : undefined)
        : {
            serverUrl: DEFAULT_MCP_URL,
            ...(withKey ? { headers: { "X-API-Key": `\${env:${ENV.apiKey}}` } } : {}),
          },
  },
};

export function isClientId(value: string): value is ClientId {
  return (CLIENTS as readonly string[]).includes(value);
}

export function defaultEnv() {
  return {
    home: os.homedir(),
    cwd: process.cwd(),
    platform: process.platform,
    appData: process.env.APPDATA,
  };
}

export { SERVER_NAME };
