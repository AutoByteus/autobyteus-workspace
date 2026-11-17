# API/E2E Coverage Investigation — autobyteus-508

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/design-spec.md` (SR-001, Ready)
- Supplemental Task Artifacts: `probes/probe-508-runtime-selection.test.ts` (designer's reproduction; IMP-06 green)
- Design Review Report: `N/A — not applicable` (Small / Low, direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: Implementation Complete (IR-001), code commit `e0b58997f3`, docs/evidence commit `4ea7826b87`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The 461 conversion (`20261111_delegated_runs_own_runs_v1`, reused by the `20261114_*` follow-ups) must apply a released Settings edit (`userLaunchSelection`) whole: the edit's `runtimeKind` when named (else the started runtime), its model and its settings (REQ-001), and record every edited record with `launchSource {origin: "settings", fallbacks: []}` (REQ-002), under the same migration IDs with no registry change (REQ-003). REQ-004 (ship before 461 reaches stable) is a release gate for delivery. Persisted-data decision: `Migration Required`, as a same-ID correction (guideline §7). The design changes one file (`run-file-conversion.ts`, `withEdit` + `SETTINGS_EDIT_SOURCE`), with no reader or runtime change.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (app start of a release with 461 on ≤ beta.6 data holding delegated runs whose Settings edit changed the agent runtime).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-001a: after the upgrade start, the user opens the delegator's view or Settings. The rows come from the server's run tree (`runTree` GraphQL, `run-tree-records.ts` `localChildRecord`), which reads each converted file and gives each row its runtime, model, source and `ownSource`. This is where the founder saw "Inherited from the run" (no own source, so the team's default source is shown). Trigger: the GraphQL `runTree(kind:"agent", runId:<manager>)` read the web makes. In real use, delegated runs are reached through the Task entries that a Project Task Manager's delegation recorded, so the fixture runs get Task entries in that released shape.
  - SCN-001b: the user's next input to a converted run with a pending switch makes the switch real. In the product, that is the current activation commit (`commitRuntimeSwitchOnRecord`, unchanged by this ticket) on the current shape a live Settings save writes (`applySelectionToConfiguredMember` / `applyRuntimeSelection`). Proved by showing that the converted record equals what a live save writes from the same started launch and that the commit accepts it. Waking a converted run against a real runtime is excluded by TESTING.md ("never wake a converted run against real runtime sessions") and would need a real Codex login.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 edit runtime applied (member own edit, team edit to follower, agent run edit) | Changed | REQ-001; `run-file-conversion.ts` `withEdit` | Migration tests (AC-001…AC-003) + built-server startup read |
| BEH-001 edited record's `launchSource = settings` | Changed | REQ-002 | Migration tests + run-tree rows (`ownSource: true`, `origin: settings`) |
| Model-only edit keeps started runtime | Preserved | AC-004 | Existing main-scenario test (updated for source) |
| Pending switch beside the new runtime | Preserved | AC-005 | Migration test + equivalence with the live save rule + startup read |
| IDs, registry, dispositions, follow-ups | Preserved | REQ-003, AC-006, QR-001 | Registry order test, follow-up test, whole migrations folder |
| Unedited member's recorded source; team default launch | Preserved | BEH-001 preserved column | Migration tests + run-tree rows |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | conversion value mapping | 461 migration tests (IMP-01/02) | none material | — |
| API / transport / contract | No (indirect) | Converted data reaches the web through `runTree`/resume GraphQL (unchanged code) | None for the converted edits before this round | Whether the built server reads and presents the converted edits as the user's own Settings edit | Built-server startup E2E (DRO-4) |
| Frontend component / state | No | `settings` source has no label (V-11) by existing code | existing web code | none: unchanged mapping `settings → null label` | — |
| Browser integration / user journey | No | — | — | — | Not required (no UI change; row data asserted at the GraphQL boundary the UI reads) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes (startup) | migration runner at startup of the built server | startup E2E DRO-1/2/3 (not yet run on this commit) | built `dist/` startup with the new shapes | Built-server startup E2E |
| Persisted-data transition | Yes | same-ID correction of a released conversion | migration tests, fixtures | real ledger and runner on the built server; second start | Built-server startup E2E |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508` (branch `codex/member-runtime-lost-508`)
- Project type and runtime stack: pnpm monorepo; server `autobyteus-server-ts` (Node 22, Fastify/GraphQL, vitest); web Nuxt/Electron.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/TESTING.md` (no closer `TESTING*.md` under `autobyteus-server-ts/`).
- Conflicting, missing, or unclear project instructions: None.
- Changed build-input paths (`git diff --name-only 298bd7a60a...HEAD` against the Fresh-start build list): `None`. The changes are a server `src` file, server tests, a server test fixture and ticket docs; there is no manifest, lockfile, config, workflow or new cross-package import. The web typecheck compiles the changed fixture file and IMP-04 passed. No fresh-start build case.
- Required environment variables or secrets available: `N/A` (no provider keys; the scripted AGY CLI is the only runtime the startup suite needs).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` (root) | Global testing strategy | Server unit/E2E commands; "Migrations and upgrades are tested on small synthesized data … prove the conversion, that nothing is lost, and that a second start changes nothing"; never real user data; "never wake a converted run against real runtime sessions"; Node 22; one heavy run at a time; clean env for E2E (`env -i`, resolved temp HOME); suites that run `dist/app.js` need `pnpm -C autobyteus-server-ts build`; both typechecks for any TS change |
| `AGENTS.md` (root), `autobyteus-server-ts/AGENTS.md` | Repo/package instructions | `vitest run <file> --no-watch` |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts` header | Suite gate and command | Gate `RUN_AGY_FAILURE_E2E=1` + `ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs`; `DRO_E2E_EVIDENCE_DIR=<dir>`; prerequisite build |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` §7 (via design) | Same-ID correction | Terminal ledger rows skipped; no new ID |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built server `dist/app.js` | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts build`; the suite spawns it (`startBuiltStudio`) on a temp data root, port 0, 127.0.0.1 | Node 22.23.1 | "Server listening" line (helper) | the suite stops each server, `killBuiltStudios` in `afterAll`, removes its temp roots |
| Scripted AGY CLI | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | env var | no provider | `--version` | none |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| ≤ beta.6 delegated run files with runtime-naming edits | `released-delegation-shape-fixtures.ts` (`writeReleasedWorld`, `writeReleasedRuntimeEdits`), hand-built; key shapes checked against `v1.5.13-beta.6` (`run-execution-tree-shared-records.ts:16-21, 242-260`; `task-agent-own-records.ts:40-48, 92-93, 138-144, 158-159`: `taskAgent.userLaunchSelection` (team edit stored as `userLaunchSelection` in `taskAgent`), `taskAgent.pendingRuntimeSwitch` on agent own files, `member.pendingRuntimeSwitch`, optional `runtimeKind` on the edit) | Never the founder's data; neutral IDs | temp roots removed by the suite |
| Task entries that reach the delegated runs | released `agent_run_resources.json` entry shape (`role: "assigned"`, `assignedBy`, `hostRoot`, `agentRun`), one Task per run, written in the suite | test-owned root | removed with the root |
| Install where every earlier migration completed | first start of the build, then remove 461's ledger row (existing suite pattern) | test-owned DB | removed with the root |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` (same-ID correction of the released migration).
- Design-spec and implementation-handoff references: design-spec "Persisted Data / State Transition Decision", "Migration Plan"; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: hand-built released shapes of each edit kind (member own edit made real; team edit with follower, own edit on another runtime, unedited member; pending switch in a team and an agent run; agent run edit made real; model-only edits of the main scenario). Conversion applies the edit whole and records the Settings source. Nothing else changes.
- Evidence planned: migration tests (reused IMP-01/02, red on old IMP-05); built-server startup on an install where all earlier migrations completed (DRO-1/2/3 existing, DRO-4 new), with run-tree reads and a second start; equivalence probe against the live save rule and the switch commit.
- Migration-specific completion/recovery scenarios: ledger SUCCEEDED; second start changes no file (DRO-2, DRO-4); a terminal ledger record is skipped (existing tests in IMP-01); follow-up for a late item (AC-006, IMP-01).
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/app-data-migrations/delegated-runs-own-runs-v1/delegated-runs-own-runs-v1-app-data-migration.test.ts` (main scenario, lines ~119-145) | Converted members' launches and sources | AC-004, REQ-002 | Still Valid (updated by implementation: edited members now assert `settings`; this is the approved change, design step 3) | diff `298bd7a60a..e0b58997f3` | Reuse IMP-01 |
| same file, new `describe(... autobyteus-508)` | AC-001, -002, -003, -005, second start | REQ-001/002 | Still Valid (new) | diff; IMP-05 red on old | Reuse IMP-01 |
| `.../delegated-runs-preserved-items-v1.test.ts` (AC-006 case) | follow-up applies edit whole | AC-006 | Still Valid (new) | diff | Reuse IMP-01 |
| `tests/unit/app-data-migrations/app-data-migration-registry-order.test.ts` | Registry order unchanged | REQ-003, QR-001 | Still Valid | unchanged file | Reuse IMP-01 |
| `tests/app-data-migrations/**` (all) | every migration incl. upgrade paths | QR-001 | Still Valid | IMP-02 | Reuse IMP-02 |
| `tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts` DRO-1/2/3 | built-server upgrade, second start, restart-resume fence | SCN-001, preserved behavior | Still Valid (imports the changed fixture file; asserts nothing about edits that changed) | read of file | Run on a fresh build (API-06) |
| Runtime-switch built-server E2Es (`tests/e2e/runtime/*switch*`) | live pending-switch commit on current shape | SCN-001b (existing behavior) | Out Of Scope (unchanged code; used as the authority for the commit path) | — | none |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…AC-006, QR-001 | conversion via migration + follow-ups; registry | Reused | IMP-01 | Ran on `e0b58997f3`; only ticket docs changed since (`4ea7826b87`); log shows `Tests  29 passed (29)` |
| API-02 | QR-001, preserved behavior | all app-data migrations | Reused | IMP-02 | Same commit, same reason; `Tests  602 passed (602)` |
| API-03 | — (build safety) | server typecheck | Reused | IMP-03 | Same commit; production errors 0, baseline equal. API-07 adds an E2E test file edit → rerun as API-09 |
| API-04 | — (build safety) | web typecheck | Reused | IMP-04 | Same commit; web typecheck compiles the server fixture file it imports; the E2E file is not in its scope (rerun not needed unless API-07 touches fixtures, which it does not) |
| API-05 | AC-001…AC-006 fail on old code | regression proof | Reused | IMP-05 | Same tests and old source; `Tests  6 failed \| 20 passed (26)` |
| API-06 | SCN-001, REQ-003, preserved | built server startup (existing DRO-1/2/3) | Existing Test | `pnpm -C autobyteus-server-ts build`, then the suite with its gate in a clean env (`-t "DRO-1|DRO-3"`) | Needs fresh `dist/`; never run on this commit |
| API-07 | AC-001, AC-002, AC-003, AC-005, REQ-002, REQ-003 (second start) | built server startup + `runTree` GraphQL rows (what Settings shows) | Durable | the same suite, `-t DRO-4` | Proves the real runner on the built server and the reader/presenter boundary the founder saw; no existing test covers runtime-naming edits end to end |
| API-08 | AC-005 (next input), REQ-002 | converted record vs the live Settings save rule and the switch commit | Temporary Probe | a vitest file in the 461 test folder: migrate the fixture world, then compare each converted edited member with `applySelectionToConfiguredMember(started member, edit)` and run `commitRuntimeSwitchOnRecord` on the pending one; removed after the run | Not durable: it would couple the sealed migration's tests to the live rule, which may change after the release; the result is a one-time equivalence proof for this correction |
| API-09 | — | server typecheck with the new E2E code | Existing Test | `pnpm -C autobyteus-server-ts typecheck` | The E2E file is type-checked (test-file baseline) |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-07 | `autobyteus-server-ts/tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts` (new `it` DRO-4) | The upgrade suite of this migration covered no runtime-naming edit; DRO-4 keeps the built server's upgrade and its Settings rows honest for these shapes |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-07 | same file, header | add DRO-4 to the header's case list; import the new fixtures | DRO-1/2/3 unchanged |

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Waking a converted Codex run (next input) on a real Codex App Server | TESTING.md forbids waking a converted run against real runtime sessions; it would need a real Codex login and provider spend; the commit path is unchanged code, and API-08 proves that the converted record is what that path receives from a live save | Low | No | None |
| Repair of already-converted data (founder's nodes) | Out of scope (DEC-003) | — | Yes (the founder repairs his own data in Settings, by his choice) | None |
| REQ-004 release timing | Release gate, not testable here | — | No (delivery) | Delivery: ship before 461 reaches stable; release only on the founder's word |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (DRO-4 added to the startup E2E)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: Released shapes were checked against `v1.5.13-beta.6` source, not against user data.
