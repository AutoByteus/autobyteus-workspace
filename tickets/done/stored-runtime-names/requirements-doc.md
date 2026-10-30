# Requirements Document — autobyteus-343 (one spelling for the agent runtime in stored raw-trace data)

## Document Status

- Status: `Approved` (SR-002). DEC-2 and DEC-3 are the user's own decisions (his words: "i like your recommended solution"; "we do have benefits making the data and code cleaner and consistent", 2026-10-30).
- Current solution revision ID: `SR-002`
- Package identifier: `stored-runtime-names`
- Request / ticket: Project Task `autobyteus-343` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`). Blocks `autobyteus-316`.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user; the user's decision came in the Solution Designer's conversation about 316.
- Requirements owner: Solution Designer
- Approval: the user, in the conversation (2026-10-30): he chose to do this ticket first, then answered my recommendation (imports left alone, no per-file backup) with "i like your recommended solution". The Solution Designer approves the rest within the direction. He approved the DESIGN for the build on 2026-10-30 ("I trust your judgment … let's go") and accepted leaving the old label copies inside old trace records. His real data changes only through the released migration, when he updates the app.
- Behavior-defining supplements: none. Evidence: `investigation-notes.md`.

## Problem And Desired Outcome

- Problem: the field `runtime_kind` of the raw-trace manifest (`raw_traces_manifest.json`, one entry per archived segment) stores the agent runtime as a short label (`CODEX`, `CLAUDE`, `ANTIGRAVITY`, `GROK_BUILD`, `AUTOBYTEUS`), while everything else (run metadata, usage records, launch configurations) stores the `RuntimeKind` value (`codex_app_server`, `claude_agent_sdk`, `antigravity_cli`, `grok_build`, `autobyteus`). Two spellings for one concept in one field name. `DESIGN.md` rule 10 says a stored name follows the code and is never kept behind a permanent mapping; autobyteus-316 would otherwise have to carry such a mapping to read which runtime wrote an archived raw-trace file.
- Desired outcome: one spelling. Backends write the `RuntimeKind` value; existing manifests are converted once by a sealed migration; current code has no label table and no old-spelling reader.
- Observable success: after the update, every `segments[].runtime_kind` in the user's manifests is a `RuntimeKind` value (or null where none was recorded); a new compaction rotation on any of the five runtimes writes the `RuntimeKind` value; no current source file contains the old labels except the migration's frozen table.

## Relevant Current And Desired Behavior

| ID | Kind | Scenarios | Current | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | The five backends' compaction payloads and the native writer put a short label in `runtime_kind`; the recorder passes it to the manifest. | They write the `RuntimeKind` value; the live compaction payload carries the same value. | Everything else in the payload and the rotation (keys, boundary types, idempotence). |
| BEH-002 | Operational | SCN-002, SCN-003, SCN-004 | Existing manifests hold labels. | At the first start after the update, each live run's manifest has its labels replaced by the `RuntimeKind` values; other keys, entry order and values are unchanged; a manifest that cannot be converted is kept as it is and reported. | Raw-trace records, archived segment files, journals, run metadata, history. |
| BEH-003 | System | SCN-005 | Nothing reads the stored label. | Still nothing reads it except autobyteus-316 later, with `runtimeKindFromString`; no mapping exists in current code. | Memory search, journals, sync behavior (apart from the one-time effects in the design). |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| User | Clean data and code | One spelling; nothing lost | His real data changes only through the released migration, after his approval of the design |
| Autobyteus-316 | Read each archived file's runtime | `runtimeKindFromString(entry.runtime_kind)` works with no mapping | Starts after this ticket |
| Memory Sync | Keep mirroring | No broken state | Imports are mirrors of other nodes' files |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | New raw-trace manifest entries (and the live compaction payload) carry the `RuntimeKind` value on all five runtimes | SCN-001 |
| UC-002 | Existing manifests of this node's own runs (agents, team members, Org members) are converted once at startup | SCN-002, SCN-003, SCN-004 |

### Out Of Scope

- The 7,532 label copies inside old raw-trace records (snapshots of provider events in authoritative trace files that nothing reads; Principle 5: no rewrite of large data for cleanliness). New records get the new spelling.
- The field name `runtime_kind` itself, and any other stored name.
- Memory Sync imports (`imports/<source>/…`, mirrors of other nodes' files) — pending DEC-2.
- The `…ModelConfig` rename of the stopped-run edit (autobyteus-316 owns it).
- Making an older build read the converted data (it does not read the field: F-03).
- Any release.

### Non-Goals

Changing what compaction records, changing the manifest format, adding a version field, or giving the journal a runtime (autobyteus-316).

### Preserved Behavior Boundary

Rotation and archive behavior; the manifest's other keys and their order; raw-trace and journal contents; startup availability (one run's unreadable manifest never blocks startup or another run); Memory Sync bookkeeping.

### Prerequisites

The migrations that produce today's layout run first: `20260617_raw_trace_rotation_layout`, `20260707_raw_trace_active_file_name`.

### Review Authority

Findings must cite a REQ/AC/BEH ID. New behavior is a `Requirement Gap`.

## Requirements

| ID | Requirement | Behaviors | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | Every writer of a raw-trace runtime label writes the `RuntimeKind` value: the Claude, Codex, Antigravity and Grok compaction payloads, the native compaction writer, and the type of the payload's `runtime_kind`. A payload without a valid `RuntimeKind` is not recorded as a boundary. | BEH-001 | Must | Task; F-02 |
| REQ-002 | A sealed app-data migration converts `segments[].runtime_kind` in the `raw_traces_manifest.json` of every run of this node's three families (`agents/<run>`, `agent_teams/<team>/<member>`, `agent_orgs/<org>/<team>/<member>`) from the old label to the `RuntimeKind` value, with a frozen old-label table that lives only inside the migration. Entries already holding a `RuntimeKind` value or null are left as they are. All other keys, the entry order and every other value are unchanged. | BEH-002 | Must | Task; DESIGN rule 10 |
| REQ-003 | The migration is idempotent and restart-safe: each manifest is replaced atomically; a manifest already converted is recognized and untouched; an interrupted attempt is completed by the next one. It runs after the migrations that produce today's layout. | BEH-002 | Must | Guideline §7 |
| REQ-004 | One run's unusable manifest never blocks startup or another run: a manifest that cannot be read or parsed, has no segment list, has an entry that is not an object, or holds a `runtime_kind` that is neither an old label, a `RuntimeKind` value, null nor absent is a preserved exclusion: it is left byte-identical and reported with the run and the reason, never a failure of the migration. The migration ends `SUCCEEDED_WITH_WARNINGS` when it preserved at least one exclusion and `SUCCEEDED` otherwise; `FAILED` is reserved for an error while walking or a failed write after validation (a thrown error), which a restart retries. | BEH-002 | Must | DESIGN rule 7; Guideline §1, §6 |
| REQ-005 | After this change no current (non-migration) source file contains the old labels or a mapping between them and `RuntimeKind`; the stored runtime of a segment is read, by anyone, with the existing `runtimeKindFromString`. | BEH-003 | Must | DESIGN rule 10 |
| REQ-006 | The migration and the writers are covered by tests with a fixture for every source shape (each old label, null, missing, already converted, unknown value, unreadable file, no segment list, pending segment) and by a run on an isolated copy of real-shaped data; the documentation that names the labels is updated in the same change. | BEH-001, BEH-002 | Must | Guideline §2.3, §9 |
| REQ-007 | The migration's cost is bounded: it visits only the three families at their fixed depths, reads and rewrites only manifests that need it, and adds no startup re-audit after completion. | BEH-002 | Must | Guideline §7 "Completed means completed" |

## Acceptance Criteria

| ID | Req | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | A compaction on each of the five runtimes | The live payload and the manifest entry hold the `RuntimeKind` value | Writer tests per runtime; library test for native |
| AC-002 | REQ-002 | A fixture manifest with each old label, and an entry with an extra unknown key | After the migration the entries hold the matching value; every other key (unknown ones included), the entry order and every other value are unchanged | Migration test |
| AC-003 | REQ-003 | Run it twice; interrupt after some manifests; a leftover temporary file from an interrupted attempt | The second run converts only the rest and changes nothing already converted; a leftover temporary file is replaced or removed and never left behind | Migration test |
| AC-004 | REQ-004 | Fixtures: unreadable, not an object, no `segments`, an entry that is not an object, unknown string value, non-string `runtime_kind` | Each is left byte-identical and reported with run and reason; the others convert; status is `SUCCEEDED_WITH_WARNINGS` (also when no manifest converted); a node with none of these ends `SUCCEEDED`; a write error ends `FAILED` | Migration test |
| AC-005 | REQ-005 | Search of current sources | Outside `src/app-data-migrations/` (which holds the new migration and the frozen team-tree shapes) and test fixtures of frozen shapes, the old labels do not occur in the writers, types, tests of live behavior, web fixtures and docs | Source check |
| AC-006 | REQ-006 | Real-shaped isolated copy | Counts: all four labels in the real-shaped copy converted; census after equals census before with names replaced | Isolated run |
| AC-007 | REQ-007 | Fixture with many runs | Only manifests are touched; a second start does no work | Migration test |
| AC-008 | Preserved | Existing suites | Rotation, archive, journal, memory search and the frozen migrations' tests pass | Existing suites |

## Relevant Scenarios And Journeys

| ID | Kind | Trigger | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | System | A run compacts its context on any runtime | The new manifest entry and the payload carry the `RuntimeKind` value | Supported Normal Scenario | F-02 |
| SCN-002 | Operational | The user installs the update; the app starts | Existing manifests are converted before use; the app is available meanwhile | Supported Normal Scenario | User decision; F-04 |
| SCN-003 | Operational | A fresh install or a node with no archived segments | Nothing to do | Supported Normal Scenario | F-04 |
| SCN-004 | Operational | The first start ends early (quit) after some manifests | The next start converts the rest | Supported Explicit Edge Scenario (Guideline §5: an unfinished attempt) | Guideline |
| SCN-005 | System | Autobyteus-316 reads a segment's runtime | `runtimeKindFromString` returns the runtime; no mapping | Supported Normal Scenario | Task |
| SCN-006 | Operational | A manifest that the migration cannot use | Kept, reported; other runs convert | Supported Explicit Edge Scenario (DESIGN rule 7) | Guideline §1 |

## Decisions

| ID | Decision | Owner | Reasoning |
| --- | --- | --- | --- |
| DEC-1 | Migrate (not map): the labels are a second name for the `RuntimeKind` value of the same field; convert the manifests and write the new spelling. | **The user** (2026-10-30) | DESIGN rule 10; one clean spelling in data and code. |
| DEC-2 | **Memory Sync imports are not rewritten.** | **The user** (2026-10-30: "i like your recommended solution") | An import is a mirror of another node's files (137 manifests, 756 entries here), tracked with a hash per file in its `sync-manifest.json`; rewriting it means also rewriting that bookkeeping and touching mirrored data, and the owning node's own migration plus sync refreshes the mirror. Cost of excluding: until then, an imported run's archived segments carry the old spelling and autobyteus-316 reads them as "runtime unknown" (the generic journal rendering), a graceful downgrade for old imported runs only. Alternative: include imports and update their `sync-manifest.json` entries (sha256, size) in the same step, as the active-file-name migration did for its rename. |
| DEC-3 | **No per-file backup.** | **The user** (2026-10-30: "i like your recommended solution"; the Task: "real data changes only on his approval and after a backup": his approval is given for the released migration, and no real data is touched before the build) | The rewrite changes only the value of one key per entry, atomically (temporary file then rename, so the old file stays valid until the rename); it is deterministic and invertible by the frozen table; an older build does not read the field (F-03); the guideline asks to justify every backup (§7) and the precedents' backup files are litter next to every run. Alternative: a `raw_traces_manifest.json.backup-<time>` next to each converted manifest (825 small files here) — or take your own copy of `~/.autobyteus/server-data/memory` before updating. |
| DEC-4 | The 7,532 label copies inside old trace records stay. | Solution Designer, within the Task | Out of scope in the Task; never read; Principle 5. |
| DEC-5 | `STARTUP_ONLY`, `requiredOnStartup`, no held-back capability. | Solution Designer | Running agents rotate (write) manifests while the server runs, so a manual retry could race; restart-to-retry is safe. Nothing in production waits for the conversion (the first reader treats an unknown spelling as "runtime unknown"). |
| DEC-6 | The migration is registered after `20260707_raw_trace_active_file_name` and `20260617_raw_trace_rotation_layout` (declared as prerequisites). | Solution Designer | F-08. |

## Assumptions / Unknowns

U-1 (a pending segment carries the label too) and U-2 (no real `GROK_BUILD` sample) are settled with fixtures in the design; U-3 is DEC-2.

## Readiness Check

Requirements are stable, linked and testable and approved (SR-002). Design next; the user's approval of the design comes before any build.
