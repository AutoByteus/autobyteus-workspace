# Design Spec — Work Journal

## Solution And Approval Basis

- **Current solution revision:** `SR-018`.
- **Approved requirements baseline:** requirements-doc.md, REQ-W1–W9, DEC-W1–W10, status Approved.
  - **Approved by:** the Solution Designer within the user's direction, on the user's instruction (U17).
  - **Confirmed by the user:** placement U19–U21, and "requirement is clear? if yes, go on with the task" (U22, 2026-10-18).
- **Behavior-defining supplement:** work-journal-contract.md, Approved, revision SR-010.
  - Decisions D1–D4 (U17); SR-008 validation corrections and SR-010 design refinements stay within the approved direction (contract §12–§13).
  - Machine-readable copy of contract §4: work-journal-builtin-tools.json.
- **Design status:** `Ready`.
- **Canonical investigation notes:** /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/tickets/in-progress/work-journal/investigation-notes.md. J10–J17 cover architecture; J01–J09 cover requirements and the contract.
- **Authorities read (2026-10-18):**
  - `references/architecture-design.md`, `references/design-principles.md`;
  - repository `DESIGN.md`, plus the project documents it names for this change: `autobyteus-server-ts/docs/design/data_migration_guideline.md` (persisted data) and `autobyteus-server-ts/docs/design/collaboration_model.md` (run storage). Correction in SR-012: the collaboration model was only searched for SR-010, and was read in full on 2026-10-18. The design agrees with CM-8, CM-9, §3 and §4. One gap was found: §3 lists a run's memory contents and must name the journal (File Mapping);
  - `autobyteus-server-ts/AGENTS.md`;
  - no `design-examples.md` sections used.
- **Project principle conflicts or discrepancies:** none that conflict.
  - One judgement is recorded under Persisted Data: the journal manifest's `renderer_revision`. It is a key for regenerating derived output, not a schema version of the manifest. The guideline forbids schema version fields, and this field is not one.

## Current-State Read

**Raw traces.** Each agent run has one memory folder (CM-8). Its raw traces are written by two writers:
- **External runtimes** (Claude, Codex, Antigravity, Grok): AgentRunMemoryRecorder subscribes to the run's events and writes through a per-run queue (J12).
- **AutoByteus native:** autobyteus-ts writes them inside the runtime.

**Rotation.** Compaction rotates the active file into closed segments listed in `raw_traces_manifest.json` with `status: complete`. RawTraceFileSourceService already lists complete segments plus the active file and normalizes their records (J12).

**The export being replaced.** The readable export is `src/agent-work-traces` (J10). It is built only on demand by skill improvement (J11).
- It re-renders every raw file on each call and never reuses closed files.
- It renders through the run-history replay projection, which only has message, reasoning, tool and compaction events. That is the root cause of lost notices, system instructions and teammate senders.
- It uses runtime tool names and caps values silently at 20,000 characters.

**Per-run attachment.** Every live run passes `AgentRunActivationRegistry.markPrepared → AgentRunResourceManager.attach`. That point already attaches file changes, artifact relay and the memory recorder, and detaches them on release (J13). It is the existing place for "something that follows a run's events".

**Constraints the target respects:**
- raw traces are never changed (REQ-W9);
- journal failures never affect the run (REQ-W6);
- no startup scan of history (data_migration_guideline §6);
- each run's files stay inside its own folder (CM-8, DEC-W10).

## Task Size And Architectural Risk (Mandatory)

- **Task size:** `Large`.
- **Size rationale:**
  - a new server subsystem (`src/agent-work-journal`, about 20 files), including a renderer with five runtime translations;
  - a new per-run attachment wired into both composition roots;
  - replacement of the skill-improvement evidence package (service, trigger message, session state and its reader);
  - removal of `src/agent-work-traces` and its dead replay-projection options;
  - one startup app-data migration;
  - updates to the built-in improver templates, module and architecture docs, and tests.
- **Architectural risk:** `High`.
- **Risk rationale:**
  - a new owner on the live run event path (per-run updater that waits for the memory recorder);
  - new persisted derived data in every run folder (synced by memory sync);
  - a deletion migration of old export folders;
  - a changed persisted shape in skill improvement's session state (strict reader converted to tolerant);
  - a changed evidence contract for the improver agent.
- **Escalation trigger:** return a Design Impact if implementation finds any of these:
  - AutoByteus native raw traces are not flushed by the time TURN_COMPLETED is observed;
  - rendering an active file at turn end measurably delays later turns;
  - any reader of run folders breaks on `work_journal/`;
  - a raw-trace shape that the contract does not cover appears in fixtures.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Work-trace module read | src/agent-work-traces/** (J10) | Re-renders all files each call; renders through the replay projection, which loses record types | Replace with a renderer that reads normalized raw records directly; reuse closed files | — |
| Replay projection options | run-history/projection/transformers/raw-trace-to-historical-replay-events.ts:140-247 (J10) | Pairing options used only by work traces | Remove them as dead code in this change | — |
| Skill improvement | skill-improvement-service.ts:116-139; trigger builder :18-42; session service :104-112,172; session store :28-33 (J11) | The only consumer; it stores paths/hash, read for nothing | Switch to the WorkJournalService package; rename fields; tolerant reader | — |
| Raw-trace source | agent-memory/services/raw-trace-file-source-service.ts; raw-trace-record-normalizer.ts (J12) | Lists complete segments + active; keeps every type and field the contract needs | Reuse as the only raw-trace reader | — |
| Memory recorder | agent-memory/services/agent-run-memory-recorder.ts:57-91 (J12) | Per-run write queue; `waitForIdle(runId)` | The updater awaits it before rendering | — |
| AutoByteus native writer | autobyteus-ts memory/store/run-memory-file-store.ts:159-193, 285-318 (J12) | Synchronous appends inside the runtime | Render after TURN_COMPLETED; the open file is re-rendered at each turn end | Order of writes vs TURN_COMPLETED is to be confirmed by a test (Risks) |
| Attachment point | agent-run-activation-registry.ts:124-132; agent-run-resource-manager.ts:56-128; both composition roots (J13) | One per-run attach/release for every run | Attach WorkJournalRunUpdater there | — |
| Volumes | probes and `find` (J14) | Active p90 5.2 MB, max 28 MB; segments max 35.7 MB; 0.18% of calls split across files | Re-render only the open file per turn; render closed files once; per-file pairing | Real per-turn cost is measured in validation |
| Memory sync policy | memory-sync/shared/memory-sync-path-policy.ts:7,71-80 (J15) | Syncs all files except temp suffixes | `work_journal/` is synced with the run; atomic writes use `.tmp` | — |
| Old export data | 7 folders (J15); 3 improver_session.json (J11) | Derived and regenerable; session fields inert | Delete the folders by migration (DEC-W10); session state directly usable | — |
| Migration precedents | remove-external-runtime-working-context-snapshots-migration.ts; runner :56-75 (J16) | Walk memory roots, skip symlinks, item details; terminal statuses skipped | Small deletion migration with warning disposition | — |
| Diff library | package.json of both packages (J17) | None | Local old/new diff builder | — |

## Intended Change

- **Add a Work Journal subsystem** that renders each run's raw traces into runtime-neutral Markdown files under `<run memory folder>/work_journal/`, following work-journal-contract.md.
- **Keep it current from the run's own events:** the open file after each turn and each compaction; closed files once.
- **Switch skill improvement to it.**
- **Remove the work-trace export,** its dead options and its stored folders.

## Change Scope (Mandatory)

**In scope:**
- **Scenarios** SCN-W1–W7; **requirements** REQ-W1–W9; **decisions** DEC-W1–W10.
- **Areas changed:**
  - new `autobyteus-server-ts/src/agent-work-journal/`;
  - per-run attachment in `agent-execution/services/agent-run-resource-manager.ts` and both composition roots;
  - skill improvement's evidence package, trigger message and session state;
  - removal of `src/agent-work-traces/` and of the replay projection's dead options;
  - one app-data migration;
  - the built-in Retrospective Skill Improver templates;
  - server module/architecture docs and the three web docs that mention work traces;
  - tests for all of the above.

**Deliberately left alone:**
- **Raw-trace writers, rotation and compaction** (REQ-W9; DEC-W9 keeps adapters as fact recorders).
- **Run history and the memory explorer UI** (DEC-W6: no new UI).
- **Memory sync:** the journal travels with the run's files under the existing policy.
- **The autobyteus-ts presentation renderers,** which compaction still uses (J10).
- **Grok/Codex adapter enrichment** (exit codes, file-change kind): follow-ups per DEC-W9.

**Follow-ups:**
1. Record the Codex command exit code in raw traces. The adapter reads it at codex-tool-payload-parser.ts:517-520 and drops it.
2. Record the Codex file-change kind (add/update/delete).
3. Record Grok's exit code as a field instead of text inside the error.
4. Optional, only if validation shows a measurable cost: incremental append for very large open files (see Key Tradeoffs).
6. Accepted residue (from ARCH-REV-004): after a rollback and a re-upgrade, a `work_traces/` folder that the old build regenerated stays as inert residue. The deletion migration has already run, and nothing reads the folder.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-W1 | System | REQ-W1, W7 / AC-W1, AC-W7 | A live run's turn ends (TURN_COMPLETED / TURN_INTERRUPTED) | Tool calls appear under runtime names only in the on-demand export (J10) | Built-ins become plain actions per the run's runtime; every other tool gets the generic line (contract §2–§6) | DS-001, DS-003 |
| BEH-W2 | System | REQ-W2, W3, W4 / AC-W2–W4 | Same | Teammate shown as "user", notices dropped, silent 20k cap (J10) | Senders, notices, attachments and user-interrupted turns; runtime machinery omitted (DEC-W11, contract §8 D5); visible shortening with links (contract §7–§8) | DS-001, DS-003 |
| BEH-W3 | System | REQ-W5, W6 / AC-W5, AC-W6 | Turn end; compaction (COMPACTION_STATUS) | All files re-rendered on demand only (J10) | Open file re-rendered after each turn; a closed file written once when its segment is complete; failures logged, run unaffected | DS-001, DS-004 |
| BEH-W4 | System | REQ-W6 (old runs) / SCN-W6 | First need: a turn end after restore, or a consumer's request | — | Closed segments with no journal file are rendered at that point; no startup scan | DS-001, DS-002 |
| BEH-W5 | Contract | REQ-W8 / AC-W8 | Skill improvement manual trigger (user action, live target) | Uses the AgentWorkTraceProjectionService package (J11) | Uses the WorkJournalService package; the improver gets journal paths; "work trace" is gone from code, storage and docs | DS-002 |
| BEH-W6 | Operational | REQ-W8, REQ-W9 / DEC-W10 | App startup (app-data migration runner) | 7 old `work_traces/` folders (J15) | Deleted once; raw traces, history and restore unchanged | DS-005 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| work-journal-contract.md | Behavior-defining journal format: actions, built-in tables, generic rule, envelopes, outcomes, non-tool records, examples | REQ-W1–W4, DEC-W1, DEC-W7, DEC-W8 | The renderer implements it exactly. Its sections map one-to-one onto renderer files (see File Mapping). | Approved (SR-010) |
| work-journal-builtin-tools.json | Machine-readable copy of contract §4 | REQ-W1 | Test oracle: each runtime translation's built-in names must equal the JSON lists | Approved, with the contract |
| probes/validate-contract.json, probes/runtime-texts.txt, probes/inventory-classification.txt | Real argument/result shapes, runtime-text counts and classification | AC-W1, AC-W2 | Sources for the hand-built fixtures (TESTING.md: never copy real user data) | Evidence |

## Task Design Health Assessment (Mandatory)

- **Change posture:** `Feature`, with replacement of an existing export.
- **Current design issue found:** `Yes`.
- **Structural triggers that fire:**
  - **Responsibility overload / wrong owner:** the export borrows the run-history replay projection, whose model is built for UI replay. The journal's needs (every record type, senders, notices, runtime translation) don't fit it, which produced REQ-W2's losses (J10).
  - **Legacy cleanup:** the projection options exist only for the export (J10).
  - **Capability-area reuse** (checked, reuse chosen): raw-file listing and normalization already exist (RawTraceFileSourceService), as does per-run attachment (AgentRunResourceManager) and recorder idleness (`waitForIdle`).
  - **Ruled out:** a shared-structure tightness trigger for the manifest. The new manifest has one meaning per field, and old export fields are not carried over.
- **Root cause classification:** `Boundary Or Ownership Issue`. A readable record of work has no owner of its own and borrows the UI-replay projection.
- **Refactor needed now:** `Yes`.
- **Evidence:** J10–J13.
- **Design response:**
  - give the journal its own subsystem, which reads normalized raw records directly;
  - delete the export and the replay projection's export-only options;
  - leave the replay projection itself untouched for run history.
- **Refactor rationale:** extending the replay projection with notices, senders and runtime tables would push journal policy into the UI-history owner.
- **Intentional deferrals:** incremental rendering of very large open files (Key Tradeoffs) and adapter enrichments (Follow-ups). Residual risk: per-turn cost on the largest open files. It is bounded by the data (max 28 MB today) and off the run's critical path.

## Terminology

- **Journal file:** the Markdown rendering of one raw-trace file. Either *closed* (from `raw_traces_NNNNNN.jsonl`, written once) or *open* (from `raw_traces_active.jsonl`, re-rendered).
- **Runtime translation:** one runtime's part of the contract. It has two pieces:
  - **built-in converters:** contract §4;
  - **runtime-text and envelope normalization:** contract §6.
- **Renderer revision:** an integer that identifies the rendering rules. A closed file is reused only when it was written by the current revision.

## Section Fill Order

The template's order was followed.

## Legacy Removal Policy (Mandatory)

- **Obsolete paths and files in this scope:**
  - `src/agent-work-traces/**`;
  - `tests/agent-work-traces/**`;
  - the replay projection's `interactionByIdentity` / `traceById` / `includedToolIdentityKeys` options;
  - the work-trace fields in skill improvement (`workTraces`, `workTraceSummaryHash`, metadata keys `skill_improvement_work_trace_*`, the `AgentWorkTracePackage` type);
  - `docs/modules/agent_work_traces.md`;
  - the stored `work_traces/` folders.
- **Compatibility wrappers, dual paths or legacy fallbacks kept:** `None`.

## Persisted Data / State Transition Decision (Mandatory)

**1. New `<run memory folder>/work_journal/` (new derived data).**
- **Shape:** `work_journal_NNNNNN.md`, `work_journal_active.md`, `work_journal_manifest.json`.
- **Decision:** `Not Affected` (new). Writer and reader follow guideline §3:
  - the writer emits the exact shape;
  - the reader projects known fields and treats anything unreadable as absent, which simply re-renders;
  - no schema version field.
- **`renderer_revision`:** a cache key for derived output. It answers "was this closed file produced by today's rules?" (equal → keep, otherwise → re-render from raw traces). Readers never branch on old shapes. Its benefit: a future format change regenerates closed files without a migration.
- **Disposability:** the whole folder can be deleted and rebuilt from raw traces.

Manifest example (exact writer):
```json
{
  "run_id": "solution_designer_a557…",
  "runtime_kind": "codex_app_server",
  "renderer_revision": 1,
  "files": [
    { "journal_file": "work_journal_000001.md", "source_file": "raw_traces_000001.jsonl", "source_record_count": 141, "state": "closed" },
    { "journal_file": "work_journal_000002.md", "source_file": "raw_traces_000002.jsonl", "source_record_count": 187, "state": "closed" },
    { "journal_file": "work_journal_active.md", "source_file": "raw_traces_active.jsonl", "source_record_count": 57, "state": "open" }
  ]
}
```

**2. Old export folders.** 6 at `<run>/work_traces/`, 1 at `<run>/self_evolution/work_traces/` (J15).
- **Decision:** `Discard or Rebuild`. Raw traces are the authoritative source, and the journal replaces the content. Nothing reads these folders after this change.
- **Deletion approval:** DEC-W10 (U20–U21).
- **Mechanism:** a startup migration (DS-005), because current code must not know the old layout (guideline §4).

**3. `skill_improvement/improver_session.json`.** 3 files (J11) with `schemaVersion`, `workTraces{…}` and `lastRequest.workTraceSummaryHash`.
- **Decision:** `Directly Usable — No Migration`. The obsolete fields were only ever carried forward (J11).
- **Reader:** converted from the strict `schemaVersion === 1` check to a projection of known fields, as guideline §3 requires when a format is touched.
- **Writer:** writes the new `workJournal{rootPath, manifestPath, lastEvidenceHash}` and `lastRequest.workJournalEvidenceHash`, with no `schemaVersion` (SR-018 restores the SR-010 decision and withdraws SR-016).
  - **Rollback effect, accepted:** after a rollback, the released strict reader treats a file written by this build as absent, and skill improvement starts a fresh improver session once. This is an ordinary writer change, not a migration, so the corrected rollback rule needs no compatibility (RELEASE.md "Rollback"; data_migration_guideline.md §4 "Rolling back after a migration").
- **Old files:** they load with the new fields absent (truthful meaning: no journal-based request yet). The old keys disappear on the next ordinary save.

**4. Skill improvement `record.json` `evidenceSummaryHash`.** `Not Affected`: same name, same meaning (the hash of the evidence package).

**5. Raw traces, raw-trace manifests and run metadata.** `Not Affected`: read only.

**Data migration guideline checklist** (for item 2; items 1 and 3 need no migration):
1. **Need:** deletion of retired derived output that current code cannot know about. A tolerant reader is not applicable, because no reader remains.
2. **Availability:** the migration never blocks startup or new work. A folder that can't be deleted stays as inert residue with a warning (guideline §6, inert residue).
3. **Source and target:**
   - *Inspected source:* user data, read-only. 7 folders, each containing `work_traces_manifest.json` plus `work_trace_*.md`.
   - *Shape inventory:* (a) `<run>/work_traces/`, 6 folders; (b) `<run>/self_evolution/work_traces/`, 1 folder; (c) `<run>/skill_improvement/work_traces/`, 0 found but named by ARCHITECTURE.md as an older location.
   - *Target:* their absence. There is no admission owner, because nothing reads them.
   - *Fixtures:* one each for (a), (b) and (c), plus a decoy folder named `work_traces` without a manifest, which must be kept.
4. **Disposition:**
   - a deleted folder → `MIGRATED`;
   - a folder named `work_traces` without `work_traces_manifest.json` → `SKIPPED` (kept; not recognized);
   - a symlinked directory → `SKIPPED` (not traversed);
   - a delete error → `FAILED` item, with aggregate `SUCCEEDED_WITH_WARNINGS`. The residue is inert, and everything else validates independently.
5. **Commit and retry:** `fs.rm` per folder. A retry after interruption finds only the remaining folders. No backup, because the content is regenerable and deletion is approved.
6. **Current-only boundary:** the old folder name and manifest file name appear only inside the migration file, as frozen string constants.
7. **Cost:** one directory walk of the memory roots (about 4,000 run folders), once. Terminal status is skipped afterwards.
8. **References:** improver_session.json held absolute paths into these folders (inert fields, item 3). No other typed reference.
9. **Evidence:** migration unit tests with the fixtures from item 3, plus a repeat-run idempotence test.
10. **Rollback** (data_migration_guideline.md §4, "Rolling back after a migration"): the older build can still work after a rollback. Nothing it reads was converted, and it regenerates the deleted derived folders on demand. No release-note warning is needed.
11. **Lessons:** follows the snapshot-removal precedent (walk, skip symlinks, item details) and avoids its released-location classifier, because recognition here is purely structural. Independent architecture review is required by the risk classification.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-W1–W4 | A live run's turn ends or its compaction completes | The run's `work_journal/` files and manifest are current | WorkJournalRunUpdater → WorkJournalService | Keeps the journal current for every runtime without touching the run |
| DS-002 | Primary End-to-End | BEH-W4, BEH-W5 | User starts Skill Improvement for a live run | The improver receives the journal package paths | SkillImprovementService → WorkJournalService | The only current consumer; the same boundary serves future consumers (Step 2) |
| DS-003 | Bounded Local | BEH-W1, BEH-W2 | One raw-trace file's normalized records | One journal file's Markdown text | WorkJournalFileRenderer | Where the contract lives |
| DS-004 | Bounded Local | BEH-W3 | `ensureCurrent` for one run | Reconciled files plus manifest | WorkJournalService (reconcile) | Write-once closed files, re-rendered open file, serialized per run |
| DS-005 | Primary End-to-End | BEH-W6 | App startup | Old export folders removed | RemoveWorkTraceExportsMigration via the app-data migration runner | One-time cleanup outside current runtime code |

## Primary Execution Spine(s)

- DS-001: `AgentRun events (TURN_COMPLETED / TURN_INTERRUPTED / COMPACTION_STATUS) → WorkJournalRunUpdater (per-run, coalesced) → AgentRunMemoryRecorder.waitForIdle(runId) → WorkJournalService.ensureCurrent(target) → RawTraceFileSourceService (complete segments + active) → WorkJournalFileRenderer → WorkJournalStore (atomic writes) → <run>/work_journal/`
- DS-002: `User (Skill Improvement trigger) → SkillImprovementService → WorkJournalService.ensureCurrent(target) → WorkJournalPackage → ImproverTriggerMessageBuilder → Retrospective Skill Improver run`
- DS-005: `Startup → AppDataMigrationRunner → RemoveWorkTraceExportsMigration → memory roots walk → fs.rm(work_traces)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When a run's turn ends or a compaction completes, the updater for that run schedules one update, merging bursts. It waits until the memory recorder has written that turn's raw records, then asks the service to make the journal current. The service lists the run's complete segments and active file, renders only what is missing or open, writes each file atomically, then writes the manifest. Errors are logged and never reach the run. | Run, updater, service, renderer, store | WorkJournalRunUpdater (scheduling); WorkJournalService (content) | Per-run serialization; error logging |
| DS-002 | Skill Improvement calls the same `ensureCurrent` for its live target, then lists the package's files in the improver's trigger message and stores the evidence hash. | Skill improvement, service, package | SkillImprovementService | Session state persistence |
| DS-003 | The renderer orders the file's records, pairs tool calls with results in the same file, renders each record by contract §2–§8 with the run's runtime translation, shortens per §7, and adds the header and links. | Records, entries, runtime translation | WorkJournalFileRenderer | Command builders, diff builder, shortener, envelopes, teammate envelope parser |
| DS-005 | On startup the runner executes the migration once. It walks the memory roots and deletes recognized old export folders, reporting item details. | Runner, migration | RemoveWorkTraceExportsMigration | — |

## Spine Actors / Main-Line Nodes

AgentRun (event source) · WorkJournalRunUpdater · WorkJournalService · WorkJournalFileRenderer · WorkJournalStore · SkillImprovementService · RemoveWorkTraceExportsMigration.

## Ownership Map

- **WorkJournalRunUpdater** owns a run's update scheduling:
  - which events trigger an update;
  - merging bursts into one pending update;
  - waiting for the memory recorder;
  - error isolation and logging;
  - detaching on release.

  It owns no content.
- **WorkJournalService** owns the journal of a run. It is the authoritative boundary: the only public entrypoint, and the only writer.
  - It runs reconcile (what to render, when to reuse a closed file), per-run serialization of writers within the process, the evidence hash, and the returned package.
  - The singleton `getWorkJournalService()` makes the serialization hold for every caller.
- **WorkJournalFileRenderer** owns the translation of one raw file into text (the contract). It is pure: records + runtime kind + source file name → Markdown, with no I/O.
- **WorkJournalStore** owns paths, the manifest's read projection and exact write, and atomic file writes inside `work_journal/`.
- **Runtime translations** (one file per runtime) own that runtime's built-in converters and its runtime texts and envelopes (contract §4, §6).
- **SkillImprovementService** stays the owner of skill improvement and consumes the package.
- **RemoveWorkTraceExportsMigration** owns the one-time cleanup.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `getWorkJournalService()` | WorkJournalService | One process-wide instance, so per-run serialization covers the updater and skill improvement | Any rendering or scheduling policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `src/agent-work-traces/**` (5 files) | Replaced by the journal (REQ-W8) | `src/agent-work-journal/**` | In This Change | Only consumer is skill improvement (J11) |
| `tests/agent-work-traces/**` | Tests a removed module | New journal tests | In This Change | |
| Replay projection options `interactionByIdentity`, `traceById`, `includedToolIdentityKeys` (raw-trace-to-historical-replay-events.ts:140-247) | Dead: their only caller is the removed projection service (J10); run-history callers pass none | The projection's own internal defaults | In This Change | Run-history behavior unchanged; its tests stay green |
| `AgentWorkTracePackage` in skill-improvement/domain/improver-session.ts and the `workTraces` / `workTraceSummaryHash` fields | Renamed concept | `WorkJournalPackage`, `workJournal`, `workJournalEvidenceHash` | In This Change | Tolerant reader (Persisted Data item 3) |
| Metadata keys `skill_improvement_work_trace_manifest_path` / `_root_path` | Renamed concept | `skill_improvement_work_journal_manifest_path` / `_root_path` | In This Change | No reader besides tests (J11) |
| `docs/modules/agent_work_traces.md` | Module removed | `docs/modules/agent_work_journal.md` | In This Change | Plus the doc references listed in File Mapping |
| Stored `work_traces/` folders | Retired derived output | Journal files | In This Change (migration) | DS-005 |

## Return Or Event Spine(s) (If Applicable)

N/A. The updater consumes run events but emits none. Journal results are files.

## Bounded Local / Internal Spines (If Applicable)

**DS-004 (inside WorkJournalService.ensureCurrent):**

```
lock(memoryDir)
  → list complete segments + active (RawTraceFileSourceService)
  → read manifest (projection)
  → for each segment: keep if (journal file exists ∧ revision = current ∧ source_record_count matches), else render + write
  → render + write the open file
  → write the manifest
→ unlock → return package (paths + evidence hash)
```

It matters because it gives write-once closed files (REQ-W5) and determinism, and keeps concurrent callers from interleaving writes.

**Updater scheduling (inside WorkJournalRunUpdater, per run):**

```
event → if updating: pending = true; else start
update = await recorder.waitForIdle(runId) → await service.ensureCurrent → if pending: pending = false; repeat
```

It matters because a burst of turn and compaction events costs at most one extra render, and nothing blocks the run.

**DS-003 (inside WorkJournalFileRenderer):**

```
records (normalized order)
  → index tool results by (turnId, toolCallId) within the file
  → for each record: tool_call → paired line | tool_result whose call is not in this file → result line | other → §8 line | omitted types skipped
  → shorten (§7)
  → header + entries + links
```

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Runtime translations (5) + registry | DS-003 | Renderer | Contract §4 converters and §6 runtime texts/envelopes per runtime; unknown runtime → empty table | Contract principle 11: a runtime adds only its translation | Runtime knowledge leaking into the format |
| Generic tool line | DS-003 | Renderer | Contract §5 | One rule for all non-built-ins | — |
| Shared result envelopes | DS-003 | Renderer | MCP `{content, structuredContent, isError}`, content blocks, media marker, `\r\n` | Shared by every runtime | Duplicated across translations |
| Command text builders | DS-003 | Runtime translations | Shell quoting; `cat`/`cat -n`/`sed -n`/`grep`/`find`/`ls`/`curl` builders; line-number layout | Claude, Grok and AGY share them | Divergent command forms across runtimes |
| Text diff | DS-003 | Runtime translations | old/new → unified-style lines + counts; patch line counting | Claude, AGY and Grok edits; no library (J17) | — |
| Output shortener | DS-003 | Renderer | Contract §7 limits and markers (configurable via renderer options, defaults 20/20/40/400) | REQ-W3 | Inconsistent truncation |
| Teammate message envelope | DS-003 | Renderer | Contract §8 envelope forms and `Files:` block | Platform format, not a runtime | — |
| Per-run serialization | DS-004 | Service | In-process lock map by memoryDir | Updater and skill improvement may overlap | Interleaved writes |

## Ownership Boundaries

- **WorkJournalService** is the only public boundary. The updater, skill improvement and future consumers call `ensureCurrent` and read the returned package. They never call the store or the renderer.
- **The renderer** is internal to the subsystem and pure.
- **Runtime translations** are internal to the renderer. The renderer selects one through the registry by RuntimeKind.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| WorkJournalService | WorkJournalStore, WorkJournalFileRenderer, RawTraceFileSourceService use, lock map | WorkJournalRunUpdater, SkillImprovementService, (future) work notes | A caller reading the manifest or rendering a file itself | Adding a method to the service, e.g. a read-only `getPackage` |
| WorkJournalFileRenderer | Runtime translations, generic line, envelopes, builders, shortener, diff, envelope parser | WorkJournalService only | The service or others calling a translation directly | Extending the renderer's input |
| AgentRunResourceManager | Per-run attachments (now including the updater) | Activation registry | Anyone else attaching the updater | — |

## Dependency Rules

**Allowed:**
- `agent-work-journal/services` → `agent-work-journal/{rendering,store,domain}`;
- `agent-work-journal/services` → `agent-memory/services/raw-trace-file-source-service` and `agent-memory/store/memory-file-store`;
- `agent-work-journal` → `runtime-management/runtime-kind-enum`;
- `agent-work-journal/services/work-journal-run-updater` → `agent-execution/domain` (event types) and `AgentRunMemoryRecorder` (type and waitForIdle);
- `agent-execution/services/agent-run-resource-manager` → the updater (by an injected `attachToRun` dependency, like the memory recorder);
- `skill-improvement` → `agent-work-journal/services/work-journal-service` and `domain` types.

**Forbidden:**
- the journal importing runtime backends (`agent-execution/backends/**`): the journal reads raw traces only (DEC-W9);
- the journal importing `run-history/projection/**`;
- anything outside the subsystem importing `rendering/**` or `store/**`;
- the journal writing outside `<memoryDir>/work_journal/`;
- current code referring to `work_traces`, except inside the migration.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `WorkJournalService.ensureCurrent(target)` | One run's journal | Reconcile and return the package | `{ runId, memoryDir, runtimeKind: RuntimeKind \| null }` | `memoryDir` is the run's own folder; `runtimeKind` null → generic rules |
| `WorkJournalPackage` | Result | `{ rootPath, manifestPath, files: [{ path, sourceFile, state }], evidenceHash }` | — | The evidence hash is sha256 over the file contents in order |
| `WorkJournalRunUpdater.attachToRun(run)` | One live run's scheduling | Subscribe; return detach | `AgentRun` | Uses `run.runId`, `run.runtimeKind`, `run.config.memoryDir`; a run without a memoryDir → noop |
| `WorkJournalFileRenderer.render(input)` | One raw file | Pure rendering | `{ runId, runtimeKind, source: { fileName, state, index }, records: MemoryTraceEvent[] }` → `string` | Internal |
| `RuntimeTranslation` | One runtime | Built-in converters by recorded name; `normalizeOutcome`; optional `unwrapCall`, `normalizeAgentText`, `normalizeUserText` | Selected by `RuntimeKind` | Internal |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| ensureCurrent | Yes | Yes (run id + its folder + runtime) | Low | — |
| attachToRun | Yes | Yes | Low | — |
| render | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Subsystem | `agent-work-journal` | Yes | Low | Matches the user's term "Work Journal" |
| Boundary | `WorkJournalService` | Yes | Low | — |
| Updater | `WorkJournalRunUpdater` | Yes | Low | — |
| Renderer | `WorkJournalFileRenderer` | Yes | Low | — |
| Migration | `RemoveWorkTraceExportsMigration` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability | Decision | Why |
| --- | --- | --- | --- |
| List and read raw files, normalize records | RawTraceFileSourceService + normalizer | Reuse | Already lists only complete segments plus active; keeps all needed fields (J12) |
| Follow a live run's events | AgentRunResourceManager attachments | Extend | Existing per-run attach/release point (J13) |
| Know raw writes are flushed | AgentRunMemoryRecorder.waitForIdle | Reuse | Existing per-run queue (J12) |
| Render records | Run-history replay projection | Not reused | UI-replay model loses record types (root cause, J10) |
| Value rendering | autobyteus-ts ReadableValueRenderer / CondensedToolCallRenderer | Not reused | Runtime-name-based condensed tool format; journal format differs |
| One-time cleanup | App-data migration runner | Reuse | Standard boundary (J16) |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `agent-work-journal` (new) | Journal content, reconcile, scheduling | DS-001–DS-004 | Create New (replaces `agent-work-traces`) |
| `agent-execution` | Attachment wiring | DS-001 | Extend |
| `skill-improvement` | Consumption of the package | DS-002 | Modify |
| `app-data-migrations` | Old-folder cleanup | DS-005 | Extend |
| `run-history` | — (dead options removed) | — | Modify (removal only) |

## Draft File Responsibility Mapping

Drafted and then tightened. The final mapping is below. The one change from the draft is that a separate "journal entry writer" was merged into the file renderer, because only the renderer formats entries.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Shared File | Owner | Why Shared | Redundant Attrs Removed | Overlaps Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| grep/cat/sed/find/ls/curl and quoting | `rendering/command-text.ts` | Renderer | Claude, Grok, AGY, AutoByteus and Codex use them | Yes | Yes | A runtime switch |
| MCP and content-block envelopes, media marker, line endings | `rendering/result-envelopes.ts` | Renderer | All runtimes | Yes | Yes | A runtime-specific text list |
| Normalized tool outcome `{ kind, exitCode?, error?, output, media? }` | `rendering/tool-outcome.ts` | Renderer | Every translation returns it; one §7 outcome rendering | Yes | Yes | — |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundant Attrs Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| Manifest | Yes | Yes (no generated_at, no paths) | Low | Paths derive from the folder |
| WorkJournalPackage | Yes | Yes | Low | — |
| ToolOutcome | Yes | Yes | Low | `kind` is the single outcome discriminator |

## Final File Responsibility Mapping

| File | Owner | Concrete Concern |
| --- | --- | --- |
| `src/agent-work-journal/domain/work-journal-models.ts` | Subsystem | `WorkJournalTarget`, `WorkJournalPackage`, manifest types |
| `src/agent-work-journal/services/work-journal-service.ts` | WorkJournalService | `ensureCurrent`, reconcile, per-run lock, evidence hash; `getWorkJournalService()` |
| `src/agent-work-journal/services/work-journal-run-updater.ts` | WorkJournalRunUpdater | Event triggers, merging bursts, recorder wait, error logging, detach |
| `src/agent-work-journal/store/work-journal-store.ts` | WorkJournalStore | Paths, manifest projection read and exact write, atomic writes |
| `src/agent-work-journal/rendering/work-journal-file-renderer.ts` | Renderer | Header (contract §10), ordering, pairing within the file, entry formatting and links, §8 dispatch |
| `src/agent-work-journal/rendering/non-tool-record-lines.ts` | Renderer | Contract §8 lines: user, teammate message, agent, notice, user-interrupted turn. Also the documented omissions: reasoning, tool continuation, system instructions, compaction, recovery records |
| `src/agent-work-journal/rendering/teammate-message-envelope.ts` | Renderer | Contract §8 envelope forms and the `Files:` block |
| `src/agent-work-journal/rendering/generic-tool-line.ts` | Renderer | Contract §5 |
| `src/agent-work-journal/rendering/tool-outcome.ts` | Renderer | Outcome model and §7 outcome text |
| `src/agent-work-journal/rendering/result-envelopes.ts` | Renderer | Shared §6 envelopes |
| `src/agent-work-journal/rendering/output-shortener.ts` | Renderer | §7 limits and markers |
| `src/agent-work-journal/rendering/command-text.ts` | Renderer | Command builders, quoting, `cat -n` layout |
| `src/agent-work-journal/rendering/text-diff.ts` | Renderer | Diff lines and counts |
| `src/agent-work-journal/rendering/runtimes/runtime-translation.ts` | Renderer | The `RuntimeTranslation` interface and registry by RuntimeKind (unknown → empty) |
| `src/agent-work-journal/rendering/runtimes/{claude,codex,antigravity,grok,autobyteus}-translation.ts` | Renderer | One runtime each: contract §4 rows and §6 texts |

## Applied Patterns (If Any)

- **Strategy + Registry:** runtime translations selected by RuntimeKind inside the renderer.
- **Observer attachment:** the updater, alongside the existing per-run attachments.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Responsibility | Must Not Contain |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-work-journal/` | Folder (Add) | The Work Journal subsystem: `domain/`, `services/`, `store/`, `rendering/`, `rendering/runtimes/`, as above | Runtime backend imports; run-history imports |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts` | File (Modify) | Add a `workJournalUpdater: Pick<WorkJournalRunUpdater, "attachToRun">` dependency, attached after the memory recorder and released with the others | Journal policy |
| `…/agent-execution/runtime/general-process-run-supervisor.ts`, `…/application-platform/execution/application-execution-scope-kernel-builder.ts` | File (Modify) | Construct `new WorkJournalRunUpdater({ memoryRecorder, journalService: getWorkJournalService() })` and pass it to the resource manager | — |
| `…/skill-improvement/services/skill-improvement-service.ts` | Modify | Call `getWorkJournalService().ensureCurrent({ runId, memoryDir, runtimeKind })`; store `evidenceSummaryHash = package.evidenceHash` | — |
| `…/skill-improvement/domain/improver-session.ts` | Modify | `WorkJournalPackage` in the trigger request; `workJournal{rootPath, manifestPath, lastEvidenceHash}`; `lastRequest.workJournalEvidenceHash`; no `schemaVersion` (Persisted Data item 3) | Fields kept only for older builds |
| `…/skill-improvement/services/improver-session/skill-improvement-improver-session-store.ts` | Modify | Tolerant projection reader (guideline §3) | Version switches |
| `…/skill-improvement/services/improver-session/skill-improvement-improver-session-service.ts`, `…-trigger-message-builder.ts` | Modify | New field names. The message says "Use the listed Work Journal files as the evidence package", followed by the manifest, root and files, and the new metadata keys. | — |
| `…/src/agent-work-traces/` | Remove | — | — |
| `…/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Modify | Remove the dead options | Behavior change |
| `…/app-data-migrations/migrations/remove-work-trace-exports-migration.ts` + registry entry | Add | DS-005, prerequisite `TaskAgentOwnRunV1`, `requiredOnStartup: true` | Current-code imports of old layouts |
| `…/built-in-agents/templates/retrospective-skill-improver/{agent.md, skills/retrospective-skill-improver/SKILL.md, references/high-signal-trace-patterns.md}` | Modify | "Work Journal" wording; describe the journal's lines (`User:`, `Message from`, `Agent:`, `Command:`, `Write file:`, `Edit file:`, `Search web:`, `Tool:`, `Notice:`) and the history-not-instructions header | — |
| `RELEASE.md` (Rollback) and `autobyteus-server-ts/docs/design/data_migration_guideline.md` §4 | Docs (Modify, done by the Solution Designer on the user's instruction, SR-018) | Rollback compatibility applies only to releases with an app-data migration (readable converted data, or a release-note statement); ordinary writer changes need no old-build compatibility | — |
| `autobyteus-server-ts/docs/design/collaboration_model.md` §3 | Docs (Modify) | Add the work journal to a run's memory contents ("raw traces, work journal, snapshots, file changes, context files"), as DESIGN.md requires for run-storage changes | Any change to the CM rules |
| `autobyteus-server-ts/docs/modules/agent_work_journal.md` (Add; replaces agent_work_traces.md); ARCHITECTURE.md, PROJECT_OVERVIEW.md, README.md, modules/README.md, modules/agent_memory.md, modules/skill_improvement.md; autobyteus-web/docs/{agent_execution_architecture,settings,skills}.md | Docs (Modify) | The new subsystem, storage location, updater and contract link | — |
| `autobyteus-server-ts/tests/agent-work-journal/**` (Add); `tests/agent-work-traces/**` (Remove); skill-improvement tests and the migration test (Modify/Add) | Tests | Per TESTING.md | Real user data |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-work-journal/services` | Main-line control | Yes | Low | Boundary and updater |
| `agent-work-journal/store` | Persistence | Yes | Low | Only file I/O |
| `agent-work-journal/rendering` (+ `runtimes/`) | Off-spine, pure | Yes | Low | The contract; runtimes split as the contract is |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Runtime translation | `claudeTranslation.builtInTools.get("Read")` returns `{ head: "Command: cat -n a.ts \| sed -n '50,57p'", outcome, output }`; anything else goes to `genericToolLine` | `switch (toolName)` across all runtimes inside the renderer | Principle 11: adding a runtime adds one file |
| Updater | `attachToRun(run)` subscribes and returns detach; the resource manager owns its lifetime | The updater subscribing in a global hook or polling folders | Existing per-run lifecycle |
| Closed-file reuse | Keep `work_journal_000002.md` when revision and source count match | Re-render every segment each turn (the old export) | REQ-W5; cost |
| Pairing | Pair within one file; the split wording in contract §8 | Reading neighbor files to pair | Closed files must not depend on later files |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep `work_traces/` output alongside the journal | Skill improvement continuity | Rejected | Skill improvement switches to the journal |
| Read the old `workTraces` session fields | Continuity of stored state | Rejected | Tolerant projection; the fields are inert (J11) |
| Legacy runtime-kind aliases in the renderer | Old run metadata | Rejected | The runtime comes from the live run; unreachable (contract §12, item 14) |
| Journal code deleting `work_traces/` lazily | Avoids a migration | Rejected | One migration; current code has no old-layout knowledge |
| Kept as a rendering rule (not a compatibility path): removing the legacy `**[User Requirement]**` banner and other §6 texts | They occur in historical raw traces the journal must render (SCN-W6) | N/A | Content normalization defined by the approved contract, not a second data path |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. **Renderer first.** Add `agent-work-journal/domain` and `rendering/**` with unit tests. Use hand-built fixtures per contract row, shaped after probes/validate-contract.json and never copied from user data. Check the translations' built-in names against work-journal-builtin-tools.json.
2. **Store and service.** Add the store, the service (reconcile, lock, package) and their tests: write-once closed files, byte-identical regeneration, renderer-revision change, unchanged raw traces.
3. **Updater.** Add the updater and wire it into AgentRunResourceManager and both composition roots. Tests:
   - turn end → open file updated;
   - compaction → closed file written;
   - forced write failure → run unaffected and logged;
   - burst merging.
4. **Skill improvement.** Switch skill improvement and its state reader/writer, the trigger message and its tests.
5. **Removal.** Remove `agent-work-traces` (source and tests) and the dead replay options. Run-history tests must stay green.
6. **Migration.** Add the migration with fixtures and an idempotence test.
7. **Text.** Update the built-in improver templates and docs.
8. **Validation (API/E2E):** one live run per runtime (Grok kept to one small run, per the credit limit) to confirm AC-W1, AC-W6 and AutoByteus write ordering. Then measure the per-turn render time on the largest open file in a synthesized fixture.

## Key Tradeoffs

- **Re-render the open file at each turn end vs incremental append.** Re-rendering is simple, deterministic, and correct through rotation, which rewrites the active file. Its cost is proportional to the open file (p90 5 MB, max 28 MB today) and runs off the run's critical path. Incremental append would need per-call carry-over across turns and rotation handling. It is deferred unless validation shows a measurable cost (Follow-up 4).
- **Per-file pairing vs cross-file pairing.** Per-file pairing keeps closed files independent and byte-stable. The cost is split wording for 0.18% of calls.
- **Process-wide lock vs file lock.** One server process writes a run's journal, so an in-process lock is enough. A second process is not a supported scenario for one run's memory folder (CM-8).
- **Journal synced by memory sync.** It adds derived bytes to sync but keeps the journal with the run, as DEC-W10 intends. The journal is much smaller than the raw traces, because output is shortened.

## Risks

- **AutoByteus native write ordering at turn end is unverified** (J12). Mitigation: a test in step 3 or 8. If records land after TURN_COMPLETED, the next update includes them; that is a Design Impact only if AC-W6 cannot be met.
- **Large open files:** measured in step 8; Follow-up 4 if needed.
- **Grok coverage:** only 2 real calls. The rows come from docs and fixtures, and step 8 records one small live run.
- **The improver's prompt changes:** covered by the skill-improvement integration test and the template update.

## Guidance For Implementation

- Treat work-journal-contract.md as the specification. Each contract section maps to one renderer file (Final File Responsibility Mapping), so a reviewer can check them side by side.
- The renderer is pure: no clock and no filesystem. Times come from records, so output is deterministic.
- Use `toolCallId` plus `turnId` for pairing, as the raw-trace identity does.
- Links: `[↗](../<source raw file>#<record id>)`. Omission markers link to the result record.
- Never write raw traces. Never import from `agent-execution/backends/**` or `run-history/projection/**`.
- Fixtures are hand-built from the recorded shapes (TESTING.md). Never copy user records.
