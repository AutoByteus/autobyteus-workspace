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
- Triggering rework report, revision record, or evidence: N/A (initial round)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-004 (design), SR-002 (approval)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A
- Branch `codex/restart-resume`; base `origin/personal` @ `efd28d5c4a`; code commits `ab4ba6e7dc`, `b4d770d364`, `b50e2354ab` (see § Checks Run); docs and evidence in the following commit.

**D1, release identity.** `scripts/write-release-identity.mjs`, run by `build:full` after `tsc`, writes `dist/release-identity.json` = `{ "version": <autobyteus-web package version> }`. `readReleaseIdentity()` (`src/restart-resume/release-identity.ts`) reads it once from next to the built module; missing → `null` quietly (a server run from `src`), unreadable or without a version → `null`, logged. Checked: a build writes `1.5.11-beta.9`, and the built module reads it.

**`placeOf` and `isDelegatedRun`.** `ActiveCollaborationRootDirectory.placeOf(agentRunId)` returns `{ root, place }` or `null`: `host` when the root is a standalone root whose run id is the agent run; else `delegated` when the boundary's new optional `isDelegatedRun?(id)` says so; else `member`. When several roots claim a run it logs and prefers host, then delegated (the review's "log when more than one boundary claims a run"). `isDelegatedRun` is `RootTaskExecutionLifecycle.isDelegatedRun(id) = adapter.taskExecutionChainFor(id).length > 0` (a task Agent, or a member of a task Team, at any depth), exposed by `StandaloneAgentRunRoot`, `RootTeamRun` (through `TeamTaskExecutionService`) and `AgentOrgRun`.

**D5, shared root resolver.** `createCollaborationRootResolver({ standaloneRoots, teamRuns, orgRuns })` (`src/compositions/collaboration-root-resolver.ts`), built once in `build-studio-server.ts`:
- standalone: `resolveRoot(id)` (null for a run that cannot be a root);
- team: `getManagedTeamRun(id) ?? restoreTeamRun(id)`, **not** `resolveManagedTeamRun`, which swallows every error (N-8);
- org: `getActive(id) ?? restore(id)`.
`StandaloneRootUnavailableError` and the coded `TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED:` / `AGENT_ORG_STATE_PACKAGE_NOT_CATALOGED:` errors map to `null`; anything else is thrown. `RemoteRootDirectory.standalone/team/org` delegate to it and narrow by kind; the remote receiver keeps its own `resolve()` (any throw → not found), so remote behavior is unchanged. Its `teamRuns`/`orgRuns` input types drop the methods it no longer calls.

**D2, record at shutdown.** `server-runtime.ts` sets the cleanup to `async () => { await recorder.record(); await app.close(); }` right after `buildStudioServer`. `BusyRunRecorder.record()` (process `AgentRunManager`, process root directory): live runs with status `initializing`/`running` and a root → entries `{ root, agentRunId, place, status, recordedAt, version }`; only with entries, it merges with a valid existing record (keeping entries of runs not recorded now, with their own version), replaces an invalid one (logged), writes atomically to `<appDataDir>/restart-resume/busy-runs.json`. It never deletes and never throws.

**D4, notice.** `RESTART_RESUME_NOTICE_SENDER_ID = "system.restart_resume"` is added to the senders and to memory's recorded set. `buildRestartNotice({ entry, version, restartedAt, resumedDelegated })` makes the SYSTEM input with `sender_id`, `message_id = restart-resume:<recordedAt>:<agentRunId>`, `dedupe_key = agent_run_input:<agentRunId>:<message_id>`, the suppression key and the platform preface (notice-only), like the skill notice. Text as the design; the list line only for a host or member with accepted delegated runs. The member presentation (`collaboration-agent-presentation-event-adapter.ts`) shows a `member_input` that is a SYSTEM input from that sender as `SYSTEM_TASK_NOTIFICATION`; other member input is unchanged.

**D3, resume after an update.** `RestartResumer.resumeAfterUpdate()` (started in the background after `recoverAfterListen`, after a `checkpoint()`, before the background tasks):
1. read; missing → nothing; **remove the file before anything else** (if removal fails, nothing is resumed); invalid → logged, nothing resumed;
2. per entry: resume only when `entry.version !== null && current !== null && entry.version !== current`; the others are counted and logged once;
3. group by root; **wave 1 = the root's delegated entries; wave 2 = its host and members**, told the accepted delegated runs (display name and run id);
4. a post limiter of 3 wraps each entry's whole check + restore + post; waiting for wave 1 holds no slot (N-7);
5. right before each post: skip when `AgentRunManager.getActiveRun(id)` is live, or when the root's history row is missing, has `terminatedAt`, or is archived;
6. host → `StandaloneAgentRunRootManager.postUserMessage({ runId, message, onActiveRunReady, postOptions: { lifecycleObserver } })`; the observer publishes `SYSTEM_TASK_NOTIFICATION { sender_id, content, turn_id }` on `forwarded`, as the Model Router does. Member or delegated → `rootResolver.resolveOrRestore(entry.root)` then `root.executeAgentCommand(id, { kind: "post_message", message })`;
7. a refusal, a `null` root or a throw is logged; the run stays stopped. Returns `{ recorded, notUpdate, skipped, resumed, failed }`; never throws.

**Interpretation to confirm — the wave order.** D3.4 says wave 1 is "delegated and member entries", but D4 says a member's notice lists the delegated runs "accepted in wave 1", and AR-003 tells every resumed member of a Team or Org. A member resumed in wave 1 could not list them, so I put members in wave 2 with the host. This only delays members until their root's delegated runs settle.

**N-10 (Read).** An Org restore activates no member: `AgentOrgExecutionScopeBuilder.build` creates lazy configured handles (`RootAgentExecutionRegistry.prepareConfigured` → `createHandle`; no `AgentRun`), and `AgentOrgRun.activate()` only sets its lifecycle flag. The per-post live check is therefore not fooled by the resume's own restore. A SYSTEM-sender `member_input` was shown as a user message unless task-delegation marked; the restart sender mapping is added (tested).

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

Modify: `package.json` (`build:full`), `src/server-runtime.ts`, `src/compositions/build-studio-server.ts`, `src/compositions/remote-collaboration-composition.ts`, `active-collaboration-root-directory.ts`, `root-task-execution-lifecycle.ts`, `team-task-execution-service.ts`, `standalone-agent-run-root.ts`, `root-team-run.ts`, `agent-org-run.ts`, `system-task-notification-senders.ts`, `runtime-memory-event-accumulator.ts`, `collaboration-agent-presentation-event-adapter.ts`; tests `server-runtime-app-data-migration-gate.test.ts`, `team-root-delegation-and-messaging.test.ts`, `standalone-agent-run-root.test.ts`; docs `agent_execution.md`, `remote_collaboration.md`, `docs/modules/README.md`. (All under `autobyteus-server-ts/`.)

## Important Assumptions

- The process `AgentRunManager` (`AgentRunManager.getInstance()`), `getStandaloneAgentRunRootManager()`, `getActiveCollaborationRootDirectory()` and the process agent/Team history catalogs are the ones the run supervisor binds (the managers default to the process root directory). The Org catalog comes from the supervisor (`agentOrgRunHistoryCatalogService`).
- Eligibility reads the **root's** history row (the host's row for a standalone root and its delegated runs, the Team or Org row for members): Stop, archive and delete act on roots. A Task-closed copy is refused by its root's fence and logged.
- `restartedAt` in the notice is the resume time; `version` is this server's release.

## Known Risks

- **Member memory (residual for review):** a resumed member or delegated run shows the notice live as a system notice (the `member_input` mapping), but nothing publishes a member run event for it, and a notice-only input is never recorded as a user message, so the member's own memory does not record the notice. Publishing a member run event as well would show it twice. The host's memory records it. If reload history must show it for members, that needs a design choice (for example a filtered `member_input` plus a run event).
- Cost: unattended resumed turns (accepted, DEC-001); capped at 3 posts at a time.
- N-9: a delegated run's resumed turn can message its host before wave 2; the host is then live and skipped (documented).
- Duplicate work: guarded by the live check right before each post; 284 guarantees one server.
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
