# Publishing checklist (maintainers)

1. **npm** — confirm you own the `@agentstack` scope (`npm org ls agentstack` / npmjs.com). If not, rename the
   package (e.g. `@agentstacktech/mcp`) in `package.json`, `server.json` (`packages[0].identifier`),
   `src/constants.ts`, `smithery.yaml`, README and examples. Then `npm run check && npm publish --access public`.
   `package.json` must keep `"mcpName": "io.github.agentstacktech/agentstack-mcp"` (the registry verifies it).
2. **MCP Registry** — install `mcp-publisher`, then `mcp-publisher login github` (as `agentstacktech`) and
   `mcp-publisher publish`. The `io.github.agentstacktech/*` namespace is proven by the GitHub login.
3. **Glama** — the repo has `glama.json`; claim/submit the server at glama.ai. The site claim file is served at
   `https://agentstack.tech/.well-known/glama.json`.
4. **Smithery** — add the repo (uses `smithery.yaml`, stdio via npx) and/or list the hosted URL
   `https://agentstack.tech/mcp` in the Smithery UI.
