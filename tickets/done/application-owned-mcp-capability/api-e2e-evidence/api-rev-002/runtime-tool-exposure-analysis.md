# API-REV-002 Runtime Tool Exposure Analysis

## Observed production failure

The shipped Brief Studio member configs select `write_file` for the researcher and `read_file` plus `write_file` for the writer while fixing both members to `codex_app_server` / `gpt-5.6-luna`:

- `applications/brief-studio/agent-teams/brief-studio-team/agents/researcher/agent-config.json:2-6`
- `applications/brief-studio/agent-teams/brief-studio-team/agents/writer/agent-config.json:2-6`

In the supported browser-launched real Team, the researcher successfully called `get_brief_context` first, then recorded that `write_file` was not exposed and used provider-native `run_bash` to create `brief-studio/research-blocker.md`. The writer successfully called `get_brief_context` after the handoff, then recorded that `read_file` and `write_file` were not exposed. It created no file and published no final artifact. These are actual Codex/Luna traces, not direct MCP or model mocks.

## Production source corroboration

- `CodexThreadBootstrapper` resolves configured names but sets `dynamicToolRegistrations` to `null` and supplies Codex only the Agent Tools MCP descriptor: `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:229-253,302-333`.
- The Agent Tools MCP descriptor exposes only names for which `AgentToolMcpCatalog` builds an application, configured-MCP, or active static-adapter route: `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts:105-188`.
- Default Agent Tools MCP static adapters include communication, browser, media, task delegation, and artifact publication, but not `read_file` or `write_file`: `autobyteus-server-ts/src/agent-tools/mcp/providers/default-agent-tool-mcp-adapter-providers.ts:9-16`.
- The configured-MCP fallback intentionally ignores registry tools whose origin is not MCP: `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-agent-tool-source-resolver.ts:29-55`.
- Existing durable Codex bootstrapper coverage explicitly configures `["generate_image", "generate_speech", "read_file"]` and expects only the two media tools in `enabled_tools`: `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts:737-751`. The current file passed 27/27 in API-REV-002 (`codex-tool-exposure-test.log`).

## Preliminary classification

This is not a provider-authentication, browser-harness, fixture, or direct-MCP substitution problem. The actual configured provider was authenticated and ran both real members. The result is a production cross-boundary contract mismatch: the approved Brief workflow requires provider-facing `read_file`/`write_file`, but the configured Codex runtime does not expose those selected names through its current tool-composition path.

The definitive failure-origin and owner decision belongs to `/code_reviewer`. Plausible remedies require upstream product/design judgment: either make the approved file operations available with the required semantics to configured Codex members, or revise the maintained application workflow and requirements coherently around a provider-supported file operation without using a shell fallback that violates AC-032/AC-033.
