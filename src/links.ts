import { DEFAULT_MCP_URL, SERVER_NAME } from "./constants.js";

/** Server entry used by one-click installers. URL only: the client signs in with OAuth. */
export const REMOTE_ENTRY = { url: DEFAULT_MCP_URL } as const;

/** `cursor://anysphere.cursor-deeplink/mcp/install?name=…&config=<base64 JSON>` */
export function cursorDeeplink(entry: Record<string, unknown> = REMOTE_ENTRY, name = SERVER_NAME): string {
  const config = Buffer.from(JSON.stringify(entry), "utf8").toString("base64");
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(name)}&config=${encodeURIComponent(config)}`;
}

/** HTTPS wrapper for the Cursor deeplink (clickable on GitHub, which strips custom schemes). */
export function cursorWebInstall(entry: Record<string, unknown> = REMOTE_ENTRY, name = SERVER_NAME): string {
  const config = Buffer.from(JSON.stringify(entry), "utf8").toString("base64");
  return `https://cursor.com/en/install-mcp?name=${encodeURIComponent(name)}&config=${encodeURIComponent(config)}`;
}

/** `vscode:mcp/install?<url-encoded JSON with name>` */
export function vscodeDeeplink(name = SERVER_NAME, url = DEFAULT_MCP_URL, scheme: "vscode" | "vscode-insiders" = "vscode"): string {
  return `${scheme}:mcp/install?${encodeURIComponent(JSON.stringify({ name, type: "http", url }))}`;
}

/** HTTPS redirect for VS Code (clickable on GitHub). */
export function vscodeWebInstall(name = SERVER_NAME, url = DEFAULT_MCP_URL, insiders = false): string {
  const host = insiders ? "https://insiders.vscode.dev" : "https://vscode.dev";
  const config = encodeURIComponent(JSON.stringify({ type: "http", url }));
  return `${host}/redirect/mcp/install?name=${encodeURIComponent(name)}&config=${config}${insiders ? "&quality=insiders" : ""}`;
}
