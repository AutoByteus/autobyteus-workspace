# Released Data Shape Inventory

> **Scope note (`SR-004`–`SR-013`):** This broad read-only inventory is retained as evidence, not as a mandate to migrate every observed subject. The user-approved target is one final `20260814_team_run_execution_tree_v1` migration with availability-first item isolation under explicit normal-process/filesystem/SQLite assumptions. Only Team roots, Team metadata/execution tree, task-delegation records, Team communication records, token identity/migration records, memory path/loadability, supported historical-TeamRun continuation, and the minimum usable-product boundary constrain it. External-channel and unrelated history observations do not create migration requirements.

## Status And Purpose

- Status: `Current investigation evidence`
- Approval applicability: `N/A — evidence/context, not intended-behavior authority`
- Purpose: record the aggregate released profile shapes that the migration and startup design must cover without committing raw user content, identifiers, or database rows.
- Related current behavior IDs: `BEH-001` through `BEH-009`
- Related current requirements: `REQ-001` through `REQ-012`

## Observation Safety And Freshness

- Reporter profile: `/Users/normy/.autobyteus/server-data`
- Main aggregate snapshot: `2026-08-18T04:12:49.716228Z` through `2026-08-18T04:12:52.600029Z`
- Database access: Python `sqlite3` URI `mode=ro` inside a read transaction; no SQL write statement was issued.
- Filesystem access: `lstat`, directory enumeration, and JSON reads only; no file was written, moved, removed, renamed, or opened for mutation.
- The reporter's previous Electron application was running. Filesystem counts are therefore a timestamped best-effort snapshot, not a frozen backup. The investigation observed live message/file growth between probes; downstream work must not assume these counts remain static.
- Disposable probe scripts and aggregate JSON results remained under `/tmp` and are not repository artifacts.
- No raw message content, user identifier, TeamRun identifier, token event identifier, database row, or profile file is copied into this ticket.

## Aggregate Profile Inventory

| Subject | Observed Aggregate | Migration Relevance |
| --- | ---: | --- |
| Team root directory entries | `513` directories; `0` root symlinks/files/special objects | Root enumeration must account for every entry type rather than silently filtering unsafe entries. |
| Predecessor roots | `507` | The current failure report omits their successful plans when another root fails. |
| Authority-less roots | `6` | `5` empty shells and `1` content-bearing root need different auditable dispositions. |
| Files below Team roots | `7,865` regular files, `2,355` child directories, `0` symlinks/special objects | The cohort is large enough that duplicating every valid root is inappropriate. |
| Bytes below Team roots | `5,492,038,980` bytes at the snapshot | Back up or quarantine only affected mutation subjects; preserve valid bulk memory in place. |
| Team history rows | `477` | A failed V1 preflight must not reconcile this index from an incomplete tree map. |
| Agent run history rows | `384` | Retained for cross-migration awareness; not a canonical Team authority source. |
| Database | `836,919,296` bytes; no WAL/SHM at observation | Resolved root updates must remain transactional; predecessor columns need not be destructively removed. |
| Prisma migration ledger | `24` rows, `0` unfinished non-rolled-back, `1` rolled-back historical row | Prisma is not the startup blocker. |

## Root Authority And Disposition-Relevant Shapes

| Authority signature | Root count | Finding |
| --- | ---: | --- |
| `team_run_metadata.json` only | `161` | Predecessor roots without task or communication projections. |
| metadata + communication | `344` | Predecessor roots with communication projections. |
| metadata + task + communication | `2` | These contain the five released nested task-Team tasks. |
| no recognized authority file | `6` | Five empty shells and one content-bearing root. |
| complete current V1 package | `0` | No live profile root was already promoted at this snapshot. |
| historical manifest-only residue | `0` | The classifier still needs to preserve this supported no-op state in fixtures. |

The content-bearing authority-less root contained `2` regular files, `6` child directories, and `129,681` bytes. Empty classification therefore cannot be based only on missing authority filenames. No live unsafe entry was observed, but the current classifier silently ignores non-directory root entries and must be hardened because the incoming safety contract explicitly requires an unsafe-object disposition.

## Predecessor Metadata Formats And Identity Evidence

All `507` metadata roots were predecessor `memberTree` files; none declared the current V1 execution-tree package.

| Shape / fact | Count | Interpretation |
| --- | ---: | --- |
| Top-level standard key set | `408` | Released predecessor metadata. |
| Same key set plus `updatedAt` | `99` | Harmless released superset. |
| Agent nodes | `2,744` | `memberRunId` is the released AgentRun identity. |
| Nested AgentTeam nodes | `25` across `9` roots | Require child TeamRun identity interpretation. |
| Nested `teamRunId == memberRunId` | `20` | Directly consistent. |
| Missing nested `teamRunId` | `4` | Released restore code falls back to `memberRunId`. |
| Explicit nested `teamRunId != memberRunId` | `1` | Released schema treats these as distinct fields; explicit `teamRunId` is the child TeamRun identity. |
| Root directory/metadata ID mismatches | `0` | All predecessor root authorities agree with their directory. |
| Duplicate resolved Agent/Team run IDs under released rules | `0` | All `507` trees remain unique after applying explicit-Team-ID-first/fallback semantics. |

The five affected nested Team nodes occur in one predecessor tree. No corresponding nested Team memory directory independently proves their identity. Adjacent metadata sidecars contain no affected nested Team identity. One affected wrapper identity appears in eight communication sidecar objects, but every corresponding `childTeamRunId` is null; those sidecars add no child TeamRun authority.

### Released source contract

Repository tag inspection at `v1.3.90`, `v1.3.97`, `v1.4.0`, `v1.4.20`, `v1.4.40`, and `v1.4.52` established the same contract:

- `TeamRunSubTeamMemberMetadata.teamRunId` is `string | null`.
- restore uses `normalizeOptionalString(member.teamRunId) ?? member.memberRunId`;
- persistence uses runtime child TeamRun ID, then configured child TeamRun ID, then wrapper `memberRunId`;
- an explicit child `teamRunId` is therefore stronger than the generic wrapper `memberRunId`, and absence has a defined released fallback.

The current migration's equality requirement contradicts that released contract. Applying the released precedence is evidence interpretation inside the migration boundary, not runtime backward-compatibility behavior and not identity fabrication.

## Released Task And Address Shapes

Two roots contain `5` task records, all settled/accepted Team-target tasks. Their `35` stored task/update address occurrences are:

| Address role | Released segment grammar | Occurrences |
| --- | --- | ---: |
| Record sender | `member` | `5` |
| Record receiver | `member -> task_team -> member` | `5` |
| Task run | `member -> task_team` | `5` |
| Submission/review sender and receiver | single-member or task-Team-scoped forms | `20` |

All `35` addresses satisfy the grammar produced by released builders. Released `TokenUsageExecutionAddressBuilder`, `TaskDelegationAddressBuilder`, and `TeamCommunicationAddressBuilder` append local member segments as logical ancestry; the canonical member address is their ordered concatenation. A task-Team segment is preceded by the member segment that identifies its logical Team, and an optional task-Agent segment is terminal.

The current normalizer retains ordered task Team IDs but stores only one member segment, causing the two roots to fail at the receiver. The required correction is a strict released-grammar fold, not an unrestricted flattening rule.

## Communication Projection Formats

| Format | Files | Messages / address facts | Result |
| --- | ---: | ---: | --- |
| Current predecessor projection `{teamRunId,messages}` with segment addresses | `306` | `12,116` sender/receiver occurrences across the live snapshot; all satisfy released grammar | Nested task-Team member addressing must be folded without loss. |
| Older projection `{version,messages}` without address objects | `40` | `741` messages / `1,482` participant sides | The prior migration ended `SUCCEEDED_WITH_WARNINGS` and will not rerun automatically. |

For all `1,482` older participant sides:

- `senderRunId`/`receiverRunId` maps to exactly one Agent node in the same validated metadata tree;
- there are `0` missing and `0` ambiguous mappings;
- every populated route/path corroboration (`62` sides) agrees with that Agent's structural metadata address;
- there are `0` route/metadata contradictions.

Those 40 files are deterministically recoverable by exact AgentRun ID -> validated metadata address. Display names are not required and must not become identity authority.

## Token Ledger Shapes And Read-Only Readiness Preview

| Fact | Count |
| --- | ---: |
| Total rows | `152,616` |
| Distinct `usage_event_id` | `152,616` |
| Distinct `idempotency_key` | `152,616` |
| Standalone Agent rows | `4,758` |
| Team rows | `147,858` |
| Direct `member` segment rows | `147,655` |
| `member -> task_team -> member` rows | `203` |
| Current exact four-field address rows | `0` |
| Multi-member rows persisted after the previous backfill completed | `159` |

All `147,858` Team address JSON values are valid released `{segments}` objects. The multi-member rows use `41` distinct task TeamRun IDs and `25` stored root values.

Evidence tiers within the `203` task-Team rows:

| Evidence tier | Rows | Read-only result |
| --- | ---: | --- |
| Live task mapping + matching physical AgentRun path | `36` | Five unique task records prove root, ordered task-Team chain, logical Team address, and physical AgentRun placement; every redundant row field agrees. |
| Retired topology; self-contained released row | `167` | No live task record or physical root remains. Every row has valid grammar, explicit stored root, unique ordered task-Team IDs, terminal member matching the legacy route column, and `member_agent_run_id == run_id`. |
| Retired rows whose stored root also appears as a task-Team segment | `36` of `167` | This equality is allowed by the released stored contract when no stronger retained topology exists; it must be preserved as recorded, not reinterpreted or invented. |
| Retired rows whose root is distinct from task-Team IDs | `131` of `167` | Self-contained conversion is direct. |

A read-only proposed-policy validator classified all `152,616` rows as plan-valid (`0` contradictions) without issuing mutation SQL. The current planner instead requires every task-Team segment to have a live task-record mapping, so it would reject the `167` retired-topology rows.

Token rows are accounting facts and cannot be silently deleted or quarantined out of the ledger. When live authoritative topology exists it outranks the row and must agree; when it has been retired, a fully self-consistent released row is limited migration authority for that ledger subject only and does not recreate a TeamRun.

The released schema already has nullable `root_team_run_id` and the current root/observed-time index. The target Prisma model uses that same column while omitting legacy identity columns. SQLite tolerates those extra columns, and current Prisma repository queries do not select them. Consequently, retaining `execution_address_json` and other predecessor columns as inert evidence is runtime-usable and reduces data-loss/startup risk; destructive contraction is not required by this product cutover.

## External-Channel Formats

### Bindings

One Team binding lacks both old member route/path and current `targetMemberAddress`. The existing converter deterministically adds `targetMemberAddress: null`; this represents the released Team-level target rather than inventing a member identity.

### Run-output deliveries

`36` Team delivery records use the released target shape `{targetType, teamRunId, entryMemberName, entryMemberRunId}`:

- `29` are `PUBLISHED` and `7` are `OBSERVING`;
- all `36` contain a non-empty `entryMemberRunId`;
- `24` refer to currently empty authority-less root directories and `12` refer to roots no longer present;
- none has live predecessor metadata against which the target can be re-resolved.

Released `v1.4.52` code used `entryMemberRunId` as the exact selected AgentRun identity for eligibility, reply recovery, and publishing. It can therefore be renamed to current `entryAgentRunId` without a live tree. The current V1 converter rejects these records because it recognizes only `entryAgentRunId` or an execution address and also requires the root tree to be present.

## Backup And Historical Sidecars

- No central `app-data-migration-backups` directory exists yet.
- No central `app-data-migration-quarantine` directory exists yet.
- `104` adjacent metadata backup files and `181` adjacent communication backup files exist.
- Communication sidecars contain `141` represented-subteam objects, `133` with non-empty child TeamRun IDs, but the files have no migration manifest, source-root binding, integrity inventory, or provenance guarantee.

Consequently, an adjacent `*.backup-*` file may corroborate stronger evidence but cannot solely authorize identity. A future protected backup may be authoritative only when its manifest binds migration ID, source path, root identity, inventory, and integrity verification.

The current V1 promoter creates and syncs a protected per-attempt backup, stages and validates all three targets, renames them, then moves the predecessor metadata marker last. Its catch removes remaining staging but is not a rollback. SR-012/SR-013 therefore forbid calling a post-mutation outcome `PRESERVED_WARNING`, but the migration problem must still remain non-blocking. Read-only post-error current validation admits a complete valid package or excludes every incomplete/invalid state with a truthful promotion warning. The ticket does not add hashes/phases, a generic journal, exhaustive rollback, or power/device-failure simulation.

## Migration Ledger And Retry Facts

- `20260801_team_canonical_identity` is `FAILED` with `6` attempts and a `10`-failure summary.
- Its last failure details are two multi-member address roots, six authority-less roots, one metadata root (the converter stops at the first missing nested ID), and one blocked token dependency.
- `20260814_team_run_execution_tree_v1` is absent. Under SR-013 it becomes the only registered release-facing Team migration; the old failed canonical row is retained but unregistered/inert.
- Exact accounting shows `504` predecessor roots planned successfully but were omitted from details and globally blocked: `507 predecessor roots - 2 address roots - 1 metadata root = 504`.
- `20260801_drop_token_usage_legacy_route_column` is an obsolete, no-longer-registered failed record and must not become a startup blocker merely because it remains in the database.
- The runner automatically retries a current registered `FAILED` migration, increments attempts, and retries stale `RUNNING` records after 15 minutes. It skips terminal warning records during `runPending()` even though manual status reports say they are retryable.
- The prior communication migration is `SUCCEEDED_WITH_WARNINGS`, attempts `1`, with `40` failures; the runner skips it. The final V1 migration must own conversion of those files without changing that ledger record.

The target registry after canonical removal retains the following complete terminal cohort. Every row was observed at attempt `1`; it is fixture lifecycle state, not new migration scope:

| Migration ID | Observed status | Position relative to final V1 |
| --- | --- | --- |
| `20260727_custom_provider_v1_secret_migration` | `SUCCEEDED` | before |
| `20260706_remove_global_skill_discovery_mode` | `SUCCEEDED` | before |
| `20260517_team_run_metadata_member_tree` | `SUCCEEDED` | before |
| `20260731_remove_external_runtime_working_context_snapshots` | `SUCCEEDED` | after |
| `20260617_raw_trace_rotation_layout` | `SUCCEEDED` | after |
| `20260707_raw_trace_active_file_name` | `SUCCEEDED` | after |
| `20260731_migrate_native_working_context_snapshots_v5` | `SUCCEEDED_WITH_WARNINGS` | after |
| `20260701_team_communication_projection_addresses` | `SUCCEEDED_WITH_WARNINGS` | after |
| `20260730_token_usage_custom_provider_model_value_backfill` | `SUCCEEDED` | after |
| `20260730_token_usage_provider_name_snapshot_backfill` | `SUCCEEDED` | after |
| `20260623_remove_self_evolution_run_metadata` | `SUCCEEDED` | after |
| `20260521_team_run_history_index_v2` | `SUCCEEDED` | after |
| `20260521_run_history_index_v2` | `SUCCEEDED_WITH_WARNINGS` | after |
| `20260803_custom_provider_readable_identity` | `SUCCEEDED_WITH_WARNINGS` | after |

The real registry runs any retained required definition whose row is not terminal. Full-process synthetic proof must therefore seed and snapshot all fourteen rows. In particular, leaving `20260521_team_run_history_index_v2` absent would let it run after V1 and could overwrite the exact V1 history projection being tested.

The final V1 reconciler strictly reads the Team history index, may back it up, and writes through the current atomic JSON writer. Current code catches history failures into failed details. Under the user-corrected SR-012 rule, retained without change by SR-013, those details remain terminal warnings and startup continues. Safety comes from strict package catalog admission and the history service's readable-current-tree requirement, not from making index projection a startup gate. This is lifecycle evidence for the already-in-scope projection, not a Team-history subsystem redesign.

## Current Two-Step And Startup Risks Addressed By Consolidation

The current development two-step path exposes risks that the single final migration must remove:

1. Canonical currently persists an intermediate metadata/task/token form only so V1 can read it. No released runtime consumes that form.
2. The 40 old communication files are an in-scope final-package input. The 36 old output records are out of scope; the final Team migration must not inspect them.
3. Current code couples root failures globally and can reconcile Team history from an incomplete tree map. The consolidated order must isolate roots and reconcile only the successfully admitted tree map after promotion/token attempts.
4. The server currently gates the development-only canonical result rather than the final V1 result and rebuilds the catalog too early.
5. Current canonical failure can return before listen and exit code 0, while Electron also treats matching stdout/stderr text as ready. Health must become the sole success authority. In the target, migration warnings continue to health; if the child process independently exits before health, Electron reports that process failure rather than inferring readiness from logs.

The approved policy therefore replaces the chain with one final migration, one ledger owner, per-root/per-row warning isolation, and one availability-aware final startup gate.

## Limits Of This Evidence

- No actual migration was executed against the reporter profile.
- The readiness preview validates aggregate structure and subject-specific evidence policy; it is not a substitute for minimized synthetic fixtures, transactional tests, isolated synthetic-profile migration, or packaged full-process validation.
- Counts may increase while the running application writes. Identity-shape categories and the recorded released source contracts, rather than an exact future count, are the durable design inputs.
