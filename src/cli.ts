import { parseArgs } from "node:util";
import { CLIENTS, isClientId, SPECS, type Mode } from "./clients.js";
import { ConfigError, resolveConfig } from "./config.js";
import { ENV, LINKS, PACKAGE_NAME } from "./constants.js";
import { doctor } from "./doctor.js";
import { InitError, runInit } from "./init.js";
import { runStdioBridge } from "./bridge.js";
import { cursorDeeplink, vscodeDeeplink } from "./links.js";
import { VERSION } from "./version.js";

export const HELP = `AgentStack MCP connector ${VERSION}

Usage:
  npx -y ${PACKAGE_NAME}                  Run the stdio bridge to ${LINKS.site}/mcp (for MCP clients)
  npx -y ${PACKAGE_NAME} init <client>    Add AgentStack to a client config
  npx -y ${PACKAGE_NAME} doctor           Check connectivity and auth (read-only)
  npx -y ${PACKAGE_NAME} links            Print one-click install links

Clients: ${CLIENTS.join(", ")}

init options:
  --mode remote|stdio   remote = client connects to the URL directly (default where supported)
                        stdio  = client launches this package as a local bridge
  --with-key            Send X-API-Key from $${ENV.apiKey} instead of OAuth sign-in
  --project             Cursor: write .cursor/mcp.json in the current folder
  --embed-key           Claude Desktop: copy $${ENV.apiKey} into the config (plaintext, chmod 600)
  --config <path>       Write to a custom file
  --dry-run             Print the result without writing

Environment:
  ${ENV.apiKey}      API key (ask_…) → X-API-Key. Get one: ${LINKS.apiKeys}
  ${ENV.accessToken}  OAuth/Device Code token → Authorization: Bearer (takes precedence)
  ${ENV.url}       Endpoint override (https only)
  ${ENV.debug}=1     Verbose logs on stderr (secrets are never logged)

Docs: ${LINKS.docs} · Pricing: ${LINKS.pricing}
`;

export interface Io {
  out: (s: string) => void;
  err: (s: string) => void;
}

const defaultIo: Io = {
  out: (s) => process.stdout.write(`${s}\n`),
  err: (s) => process.stderr.write(`${s}\n`),
};

export async function main(argv: string[] = process.argv.slice(2), io: Io = defaultIo): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      mode: { type: "string" },
      "with-key": { type: "boolean" },
      project: { type: "boolean" },
      "embed-key": { type: "boolean" },
      config: { type: "string" },
      "dry-run": { type: "boolean" },
    },
  });

  if (values.version) {
    io.out(VERSION);
    return 0;
  }
  const [command = "serve", arg] = positionals;
  if (values.help || command === "help") {
    io.out(HELP);
    return 0;
  }

  try {
    switch (command) {
      case "serve":
      case "bridge": {
        const config = resolveConfig();
        const log = (m: string) => {
          if (config.debug) io.err(`[agentstack-mcp] ${m}`);
        };
        if (process.stdin.isTTY) {
          io.err("[agentstack-mcp] Waiting for an MCP client on stdin. Run with --help for setup commands.");
        }
        if (config.auth === "none") {
          io.err(`[agentstack-mcp] ${ENV.apiKey} is not set: tools are listed, but calls will ask you to authenticate.`);
        }
        const bridge = await runStdioBridge(config, log);
        const stop = () => void bridge.close();
        process.once("SIGINT", stop);
        process.once("SIGTERM", stop);
        await bridge.closed;
        return 0;
      }
      case "init": {
        if (!arg || !isClientId(arg)) {
          io.err(`Usage: init <${CLIENTS.join("|")}> — see --help`);
          return 2;
        }
        const mode = values.mode as Mode | undefined;
        if (mode && mode !== "remote" && mode !== "stdio") {
          io.err("--mode must be remote or stdio");
          return 2;
        }
        const r = runInit({
          client: arg,
          mode,
          scope: values.project ? "project" : "global",
          withKey: values["with-key"],
          embedKey: values["embed-key"],
          configPath: values.config,
          dryRun: values["dry-run"],
        });
        const label = SPECS[arg].label;
        if (values["dry-run"]) {
          io.out(`# ${label} → ${r.path} (dry run, ${r.mode})`);
          io.out(values["embed-key"] ? "(output hidden: contains your API key)" : r.json.trimEnd());
        } else {
          io.out(`✓ ${label}: ${r.replaced ? "updated" : "added"} "agentstack" (${r.mode}) in ${r.path}`);
          if (r.backupPath) io.out(`  backup: ${r.backupPath}`);
        }
        for (const n of r.notes) io.out(`  • ${n}`);
        if (!values["dry-run"]) io.out(`  Restart ${label} to load the server.`);
        return 0;
      }
      case "doctor": {
        const report = await doctor(resolveConfig());
        report.lines.forEach((l) => io.out(l));
        return report.ok ? 0 : 1;
      }
      case "links": {
        io.out(`Cursor:  ${cursorDeeplink()}`);
        io.out(`VS Code: ${vscodeDeeplink()}`);
        return 0;
      }
      default:
        io.err(`Unknown command "${command}". See --help.`);
        return 2;
    }
  } catch (err) {
    if (err instanceof ConfigError || err instanceof InitError) {
      io.err(`✗ ${err.message}`);
      return 1;
    }
    throw err;
  }
}
