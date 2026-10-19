# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `unclean-shutdown-delegated-run-restore`
- Request / ticket: Project Task `project_task_08d76577-e89b-484d-9f38-cc1ed94ef95e` — "URGENT investigation: after a sudden computer shutdown, a delegated Team run on the Docker node cannot continue ('its saved conversation is unavailable (indeterminate)'); find the cause, find out whether data was lost, and fix it" (reported by the user 2026-10-19).
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on behalf of the user.
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's result message to the user/Project Task Manager of 2026-10-19 (handoff file `handoff-architecture-design-complete.md` in this folder). The requirements stay inside the Task's direction ("an unclean shutdown cannot make a run unrestorable, or the restore degrades gracefully with a clear message", "a truncated last line is dropped and logged", "a real refusal should tell the user what is wrong and what he can do"). The one decision that needs the user, DEC-008 (repairing his real node data now), is an operational action outside this requirements basis and is asked separately.
- Exact approved requirements baseline / solution revision: this document at `SR-002` (SR-001 approved within the direction; SR-002 narrows REQ-001/DEC-004 to zero bytes on line edges after architecture review AR-001, also approved by the Solution Designer within the direction and the user informed in the SR-002 result. The change makes the approved tolerance safer; no acceptance criterion changes).
- Behavior-defining supplements and their approved versions: None.

## Problem And Desired Outcome

- Problem: After the host computer lost power at about 13:20 UTC on 2026-10-19, the user's Docker node (`autobyteus-server-0`) restarted with one damaged file: the coordinator's raw-trace log of the delegated Team `marketing_team_0bdbbad7…`, `marketing_content_creator_59ff6d5e…/raw_traces_active.jsonl`. Its last 1,241 bytes are zero bytes (the file size reached the disk, the data did not). The check that decides whether a shut-down delegated run may be restored reads that file strictly; one unparseable line makes it answer `indeterminate`, and the restore is refused with "The delegated Team at '/marketing_team' is shut down and its saved conversation is unavailable (indeterminate); it cannot be restored." The rest of the conversation (243 complete records, the work journal, the message logs, the team tree, the runtime's own conversation database) is intact. Investigation also found that the store's existing "cut off a broken last line" repair cuts at the wrong position when the file contains non-ASCII text, leaves part of the damage in place, and then silently deletes every record appended after it on the next read.
- Affected actors or systems: the user continuing a delegated Agent/Team run (or any standalone, team-member or AgentOrg run) after an unclean shutdown, on a Docker node or the desktop's embedded server; the run-restore check; the raw-trace store shared by all runtimes.
- Desired outcome: an unclean shutdown cannot make a run unrestorable through a damaged end of its raw-trace log. The damaged end is removed exactly at the last complete record and logged; the run continues; nothing written afterwards is lost. When a run really cannot be restored, the user is told what is wrong and what he can do.
- Observable definition of success: with a synthesized run whose raw-trace log ends in a torn line or in zero bytes, "continue" restores the run, the log afterwards holds every complete earlier record plus the new ones, and the server log names the file and the number of bytes dropped. With real damage in the middle of the log, the refusal names the run, the file and the line and gives a next step instead of "(indeterminate)".

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | The conversation-activity check (`AgentConversationActivityInspector`) parses every line of `raw_traces_active.jsonl` strictly; any unparseable line, including a torn or zero-filled final line, yields `indeterminate`, and every caller refuses the restore. | A torn or zero-filled end of the log is ignored by the check (read-only); the run is classified from its complete records (`present` when it has a user or assistant record). | `none` still requires the whole log to be readable; `present` for intact logs; the check stays read-only. | IN-SRC-03, IN-PRB-01 |
| BEH-002 | System | SCN-001, SCN-003 | The store's read repair (`RunMemoryFileStore` `readJsonl`) counts valid bytes but cuts the text by characters; with non-ASCII content it keeps part of the damaged end (probe: 603 of 1,241 zero bytes kept; a torn `{"id` fragment kept). | The repair removes exactly the bytes after the last complete record, whatever the content, and logs file and bytes removed. | Complete earlier records are never changed or reordered. | IN-SRC-04, IN-PRB-01, IN-PRB-02 |
| BEH-003 | System | SCN-003 | An append after a damaged end glues the new record onto the damage (`fs.appendFileSync` without checking the end); the next read treats that line as the torn end and deletes it. Every later append is lost the same way. | An append never joins a damaged end: the damaged end is removed first, and the new record is a complete line of its own. | Append order and record format unchanged. | IN-PRB-02 |
| BEH-004 | System | SCN-002 | The refusal says only "is shut down and its saved conversation is unavailable (indeterminate); it cannot be restored." | A refusal names the delegated Agent/Team, which member's saved conversation is affected, what is wrong in plain words (e.g. "line 120 of its conversation log is damaged"), and what the user can do. | The error code `TASK_EXECUTION_CONTEXT_UNAVAILABLE` and the refusal itself for genuinely unreadable runs. | IN-SRC-02 |
| BEH-005 | System | SCN-004 | The store's whole-file writes (active-log rewrite at rotation/compaction, archive segments, archive manifest, working-context snapshot) write a temporary file and rename it without forcing it to disk; after a power loss the renamed file can be empty or zero-filled. | These writes reach the disk before they replace the old file, so a power loss leaves either the old or the new complete file. | File names, formats and the tmp-then-rename order. | IN-SRC-05 |
| BEH-006 | System | SCN-001 | Message logs (`*_communication_messages_active.jsonl`) sync each append and ignore/cut an unfinished last line; JSON package files use the synced commit writer. | Unchanged. | Entirely preserved. | IN-SRC-06, IN-DAT-02 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| The user | Continue his delegated Team's work after the machine lost power | He can continue; he knows what (if anything) was lost | His real data changes only with his approval and after a backup |
| Project Task Manager | Track the Task | A clear answer to "is data lost, can I continue" and a shipped fix | — |
| Every runtime (native, AGY, Codex, Claude) | Record its run in the raw-trace log | Appends after a crash are never lost | No measurable slowdown of appends |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Continue (restore) a shut-down run whose raw-trace log has a damaged end after an unclean shutdown: delegated Agent/Team of a standalone root, a team root or an AgentOrg, and a team member's own activation. | SCN-001 |
| UC-002 | Be told clearly why a run cannot be restored when its saved conversation really is unreadable. | SCN-002 |
| UC-003 | Keep recording a run after its log's damaged end was repaired (no record lost). | SCN-003 |
| UC-004 | Survive a power loss during the raw-trace store's whole-file writes. | SCN-004 |

### Out Of Scope

- Syncing every raw-trace append to disk (a per-append fsync). Recovery of the damaged end makes a run restorable without it; the cost/benefit is recorded as a follow-up (DEC-007).
- The server's display readers (`memory-file-store.ts` `readJsonl`, `readRawTracesActiveSnapshot`) that already skip malformed lines for display; they keep their behavior.
- Message logs, run package JSON files, the team/collaboration trees, the AGY/Codex/Claude runtimes' own conversation stores, memory sync between nodes and the desktop.
- Repairing the user's real node data (DEC-008): an operational action with his approval, not part of the code change.
- Work journal rendering (it is derived from the raw-trace log and catches up by itself).

### Non-Goals

- Recovering records whose bytes never reached the disk (the zero-filled region holds no data).
- Repairing damage in the middle of a log that a shutdown cannot produce (it stays a clear refusal).

### Preserved Behavior Boundary

- BEH-006 entirely; the preserved columns of BEH-001…BEH-005.
- Every caller of the conversation-activity check keeps its decision table (`present` → restore, `none` → new/replace, `indeterminate` → refuse).
- An intact log reads, classifies and appends exactly as today.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Reading a raw-trace log (active file or archive segment) treats as absent: an incomplete final line, lines made only of zero bytes (`0x00`) and whitespace, and zero bytes at the start or end of a line. Every complete record is returned unchanged. A line that still contains a zero byte between other bytes is never a complete record: when it is the last non-empty line it is the damaged end; otherwise it, like any other unparseable line, is reported with the file and line number. | BEH-001, BEH-002 | Must | A shutdown leaves zero runs and a torn end; zeros inside a line mean bytes of that line are missing, so it cannot be trusted as a record. | DEC-001, DEC-004 |
| REQ-002 | The conversation-activity check classifies a run from what REQ-001 reads, without changing any file: `present` when a complete user or assistant record exists; `none` only when the logs are fully readable and hold none; `indeterminate` (with the REQ-001 reason) when a log has damage other than an incomplete end. | BEH-001 | Must | Removes the false refusal while keeping `none` safe. | DEC-001, DEC-005 |
| REQ-003 | When the store opens the active log for use, it removes exactly the bytes after the last complete record (byte-exact, independent of character encoding) and logs a warning naming the file and the number of bytes removed. | BEH-002 | Must | The Task's "a truncated last line is dropped and logged". | DEC-002 |
| REQ-004 | An append to the active log never joins a damaged end: the damaged end is removed first (REQ-003), and each appended record is a complete line. | BEH-003 | Must | Prevents silent loss of new records. | DEC-003 |
| REQ-005 | A restore refused because a saved conversation cannot be read says which delegated Agent/Team and which member's conversation is affected, what is wrong in plain words, and what the user can do. The word "indeterminate" alone is not the explanation. | BEH-004 | Must | The Task's "a real refusal should tell the user what is wrong and what he can do". | DEC-006 |
| REQ-006 | The raw-trace store's whole-file replacements are on disk before they replace the previous file. | BEH-005 | Should | A power loss during a rewrite must not empty the whole log. | DEC-007 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001, SCN-001 | Synthesized run log: complete records with non-ASCII text (user + assistant), then 1,241 zero bytes, no final newline | The check returns `present`; the file is unchanged byte for byte | Same with a torn final JSON fragment instead of zeros | Unit test (server inspector) |
| AC-002 | REQ-002 | BEH-001 | Log with no user/assistant record and a damaged end | `none`, since the readable records are complete and the damaged end is absent | A log with a damaged line before its last non-empty line (e.g. a zero run inside a record, or a zero run joining two records) → `indeterminate` with file and line | Unit test |
| AC-003 | REQ-003 | BEH-002, SCN-001 | Same synthesized logs (zero tail; torn fragment) opened by the store | File afterwards ends exactly after the last complete record (byte length equals the valid prefix); a warning names the file and the bytes removed | An intact file is not rewritten and no warning is logged | Unit test (autobyteus-ts store) |
| AC-004 | REQ-004 | BEH-003, SCN-003 | Damaged end, then an append without any prior read; then a fresh read | The new record is returned by the next read together with all earlier complete records; the file contains no zero bytes | Several appends in a row: all present | Unit tests (store `add` and `ExternalRuntimeMemoryWriter`) |
| AC-005 | REQ-001…REQ-004 | SCN-001 | Delegated Team whose coordinator's log has a zero-filled end, restored after a server restart (isolated server, synthesized data, scripted runtime) | "continue" is accepted; the member answers; the log holds the earlier records plus the new turn | — | Server integration/E2E on a test-owned data root |
| AC-006 | REQ-005 | BEH-004, SCN-002 | Delegated Team whose coordinator's log is damaged mid-file | Refusal with code `TASK_EXECUTION_CONTEXT_UNAVAILABLE`; its message names the Team address, the coordinator member, the damaged line and a next step | Same for a delegated Agent and for the AgentOrg/standalone adapters | Unit tests of the three adapters |
| AC-007 | REQ-006 | BEH-005, SCN-004 | Store rewrites (archive, rotation, snapshot) | The temporary file is synced before rename (observable through an injected/spied file operation) | — | Unit test |
| AC-008 | Preserved | BEH-006 | Existing suites | Server `test:unit`, `typecheck`, `autobyteus-ts` memory tests stay green | — | Test runs |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | The user | Continue a delegated Team after the machine lost power | Typing in the member's chat ("continue") | Host lost power while the member was working; node restarted | Open the run → send a message → the run restores → the member continues | The run restores; the damaged end is dropped and logged | — | Supported Normal Scenario (power loss and Docker/host crashes are ordinary; the user hit it) | User report 2026-10-19; IN-DAT-01 | REQ-001…REQ-004, AC-001, AC-003, AC-005 |
| SCN-002 | User | The user | Understand why a run cannot be restored | Same entry | A saved conversation is really unreadable | Send a message → refusal | Message names run, member, problem and next step | — | Supported Explicit Edge Scenario (Task direction requires the clear refusal) | Task text | REQ-005, AC-006 |
| SCN-003 | System | Runtime recording a restored run | Keep every new record | Runtime events after restore | Damaged end not yet removed by a read | Append → read | Every new record is kept | — | Supported Normal Scenario (follows SCN-001) | IN-PRB-02 | REQ-004, AC-004 |
| SCN-004 | System | Store rewrite during archive/compaction | Power loss during a rewrite | Compaction/rotation | Rewrite in flight | Crash → restart → read | Old or new complete file | — | Supported Explicit Edge Scenario | IN-SRC-05 | REQ-006, AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (only the server's error text changes; it is shown in the existing error card).
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: N/A — not applicable
- Explicitly illustrative fixture content or permitted implementation variation: N/A — not applicable
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: N/A — not applicable
- Product decisions that need the user (with reasoning and recommendation): None.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004 | Performance | The append path adds no per-append fsync and at most one tail check per store instance or per append of a few bytes read | All runtimes | Code review |
| QR-002 | REQ-003 | Operability | Every repair logs one warning with file path and bytes removed | — | Unit test asserts the warning |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`
- Data or state that must be preserved: every complete raw-trace record; archive segments; message logs; work journals; trees.
- Loss, reset, rebuild, or regeneration that is acceptable: removal of the damaged end (bytes after the last complete record), which holds no recoverable record.
- Retention, privacy, compliance, volume, downtime, or operational constraints: no migration and no startup conversion; repair happens lazily when a run's log is opened for use. The user's real data is not touched by tests (TESTING.md).
- Unknowns requiring downstream investigation: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Linux ext4 (Docker Desktop VM `/dev/vda1`), macOS APFS | After power loss, an appended file can have its new size without its data (zero-filled end) | IN-DAT-01 | Mid-file zero regions are possible with out-of-order writeback; REQ-001 drops them only where they cut no record (whole lines, line edges) and reports a line with interior zeros |
| `JSON.stringify` | Never writes a raw `0x00`; it escapes U+0000 as `\u0000` | ECMAScript JSON serialization | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Restoring an AGY member uses its runtime conversation (`platformAgentRunId`) and needs nothing from the dropped records | Answers "can I continue" | IN-DAT-03 shows the runtime DB has the last step; AC-005 proves the restore path end to end | Supported by evidence |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How should the check classify a log with a damaged end? | It decides restore vs refusal | (a) strict as today; (b) tolerant end, strict elsewhere; (c) skip every bad line | A damaged end is the normal shape of a crash and holds no record; (b) agrees with the store's own repair, while (c) would hide real corruption. Choose (b). | Solution Designer | Decided |
| DEC-002 | When is the damaged end removed, and is it logged? | Data change on disk | At store open for use (existing behavior) vs at startup over all runs | Keep the existing lazy repair (no startup scan, no migration), make it byte-exact and log it. | Solution Designer | Decided |
| DEC-003 | How are appends protected? | Silent loss of new records (IN-PRB-02) | Check the end before the first append of a store instance; or before each append | Check before appending (cheap: read the last bytes) so no path depends on a prior read. Exact shape is a design detail. | Solution Designer | Decided |
| DEC-004 | What about zero bytes inside the file? | Out-of-order writeback can leave zero regions before later valid records | (a) all damage; (b) absent anywhere; (c) absent only on line edges | Raw zero bytes are never part of a serialized record. A zero run on a line's edge or forming a whole line removes nothing from any record, so dropping it is safe and keeps later records. A zero run inside a line replaced real bytes of that line (or joined two records): dropping it would yield a shortened or spliced "record" (architecture review AR-001, MP-001). Choose (c). Revised in SR-002. | Solution Designer | Decided |
| DEC-005 | Should mid-file damage still refuse? | Safety of `none` and of restoring | Refuse with a clear reason vs restore anyway | The store would refuse that file when the run starts; refusing up front with a clear reason is honest. Keep refusing, explained (REQ-005). | Solution Designer | Decided |
| DEC-006 | What does the refusal say? | User-visible text | — | Name the Agent/Team and member, the problem in plain words, and the next step: start a new delegation for the work, or have the damaged file repaired from a backup. The Task asks for exactly this. | Solution Designer | Decided |
| DEC-007 | Sync each append to disk? Sync whole-file rewrites? | Durability vs append latency | Message logs already sync per append; raw traces are written per tool call/result/message | Per-append sync is not needed for restorability once the end is recovered and would add latency on every event; leave it as a follow-up. Whole-file rewrites are rare and losing one can empty the whole log, so sync them (REQ-006). | Solution Designer | Decided |
| DEC-008 | Repair the user's real node file now (backup, then cut the file at the last complete record, byte 359,207), or wait for the fixed beta, which removes the damaged end by itself? | Changes his real data; hard to undo without a backup | Evidence: the bytes after 359,207 are all zero (IN-DAT-01); cutting them makes the current beta restore the run | Recommend repairing now, after a backup of the file, so he can continue today; the fixed beta prevents this in future. Needs his explicit approval (TESTING.md data rule; Task constraint). Not part of the code change. **Approved by the user in conversation on 2026-10-19 ("The repair: cut the file at byte 359,207, right after the last complete entry. In general i think you did correctly"); done the same day — see investigation notes, User Data Repair.** | User | Decided (user) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-002 | AC-001, AC-002 | SCN-001 | — |
| REQ-002 | UC-001, UC-002 | BEH-001 | AC-001, AC-002 | SCN-001, SCN-002 | — |
| REQ-003 | UC-001 | BEH-002 | AC-003 | SCN-001 | — |
| REQ-004 | UC-003 | BEH-003 | AC-004, AC-005 | SCN-003 | — |
| REQ-005 | UC-002 | BEH-004 | AC-006 | SCN-002 | — |
| REQ-006 | UC-004 | BEH-005 | AC-007 | SCN-004 | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001…SCN-004.
- Product and system constraints architecture must preserve: BEH-006; caller decision tables; no migration; read-only check.
- Decisions intentionally deferred to architecture design: where the one shared line-reading rule lives; the exact append guard; how the refusal learns the member and reason.
- Technical facts architecture should verify: all readers of raw-trace logs in the restore path; the three adapters' refusal code; whether the activation planner's refusal text also needs the reason.
- Known feasibility or integration risks: `autobyteus-ts` is a shared foundation (TESTING.md: rerun everything when it changes).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None.

### Approved Basis Ready For Design

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None (DEC-008 is operational and does not block design or implementation).
