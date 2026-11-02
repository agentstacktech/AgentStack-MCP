import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { resolveConfig } from "../src/config.js";

// Opt-in: AGENTSTACK_LIVE=1 npm test. Read-only (initialize + tools/list). No key required.
describe.skipIf(process.env.AGENTSTACK_LIVE !== "1")("live endpoint", () => {
  it("lists agentstack.execute", async () => {
    const config = resolveConfig();
    const client = new Client({ name: "agentstack-mcp-live-test", version: "0" });
    await client.connect(new StreamableHTTPClientTransport(config.url, { requestInit: { headers: config.headers } }));
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("agentstack.execute");
    await client.close();
  });
});
