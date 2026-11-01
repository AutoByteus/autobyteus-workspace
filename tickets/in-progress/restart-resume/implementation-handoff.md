# Implementation Handoff — restart-resume (autobyteus-285)

## Upstream Artifact Package

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume/tickets/in-progress/restart-resume/`.

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High); ARCH-REV-002 `Pass`. Next: Code Reviewer, per `get_handoff_rules`.
- Requirements doc: `requirements-doc.md` (SR-002, approved by the user; DEC-001 = A)
- Investigation notes: `investigation-notes.md` (G-01 to G-07)
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-004; user approval of the design: Not required)
- Supplemental task artifacts: `follow-ups.md` (FU-001 to FU-003), `architecture-design-handoff.md`
- Design review report: `design-review-report.md` (ARCH-REV-002, Pass; N-2 to N-10)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: `design-spec.md` SR-005 (D3.6, D4 "How it shows"); `design-review-report.md` (ARCH-REV-003, N-11 to N-14); `code-review-report.md` (CRR-002: F-API-001, O-1); the API/E2E round-1 report

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002: SR-005; IR-001 was the initial round)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: SR-005 (revision for CRR-002), SR-004 (design), SR-002 (approval; REQ-003 clarified in SR-005)
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003 (Pass on SR-005)
- Related code-review revision IDs: CRR-001 (Pass; CR-C1, CR-C2/FU-004), CRR-002 (Design Impact: F-API-001, O-1)
- Related API/E2E revision IDs: API-REV-001 (Fail: F-API-001)
- Related delivery revision IDs: N/A
- Triggering finding IDs: F-API-001, O-1 (via CRR-002 → SR-005); N-11 to N-14 (ARCH-REV-003)
- Branch `codex/restart-resume`; base `origin/personal` @ `efd28d5c4a`; code commits `ab4ba6e7dc`, `b4d770d364`, `b50e2354ab` (IR-001) and `82932a8b48` (IR-002); docs and evidence in the commits that follow.

**D1, release identity.** `scripts/write-release-identity.mjs`, run by `build:full` after `tsc`, writes `dist/release-identity.json` = `{ "version": <autobyteus-web package version> }`. `readReleaseIdentity()` (`src/restart-resume/release-identity.ts`) reads it once from next to the built module; missing → `null` quietly (a server run from `src`), unreadable or without a version → `null`, logged. Checked: a build writes `1.5.11-beta.9`, and the built module reads it.

**`placeOf` and `isDelegatedRun`.** `ActiveCollaborationRootDirectory.placeOf(agentRunId)` returns `{ root, place }` or `null`: `host` when the root is a standalone root whose run id is the agent run; else `delegated` when the boundary's new optional `isDelegatedRun?(id)` says so; else `member`. When several roots claim a run it logs and prefers host, then delegated (the review's "log when more than one boundary claims a run"). `isDelegatedRun` is `RootTaskExecutionLifecycle.isDelegatedRun(id) = adapter.taskExecutionChainFor(id).length > 0` (a task Agent, or a member of a task Team, at any depth), exposed by `StandaloneAgentRunRoot`, `RootTeamRun` (through `TeamTaskExecutionService`) and `AgentOrgRun`.

**D5, shared root resolver.** `createCollaborationRootResolver({ standaloneRoots, teamRuns, orgRuns })` (`src/compositions/collaboration-root-resolver.ts`), built once in `build-studio-server.ts`:
- standalone: `resolveRoot(id)` (null for a run that cannot be a root);
- team: `getManagedTeamRun(id) ?? restoreTeamRun(id)`, **not** `resolveManagedTeamRun`, which swallows every error (N-8);
- org: `getActive(id) ?? restore(id)`.
`StandaloneRootUnavailableError` and the coded `TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED:` / `AGENT_ORG_STATE_PACKAGE_NOT_CATALOGED:` errors map to `null`; anything else is thrown. `RemoteRootDirectory.standalone/team/org` delegate to it and narrow by kind; the remote receiver keeps its own `resolve()` (any throw → not found), so remote behavior is unchanged. Its `teamRuns`/`orgRuns` input types drop the methods it no longer calls.

**D2, record at shutdown.** `server-runtime.ts` sets the cleanup to `async () => { await recorder.record(); await app.close(); }` right after `buildStudioServer`. `BusyRunRecorder.record()` (process `AgentRunManager`, process root directory): live runs with status `initializing`/`running` and a root → entries `{ root, agentRunId, place, status, recordedAt, version }`; only with entries, it merges with a valid existing record (keeping entries of runs not recorded now, with their own version), replaces an invalid one (logged), writes atomically to `<appDataDir>/restart-resume/busy-runs.json`. It never deletes and never throws.

**D4, notice.** `RESTART_RESUME_NOTICE_SENDER_ID = "system.restart_resume"` is added to the senders and to memory's recorded set. `buildRestartNotice({ entry, version, restartedAt, resumedDelegated })` makes the SYSTEM input with `sender_id`, `message_id = restart-resume:<recordedAt>:<agentRunId>`, `dedupe_key = agent_run_input:<agentRunId>:<message_id>`, the suppression key and the platform preface (notice-only), like the skill notice. Text as the design; the list line only for a host or member with accepted delegated runs. **IR-002 (SR-005, O-1):** one `restartNoticeLifecycleObserver(runOf, text)` publishes the run's own `SYSTEM_TASK_NOTIFICATION { sender_id, content, turn_id }` on `forwarded`, for every place (the host's run; a member's run looked up in the process `AgentRunManager` at that moment, since it starts on the notice). The member handle composes it with its own unsent-input observer and publishes no `member_input` for a platform notice (preface read before the post, N-14), so a member shows the notice once, live and after a reload. IR-001's member presentation mapping is removed (the adapter is back to base).

**D3, resume after an update.** `RestartResumer.resumeAfterUpdate()` (started in the background after `recoverAfterListen`, after a `checkpoint()`, before the background tasks):
1. read; missing → nothing; **remove the file before anything else** (if removal fails, nothing is resumed); invalid → logged, nothing resumed;
2. per entry: resume only when `entry.version !== null && current !== null && entry.version !== current`; the others are counted and logged once;
3. group by root; **wave 1 = the root's delegated entries; wave 2 = its host and members**, told the accepted delegated runs (display name and run id);
4. a post limiter of 3 wraps each entry's whole step (pre-filter, restore, re-check, post); waiting for wave 1 holds no slot (N-7);
5. **IR-002 (SR-005, D3.6):** a cheap pre-filter (live, or the root's row gone/terminated/archived) → **restore without posting** through `rootResolver.resolveOrRestore(entry.root)`; a host is then made ready with `root.ensureHostReady()` (a member starts on the notice) → **re-check** the root's row (terminated/archived/gone → skipped, logged "… (after the restore)", nothing posted) → **post with `{ lifecycleObserver, onlyAsFirstInput: true }`**: host `root.postHostUserMessage({ message, postOptions })`; member/delegated `root.executeAgentCommand(id, { kind: "post_message", message, postOptions })`;
6. `AGENT_RUN_INPUT_NOT_FIRST` → skipped, logged "the run already had input"; any other refusal, a `null` root or a throw → failed, logged; only accepted entries count as resumed. Returns `{ recorded, notUpdate, skipped, resumed, failed }`; never throws.

**IR-002, the first-input rule.** `AgentRunInputOptions.onlyAsFirstInput` (contract) is decided in `AgentRunInputAdmissionState.reserve`, called by both `admit` and `reserve` inside `AgentRun`'s dispatch queue: refused with the new code `AGENT_RUN_INPUT_NOT_FIRST` when `nextSequence > 1`, i.e. this instance already reserved or admitted input (an invalid input does not count). `post_message` gains an optional `postOptions`, passed by the three handle switch sites (`root-agent-execution-registry.ts`, `task-agent-execution-registry.ts`, `flat-team-execution-manager.ts`), `FlatTeamAgentExecutionHandle.postMessage` and `ConfiguredAgentExecutionHandle.postMessage` to `AgentRun.postUserMessage`. The roots' deliveries pass the command through unchanged. `executeRemoteChildCommand` refuses a first-input-only post (`REMOTE_RUN_FIRST_INPUT_UNSUPPORTED`, N-13): a remote child's node admits its own input, and remote children are never recorded here.

**N-12.** Restoring posts no input: the host handle's `ensureReady` only activates; a member's `startForInput` only makes the run ready; a woken delegated child is posted only the notice. Tested per place: a reopened standalone root's host and its restored copy (no post or reserve before the notice; the copy gets the notice's options), a restored Team-style member handle (no `reserveUserMessage`; the notice is the first post with `onlyAsFirstInput`), a restored Org member (the first post carries the options), and a real `AgentRun` (the rule).

**Wave order** (accepted in CRR-001 CR-C1; SR-005 D3.4 now says so): wave 1 is the delegated runs, wave 2 the host and members.

**N-10 (Read).** An Org restore activates no member: `AgentOrgExecutionScopeBuilder.build` creates lazy configured handles (`RootAgentExecutionRegistry.prepareConfigured` → `createHandle`; no `AgentRun`), and `AgentOrgRun.activate()` only sets its lifecycle flag. Now also by test: `agent-org-execution-scope-builder.test.ts` restores in restore mode and asserts no member run is prepared before the first post.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: a new capability area, wiring in shutdown and startup, a query on three root kinds, a shared resolver, a build stamp; unattended paid turns, new persisted data, shutdown/startup sequencing, cross-root delivery.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High route)
- New design impact or escalation trigger: `None`. The wave-order reading above and the member-memory residual below are for the reviewer to confirm.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001; AC-001) | Record busy runs before anything is interrupted | `server-runtime.ts` cleanup → `BusyRunRecorder.record` → `placeOf` → atomic write | Unit: busy only, no root skipped, place/version, merge, never deletes, never throws; record before `app.close()` (gate test) |
| BEH-002 (REQ-002, REQ-005, REQ-006; AC-002, AC-004, AC-005) | Resume after an update only, once, ≤ 3 at a time, failures logged | `RestartResumer` after `recoverAfterListen`; `CollaborationRootResolver`; `StandaloneAgentRunRootManager.postUserMessage` | Unit: not-an-update, no stamp, invalid record, deleted before the first post, dispatch by place, cap 3, N-7 no deadlock, failures logged. Real app across two builds: API/E2E |
| BEH-003 (REQ-003; AC-003) | Fenced and live runs skipped | eligibility right before each post; root fences | Unit: live, terminated, archived, gone; queued run messaged or Stopped is skipped (AR-002); refused copy excluded from the list |
| BEH-004 (REQ-004; AC-002) | One system notice per resumed run | `buildRestartNotice`; host notice event; member presentation mapping; memory recorded set | Unit: text, metadata, list; member shows a system notice; host memory records one system notice |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Add: `src/restart-resume/{release-identity,busy-run-record,busy-run-recorder,restart-resumer,restart-notice}.ts`, `src/compositions/{collaboration-root-resolver,restart-resume-composition}.ts`, `scripts/write-release-identity.mjs`, `docs/modules/restart_resume.md`, `tests/unit/restart-resume/*.test.ts` (6 files).

Modify: `package.json` (`build:full`), `src/server-runtime.ts`, `src/compositions/build-studio-server.ts`, `src/compositions/remote-collaboration-composition.ts`, `active-collaboration-root-directory.ts`, `root-task-execution-lifecycle.ts`, `team-task-execution-service.ts`, `standalone-agent-run-root.ts`, `root-team-run.ts`, `agent-org-run.ts`, `system-task-notification-senders.ts`, `runtime-memory-event-accumulator.ts`; IR-002: `agent-run-input-contract.ts`, `agent-run-input-admission-state.ts`, `agent-run.ts`, `team-member-execution-command.ts`, `configured-agent-execution-handle.ts` (496 lines), `flat-team-agent-execution-handle.ts`, `root-agent-execution-registry.ts`, `task-agent-execution-registry.ts`, `flat-team-execution-manager.ts`, `remote-child-commands.ts`; tests `server-runtime-app-data-migration-gate.test.ts`, `team-root-delegation-and-messaging.test.ts`, `standalone-agent-run-root.test.ts`, IR-002: `agent-run.test.ts`, `configured-agent-execution-handle.test.ts`, `agent-org-execution-scope-builder.test.ts`, `flat-team-execution-manager-routing.test.ts`, `remote-child-commands.test.ts`; docs `agent_execution.md`, `remote_collaboration.md`, `docs/modules/README.md`. (All under `autobyteus-server-ts/`.)

## Important Assumptions

- The process `AgentRunManager` (`AgentRunManager.getInstance()`), `getStandaloneAgentRunRootManager()`, `getActiveCollaborationRootDirectory()` and the process agent/Team history catalogs are the ones the run supervisor binds (the managers default to the process root directory). The Org catalog comes from the supervisor (`agentOrgRunHistoryCatalogService`).
- Eligibility reads the **root's** history row (the host's row for a standalone root and its delegated runs, the Team or Org row for members): Stop, archive and delete act on roots. A Task-closed copy is refused by its root's fence and logged.
- `restartedAt` in the notice is the resume time; `version` is this server's release.

## Known Risks

- Member memory (IR-001's residual, FU-004): resolved by SR-005 O-1 in IR-002; every place now publishes the run's own notice, which memory records.
- N-11: archiving a standalone host whose host is not live ends the root rather than refusing; a delegated run's later post is then refused by `assertAdmitting`, or an admitted turn is fenced (kept as is).
- A notice that loses to earlier input (`AGENT_RUN_INPUT_NOT_FIRST`) leaves that run continuing with the other input, without the notice or the delegated list (as N-9 for a host).
- Cost: unattended resumed turns (accepted, DEC-001); capped at 3 posts at a time.
- N-9: a delegated run's resumed turn can message its host before wave 2; the host then had input first and its notice is refused (documented).
- Duplicate work: guarded by the first-input rule in the run's dispatch queue (no check-then-post window); 284 guarantees one server.
- FU-001 (no record after a hard kill), FU-002 (failures only logged), FU-003 (Docker trial rollback with a data copy).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `Refactor Needed Now` (small: the shared root resolver, D5)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the new area composes existing owners; remote messages and restart resume share one resolver.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (the three inline resolvers in `remote-collaboration-composition.ts` are replaced)
- Dead code in the touched files and modules removed: `Yes` (the remote composition's unused `teamRuns`/`orgRuns` methods dropped from its input type)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` — effective non-empty lines after/before: `root-team-run.ts` 500/499 (kept at the limit by a one-line method), `standalone-agent-run-root.ts` 492/490, `build-studio-server.ts` 478/466, `root-task-execution-lifecycle.ts` 466/464, `agent-org-run.ts` 432/430, `server-runtime.ts` 229/222, `restart-resumer.ts` 153 (new); the rest are small.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` for existing data; one new transient file (`busy-runs.json`), consumed at the next start
- Design-spec decision reference: design-spec.md § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes` (the reader tolerates a bad file: logged, removed)
- Deviation: `None`

## Environment Or Dependency Notes

- Fresh worktree: `pnpm install` and `pnpm -C autobyteus-server-ts prebuild` before the typecheck.

## Checks Run

Code commits: `ab4ba6e7dc` (code), `b4d770d364` (tests, docs), `b50e2354ab` (a comment line removed from `root-team-run.ts` for the size limit). Environment: macOS 26 (Darwin 25.5.0), Node 22. Evidence in `evidence/`. Tests use temporary data roots only.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/restart-resume --no-watch` | `b50e2354ab` | macOS, Node 22 | release identity, record, recorder, resumer, notice, `placeOf`, root resolver, member presentation, memory | BEH-001 to BEH-004; AC-001, AC-003 to AC-005 (unit) | Pass | `IMP-01-restart-resume-unit.log` | `Tests  34 passed (34)` |
| IMP-02 | The same tests with one rule broken at a time (each source restored afterwards) | `b50e2354ab` | macOS, Node 22 | N-7 slot rule, REQ-005 delete-first, AR-002 check at post, N-10 member mapping, N-8 resolver contract, AR-005 recorder never deletes | as named | Each mutation fails its test | `IMP-02-mutation-n7.log`, `-delete-late`, `-check-once`, `-member-mapping`, `-catch-all`, `-recorder-deletes` | n7: `expected 'deadlocked' to match object`; others `1 failed` or `2 failed` |
| IMP-03 | `vitest run` the startup gate, `tests/unit/remote-collaboration`, the Team and standalone root tests, `tests/unit/agent-memory` | `b50e2354ab` | macOS, Node 22 | cleanup order (record before close), resumer after recovery, remote receiver on the shared resolver, `isDelegatedRun` on real roots, memory | BEH-001, D5, AC-006 | Pass | `IMP-03-affected-suites.log` | `Tests  358 passed (358)` |
| IMP-04 | `pnpm -C autobyteus-server-ts typecheck` | `b50e2354ab` | macOS, Node 22 | server `src` | — | Pass | `IMP-04-server-typecheck.log` | `exit 0` |
| IMP-05 | `pnpm -C autobyteus-server-ts build`; read `dist/release-identity.json` through the built module | `b4d770d364` (stamp and reader unchanged since) | macOS, Node 22 | `write-release-identity.mjs` in `build:full`, `readReleaseIdentity` | D1 | Pass | `IMP-05-build-release-stamp.log` | `"version": "1.5.11-beta.9"`; `built reader returns: "1.5.11-beta.9"` |
| IMP-06 | `pnpm -C autobyteus-server-ts test:unit` (full) | `b4d770d364` (`b50e2354ab` only removes a comment line; IMP-03 reran the Team tests on it) | macOS, Node 22 | all server unit suites | AC-006 | Pass | `IMP-06-server-unit-suite-summary.log` | `Tests  7694 passed \| 9 skipped (7703)` |

IR-002 (SR-005) checks:

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-07 | `vitest run` `tests/unit/restart-resume`, `agent-run.test.ts`, `configured-agent-execution-handle.test.ts`, `standalone-agent-run-root.test.ts`, `agent-org-execution-scope-builder.test.ts`, `flat-team-execution-manager-routing.test.ts`, `remote-child-commands.test.ts`, `agent-org-task-publication.test.ts` | `7d9a305627` | macOS, Node 22 | first-input rule on a real `AgentRun`; `postOptions` pass-through (standalone copy, Team, Org); member handle (no `member_input` for a notice, N-12, N-14); N-13; resumer restore → re-check → post; notice observer | BEH-002 to BEH-004; F-API-001, O-1, N-12 to N-14 | Pass | `IMP-07-sr005-focused.log` | `Tests  167 passed (167)` |
| IMP-08 | The same tests with one SR-005 rule broken at a time | `7d9a305627` | macOS, Node 22 | first-input rule; re-check after restore; no `member_input` for a notice; options pass-through; remote refusal | as named | Each mutation fails its test | `IMP-08-mutation-admission.log`, `-recheck`, `-member-input`, `-drop-options`, `-remote` | `3 failed`, `1 failed` … |
| IMP-09 | `pnpm -C autobyteus-server-ts typecheck` | `7d9a305627` | macOS, Node 22 | server `src` | — | Pass | `IMP-09-server-typecheck.log` | `exit 0` |
| IMP-10 | `pnpm -C autobyteus-server-ts test:unit` (full) on `82932a8b48`; its one failure (a test asserting the old call shape) fixed in `7d9a305627` and the Org/Team/collaboration folders rerun | `82932a8b48`, `7d9a305627` | macOS, Node 22 | all server unit suites | AC-006 | Pass after the test fix | `IMP-10-server-unit-suite-summary.log` | `Tests  1 failed \| 7702 passed`; rerun `Tests  879 passed (879)` |

- IMP-01 to IMP-06 are IR-001's; IMP-01 and IMP-02's resumer cases are superseded by IMP-07/IMP-08 (the resumer test was rewritten for SR-005). IMP-05 (build stamp) stays valid (unchanged code).
- Not run, and why: server `test:integration`/E2E and the real-app proof across two builds (AC-002), the Docker in-place update, the deployed-package check (N-2) and the live AC-003/004/005 cases are API/E2E-owned (design step 7).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no web or Electron change. The member notice is a server presentation mapping (tested at the server boundary); its rendering is part of AC-002 validation.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002 real app (design step 7): build X; busy standalone Codex (`gpt-6.1-terra`), standalone Claude, a Team member, an Org agent, a standalone root with a busy delegated copy; quit; rebuild the same code stamped X+1 (only the stamp differs: edit `dist/release-identity.json`, or rebuild with a changed web version); start on the same isolated data root. Expect each to continue with one notice; the host's notice lists its copy. Look for `Recorded <n> busy run(s) for restart resume` at quit and `Restart resume after the update to <X+1>: <n> resumed` at start.
- N-2: check that `dist/release-identity.json` is in the desktop bundle's server and in the Docker `pnpm deploy` package.
- New cases: a busy host with no children; a run messaged, Stopped or archived while queued (not resumed); one delegated run refused (excluded from the host's list); a quit right after an update relaunch, before the resumer ran (record survives, resumed next start).
- AC-003, AC-004 (same build relaunch resumes nothing), AC-005 (corrupt record; crash during resume then start).
- N-10: an Org restore activates no member (Read above); the member notice renders as a system notice in the window.
- The member-memory residual: after reload, check whether a member's notice still shows.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Design-spec § Change / Refactor Sequence step 7 in full, on separate data only. Codex uses `gpt-6.1-terra`.
