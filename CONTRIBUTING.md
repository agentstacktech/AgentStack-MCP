# Contributing

Thanks for helping improve the AgentStack MCP connector!

This repository holds the **open-source connector only** (stdio bridge, CLI, configs, docs). The
AgentStack server and its core are closed-source; feature requests for the service itself are welcome
as issues, but server code is not part of this repo.

## Development

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run check        # lint + typecheck + tests + build
npm run build        # compile to dist/
node dist/index.js doctor
```

Optional live smoke test against the public endpoint (no key needed):

```bash
AGENTSTACK_LIVE=1 npm test
```

## Guidelines

- Keep the bridge transparent: it forwards MCP messages; it must not reimplement tools.
- Never commit secrets. Tests must not need a real API key.
- Keep `package.json`, `src/version.ts` and `server.json` versions in sync (a test enforces it).
- Update `CHANGELOG.md` and the README when behaviour or install steps change.
- Use clear commit messages (Conventional Commits are welcome: `feat:`, `fix:`, `docs:` …).

## Releasing (maintainers)

1. Bump the version in `package.json`, `src/version.ts`, `server.json` (both places) and `CHANGELOG.md`.
2. `npm run check`, then `npm publish --access public`.
3. Publish `server.json` to the MCP Registry with `mcp-publisher login github && mcp-publisher publish`.
