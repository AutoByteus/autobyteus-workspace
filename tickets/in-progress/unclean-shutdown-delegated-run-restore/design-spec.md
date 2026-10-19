# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (SR-001 reviewed in ARCH-REV-001: Fail — AR-001, AR-002, R-1; resolved here)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-002, approved by the Solution Designer within the Task's direction (SR-001: user informed 2026-10-19, `handoff-architecture-design-complete.md`; SR-002 REQ-001/DEC-004 narrowing: user informed in `handoff-architecture-design-revised.md`).
- Behavior-defining supplements and their approval references: None.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/unclean-shutdown-delegated-run-restore/tickets/in-progress/unclean-shutdown-delegated-run-restore/investigation-notes.md`
- Authorities read (2026-10-19): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–3, `TESTING.md`, `RELEASE.md`. No closer `DESIGN*.md` applies to `autobyteus-ts/src/memory/store` or `autobyteus-server-ts/src/agent-memory`.
- Project design-principle conflicts or discrepancies: DESIGN.md rule 7 says unreadable run data is never changed or deleted. Cutting a damaged end is not in conflict: the cut bytes hold no record (zero bytes or a record whose append never finished), the run itself is readable, and the repository's message logs already apply the same rule (`message-log.ts` `repairTail`). Real damage that is not a damaged end is left untouched and reported, as rule 7 requires. No question for the user.

## Current-State Read

User message → delegating root's task adapter → `assertRestorableChain` → `AgentConversationActivityInspector.inspect` (strict private JSONL reader) → refusal on `indeterminate` (BEH-001, IN-SRC-01/03). If the check passed, restore would construct the runtime's memory writer, which reads through `RunMemoryFileStore.readJsonl` (repair cuts at a byte count applied to a string: BEH-002) and then appends with `appendFileSync` (no end check: BEH-003, IN-PRB-02). The JSONL line rule is implemented four times with three policies; the tmp+rename writer three times without sync (IN-SRC-04/05/08). Message logs already do it right (IN-SRC-06). Constraints: no format change, no migration, error code unchanged, six inspector callers keep their decision tables.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: two new small files in `autobyteus-ts/src/memory/store/`, three modified store files there; in `autobyteus-server-ts` one new small file and five modified files (inspector, three adapters, activation planner); unit tests in both packages; one server integration test. All inside existing owners.
- Architectural risk: `High`
- Risk rationale: changes the read/repair/append behavior of the persistence layer that every runtime writes through (shared foundation, wide blast radius), and the change cuts bytes from users' files. No contract, migration, security or concurrency change.
- Escalation trigger: any reader of these files found to depend on the old strict or lenient behavior; any need to change the file format or add a startup scan; any runtime that appends without going through `RunMemoryFileStore`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| IN-DAT-01, IN-PRB-03 | node copy of `marketing_content_creator_59ff…/raw_traces_active.jsonl` | Zero-filled end of 1,241 bytes after a `\n` | Zero bytes are treated as absent; damaged end cut | — |
| IN-PRB-01 | probe on a copy | Inspector `indeterminate`; store cut leaves 603 zeros | One byte-level reader | — |
| IN-PRB-02 | probe on a copy | Appended record lost on next read | Append guard | — |
| IN-SRC-06 | `message-log.ts` | Byte-exact tail cut before append | Same rule for memory JSONL | — |
| IN-SRC-07 | `configured-agent-activation-planner.ts` | Same inspector, vague message | Planner message carries the reason | — |

## Intended Change

One byte-level JSONL reader in the store package that ignores a damaged end and zero bytes and reports other damage by line; the store cuts a damaged end exactly (logged) when it opens a file for use and before any append; the inspector uses the same reader read-only; the store's whole-file writes sync before rename; one function builds a clear refusal for the three task adapters.

## Change Scope (Mandatory)

- In scope: UC-001…UC-004. Areas: `autobyteus-ts` memory store (JSONL read/repair/append, archive segment reads, durable whole-file replace incl. snapshot store); `autobyteus-server-ts` conversation-activity inspector, task-execution refusal (three adapters), member-activation refusal text.
- Deliberately left alone: message logs and package JSON writers (already robust, BEH-006); server display readers `memory-file-store.ts` (lenient; work today); the inspector's archive-manifest validation (strict on purpose; manifests are rename-written); work journal (re-renders from the active file); runtime provider stores; memory sync; per-append sync.
- Follow-ups:
  - FU-001: consider syncing raw-trace appends (as message logs do) after measuring append latency; would shrink the window of lost local traces after a power loss (RSK-002).
  - FU-002: make the server display readers (`autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` `readJsonl`, `readRawTracesActiveSnapshot`) use the shared reader so display and restore agree (today they skip any bad line, including real mid-file damage, silently except for a log line).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002; AC-001, AC-002, AC-005 | User message to a shut-down delegated run (SCN-001) | IN-SRC-01/03 | Damaged end ignored; classify from complete records | DS-001 |
| BEH-002 | System | REQ-001, REQ-003; AC-003 | Store opens a log for use | IN-SRC-04, IN-PRB-01 | Byte-exact cut, logged | DS-002 |
| BEH-003 | System | REQ-004; AC-004, AC-005 | Runtime append after restore (SCN-003) | IN-PRB-02 | Cut before append; record is its own line | DS-002 |
| BEH-004 | System | REQ-005; AC-006 | Refused restore (SCN-002) | IN-SRC-02 | Clear message with member, reason, next step | DS-001 |
| BEH-005 | System | REQ-006; AC-007 | Archive/compaction/snapshot write (SCN-004) | IN-SRC-05 | Synced before rename | DS-003 |
| BEH-006 | System | AC-008 | Message logs, package JSON | IN-SRC-06 | Preserved | — |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers that fire:
  - Repeated coordination trigger: the JSONL line rule is implemented in `run-memory-file-store.ts`, `raw-trace-archive-manager.ts`, the server inspector (and the server display readers, follow-up) with different policies; the refusal message is copied into three adapters.
  - Reusable-structure trigger: the tmp+rename writer is copied into three files.
  - Not firing: authoritative-boundary (callers keep using `RunMemoryFileStore`; the inspector uses the store for paths and the format owner's read function, not store internals), ambiguous-boundary, persisted-data transition (format unchanged).
- Root cause classification: `Duplicated Policy Or Coordination` (the restore check's private strict reader disagrees with the store's repair rule), plus a `Local Implementation Defect` in the store's cut position and a `Missing Invariant` on append (an append must start on a clean line).
- Refactor needed now: `Yes` (bounded)
- Evidence: IN-SRC-03/04/05, IN-PRB-01/02.
- Design response: one owned JSONL reader/repair file and one durable-replace file in the store package; the inspector, archive manager and store use them; one refusal function for the three adapters.
- Refactor rationale: fixing only the inspector would leave the store's defective cut and the append loss; fixing them separately would keep three policies.
- Intentional deferrals and residual risk: FU-001, FU-002.

## Terminology

- Damaged end: the bytes of a JSONL file after its last complete record's line — a record whose append did not finish, and/or zero bytes from a file size that reached the disk without its data.
- Edge zeros: runs of `0x00` (with whitespace) at the start or end of a line, or forming a whole line. They remove nothing from any record and count as absent.
- Interior zeros: a `0x00` that remains between other bytes of a line after its edge zeros are dropped. It means bytes of that line were never written (or a zero run joined two records); such a line is never a complete record.
- Complete record: a line that, after dropping edge zeros and surrounding whitespace, contains no `0x00` and parses as a JSON object.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the private `readJsonl` in `run-memory-file-store.ts`, `readJsonl` in `raw-trace-archive-manager.ts`, `readJsonlStrict` in the inspector, the duplicated `writeJsonl`/`writeJson` helpers in both store files and the inline tmp+rename in `working-context-snapshot-store.ts`, the duplicated refusal text in three adapters. All removed.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: per-run memory JSONL files and the archive manifest/snapshot JSON (investigation notes, Persisted Data); thousands of files per install.
- Relevant change: none to the format; the reader becomes tolerant of a damaged end and zero bytes; writers sync whole-file replacements.
- Normal reader/writer behavior and representative evidence: 1,719 + 15,491 files scanned; one damaged file; all others parse identically under the new rule (the new rule accepts a strict superset of what the strict readers accept, except a JSON line that is not an object, which no writer produces).
- Required semantics and invariants under direct use: every complete record, in order; append-only.
- Constraints: no startup scan; repair happens only when a run's file is opened for use (lazy, per run).
- Decision: `Directly Usable — No Migration`
- Decision rationale: Data Migration Guideline §3 "read tolerantly"; the existing store already cut torn ends on read — the cut becomes correct. A one-time scan would cost I/O across all history for one damaged file per crash.
- Supported acceptance criteria: AC-001…AC-004.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-004 | User message to a shut-down delegated run | Restore proceeds or a clear refusal reaches the user | Task-execution adapter (per root kind) | The user's failing path |
| DS-002 | Primary End-to-End | BEH-002, BEH-003 | Runtime event after restore | Record durably appended on a clean line | `RunMemoryFileStore` | Prevents silent loss after restore |
| DS-003 | Bounded Local | BEH-005 | Archive / rotation / snapshot write | Old or new complete file on disk | `RunMemoryFileStore` / `RawTraceArchiveManager` / `WorkingContextSnapshotStore` | Power loss during rewrite |

## Primary Execution Spine(s)

- DS-001: `Chat input (web) -> Root run command path -> TaskExecutionAdapter.assertRestorableChain -> AgentConversationActivityInspector.inspect -> readJsonlRecords (store package) -> present: restoreChain -> runtime restore | otherwise: taskExecutionConversationUnavailable(...) -> TaskDelegationError to the user`
- DS-002: `Runtime event -> ExternalRuntimeMemoryWriter / MemoryManager -> RunMemoryFileStore.add -> ensure clean end (once per file path per store instance; cut damaged end if any) -> appendFileSync(line)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Before restoring each shut-down entry of the chain, the adapter asks the inspector whether the ingress member has a saved conversation. The inspector reads the active log and complete archive segments with the shared reader, which skips zero bytes and a damaged end without touching the file. A complete user/assistant record → `present`; restore proceeds. Damage elsewhere → `indeterminate` with "line N of <file> is damaged"; the adapter throws the refusal built by one function naming the Agent/Team, member, reason and next step, and logs a warning. | adapter, inspector, reader | adapter | refusal builder, warning log |
| DS-002 | The first append to each file path through a store instance (raw traces, episodic and semantic files are checked separately; `recordSystemInstructionSupply` shares the raw-trace path's state) checks the end of that file: if it is not a `\n` (or the file is empty), the store reads the file with the shared reader and cuts it to the last complete record (adding the missing `\n` when the last complete record has none), logging one warning. Later appends to that path through the same instance append directly. Reads for use (`readMemoryDicts` and everything built on it) apply the same cut. | writer, store, reader | `RunMemoryFileStore` | warning log |
| DS-003 | Whole-file writes write `<file>.tmp`, sync it, rename it over the file and sync the folder. | store writers | each store | — |

## Spine Actors / Main-Line Nodes

Task-execution adapters (three root kinds); `AgentConversationActivityInspector`; `RunMemoryFileStore`; the JSONL reader (`readJsonlRecords`/`repairJsonlDamagedEnd`).

## Ownership Map

- `jsonl-log-file.ts` (new, `autobyteus-ts/src/memory/store/`): owns the memory JSONL line rule — what a complete record is, what the damaged end is, byte-exact cut, the damage error type. Knows nothing about runs.
- `RunMemoryFileStore`: owns when a file is repaired (open for use, before first append) and the "end verified" state, kept per file path within an instance (raw-trace, episodic and semantic files separately; `recordSystemInstructionSupply` shares the raw-trace path's state).
- `RawTraceArchiveManager`: reads sealed segments read-only with the shared reader; never cuts a sealed segment.
- `durable-file-replace.ts` (new): owns tmp → sync → rename → folder sync.
- `AgentConversationActivityInspector`: owns classification (unchanged decision rules: `present` needs a complete conversation record; `none` needs fully readable logs).
- `task-execution-conversation-availability.ts` (new, server `agent-collaboration/execution/task/`): owns the refusal for an unrestorable task execution (message, code, warning).
- Adapters: own chain traversal and which member is the ingress (unchanged), now return the member's address with its run id.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no facade added.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `readJsonl` in `run-memory-file-store.ts` | Defective duplicate of the line rule | `jsonl-log-file.ts` | In This Change | — |
| `readJsonl` in `raw-trace-archive-manager.ts` | Duplicate | `readJsonlRecords` | In This Change | — |
| `readJsonlStrict` in the inspector | Duplicate, disagreeing policy | `readJsonlRecords` | In This Change | object check moves into the shared rule |
| `writeJsonl`/`writeJson` in both store files; inline tmp+rename in `working-context-snapshot-store.ts` | Triplicated, unsynced | `durable-file-replace.ts` | In This Change | — |
| Refusal text in three adapters | Triplicated | `task-execution-conversation-availability.ts` | In This Change | — |
| Server display readers' own lenient JSONL loops | Would use the shared reader | — | Follow-up (FU-002) | — |

## Return Or Event Spine(s) (If Applicable)

The refusal returns through the existing `TaskDelegationError` path to the chat as today (error card).

## Bounded Local / Internal Spines (If Applicable)

- Parent owner `jsonl-log-file.ts`: `bytes -> split at 0x0A -> per line: drop leading/trailing 0x00 and whitespace -> empty? skip -> (no 0x00 left AND parses as JSON object)? record : (last non-empty line? damaged end : JsonlLogDamagedError(line))`.
- `completeByteLength` ends right after the `\n` of the last complete record's line (or right after that record when its `\n` never landed). Empty, whitespace-only or zero-only lines after it belong to the damaged end and are cut with it. Lines before it, including zero-only lines, are kept byte for byte (never rewritten).

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Repair warning | DS-002 | `RunMemoryFileStore` | `console.warn` (the library logger) with file path, bytes removed, records kept — never content | DESIGN.md rule 7, Task "dropped and logged" | — |
| Refusal warning | DS-001 | refusal function | server `logger.warn` with root run, Agent/Team address, member run id, reason | DESIGN.md rule 7 | — |

## Ownership Boundaries

`RunMemoryFileStore` is the authoritative boundary for using a run's memory files; the inspector is read-only and may depend on the format owner's read function (`readJsonlRecords`) and the store's path getters, never on repair. Adapters own chain traversal; the refusal function owns wording and logging.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RunMemoryFileStore` | repair/cut, end-verified state, durable replace | runtimes, `FileMemoryStore`, `ExternalRuntimeMemoryWriter`, server services | appending to a memory JSONL with `fs.appendFile*` outside the store; calling `repairJsonlDamagedEnd` from the server | add a store method |
| `jsonl-log-file.ts` | line rule | store, archive manager, inspector (read-only) | a private JSONL parse of memory files in new code | extend the module |

## Dependency Rules

- `autobyteus-server-ts` may import `readJsonlRecords` and `JsonlLogDamagedError` from `autobyteus-ts/memory/store/jsonl-log-file.js`; it must not import or call `repairJsonlDamagedEnd`.
- The inspector must not write or cut files.
- Adapters call the refusal function; they do not format the message themselves.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `readJsonlRecords(filePath): { records: Record<string, unknown>[]; completeByteLength: number; damagedEndByteLength: number; endsWithNewline: boolean }` | one memory JSONL file | read-only; missing file → empty result | absolute file path | throws `JsonlLogDamagedError` for a damaged line other than the last non-empty one |
| `repairJsonlDamagedEnd(filePath): Record<string, unknown>[]` | one memory JSONL file | cut damaged end byte-exact (`fs.truncateSync`), append `\n` after a last complete record lacking one, warn once; returns records | absolute file path | used only by the store |
| `class JsonlLogDamagedError extends Error { filePath; lineNumber }` | damage report | message: ``line ${lineNumber} of ${basename} is damaged`` | — | plain words, used verbatim in refusals |
| `replaceFileDurably(filePath, text)` | one file | tmp write, `fsyncSync`, rename, folder fsync | absolute path | folder fsync errors on platforms that do not support it are ignored (Windows `EPERM`/`EISDIR`) |
| `taskExecutionConversationUnavailable({ executionKind: "agent" \| "team", address, ingressMember: { address, agentRunId }, activity })` → `TaskDelegationError` | one refused task execution | builds message, logs warning | explicit kind + addresses | `activity` is the non-`present` result; every `indeterminate` cause has a plain-words reason (see Refusal reasons) |

### Refusal reasons (R-1)

The inspector returns `indeterminate` with an `Error` whose message is already a plain-words reason, so the refusal function uses `activity.error.message` verbatim after "cannot be read (" … ")":

| Inspector cause | Reason text |
| --- | --- |
| `JsonlLogDamagedError` | `line <N> of <file name> is damaged` |
| Missing `agentRunId`/`memoryDir` | `its memory folder is unknown` |
| Manifest unreadable / not JSON / not an object / invalid segments or status | `its conversation index <manifest file name> is damaged` |
| Complete segment without file name or not resolvable | `its conversation index points to a missing or invalid archive file` |
| File-system read error (`EACCES`, `EIO`, …) | `<file name> could not be read (<error code>)` |

The original error stays attached as `cause` and is logged in the warning. Wording of each row is the implementation's to polish; every row must name the file or the missing piece in plain words.

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `readJsonlRecords` | Yes | Yes | Low | — |
| `repairJsonlDamagedEnd` | Yes | Yes | Low | — |
| `replaceFileDurably` | Yes | Yes | Low | — |
| `taskExecutionConversationUnavailable` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| JSONL rule file | `jsonl-log-file.ts` | Yes | Low | — |
| Durable write | `durable-file-replace.ts` | Yes | Low | — |
| Refusal | `task-execution-conversation-availability.ts` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| JSONL line rule | `autobyteus-ts/src/memory/store` | Extend (new file there) | Store owns the files | — |
| Durable replace | server `atomic-run-package-file-commit-writer.ts` | Create new in `autobyteus-ts` | Server writer is async, result-typed for run packages and lives in the server; the library cannot depend on the server | — |
| Message-log tail repair | `message-log.ts` | Not reused | Async file-handle API for message logs in the server; same rule, different package | — |
| Refusal | `agent-collaboration/execution/task/` | Extend | Holds `TaskDelegationError` and shared task-execution pieces | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` memory store | line rule, repair, append guard, durable replace | DS-002, DS-003 | `RunMemoryFileStore` | Extend | — |
| server agent-memory | classification | DS-001 | inspector | Reuse | — |
| server agent-collaboration task | refusal | DS-001 | adapters | Extend | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no change after extraction).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| JSONL line rule ×3 | `jsonl-log-file.ts` | memory store | one policy | Yes | Yes | a general JSON utility for unrelated files |
| tmp+rename ×3 | `durable-file-replace.ts` | memory store | one durable write | Yes | Yes | a generic fs toolkit |
| refusal text ×3 | `task-execution-conversation-availability.ts` | server task | one wording | Yes | Yes | a catch-all error formatter |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `readJsonlRecords` result | Yes (`completeByteLength` = bytes to keep; `damagedEndByteLength` = bytes after it; `endsWithNewline` = whether the kept prefix ends in `\n`) | Yes | Low | — |
| `JsonlLogDamagedError` | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/jsonl-log-file.ts` (Add) | memory store | format owner | read rule, damaged-end cut, damage error | one rule | — |
| `autobyteus-ts/src/memory/store/durable-file-replace.ts` (Add) | memory store | writer helper | durable replace | one mechanism | — |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` (Modify) | memory store | `RunMemoryFileStore` | use repair on read-for-use; end check before first append (`add`, `recordSystemInstructionSupply`); durable replace | — | both |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` (Modify) | memory store | archive | segment read via `readJsonlRecords` (read-only); durable replace | — | both |
| `autobyteus-ts/src/memory/store/working-context-snapshot-store.ts` (Modify) | memory store | snapshot | durable replace | — | `durable-file-replace.ts` |
| `autobyteus-server-ts/src/agent-memory/services/agent-conversation-activity-inspector.ts` (Modify) | agent-memory | inspector | use `readJsonlRecords` | — | `jsonl-log-file.ts` |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-conversation-availability.ts` (Add) | task execution | refusal | message, code, warning | one concern | — |
| three adapters (Modify) | per root kind | adapters | ingress member address; call the refusal function | — | refusal |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-activation-planner.ts` (Modify) | collaboration backends | planner | `COLLABORATION_AGENT_CONTINUATION_STATE_UNREADABLE` message includes the inspector's reason | — | — |

## Applied Patterns (If Any)

None beyond plain functions.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/` | Folder | memory store | the two new files beside their users | store owns the files | run/team knowledge |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/` | Folder | task execution | refusal function | beside `TaskDelegationError` | adapter traversal |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/` | Persistence-Provider | Yes | Low | — |
| `agent-collaboration/execution/task/` | Main-Line Domain-Control | Yes | Low | — |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Byte-exact cut | `const bytes = fs.readFileSync(p); … fs.truncateSync(p, completeByteLength)` | `fs.writeFileSync(p, raw.slice(0, validBytes))` with `raw` a decoded string | The current defect |
| Edge zeros | `"\0\0\0{\"id\":\"a\"}\n"` → one record; `"{…}\n\0\0\0\n{…}\n"` → two records; `"…}\n\0\0\0"` → damaged end of 3 bytes | treating `\0\0\0{…}` as damage | Out-of-order writeback can put zeros before later valid data |
| Interior zeros | `"{\"id\":\"a\",\"content\":\"ab\0\0\0cd\"}\n{…}\n"` → `JsonlLogDamagedError` line 1; a zero run joining the end of record a and the start of record b (`"{\"id\":\"a\",\"c\":\"x\0\0\0\0y\",\"ts\":2}\n"`) → damaged line (damaged end if last, otherwise error) | dropping the zeros and accepting `"abcd"` or a spliced a+b object as a complete record | Interior zeros replaced real bytes; dropping them silently alters or splices records (AR-001) |
| Damaged end with newline | `"{…}\n{\"id\":\"b\",\"tr\n"` → last non-empty line is the damaged end | throwing because the torn line got a `\n` | Keeps today's rule (`index === lines.length - 2 && lines.at(-1) === ''`) |
| Complete record without `\n` | `"{…}\n{…}"` → two records; repair appends `\n` before the next append | gluing the next record to `{…}` | A record whose newline never landed is still complete |
| Refusal (Team) | "The delegated Team at '/marketing_team' cannot be restored: the saved conversation of its coordinator '/marketing_team/marketing_content_creator' cannot be read (line 120 of raw_traces_active.jsonl is damaged). Its files were left unchanged. Start a new delegation for this work, or restore that file from a backup." | "… is unavailable (indeterminate); it cannot be restored." | REQ-005 |
| Refusal (`none`) | "The delegated Agent at '/x' cannot be restored: it has no saved conversation to continue. Start a new delegation for this work." | — | REQ-005 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the strict inspector reader and add a separate "tolerant mode" flag | smallest diff | Rejected | one rule for all readers |
| A startup scan that repairs every log | fix all at once | Rejected | lazy repair on use (no history audit at startup; Data Migration Guideline §2 item 7) |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Add `jsonl-log-file.ts` and `durable-file-replace.ts` with unit tests (synthesized files: zero tail, zero head, zero-only line between records, torn tail with/without `\n`, non-ASCII content, mid-file damage, non-object line, complete last record without `\n`, interior zero run inside a record (mid-file → error; last line → damaged end), zero run spanning two records (same two cases), trailing whitespace/zero-only lines after the last record (cut, `completeByteLength` exact), empty file, missing file).
2. Switch `RunMemoryFileStore`, `RawTraceArchiveManager`, `WorkingContextSnapshotStore` to them; remove the old helpers; add the append end check (per file path per store instance); tests AC-003, AC-004, AC-007.
3. Switch the inspector to `readJsonlRecords`; tests AC-001, AC-002.
4. Add the refusal function; adapters return the ingress member address and call it; planner message gains the reason; tests AC-006.
5. Integration test AC-005 on a test-owned data root with the scripted AGY CLI (`agy-failure-cli.mjs`) or a native fake runtime: delegate a Team, shut it down, append zeros to the coordinator's active log, restart, continue.
6. Full reruns per TESTING.md (autobyteus-ts changed → rerun everything).

## Key Tradeoffs

- Lazy repair vs startup scan: lazy keeps startup independent of history; a damaged file stays until its run is used (harmless).
- No per-append sync: keeps append latency; accepts losing the last unflushed seconds of local traces (the provider keeps its conversation) — FU-001.
- Zero bytes treated as absent only on line edges and as whole lines: recovers out-of-order writeback without guessing; a line with interior zeros is reported, never repaired, because its record lost bytes (AR-001).

## Risks

- RSK-001 shared foundation: mitigated by focused tests and full reruns.
- A sealed archive segment with a damaged end is read tolerantly but never cut (sealed files are not rewritten); acceptable since segments are written durably from now on.

## Guidance For Implementation

- Work on `Buffer`s; never compute byte offsets from decoded strings.
- The end check before append: `fs.statSync` size 0 or last byte `0x0A` → append; otherwise `repairJsonlDamagedEnd`. Keep a per-instance `Set` of verified file paths; add a path only after its check succeeds.
- Warnings: never log record content.
- Keep `TASK_EXECUTION_CONTEXT_UNAVAILABLE`; keep `COLLABORATION_AGENT_CONTINUATION_STATE_UNREADABLE`.
- Tests use synthesized data only; never the user's files or copies (TESTING.md).
