# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `.../requirements-doc.md` (Approved; REQ-001..REQ-019)
- Investigation Notes Reviewed As Context: `.../investigation-notes.md` (through the design's evidence and the contract; not re-read in full)
- Solution Revision Record Reviewed As Context: `.../solution-revision-record.md` (SR-009 current)
- Design Spec Reviewed As Context: `.../design-spec.md` (SR-005, revised SR-007..SR-009)
- Supplemental Task Artifacts Reviewed As Context: `.../memory-layout-contract.md` (the sections the design cites: L1–L6, §3, §5.4, §6 C7, §8, §10, §12.3); `DESIGN.md` rules 7 and 8
- Relevant Solution Revision IDs: `SR-005`..`SR-009`
- Design Review Report Reviewed As Context: `.../design-review-report.md` (ARCH-REV-004 Pass)
- Architecture Review Revision Record Reviewed As Context: `.../architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-004`
- Implementation Handoff Reviewed As Context: `.../implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `.../implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001` (`8bbd081c8d` D-10, `5a5359e707` D-9, `6bcb206e4e` D-1..D-8), `IR-002` (`2f7f5b3f4b`)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-009`
- Current Review Round: `6`
- Review Scope: round 3 is a `Full Review` completion at the user's request, over all 120 changed source files of `66429d6f31..2f7f5b3f4b`. Round 1, though recorded as a Full Review, read only the core modules and the five areas the implementer flagged; this round reads the rest (see Round 3). Round 2 was a `Targeted Delta Review` of `2f7f5b3f4b`: nine source files, all within CR-001..CR-003 (unused declarations, the metadata store's sync reader, the link-check warning), plus two tests and the handoff. Round 1 was a `Full Review` (`66429d6f31..6bcb206e4e`: 221 files, of which 130 are source, +5035/−1001 source lines)
- Trigger: the user asked whether round 1 followed the criteria strictly; it did not cover every file, so the Full Review was completed
- Prior Review Round Reviewed: `2` (CRR-002, Pass)
- Latest Authoritative Round: `3`

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory`)

## Routing Classification Review

- Task size `Large`; architectural risk `High`; route `Implementation Review`; independent source review required: `Yes`.
- Classification evidence or correction required: None. The change moves and rewrites persisted data in all three run families and changes what makes a folder a run.

## Review Scope

- **Changed implementation and behavior reviewed:**
  - D-1 compose and split: `task-execution-tree-split.ts`, `task-agent-own-records.ts`, `task-agent-own-files.ts`, the three tree stores, `coordinating-tree-shapes.ts`.
  - D-2 placement: `agent-run-memory-placement.ts`, `AgentMemoryLayout`, `memoryRootOfCoordinatingDir`.
  - D-3 G1/G2: `agent-run-metadata-store.ts`, `team-run-execution-tree-store.ts`.
  - D-4 message logs: `task-agent-message-logs.ts`, the standalone store, owner resolution in the three roots.
  - D-5 explorer: `agent-memory-explorer-service.ts`, `task-agent-link-check.ts`.
  - D-6 readiness: `root-run-package-current-validator.ts`.
  - D-8 migration: `task-agent-own-run-v1/*`.
  - D-9 frozen copies: checked for verbatim copying and import isolation.
  - D-10 renames: checked with a search and the typecheck.
- **Reviewer-run evidence:**
  - Server `tsc -p tsconfig.build.json --noEmit`: exit 0.
  - `--noUnusedLocals` over the touched files: 6 hits, all already present at base (CR-001).
  - The five new test files: 5 files / 28 tests pass. They cover the migration (every shape, second start, a stop at each step, F-RERUN-MSG, the per-run gate), the stores (L4–L6, U-4, C6), the message logs, the Memory page attribution and Memory Sync.
  - The frozen copy `run-execution-tree-shared-record-schemas.ts` matches its base file apart from import paths and the header. No file outside `app-data-migrations/` imports `legacy/`.
- **Explicit exclusions:** the broad unit, integration and e2e suites were not rerun by the reviewer; the implementer's results and its pre-existing failure list are carried. AC-016 (the real-app journey) is for API/E2E.

## Round 6 — Delivery Integration Delta (IR-004, DR-001, CRR-009)

- **Scope:** delivery's merge `1dd3cedadf` (origin/personal `2d076088dd` into the branch), its blocker record `1251a9b491`, and the test-only fix `217430a404`.
- **Merge:** `git show --remerge-diff` is empty, so the merge had no conflicts and no hand-made resolution.
  - The only `src` overlap with this branch is `app-data-migration-registry.ts`. Upstream added `ProjectTaskKeysV1AppDataMigration` (project files, independent of memory trees), and ours is still registered last.
  - The upstream Task-key changes in `root-task-execution-lifecycle.ts` and the projects code don't touch the memory layout.
  - Reviewer: tsc on the merged HEAD exits 0.
- **`217430a404` (tests only, no `src`):**
  - `team-run-v1-production-upgrade`: the Org's configured-team task execution is asserted as a link without `settledAt`. Current saves already drop `settledAt` (asserted at base by `team-run-current-package-schema`), so this isn't new data loss. It also asserts the task agent's own file at L1 (`origin: configured_place`, the place's definition, the Org coordinating run). The mixed-root case asserts `WAITING_FOR_PREDECESSOR` while `20260901` is FAILED (`RESTART_TO_RETRY`), with the tree byte-identical and attempts 1 → 2. That matches contract §5.4, R-8 and AC-020 F-PENDING-FAILED.
  - The two `token-usage/*-backfill-startup` tests delete only their own migration rows in `beforeAll` (the helper's set is seeded with the file's migration id, so the `IN (...)` is never empty).
  - `model-metadata-provenance-graphql` binds Prisma to its own database and closes it in `afterAll`.
  - These test-isolation fixes are outside this ticket's code, but they block its merged-state validation, so fixing them here is proportionate. The shared-database pattern is sent as a follow-up.
- **Evidence:** `evidence/implementation/IR-004-server-e2e-merged.log`: 161 files, 113 pass, 47 skipped, 1 failed (`terminal-websocket-lifecycle`, known, autobyteus-59). The four changed files and the TAU file pass.

## Round 5 — CR-004 Delta (IR-003, CRR-007)

- `3e3a7b08cc` changes one source file and one test:
  - `AgentMemoryExplorerService` gets an injectable `AgentDefinitionLookup`. By default it's the process `AgentDefinitionService`, imported lazily, the same pattern as the history catalog's `resolveAgentName`.
  - After grouping, a group no history row named takes the definition's name (`getAgentDefinitionById(...).name`).
  - It falls back to the id when the definition isn't found, or when the lookup throws (one warning).
- Groups already named by a history row are unchanged, and search sees the resolved name.
- Reviewer checks:
  - `--noUnusedLocals` shows no hit in the file; tsc is clean.
  - `agent-memory-explorer-task-agents.test.ts`: 3/3, including the new DEC-018 case ("Code Reviewer" shown; the missing definition "retired-agent" shows its id; search by name).

## Round 4 — Requirement Refinement DEC-018 (CRR-005)

- **Trigger:** API/E2E observed (API-REV-001) that the Memory page group label of an agent task agent shows the definition id (`code-reviewer`), not its name. The Solution Designer decided **DEC-018** (requirements-doc.md:232), a refinement of D-5: task agents are grouped under the agent definition and show its **name**, as other groups do; the id is used only when the definition can no longer be found. It is in scope and routed through this review as a local fix.
- **Cause in code:** `agent-memory/services/agent-memory-explorer-service.ts:134-142` takes the group name only from a history index row (`catalogRow.agentName`). Task agents never have one (G1), so a group holding only task agents falls back to `agentDefinitionId`.
- **Also recorded:** DEC-017 (requirements-doc.md:231). REQ-017 is unchanged, and AC-020's locator-pending sub-case counts as verified by composition: locator-v1 repointed to its frozen copy (reviewer confirmed: 1–2 line import repoints), registry order proven end to end, the per-run gate unit-tested. No follow-up test.

## Round 3 — Full Review Completion (CRR-003)

**Correction to round 1.** Round 1 was recorded as a `Full Review`, but it read in full only these modules:
- the split write, message logs and the three migration files;
- the metadata store, team tree store, standalone store and placement module;
- own-file IO, the link check, the validator and the explorer.

Every other file got only mechanical checks (typecheck, unused locals, size). This round reads the rest.

**Read in this round:**
- **D-1 record mapping (`task-agent-own-records.ts`), own-file schemas, team own-tree type, tree shapes, link schema, Org tree store.**
  - Catalog and configured-place records round-trip.
  - A team copy's record lists every member from its runtime node's children (`projectTaskTeamExecution`), so `source.members` rebuilt from the own tree is complete even with lazy member start.
  - `AgentLaunchConfiguration` has exactly the five fields the own file stores.
  - A catalog own file must record its launch; a configured-place file may record none (U-4).
- **D-4 across the three families.**
  - The team and Org message stores and all three persistence coordinators have the same shape: `not_renamed` → cancel; indeterminate → latch and fail-stop.
  - Log owners come from placement in all three roots (the standalone host maps to the coordinating log).
  - Every composed read (loaders, validator, managers, projection service) passes the composed tree. The only raw reads are the deliberate no-tree cases.
- **D-2 placement switch.**
  - `AgentRunMemoryLocator` replaces the rooted locator.
  - Handles and registries are given a placement when they're built: a run part, `TASK_AGENT_PLACEMENT`, or a task team's member placement through `TeamRunContext.teamKind` (`configured` for team runs and mounted teams, `task` for copies).
  - The three indexes' `getMemoryPlacementForAgent`, the three location services and the adapters' restore checks all use the placement.
  - The location services now read through the stores, so the trees they read are composed.
  - No agent memory path is composed outside the layout. Context files take `owner.memoryDir` from the location services.
- **U-5 mutators.** The three mutators append at the root only, and the team adapter's host is always the root TeamRun.
- **D-9.** All 13 frozen modules match their sources apart from documented changes: the readers swapped to the released readers, and the released Org catalog keeps its own state. The repointed collaborators-v1 writes with the atomic writer and reads back with the frozen readers. The state classifier reads the team log directly. The registry registers ours last.
- **D-10.** Reviewer search: outside migrations, the only versioned names are the migration-ID constants and `teamRunV2Status`, plus web `deepSeekV4Schema` (a model name, exempt). No file names carry versions.
- **Web D-7 text** (en, zh-CN, the hard-coded strings in the composable). **Docs:** no remaining references to the old nested layout or the removed modules.
- **Tests.** In the most-changed tests, assertions were strengthened, not weakened. For example, `team-run-current-package-schema` now asserts the link-only key set on disk and exact composition.

**New candidates:**

| Candidate ID | Observation | Disposition |
| --- | --- | --- |
| C-8 | After U-5, a composed `TaskTeamExecution.taskExecutions` is always empty (compose sets `[]`, the own-tree schema rejects entries, mutators append at the root). So in Agent roots, the handling of a task execution hosted by a task team is unreachable: `standalone-root-task-execution-adapter.ts` cancel, release, discard, status, isLive, restore (`teams.require(...).restoreTaskAgent/restoreTaskTeam`) and shutdown team-host branches; `standalone-root-message-delivery.ts:224`; and the nested visit in the three indexes' `visitTeamContents`. In Org roots the same branches stay live for C6 (tasks hosted by a mounted team). | Follow-up FU-4, not this ticket. The design keeps the in-memory record types unchanged on purpose (Key Tradeoffs: "28 consumers untouched"; U-5 asked only for the append path to be removed). Removing these branches is the in-memory narrowing the design deferred, and the change works without it |
| C-9 | The frozen `released-memory-locations-before-task-agent-own-run.ts` imports the current `TeamExecutionIndex` / `AgentOrgExecutionIndex` (documented: "their results are unchanged by task-agent-own-run"). The state classifier uses the current message schema. | Not a finding: D-9 froze today's behavior and these results are unchanged. Recorded as a residual risk and folded into FU-4, because narrowing those indexes would change released-migration behavior |
| C-10 | The readiness validator now composes every coordinating run's task agents and logs at startup | Reject: this is the accepted H2 cost (contract §0); lazy loading is the accepted follow-up |

No new finding. The round-2 result stands.

## Round 2 — Delta (IR-002)

- **CR-001:** the six declarations are removed. The two migrations take `memoryDir` as a plain constructor argument (same signature). Reviewer: `tsc --noUnusedLocals` shows 0 hits in files touched by `66429d6f31..HEAD`, and tsc exits 0.
- **CR-002(a):** `AgentRunMetadataStore.readTaskAgentMetadataStateSync` and the async reader share one parse function (`taskAgentMetadataState`), and `TaskAgentOwnFiles.readAgentSync` delegates to the store. **CR-002(b):** recorded as Deviation 2 in the handoff (line 110).
- **CR-003:** `TaskAgentLinkChecker` logs one warning naming the coordinating run and the reason, and keeps the skip. The new test checks the single warning and that the task agents stay unlisted.
- **Reviewer rerun:** `task-agent-own-run-stores` and `agent-memory-explorer-task-agents`: 2 files / 13 tests pass.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`.
- Design-spec behavior map verified against the implementation: `Yes`, for DS-001, DS-003, DS-004, DS-005, DS-006, DS-007 and DS-008. Writes go own file first, then links, then the tree only when changed (`commitSplitTree` returns `not_renamed` when an own file failed). Composing leaves out an unavailable task agent and its dependents (L5, L6). Message appends go to the receiver's log first, and a failure after a durable log becomes `renamed_finalization_indeterminate`.
- Behavior-basis status: `Confirmed`.
- Changed or newly discovered behavior: None.

## Supported Product Scenario And Reachability Gate (Mandatory)

SCN-001..SCN-008 from the requirements (all `Supported Normal Scenario`). The startup migration's step failure and continuation are a `Supported Explicit Edge Scenario` by REQ-007 and DEC-014, limited to "the app keeps working and the next start continues".

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| C-1 | Six unused declarations in touched files | Core Principle 7 (dead code in touched files) | — | none at runtime; misleading code | `--noUnusedLocals` output | Promote → CR-001 |
| C-2 | `TaskAgentOwnFiles.readAgentSync` parses `run_metadata.json` itself, beside `AgentRunMetadataStore`, which documents itself as "the one reader and writer of `run_metadata.json`" | Design Ownership Map ("`AgentRunMetadataStore` owns `run_metadata.json`") | — | two parse paths for one file (async in the store, sync outside it) that can drift | `task-agent-own-files.ts:66-74` vs `agent-run-metadata-store.ts` `readTaskAgentMetadataState` | Promote → CR-002 |
| C-3 | Task agent team own-tree IO sits in `TaskAgentOwnFiles` instead of on the team tree store (design interface `readTaskAgentTeam/writeTaskAgentTeam`) | Design Ownership Map | — | coherent facade, but an unrecorded deviation from the design | handoff has no deviation entry | Promote → CR-002 (record the deviation, no move required) |
| C-4 | `TaskAgentLinkChecker` swallows a coordinating-tree read error (`.catch(() => new Set())`), so that run's task agents disappear from the Memory page with no warning | DESIGN.md rule 7 (a scan that skips an unreadable run logs a warning naming it) | an unreadable coordinating tree, a state rule 7 governs | Memory page scan → its task agents silently unlisted | `task-agent-link-check.ts:26` | Promote → CR-003 (Low) |
| C-5 | Nested C7 child fails, but its parent team still moves, so the child's folder is carried inside the parent's L1 folder and a retry gives the child an empty own folder | REQ-007 continuation | requires a C7 record | — | contract §6 / §12.3: C7 has 0 instances and "no released data exists"; F-C7 is built from the record type | Reject (no released producer of C7) |
| C-6 | `appendMessage` callbacks throw instead of returning a result after an earlier durable log | DEC-011 | read or validation of a corrupt or missing log | — | the writer returns results; throws come only from corrupt files or a missing host log | Reject (manual corruption is out of scope by default) |
| C-7 | The migration's target mapping calls current `taskAgentOwnMetadata` with frozen records | Data Migration Guideline current-only boundary | — | could break if the current record type changes later | design-spec Migration Plan: "target files are written with current writers" | Reject (design-approved, ARCH-REV-004); noted as residual |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | in-memory types unchanged; split and compose only in the stores | — |
| Matches behavior-defining supplement | Pass | L1, L4–L6, §3.4 email model, §8 steps and dispositions, the §5.4 gate | — |
| Data-flow spine clarity | Pass | DS-001/003/005 visible in the stores; placement is one module | — |
| Ownership boundary preservation | Fail | C-2 (a second parser of `run_metadata.json`); C-3 deviation unrecorded | CR-002 |
| Off-spine concern clarity | Pass | link check, message-log owners and placement each have one owner | — |
| Existing capability reuse | Pass | atomic writer, tree stores, migration runner, rename pattern | — |
| Reusable owned structures | Pass | `CoordinatingTreeShape` per family; one compose/split for three stores | — |
| Shared-structure tightness | Pass | the link is a strict subset of the record; `TaskAgentSection` is the only new persisted structure | — |
| Repeated coordination ownership | Pass | owner resolution through `messageLogOwners` in all three roots | — |
| Empty indirection | Pass | `TaskAgentOwnFiles` adds placement and log creation, not just a pass-through | — |
| Separation of concerns / file responsibility | Pass | split, records, files, logs and link check are separate modules | — |
| Ownership-driven dependencies | Pass | `agent-memory/domain` imports no family; the migration's source side imports only `legacy/` | — |
| Authoritative Boundary Rule | Fail | C-2: own-file IO depends on the metadata store and re-reads its file directly | CR-002 |
| File placement | Pass | own-file IO in `run-history/store`; placement in `agent-memory/domain` | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface clarity | Pass | `readTaskAgentMetadataState` / `writeTaskAgentMetadata`; G1 and G2 inside the readers | — |
| Naming | Pass | D-10 removed version names; new names are in the collaboration vocabulary | — |
| No unjustified duplication | Fail | C-2 duplicates the task-agent metadata parse | CR-002 |
| Patch-on-patch control | Pass | — | — |
| Dead code removed in touched files | Fail | C-1 | CR-001 |
| Tests clear and requirement-aligned | Pass | 28 new tests map to AC-003/013/014/017/018/021 and the migration ACs | — |
| Test fixtures reusable | Pass | `released-task-agent-layout-fixtures.ts` builds every shape | — |
| No stale tests | Pass | layout and nested tests updated per the inventory | — |
| API/E2E readiness | Pass | AC-016 recipe and coverage hints in the handoff | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Before | After | `>500` | Delta | `>220` Delta | Judgment |
| --- | --- | --- | --- | --- | --- | --- |
| `run-history/store/task-execution-tree-split.ts` | new | 264 | Pass | +303 | Yes | one concern (compose, split, commit); acceptable |
| `run-history/store/task-agent-own-records.ts` | new | 237 | Pass | +256 | Yes | record ↔ own file mapping; acceptable |
| `migrations/task-agent-own-run-v1/coordinating-run-migration.ts` | new | 241 | Pass | +265 | Yes | one run's migration steps; acceptable |
| frozen copies under `legacy/released-run-package-shapes/` | new | ≤380 | Pass | ≤+395 | Yes | verbatim copies; size not applicable |

No changed source file is over 500 effective lines.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | no dual read: a full record without an own file is not loaded (L6) |
| No legacy retention | Pass | `rooted-agent-memory-locator.ts` and the runtime classifier removed |
| Dead code removed in touched files | Fail | CR-001 |
| Persisted-data transition followed | Pass | `Migration Required`, implemented as designed |
| No version-specific dual reads/writes | Pass | old shapes read only through `legacy/` in the migration |
| Transition mechanics match the design | Pass | rename not copy; per-run containment; gate; `PRESERVED_*` warnings; no prerequisites |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

| Item / Path | Type | Evidence | Action |
| --- | --- | --- | --- |
| `agent-org-execution/services/agent-org-execution-tree-location-service.ts:175` `required` | DeadCode | TS6133 | remove |
| `agent-team-execution/local/registries/task-agent-execution-registry.ts:7` `PreparedTaskExecution` import | DeadCode | TS6133 | remove |
| `app-data-migrations/migrations/migrate-native-working-context-snapshots-v5-migration.ts:70` `memoryDir` property | DeadCode | TS6138 | drop the unused parameter property (no behavior change) |
| `app-data-migrations/migrations/team-run-migration-state-classifier.ts:123` `memoryDir` property | DeadCode | TS6138 | same |
| `application-platform/execution/application-execution-scope-kernel-builder.ts:16` `createTeamFlatExecutionCallbacks` import | DeadCode | TS6133 | remove |
| `services/team-communication/team-communication-projection-service.ts:12` `TeamCommunicationReferenceFileType` | DeadCode | TS6196 | remove |

All six were already present at base `66429d6f31`, in files this change touches.

## Docs-Impact Verdict

- Docs impact: `Yes`, handled. The module docs, `memory_sync.md`, `collaboration_model.md` (CM-8/CM-9), `startup_initialization_and_lazy_services.md` and the DESIGN.md rule 8 example are updated.

## Additional Material Premise Validation (When Required)

None beyond C-5..C-7 (rejected above).

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3 (rounds 2–3)
- Overall score (`/100`): 93

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.3 | delegate, load, message and migration spines are clear and match the design | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.3 | one parser of `run_metadata.json` in its store; team own-tree placement recorded (Deviation 2) | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.2 | state-returning readers; `not_renamed` / indeterminate results reuse the writer contract | — | — |
| 4 | Separation of Concerns and File Placement | 9.2 | small single-concern modules | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.3 | link ⊂ record; one new persisted section | — | — |
| 6 | Naming Quality and Local Readability | 9.2 | version-free names; collaboration vocabulary | — | — |
| 7 | API/E2E Readiness | 9.1 | strong unit coverage; AC-016 recipe ready | real-app journey not run | API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | L4/L6 save safety, fail-stop message order, per-run containment; the unreadable-tree skip now warns (rule 7) | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | clean cut; frozen copies isolated | — | — |
| 10 | Cleanup Completeness | 9.3 | every obsolete path removed; `--noUnusedLocals` clean in the touched files | — | — |

## Findings

CR-004 is resolved in IR-003 (`3e3a7b08cc`); none are open. Round 4 record:

| ID | Severity | Classification | Location | Evidence | Required Action |
| --- | --- | --- | --- | --- | --- |
| CR-004 | Low | `Local Fix` | `agent-memory/services/agent-memory-explorer-service.ts:134-142` | DEC-018: a group of task agents must show the agent definition's name; today it shows the id because only history rows supply the name | When no history row gives a name, resolve the group's display name from the agent definition, keeping the id only when the definition can't be found. Add a unit case (a task-agent-only group shows the name; a missing definition shows the id) |

CR-001..CR-003 are resolved in IR-002 (`2f7f5b3f4b`). Round 1 record:

| ID | Severity | Classification | Location | Evidence | Required Action |
| --- | --- | --- | --- | --- | --- |
| CR-001 | Low | `Local Fix` | the six items under Dead / Obsolete | `tsc --noUnusedLocals`; present at base, in touched files (Core Principle 7) | remove them; confirm `--noUnusedLocals` is clean for the touched files |
| CR-002 | Low | `Local Fix` | `run-history/store/task-agent-own-files.ts:66-74` (`readAgentSync`); team own-tree IO in the same file | C-2, C-3 | (a) move the sync task-agent read into `AgentRunMetadataStore` (e.g. `readTaskAgentMetadataStateSync`) so one owner parses `run_metadata.json`; (b) record in the handoff, as a deviation, that task agent team own-tree IO lives in `TaskAgentOwnFiles` instead of `TeamRunExecutionTreeStore` (moving it is not required) |
| CR-003 | Low | `Local Fix` | `run-history/store/task-agent-link-check.ts:26` | C-4; DESIGN.md rule 7 | keep the skip, but log one warning naming the coordinating run and the reason when its tree cannot be read |

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why outside | Suggested Task description |
| --- | --- | --- | --- | --- |
| FU-1 | `AgentMemoryLocationService.getTeamAgentRunLocation` is dead | no caller in `src`; only `tests/unit/agent-memory/agent-memory-location-service.test.ts:226`; the source file is untouched | outside the touched files | remove the method and its test |
| FU-2 | The released `20260701` projection migration rewrites a current team log on a fresh ledger into a shape the current reader rejects | handoff Follow-ups; `collaborators-to-delegated-runs-startup` e2e reports `PRESERVED_UNREADABLE_LOG` | a released migration's behavior on a fresh ledger, not this change | investigate whether a fresh-ledger install can reach it; if so, fix through a frozen-copy or ledger rule |
| FU-3 | Pre-existing failing tests | handoff list (team-run-v1-production-upgrade, memory-sync-multiprocess "agentDefinitionId at '/nested'", agent-command-correlated-status, standalone-error-termination-lifecycle, configured-skill-on-demand-loading, terminal-websocket-lifecycle), verified with this ticket's work stashed | not caused by this change | one Task to fix each from its cause |

- FU-4 (CRR-003): narrow the in-memory `TaskTeamExecution.taskExecutions` to empty, and remove the nested-task handling (C-8). The frozen memory-location classifier must keep its own nested walk before the current indexes are narrowed (C-9).
- Sent to: `/project_task_manager` (CRR-001 and CRR-003 follow-up messages). Recorded:
  - FU-1 joined dead-code Task `147878ee` (autobyteus-125).
  - FU-2 is the new Task autobyteus-131.
  - FU-3: most of these were fixed by the baseline repair Task `6834441c` (merge `ec934ca753` on `personal`, after this branch's base `66429d6f31`). agent-status-websocket is the content-cadence product defect, Task `4577620f`; terminal-websocket-lifecycle went into Task `0c7efc37` (autobyteus-59).

## Classification

N/A (Pass). CR-001..CR-004 are resolved.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (primary: rerun the Memory page coverage on `3e3a7b08cc`); `/software_engineering_team/implementation_engineer` (informational).

## Residual Risks

- C-7: the migration maps frozen records with the current own-file builder (design-approved). A later change to the current record type must keep the migration compiling and correct.
- H2 cost: 500 task agents compose in about 21 ms, and a Settings save takes about 74 ms (implementer's measurements). Lazy loading is the accepted follow-up.
- `20260521_run_history_index_v2` retry indexing task agents' rows: recorded by the implementer; the rows are never listed.
- The user's "Dilan principle" is undefined. No repo or skill document names it; the reviewer applied DESIGN.md and the shared principles.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 6, Targeted Delta Review of the delivery merge and IR-004)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10; every category ≥ 9.0
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: API/E2E re-validates the merged state by impact (the merge diff and the IR-004 tests), then the test-code review follows, then delivery.
