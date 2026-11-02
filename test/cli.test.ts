import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { main } from "../src/cli.js";
import { VERSION } from "../src/version.js";

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (s: string) => out.push(s), err: (s: string) => err.push(s) }, out, err };
}

describe("cli", () => {
  it("prints version and help", async () => {
    const c = capture();
    expect(await main(["--version"], c.io)).toBe(0);
    expect(c.out[0]).toBe(VERSION);
    const h = capture();
    expect(await main(["--help"], h.io)).toBe(0);
    expect(h.out.join("\n")).toContain("init <client>");
  });

  it("init writes a config file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentstack-cli-"));
    const file = path.join(dir, "mcp.json");
    const c = capture();
    expect(await main(["init", "cursor", "--config", file], c.io)).toBe(0);
    expect(JSON.parse(fs.readFileSync(file, "utf8")).mcpServers.agentstack.url).toBe("https://agentstack.tech/mcp");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects unknown clients and commands", async () => {
    const c = capture();
    expect(await main(["init", "notepad"], c.io)).toBe(2);
    expect(await main(["frobnicate"], c.io)).toBe(2);
    expect(await main(["init", "cursor", "--mode", "carrier-pigeon"], c.io)).toBe(2);
  });

  it("prints install links", async () => {
    const c = capture();
    expect(await main(["links"], c.io)).toBe(0);
    expect(c.out.join("\n")).toMatch(/cursor:\/\/.*vscode:mcp\/install/s);
  });
});
