import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InitError, planConfig, runInit } from "../src/init.js";
import { SPECS } from "../src/clients.js";

let dir: string;
const sys = () => ({ home: path.join(dir, "home"), cwd: path.join(dir, "work"), platform: "linux" as NodeJS.Platform });

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentstack-mcp-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("config paths", () => {
  it("resolves per-OS Claude Desktop paths", () => {
    const p = SPECS["claude-desktop"].configPath;
    expect(p({ scope: "global", cwd: "/w", home: "/h", platform: "darwin" })).toBe(
      "/h/Library/Application Support/Claude/claude_desktop_config.json",
    );
    expect(p({ scope: "global", cwd: "/w", home: "/h", platform: "linux" })).toBe("/h/.config/Claude/claude_desktop_config.json");
    expect(p({ scope: "global", cwd: "/w", home: "/h", platform: "win32", appData: "/ad" })).toContain(path.join("/ad", "Claude"));
  });

  it("uses project and global Cursor files", () => {
    const p = SPECS.cursor.configPath;
    expect(p({ scope: "project", cwd: "/w", home: "/h", platform: "linux" })).toBe("/w/.cursor/mcp.json");
    expect(p({ scope: "global", cwd: "/w", home: "/h", platform: "linux" })).toBe("/h/.cursor/mcp.json");
  });
});

describe("planConfig", () => {
  it("cursor remote is URL-only by default (OAuth)", () => {
    const { config } = planConfig({}, { client: "cursor" });
    expect(config).toEqual({ mcpServers: { agentstack: { url: "https://agentstack.tech/mcp" } } });
  });

  it("cursor --with-key references the env var, never a literal", () => {
    const { config } = planConfig({}, { client: "cursor", withKey: true, env: { AGENTSTACK_API_KEY: "ask_secret" } });
    expect(JSON.stringify(config)).not.toContain("ask_secret");
    expect(config).toMatchObject({ mcpServers: { agentstack: { headers: { "X-API-Key": "${env:AGENTSTACK_API_KEY}" } } } });
  });

  it("vscode uses `servers` and a password input", () => {
    const { config } = planConfig({ inputs: [{ id: "other" }] }, { client: "vscode", withKey: true });
    expect(config).toMatchObject({
      servers: { agentstack: { type: "http", url: "https://agentstack.tech/mcp", headers: { "X-API-Key": "${input:agentstack-api-key}" } } },
    });
    expect((config.inputs as Array<{ id: string }>).map((i) => i.id)).toEqual(["other", "agentstack-api-key"]);
  });

  it("windsurf uses serverUrl", () => {
    const { config } = planConfig({}, { client: "windsurf" });
    expect(config).toEqual({ mcpServers: { agentstack: { serverUrl: "https://agentstack.tech/mcp" } } });
  });

  it("claude-desktop runs the stdio bridge with a placeholder key", () => {
    const { config, mode } = planConfig({}, { client: "claude-desktop" });
    expect(mode).toBe("stdio");
    expect(config).toEqual({
      mcpServers: { agentstack: { command: "npx", args: ["-y", "@agentstack/mcp"], env: { AGENTSTACK_API_KEY: "ask_REPLACE_WITH_YOUR_KEY" } } },
    });
  });

  it("rejects unsupported modes and misuse of --embed-key", () => {
    expect(() => planConfig({}, { client: "claude-desktop", mode: "remote" })).toThrow(InitError);
    expect(() => planConfig({}, { client: "cursor", embedKey: true })).toThrow(/claude-desktop/);
    expect(() => planConfig({}, { client: "claude-desktop", embedKey: true, env: {} })).toThrow(/not set/);
  });
});

describe("runInit", () => {
  it("creates a new file", () => {
    const r = runInit({ client: "cursor", sys: sys() });
    expect(r.created).toBe(true);
    expect(JSON.parse(fs.readFileSync(r.path, "utf8")).mcpServers.agentstack.url).toBe("https://agentstack.tech/mcp");
  });

  it("merges into an existing file, keeps other servers and writes a backup", () => {
    const file = path.join(dir, "cfg.json");
    fs.writeFileSync(file, JSON.stringify({ theme: "dark", mcpServers: { other: { command: "x" }, agentstack: { url: "old" } } }));
    const r = runInit({ client: "windsurf", configPath: file, sys: sys() });
    const out = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(r.replaced).toBe(true);
    expect(out.theme).toBe("dark");
    expect(out.mcpServers.other).toEqual({ command: "x" });
    expect(out.mcpServers.agentstack).toEqual({ serverUrl: "https://agentstack.tech/mcp" });
    expect(fs.existsSync(`${file}.bak`)).toBe(true);
  });

  it("refuses to overwrite invalid JSON", () => {
    const file = path.join(dir, "bad.json");
    fs.writeFileSync(file, "{ nope");
    expect(() => runInit({ client: "cursor", configPath: file })).toThrow(/not valid JSON/);
    expect(fs.readFileSync(file, "utf8")).toBe("{ nope");
  });

  it("dry run writes nothing", () => {
    const file = path.join(dir, "dry.json");
    const r = runInit({ client: "vscode", configPath: file, dryRun: true });
    expect(fs.existsSync(file)).toBe(false);
    expect(r.json).toContain('"servers"');
  });

  it.skipIf(process.platform === "win32")("embed-key writes the key with 0600 permissions", () => {
    const file = path.join(dir, "claude.json");
    runInit({ client: "claude-desktop", configPath: file, embedKey: true, env: { AGENTSTACK_API_KEY: "ask_k" } });
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    expect(JSON.parse(fs.readFileSync(file, "utf8")).mcpServers.agentstack.env.AGENTSTACK_API_KEY).toBe("ask_k");
  });
});
