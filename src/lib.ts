// Programmatic API (stable surface for embedding the connector).
export { startBridge, runStdioBridge, type BridgeOptions, type RunningBridge } from "./bridge.js";
export { resolveConfig, parseEndpoint, redact, ConfigError, type BridgeConfig } from "./config.js";
export { runInit, planConfig, InitError, type InitOptions, type InitResult } from "./init.js";
export { CLIENTS, SPECS, type ClientId, type Mode } from "./clients.js";
export { cursorDeeplink, cursorWebInstall, vscodeDeeplink, vscodeWebInstall } from "./links.js";
export { doctor } from "./doctor.js";
export { DEFAULT_MCP_URL, ENV, LINKS } from "./constants.js";
export { VERSION } from "./version.js";
