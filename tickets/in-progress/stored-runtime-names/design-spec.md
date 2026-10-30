# Design Spec — autobyteus-343 (one spelling for the agent runtime in stored raw-trace data)

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` SR-002, `Approved` (the user on DEC-1…3, the Solution Designer within the direction for the rest). Behavior-defining supplements: none.
- Design status: `Ready` (the user's approval of the design before any build is still required by the Task).
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/stored-runtime-names/tickets/in-progress/stored-runtime-names/investigation-notes.md` (F-01…F-11)
- Authorities read (2026-10-30): `architecture-design.md`, `design-principles.md` (Principles 1–15, structural triggers, health assessment); `DESIGN.md` (rules 1–10); `GLOSSARY.md` (Agent Runtimes); `TESTING.md`; `autobyteus-server-ts/docs/design/data_migration_guideline.md` (sections 1–10).
- Project design-principle conflicts or discrepancies: none. This change removes the discrepancy autobyteus-316's review raised (DESIGN rule 10).

## Current-State Read

Five writers type the runtime of a compaction boundary as a short label (`CODEX`, `CLAUDE`, `ANTIGRAVITY`, `GROK_BUILD`, native `AUTOBYTEUS`); the label travels through `ProviderCompactionBoundaryRecorder` into the boundary record (`tool_result.runtime_kind`) and, via `rotateActiveRawTracesBeforeBoundary`, into the raw-trace manifest entry (`segments[].runtime_kind`) (F-02). Nothing reads it back (F-03). The `RuntimeKind` enum is the code's one spelling and is what run metadata, usage records and launch configurations store. The app-data migration framework converts stored data once at startup in a sealed area (F-06, F-07). Nothing is structurally broken beyond the second spelling.

## Task Size And Architectural Risk (Mandatory)

- Task size: **Medium** — one new migration (two files) and its registration; seven one-line writer edits and one type in the server and the library; about fourteen test files updated; one doc line; one migration test folder.
- Architectural risk: **High** — it rewrites persisted user data in place (825 manifests here) at startup, in the sealed migration area; its side effects reach memory search (one journal pass per migrated run) and Memory Sync (one upload per migrated manifest) (F-09). The mechanism itself is small and bounded; the High comes from the persistence change, per the classification rule.
- Escalation trigger: a reader of the stored label is found that the grep missed (F-03); a manifest shape in a release other than the ones inspected (unknown value) turns out to be common; Memory Sync turns out to re-upload imports or to reject a changed manifest.

## Architecture Investigation Evidence

| Source | Reference | Observation | Decision supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Writers and readers | notes F-02, F-03 | Seven write sites; no reader | Change writers; no reader work; rollback is harmless | None |
| Census | notes F-04, F-10 | 825 live manifests at fixed depths, four labels, all complete | Fixed-depth discovery; shapes for fixtures | Other users' shapes: the unknown/unreadable branches |
| Framework | notes F-06 | Definition contract, registry, sealed area, precedents | Migration folder `raw-trace-manifest-runtime-names`, two files | None |
| Guideline | notes F-07 | Stored names follow the code; atomic per file; no default backup; warning success; completed means completed | Mechanism and dispositions below | None |
| Prerequisite order | notes F-08 | Rotation-layout and active-file-name write today's layout | `prerequisiteMigrationIds` | None |
| Side effects | notes F-09 | Journal fingerprint covers the manifest; Memory Sync uploads changed local manifests | Documented cost; imports left alone | Hub behavior on upload (escalation trigger) |
| Pending entries | notes U-1 | Same entry builder for pending and complete | Convert every entry regardless of status | None |

## Intended Change

Backends and the native writer write the `RuntimeKind` value; a sealed migration converts the manifests of this node's own runs once; no current code keeps the old labels or a table for them.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002; REQ-001…007.
- Derived consumers of the changed stored structure (`segments[].runtime_kind` of the raw manifest): the library archive manager (writes only), `MemoryFileStore.readRawTraceManifestGeneration` (reads `index` and `boundary_key` only), `RawTraceFileSourceService` (reads file name, index, record count, timestamps), the memory-search fingerprint (name, size, mtime: one extra journal pass per migrated run, no new index work because the rendered journal text does not change), the Memory Sync source scanner (hash: one upload per migrated manifest of `agents/` and `agent_teams/` when a source is configured), the work-journal service (does not read the field today; autobyteus-316 will). Decision for each: no code change; the first two effects are accepted and documented.
- Derived consumers of the changed payload (`runtime_kind` of the compaction status payload): the recorder (passes it on), the websocket event mapper (passes it through), the web (ignores it; a test fixture uses it). Decision: tests and the fixture change, no code.
- Deliberately left alone: the 7,532 label copies inside old raw-trace records; Memory Sync imports (DEC-2); the field name; other stored names; the journal and 316's per-file runtime; the frozen shapes of released migrations.
- Follow-ups: none new.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | Requirement / AC | Trigger | Existing behavior (evidence) | Change / preserved | Path / spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, 005; AC-001 | A run compacts its context | Short label written (F-02) | `RuntimeKind` value written; payload and manifest agree | DS-001 |
| BEH-002 | Operational | REQ-002…004, 006, 007; AC-002…004, 006, 007 | First start after the update | Labels stored (F-04) | Manifests converted once, safely, with dispositions | DS-002 |
| BEH-003 | System | REQ-005; AC-005, 008 | Any later read of a segment's runtime | No reader | `runtimeKindFromString`, no mapping | (no new path) |

## Relevant Supplemental Task Artifacts

`task-brief-from-316.md` (input, status: context only).

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (a stored-name consistency fix).
- Current design issue found: `Yes` — one concept, two spellings in one field (F-01).
- Structural triggers that fire: *Vocabulary drift* (Principle 15; DESIGN rule 10) — evidence F-01. Ruled out: *Repeated coordination* (no policy repeated across callers; each writer states one constant), *Persisted-data transition* (fires and is decided below).
- Root cause classification: `Legacy Or Compatibility Pressure` (an older spelling kept alive by five writers after the enum became the code's spelling).
- Refactor needed now: `Yes` — small: writers and one migration.
- Design response: write the enum value everywhere; convert the stored data once in the sealed area; keep no table in current code.
- Intentional deferrals and residual risk: the old labels inside old trace records and in unmigrated imports (stated, never read).

## Terminology

Per `GLOSSARY.md`: agent runtime, `RuntimeKind` values. **Old label:** one of the five short spellings. No new domain word.

## Legacy Removal Policy (Mandatory)

- Obsolete in scope: the short-label literals in the five writers and the `"CODEX" | "CLAUDE" | string` type of the payload's `runtime_kind`.
- Compatibility wrappers, dual paths, fallbacks kept: `None`. The recorder accepts only a valid `RuntimeKind`; no reader accepts an old label.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `raw_traces_manifest.json`, one per run with archived segments, under `agents/<run>`, `agent_teams/<team>/<member>`, `agent_orgs/<org>/<team>/<member>` (825 here; compact JSON; keys `schema_version`, `next_segment_index`, `segments[]` with `runtime_kind` in each).
- Relevant change: the value of `segments[].runtime_kind`: old label → `RuntimeKind` value. Also new writes.
- Normal reader/writer behavior: the library writes the manifest compactly and durably (`JSON.stringify` through `replaceFileDurably`, `raw-trace-archive-manager.ts:177`) and reads it by passing `segments` through as stored without inspecting `runtime_kind` (`readManifest`, `:62-73`); no reader depends on the value (F-03), so the converted data is read exactly like the old, and the next rotation writes the converted entries back as they are. The migration writes the same compact form.
- Invariants under direct use: unchanged by the conversion: entry order, indexes, keys, `status`, counts, file names.
- Constraints: raw-trace records and segment files are not touched; one manifest at a time; the server is not running agents during the startup run.
- **Decision: `Migration Required`** (DESIGN rule 10; the user's decision DEC-1). Direct use and rebuild are insufficient: the data cannot be rebuilt (the manifest is the archive's index) and leaving the labels forces a permanent mapping or a guessing fallback in 316.
- Rationale: cost is at most 825 tiny reads and rewrites once; benefit is one spelling and no table in current code.
- Supports: REQ-002…005, AC-002…006.

### Migration Plan

- Current canonical schema: `RawTraceArchiveManifest` (`schema_version: 1`; no schema change). Older shape that requires transformation: values of `runtime_kind` in the old label spelling.
- Why direct use and rebuild are insufficient: above.
- Trigger: `Startup` (registered migration, `requiredOnStartup: true`, `executionPolicy: "STARTUP_ONLY"`, no held-back capability). Running agents rotate (write) manifests while the server runs, so a manual retry could race; restart-to-retry is safe (DEC-5).
- Owner and location: `autobyteus-server-ts/src/app-data-migrations/migrations/raw-trace-manifest-runtime-names/` (definition + files helper), registered at the end of the registry list.
- Normal path that remains current-schema-only: the writers and the library; they know no old label.
- Historical-shape types confined to migration-owned code: the frozen old-label table and the frozen set of current values (string literals; the migration imports neither `RuntimeKind` nor the library).
- Completion marker: the runner's migration record (`SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS` is terminal; no startup re-audit).
- Restart-safety/idempotency: each file is written to the fixed-name temporary file `raw_traces_manifest.json.tmp` in its folder, validated, then renamed over the manifest; a manifest whose entries are all current values or null is skipped; an interrupted attempt leaves converted and unconverted manifests, and the next attempt converts the rest.
- Validation before the current runtime proceeds: none beyond the per-file validation (the runtime does not wait for this migration).
- Backup/rollback: none (DEC-3, the user's decision): the rename keeps the old file valid until it replaces it, the change is one value per entry and invertible by the frozen table, and an older build does not read the field, so a rollback to the previous release works. The release notes say so.
- Concurrent old/new access: none (startup only).
- Historical migration retention: retire with the others when a minimum upgrade-from version is declared.

| Step | Source shape | Target shape | Owner | Validation | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| Discover | `agents/*`, `agent_teams/*/*`, `agent_orgs/*/*/*` folders holding `raw_traces_manifest.json` | list | migration files helper | file exists | absent → not a candidate |
| Decide | parsed JSON | `current` / `convert` / `unusable(reason)` | helper | each segment is an object; `runtime_kind` is null/absent, an old label, or a current value; anything else (including a non-string value) makes the file unusable | unusable → item `SKIPPED` as a preserved exclusion with the reason, file untouched |
| Convert | entries with an old label | same entries with the `RuntimeKind` value; every other key (unknown ones included), the entry order and the values untouched | helper | the temporary file `raw_traces_manifest.json.tmp` (fixed name per folder; the Memory Sync scanner excludes the `.tmp` suffix, `memory-sync-path-policy.ts:7`) is re-read and every value checked before the rename | validation failure → the temporary file is removed, item `FAILED`, manifest untouched; a leftover temporary file from an interrupted attempt is overwritten by the next one |
| Report | items | status and summary | definition | any item `FAILED` (a thrown walk error, or a write failure after validation) → `FAILED` (restart retries); else any preserved exclusion → `SUCCEEDED_WITH_WARNINGS` (also when nothing converted: never a minimum number of valid runs, Guideline §6); else `SUCCEEDED` | runner records it |

**Shape inventory (Guideline §2.3) and fixtures.** Each shape maps to a fixture in the migration's test folder:

| Shape | Seen in real data | Fixture |
| --- | --- | --- |
| `CODEX`, `CLAUDE`, `ANTIGRAVITY`, `AUTOBYTEUS` entries (complete) | yes (F-04) | one manifest per label, mixed in one manifest |
| `GROK_BUILD` | no (code only) | one manifest |
| `runtime_kind: null` / key missing | no (code path writes null when unknown) | one manifest each |
| already current values (including mixed old + current in one file: a partial earlier attempt) | no | two manifests |
| `status: pending` entry | no | one manifest |
| empty `segments` | no | one manifest |
| unknown string value; non-string `runtime_kind` (number, object) | no | one manifest each (untouched, preserved exclusion) |
| an entry with an extra unknown key | no | one manifest (key and position preserved) |
| a leftover `raw_traces_manifest.json.tmp` | no | one folder (replaced or removed) |
| entry not an object; `segments` not an array; root not an object; invalid JSON; unreadable file | no | one fixture each (untouched, preserved exclusion) |
| families and depths | yes | one run per family; a folder at a wrong depth is not visited |
| imports | yes, excluded (DEC-2) | an `imports/` manifest stays byte-identical |

## Data-Flow Spine Inventory

| ID | Scope | Behavior | Start | End | Governing owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | A backend reports a context compaction | The manifest entry holds the `RuntimeKind` value | `ProviderCompactionBoundaryRecorder` (server) / `RunMemoryFileStore` (native) | New data is written in the one spelling |
| DS-002 | Primary End-to-End | BEH-002 | App start after the update | Each own-family manifest holds `RuntimeKind` values | `RawTraceManifestRuntimeNamesMigration` | Existing data reaches the same spelling |

## Primary Execution Spine(s)

DS-001 (server runtimes): `Backend event converter -> compaction payload builder (RuntimeKind constant) -> AgentRunEvent -> ProviderCompactionBoundaryRecorder.parse (runtimeKindFromString) -> ExternalRuntimeMemoryWriter.appendRawTrace (boundary record) + rotateActiveRawTracesBeforeBoundary({runtimeKind}) -> RunMemoryFileStore -> RawTraceArchiveManager -> raw_traces_manifest.json`.

DS-001 (native): `NativeCompaction -> RunMemoryFileStore.archive…({runtimeKind: "autobyteus"}) -> RawTraceArchiveManager -> raw_traces_manifest.json`.

DS-002: `App startup -> AppDataMigrationRunner (order, prerequisites, STARTUP_ONLY) -> RawTraceManifestRuntimeNamesMigration.execute -> discover manifests at the family depths -> decide(manifest) -> convert + validate temporary file -> atomic rename -> item detail -> aggregate status -> runner record`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Subject nodes | Owner | Off-spine concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each backend states its own runtime once, as the `RuntimeKind` constant, in the payload it builds. The recorder accepts a payload only when its `runtime_kind` is a valid `RuntimeKind` (`runtimeKindFromString`), records the boundary and passes the value to the rotation, which stores it in the manifest. The native writer, in the library (which has no enum), writes the literal `autobyteus` through one constant in `run-memory-file-store.ts`. | payload, recorder, archive manager | recorder / store | none |
| DS-002 | The runner starts the migration after its prerequisites. It visits the three families at their fixed depths, and for every manifest decides current / convert / unusable by structure, converts by mapping only the old labels through the frozen table, validates the temporary file, and renames it into place. Unusable or unknown content is kept and reported; the aggregate status follows the guideline. | manifest, decision, report | migration | frozen table; discovery |

## Spine Actors / Main-Line Nodes

Backend payload builders (Claude, Codex, Antigravity, Grok), `ProviderCompactionBoundaryRecorder`, `RunMemoryFileStore` / `RawTraceArchiveManager` (library), `AppDataMigrationRunner`, `RawTraceManifestRuntimeNamesMigration`.

## Ownership Map

- Each backend payload builder owns its own runtime's statement (the enum constant). The recorder owns validation of the payload's runtime. The library owns the native literal and the manifest writing. The migration owns the old-label table and every decision about old data. The runner owns status, ordering and the record.

## Thin Entry Facades / Public Wrappers

N/A: no facade is added.

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| Five short-label string literals in the writers; the `"CODEX" \| "CLAUDE" \| string` payload type; the `string` tolerance in the recorder's parse | One spelling | `RuntimeKind` constants and type; `runtimeKindFromString` in the parse | The library's `runtimeKind?: string \| null` option stays a string (it has no enum) |
| Old-spelling expectations in tests and one web fixture | Data changes | New spelling | Frozen migration tests keep their frozen shapes |

Dead code in the touched files (Principle 7): none known; confirm at implementation that no helper existed only for the old labels.

## Return Or Event Spine(s)

N/A. The live compaction payload is a wire event; its `runtime_kind` value changes (clean cut, DESIGN rule 9); no reader reads it (web ignores it).

## Bounded Local / Internal Spines

`decide(manifest)` is a pure function: structure in, `current | convert(value) | unusable(reason)` out; no I/O.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Risk if on the main line |
| --- | --- | --- | --- | --- |
| Frozen old-label table | DS-002 | migration | The only place the old spelling exists | A table in current code (forbidden) |
| Fixed-depth discovery | DS-002 | migration | Visit exactly the three families | A recursive walk of every folder |

## Ownership Boundaries / Boundary Encapsulation / Dependency Rules

The migration folder imports only `domain/` contract types, node APIs and its own files (`tests/architecture/app-data-migration-boundaries.test.ts` enforces it); it names its prerequisites by id string; the registry is the one wiring point (it passes `memoryDir`). Current code imports nothing from the migration folder. The recorder depends on `runtimeKindFromString` (already in the server); the library depends on nothing new.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity |
| --- | --- | --- | --- |
| `RawTraceManifestRuntimeNamesMigration` (`AppDataMigrationDefinition`) | Own-family raw-trace manifests | Convert once | `memoryDir` |
| `ProviderCompactionBoundaryPayload.runtime_kind` | A compaction payload | A `RuntimeKind` | — |

Interface boundary check: both singular, explicit identity, ambiguity risk Low.

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same meaning everywhere (Principle 15)? |
| --- | --- | --- | --- |
| The migration | `raw-trace-manifest-runtime-names` (id `20261030_raw_trace_manifest_runtime_names`) | Yes (describes what it renames, like `memory-sync-source-id-names`) | Yes |
| The value | `RuntimeKind` value | Yes | Yes (the glossary's agent runtime kinds) |

## Existing Capability / Subsystem Reuse Check

| Need | Existing area | Decision | Why |
| --- | --- | --- | --- |
| Convert stored data once | App-data migration framework | Reuse | Runner, ordering, record, status |
| Atomic file replacement | Temporary file + rename as in `memory-sync-source-id-names` | Reuse the technique (small private helper) | Guideline §7 |
| Parse a runtime | `runtimeKindFromString` | Reuse | Existing function |

## Subsystem Allocation, Reusable Structures, Tightness, File Mapping

The only repeated structure is the five-name table; it exists twice by design: the enum (current code) and the frozen target set inside the migration (frozen copy, with a test that asserts it equals `Object.values(RuntimeKind)` so the frozen copy cannot drift). Fields are not duplicated otherwise.

## Target Subsystem / Folder / File Mapping

| Path (under `autobyteus-server-ts/src/` unless noted) | Kind | Responsibility |
| --- | --- | --- |
| `app-data-migrations/migrations/raw-trace-manifest-runtime-names/raw-trace-manifest-runtime-names-migration.ts` | New | Definition (id, flags, prerequisites), `execute`, status policy |
| `app-data-migrations/migrations/raw-trace-manifest-runtime-names/raw-trace-manifest-runtime-names-files.ts` | New | Frozen table and current set, discovery at fixed depths, `decide`, validated atomic rewrite |
| `app-data-migrations/app-data-migration-registry.ts` | Change | Register at the end with `prerequisiteMigrationIds` |
| `agent-execution/backends/claude/events/claude-compaction-status-payload.ts` (line 40), `.../codex/events/codex-provider-compaction-status-projector.ts` (97, 156), `.../grok/grok-build-compaction-status-payload.ts` (51), `.../antigravity/stream/agy-compaction-status-payload.ts` (13) | Change | `RuntimeKind.<X>` constant |
| `agent-memory/domain/memory-recording-models.ts` (94) | Change | `runtime_kind: RuntimeKind` |
| `agent-memory/services/provider-compaction-boundary-recorder.ts` (118) | Change | `runtimeKindFromString`; invalid → not a boundary |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` (272, 315) | Change | One constant, `'autobyteus'` |
| `docs/modules/grok_build_runtime.md` (285), `docs/modules/antigravity_cli_runtime.md` (395); `docs/modules/agent_memory.md` and `agent_work_journal.md` where they describe the manifest | Change | New spelling; mention the migration |
| Tests: `tests/app-data-migrations/raw-trace-manifest-runtime-names/*` (new); the unit/e2e/library tests listed in notes F-11; web fixture `agentStatusHandler.spec.ts` (four old values: lines 370, 421, 468, 514) | New / change | New spelling; fixtures per shape |

Folder boundary check: the new folder follows the sealed-area layout (one folder per migration, two files); no mixed layers.

## Concrete Examples

Stored before → after for one entry: `{"index":1,"file_name":"raw_traces_000001.jsonl","boundary_type":"provider_compaction_boundary","boundary_key":"codex:…","runtime_kind":"CODEX", … ,"status":"complete"}` → the same with `"runtime_kind":"codex_app_server"`. Bad shape avoided: a `labelToRuntimeKind` helper in current code, or a reader that accepts both.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why considered | Decision | Plan |
| --- | --- | --- | --- |
| A permanent label ⇄ `RuntimeKind` mapping in current code (316's first draft) | Avoids touching data | Rejected (DESIGN rule 10; the user) | Migration |
| Writers only, old data left, readers fall back to the run's runtime | Cheaper | Rejected | Leaves two spellings and a guessing fallback |
| Rewrite the 7,532 in-record copies | Full consistency | Rejected (never read; authoritative large files; Principle 5) | Out of scope |
| Rewrite Memory Sync imports | Full consistency | Rejected (DEC-2) | Owning node's migration and sync refresh them |
| Per-file backups | The Task's backup wording | Rejected (DEC-3, the user) | Atomic replace; own copy possible |

## Change / Refactor Sequence

1. Writers and types (server and library), then their tests.
2. The migration (files helper, definition, registry line) with its fixtures and the boundary test.
3. Docs.
4. Isolated validation (below).
No temporary seams; nothing obsolete remains after step 1 and 2.

## Key Tradeoffs

- Convert only the manifests (small, read by the archive machinery) and leave the in-record snapshots: full consistency is traded for not rewriting authoritative traces.
- Imports excluded: two spellings coexist in mirrored data until the owning node refreshes them; autobyteus-316 treats an unknown spelling as "runtime unknown".
- No backup: simplicity over a per-file copy; the user can copy the memory folder himself.

## Risks

- A manifest shape in other users' data that the fixtures do not cover → left untouched and reported (warning success), never blocking.
- Memory Sync uploads each migrated manifest once; memory search runs one journal pass per migrated run: small and one-time.
- The release notes must say a rollback to the previous release works (older builds do not read the field); that after a rollback and a later re-upgrade the entries the older build wrote keep the old spelling, because the terminal migration does not run again (autobyteus-316 reads them as "runtime unknown"); and that imports keep the old spelling until their node refreshes them.

## Guidance For Implementation

- Tests (TESTING.md layers): library unit (native writes `autobyteus`); server unit — the four payload builders, the recorder (valid kind recorded, invalid not), the migration with a fixture per shape (including idempotence, interrupted attempt = some converted, byte-identical kept files, status policy, prerequisites registered, target set equals the enum values), the sealed-area boundary test; e2e tests that asserted the labels updated.
- Source check (AC-005): outside `src/app-data-migrations/` (the new migration, `team-run-execution-tree-v1/v2` and `frozen/` hold labels of released shapes) and test fixtures of frozen shapes, the old labels do not occur. `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts:68` is a team launch-configuration fixture (another field): exempt.
- Notes for the record (review ARCH-F-003): the earlier layout migrations never walked `agent_orgs/`; this node has no legacy-layout folder; seven `raw_traces_archive_manifest.json.backup-*` files (written by the rotation-layout migration in June) keep old labels and are never read, so they stay.
- Isolated validation (never the user's data): build a temporary memory root by copying the real manifests only (read-only copy, no traces, no journals) into `/tmp`, run the migration through the real runner against it, then compare the census before and after (counts per label become counts per value; every other key identical), run it twice, and check the imports copy is byte-identical. Clean up.
- Docs to update in the same change: see mapping.
- Done means (Task): the user has approved this design; then writers and manifests use the `RuntimeKind` values, shown by the tests and the migration run on the isolated copy; merged to `personal`. No release unless asked.
