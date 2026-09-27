# Implementation Handoff — `grok-build-runtime-support`

Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support`, branch `codex/grok-build-runtime-support` (base `origin/personal` @ `e06080b00`). Implementation commits: `2b31b046d` (IR-001) and `d7d4aa2ad` (IR-002; delta review: `git diff 2b31b046d..d7d4aa2ad`), not pushed. The API/E2E engineer's e2e test changes are uncommitted in the worktree and were not touched. Ticket folder remains untracked. Finalization target: `origin/personal`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large/High); ARCH-REV-002 **Pass**. `get_handoff_rules` → Large or High implementation complete → `/code_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/requirements-doc.md` (Approved; SR-008 clarifications)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/design-spec.md` (SR-008, Ready)
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/evidence/` (design probes) and new `evidence/implementation-probes/` (this round). Product/UI supplements: `N/A — not applicable`.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial round).

## Current Implementation Summary

A runtime-neutral ACP backend family (`runtime-management/acp`, `agent-execution/backends/acp`, on `@agentclientprotocol/sdk@1.5.0`) drives one `grok agent --no-leader … stdio` process per run through a Grok profile (`runtime-management/grok`, `agent-execution/backends/grok`). `grok_build` ("Grok Build") is registered as the fifth runtime in every seam of both execution scopes, the frontend maps, and the two stream-contract enums. `autobyteus-ts` offers `grok-4.7` instead of `grok-4.6`.

- Implementation cycle: `Rework` (IR-002 on top of the IR-001 baseline; IR-002 summary below)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: SR-005..SR-011
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002, ARCH-REV-003
- Related code-review revision IDs: N/A at handoff. Code review result received afterwards: CRR-001 **Pass** (`code-review-report.md`, `code-review-revision-record.md`). Low non-blocking notes CR-001 (unused `AcpPermissionBridge.has()` / `AcpAgentProcess.stderrTail()`) and CR-003 (literal `protocolVersion: 1` instead of the SDK `PROTOCOL_VERSION`) are deferred to any later implementation round. CR-002 (design-spec text) is owned by the Solution Designer.
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Code-review result for IR-002 (received afterwards): CRR-003 **Pass** (`code-review-report.md`, "Implementation Re-Review (Round 3, CRR-003)"); no open findings; the package was delivered to `/api_e2e_engineer` by the reviewer.
- Triggering finding IDs (IR-002): CR-006, CR-004, CR-001, CR-003. CR-005 and CR-007 have no code change by design (SR-011). AR-006 is honored: `AgentRunManager` is unchanged.

### IR-002 Delta (current)

- **Deny (CR-006, AC-004 amended).** The session classifies an agent `cancelled` stop by state, checking interrupt first:
  - `cancelling` (user interrupt) → `TURN_INTERRUPTED`;
  - `prompting` after the user's reject-once in this turn → `TURN_COMPLETED` (`provider_stop_reason:"cancelled"`); the tool is already shown `TOOL_DENIED` and the run is idle;
  - `prompting` without a denial → `TURN_INTERRUPTED`.

  The per-turn flag is set only on a bridge `rejected` outcome, never on `cancelled` answers, and is reset each turn. No synthetic prompt is sent. The logic is runtime-neutral.
- **Start errors (CR-004, AC-012).**
  - New `runtime-management/acp/acp-error-message.ts` (neutral). The factory rethrows agent `RequestError`s from `initialize`/`session/new`/`session/load` as `AgentCreationError("<agent label>: <message>: <data>")`, e.g. `Grok Build: Authentication required: no auth method id provided`. Safe ACP errors (`ACP_*:`, `PLATFORM_AGENT_RUN_BINDING_INVALID:`) keep their message as `AgentCreationError`. Other errors are unchanged.
  - Create surfaces the text through `createAgentRun`. Restore keeps it as the `cause` of the manager's `PlatformAgentRunRestoreError` (existing behavior for all runtimes, AR-006); the unit test asserts the factory's `AgentCreationError`.
- **Cleanup.**
  - CR-003: `initialize` uses the SDK `PROTOCOL_VERSION`.
  - CR-001: removed `AcpPermissionBridge.has()` and `AcpAgentProcess.stderrTail()`; stderr is drained only.
- **IR-002 checks.**
  - Source typecheck is clean.
  - ACP/Grok unit suites: 12 files, 68 tests passed.
  - API/E2E fake-agent replay and capability e2e: 8 passed.
  - The gated live e2e was not run (credits); it already expects `TURN_COMPLETED` after a denial.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: ~22 new server source files, ~20 modified server files, 2 contract packages, web maps, `autobyteus-ts` row; new protocol dependency, per-call permission mapping, persisted provider-id binding, per-run child processes with bidirectional JSON-RPC.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Step 5 passed (below); no provider fact contradicted ARC-01..ARC-25; no existing runtime behavior was changed.

## Step 5 Confirmation (Design Change Sequence)

- Paid turn: one model call, provider-reported `costUsdTicks 288340000` ≈ **US$0.0288** (budget ≤ US$0.05).
- With `GROK_SUBAGENTS=0`, `GROK_WORKFLOWS=0`, `GROK_ASK_USER_QUESTION=0`, the session `tool_definitions.json` has 24 tools and **no `task`, `workflow` or `ask_user_question`**. Compared with the design-probe sessions (no switches for workflow/ask), exactly `workflow` and `ask_user_question` disappear (`update_goal` newly appears in this CLI build).
- `web_search` is not a function tool in any Grok session (before or after the switches); Grok's web search is provider-side, so AC-013 "web_search remains usable" is unaffected by the switches.
- `write` input fields: `file_path`, `content`; `search_replace`: `file_path`, `old_string`, `new_string`, `replace_all` (projection uses `file_path`, falling back to ACP `locations[0].path`).
- Evidence: `evidence/implementation-probes/probe-step5-tool-set.mjs`, `step5-tool-set-result.txt`.

## Additional Zero-Cost Implementation Probes (no `session/prompt`)

| Probe | Result | Effect on implementation |
| --- | --- | --- |
| `session/new` + HTTP MCP, no prompt (`probe-mcp-ready-no-prompt.mjs`) | `_x.ai/mcp/server_status{ready}` ~120 ms after the `session/new` response | Readiness gate before publication works without inference (REQ-007) |
| `session/load` + HTTP MCP, no prompt | `server_status{ready}` arrives **before** the load response | Session consumes MCP-status effects while `opening(load)` (as designed) |
| `session/load` of an unknown id | JSON-RPC error `Path not found.` | Terminal restore error (factory test covers it) |
| Grok session `events.jsonl` of the design probe | session created with `yoloMode:true` recorded `yolo_mode:false` on its first turn after `session/load` | yolo does not persist across load; restore sends no `_meta`; an auto-execute run's permission requests are answered `allow_once` by the session (verified path) |
| `probe-load-yolo.mjs` (`_x.ai/sessions/changed`) | Grok reports `yolo` only on prompt activity — inconclusive at zero cost | Not relied on |
| Design-probe `mcp-server.log` | Grok's MCP client uses POST only (no GET probe) | No transport header needed; `headers: []` as designed |
| `grok agent --help` (1.0.41) | `--leader` defaults from user config | Launch args always include `--no-leader` (leader mode is out of scope) |
| Live discovery through production code (vitest smoke) | probe 26 ms; handshake 636 ms → `grok-4.7`, 500000 ctx, effort `xhigh/high/medium/low` default `high` | AC-002 |

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | `grok_build` row, safe reason | `runtime-kind-enum.ts`; `runtime-availability-service.ts` → `grok-build-capability.ts#probeGrokBuildCli` (`--version` ≥ 1.0.41 + `agent --help` flags; 3 s bounded; `GROK_BUILD_COMMAND` override) | Live dev GraphQL: 5 rows, `grok_build enabled:true`; missing CLI → `GROK_CLI_UNAVAILABLE` message only |
| BEH-002 | Models from handshake, effort schema | `grok-build-model-catalog.ts` → `discoverGrokBuildModels` → `acp-discovery-handshake.ts` (initialize only) → `grok-build-launch-profile.ts#normalizeGrokBuildModels`; `model-catalog-service.ts` branch | Per-request discovery, no cache; failures → classified diagnostics |
| BEH-003 | Normalized stream, no bookkeeping | `acp-agent-session.ts` → `acp-session-update-converter.ts` (+ `grok-build-tool-projection.ts`); ext traffic → `grok-build-session-profile.ts#interpretExtNotification` (only usage + MCP status) | Fixture replay tests (prompt/mcp2/permission/cancel/load) |
| BEH-004 | Per-call approvals; yolo when auto | `newSessionMeta.yoloMode`; `acp-agent-session.ts#onPermissionRequest` → `acp-permission-bridge.ts` (`allow_once`/`reject_once`, `cancelled` on interrupt/close/turn end); permission `toolCall` uses the same projection (`_meta["x.ai/tool"].name` → `run_bash`) | AC-004 test asserts canonical `run_bash` card + approval; deny → `TOOL_DENIED`, later provider updates ignored; web default stays standard (spec) |
| BEH-005 | Rules injection, HTTP MCP, readiness, canonical names | `acp-agent-run-backend-factory.ts` (`composeSharedCarpenterPrompt` → `_meta.rules`; `activateForRun`; `mcpServers` http entry; `awaitMcpServerReady` 15 s); `use_tool` → `normalizeAgentToolsMcpToolNameForEvent` | `_meta` keys exactly `rules`, `yoloMode`; unavailable/timeout → activation error naming the server, no provider detail |
| BEH-006 | Exact `session/load`, replay suppressed | `restoreBackend` requires `AcpAgentRunContext.sessionId ≠ runId`, requires `loadSession`, `openLoad` drops `session/update` + usage effects while `opening(load)`; `agent-run-restore-context-factory.ts`; resume reference `sessionId` | History comes from local raw traces (`LocalMemoryRunViewProjectionProvider` serves all runtimes) |
| BEH-007 | Per-call usage | `grok-build-call-usage.ts` (`per_call`, `base_excludes_cache`, key `grok_build:<sessionId>:<turnId>:<ordinal>`, `model_provider:"GROK"`, session model); session applies only in `prompting`/`cancelling`, ordinal per turn | prompt fixture: 2 records summing 34019/18048/146/109; mcp2: 4 records summing 70034/53504/345/209; cancel: 0 records |
| BEH-008 | `.grok/skills` symlinks | `grok-workspace-skill-materializer.ts` (shared materializer); factory materializes and releases on terminate/failure | Symlink created and removed (test) |
| BEH-009 | Reference-files text block | `acp-prompt-builder.ts` (`appendContextFileReferenceSection` over all context files) | Local text + image paths listed; http/data URLs excluded; no image blocks |
| BEH-010 | `grok-4.7` row | `supported-model-definitions.ts`, tests, `provider_model_catalogs.md`, `llm_module_design*.md` | `grok-4.6`/`grok-4.5` rejected by `requireCurrentModelIdentifier` |
| BEH-011 | Provider-owned auth, errors surfaced | child env = server env + three switches; `application-provider-credential-readiness-adapter.ts` → `unsupported`; prompt JSON-RPC error → turn-terminal `ERROR` with provider message | No vault key passed; no login UI |
| BEH-012 | Interrupt → cancelled, run idle | `AcpAgentRunBackend.interrupt` → `session.cancel` (pending approvals `cancelled`, `session/cancel`) → prompt result `cancelled` → `TURN_INTERRUPTED` | cancel fixture: session `ready`, reusable |
| BEH-013 | App scope wiring + preflight | `application-execution-scope-kernel-builder.ts`, `general-process-run-supervisor.ts`, `agent-provider-factory-builder.ts`; validator + selection-service Grok diagnostics | Unit tests for safe diagnostics |
| REQ-018 | Neutral ACP layer | `acp/` modules read standard fields only; neutrality test greps `grok|xai|x.ai` and other-runtime imports | DSH-like initialize → explicit `session/load, HTTP MCP servers` missing |
| REQ-014 | Existing runtimes unchanged | Seams add one branch each; `McpEffectiveResultSource.provider` gained a type-only `"grok_build"` member | Pre-existing failures identical on base (below) |

## Key Files Or Areas

New server source (`autobyteus-server-ts/src/`):
- `runtime-management/acp/`: `acp-agent-launch-profile.ts`, `acp-agent-process.ts`, `acp-client-connection.ts`, `acp-agent-capabilities.ts`, `acp-discovery-handshake.ts`
- `runtime-management/grok/`: `grok-build-launch-profile.ts`, `grok-build-capability.ts`
- `agent-execution/backends/acp/`: `acp-agent-session-profile.ts`, `backend/{acp-agent-run-backend-factory,acp-agent-run-backend,acp-agent-run-context}.ts`, `session/{acp-agent-session,acp-permission-bridge}.ts`, `events/acp-session-update-converter.ts`, `input/acp-prompt-builder.ts`
- `agent-execution/backends/grok/`: `grok-build-session-profile.ts`, `grok-build-tool-projection.ts`, `grok-build-call-usage.ts`, `grok-build-mcp-readiness.ts`, `grok-workspace-skill-materializer.ts`, `grok-build-agent-run-backend-factory.ts`
- `llm-management/services/grok-build-model-catalog.ts`

Modified server: `runtime-kind-enum.ts`, `runtime-availability-service.ts`, `agent-provider-factory-builder.ts`, `general-process-run-supervisor.ts`, `application-execution-scope-kernel-builder.ts`, `agent-run-manager.ts`, `agent-run-restore-context-factory.ts`, `agent-run-context.ts`, `agent-run-token-usage.ts`, `agent-run-resume-config-service.ts`, `model-catalog-service.ts`, `run-model-selection-service.ts`, `application-launch-host-capability-validator.ts`, `application-provider-credential-readiness-adapter.ts`, `team-run-execution-tree-v1-types.ts` (exhaustive switch; throws like AGY), `mcp-effective-tool-result-projector.ts` (type union), `package.json` + `pnpm-lock.yaml` (SDK `1.5.0`).

Contracts: `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`, `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts` (+ tracked `dist/`).

Web: `types/agent/AgentRunConfig.ts`, `utils/existingRunModelHelp.ts`, `services/activity/runActivityPresentation.ts`, `localization/messages/{en,zh-CN}/workspace.ts`, `components/settings/token-usage/{tokenUsageStatisticsUi.ts,analytics/TokenUsageAnalyticsControls.vue,analytics/TokenUsageBreakdown.vue}`, `test-support/currentTeamTestFixtures.ts`.

`autobyteus-ts`: `src/llm/supported-model-definitions.ts`, `docs/provider_model_catalogs.md`, `docs/llm_module_design.md`, `docs/llm_module_design_nodejs.md`, tests (`supported-model-definitions`, `grok-llm` unit/integration, `llm-factory-metadata-resolution`).

Tests: `tests/fixtures/grok-acp/` (sanitized wire fixtures, `fake-acp-agent.mjs`, `fake-grok-cli.mjs`, README); `tests/unit/{runtime-management/{acp,grok},agent-execution/backends/{acp,grok}}/`; Grok cases added to `run-model-selection-service.test.ts` and `application-launch-host-capability-validator.test.ts`; `grokBackendFactory`/`grok` added to 14 existing test constructions; web `utils/__tests__/grokBuildRuntimePresentation.spec.ts`.

## Implementation Decisions Within The Design (for review attention)

1. **Shared launch-profile contract tightened.** `minimumVersion` and `requiredCapabilities` are not on the shared interface. The version gate is Grok-only (`GROK_BUILD_MINIMUM_VERSION` in `grok-build-capability.ts`). Capability needs are protocol-level (`AcpAgentCapabilities.requiredFor({restore, mcp})`: `loadSession`, `mcpHttp`), so every future profile gets the same explicit missing-capability error.
2. **Readiness hook shape.** The session profile declares `mcpReadiness(descriptor) → {serverName, timeoutMs} | null`, and the shared session waits on profile-produced `mcp_status` effects (profile hooks stay pure). This replaces the design's `awaitMcpReady(watch)` wording; the same behavior.
3. **Provider prompt failure = one turn-terminal `ERROR`** (`error_scope:"turn"`, `error_effect:"terminal"`, provider message). There is no additional `TURN_COMPLETED`: `AgentRun` already treats a TURN_TERMINAL error as the turn's terminal (Claude precedent `buildClaudeTurnTerminalErrorEvent`), so a second terminal would be redundant. The session stays `ready` for the next message.
4. **Process exit / transport close / idle timeout.** Open segments close, unfinished tools → `TOOL_EXECUTION_INTERRUPTED`, `TURN_INTERRUPTED`, then a runtime-global `ERROR` (`error_scope:"runtime"`). The backend goes inactive, stops the process and releases skills. The code is `ACP_AGENT_PROCESS_EXITED` or `ACP_TRANSPORT_CLOSED`, whichever fires first.
5. **Tool card mapping.** Shell → `run_bash` segment/tool (Codex precedent). `write`/`search_replace` → `tool_call` cards named `write_file`/`edit_file` with `file_path` args (Claude Write/Edit precedent), so file-change artifacts come from the tool lifecycle. Other built-ins keep Grok names (`list_dir`, `read_file`, `search_tool`, …); non-Agent-Tools MCP tools keep `<server>__<tool>`.
6. **Image prompt blocks not implemented** even for agents advertising image support. No current agent needs it (Grok `image:false`, DSH text-only), and REQ-009 requires the reference-files block only. `AcpAgentCapabilities.imagePrompt` is normalized for a future profile.
7. **`--no-leader`** is always passed, so a user config enabling Grok's shared leader cannot attach AutoByteus runs to a shared process (explicitly out of scope).
8. **Foreign JSON-RPC responses** (Grok answers ids it never received, e.g. `skills-reload`) are dropped at the connection's stream edge. The SDK numbers its own requests, so no response to AutoByteus is affected. Without this, the SDK logs `Got response to unknown request` on every session.
9. **Contract enums** (`team-stream-contracts`, `collaboration-stream-contracts`) needed `grok_build` for team/org member DTO validation. The design's file list missed them; the change is additive and follows the AGY precedent `97f881366`, including regenerated tracked `dist/`.
10. `compositions/create-process-agent-provider-factory-builder.ts` needed no change: Grok is built inside `createForExecution` from `process.workspaceManager`, like AGY.
11. `activeTurnAppend: "unsupported"` (UNK-001 unchanged).

## Important Assumptions

- Grok CLI ≥ 1.0.41 keeps the verified shapes (`_x.ai/session_notification{response_completed}`, `_x.ai/mcp/server_status`, `_meta["x.ai/tool"].name`, `initialize._meta.modelState`). Unknown extension traffic is ignored.
- `reasoning_effort` in `llmConfig` is the AutoByteus key (same as Codex) and maps to `--reasoning-effort`.
- AR-005 (stale "per-turn usage" wording in `design-spec.md`) is left for the Solution Designer. The implementation follows DS-002/003/008 (per call).

## Known Risks

- Paid live flows were deliberately not exercised beyond the step-5 turn: team `send_message_to` via `search_tool`/`use_tool`, interactive approval, interrupt latency, restore follow-up and application launch. These are covered by recorded-traffic replays plus zero-cost probes and are left for gated live E2E (user credit constraint).
- `session/load` with a non-empty MCP descriptor was probed only without a prompt (ready status observed).
- Model discovery spawns a short-lived Grok process per catalog request (~0.6 s), as designed (no process-global cache).
- Grok CLI auto-updates may change `_x.ai` shapes (minimum-version gate + ignore-unknown).
- Grok persists AutoByteus prompt text under `~/.grok/sessions/` (user-owned; documented in requirements).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: every seam absorbed one branch; the missed contract-enum sites were enumeration additions, not a design issue. Deferrals (0)–(3) unchanged (`ClaudeWorkspaceResolver` reused per AGY precedent).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (`grok-4.6` removed without alias; stale `grok-4.5` pins corrected)
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters removed in scope: `Yes`
- Shared structures remain tight: `Yes` (launch contract reduced to what shared code uses; `AcpExtEffect` closed union; `AcpAgentRunContext {sessionId, workingDirectory}`)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (largest new file `acp-agent-session.ts` 257 effective lines; `agent-run-manager.ts` 486)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`
- Direct-use evidence: enum-driven validation admits `grok_build`; `platformAgentRunId` holds the Grok `sessionId`; new `ingestion_kind` `grok_acp_call` is an open string; the historical TeamRun V1 migration's exhaustive switch throws for `GROK_BUILD` exactly like AGY (no V1 record can contain it).
- Migration implementation: N/A
- Deviation: None

## Environment Or Dependency Notes

- New dependency `@agentclientprotocol/sdk` **1.5.0** (exact), server only; `pnpm-lock.yaml` updated.
- Env: `GROK_BUILD_COMMAND` overrides the `grok` command. The child env inherits the server env and adds `GROK_SUBAGENTS=0`, `GROK_WORKFLOWS=0`, `GROK_ASK_USER_QUESTION=0` (user Grok config untouched).
- Local setup used: `pnpm install --frozen-lockfile`, builds of `autobyteus-ts` and the four contract packages (server resolves them from `dist/`), `prisma generate`. The server `typecheck` script fails on a pre-existing tsconfig `rootDir`/`tests` conflict, so typecheck used `tsc -p tsconfig.build.json --noEmit`.
- Untracked local build outputs not committed: `autobyteus-application-sdk-contracts/dist/`, `autobyteus-application-backend-sdk/dist/`.

## Local Implementation Checks Run

- `tsc -p tsconfig.build.json --noEmit` (server source): clean.
- New/touched server suites (`tests/unit/{agent-execution/backends/{acp,grok},runtime-management/{acp,grok}}`, run-model-selection, app-launch validator, agent-run-manager, supervisor ownership, application-run-binding-launch): **17 files, 132 tests passed**.
- Architecture tests + touched integration tests (manager, MCP lifecycle, file-changes API, prompt fallback, memory layout): passed. `brief-studio-imported-package.integration` fails 3/3 identically on base (bundle not discoverable, pre-existing).
- Full server unit suite: 522 files passed; **29 files / 51 tests failed, identical (same files, same 51/111 counts) on a clean `e06080b00` worktree**. These are pre-existing: Prisma/SQLite/dotenv environment tests and application-scope tests whose factory-set mocks lack the AGY entry since the AGY merge.
- `autobyteus-ts`: `tests/unit/llm` 64 files / 333 tests passed. `llm-factory-metadata-resolution.test.ts` fails on base at a stale Gemini assertion before its (corrected) Grok assertions, which are pre-existing and out of scope.
- Web: 26 related spec files / 64 tests passed (labels, draft policy, localization catalogs + literal audit, token usage, system-instruction item, new Grok presentation spec).
- Live zero-cost probes and the step-5 paid turn: see above (evidence in `evidence/implementation-probes/`).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: runtime picker and model/effort form in the agent launch configuration; token-usage runtime labels; system-instruction Activity source label.
- Approved references: requirements "UI, Interaction, And Experience Requirements" (labels only, standard auto-execute default).
- Design system / adjacent surfaces reviewed: existing runtime entries (Codex, Claude, Antigravity) in the same form; token-usage label maps.
- Development surface used: `pnpm dev` (worktree-local data root, ports 8000/3000; the user's running desktop app was untouched), in-app browser.
- States inspected (531 px viewport): runtime select lists five runtimes with "Grok Build" last. Selecting it loads the live model group "GROK BUILD / Grok 4.7". Selecting the model shows the "Thinking" section with Reasoning Effort `xhigh/high/medium/low`, default `high`. The auto-approve toggle stays off (standard default, not the AGY-only default-on policy). Live GraphQL `runtimeAvailabilities` returned `grok_build enabled:true, reason:null`.
- Visual or interaction issues found and corrected: none (layout identical to other runtimes).
- Limitations: the run itself was not launched from the UI (would spend Grok credits; live runs belong to API/E2E). Token-usage analytics and the system-instruction Activity card with Grok data were not rendered (no Grok run history in the dev data); their labels are covered by the web spec.

## Downstream Coverage Hints / Suggested Scenarios

- Capability GraphQL e2e: extend `tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts` to five kinds.
- Gated live (`RUN_GROK_E2E=1` + binary; mind credits):
  - standalone turn with `list_dir` (AC-003) and usage records (AC-009);
  - `autoExecuteTools=false` approve and deny of `run_bash` (AC-004);
  - interrupt ≤ 2 s and a follow-up (AC-008);
  - stop/reopen with history exactly once and a follow-up (AC-006, including `session/load` with Agent Tools MCP);
  - mixed team/org with a Grok member using `get_handoff_rules`/`send_message_to` via `use_tool` (AC-005);
  - application launch preflight + run (AC-015);
  - unauthenticated/rate-limited provider error text (AC-012).
- Harness reuse: `tests/fixtures/grok-acp/fake-acp-agent.mjs` / `fake-grok-cli.mjs` replay recorded traffic without credits.

## API / E2E / Executable Coverage Investigation And Execution Still Required

All API/E2E and broader executable validation above is still required and owned by `/api_e2e_engineer` after code review. Nothing in this handoff is API/E2E sign-off.
