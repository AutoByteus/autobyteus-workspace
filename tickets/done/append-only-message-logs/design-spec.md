# Design Spec — Append-Only Message Logs (SR-003, revised after ARCH-REV-001)

## Solution And Approval Basis

- Current solution revision ID: `SR-005` (design-only after implementation Design Impact DI-001; requirements unchanged at SR-004)
- Review: ARCH-REV-001 (`design-review-report.md`), Fail with ARCH-F-001..004; all addressed in this revision (see Review Response).
- Approved requirements baseline: [`requirements-doc.md`](requirements-doc.md) at SR-002, approved by the Solution Designer within the direction set by the user's Task (user informed in this conversation, 2026-10-18).
- Behavior-defining supplements: none.
- Design status: `Ready`
- Canonical investigation-notes path: [`investigation-notes.md`](investigation-notes.md)
- Authorities read (2026-10-18): `references/architecture-design.md`, `references/design-principles.md`, `references/design-examples.md` (Examples 7, 8, 10, 11); project `DESIGN.md` (repository root); `autobyteus-server-ts/docs/design/data_migration_guideline.md` (full); `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-9); `TESTING.md`; `RELEASE.md` (Rollback); predecessor design `tickets/done/delegated-copy-own-run-memory/design-spec.md`.
- Project design-principle conflicts or discrepancies: `RELEASE.md` → Rollback says "data written by a newer build must stay readable by the build you roll back to", while the Data Migration Guideline and the released one-way migrations (e.g. `20261017_task_agent_own_run_v1`) do not keep that promise; this design follows the guideline and the user's Task (one-way, DEC-003). Recommendation for the user: let RELEASE.md say that one-way data migrations are rolled forward. Not changed by this ticket.

## Review Response (ARCH-REV-001, ARCH-REV-002, DI-001)

| Finding | Resolution | Where |
| --- | --- | --- |
| ARCH-F-001 log-touching released migrations retried after ours on a converted run (locators-v1, summary-v1) | Full inventory of every registered migration that reads or writes a message log, with a mechanism per migration. The migrations that act on runs already in the current tree shape (own-run, locators-v1, summary-v1) get a same-ID repair: their frozen log readers read the run's log in whichever released format is on disk (JSON when present, else the append-only files), the frozen package validator accepts either as the message authority, and locators-v1 also converts locators in the append-only files line by line. All other migrations act only on runs that the gate keeps on JSON, or never see a converted log. REQ-007 is kept: no released migration is left incomplete. Fixtures per case. | Migration Plan → Released Migration Inventory; Same-ID Repairs |
| ARCH-F-002 `create` refused an existing log | Renamed `writeInitial(messages)`: it atomically **replaces** the active file with exactly these messages, the same semantics as today's `writeMessages` / `write`. It refuses only when sealed files exist (a rotated log is never initial). The four callers are checked; coordinator retry test. | Bounded Local Spines; Guidance |
| ARCH-F-003 own-run's use of current `TaskAgentOwnFiles.writeTeam`; the fallback reader specified too thinly and placed in the newer migration's folder | Accepted explicitly: own-run writes its *targets* with current writers (its released design), so an unmaterialized task agent team gets an empty append-only log, and the frozen JSON merge (`ensureExists`) writes a JSON file beside it, which ours merges in the same start (fixture F-OWN-RUN-UNMATERIALIZED-TEAM). The frozen append-only reader is a full log reader (file names per family, sealed-then-active order, unterminated-tail rule, strict 7-field line parse), placed in `legacy/released-run-package-shapes/released-message-log-files-from-append-only.ts`. | Migration Plan; File mapping |
| ARCH-F-004 where "retried append does not duplicate" is proven | Adapter / append-plan conflict tests (`*_MESSAGE_COMMIT_CONFLICT`) plus the reader's first-occurrence de-duplication; no store-level duplicate test. | Guidance |
| ARCH-F-005 (ARCH-REV-002) R-C rewrites sealed files, which contradicts REQ-003 | REQ-003 refined within the direction (SR-004, DEC-008): appends and rotation never modify sealed files; the one-time startup locator repair is the bounded exception, with its size-bound and Memory Sync effects stated | R-C; Terminology; R-6; requirements REQ-003, AC-003, DEC-008 |
| ARCH-F-006 (ARCH-REV-002) two different wait rules; tree-less logs not covered | One rule, stated in both places: not ready (tree `not_input`, unreadable, or missing) or unreadable JSON → `WAITING` while any log-writing predecessor is pending, else `PRESERVED_*` | Gate bullet; Step 0 and Step 1 |
| DI-001 (implementation, SR-005) flat-families' partial-target orgs read the org JSON log strictly on retry, and their org tree reads as own-run `input` | Gate: an org log is not ready while its folder holds a retired team authority (the partial-target marker); the existing one rule applies (WAITING, then PRESERVED). No released-migration change (option b, a same-ID repair in flat-families, rejected: it would change a fourth released migration and its org-log write path). Index-only plans read no log. | Gate bullet; inventory row; fixture F-GATE-FLAT-PARTIAL-TARGET |

## Current-State Read

Each run family has a message store (`StandaloneRootPackageStore`, `TeamCommunicationStore`, `AgentOrgCommunicationMessagesStore`) plus `TaskAgentMessageLogs` for task agents' own logs (8641c0ac D-4). A message is committed under the coordinating run's persistence lock: `appendMessageToOwnerLogs` visits the receiver's log, then the sender's. For each log, the store reads the whole JSON file, validates its header and every message, checks the id, and atomically rewrites the whole pretty-printed file (temp file + fsync + rename + directory fsync). Before the store is called, the commit path also re-validates the whole in-memory history twice: the adapter validates the next snapshot (`validateStandaloneRootMessages` / `validateTeamCommunicationMessagesPayload` / `validateAgentOrgCommunicationMessages`), and `RootCommunicationEngine.commitMessages` validates the array again. Reading composes the run's own log with its loaded task agents' logs (`composeMessageLogs`). Readiness requires the JSON files by name. Released migrations read and write these JSON files through the current modules (inventory in the investigation notes). Evidence: investigation-notes Source Log, Architecture Investigation Findings; probes `cost.mjs`, `validate-cost.mts`, `inventory.py`.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: the persistence boundary of all three run families plus task agents; a new log module; the commit path in three adapters, the team append plan and the engine; the readiness validator; a startup migration; a frozen copy of the released JSON log code and repointing of about 10 released migration files; docs.
- Architectural risk: `High`
- Risk rationale: it changes the on-disk format of every message log and deletes the old files after conversion (one-way); it changes the crash and commit semantics of message persistence (append instead of atomic replace); and it interacts with released migrations that may still be pending on old installs.
- Escalation trigger: any writer of a message log found outside the coordinating lock or the migration; a released migration found writing logs that is not in the repoint list; a reader that depends on the file's physical order; Memory Sync or the hub needing to parse logs.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Store code | the three stores, `task-agent-message-logs.ts` | read + full validate + rewrite per owner log | D-1, D-2 | — |
| Adapter / engine code | `standalone-root-communication-adapter.ts:51-69`, `agent-org-communication-adapter.ts:48-66`, `team-communication-message-append-plan.ts:62`, `root-communication-engine.ts:79` | Two whole-history validations per message; duplicate id already rejected against the in-memory list before persisting | D-3; the per-log id check in the stores is redundant (DEC-005) | — |
| Engine id | `root-communication-engine.ts#messageId` | sha256 over root, sender, receiver, content, createdAt (ms) | Fresh id per delivery; with the in-memory check, a log never receives an id twice at runtime | — |
| `validate-cost.mts` | probes | Whole-list validation 3.35 ms/message at 1,210 messages, twice per message, growing linearly | D-3 | — |
| `cost.mjs` | probes | Rewrite 22.3 MB / ~150 ms vs append 120 KB / ~13 ms | D-1 | — |
| `inventory.py` (read-only) | probes | Real shapes: hub 6, agent task agent 27, task agent team 70 (7 empty), team run 601 (151 empty), team folder without tree 2 (old address shape `{teamRunId, messages}`, predecessor-preserved), org 26 (6 empty, 1 not in `createdAt` order); 5 logs > 4 MiB; all `schemaVersion: 1` | Fixture map; D-7 gate (old-shape residue left alone) | — |
| Raw-trace store | `autobyteus-ts/src/memory/store/run-memory-file-store.ts#readJsonl`, `raw-trace-archive-manager.ts` | JSONL active + numbered segments + manifest; manifest needed for compaction boundary keys and pending state | D-1 naming; no manifest here (rotation is one rename) | — |
| Migration imports | `rg` over `src/app-data-migrations` (investigation notes) | Released migrations import the current JSON envelope types, validators, paths and `TaskAgentMessageLogs` | D-8 frozen copy + repoint | Implementer re-greps at the base |
| `task-agent-own-run-v1` | `coordinating-run-migration.ts:225-270`, `task-agent-own-run-v1-app-data-migration.ts:34-120` | Logs step re-runs for every task agent on every retry; reads the coordinating JSON log; writes task logs through current `TaskAgentMessageLogs.merge` (`ensureExists` for teams); predecessor ledger read exists (`TREE_WRITING_PREDECESSOR_IDS`) | D-7 gate, D-8 repoint, reappeared-JSON merge | — |
| Memory Sync | `memory-sync/source/memory-file-change-planner.ts` | Uploads changed files whole (read + sha256); defers files that change during preparation; excludes `*.tmp` | Rotation limit 4 MiB; sealed files stable under appends and rotation (one-time R-C exception, DEC-008) | — |
| Readiness | `root-run-package-current-validator.ts` | Required/retired file names; reads the composed package at startup | D-6 | Startup read cost stays (follow-up) |

## Intended Change

Replace the JSON message log files with append-only JSON Lines logs that rotate by size, behind one log module that every family store uses. Make the commit path validate only the new message. Convert existing logs with a startup migration, with the released migrations pointed at a frozen copy of the JSON log code.

## Change Scope (Mandatory)

- In scope (UC-001..UC-005): the new message log module; the three family stores and `TaskAgentMessageLogs`; `TaskAgentOwnFiles.writeTeam` (creates an empty log); the commit paths (three adapters, the team append plan, the engine, the message validator becoming tolerant); readiness required and retired names; the migration `append-only-message-logs-v1`; the frozen JSON log module and the repointing of released migrations; the same-ID repairs R-A..R-D (released log readers, released package validator, `context-file-record-locators.ts` message sources, own-run's agent read) and the frozen append-only reader; tests; docs (`agent_memory.md`, `run_history.md`, `standalone_agent_run_root.md`, `agent_team_execution.md`, `agent_orgs.md`, `collaboration_model.md` CM-9 storage text, plus any doc that names the old files).
- Deliberately left alone: wire DTOs and views (`communication_messages` fields), the in-memory snapshot types (envelopes with `schemaVersion: 1` stay in memory only), tool contracts, the per-run log model and DEC-011 order, coordinator lock and fail-stop code, the shared write-result type (reused, see D-2), tree and metadata files, Memory Sync, the Memory page.
- Follow-ups (to the Project Task Manager at receipt):
  - FU-1: the startup readiness scan reads and validates every team/org run's whole message history (≈100 MB on the user's install) on every start (`root-run-package-current-validator.ts` inspectTeam/inspectOrg). It is an admission proof that the guideline says not to repeat at startup. It may be part of the slow-start work (Task e6985045 area).
  - FU-2: `RunPackageFileWriteResult` outcome names (`not_renamed`, `renamed_finalization_indeterminate`) describe rename commits. Appends reuse them (D-2). A neutral rename (`not_committed` / `finalization_indeterminate`) across all coordinators is a separate cleanup.
  - FU-3: `context-file-record-locators.ts` is migration-only code that lives in `src/context-files/` (only released migrations import it). Move it under `app-data-migrations/legacy/`.
  - FU-4: RELEASE.md's rollback sentence conflicts with one-way migrations (see Solution And Approval Basis).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Existing Behavior | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001..003, AC-001..003 | agent sends a message | whole-file rewrite per owner log; whole-history validation twice | one validated line appended and synced per owner log; receiver's first | DS-001 |
| BEH-002 | User | REQ-004, AC-004 | open / restart / restore | compose JSON logs | compose JSONL logs, same list | DS-002 |
| BEH-003 | User | REQ-008, AC-008 | open a message reference | via composed list | unchanged code over the same list | DS-002 |
| BEH-004 | Operational | REQ-009, AC-009 | app start | readiness requires JSON names | requires "the log exists" in the new layout | DS-004 |
| BEH-005 | System | REQ-002, REQ-005, AC-002, AC-005 | crash or I/O failure | atomic replace | append + truncate-back; unfinished last line ignored, repaired by the next append | DS-003 |
| BEH-006 | Operational | REQ-006, REQ-007, AC-006, AC-007 | upgrade start | JSON | migration converts after predecessors; per-run gate | DS-005 |
| BEH-007 | System | REQ-009 | new task agent team | empty JSON log | empty JSONL log | DS-001 (`writeInitial([])`) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `probes/cost.mjs` | write cost today vs append | AC-001 | baseline for the measurement test | Evidence |
| `probes/validate-cost.mts` | in-memory validation cost | REQ-001 | basis for D-3 | Evidence |
| `probes/inventory.py` | read-only shape inventory | AC-006 | fixture map | Evidence |
| `probes/profile.py` | read-only size profile | AC-001 | synthesized fixture profile | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Performance` (with a persisted-format change).
- Current design issue found: `Yes`.
- Structural triggers:
  - Repeated coordination: the same read-validate-rewrite physical IO is written four times (three stores plus `TaskAgentMessageLogs`). It fires, and one log module owns it.
  - Persisted-data transition: format and file-name change, so a migration is required (see below).
  - Legacy cleanup: the per-log id check and the whole-history validations are machinery without a remaining guarantee. They are removed.
  - Shared-structure tightness: the on-disk envelope duplicates the folder's identity and carries a version number. Dropped on disk (DEC-007).
- Root cause classification: `Duplicated Policy Or Coordination` (physical log IO in four places) on top of a format choice, whole-file JSON, that makes every append O(log).
- Refactor needed now: `Yes`. Extracting one log module is the smallest way to change the format once for all families.
- Evidence: Source Log; the probes.
- Design response: D-1..D-8.
- Refactor rationale: without one owner, the format, rotation, tail repair and outcome mapping would be written four times.
- Intentional deferrals: FU-1..FU-4.

## Terminology

- **Log**: one run's message log (an owner log, as in 8641c0ac D-4). On disk it is a family **base name** in the run's folder: `communication_messages` (an agent's own log or a hub's log), `team_communication_messages` (a team run or task agent team), `agent_org_communication_messages` (an org run).
- **Active file**: `<base>_active.jsonl`, the file that appends go to.
- **Sealed file**: `<base>_<6-digit index>.jsonl`, a full file that appends and rotation never write again. The only exception is the one-time startup locator repair R-C on installs where locators-v1 is still pending (DEC-008).
- **Line**: one message as compact JSON, terminated by `\n`. A line counts only when its `\n` is present.
- **Rotation limit**: 4 MiB (4,194,304 bytes).

## Legacy Removal Policy (Mandatory)

- Obsolete in this scope: JSON log files and their envelopes on disk; whole-file log writers and readers; per-log id checks; whole-history validation in the commit path; strict exact-key message validation (converted to tolerant per Guideline §3).
- Compatibility wrappers, dual paths, or legacy fallbacks kept: `None`. The current runtime reads only JSONL. JSON lives only in the migration and in the frozen module used by released migrations.

## Persisted Data / State Transition Decision (Mandatory)

- Subject: every message log of every run family (≈732 files, ≈113 MB on the user's install, largest 21.8 MB); shapes in Architecture Investigation Evidence.
- Change: the physical format (JSON envelope → JSON Lines), file names, and rotation into several files.
- Normal reader/writer: today strict whole-file JSON. The new runtime reads only JSONL.
- Required invariants: every message, with the same values; membership in each log; read order by `createdAt`; once per log; run ids unchanged (reference URLs stay valid).
- Decision: `Migration Required`. A tolerant reader cannot absorb the format: reading JSON from current code would be a dual-path reader, which DESIGN.md and the Guideline §4 forbid. The data is authoritative and cannot be rebuilt.
- Rationale: the conversion is one read and one write per log, plus one read-back before the JSON is deleted. The benefit is the approved behavior (REQ-001, REQ-003).
- Supports: AC-006, AC-007.

### Migration Plan

- Id `20261018_append_only_message_logs_v1`; folder `src/app-data-migrations/migrations/append-only-message-logs-v1/`; `requiredOnStartup: true`, `executionPolicy: "STARTUP_ONLY"`; **no declared prerequisites**; registered last.
- Why direct use or rebuild is insufficient: see the decision above.
- Current runtime stays JSONL-only. JSON source shapes are read only through the frozen module (D-8).
- Completion marker: the runner's ledger; per-item recognition from the file system (no journal, no backup: the JSON is deleted only after the read-back check, DEC-003).
- **Log-writing predecessors** (they may still write a message log in some released format): `20260814_team_run_execution_tree_v1` (team tree v1), `20260701_team_communication_projection_addresses`, `20260901_agent_org_flat_team_families_v1`, `20260926_team_context_file_execution_locators_v1`, `20261017_task_agent_own_run_v1`. Their ledger status is read once per start (the own-run pattern). `collaborators-to-delegated-runs-v1` writes trees only (verified: no message-log reference in its folder) and is not in this list; it is in the gate's tree-writer list.
- **Discovery**: JSON logs at `agents/*/collaboration/communication_messages.json`, `agents/*/communication_messages.json`, `agent_teams/*/team_communication_messages.json`, `agent_orgs/*/agent_org_communication_messages.json`. Never `imports/`. Backup files (`*.backup-*`) are not logs.
- **Kind**: a coordinating log (hub, team run, org run) or a task agent log (`agents/<id>/communication_messages.json`; a team folder whose tree carries `taskAgent`).
- **Gate (coordinating logs only), one rule** (ARCH-F-006; Step 0 and Step 1 below state the same rule). A coordinating log is *ready* when its run's tree file exists and reads as own-run `input` (`task-agent-own-run-v1/released-coordinating-trees.ts`; task agents as full records or already links) **and**, for an org log, its folder holds none of the retired team authorities (`team_run_execution_tree.json`, `team_communication_messages.json`, `task_delegation_records.json`: flat-families' partial-target marker, `agent-org-history-candidate-plan.ts:93-110`; SR-005, DI-001). Otherwise it is *not ready*: a tree that reads `not_input`, an unreadable tree, **no tree file** (for example the tree-less address-shaped team logs, F-OLD-ADDRESS), or an org folder holding a retired team authority. A not-ready log, or a log whose JSON ours cannot read (Step 1), is `WAITING_FOR_PREDECESSOR` while **any** log-writing predecessor (list above) has not `SUCCEEDED*`, and `PRESERVED_UNSUPPORTED` / `PRESERVED_UNREADABLE` (JSON kept, warning) once all of them have. `convertibleBy` is not used for this decision. The wider wait costs nothing extra, because the aggregate is already non-terminal while any log-writing predecessor is pending, and it also covers tree-less logs, which no tree classification can name. The tree-converting predecessors (team tree v1, v2, org flat families, collaborators) act only on not-ready runs, so they never see a converted log.

| Step | Source | Target | Validation | Failure |
| --- | --- | --- | --- | --- |
| 0 Gate | coordinating log not ready | — | — | `WAITING_FOR_PREDECESSOR` while any log-writing predecessor is not `SUCCEEDED*`, else `PRESERVED_UNSUPPORTED` (JSON kept, warning) |
| 1 Read | JSON (frozen strict envelope + message validator) | — | parse | unreadable → `WAITING_FOR_PREDECESSOR` while any log-writing predecessor is not `SUCCEEDED*`, else `PRESERVED_UNREADABLE` (JSON kept, warning) |
| 2 Existing | the JSONL log in the same folder (may exist from an earlier attempt, runtime appends, or a reappeared JSON) | ids already present | read with the current log reader | `FAILED` |
| 3 Write | JSON messages whose id is absent, in file order | `appendBatch` (D-1): fills sealed files and the active file by the rotation limit; one fsync per file written | — | `FAILED` (retry continues from step 2) |
| 4 Verify | — | — | the current reader returns every JSON message, values equal | `FAILED`; JSON kept |
| 5 Remove | JSON file | — | `rm` + directory fsync | `FAILED`; next start: steps 2–4 find nothing missing, then remove |

| Disposition | Item status |
| --- | --- |
| `MIGRATED` (JSON converted or merged, then removed) | MIGRATED |
| `PRESERVED_UNSUPPORTED`, `PRESERVED_UNREADABLE` | SKIPPED (warning) |
| `WAITING_FOR_PREDECESSOR` | FAILED (non-terminal) |
| `FAILED` | FAILED |

- Aggregate: `FAILED` (non-terminal; the runner retries on the next start) when any item is `FAILED` or `WAITING_FOR_PREDECESSOR`, **or any log-writing predecessor is not `SUCCEEDED*`**. The last clause keeps ours running after a predecessor retry that recreates JSON. Otherwise `SUCCEEDED_WITH_WARNINGS` when anything was preserved, else `SUCCEEDED`. The app always starts. A run whose log is not converted lacks a current log and is not admitted (team/org) or shows no messages (hub), and its JSON is kept (DESIGN.md rule 7).
- **Reappeared JSON**: `task-agent-own-run-v1`'s Logs step re-runs on every retry and may write a JSON task log beside a converted one. For teams, `ensureExists` creates an empty one. Ours runs right after it in the same start (registry order) and merges it by steps 2–5. The appended lines may be older than the active file's last line; readers sort by `createdAt` (D-1), so physical order does not matter.
- **Released Migration Inventory** (ARCH-F-001: every registered migration that reads or writes a message log, directly or through a shared helper; found with `rg -i "communication|ReleasedRootRunPackageValidator|team-run-migration-state-classifier|context-file-record-locators|released-run-package-file-readers"` over `src/app-data-migrations`; the implementer re-runs it at the implementation base and extends this table if it finds more):

| Migration | How it touches logs | Runs it processes | Can it run after ours on a converted run? | Mechanism | Fixture |
| --- | --- | --- | --- | --- | --- |
| `team-run-execution-tree-v1` (and `team-run-migration-state-classifier`) | reads/writes `team_communication_messages.json` of predecessor and V1 packages | `PREDECESSOR` / `CURRENT_V1` (V1 tree + task records) | No: those trees are own-run `not_input` (`convertibleBy` team_tree_v1/v2), so ours keeps them on JSON | gate | F-GATE-TREE-V1 |
| `team-agent-memory-layout` (classifier) | reads the team log only to classify `CURRENT_V1` | `CURRENT_V1` only | No: a gate-passing run is not `CURRENT_V1` (newer tree; the classifier's strict V1 store rejects it before and after conversion, so the kind (`INVALID`) is the same) | gate (+ evidence test: classifier result identical before/after conversion for a gate-passing run) | F-CLASSIFIER-SAME |
| `token-usage-run-records-v1` (via `token-usage-task-team-run-index`, classifier) | as above; `INVALID` roots are skipped | `PREDECESSOR` / `CURRENT_V1` | No (same reason) | gate + the same evidence test | F-CLASSIFIER-SAME |
| `team-communication-projection-address` | rewrites `team_communication_messages.json` holding address-shaped messages | logs whose messages have the old address shape | No: ours cannot parse an address-shaped log (step 1 → `WAITING` while it is pending), and a converted log never has that shape; it lists only JSON names | step 1 rule | F-OLD-ADDRESS |
| `agent-org-flat-team-families-v1` (+ its locator transition, `context-file-record-locators`) | reads team logs of org-family packages, writes org logs; for **partial-target** orgs (an `agent_orgs/<id>/` that an earlier attempt renamed and did not clean up) it reads `agent_org_communication_messages.json` strictly (`addRoot`, `validateCompleteOrgRunPackage`) | team packages that hold org families (pre-flat tree); partial-target orgs (retired team files still present); index-only orgs (history index only: no log read, no cleanup) | Source-root: no (`not_input`). Partial-target: **yes** without the marker (the org tree reads as own-run `input`; DI-001). Index-only: no log read | gate; for partial-target, the retired-team-authority marker makes the org log not ready (WAITING, then PRESERVED); it becomes ready once flat-families' cleanup removes the retired files | F-GATE-FLAT, F-GATE-FLAT-PARTIAL-TARGET |
| `team-context-file-execution-locators-v1` | admits packages through `ReleasedRootRunPackageValidator` (requires the JSON names, reads messages through the released readers); lists message sources by JSON name and rewrites `referenceFiles` locators | every admitted team/org package, including current-shape trees | **Yes** (reviewer MP-001: a prerequisite failed, later succeeds) | same-ID repair R-B, R-C | F-LOCATORS-AFTER-OURS |
| `agent-org-history-first-message-summary-v1` | admits org packages through the released catalog/validator; reads org messages through `ReleasedAgentOrgCommunicationMessagesReader` | every admitted org package | **Yes** (MP-001) | same-ID repair R-A, R-B | F-SUMMARY-AFTER-OURS |
| `task-agent-own-run-v1` | reads coordinating logs (released readers / inline JSON for agents); merges task logs through `TaskAgentMessageLogs.merge` (frozen JSON copy after D-8); its targets via current `TaskAgentOwnFiles.writeTeam` | own-run `input` trees, every retry | **Yes** | same-ID repair R-A (+ R-D); reappeared JSON merged by ours; non-terminal aggregate clause | F-PENDING-OWN-RUN, F-OWN-RUN-UNMATERIALIZED-TEAM |
| `collaborators-to-delegated-runs-v1` | none (trees only) | — | — | — | — |

- **Same-ID Repairs** (Guideline §7: a same-ID repair fixes pending or failed installs; terminal installs skip them). They live in the frozen modules, never in current runtime:
  - **R-A Released log readers read either released format.** `ReleasedTeamCommunicationMessagesReader`, `ReleasedAgentOrgCommunicationMessagesReader` (`released-trees-before-task-agent-own-run/released-run-package-file-readers.ts`) and own-run's agent-family read return the run's messages from the JSON file when it exists, else from the append-only files through the frozen append-only reader (`legacy/released-run-package-shapes/released-message-log-files-from-append-only.ts`: family file names, sealed files in index order then the active file, unterminated final line ignored, each line parsed strictly as the 7-field message, first occurrence of an id kept, `createdAt` order). They return the same in-memory envelope as today; `null` when neither exists.
  - **R-B Released package validator.** `ReleasedRootRunPackageValidator.validateManifest` treats the message authority as present when the JSON file **or** any append-only file of that family's log exists. The retired lists are unchanged. Messages are read through R-A.
  - **R-C Locators-v1 message sources.** `listContextFileRecordSources` also lists `team_` / `agent_org_communication_messages_active.jsonl` and `…_<6 digits>.jsonl` as a `message-lines` source kind. `transformContextFileRecordLocators` transforms them line by line like the `trace` kind: only `referenceFiles` locators change, unchanged lines keep their bytes, changed lines are re-serialized as compact JSON, and an unterminated final line is kept as is. Written with the same atomic `writeSerializedText` as today (startup, one writer). This applies to sealed files too: the one bounded exception to sealed-file immutability (REQ-003, DEC-008). It runs at most once per file and only where locators-v1 is still pending. A repaired sealed file's size may differ from the limit by the length difference of its converted locators, and Memory Sync uploads it once more. Runtime appends and rotation never rewrite a sealed file. Flat-families' transition uses the same helper but processes only `not_input` packages, which have no append-only files, so it is unaffected.
  - **R-D Own-run's agent-family inline JSON read** moves to R-A (one reader per family).
  - Own-run's task-log writes stay the frozen JSON merge; its target writes stay current (ARCH-F-003). Ours merges any JSON that reappears, in the same start.
- Restart safety: every step is recognized from files. Batch appends end each file with a complete line or are repaired by tail repair. Rename and rm are atomic.
- Cost: one read and one write of each log (≈113 MB on the user's install, written compact, so smaller), one read-back, about one fsync per output file, and one ledger read. A second start after `SUCCEEDED*` does nothing (the runner skips it).
- Concurrency: the migration runs before the server serves (one writer, Guideline §5).
- Retention: the migration stays registered (supported upgrade range, Guideline §4).
- Guideline checklist (§2): 1 need (above); 2 availability (never gated globally; a run left on JSON is just not admitted); 3 source and target (shape inventory → fixtures below; target admitted by readiness D-6); 4 dispositions (above; aggregate separate from admission); 5 commit and retry (atomic writes, appends with tail repair, rm after verify; no journal or backup, DEC-003); 6 current-only boundary (frozen JSON module, frozen own-run parser, frozen line parser; current code only for writing and validating the target); 7 cost (above); 8 references (run ids and message ids unchanged; reference files are absolute paths inside messages, copied as-is); 9 evidence (Guidance); 10 lessons: raw-trace rotation (validate the new layout, then clean up), own-run (no global prerequisites, per-run gate, ledger read once), startup-performance (no post-migration audit).

Shape inventory → fixtures (faithful synthesized; never user data):

| Shape (count on the user's install) | Fixture |
| --- | --- |
| hub log ≤ 4 MiB (4), > 4 MiB (2) | F-HUB, F-HUB-LARGE (rotates into several files) |
| agent task agent own log (27) | F-TA-AGENT |
| task agent team log, empty (7) and non-empty (63) | F-TA-TEAM-EMPTY, F-TA-TEAM |
| team run log, empty (151), non-empty (449), > 4 MiB (1) | F-TEAM-EMPTY, F-TEAM, F-TEAM-LARGE |
| org log, empty (6), non-empty (18), not in `createdAt` order (1), > 4 MiB (1) | F-ORG-EMPTY, F-ORG, F-ORG-UNORDERED, F-ORG-LARGE |
| team folder without tree, old address shape (2) | F-OLD-ADDRESS (left untouched: PRESERVED or WAITING) |
| detached task agent (coordinating run deleted) | F-DETACHED |
| JSON beside an existing JSONL log | F-REAPPEARED |
| interrupted conversion (after step 3, after step 4) | F-PARTIAL |
| unreadable JSON | F-UNREADABLE |
| own-run pending/failed with a waiting run, retried after ours | F-PENDING-OWN-RUN |
| own-run retry materializes a task agent team (current `writeTeam` creates an append-only log; the frozen merge writes JSON beside it) | F-OWN-RUN-UNMATERIALIZED-TEAM |
| locators-v1 blocked by a failed prerequisite in start N (ours converts), the prerequisite succeeds in N+1, locators-v1 converts locators in the append-only files (sealed and active), and the run stays admitted | F-LOCATORS-AFTER-OURS |
| summary-v1 blocked in start N, runs after ours in N+1 and backfills the summary from the append-only org log | F-SUMMARY-AFTER-OURS |
| team-tree-v1 / flat-families pending: a `not_input` run stays on JSON (`WAITING`) and is converted after they succeed | F-GATE-TREE-V1, F-GATE-FLAT |
| flat-families partial-target org (retired team files in `agent_orgs/<id>/`), flat-families `FAILED` in start N: the org log stays JSON (`WAITING`); flat-families retries in N+1, cleans up and succeeds; ours converts afterwards | F-GATE-FLAT-PARTIAL-TARGET |
| classifier on a gate-passing team run gives the same kind before and after conversion | F-CLASSIFIER-SAME |

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-007 | `send_message_to` / handoff / Task message | line synced in each owner log; message published | family persistence coordinator (lock) | the cost and the commit semantics |
| DS-002 | Primary End-to-End | BEH-002, BEH-003 | open / restart / restore / reference request | composed list in memory or view | family store | complete history |
| DS-003 | Bounded Local | BEH-005 | `MessageLog.append` | committed / not committed / indeterminate | message log module | crash and rotation safety |
| DS-004 | Primary End-to-End | BEH-004 | app start | run admitted | `RootRunPackageCurrentValidator` | runs open |
| DS-005 | Primary End-to-End | BEH-006 | app start | logs converted | the migration | data continuity |

## Primary Execution Spine(s)

- DS-001: `Agent tool → RootCommunicationEngine.deliver (validate the new message once) → family adapter / append plan (next = current + message; no re-validation) → persistence coordinator (lock) → family store.appendMessage → appendMessageToOwnerLogs (receiver's log, then sender's) → MessageLog.append (one line + fsync) → commitAfterDurability → publish`
- DS-002: `Run manager / projection / readiness → family store.read(dir, tree) → MessageLog.read (own) + MessageLog.read per loaded task agent → composeMessageLogs → snapshot (unchanged in-memory type)`
- DS-004: `startup → RootRunPackageCurrentValidator → MessageLog.exists (required) / JSON names (retired) → store.read → package validators → admitted`
- DS-005: `startup → migration runner → predecessors (frozen JSON) → AppendOnlyMessageLogsV1 → per JSON log: gate → frozen read → MessageLog.read ids → MessageLog.appendBatch → MessageLog.read verify → rm JSON`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The engine builds the message and validates it once. The adapter or append plan rejects an id already in memory (unchanged) and forms the next list by appending, without validating the list again. The coordinator takes the lock. The store asks `appendMessageToOwnerLogs` to append to each owner log in order. Each append writes one line and syncs it. The outcome mapping and fail-stop are unchanged. | engine, adapter, coordinator, store, log | coordinator | log paths per owner |
| DS-002 | The store reads its own log and its loaded task agents' logs with `MessageLog.read`, which returns the messages of all its files in `createdAt` order (stable), each id once. `composeMessageLogs` is unchanged. A missing log is `null`, as today. | store, log | store | — |
| DS-003 | See Bounded Local Spines. | log | log module | — |
| DS-004 | A team or org package needs its tree and an existing log (any of its files). A JSON log file left in the package is retired residue, and the run is not admitted (ambiguous residue, Guideline §6). After reading, validation is the same as today. | validator | validator | — |
| DS-005 | See Migration Plan. | migration | migration | frozen modules |

## Spine Actors / Main-Line Nodes

`RootCommunicationEngine`; the three adapters / the team append plan; the three persistence coordinators (unchanged); the three family stores and `TaskAgentMessageLogs`; the new `MessageLog`; `RootRunPackageCurrentValidator`; the migration.

## Ownership Map

- `MessageLog` (new) owns one log's files: naming, listing, line encoding and parsing, appending and syncing, tail repair, rotation, initial write (replace, as today), reading in order, existence. It knows nothing about runs, families or owners.
- Family stores own *which* log a run uses (folder + base name), the in-memory envelope they compose for callers, and the owner-log order (via `appendMessageToOwnerLogs`).
- `TaskAgentMessageLogs` owns task agents' log locations (the agent own log, the task agent team log) on top of `MessageLog`. Its `merge` moves into the frozen module (migration only).
- Coordinators own the lock, the outcome handling and fail-stop (unchanged).
- The engine and adapters own message validation (once) and the in-memory list.
- The migration owns every JSON shape.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TaskAgentMessageLogs` | `MessageLog` | maps a task-agent owner to its folder and base name | file format, rotation |

## Removal / Decommission Plan (Mandatory)

| Item | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Whole-file JSON read/write of logs in the 3 stores + `TaskAgentMessageLogs` (`readLog`/`readMessagesLog` JSON parse, `write`/`writeMessages` with envelope) | format change | `MessageLog` | In This Change | `readLog` keeps its name and returns the envelope composed in memory |
| On-disk envelope validators `validateStandaloneRootMessages`, `validateTeamCommunicationMessagesPayload`, `validateAgentOrgCommunicationMessages` as disk readers | no envelope on disk | frozen copies in the JSON module (migrations); in memory, envelopes are built by the stores | In This Change | Remove each where no current caller remains after D-3; keep any in-memory use only if a caller needs it (implementer shows the callers) |
| Per-log id check in `appendMessage` / `TaskAgentMessageLogs.append` | Dead as a guarantee: the in-memory list already rejects a known id before persisting; ids are fresh per delivery | adapter check (unchanged) | In This Change | DEC-005 |
| `TaskAgentMessageLogs.merge` | only the released own-run migration uses it | frozen JSON module | In This Change | Dead in current code after the repoint |
| Whole-history validation in `validateStandaloneRootMessages(...)` (adapter), `validateAgentOrgCommunicationMessages` (adapter), `validateTeamCommunicationMessagesPayload` (append plan), `validateCollaborationCommunicationMessageArray` in `engine.commitMessages` | the new message is validated once | `validateCollaborationCommunicationMessage(message)` in the engine | In This Change | The engine's constructor validation of `initialMessages` stays (a load, not a commit) |
| `exactKeys` in `validateCollaborationCommunicationMessage` | Guideline §3: convert strict readers when touched | tolerant projection of the 7 fields | In This Change | Frozen strict copy for released migrations |
| JSON log file names in the current path modules (`STANDALONE_ROOT_MESSAGES_FILE_NAME`, `TEAM_COMMUNICATION_MESSAGES_FILE_NAME`, `AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME`, `getStandaloneRootMessagesPath`, `getTeamCommunicationMessagesPath`, `getAgentOrgCommunicationMessagesPath`) | replaced by base names | base-name constants | In This Change | The frozen module keeps the JSON names; readiness retires them |
| `TaskAgentOwnFiles.writeTeam` reading the whole log to test existence | existence check | `MessageLog.exists` + `writeInitial([])` | In This Change | — |

## Return Or Event Spine(s) (If Applicable)

Unchanged: `commitAfterDurability → publish (COMMUNICATION, MEMBER_INPUT) → streams`.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `MessageLog`.

- **append(message)** (caller holds the coordinating lock):
  `line = JSON.stringify(projection) + "\n" → open active (create if missing, append mode) → size = fstat → if size > 0 and last byte ≠ "\n": tail repair (read back from the end to the last "\n", ftruncate there) → if size ≥ limit: close, rename active → next sealed index (max existing + 1), fsync directory, reopen a new active → write(line) → fsync file → if the active was created: fsync directory → close`
  - Outcomes, mapped to the shared `RunPackageFileWriteResult` so coordinators stay unchanged (D-2):
    - failure before any byte of the line is written (open, fstat, repair, rotation): `not_renamed` with a new stage (`prepare_append`). Nothing new is durable. A rotation rename already done is harmless: it only moved complete lines.
    - failure while writing the line: ftruncate back to the size before the write. Success → `not_renamed` (stage `append_line`); truncate failure → `renamed_finalization_indeterminate` (stage `restore_size`).
    - write ok, fsync (file or directory) fails → `renamed_finalization_indeterminate` (stage `sync_file` / `sync_directory`).
    - all ok → `committed`.
- **appendBatch(messages)** (migration): the same steps, writing many lines; it rotates when the active file reaches the limit and syncs each file once before moving on and at the end. Any failure → an error. The retry recomputes what is missing.
- **writeInitial(messages)** (a run's first package write, which the coordinators may retry; a new task agent team's empty log): atomically **replace** the active file with exactly these messages through the existing writer (`writeSerializedText`: temp + fsync + rename + dir fsync), the same semantics as today's `writeMessages` / `write`. A retry after a `not_renamed` tree write therefore succeeds again (ARCH-F-002). It refuses (`not_renamed`, stage `prepare_directory`) only when sealed files exist: a rotated log already holds committed history and is never "initial". Callers, checked: `StandaloneRootPersistenceCoordinator` (`writeMessages` while `created` is false; after a restart without a tree, `getMessages()` is empty and no message can have been committed without a tree), `team-root-materializer.ts:105-107` (new team run), `agent-org-run-persistence-coordinator.ts:38` (`commitInitial`), `TaskAgentOwnFiles.writeTeam` (only when `exists()` is false). Returns the writer's result.
- **read()**: list the folder; take sealed files `<base>_\d{6}\.jsonl` in index order, then the active file; split each into lines; a line counts only when its `\n` is present (the active file's unterminated tail is ignored; a sealed file always ends with `\n` because rotation happens after tail repair); each counted line is parsed and projected with the tolerant message validator; any invalid counted line throws (strict, as today); each id kept once (first occurrence); result sorted by `createdAt`, ties in file order. Returns `null` when the log has no file.
- **exists()**: some file of the log exists.

Why it matters: this is where REQ-001, REQ-002, REQ-003 and REQ-005 are met.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine | Serves | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| log location per family / task agent | DS-001, DS-002 | stores | folder + base name | owners differ by family | format logic leaking into stores |
| frozen JSON log module | DS-005 | released migrations, ours | JSON names, envelope types, strict validators, readers, JSON merge | released migrations must keep their behavior | current code changes breaking pending upgrades |
| frozen line parser | DS-005 | own-run repoint | read a converted log | own-run retry after ours | own-run tied to future current changes |

## Ownership Boundaries

- Only `MessageLog` touches message log files at runtime. Stores, `TaskAgentMessageLogs`, `TaskAgentOwnFiles` and readiness go through it.
- Only migrations touch JSON log files, through the frozen module.
- Appends happen only under the coordinating run's lock (verified writers: the three coordinators). `writeInitial` is called from package creation paths that already hold that lock or run before the run is published (standalone and org coordinators, team materializer, `TaskAgentOwnFiles.writeTeam` inside the tree store's split write).

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `MessageLog` | file names, line format, rotation, tail repair, sync | stores, `TaskAgentMessageLogs`, `TaskAgentOwnFiles`, readiness, the migration (target side) | any `fs` access to `*_active.jsonl` / sealed files elsewhere; composing those names with `path.join` | add a method to `MessageLog` |
| family stores | which log a run has, envelope in memory | managers, coordinators, projection, loaders, readiness | callers constructing `MessageLog` for a run directly | add a store method |
| frozen JSON module | JSON shapes | migrations only | current runtime importing it | — |

## Dependency Rules

- `MessageLog` depends on `node:fs`, the message type and the tolerant message validator only.
- Stores → `MessageLog`; never the reverse.
- Current runtime never imports `app-data-migrations/legacy/**` or the migration folders.
- Released migrations import message-log *source* code only from the frozen modules (`legacy/released-run-package-shapes/…`) or their own folder; an older migration never imports from a newer migration's folder. Exception, accepted (ARCH-F-003): own-run writes its *targets* with current writers as released (`TaskAgentOwnFiles.writeTeam` → an append-only empty log); ours merges the JSON that its frozen merge writes beside it. The implementer re-runs the inventory search at the implementation base.
- Ours: source side frozen only; target side current `MessageLog` (to write and to verify).

## Interface Boundary Mapping

```ts
// run-history/store/message-log.ts (new)
export const MESSAGE_LOG_ROTATION_LIMIT_BYTES = 4 * 1024 * 1024;
export class MessageLog {
  constructor(dir: string, baseName: MessageLogBaseName, options?: { writer?: AtomicRunPackageFileCommitWriter; rotationLimitBytes?: number /* tests */ });
  exists(): Promise<boolean>;
  read(): Promise<readonly CollaborationCommunicationMessage[] | null>;          // null: no file
  readSync?(): ... // only if a current sync caller needs it (implementer checks; e.g. readTreeSync paths)
  writeInitial(messages: readonly CollaborationCommunicationMessage[]): Promise<RunPackageFileWriteResult<"communication_messages">>; // replace, as today
  append(message: CollaborationCommunicationMessage): Promise<RunPackageFileWriteResult<"communication_messages">>;
  appendBatch(messages: readonly CollaborationCommunicationMessage[]): Promise<void>;   // migration; throws on failure
}
export type MessageLogBaseName = "communication_messages" | "team_communication_messages" | "agent_org_communication_messages";
```

Family stores keep their public methods and in-memory return types (`readLog`, `read`, `appendMessage`; `write` / `writeMessages` call `writeInitial` (replace, as today) and keep their call sites). `appendMessageToOwnerLogs` and `composeMessageLogs` are unchanged.

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `MessageLog(dir, baseName)` | Yes | Yes (folder + base name) | Low | — |
| store `readLog(dir, runId)` | Yes | Yes | Low | `runId` no longer checked against file content (DEC-007); it still names the in-memory envelope |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| log module | `MessageLog` / `message-log.ts` | Yes | Low | — |
| migration | `append-only-message-logs-v1` | Yes | Low | — |
| frozen JSON module | `released-message-logs-before-append-only.ts` (DESIGN.md rule 8) | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| atomic creation | `AtomicRunPackageFileCommitWriter.writeSerializedText` | Reuse | same commit boundary |
| outcome contract | `RunPackageFileWriteResult` | Extend (new stage names) | coordinators unchanged |
| owner order, composition | `appendMessageToOwnerLogs`, `composeMessageLogs` | Reuse | unchanged semantics |
| JSONL parsing | `autobyteus-ts` `readJsonl` | Not reused | it truncates on read (writes from a reader) and is private to the raw-trace store; ours repairs only under the lock on append |
| predecessor status read | own-run's ledger read pattern | Reuse pattern | Guideline lesson |
| frozen tree parser | `released-trees-before-task-agent-own-run.ts` | Reuse | gate classifier |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `run-history/store` | `MessageLog`, `TaskAgentMessageLogs` | DS-001..003 | Extend |
| family persistence folders | stores' use of `MessageLog` | DS-001, DS-002 | Modify |
| `agent-collaboration/execution/communication` + adapters | validate once | DS-001 | Modify |
| `run-history/services` | readiness names | DS-004 | Modify |
| `app-data-migrations` | migration, frozen modules, repoints | DS-005 | Extend |

## Draft File Responsibility Mapping

See Final (no extraction changed the draft).

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| physical log IO in 4 places | `run-history/store/message-log.ts` | run-history store | one format owner | Yes | Yes | a run/family-aware store |
| JSON log shapes in ~10 migration files | `legacy/released-run-package-shapes/released-message-logs-before-append-only.ts` | migrations | frozen copy | Yes | Yes | imported by current runtime |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| line = the 7-field message | Yes | Yes (no envelope, no version) | Low | written exactly (key set asserted in tests); read tolerantly |

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `src/run-history/store/message-log.ts` | Add: `MessageLog` (DS-003) |
| `src/run-history/store/task-agent-message-logs.ts` | Modify: task-agent logs via `MessageLog`; remove `merge` and the per-log id check |
| `src/run-history/store/task-agent-own-files.ts` | Modify: `writeTeam` uses `exists` / `writeInitial([])` |
| `src/standalone-agent-run-root/persistence/standalone-root-package-store.ts`, `standalone-root-tree-path.ts`, `standalone-root-tree-schema.ts` | Modify: log via `MessageLog`; remove JSON path/name; remove the disk envelope validator (or keep it only for an in-memory caller) |
| `src/services/team-communication/team-communication-store.ts`, `team-communication-messages-schema.ts` | Modify: same |
| `src/agent-org-execution/persistence/agent-org-communication-messages-store.ts`, `agent-org-communication-messages.ts`, `agent-org-communication-messages-schema.ts` | Modify: same |
| `src/agent-collaboration/execution/communication/root-communication-engine.ts`, `collaboration-communication-message-schema.ts` | Modify: validate the new message once; tolerant message projection |
| `src/standalone-agent-run-root/services/standalone-root-communication-adapter.ts`, `src/agent-org-execution/services/agent-org-communication-adapter.ts`, `src/services/team-communication/team-communication-message-append-plan.ts` | Modify: next = current + message, no whole-list validation |
| `src/run-history/store/atomic-run-package-file-commit-writer.ts` | Modify: add append stage names to the stage unions |
| `src/run-history/services/root-run-package-current-validator.ts` | Modify: required "log exists" via the stores; JSON names retired |
| `src/app-data-migrations/legacy/released-run-package-shapes/released-message-logs-before-append-only.ts` | Add: frozen JSON names, paths, envelope types, strict validators (incl. strict message array copy), JSON readers, JSON task-log merge (`ensureExists`) |
| `src/app-data-migrations/legacy/released-run-package-shapes/released-message-log-files-from-append-only.ts` | Add: frozen append-only log reader (R-A) and the family file-name patterns (R-B, R-C) |
| `legacy/released-run-package-shapes/released-trees-before-task-agent-own-run/released-run-package-file-readers.ts`, `released-root-packages-before-task-agent-own-run.ts` | Modify: R-A, R-B (and repoint to the frozen JSON module) |
| `src/context-files/services/context-file-record-locators.ts` | Modify: R-C (`message-lines` source kind); migration-only module (FU-3) |
| released migration files in the import inventory (investigation notes) | Modify: repoint imports; `task-agent-own-run-v1/coordinating-run-migration.ts` R-D |
| `src/app-data-migrations/migrations/append-only-message-logs-v1/` (`…-app-data-migration.ts`, `message-log-conversion.ts`) + registry | Add |
| tests (per Guidance) and docs (Change Scope) | Add / Modify |

## Applied Patterns (If Any)

Append-only log with size rotation (as in the raw-trace store); repository (`MessageLog`) behind family stores; startup migration with file-system recognition and a per-run input gate (as in own-run).

## Target Subsystem / Folder / File Mapping

As the Final mapping. `message-log.ts` sits next to `task-agent-message-logs.ts` in `run-history/store/`, the existing home of shared run-package persistence (atomic writer, tree split).

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `run-history/store/message-log.ts` | Persistence | Yes | Low | shared by all families, like the atomic writer |
| `legacy/released-run-package-shapes/…` | Migration-only | Yes | Low | established home of frozen shapes |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Org log on disk after conversion | `agent_org_communication_messages_000001.jsonl` … `_000005.jsonl` (each ≈4 MiB), `agent_org_communication_messages_active.jsonl`; each line `{"messageId":"collabmsg_…","senderAgentRunId":"…","receiverAgentRunId":"…","content":"…","messageType":"agent_message","referenceFiles":["/abs/path.md"],"createdAt":"2026-10-03T05:18:16.781Z"}` | `{"schemaVersion":1,"orgRunId":"…","messages":[…]}` rewritten per message | the format the readers and tests target |
| Commit path | `engine: validateCollaborationCommunicationMessage(message)`; adapter: `next = Object.freeze([...current, message])` | `validateCollaborationCommunicationMessageArray([...current, message])` per message | removes O(history) work |
| Reader policy | unterminated last line of the active file ignored; any other bad line → error | "skip any bad line" | strict data, tolerant only of the one crash shape |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| current stores read JSON when no JSONL exists | runs waiting for a predecessor | Rejected | gate + migration; such runs are not admitted until converted |
| keep JSON as a backup | rollback | Rejected (DEC-003) | read-back verify before deleting |
| header/version line in JSONL | owner check | Rejected (DEC-007) | the folder is the owner |
| manifest like raw traces | rotation bookkeeping | Rejected | rotation is one rename; files are listed by name |
| global prerequisite on own-run | ordering | Rejected (8641c0ac ARCH-F-006) | per-run gate + non-terminal aggregate |
| ours waits globally for locators-v1 / summary-v1 | ARCH-F-001 option | Rejected: a permanently failed prerequisite would keep every team/org log on JSON, so current code could read none of them (DESIGN.md rule 7, Guideline §1) | same-ID repairs R-A..R-C |

## Derived Layering (If Useful)

Engine/adapters (memory) → coordinators (lock) → family stores (which log) → `MessageLog` (files).

## Change / Refactor Sequence

0. Test impact inventory: every existing test touching message stores, logs, validators, readiness names, own-run log steps, and migrations importing message modules. List it in the implementation handoff.
1. Frozen JSON module and repoint of every released migration import, before any current module changes. Their existing tests stay green unchanged. Then the frozen append-only reader and repairs R-A..R-D with their fixtures.
2. `MessageLog` with unit tests (append, rotation, tail repair, read order, writeInitial incl. replace and the sealed-file refusal, exists, failure outcomes with injected fs operations).
3. Stores + `TaskAgentMessageLogs` + `TaskAgentOwnFiles` on `MessageLog`; remove JSON paths, names and per-log id checks.
4. Commit path: validate once; tolerant message projection.
5. Readiness names.
6. Migration + own-run JSONL fallback + registry; fixtures per the shape table.
7. Docs; measurement test (AC-001); real-app check (AC-009).

## Key Tradeoffs

- One stateless append (open, fstat, 1-byte tail check, write, fsync, close) vs. keeping file handles open: stateless costs a few syscalls per message and has no handle lifecycle to manage. The cost is independent of log size, which is the requirement.
- Sorting on read vs. keeping physical `createdAt` order: sorting is O(n log n) in memory on load (load already reads everything) and lets the migration append merged messages without rewriting sealed files.
- No per-log id check: relies on the in-memory check and fresh ids (both verified). Readers de-duplicate anyway.

## Risks

- R-1 Tail repair runs on a log with a long unterminated tail: the read-back is bounded by one message (≤ ~1 MB). Accepted.
- R-2 A deterministic predecessor failure keeps ours non-terminal forever: it re-scans for JSON on each start (directory listings, plus a tree read only for logs still in JSON). Accepted (8641c0ac R-8 precedent).
- R-3 A run left on JSON (waiting or preserved) is not admitted (team/org) or shows no messages (hub) until converted. Its data is kept and a warning is logged (DESIGN.md rule 7).
- R-4 A message larger than the limit makes one file larger than the limit. By rule: "limit + one message".
- R-5 Missed import or migration in the repoint → a pending released migration breaks on old installs. Mitigation: step 1 first; re-run the inventory search at the base; the repair fixtures; their own tests.
- R-7 Same-ID repairs change three released migrations' behavior on pending/failed installs. They add only the ability to read (and, for locators-v1, convert) the newer log files; for JSON-only data their behavior is byte-for-byte unchanged (their released tests).
- R-6 Memory Sync reads an active file mid-append: it defers files that change while it prepares them, and the hub never parses logs. A sealed file rewritten once by R-C is uploaded once more (DEC-008).

## Guidance For Implementation

- Follow the bounded local spine and the migration table exactly. Any deviation returns to the Solution Designer.
- Verification (TESTING.md): server unit and integration tests and typecheck; `MessageLog` tests including injected write/fsync/truncate failures mapping to the three outcomes, a torn tail then append, rotation boundaries, and a message larger than the limit. Per-family store and coordinator tests: receiver first, a fail-stop after the first durable log; a coordinator retry after `writeInitial` committed and the tree write returned `not_renamed` succeeds (ARCH-F-002). AC-002's "a retried append does not duplicate" is proven at the adapter / append-plan level (`*_MESSAGE_COMMIT_CONFLICT` for an id already in memory) plus the reader's first-occurrence de-duplication. There is no store-level duplicate test: the store appends unconditionally (DEC-005, ARCH-F-004). AC-001 measurement test on a synthesized 82-message ≈22 MB org log: bytes written per append (and no read of the existing content, e.g. by counting fs reads through injected operations), with times before and after recorded in the handoff. Migration tests on the fixture table: interruption after each step, a second start a no-op, and compare the composed list from the old JSON (via the frozen reader + `composeMessageLogs`) with the new one. Released migrations' tests unchanged in outcome, plus the repair fixtures (F-LOCATORS-AFTER-OURS, F-SUMMARY-AFTER-OURS, F-PENDING-OWN-RUN, F-OWN-RUN-UNMATERIALIZED-TEAM, F-GATE-*, F-CLASSIFIER-SAME), each run through the real runner order across two starts. Readiness tests for the new names and for JSON residue. Real-app check on an isolated desktop instance with a synthesized data package of released-format runs (all families, a large log): open old runs (complete history), send messages, open a referenced file, restart. Never on the user's data or a copy.
- Write the line key set exactly (test it); read tolerantly.
- Keep today's presence rules: appending to a coordinating run that has no log fails as today ("has no message log"), checked with `MessageLog.exists` (a stat of the active file; a directory listing only when it is missing). A task agent's log is created by its first append, as today.
- Keep coordinators unchanged except where the type of `nextMessages` forces it.
