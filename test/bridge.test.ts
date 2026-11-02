import { describe, expect, it, vi } from "vitest";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { startBridge, type UpstreamTransport } from "../src/bridge.js";

class FakeTransport implements UpstreamTransport {
  sent: JSONRPCMessage[] = [];
  onmessage?: Transport["onmessage"];
  onclose?: () => void;
  onerror?: (e: Error) => void;
  started = false;
  closed = false;
  fail?: Error;
  setProtocolVersion = vi.fn();
  async start() {
    this.started = true;
  }
  async send(m: JSONRPCMessage) {
    if (this.fail) throw this.fail;
    this.sent.push(m);
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    this.onclose?.();
  }
  emit(m: JSONRPCMessage) {
    this.onmessage?.(m);
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("startBridge", () => {
  it("forwards requests up and responses down, unchanged", async () => {
    const down = new FakeTransport();
    const up = new FakeTransport();
    await startBridge({ downstream: down, upstream: up });
    expect(up.started && down.started).toBe(true);

    const req: JSONRPCMessage = { jsonrpc: "2.0", id: 7, method: "tools/list", params: {} };
    down.emit(req);
    await tick();
    expect(up.sent).toEqual([req]);

    const res: JSONRPCMessage = { jsonrpc: "2.0", id: 7, result: { tools: [{ name: "agentstack.execute", inputSchema: { type: "object" } }] } };
    up.emit(res);
    await tick();
    expect(down.sent).toEqual([res]);
  });

  it("forwards notifications both ways", async () => {
    const down = new FakeTransport();
    const up = new FakeTransport();
    await startBridge({ downstream: down, upstream: up });
    down.emit({ jsonrpc: "2.0", method: "notifications/initialized" });
    up.emit({ jsonrpc: "2.0", method: "notifications/tools/list_changed" });
    await tick();
    expect(up.sent).toHaveLength(1);
    expect(down.sent).toHaveLength(1);
  });

  it("pins the negotiated protocol version after initialize", async () => {
    const down = new FakeTransport();
    const up = new FakeTransport();
    await startBridge({ downstream: down, upstream: up });
    down.emit({ jsonrpc: "2.0", id: "i1", method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } } });
    await tick();
    up.emit({ jsonrpc: "2.0", id: "i1", result: { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "agentstack", version: "x" } } });
    await tick();
    expect(up.setProtocolVersion).toHaveBeenCalledWith("2025-06-18");
  });

  it("turns upstream failures into JSON-RPC errors for requests", async () => {
    const down = new FakeTransport();
    const up = new FakeTransport();
    const log = vi.fn();
    await startBridge({ downstream: down, upstream: up, log });
    up.fail = new Error("Error POSTing to endpoint (HTTP 401): auth_required");
    down.emit({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "agentstack.execute", arguments: {} } });
    await tick();
    await tick();
    expect(down.sent[0]).toMatchObject({ id: 1, error: { code: -32001 } });
    expect(JSON.stringify(down.sent[0])).toContain("AGENTSTACK_API_KEY");

    up.fail = new Error("ECONNRESET");
    down.emit({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    await tick();
    await tick();
    expect(down.sent[1]).toMatchObject({ id: 2, error: { code: -32603 } });
    expect(log).toHaveBeenCalled();
  });

  it("closes both sides when either closes", async () => {
    const down = new FakeTransport();
    const up = new FakeTransport();
    const bridge = await startBridge({ downstream: down, upstream: up });
    await down.close();
    await bridge.closed;
    expect(up.closed).toBe(true);
  });
});
