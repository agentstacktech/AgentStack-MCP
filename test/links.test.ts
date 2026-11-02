import { describe, expect, it } from "vitest";
import { cursorDeeplink, cursorWebInstall, vscodeDeeplink, vscodeWebInstall } from "../src/links.js";

const decodeCursor = (link: string) => {
  const config = new URL(link.replace(/^cursor:\/\//, "https://")).searchParams.get("config")!;
  return JSON.parse(Buffer.from(config, "base64").toString("utf8"));
};

describe("install links", () => {
  it("cursor deeplink carries a base64 URL-only config", () => {
    const link = cursorDeeplink();
    expect(link.startsWith("cursor://anysphere.cursor-deeplink/mcp/install?name=agentstack&config=")).toBe(true);
    expect(decodeCursor(link)).toEqual({ url: "https://agentstack.tech/mcp" });
    expect(decodeCursor(cursorWebInstall())).toEqual({ url: "https://agentstack.tech/mcp" });
  });

  it("vscode deeplink is url-encoded JSON with name, type and url", () => {
    const link = vscodeDeeplink();
    expect(link.startsWith("vscode:mcp/install?")).toBe(true);
    expect(JSON.parse(decodeURIComponent(link.slice("vscode:mcp/install?".length)))).toEqual({
      name: "agentstack",
      type: "http",
      url: "https://agentstack.tech/mcp",
    });
    expect(vscodeWebInstall()).toMatch(/^https:\/\/vscode\.dev\/redirect\/mcp\/install\?name=agentstack&config=/);
  });

  it("links never contain a key", () => {
    for (const l of [cursorDeeplink(), cursorWebInstall(), vscodeDeeplink(), vscodeWebInstall()]) {
      expect(l).not.toMatch(/ask_|X-API-Key|Bearer/i);
    }
  });
});
