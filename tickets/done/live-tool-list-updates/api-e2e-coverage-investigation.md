# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results go in `api-e2e-execution-coverage-report.md`.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/` unless absolute.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (approved SR-001; SR-007 current; DEC-001…DEC-009)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (`Large` / `High`)
- Supplemental Task Artifacts: `evidence/probe/*`, `evidence/step1/*`
- Design Review Report: `design-review-report.md` (ARCH-REV-009 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001…IR-003)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 2
- Trigger: round 1 CRR-003 Pass; round 2 CRR-005 Pass after the API-05 rework (IR-004, code `011275b49a`, SR-010 / ARCH-REV-010)
- Prior Investigation Reviewed: round 1 (this file)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001…003 / AC-001, AC-002: a definition's tool-list change reaches running runs without a stop. AutoByteus, Claude and AGY get it at once; Codex and Grok at the next message, by reopening their runtime session with the conversation kept.
- REQ-004/005 / AC-003, AC-004: a removed tool is refused from the save on, on every runtime, also inside a turn; it is never offered.
- REQ-006/007: one notice to the agent, and a "Tools updated" card ("Now available: … No longer available: …").
- REQ-008 / AC-005: no change, no noise. REQ-009 / AC-006: a restored run hears what changed. AC-008: only the changed member's runs.
- REQ-010 / AC-007 (SR-007, DEC-008/009): a failed reopen fails the message with "Couldn't give this run its new tools (<cause>). Send your message again to retry, or stop and resume the run.". The message is not sent, there is no card and no button, the next message retries, and nothing else is stopped. A Team member's not-sent failure is published once to the Team stream.
- DEC-004: Codex built without a real run; "the real Codex run is done if the limit is back before merge".
- Code: `c4da95428e` (IR-002), `c8f6319838` (IR-003) on base `9f7c9c10a6`; head `9e21e20f8a` (ticket files only after the code).
- Legacy / Compatibility Removal Check: the AGY header, SSE compatibility response, `not_exposed` and `listChanged: false` are removed, with no wrapper kept. Persisted data: `seen_tool_names.json`, additive, "Directly Usable — No Migration". Both match the summary.

## Supported Scenarios And Real Usage

- SCN-001…SCN-005 as in the requirements.
- Added from investigation:
  - SCN-001b, the user's real path: Agents → Edit → tool list → Save while a run is open in the app, then the card in that run's conversation. The card has component specs only.
  - SCN-004b: a failed reopen seen through the real server and the run's WebSocket stream (the user's view of the failed message), with another open run unaffected and the next message retrying. Unit tests (`codex-tool-list-reopen`, `acp-tool-list-reopen`) and the Team-member integration test use fakes for the backend or the server.
  - Code review hint: Claude now emits the "approved" event for Agent Tools calls (`agent_tools_enabled`); check the run view shows no extra rows for collaboration tools.
- Contrived scenarios: none recorded. "Claude with auto-execute off asks to approve a removed tool in the brief window before it re-lists" is a timing window; the server refuses the call regardless (REQ-004). Recorded as a residual, not forced.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | tool-list update service, signal, notices, five backends | units, integration (458/459) | real runtimes' handling of the new list and reopen | live gated e2e per runtime |
| API / transport / contract | Yes | Agent Tools MCP (held GET stream, `list_changed`, refusal) | integration routes, SDK client | real clients | live runs (Claude, AGY: done; Codex, Grok: owed) |
| Process / lifecycle | Yes | Codex/Grok reopen, failure, retry | unit with fakes | through the real server | server e2e with the scripted Grok agent; live runs |
| Persisted data | Yes (additive) | `seen_tool_names.json` | store tests, restore integration | — | — |
| Frontend | Yes | "Tools updated" card | component specs | rendered card in a real run; the UI edit path | browser probe on a probe-owned stack (scripted AGY) |
| Desktop shell | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates`, branch `codex/live-tool-list-updates` @ `9e21e20f8a`
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/TESTING.md`. Backend/runtimes → server tests + server E2E. Live suites are gated; signed-in CLIs need the real `HOME`/`USER`/`LOGNAME`; give Codex a throwaway `CODEX_HOME`; local models one at a time and unloaded; renderer → browser probe.
- Credentials: Codex limit checked without a model turn (`account/rateLimits/read` over a throwaway `CODEX_HOME`): `ordinaryUsageAllowed: true`, 50% of the weekly window used. Codex is runnable now (DEC-004: run it). Grok: no status command (`grok --help`); the account was out of credit (implementation, the user); one attempt with a short turn timeout.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/live-tool-list-updates.e2e.test.ts` (gated) | turn script: call alpha; add beta; call beta + quote turn 1; remove alpha; alpha refused | AC-001…AC-003 | Still Valid | real runs (native, Claude, AGY pass) | Run for Codex and Grok |
| `tests/integration/tool-list-updates` (11), `agent-tools/mcp` routes, `team-member-reopen-failure` (2) | service, endpoint, Team-member failure publication | AC-003…AC-008 | Still Valid | IR-002/IR-003 blocks | Keep |
| `tests/unit/agent-execution/backends/codex/codex-tool-list-reopen.test.ts` (8), `acp/acp-tool-list-reopen.test.ts` (5), `immediate-tool-list-apply.test.ts`, autobyteus-ts `agent-replace-tools` | backend reopen/apply incl. failure and retry | AC-002, AC-004, AC-007 | Still Valid (fakes) | same | Keep; add a real-server failure case |
| web `SystemTaskNotificationSegment.spec` | the card | AC-001/002 | Still Valid (component) | same | Keep; render in a real run |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | all (repository layer) | server typecheck/unit/integration, autobyteus-ts, web, architecture | Reused | `evidence/local-checks.log` IR-002/IR-003 blocks and the code reviewer's architecture rerun (58/58) | Ran on the code commits; nothing after `c8f6319838` touches code |
| API-02 | AC-001, AC-003, AC-004 (native, Claude, AGY) | real runtimes through the real server | Reused | `evidence/real-runs/` (native, AGY on IR-001 code unchanged since for their paths; Claude re-run after CR-002) | IR-003 changed only the Team-member observer, not single-run paths |
| API-03 | AC-002, AC-003 (Codex) | real Codex through the real server | Existing Test (gated, live) | `env -i PATH HOME USER LOGNAME TMPDIR CODEX_HOME=<throwaway> RUN_LIVE_TOOL_LIST_E2E=1 LIVE_TOOL_LIST_RUNTIME=codex_app_server LIVE_TOOL_LIST_MODEL=<model> LIVE_TOOL_LIST_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/live-tool-list-updates.e2e.test.ts --no-watch` | DEC-004: the limit is back |
| API-04 | AC-002, AC-003 (Grok) | real Grok | Existing Test (gated, live) | same with `grok_build`, `grok-4.7`, `LIVE_TOOL_LIST_TURN_TIMEOUT_MS=120000` | Owed; credit unknown |
| API-05 | AC-007, REQ-010, SCN-004b | real server, run WebSocket, a scripted Grok agent whose reopen (`session/load`) fails once | Durable (new server e2e) or Temporary | scripted `grok` wrapper (fixture per process; `FAKE_ACP_STOP_BEFORE=session/load` while a state file says so); two Grok runs; change run A's definition; message A → failed message with the exact text, not sent; run B unaffected; message A again → reopen succeeds and the message is sent | The failure path through the real server is unit-proven only |
| API-06 | AC-001, AC-003, AC-006, REQ-007, SCN-001b | browser probe: probe-owned real stack, scripted AGY (real Agent Tools calls) | Durable (new probe case module) | open a run; Agents → Edit → add a tool → Save; the "Tools updated" card in the open run; call the new tool from the composer (`CALL_TOOL`); remove the old tool; its call is refused; stop the run, change tools, send a message: the card again (AC-006) | The card and the UI edit path through the product |
| API-07 | code review hint (Claude approved events) | Claude run stream | Temporary probe (round 2: replaces the planned browser journey) | a real Claude run's stream frames for one Agent Tools call (`list_projects`), with auto-execute on and off; the web builds one tool row per invocation id from these frames | The run view must not gain noise; the frames are the direct evidence, and the browser probe stack has no real Claude |

- Test progress log needed: `Yes`

Round 2 notes:
- API-01 now reuses IR-004 (server only); API-05 is rechecked first (round 1 Fail).
- API-06 needs the scripted agent's tool log to read a refusal: the Agent Tools endpoint answers a removed tool with a JSON-RPC error (`-32602 Tool is not enabled for this session`), and the scripted AGY turn then ends without a `CALLED:` reply. The probe sets `AGY_FAKE_TOOL_LOG` and passes `agyToolCalls`.
- API-04 waits for the user's Grok credits (back tomorrow).

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-05 | `autobyteus-server-ts/tests/e2e/runtime/tool-list-reopen-failure.e2e.test.ts` (if the recorded fixtures can drive it) | AC-007 through the real server; the scripted agent costs nothing, so it can run in every e2e run |
| API-06 | `autobyteus-web/tests/e2e/tool-list-update-cases.mjs` registered in `delegated-launch-defaults-probe.mjs` | The card and the edit path; the probe stack already drives scripted AGY runs |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Claude approval prompt for a removed tool before it re-lists (auto-execute off) | Timing window; the server refuses the call anyway | Low | No | Residual |
| Application-owned agent saved in the app while its run is open | Signal source covered by unit + `package-auto-refresh` integration (in-app save signal); the same downstream path as an edit | Low | No | Residual unless cheap in API-06 |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added: `Yes` (API-05, API-06, as feasible)
- Reroute Required Before Validation Execution: `No`
