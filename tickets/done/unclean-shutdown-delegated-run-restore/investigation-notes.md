# Investigation Notes

## Investigation Meta

- Package identifier: `unclean-shutdown-delegated-run-restore`
- Request / ticket: Project Task `project_task_08d76577-e89b-484d-9f38-cc1ed94ef95e` (from `/project_task_manager`, 2026-10-19)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/unclean-shutdown-delegated-run-restore`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/unclean-shutdown-delegated-run-restore`, branch `codex/unclean-shutdown-delegated-run-restore`
- Resolved base remote / branch / revision: `origin/personal` @ `f171032e88d3016bf34821fbe00336f8c42c355e` (fetched 2026-10-19)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from refreshed `origin/personal`; `pnpm install --frozen-lockfile` succeeded.
- Bootstrap blocker: None.
- Current solution revision ID: `SR-002`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/ticket-scope.md` (2026-10-19). Design gate: see design spec.
- Investigation status: Complete for SR-001.

## Initial Request And Clarifications

- Original request: after a sudden host shutdown, a delegated Team run on the Docker node (`http://localhost:8001`, container `autobyteus-server-0`, image `autobyteus/autobyteus-server:beta`) cannot continue: "The delegated Team at '/marketing_team' is shut down and its saved conversation is unavailable (indeterminate); it cannot be restored." Find the cause, whether data was lost, and fix it.
- Clarifications received: none needed.
- User-supplied facts and constraints: his data is read-only; work on copies; any change to real data needs his approval and a backup; do not stop or restart his node.
- Initial ambiguity: which delegated copy failed and why (`indeterminate`). Resolved below.

## Product And Domain Understanding

- Product area: run restore of delegated (task) executions; raw-trace memory persistence.
- Affected actors or systems: the user; the node's server; all runtimes (they all record raw traces through `RunMemoryFileStore`).
- Existing purpose: `raw_traces_active.jsonl` is each AgentRun's append-only local record of its conversation (user/assistant messages, tool calls/results). For external runtimes (AGY, Codex, Claude) the provider keeps its own conversation and the run restores through `platformAgentRunId`; the raw traces are the local history, the work-journal source, and the evidence that a conversation exists.
- Terminology: "damaged end" = bytes after the last complete JSONL record (a torn record, or zero bytes left when the file size reached the disk but the data did not).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-19 | User | Screenshots `ctx_08cc2b6dc2ba__user-screenshot-1-cannot-continue-error.png`, `ctx_b4b327bf5747__user-screenshot-2-docker-node-8001.png` | Symptom | Error text and member "marketing content creator" Offline under "Draft and publish an AutoB…" | — |
| 2026-10-19 | Code | IN-SRC-01 `autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-adapter.ts` `assertRestorableChain` (also `standalone-agent-run-root/services/standalone-root-task-execution-adapter.ts`, `agent-org-execution/services/agent-org-task-execution-adapter.ts`) | Origin of the message | For each non-live chain entry, inspects the ingress AgentRun (the coordinator for a Team) and refuses unless `present`; same text duplicated in three adapters | Refusal text (REQ-005) |
| 2026-10-19 | Code | IN-SRC-02 same three files | Message content | Only `(${activity.kind})`; no member, no reason, no next step | REQ-005 |
| 2026-10-19 | Code | IN-SRC-03 `autobyteus-server-ts/src/agent-memory/services/agent-conversation-activity-inspector.ts` | Classification | `readJsonlStrict`: `JSON.parse` on every non-empty trimmed line; any throw → `indeterminate`. `String.trim()` does not remove `\u0000`, so a zero-filled end is a non-empty unparseable line | Root cause |
| 2026-10-19 | Code | IN-SRC-04 `autobyteus-ts/src/memory/store/run-memory-file-store.ts` `readJsonl` (lines 32-60), `add` (155-161) | The store's own reader/writer | Reader cuts an unparseable final line ("A process crash can leave only the final JSONL record incomplete"), but counts `validBytes` in UTF-8 bytes and cuts with `raw.slice(0, validBytes)` on the decoded string (UTF-16 units) → wrong position when content is non-ASCII. `add` uses `fs.appendFileSync` without checking the end and without sync | REQ-003, REQ-004 |
| 2026-10-19 | Code | IN-SRC-05 `run-memory-file-store.ts` `writeJsonl`/`writeJson`, `raw-trace-archive-manager.ts` `writeJsonl`/`writeJson`, `working-context-snapshot-store.ts` `write` | Whole-file writes | tmp write + rename, no fsync, helper duplicated in three files; archive manager `readJsonl` is strict | REQ-006 |
| 2026-10-19 | Code | IN-SRC-06 `autobyteus-server-ts/src/run-history/store/message-log.ts` (`append`, `repairTail`, `read`) | Compare message logs | Message logs sync each append, cut an unfinished last line before appending (byte-exact, on a file handle) and ignore it on read — already robust | Preserved (BEH-006); precedent for byte-exact tail repair |
| 2026-10-19 | Code | IN-SRC-07 `configured-agent-activation-planner.ts` `resolvePlan`/`inspectConversationActivity` | Other caller | Member activation uses the same inspector; `indeterminate` → `COLLABORATION_AGENT_CONTINUATION_STATE_UNREADABLE` "The local conversation state cannot be inspected safely." | Same fix applies; message gains the reason |
| 2026-10-19 | Code | IN-SRC-08 `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` `readJsonl`, `readRawTracesActiveSnapshot` | Display readers | Skip malformed lines with a warning (lenient) — why the UI still shows the conversation | Out of scope (follow-up for one shared reader) |
| 2026-10-19 | Code | IN-SRC-09 `autobyteus-server-ts/src/agent-work-journal/services/work-journal-service.ts` `renderFile` | Journal | Open journal file is re-rendered from the active raw-trace file on every call | Journal self-heals; no change |
| 2026-10-19 | Command | `docker ps`; `docker exec autobyteus-server-0 …` (read-only `ls`, `stat`, `date`); `docker cp autobyteus-server-0:/home/autobyteus/data/memory` → `/Users/normy/autobyteus_org/unclean-shutdown-evidence/node0-copy/memory` | Evidence on a copy | Node up since ~13:37 UTC; data volume is ext4 on `/dev/vda1` (Docker Desktop VM) | — |
| 2026-10-19 | Data | IN-DAT-01 PM run `project_task_manager_317c…/collaboration/collaboration_tree.json`; team `agent_teams/marketing_team_0bdbbad72fb8417eb42504d363a69c60/team_run_execution_tree.json` | Which copy failed | Latest `/marketing_team` copy `0bdbbad7…` started 11:57:50 UTC by the PM; coordinator `/marketing_team/marketing_content_creator` = `marketing_content_creator_59ff6d5ef3374f82ae84b6416573cd32` (AGY, `platformAgentRunId 59bc54ef-…`). Its `raw_traces_active.jsonl`: 360,448 bytes (exactly 88 × 4096), last written 13:20:27.20 UTC; bytes 359,207…360,447 (1,241 bytes) are all `0x00`; byte 359,206 is `\n`; the 243 lines before are valid JSON (6 user, 5 assistant, 116 tool_call, 116 tool_result); last valid record 13:19:51.776 UTC | Root cause |
| 2026-10-19 | Command | `scripts/scan_tree.py` over every `*.json`/`*.jsonl` (and a NUL scan over `*.md/*.json/*.jsonl/*.txt`) on copies of node-0 (1,719 files), node-1 (7), node-2 (84) and read-only over the desktop `~/.autobyteus/server-data/memory` (15,491 files) | Extent | Exactly one damaged file on node-0. The only desktop hit is `memory/imports/docker-node-1/…/marketing_content_creator_59ff…/raw_traces_active.jsonl`, the memory-sync mirror of the same file (imported 13:43 UTC, identical 360,448 bytes / 1,241 zeros). No other run, message log, tree, manifest, journal or metadata is damaged | Answer to Q3 |
| 2026-10-19 | Data | IN-DAT-02 same team folder: `team_communication_messages_active.jsonl` (3 valid lines), `team_run_execution_tree.json` (valid), coordinator `work_journal/` (no zeros; manifest `source_record_count 224`, open), deep researcher folder (valid) | What else could be lost | All intact | Answer to Q2 |
| 2026-10-19 | Data | IN-DAT-03 `docker cp` of `/root/.gemini/antigravity-cli/conversations/59bc54ef-c02e-4448-8a33-24bd30faa897.db` (+ `-wal`) → `unclean-shutdown-evidence/agy/`; `sqlite3 -readonly … 'pragma integrity_check'` → `ok`; 248 steps; last step 247 is a `write_to_file` of "Review Package: X Draft v4"; WAL last written 13:20:27.16 UTC | Is the conversation itself intact | The AGY runtime's own conversation (SQLite, WAL) is intact through the last step; the local raw trace lost only what was appended after 13:19:51 (the X-draft write call at 13:20:27 and anything after it) | Answer to Q2 |
| 2026-10-19 | Runtime | IN-DAT-04 node `server.log` tail (copied) | Log evidence | Repeated "Skipping malformed JSONL line in …/marketing_content_creator_59ff…/raw_traces_active.jsonl: SyntaxError: Unexpected token ' ', \"          \"... is not valid JSON" from the display reader | Confirms the damaged line is what all readers see |
| 2026-10-19 | Doc | `DESIGN.md`, `TESTING.md`, `RELEASE.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–3 | Policy | Tolerant readers over migrations; contain bad data to its run; no real data in tests | Design |
| 2026-10-19 | Doc | `design-review-report.md` (ARCH-REV-001), MP-001 | Review of SR-001 | Page-granular writeback can leave a zero run inside a record or across two records; dropping interior zeros would splice or shorten records. Accepted: zeros count as absent only as whole lines or on line edges | REQ-001/DEC-004 narrowed (SR-002) |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | User sends a message to a shut-down delegated run | send → task adapter `assertRestorableChain` → inspector reads coordinator raw traces strictly → refuse on `indeterminate` | Run cannot continue after any damaged end | IN-SRC-01/03, IN-PRB-01 | High |
| BEH-002 | System | Any store read of an active log | `readJsonl` truncates an unparseable last line using a byte count on a string | Wrong cut with non-ASCII content | IN-SRC-04, IN-PRB-01/02 | High (reproduced) |
| BEH-003 | System | Runtime appends after restore | `appendFileSync` after a damaged end | New record glued to damage, then deleted by the next read | IN-PRB-02 | High (reproduced) |
| BEH-004 | System | Refusal | Message "(indeterminate)" | Not actionable | IN-SRC-02 | High |
| BEH-005 | System | Archive/compaction/snapshot writes | tmp + rename without sync | Possible empty file after power loss | IN-SRC-05 | Medium (no instance found on the user's data) |
| BEH-006 | System | Message-log append / package JSON writes | synced appends; tail repair | Robust | IN-SRC-06, scan | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Owns each run's memory files; all runtimes and `FileMemoryStore` go through it | Single place for the read/repair/append rules | Extract the JSONL line rule into one owned file |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Archive segments + manifest; own strict `readJsonl`, duplicate `writeJsonl`/`writeJson` | Same rule for segment reads | Reuse the shared reader (read-only) and durable replace |
| `autobyteus-ts/src/memory/store/working-context-snapshot-store.ts` | Snapshot write (third duplicate tmp+rename) | REQ-006 | Reuse durable replace |
| `autobyteus-server-ts/src/agent-memory/services/agent-conversation-activity-inspector.ts` | Classification for 3 adapters, activation planner, process supervisor, application scope | REQ-001/002 | Replace private strict reader with the shared read-only reader |
| three task-execution adapters | Refusal text duplicated | REQ-005 | One function builds the refusal |
| `autobyteus-server-ts/src/agent-memory/store/external-runtime-memory-writer.ts` | Constructor reads (repairs) before appends | Already reads first; append guard makes it independent of that | — |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: `raw_traces_active.jsonl`, `raw_traces_<6 digits>.jsonl` / `raw_traces_archive/*`, `raw_traces_manifest.json`, `working_context_snapshot.json`, episodic/semantic JSONL (same store).
- Readers/writers: `RunMemoryFileStore`, `RawTraceArchiveManager`, `WorkingContextSnapshotStore`, server inspector, server display readers.
- Evidence paths: IN-SRC-03…05, IN-SRC-08.

### Structural Surfaces

- Persistence reader/writer behavior of one library store (no format change); one server classification function; refusal text in three adapters and one planner.
- Existing structural surfaces that can support the approved behavior: all of the above; no new owner beyond one small file per concern.

### Potential Structural Impacts To Investigate

- API or external-contract change: none (error code unchanged; message text changes).
- Persistence schema or invariant change: none (format unchanged; repair rule fixed).
- Security or privacy boundary change: none (warning logs path and byte count only, never content).
- Concurrency or lifecycle change: none.
- Deployment/migration change: none (no migration; lazy repair).
- Confirmed absent.

## Runtime, Probe, Or Reproduction Findings

Probes were disposable vitest files run in the worktree against a temporary copy of the evidence copy (never the node or the desktop data); they are kept outside the repository at `/Users/normy/autobyteus_org/unclean-shutdown-evidence/probes/` and are not tests. Durable tests must use synthesized data (TESTING.md).

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| IN-PRB-01 `vitest run tests/unit/zz-probe/probe.test.ts` (removed) | Inspector and store on the damaged file | Inspector → `indeterminate` "Unexpected token ' ', \"          \"... is not valid JSON" (reproduces the user's refusal). Store read → 243 records but file 360,448 → 359,810 bytes: 603 zero bytes kept (wrong cut). Inspector afterwards still `indeterminate` | Root cause confirmed; store repair defective | `…/probes/probe.test.ts` |
| IN-PRB-02 `probe2.test.ts` | Append after repair; ASCII/non-ASCII torn tail | `ExternalRuntimeMemoryWriter` append of a new `user` record, then a read → still 243 records: the new record was glued to the leftover zeros and deleted as the "torn end". A torn `{"id":"b","trace_type":"assist` after a record containing `Größe –` is cut to `{"id` — still broken | Silent loss of every later append (REQ-004); byte-exact cut (REQ-003) | `…/probes/probe2.test.ts` |
| IN-PRB-03 `python3 -I scripts/check_jsonl.py` | Byte analysis | First zero at 359,207; previous byte `\n`; all bytes after are zero; file size is a 4 KiB multiple | Damage is a pure zero-filled end (size committed, data not) | `/Users/normy/autobyteus_org/unclean-shutdown-evidence/scripts/` |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (Task text) | "I don't know whether it's a data loss"; wants to continue | Direct | Answer loss question; restore | DEC-008 (repair now?) |
| Task direction | Partly readable run should restore, truncated last line dropped and logged; clear refusal otherwise | Direct | REQ-001…REQ-005 | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| ext4 on Docker Desktop VM (`/dev/vda1`, `rw,relatime,discard`) | Node data volume | Delayed allocation: after power loss an appended file may keep its new size with unwritten (zero) blocks | IN-DAT-01 | Out-of-order writeback can create zero regions before later data (handled by REQ-001) |
| `JSON.stringify` (ECMA-262) | — | Escapes U+0000; a serialized record never contains a raw `0x00` byte | Spec | None |
| AGY CLI conversation store | SQLite + WAL under `/root/.gemini/antigravity-cli/conversations/` | Durable; restore uses `platformAgentRunId` | IN-DAT-03 | — |

## Persisted Data And State Facts

- Affected stored subject: per-run memory JSONL files (raw traces active/archived; episodic/semantic in the same store), archive manifest, working-context snapshot.
- Location and representative shape: `<memory>/agents/<runId>/…`, `<memory>/agent_teams/<teamRunId>/<memberRunId>/…`; one JSON object per `\n`-terminated line.
- Approximate volume: node-0 1.1 GB memory, ~1,700 JSON/JSONL files; desktop 9.5 GB, ~15,500 files.
- Current readers and writers: see Source Log.
- Current unknown/extra-field behavior: records are passed through as dictionaries (unchanged by this ticket).
- Required semantics or data that must be preserved: every complete record and its order.
- Acceptable loss: the damaged end (no complete record in it).
- Operational constraints: no migration, no startup scan; the user's data is read-only for tests.
- Remaining evidence gap: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- Remaining fields: N/A — not applicable.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/unclean-shutdown-evidence/` (node copies, AGY DB copy, scan scripts, probes) | Solution Designer | Evidence of the user's real data — local only, never committed, never used as test data | This ticket | REQ-001…REQ-004 | Evidence | Not behavior-defining; delete after the ticket closes |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | `autobyteus-ts` is a shared foundation; every runtime appends through it | Regressions affect all runs | Full rerun per TESTING.md; focused unit tests | Open (validation) |
| RSK-002 | Risk | Per-append sync remains absent: a power loss still loses the last few seconds of local traces (not the provider conversation) | Expectation setting | Follow-up FU-001 | Accepted |
| UNK-001 | Unknown | Exactly how many records after 13:19:51 were lost | Loss statement | The AGY DB shows the in-flight step (X Draft v4 write); local trace lost at least that call record | Resolved enough |

## Architecture Investigation Findings

- Entry: user message → server routes to the delegating root's task adapter → `assertRestorableChain(agentRunId)` before `restoreChain` (IN-SRC-01). The ingress AgentRun of a Team is its coordinator (`source.node.coordinatorAddress`).
- The inspector is the single classification owner for six call sites (IN-SRC-03, IN-SRC-07); fixing its reader fixes all of them.
- After the check passes, restore of an AGY member constructs `ExternalRuntimeMemoryWriter` (reads the active log through the store, i.e. the defective repair) and appends traces; native runs append through `MemoryManager` → `FileMemoryStore.add` → `RunMemoryFileStore.add` without a guaranteed prior read.
- The JSONL line rule exists four times with three different policies (strict inspector, defective-repair store, strict archive reader, lenient display readers) — `Duplicated Policy`.
- The tmp+rename write helper exists three times, none syncs (IN-SRC-05).
- Message logs (`message-log.ts`) already implement the right append rule (byte-exact cut before append, sync) — precedent.
- No migration convention applies: the format does not change; repair is the reader's ordinary behavior on an append-only log (Data Migration Guideline §3 "read tolerantly").

## Requirement Implications

- Root cause is a strict reader meeting a normal crash artifact; plus a latent defect that would have lost new records after restore. Both are in the functionality this ticket changes (run restore / raw-trace persistence), so they are this ticket, not prerequisites.
- Data loss answer: only the unflushed end of one file; the provider conversation, journal, messages and trees are intact.

## Notes For Architecture Design

- Map SCN-001…SCN-004 onto: store (read/repair/append), archive manager (read), inspector (classify), adapters (refuse), planner (refuse).
- Keep error code, file names and format unchanged; no migration.

## User Data Repair (DEC-008, approved by the user 2026-10-19)

- Approval: the user's words in the Solution Designer conversation: "The repair: cut the file at byte 359,207, right after the last complete entry. In general i think you did correctly".
- File: node `autobyteus-server-0`, `/home/autobyteus/data/memory/agent_teams/marketing_team_0bdbbad72fb8417eb42504d363a69c60/marketing_content_creator_59ff6d5ef3374f82ae84b6416573cd32/raw_traces_active.jsonl`.
- Before: 360,448 bytes, sha256 `2e0f9472bc7024fb6def13b0c26a39e13d833396b1e970c45f70e367f958fc23` (identical to the evidence copy).
- Backups (same sha256): node `/home/autobyteus/data/backups/unclean-shutdown-2026-10-19/marketing_content_creator_59ff6d5ef3374f82ae84b6416573cd32.raw_traces_active.jsonl.damaged`; host `/Users/normy/autobyteus_org/unclean-shutdown-evidence/backup-before-repair/raw_traces_active.jsonl.damaged`.
- Action: precondition check (hash, size, byte 359,206 = `\n`, bytes 359,207… all `0x00`), then `ftruncate` to 359,207 + `fsync`, inside the running container; the node was not stopped or restarted.
- After: 359,207 bytes, ends with `\n`, no `0x00`, 243 valid object records (11 user/assistant), last record ts 1792415991.776 (13:19:51.776 UTC).
- Undo: copy either backup back over the file.
- The desktop memory-sync mirror (`~/.autobyteus/server-data/memory/imports/docker-node-1/…`) was not touched; it updates on the next sync.
