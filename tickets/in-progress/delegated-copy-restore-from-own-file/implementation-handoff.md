# Implementation Handoff

Ticket `delegated-copy-restore-from-own-file` (autobyteus-197). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-restore-from-own-file`, branch `codex/delegated-copy-restore-from-own-file`, base `origin/personal` @ `f171032e88`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High) and passed (ARCH-REV-007). `get_handoff_rules` → `/software_engineering_team/code_reviewer` (Large or High).
- Requirements doc: `tickets/in-progress/delegated-copy-restore-from-own-file/requirements-doc.md` (REQ-001..REQ-012, AC-001..AC-011)
- Investigation notes: `tickets/in-progress/delegated-copy-restore-from-own-file/investigation-notes.md`
- Solution revision record: `tickets/in-progress/delegated-copy-restore-from-own-file/solution-revision-record.md` (SR-001..SR-008)
- Design spec: `tickets/in-progress/delegated-copy-restore-from-own-file/design-spec.md` (SR-008: D-1..D-9, M0..M5)
- Supplemental task artifacts:
  - `implementation-design-impact-DI-001.md` (resolved by D-8);
  - `implementation-design-impact-DI-002.md` (resolved by D-9);
  - `followups/suggested-task-retire-old-migrations.md` (Solution Designer's follow-up; not part of this ticket).
- Design review report: `tickets/in-progress/delegated-copy-restore-from-own-file/design-review-report.md` (ARCH-REV-007, pass)
- Architecture review revision record: `tickets/in-progress/delegated-copy-restore-from-own-file/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial handoff).

## Current Implementation Summary

Every delegated copy now carries its `source`: the definition and launch it started with. The source is written to and read from the copy's own file. Restore, Settings, the run view, the indexes and the web contexts all read a copy only from its own source, by run ID, never from the configured placement at its address. Removed: `taskAgent.origin`, the configured-placement fallback paths, the three task-source resolvers and the `readTaskSource` port.

A new startup migration, `20261019_delegated_copy_own_file_complete_v1`, completes existing own files. A same-ID repair of `20261017_task_agent_own_run_v1` (D-9) keeps that migration's retry working after the new migration has completed its files.

- Implementation cycle: `Rework` (IR-002, CR-001 Local Fix; IR-001 was the initial handoff)
- Implementation revision record: `tickets/in-progress/delegated-copy-restore-from-own-file/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: SR-001..SR-008
- Related architecture-review revision IDs: ARCH-REV-003..ARCH-REV-007
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: CR-001

Commits, in order:
- `3ed550595c` step 1 freeze;
- `35675e3b5e` contracts and both `dist/` folders;
- `65ae647bc9` server;
- `7d689455ad` web;
- `2997ff0b9a` ticket folder, DI-002 and evidence round 1;
- `3b6f970cfa` D-9 and the R-9 tests;
- `2253b8044b` the DLP-006 probe case updated to model an upgrade through the own-file completion (see Known Risks);
- `0a303d3a5d` documents and evidence round 2 (the IR-001 handoff);
- `96de77efb3` CR-001: the last absent-source checks for copies removed (IR-002);
- the IR-002 handoff commit, with these documents and evidence round 3.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - three packages plus the web change (about 190 files);
  - a persisted-shape change with a new startup migration and a same-ID repair of a released one;
  - shared stream contracts changed.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` open.
  - DI-001 → D-8 and DI-002 → D-9 are resolved and implemented.
  - Escalation triggers checked:
    - every remaining configured-placement read of a copy is F-1 (skill improvement, memory targets);
    - no other released migration imports a changed module beyond D-8 and 10-17;
    - `source` is a required type, so no product path can write a copy without it (IMP-01).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Catalog copy restores from its own file (preserved) | `run-history/store/task-agent-own-records.ts` (`composeTaskAgentRecord`/`composeTaskTeamRecord` always set `source`); team, org and standalone task-execution adapters → `projectTaskExecutionSource` | Preserved; unit suites of the three roots |
| BEH-002 | Configured-place copy restores from its own file, not the slot | The same adapters. The three `*-task-source-resolver.ts` files and `readTaskSource` are deleted. `collaboration-execution-location-service.ts` resolves by `executionKind`; `team-member-run-view-projection-service.ts` takes `platformAgentRunId` from the copy | Done. The combined unit test restores a configured-place copy from its own file only (`delegated-copy-own-file-complete-v1…test.ts`, "composes every copy…") |
| BEH-003 | Editing a slot in a stopped run affects only the slot and later copies | Follows from BEH-002 and BEH-005: a copy's values come only from its own snapshot | Done. Integration/e2e coverage left to API/E2E (AC-003) |
| BEH-004 | Run view, Settings, contexts show the copy's own values; names kept (D-7) | Web: `agentSourceSelectors.ts` (`teamAgentSourceOf`, `copyAgentSourceOf`, `copyTeamSourceOf`), `teamExecutionTreeSelectors.ts` (D-7 `readsAsDisplayName`), `delegatedLaunchRows.ts`, `agentOrgExecutionViewIndex.ts`, `agentOrgExecutionContext.ts`, `agentRunCollaborationIndex.ts`, `agentOrgHistoryRows.ts`, `ExistingRunConfigEditor.vue`. Server: location services and run-view projection | Done. R-2: `agentSourceSelectors.spec.ts` covers D-7 including `/` and non-task rows |
| BEH-005 | A delegation to a configured address starts from the slot and records the full snapshot | `collaborator-source-projector.ts` `configuredPlacementSource(node, treeHandoffs)`; `catalog-delegation.ts` `sourcedPlacement`; `team-recipient-resolver.ts`, `agent-org-recipient-resolver.ts`. Team members carry a complete launch and `followsTeam` (D-5); handoffs `from` ∈ members (D-4); `configured` origin (D-6) | Done; `copy-execution-source.test.ts`, the recipient-resolver suites |
| BEH-006 | Settings edit of a stopped copy (preserved) | `delegated-launch-selection.ts` and the command, without `readTaskSource`; web `delegatedLaunchRows.ts` reads only the source | Preserved; `delegatedCopyChoices.spec.ts`, `delegated-launch-selection` units, IMP-14 DCP cases |
| BEH-007 | Team-level selection reaches the same followers, through the recorded `followsTeam` | `run-execution-tree-shared-records.ts` (`RecordedMemberLaunch`); `memberFollowsTeam`, `configuredTeamFollowerAddresses` and the contract follower helpers removed | Done; AC-011 units and the contract tests |
| BEH-008 | First start converts own files once (M0..M5); 10-17 retries keep working (D-9) | `migrations/delegated-copy-own-file-complete-v1/` (`own-file-completion.ts`, `…-app-data-migration.ts`), registered last; D-9 `readReleasedOwnFileOwnership` in `legacy/…/released-task-agent-own-files-with-origin.ts`, used by `coordinating-run-migration.ts` | Done; IMP-09, IMP-11, IMP-12 |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- **Server domain and store:** `run-history/domain/run-execution-tree-shared-records.ts`, `run-history/store/{agent-run-metadata-types,task-agent-own-file-schema,task-agent-team-tree-schema,task-execution-source-schema,launch-configuration-source-schema,run-execution-tree-shared-record-schemas,task-agent-own-records,task-execution-tree-split,coordinating-tree-shapes}.ts`, `agent-team-execution/domain/task-agent-team-tree.ts`.
- **Server collaboration:** `agent-collaboration/collaborators/{collaborator-source-projector,catalog-delegation,launch-configuration-notes}.ts`, `agent-collaboration/domain/launch-configuration-source.ts`, recipient resolvers, delegated-launch selection, the three task-execution adapters and launch plans, `team-run-delegated-launches.ts`.
- **Location, view and indexes:** `collaboration-execution-location-service.ts`, `team-member-run-view-projection-service.ts`, `{team,agent-org,standalone-root}-execution-index.ts`, `mention-viewer.ts`, stream projections.
- **Migrations:**
  - new: `migrations/delegated-copy-own-file-complete-v1/*`;
  - registry: `app-data-migration-registry.ts`;
  - frozen: `legacy/released-run-package-shapes/released-task-agent-own-files-with-origin.ts` (with D-9);
  - D-8 bridge: `legacy/…/released-trees-before-task-agent-own-run.ts` (`asSourceIndependentIndexInput`) and its four call sites;
  - 10-17: `task-agent-own-run-v1/coordinating-run-migration.ts`.
- **Contracts:** `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`, `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts`, and both `dist/` folders.
- **Web:** `services/collaborators/agentSourceSelectors.ts`, `services/teamExecution/*`, `services/agentOrgExecution/*`, `services/agentCollaboration/agentRunCollaborationIndex.ts`, `services/runHydration/*`, `utils/runSettings/delegatedLaunchRows.ts`, `utils/agentOrgHistoryRows.ts`, `components/workspace/config/ExistingRunConfigEditor.vue`.
- **Docs:**
  - server: `run_history.md`, `agent_orgs.md`, `agent_communication.md`, `agent_team_execution.md`, `standalone_agent_run_root.md`, `design/collaboration_model.md` (CM-8);
  - web: `docs/settings.md`, `docs/agent_orgs.md`;
  - the legacy `README.md`.
- **Tests:**
  - new: `delegated-copy-own-file-complete-v1…test.ts` (11), `released-own-file-ownership.test.ts` (10), fixtures `released-delegated-copy-own-file-fixtures.ts`;
  - new D-9 cases in the 10-17 suite;
  - many existing fixtures now give copies their source and Team copy members their launch facts.

## Important Assumptions

- **Released migrations (D-8).** The four D-8 migrations call only index methods that never read a copy's `source`. The bridge doc comment lists them, including `listChildAgents` (R-7). The source-less fixture R-7 requires is in `team-context-file-execution-locators-v1.test.ts`. All four suites are unchanged and pass (IMP-09).
- **Same-ID repair (D-9).** It affects only installs where 10-17 is pending or failed; terminal installs skip 10-17.

## Known Risks

- **Mirrored copies (F-X3, observation for review).** A mirrored configured-place agent copy with a null launch (F-X3b) is byte-identical and left out of its imported source, as designed. Its memory folder, however, is listed by the Memory page under **"Unattributed runs"** rather than not shown at all (`memory-sync-task-agent-layout.test.ts:181-188`). Nothing is lost; the next sync after that node updates replaces it. If the design meant "not listed anywhere", this needs a decision. I did not change Memory page attribution, which is outside the Change Scope.
- **Full-registry suites adapted.** Because the full registry now includes the new migration:
  - `released-run-tree-skip-version-upgrade` injects the ledger and expects the 5-key projection;
  - the append-only test runs the own-file completion after own-run;
  - the 10-17 test dropped its current-store read-back, per the 4-part plan.
- **Removed defensive branches.** Web `delegatedLaunchRows.ts` still guards with `recorded?.` when a Team copy member has no entry in its source's member list. The contract does not cross-check this, so the guard was kept.
- **Browser probe DLP-006 updated** (`autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs`, commit `2253b8044b`).
  - Before: the case edited saved Team copies into a pre-change shape *after* this build's migrations had run, relying on the reader accepting Team copy members without a launch. D-5 removes that tolerance, so the stripped copies were left out and the case failed.
  - Now: it writes the released shape (no member launch facts, no launch sources, `taskAgent.origin`) and deletes the `20261019` ledger row, so the restarted backend converts the copies as on a real upgrade. Its user-visible expectations are unchanged.
  - The strip now also removes the own file's `taskAgent.launchSource`. That is where a Team copy's own launch source has lived since 10-17; the old strip missed it.
  - Reviewers should confirm that this change to the case's mechanism is acceptable.
- **F-1 (follow-up, unchanged).** `skill-improvement-target-context-resolver.ts` and the memory targets use the slot for a copy at a configured address.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change + Cleanup
- Reviewed root-cause classification: Legacy Or Compatibility Pressure (with Shared Structure Looseness)
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `Yes`, twice. Two migration-boundary gaps were routed as DI-001 and DI-002, resolved by D-8 and D-9.
- Evidence / notes: `source` is required everywhere. One projection path; the resolvers, `origin` and the configured follower rule are gone.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` in current code. Old shapes are read only in migration-owned code: the frozen file, the new migration and the D-8 bridge.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. Removed:
  - resolvers, `readTaskSource`, `resolvePlace`/`handoffs` on the tree shape, `memberFollowsTeam`, `effectiveMemberLaunchConfiguration`, `configuredTeamFollowerAddresses`;
  - the contract member helpers;
  - web `launchAt`/`coordinatorAt`/`configuredFollows`;
  - `findTaskConfigNode`, `findAgentOrgConfiguredSourceNode`;
  - the `RootTeamRun` `config` pass-through;
  - (IR-002, CR-001) the standalone-root schema's "has no catalog source" loop and the web `addTaskTeam` coordinator fallback;
  - the frozen `readAgent`/`readTeam`, now unused after D-9.

  A sweep for `configured_place`, `resolvePlace`, `readTaskSource`, `TaskSourceResolver`, `configuredFollows`, `launchAt` and `TaskAgentOrigin` finds them only in migration-owned code and its tests.
- Dead code found elsewhere, listed as follow-up: None.
- Shared structures remain tight: `Yes`. `source` has a single meaning; Team copy members require `launchConfiguration` and `followsTeam`; agent own-file launch fields are non-null.
- Canonical shared design guidance was reapplied: `Yes`
- Changed source files within size guardrails: `Yes`.
  - No changed source file exceeds 500 non-empty lines.
  - Files over 450: `agent-org-run-manager.ts` 462 (was 466), `teamExecutionViewState.ts` 479 (unchanged count), the frozen file 479.
  - Changes over 220 lines occur only in new migration-owned files: the frozen file 479, the migration 214, `own-file-completion.ts` 255.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Migration Required`
- Design-spec decision reference: "Persisted Data / State Transition Decision", "Migration Plan" (M0..M5, D-8, D-9), "Data Migration Guideline Checklist and Shape Inventory"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result: N/A
- **Migration implementation and focused checks:**
  - Startup-only, registered last; dispositions MIGRATED, SKIPPED_ALREADY_CURRENT, PRESERVED_PLACEMENT_MISSING, PRESERVED_UNREADABLE, PRESERVED_UNSUPPORTED and FAILED_OPERATION.
  - Gate on 10-17: converts what is present and stays non-terminal (M5).
  - One atomic write per file, then a read-back with the current reader.
  - M4 writes a 5-key projection and never writes `skillAccessMode`.
  - Mirrors under `imports/` are never discovered.
  - Fixtures F-A1..F-A4b, F-T1..F-T4, F-X1, F-X2, F-X3/F-X3b/F-X3c, and the combined 10-17 → 20261019 → current-store test.
  - R-9(b): M3/M4 over pre-own-run trees.
  - D-9 retry and damaged/foreign-file cases.
  - Startup e2e with both migrations (TAU-1..3, AOML-1..2) and the production-upgrade e2e.
  - Synthesized fixtures only. No migration was run on real data or a copy of it.
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- macOS 26.5.2, Node v22.23.1, pnpm 10.28.2.
- E2E suites run with `env -i PATH HOME=<temp> TMPDIR`. The production-upgrade e2e only `lstat`s `~/.autobyteus/server-data` to prove it untouched. The user's running app and data were never used.
- Untracked build outputs (`autobyteus-application-*/dist/`, `applications/brief-studio/dist/`) come from the integration prerequisites and are not part of this change.
- Contract `dist/` folders are rebuilt and committed; IMP-06 shows they match a fresh build.

## Checks Run

Evidence is in `tickets/in-progress/delegated-copy-restore-from-own-file/evidence/`. `IMP-00-summary.txt` lists every run.
- Round 1 ran on `7d689455ad`.
- Round 2 reran, on `3b6f970cfa`, every check D-9 affects.
- Round 3 (IR-002, CR-001) reran IMP-01, IMP-02 and IMP-07 on `96de77efb3`. The other rows are unaffected: IR-002 only removes code that could not run, in one server schema and one web selector.

The full logs of IMP-02, IMP-03 and IMP-07 are committed as excerpts because of their size; the full files remain in the worktree.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `96de77efb3` (IR-002) | macOS, Node 22 | all server source | AC-009, escalation trigger 3 | Pass | `IMP-01-server-typecheck.log` | `# Exit code: 0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | `96de77efb3` (IR-002) | same | server unit | BEH-001..008 | Pass | `IMP-02-server-unit.excerpt.txt` | `Tests  6111 passed \| 7 skipped (6118)` |
| IMP-03 | `test:integration:prepare` then `test:integration` | `7d689455ad` (D-9 touches only migration code, which the integration suites do not run) | same | server integration | BEH-001, 002, 004 | Pass | `IMP-03-server-integration.excerpt.txt` | `Tests  419 passed \| 70 skipped (489)` |
| IMP-04 | `pnpm -C autobyteus-team-stream-contracts test` | `7d689455ad` (contracts unchanged since) | same | team contract | BEH-004, 007 | Pass | `IMP-04-contracts-team.log` | `# Exit code: 0` |
| IMP-05 | `pnpm -C autobyteus-collaboration-stream-contracts test` | `7d689455ad` (unchanged since) | same | collaboration contract | BEH-004, 007 | Pass | `IMP-05-contracts-collaboration.log` | `# Exit code: 0` |
| IMP-06 | `git status` on both `dist/` after IMP-04/05 rebuilt them | `7d689455ad` | same | committed contract `dist/` | TESTING.md dist rule | Pass | `IMP-06-contracts-dist-unchanged.log` | no `M` lines |
| IMP-07 | `cd autobyteus-web && pnpm exec cross-env NUXT_TEST=true vitest run` | `96de77efb3` (IR-002) | same | web unit and component | BEH-004, 006, R-2 | Pass | `IMP-07-web-unit.excerpt.txt` | `Tests  4549 passed \| 5 skipped (4554)` |
| IMP-08 | web `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `7d689455ad` (web unchanged since) | same | web | — | Pass | `IMP-08-web-guards.log` | `[guard:web-boundary] Passed.` |
| IMP-09 | focused migration units: new migration, 10-17, D-9 ownership, skip-version, memory-sync F-X3, four D-8 suites | `3b6f970cfa` | same | migrations | BEH-008, AC-005..009, AC-011, D-8, D-9, R-9 | Pass | `IMP-09-migration-focused-unit.log` | `Tests  100 passed (100)` |
| IMP-10 | `pnpm -C autobyteus-server-ts build` | `3b6f970cfa` | same | built server for e2e | — | Pass | `IMP-10-server-build.log` | `Built-in agents bootstrap smoke check passed.` |
| IMP-11 | startup e2e: `task-agent-own-run-startup` and `append-only-message-logs-startup` (built server, temp HOME) | `3b6f970cfa` | same, `env -i` | both migrations at startup | BEH-008, AC-005, AC-008, D-9 | Pass | `IMP-11-e2e-startup-migrations.log` | `Tests  5 passed (5)`; the TAU-2 line is `✓` |
| IMP-12 | `team-run-v1-production-upgrade` e2e | `3b6f970cfa` | same, `env -i` | full registry upgrade | BEH-008 | Pass | `IMP-12-e2e-production-upgrade.log` | `Tests  4 passed (4)` |
| IMP-13 | DI-002 option A prototype (historical, superseded by D-9; never committed) | `7d689455ad` + diff | same | — | DI-002 | Pass (TAU-1..3) | `IMP-13-DI-002-option-A-prototype*.{diff,log}` | historical only |
| IMP-14 | `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --output-dir <temp>` (real Chrome → Nuxt dev → built backend from IMP-10, scripted runtimes, owned temp data root and HOME) | `2253b8044b` (backend `dist` from `3b6f970cfa`; no server change since) | same, Chrome | Settings delegated rows; copy model change in Agent, Team and Org roots; DLP-006 upgrade conversion in the browser | BEH-004, 006, 007, 008 | Pass | `IMP-14-browser-delegated-launch-defaults.log`, `IMP-14-delegated-launch-defaults-evidence.json`, `IMP-14-*.png` | `Summary: 15 Pass, 0 Fail` |

- Not run, and why:
  - `pnpm -C autobyteus-web test:electron`: no Electron code changed.
  - AC-001/AC-003 as integration or e2e journeys (restore after a slot edit in a stopped run), the AC-004 run view in a live app, and other browser probes: left to API/E2E.
  - AC-010 (the user's real data): delivery, after the user's backup.

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces / journeys:**
  - Settings delegated-copy rows: origin label "As configured in this run" for configured-placement copies; values from the copy's own source;
  - Team and Org copy names (D-7);
  - copy contexts (model, workspace) in Team, Org and Agent roots.
- **References:** REQ-004 / AC-004, D-6, D-7; `autobyteus-web/docs/settings.md`.
- **Existing design system and adjacent surfaces reviewed:** no visual component or style changed. The label text already existed; only which data drives it changed.
- **Surface used:** the `delegated-launch-defaults` browser probe (TESTING.md "Browser probes"). Real Chrome on a probe-owned Nuxt dev server and built backend; scripted runtimes; temp data root and HOME.
- **States, layouts and interactions inspected:**
  - Settings delegated rows in Agent, Team and Org roots, running (locked, stop icon) and stopped (model editable);
  - Team copy cards with the Coordinator chip and members;
  - save bar and saved state;
  - restart and reopen;
  - 880 and 1280 widths (and 390 in DLP-003);
  - converted pre-change copies after an upgrade-like restart: "Source not recorded", Team values (DLP-006).

  I inspected the committed screenshots (`IMP-14-*.png`) directly. Rows, labels, chips and locks render as before; the values come from each copy's own source.
- **Visual or interaction issues found and corrected:** none in the rendered UI. DLP-006 failed on its old mechanism, as described in Known Risks; the probe case was updated.
- **Limitations:**
  - No probe case delegates to a *configured placement*, so the row label "As configured in this run" for the `configured` origin was not rendered in a browser. The label key and its `RunMemberRow.vue` mapping (both locales) are unchanged and existed before. The data path is proven by unit tests (`delegatedLaunchRows.spec.ts`, `delegatedCopyChoices.spec.ts` expect `sourceKey: 'configured'`). Suggested for API/E2E with AC-004.
  - The D-7 copy names are proven by unit tests (`agentSourceSelectors.spec.ts`, R-2), not rendered.

## Downstream Coverage Hints / Suggested Scenarios

- **AC-001 / AC-003:** in a stopped Team run and an Org run, delegate to a configured agent member and a configured Team member, stop, edit the slot's model, then restore. The copies keep their started values; a new delegation uses the edit.
- **AC-004:**
  - the run view of a copy whose own settings differ from its slot's shows the copy's runtime session id and model;
  - the Settings row of a configured-placement copy says "As configured in this run" (not rendered by IMP-14);
  - names follow D-7.
- **AC-011(a):** a configured Team whose member has its own auto-approve but the Team's model. A Team-level model selection reaches that member.
- **Upgrade path:** a released 10-17-shaped data root, two starts (the startup e2e exists; a desktop upgrade with a hand-built root would add the packaged app).

## API / E2E / Executable Coverage Investigation And Execution Still Required

AC-001..AC-004 and AC-011 at the system boundary (GraphQL/WebSocket and browser) as listed above, and the packaged-app upgrade. AC-010 is delivery's: the user backs up, upgrades and checks the converted copies.
