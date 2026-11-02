import { DEFAULT_MCP_URL, ENV } from "./constants.js";

export interface BridgeConfig {
  url: URL;
  headers: Record<string, string>;
  auth: "api-key" | "bearer" | "none";
  debug: boolean;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** Validate the endpoint: https only, except loopback for local testing. */
export function parseEndpoint(raw: string | undefined): URL {
  const value = (raw ?? "").trim() || DEFAULT_MCP_URL;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigError(`Invalid ${ENV.url}: not a URL`);
  }
  const local = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new ConfigError(`${ENV.url} must use https:// (http:// is allowed only for localhost)`);
  }
  if (url.username || url.password) {
    throw new ConfigError(`${ENV.url} must not contain credentials`);
  }
  return url;
}

function clean(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

/**
 * Build the bridge configuration from environment variables.
 * Precedence: AGENTSTACK_ACCESS_TOKEN (Bearer) > AGENTSTACK_API_KEY (X-API-Key) > none.
 */
export function resolveConfig(env: NodeJS.ProcessEnv = process.env): BridgeConfig {
  const url = parseEndpoint(env[ENV.url]);
  const token = clean(env[ENV.accessToken]);
  const apiKey = clean(env[ENV.apiKey]);
  const headers: Record<string, string> = {};
  let auth: BridgeConfig["auth"] = "none";

  for (const [name, v] of [
    [ENV.accessToken, token],
    [ENV.apiKey, apiKey],
  ] as const) {
    if (v && /[\r\n]/.test(v)) throw new ConfigError(`${name} contains a newline`);
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token.replace(/^Bearer\s+/i, "")}`;
    auth = "bearer";
  } else if (apiKey) {
    headers["X-API-Key"] = apiKey;
    auth = "api-key";
  }

  return { url, headers, auth, debug: env[ENV.debug] === "1" };
}

/** Mask a secret for display: keeps a short prefix only (e.g. `ask_…`). */
export function redact(secret: string | undefined): string {
  if (!secret) return "(not set)";
  const prefix = secret.startsWith("ask_") ? "ask_" : "";
  return `${prefix}… (${secret.length} chars)`;
}
