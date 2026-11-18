# Implementation Handoff — Agent Input Delivery Simplification (SR-007, v3)

- From: `/software_engineering_team/implementation_engineer`, 2026-10-24
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3`
- Branch: `codex/agent-input-delivery-simplification-v3`. Base `origin/personal@0216c6fb14`.
- Commits (on top of the base):
  1. `1e7a7cca4d` `test(collaboration): record the message-delivery baseline contract per root and entry form`. Recorded on the unchanged base code (V-2/V-3).
  2. `dbc27db9df` `refactor(collaboration): one message append owner for every root and entry form (SR-007)`. D-1..D-9.
  3. Ticket artifacts and evidence (the commit after these).
- The v2 work (`codex/agent-input-delivery-simplification-v2`) is not reused as code; only its test ideas are (per-root baseline contract, frozen clock, the `dropSlot` lesson). The v2 handoff is archived at `history/implementation-handoff.v2.md`.
- Not committed, as required:
  - the untracked probes in `autobyteus-server-ts/tests/probes/`. The REQ-012 repro there was ported to the new API and is green; see V-4.
  - `docs/design-cases.md`, which has an uncommitted edit that is not this role's.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High. ARCH-REV-003 Pass on SR-007 (requirements SR-006, explicitly approved by the user on 2026-10-24) routed to implementation.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/design-spec.md` (SR-007, with Self-Validation C-1..C-4)
- Supplemental task artifacts: `handoff-sr-007-design.md`, `follow-ups.md` (FU-001..FU-004), `probes/req-012-task-close-during-append.repro.test.ts`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/design-review-report.md` (ARCH-REV-003)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/architecture-review-revision-record.md`
- Triggering rework report: N/A (first implementation of SR-007)

## Current Implementation Summary

`RootCommunicationEngine` owns the whole save-then-deliver protocol for all three roots and all three entry forms: same-root `deliver`, `acceptFromRemote`, and the sender record of a remote send, `commitSentToRemote` (D-1).
- The engine builds one `RootMessageAppend` per message (`root-message-append.ts`) and hands it to the root's persistence coordinator through the root's facts-only `RootCommunicationPort`. Each root's port is in its own small file (D-2).
- Each coordinator exposes `commitMessageAppend`: lock, package creation where it exists, `prepare`, log append, then cancel / latch-and-throw / finalize (D-3).

D-4, the REQ-012 fix and one closure outcome (DEC-005):
- Every Task-scope closure on the path returns today's refusal, using the error's own `TASK_AGENT_RESOURCE_CLOSED`/`_CONFLICT` code and text (C-2, AR3-NB-001). This applies whether the closure is found before the slot is held, under the lock, or after the durable write.
- After the write, the record is kept and shown in the root view, for the forms that publish. The slot is dropped and the root keeps working.
- A recipient that stopped accepting input gives `AGENT_RUN_NOT_ACCEPTING_INPUT` / "AgentRun is not accepting input." (C-3).
- Only a throw from the list update, publish or present still fail-stops the root.

D-5: the engine is the only message-list owner. The root mirrors and replace callbacks are gone, and snapshots are built from `engine.getMessages()`.

D-6: the Team facade is removed. `RootTeamRun` builds the engine with the Team port, and `TeamRunMessageDelivery` and `RemoteMessageSend` use the engine.

D-7, dead code removed:
- `InterAgentMessageRouter` (its test was retargeted);
- `TaskAgentExecutionRegistry.reserveInput`;
- `nextMessages`;
- the Team root-mismatch branch;
- the Team append types.

D-8: `admit()` = reserve + commit + release.

D-9: docs updated.

- Implementation cycle: `Initial` (SR-007)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3/tickets/in-progress/agent-input-delivery-simplification/implementation-revision-record.md`
- Current implementation revision ID: `IR-004` (supersedes the v2 rounds IR-001..IR-003)
- Related solution revision IDs: `SR-006`, `SR-007`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`. Notes applied: AR3-NB-001..004, C-1..C-4.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - The change matches the design's file map.
  - No persisted-byte difference and no caller-visible code, message or event-order change, apart from REQ-012/DEC-005 (V-2/V-3).
  - No touch to `AgentRun` admission semantics, the `TeamRun` seam, address resolution, `RemoteMessageSend` order or the stores.
  - No root file grew.
  - No new post-durability failure kind.

  One genuine-failure-path difference for the Team root is named under Known Risks.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable` (Large/High)
- New design impact or escalation trigger: `None` (see Known Risks K-1 for the reviewer's attention)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Validation once | `agent-run-input-admission-state.ts` `admit()` = `reserve()` + commit + release | Done (A12) |
| BEH-004 (`deliver`) | One append owner; per-root outcomes preserved | Engine `deliver` → `reserveAndCommit` → `port.commitMessageAppend(append)`; ports `standalone-root-communication-port.ts`, `agent-org-communication-port.ts`, `team-communication-port.ts`; `commitMessageAppend` in the three coordinators | Done. V-2/V-3 identical: by run ID, by address, existing-copy work |
| BEH-004 (`acceptFromRemote`) | Same protocol, no root-view publish (A2) | Engine `acceptFromRemote` → `reserveAndCommit(..., publishToRootView=false)` | Done. V-2/V-3 identical, including the duplicate remote message |
| BEH-004 (`commitSentToRemote`) | List update only, no slot, no Task check, accepted with a warning on failure (A3) | Engine `commitSentToRemote` → append with `receiver: null` | Done. V-2/V-3 identical (log line, transmission, result) |
| BEH-004 not-accepting (C-1, AR3-NB-004) | `deliver` uses the port's `deliverNotAccepting` (Team `TEAM_RUN_NOT_ACCEPTING_MESSAGES`), first check in `deliver`; the remote forms keep the generic code | `refuseUnlessOpen(rejection)`; Team port `isOpen()` = `true` (C-4, A11) | Done. V-3 records all three forms per root |
| BEH-005 | Global router kept; dead router removed | `inter-agent-message-router.ts` deleted; its test retargeted to reserve → commit → release | Done |
| BEH-007 | Docs | D-9 list below | Done |
| BEH-008 | REQ-012 + DEC-005 | `root-message-append.ts` `prepare` (refusal under the lock) and `commitAfterDurability` (closure after the write); engine maps `task_scope` → the refusal, `recipient_stopped` → `AGENT_RUN_NOT_ACCEPTING_INPUT` | Done. V-4 per root with real coordinators; the repro is green |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Source (`autobyteus-server-ts/src`; 24 files, +577/−798):
- **Added:**
  - `agent-collaboration/execution/communication/root-message-append.ts`;
  - `standalone-agent-run-root/services/standalone-root-communication-port.ts`;
  - `agent-org-execution/services/agent-org-communication-port.ts`;
  - `services/team-communication/team-communication-port.ts`.
- **Renamed:** `root-communication-adapter.ts` → `root-communication-port.ts` (the port type, `RootCommunicationDeliveryInput`, `ROOT_NOT_ACCEPTING_MESSAGES`).
- **Modified:**
  - `root-communication-engine.ts`;
  - the three persistence coordinators;
  - `team-run-persistence-contract.ts`;
  - the three roots;
  - `team-run-message-delivery.ts`;
  - `root-communication-runtime-builder.ts` (import);
  - `task-agent-execution-registry.ts`;
  - `agent-run-input-admission-state.ts`.
- **Deleted:**
  - `standalone-root-communication-adapter.ts`;
  - `agent-org-communication-adapter.ts`;
  - `team-communication-service.ts`, `team-communication-adapter.ts`, `team-communication-message-append-plan.ts`;
  - `inter-agent-message-router.ts`.
- Root file sizes (`wc -l`, must not grow): `standalone-agent-run-root.ts` 515 → 514, `root-team-run.ts` 538 → 533, `agent-org-run.ts` 453 → 452.

Tests (`autobyteus-server-ts/tests`):
- **V-2/V-3 baseline contract:** `unit/agent-collaboration/root-communication-baseline-contract.test.ts` plus `.json` (12 captures: 3 roots × deliver / taskWork / remote / notAccepting).
- **V-4:** `unit/agent-collaboration/root-communication-task-closure.test.ts`, per root with real coordinators and on-disk logs:
  - REQ-012 Task closed during the write;
  - recipient stopped;
  - DEC-005 closure while waiting for the lock with the slot dropped;
  - the presentation-throw counterpart.
- **Append unit test:** `unit/agent-collaboration/execution/communication/root-message-append.test.ts`. It covers the states, `dropSlot`, C-2 for both codes, RR-003, the forms, and the old append-plan assertion.
- **Shared helpers:**
  - `unit/agent-collaboration/helpers/communication-port-double.ts`;
  - `unit/standalone-agent-run-root/helpers/standalone-root-harness.ts` (the standalone root suite now imports it);
  - the Org harness exposes the coordinator's fail-stop callback.
- **Ported, with assertions kept:**
  - `communication-commit-path.test.ts` (now per-root `commitMessageAppend`);
  - `root-communication-engine-refusals.test.ts`;
  - `remote-message-view-sequence.test.ts`;
  - `team-communication-service.test.ts` → `team-communication-port.test.ts`;
  - `agent-org-communication-presentation.test.ts`;
  - `root-team-run-termination.test.ts`;
  - `application-team-input-root-dispatch.test.ts`;
  - `inter-agent-message-router-claude-input-admission.test.ts` → `teammate-input-claude-active-turn-admission.test.ts`, with its `AGENT_RUN_TESTS` allow-list entry renamed (the test still constructs an `AgentRun`).
- **Deleted:** `team-communication-message-append-plan-current.test.ts`; its assertion moved into the append unit test.

Docs (D-9):
- `agent_communication.md`: new "Teammate Delivery Path", with the entry forms, the closure outcomes and the existing-copy caller. The DEC-005 refusal statement was corrected, and the `@` mention call-site names were fixed.
- `agent_execution.md`: both entry points, the observer seam, validation once.
- `agent_team_execution.md`, `standalone_agent_run_root.md`, `agent_memory.md`, `codex_integration.md`, `skill_update_notices.md`.
- `docs/features/artifact_file_serving_design.md`.

## Important Assumptions

- A production reservation `commit()` publishes no event (it passes straight to `AgentRun.reserveUserMessage`; `agent-run-input-reservation.ts`). The baseline contract therefore records the root-published events and leaves out agent-status events that only the handle test doubles emit inside `commit()`.
- The contract test's not-accepting capture for the Team root closes admission with the white-box `communication.closeAdmission()` call, because no public Team API stops admission while keeping the root readable.

## Known Risks

- **K-1, Team root genuine-failure path (for the reviewer).**
  - Today the Team append plan releases the committed slot without a `finally`. So if publishing `COMMUNICATION`/`MEMBER_INPUT` throws after the durable write, the Team root fail-stops and the slot stays committed but unreleased.
  - The one append releases in a `finally`, as standalone and Org do today and as the design's DS-004 states ("release the slot (in a finally, as today)").
  - The difference exists only on a genuine local publish or present failure, after which the root fail-stops and terminates. Caller-visible codes, messages and event order are unchanged.
  - Evidence: the V-4 counterpart's `release` assertion fails for the Team root on the base (`evidence/v3-v4-repro/v4-test-on-base-0216c6fb14.log`) and passes after.
  - I kept the unified behavior.
- **K-2.** Log-owner resolution moved under the lock for standalone and Org (AR3-NB-002). V-2 shows identical log lines and placement.
- **K-3.** Package creation, standalone only, now runs after `prepare()`, so a refused or conflicting message writes nothing (AR3-NB-002). If creation fails, the append is cancelled before durability.
- **K-4.** `getCommunicationSnapshot()` builds a fresh frozen envelope per call (same keys, order and content). No caller compares identity.
- **K-5.** Follow-ups FU-001..FU-004 are unchanged and out of scope. FU-002 (a throw before the handle exists) remains.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Refactor plus Bug Fix (REQ-012)
- Reviewed root-cause classification: Duplicated Policy Or Coordination (primary); Missing Invariant (REQ-012)
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes:
  - The communication module imports no root subsystem.
  - Coordinators import only the append types.
  - No code outside the engine commits a slot.
  - AR3-NB-003: the Team `assertRootCorrelation()` keeps the tree half on `replaceTree`. Its messages half now reads the loaded input (`options.messages`), a constant compared once at construction and harmlessly again on each `replaceTree`.
  - The Org `assertCorrelation()` and the standalone constructor check read the loaded messages.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes`
- Shared structures remain tight: `Yes` (no root ID in the append; `rejections` has three single-meaning fields)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. All three root files shrank; the largest changed file is `root-team-run.ts` at 495 non-empty lines.

## Persisted Data Transition Check

- Approved decision: `Not Affected`
- Implementation follows it: `Yes`
- Direct-use evidence (V-2): for every root and entry form, every file under the root's directory after each step is byte-identical to the baseline record taken on `0216c6fb14` under the same frozen clock. That covers message log lines, log-owner placement, package creation and trees. Only temp-directory prefixes are masked.

## Environment Or Dependency Notes

- Implemented in a temporary worktree on the base, with `node_modules` symlinked, while the base suite ran. It was applied here as one patch and the temp worktree was removed. Each worktree's test database lives under its own `tests/.tmp`.
- V-1 runs exclude `tests/probes/**` (untracked designer probes) on both sides.
- Record flags use the allowed `TEST_` prefix (`TEST_RECORD_ROOT_COMMUNICATION_BASELINE=1`), because the test environment isolation strips other variables.
- Pre-existing test-file type errors (`tsc` over `tests/`) are unchanged from the base; the build config typecheck passes.

## Local Implementation Checks Run

- `tsc -p tsconfig.build.json --noEmit`: pass.
- **V-1** (full server suite, all of `tests/**` except `tests/probes/**`, `dist` rebuilt):
  - Baseline on clean `0216c6fb14`: 8274 tests, 24 failed. All are named in `evidence/v3-v1-baseline/baseline-failures.txt`; they are in the application-backend, update-notification and remote-access suites.
  - After, on `dbc27db9df`: 8309 tests, 24 failed. The failing set is identical, failure by failure, to the baseline.
  - The +35 tests are the three new suites (36) minus the deleted append-plan test (1). Two files were renamed with the same counts. `tracked-imports` passes once the files are committed.
  - Evidence: `evidence/v3-v1-after/comparison.md`, `after-failures.txt`, `after-full-suite.log`.
- **V-2/V-3:** `root-communication-baseline-contract.test.ts` passes against the baseline record (12/12). The record is saved in `evidence/v3-v2-v3-baseline/`.
- **V-4:**
  - `root-communication-task-closure.test.ts`: 12/12 after the change. On the base, the REQ-012, recipient-stopped and DEC-005 cases fail in all three roots, and the Team counterpart fails on `release` (K-1). Log: `evidence/v3-v4-repro/v4-test-on-base-0216c6fb14.log`.
  - Designer repro: fails on the base (`repro-on-base-0216c6fb14.log`: indeterminate error, fail-stop, later write refused). After porting it to the new API it is green (`repro-after-change.log`: refusal, no fail-stop, slot not committed, later write accepted).
- Affected unit/integration/architecture suites on the new code: 3470 tests, all green apart from `tracked-imports`, which flagged the then-uncommitted new files and passes once they are committed.

## Frontend Rendered-Result Check

Not Applicable. Backend-only; the events and payloads published per root are unchanged (V-3).

## Downstream Coverage Hints / Suggested Scenarios

- Per root through the server:
  - a real teammate message (by address and by run ID);
  - a Task marked DONE while a teammate message to its copy is being saved: the sender reads the Task refusal, the root keeps working, and the record shows in the root view after a reload;
  - a remote message both ways between two nodes.
- `delegate_task` naming an existing copy, per root.
- AC-014: DTL, task-copy idle lifetime, reactivation, ad-hoc delegation, task closure, Org publication, compaction recovery, remote delegation suites.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E gate (design): a real teammate message, a Task-closure race and a remote message per root through the server.
- The AC-014 run.
