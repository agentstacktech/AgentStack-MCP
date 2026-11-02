#!/usr/bin/env sh
# Claude Code — pick ONE of the options below.

# 1) Remote server, OAuth sign-in on first use (recommended)
claude mcp add --transport http agentstack https://agentstack.tech/mcp

# 2) Remote server with an API key from your environment
#    (export AGENTSTACK_API_KEY=ask_... first; the key is stored in Claude's config)
# claude mcp add --transport http agentstack https://agentstack.tech/mcp \
#   --header "X-API-Key: ${AGENTSTACK_API_KEY}"

# 3) Local stdio bridge (key read from the environment at runtime)
# claude mcp add agentstack --env AGENTSTACK_API_KEY="${AGENTSTACK_API_KEY}" -- npx -y @agentstack/mcp

# Verify
claude mcp list
