import fs from "node:fs";
import path from "node:path";
import { ENV, SERVER_NAME } from "./constants.js";
import { defaultEnv, KEY_PLACEHOLDER, SPECS, type ClientId, type Mode } from "./clients.js";

export interface InitOptions {
  client: ClientId;
  mode?: Mode;
  scope?: "global" | "project";
  /** Reference AGENTSTACK_API_KEY via the client's env / secret-input mechanism. */
  withKey?: boolean;
  /** Claude Desktop only: copy the current AGENTSTACK_API_KEY value into the file (plaintext!). */
  embedKey?: boolean;
  /** Write here instead of the client's default location. */
  configPath?: string;
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
  sys?: Partial<ReturnType<typeof defaultEnv>>;
}

export interface InitResult {
  path: string;
  mode: Mode;
  created: boolean;
  replaced: boolean;
  backupPath?: string;
  json: string;
  notes: string[];
}

export class InitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitError";
  }
}

export function planConfig(existing: Record<string, unknown>, opts: InitOptions): { config: Record<string, unknown>; mode: Mode; replaced: boolean; notes: string[] } {
  const spec = SPECS[opts.client];
  const mode = opts.mode ?? spec.defaultMode;
  if (!spec.modes.includes(mode)) {
    throw new InitError(`${spec.label} supports --mode ${spec.modes.join(" | ")} only`);
  }
  const notes: string[] = [];
  let literalKey: string | undefined;
  if (opts.embedKey) {
    if (opts.client !== "claude-desktop") throw new InitError("--embed-key is only needed for claude-desktop; other clients read the key from your environment");
    literalKey = (opts.env ?? process.env)[ENV.apiKey]?.trim();
    if (!literalKey) throw new InitError(`--embed-key: ${ENV.apiKey} is not set in this shell`);
    notes.push("API key written in plaintext; the file permissions were restricted to your user.");
  }

  const withKey = Boolean(opts.withKey);
  const entry = spec.entry(mode, withKey, literalKey);
  const root = (existing[spec.rootKey] ?? {}) as Record<string, unknown>;
  if (typeof root !== "object" || Array.isArray(root)) {
    throw new InitError(`"${spec.rootKey}" in the existing config is not an object; fix it manually first`);
  }
  const replaced = SERVER_NAME in root;
  const config: Record<string, unknown> = { ...existing, [spec.rootKey]: { ...root, [SERVER_NAME]: entry } };

  const extras = spec.extras?.(mode, withKey) ?? {};
  for (const [k, v] of Object.entries(extras)) {
    if (k === "inputs" && Array.isArray(v)) {
      const prev = Array.isArray(existing.inputs) ? (existing.inputs as Array<{ id?: string }>) : [];
      const ids = new Set(v.map((i: { id?: string }) => i.id));
      config.inputs = [...prev.filter((i) => !ids.has(i.id)), ...v];
    } else {
      config[k] = v;
    }
  }

  if (opts.client === "claude-desktop" && !literalKey) {
    notes.push(`Replace ${KEY_PLACEHOLDER} with your key, or re-run with --embed-key after exporting ${ENV.apiKey}.`);
  } else if (withKey) {
    notes.push(
      opts.client === "vscode"
        ? "VS Code will prompt for the API key once and keep it in its secret storage."
        : `Export ${ENV.apiKey} in the environment the client is launched from.`,
    );
  } else if (mode === "remote") {
    notes.push("No key in the file: the client signs in with OAuth when AgentStack asks (HTTP 401).");
  }
  return { config, mode, replaced, notes };
}

function readJson(file: string): Record<string, unknown> | undefined {
  if (!fs.existsSync(file)) return undefined;
  const text = fs.readFileSync(file, "utf8");
  if (!text.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed as Record<string, unknown>;
  } catch (err) {
    throw new InitError(`${file} is not valid JSON (${(err as Error).message}). Not touching it.`);
  }
}

export function runInit(opts: InitOptions): InitResult {
  const spec = SPECS[opts.client];
  const sys = { ...defaultEnv(), ...opts.sys };
  const file = opts.configPath ?? spec.configPath({ scope: opts.scope ?? "global", ...sys });
  const existing = readJson(file);
  const { config, mode, replaced, notes } = planConfig(existing ?? {}, opts);
  const json = `${JSON.stringify(config, null, 2)}\n`;
  const result: InitResult = { path: file, mode, created: existing === undefined, replaced, json, notes };
  if (opts.dryRun) return result;

  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (existing !== undefined) {
    result.backupPath = `${file}.bak`;
    fs.copyFileSync(file, result.backupPath);
  }
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, json, { mode: opts.embedKey ? 0o600 : 0o644 });
  fs.renameSync(tmp, file);
  if (opts.embedKey) fs.chmodSync(file, 0o600);
  return result;
}
