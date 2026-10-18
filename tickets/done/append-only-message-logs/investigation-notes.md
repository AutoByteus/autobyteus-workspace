# Investigation Notes — Append-Only Message Logs

## Investigation Meta

- Package identifier: `append-only-message-logs`
- Request / ticket: Project Task "Append-only message logs" (follow-up to Task 8641c0ac, decided by the user 2026-10-17), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-10-18.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs` / `codex/append-only-message-logs`
- Resolved base remote / branch / revision: `origin/personal` @ `65cf41c6b4` (fetched 2026-10-18; v1.5.6-beta.3 bump)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from freshly fetched `origin/personal`.
- Bootstrap blocker: none.
- Prerequisite check: Task 8641c0ac is delivered — merge `9b5cf4025d` ("each task agent is a run of its own", migration `20261017_task_agent_own_run_v1`), finalization `f911d94e52` (DR-002), released in v1.5.6-beta.1 (`098ffaa318`) and checked by the user (`2f211340ee`, DR-004). The Task's "do not dispatch before 8641c0ac is done" is satisfied.
- Current solution revision ID: `SR-005`
- Authorities read (requirements reading gate): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-18); templates `requirements-doc-template.md`, `investigation-notes-template.md`, `solution-revision-record-template.md` (2026-10-18). Also `AGENTS.md`, `TESTING.md` (user-data rule, lines 160–175), `RELEASE.md` (Rollback), `tickets/done/delegated-copy-own-run-memory/{design-spec,requirements-doc}.md`.
- Investigation status: requirements and architecture investigation complete (SR-002).

## Initial Request And Clarifications

- Original request: write each run's communication log as JSON Lines (one message per line, appended and synced), rotated like raw traces, instead of rewriting and re-validating the whole log file on every message.
- Clarifications received: none needed; the Task carries the user's decisions (format, migration, rotation, keeping the 8641c0ac model, done-when).
- User-supplied facts and constraints: PTM log 3.2 MB / 875 messages, largest org log ≈ 23 MB; one PTM hub is kept for months or years; keep per-run logs, receiver's log first then the sender's, under the coordinating run's lock; startup migration like the raw-trace rotation migration, no message lost; measured on a realistic large log (the user's 23 MB org log).
- Initial ambiguity: what "measured on the user's 23 MB org log" means given TESTING.md forbids running on user data (resolved DEC-001); rotation trigger (resolved DEC-002); what happens to the old JSON file (DEC-003).

## Product And Domain Understanding

- Product area: server persistence of collaboration messages (agent ↔ agent messages, handoffs, task messages) for standalone agent runs (hubs), team runs, organization runs and task agents.
- Affected actors or systems: agents sending messages (system), the user opening runs / restarting the app, the startup migration runner, Memory Sync (copies memory files), run-history readiness scan.
- Existing purpose: the message log is the durable record of every message; it feeds the run views (collaboration view, team communication panel, org view), message reference resolution and restore.
- Terminology: coordinating run, task agent, own log (per-run log, 8641c0ac D-4), owner log, append, segment / rotation, sealed segment, active file.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-18 | Command | `git log origin/personal`, `git ls-tree origin/personal tickets/done/delegated-copy-own-run-memory` | Prerequisite status | 8641c0ac merged, finalized, released, user-checked | — |
| 2026-10-18 | Doc | `tickets/done/delegated-copy-own-run-memory/design-spec.md` | Model to keep | D-4 per-run logs; DS-005 receiver log then sender log under the coordinating lock; "reading the target log and adding the entry if its `messageId` is absent"; message log format declared a follow-up | Keep model |
| 2026-10-18 | Code | `autobyteus-server-ts/src/standalone-agent-run-root/persistence/standalone-root-package-store.ts` | Standalone writer/reader | `appendMessage` → coordinating owner: `readMessagesLog` (read + parse + validate whole file) → `writeMessages` (validate whole list, pretty JSON, atomic temp+fsync+rename+dir fsync) | Replace with append |
| 2026-10-18 | Code | `src/services/team-communication/team-communication-store.ts` | Team writer/reader | Same pattern: `readLog` + `write({...own, messages:[...own.messages, message]})` | Replace |
| 2026-10-18 | Code | `src/agent-org-execution/persistence/agent-org-communication-messages-store.ts` | Org writer/reader | Same pattern | Replace |
| 2026-10-18 | Code | `src/run-history/store/task-agent-message-logs.ts` | Task agents' own logs | `append` reads whole log, checks `messageId`, rewrites; `merge` used by migration; `appendMessageToOwnerLogs` maps per-log results (first durable → later failure = indeterminate → fail-stop); `composeMessageLogs` de-dups by id, filters to loaded endpoints, sorts by `createdAt` | Keep orchestration; replace physical IO |
| 2026-10-18 | Code | `src/run-history/store/atomic-run-package-file-commit-writer.ts` | Commit semantics | Outcomes `not_renamed` / `renamed_finalization_indeterminate` / `committed`; JSON pretty-printed (2-space) | Append needs an equivalent outcome contract |
| 2026-10-18 | Code | `src/standalone-agent-run-root/services/standalone-root-persistence-coordinator.ts`; `src/agent-team-execution/services/team-run-persistence-coordinator.ts`; `agent-org-run-persistence-coordinator.ts` | Lock and fail-stop | One serialized lock per coordinating run; `not_renamed` → cancel before durability; `renamed_finalization_indeterminate` → latch fail-stop | Preserve |
| 2026-10-18 | Code | schemas: `standalone-root-tree-schema.ts#validateStandaloneRootMessages`, `team-communication-messages-schema.ts`, `agent-org-communication-messages-schema.ts`, `collaboration-communication-message-schema.ts` | Validators | Whole-file validation: exact header keys, `schemaVersion: 1`, owner id match, every message validated | Header must move; per-message validation stays |
| 2026-10-18 | Code | `src/run-history/services/root-run-package-current-validator.ts` | Startup readiness | Requires `team_communication_messages.json` / `agent_org_communication_messages.json` by name; reads and validates every team/org package's composed messages at startup | Must recognize the new layout |
| 2026-10-18 | Code | `src/services/team-communication/team-communication-projection-service.ts`, `team-communication-content-service.ts`; standalone/org managers | Message references | `resolveReference(teamRunId, messageId, referenceId)` resolves through the live snapshot or the stored composed view (`store.read`) | Unchanged if `read` returns the same list |
| 2026-10-18 | Code | `src/context-files/services/context-file-record-locators.ts` | Attachment locators | Lists `(team|agent_org)_communication_messages.json` as "messages" sources; used only by released migrations (`team-context-file-execution-locators-v1`, `agent-org-flat-team-families-v1`) | Released migrations run on JSON before ours |
| 2026-10-18 | Code | `src/run-history/store/task-agent-own-files.ts#writeTeam` | New task agent team | Creates an empty team log (JSON) before the own tree | Must create the new format |
| 2026-10-18 | Code | `src/app-data-migrations/migrations/task-agent-own-run-v1/coordinating-run-migration.ts` | Released migration touching logs | Reads the coordinating JSON log (frozen readers for team/org, inline for agent) and writes task-agent logs through **current** `TaskAgentMessageLogs.merge` (`ensureExists` for teams); its Logs step re-runs for every task agent at L1 on every retry | Must not start writing the new format through current code, nor recreate JSON after ours; see Architecture Questions |
| 2026-10-18 | Code | `rg communication_messages` over `src/app-data-migrations` | Other released migrations touching logs | `team-communication-projection-address-migration`, `agent-org-flat-team-families-v1` (imports current `getTeamCommunicationMessagesPath`, `getAgentOrgCommunicationMessagesPath`), `team-run-execution-tree-v1`, `team-run-migration-state-classifier`, `agent-org-history-first-message-summary-v1`, `collaborators-to-delegated-runs-v1` | Import inventory and repoint at design |
| 2026-10-18 | Code | `autobyteus-ts/src/memory/store/{run-memory-file-store,raw-trace-archive-manager,raw-trace-archive-manifest}.ts` | Raw-trace pattern | Active `raw_traces_active.jsonl` appended per record; rotation at compaction boundaries to `raw_traces_<6-digit>.jsonl` with `raw_traces_manifest.json` (pending → complete); reader truncates a torn final line, throws on other bad lines | Pattern to follow; message logs have no compaction boundary |
| 2026-10-18 | Code | `src/app-data-migrations/migrations/raw-trace-rotation-layout-migration*.ts` | Migration pattern | Per-run: already-migrated → validate & skip; partial → finish; else copy, validate new layout, back up old manifest, remove old files; FAILED per run, `SUCCEEDED_WITH_WARNINGS` aggregate | Pattern to follow |
| 2026-10-18 | Code | `src/memory-sync/shared/memory-sync-path-policy.ts`; `rg communication src/agent-memory src/memory-sync/hub` | Memory Sync / Memory page | Sync copies every file under `agents/` and `agent_teams/` (not `agent_orgs/`), format-agnostic; excludes `*.tmp`; hub/Memory page never parse message logs | No reader change; sealed segments are stable for sync |
| 2026-10-18 | Code | `autobyteus-collaboration-stream-contracts/src/*`, `autobyteus-web/services/*` | Wire contracts | `communication_messages` is a DTO field name, not a file; the view sends the whole list | Out of scope (unchanged) |
| 2026-10-18 | Doc | `RELEASE.md` Rollback; `autobyteus-server-ts/docs/design/data_migration_guideline.md` (grep) | Rollback / migration rules | RELEASE.md: "Data written by a newer build must stay readable by the build you roll back to"; guideline: atomic per-file, keep sources until targets verified, freeze source shapes, justify backups | DEC-003; full guideline read at design gate |
| 2026-10-18 | Data | read-only `ls -l` / `du` over `~/.autobyteus/server-data/memory` (no copy, no write) | Real volume | standalone hub logs: 6 files, 10.9 MB, max 6.7 MB; task-agent own logs: 27 files, 0.5 MB; team logs: 673 files, 76 MB, max 14.3 MB; org logs: 26 files, 25.7 MB, max 21.8 MB | Volume for QR |
| 2026-10-18 | Data | `python3 -I probes/profile.py <4 largest logs>` (read-only, stats only) | Shape profile | Largest org log: 82 messages, 22.0 MB compact, median 120 KB, max 0.99 MB per message. PTM hub `7c8dce0c…`: 1210 messages, 4.2 MB, median 2.8 KB. PTM `a5f6d9d3…`: 264 msgs, 6.7 MB, max 287 KB. Largest team: 101 msgs, 14.4 MB, max 0.99 MB. All: same 7 message keys, sorted by `createdAt`, unique ids | Rotation threshold must allow ~1 MB messages; synthesized fixture profile |
| 2026-10-18 | Runtime | `node probes/cost.mjs /tmp/aoml-probe/data` (synthesized 82 × 270 KB log, not user data) | Cost today vs append | Rewrite as today (read+parse+pretty JSON+temp+fsync+rename+dir fsync): ~143–160 ms and 22.3 MB written per message; append+fsync one line: ~11–17 ms and 120 KB written | Evidence for REQ-001 / AC-001 |
| 2026-10-18 | Data | `~/.autobyteus/server-data/logs/app-data-migrations/20261017_task_agent_own_run_v1-*.log` (read-only) | Predecessor state on the user's install | `scannedCount 633, migrated 90, skipped 1, failed 0` | On this install predecessor is terminal; other installs may not be |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | An agent sends a message (`send_message_to`, handoff, Task message) in any run family | Engine commits → persistence coordinator lock → store `appendMessage` → per owner log (receiver's first, then sender's): read whole log, parse, validate all, check id, rewrite whole file atomically with fsync | Message durable in each owner log once; cost grows with log size (22 MB written per message on the largest org log) | stores above; probe | High |
| BEH-002 | User | Open a run / restart the app / restore | Store `read` composes own log + loaded task agents' logs → in-memory list → views | Every message once, `createdAt` order, endpoints loaded | stores; `composeMessageLogs` | High |
| BEH-003 | User | Open a message's referenced file | `resolveReference` over live snapshot or stored composed view | Resolves by `messageId` + `referenceId` | projection/content services | High |
| BEH-004 | Operational | App start | Readiness validator requires the log files by name and validates the composed package of every team/org run | Run admitted only with a valid package | `root-run-package-current-validator.ts` | High |
| BEH-005 | System | Crash or I/O failure during a message write | Atomic temp+rename: either old or new file; `not_renamed` → message not committed (cancel); post-rename sync failure → fail-stop | No partial file state | atomic writer; coordinators | High |
| BEH-006 | Operational | Upgrade start with pending released migrations | Released migrations (incl. `task-agent-own-run-v1`) read/write JSON logs; registry order; no minimum upgrade-from version (8641c0ac REQ-017) | Each completes on old data | registry; 8641c0ac DEC-017 | High |
| BEH-007 | System | A new task agent team is delegated | Its own empty team log is created before its own tree | Log exists for every task agent team | `task-agent-own-files.ts#writeTeam` | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| three family message stores + `TaskAgentMessageLogs` | physical log IO per owner | the only writers/readers to change | one shared log primitive vs per family |
| `appendMessageToOwnerLogs` | per-message multi-log ordering, durability mapping | preserve DEC-011 and fail-stop | append outcome contract (not written / written-indeterminate / committed) |
| file header fields (`schemaVersion`, `subjectKind`, owner id) | owner identity check on read | keep owner check | where the header lives (manifest vs first line vs folder) |
| id check on append (`messageId` absent) | prevents duplicates within a log | keep "once per log" | without reading the log: in-memory ids per log |
| readiness validator required file names | admission | new layout must be admitted | update required/retired names |
| `task-agent-own-run-v1` Logs step on current `TaskAgentMessageLogs` | released migration writes through current code | must keep working on JSON before ours; must not recreate JSON after ours | repoint to frozen JSON copy; ours non-terminal until log-writing predecessors are terminal; merge JSON that reappears |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: `agents/<id>/collaboration/communication_messages.json` (hub), `agents/<id>/communication_messages.json` (agent task agent), `agent_teams/<id>/team_communication_messages.json` (team run, task agent team), `agent_orgs/<id>/agent_org_communication_messages.json` (org run).
- Readers/writers: the three stores, `TaskAgentMessageLogs`, readiness validator, released migrations (JSON), context-file locator (released migrations only).
- Evidence paths: Source Log.

### Structural Surfaces

- Persistence boundary of three run families; per-coordinating-run lock; fail-stop contract; startup migration runner and registry; readiness scan.
- Existing structures that can support the behavior: raw-trace JSONL + rotation + manifest pattern (autobyteus-ts), raw-trace rotation migration pattern, `composeMessageLogs`, `appendMessageToOwnerLogs`.

### Potential Structural Impacts To Investigate

- API or external-contract change: none (wire DTOs unchanged).
- Persistence schema or invariant change: yes (file format, file names, rotation).
- Security or privacy boundary change: none.
- Concurrency or lifecycle change: append under the existing lock; torn-tail handling.
- Deployment/migration: yes (startup migration; released-migration repoint).

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| `node probes/cost.mjs <tmp dir>` | 82-message 22 MB synthesized org log; add one 120 KB message | today's path: 22.3 MB written, ~150 ms; append+fsync: 120 KB written, ~13 ms | AC-001 measures bytes written (deterministic) and reports time | `probes/cost.mjs` |
| `python3 -I probes/profile.py` on real logs (read-only stats) | shape profile | messages up to ~1 MB; logs already sorted, ids unique | rotation threshold ≫ 1 MB; synthesized fixture mirrors profile | `probes/profile.py` |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (Task, 2026-10-17) | Cost per message must not grow with the hub's lifetime | Explicit | REQ-001, QR-001 | — |
| User (Task) | Keep 8641c0ac's per-run model and order | Explicit | REQ-002 | — |
| User (Task) | Rotation like raw traces | Explicit | REQ-003 | trigger: DEC-002 |
| User (Task) | Migration with no message lost; old runs open with complete history; references/attachments resolve | Explicit | REQ-006, REQ-007, REQ-008 | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| JSON Lines | jsonlines.org convention | one UTF-8 JSON value per `\n`-terminated line | — | none |
| POSIX `O_APPEND` + `fsync` | Node `fs` | appends are atomic only up to `PIPE_BUF` for concurrent writers; we have one writer per run (lock) | coordinators | torn tail on crash → reader/writer repair |
| Collaboration stream contracts | `autobyteus-collaboration-stream-contracts` | unchanged view shapes | contracts src | — |

## Persisted Data And State Facts

- Affected subject: every message log of every run family, including task agents' own logs.
- Location and shape: see Payload surfaces; JSON object with header + `messages` array of 7-key messages, pretty-printed.
- Approximate volume (user's install): ≈ 732 files, ≈ 113 MB total; largest 21.8 MB.
- Current readers and writers: Source Log.
- Unknown/extra-field behavior: validators reject unknown header keys (strict) and validate each message.
- Must be preserved: every message (all 7 fields byte-equal in value), per-log membership, order by `createdAt`, owner identity, `messageId` uniqueness per log; reference files paths; run ids.
- Acceptable loss: none for messages. Formatting (pretty whitespace) is not preserved.
- Operational constraints: startup never locked out (guideline); migration time on 113 MB is a one-time read+write.
- Remaining evidence gap: none for requirements.

## Product Design Request Context

- Product Design request in the current input: `Not stated` (backend persistence only).

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/cost.mjs` | Solution Designer | reproducible cost probe on synthesized data | AC-001 baseline | REQ-001, AC-001 | Evidence | Not behavior-defining |
| `probes/profile.py` | Solution Designer | read-only shape profile of real logs (stats only) | fixture profile | QR-001, AC-001 | Evidence | Not behavior-defining |
| `probes/validate-cost.mts` | Solution Designer | in-memory whole-list validation cost (synthesized) | D-3 basis | REQ-001 | Evidence | Not behavior-defining |
| `probes/inventory.py` | Solution Designer | read-only shape inventory of real logs | fixture map | AC-006 | Evidence | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Exact repoint list of released migrations importing current log code | Pending migrations on old installs must still work | Architecture investigation | Open (design) |
| R-001 | Risk | A released migration retried after ours recreates a JSON log | Stray JSON beside the new log | Design: ours non-terminal while a log-writing predecessor is non-terminal; merge reappearing JSON | Open (design) |
| R-002 | Risk | Rollback to an older build cannot read migrated logs | RELEASE.md rollback rule | DEC-003 | Decided |
| R-003 | Risk | Startup readiness still reads every team/org log fully (≈100 MB) | Startup time, not append cost | Out of scope; follow-up candidate | Recorded |

## Architecture Investigation Findings

Authorities read for the design gate (2026-10-18): `references/architecture-design.md`, `references/design-principles.md`, `references/design-examples.md`, root `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (full), `collaboration_model.md` (CM-9).

| Date | Source | Finding | Design use |
| --- | --- | --- | --- |
| 2026-10-18 | `root-communication-engine.ts` | `messageId` = sha256(root, sender, receiver, content, createdAt ms); `commitMessages` re-validates the whole array | Fresh id per delivery; validate once (D-3) |
| 2026-10-18 | `standalone-root-communication-adapter.ts:51-69`, `agent-org-communication-adapter.ts:48-66`, `team-communication-message-append-plan.ts:55-66` | Duplicate id rejected against the in-memory list before persisting; the next snapshot is validated in full | Per-log id check in the stores is redundant; whole-list validation removed |
| 2026-10-18 | `probes/validate-cost.mts` (synthesized) | Whole-list validation 0.41 ms (82 × 270 KB) and 3.35 ms (1,210 × 3.5 KB) per message, done twice | REQ-001 in-memory clause (SR-002) |
| 2026-10-18 | `probes/inventory.py` (read-only over the user's memory dir) | hub 6 (2 > 4 MiB); agent task agent 27; task agent team 70 (7 empty, 1 > 4 MiB); team run 601 (151 empty, 1 > 4 MiB); 2 tree-less team folders with the old address shape `{teamRunId, messages}` + `.backup-*` files; org 26 (6 empty, 1 not in `createdAt` order, 1 > 4 MiB); all `schemaVersion: 1` | Shape inventory → fixture map in the design; readers sort by `createdAt` |
| 2026-10-18 | `memory-sync/source/memory-file-change-planner.ts` | Uploads changed files whole (read + sha256); defers files that change while it prepares them | Rotation limit 4 MiB; sealed files stable |
| 2026-10-18 | migration import inventory (`rg` over `src/app-data-migrations`) | Released migrations import the current JSON envelope types, schemas, path helpers, `TaskAgentMessageLogs` and the strict message validator (also via the legacy own-run module) | Frozen JSON module + repoint (D-8) |
| 2026-10-18 | `task-agent-own-run-v1-app-data-migration.ts:34-120`, `coordinating-run-migration.ts:225-270` | Predecessor ledger read pattern; the Logs step re-runs on every retry and reads the coordinating JSON log | Per-run gate, non-terminal aggregate while predecessors are pending, JSONL fallback for own-run's coordinating-log read |
| 2026-10-18 | `app-data-migration-types.ts` | Item status MIGRATED/SKIPPED/FAILED; aggregate SUCCEEDED / SUCCEEDED_WITH_WARNINGS / FAILED | Disposition mapping |
| 2026-10-18 | `agent-org-run-persistence-coordinator.ts:94-115` | Same outcome handling as the other coordinators | Reuse the `RunPackageFileWriteResult` union for appends |
| 2026-10-18 (SR-003) | ARCH-REV-001 MP-001; `rg -i "communication|ReleasedRootRunPackageValidator|team-run-migration-state-classifier|context-file-record-locators|released-run-package-file-readers"` over `src/app-data-migrations` | Log-touching migrations: tree-v1 (+ classifier), team-agent-memory-layout (classifier; acts on `CURRENT_V1` only), token-usage-run-records-v1 (its index skips `INVALID`), projection-address, flat-families (+ its locator transition), locators-v1 (`ReleasedRootRunPackageValidator` + `listContextFileRecordSources`, JSON names), summary-v1 (released catalog + `ReleasedAgentOrgCommunicationMessagesReader`), own-run. collaborators-v1 touches no log. | Released Migration Inventory; repairs R-A..R-D |
| 2026-10-18 (SR-003) | `team-run-migration-state-classifier.ts:161-285` | `CURRENT_V1` requires a V1 tree, task records and the JSON log; any partial set → `INVALID` | A gate-passing run is `INVALID` before and after conversion (F-CLASSIFIER-SAME) |
| 2026-10-18 (SR-003) | `task-agent-own-run-v1/released-coordinating-trees.ts:25-147`, `task-agent-own-run-v1-app-data-migration.ts:30-120` | `input` / `not_input` with `convertibleBy` (team_tree_v1, team_tree_v2, org_flat_families, collaborators) | The gate reuses this classification |
| 2026-10-18 (SR-003) | `team-context-file-execution-locators-v1-app-data-migration.ts`, `released-root-packages-before-task-agent-own-run.ts:54-66, 150-205`, `agent-org-history-first-message-summary-v1-app-data-migration.ts:15-112` | locators-v1 and summary-v1 admit packages by the JSON names and read messages through the released readers; locators-v1 rewrites message `referenceFiles` | Same-ID repairs R-A, R-B, R-C |
| 2026-10-18 (SR-003) | `standalone-root-persistence-coordinator.ts:48-101`, `standalone-agent-run-root-manager.ts:352`, `team-root-materializer.ts:105-107`, `agent-org-run-persistence-coordinator.ts:38` | The first package write may be retried after a `not_renamed` tree write; today's `writeMessages` replaces the file | `writeInitial` keeps replace semantics (ARCH-F-002) |
| 2026-10-18 (SR-005) | DI-001 (`implementation-design-impact-di-001.md`); `agent-org-history-candidate-plan.ts:93-110`; `agent-org-flat-team-families-v1-app-data-migration.ts:96-135, 185-193`; `agent-org-context-file-locator-transition.ts:42-49, 131-141` | Flat-families plans `partial-target` orgs (retired team files remain) and reads their org JSON log strictly; `index-only` plans skip `addRoot`, validation and cleanup; failure paths `FAILED_HISTORY` (return before cleanup) and `FAILED_TOKEN` leave the retired files | Gate marker: retired team authority in an org folder → not ready |

## Requirement Implications

- The write cost driver is the whole-file read+validate+rewrite per owner log (BEH-001); the fix is per-message append with per-message validation.
- The durability/fail-stop contract (BEH-005) must hold for appends; torn final lines are the new crash shape.
- Readiness (BEH-004) and a released migration (BEH-006) depend on file names/format, so both are in scope.
- Message references (BEH-003) depend only on the composed list; equality of the list before/after is the acceptance basis.

## Notes For Architecture Design

- Map SCN-001..SCN-006 onto: one log primitive (append, read, rotate, repair tail), the three family stores + task agent logs, coordinators (outcome mapping), readiness validator, migration + released-migration repoints.
- Verify: how duplicates are prevented without reading the log; header/owner identity location; manifest need; rotation commit and crash windows; `task-agent-own-run-v1` interplay; Memory Sync excludes temp files.
