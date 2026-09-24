# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/probe-evidence/`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: Implementation Engineer `Implementation Complete` (IR-001 / SR-002), direct route
- Prior Round Reviewed: None
- Latest Authoritative Round: 1
- Validated revision: branch `codex/claude-sdk-builtin-tool-restriction` @ `12261026b` (base `origin/personal` @ `9267d11c8`)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before final execution: `Yes`
- Investigation plan followed: `Yes`. The probe needed two harness corrections before its assertions were meaningful. First, Claude Code 2.1.281 appends a trailing `system`-role message, so the fake API keys off the last `user` message. Second, `TeamMemberInput` no longer has `refType`. After the corrections, the skill check matches the listed skill name (the listing shows names only), and the leak check ignores assistant-role history, which contains the probe's own forced `Agent` arguments.
- Existing coverage decisions revised during execution: None
- Reroute required before or during execution: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (probe iterations recorded)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: VAL-013 Completed
- Cases still running, interrupted, or not started: None

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| VAL-001 | Pass | Completed | `probe-evidence/api-e2e-r1-sdk-client-unit.log` | — |
| VAL-002 | Pass (task scope) | Completed | `probe-evidence/api-e2e-r2-claude-runtime-unit.log` | 2 pre-existing failures (VAL-003) |
| VAL-003 | Pass | Completed | `probe-evidence/api-e2e-r3-base-failures.log` | failures reproduce on base source |
| VAL-004 | Pass | Completed | `probe-evidence/api-e2e-r4-tsc-build.log` (empty = no errors) | — |
| VAL-005 | Pass | Completed | commit diff of `docs/modules/agent_execution.md` | — |
| VAL-006 | Pass | Completed | `probe-evidence/api-e2e-real-server-claude-code-2.1.281-PATH.json` | — |
| VAL-007 | Pass | Completed | same | — |
| VAL-008 | Pass | Completed | same | — |
| VAL-009 | Pass | Completed | same | — |
| VAL-010 | Pass | Completed | same | RR-1 observation (non-blocking) |
| VAL-011 | Pass | Completed | same | — |
| VAL-012 | Pass | Completed | `probe-evidence/api-e2e-real-server-claude-code-2.1.280-bundled.json` | — |
| VAL-013 | Pass | Completed | `probe-evidence/api-e2e-probe4-sdk-0.3.281-summary.txt` | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. There is no toggle and no fallback to the default preset.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes` (`Not Affected`; pre-change sessions resume through the normal path, VAL-010)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / REQ / AC | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| VAL-001 | BEH-001/004/005; AC-001, AC-002, AC-004 (options), AC-006 | `buildQueryOptions`; discovery options | Vitest unit (mocked SDK `query`) | Durable | Pass (18/18) | `api-e2e-r1-sdk-client-unit.log` |
| VAL-002 | AC-004, AC-005 (session/tooling/MCP/skills shaping) | Claude session layer | Vitest unit | Durable | Pass for task scope (145/147; 2 pre-existing) | `api-e2e-r2-claude-runtime-unit.log` |
| VAL-003 | — | — | Base-source repro | Temporary | Pass (pre-existing confirmed) | `api-e2e-r3-base-failures.log` |
| VAL-004 | — | build | `tsc -p tsconfig.build.json --noEmit` | Durable | Pass | `api-e2e-r4-tsc-build.log` |
| VAL-005 | REQ-006 / AC-007 | docs | Review | — | Pass | `docs/modules/agent_execution.md` L438-454 |
| VAL-006 | BEH-001/002/005; REQ-001/003/004/005; AC-003, AC-004, AC-005 | options → real CLI → Messages API | Real Studio server (GraphQL + WS team run, Claude runtime) → ClaudeSession → real Claude Code CLI → local fake Messages API | Temporary (real stack, fake model) | Pass | `api-e2e-real-server-claude-code-2.1.281-PATH.json` `VAL006_ping_turn` |
| VAL-007 | BEH-003/004/005; REQ-002/003/004/005; AC-003, AC-004, AC-005; SCN-002 | enforcement + AutoByteus MCP execution | same | Temporary | Pass | same, `VAL007_forced_calls` |
| VAL-008 | BEH-001/002; AC-003, AC-004 | receiving team member turn | same | Temporary | Pass | same, `VAL008_pong_receiving_turn` |
| VAL-009 | UC-001, Data Continuity | next turn of the same run (resume binding) | same | Temporary | Pass | same, `VAL009_ping_next_turn_resume` |
| VAL-010 | design Persisted Data `Not Affected`; REQ-001/003 | pre-change transcript resumed through `ClaudeSdkClient.startQueryTurn` | real SDK + real CLI + fake API | Temporary | Pass (see RR-1) | same, `VAL010_prechange_session_resume` |
| VAL-011 | AC-006 | model discovery | GraphQL `providerModelCatalogSnapshots(runtimeKind: claude_agent_sdk)` → real CLI | Temporary | Pass | same, `VAL011_model_discovery` |
| VAL-012 | QR-001 | pinned CLI | VAL-006..011 with `CLAUDE_CODE_EXECUTABLE_PATH` = SDK-bundled Claude Code 2.1.280 | Temporary | Pass | `api-e2e-real-server-claude-code-2.1.280-bundled.json` |
| VAL-013 | R-001 | next SDK | `probe4.mjs` with SDK 0.3.281 and the exact `impl-build-query-options.json` | Temporary | Pass | `api-e2e-probe4-sdk-0.3.281-summary.txt` |

## Additional Repository Coverage Execution

None beyond the investigation's repository plan (VAL-001..005).

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | 95% | +20 | AC-001..007 all directly proven. AC-003/004/005 proven through the real production stack on two CLI versions and SDK 0.3.281 | No live model (no credentials) |
| Changed-boundary execution directness | 75% | 95% | +20 | The wire request the model would receive was captured, and the options came from the real `ClaudeSession` → `ClaudeSdkClient` path, not hand-built | — |
| Cross-boundary integration realism | 70% | 95% | +25 | Real AutoByteus Agent Tools MCP host executed `send_message_to` and delivered `TEAM_COMMUNICATION_MESSAGE` to `/pong`. The real skill materializer produced a listed and invocable skill. The WS event stream shows blocked calls as ordinary `TOOL_EXECUTION_FAILED` | Only the Anthropic model/API is emulated. The request only shrinks, so rejection risk is negligible |
| Environment / config / fixture fidelity | 70% | 95% | +25 | Production executable resolution (`which claude` → 2.1.281) and pinned bundled 2.1.280; real user `settingSources` (real HOME incl. user plugins/skills); project `.claude/agents` bait | Dummy key against a fake API |
| Failure / edge / lifecycle / recovery | 70% | 95% | +25 | All 6 disallowed names forced and failed with "No such tool available"; next-turn resume (VAL-009); resume of a pre-change transcript containing an executed `Agent` call (VAL-010) | RR-1 is an observed, fully evidenced behavior, not an evidential gap. Team-run restore after server restart was not run separately; it uses the same `startQueryTurn` resume binding already proven, and `tools` is emitted unconditionally |
| User-surface / browser / desktop | N/A | N/A | — | No UI/renderer change; the WS stream was asserted directly | — |
| Durable regression coverage | 95% | 95% | 0 | Exact list assertions and both discovery guards | Real-CLI regression (R-001) is guarded by the reusable ticket probe, not the suite (design decision) |

- Overall post-repository confidence: ~76%
- Overall final confidence: 95% (simple average of 6 applicable categories)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: RR-1, RR-2 (below); R-001 (upstream, accepted)

## Broader Validation Decision And Execution

- Decision and selected mode: `Required`. The mode is a temporary in-process Studio server E2E with the real Claude Code CLI and a local fake Anthropic Messages API, credential-free, plus a `probe4.mjs` run on SDK 0.3.281.
- Material deviation: None. The live Claude API is unavailable because the CLI reports "Not logged in" and no credentials were provided. The fake API is also required to force deterministic native tool calls.
- Startup: fake API on `127.0.0.1:<random>`; Studio server via `startStudioE2eRuntimeServer()` on port 0 with a temp app-data dir; team socket `/ws/agent-team/:teamRunId`.
- Environment choices: invoking-session `CLAUDE*`/`ANTHROPIC_*` variables stripped; `ANTHROPIC_BASE_URL=<fake>`, `ANTHROPIC_API_KEY=<dummy>`, `CLAUDE_AGENT_SDK_AUTH_MODE=auto`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`; run 1 with no executable override (resolves PATH `claude` 2.1.281), run 2 with `CLAUDE_CODE_EXECUTABLE_PATH=<bundled 2.1.280>`.
- Fixtures: GraphQL-created skill `probe_skill_<id>` bound to both agents (`skillAccessMode: PRELOADED_ONLY`); agents `ping`/`pong` with `toolNames: [send_message_to]`; team run (Claude runtime, `autoExecuteTools: true`); temp workspace with `.claude/agents/probe-project-reviewer.md` and `probe-read.txt`.

| Scenario / Step | Expected | Actual (both CLIs) | Evidence | Result |
| --- | --- | --- | --- | --- |
| VAL-011 model catalog via GraphQL | catalog resolves; no tool-bearing requests | model IDs `default, claude-fable-5-1[1m], haiku, opus[1m], sonnet, sonnet[1m]`; the only discovery traffic is `/api/hello` (no `/v1/messages`) | `VAL011_model_discovery` | Pass |
| VAL-006 ping turn request tools | 10 built-ins + configured MCP tools only | `Bash, Edit, Glob, Grep, NotebookEdit, Read, Skill, WebFetch, WebSearch, Write` + `mcp__autobyteus_agent_tools__{delegate_task,get_handoff_rules,send_message_to}` | `VAL006_ping_turn.tools` | Pass |
| VAL-006 agent listing | none in system/messages although the project agent exists | no hits for `Available agent`, `general-purpose`, `probe-project-reviewer`, `PROBE_PROJECT_AGENT` | `VAL006_ping_turn.leaks` | Pass |
| VAL-006 skill listed | configured skill in the skills listing | `- probe_skill_<id>` present | `skillListed: true` | Pass |
| VAL-007 forced `Agent, Task, Workflow, SendMessage, ListAgents, AskUserQuestion` | tool error, nothing started | all 6: `is_error: true`, `No such tool available: <name>. <name> is disabled for this session, in subagents as well as here.` No subagent requests reached the API. WS: `TOOL_EXECUTION_STARTED` → `TOOL_EXECUTION_FAILED` for each | `VAL007_forced_calls` | Pass |
| VAL-007 forced `Read`, `Skill`, MCP `send_message_to` | execute | Read → `PROBE_READ_CONTENT`; Skill → `Launching skill: probe_skill_<id>`; send_message_to → `{"accepted":true,"code":"DELIVERED","message":"Delivered message to /pong."}`; WS `TOOL_EXECUTION_SUCCEEDED` ×3 and `TEAM_COMMUNICATION_MESSAGE` ping→pong with the token | same | Pass |
| VAL-008 pong receiving turn | same policy | same 10 + 3 MCP; no leaks; delivered token in prompt | `VAL008_pong_receiving_turn` | Pass |
| VAL-009 ping second turn | same policy; history kept | same 10 + 3 MCP; first-turn history present; no non-assistant leak hits (assistant-role hits are the probe's own forced `Agent` args) | `VAL009_ping_next_turn_resume` | Pass |
| VAL-010 pre-change session | base options expose `Agent` and more; resumed turn exposes exactly 10 | pre-change request tools: 22 built-ins incl. `Agent, Workflow, SendMessage, ListAgents, TaskStop, Cron*, ReportFindings`; its forced `Agent` ran a real subagent. The resumed turn via the current `startQueryTurn` has exactly the 10 built-ins, and the old `Agent` tool_use/result replays | `VAL010_prechange_session_resume` | Pass (RR-1) |
| VAL-013 SDK 0.3.281 | same | init/API tools = 10 + 3 MCP; no agent mentions; `Agent/Task/Workflow/SendMessage/ListAgents` → "No such tool available"; Read + MCP executed | `api-e2e-probe4-sdk-0.3.281-summary.txt` | Pass |

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64); Node via pnpm workspace; `@anthropic-ai/claude-agent-sdk` 0.3.280 (worktree) and 0.3.281 (`/tmp/sdk281`, VAL-013); Claude Code 2.1.281 (PATH, used by the production resolver) and 2.1.280 (SDK-bundled)

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: a session transcript created with the exact base option shape (no `tools`, `disallowedTools: ["AskUserQuestion"]`) containing an executed `Agent` subagent call
- Result: it resumes through the current normal path with the new tool set. The history replays unchanged.
- Version-specific runtime branch or compatibility fallback observed: `No`
- Residual: RR-1

## Tests Implemented Or Updated

None by API/E2E. The implementation's unit updates in `tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` were validated as-is.

## Tests Removed As Stale Or Obsolete

None by API/E2E. The implementation already replaced the obsolete `not.toHaveProperty("tools")` assertions (DEC-004).

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route; none changed by API/E2E)

## Other Execution Artifacts

| Artifact Path (under `probe-evidence/`) | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-real-server-claude-code-2.1.281-PATH.json` | compact evidence VAL-006..011 (production-resolved CLI) | Retained | tool names, leak scan, tool results, WS events, request log |
| `api-e2e-real-server-claude-code-2.1.280-bundled.json` | same with the pinned bundled CLI (VAL-012) | Retained | |
| `api-e2e-probe4-sdk-0.3.281-summary.txt` | VAL-013 summary | Retained | |
| `api-e2e-real-server-fake-api.probe.test.ts.txt` | source of the temporary probe | Retained as evidence | reusable for R-001 re-verification (copy to `autobyteus-server-ts/tests/.tmp/` and run with vitest) |
| `api-e2e-r1..r6-*.log` | command outputs | Retained | |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/.tmp/claude-builtin-tool-policy.fake-api.probe.test.ts` (gitignored) | real-stack proof without credentials; deterministic forced tool calls | Pass on both CLIs | Removed (`test ! -e` verified) |
| Temporarily restored base `claude-sdk-client.ts` for VAL-003 | prove failures pre-exist | same 2 failures | HEAD version restored; `git status` clean for `src` |
| `probe4.mjs` run on `/tmp/sdk281` | VAL-013 | Pass | output JSON and transcript removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Anthropic Messages API / model | Local HTTP fake (SSE) capturing requests and emitting forced `tool_use` | No credentials ("Not logged in"). Forced native calls need a deterministic model | The real API was not asked to accept the request. The change only removes tool definitions, so the risk is negligible |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | VAL-001..013 | All acceptance criteria are directly proven on the production path. The pinned CLI, the PATH CLI and SDK 0.3.281 behave identically |
| Out Of Scope (pre-existing) | — | 2 unit failures reproduced on base (codex env test; claude-session interrupt/resume test) |

## Residual Risks And Observations (non-blocking)

- **RR-1: pre-change sessions keep the old agent listing in replayed history.** This is a transitional, separate-ticket candidate. A Claude session created before this change has Claude's persisted agent-type listing reminder in its transcript, as a `system`-role message naming `general-purpose` and project agents. When resumed, that old listing is replayed as history (VAL-010, message index 1). The model's tool list is still exactly the 10 built-ins, and any `Agent`/`Workflow`/… call fails. This matches the approved Data Continuity statement ("resumed sessions pick up the new tool set") and the `Not Affected` persisted-data decision. New sessions and new turns get no listing. Rewriting or discarding history would be a new persisted-data policy, which is a `Requirement Gap` needing user approval, so it is not treated as a failure.
- **RR-2: the effective Claude Code version comes from the user's PATH `claude`, not only the SDK pin.** `resolveClaudeCodeExecutablePath` prefers `which claude` (2.1.281 here) over the SDK-bundled CLI (2.1.280). R-001 (tool renames) can therefore arrive via a user CLI update, not only an SDK upgrade. The docs say "re-verify … whenever the SDK version changes". Suggestion for delivery/docs: also mention CLI updates. The current list is verified on 2.1.280 and 2.1.281.
- **OBS-1 (pre-existing, out of scope):** the gated live suite `tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` sends `refType` in `TeamMemberInput`, which the schema no longer defines. It would fail at GraphQL validation when `RUN_CLAUDE_E2E=1`. Separate-ticket candidate.
- **OBS-2 (nit):** `claude-sdk-client.test.ts` has `const RESERVED_SESSION_ID ="1111…"` (missing space after `=`). Formatting only.
- ASM-001 (accepted): static Bash/Glob/Grep/Skill descriptions still mention "Agent tool"/"subagent" (confirmed again on 0.3.281).

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Studio server, fake API, team run | this run | `terminateAgentTeamRun`, `fastify.close()`, `close()` | Done |
| Temp app-data dir, temp workspaces | this run | `rm -rf` in `afterAll` | Done |
| `~/.claude/projects/*claude-tool-policy-ws*` and `-private-tmp-claude-tool-probe-ws` transcripts | this run | removed | Done (0 remaining) |
| `tests/.tmp` probe file | this run | removed | Done |
| `/tmp/claude-tool-probe/apie2e-v281.json` | this run | removed | Done |
| `/tmp/api-e2e-claude-tools/` scratch | this run | logs copied into `probe-evidence/` | scratch left in `/tmp` (no sensitive data) |
| Untracked `autobyteus-application-*/dist/` | implementation setup | not touched | pre-existing build outputs |

## Preliminary Classification

N/A — result is `Pass`.

## Recommended Recipient

`/delivery_engineer` (direct low-risk route; confirmed via `get_handoff_rules`)

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed (real server + real CLI ×2 + SDK 0.3.281, fake Messages API)
- Critical acceptance criteria lacking direct proof: None
- Required next recipient: Delivery (direct route); proportional test-code review `Not Required — direct low-risk route`
- Notes: RR-1 and RR-2 are for user visibility at delivery verification; neither blocks.
