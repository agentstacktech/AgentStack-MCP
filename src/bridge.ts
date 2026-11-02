import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { BridgeConfig } from "./config.js";
import { LINKS } from "./constants.js";
import { VERSION } from "./version.js";

export type Logger = (message: string) => void;

/** Subset of the client transport we rely on (lets tests inject a fake). */
export interface UpstreamTransport extends Transport {
  setProtocolVersion?: (version: string) => void;
}

export interface BridgeOptions {
  downstream: Transport;
  upstream: UpstreamTransport;
  log?: Logger;
}

export interface RunningBridge {
  close(): Promise<void>;
  closed: Promise<void>;
}

type Id = string | number;

function isRequest(m: JSONRPCMessage): m is JSONRPCMessage & { id: Id; method: string } {
  return "method" in m && "id" in m && m.id !== undefined;
}

function isResponse(m: JSONRPCMessage): m is JSONRPCMessage & { id: Id } {
  return !("method" in m) && "id" in m;
}

function errorText(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

function isUnauthorized(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return code === 401 || code === 403 || /\b401\b|unauthori[sz]ed|auth_required/i.test(errorText(err));
}

/**
 * Transparent JSON-RPC pipe between a local transport (stdio) and the remote
 * AgentStack Streamable HTTP endpoint. Every request, response and notification
 * is forwarded unchanged, so tools, prompts and resources stay in sync with the
 * live server — nothing is hard-coded here.
 */
export async function startBridge({ downstream, upstream, log = () => {} }: BridgeOptions): Promise<RunningBridge> {
  const pendingInit = new Set<Id>();
  let closing = false;
  let resolveClosed!: () => void;
  const closed = new Promise<void>((r) => (resolveClosed = r));

  const close = async () => {
    if (closing) return closed;
    closing = true;
    await Promise.allSettled([upstream.close(), downstream.close()]);
    resolveClosed();
    return closed;
  };

  downstream.onmessage = (message) => {
    if (isRequest(message) && message.method === "initialize") pendingInit.add(message.id);
    upstream.send(message).catch(async (err: unknown) => {
      if (closing) return;
      const text = errorText(err);
      log(`upstream error: ${text}`);
      if (!isRequest(message)) return;
      const unauthorized = isUnauthorized(err);
      await downstream
        .send({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: unauthorized ? -32001 : -32603,
            message: unauthorized
              ? `AgentStack requires authentication. Set AGENTSTACK_API_KEY (get one at ${LINKS.apiKeys}) and restart the client.`
              : `AgentStack upstream error: ${text}`,
          },
        })
        .catch(() => {});
    });
  };

  upstream.onmessage = (message) => {
    if (isResponse(message) && pendingInit.has(message.id)) {
      pendingInit.delete(message.id);
      const version = (message as { result?: { protocolVersion?: unknown } }).result?.protocolVersion;
      if (typeof version === "string") upstream.setProtocolVersion?.(version);
    }
    downstream.send(message).catch((err: unknown) => log(`downstream error: ${errorText(err)}`));
  };

  downstream.onerror = (err) => {
    if (!closing) log(`stdio error: ${errorText(err)}`);
  };
  upstream.onerror = (err) => {
    if (!closing) log(`http error: ${errorText(err)}`);
  };
  downstream.onclose = () => void close();
  upstream.onclose = () => void close();

  await upstream.start();
  await downstream.start();
  return { close, closed };
}

/** Production wiring: stdio <-> https://agentstack.tech/mcp. */
export async function runStdioBridge(config: BridgeConfig, log: Logger): Promise<RunningBridge> {
  const upstream = new StreamableHTTPClientTransport(config.url, {
    requestInit: {
      headers: { ...config.headers, "User-Agent": `agentstack-mcp/${VERSION} (+${LINKS.repo})` },
    },
  });
  const downstream = new StdioServerTransport();
  log(`bridge → ${config.url.origin}${config.url.pathname} (auth: ${config.auth})`);
  return startBridge({ downstream, upstream, log });
}
