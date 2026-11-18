# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results go in `api-e2e-execution-coverage-report.md`.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped/tickets/in-progress/application-reentry-worker-stopped/` unless absolute.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-002)
- Design Spec: `design-spec.md` (SR-002; `Medium` / `High`)
- Supplemental Task Artifacts: `evidence/repro-application-reentry.e2e.test.ts`, `evidence/SD-01-repro-base.log`, `evidence/SD-02-control-reentry-order.log`, `application-framework-design-findings.md` (report)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review CRR-001 passed (reviewed route)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001, AC-002, AC-004: a successful reentry (package reload, repair) makes the application ACTIVE without starting its worker; the worker starts on demand.
- REQ-002 / AC-005: after ACTIVE, pending execution events are dispatched.
- REQ-003 / AC-003, AC-006: a not-ready application is quarantined with "Application setup is required: <readiness diagnostics>", one owner for startup and catalog change.
- REQ-004: durable e2e for AC-001…004. REQ-005 / AC-008: docs. REQ-006 / AC-009: the Solution Designer's report.
- SR-002 / MP-001: a stop without an attached handle resets a crashed (`failed`) worker to `stopped`, so it starts on demand (the agent-tool invoker refuses `failed`).
- Implementation code `6950a24e1b` (head `1103e38619`; ticket files only after). The Legacy check is clean (old names removed), and persisted data is `Not Affected`; both match the diff.
- Code review CRR-001 Pass, no findings. Hints left to API/E2E: a real worker crash then repair; a pending event recorded before a reentry and dispatched after ACTIVE on the real stack; optionally a devkit reload with the UI open.

## Supported Scenarios And Real Usage

- SCN-001 (devkit package reload), SCN-002 (documented repair route), SCN-003 (import signed out → reason → sign in → repair).
- Added from investigation:
  - SCN-004: the application's worker process crashes. The agent-tool invoker then refuses tool calls (`application-agent-tool-worker-invoker.ts:24`). The documented repair recovers it (MP-001). Real trigger: the worker process dies; the user repairs.
  - SCN-005: an application's drafting run ends while the application is quarantined. For example, the Codex sign-in lapses and the developer reloads; the run's lifecycle event is then journaled while dispatch is closed. After sign-in a repair makes the application ACTIVE, and the event must reach the application (Brief Studio projects `RUN_TERMINATED` into the brief's `latestBindingStatus`). Real triggers: the reload, a run ending (round 1 update: its runtime process dies while the application is quarantined; the host's GraphQL `terminateAgentTeamRun` cannot find application-owned runs, so it is not a usable trigger, FU-006), sign-in, repair.
  - Open UI during a reload (optional hint): the app's own backend calls start the worker on demand (gateway `executeApplicationGraphql`, queries and commands call `engineLauncher.ensureReady`, `application-backend-api-gateway-service.ts:116-165`). RE-01/RE-02 exercise exactly those calls after the reload, so a desktop run adds little; see Not Tested.
- Contrived scenarios: none recorded.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | reentry order, setup-required text owner, engine stop | IMP-02 units (fakes for the worker) | real worker process lifecycle (crash) | Server E2E with the real worker |
| API / transport / contract | Yes (behavior) | REST repair, GraphQL reload, launch settings 503 detail | IMP-01 e2e | — | — |
| Process / lifecycle | Yes | worker stopped until on demand; crash reset | IMP-01 (on-demand start), units | real crash; dispatch drain starting the worker | Server E2E (RE-04, RE-05) |
| Worker / queue | Yes | pending-event dispatch after ACTIVE | unit order; journal-recovery unit | real journal + real dispatch + real worker | Server E2E (RE-05) |
| Frontend, desktop shell, persistence, auth | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped`, branch `codex/application-reentry-worker-stopped` @ `1103e38619`
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped/TESTING.md` (backend → server tests + server E2E for API journeys; clean env `env -i`; one heavy run at a time)
- Secrets: none (scripted CLIs)

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/application-reload-repair.e2e.test.ts` RE-01…03 (new) | reload / repair / signed-out import with reason → usable | AC-001…004 | Still Valid | IMP-00 (fails on base), IMP-01 | Keep; extend with RE-04, RE-05 |
| `tests/unit/application-orchestration/application-reentry-service.test.ts` | order recover → ACTIVE → dispatch → tools; no worker start; failure quarantines | AC-005 | Still Valid | IMP-02 | Keep |
| `…/application-catalog-transition-service.test.ts`, `tests/unit/application-platform/application-platform-lifecycle.test.ts`, `…/application-definition-runtime-readiness.test.ts` | setup-required detail from one owner | AC-006 | Still Valid | IMP-02 | Keep |
| `tests/unit/application-engine/application-engine-controller.test.ts`, `tests/unit/application-agent-tools/application-agent-tool-worker-invoker.test.ts` (new) | stop without handle → `stopped`; invoker starts it on demand | MP-001 | Still Valid (the start is faked) | IMP-00 (c), IMP-02 | Keep; real-process RE-04 added |
| `…/application-execution-event-journal-recovery.test.ts` | pending event handled after activation | AC-005 | Still Valid (unit) | IMP-02 | Keep; real-stack RE-05 added |
| `tests/e2e/runtime/application-import-codex-launch.e2e.test.ts`, `agent-runtimes-running-agents.e2e.test.ts`, `tests/integration/application-backend`, `tests/architecture` | preserved behavior | AC-007 | Still Valid | IMP-02…04 | Keep |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…004 | real server reload/repair | Reused | IMP-01 (IMP-00 for discrimination) | Ran on `6950a24e1b`; only ticket files changed since |
| API-02 | AC-005, AC-006, AC-007, MP-001 | units + architecture | Reused | IMP-02 | same |
| API-03 | AC-007 | regression e2e (238 import, running agents) | Reused | IMP-03 | same |
| API-04 | AC-007 | application-backend integration | Reused | IMP-04 | same |
| API-05 | AC-007 | typecheck | Reused | IMP-05 | same |
| API-06 | AC-008 | docs | Review | read `docs/modules/application_orchestration.md` and `docs/modules/applications.md` against the code | AC-008 is a review |
| API-07 | MP-001, REQ-001, SCN-004; REQ-002, AC-005, SCN-005; AC-001…004 again | real server, real worker process, real journal and dispatch | Durable (RE-04, RE-05 added to the reload-repair e2e) | `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/application-reload-repair.e2e.test.ts --no-watch --reporter=verbose` (the whole file: the cases run in order on one server) | The worker crash and the dispatch drain are unit-faked today |
| API-08 | discrimination of RE-04/RE-05 | same, with mutations | Temporary | (a) the reentry service and transition from base `ddd6fdcdf6` → RE-05's repair fails; (b) the controller's handle-less reset removed → RE-04 expects `stopped` after the repair | Shows the new cases detect a regression of the parts they guard |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-07 (RE-04, RE-05) | `autobyteus-server-ts/tests/e2e/runtime/application-reload-repair.e2e.test.ts` | Real worker process crash and real pending-event dispatch after a reentry: the two lifecycle promises of this change that units only fake |

## Durable Coverage To Update / Remove

- Update: the same file's header (cases list) and RE-03 (stores the imported application for RE-04/RE-05). No assertion of RE-01…03 changes.
- Remove: none.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Devkit reload with the Brief Studio UI open in the desktop app | The open UI's backend calls are the gateway calls RE-01/RE-02 make after the reload, and they start the worker on demand. The web app has no reload/repair action (finding 4, FU-004), so the trigger is the devkit (GraphQL), which the e2e uses | Low | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (RE-04, RE-05; header; RE-03 stores the application)
- Reroute Required Before Validation Execution: `No`
