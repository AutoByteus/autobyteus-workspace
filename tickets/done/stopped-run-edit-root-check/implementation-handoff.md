# Implementation Handoff — stopped-run-edit-root-check (FU-008 of autobyteus-348)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent review not selected (Small / Low); `get_handoff_rules` returns the API/E2E engineer for the direct route.
- Requirements doc: /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-edit-root-check/tickets/in-progress/stopped-run-edit-root-check/requirements-doc.md
- Investigation notes: /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-edit-root-check/tickets/in-progress/stopped-run-edit-root-check/investigation-notes.md
- Solution revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-edit-root-check/tickets/in-progress/stopped-run-edit-root-check/solution-revision-record.md
- Design spec: /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-edit-root-check/tickets/in-progress/stopped-run-edit-root-check/design-spec.md
- Supplemental: solution-designer-handoff.md
- Design review report / architecture review revision record: N/A — not applicable
- Triggering rework: N/A

## Current Implementation Summary

- Implementation cycle: Initial
- Implementation revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-edit-root-check/tickets/in-progress/stopped-run-edit-root-check/implementation-revision-record.md
- Current implementation revision ID: IR-001
- Related IDs: SR-001; others N/A
- Commit: `79b268d2f9` on `codex/stopped-run-edit-root-check`

A stopped standalone run whose root is still registered can be edited in Settings. The root now follows the saved edit: it keeps the host's launch in one mutable field (`setInheritedLaunch`) and hands the current one to its collaborator port, so a delegated copy started after the edit carries the saved model, settings and runtime. The edit reaches the root by `StandaloneRunLifecyclePort.refreshInheritedLaunch` (manager: await a loading root, return if none, re-read the host metadata, ignore an ineligible run), called by `AgentRunService.updateStoppedSelection` after an `UPDATED` outcome; a rejected refresh is logged and the saved edit stays successful. The manager also re-reads the launch in `resolveRootAndEnsureHost` from the metadata it already reads.

**How it was reproduced (U-1, settled: real).** In `tests/unit/standalone-agent-run-root/` with the existing root fixture: `root = manager.resolveRoot(HOST)`, `host.crash()`, `setMetadata({model gpt-saved, effort low})` (what the saved edit writes), `root.ensureHostReady()` (the root wakes its own host, as a delegated copy's report does: no manager call), then `delegateToNewCopy`. On the base source the copy's `source.launchConfiguration` is `gpt-host` / `effort high`, the OLD launch (evidence IMP-01); with the change it is the saved one. I simulated the saved edit by its write to the host's metadata, plus a separate `AgentRunService` test of the call; the unit fixture cannot host the whole lifecycle service with the root.

## Routing Classification (Mandatory)

- Task size: Small
- Architecture risk: Low
- Design classification section / evidence reference: design-spec.md, classification
- Classification confirmed or changed: Confirmed
- Evidence and rationale: five small source edits in one subsystem, no persistence or wire change, proved by unit tests against the real root and manager.
- Selected route: Direct API/E2E
- Lightweight implementation self-review completed for the direct route: Yes (diff read in full; the updater's refusal while the host is live, `updateStoredTree`, Team and Org roots and the 316/348 switch code are untouched except the one call site)
- New design impact or escalation trigger: None

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| AC-001 / REQ-001 | A copy after a saved edit carries the saved model and settings; model-only edit and undo alike | `AgentRunService.updateStoppedSelection` -> `manager.refreshInheritedLaunch` -> `root.setInheritedLaunch`; `StandaloneRootCollaborators.portFor` reads `inheritedLaunch()` | Pass: standalone-root-inherited-launch.test.ts (edit, then undo) |
| AC-002 | A runtime change reaches the copy; the host's marker is not written by the refresh | same | Pass: pending-switch metadata; `host.published` empty and no host restore until the wake |
| AC-003 | An edit while the root loads | manager awaits `pending` | Pass (after one tick so the load is registered; see risks) |
| AC-004 | Edit allowed with an offline host and refused while live | unchanged updater; `AgentRunService` refreshes only on `UPDATED` | Pass: `UNCHANGED`, `RUN_ACTIVE`, `VALIDATION_FAILED`, `MODEL_UNAVAILABLE` do not refresh; a throwing refresh keeps the edit successful (agent-run-restore-service.test.ts) |
| AC-005 | No root registered | manager returns when no root | Pass: nothing created or read; a root loaded later carries the saved launch; the whole unit suite is green |
| Design item 5 | A missed refresh heals at the next use | `resolveRootAndEnsureHost` re-sets from its metadata | Pass: test "the next use of the root heals a missed refresh" |

- Changes stayed within the requirements doc's Scope Guardrail: Yes

## Key Files Or Areas

`autobyteus-server-ts/src/agent-execution/services/{standalone-run-ports,agent-run-service}.ts`; `src/standalone-agent-run-root/domain/standalone-agent-run-root.ts`; `src/standalone-agent-run-root/services/{standalone-agent-run-root-manager,standalone-root-collaborators}.ts`.

## Important Assumptions

The root reads the launch from the host's run metadata, the same source the root used when it loaded (`launchConfigurationOf`).

## Known Risks

- `standalone-agent-run-root.ts` is exactly 500 non-empty lines (496 before); it is at the limit, not above, so no new code can go in it without a split.
- Between the manager's metadata read and its registration of a loading root there is a microtask gap in which a refresh finds no root; the real edit call runs after the whole save, and the next `resolveRootAndEnsureHost` heals it.
- Two of the existing tests (restore-service, termination-service, integration) needed the new port member added to their doubles.
- Documentation of the lifecycle port (`standalone_agent_run_root.md`) is not updated; that is delivery's docs sync.

## Task Design Health Assessment Implementation Check

- Reviewed change posture / root-cause classification / refactor decision: as designed
- Implementation matched the reviewed assessment: Yes
- If challenged, routed as Design Impact: N/A

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None
- Legacy old-behavior retained in scope: No
- Dead code in the touched files removed: Yes (the captured option `rootLaunchConfiguration` of the collaborators class is replaced, not kept beside the getter; the root's constructor option of the same name remains as the initial value)
- Dead code found elsewhere, added to follow-ups.md: None
- Shared structures remain tight: Yes
- Canonical shared design guidance reapplied: Yes
- Changed source files within size guardrails: Yes (largest: the root at exactly 500 non-empty lines; manager 459; service 336)
- Notes: none

## Persisted Data Transition Check

Not Applicable (no persisted data changes).

## Environment Or Dependency Notes

The worktree was installed fresh (`pnpm install --frozen-lockfile`, `prepare:shared`, `prisma generate`); no earlier build output.

## Checks Run

Evidence in /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-edit-root-check/tickets/in-progress/stopped-run-edit-root-check/evidence/.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | the new test file against the base source | d3cedd1357 | macOS arm64, Node 22 | base root and manager | U-1, AC-001 | Reproduced (REPRODUCTION case passes = old model inherited; 6 others fail) | evidence/IMP-01-reproduction-on-base.log | `Tests  6 failed | 1 passed (7)` |
| IMP-02 | `vitest run tests/unit/standalone-agent-run-root tests/unit/agent-execution/agent-run-restore-service.test.ts` | 79b268d2f9 | same | root, manager, service | AC-001..AC-005 | Pass | evidence/IMP-02-fix-focused.log | `Tests  66 passed (66)` |
| IMP-03 | `test:unit`, typecheck, integration (agent-execution, standalone-agent-run-root) | 79b268d2f9 | same | whole server unit | AC-005 | Pass | evidence/IMP-03-unit-typecheck-integration.log | `Tests  7955 passed | 9 skipped`; `production errors: 0 ... baseline 1182 in 365` |

- Not run, and why: a built-server case (a real stopped run with a registered root is hard to stage; API/E2E decides, as the design says); the full integration suite (the two suites named above ran).

## Frontend Rendered-Result Check

Not Applicable (server only).

## Downstream Coverage Hints / Suggested Scenarios

- A built-server case: a standalone run that delegated a copy, the host stopped by itself, edit its model, wake it by the copy's report, delegate again, read the second copy's source launch in the stored tree.
- The same with a runtime switch (the pending switch): the copy inherits the new runtime and the host's marker appears only at the host's next input.

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E decides the level for the staged built-server case and states it; everything else is unit-covered above.
