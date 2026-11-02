#!/usr/bin/env node
import { main } from "./cli.js";

main().then(
  (code) => {
    if (code !== 0) process.exitCode = code;
  },
  (err: unknown) => {
    process.stderr.write(`[agentstack-mcp] fatal: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  },
);
