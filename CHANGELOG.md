# Changelog

All notable changes to this connector are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-11-02

### Added
- `agentstack-mcp` stdio → Streamable HTTP bridge to `https://agentstack.tech/mcp`
  (`AGENTSTACK_API_KEY` → `X-API-Key`, `AGENTSTACK_ACCESS_TOKEN` → `Authorization: Bearer`).
- `init <client>` for Cursor, Claude Desktop, VS Code and Windsurf (merge, backup, dry run).
- `doctor` (read-only connectivity/auth check) and `links` (one-click install links).
- MCP Registry `server.json`, `glama.json`, `smithery.yaml` and client examples.
