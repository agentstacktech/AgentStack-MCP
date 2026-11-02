import { describe, expect, it } from "vitest";
import { ConfigError, parseEndpoint, redact, resolveConfig } from "../src/config.js";

describe("resolveConfig", () => {
  it("defaults to the hosted endpoint with no auth", () => {
    const c = resolveConfig({});
    expect(c.url.href).toBe("https://agentstack.tech/mcp");
    expect(c.auth).toBe("none");
    expect(c.headers).toEqual({});
  });

  it("sends an API key as X-API-Key", () => {
    const c = resolveConfig({ AGENTSTACK_API_KEY: "  ask_test123  " });
    expect(c.auth).toBe("api-key");
    expect(c.headers).toEqual({ "X-API-Key": "ask_test123" });
  });

  it("prefers an access token as Bearer and does not double-prefix", () => {
    const c = resolveConfig({ AGENTSTACK_API_KEY: "ask_x", AGENTSTACK_ACCESS_TOKEN: "Bearer tok" });
    expect(c.auth).toBe("bearer");
    expect(c.headers).toEqual({ Authorization: "Bearer tok" });
  });

  it("rejects header injection", () => {
    expect(() => resolveConfig({ AGENTSTACK_API_KEY: "ask_x\r\nX-Evil: 1" })).toThrow(ConfigError);
  });

  it("enables debug only with 1", () => {
    expect(resolveConfig({ AGENTSTACK_MCP_DEBUG: "1" }).debug).toBe(true);
    expect(resolveConfig({ AGENTSTACK_MCP_DEBUG: "true" }).debug).toBe(false);
  });
});

describe("parseEndpoint", () => {
  it("requires https except for localhost", () => {
    expect(() => parseEndpoint("http://agentstack.tech/mcp")).toThrow(/https/);
    expect(parseEndpoint("http://localhost:8080/mcp").port).toBe("8080");
    expect(parseEndpoint("https://staging.example.com/mcp").hostname).toBe("staging.example.com");
  });

  it("rejects garbage and embedded credentials", () => {
    expect(() => parseEndpoint("not a url")).toThrow(ConfigError);
    expect(() => parseEndpoint("https://u:p@agentstack.tech/mcp")).toThrow(/credentials/);
  });
});

describe("redact", () => {
  it("never reveals the secret body", () => {
    expect(redact("ask_supersecretvalue")).toBe("ask_… (20 chars)");
    expect(redact("eyJhbGciOi")).toBe("… (10 chars)");
    expect(redact(undefined)).toBe("(not set)");
  });
});
