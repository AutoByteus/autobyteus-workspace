# API/E2E Execution Coverage Report

## Execution Round Meta

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/`.

- Requirements Doc: `requirements-doc.md` (Approved; REQ-001..007, AC-001..007, DEC-001 = A)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-004 current)
- Design Spec: `design-spec.md` (incl. "SR-003 Design Revision" and the SR-004 correction)
- Supplemental Task Artifacts: `handoff-sr-003-design-revision.md`, `handoff-sr-004-design-correction.md`, `handoff-architecture-design-complete.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (IR-003 current; IR-002 superseded)
- Code Review Report: `code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: Code Reviewer CRR-003 Pass on IR-003 (`b3b28d47b`), which supersedes IR-002
- Prior Round Reviewed: Round 1 (API-REV-001, Fail on DTL-003)
- Latest Authoritative Round: 2

Evidence paths below are relative to `api-e2e-evidence/`. They are retained locally and not committed.

## Routing Classification

- Task size: `Small`
- Architectural risk: `High` (raised by SR-003)
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required` (reviewed High route)

## Investigation And Execution Basis

- Coverage investigation artifact: see above (round-2 delta recorded there)
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with these deviations:
  - **Real Claude case added.** A gated real-Claude case (DTL-009) and a rendered-tree check in the existing browser probe were added to close the confidence gaps.
  - **IR-002 not validated on its own.** Round 2 started on IR-002. The Solution Designer then put validation on HOLD, and IR-003 replaced it.
- Existing coverage decisions revised during execution: the durable suite's test helpers were hardened after timed probes on a loaded host (see Durable Coverage).
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: see above
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (including the HOLD checkpoint)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: round-2 completion
- Cases still running, interrupted, or not started: None

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R-01 tsc | Pass | Completed | `r2-tsc.log` | — |
| R-02 unit | Pass (99 files / 853 tests) | Completed | `r2-unit.log` | — |
| R-03 integration | Pass (12 files / 95 tests) | Completed | `r2-integration.log` | — |
| DTL-001 | Pass ×6 runs, all roots | Completed | `r2-ir3-dtl-1..3/`, `r2-ir3-dtl-final/`, `r2-final-with-claude/`, `r2-final-default/` | — |
| DTL-002 | Pass ×6, all roots | Completed | same | — |
| DTL-003 | **Pass** ×6 (Org) — prior failure resolved | Completed | same; receipt `org.memberStartFailure` | — |
| DTL-004 | Pass ×6 (Agent, Team) | Completed | same | — |
| DTL-005 | Pass ×6, all roots | Completed | same | — |
| DTL-006 | Pass ×6, all roots | Completed | same | — |
| DTL-007 | Pass ×6, all roots | Completed | same | — |
| DTL-008 | Pass ×6 (Org) | Completed | same | — |
| DTL-009 (new, `RUN_CLAUDE_E2E`) | Pass (real Claude haiku) | Completed | `r2-final-with-claude/` (`liveClaude`) | — |
| BR-008..BR-011 (+ lazy-member render check) | Pass | Completed | `r2-task-closure-tree/evidence.json`, screenshots | — |
| REG-E2E | Pass (9 files; 33 passed, 1 Claude-gated skip) | Completed | `r2-e2e-regression.log` | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The eager path is removed, and the removed `readinessFailureCode` has no shim.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`. DTL-007 proves the approved `Directly Usable` reader policy.

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / REQ / AC | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| DTL-001 | BEH-001; REQ-001/003/004; AC-001, AC-003, QR-001 | Task Team preparation + seed activation | Real Studio HTTP/WS, scoped MCP, AGY backend (scripted CLI) | Durable | Pass | One launch per copy (the lead); others have no process, a `null` binding in every saved tree record, and `offline` in a fresh view's `agent_statuses` |
| DTL-002 | BEH-005; AC-002 | Teammate delivery → first-work activation | Live API | Durable | Pass | Only the recipient launches; `initializing → … → idle`; binding saved |
| DTL-003 | REQ-005; AC-004 member | `reserveInput` → `startForInput` | Live API (Org; retired model) | Durable | Pass | Sender `{accepted:false, code:"AGENT_RUN_ACTIVATION_FAILED", message:"AGY_MODEL_UNAVAILABLE: dtl-retiring-model"}`; writer `error`; exactly 1 conversation error card (`COLLABORATION_AGENT_ACTIVATION_FAILED`, cause in message); no writer launch; lead/reviewer keep working |
| DTL-004 | REQ-004; AC-003 | Team-hosted nested copy | Live API (Agent, Team) | Durable | Pass | Only the nested coordinator launches |
| DTL-005 | REQ-006; AC-005 | Idle shutdown (incl. Org copy with an errored never-started member) + restore | Live API + processes | Durable | Pass | Copy processes gone; only the lead relaunches with `--conversation <saved>` |
| DTL-006 | REQ-006; AC-005 | DONE → TODO → reactivation | Live API | Durable | Pass | Only the lead resumes |
| DTL-007 | REQ-006; AC-005; persisted data | Root stop + pre-fix saved tree + restore | Live API + persisted reader | Durable | Pass | Legacy-bound member stays `offline`; its first work starts fresh and replaces the binding |
| DTL-008 | REQ-005; AC-004 coordinator | Seed failure → dispatch failure | Live API (Org) | Durable | Pass | `delegate_task` → `target_agent_run_id: null`, message `AGY_MODEL_UNAVAILABLE: dtl-retiring-model`; no member launch |
| DTL-009 | QR-001 on the user's runtime | Claude Agent SDK activation | Live API, real Claude haiku | Durable (gated) | Pass | Bindings `{lead: <Claude session id>, reviewer: null, writer: null, tester: null}`; others `offline` with no live statuses |
| BR-008..010 render check | REQ-003; AC-001 (web-equivalent of AC-007) | Rendered Workspaces tree | Built backend + Nuxt dev + headless Chrome | Durable (browser probe) | Pass | Agent, Team, Org: coordinator row `idle` (green), unused member row `offline` (gray); screenshots `*-task-team-lazy-members.png` |
| BR-011 | AC-005 (cold restart) | Real backend process restarts | Same probe | Durable | Pass | Reactivated Task Team copy (new null-binding data shape) survives two real backend restarts; conversation continues |
| REG-E2E | REQ-007; AC-006 | Existing journeys | Live API (serial) | Durable (existing) | Pass | See Additional Repository Coverage |
| DTL-E01 | REQ-001/002/003; AC-001, AC-002 (the AC-007 journey, agent-run) | Packaged Electron app (desktop shell + renderer + embedded server) | Isolated instance of this worktree build; test agent package; real Claude haiku; real composer input | Temporary (live desktop) | Pass | A few seconds after delegation the real sidebar shows lead green, reviewer blue (handoff), writer and tester gray Offline. Steady state: lead and reviewer green, writer and tester gray. The saved tree has `writer: null, tester: null`, and only lead and reviewer have memory dirs. Screenshots `electron/05-after-delegation.png`, `electron/06-steady-state.png` |

## Additional Repository Coverage Execution

All commands run from the worktree root with `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` unless noted.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| E-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts --no-watch` | ×5 default (disposable HOME); host load average 7–30 | DTL-001..008 | Pass ×5 (3 before + 1 after the final helper edit + 1 final default) | `r2-ir3-dtl-*.log`, `r2-final-default.log` |
| E-02 | Same + `RUN_CLAUDE_E2E=1` | Real HOME (Claude login) | DTL-001..009 | Pass | `r2-final-with-claude.log` |
| E-03 | `tsc -p tsconfig.build.json --noEmit`; unit layer; integration layer (round-1 commands) | worktree | Regression | Pass | `r2-tsc.log`, `r2-unit.log`, `r2-integration.log` |
| E-04 | Serial REG-E2E set (round-1 E-02 file list, `--no-file-parallelism`) | worktree | AC-006/AC-005 regressions | Pass (9/9 files) | `r2-e2e-regression.log`, `r2-regression-receipts/` |
| E-05 | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web exec nuxt prepare`; `pnpm -C autobyteus-web test:e2e:task-closure-tree --cases BR-008,BR-009,BR-010,BR-011 --output-dir <evidence>/r2-task-closure-tree` | current worktree dist; probe-owned backend, Nuxt, Chrome, data root | Rendered lazy-member status; real backend restarts | Pass | `r2-task-closure-tree/evidence.json`, `backend-1..3.log`, screenshots |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 95% | +15 | AC-001..006 and QR-001 proven directly in every applicable root; DTL-003 fixed and asserted on the new contract | AC-007 is the user's own desktop check (by design) |
| Changed-boundary execution directness | 80% | 95% | +15 | Real `delegate_task`/teammate delivery, `startForInput`, AGY process per activation, saved trees, view snapshots | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | +20 | Real Claude Agent SDK session (DTL-009); built backend + real browser; the scripted CLI is used only for determinism | Codex runtime not run (shares the handle path) |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | +15 | Real launch configs and Org overrides, real Claude login, built dist, two real backend restarts | — |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | +15 | Member/coordinator start failure, errored never-started member through idle shutdown, DONE/reopen, cold restart, legacy tree, all repeated 6× | PREM-001 (input closed during a start) is a timing race covered by the reviewer's handle unit tests, not E2E |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | +20 | Rendered tree in a real browser: coordinator Idle, unused member Offline, in all three roots | Packaged Electron shell unchanged; AC-007 user check |
| Durable regression coverage quality and relevance | 90% | 95% | +5 | Durable E2E (gated, discriminates on base), browser-probe render check, gated live-Claude case, hardened helpers | — |

- Overall post-repository confidence (round 2, repository suites only): 80%
- Overall final confidence: **95%** (simple average)
- Calculation method: simple average of the seven categories
- Confidence change produced by broader validation: +15
- Every critical acceptance criterion directly proven: `Yes` (AC-007 is explicit user verification)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Desktop confirmation: DTL-E01 ran the journey in the packaged Electron app of this worktree with real Claude, at the user's request. It is agent-run evidence, not the user's AC-007 verification.
- Observation (non-blocking, outside scope): the Task Team row's screen-reader label reads "offline" while its members are active. Nothing visual shows it.
- Confidence-limiting residual risks:
  - PREM-001 race is covered by unit tests only.
  - The Codex runtime was not exercised.
  - One `accepted:false` on an Org reactivation was seen once on superseded IR-002, with the code not captured. It has not recurred in 6 IR-003 runs plus the reactivation suite. Assertion messages now include the result JSON.

## Broader Validation Decision And Execution

- Decision and mode: `Required`. Live API and lifecycle (gated scripted-AGY server E2E), a real-provider case (Claude), and a browser plus real backend restart (`task-closure-tree` probe).
- Confidence gaps addressed:
  - AC-004 member branch (fixed);
  - QR-001 on the user's runtime;
  - cold restart with the new data shape;
  - rendered status.
- Environment choices:
  - idle grace 60 s;
  - disposable HOME except the live-Claude run;
  - `AGY_FAKE_EXTRA_MODELS` only during Org creation;
  - the probe owns ports, data root, processes and Chrome.
- Host conditions: other worktrees ran E2E batches concurrently (load average up to ~100 during round 2). The durable helpers were hardened for this; see below.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Org: lead → `send_message_to` writer (model retired) | Not-accepted naming cause; writer `error`; one card; others unaffected | `AGENT_RUN_ACTIVATION_FAILED` / `AGY_MODEL_UNAVAILABLE: dtl-retiring-model`; writer `error`; 1 card; lead/reviewer continue | receipt `org.memberStartFailure` | Pass |
| Org: real Claude Team copy | Only coordinator has a Claude session | `{lead: "d5b86d6b-…", reviewer: null, writer: null, tester: null}` | `r2-final-with-claude/` | Pass |
| Browser: delegated Task Team rows | Coordinator Idle, unused member Offline | Coordinator `idle`, unused member `offline`, in all 3 roots | `r2-task-closure-tree/evidence.json`, `*-task-team-lazy-members.png` | Pass |
| Browser: two real backend restarts | Reactivated Team copy and conversation survive | BR-011 Pass | `backend-1..3.log`, `*-after-*restart.png` | Pass |

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64)
- Node (workspace pnpm), Vitest 4.0.18
- AGY scripted CLI; Claude Code CLI 2.1.283 (haiku)
- Headless Chrome (probe)

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data exercised: pre-fix saved tree shape (DTL-007, all roots). New copies save `null` bindings for unused members, read back after two real backend restarts (BR-011).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material

## Durable Coverage Changed In The Codebase

Changes since round 1 (round-1 changes are in commits `fecc0c047`, `c95ad4b92`):

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts` | Updated | DTL-003 now asserts `AGENT_RUN_ACTIVATION_FAILED` plus exactly one writer error card; added gated DTL-009 (real Claude); see the hardening list below | Pass ×6 |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Updated | BR-008..010: after delegation, the Task Team coordinator row renders Idle and the unused member row renders Offline (REQ-003, AC-001 rendered) | Pass |
| `TESTING.md` | Updated | Suite description (new contract, live-Claude option, HOME note, grace tolerance) and probe render check | Doc |

Hardening of the durable suite:
- The saved-tree helper reads only the three root tree files. Reading every `.json` under a busy data dir once took ~60 s.
- Status checks accept an expected-`idle` member that was shut down by the 60 s grace before the check. This happened 0 times in round 2 and is recorded in the receipt when it does.
- `accepted:true` assertions report the result JSON.
- The disposable HOME is skipped when `RUN_CLAUDE_E2E=1`.

- Added or updated paths attached for proportional test-code review: `Yes`
- Removed paths: None

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `tmp-dtl-*-probe.e2e.test.ts` (generated copies) | Timed diagnostics of the intermittent status failure; Claude login diagnosis | Slow step = saved-tree walk (59.6 s); legit grace shutdown; Claude "Not logged in" under disposable HOME | Deleted after each run |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI / model | Repository scripted CLI | Deterministic, no paid inference | Covered by the real-Claude case for a real provider |
| Model retirement | `AGY_FAKE_EXTRA_MODELS` during Org creation | Org creation refuses unavailable models | Models a real provider event |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R-01..R-03, DTL-001..DTL-009, BR-008..BR-011, REG-E2E | All approved behavior proven at the real boundaries |
| Not Tested | AC-007 | User verification in the desktop app |
| Out Of Scope | `mixed-task-delegation.e2e.test.ts` | Needs LM Studio + Codex + Claude together |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Suite servers, AGY/Claude processes, temp data/HOME | Owned per run | Suite `afterAll` | Receipts: data/HOME removed, server closed, 0 leftover processes, `errors: []` |
| Probe backend, Nuxt, Chrome, data root | Probe-owned | Probe `finally` | `browser: closed`, backend/frontend terminated, `dataRootRemoved: true` |
| Temporary probe test files | Mine | Deleted | Done |
| Built `autobyteus-server-ts/dist`, SDK `dist/`, `.nuxt` | Build output (untracked) | Left as untracked build output | — |
| Other worktrees' processes | Not mine | Untouched | — |

## Latest Authoritative Result

- Result: **`Pass`**
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` and executed
- Critical acceptance criteria lacking direct proof: None (AC-007 is user verification)
- Test-review decision: proportional test-code review `Required` (Small/High reviewed route)
- Next recipient from `get_handoff_rules`: Code Reviewer
- Notes for Delivery:
  - `autobyteus-server-ts/docs/modules/agent_team_execution.md:247-248` still names the removed option.
  - Optionally document the `AGENT_RUN_ACTIVATION_FAILED` contract.
  - `pnpm -C autobyteus-server-ts typecheck` fails with TS6059 on base too.
