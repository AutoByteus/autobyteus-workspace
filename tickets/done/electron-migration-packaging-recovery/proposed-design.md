# Electron Migration And Packaging Recovery — Proposed Design

## Design Version

- Current Version: `v8`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| `v1` | Initial draft | Defines state-aware TeamRun migration recovery, generic runner prerequisites, durable fixtures, and Electron dependency-boundary correction. | Not yet reviewed |
| `v2` | Stage 5 `F-001` design-impact re-entry | Adds shared protected predecessor source resolution and an interrupted-promotion recovery use case so canonical never parses live V1 targets as predecessor data. | Round 1 |
| `v3` | Stage 5 `F-002` design-impact re-entry | Makes the generic prerequisite truth table and attempt/manual outcomes explicit for every persisted status. | Round 3 |
| `v4` | Stage 10 user-verification requirement-gap re-entry | Assigns released communication-address normalization to retryable `20260814`, extracts one migration-owned normalizer shared with the terminal older migration, and adds operational-equivalent retry/idempotency coverage. | Pending re-entry review |
| `v5` | Stage 6 source-preflight design-impact re-entry | Reuses and extracts the existing canonical exact/segment converter as one general migration-owned execution-address normalizer shared by canonical structured conversion, the older communication migration, and retryable V1 planning; keeps projection-only flat fields in the older migration. | Pending re-entry review |
| `v6` | Stage 5 round 8 `F-003`/`F-004` design-package re-entry | Makes task design health/refactor posture and supplemental-artifact relationships explicit, removes remaining communication-only ownership wording, and preserves the already-validated v5 runtime behavior. | Pending re-entry review |
| `v7` | Stage 10 `UV-002` requirement-gap re-entry | Adds migration-owned Team history-index reconciliation from validated V1 trees, one shared current-tree row projector, strict/atomic index persistence, partial-cohort visibility, GraphQL/sidebar validation, and explicit rejection of runtime fallback or standalone-Agent duplication. | Pending re-entry review |
| `v8` | Stage 5 round 13 `F-006` design-impact re-entry | Tightens the persistence interface: `readIndexStrict()` returns one immutable store-owned snapshot with normalized rows, source existence, and canonical source path; the reconciler uses that snapshot for equality and backup without duplicating index-path policy. | Round 13 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/electron-migration-packaging-recovery/investigation-notes.md`
- Requirements: `tickets/in-progress/electron-migration-packaging-recovery/requirements.md`
- Requirements Status: `Refined`
- Shared Design Principles: `software-engineering-workflow-skill/shared/design-principles.md`

## Summary

Two branch-only defects are corrected at their authoritative boundaries:

1. TeamRun app-data migration gains one read-only state classifier and runner-owned prerequisite admission. A missing `team_run_metadata.json` is no longer automatically fatal: a complete validated V1 root is skipped as current, and a positively validated historical manifest-only root is skipped as out of scope. Unknown, malformed, and partial roots still fail safely.
2. `@autobyteus/team-stream-contracts` moves from the web app's production dependencies to development dependencies. Nuxt can still bundle its runtime schemas, while Electron Builder no longer traverses its external pnpm workspace link as a production Node module.

3. The retryable `20260814_team_run_execution_tree_v1` transition no longer assumes that terminal `20260701` and `20260801` records imply exact communication addresses. During predecessor package planning it normalizes exact or released segment-based address evidence through one migration-owned converter, resolves current V1 AgentRun IDs, and promotes only after complete cohort validation.

4. The same retryable V1 transition reconciles `team_run_history_index.json` from every validated current or successfully promoted execution tree. The current runtime stays index-driven; after startup rebuild, GraphQL and the workspace sidebar can discover all validated Team runs without scanning package directories or fabricating standalone Agent history.

The design also removes the existing custom-provider-specific prerequisite guard in favor of the same generic runner contract, promotes V1's private protected-backup lookup into one migration-owned predecessor source resolver, and relocates migration fixtures out of the archived ticket.

## Goal / Intended Change

- Let the observed legitimate mixed TeamRun cohort converge on retry without manual user-data repair.
- Prevent a successor migration from changing filesystem state after its prerequisite failed.
- Keep invalid or ambiguous roots visible and byte-preserving rather than broadly ignoring missing files.
- Make the canonical Linux x64 Electron build work with ordinary pnpm workspace links.
- Leave `/home/ryan-ai/.autobyteus/server-data` untouched during implementation and validation.
- Let an already-failed `20260814` attempt recover automatically even when both earlier migration records are terminal successes; do not require record surgery or a new migration ID.
- Make validated migrated TeamRun packages discoverable through the existing Team history and workspace-history APIs before `20260814` reports success, without changing public GraphQL/UI contracts.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved Intent / Acceptance | Approved Trigger / Contract | Existing Evidence | Approved Change / Preserved Outcome | Target Path / Spines |
| --- | --- | --- | --- | --- | --- | --- |
| `UC-MIG-001`–`008` | System/Operational | `R-MIG-001`–`010`; `AC-MIG-001`–`010` | Embedded-server startup or manual migration execution | Investigation migration spine, mixed-state logs, and current code | Preserve dependency-aware continuation while making root-state, prerequisite, protected-source, and retry behavior safe | startup -> runner -> classifier/resolver -> canonical/V1 -> record; `DS-MIG-001`–`007` |
| `UC-MIG-009` | System/Operational | `R-MIG-011`–`014`; `AC-MIG-011`–`014` | Startup retries persisted failed `20260814` after terminal prerequisites | Read-only operational records/log plus three current converter call sites | Normalize exact/released address values in retryable V1 planning, promote only a fully valid cohort, and make later startup a no-op | startup -> runner -> V1 planner -> shared normalizer -> execution index -> promoter; `DS-MIG-001,003,008` |
| `BEH-MIG-010` / `UC-MIG-010` | User/System/Operational | `R-MIG-015`–`020`; `AC-MIG-015`–`020` | AppImage startup completes V1 migration, package catalog rebuild, GraphQL workspace history, and sidebar render | `UV-002` read-only V1 packages/index/GraphQL evidence plus current history services | Reconcile exactly one persisted Team history row per validated V1 root; expose five superrepo Team runs; preserve index-only fields; exclude unresolved roots and standalone duplication | startup -> V1 tree cohort -> history reconciler/store -> package catalog -> Team/workspace history -> sidebar; `DS-MIG-009,010` |
| `UC-PKG-001`–`003` | Operational | `R-PKG-001`–`005`; `AC-PKG-001`–`005` | Canonical Linux x64 Electron build and AppImage launch | Packaging failure log, manifest/lockfile/link evidence | Preserve Nuxt build availability while removing contract package from Electron production graph; start packaged server normally | build -> guard/Nuxt -> Electron Builder -> AppImage -> embedded server; `DS-PKG-001,002` |
| `UC-TEST-001` | Contract | `R/AC-TEST-001` | Durable repository test execution | Ticket-path references in current tests | Repository-owned fixtures remain valid after ticket archival | test runner -> repository fixture -> disposable migration environment; migration spines |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related Scope | Relationship / Status |
| --- | --- | --- | --- |
| `future-state-runtime-call-stack.md` | Exact primary/fallback/error paths and mutation boundaries | All, especially `UC-MIG-009`/`010` | v6 is historical; v7 must be regenerated after this design review |
| `workflow-state.md` | Stage/edit-lock/re-entry authority | All | Append-only current process context |
| `implementation.md` | File/test plan and preserved completed work | All | Source locked until review pass |
| `design-review-report.md` and `architecture-review-revision-record.md` | Canonical architecture verdict/finding chronology | All | Round 1 findings drive v6 |
| `future-state-runtime-call-stack-review.md` | Workflow review rounds and clean-streak gate | All | Round 8 reset; two clean rounds still required |

The complete canonical inventory, including retained downstream re-entry evidence, is in `investigation-notes.md`.

## Task Design Health Assessment

- Change posture: `Bug Fix` with a bounded migration ownership refactor and an independent packaging dependency correction.
- Current design issue found: `Yes` in migration code; the packaging defect remains local to dependency classification.
- Root cause classification: `Duplicated Policy Or Coordination` for exact/segment execution-address conversion plus `Missing Invariant` and a bounded `Boundary Or Ownership Issue` because V1 package convergence did not own convergence of its required persisted Team history projection.
- Refactor needed now: `Yes`, bounded to app-data migration conversion code.
- Evidence: canonical already owns exact/segment conversion, the older projection migration duplicates it while also owning a distinct flat projection adapter, and V1 needs the coherent exact/segment rule during failed retry.
- Design response: retain the reviewed address-normalizer design; additionally extract the current execution-tree-to-history-row mapping from `TeamRunHistoryCatalogService`, add a V1 migration-owned reconciler that strictly reads/preserves/projects/atomically writes the complete index, and keep runtime history index-driven.
- Refactor rationale: adding index writes directly inside the V1 orchestration method would duplicate current row projection rules, while runtime directory scanning would establish a second authority. One shared current-schema projector plus one migration-only reconciler preserves ownership and removes the existing private projector duplication.
- Intentional deferrals/residual risk: the separately diagnosed live Team-stream status-contract and Prisma/token-ledger mismatches belong to a future ticket. They do not own or block this migration conversion, packaging build, or their durable tests.

## Persisted Data / State Transition Decision

- Stored subject: TeamRun predecessor metadata/task/communication files, validated current V1 packages, `memory/team_run_history_index.json`, and migration ledger records under the app-data root.
- Semantic change: predecessor address evidence must resolve to current V1 sender/receiver AgentRun IDs and every validated current package must have exactly one current Team history projection before the migration can be considered converged.
- Decision: `Migration Required` within the existing failed/unreleased `20260814_team_run_execution_tree_v1` startup boundary.
- Rationale: current runtime cannot directly use predecessor address objects and historical runs are user history, so discard/rebuild is unacceptable. In-memory conversion plus existing complete-cohort validation/protected promotion is lower risk than independent source rewriting or a runtime dual reader.
- Ordering/completion: the runner admits V1 only after canonical terminal success; the V1 ledger record is the completion marker; terminal `20260701`/`20260801` records remain unchanged.
- Restart safety: a failed record is retried; protected predecessor source resolution handles interrupted promotion; successful records skip later starts without new attempts or writes.
- Validation/recovery: normalize and validate all planned packages before promotion; then reconcile all currently validated/successfully promoted trees through a strict index read, deterministic projection, optional protected backup, and atomic write. Index failure preserves prior index/package bytes and remains retryable.
- Runtime cutover: V1 persists only current AgentRun IDs; historical decoding remains migration-owned, so concurrent mixed-schema runtime access is not introduced.

## Legacy Removal Policy

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the V1 migration's broad `Ignored non-predecessor incomplete TeamRun residue` fallback.
- Remove unconditional predecessor parsing from the token task-Team index.
- Remove the custom-provider-specific prerequisite guard and its specialized error type.
- Do not add a runtime dual reader, fabricated metadata, an ignore-all-`ENOENT` branch, link materialization, or a packaging workaround.
- Historical formats remain readable only inside the one-time migration classifier/converters.

## Requirements And Use Cases

| Requirement Group | Description | Acceptance Criteria | Use Cases |
| --- | --- | --- | --- |
| `R-MIG-001`–`R-MIG-003` | One authoritative TeamRun migration-state model | `AC-MIG-001`, `002`, `009`, `010` | `UC-MIG-001`–`005`, `007` |
| `R-MIG-004`–`R-MIG-005` | Runner-owned prerequisite admission | `AC-MIG-005`, `006` | `UC-MIG-001`, `006` |
| `R-MIG-006` | State-aware task-Team token evidence | `AC-MIG-003` | `UC-MIG-003`, `004`, `007` |
| `R-MIG-007`–`R-MIG-010` | Mixed-state convergence, idempotency, and safety | `AC-MIG-007`–`010` | `UC-MIG-002`–`005`, `UC-MIG-008` |
| `R-MIG-011`–`R-MIG-014` | Released communication-address normalization owned by retryable V1 planning | `AC-MIG-011`–`014` | `UC-MIG-004`, `UC-MIG-009` |
| `R-MIG-015`–`R-MIG-020` | Validated V1 Team history-index convergence, visibility, preservation, failure atomicity, and idempotency | `AC-MIG-015`–`020` | `UC-MIG-004`, `UC-MIG-010` |
| `R-PKG-001`–`R-PKG-005` | Correct Electron production dependency boundary | `AC-PKG-001`–`005` | `UC-PKG-001`–`003` |
| `R-TEST-001` | Server-owned reusable fixtures | `AC-TEST-001` | `UC-TEST-001` |

## Current-State Read

| Area | Findings | Evidence | Open Unknowns |
| --- | --- | --- | --- |
| Startup migration flow | Registry order exists, but the runner attempts every required definition after failure. | `app-data-migration-runner.ts`, `app-data-migration-registry.ts` | None for design. |
| TeamRun root admission | Canonical assumes every directory is predecessor input; V1 separately guesses current/residue state. | `team-canonical-identity-migration.ts`, `team-run-execution-tree-v1-app-data-migration.ts` | Exact malformed-state messages will be finalized during implementation. |
| Token task-Team evidence | Every task file is parsed as predecessor format. | `token-usage-task-team-run-index.ts` | None for design. |
| Existing prerequisite behavior | One custom-provider migration reads migration records through its own guard inside `execute()`. | `custom-provider-readable-id-prerequisite-guard.ts` | None; source callers use the runner as the public entrypoint. |
| Electron packaging | A frontend build input is declared as a production Node dependency, causing Electron Builder to traverse its external workspace link. | `autobyteus-web/package.json`, DR008 build log | Full build remains Stage 7 evidence. |
| Test ownership | V1 tests load files from an archived ticket directory. | `team-run-execution-tree-v1-app-data-migration.test.ts` | Which additional synthetic mixed fixtures are smallest is an implementation detail. |
| Communication address transition | The older migration's current source can normalize segment addresses, but affected machines already record its ID as `SUCCEEDED`; V1 directly requires exact addresses. | `team-communication-projection-address-migration.ts`, `predecessor-team-run-evidence.ts`, `predecessor-task-package-converter.ts`, operational migration/log evidence | None; failed `20260814` is the retryable owner. |
| Team history projection | Eight validated V1 packages exist, but the persisted index has two rows; the runtime catalog only filters existing rows and workspace history therefore has no superrepo group. | Operational V1 trees/index/GraphQL response; `team-run-history-catalog-service.ts`, `team-run-history-service.ts`, `workspace-run-history-service.ts` | None for direction; exact projector/reconciler signatures remain Stage 4 review detail. |

## Current State (As-Is)

- Prisma/database migrations succeed; app-data migration fails afterward.
- Canonical identity treats missing metadata as fatal even for legitimate historical and already-current roots.
- V1 can run after canonical failure, promote some roots, and create a mixed state the next canonical retry cannot understand.
- The custom-provider migration and the runner each contain different prerequisite admission models.
- Electron preparation and Nuxt generation succeed, but Electron Builder fails when it walks `autobyteus-web/node_modules/@autobyteus/team-stream-contracts` outside the app root.
- Real-data verification has `20260701=SUCCEEDED`, `20260801=SUCCEEDED`, and `20260814=FAILED`; four otherwise-valid predecessor roots contain released segment addresses that strict V1 planning rejects before promotion.
- After the address fix, `20260814=SUCCEEDED` and all eight V1 packages validate, but only two index rows exist. Five correct superrepo Team runs remain invisible because the migration never reconciles the Team history projection.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-MIG-001` | Primary End-to-End | Embedded server startup | Required migrations represented as terminal/blocked statuses | `AppDataMigrationRunner` | Preserves independent continuation while stopping invalid dependent execution. |
| `DS-MIG-002` | Primary End-to-End | Team root directory | Canonical metadata/task/token state or a safe skip/failure | `TeamCanonicalIdentityMigration` | Fixes the startup blocker without treating all missing files alike. |
| `DS-MIG-003` | Primary End-to-End | Canonical success | Complete validated execution-tree V1 package | `TeamRunExecutionTreeV1AppDataMigration` | Makes the successor retry-safe and state-aware. |
| `DS-MIG-004` | Primary End-to-End | Manual migration request | Snapshot or typed prerequisite error | `AppDataMigrationRunner` | Ensures manual execution cannot bypass admission. |
| `DS-MIG-005` | Bounded Local | One Team root | One discriminated migration state | `TeamRunMigrationStateClassifier` | Centralizes filesystem evidence interpretation. |
| `DS-MIG-006` | Bounded Local | Classified roots | Task-Team run lookup or exact issues | `buildTokenUsageTaskTeamRunIndex` | Prevents current V1 task files from entering predecessor parsing. |
| `DS-MIG-007` | Bounded Local | Classified predecessor root | Live or protected predecessor task/message paths | `TeamRunPredecessorSourceResolver` | Makes interrupted V1 promotion retryable without parsing live V1 targets as predecessor files. |
| `DS-MIG-008` | Bounded Local | One predecessor execution-address value | Exact rooted `TeamExecutionAddress` | `TeamExecutionAddressNormalizer` | Reuses one exact/segment translation rule across migration consumers before V1 AgentRun resolution, without changing runtime schemas or requiring terminal migrations to rerun. |
| `DS-MIG-009` | Primary End-to-End | Embedded server startup with current/promotable Team roots | Workspace sidebar exposes every validated Team run under its canonical workspace | `TeamRunExecutionTreeV1AppDataMigration` for transition; current Team/workspace history boundaries for reads | Closes the observed gap between validated package admission and user-visible history without adding runtime fallback. |
| `DS-MIG-010` | Bounded Local | Validated V1 tree cohort plus strict current index | Deterministic atomically committed Team history index or byte-preserving failure | `TeamRunHistoryIndexReconciler` | Makes current projection completeness, field authority, preservation, failure, and idempotency explicit. |
| `DS-PKG-001` | Primary End-to-End | Canonical Linux x64 build command | AppImage | Web/Electron build pipeline | Removes the external-link packaging failure at dependency classification. |
| `DS-PKG-002` | Return-Event | Produced AppImage launch | Health response and clean shutdown | Embedded server manager | Proves the artifact still contains a working server. |

## Primary Execution / Data-Flow Spines

- `DS-MIG-001`: `Electron start -> server-runtime bootstrap -> AppDataMigrationRunner.runPending -> prerequisite admission -> migration definition -> migration record snapshot -> startup gate`
- `DS-MIG-002`: `agent_teams directory -> shared classifier -> canonical predecessor converters / safe current-or-residue skip -> state-aware token planner -> atomic persistence -> canonical result`
- `DS-MIG-003`: `canonical terminal success -> runner admission -> shared classifier -> predecessor source resolver -> migration execution-address normalizer -> package planner/complete cohort validation -> promoter or current/residue skip -> V1 result`
- `DS-MIG-004`: `GraphQL manual request -> AppDataMigrationRunner.runMigration -> prerequisite admission -> definition or typed rejection -> GraphQL result/error`
- `DS-PKG-001`: `canonical build command -> web boundary guard -> Nuxt generation -> Electron TypeScript build -> Electron Builder production-dependency discovery -> ASAR/AppImage`
- `DS-PKG-002`: `AppImage -> Electron server manager -> packaged server process -> Prisma/app-data migration entry -> /rest/health -> clean shutdown`
- `DS-MIG-007`: `PREDECESSOR state -> target-file presence check -> live paths or latest validated protected V1 backup -> canonical validation/token evidence and V1 planner`
- `DS-MIG-008`: `predecessor execution-address value + expected root + label -> exact-address admission OR released-segment reconstruction -> root/address validation -> exact TeamExecutionAddress -> canonical/20260701/V1 consumer`
- `DS-MIG-009`: `AppImage startup -> pending V1 migration -> validated current/promoted tree cohort -> history index reconciliation -> package catalog rebuild -> TeamRunHistoryService -> WorkspaceRunHistoryService -> GraphQL -> workspace sidebar`
- `DS-MIG-010`: `validated trees + strict existing rows -> current row projection + index-only field preservation -> deterministic sort/equality gate -> protected backup when changing -> atomic index write OR contextual retryable failure`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| Server runtime | Initiates required startup migration work and consumes statuses. | Startup readiness |
| App-data migration runner | Owns ordering, prerequisite admission, attempt creation, and independent continuation. | Migration lifecycle |
| TeamRun migration-state classifier | Converts filesystem evidence into one validated state. | Safe migration routing |
| Canonical identity migration | Converts only classified predecessor identity and canonical token rows. | Canonical prerequisite |
| Execution-tree V1 migration | Promotes only classified predecessor roots after admission. | Current V1 package |
| Team history-index reconciler | Projects all validated trees into one complete persisted Team history row set. | Current Team history discoverability |
| Team history row projector | Applies one current-schema field-authority rule for runtime creation/restoration and migration reconciliation. | Valid index rows |
| Migration execution-address normalizer | Converts migration-only released/exact execution identity evidence into one exact rooted address. | Canonical task conversion, older projection conversion, and V1 predecessor message planning |
| Web boundary guard | Rejects production dependency shapes that Electron cannot safely package. | Early packaging validity |
| Nuxt | Bundles frontend contract runtime code. | Renderer assets |
| Electron Builder | Packages only actual runtime Node dependencies plus built assets/resources. | AppImage |

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-MIG-001` | The runner walks registry order. Before creating an attempt, it checks each declared prerequisite record. Terminal success permits execution; otherwise only that dependent is blocked and later independent definitions continue. | Migration definition, record, prerequisite set | Runner | Registry integrity, structured errors, logging |
| `DS-MIG-002` | Canonical identity classifies every root before touching it. It converts predecessor roots, skips validated current/residue roots, reports invalid roots, and runs token conversion only when Team identity evidence is complete. | Team root state, canonical identity | Canonical migration | Backups, classifier, token transaction |
| `DS-MIG-003` | V1 starts only after canonical success, consumes the same states, resolves live/protected predecessor sources, normalizes communication addresses in memory, validates the complete planned cohort, promotes predecessor roots, reuses validated current packages, skips positive residue, and rejects invalid roots. | Team root state, predecessor identity evidence, V1 package | V1 migration | Package planner/promoter, address normalizer, token/external-output conversion |
| `DS-MIG-009` | Startup lets V1 collect every already-current and successfully promoted validated execution tree. The migration reconciler strictly reads the old history index, projects one row per valid root while preserving index-only fields, atomically commits only when changed, and records its result before startup rebuilds package admission. Existing Team/workspace history services then expose the rows through the unchanged GraphQL/sidebar path. | Validated V1 tree, Team history row/index, workspace history group | V1 migration transition; current run-history services after cutover | Strict index store, row projector, summary recovery, backup/atomic writer |
| `DS-PKG-001` | The contract package is available during Nuxt generation but absent from production dependency discovery, so Electron Builder packages generated assets without following the workspace link. | Web build input, Electron runtime dependency | Web build boundary | Manifest, lockfile, guard, production graph test |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `AppDataMigrationRunner` | Lifecycle, concurrency, prerequisite admission, attempt creation, continuation policy | Team filesystem schema or conversion | Sole public execution boundary |
| `AppDataMigrationRegistry` | Definition inventory and dependency-order integrity | Runtime repository reads | Rejects unknown/self/later prerequisites at construction |
| `TeamRunMigrationStateClassifier` | Read-only evidence precedence and validation | File conversion, backup creation, runtime catalog admission | Shared only inside app-data migration subsystem |
| Canonical migration | Predecessor canonical conversion sequencing | Guessing current/residue formats | Receives classifier results |
| Token task-Team index | Mapping validated predecessor/current task-Team evidence | Root-state inference independent of classifier | Current V1 mapping uses validated package index |
| Predecessor source resolver | Live-versus-protected source selection and backup manifest validation | Conversion, classification, or backup mutation | Existing V1 lookup becomes the single shared policy |
| V1 migration | Package promotion and successor-level conversions | Private fallback classification | Declares canonical prerequisite |
| Team history-index reconciler | Complete validated-tree-to-index convergence, strict-read/change detection, backup sequencing, atomic commit, and migration detail | Runtime history queries, V1 package validation, standalone Agent indexing | Migration-only owner under the V1 transition; consumes current-schema structures only |
| Team history row projector | Overlapping field authority from current execution tree plus explicit preservation inputs | Filesystem I/O, predecessor decoding, migration lifecycle | Shared current-schema run-history concern used by runtime catalog writes and V1 reconciliation |
| Migration execution-address normalizer | Exact/released predecessor execution-address reconstruction and expected-root validation | Migration record admission, source-file persistence, projection-only flat-field reconstruction, runtime dual reads | Extracted from existing canonical conversion and shared only by one-time migration definitions/converters |
| Web manifest/boundary guard | Build-time versus runtime dependency classification | Embedded-server staging | Contract remains a server runtime dependency elsewhere |

## Return / Event Spines

- `runPending()` returns one status per required definition. A blocked definition returns an ephemeral prerequisite diagnostic based on its unchanged persisted record (or `NOT_RUN` when no record exists); it does not persist a fake failure or increment attempts.
- `runMigration()` propagates `AppDataMigrationPrerequisiteError` to the GraphQL boundary before any definition work.
- AppImage validation returns a health response and then a clean child-process shutdown result.

## Bounded Local / Internal Spines

### `DS-MIG-005` — root classification

- Parent owner: `TeamRunMigrationStateClassifier`
- Flow: `metadata authority check -> current-file presence matrix -> current package validation -> historical manifest validation -> discriminated state`
- Evidence precedence:
  1. A regular `team_run_metadata.json` means `PREDECESSOR`, even if target files also exist after an interrupted promotion.
  2. With no metadata, any V1 target file requires all three files and full package validation; success means `CURRENT_V1`, otherwise `INVALID`.
  3. With no metadata or V1 targets, a structurally valid `team_run_manifest.json` whose `teamRunId` matches the directory, `runVersion` is `1`, coordinator is a member binding, and bindings have required identities means `HISTORICAL_RESIDUE`.
  4. Every other shape means `INVALID` with root/path/reason context.

### `DS-MIG-006` — task-Team index

- Parent owner: canonical token conversion
- Flow: `classified roots -> predecessor task parser OR validated V1 package index OR residue skip -> duplicate/conflict/ancestor checks -> immutable index + issues`
- Historical residue contributes no mappings. Invalid roots contribute actionable issues and stop the token transaction.

### `DS-MIG-007` — interrupted-promotion source resolution

- Parent owners: canonical identity and execution-tree V1 migrations.
- Flow: `classified PREDECESSOR -> check live execution-tree target -> live task/message paths OR latest protected backup with validated manifest -> immutable source paths`.
- When no V1 execution-tree target exists, the predecessor source remains the live task/message files.
- When a V1 target exists while metadata remains authoritative, the resolver requires the latest backup manifest to match the V1 migration ID, root ID, and source root, then returns its protected predecessor task/message files.
- Canonical preflights all predecessor source paths before any cohort mutation. A protected task source is validation-only: it must already normalize as canonical predecessor evidence and is never rewritten.
- V1 consumes the same resolved paths for package planning and promotion. Missing, mismatched, or unusable protected evidence fails before new mutation.

### `DS-MIG-008` — migration execution-address normalization

- Parent owner: migration-only predecessor structured-data conversion.
- Flow: `execution-address value + expected root + contextual label -> exact four-field parse OR released segments reconstruction -> canonical rooted member address + task-Team chain + optional task-Agent run -> expected-root validation -> exact TeamExecutionAddress`.
- Extract the existing `convertLegacyConversationAddress` behavior from `team-canonical-structured-file-converter.ts` into `migrations/team-execution-address-normalizer.ts` as `normalizePredecessorTeamExecutionAddress(value, expectedRootTeamRunId, label)`. This is an ownership move and hardening of an existing capability, not a second communication-specific parser.
- `team-canonical-structured-file-converter.ts` delegates task, task-run, update sender, and update receiver addresses to the shared normalizer.
- `team-communication-projection-address-migration.ts` delegates any stored exact/segment address to the shared normalizer. Its projection-only flat sender/receiver member-path, route-key, and task-Agent fields remain a narrow local adapter that first constructs segment evidence and then delegates; they are not promoted into the general address representation.
- V1 calls the same normalizer for each predecessor communication sender/receiver while building its in-memory target messages, resolves the exact result against the planned `TeamExecutionIndex`, validates the complete V1 package, and relies on the existing cohort promoter for all persistence.
- Exact input is recreated only after validating that its `rootTeamRunId` equals the expected directory root. Segment input accepts released camel/snake field spellings where already supported, rejects missing or multiple member/task-Agent identities, unsupported segment kinds, member route/path contradictions, and root/address mismatch with the caller label before any cohort promotion.

### `DS-MIG-010` — Team history-index reconciliation

- Parent owner: `TeamRunExecutionTreeV1AppDataMigration`.
- Flow: `validated/current tree map -> TeamRunHistoryIndexStore.readIndexStrict -> immutable { rows, sourceExists, sourcePath } snapshot -> existing rows keyed by exact root ID -> TeamRunHistoryIndexRowProjector -> deterministic descending-createdAt/ID order -> equality gate -> protected backup -> atomic write`.
- Invoke reconciliation after the promotion loop regardless of unrelated root failures. The tree map contains every already-current package and every root whose promotion completed; therefore valid roots remain discoverable while invalid/unresolved roots stay absent.
- Tree-owned overlapping fields are authoritative: `teamRunId`, `teamDefinitionId`, `teamDefinitionName`, canonical workspace root, `createdAt`, and `archivedAt`. Preserve valid existing `summary` and `terminatedAt`; for a missing/empty summary, read the coordinator Agent's current raw traces best-effort and otherwise persist `""`.
- Project exactly the validated tree-map keys. Existing index rows without a validated current V1 package are removed from the changed projection; Team member Agents are never written to `run_history_index.json`.
- `readIndexStrict()` returns `TeamRunHistoryIndexSnapshot`: normalized immutable rows, `sourceExists`, and the store-owned canonical `sourcePath`. Missing yields `{ rows: [], sourceExists: false, sourcePath }`; malformed/unreadable input throws. The existing tolerant runtime `readIndex()` behavior is not used for migration and is not changed into a package-scanning fallback.
- If the projected rows equal `snapshot.rows`, record `SKIPPED` and perform no backup/write. Otherwise, only when `snapshot.sourceExists`, copy `snapshot.sourcePath` into a timestamped `backupRoot/team-history-index/<token>/team_run_history_index.json` directory with a small manifest, sync that directory, and then use the existing atomic JSON writer through `TeamRunHistoryIndexStore.writeIndex()`.
- The reconciler never recomputes or exposes an alternative Team history-index path. `TeamRunHistoryIndexStore` remains the single path/parser/writer authority; the snapshot is read-only evidence for the migration-owned transition sequence, not a general path-bypass API.
- Any read/backup/write failure adds one contextual `team-history-index` failure detail and preserves the pre-commit index and all Team packages. The overall migration stays retryable. A manual migration invocation persists the corrected index, but current package/history in-memory catalogs become visible after the normal restart/catalog rebuild boundary; no hot-reload side channel is added.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? |
| --- | --- | --- | --- |
| Migration record repository | Runner | Persist attempts and terminal outcomes | Yes |
| Registry integrity validation | Registry | Validate prerequisite IDs and prior ordering | Yes |
| Atomic backup/rename utilities | Canonical/V1 migrations | Preserve retryable bytes | Yes |
| Current V1 stores and package validator | Classifier/V1 | Parse and cross-validate three current files | Yes |
| Protected predecessor source resolver | Canonical/V1/token index | Select and validate live or V1-backup predecessor evidence | Yes |
| Production dependency guard | Web build | Fail early on forbidden Electron runtime workspace links | No; it is a build gate |
| Reusable synthetic fixtures | Server tests | Model predecessor/current/residue/mixed/invalid states | Yes |
| Migration execution-address normalizer | Canonical structured converter, older projection migration, and V1 predecessor planner | Translate exact/released migration evidence to one exact rooted address | Yes |
| Current Team history row projector | Runtime Team history catalog and V1 history reconciler | Apply one current execution-tree-to-index-row field authority rule | Yes |
| Team history-index strict read/atomic store | V1 history reconciler | Validate current index input and commit the complete deterministic projection | Yes |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why |
| --- | --- | --- | --- |
| Attempt lifecycle and dependency admission | App-data migration runner | Extend | It already owns every execution and `markRunning`. |
| Current package validation | V1 stores + `validateTeamRunStatePackage` | Reuse | Avoids a second current-schema validator. |
| Interrupted-promotion source lookup | V1 migration's current private `resolvePredecessorSources()` | Extract/Reuse | Preserve proven backup layout while giving canonical and token indexing the same authority. |
| Current execution ancestry | `TeamExecutionIndex` | Reuse | Supplies exact task-Team chain/address from validated state. |
| Predecessor conversion | Existing canonical/V1 converters and promoters | Reuse | They already preserve backup/transaction behavior. |
| Released/exact execution-address conversion | Existing `convertLegacyConversationAddress` in the canonical structured converter plus duplicated stored-address parsing in the older projection migration | Extract/Reuse | One migration-owned value converter serves canonical, older projection, and retryable V1 without relying on terminal records; projection-only flat adaptation remains local. |
| Current execution-tree-to-history-row mapping | Private `rowFromTree()` in `TeamRunHistoryCatalogService` | Extract/Reuse | Runtime and migration must agree on current field authority; sharing a current-schema projector avoids migration-specific duplication. |
| Team history index persistence | `TeamRunHistoryIndexStore` and `atomicWriteJsonFile` | Extend/Reuse | Add a strict migration read while retaining the existing runtime reader; reuse the atomic writer and normalized row schema. |
| Web boundary preflight | `guard-web-boundary.mjs` | Extend | It already runs before every Electron build. |
| Fixture storage | `autobyteus-server-ts/tests/fixtures/app-data-migrations` | Extend | Stable server-owned location. |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns Which Concerns | Related Spines | Decision | Notes |
| --- | --- | --- | --- | --- |
| App-data migration domain/runner | Prerequisite contract, typed error, admission, lifecycle | `DS-MIG-001`, `004` | Extend | Also absorbs the old custom-provider guard. |
| Team migration files | State classification, canonical and V1 routing, token mapping | `DS-MIG-002`, `003`, `005`, `006` | Extend | Flatter shared classifier is appropriate for three direct consumers. |
| V1 promotion recovery | Protected predecessor source selection | `DS-MIG-003`, `007` | Extract/Extend | Resolver remains V1-backup-owned but is reusable by canonical migration. |
| Team app-data migration evidence | Exact/released execution-address normalization | `DS-MIG-002`, `003`, `008` | Extract/Extend | One flat migration-owned file serves canonical structured conversion, the older projection migration, and V1 predecessor planning; no runtime dependency is introduced. |
| Run-history current projection | Current execution-tree-to-index-row mapping and strict/atomic index persistence | `DS-MIG-009`, `010` | Extract/Extend | Projector/store stay current-schema-only and reusable by runtime plus the migration boundary. |
| V1 history transition | Complete validated-root Team history-index reconciliation | `DS-MIG-009`, `010` | Add under existing V1 migration folder | Reconciler owns migration sequencing/backups and never becomes a runtime fallback. |
| Server tests/fixtures | Reusable filesystem cohorts and convergence checks | All migration spines | Extend | No ticket-owned fixture dependency. |
| Web build boundary | Manifest classification and preflight | `DS-PKG-001` | Extend | Embedded server is unchanged. |
| Electron executable validation | Artifact lifecycle checks | `DS-PKG-002` | Reuse | Stage 7 only. |

## Ownership-Driven Dependency Rules

- Allowed: server runtime/API -> `AppDataMigrationRunner`; runner -> registry/repository/definition.
- Allowed: canonical/V1/token index -> migration-state classifier; canonical/V1/token index -> predecessor source resolver; classifier -> current package stores/validator.
- Allowed: V1 migration -> migration-owned history reconciler -> current row projector + Team history index store; runtime Team history catalog -> the same current row projector + index store.
- Allowed: Nuxt renderer sources -> `@autobyteus/team-stream-contracts` from `devDependencies` during build.
- Authoritative entrypoint: only the runner admits and starts migration definitions in application source.
- Forbidden: a migration definition reading migration records to enforce its own prerequisite.
- Forbidden: canonical, V1, and token index independently interpreting missing metadata.
- Forbidden: canonical or token indexing reading live V1 target task files as predecessor evidence while metadata remains after an interrupted promotion.
- Forbidden: Electron main/build/scripts importing the contracts package as runtime Node code.
- Forbidden: embedded-server staging or workspace-link mutation used to mask a web production dependency mistake.
- Forbidden: migration code calling `WorkspaceRunHistoryService`, runtime history scanning V1 package directories to synthesize missing rows, or the reconciler writing standalone Agent history.
- Temporary exceptions: none.

## Architecture Direction Decision

- Chosen direction: preserve the reviewed migration/packaging architecture and add one shared current Team history row projector plus one V1 migration-owned strict/atomic history-index reconciler.
- Rationale:
  - Complexity: one state model and one admission boundary replace several special cases.
  - Testability: classifier matrices and in-memory runner records are deterministic; packaging invariants fail before a full build.
  - Operability: blocked dependencies remain unattempted, invalid roots name exact evidence, and full build needs no manual link operation.
  - Retry correctness: failed `20260814` can repair released address evidence without rerunning terminal migration IDs or mutating predecessor communication files independently.
  - User-visible completeness: every validated V1 root becomes discoverable through the existing index-driven GraphQL/sidebar path; valid partial cohorts remain visible and unrelated failures remain retryable.
  - Evolution cost: later migrations can declare prerequisites without bespoke guards.
- Data-flow spine clarity: `Yes`
- Spine inventory completeness: `Yes`
- Ownership clarity: `Yes`
- Off-spine concern clarity: `Yes`
- Authoritative Boundary Rule: `Yes`
- File placement assessment: `Yes`
- Outcome: `Add`, `Modify`, and `Remove` as listed below.

## Common Design Practices Applied

| Practice | Where Used | Why | Owner |
| --- | --- | --- | --- |
| Discriminated union | Team root states | Makes every filesystem shape explicit and exhaustively routed | Classifier |
| Registry metadata | `prerequisiteMigrationIds` | Declarative sequencing without hiding orchestration in definitions | Runner/registry |
| Adapter-like index derivation | Current V1 package -> token task-Team entries | Translates validated current state without legacy parsing | Token index |
| Resolver | Interrupted V1 promotion -> protected predecessor evidence | Centralizes validated backup selection without conversion or mutation | V1 promotion recovery |
| Normalizer | Released/exact execution-address evidence -> exact rooted execution address | Gives canonical, older projection, and V1 one deterministic migration-only value translation boundary | Team app-data migration evidence |
| Projector | Validated current execution tree + preservation inputs -> strict Team history row | Shares one field-authority rule between runtime writes and migration reconciliation | Run-history current projection |
| Reconciler | Complete validated tree cohort + current index -> one deterministic persisted projection | Owns equality, backup, atomic commit, and retry detail without runtime fallback | V1 history transition |
| Boundary guard | Web build preflight | Turns a late Electron Builder failure into an immediate invariant violation | Web build |

## Ownership And Structure Checks

| Check | Result | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy needs a clearer owner | Yes | Generic need plus existing custom-provider guard | Move all prerequisite admission to runner |
| Responsibility overload exists | Yes | V1 currently classifies and promotes | Extract shared classifier |
| Proposed indirection owns real policy | Yes | Evidence precedence and validation | Keep classifier |
| Every off-spine concern has a clear owner | Yes | Ownership tables above | Keep |
| Authoritative Boundary Rule is preserved | Yes | Definitions no longer read migration records | Remove special guard |
| Existing capability areas are reused | Yes | Runner, stores, validator, index, guard | Extend |
| Repeated structures are extracted | Yes | One discriminated state/package result, one exact/released converter for three migration consumers, and one current tree-to-history-row projector for runtime plus migration | Extract |
| Current structure can remain unchanged | No | Current retry worsens persisted state | Change |

## Alternatives

| Option | Summary | Pros | Cons | Decision | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Ignore `ENOENT` for metadata | Tiny patch | Admits unknown/partial data and still misparses V1 task files | Rejected | Missing is not one semantic state. |
| B | Add a V1-only prerequisite guard | Local change | Repeats the custom-provider boundary bypass; attempts remain inconsistent | Rejected | Runner owns attempt admission. |
| C | Shared classifier + generic prerequisites | Explicit, retry-safe, reusable | Several focused files/tests change | Chosen | Correct boundaries with bounded complexity. |
| D | Materialize/unlink contracts during packaging | Proven workaround | Mutates install state and hides the wrong dependency classification | Rejected | Manifest is the correct owner. |
| E | Edit/rely on terminal `20260701` or introduce a replacement migration ID | Isolates address conversion as a separate step | Existing users will not rerun the old ID; a new ID is unnecessary while unreleased `20260814` is already failed/retryable | Rejected | V1 planning owns admission of the predecessor evidence it consumes. |
| F | Make runtime Team history scan admitted V1 packages and synthesize missing rows | Immediately hides stale indexes | Creates two authorities, adds steady-state fallback, and leaves persisted migration incomplete | Rejected | Current runtime stays index-driven; migration repairs the projection once. |
| G | Rerun or modify `20260521_team_run_history_index_v2` | Reuses an index migration name | Its ledger is terminal and its source scan depends on predecessor metadata that V1 promotion removes | Rejected | Current V1 trees require a V1-owned current-schema reconciliation step. |
| H | Write index rows inline inside the V1 orchestrator | Fewer files | Duplicates runtime row projection and overloads orchestration with persistence/backup policy | Rejected | Extract a current row projector and a cohesive migration-owned reconciler. |

## Change Inventory

| ID | Type | Current Path | Target Path / Action | Rationale |
| --- | --- | --- | --- | --- |
| `C-001` | Modify | `app-data-migration-types.ts` | Add prerequisite IDs and generic typed error/status detail | Declarative admission contract |
| `C-002` | Modify | `app-data-migration-runner.ts` | Check prerequisites before `markRunning`; block only dependents | Lifecycle authority |
| `C-003` | Modify | `app-data-migration-registry.ts` | Validate unique IDs and earlier known prerequisites | Fail fast on invalid definitions |
| `C-004` | Add | — | `migrations/team-run-migration-state-classifier.ts` | One read-only state authority |
| `C-004A` | Add/Extract | V1 migration private `resolvePredecessorSources()` | `migrations/team-run-execution-tree-v1/team-run-predecessor-source-resolver.ts` | Share validated live/protected predecessor source selection with canonical and token indexing |
| `C-005` | Modify | `team-canonical-identity-migration.ts` | Route roots by classifier | Fix missing-metadata behavior |
| `C-006` | Modify | `token-usage-task-team-run-index.ts` and migrator wiring | Parse predecessor only; derive current mappings from validated package | Fix retry/current parsing |
| `C-007` | Modify | V1 app-data migration | Declare canonical prerequisite; consume classifier; remove broad residue fallback | Safe successor behavior |
| `C-008` | Modify | Custom-provider readable-ID migration | Declare generic prerequisites; remove injected guard and catch branch | Single admission owner |
| `C-009` | Remove | Custom-provider prerequisite guard + dedicated test | Replaced by generic domain/runner tests | Cleanup duplicate boundary |
| `C-010` | Add/Modify | Server fixtures and migration tests | Add classifier/mixed-state fixtures; relocate current V1 fixture | Durable verification |
| `C-011` | Modify | `autobyteus-web/package.json`, root `pnpm-lock.yaml` | Move contracts package to `devDependencies` | Remove Electron production traversal |
| `C-012` | Modify/Add | Web boundary guard and integration test | Reject contracts in production graph and Electron runtime imports | Durable packaging invariant |
| `C-013` | Add/Extract/Modify | Existing canonical converter plus duplicated stored-address parsing in the older communication migration | `migrations/team-execution-address-normalizer.ts`; canonical, older migration, and V1 delegate | One migration-owned exact/released execution-address translation boundary; flat projection fallback remains local |
| `C-014` | Modify | `team-run-execution-tree-v1/predecessor-task-package-converter.ts` | Normalize communication sender/receiver evidence before exact AgentRun resolution | Retry failed V1 without rerunning terminal migrations |
| `C-015` | Add/Modify | Server migration fixtures/tests | Released/exact/malformed address matrix plus persisted-success/failed-retry integration scenario | Close the real-data coverage gap |
| `C-016` | Add/Extract | Private `rowFromTree()` in `run-history/services/team-run-history-catalog-service.ts` | `run-history/services/team-run-history-index-row-projector.ts`; runtime catalog and migration consume one current-schema projector | One field-authority rule for current trees |
| `C-017` | Modify | `run-history/store/team-run-history-index-store.ts` | Add strict migration read that throws on malformed/unreadable input while preserving the normal tolerant runtime read | Fail-safe migration input without parser duplication |
| `C-018` | Add | — | `app-data-migrations/migrations/team-run-execution-tree-v1/team-run-history-index-reconciler.ts` | Own complete-tree projection, preservation, equality, backup, atomic commit, and migration detail |
| `C-019` | Modify | V1 app-data migration | Invoke reconciliation after promotion processing using all validated current/successfully promoted trees, even when unrelated roots fail | Valid partial cohorts remain visible and retryable |
| `C-020` | Add/Modify | Server migration/run-history/API tests and fixtures | Stale-index reconciliation, field preservation, invalid/write failure, partial cohort, idempotency, GraphQL workspace visibility, and no standalone duplication | Close `UV-002` with durable evidence |

## Removal / Decommission Plan

| Item | Why Unnecessary | Replaced By | Scope |
| --- | --- | --- | --- |
| `custom-provider-readable-id-prerequisite-guard.ts` | Duplicates runner admission and repository reads | Generic definition metadata + runner | In this change |
| Guard-specific unit test | Tests removed owner | Runner/registry prerequisite tests | In this change |
| V1 `readCurrentPackage()` private classifier | Duplicates shared state logic | Shared classifier | In this change |
| V1 private `resolvePredecessorSources()` method | Needed by canonical retry as well as V1 | Shared V1-backup-owned source resolver | In this change |
| Broad incomplete-residue skip | Silently admits corrupt/unknown roots | Positive residue validation or `INVALID` | In this change |
| Unconditional predecessor task parsing | Invalid for V1 files | Classification-routed parsers | In this change |
| Ticket fixture path | Unstable ownership | Server test fixtures | In this change |
| Existing canonical converter plus duplicated stored-address reconstruction in the older migration | V1 needs identical semantics and terminal IDs cannot coordinate execution | Shared migration-owned normalizer with three consumers | In this change |
| Private `rowFromTree()` inside `TeamRunHistoryCatalogService` | Migration and runtime otherwise duplicate current field authority | `team-run-history-index-row-projector.ts` | In this change |
| Any proposed runtime package-to-history scan/fallback | Migration becomes complete and index remains the single persisted read projection | V1 history-index reconciler | Rejected/not introduced |

## Draft And Final File Responsibility Mapping

| File | Owning Subsystem | Concrete Concern | Why One File | Shared Structure |
| --- | --- | --- | --- | --- |
| `domain/app-data-migration-types.ts` | Migration domain | Definition prerequisite contract and generic error | Existing shared contract owner | Prerequisite status detail |
| `app-data-migration-runner.ts` | Migration lifecycle | Admission, attempts, continuation | Existing authoritative runner | Contract types |
| `app-data-migration-registry.ts` | Migration registry | Inventory integrity/order validation | Existing registry owner | Definition metadata |
| `migrations/team-run-migration-state-classifier.ts` | Team migrations | Root evidence precedence and read-only validation | One cohesive classification policy | Discriminated union + validated package |
| `migrations/team-run-execution-tree-v1/team-run-predecessor-source-resolver.ts` | V1 recovery | Validate backup manifest and select live/protected predecessor paths | One cohesive recovery-source policy extracted from V1 | Immutable source paths |
| `migrations/team-execution-address-normalizer.ts` | Team app-data migrations | Normalize exact or released execution-address evidence into an exact expected-root `TeamExecutionAddress` | One cohesive translation policy extracted from canonical conversion and shared by three migration consumers | Existing `TeamExecutionAddress` domain type |
| `migrations/team-canonical-structured-file-converter.ts` | Canonical migration | Convert predecessor task/update structures while delegating address normalization | Existing structured-file conversion owner | Shared migration execution-address normalizer |
| `migrations/team-communication-projection-address-migration.ts` | Older communication migration | Convert projection envelopes/references and adapt projection-only flat address fields | Existing projection owner; stored exact/segment evidence delegates | Shared normalizer plus local flat-field adapter |
| `migrations/team-canonical-identity-migration.ts` | Canonical migration | Route/convert canonical predecessor data | Existing definition owner | Classifier result |
| `migrations/token-usage-task-team-run-index.ts` | Canonical token migration | State-aware task-Team mappings | One mapping concern | Classifier result, V1 index |
| `team-run-execution-tree-v1/predecessor-task-package-converter.ts` | V1 migration | Build current V1 tasks/messages from validated predecessor evidence | Existing package-planning owner | Shared migration execution-address normalizer + planned execution index |
| `run-history/services/team-run-history-index-row-projector.ts` | Current run history | Project one validated current execution tree plus preservation inputs into one strict index row | One current-schema transformation shared by runtime and migration | `TeamRunIndexRowRecord`, execution tree |
| `run-history/store/team-run-history-index-store.ts` | Run-history persistence | Tolerant normal read, explicit strict migration read, normalized atomic write | Existing persistence/schema owner | Existing row record/parser/atomic writer |
| `team-run-execution-tree-v1/team-run-history-index-reconciler.ts` | V1 migration | Reconcile complete validated cohort, preserve index-only fields, recover missing summary, compare, back up, and atomically commit | One cohesive migration-only transition concern | Current row projector + index store + Agent memory layout |
| V1 app-data migration | V1 migration | Route/promote successor state and invoke independent current-history projection reconciliation | Existing definition owner; reconciler remains encapsulated | Validated tree map + reconciliation result |
| Custom-provider readable-ID migration | Provider migration | Provider/selector conversion only | Removes lifecycle concern | Generic prerequisite IDs |
| `autobyteus-web/scripts/guard-web-boundary.mjs` | Web build | Electron production dependency/import boundary | Existing pre-build gate | Manifest data |
| Web integration contract test | Web tests | Assert guard/manifest production-graph invariant | One packaging contract | None |

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Why Shared | Tightness Decision | Must Not Become |
| --- | --- | --- | --- | --- |
| Metadata/current/residue interpretation | `team-run-migration-state-classifier.ts` | Three migration consumers need identical semantics | Four exhaustive variants; current alone carries validated package | Generic filesystem helper |
| Prerequisite status admission | Migration domain + runner | Multiple definitions need the same lifecycle rule | IDs and exact persisted statuses only | Migration-specific guard framework |
| Interrupted-promotion source lookup | V1 recovery resolver | Canonical and V1 need identical backup selection | Exact root/source paths and backup directory only | General backup service |
| Released/exact migration address translation | `team-execution-address-normalizer.ts` | Canonical conversion, older migration, and V1 planning require identical reconstruction semantics | One address value, exact expected root, and contextual label only | Runtime compatibility adapter or projection-envelope converter |
| Current execution-tree history row projection | `run-history/services/team-run-history-index-row-projector.ts` | Runtime catalog and V1 migration require identical current field authority | Tree owns overlapping fields; inputs expose only `existingRow` and optional recovered summary | Persistence, trace reading, or predecessor conversion |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundancy Removed | Overlap Risk | Decision Sound | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| `TeamRunMigrationState` union | Yes | Yes | Low | Yes | Each variant carries only usable evidence/context. |
| `AppDataMigrationPrerequisiteFailure` | Yes | Yes | Low | Yes | Reuse `AppDataMigrationStatus`; no parallel status enum. |
| `ValidatedTeamRunStatePackage` | Yes | Existing | Low | Yes | Reuse existing validator result; do not define another package model. |
| `TeamRunPredecessorSources` | Yes | Yes | Low | Yes | Carry root/task/message source paths plus live/protected provenance; never file contents. |
| `TeamCommunicationExecutionAddressInput` | Yes | Yes | Low | Yes | Carry expected root, exact row, side, and diagnostic label; return existing exact address type rather than a parallel model. |
| `TeamRunHistoryIndexProjectionInput` | Yes | Yes | Low | Yes | Reuse the current execution-tree and existing row types; do not introduce a second migration row schema. |
| `TeamRunHistoryIndexSnapshot` | Yes | Yes | Low | N/A | One strict store-owned read result: normalized rows, canonical source path, and source existence; no duplicate index representation or mutable handle. |
| `TeamRunHistoryIndexReconciliationResult` | Yes | Yes | Low | N/A | Return changed/skipped counts and optional backup path only; migration detail remains the caller's concern. |

## Derived Implementation Mapping

| Target | Change | Spine | Responsibility | Key API |
| --- | --- | --- | --- | --- |
| Migration domain types | Modify | `DS-MIG-001`, `004` | Declare and report prerequisites | `prerequisiteMigrationIds?`, `AppDataMigrationPrerequisiteError` |
| Runner | Modify | `DS-MIG-001`, `004` | `assertPrerequisites()` before attempt creation | `runPending()`, `runMigration()` |
| Registry | Modify | `DS-MIG-001` | Validate prerequisite topology | constructor validation |
| State classifier | Add | `DS-MIG-002`, `003`, `005`, `006` | `classifyRoot(rootTeamRunId)` | `TeamRunMigrationStateClassifier` |
| Predecessor source resolver | Add/Extract | `DS-MIG-002`, `003`, `007` | Resolve and validate live/protected source paths before mutation | `TeamRunPredecessorSourceResolver.resolve(...)` |
| Migration execution-address normalizer | Add/Extract | `DS-MIG-002`, `003`, `008` | Normalize exact/released predecessor execution-address evidence and enforce expected root | `normalizePredecessorTeamExecutionAddress(value, expectedRootTeamRunId, label)` |
| Canonical structured converter | Modify | `DS-MIG-002`, `008` | Delegate task/update exact/segment address conversion | shared normalizer |
| Older communication projection migration | Modify | `DS-MIG-008` | Delegate stored exact/segment evidence; keep flat projection adaptation local | shared normalizer + local flat adapter |
| V1 predecessor package converter | Modify | `DS-MIG-003`, `008` | Use normalized addresses for sender/receiver AgentRun resolution | `convertPredecessorPackage(...)` internal message mapping |
| Current Team history row projector | Add/Extract | `DS-MIG-009`, `010` | Apply current tree/index field authority for both runtime and migration | `projectTeamRunHistoryIndexRow({ tree, existingRow, recoveredSummary })` |
| Team history index store | Modify | `DS-MIG-010` | Strictly validate migration input, return one immutable source snapshot, and preserve normalized atomic writes | `readIndexStrict(): Promise<TeamRunHistoryIndexSnapshot>`, existing `readIndex()`, `writeIndex()` |
| V1 Team history index reconciler | Add | `DS-MIG-009`, `010` | Build complete deterministic projection, preserve fields, recover summaries, compare, back up, and commit | `reconcile(trees)` |
| V1 app-data migration | Modify | `DS-MIG-003`, `009` | Call reconciliation with every validated current/promoted tree and translate result into migration detail | `execute()` orchestration |
| Token task-Team index | Modify | `DS-MIG-002`, `006` | Accept shared classified roots and build exact mappings | `buildTokenUsageTaskTeamRunIndex(...)` |
| Web manifest/lockfile | Modify | `DS-PKG-001` | Correct dependency class | `devDependencies` |
| Web guard/test | Modify/Add | `DS-PKG-001` | Enforce boundary before expensive build | guard command + Vitest contract |

## File Placement And Ownership Check

| File | Current / Target Path | Matches Concern | Split Risk | Action | Rationale |
| --- | --- | --- | --- | --- | --- |
| Shared classifier | `src/app-data-migrations/migrations/` | Yes | Low | Add flat | Directly shared by peer migration files; a new module folder would be artificial. |
| Source resolver | `src/app-data-migrations/migrations/team-run-execution-tree-v1/` | Yes | Low | Extract/keep under V1 | Backup layout is owned by V1 promotion even though canonical consumes its public result. |
| Generic prerequisite types | `domain/app-data-migration-types.ts` | Yes | Low | Keep/extend | Shared lifecycle contract belongs here. |
| Runner admission | `app-data-migration-runner.ts` | Yes | Low | Keep/extend | Authoritative lifecycle boundary. |
| V1 fixtures | `tests/fixtures/app-data-migrations/team-run-execution-tree-v1/` | Yes | Low | Move/copy minimal fixture | Server-owned stable test data. |
| Packaging guard | `autobyteus-web/scripts/guard-web-boundary.mjs` | Yes | Low | Keep/extend | Already canonical preflight. |
| Migration execution-address normalizer | `src/app-data-migrations/migrations/team-execution-address-normalizer.ts` | Yes | Low | Extract existing canonical capability | Shared across three peer one-time migration consumers; placing it in runtime communication services would create the wrong dependency. |
| Team history row projector | `src/run-history/services/team-run-history-index-row-projector.ts` | Yes | Low | Add/extract | It is current-schema run-history policy shared by runtime and migration, not historical migration decoding. |
| V1 history reconciler | `src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-history-index-reconciler.ts` | Yes | Low | Add | Backup and transition sequencing belong beside the migration that owns the projection cutover. |
| Team history index store | `src/run-history/store/team-run-history-index-store.ts` | Yes | Low | Keep/extend | Strict parsing and atomic persistence stay behind the existing persistence owner. |

## Concrete Shape Guidance

| Topic | Good Example | Avoided Shape | Why |
| --- | --- | --- | --- |
| Missing metadata | Valid V1 -> `CURRENT_V1`; valid legacy manifest -> `HISTORICAL_RESIDUE`; unknown -> `INVALID` | `catch ENOENT; return SKIPPED` | Absence alone does not prove safety. |
| Interrupted promotion | Metadata still exists -> `PREDECESSOR`, target files resolved through protected backup | Treat target file presence as current | Metadata is the authoritative promotion marker. |
| Canonical retry after target publication | Preflight validated protected task source; do not rewrite backup; token index reads it | Parse live V1 task file or mutate protected backup | Preserves schema and backup boundaries. |
| Prerequisite | Runner reads canonical `FAILED`, returns V1 blocked without `markRunning`, continues later independent migration | V1 checks repository inside `execute()` | One lifecycle authority. |
| Prerequisite status truth table | `SUCCEEDED`/`SUCCEEDED_WITH_WARNINGS` -> admit; `FAILED`/`RUNNING`/`NOT_RUN` -> typed block before `markRunning` | Treat warnings as failure or test only `FAILED` | Matches the exact terminal semantics and manual-retry contract. |
| Current task Team | Validated task record reference + `TeamExecutionIndex` ancestry/address | Parse V1 file with predecessor normalizer | Keeps schema eras separate. |
| Released communication address | V1 planner normalizes row/side evidence in memory, then resolves exact AgentRun IDs | Rerun terminal `20260701`, rewrite the source separately, or accept segment addresses at runtime | Recovery stays within retryable V1 planning and current runtime remains single-schema. |
| Team history convergence | Validated tree map -> shared row projector -> strict/atomic index reconciler -> unchanged GraphQL/sidebar read | Runtime package scan, inline ad-hoc row creation, or standalone member rows | One current projection rule and one transition owner keep persisted and user-visible state aligned. |
| Partial migration | Reconcile every already-current/successfully promoted tree; exclude unresolved roots; keep migration failed/retryable | Suppress all valid history until every predecessor succeeds or index unresolved roots | Preserves the established valid-root availability contract without admitting invalid data. |
| Packaging | Contract in `devDependencies`, bundled by Nuxt | Dereference workspace link before Electron Builder | Corrects dependency meaning. |

## Backward-Compatibility Rejection Log

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Broad missing-file skip | Would immediately unblock observed folders | Rejected | Positive state classification |
| Fabricated metadata for residue | Could satisfy predecessor converter | Rejected | Classify residue as out of scope and do not mutate |
| Runtime old/new readers | Could tolerate incomplete migration | Rejected | Convergent one-time migration |
| Second migration-specific guard | Small V1 patch | Rejected | Generic runner prerequisites, including removal of old guard |
| Link materialization/restore script | Previously made build pass | Rejected | Correct manifest dependency class |
| Copy protected predecessor data back over live V1 targets | Could restore old canonical flow | Rejected | Resolve protected evidence read-only and let V1 re-promote atomically |
| Runtime exact-or-segment address reader | Would hide incomplete migration | Rejected | Migration-only normalizer produces current V1 AgentRun identities before promotion |
| New communication-address migration ID | Could run after terminal `20260701` | Rejected | Amend unreleased/retryable `20260814` planning; add a new ID only if that transition is released terminally in the future |
| Runtime V1-package history fallback | Could make missing rows appear without fixing persisted state | Rejected | Existing `20260814` reconciles the index; runtime remains index-driven |
| Rerun/modify terminal `20260521` | It already owns predecessor metadata-to-index V2 conversion | Rejected | V1 migration projects from current execution trees without changing the completed historical transition |
| Standalone Agent rows for Team members | Could make Agents appear under the workspace | Rejected | Team members remain nested in Team history; only Team index rows are reconciled |

## Derived Interface Boundary Mapping

| Owning File | Spine | Subject | Interface | Input / Output | Dependencies |
| --- | --- | --- | --- | --- | --- |
| Migration definition contract | `DS-MIG-001` | Migration dependencies | `prerequisiteMigrationIds?: readonly string[]` | Exact migration IDs | None |
| Runner | `DS-MIG-001`, `004` | Migration attempt admission | internal `assertPrerequisites(definition)` | Definition -> void/typed error | Repository |
| Classifier | `DS-MIG-005` | One Team root | `classifyRoot(rootTeamRunId)` | Exact root ID -> discriminated state | Filesystem, V1 stores/validator |
| Predecessor source resolver | `DS-MIG-007` | One predecessor root's source evidence | `resolve(rootTeamRunId, rootDir)` | Exact root/path -> immutable live/protected paths | Filesystem + V1 backup manifest |
| Migration execution-address normalizer | `DS-MIG-008` | One predecessor execution address | `normalizePredecessorTeamExecutionAddress(value, expectedRootTeamRunId, label)` | Exact value + expected root + label -> exact `TeamExecutionAddress` | Migration-only address/domain constructors |
| Token index | `DS-MIG-006` | Task-Team lookup | `buildTokenUsageTaskTeamRunIndex(memoryDir, classifier)` or classified-root input | Immutable entries/issues | Classifier, predecessor parser, V1 index |
| Web guard | `DS-PKG-001` | Electron production graph | existing CLI | Manifest/source tree -> exit status | Filesystem |
| Current Team history row projector | `DS-MIG-009`, `010` | One current TeamRun history row | `projectTeamRunHistoryIndexRow(input)` | Validated tree + optional existing row/summary -> strict row | Current tree/domain types, workspace normalizer, summary compactor |
| Team history index store | `DS-MIG-010` | Persisted Team history index | `readIndexStrict()`, existing read/write methods | Store-owned exact path -> immutable strict snapshot / atomic commit | Filesystem, strict parser, atomic writer |
| V1 history reconciler | `DS-MIG-009`, `010` | Validated-root Team history projection | `reconcile(trees)` | Exact root-ID tree map -> changed/skipped result + backup path | Projector, index store, Agent memory trace readers |

## Interface Boundary Check

| Interface | Singular Responsibility | Explicit Identity | Ambiguous Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `prerequisiteMigrationIds` | Yes | Yes, exact IDs | Low | Registry validation |
| `classifyRoot(rootTeamRunId)` | Yes | Yes, exact root ID | Low | Return exhaustive union |
| `resolve(rootTeamRunId, rootDir)` | Yes | Yes, exact root ID and canonical root path | Low | Validate backup manifest and path ownership |
| `normalizePredecessorTeamExecutionAddress(value, expectedRootTeamRunId, label)` | Yes | Yes, one value + expected root + contextual label | Low | Reject empty/duplicate/unsupported/contradictory/root-mismatched evidence with contextual error |
| Token index builder | Yes | Yes, root/task-Team IDs | Low | Consume classification, never guess schema |
| Web boundary guard | Yes | Package names and source areas explicit | Low | Reject runtime imports/dependency placement |
| `projectTeamRunHistoryIndexRow(input)` | Yes | Exact validated tree plus typed preservation inputs | Low | Keep persistence and trace I/O outside the projector |
| `readIndexStrict()` | Yes | One Team history index | Low | Return immutable normalized rows + canonical source path + existence; throw on malformed/unreadable input; missing is a valid empty snapshot |
| `reconcile(trees)` | Yes | Exact root-ID-to-validated-tree map | Low | Reject duplicate/root mismatch and keep runtime services out of the migration boundary |

## Scope-Appropriate Separation Of Concerns Check

- Non-UI scope: migration lifecycle, filesystem classification, conversion, and persistence remain separate file-level concerns under the existing app-data migration subsystem.
- Integration/build scope: the web package manifest and boundary guard own frontend-versus-Electron dependency classification; embedded-server staging remains unchanged.
- The shared classifier is intentionally one flat migration-owned file because it owns one cohesive policy and has three peer consumers; creating a new folder hierarchy would add structural depth without another owner.
- Tests mirror those boundaries: classifier matrices, runner lifecycle tests, migration convergence tests, web dependency-contract tests, and Stage 7 artifact validation.

## Naming Decisions

| Item | Current | Proposed | Reason |
| --- | --- | --- | --- |
| Shared owner | None | `TeamRunMigrationStateClassifier` | Names subject, scope, and responsibility |
| Protected source owner | V1 private method | `TeamRunPredecessorSourceResolver` | Names the predecessor evidence and selection responsibility |
| Execution-address translation owner | Canonical private converter plus older migration duplicate | `normalizePredecessorTeamExecutionAddress` in `team-execution-address-normalizer.ts` | Names the exact transformation, serves all migration consumers, and keeps flat projection adaptation out of the general owner |
| State variants | Implicit booleans/fallback text | `PREDECESSOR`, `CURRENT_V1`, `HISTORICAL_RESIDUE`, `INVALID` | Exact operational meanings |
| Generic error | Provider-specific error | `AppDataMigrationPrerequisiteError` | Owned by runner/domain and reusable |
| Dependency metadata | None | `prerequisiteMigrationIds` | Declarative exact IDs, not vague ordering |
| Current row projector | Private `rowFromTree` | `projectTeamRunHistoryIndexRow` / `team-run-history-index-row-projector.ts` | Names the current subject and transformation without implying persistence or migration ownership |
| V1 projection owner | None | `TeamRunHistoryIndexReconciler` / `team-run-history-index-reconciler.ts` | Names the exact persisted projection and transition action; folder supplies V1 scope |
| Strict store method | Tolerant `readIndex()` only | `readIndexStrict(): TeamRunHistoryIndexSnapshot` | Makes fail-safe migration and backup-source semantics explicit without changing normal runtime behavior or duplicating the private path |

## Naming Drift Check

| Item | Name Matches | Action | Change |
| --- | --- | --- | --- |
| Custom-provider prerequisite guard | No after generic contract exists | Remove | `C-009` |
| V1 private `readCurrentPackage` | No; it also acts as classifier | Remove/replace | `C-007` |
| V1 private `resolvePredecessorSources` | No longer; concern serves canonical too | Extract | `C-004A` |
| `buildTokenUsageTaskTeamRunIndex` | Yes after routing correction | Keep | `C-006` |
| Web boundary guard | Yes | Extend | `C-012` |
| Older migration private `currentAddress`/`legacyAddress` | No after V1 requires the same translation | Extract | `C-013` |
| Runtime private `rowFromTree` | No after migration requires the same current projection | Extract | `C-016` |

## Existing-Structure Bias Check

| Area | Bias Risk | Architecture-First Alternative | Decision |
| --- | --- | --- | --- |
| Keep classification inside V1 | High | Shared migration state owner | Change |
| Keep provider-specific guard because it exists | High | Generic runner admission | Change |
| Modify embedded-server preparation because build fails thereabouts | Medium | Correct web dependency classification | Change at manifest boundary |
| Keep ticket fixtures because tests already reference them | High | Server fixture ownership | Change |
| Put current row projection inside the migration folder | High | Shared current-schema run-history projector | Change; historical sequencing stays in migration, current projection stays in run-history |
| Make runtime catalog enumerate V1 packages because it already knows package admission | High | One-time V1 index reconciliation | Reject runtime fallback |

## Anti-Hack Check

| Candidate | Risk | Proper Fix | Decision |
| --- | --- | --- | --- |
| Ignore missing metadata | High | Validate positive alternate state | Reject shortcut |
| Let V1 run then rely on idempotency | High | Enforce canonical prerequisite before attempt | Reject shortcut |
| Copy workspace dependency into `node_modules` | High | Move build input to `devDependencies` | Reject workaround |
| Add build-only Electron Builder exclusion | Medium | Fix production graph itself | Reject unless later evidence disproves bundling assumption |
| Patch `team_run_history_index.json` inline in V1 `execute()` | High | Dedicated reconciler plus shared projector/store | Reject overloaded orchestration |
| Reset/re-run terminal local migration records automatically | High | Disposable verification state; explicit operator authorization for real-data repair | Reject release compatibility machinery for an unreleased candidate |

## Dependency Flow And Cross-Reference Risk

| Boundary | Upstream | Downstream | Risk | Mitigation |
| --- | --- | --- | --- | --- |
| Runner prerequisite contract | Runtime/API | Definitions/repository | Medium | Registry topology tests and in-memory runner tests |
| Shared classifier | Canonical/V1/token index | V1 stores/validator | Medium | Read-only API and exhaustive matrix tests |
| Protected predecessor resolver | Canonical/V1/token index | V1 backup layout | Medium | Validate manifest/root/source identity and preflight all paths before writes |
| V1 index derivation | Classifier package | Token planner | Medium | Reuse validated package index and duplicate/ancestor checks |
| Web manifest | pnpm/Nuxt | Electron Builder | Low | Lockfile graph assertion plus canonical build |
| V1 history reconciliation | V1 migration | Row projector/index store/Agent memory | Medium | Exact typed tree map, strict store read, deterministic comparison, protected backup, atomic write |
| Current row projector | Runtime catalog and V1 reconciler | Current execution-tree/domain types | Low | Pure current-schema transformation; no filesystem or predecessor dependency |

## Decommission / Cleanup Plan

| Item | Cleanup | Verification |
| --- | --- | --- |
| Custom provider guard | Delete source/imports/constructor parameter/special sanitizer branch and dedicated test | `rg` no references; runner tests cover all statuses |
| V1 private state fallback | Delete `readCurrentPackage` and incomplete-residue message | Classifier/V1 tests |
| V1 private source resolver | Move to dedicated V1 recovery file and replace both canonical/V1 call paths | Interrupted-promotion integration test |
| Ticket fixture reference | Replace with server fixture path | `rg "tickets/(in-progress|done)" autobyteus-server-ts/tests` |
| Production contract dependency | Update package manifest and lockfile importer | `pnpm --filter autobyteus list --prod --depth 1` |
| Runtime private `rowFromTree` | Remove private mapping after extracting shared projector; update runtime caller imports | Runtime catalog tests plus migration projector tests |
| Missing V1 Team history rows | Add reconciliation in existing `20260814`; do not add runtime fallback or new migration ID | Stale-index integration + GraphQL workspace-history assertion + source audit |

## Data Models

Conceptual target shapes (names may be tightened during runtime review):

```ts
type TeamRunMigrationState =
  | { kind: "PREDECESSOR"; rootTeamRunId: string; rootDir: string; metadataPath: string }
  | { kind: "CURRENT_V1"; rootTeamRunId: string; rootDir: string; package: ValidatedTeamRunStatePackage }
  | { kind: "HISTORICAL_RESIDUE"; rootTeamRunId: string; rootDir: string; manifestPath: string }
  | { kind: "INVALID"; rootTeamRunId: string; rootDir: string; evidencePath: string; reason: string };

type AppDataMigrationPrerequisiteFailure = {
  migrationId: string;
  status: AppDataMigrationStatus;
};

type TeamRunPredecessorSources = {
  provenance: "LIVE" | "PROTECTED_V1_BACKUP";
  taskRecordsPath: string;
  communicationPath: string;
  backupDirectory: string | null;
};

type TeamRunHistoryIndexProjectionInput = {
  tree: TeamRunExecutionTreeSnapshot;
  existingRow: TeamRunIndexRowRecord | null;
  recoveredSummary?: string | null;
};

type TeamRunHistoryIndexSnapshot = Readonly<{
  rows: TeamRunIndexFileRecord;
  sourceExists: boolean;
  sourcePath: string;
}>;

type TeamRunHistoryIndexReconciliationResult = {
  changed: boolean;
  projectedCount: number;
  preservedCount: number;
  addedCount: number;
  removedCount: number;
  backupPath: string | null;
};
```

No new persisted database schema or public Team API is introduced.

## Error Handling And Edge Cases

- Missing `agent_teams/` means an empty cohort, as today.
- Metadata present but unreadable/malformed remains `PREDECESSOR`; its converter reports failure without changing source bytes.
- Metadata plus partial V1 files remains predecessor/interrupted promotion; V1 uses protected backups as today.
- Metadata plus a V1 execution-tree target requires valid protected predecessor sources. Canonical validates/reads those paths without rewriting them; V1 uses the same paths. Missing or mismatched backup evidence fails cohort preflight before writes.
- Metadata absent with one or two V1 files is `INVALID`, never residue.
- Metadata absent with three malformed/contradictory V1 files is `INVALID` with validation context.
- Metadata/V1 absent with malformed or identity-mismatched legacy manifest is `INVALID`.
- Metadata/V1/manifest all absent is `INVALID`, not silently skipped.
- Exact communication addresses must contain exactly the four current fields and match the expected root; they then pass through unchanged.
- Released segment addresses reconstruct configured member paths, ordered task-Team IDs, and optional task-Agent IDs. Empty or contradictory evidence fails with message index and side before promotion.
- The older communication migration and canonical migration may already be terminal successes; V1 retry never attempts to reset or rerun them.
- Filesystem errors other than true absence propagate with root/path context.
- Duplicate/conflicting task-Team mappings remain failures and prevent token transaction writes.
- A prerequisite in `RUNNING`, `FAILED`, or `NOT_RUN` blocks the dependent before attempt creation.
- `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` satisfy prerequisites.
- Runner verification must cover the complete five-status truth table for both startup admission and direct/manual execution; blocked startup continues unrelated definitions, while blocked manual execution propagates the typed error.
- An invalid registry prerequisite (unknown, self, duplicate, or later definition) fails registry construction.
- A build guard failure occurs before server preparation when the contract is reintroduced as a production dependency.
- A missing Team history index is a valid empty input. A malformed JSON/root/row shape or non-absence read error is a strict reconciliation failure; it is never silently interpreted as empty.
- Duplicate tree IDs, a tree root ID that disagrees with its map key, or a non-canonicalizable member workspace path fails reconciliation before backup/write.
- Existing rows are keyed by exact `teamRunId`; duplicate rows are invalid strict input. Existing `summary` and `terminatedAt` are preserved only for the same validated root. Tree-owned overlapping fields always win.
- Summary recovery is best-effort from the coordinator AgentRun's current raw traces. Missing files, malformed trace rows, read failure, or no user trace yields `""` plus a non-blocking diagnostic; optional summary recovery can never hide an otherwise validated run.
- Reconciliation runs over the validated tree map even when another root produced a migration failure. It never projects the unresolved root and never removes or rewrites a V1 package.
- Backup creation occurs only after strict read/projection succeeds and only when the persisted row set will change. Atomic write failure leaves the original target intact and reports the index path.
- A manual migration retry does not hot-reload already-instantiated package/history catalogs; the existing restart/catalog-rebuild lifecycle remains the visibility boundary.

## Use-Case Coverage Matrix

| Use Case | Requirement | Primary | Fallback | Error | Planned Runtime Review Section |
| --- | --- | --- | --- | --- | --- |
| `UC-MIG-001` | Canonical then V1 | Yes | N/A | Yes | `RC-MIG-STARTUP` |
| `UC-MIG-002` | Historical residue skip | Yes | N/A | Yes | `RC-MIG-CLASSIFY` |
| `UC-MIG-003` | Current V1 skip | Yes | N/A | Yes | `RC-MIG-CURRENT` |
| `UC-MIG-004` | Mixed retry convergence | Yes | Yes | Yes | `RC-MIG-MIXED` |
| `UC-MIG-005` | Invalid state preservation | Yes | N/A | Yes | `RC-MIG-INVALID` |
| `UC-MIG-006` | Dependent blocking/independent continuation | Yes | Yes | Yes | `RC-MIG-PREREQ` |
| `UC-MIG-007` | Current token mapping | Yes | N/A | Yes | `RC-MIG-TOKEN` |
| `UC-MIG-008` | Interrupted promotion protected-source recovery | Yes | Yes | Yes | `RC-MIG-PROTECTED-SOURCE` |
| `UC-MIG-009` | Released communication-address retry after terminal prerequisites | Yes | Yes | Yes | `RC-MIG-COMM-ADDRESS` |
| `UC-MIG-010` | Validated V1 Team history-index convergence and workspace visibility | Yes | Yes | Yes | `RC-MIG-HISTORY-INDEX` |
| `UC-PKG-001` | Build input not production module | Yes | N/A | Yes | `RC-PKG-GRAPH` |
| `UC-PKG-002` | Canonical build | Yes | N/A | Yes | `RC-PKG-BUILD` |
| `UC-PKG-003` | Packaged server lifecycle | Yes | N/A | Yes | `RC-PKG-RUNTIME` |
| `UC-TEST-001` | Durable fixture | Yes | N/A | Yes | `RC-TEST-FIXTURE` |

## Migration / Rollout

1. Release users whose machines have not run this unreleased transition require no manual operational-data repair. This development machine's already-terminal incomplete candidate record remains read-only and requires separate explicit authorization if real-data repair is later desired.
2. On the next start, already-terminal prerequisite records remain unchanged. Canonical runs only where still pending; in the observed failed-retry state it remains skipped as terminal success.
3. The runner retries failed `20260814`. V1 resolves every predecessor source, normalizes exact/released communication addresses in memory, validates the complete target cohort, promotes remaining predecessors, and skips already-current/residue roots.
4. Before returning, V1 reconciles all validated current/successfully promoted execution trees into the Team history index. Index reconciliation runs even when another root remains unresolved, so only valid roots become visible and the migration remains retryable for the rest.
5. Startup rebuilds the V1 package catalog; unchanged Team/workspace history services read the corrected index and expose runs under their canonical workspace.
6. Subsequent starts skip successful definitions without new attempts, backups, or file writes.
7. Validation uses synthetic/disposable copies only. Because this development machine already records the incomplete candidate migration as terminal success, its operational data remains read-only unless the user separately authorizes repair/reset.
8. The Electron package fix takes effect after the normal frozen install updates from the committed lockfile; no node_modules link operation is part of rollout.

## Change Traceability To Implementation

| Change | Implementation Task | Verification | Status |
| --- | --- | --- | --- |
| `C-001`–`C-003`, `C-008`, `C-009` | Generic prerequisites and guard retirement | Runner/registry/custom-provider tests | Planned |
| `C-004`–`C-007` | Classifier and migration routing | Classification, token, V1, mixed-state tests | Planned |
| `C-004A` | Shared protected predecessor sources | Interrupted-promotion recovery and no-mutation-on-missing-backup tests | Planned |
| `C-010` | Stable fixtures | V1 suite and repository path audit | Planned |
| `C-011`–`C-012` | Dependency reclassification and build guard | Prod graph, web tests/generation, full build | Planned |
| `C-013`–`C-015` | Shared migration-only address normalization, V1 consumption, and operational-equivalent fixtures | Unit conversion matrix + failed-V1 retry/idempotency integration | Planned |
| `C-016`–`C-020` | Shared current row projection, strict store read, V1 history reconciliation, orchestration, and durable/API coverage | Projector/store unit tests + stale-index/partial/failure/idempotency integration + GraphQL workspace-history assertion + no-fallback/no-standalone audit | Planned |
| All | Packaged lifecycle | Disposable AppImage server start/health/stop | Planned |

## Design Feedback Loop Notes

| Date | Trigger | Classification | Design Smell | Requirements Updated | Design Update | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-08-16 | Existing custom-provider guard review | Design Impact | Two prerequisite authorities would violate the runner boundary | No | Retire the special guard and migrate it to generic definition metadata | Resolved in `v1` |
| 2026-08-16 | User clarification about missing metadata | Local clarification | A broad skip could be mistaken for desired behavior | No | Explicitly distinguishes validated current/residue from invalid unknown state | Resolved in `v1` |
| 2026-08-16 | Stage 5 round 1 `F-001` | Design Impact | Metadata-authoritative interrupted promotion could send canonical into a live V1 task file | No | Added shared protected predecessor source resolver, cohort preflight, and `UC-MIG-008` | Resolved in `v2` |
| 2026-08-16 | Stage 5 round 3 `F-002` | Design Impact | Prerequisite call stack showed only `SUCCEEDED` and `FAILED`, leaving warning/RUNNING/NOT_RUN outcomes implicit | No | Added explicit five-status truth table and startup/manual attempt outcomes | Resolved in `v3` |
| 2026-08-16 | Stage 10 real-data verification | Requirement Gap | V1 assumed terminal older migrations guaranteed exact communication addresses; four convertible predecessor roots remained blocked | Yes | Added migration-owned exact/released normalizer consumed by retryable V1 planning plus operational-equivalent retry coverage | Resolved in `v4`; pending runtime review |
| 2026-08-16 | Stage 6 source preflight | Design Impact | v4 proposed a communication-only owner even though canonical conversion already owns exact/segment logic and the older projection migration also has a distinct flat fallback | No | Extract the existing canonical capability into one general migration execution-address normalizer for three consumers; retain flat projection adaptation locally | Resolved in `v5`; pending runtime review |
| 2026-08-16 | Stage 5 round 8 `F-003`/`F-004` | Design Impact | Canonical solution package retained two communication-only phrases and did not explicitly record task design health or supplement inventory | No | Added behavior/supplement/design-health/transition sections, canonical inventory, and general execution-address wording | Resolved in `v6`; pending runtime revalidation |
| 2026-08-16 | Stage 10 `UV-002` sidebar/API verification | Requirement Gap | V1 package admission and persisted Team history projection had separate incomplete ownership; successful migration left five valid superrepo runs invisible | Yes | Added `DS-MIG-009/010`, shared current row projector, V1 migration-owned strict/atomic reconciler, partial-cohort and API/UI visibility behavior, and `C-016`–`020` | Resolved in design `v7`; Stage 4/5 review pending |

## Open Questions

- None blocking the proposed direction.
- Summary-reader injection and test fixture granularity should be confirmed by Stage 4 runtime call-stack review before source edits. The strict snapshot and timestamped history-index backup shape are fixed by `F-006`/design v8.
- Full AppImage resource behavior remains executable evidence, not an assumption; if Nuxt fails to bundle a runtime contract import after reclassification, the workflow must re-enter design instead of adding a packaging workaround.
