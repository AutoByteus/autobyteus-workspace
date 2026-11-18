# Investigation Notes

## Investigation Meta

- Package identifier: `live-tool-list-updates` (Project Task `autobyteus-324`)
- Request / ticket: autobyteus-324. A running agent gets changes to its tool list without stop and resume. Design first; build after the user approves
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates`
- Repository mode: `Git`
- Task worktree / branch: the workspace root, branch `codex/live-tool-list-updates`
- Resolved base: `origin/personal` @ `9f7c9c10a6` (fetched 2026-10-29)
- Finalization target: `origin/personal`
- Bootstrap result: `pnpm install --frozen-lockfile`
- Bootstrap blocker: none
- Current solution revision ID: `SR-002`
- Authorities read: `SKILL.md`, `references/requirements-engineering.md` and `templates/requirements-doc-template.md` (the updated versions, 2026-10-28), `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`, `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `GLOSSARY.md`, `TESTING.md` (this conversation)
- Investigation status: complete for the requirements; one runtime fact still to measure (E-12, Codex reload) once the account quota returns

## Initial Request And Clarifications

- Original request: Task autobyteus-324, read with `get_project_task` (no comments).
- The user's words in the Task: "extremely important: today it is not convenient"; when the PM's tools change, he stops and resumes the run by hand (list_peer_nodes, get_project_task, search_memory in one week).

## Source Log

| Date | Type | Source | Finding | ID |
| --- | --- | --- | --- | --- |
| 2026-10-29 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.ts:93` | The Agent Tools MCP server announces `tools: { listChanged: false }` | E-01 |
| 2026-10-29 | Code | `src/agent-tools/mcp/agent-tool-mcp-session.ts:81-95`; `agent-tool-mcp-session-service.ts:54-77`; `agent-tool-mcp-catalog.ts:192-230` | A run's Agent Tools MCP session gets `enabledTools` and `toolRoutes` once, at activation, from the definition's tool names. `tools/list` and `tools/call` check that fixed set, so a removed tool is refused only if the set changes | E-02 |
| 2026-10-29 | Code | `src/agent-tools/mcp/agent-tools-mcp-routes.ts:94-101`; `docs/modules/agent_tools_mcp_server.md` "Current Out Of Scope" | GET returns a short SSE compatibility response, or 405 for AGY's run-scoped header. There is no lasting stream, so the server cannot push anything ("long-lived SSE server push" is listed as out of scope) | E-03 |
| 2026-10-29 | Code | `src/agent-execution/backends/claude/session/claude-session-tooling-options.ts:70-155`; `claude-session-query-options.ts:37-50` | Claude sessions get `allowedTools` (the definition's tools) plus `canUseTool` (our permission coordinator). `allowedTools` only auto-approves; another tool goes to `canUseTool` | E-04 |
| 2026-10-29 | Code | `src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts:29-38`; `codex-thread-manager.ts:186-198` | Codex threads get `mcp_servers.autobyteus_agent_tools` with `enabled_tools: [definition tools]` in `thread/start` config | E-05 |
| 2026-10-29 | Code | `src/agent-execution/backends/antigravity/capsule/agy-mcp-config-materializer.ts:32-37`; `stream/agy-stream-process.ts:25-41` | AGY's capsule `mcp_config.json` sets `X-Autobyteus-MCP-Transport: streamable-http`, which makes our GET answer 405 (a workaround written for AGY 1.2.10) | E-06 |
| 2026-10-29 | Code | `src/agent-execution/backends/grok/grok-build-session-profile.ts:38-40` | Grok gets the server in ACP `session/new` (`{ type: "http", name, url, headers: [] }`) | E-07 |
| 2026-10-29 | Code | `autobyteus-ts/src/agent/loop/llm-phase-tools.ts`; `agent/loop/llm-phase.ts:145`; `agent/factory/agent-factory.ts:59-81,142`; `agent/context/agent-context.ts:121-125` | Native: tool names are read from `state.toolInstances` for every LLM call, and schemas are built per call. Execution looks the tool up in `toolInstances` ("not found" otherwise). The system prompt carries no tool list. Changing `toolInstances` between calls would take effect at the next call | E-08 |
| 2026-10-29 | Code | `src/skill-update-notices/services/skill-update-notice-service.ts` | Precedent: an `AgentRunLifecycleObserver` tracks runs. A busy run gets the notice through `postUserMessage`; an idle or restored run gets it as the `AgentRunInputPreface` of its next input; the web card is "Skill updated" | E-09 |
| 2026-10-29 | Code | `src/agent-package-definitions/services/agent-package-definition-reloader.ts:16,115`; `changes/agent-package-definition-change-hub.ts` | Package reloads publish which definition kinds changed (the web uses this to reload lists). There is no per-definition event yet; a definition edit goes through `AgentDefinitionService` | E-10 |
| 2026-10-29 | Code | `src/runtime-management/claude/client/claude-sdk-setting-sources.ts:1-14`; `claude-sdk-client.ts:317-342` | Claude runs load the `user`, `project` and `local` settings and set no strict MCP config | E-11 |
| 2026-10-29 | Command | `codex app-server generate-ts` (0.165.0) | The app-server has `config/mcpServer/reload` (no parameters) and no method to change a thread's tools or dynamic tools. It also has `thread/unsubscribe` (status `notLoaded`/`notSubscribed`/`unsubscribed`), and `thread/resume` takes `config`. A resume on a running thread "rejoins" it | E-12 |
| 2026-10-29 | Probe | `evidence/probe/drive-codex-reopen.mjs`, `codex-reopen-{unsubscribe,loaded}-*.jsonl` (no model use; one history item injected with `thread/inject_items` so the thread has a rollout) | `thread/unsubscribe` then `thread/resume` with the new config: Codex opened a **new** MCP connection (initialize, GET, `tools/list`). `thread/resume` on the still-subscribed thread: **no** new connection (config ignored). A thread without any history has no rollout ("no rollout found") | E-13 |
| 2026-10-29 | Probe | `evidence/probe/drive-grok-reopen.mjs`, `grok-reopen-{same,process}-*.jsonl` (no model use) | `session/load` of the same session in the **same** Grok process: no new MCP connection. A **new** Grok process with `session/load` (the product's restore path): a new connection and `tools/list` | E-14 |
| 2026-10-29 | Probe | `claude-empty-*.jsonl`, `agy-empty-*.jsonl` (probe server started with **zero** tools) | Claude and AGY (no header) both accept a server with no tools, hold its GET stream, re-list on the notification, and call the first tool added later (`PROBE_BETA_OK`); the removed tool stays gone | E-15 |
| 2026-10-29 | Code | `agent-run.ts:353-361`; `agent-run-input-preface-dispatch.ts:16-44`; `agent-run-input-preface.ts`; `agent-run-manager.ts:51-53`; `general-process-run-supervisor.ts:105,216,236`; `build-studio-server.ts:312`; `start-standalone-application-host.ts:259` | One preface port and one lifecycle observer per run, wired to the skill notice service in both compositions. `takePreface(run)` is called before the backend dispatch, without the dispatch kind; appends carry a preface too | E-16 |
| 2026-10-29 | Code | `agent-definition-service.ts:217,357-358,386-389`; `agent-package-definition-reloader.ts:16,110`; `agent-package-definition-feed-composition.ts:33`; `application-package-command-service.ts:34-100` | Edits of package definitions (shared, team-local, org-owned) reload their owning folder, and every reload calls the reloader's one publisher (wired to the web change hub). Application-owned agent edits write the file without a reload. Application package import, reload and remove go through `ApplicationPackageCommandService`. Definitions are read on demand by ID | E-17 |
| 2026-10-29 | Code | `codex-thread-bootstrapper.ts:254,282`; `codex-configured-tool-gating.ts:3`; `codex-dynamic-tool.ts`; `codex-agent-run-context.ts`; `codex-tool-approval-coordinator.ts:231,284` | Dead: `dynamicToolRegistrations` is always `null`, so `dynamicTools` is always empty and the handler map always empty; `filterDynamicToolRegistrationsByToolNames` has no caller | E-18 |

## Runtime Probes (Measured, 2026-10-29)

A probe MCP server (`evidence/probe/probe-mcp-server.mjs`, Streamable HTTP, `listChanged: true`) starts with `probe_alpha`. Between turns, a control call adds `probe_beta` and later removes `probe_alpha`, each time sending `notifications/tools/list_changed` on every open GET stream and on the next POST response stream. Each runtime is driven as AutoByteus drives it: one session and three turns (call alpha; call beta if you have it; call alpha again). The logs are in `evidence/probe/`.

| Runtime (version) | GET stream | Re-reads `tools/list` after the notification | New tool usable next turn | Removed tool | Evidence |
| --- | --- | --- | --- | --- | --- |
| Claude Agent SDK 0.3.280 (Claude Code 2.1.280) | Held | Yes, within ms (twice) | Yes: found via ToolSearch and called (`PROBE_BETA_OK`); it went through `canUseTool` because it was not in `allowedTools` | Gone: answered `NO_ALPHA_TOOL` without a call | `claude-driver.jsonl`, `claude-server.jsonl` |
| Codex CLI 0.165.0 (app-server) | Held | No: one `tools/list` at thread start, none after, also at later turn starts | Not measured: the account hit its usage limit until 2026-11-04 (turns failed before the model ran) | Not measured | `codex-open-*.jsonl`, `codex-enabled-*.jsonl` |
| Codex `config/mcpServer/reload` | — | `mcpServerStatus/list` opens new connections itself, so it is no proof for the thread | Unclear: needs a model turn (quota) | — | `codex-reload-*.jsonl` |
| Antigravity CLI 1.4.10, product config (header, no GET stream) | 405 | Only when the notification arrives on the next POST response; then it re-reads at once | No: turn 2 had no call, so no notification reached it (`NO_BETA_TOOL`) | Refused by the server | `agy-driver.jsonl`, `agy-server.jsonl` |
| Antigravity CLI 1.4.10, without the header (GET stream) | Held | Yes, within ms (twice) | Yes (`PROBE_BETA_OK`); its tool files listed `probe_beta.json` | Gone (`NO_ALPHA_TOOL`) | `agy-noheader-*.jsonl` |
| Grok Build 1.0.70 (ACP) | Held | No: one `tools/list` for the whole session, despite 2 GET and 1 POST notifications | No: its `search_tool` never found `probe_beta` (`NO_BETA_TOOL`) | Still offered by its search; the server refused the call | `grok-driver.jsonl`, `grok-server.jsonl` |

- How established: Measured (real runtimes, isolated temp workspaces, the user's own runtime sign-ins; no AutoByteus data used).
- Cost: a few short turns on cheap models (Claude haiku, Gemini flash-low, grok-4.7). The Codex turns failed before using the model.
- Temporary diagnostics: none in product code. The probe scripts are evidence (they are kept as the reproduction for the build).

## Relevant Existing Behavior

| Behavior ID | Kind | Current behavior | Evidence |
| --- | --- | --- | --- |
| BEH-001 | User | A run keeps the tool list it started with; after a definition change the user stops and resumes the run | E-01…E-08; the user's report |
| BEH-002 | Contract | Removed tools: a running run can still call a tool its definition no longer lists (the session set is fixed) | E-02 |
| BEH-003 | User | Changed skills reach running runs through the "Skill updated" notice | E-09 |

## Persisted Data And State Facts

- Tool lists are read from the agent definition (unchanged).
- New per-run data (SR-002, ARCH-REV-001 AR-005): the tool names a run was last given. A restored run is compared against them, also after a server restart. They are stored beside the skill record, the same way: `<memoryDir>/seen_skill_versions.json` is the precedent (`seen-skill-versions-store.ts`).

## Supplemental Artifact Inventory

| Artifact | Purpose | Status |
| --- | --- | --- |
| `evidence/probe/probe-mcp-server.mjs`, `drive-claude.mjs`, `drive-codex.mjs`, `drive-codex-reload.mjs`, `drive-agy.mjs`, `drive-grok.mjs` and their `*.jsonl` logs | Per-runtime measurement; the reproduction for the build and its e2e | Current |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| U-01 | Unknown | Whether Codex's `config/mcpServer/reload` refreshes a running thread's tools | Not needed: the reopen (`thread/unsubscribe` + `thread/resume` with the new config) is measured to reconnect with the new list (E-13). Whether the model then calls the new tool needs a model turn (DEC-004) |
| R-01 | Risk | Runtime versions change behavior (Claude reports of stale lists in other versions) | The build's e2e runs against each installed version; the server stays the authority for removal |
| R-02 | Risk | Claude sessions inherit the user's own MCP servers and claude.ai connectors (E-11; the probe saw them) | Follow-up FU-001 (urgent) |
