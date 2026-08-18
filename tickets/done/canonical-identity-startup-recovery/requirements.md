# Requirements Doc

## Status

`Design-ready — SR-012 approved requirements basis, unchanged by the focused SR-013 design-coherence correction; user reaffirmed migration-warning startup availability, optimistic operating assumptions, and a reusable migration-practice README note on 2026-08-18`

The earlier two-migration SR-007 requirement and SR-008 global fail-closed design are superseded. The user approved one release-facing migration because both Team application-data migrations were created during the same unreleased AgentTeam refactor. The user then clarified the production-upgrade invariant: a legacy item that cannot be interpreted before mutation must not make the whole released application unusable. Supported released data is expected to migrate completely; an unexpected readable data variation is left untouched and reported while unaffected product capability remains available.

## Goal / Problem Statement

Provide one final startup migration that upgrades released `origin/personal` AgentTeam persistence directly to the ticket branch's current TeamRun V1 model. It must preserve Team identity, task delegation, Team messages, token-accounting facts, existing Agent memory access, and the ability to discover, open, and continue every successfully migrated historical Team run.

The final migration is `20260814_team_run_execution_tree_v1`. The development-only `20260801_team_canonical_identity` migration is removed as a registered migration. Its observed failed record remains unchanged and inert.

The production-availability invariant is foundational: **a migration failure must not make the application unable to start or upgrade later**. A malformed, contradictory, unreadable, unsupported, or unsuccessfully promoted individual historical Team root or token/history subject must not prevent Electron/server health, new Agent and AgentTeam work, or migration/use of unrelated valid roots. The migration must never guess identity or silently discard data. Pre-mutation conversion failures leave source untouched; a live migration-operation error records the exact observed outcome and excludes the affected subject unless it independently validates as current. Both classes complete as precise terminal warnings. Startup failure is reserved only for a non-migration platform condition under which the current application itself cannot initialize or operate.

This remains a migration-fix ticket, not a general profile-cleanup, external-channel, Team-history-subsystem, registry, warning-UI, or migration-framework project. Startup/Electron and synthetic E2E changes exist only to prove this migration and the minimum usable-product boundary. A delivery-stage addition to the existing `autobyteus-server-ts/README.md` database-migration section records the approved engineering prerequisites for reuse by future migration work; it does not enlarge runtime scope.

## Production Migration Operating Assumptions

The migration is optimistic within these explicit prerequisites:

- one application instance owns startup migration; there is no concurrent writer for the same profile;
- the database and Team storage root are readable/writable with sufficient space;
- SQLite transactions and same-filesystem file operations, including rename, satisfy their documented normal contracts;
- the process, operating system, storage device, and power remain stable for one migration attempt;
- persisted inputs were produced by supported released application behavior and are not manually or physically corrupted beyond the investigated/readable shape families;
- implementation logic is correct for the released metadata, task, message, token, and memory cases documented by this ticket.

Under these prerequisites, every investigated supported source is expected to migrate successfully. The ticket does **not** require protection against every hypothetical power loss, kernel/storage failure, bit flip, adversarial file mutation, or failure at every filesystem syscall. It does not add a generic crash journal or attempt byte-for-byte rollback after an I/O primitive itself reports unreliable storage.

The migration uses bounded observation rather than exhaustive recovery: complete current packages are no-ops; after a promotion exception, an independently valid complete current package remains admitted, while a marker-present or otherwise invalid/incomplete package is catalog-excluded and reported. The coordinator does not invent restoration or claim byte preservation after live mutation. Token SQL errors use SQLite rollback where available and warn; history projection errors warn while independently valid packages remain catalog-admissible. These migration outcomes still reach health. Only failure of the current database/runtime/storage platform itself—not the migration operation—may prevent startup.

## Branch-Diff Basis

- Released baseline: `origin/personal@acb8985930ccce49b632cdca22b92f5b237e35bf`.
- Ticket base: `origin/codex/agent-team-universal-task-delegation@f78df7feb241df28086c251a79c6d9f0f888fd81`.
- `origin/personal` is the direct merge-base ancestor.
- Neither `20260801_team_canonical_identity` nor `20260814_team_run_execution_tree_v1` exists on `origin/personal`; both were added while developing one unreleased AgentTeam refactor.
- Released `origin/personal` already contains the earlier `20260517_team_run_metadata_member_tree`, `20260701_team_communication_projection_addresses`, and Team history migrations. The observed communication record is terminal `SUCCEEDED_WITH_WARNINGS`, so the runner skips it even though 40 older message files remain.
- The changed persistence subjects needed for the final cutover are Team metadata/execution tree, task-delegation records, Team communication records, and token execution identity.
- Agent memory contents have no new ticket-specific schema. Current lookup must resolve the same physical path from the final V1 tree.
- The released token table already has nullable `root_team_run_id` and its current runtime index. The current Prisma model can use that column while ignoring retained legacy evidence columns, so destructive column contraction is not required for runtime availability.

## Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | The profile contains `20260801_team_canonical_identity = FAILED`, attempts 6; V1 has not run. | The removed canonical definition no longer gates startup. One final V1 migration reads the released source directly. | The old failed ledger row remains unchanged; no reset, deletion, replay, or manual edit. | `REQ-001`, `REQ-008`; `AC-001`, `AC-011`. |
| `BEH-002` | Current conversion rejects four nested Teams missing `teamRunId` and one whose explicit `teamRunId` differs from wrapper `memberRunId`. | Apply the released rule: explicit child `teamRunId` wins; absence falls back to `memberRunId`; the complete resulting tree validates. | No invented identity and no runtime legacy reader. | `REQ-003`; `AC-003`, `AC-004`. |
| `BEH-003` | Released `member -> task_team -> member` addresses fail because the normalizer accepts only one member segment. | Strictly fold released member ancestry and preserve root, ordered task-Team IDs, final member, optional task-Agent, and task semantics. | Ambiguous identity is never guessed. | `REQ-004`; `AC-005`. |
| `BEH-004` | `20260701_team_communication_projection_addresses` is terminal warning; the runner skips it while 40 older run-ID projections remain. | The single final V1 migration consumes both observed predecessor message shapes directly. | Message content/non-identity fields and the earlier migration row remain unchanged. | `REQ-005`, `REQ-008`; `AC-006`, `AC-011`. |
| `BEH-005` | The token table retains released identity evidence; 167 task-Team rows have no live topology but have complete released row evidence. | Plan every supported row once, update final roots for resolved rows transactionally, and leave any unsupported row plus its legacy evidence unchanged with a warning. | Row IDs, event/idempotency keys, run IDs, token/cost values, and all non-identity facts remain unchanged; new writes use current fields only. | `REQ-006`; `AC-007`, `AC-008`. |
| `BEH-006` | Five empty roots, one content-bearing authority-less root, and any other invalid root can participate in an all-or-nothing failure. | Give every non-admitted root an exact preserved warning disposition and continue unrelated roots. | No quarantine product; no unsupported root is fabricated as current. | `REQ-002`, `REQ-007`; `AC-002`, `AC-009`. |
| `BEH-007` | Electron can mark the server ready from log text, while migration failure may return before listen and lead to timeout. | `/rest/health` is the only readiness authority. Every migration warning reaches health; only a non-migration platform failure that makes the current app unable to operate produces one prompt error. | No generic status framework; normal logs never signal readiness. | `REQ-009`; `AC-013`. |
| `BEH-008` | Current history/open/restore consumes only an admitted V1 package, so migration completion alone does not prove usability. | Successfully migrated roots remain cataloged, open/hydrate, restore, accept controlled input under the same identities, and survive relaunch. | No Team-history UI/GraphQL/index redesign. | `REQ-010`; `AC-014`, `AC-015`. |
| `BEH-009` | SR-008 globally preflights all roots/token rows, SR-010 overextended recovery, and SR-011 then incorrectly made promotion/storage migration errors block startup. | Treat conversion, promotion, token, and history migration problems as terminal warnings; admit only independently valid current subjects; reach health/new work/unaffected history without generic recovery. | Normal operating assumptions remain; the design does not simulate or recover every infrastructure catastrophe. | `REQ-007`, `REQ-011`, `REQ-012`; `AC-009`, `AC-010`, `AC-012`, `AC-016`, `AC-017`. |
| `BEH-010` | The existing server README describes migration execution and one historical provider transition but does not state reusable production-data-migration assumptions. | Document the approved deterministic-data versus infrastructure-failure boundary in the existing Database migrations section during delivery. | Runtime behavior and ticket-specific Team migration scope remain unchanged. | `REQ-013`; `AC-018`. |

## Confirmed Database And Ledger Facts

- SQLite file at the snapshot was approximately `836.9 MB`.
- Prisma migrations completed; Prisma is not the causal failure.
- `20260801_team_canonical_identity` is `FAILED`, attempts `6`.
- `20260814_team_run_execution_tree_v1` has no observed record.
- `20260701_team_communication_projection_addresses` is `SUCCEEDED_WITH_WARNINGS`, attempts `1`, and is skipped by `runPending()`.
- `token_usage_ledger_events` contains `152,616` rows: `4,758` standalone and `147,858` Team rows.
- Of 203 task-Team multi-member rows, 36 retain live task/physical proof and 167 retain only internally consistent released row evidence after topology retirement.
- A read-only proposed-policy preview found zero contradictions across the observed token rows.
- Released `root_team_run_id` is already nullable and indexed. Retaining old SQLite columns that are absent from the Prisma model does not teach current runtime code to read the predecessor schema.

## Exact Persisted Subjects In Scope

### Released Team sources

- `team_run_metadata.json`
- `task_delegation_records.json` when present
- `team_communication_messages.json` when present, in either observed released projection

### Final Team target

- `team_run_execution_tree.json`
- `task_delegation_records.json`
- `team_communication_messages.json`

### SQLite and migration ledger

- Populate current `root_team_run_id` for supported token rows while retaining released evidence columns during this availability-first upgrade
- One registered final record: `20260814_team_run_execution_tree_v1`
- Read-only/inert preservation of the removed `20260801_team_canonical_identity` failed record
- Unchanged terminal `20260701_team_communication_projection_addresses` record

### Memory

Existing memory files remain in place and byte-preserved. The ticket validates path continuity and loadability; it does not transform working-context, raw-trace, episodic, semantic, or archive contents.

## In-Scope Use Cases

1. Run one final migration against an `origin/personal` profile even when the database contains the observed failed development-only canonical record.
2. Convert the observed missing/explicit-different nested Team metadata identities.
3. Convert nested task-Team delegation addresses without losing task or participant meaning.
4. Convert both observed Team communication formats while leaving the earlier terminal-warning migration record unchanged.
5. Plan every supported token row and update its final root without destroying predecessor evidence.
6. Produce and validate the exact three-file current Team package while preserving existing memory paths.
7. Preserve and warn for every excluded legacy root/row without blocking unrelated valid roots or application startup.
8. Prove successfully migrated historical Team runs remain discoverable, openable, and continuable.
9. Prove a mixed valid-plus-invalid synthetic profile reaches health and supports new Agent/AgentTeam work.
10. Make health the sole Electron readiness signal and reserve prompt startup failure only for independently established non-migration platform conditions under which the current application cannot operate.

## Explicitly Out Of Scope

- Retaining two release-facing Team migrations or persisting a canonical intermediate authority.
- Supporting or replaying terminal success states produced only by unpublished intermediate branch builds. Exact final V1 packages from ordinary retry/relaunch remain supported no-ops.
- Any new migration ID; the existing final V1 ID survives consolidation.
- Any change to external-channel bindings, receipts, callbacks, or `run-output-deliveries.json`.
- Any new external-channel migration, repair, quarantine, or conversion.
- Team-history UI, GraphQL, catalog, or index redesign. Only the final migration's existing bounded projection and catalog exclusion behavior may be corrected.
- A new warning UI, quarantine browser, migration journal, artifact framework, or generic degraded-mode framework. Existing migration summary/log/status surfaces carry warnings.
- Migration of Agent memory schemas or movement of valid memory directories.
- Repairing arbitrary manual edits, physical-disk corruption, or unreadable stores. When encountered per item, preserve and warn where isolation is possible; when the current storage substrate cannot operate, fail startup explicitly.
- Runtime dual readers, version switches, compatibility wrappers, or weakened current identity validation. Retained legacy SQLite columns are inert evidence ignored by current Prisma/runtime code.
- Any change to finalized runtime thread/session-resume work.

The sole permitted external-channel boundary cleanup is removing external-channel reads/writes from the final Team migration. External-channel data and runtime remain untouched.

## Functional Requirements

### `REQ-001` — Provide exactly one final Team migration

Register only `20260814_team_run_execution_tree_v1` for this branch-introduced Team cutover. Remove `20260801_team_canonical_identity` as a migration definition, registry entry, prerequisite, and startup gate. The final migration reads released `origin/personal` sources and writes V1 packages/current token roots directly. The observed old failed record remains unchanged and unregistered; no new ID or ledger edit is introduced.

### `REQ-002` — Isolate non-admitted Team roots

Classify released predecessor roots, complete current V1 packages, valid historical residue, empty shells, content-bearing authority-less roots, partial/unsafe authority, and root-specific read/validation failures. Preserve a root byte-for-byte when exclusion occurs before mutation; after a mutation-stage problem, report the exact observed root state without falsely claiming preservation. In either case, record root ID/path/reason, admit the root only if its complete current package independently validates, exclude it otherwise, and continue every unrelated root. A non-migration platform failure of the Team storage substrate may stop startup only when the current application cannot operate on that required substrate at all.

### `REQ-003` — Convert released Team metadata identity in memory

For every nested Team, use non-empty explicit `teamRunId`; use `memberRunId` only when the child ID is absent. Validate directory/root agreement, uniqueness, parent/child structure, coordinator, handoffs, and AgentRun/TeamRun identity. Do not persist a canonical intermediate metadata file. A root-specific contradiction excludes only that root with a warning.

### `REQ-004` — Convert released task-delegation identity in memory

Accept the released ordered member/task-Team/task-Agent grammar, concatenate member ancestry, retain ordered task-Team run IDs, and corroborate with task/tree/physical evidence. Preserve all task non-identity values. Do not persist a canonical intermediate task file. Missing or contradictory evidence excludes only the owning root with a warning.

### `REQ-005` — Convert both observed Team message shapes in the final migration

Accept address-bearing predecessor messages and older `{version,messages}` run-ID projections. Resolve older participant IDs uniquely within the same validated Team tree; optional route/path only corroborates. Preserve all non-identity message fields. Do not rerun or alter `20260701_team_communication_projection_addresses`. A bad message excludes only its owning root and leaves that source untouched.

### `REQ-006` — Populate current token identity without destructive contraction

Inspect the released/current usable token shape before selecting predecessor columns. Plan each row independently. Retained topology outranks and must agree with row evidence; otherwise internally complete released row evidence may govern only that retired ledger row. Apply all resolved `root_team_run_id` corrections in one transaction, verify the current root index and unchanged accounting facts, and leave every unresolved row and all predecessor evidence columns unchanged with row-specific warnings. Do not create a canonical intermediate/evidence bridge or drop legacy evidence in this release. Current runtime and new writes use only Prisma's current fields.

### `REQ-007` — Validate one exact final package per admitted root

For each root independently, plan execution tree, task records, and communication messages together and pass all current validators before promotion. A root is admitted only when its complete three-file package agrees on exact root/execution identities and the predecessor marker has been removed. Semantic/read/identity failures detected before live mutation preserve/exclude only that root with a warning. If backup/staging/live replacement/final validation throws, the promoter performs no speculative repair: it observes the resulting root through the current package validator and returns a precise warning outcome. An independently valid complete current package may remain admitted; every other result is catalog-excluded. The coordinator continues other subjects and startup. No exhaustive in-process rollback or generic crash journal is required under the documented operating assumptions.

### `REQ-008` — Preserve retry and ledger safety under one owner

The final migration snapshots shared token evidence once, then performs per-root planning/promotion isolation, one resolved-token transaction, and history reconciliation from independently admitted trees. Existing protected backups, predecessor markers, and current-package validation provide bounded observation: complete current packages are no-ops; marker-present/incomplete roots are excluded; marker-absent complete packages are admitted. Current packages and repeated token root updates are idempotent. The removed canonical and every retained terminal migration ledger row never change. Conversion, promotion, token-apply, and history-reconciliation migration problems complete final V1 as `SUCCEEDED_WITH_WARNINGS`; the coordinator records exact details, continues unrelated work, rebuilds the catalog from independently valid current packages, and reaches listen/health. `FAILED` is not a migration-error status in this design; it is reserved for a separate current-platform failure under which the application itself cannot operate.

### `REQ-009` — Preserve memory and make health the sole startup success signal

Do not move or rewrite memory. Prove final tree identity resolves the same physical directories and current readers load representative files. Server startup accepts final `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS`, rebuilds the V1 catalog from independently valid packages, and listens after any migration warning. Electron removes log-text readiness; only successful current-generation `/rest/health` may emit `ready`. Only a non-migration store/bootstrap/platform failure that prevents the current application from operating, or any child error/close before health, produces one prompt existing error-state transition.

### `REQ-010` — Preserve the production upgrade outcome

Every released TeamRun successfully converted into a valid V1 package remains in current history, supports current open/hydration of tree/tasks/messages/memory, and supports restore plus a controlled new submission under unchanged TeamRun/AgentRun identity. Validation uses only a fully synthetic disposable profile reproducing every materially different observed shape.

### `REQ-011` — Guarantee the minimum usable product under recoverable migration errors

Every migration-level conversion, promotion, token, or history problem must produce `SUCCEEDED_WITH_WARNINGS`, not global `FAILED`. After such a result, the application must reach health; new standalone Agent and new AgentTeam creation/run must work under the healthy synthetic platform; successfully admitted historical Team runs must continue; and affected subjects must carry exact diagnostics. Pre-mutation failures preserve their source; mutation-stage failures never overclaim preservation and rely on strict current validation for admit versus exclude. Token apply uses verified SQLite rollback when an injected transaction fails. History errors may leave the index stale, but current package admission remains strict and current history readers already require a readable current tree. The migration coordinator never selects startup `FAILED`; only an independent existing platform/bootstrap owner may establish a non-migration condition under which the current application itself cannot initialize or operate, such as an unusable current database/runtime substrate, and select the separate fatal path. Hypothetical power/device/kernel failure outside the operating assumptions does not require bespoke migration recovery.

### `REQ-012` — Keep the migration fault model deterministic and proportionate

Implementation and validation must rely on the approved operating assumptions: one startup writer, sufficient readable/writable same-filesystem storage, stable process/power/device for one attempt, normal SQLite/file-operation contracts, and correct handling of the investigated released input families. The business migration must not add hash/phase journaling, in-process restoration of every live-file step, per-syscall failure branching, or simulated power/device/kernel corruption. Exception handling remains bounded to truthful warning details, strict independent package/catalog admission, verified native SQL rollback where already available, and existing marker/backup/current-package observations. Migration exceptions do not block startup; only independently established current-platform inoperability does.

### `REQ-013` — Preserve the migration engineering assumptions in project documentation

During delivery documentation sync, extend the existing `autobyteus-server-ts/README.md` **Database migrations** section with a concise reusable practice note. It must distinguish deterministic released-data transformation from infrastructure failure, require investigation of supported source shapes and pre-mutation validation, state the normal one-writer/stable-process/sufficient-storage/SQLite/filesystem prerequisites, prefer native atomicity and bounded independent validation, keep migration problems non-blocking with truthful warnings, reserve startup fatality for current-platform inoperability, and reject bespoke recovery code for every hypothetical power/kernel/device/syscall failure unless a concrete product requirement justifies it. This is a durable documentation change owned by `delivery_engineer`, not a runtime implementation responsibility.

## Validation Data Safety And Realism

- The reporter's live production profile remains read-only and is never copied into automated tests.
- Durable fixtures are minimized synthetic equivalents of all observed metadata, task, message, token, root, memory, and ledger shapes.
- The combined profile seeds released Team files; released token schema/rows; old canonical `FAILED` attempts 6; final V1 `NOT_RUN`; earlier communication `SUCCEEDED_WITH_WARNINGS`; and required history/memory dependencies.
- The full-process profile declares the stable test-only `RETAINED_TARGET_MIGRATION_TERMINAL_COHORT`, naming every other definition retained in the target registry with its observed terminal status/attempt count before and after final V1. Tests snapshot every complete seeded record and assert the cohort unchanged so final V1 is the sole new attempt and no later retained migration rewrites V1 history.
- The combined profile contains at least one valid root and independently injected invalid root, invalid message/root case, and unresolved token row so mixed-cohort availability is exercised.
- No raw user messages, secrets, credentials, workspace contents, production IDs, or database rows may be committed.
- Continuation uses a deterministic test runtime and harmless input without live credentials or external sessions.
- Packaged Electron proves its isolated home/base-data path before launch and never targets the reporter's default profile.

## Acceptance Criteria

### `AC-001` — The one-migration boundary matches the released upgrade

Registry/source tests prove `origin/personal` has neither Team application-data migration, the ticket registers only `20260814_team_run_execution_tree_v1`, and the synthetic profile's old canonical `FAILED` attempts-6 row remains unchanged while the final migration runs.

### `AC-002` — Non-admitted roots remain preserved warnings

Empty, content-bearing authority-less, partial, unsafe, malformed, contradictory, and root-specific unreadable fixtures receive exact warning details, remain byte-identical and excluded, and do not prevent valid roots, health, or new work.

### `AC-003` — Missing nested Team ID follows the released fallback

A nested Team missing `teamRunId` converts using its unique non-empty `memberRunId` and passes complete final-tree validation.

### `AC-004` — Explicit-different nested Team ID remains explicit

A nested Team with `teamRunId != memberRunId` retains the explicit Team ID; final memory resolution uses that exact ancestor. A stronger root-local contradiction preserves/excludes that root with a warning while another valid root completes.

### `AC-005` — Nested task-Team delegation converts without semantic loss

The released multi-member route becomes the exact final root/task-Team/member/task-Agent identity, while all non-identity task fields compare equal.

### `AC-006` — Both message formats produce the same final semantics

Equivalent address-bearing and older run-ID fixtures produce valid V1 messages with exact participants and equal non-identity fields. A missing/ambiguous/corroboration-mismatched participant leaves only its owning root untouched/excluded with a warning.

### `AC-007` — Every token row receives one availability-safe disposition

Synthetic standalone, direct Team, retained task-Team, both retired task-Team cases, and an unsupported row each receive exactly one disposition. Resolved rows get the correct final root; the unsupported row and predecessor evidence remain unchanged and do not prevent the resolved transaction or startup.

### `AC-008` — Token migration preserves accounting and current runtime usability

Before/after comparison proves unchanged row count, event IDs, idempotency keys, run IDs, token/cost, and non-identity facts. Resolved final roots and the current root index are correct; predecessor evidence columns remain available but are absent from current Prisma/runtime reads. An injected SQL apply failure rolls back root updates, is reported, and remains nonfatal when the already-current runtime schema/ledger are still usable.

### `AC-009` — Every admitted package validates as one unit

Each admitted root has exactly the valid execution-tree/task/message package. Tests prove pre-mutation planner/validation failures preserve/exclude only the affected root and normal promotion produces a validated current package. A representative live promotion exception produces a terminal warning and bounded post-error observation: a complete independently valid current package is admitted; an incomplete/invalid package is excluded; unrelated roots continue. Exhaustive fault injection, restoration at every rename/fsync, and simulated power/device failure are not required.

### `AC-010` — Recoverable migration errors are terminal warnings

A mixed valid-plus-invalid profile, including pre-mutation conversion problems and representative promotion/token/history migration exceptions, completes the final record as `SUCCEEDED_WITH_WARNINGS` with nonzero `failedCount`, exact item details, and a log path. Pre-mutation warning roots remain byte-identical. Mutation-stage warning roots are reported without a false preservation claim and are admitted only if their complete current package independently validates; otherwise catalog/history exclude them. `runPending()` does not automatically rerun the terminal warning on relaunch, and health/new work/unaffected history remain available.

### `AC-011` — Ledger behavior and relaunch converge

The old canonical failed record and the complete retained target-registry terminal cohort retain their original status/attempt count/summary throughout migration and relaunch. Final V1 is the sole new attempt. In particular, the later retained Team-history migration is skipped and cannot overwrite the V1 history projection. A relaunch after terminal success/warning performs no duplicate package/token/history write and no migration attempt increment. A focused history-write-error fixture proves final attempt 1 is terminal `SUCCEEDED_WITH_WARNINGS`, current packages remain independently cataloged, health starts, and relaunch skips without altering the retained cohort.

### `AC-012` — Minimum product availability survives item failures

After `SUCCEEDED_WITH_WARNINGS`, server health and the application workspace succeed, so startup does not prevent the user from using the product or later installing a product fix through the normal release path. A new standalone Agent run and a new AgentTeam run can be created/used; a valid migrated historical Team run can open/restore/accept input; and every excluded fixture remains unavailable rather than being falsely opened as current. Byte preservation is asserted only for subjects excluded before mutation.

### `AC-013` — Health exclusively owns Electron readiness and platform failure is prompt

Stdout/stderr text, including `Server listening`, cannot emit `ready`. Only current-generation `/rest/health` success emits one `ready`, including after conversion/promotion/token/history migration warnings. A non-migration platform/bootstrap failure that makes the current application unable to operate reports its identity/summary/log where available and exits nonzero; any pre-health close, including code 0, produces one prompt error. Stale health and normal post-ready stop cannot affect a new generation.

### `AC-014` — Existing memory remains loadable

Top-level, nested-Team, and task-execution final locations equal the preexisting physical directories; hashes remain unchanged; current readers load available working-context/raw-trace/episodic/semantic/archive files.

### `AC-015` — Synthetic full migration and continuation succeed

On the complete supported-shape synthetic profile, one final migration reaches health, admitted roots appear in history and hydrate expected trees/tasks/messages/memory, representative runs restore and accept controlled input under unchanged identities, and relaunch is a no-op. The old canonical row, complete retained terminal cohort, and authority-less roots remain unchanged.

### `AC-016` — The packaged client proves both availability classes safely

A packaged build launches only against an isolated synthetic profile. Its mixed conversion/promotion/token/history warning cases reach health/workspace and support the minimum user boundary; only its independently established current-platform-inoperable case produces a prompt error and never produces ready. Browser automation may own durable click/open/send coverage when it exercises the identical renderer/server path, but packaged health-only readiness remains mandatory.

### `AC-017` — The operating-assumption boundary is enforceable without recovery overengineering

Tests establish isolated single-writer/same-filesystem/current-schema prerequisites, prove every documented released data variation deterministically, prove normal promotion, one representative promotion error as warning/non-blocking with strict admit-or-exclude observation, verified token rollback warning, history warning, and marker-absent current no-op. Repository review confirms no new generic crash journal, hash/phase promotion record, restoration state machine, exhaustive rename/fsync injection, or power/device/kernel simulation.

### `AC-018` — Future migration work can discover the approved practice

The integrated ticket state contains the reusable migration-practice note under `autobyteus-server-ts/README.md` **Database migrations**. It is concise, technology-appropriate, and consistent with `REQ-012`; it does not describe ticket-specific Team formats as a universal framework.

## Relevant Supplemental Artifacts

| Artifact | Current Role |
| --- | --- |
| `ticket-description.md` | Original request plus later one-migration and availability-first decisions. |
| `released-data-shape-inventory.md` | Read-only shape evidence; external observations do not enlarge scope. |
| `design-use-case-validation.md` | Current SR-012 one-migration availability, complete-ledger, non-blocking migration-warning, and strict independent-admission static proof/coverage manifest; evidence/context with approval applicability N/A. |
| `migration-recovery-policy.md` | Superseded; not current authority. |
| `startup-blocker-status-contract.md` | Superseded; not current authority. |

## Approval Record

The user explicitly approved one final migration on 2026-08-18 and reaffirmed the foundational availability rule that caused `ARCH-REV-006` to be corrected by `ARCH-REV-007`: **no migration failure may make the application unable to start**. Supported known formats should migrate successfully. Conversion, promotion, token, and history migration problems must become truthful terminal warnings; affected subjects are preserved when untouched or strictly admitted/excluded according to their independently validated current state after mutation, while health, new Agent/AgentTeam work, and unaffected history remain usable. Only a non-migration platform condition under which the current application itself cannot operate may remain fatal. The user also approved optimistic production-migration prerequisites: correct logic may rely on normal single-writer process, filesystem, power, and SQLite operation rather than defending against every hypothetical infrastructure failure, and requested that these reusable practices be recorded in the project README. The durable README edit is carried as a delivery-stage documentation requirement because `delivery_engineer` owns project-documentation synchronization. The approved migration target remains `20260814_team_run_execution_tree_v1`; the development-only canonical definition is removed. Synthetic E2E, same-identity continuation, production-data safety, external exclusion, and migration-only scope remain approved.
