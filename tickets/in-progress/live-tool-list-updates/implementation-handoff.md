# Implementation Handoff

## Upstream Artifact Package

- Ticket: autobyteus-324 (`live-tool-list-updates`), worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates`, branch `codex/live-tool-list-updates`, base `origin/personal` @ `9f7c9c10a6`.
- Requirements: `requirements-doc.md` (approved SR-001; SR-002…SR-004 within the direction).
- Design: `design-spec.md` SR-004, plus the Solution Designer's step-5 clarification (`Agent.replaceTools` keeps the existing instance of every tool whose name stays; recorded in the Interface Boundary Mapping row).
- Architecture review: `design-review-report.md`, ARCH-REV-004 Pass (Large/High).
- Investigation and probes: `investigation-notes.md`, `evidence/probe/`.
- Revision record: `implementation-revision-record.md` (IR-001).

## Current Implementation Summary

Built by the design's Change / Refactor Sequence, one commit per step group:

1. **Agent Tools endpoint** (`f733da620e`): every external run has an always-active session (`not_exposed` and every null-descriptor branch removed); `replaceForRun` / `describeForRun` on the run-session authority and the scoped authority (owned runs only); the registry replaces a session record as one frozen object; `AgentToolsMcpSessionStreams` owns the held GET stream (`: open`, 15 s keepalive, `notifications/tools/list_changed`, closed at deactivation and before the listener closes); `listChanged: true`; the AGY transport header, its 405 branch and the one-shot SSE response removed. Codex `enabled_tools: []` checked without a model: accepted (`evidence/step1/`), so the escalation trigger did not apply.
2. **Change signal** (`e4746ade4e`): `AgentDefinitionChangeSignal` with its three sources (reloader publisher, application-owned `updateAgentDefinition`, committed application package commands).
3. **Run side**: `takePreface(run, { dispatchKind })`; `AgentRunPlatformNotices` (tools first, then skills; one notice per input; owner-routed settlement; guarded fan-out) wired in both compositions; `AgentRun.applyDefinitionTools` / `getToolNames` on the backend contract; `ToolListUpdateService` (coalesced passes, per-run definition re-read, diff against `SeenToolNamesStore`, dirty/in-flight delivery, busy post for immediate runtimes, `waitForTurnStart`); `TOOL_LIST_UPDATE_NOTICE_SENDER_ID` (also recorded by agent memory); web "Tools updated" card.
4. **Claude and AGY**: Claude keeps the exposure on its run context, activates once and reads `describeForRun` per use; Agent Tools names are no longer in `allowedTools` (only `Skill`); the coordinator allows a tool in the current descriptor (`agent_tools_enabled`). AGY replaces the session (re-lists over the held stream); its capsule config is always written and has no header.
5. **Native**: `Agent.replaceTools` (existing instances kept for names that stay; removed and unused instances cleaned up as at shutdown); `resolveTurnToolNames` no longer falls back to `config.tools` once instances exist (an empty set is "every tool removed"); the native backend compares names first and builds nothing for an unchanged list.
6. **Codex and Grok**: `reopenPending`; Codex `CodexThreadManager.reopenThread` (unsubscribe + resume with history; unsubscribe + start without); Grok `AcpSessionLauncher` extracted, `AcpPreparationOwner` the single holder of process/connection/session, reopen ends first then loads, a failed reopen leaves no runtime session (active, idle) with every operation defined; failure → `RUNTIME_SESSION_REOPEN_FAILED`, input not sent, `restart_run` notice; web failure card with "Restart this run with the new tools".
7. **Docs**: `agent_tools_mcp_server.md`, new `tool_list_updates.md`, `agent_execution.md`, `skill_update_notices.md`, `grok_build_runtime.md`, `antigravity_cli_runtime.md`, web `agent_execution_architecture.md`.

(Commit hashes for steps 3–7 are in `implementation-revision-record.md`.)

## Routing Classification (Mandatory)

- Task size: Large. Architectural risk: High (unchanged from the design and ARCH-REV-004).
- Route: independent code review (`/software_engineering_team/code_reviewer`).
- Design Impact / Requirement Gap / Unclear: none found. No escalation trigger fired (see Known Risks for the real-run status of each).

## Reviewed Behavior Implementation Trace

| Behavior / Spine | Implemented by | Proof |
| --- | --- | --- |
| DS-006 one signal | `agent-definition-change-signal.ts`; feed composition publisher; `agent-definition-service.ts`; `application-package-command-service.ts` | unit (signal, application-owned save, package commands), integration `package-auto-refresh` (file edit and in-app save signal) |
| DS-002 replace + notify | `agent-tool-mcp-session-service.ts`, `agent-tool-mcp-session-registry.ts`, `agent-tools-mcp-session-streams.ts`, routes | unit (service, scoped authority), integration routes: held stream frames, keepalive/close, removal refused at once, empty list, official SDK client receives `list_changed` |
| DS-001 apply | `tool-list-update-service.ts` | integration `tool-list-updates` (11 tests) |
| DS-003 immediate | Claude/AGY/native backends; `Agent.replaceTools` | `immediate-tool-list-apply.test.ts`, Claude gating (current-descriptor approval), autobyteus-ts `agent-replace-tools.test.ts` |
| DS-004 reopen | Codex backend + `reopenThread`; ACP backend + `AcpSessionLauncher` | `codex-tool-list-reopen.test.ts` (8), `acp-tool-list-reopen.test.ts` (5, including the three named ownership tests) |
| DS-005 notice + card | composite, service, notice builder, web segment + store | integration (one notice per input, skill unchanged behind the composite), web specs |

## Key Files Or Areas

- Server, new: `src/tool-list-updates/**`, `src/agent-definition/services/agent-definition-change-signal.ts`, `src/agent-execution/domain/agent-run-platform-notices.ts`, `src/agent-tools/mcp/agent-tools-mcp-session-streams.ts`, `src/agent-execution/backends/acp/session/acp-session-launcher.ts`, `src/agent-execution/backends/shared/runtime-session-reopen.ts`.
- Server, changed: `src/agent-tools/mcp/*` (session, registry, service, authority, scoped authority, host, routes, http gate, dispatcher), the five backends and their factories, `agent-run.ts`, preface port/dispatch, backend contract, compositions, provider factory builder, agent memory accumulator.
- autobyteus-ts: `agent.ts` (`replaceTools`), `context/agent-tool-instances.ts` (new, shared by factory and shutdown cleanup), `loop/llm-phase-tools.ts`.
- Web: `SystemTaskNotificationSegment.vue`, `AIMessage.vue` (passes `runId`), `agentRunStore.restartRunWithNewTools`, payload/segment `action`, en/zh-CN messages.
- Tests: shared `tests/helpers/agent-tool-mcp-run-sessions-stub.ts` and `agent-tools-mcp-test-host.ts` (live harnesses now get a real endpoint because every run configures one).

## Important Assumptions

- A Codex thread "has a conversation" when it was restored or a turn was started on it (`CodexAgentRunContext.hasConversationHistory`); otherwise the reopen starts a new thread (E-13: no rollout to resume).
- The restart button for a Team member stops the Team; its next message restores it (the existing Team stop/restore; there is no single-member restart).
- Team streams carry no `action` field, so the web recognizes the failure notice by its exact text as well (also needed for replayed history).

## Known Risks

- Grok and Codex real runs are still owed (no credit). Run `RUN_LIVE_TOOL_LIST_E2E=1 LIVE_TOOL_LIST_RUNTIME=grok_build|codex_app_server` when credit is back. The escalation triggers "AGY rejecting the held stream" and "Codex rejecting `enabled_tools: []`" are cleared; "Codex resume not taking the config" and "Grok load losing history" are proven only by the protocol probes (E-13, E-14) and fake-agent tests, not yet by a live model run.
- In the stopped Grok diagnostic run, Grok 1.0.70 against the product endpoint sent `server/discover`, `initialize`, `notifications/initialized`, `tools/list` and opened no GET stream (consistent with E-14: Grok needs the reopen).
- Claude: Agent Tools now go through `canUseTool` (approved at once, reason `agent_tools_enabled`) instead of `allowedTools`; the approved event is now emitted for them, as for auto-executed tools.
- Codex app-server sends `DELETE` to the MCP endpoint on reopen (probe); the endpoint keeps answering `405`, which Codex tolerates (probe and live run).
- AGY without the header against the product endpoint: covered by the AGY real run.

## Task Design Health Assessment Implementation Check

The design's owners were kept: only the session service changes exposure and only the streams owner writes to GET streams; backends never diff or notify; `ToolListUpdateService` never touches backends; `AgentRun` knows only the composite. `tool-list-updates` imports no backend and no `agent-tools`.

## Legacy / Compatibility Removal Check

Removed: the AGY `X-Autobyteus-MCP-Transport` header and its GET 405 branch; `sendSseCompatibilityResponse`; `listChanged: false`; `not_exposed` and every `descriptor === null` branch (Claude, AGY, Codex, ACP/Grok, `mcpServers(null)`); Claude's cached activation; Agent Tools names in Claude `allowedTools`; the docs' "long-lived SSE server push" out-of-scope line. No compatibility wrapper kept.

## Persisted Data Transition Check (When Applicable)

`<memoryDir>/seen_tool_names.json` `{ version: 1, toolNames }`, additive; "no record" = "has seen the current list" (Directly Usable — No Migration). Store rules copied from `SeenSkillVersionsStore` (tolerant read, atomic write, never creates the folder, retry while tracked, abort when released). Tested in `seen-tool-names-store.test.ts` and the restore integration test.

## Environment Or Dependency Notes

- Worktree prepared with `prisma generate`, `test:integration:prepare`, `nuxt prepare`.
- Real runs use the runtime CLIs' own sign-in (TESTING.md); AutoByteus data is a temp folder per run.

## Local Implementation Checks Run

Full record with commands, commit and environment: `evidence/local-checks.log`.

- Server typecheck: 0 errors. Server unit: 7,329 passed after two Claude `allowedTools` assertions were updated to the design (the third failure was tracked-imports before the new files were committed; architecture: 54/54 after commit). Server integration: 457 passed, 69 skipped, 0 failed.
- autobyteus-ts unit: 2,082 passed. Web: all suites pass after one cross-package test was given the Codex backend's new argument (`5f3923c4cd`); web typecheck: production 0, test files at baseline 298/139, PASS.
- Step 1 Codex check (no model): Codex 0.165.0 accepts `enabled_tools: []` and reports the server ready — `evidence/step1/`.
- Real runs on isolated AutoByteus data (`evidence/real-runs/README.md`, design turn script):
  - AutoByteus native (LM Studio qwen): **pass**.
  - Claude (haiku): **pass**; Claude re-listed and itself reported the removed tool unavailable.
  - AGY 1.4.10 (gemini flash-low): **pass**; no header against the product endpoint; removed tool refused by the server.
  - Grok: **not proven** — the account ran out of credit (confirmed by the user); turn 1 stalled before any tool change. Reopen covered by the fake-agent tests.
  - Codex: **not run** — no credit (DEC-004).

## Frontend Rendered-Result Check (When Applicable)

The card change is small (label, body text, one button). Covered by component specs; no layout change.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001…AC-008 through the real product: `tests/e2e/runtime/live-tool-list-updates.e2e.test.ts` (gated, per runtime).
- A forced reopen failure end to end (Codex/Grok) with the button in an isolated desktop instance.
- Team member runs (Codex/Grok) after a definition change: the notice on the member's next turn start.
- An application-owned agent saved in the app while its run is open.

## API / E2E / Executable Coverage Investigation And Execution Still Required

E2E on isolated data from a clean clone (design step 7) for API/E2E; the Codex real run only if the quota is back (DEC-004).
