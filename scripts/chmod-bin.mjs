import fs from "node:fs";

// Make the CLI entry executable after `tsc` (no-op on Windows).
if (process.platform !== "win32") fs.chmodSync(new URL("../dist/index.js", import.meta.url), 0o755);
