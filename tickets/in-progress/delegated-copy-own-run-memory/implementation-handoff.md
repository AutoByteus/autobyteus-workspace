# Implementation Handoff — A Task Agent Is A Normal Run

Ticket: delegated-copy-own-run-memory (Project Task 8641c0ac). Worktree
`/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory`, branch
`codex/delegated-copy-own-run-memory`, base `origin/personal` `66429d6f31`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High); ARCH-REV-004 `Pass` for SR-009 / contract revision 5. Implementation routes to Code Review (`get_handoff_rules`).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/solution-revision-record.md` (SR-009 current)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/design-spec.md`
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/memory-layout-contract.md` (behavior-defining, revision 5)
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation)

## Current Implementation Summary

Task agents (delegated Agent and Team copies) are now normal runs. A task agent's memory and facts live in
its own folder at L1 (`agents/<id>/` with a `taskAgent` section in `run_metadata.json`;
`agent_teams/<id>/` with a team tree carrying `taskAgent` and its own message log). The coordinating run's
tree keeps only links. The three tree stores compose today's in-memory records at load and split them at
save, so the 28 in-memory consumers are unchanged. One placement rule decides every agent's memory
directory. The readers enforce G1 and G2, messages follow the email model, the Memory page attributes task
agents, and the readiness check skips task-agent folders. Deleting a run keeps its task agents. The startup
migration `20261017_task_agent_own_run_v1` brings existing data to the new layout. Released migrations
were repointed to frozen copies first (D-9). Current-code names no longer carry version numbers (D-10).

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-009` (cumulative SR-005..SR-009)
- Related architecture-review revision IDs: `ARCH-REV-004`
- Related code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Commits: `8bbd081c8d` (D-10 renames), `5a5359e707` (D-9 frozen copies), and the behavior commit on top
  (D-1..D-8, tests, docs, web text and ticket artifacts).

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence: the change rewrites persisted user data in all three run families (move, own files, reduced
  trees, merged logs), changes what makes a folder a run (G1 / G2), and touches persistence boundaries,
  placement, the message stores and a startup migration. The scope matches the design; nothing grew past it.
- Selected route: `Code Review`
- Lightweight self-review for direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. One open question about the coding principle the user
  named is listed under Important Assumptions.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| D-1 / BEH-001, BEH-002, BEH-005; REQ-003, REQ-004, REQ-013; AC-003, AC-017 | Compose at load, split at save; own file before link; in-memory types unchanged | `run-history/store/task-execution-tree-split.ts` (compose / split / commit), `task-agent-own-records.ts` (record ↔ own file), `task-agent-own-files.ts` (own-file IO), `task-agent-own-file-schema.ts`, `task-agent-team-tree-schema.ts`, `coordinating-tree-shapes.ts`; stores `standalone-root-package-store.ts`, `team-run-execution-tree-store.ts`, `agent-org-run-execution-tree-store.ts`; link schema `run-execution-tree-shared-record-schemas.ts#parseTaskExecutionLink` | Implemented. The split is computed against the files on disk inside the coordinating run's lock. The own file is written first and only when it differs (H3). Records on disk that were not loaded are written back unchanged in place (L4). The tree is written only when it changed. If an own file fails, the tree is `not_renamed`. Unit: `task-agent-own-run-stores.test.ts` |
| D-2 / DS-008; REQ-001, REQ-002; AC-001, AC-002 | One placement rule: run part, task agent (`agents/<id>/`), task-team member (`agent_teams/<team>/<id>/`) | `agent-memory/domain/agent-run-memory-placement.ts`, `AgentMemoryLayout.getAgentRunMemoryDirPath`, `agent-run-memory-locator.ts` (replaces `rooted-agent-memory-locator.ts`), handles and registries (`memoryPlacement`), `TeamRunContext.teamKind` / `memberMemoryPlacement`, the indexes' `getMemoryPlacementForAgent`, the location services, the adapters' restore checks | Implemented. Writers decide the placement at construction; readers take it from the index chain. Both use the same module |
| D-3 / REQ-005; AC-005, AC-017 | G1 (metadata with `taskAgent` is not a standalone run), G2 (a team tree with `taskAgent` is not a team run); task-agent readers / writers | `agent-run-metadata-store.ts` (`readMetadataState` G1, `readTaskAgentMetadata(State)`, `writeTaskAgentMetadata`), `team-run-execution-tree-store.ts` (G2 in `read` / `readSync`, `isTaskAgentTeamDir`) | Implemented. The guards sit in the readers, so every existing caller (listing, admission, restore, offline repair, stale-prepared cleanup) gets them without a code change |
| D-4 / BEH-009; REQ-011; AC-014, AC-021 | Email model: once within a run, in both logs across runs; receiver's log first; append never rewrites; composed read de-duplicated and filtered to loaded endpoints | `run-history/store/task-agent-message-logs.ts`, message stores `team-communication-store.ts`, `agent-org-communication-messages-store.ts`, standalone store `appendMessage` / `readMessages`; `PreparedTeamMessageCommit.logOwners`, append plan `resolveLogOwners`, adapters' `messageLogOwnerOf` | Implemented. A failure after the first log is durable surfaces as `renamed_finalization_indeterminate`, which is today's fail-stop path. Unit: `task-agent-message-logs.test.ts` |
| D-5 / BEH-006; REQ-010; AC-013 | Memory page lists task agents under their definition; detached ones not listed | `agent-memory/services/agent-memory-explorer-service.ts`, `run-history/store/task-agent-link-check.ts` | Implemented. Unit: `agent-memory-explorer-task-agents.test.ts` |
| D-6 / readiness | Task-agent folders are not root candidates | `run-history/services/root-run-package-current-validator.ts` | Implemented. Deviation 1 below |
| D-7 / BEH-007; REQ-009; AC-012 | Delete keeps task agents; the confirmation says so | delete removes only the run's own folder (no code path reaches the L1 folders); web text `useWorkspaceHistoryMutations.ts`, `localization/messages/{en,zh-CN}/workspace.ts` | Implemented |
| D-8 / BEH-008; REQ-006, REQ-007, REQ-012, REQ-014, REQ-017, REQ-018; AC-008..AC-011, AC-015, AC-020, AC-021 | Startup migration with per-run input gate, rename, reduce (L4), merge logs, dispositions, per-run containment | `app-data-migrations/migrations/task-agent-own-run-v1/` (`released-coordinating-trees.ts`, `coordinating-run-migration.ts`, `task-agent-own-run-v1-app-data-migration.ts`), registered last | Implemented. Unit: `task-agent-own-run-v1-app-data-migration.test.ts` (every shape, second start, interruption at each step, F-RERUN-MSG, F-PENDING-FAILED, unreadable log). Built-server: `collaborators-to-delegated-runs-startup.e2e.test.ts` runs collaborators-v1 then ours in one start (the F-PENDING path) |
| D-9 / REQ-017; R-6 | Released migrations repointed to frozen copies before any module they import changed | commit `5a5359e707`; `app-data-migrations/legacy/released-run-package-shapes/released-*-before-task-agent-own-run*` | Implemented. Evidence below |
| D-10 / REQ-019; AC-023 | Version-free current names; no on-disk change | commit `8bbd081c8d` | Implemented. Inventory below |
| U-4 / AC-024 | Copy of a configured place: `origin: "configured_place"`, the place's `agentDefinitionId`, launch fields null when never recorded, composes without `source` | `task-agent-own-records.ts`, `coordinating-run-migration.ts` | Implemented. This also covers the round-4 residual: the own file records `agentDefinitionId` |
| U-5 | Every new task agent is linked at the coordinating run's top level; nested records are lifted by the migration | mutators `addTaskExecutionToTree`, `addStandaloneRootTaskExecution`, `addAgentOrgTaskExecution` are root-only; nested-append helpers removed | Dead-code evidence at base `66429d6f31`: `team-task-execution-adapter.ts:70` sets `hostTeamRunId = this.options.rootTeamRunId`; `agent-org-task-execution-adapter.ts:98` and `standalone-root-task-execution-adapter.ts:105` always create `hostKind: "root"`. The released team-tree-v1 converter keeps its own frozen mutator (`team-run-execution-tree-v1-mutator.ts`). Organization links under a configured team (C6) are kept and read |
| REQ-015 / AC-018 | Memory Sync on the new layout, no source change | none (export scanner and imported explorer unchanged) | Unit `memory-sync-task-agent-layout.test.ts`: F-SYNC-NEW and F-SYNC-OLD |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

New: `agent-memory/domain/agent-run-memory-placement.ts`; `agent-collaboration/execution/services/agent-run-memory-locator.ts`;
`agent-team-execution/domain/task-agent-team-tree.ts`; `run-history/store/{task-agent-own-file-schema, task-agent-team-tree-schema,
task-agent-own-records, task-agent-own-files, task-execution-tree-split, coordinating-tree-shapes, task-agent-message-logs,
task-agent-link-check}.ts`; `app-data-migrations/migrations/task-agent-own-run-v1/`; frozen modules under
`app-data-migrations/legacy/released-run-package-shapes/` (commit `5a5359e707`).

Removed: `rooted-agent-memory-locator.ts`, `agent-memory/services/runtime-memory-location-classifier.ts` (its only
users were released migrations, now on the frozen copy), and `AgentMemoryLayout.ensure*` / `getOrgAgentRunDirPath`
(dead).

Docs: `docs/modules/{agent_memory, agent_team_execution, run_history, standalone_agent_run_root, agent_orgs}.md`,
`docs/features/memory_sync.md`, `docs/design/collaboration_model.md` (CM-8 / CM-9 → Holds),
`docs/design/startup_initialization_and_lazy_services.md`. `DESIGN.md`: the example line for rule 8 fixed.

## Important Assumptions

- **Open question for the user (not blocking):** mid-implementation the user said "when you're writing code,
  you'll follow the Dilan principle". It isn't defined in DESIGN.md, the docs or the skills. When asked, the
  user replied only "please continue". I applied DESIGN.md and the shared design principles. If a specific
  principle was meant (for example DRY or the Law of Demeter), the reviewer or Solution Designer should
  confirm it.
- The frozen parser's `convertibleBy` roles map tree-writing predecessors to the family whose trees each can
  still change: team tree v1 / v2 → team; `20260901_agent_org_flat_team_families_v1` → team and org;
  `20261015_collaborators_to_delegated_runs_v1` → all three. This is the "implementer confirms" item of the
  Migration Plan.

## Known Risks

- **Deviation 1 (D-6):** the design says "owners by placement" for the validator. The validator's owner and
  directory lists had no remaining reader once D-9 moved the released migrations to the frozen validator
  copy, so I removed them as dead (Principle 7). `CurrentRunPackage` is now `{key, family, id, directory}`.
  The frozen copy keeps the released owner derivation for the migrations that need it.
- **Validator classification fix (found while testing):** the `isTaskAgentTeamDir` check runs inside the
  validation `try`. A corrupt tree is reported `CURRENT_VALIDATION_FAILED`, as before, instead of throwing
  `FAILED_ATTEMPT`.
- **Fresh-ledger retry of `20260521_run_history_index_v2`:** on an install where that released migration
  previously FAILED (only when every run's metadata failed), its retry after our migration indexes the task
  agents' own metadata into `run_history_index.json`. Those rows are never listed: the readiness index admits
  no task-agent folder. The collaborators startup e2e shows this and asserts that the history lists none of
  the task agents. The migration is released and unchanged; this is recorded, not changed.
- **H2 cost (R-3)**, measured with a temporary unit timing on this machine: a hub with 100 / 500 task agents
  composes in about 6 / 21 ms (median of 5). A Settings edit save writes one own file in 23 / 74 ms (it
  compares every loaded record with its own file). Writing 500 new task agents in one save took 7.4 s, about
  15 ms per task agent with atomic writes; real delegations add one at a time. Lazy loading remains the
  accepted follow-up.
- R-4: `origin/personal` has moved 15 commits ahead of the base. The branch has not been merged or rebased
  (delivery owns integration).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: refactor at the persistence boundary.
- Reviewed root-cause classification: ownership expressed by nesting and embedding instead of links.
- Reviewed refactor decision: `Refactor Needed Now`.
- Implementation matched the reviewed assessment: `Yes`. The in-memory types are unchanged, and the split and
  compose live only in the stores.
- If challenged, routed as `Design Impact`: `N/A`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. No dual-path reads: a full record without an own file
  is not loaded (L6), and old shapes are read only by the migration's frozen parser.
- Legacy old-behavior retained in scope: `No`.
- Dead code in touched files removed: `Yes` (the old locator, the runtime memory location classifier, the
  layout's `ensure*` and `getOrgAgentRunDirPath`, nested-append helpers, the validator owner lists).
- Dead code found elsewhere, listed as follow-up: `getTeamAgentRunLocation`. It has no caller in `src`, but
  it sits outside the touched modules.
- Shared structures remain tight: `Yes`. The link is a strict subset of the record; `TaskAgentSection` is the
  only new persisted structure.
- Canonical shared design guidance reapplied: `Yes`.
- Size guardrails: `Yes`. No changed source file exceeds 500 effective lines (largest:
  `general-process-run-supervisor.ts` at 486, import rename only). New files over 220 lines are new
  modules: `task-execution-tree-split.ts` 281, `coordinating-run-migration.ts` 246, `task-agent-own-records.ts`
  243, plus the verbatim frozen copies.

## Persisted Data Transition Check

- Approved decision: `Migration Required`.
- Design reference: design-spec § Persisted Data / State Transition Decision, § Migration Plan; contract §5.4, §8, §10.
- Follows the decision without version-specific runtime fallback: `Yes`.
- Migration: id `20261017_task_agent_own_run_v1`, `STARTUP_ONLY`, `requiredOnStartup`, no prerequisites,
  registered last. Its steps are: per-run input gate; already done?; own file in the old folder; rename to L1;
  reduce the tree (L4; nested C7 records lifted to root links only when the parent and all its descendants
  are owned); merge logs for every task agent at L1, whether still a record or already a link. Dispositions:
  `MIGRATED`, `SKIPPED_ALREADY_CURRENT`, `SKIPPED_UNMATERIALIZED`, `WAITING_FOR_PREDECESSOR` (FAILED),
  `PRESERVED_UNSUPPORTED_TREE` (warning), `PRESERVED_UNREADABLE_LOG` (warning; the task agents still move),
  `FAILED_OPERATION`. Each coordinating run is contained by its own try/catch.
- Focused checks: unit migration test on hand-built released fixtures
  (`tests/fixtures/app-data-migrations/released-task-agent-layout-fixtures.ts`: F-C1..F-C7, F-NS, F-ND, F-SE,
  F-MSG, F-UNMATERIALIZED). Each test asserts per-file hash equality, interruption at every step, a second
  start that changes nothing, F-RERUN-MSG, F-PENDING-FAILED and the unreadable log. The built-server startup
  e2e (collaborators → ours) checks that trace bytes are moved unchanged and that a second start leaves the
  trees unchanged.
- Deviation from the reviewed transition decision: `None`.

### D-9 evidence (released migrations)

- Frozen modules (commit `5a5359e707`): `released-trees-before-task-agent-own-run.ts` (re-exports the verbatim
  copies in its folder, including the file readers), `released-root-packages-before-task-agent-own-run.ts`
  (`ReleasedRootRunPackageValidator`, `ReleasedAgentOrgRunPackageCatalog`) and
  `released-memory-locations-before-task-agent-own-run.ts` (`ReleasedRuntimeMemoryLocationClassifier`).
  The folder README was updated.
- Repointed: collaborators-v1, first-message-summary-v1, team-run-migration-state-classifier, locators-v1, and
  both `20260731` snapshot migrations. Their existing tests pass unchanged in outcome; two only read the
  released output with the frozen readers.
- Re-verified at the result: every direct import from a released migration or frozen module into a module
  this ticket changed falls into one of three cases. (a) A D-10 type or constant rename only. (b) An additive
  method (`getMemoryPlacementForAgent`, `getAgentRunMemoryDirPath`); the physical-scope methods and
  `getRootedAgentRunDirPath` are unchanged. (c) `AgentRunMetadataStore.readMetadataState`, whose G1 branch
  never fires on released data because released files have no `taskAgent` section.
  `TeamCommunicationStore` is imported only for its file-name constant.

### D-10 rename inventory (AC-023, commit `8bbd081c8d`)

| Before | After |
| --- | --- |
| `collaboration-communication-message-v1.ts`, `-v1-schema.ts` | `collaboration-communication-message.ts`, `collaboration-communication-message-schema.ts` |
| `agent-org-communication-messages-v1.ts`, `-v1-schema.ts`, `-v1-store.ts` | `agent-org-communication-messages.ts`, `-schema.ts`, `-store.ts` |
| `team-communication-v1-schema.ts`, `-v1-store.ts`, `-v1-types.ts` | `team-communication-messages-schema.ts`, `team-communication-store.ts`, `team-communication-messages-file.ts` |
| `CollaborationCommunicationMessageV1`, `TeamCommunicationMessageV1` (alias removed) | `CollaborationCommunicationMessage` |
| `AgentOrgCommunicationMessagesFileV1`, `TeamCommunicationMessagesFileV1`, `StandaloneRootMessagesFileV1` | `AgentOrgCommunicationMessagesFile`, `TeamCommunicationMessagesFile`, `StandaloneRootMessagesFile` |
| `TeamCommunicationV1Store`, `AgentOrgCommunicationMessagesV1Store` | `TeamCommunicationStore`, `AgentOrgCommunicationMessagesStore` |
| `validateTeamCommunicationMessagesV1Payload`, `validateAgentOrgCommunicationMessagesV1`, `validateCollaborationCommunicationMessage(Array)V1`, `validateStandaloneRootMessagesV1` | the same names without `V1` |
| `getTeamCommunicationMessagesV1Path`, `getAgentOrgCommunicationMessagesV1Path` | without `V1` |
| `TEAM_COMMUNICATION_MESSAGES_V1_FILE_NAME`, `AGENT_ORG_COMMUNICATION_MESSAGES_V1_FILE_NAME` | without `V1` (values unchanged) |
| web `AppLeftPanel_v2.spec.ts` | `AppLeftPanel.navigation.spec.ts` |

Search at the result: outside `app-data-migrations/`, the only names with a version number are the migration
ID constants (`TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID`, `TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID`) and the
local `teamRunV2Status` in `start-standalone-application-host.ts`, which names that migration's status. All
three are covered by the migration-id exemption. Persisted values such as `"interrupt_cancel_queued_v1"` are
kept. The web search found only test data (`report_v1`).

## Environment Or Dependency Notes

- The `autobyteus-ts` build is needed before server tests (`pnpm prebuild` / `prepare:shared`).
- Tests within the worktree must be serialized. Concurrent unit and integration runs corrupted
  `tests/.tmp/autobyteus-server-test.db` once; it was deleted and the suites were rerun serially.
- E2E runs used a clean environment: `env -i PATH HOME=<tmp> TMPDIR=<tmp>`.

## Local Implementation Checks Run

- Typecheck `tsc -p tsconfig.build.json --noEmit`: 0 errors.
- Test typecheck `tsc -p tsconfig.json --noEmit --rootDir ..`: no new error in a changed or new test file. The
  other remaining errors exist at base (the test typecheck is not clean at base). The difference against the
  base snapshot is one changed message on an existing TS2739 mock error (because the store gained `writer`)
  and a `brief-studio` import error that depends on whether its untracked `dist/` exists.
- Server unit `vitest run tests/unit`: 714 files passed, 4 skipped (5772 tests). Run before the last three
  test edits; each edited or new file was rerun and passes (`memory-sync-task-agent-layout`,
  `context-file-exact-execution`, `task-agent-own-run-stores`).
- Server integration `pnpm test:integration`: 75 passed; 1 file failed with 2 pre-existing failures (below).
- Server e2e `vitest run tests/e2e` (clean env, built `dist` from current code): 76 passed, 78 skipped, 6 failed.
  All failures are pre-existing (below). The ticket-relevant e2e files pass: `collaborators-to-delegated-runs-startup`,
  `memory-collaboration-graphql`, `imported-team-memory-graphql`, `memory-sync-api`, the run-history and
  workspace suites.
- Web: `WorkspaceAgentRunsTreePanel.spec.ts`, `AppLeftPanel.navigation.spec.ts` (76 tests) and the localization
  suites (15 files) pass.

### Pre-existing failures (verified at HEAD without this ticket's uncommitted work)

- `tests/integration/agent/agent-status-websocket.integration.test.ts` (2).
- `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` (3): stale ledger counts and missing files.
- `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` (1): "agentDefinitionId at '/nested' is required".
- `tests/e2e/agent/agent-command-correlated-status.e2e.test.ts` (1), `standalone-error-termination-lifecycle.e2e.test.ts`
  (2: `manager.prepareNewAgentRun is not a function`), `runtime/configured-skill-on-demand-loading.e2e.test.ts`
  (2: `ownLlm is not a function`), `terminal/terminal-websocket-lifecycle.e2e.test.ts` (1: PTY home path).
  These four files were rerun with this ticket's `src` / `tests` stashed and still failed in the same way.

### Test impact inventory (REQ-016, AC-019)

New: `task-agent-own-run-stores.test.ts` (D-1, D-3, L4–L6, U-4, C6), `task-agent-message-logs.test.ts` (D-4,
AC-014 per family), `agent-memory-explorer-task-agents.test.ts` (D-5, AC-013), `task-agent-own-run-v1-app-data-migration.test.ts`
+ `released-task-agent-layout-fixtures.ts` (D-8), `memory-sync-task-agent-layout.test.ts` (AC-018), placement
cases in `agent-memory-layout.test.ts` (D-2).

| Updated test or fixture | Reason |
| --- | --- |
| `agent-memory-layout.test.ts` | the dead `ensure*` subtree test was replaced by placement-rule tests (D-2) |
| `agent-memory-location-service`, `team-memory-explorer-service`, `agent-org-memory-explorer-service`, `standalone-agent-run-root`, `agent-org-run-inspection`, `task-agent-execution-registry-memory` tests; e2e `memory-collaboration-graphql` | task agents' memory is now at L1 (`agents/<id>/`, `agent_teams/<team>/<id>/`); group paths lose the nesting level (U-5) |
| context-file tests (`context-file-access-containment`, `-agent-collaboration-owner`, `-exact-execution`), integration `context-files`, `draft-context-files-universal` | fixtures are written through the stores (own file + link) and expect context files at L1 |
| `collaboration-public-projection-fixtures`, `standalone-run-token-usage-summary-service`, `agent-org-memory-explorer-service`, `team-memory-explorer-service` | nested task executions inside task teams are linked at the top level (CM-7, U-5); public fields unchanged |
| `team-run-current-package-schema`, `agent-org-run-execution-tree-tolerance` | the exact written shape is now links plus own files; asserts that composing returns the same records |
| `team-run-model-selection-save` | a source-less task agent must be at a configured place's address (U-4) |
| `team-run-physical-scope`, `team-run-execution-tree-mutator`, `agent-memory-location-service`, `team-memory-explorer-service` | mutators are root-only (no `ownerTeamRunId`); the nested scope case is built directly because the index still derives it for the frozen location derivation |
| harnesses and fixtures (`org-task-root-harness`, `org-collaborator-harness`, `team-root-collaborator-harness`, `configured-root-first-work-fixture`, `task-release-generation-fixtures`, `standalone-run-roots-fixture`, `org-migration-continuation-fixtures`, `native-compaction-root-fixture`) and unit/integration tests building `TeamRunContext` / `beginMaterialization` / memory locators | new required inputs (`teamKind`, `memoryPlacement`, `getMemoryDir`, `appendMessage`, composed `read(dir, tree)`); org harnesses use a real memory root so own files land beside the org folder |
| `team-communication-message-append-plan-current`, `team-communication-service`, `agent-org-communication-presentation`, `team-root-delegation-and-messaging` | log owners resolved per message; commits go through `appendMessage`; reads are composed |
| `collaborators-to-delegated-runs-v1` unit | registered second to last; its output is read with the frozen readers (released shape) |
| `agent-org-history-first-message-summary-v1` unit | its input is the released tree written as raw JSON, not through the current store |
| `released-run-tree-skip-version-upgrade` | now also runs ours: the released team tree is reduced to a link and the source-less task agent gets a `configured_place` own file |
| e2e `collaborators-to-delegated-runs-startup` | our migration runs last in the same start: memory moves to L1 and composed reads go through the current stores. The team root's log (rewritten by the released `20260701` migration on this fresh ledger) is reported `PRESERVED_UNREADABLE_LOG`. The second start adds only the retried released index (see Known Risks) and the history lists no task agent |
| web `WorkspaceAgentRunsTreePanel.spec.ts` | confirmation text (D-7) |
| D-10 commit tests (imports only) | renamed modules |

## Frontend Rendered-Result Check

- Affected surface: the history delete confirmation text only (agent, team and org history), in en and zh-CN.
- It is a confirmation-string change with no layout or interaction change. Verified by the component spec
  and the localization suites. The dialog was not rendered in an isolated desktop app; that belongs to the
  AC-016 real-app journey, which is still open (below).

## Downstream Coverage Hints / Suggested Scenarios

- AC-016 real-app run, not run by implementation: an isolated desktop worktree build
  (`pnpm --silent isolated-app start --build --data-root <root>`) with the synthesized package from
  `writeReleasedDataRoot` placed at `<root>/server-data/memory`. A faithful run needs an app-data ledger that
  marks the earlier released migrations done. On a fresh ledger, released migrations (for example `20260701`)
  rewrite current-shaped data, as the collaborators e2e shows. Journey: startup migration; sidebar unchanged;
  open the hub and its task agents (conversation, file changes, context files); Settings model edit of a
  stopped task agent; Memory page Agents list; delete the hub and check that its task agents' folders stay;
  second start changes nothing.
- AC-010 at app level: a step fails, the user delegates and edits a model, and the next start completes.
  The store L4 tests and the F-RERUN-MSG migration test cover the pieces.
- AC-012: integration delete of a coordinating run with the L1 folders kept and not listed (the unit explorer
  test covers detached ones not being listed).
- AC-004 / AC-007: wake, Task close / reopen and reactivate of a migrated task agent from its own folder.
- AC-020 runner level with the locator migration pending, for task-agent-team members' context-file references.

## API / E2E / Executable Coverage Investigation And Execution Still Required

The AC-016 isolated desktop journey and the scenarios above. All pre-existing failures listed above are
follow-ups outside this ticket.

## Follow-ups (outside this ticket's scope)

- Dead `getTeamAgentRunLocation` (no caller in `src`).
- The released `20260701` projection migration rewrites a current team log on a fresh ledger into a shape the
  current reader rejects; seen in the collaborators startup e2e.
- The pre-existing failing tests listed above.
- Already accepted by the design: lazy loading of a hub's task agents (H2), a Memory page view of detached task
  agents, and the message log file format.
