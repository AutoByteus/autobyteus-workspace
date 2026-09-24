# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/probe-evidence/` (solution probes P-2..P-5 and implementation self-probe `impl-*`)
- Design Review Report: `N/A — not applicable` (direct Small + Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Implementation Engineer `Implementation Complete` (IR-001, SR-002), direct API/E2E validation
- Prior Investigation Reviewed: None (initial)
- Latest Authoritative Investigation: this file, round 1

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

Normal AutoByteus Claude turns must expose exactly 10 Claude built-ins (`Bash, Read, Edit, Write, Glob, Grep, NotebookEdit, WebFetch, WebSearch, Skill`, REQ-001/AC-001). They must carry the safety-net `disallowedTools` `AskUserQuestion, Agent, Task, Workflow, SendMessage, ListAgents` (REQ-002/AC-002). The model must receive no agent-type listing, and forced native multi-agent calls must fail with "No such tool available" (REQ-003/AC-003). Configured AutoByteus MCP tools must stay exposed, pre-approved and executable (REQ-004/AC-004). Skills must stay discoverable and usable through `Skill` (REQ-005/AC-005). Model discovery must keep `tools: []` (AC-006). The docs must describe the new policy (REQ-006/AC-007). Design: the policy is a constant emitted only by `ClaudeSdkClient.buildQueryOptions` (DS-001), and model discovery (DS-002) is untouched. Persisted data: `Not Affected`. Independent architecture/code review artifacts: `N/A — not applicable`.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 explicit built-in set | Changed | REQ-001/002, design DS-001 | Unit exactness plus real-CLI request capture through the real server path |
| BEH-002 no agent listing | Changed | REQ-003 | Real-CLI capture of system and messages with a project `.claude/agents` fixture present |
| BEH-003 forced native multi-agent calls fail | Changed | REQ-003, SCN-002 | Real-CLI forced `tool_use`; observe the tool results and the AutoByteus event stream |
| BEH-004 AskUserQuestion hidden | Preserved | REQ-002 | Unit plus real-CLI forced call |
| BEH-005 MCP / allowedTools / skills / model discovery / resume | Preserved | REQ-004/005, AC-004..006, design Persisted Data | Real server team run: MCP `send_message_to` delivery, skill materialization and invocation, next-turn resume, pre-change session resume, model discovery |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `ClaudeSdkClient.buildQueryOptions` | `claude-sdk-client.test.ts` (mocked SDK `query`) | Whether the real Claude Code CLI honors the options with production MCP, skills and settings | Real server + real CLI + fake Messages API |
| API / transport / contract | Yes | SDK options → Claude Code CLI → Messages API request | None in repo without credentials; live suites gated by `RUN_CLAUDE_E2E` | Tool list the model actually sees | Same |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | Backend provider option only; no UI | — | — | None |
| Authentication / session / permissions | Indirect | `canUseTool`/`allowedTools` unchanged; session create/resume | Unit | Resume of existing sessions with new tool set | Real CLI resume |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron | No | — | — | — | — |
| Process / lifecycle | Indirect | Per-turn CLI spawn | Unit | New tool set applies on the next turn of an existing session | Real CLI resume |
| Persisted-data transition | No (`Not Affected`) | Transcripts only replayed | — | Pre-change transcript with an `Agent` tool_use still resumes | Real CLI resume of a pre-change session |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes | Claude Code CLI version (pinned bundled 2.1.280 vs PATH `claude` 2.1.281 used by production resolver) | Probe evidence P-3..P-5 | Production resolver uses `which claude`, not the bundled CLI | Run the E2E with both executables |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction` (branch `codex/claude-sdk-builtin-tool-restriction` @ `12261026b`)
- Project type and runtime stack: TypeScript Node server (`autobyteus-server-ts`), Fastify + type-graphql + WebSocket, Prisma (SQLite test DB), Vitest (forks pool, `fileParallelism: false`)
- Conflicting, missing, or unclear project instructions: Live Claude suites require `RUN_CLAUDE_E2E=1` plus a logged-in CLI or API key. The local CLI reports "Not logged in", so live model execution is unavailable. A credential-free fake Messages API with the real CLI is used instead; the investigation notes document this method.
- Required environment variables or secrets available: `N/A`. No secret is used; a dummy `ANTHROPIC_API_KEY` goes to a local fake API only.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/package.json` | scripts | `vitest`, `tsc -p tsconfig.build.json`, `typecheck` |
| `autobyteus-server-ts/vitest.config.ts` | test runner | `tests/**/*.test.ts`, prisma setup files, serial files |
| `autobyteus-server-ts/.gitignore` | temp probes | `/tests/.tmp/` is ignored and is the repo convention for temporary probes (also used by the prior ticket `claude-ask-user-question-disallow`) |
| `tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts`, `tests/e2e/helpers/studio-runtime-test-server.ts` | Real server E2E harness | `startStudioE2eRuntimeServer`, GraphQL team-run creation, `/ws/agent-team/:id` |
| `implementation-handoff.md` § Environment | setup | `pnpm install`; `pnpm prepare:shared`; `pnpm exec prisma generate` (already done in worktree) |
| `investigation-notes.md` § Runtime findings | probe method | Fake Messages API via `ANTHROPIC_BASE_URL`; `probe3/4.mjs`; `analyze2.py` |
| `src/runtime-management/claude/client/claude-sdk-executable-path.ts` | executable resolution | `CLAUDE_CODE_EXECUTABLE_PATH` override, else `which claude` |
| `src/runtime-management/claude/client/claude-sdk-auth-environment.ts` | auth mode | `CLAUDE_AGENT_SDK_AUTH_MODE=auto` without OAuth keeps env `ANTHROPIC_API_KEY` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` inside the temp vitest probe | port 0, temp app-data dir | listen resolved | `fastify.close()`, rm temp dirs |
| Fake Anthropic Messages API | same (in-process) | node `http` server port 0 | captures every request | listen resolved | `close()` |
| Claude Code CLI | spawned by SDK | PATH `claude` 2.1.281 (production resolver) and bundled 2.1.280 via `CLAUDE_CODE_EXECUTABLE_PATH` | Session env vars of the invoking Claude session are stripped | init message | exits with the query; transcripts under `~/.claude/projects/<temp-slug>` removed |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/team definitions, team run | GraphQL mutations (as in the existing Claude team E2E) | temp app-data dir + test DB | terminate/delete + rm dir |
| Configured skill | GraphQL `createSkill`, agent `skillNames` | temp app-data dir | rm dir |
| Project Claude agent (listing leak bait) | `<workspace>/.claude/agents/probe-reviewer.md` | temp workspace | rm dir |
| Identity | dummy API key to local fake API | no credentials, no billing | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- References: design-spec § Persisted Data; implementation-handoff § Persisted Data Transition Check
- Representative existing data: a Claude session transcript created with the pre-change (base) options that contains an executed `Agent` tool_use. It must resume through the current `ClaudeSdkClient.startQueryTurn` with the new tool set and its history intact.
- Migration scenarios: N/A
- Upstream ambiguity: None

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related REQ / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` (api-key mode, query-options, listModels, new resolveContextCapacities tests) | exact `tools`/`disallowedTools`; allowedTools/mcpServers/settingSources preserved; discovery tool-free | AC-001, AC-002, AC-004, AC-006 | Still Valid (updated by implementation) | diff reviewed; 18/18 | Keep |
| Removed `not.toHaveProperty("tools")` assertions (same file) | old "no allowlist" guard | prior ticket AC-003 | Stale / Remove (done by implementation) | DEC-004 superseded | None |
| `tests/unit/agent-execution/backends/claude/**` | session/tooling/MCP/skills option shaping | AC-004, AC-005 | Still Valid | unchanged; pass | Keep |
| `tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts`, `tests/e2e/runtime/claude-*.e2e.test.ts` | live Claude flows | AC-004/005 live | Still Valid, but cannot run (no Claude auth) | gated `RUN_CLAUDE_E2E` | Not run; replaced for this round by fake-API real-CLI probe |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `claude-sdk-client.test.ts` former L126/L219 | `options` has no `tools` | Explicit allowlist is now the approved policy | DEC-004, design Removal Plan | exact `tools` assertions (already in commit) | — |

## Durable Coverage To Add / Update / Remove

- Add: None. The unit contract test already pins both lists exactly and guards both discovery paths. A durable real-CLI fake-API E2E would couple the suite to undocumented Claude Code wire internals and to a machine-specific `claude` binary. The design places SDK-upgrade verification in the reusable probe (`probe-evidence/`, R-001 mitigation). The temporary probe below is therefore not kept as durable coverage.
- Update: None beyond the implementation's changes.
- Remove: None beyond the implementation's changes.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | `autobyteus-server-ts` | AC-001, AC-002, AC-004 (options), AC-006 | Pass 18/18 | `probe-evidence/api-e2e-r1-sdk-client-unit.log` |
| 2 | `pnpm exec vitest run tests/unit/runtime-management tests/unit/agent-execution/backends/claude` | same | regression across the Claude session/tooling/MCP/skills units | 145/147. The 2 failures reproduce with the base `claude-sdk-client.ts` restored (order 3) | `probe-evidence/api-e2e-r2-claude-runtime-unit.log` |
| 3 | base-source repro of the 2 failures (temporarily restore `9267d11c8` `claude-sdk-client.ts`, rerun, restore HEAD) | same | failures are not caused by this change | Same 2 fail on base → pre-existing | `probe-evidence/api-e2e-r3-base-failures.log` |
| 4 | `pnpm exec tsc -p tsconfig.build.json --noEmit` | same | build typecheck | Pass (exit 0) | `probe-evidence/api-e2e-r4-tsc-build.log` |
| 5 | docs review of `docs/modules/agent_execution.md` | — | AC-007 | Pass | commit diff |

## Test-Case Ledger Plan

- Ledger required: `Yes`. There are multiple independently meaningful cases, including a long-running real-CLI E2E.
- Canonical ledger path: `tickets/in-progress/claude-sdk-builtin-tool-restriction/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: one case per scenario/probe

| Case ID | Case / Journey | REQ / AC | Boundary | Entry Point | Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| VAL-001 | SDK client option contract | AC-001, AC-002, AC-006 | unit | vitest | 1 | 18/18 |
| VAL-002 | Claude/runtime regression units | AC-004, AC-005 | unit | vitest | 2 | only pre-existing failures |
| VAL-003 | Base repro of pre-existing failures | — | unit | vitest on base source | 3 | same failures on base |
| VAL-004 | Build typecheck | — | build | tsc | 4 | exit 0 |
| VAL-005 | Docs policy | AC-007 | docs | review | 5 | new paragraph, no stale guidance |
| VAL-006 | Real server team run: ping turn sees exactly 10 built-ins + configured MCP tools, no agent listing, skill listed | AC-003, AC-004, AC-005, REQ-001/003 | GraphQL → WS → ClaudeSession → real CLI → fake API | temp probe | 6 | captured request |
| VAL-007 | Same turn: forced `Agent/Task/Workflow/SendMessage/ListAgents/AskUserQuestion` fail; forced `Read`, `Skill`, MCP `send_message_to` succeed; message delivered to `/pong` through AutoByteus | AC-003, AC-004, AC-005, SCN-002 | same | temp probe | 7 | tool_results + WS events |
| VAL-008 | Receiving member (`pong`) turn triggered by AutoByteus delivery has the same policy | AC-003, AC-004 | same | temp probe | 8 | captured request |
| VAL-009 | Next turn of the same run (resume binding) keeps the policy and history | UC-001, design Persisted Data | same | temp probe | 9 | captured request |
| VAL-010 | Pre-change session (base options, executed `Agent` call) resumed through `ClaudeSdkClient.startQueryTurn` gets the new tool set | design Persisted Data, REQ-001/003 | real SDK + CLI | temp probe | 10 | captured requests |
| VAL-011 | Model discovery through GraphQL `providerModelCatalogSnapshots` still works, and discovery requests stay tool-free | AC-006 | GraphQL → client → CLI | temp probe | 11 | catalog result + captured requests |
| VAL-012 | VAL-006..011 repeated with the SDK-bundled pinned CLI 2.1.280 (`CLAUDE_CODE_EXECUTABLE_PATH`) | QR-001 | same | temp probe | 12 | same |
| VAL-013 | SDK 0.3.281 re-check with the exact implementation options (`probe4.mjs`) | R-001 | real SDK 0.3.281 CLI | probe4 | 13 | summary |

## Post-Repository Confidence Scorecard

Recorded after repository execution (VAL-001..005); see the execution report for the final scorecard.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | AC-001/002/006/007 directly proven | AC-003/004/005 only via the implementer's self-probe with a hand-built MCP server | Real server E2E through the real CLI |
| Changed-boundary execution directness | 75% | Options built by the real `buildQueryOptions` | Mocked SDK `query`; CLI not exercised by repo tests | Same |
| Cross-boundary integration realism | 70% | — | Real AutoByteus MCP host, skill materializer, team delivery not exercised with the new options | Same |
| Environment/config/fixture fidelity | 70% | — | Production resolves PATH `claude` (2.1.281), not the bundled 2.1.280 | Run both executables |
| Failure/edge/lifecycle/recovery | 70% | — | Forced-call failure surfacing through AutoByteus events; resume of pre-change sessions | Forced calls + resume cases |
| User-surface/browser/desktop | N/A | No UI or renderer change; the websocket event stream is checked in VAL-007 | — | — |
| Durable regression coverage | 95% | Exact list assertions + discovery guards | Real-CLI regressions (R-001) guarded only by the reusable probe | — |

- Overall post-repository confidence: ~76% (simple average of the 6 applicable categories)
- Every critical AC directly proven: `No` (AC-003..005 need real-boundary evidence)
- Categories below 90%: requirement proof, directness, realism, environment, failure/lifecycle
- 95% target met: `No`

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Other`: a temporary in-process Studio server E2E through the real Claude Code CLI against a local fake Anthropic Messages API (credential-free), run with both the PATH and the bundled CLIs; plus a `probe4.mjs` re-run on SDK 0.3.281.
- Gap addressed: the real tool surface seen by the model and the real enforcement through the full AutoByteus stack (MCP host, skills, team delivery, resume).
- Why this mode helps: it exercises the real changed boundary end to end. The only substitute is the model, and a deterministic fake is actually required to force native tool calls.
- Expected confidence after: ≥95%
- Browser-specific decision: Not required. There is no UI/renderer change, and the WebSocket stream is asserted directly.
- Live Claude API: not available ("Not logged in"). The residual risk that the real Anthropic API rejects the new request shape is negligible: the request only has fewer tool definitions, and history tool_use blocks for tools no longer defined are standard.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| VAL-006..012 | `autobyteus-server-ts/tests/.tmp/claude-builtin-tool-policy.fake-api.probe.test.ts` (gitignored; removed after run) | AC-003..006, resume, pre-change session | Depends on the machine `claude` binary and on undocumented CLI wire behavior; SDK-upgrade verification is owned by the reusable ticket probe (R-001) |
| VAL-013 | `probe-evidence/probe4.mjs` with `/tmp/sdk281` | 0.3.281 re-check | Upgrade-time probe |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Live Anthropic model behavior | CLI not logged in; no credentials provided | Negligible (request shape only shrinks) | Optional live smoke by delivery/user with `RUN_CLAUDE_E2E=1` |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Post-Execution Update (round 1)

The broader validation ran as planned; results are in `api-e2e-execution-coverage-report.md`. Final confidence is 95%, and every category is ≥95% (UI N/A). No coverage decision changed. New observations: RR-1 (pre-change transcripts replay the old agent listing in history; non-blocking), RR-2 (the production resolver uses PATH `claude`, so R-001 also applies to CLI updates), OBS-1 (the gated live team E2E sends the removed `refType`; pre-existing).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` (implementation's unit changes validated as-is)
- Post-repository confidence: ~76%
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
