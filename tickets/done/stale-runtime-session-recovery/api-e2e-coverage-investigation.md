# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-003)
- Investigation Notes: `investigation-notes.md` (PRB-001…009)
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-003)
- Supplemental Task Artifacts: `probes/README.md` and probes; `solution-designer-handoff.md`; `follow-ups.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-003, Pass)
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Code Review Report: `code-review-report.md` (CRR-002, Pass)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- Current Investigation Round: 1
- Trigger: CRR-002 Pass (Large / High), message from `/code_reviewer`
- Code validated: branch `codex/stale-runtime-session-recovery-599`, HEAD `b220b6ce38` (code `1df7771aac`), base `origin/personal` `0da6bfbfc1`

## Current Requirement And Design Basis

When a runtime reports, by its own exact signal, that a run's saved session is missing (Claude, Codex, Antigravity, Grok, DeepSeek), activation continues the run in a fresh session of the same runtime and model through the switch steps: one closed segment, the REQ-004 lost-session marker, the hand-over notice on the first input, the new session ID committed (metadata or tree). Any other failure fails as before. Every composition offers it with both parts (DEC-007). Claude restores now open the CLI process at activation (DS-003, RSK-003).

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001…SCN-005.
- Real-use scenarios added, each with its real trigger:
  - **S-1 the founder's case, live (AC-007):** a Claude run whose saved session file Claude Code removed (30-day cleanup), on the built server, next message from the UI path (agent WebSocket). Test-owned `HOME`/`CLAUDE_CONFIG_DIR`; the session file the test's own run created is removed.
  - **S-2 restart while busy (RSK-003):** the server stops while a Claude run is mid-turn (a foreground command running), restarts, and the run's next message resumes its existing session; the restore now opens the process at activation and must not mistake a present session for a lost one.
  - **S-3 another restore failure, live (AC-003):** the same renewed run restored by a server whose Claude cannot authenticate (no credentials in its isolated config): the message fails as today, no marker, no new session.
  - **S-4 Codex, live (AC-002):** a Codex run whose rollout file is removed from its throwaway `CODEX_HOME`.
- Contrived: none.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Per-runtime recognition (Codex, AGY, Grok, DeepSeek, Claude) | Added | REQ-001, REQ-002 | units (IMP-02/03/11/12); AGY built-server E2E (IMP-04/13); Claude real CLI shape (IMP-06); live Claude and Codex here |
| Standalone and member renewal through switch steps | Added | REQ-001, REQ-003, REQ-005, REQ-006 | units and real roots (IMP-03/11/12); built server (IMP-04/13) |
| Claude restore opens its process at activation | Changed | DS-003, RSK-003 | live S-1, S-2; the live lifecycle suite's restore case (stale, below) |
| Composition wiring (studio, application scope, host) | Changed | DEC-007, AC-008 | per-composition tests (IMP-12), studio E2E (IMP-13) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | renewal, recognition, member binding | units, real roots | — | whole suites |
| API / transport | Yes | agent and team WebSocket outcome | AGY built server | Claude through the built server | live S-1 |
| Process / lifecycle | Yes | Claude process opened at restore; restart | Claude unit, factory test | a real busy restart | live S-2 |
| Persisted data | Yes | segment, marker, metadata/tree on renewal | E2E LS-01/02 | — | live S-1 |
| External integration | Yes | the real Claude CLI and SDK, real Codex | IMP-06 (initialization only, no answer) | a renewed session that answers | live S-1, S-4 |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (rerun by impact; gated live suites; test vault; isolated runtime homes; one runtime at a time; never the user's CLI config or data). QR-003: synthetic runs and test-owned runtime homes only.
- Claude without the host login: `CLAUDE_AGENT_SDK_AUTH_MODE=api-key` makes the server resolve `provider.anthropic.api-key` from its vault (`provider-credential-catalog.ts`) and pass it to the CLI child only; the built server reads the test vault through `startBuiltTestServer({ testVaultSetting })`. With `HOME` and `CLAUDE_CONFIG_DIR` pointed at test-owned folders, nothing of the founder's `~/.claude` is read or written.
- Codex: a throwaway `CODEX_HOME` holding a link to the host `auth.json` (as the semantic-memory live suite); its rollouts are written there and removed with it.
- Wire evidence: a recorder in front of the real CLI (`CLAUDE_CODE_EXECUTABLE_PATH`), as `agent-semantic-memory-live.e2e` does, to read the input the fresh session received.
- Build inputs changed: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| unit, architecture, focused renewal tests | AC-001…AC-005, AC-008 | all | Still Valid | IMP-11, IMP-12 (`1df7771aac`/`132471ccd9`) | Reuse; the whole unit suite reruns |
| `lost-session-renewal-built-server.e2e` LS-01…03 (scripted AGY) | AC-001 mechanism, AC-002 AGY, AC-003, AC-005 Team, AC-006, AC-008 studio | — | Still Valid | IMP-04, IMP-13 | Reuse; rerun in the whole suite with its gate |
| `claude-session-resume-check.integration` (real CLI, no key) | Claude's not-found shape | AC-001 | Still Valid | IMP-06 | Reuse |
| `claude-agent-streaming-session-lifecycle.e2e` "a restarted server restores the run…" (RUN_CLAUDE_E2E) | asserts `restored run opens its process lazily` | RSK-003 | **Needs Update (made untrue by this change)**: production now opens the process at restore (`ClaudeAgentRunBackendFactory` `verifyResumable`); the harness (`claude-live-agent-harness.ts`) restores through `ClaudeSessionManager` directly and skips that step, so the case still passes while no longer describing production | — | Harness restores as the factory does (`verifyResumable` after a restore); the assertion says the process opens at restore; run the suite's restore cases |
| `claude-agent-streaming-session-lifecycle.e2e` "counts … usage … a crash reopen and a restore" | the first result after a restore is a series restart | RSK-003 | Unclear until run with the harness change | — | Run |
| `claude-agent-streaming-session-lifecycle.e2e` line 171 "no process before the first input (lazy open)" | a NEW run opens lazily | — | Still Valid (new sessions still open lazily) | — | Keep |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | — | server build | — | `pnpm -C autobyteus-server-ts build` | built server |
| API-01 | AC-001…AC-006, AC-008 | units, real roots, AGY built server, Claude CLI shape | Reused | IMP-04, IMP-06, IMP-10…IMP-13 | ran on the code under test |
| API-02 | AC-007, AC-001 (live), AC-006, REQ-004, REQ-007 | built server + real Claude (S-1) | Durable, gated, paid | new `tests/e2e/runtime/lost-session-renewal-claude-live.e2e.test.ts` LC-01 | the founder's case live |
| API-03 | AC-003 (live) | S-3 on the same run | Durable, gated | LC-01's continuation (server relaunched without Claude credentials, then with them) | another failure must not renew |
| API-04 | RSK-003 | S-2 busy restart, built server | Durable, gated, paid | LC-02 | the design asks it |
| API-05 | AC-002 (Codex live) | S-4 | Durable, gated, paid | LC-03 (`RUN_CODEX_E2E=1`) | live proof beyond the pinned shape |
| API-06 | RSK-003 | the live lifecycle suite | Durable update | harness + assertion; run its restore and usage cases isolated (api-key mode) | made untrue |
| API-07 | all | whole server unit suite | Existing | `test:unit` | — |
| API-08 | all | server integration | Existing | `test:integration` | — |
| API-09 | all | whole server E2E, then the gated AGY lost-session file | Existing | root `pnpm test:e2e`; `RUN_AGY_FAILURE_E2E=1 … lost-session-renewal-built-server` | — |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-02…API-05 | `autobyteus-server-ts/tests/e2e/runtime/lost-session-renewal-claude-live.e2e.test.ts` (gated) | No Claude built-server E2E exists; AC-007 and RSK-003 are live by definition, and a gated file lets a release check repeat them on a test-owned Claude home |

## Durable Coverage To Update

| Path | Change | Why |
| --- | --- | --- |
| `tests/e2e/helpers/claude-live-agent-harness.ts` | a restore calls `verifyResumable()` as `ClaudeAgentRunBackendFactory` does | the harness must restore as production does |
| `tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts` | the restore case asserts the process is open after the restore; optional isolated mode (api-key with the test vault) | made untrue (RSK-003); QR-003 |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Grok and DeepSeek live renewals | shapes pinned from probes (IMP-07, PRB-005/008); Grok needs a session made with a vault key and DeepSeek's harness a login; optional per the reviewer | low | No | — |
| Application host built E2E | the host serves no run API; covered by the real supervisor with the host's wiring (IMP-12) | low | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
