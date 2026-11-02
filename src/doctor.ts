import type { BridgeConfig } from "./config.js";
import { ENV } from "./constants.js";
import { VERSION } from "./version.js";

export interface DoctorReport {
  ok: boolean;
  lines: string[];
}

type FetchLike = typeof fetch;

/** Read-only probe: health + MCP initialize + tools/list. Never prints secrets. */
export async function doctor(config: BridgeConfig, fetchImpl: FetchLike = fetch): Promise<DoctorReport> {
  const lines: string[] = [`agentstack-mcp ${VERSION} · node ${process.version}`, `endpoint: ${config.url.href}`];
  lines.push(
    `auth: ${config.auth === "none" ? `none (set ${ENV.apiKey} or use OAuth in your client)` : config.auth === "api-key" ? `X-API-Key from ${ENV.apiKey}` : `Bearer from ${ENV.accessToken}`}`,
  );
  let ok = true;
  const rpc = async (id: number, method: string, params?: unknown, protocol?: string) => {
    const res = await fetchImpl(config.url, {
      method: "POST",
      headers: {
        ...config.headers,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(protocol ? { "MCP-Protocol-Version": protocol } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) }),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    const payload = text.trimStart().startsWith("{") ? text : (/^data:\s*(\{.*\})\s*$/m.exec(text)?.[1] ?? "{}");
    return { status: res.status, body: JSON.parse(payload) as Record<string, any> };
  };

  try {
    const init = await rpc(1, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "agentstack-mcp-doctor", version: VERSION },
    });
    const info = init.body.result?.serverInfo;
    if (init.status !== 200 || !info) throw new Error(`initialize → HTTP ${init.status}`);
    const protocol = String(init.body.result.protocolVersion);
    lines.push(`✓ initialize: ${info.title ?? info.name} ${info.version ?? ""} (protocol ${protocol})`);
    const list = await rpc(2, "tools/list", {}, protocol);
    const tools: Array<{ name: string }> = list.body.result?.tools ?? [];
    lines.push(`✓ tools/list: ${tools.map((t) => t.name).join(", ") || "(none)"}`);
    if (config.auth !== "none") {
      const call = await rpc(
        3,
        "tools/call",
        { name: "agentstack.execute", arguments: { steps: [{ id: "p", action: "auth.get_profile", params: {} }] } },
        protocol,
      );
      if (call.status === 401) {
        ok = false;
        lines.push("✗ auth: key rejected (HTTP 401) — check or rotate it in your AgentStack profile");
      } else {
        lines.push(`✓ auth: authenticated call accepted (HTTP ${call.status})`);
      }
    }
  } catch (err) {
    ok = false;
    lines.push(`✗ ${(err as Error).message}`);
  }
  return { ok, lines };
}
