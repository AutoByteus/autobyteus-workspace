# Current combined validation — API-REV-002 (2026-10-01)

**Current result: Fail / API-F001; final confidence 88.6%.** Restored CR-F001 assertion passes; reviewer closure pending. Renderer and real AGY pass; desktop deferred/not tested at failed architecture gate. See canonical execution report for final scorecard and evidence.

This section supersedes historical SR-002-only statements below. Basis: SR-005, ARCH-REV-001 Pass, IR-002, **CRR-001 Fail / CR-F001**, DR-003. User-directed ordinary continuation authorizes the test-owned local correction and combined execution, not source-review Pass or release. HEAD a727971dabab141a39404a00ca6f7db46696f0b9; integrated base b0b077b02571098a6bf7993ab46b67a69fdb8f9d. Large / High; independent test review and explicit CR-F001 resolution required before delivery. Checkpoint 9038c218b and all incoming evidence/generated output preserved.

## Current investigation and coverage decisions (before edits)

Read cumulative requirements/design/investigation/history, implementation ledger/handoff, architecture/source reviews, recovery inventory and delivery/API evidence. Applicable instructions: root TESTING.md, server/web AGENTS.md, package manifests, server Vitest config and tests/setup/{prisma-env,prisma-test-config,prisma-global-setup}.ts; root/server README development/testing sections; docs/isolated-app-instances.md. No closer TESTING guideline exists. Full server phases run serially: shared test-owned tests/.tmp/autobyteus-server-test.db is reset by global setup; no concurrent test run observed. Built subprocess tests require fresh server build. Brief Studio packed prerequisites already exist, will be refreshed if needed. Never use installed app/data or disturb other instances.

- SCN-001..004 / AC-001..008: AGY helper/converter/native/fake transport tests Still Valid; reuse TC-001..008 IDs for reruns. Opt-in disabled tests are Not Tested, not Pass. Real CLI/renderer replay evidence from API-REV-001 remains historical only.
- SCN-005 / AC-009,011: Team preflight focused service tests and built migration suite Still Valid; verify missing/valid/unreadable indexes, no orphan and preserved bytes/independent work.
- SCN-006 / AC-010,011,013: frozen recognition and cutover tests Still Valid. `team-run-v1-production-upgrade.e2e.test.ts` Needs Update: restore missing populated task record exact equality at `agent_orgs/<root>/agent_org_task_delegation_records.json`, with schemaVersion/subjectKind/orgRunId wrapper. Expected record independently specified by original predecessor fixture and former assertion, NOT derived from runtime conversion. Preserve identity, description/status, task execution, submission/review linkage, references and times. Applies at all existing assertConvertedPackage calls (initial/retry/relaunch). No tests removed or source edits planned.
- SCN-007 / AC-012..014: all 47 historical cohort files Still Valid after documented IR-002 contract repairs, subject to complete suite verification. No weakening, skips, expected failures or source fixes to obtain green.
- Changed boundaries: AGY provider/transport/history/renderer; Team lifecycle/catalog; persisted migration startup/retry/current admission; test setup/package integration. No new shell code, but full-product isolated desktop run required by combined package/TESTING.md.
- Broader validation Required: real built-server migration (including restored full-chain ledger), explicitly enabled fake AGY transport, real CLI Team/Org, rendered Activity and isolated desktop worktree build. Repository confidence will be scored before broader execution; no current Pass inferred.

## Planned serial execution / case mapping

| ID | Surface / requirement | Expected result |
| --- | --- | --- |
| TC-009 | Fresh server build + corrected full-chain migration E2E; AC-009..011,013,014 | All 5 cases pass, populated ledger retained |
| TC-010 | Full server unit + architecture; AC-012..014 | No failures/errors; report opt-in skips |
| TC-011 | Full server integration; AC-012..014 | No failures/errors; report opt-in skips |
| TC-012 | pnpm test:e2e (fresh build); AC-012..014 | No deterministic failures; report opt-in skips |
| TC-001/002/003 | Explicit fake AGY MCP/native/failure/background suites | All enabled assertions pass |
| TC-005/008 | Live AGY Team/Org and native image | Real CLI outcomes or precise external blocker |
| TC-007 | Current rendered Activity/reload/reopen probe | Real names, own args, statuses and persisted replay |
| TC-013 | Isolated desktop current worktree build/start/product smoke/restart/stop | Health, renderer + isolated state and cleanup |

Execution evidence will be retained in api-e2e-evidence/api-rev-002; canonical ledger updated after every case. Source-review finding remains open pending reviewer resolution even after a passing correction test.

---
## Historical API-REV-001 investigation (basis-limited)

# API/E2E Coverage Investigation

## Investigation Meta

All paths below are under `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/` unless absolute. Ticket folder: `tickets/in-progress/agy-mcp-tool-call-presentation/`.

- Requirements Doc: `tickets/in-progress/agy-mcp-tool-call-presentation/requirements-doc.md` (Approved, SR-002)
- Investigation Notes: `tickets/in-progress/agy-mcp-tool-call-presentation/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/agy-mcp-tool-call-presentation/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/agy-mcp-tool-call-presentation/design-spec.md`
- Supplemental Task Artifacts: `solution-handoff.md`; evidence only: `agy-mcp-call-shape-probe.py`, `agy-mcp-call-shape-probe/`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/agy-mcp-tool-call-presentation/implementation-handoff.md`
- Implementation Revision Record: `tickets/in-progress/agy-mcp-tool-call-presentation/implementation-revision-record.md` (IR-001, commit `34b310118`)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `tickets/in-progress/agy-mcp-tool-call-presentation/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `tickets/in-progress/agy-mcp-tool-call-presentation/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Implementation handoff IR-001 from `/implementation_engineer`
- Prior Investigation Reviewed: None exists
- Latest Authoritative Investigation: this document

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

For an AGY `call_mcp_tool` step with a non-blank `ServerName` and `ToolName`, every tool event of that call (start, success, failure, denial) carries the real tool: the bare `ToolName` for server `autobyteus_agent_tools` (REQ-001), `mcp__<server>__<tool>` for any other server (REQ-003), with the wrapper's `Arguments` as the event arguments, `{}` when absent (REQ-002), identical at start and end (REQ-006). The result keeps `{provider_state, output}`; output text that is a JSON object or array becomes structured JSON (REQ-007). A wrapper without a usable server or tool name is presented as before and the run continues (REQ-004, QR-001). Native tools and native image handling are unchanged; the native image decision uses the provider tool name (REQ-005). AutoByteus media tools called through MCP are recognized as generated-output tools (DEC-005). Runs recorded earlier keep `call_mcp_tool` (DEC-004, BEH-006; persisted-data decision `Directly Usable — No Migration`).

The only changed production code is `AgyStreamEventConverter.tool()` and the new `agy-mcp-tool-call.ts`. No processor, history, WebSocket, or web code changed.

## Supported Scenarios And Real Usage

| Product Scenario ID | Behavior IDs | Scenario Validity | Approved Trigger / Entry Surface | Real Actor Or Event Steps The Test Follows | Supported Alternate / Error Behavior To Cover | Planned Test Scenario / Case IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, 003, 005 | Supported Normal Scenario | AGY run with agent tools enabled | AGY model calls an AutoByteus tool through `call_mcp_tool`; the step stream reaches the server; the user watches the Activity panel | Native tools in the same turn unaffected; MCP `generate_image` not treated as native | TC-001, TC-003, TC-005, TC-007 |
| SCN-002 | BEH-002 | Supported Normal Scenario | AGY discovers a user/workspace MCP server | Same as SCN-001 for a third-party server | — | TC-001, TC-003, TC-006 |
| SCN-003 | BEH-004 | Supported Normal (failure) / Supported Explicit Edge (incomplete wrapper) | Same as SCN-001/002 | Provider reports ERROR, or omits a name | Failure under the real name; fallback presentation | TC-001, TC-003, TC-006 |
| SCN-004 | BEH-006 | Supported Normal Scenario | User selects a stored run in history | A run stored by the previous server version is reopened with the current server | Old items still read `call_mcp_tool` | TC-004 |

- Scenarios recorded upstream as `Technically Possible but Unsupported/Contrived`: none.
- Material behavior with no supported scenario, or an `Unclear` scenario: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 AutoByteus tool name/arguments/JSON output | Changed | REQ-001, 002, 006, 007 | Unit + server transport/history + live AGY + rendered Activity item |
| BEH-002 third-party tool name/arguments | Changed | REQ-002, 003 | Unit + server transport/history + real provider capture |
| BEH-003 native tools | Preserved | REQ-005 | Native step in the same deterministic turn; existing native tests |
| BEH-004 failure/denial/incomplete wrapper | Changed / Preserved (fallback) | REQ-001, 004, 006 | Unit + server transport/history |
| BEH-005 native image decision | Preserved | REQ-005 | Unit; MCP `generate_image` through the server |
| DEC-005 generated-output recognition | Changed (accepted side effect) | DEC-005 | MCP `generate_image` with an explicit output path yields a Files entry |
| BEH-006 stored runs | Preserved | DEC-004 | Base-writer run read by the current reader |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | AGY step → `AgentRunEvent` translation | Unit tests (63) | None at function level | — |
| API / transport / contract | Yes (values only) | WebSocket tool events and `getRunProjection` / `getRunFileChanges` for AGY runs | None before this round for MCP calls; fake-AGY transport e2e pattern exists | Processors, trace persistence and replay with the new values | New deterministic transport e2e (TC-003) |
| Frontend component / state | No code change | Activity item title/arguments rendered from event values | Web has no code keyed on `call_mcp_tool`, `send_message_to`, `delegate_task` or `mcp__` outside tests (grep) | Rendered title/arguments for AC-001 | Browser against a worktree dev stack (TC-007) |
| Browser integration / user journey | Yes (observable only) | Same | None | Same | TC-007 |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (web-equivalent) | Same renderer as the browser | — | Covered by TC-007 | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | Yes (values) | Stored AGY traces carry new names; old traces unchanged | None | Old stored run read by current reader | TC-004 |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | AGY CLI stream shape (undocumented) | Probe capture on AGY 1.2.14 | Live AGY run through the real server | TC-005, TC-006 |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation` (branch `codex/agy-mcp-tool-call-presentation`, commit `34b310118`)
- Project type and runtime stack: pnpm workspace; Node/TypeScript Fastify server (Vitest), Nuxt web app, Electron shell
- Project testing guideline path(s): `TESTING.md` (root). No closer `TESTING*.md` under `autobyteus-server-ts/`.
- Conflicting, missing, or unclear project instructions: `TESTING.md` does not list the AGY opt-in variables. They are in the test file headers: `RUN_AGY_E2E=1` (live AGY), `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs` (deterministic fake AGY transport), `RUN_AGY_CAPABILITY_E2E=1` (live native image).
- Required environment variables or secrets available: AGY CLI 1.2.14 installed at `~/.local/bin/agy`; model quota to be confirmed by execution.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Workspace testing guideline | Server tests: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; backend runtime changes → server tests (+ e2e); real provider behavior → real-provider run; never test against the user's running AutoByteus or `~/.autobyteus`; stop what you start; assertions first; artifacts in the ticket folder |
| `autobyteus-server-ts/AGENTS.md` | Server notes | Same single-file command |
| `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-transport.e2e.test.ts` header | Deterministic AGY transport pattern | Fake AGY CLI `tests/fixtures/agy-failure-cli.mjs`, selected by `AGY_FAKE_CASE`; real server on an ephemeral port with a temp app-data dir |
| `autobyteus-web/tests/e2e/agy-large-org-launch-health-probe.mjs` | Browser probe precedent | Built backend on a free port with a temp data dir and SQLite DB, Nuxt dev on a free port with `BACKEND_NODE_BASE_URL`, headless Chrome |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| E2E runtime server | `autobyteus-server-ts` | Started in-process by the test (`startStudioE2eRuntimeServer`) | Ephemeral port, temp app-data dir | Test setup | `app.close()`, temp dir removed by the test |
| AGY CLI (live) | — | Spawned by the server | Uses the user's AGY login and `~/.gemini/antigravity-cli` (conversation folders, MCP schema cache), as every existing live AGY test does | Turn events | Runs terminated by the test |
| Browser stack (if required) | worktree | Backend + Nuxt dev on free ports, temp data dir | Must not use ports 8000/3000 or `~/.autobyteus` | `/rest/health`, page load | Kill owned processes, remove temp dir |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent definition and run | GraphQL `createAgentDefinition` / `createAgentRun` in the test | Test-owned temp database | Removed with the temp dir |
| AGY MCP step shapes | Fake CLI case built from `agy-mcp-call-shape-probe/stdout.jsonl` (AGY 1.2.14) | No provider call | Durable fixture |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check" (replay of an old run not exercised by implementation)
- Representative existing-data setup and required behavior: a run written by the base commit's converter (`5c6fb95ea`) containing a well-formed `call_mcp_tool` step; reopened with the current server it must still show `call_mcp_tool` with the wrapper arguments and raw text output.
- Evidence planned: TC-004.
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-mcp-tool-call.test.ts` | Both projections | AC-001..006, 008 | Still Valid | Added in `34b310118` | Run |
| `.../antigravity/agy-stream-event-converter.test.ts` | Event-level behavior incl. new `MCP calls` block and the `ToolName`-only fallback fixture | AC-001..008 | Still Valid | Same | Run |
| `autobyteus-server-ts/tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts` | Live AGY Team/Org `send_message_to` over GraphQL/WebSocket; now expects `send_message_to` and unwrapped arguments | AC-002, REQ-002, 006 | Still Valid (updated by implementation, not yet run) | Diff in `34b310118` | Run live (TC-005) |
| `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts:182` | Guard "no tool started as `call_mcp_tool`" = the native image tool was used, not an MCP tool | REQ-005 | Needs Update | A well-formed MCP call is now named `generate_image` or `mcp__…`, so the guard only catches an incomplete wrapper. The same test already requires exactly one `generate_image` start whose result carries a native path in AGY's brain folder, which an MCP call cannot satisfy | Extend the guard to also reject `mcp__*` starts |
| `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-codex-skill.e2e.test.ts:96` | Asserts on the raw provider `step_update.tool_name` | REQ-005 | Still Valid | Reads the provider stream, not platform events | None |
| `agy-native-image-app-chat.e2e.test.ts:90` | Native grant line does not list `call_mcp_tool` | Out of scope | Out Of Scope | Capsule grant, unchanged | None |
| `agy-background-task-transport.e2e.test.ts`, `agy-failure-transport.e2e.test.ts`, `agy-native-image-step-output.e2e.test.ts` | Deterministic native-tool transport through the real server and history | BEH-003, BEH-005 | Still Valid | Native branch unchanged | Run as native regression (TC-002) |
| `tests/unit/agent-execution/backends/antigravity/agy-mcp-team-live.test.ts` | Opt-in (`AGY_LIVE=1`) backend-level live MCP delivery; asserts delivery only, and writes its report to a ticket folder that no longer exists | — | Out Of Scope | Not name-dependent; pre-existing path problem unrelated to this change | None (noted) |

## Stale Or Obsolete Coverage Decisions

None. No coverage is removed.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| TC-003 | AGY MCP steps through the real server: WebSocket events, stored trace, `getRunProjection` (live and after termination), `getRunFileChanges` | AC-001, 003, 004, 005, 006, 007, 008; DEC-005; REQ-006 | `autobyteus-server-ts/tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts` + case `mcp_calls` in `tests/fixtures/agy-failure-cli.mjs` | Unit tests stop at the converter. Nothing deterministic proves the projected values through processors, persistence and replay, and the only other proof needs live model quota |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| TC-008 | `agy-native-image-app-chat.e2e.test.ts:182` | Reject a start named `call_mcp_tool` or starting with `mcp__` | REQ-005 | Live image test (`RUN_AGY_CAPABILITY_E2E=1`); done and run |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

See the ledger for per-case events. Results are filled in below after execution.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity/agy-mcp-tool-call.test.ts tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts --no-watch` | worktree | TC-001: AC-001..008 at the converter | Pass (63 of 63) | `api-e2e-evidence/tc-001-unit.log` |
| 2 | AGY unit folder; `tsc -p tsconfig.build.json --noEmit`; existing fake-AGY transport e2e files | worktree | TC-002: AGY regression, native tools through the server | Pass (unit folder 143 passed, 5 opt-in skipped; tsc exit 0; 3 e2e files, 8 of 8) | `api-e2e-evidence/tc-002-*.log` |
| 3 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts --no-watch` | worktree | TC-003 | Pass (1 of 1); the same test fails against the base converter | `api-e2e-evidence/tc-003-mcp-transport.log`, `agy-mcp-tool-call-transport.json`, `tc-003-sensitivity-on-base-converter.log` |
| 4 | Two-phase temporary probe: base converter writes a run, current server reads it | worktree | TC-004: SCN-004 | Pass | `api-e2e-evidence/tc-004-*` |
| 5 | `pnpm test:e2e` (deterministic server E2E suite) | worktree | Regression across server E2E | Ran after broader validation: 54 files passed, 12 failed, 28 skipped. None of the failing files is an AGY or runtime test. 41 of the 43 failing tests fail identically with the base converter; the 2 token-usage tests pass when the file runs alone (base and HEAD). Not investigated further | `api-e2e-evidence/regression-*.log` |
| 6 | Temporary probe over the real AGY 1.2.14 capture | worktree | TC-006 | Pass | `api-e2e-evidence/tc-006-*` |

## Test-Case Ledger Plan

- Ledger required: `Yes` — eight independent cases, two of them live and long-running.
- Canonical ledger path: `tickets/in-progress/agy-mcp-tool-call-presentation/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| TC-001 | Converter and projection unit tests | AC-001..008 | Backend logic | Vitest, two files | 1 | 63 passing |
| TC-002 | AGY regression: unit folder, source compile, existing fake-AGY transport e2e | REQ-005 | Backend + server transport (native) | Vitest, tsc | 2 | Pass counts |
| TC-003 | New deterministic MCP transport e2e | AC-001, 003..008; DEC-005 | Real server, WebSocket, history, Files | Vitest with fake AGY CLI | 3 | Passing assertions |
| TC-004 | Old stored run reopened | BEH-006 / SCN-004 | Persisted data, history reader | Temporary two-phase probe | 4 | Projection of the old run |
| TC-005 | Live AGY Team/Org `send_message_to` | AC-002, REQ-002, 006 / SCN-001 | Real AGY CLI + real server | `RUN_AGY_E2E=1` roundtrip e2e | 5 | Passing live test |
| TC-006 | Real AGY 1.2.14 capture (third-party server, JSON result, error) through the converter | AC-003, 005, 008 / SCN-002, 003 | Real provider payloads | Temporary probe over `agy-mcp-call-shape-probe/stdout.jsonl` | 6 | Emitted events |
| TC-007 | Activity panel shows `delegate_task` with its own arguments | AC-001 (rendered part) | Browser, worktree stack | Decided after repository evidence | 7 | DOM assertions, screenshot |
| TC-008 | Updated native-image guard | REQ-005 | Live AGY image | `RUN_AGY_CAPABILITY_E2E=1` | 8 | Passing live test, or recorded as not run |

## Post-Repository Confidence Scorecard (Mandatory)

Scored after TC-001..004 and TC-006, before any live or browser run.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | AC-001..008 proven at the converter and through the server (WebSocket, history, Files) | AC-001's rendered Activity item; AC-001/002 "live run" part | Live AGY run; browser |
| Changed-boundary execution directness | 95% | The changed method runs inside the real backend in TC-003 | — | — |
| Cross-boundary integration realism and mock gap | 80% | Real server pipeline, but the AGY process is a fake; real payloads only through the converter (TC-006) | Real AGY CLI through the real server with the new names | Live roundtrip e2e |
| Environment, configuration, identity, and fixture fidelity | 85% | Fixture shapes copied from an AGY 1.2.14 capture | No run against the installed CLI | Live run |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | Failure, incomplete wrapper, empty arguments, old stored run, reopen after termination | Denial only at unit level | — |
| User-surface, browser, and desktop-shell confidence | 70% | No web code keyed on the old or new names | Nothing rendered | Browser journey |
| Durable regression coverage quality and relevance | 93% | New deterministic e2e fails on the base converter | It is opt-in (`RUN_AGY_FAILURE_E2E=1`), like the other fake-AGY e2e files | — |

- Overall post-repository confidence: 87%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven: `No` — AC-001 rendered part
- Any applicable category below `90%`: `Yes` — integration realism, environment fidelity, user surface
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real AGY through the real server; rendered Activity item

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API` (real AGY CLI through the server, TC-005 and TC-008) and `Browser` (TC-007)
- Specific confidence gap or residual risk addressed: the undocumented provider stream as the installed CLI really emits it for an AutoByteus agent tool; the rendered Activity item of AC-001
- Why the selected mode can materially improve confidence: both exercise boundaries the deterministic run replaces or never reaches
- Expected confidence after the selected validation: about 95%
- Browser-specific decision and rationale: required. AC-001 names the Activity panel as the observable outcome, and the change is value-only for the web app, so one rendered journey is the direct proof. The renderer is web-equivalent; no desktop-shell code is involved, so a browser on a worktree dev stack is the fitting surface per `TESTING.md` ("Renderer UI … that also runs in a browser").
- If `Blocked`: N/A

Executed; results are in `api-e2e-execution-coverage-report.md`.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron
- Testing guideline used: `TESTING.md`; stack setup follows `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs`
- Web-equivalent behavior: Activity panel and conversation tool items
- Shell-specific or lifecycle behavior: none changed
- Chosen validation approach: headless Chrome → Nuxt dev → built worktree backend on free ports with a temp data root
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: the packaged desktop shell was not launched; no shell code changed, so no consequence

## Live Environment And Fixture Plan

- Startup order and commands: `pnpm -C autobyteus-server-ts build`; `prisma migrate deploy` on a temp SQLite DB; `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <temp>`; `pnpm dev --host 127.0.0.1 --port <free>` in `autobyteus-web` with `BACKEND_NODE_BASE_URL`
- Environment choices: sanitized environment; `ANTIGRAVITY_CLI_COMMAND` = fake AGY CLI, `AGY_FAKE_CASE=mcp_calls` for the browser run; real `agy` 1.2.14 for the live e2e runs
- Health / readiness checks: `/rest/health`; `/chat` responds
- Seed data / fixtures: none beyond the seeded Daily Assistant agent
- Identities: the user's AGY login for the live runs (as every existing live AGY test)
- Journeys: TC-005, TC-007, TC-008
- Evidence: test logs, DOM assertions, two screenshots
- Owned processes and temporary state to clean up: backend, Nuxt dev, Chrome, temp root

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TC-004 | Two-phase vitest probe; the converter file checked out from base for the write phase, then restored | Old stored run is shown unchanged by the current reader | It needs the previous version of a source file; the reader is unchanged code and DEC-004 adds no behavior to guard |
| TC-006 | Vitest probe over `agy-mcp-call-shape-probe/stdout.jsonl` | Real provider payloads project as required | The capture lives in the ticket folder, which moves; its shapes are already in the durable unit and e2e fixtures |
| TC-007 | `api-e2e-evidence/tc-007-activity-panel-probe.mjs` | Rendered Activity items, live, reloaded and reopened | No web code changed; the panel renders `toolName` and `arguments` generically, already covered by existing web tests. Kept in the ticket folder as evidence |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live AGY call of `delegate_task` | The live e2e uses `send_message_to`; both take the same `autobyteus_agent_tools` branch. `delegate_task` is covered deterministically through the server and in the browser | Low | None |
| Live AGY call of an AutoByteus media tool through MCP (DEC-005) | Needs a configured image provider; covered deterministically (TC-003) | Low | None |
| Live third-party MCP server through the full server | Covered by the real capture through the converter (TC-006) and deterministically through the server (TC-003) | Low | None |
| Denied MCP call through the server | Denial classification is unchanged code; the projected payload reuse is unit-tested | Low | None |
| Packaged desktop app | No shell code changed | None | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — one e2e file added, one fixture extended, one guard updated
- Post-repository confidence: 87%
- Broader validation decision: `Required` (executed)
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: final result and confidence are in the execution coverage report.

## API-REV-002 repository checkpoint — full unit/architecture

TC-010: 4126 passed, 2 failed, 6 opt-in skipped in 594 files (589 pass, 2 fail, 3 skip), no unhandled-error summary. Both failures concern `src/agent-collaboration/collaborators/collaborator-definition-catalog.ts`: third `new RunModelSelectionService` construction outside the two host roots, plus two extra Agent/Team definition singleton lookups. Tests expect 2 vs observed 3 validator roots and 26 vs observed 28 definition-getter occurrences. This source and both guard files are byte-identical to integrated b0b077b02 (`architecture-failure-provenance.json`), but baseline origin does not waive AC-012/013.

Validity decision: **Unclear** whether the collaborator addition intentionally supersedes the guarded architectural constraints; do NOT whitelist the file or change production under this ticket without failure-origin review. The source is reached by normal Agent/Team/Org collaborator admission and public candidate queries, not an invented race. Preliminary finding API-F001: Unclear / architecture contract vs source ownership; code reviewer must classify origin. Both tests retained unchanged. Continue full integration/deterministic/fake transport to provide complete bounded failure inventory before routing. CR-F001 correction remains independently passing (5/5 built startup cases).

## API-REV-002 post-repository confidence / broader decision

Full integration 318 pass/64 opt-in skip; deterministic E2E (fresh build) 238 pass/133 opt-in skip; explicitly enabled fake AGY 9/9 pass in 4 files. Historical 47-file cohort: all passed (287 tests), per-file JSON retained. Full unit/architecture remains 2 failures, 4126 pass/6 opt-in skip. No unhandled errors reported by these runners. JSON suite totals include nested suites; console file totals are the file authority.

| Mandatory category | Post-repository | Evidence / gap |
| --- | --- | --- |
| Requirements/AC proof | 75% | AGY + migration direct, but AC-012/013 full-layer gate fails and current rendered/live acceptance pending |
| Changed-boundary directness | 95% | Fresh built migration startup/retry/relaunch; real server WS/history/Files fake AGY |
| Integration realism/mock gap | 90% | Full integration/E2E pass; AGY scripted rather than live |
| Environment/configuration/identity/fixture fidelity | 95% | Isolated owned DB, complete historical fixture, fresh builds; no production target |
| Failure/edge/lifecycle/recovery | 90% | Migration warnings/retry/no-orphan and fake AGY failure; current real CLI pending |
| User-surface/browser/desktop | 50% | Only historical rendered/desktop evidence; current build not exercised |
| Durable regression quality | 90% | Exact restored assertion; 47 cohort files pass; two architecture guards need independent origin review |

Simple average 83.6%. **Not Pass** regardless of average: unresolved API-F001 and critical combined gate. Broader validation **Required**. Proceed with targeted live AGY and rendered probe to refresh unchanged original presentation boundary; their success cannot resolve architecture guard failures. Desktop decision remains required on combined candidate; never reuse the installed app or historical instance as proof of current source.

### Broader checkpoint / stop boundary

Live AGY 1.2.14 rerun passed Team and Org messaging and native image (3 passed, 1 unrelated imported-Codex-package capability skip). Current browser Activity/reload/reopen probe is in progress. No production defect inferred from skipped opt-ins.

**TC-013 desktop is Not Tested in this failing round, not an environmental Blocked claim.** Required current isolated desktop/full-product verification is deferred until API-F001 source-vs-test architecture origin is resolved and a stable candidate is available. Historical iso-52483-84f0 is stopped and is NOT current proof; no existing app, data, generated package or other instance is reused/modified. Full web/core/Electron suites are not implied by server full-suite labels; no web/core/shell source changed in this ticket. This is a deliberate reroute at a failed required repository gate, not waiver of desktop or final delivery verification.
