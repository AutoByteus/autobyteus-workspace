# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/solution-revision-record.md` (SR-002)
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/design-spec.md`
- Architecture design handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/handoff-architecture-design-complete.md`
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: Implementation Complete (IR-001, commit `203eb29e1`)
- Prior Round Reviewed: None
- Latest Authoritative Round: 1

Evidence paths below are relative to `tickets/in-progress/delegated-team-member-lazy-activation/api-e2e-evidence/`. They are retained locally and not committed (large raw logs).

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (not reached: result is `Fail`)

## Investigation And Execution Basis

- Coverage investigation artifact: see above
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Deviations: (1) Team definitions are flat (no nested Team members), so the Team root delegates a catalog copy and member-specific start failures exist only for Org placements. (2) Org run creation validates models, so the not-startable member is modelled as a model retired after the Org was configured (`AGY_FAKE_EXTRA_MODELS`).
- Existing coverage decisions revised during execution: four integration files and one Org E2E were classified `Needs Update` (stale doubles/assertions, identical failures on base) and fixed as baseline fixes.
- Reroute required: `Yes` (AC-004 member branch)

## Test-Case Ledger Reconciliation

- Ledger path: see above
- Ledger initialized before execution: `Yes` (planned cases written before the E2E runs; events recorded as cases completed)
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: REG-E2E completion and reruns
- Cases still running, interrupted, or not started: None
- Interruption, context-compression, or rerun note: on rerun start with DTL-003

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R-01 | Pass | Completed | `r01-tsc.log` | — |
| R-02 | Pass | Completed | `r02-unit.log` | 99 files / 837 tests |
| R-03 | Pass (after baseline fixes) | Completed | `r03-integration.log`, `r03-integration-after-baseline-fix.log` | 12 files / 95 tests |
| R-04 | Pass (baseline confirmed) | Completed | `r04-integration-base.log` | — |
| DTL-001 | Pass (Agent, Team, Org) | Completed | `dtl-e2e-run3.log`, `dtl-e2e-run3/` | — |
| DTL-002 | Pass (Agent, Team, Org) | Completed | same | — |
| DTL-003 | **Fail** (Org) | Completed | `dtl-e2e-run3.log`, `dtl-org-probe.log`, `dtl-org-probe2.log`, `dtl-org-member-failure-probe.log` | Reroute |
| DTL-004 | Pass (Agent, Team) | Completed | `dtl-e2e-run3/` | — |
| DTL-005 | Pass (Agent, Team; Org via DTL-P02) | Completed | `dtl-e2e-run3/`, `dtl-org-rest-probe/` | Org rerun after fix |
| DTL-006 | Pass (Agent, Team; Org via DTL-P02) | Completed | same | Org rerun after fix |
| DTL-007 | Pass (Agent, Team; Org via DTL-P02) | Completed | same | Org rerun after fix |
| DTL-008 | Pass (Org) | Completed | `dtl-e2e-run3.log` | — |
| DTL-B01 | Pass (discriminates) | Completed | `dtl-e2e-base.log` | — |
| REG-E2E | Pass (after baseline fix + isolated rerun) | Completed | `e2e-regression.log`, `org-publication-*.log`, `idle-lifetime-rerun.log` | See below |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (grep: no `prepareConfiguredAgents`, `prepareConfiguredActivation` on the flat manager, or staged-binding fields left in `src`; no flag restores eager copies)
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`. The DTL-007 legacy-tree case proves the approved `Directly Usable` reader policy, not a compatibility branch.
- Reroute classification for compatibility issues: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / REQ / AC | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| DTL-001 | BEH-001; REQ-001/003/004; AC-001, AC-003, QR-001 | Task Team preparation + seed activation in all roots | Real Studio HTTP/WS, scoped MCP `delegate_task`, AGY backend (scripted CLI) | Durable | Pass ×3 | One launch (the lead, no `--conversation`) per copy; reviewer/writer/tester no process, `null` in every saved record of the copy, `offline` in a fresh view's `agent_statuses`, no non-offline status frames |
| DTL-002 | BEH-005; REQ-002/003; AC-002 | First-work activation via teammate `send_message_to` | Live API | Durable | Pass ×3 | Lead's tool result `DELIVERED`; exactly one new launch (reviewer); reviewer statuses `initializing → running… → idle`; binding saved; writer/tester untouched |
| DTL-003 | REQ-005; AC-004 (member) | Teammate delivery to a member that cannot start | Live API (Org; retired model) | Durable + temporary probe | **Fail** | Sender: `MCP error -32603: Internal error` (no not-accepted delivery result; `AGY_MODEL_UNAVAILABLE` cause hidden). Writer: `offline`, no status events (expected `error`). No launch for the writer; lead/reviewer unaffected |
| DTL-004 | REQ-004; AC-003 | Team-hosted copy delegated by a copy member | Live API (Agent, Team) | Durable | Pass ×2 | Nested copy: one launch (its lead); others `null`/`offline` |
| DTL-005 | REQ-006; AC-005 | Idle shutdown with never-started members; restore by Manager message | Live API + process observation (grace 60 s) | Durable | Pass ×3 | All copy processes gone; one relaunch (lead) with `--conversation <saved lead binding>`; bindings unchanged; others `offline` |
| DTL-006 | REQ-006; AC-005 | Task DONE → TODO → reactivation | Live API | Durable | Pass ×3 | Copy stopped at DONE; reactivation relaunches only the lead with its conversation |
| DTL-007 | REQ-006; AC-005; persisted data | Root stop + saved tree with pre-fix shape + restore; legacy-bound member's first work | Live API + persisted reader | Durable | Pass ×3 | Edited legacy binding is read back; only the lead resumes; the tester's first work launches fresh (no `--conversation`) and its binding is replaced |
| DTL-008 | REQ-005; AC-004 (coordinator) | Coordinator start failure at delegation | Live API (Org) | Durable | Pass | `delegate_task` → `target_agent_run_id: null`, `AGY_MODEL_UNAVAILABLE: dtl-retiring-model`; no member launch |
| DTL-B01 | Discrimination | — | Same suite on base `ace86bf1f` | Temporary | Pass | Base: Agent/Team copies launch all 4 members at delegation; Org delegation fails because the eager writer start hits the retired model |
| REG-E2E | REQ-007; AC-006, AC-005 | Existing delegation/lifecycle/feed/closure/Org publication journeys | Live API (serial) | Durable (existing) | Pass | See next table |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| E-01 | `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs DELEGATED_TEAM_LAZY_E2E_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts --no-watch` | worktree root | DTL-001..008 | Fail (DTL-003 only) | `dtl-e2e-run3.log`, `dtl-e2e-run3/delegated-team-lazy-member-activation.json` |
| E-02 | Same env; `vitest run` the serial set: `task-copy-idle-lifetime`, `task-reactivation-root-visibility`, `ad-hoc-task-delegation`, `task-closure-root-visibility`, `project-change-feed`, `project-task-context-files-delegation`, `project-task-boundaries`, `agent-org-runs/controlled-org-publication-http`, `agent-team-runs/task-delegation-api-surface` with `--no-file-parallelism` | worktree root | AC-006 regressions | 7 files pass; 2 fail (below) | `e2e-regression.log`, `e2e-regression-receipts/` |
| E-03 | `controlled-org-publication-http.e2e.test.ts` on base and worktree | base + worktree | Baseline comparison | Identical failure on both (stale `@`-adds-collaborator assertion) | `org-publication-base.log`, `org-publication-worktree.log` |
| E-04 | Same after baseline fix | worktree | Org publication chain | Pass | `org-publication-worktree-fixed.log` |
| E-05 | `task-copy-idle-lifetime.e2e.test.ts` alone | worktree | Idle lifetime incl. Team copy with a never-addressed member (`mate`) | Pass | `idle-lifetime-rerun.log`, `idle-lifetime-rerun/` |

E-02 `task-copy-idle-lifetime` failure, classified as environmental: Agent `delegate_task` failed with `Antigravity model discovery timed out; check the CLI and retry.`, a quiet-copy shutdown came 58.8 s after idle against a 59 s lower bound, and an Org idle wait timed out. All three hit Agent copies and timing that this change does not touch. The suite passes alone (E-05).

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 50% | −25 (defect found) | AC-001/002/003/005 and AC-004 coordinator proven at the real boundary in every applicable root; AC-006 regressions pass | AC-004 member branch (critical, REQ-005) fails on the real teammate path |
| Changed-boundary execution directness | 75% | 95% | +20 | Real `delegate_task`/`send_message_to` over scoped MCP, dispatch, seed, AGY process per activation, saved trees, root views | — |
| Cross-boundary integration realism and mock gap | 70% | 90% | +20 | Only the external CLI/model is scripted | Real Claude/Codex sessions not run this round (shared activation path) |
| Environment, configuration, identity, and fixture fidelity | 75% | 90% | +15 | Real launch configs, Org overrides, Project/ad-hoc Tasks, persisted trees | Root stop/restore stands in for a whole-process restart |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 50% | −25 | Idle shutdown, DONE/reopen, stop/restore, legacy tree and coordinator failure pass | Member start failure path broken (DTL-003) |
| User-surface, browser, and desktop-shell confidence | 75% | 90% | +15 | Root-view `agent_statuses` and status frames (the sidebar/header inputs) asserted per member | Rendering not exercised (frontend unchanged); AC-007 is user verification |
| Durable regression coverage quality and relevance | 90% | 95% | +5 | New gated E2E (discriminates on base) + 5 baseline fixes restoring 24 failing tests | — |

- Overall post-repository confidence: 76%
- Overall final confidence: 80% (simple average of 50, 95, 90, 90, 50, 90, 95)
- Calculation method: simple average
- Confidence change produced by broader validation: real-boundary proof for AC-001/002/003/005; one critical defect found
- Every critical acceptance criterion directly proven: `No` — AC-004 member branch fails
- Any final applicable category below `90%`: `Yes` — requirement proof (50%), failure/lifecycle (50%)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: DTL-003 defect; no whole-process restart; no real-provider run

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required`; Live API + lifecycle through the gated scripted-AGY server E2E layer (TESTING.md)
- Material deviation: Team roots are flat (see Investigation basis)
- Confidence gap addressed: real dispatch, teammate delivery, process lifecycle, persisted reader
- Startup order, commands, readiness: in-process Studio server per suite on a free port (`startStudioE2eRuntimeServer`), readiness by GraphQL and WS `CONNECTED`/view snapshot
- Environment choices: idle grace `.env` 60 s; disposable `HOME`; `AGY_FAKE_CASE=linked_skills`; `AGY_FAKE_ARGV_LOG`; `AGY_FAKE_EXTRA_MODELS` only while the Org is created
- Seed data: GraphQL definitions (Manager, Worker, 4-member Squad, Team root, Org with `/squad` and `/broken`), Project + Task (Agent root), saved-tree edit on a stopped root

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Org: lead → `send_message_to` writer (model retired) | Not-accepted delivery result to the lead naming the cause; writer `error`; lead and reviewer unaffected | Lead's MCP call throws `MCP error -32603: Internal error`; writer `offline` with no status events; lead/reviewer `idle` | `dtl-org-member-failure-probe.log` (`PROBE_OUTCOME`, `PROBE_WRITER_STATUS`, `PROBE_WRITER_SIGNALS`) | Fail |
| All other DTL steps | As in the matrix | As expected | `dtl-e2e-run3/`, `dtl-org-rest-probe/` | Pass |

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5.0, arm64)
- Runtime: Node (workspace pnpm toolchain), Vitest 4.0.18; AGY scripted CLI fixture (`agy version 1.2.11` default)
- Browser: N/A

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data exercised: a stopped root's saved tree in which the never-started tester was given a binding with no conversation, i.e. the pre-fix shape (DTL-007, all three roots). New copies save `null` for never-started members (DTL-001).
- Direct-use result: restore reads it; the tester stays `offline` and is not launched; its first work launches fresh and replaces the binding; the lead resumes its own conversation.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: a cold whole-process restart was not run this round (same reader)

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts` | Added | DTL-001..008 (AC-001..005, QR-001, REQ-004) | Fails only at DTL-003 (product defect); discriminates on base |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | `models` lists `AGY_FAKE_EXTRA_MODELS` while set | Default output unchanged; sibling suites pass |
| `TESTING.md` | Updated | Map entry for the new suite | Doc |
| `autobyteus-server-ts/tests/integration/agent-team-execution/configured-scope-readiness.test.ts` | Updated (baseline fix) | BEH-002 lazy UI-started Team/Org; double → `testActivationManager` | 8/8 (base 2/8) |
| `autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | Updated (baseline fix) | Team root manager; double → `beginMaterialization`, callback keys | 14/14 (base 0/14) |
| `autobyteus-server-ts/tests/integration/agent-team-execution/team-agent-tools-mcp-lifecycle.integration.test.ts` | Updated (baseline fix) | Team MCP lifecycle; double → `testBackendFactory` | 1/1 (base 0/1) |
| `autobyteus-server-ts/tests/integration/agent-team-execution/team-conversation-target-websocket.integration.test.ts` | Updated (baseline fix) | Exact targets incl. task-Team members; snapshot double fields | 3/3 (base 1/3) |
| `autobyteus-server-ts/tests/e2e/agent-org-runs/controlled-org-publication-http.e2e.test.ts` | Updated (baseline fix) | Org publication; collaborator brought in by `send_message_to` (documented current behavior) | 1/1 (base 0/1) |

- Added or updated paths attached for review: `Yes` (attached to the handoff)
- Removed paths: None

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/*.log` | Command output | Retained (local, untracked) | Raw ANSI logs |
| `api-e2e-evidence/dtl-e2e-run3/`, `dtl-org-rest-probe/`, `dtl-e2e-base/`, `idle-lifetime-rerun/`, `e2e-regression-receipts/` | JSON receipts (launches, bindings, statuses, cleanup) | Retained (local, untracked) | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `tests/e2e/projects/tmp-dtl-org-probe.e2e.test.ts`, `tmp-dtl-org-rest.e2e.test.ts` (generated copies) | DTL-P01/P02 diagnostics | See matrix | Deleted after each run |
| `tests/integration/agent-team-execution/tmp-dtl-ws-probe.integration.test.ts` | Read the WS error frame of the stale double | `TEAM_STREAM_UNAVAILABLE` (missing snapshot fields) | Deleted |
| Base worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/dtl-api-e2e-base` (detached `ace86bf1f`) | Base comparisons (R-04, DTL-B01, E-03) | See tables | Removed after the round |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI / model | Repository scripted CLI (`agy-failure-cli.mjs`, `linked_skills`) | Deterministic, no paid inference (TESTING.md layer) | Provider-specific session creation for Claude/Codex not run; activation path is shared |
| Model retirement | `AGY_FAKE_EXTRA_MODELS` offered only during Org creation | Org creation refuses an unavailable model | Models the real "model retired after configuration" event |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R-01..R-04, DTL-001, DTL-002, DTL-004..DTL-008, DTL-B01, REG-E2E | Lazy activation, first-work start, lifecycle and legacy restore proven at the real boundary |
| Fail | DTL-003 | AC-004 / REQ-005 member branch: sender gets an opaque MCP internal error; member never shows `error` |
| Not Tested | AC-007 | User verification in the desktop app |
| Out Of Scope | `mixed-task-delegation.e2e.test.ts` | Needs LM Studio + Codex + Claude together |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process servers, AGY processes, temp data dirs/HOMEs | Owned by each suite run | Suite `afterAll` (terminate roots, close server, leftover-process check, remove dirs) | Receipts: `dataRemoved: true`, `homeRemoved: true`, `serverClosed: true`, `errors: []` |
| Temporary probe test files | Mine | Deleted | Done |
| Base comparison worktree | Mine | `git worktree remove --force` | Done |
| Unrelated isolated app instance `iso-63369-6c20` (another worktree) | Not mine | Left untouched | — |

## Preliminary Classification

- `Local Fix` — Implementation Engineer (pending failure-origin review).
- Cause:
  - Teammate delivery reaches the not-started member through `ConfiguredAgentExecutionHandle.reserveInput` (`configured-agent-execution-handle.ts:120-124`). The route is `standalone-root-message-delivery.reserveAgentInput` / `agent-org-run-message-delivery.reserveAgentInput` / `reserveDirectAgentInput` → `FlatTeamExecutionManager.reserveInput` → `FlatTeamAgentExecutionHandle.reserveInput`.
  - `reserveInput` awaits `ensureReady()` with no failure handling. A start failure therefore propagates as an exception: the MCP tool returns `-32603 Internal error`, and no `error` status is published.
  - Only `postMessage` (lines 126-147, the operator/command path) converts a start failure into a not-accepted result plus an `error` status.
- Why the defect went unnoticed:
  - Design DS-002 assumed teammate delivery uses the `postMessage` path.
  - The new unit case drives `TeamRun.postMessage`, not teammate delivery.
- The fix stays inside the designated sole activation owner and changes no requirement. Solution Designer may want to correct DS-002's wording.
- Scope: the same path serves configured members of UI-started Teams/Orgs. The gap is pre-existing there; this ticket makes it reachable for every unused delegated-copy member.

## Latest Authoritative Result

- Result: `Fail`
- Final validation confidence: 80%
- Default `95%` confidence target met: `No`
- Any final applicable confidence category below `90%`: `Yes` — requirement and acceptance-criteria proof (50%), failure/lifecycle evidence (50%)
- Broader validation decision: `Required` — executed (Live API + lifecycle)
- Critical acceptance criteria lacking direct proof: AC-004 member branch (fails)
- Preliminary classification and recommended owner: `Local Fix` — Implementation Engineer, subject to failure-origin review
- Next recipient from `get_handoff_rules`: see revision record / handoff message
- Notes:
  - On rerun, start with DTL-003. The durable E2E needs no change: it asserts the approved behavior, sender not-accepted naming `AGY_MODEL_UNAVAILABLE` plus writer `error`.
  - Then run the full suite and REG-E2E. Optionally add a whole-process restart and a real Claude delegated-Team check.
