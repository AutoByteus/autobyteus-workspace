# Requirements Document — Append-Only Message Logs

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `append-only-message-logs`
- Request / ticket: Project Task "Append-only message logs" (follow-up to Task 8641c0ac; decided by the user 2026-10-17)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-18
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: Solution Designer's messages to the user in this conversation, 2026-10-18 (SR-001 baseline; SR-002 refinement of REQ-001, REQ-004, AC-001, AC-004, DEC-002, DEC-007; SR-004 refinement of REQ-003, AC-003, DEC-008)
- Exact approved requirements baseline / solution revision: this document at SR-004
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- Problem: every new message re-reads, re-validates and rewrites its run's whole log file (each owner log). On the user's largest organization log (82 messages, 22 MB) one message writes 22 MB; a Project Task Manager hub kept for months or years pays a cost that keeps growing.
- Affected actors or systems: agents sending messages in standalone, team and organization runs and task agents; the user opening runs and restarting the app; the startup migration runner; the startup readiness scan.
- Desired outcome: appending a message costs the size of that message; logs are JSON Lines, appended and synced; rotated so no file grows without bound; existing logs migrate at startup with no message lost; everything that reads messages behaves as before.
- Observable definition of success: AC-001 (bytes written per append independent of log size on a 22 MB log), AC-004/AC-006 (complete history after migration), AC-008 (references and attachments resolve).

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Each owner log is read, parsed, fully validated and rewritten per message | The message is validated alone and appended as one line to each owner log, then synced | Receiver's log first, then the sender's, under the coordinating run's lock; once per log; fail-stop after a partial durable write | notes BEH-001, probe |
| BEH-002 | User | SCN-002 | Opening composes own + task agents' logs | Same composition over all of a log's files | Same list: each message once, `createdAt` order, loaded endpoints only | notes BEH-002 |
| BEH-003 | User | SCN-004 | References resolve via the composed list | Unchanged | Same resolution by `messageId` + `referenceId`; context-file / attachment links | notes BEH-003 |
| BEH-004 | Operational | SCN-003 | Readiness requires the JSON files by name | Readiness admits runs in the new layout | Same admission outcome for valid runs; invalid runs still reported | notes BEH-004 |
| BEH-005 | System | SCN-005 | Atomic replace; old or new file | An interrupted append leaves earlier messages intact; an unfinished last line is not shown and does not block the next append | Not-committed vs indeterminate outcomes and fail-stop | notes BEH-005 |
| BEH-006 | Operational | SCN-003, SCN-006 | Released migrations read/write JSON logs | Released migrations still complete on old data; the new migration converts all logs after them | No minimum upgrade-from version (8641c0ac REQ-017) | notes BEH-006 |
| BEH-007 | System | SCN-001 | A new task agent team gets an empty JSON log | It gets an empty log in the new layout | A log exists for every task agent team | notes BEH-007 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User (long-lived hub) | Keep one hub for years | Message cost does not grow with hub age | No visible change in behavior |
| Agents | Deliver messages | Delivery semantics unchanged | DEC-011 order, fail-stop |
| Startup migration runner | Bring old data to current | All logs converted, nothing lost, app always starts | Data Migration Guideline |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Persist a message to its owner logs (standalone, team, organization, task agent, task agent team) | SCN-001, SCN-005 |
| UC-002 | Read a run's message history (open, restart, restore, views, references) | SCN-002, SCN-004 |
| UC-003 | Rotate a log when it reaches its size limit | SCN-001 |
| UC-004 | Convert existing logs at startup, including upgrades with pending released migrations | SCN-003, SCN-006 |
| UC-005 | Admit runs at startup (readiness) in the new layout | SCN-003 |

### Out Of Scope

- Loading only part of a history on open, or a hub's task agents only when expanded (follow-up; Task e6985045 area). Opening still reads all of a run's messages.
- The startup readiness scan's cost of reading every team/organization log (recorded as a follow-up candidate).
- Wire/API/view shapes (`communication_messages` DTOs), tool contracts, runtime coordination, the per-run log model of 8641c0ac.
- Memory Sync behavior and the Memory page (they do not parse message logs).
- A Memory page view of detached task agents (separate follow-up).
- Other JSON files of a run package (trees, metadata, task records).

### Non-Goals

- Keeping logs readable by builds older than this change (DEC-003).
- Byte-identical formatting of migrated messages (values are identical; whitespace is not).

### Preserved Behavior Boundary

- BEH-001..BEH-007 "Intentionally Preserved" column; 8641c0ac DEC-011 (receiver first, then sender, under the coordinating lock), contract L6 (only loaded endpoints shown; a save never removes what it did not load), REQ-017 (no minimum upgrade-from version).
- Invariant: for every run, the composed message list after this change (migrated or new) equals the list the current code would produce from the same messages.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Persisting a message writes, per owner log, only that message's line (plus a bounded constant for rotation or tail repair); it never reads, re-validates or rewrites the messages already stored, on disk or in memory (the commit path validates only the new message). Applies to all owner logs of all three families and task agents. | BEH-001 | Must | The cost driver | User (Task) |
| REQ-002 | A message is reported delivered only after its line is synced in every owner log it belongs to, receiver's log first, then the sender's, under the coordinating run's lock; a message appears at most once per log; a failure before anything is durable cancels the message; a failure after a log became durable fail-stops the run as today. | BEH-001, BEH-005 | Must | Keep 8641c0ac semantics | User (Task); 8641c0ac DEC-011 |
| REQ-003 | Logs are JSON Lines: one message per line. Each log rotates by size: when its active file reaches a fixed size limit, the active file is sealed and a new one started. Appends and rotation never modify a sealed file, and every file they write stays within the limit plus one message. The only exception is a one-time startup repair by a released migration that converts message reference locators in place (DEC-008). | BEH-001 | Must | No file grows without bound | User (Task); DEC-002 |
| REQ-004 | Reading a run's history returns the same list as today (all files of each log, each message once, `createdAt` order, loaded endpoints only). A log's owner is the run whose folder holds it; log files carry no header or version field (DEC-007). | BEH-002 | Must | No visible change | Preserved |
| REQ-005 | An append interrupted by a crash or I/O failure never damages earlier messages. An unfinished final line (from a message never reported delivered) is ignored on read and does not stop later appends. Any other malformed content keeps today's strict outcome (the log is not read; files kept). | BEH-005 | Must | Append-only crash shape | DEC-004 |
| REQ-006 | At startup every existing JSON log (standalone hubs, team runs, organization runs, task agents, task agent teams) is converted to the new format with every message kept (same values, same order, none duplicated), rotated by the same rule; the JSON file is removed only after its conversion is verified; an interrupted conversion completes on a later start; a second start changes nothing; a log that cannot be converted is left intact and reported, and the app still starts. | BEH-006 | Must | Data continuity | User (Task); DEC-003 |
| REQ-007 | Upgrading from any earlier release works: released migrations that read or write JSON logs still complete correctly, and no JSON log they write is left unconverted or overrides newer messages. | BEH-006 | Must | No minimum upgrade-from version | 8641c0ac REQ-017; DEC-006 |
| REQ-008 | Message references (`messageId` + `referenceId`) and attachments (reference files, context-file links) resolve for migrated and new messages as before. | BEH-003 | Must | User (Task) | User (Task) |
| REQ-009 | Startup readiness admits runs whose logs are in the new layout, with today's outcomes for valid and invalid runs; new task agent teams get an empty log in the new layout. | BEH-004, BEH-007 | Must | Runs must open | Preserved |
| REQ-010 | No change to wire/API shapes, tool contracts, the in-memory message model or the per-run log model. | — | Must | Scope | Scope Guardrail |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | A synthesized organization run whose log mirrors the user's largest log (82 messages, ≈22 MB, messages up to ≈1 MB); one ≈120 KB message is sent | Bytes written to the log equal that message's line (± rotation/repair constant), the same as on an empty log; existing log content is not read; the commit path validates only the new message; time reported before (≈150 ms today) and after | — | Store-level measurement test + recorded measurement in the handoff |
| AC-002 | REQ-002 | BEH-001 / SCN-001, SCN-005 | Cross-run message (hub → task agent and back) in each family | Receiver's log written and synced before the sender's; each log holds the message once; a failure before the first durable write reports not delivered; a failure after the receiver's log is durable fail-stops the run | Retried append of the same message id does not duplicate | Store + coordinator tests per family |
| AC-003 | REQ-003 | SCN-001 | Appends cross the size limit | The active file is sealed and a new one started; every file ≤ limit + one message; sealed files' bytes unchanged by later appends and rotations; reading returns all messages in order | A message larger than the limit is stored whole | Store tests |
| AC-004 | REQ-004 | BEH-002 / SCN-002 | Runs of all three families with task agents, before and after conversion | The composed list (ids, values, order) is equal to the list the current code produces from the same JSON logs | — | Fixture comparison tests |
| AC-005 | REQ-005 | BEH-005 / SCN-005 | A log whose final line is incomplete | Reading returns all earlier messages; the next append succeeds and the log reads cleanly afterwards; a malformed non-final line makes the read fail as today | — | Store tests |
| AC-006 | REQ-006 | BEH-006 / SCN-003 | Startup with synthesized JSON logs covering every log kind (hub, agent task agent, team, task agent team, org, empty log, large rotated log) | Every message present once, same values and order; JSON removed after verification; interruption at each step then restart ends in the same state; second start writes nothing; an unreadable JSON log is left untouched with a warning and the app starts | — | Migration tests on faithful synthesized fixtures |
| AC-007 | REQ-007 | BEH-006 / SCN-006 | Upgrade with `20261017_task_agent_own_run_v1` (and earlier log-touching migrations) pending, including a retry after ours ran | All complete; every task agent's log holds every message it belongs to; no JSON log remains; no message lost or duplicated | — | Migration-order tests |
| AC-008 | REQ-008 | BEH-003 / SCN-004 | Migrated and new messages with reference files in each family | Reference content resolves by `messageId` + `referenceId`; context-file links still open | — | API/E2E |
| AC-009 | REQ-009, REQ-004, REQ-006 | BEH-004, BEH-007 / SCN-002, SCN-003 | Isolated desktop instance with a synthesized data package of released-format runs | Readiness admits them; old runs open with complete history; sending messages works; after restart history is complete; a new task agent team has an empty log | — | Real-app check (TESTING.md), never on the user's data |
| AC-010 | REQ-010 | — | Code review | No change to wire DTOs, tool contracts, in-memory model | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | An agent | Deliver a message | `send_message_to`, handoff, Task message | Run with a long history | message committed → owner logs updated → delivered | Durable at the cost of the message | Failure → not delivered or fail-stop | Supported Normal Scenario | Task; 8641c0ac DS-005 | REQ-001..003, AC-001..003 |
| SCN-002 | User | User | See a run's full history | Open run, restart, restore | Migrated or new logs | history composed and shown | Same history as before | — | Supported Normal Scenario | Task "still open with complete history" | REQ-004, AC-004, AC-009 |
| SCN-003 | Operational | Startup | Bring data current | App start after upgrade | JSON logs on disk | migration converts, readiness admits | All runs open | Unconvertible log → kept, reported | Supported Normal Scenario | Task; guideline | REQ-006, REQ-009, AC-006, AC-009 |
| SCN-004 | User | User | Open a referenced file of a message | Message reference link | Migrated or new message | resolve by ids → stream file | Same as before | Missing file → today's errors | Supported Normal Scenario | Task | REQ-008, AC-008 |
| SCN-005 | System | Crash / I/O failure | Survive interruption | Process killed or write fails during append | Any | restart → read → next append | Earlier messages intact; unfinished line ignored | — | Supported Explicit Edge Scenario (durability contract of the coordinators) | coordinators' fail-stop contract | REQ-002, REQ-005, AC-002, AC-005 |
| SCN-006 | Operational | Upgrade from an old release | Complete pending migrations in order | App start | Released migrations pending | predecessors on JSON → ours converts | Nothing lost | Predecessor retried after ours | Supported Explicit Edge Scenario | 8641c0ac REQ-017, DEC-017 | REQ-007, AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: N/A — not applicable
- Explicitly illustrative fixture content or permitted implementation variation: N/A — not applicable
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: N/A — not applicable
- Product decisions that need the user (with reasoning and recommendation): none

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-001 | Performance | Bytes written per append = message line + bounded constant, independent of existing log size (today 22.3 MB per message on the 22 MB profile) | All owner logs | Measurement test |
| QR-002 | REQ-002, REQ-005 | Reliability | Every reported delivery is synced; no crash point loses or corrupts an earlier message | Append, rotation, migration | Fault-injection tests |
| QR-003 | REQ-006 | Operability | Migration is a single read and write of each log (≈113 MB on the user's install), no lockout, rename/atomic per file | Startup | Migration tests on synthesized data (not data of real size; 8641c0ac QR-002 precedent) |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`
- Data or state that must be preserved: every message of every log (all seven fields' values), log membership, order, owner identity, `messageId` uniqueness per log, run ids (reference URLs).
- Loss, reset, rebuild, or regeneration that is acceptable: JSON whitespace/formatting; an incomplete final line of an append that was never reported delivered.
- Retention, privacy, compliance, volume, downtime, or operational constraints: ≈113 MB of logs on the user's install, largest 22 MB; startup must not be locked out.
- Unknowns requiring downstream investigation: exact released-migration import graph (design).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Data Migration Guideline | frozen source shapes, atomic per file, sources kept until targets verified, no lockout | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | read in full at design |
| TESTING.md | never run a migration or startup on real user data or a copy; synthesize | TESTING.md | — |
| RELEASE.md Rollback | newer data readable by the rolled-back build | RELEASE.md | DEC-003 |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/cost.mjs` | cost probe on synthesized data | AC-001 | Evidence | Not behavior-defining |
| `probes/profile.py` | read-only real-log profile | AC-001, QR-001 | Evidence | Not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | One writer per log at a time (the coordinating run's lock) | Plain appends need no cross-process locking | Design verifies every writer goes through the lock or the migration (before serving) | Open (design) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How is "measured on the user's 23 MB org log" verified? | TESTING.md forbids running on user data or a copy | (a) user's file; (b) synthesized log with its profile | The rule is absolute and the cost depends on size/shape, not content. The read-only profile (82 messages, 22 MB, up to 1 MB each) gives a faithful synthesized fixture; bytes written is deterministic, time is reported. **(b).** The user's own check after the beta covers the real data. | Solution Designer | Decided |
| DEC-002 | What triggers rotation? | Messages have no compaction boundary | size; message count; time | Size bounds files directly whatever the message sizes (1 KB…1 MB observed); count would not. Fixed size limit, several times the largest message. **Size; 4 MiB** (SR-002: largest observed message ≈1 MB; the 22 MB log becomes 6 files; a smaller active file is cheaper for Memory Sync, which copies changed files whole). | Solution Designer | Decided |
| DEC-003 | What happens to the JSON file after conversion, and to rollback? | Deletion; RELEASE.md rollback rule | keep a backup; keep both; remove after verification | Keeping both makes two authorities; a backup doubles ≈113 MB "just in case", which the guideline rejects without a reader. The Task names the raw-trace rotation migration as the pattern, which removes the old files after validating the new layout; 8641c0ac was one-way too. A rollback is a forward fix. **Remove after verified conversion; one-way.** | Solution Designer | Decided |
| DEC-004 | What does a reader do with an unfinished final line? | New crash shape | strict fail; ignore; repair | A final line can only be unfinished if its append never returned success, so the message was never reported delivered; ignoring it loses nothing reported. Same rule as raw traces. Other malformed lines stay strict (no guessing). **Ignore and repair before the next append.** | Solution Designer | Decided |
| DEC-005 | Does the duplicate check stay? | Today append skips a message whose id is in the log | drop; keep without reading the log | "Once per log" is a preserved invariant; reading the log to check would defeat REQ-001. **Keep the guarantee; mechanism in design.** | Solution Designer | Decided |
| DEC-006 | How do released migrations that write JSON logs coexist with the conversion? | Upgrades from old releases (REQ-017) | require predecessors done; repoint + order | 8641c0ac rejected global prerequisites (ARCH-F-006: one failure can hide everything). Requirement: they complete on JSON and nothing they write is left behind (REQ-007); mechanism in design. | Solution Designer | Decided |
| DEC-007 | Does a log file keep a header (version, owner id)? | Header + owner check today; JSON Lines has no envelope | header line; manifest; none | The Data Migration Guideline forbids schema version fields in new formats and says to recognize shapes by structure. The owner check guarded only against a file placed in another run's folder, which no product path produces (manual file manipulation). The folder already names the run. **No header; the owner is the folder's run** (SR-002). | Solution Designer | Decided |
| DEC-008 | May a sealed file ever be rewritten? | Locators-v1, a released migration that may still be pending on old installs, converts `referenceFiles` locators inside message logs (REQ-007, REQ-008); after conversion some of those messages are in sealed files | (a) the repair skips sealed files; (b) the repair moves converted messages to the active file; (c) a one-time atomic in-place rewrite at startup | (a) would leave locators unconverted (breaks REQ-007/008). (b) duplicates messages or rewrites history order and adds machinery. (c) is the released migration's own mechanism (atomic per-file rewrite, one writer, before serving), happens at most once per file, and only on installs where that migration is still pending. A converted locator can change a line's length, so a repaired sealed file may differ from the limit by the total length difference of its converted locators (a few bytes per reference). Memory Sync uploads such a file once more. **(c), as a bounded exception to sealed-file immutability** (SR-004, ARCH-F-005). | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | probes |
| REQ-002 | UC-001 | BEH-001, BEH-005 | AC-002 | SCN-001, SCN-005 | — |
| REQ-003 | UC-003 | BEH-001 | AC-003 | SCN-001 | — |
| REQ-004 | UC-002 | BEH-002 | AC-004, AC-009 | SCN-002 | — |
| REQ-005 | UC-001 | BEH-005 | AC-005 | SCN-005 | — |
| REQ-006 | UC-004 | BEH-006 | AC-006, AC-009 | SCN-003 | — |
| REQ-007 | UC-004 | BEH-006 | AC-007 | SCN-006 | — |
| REQ-008 | UC-002 | BEH-003 | AC-008 | SCN-004 | — |
| REQ-009 | UC-005, UC-001 | BEH-004, BEH-007 | AC-009 | SCN-002, SCN-003 | — |
| REQ-010 | all | — | AC-010 | — | — |

## Architecture Phase Input

- Approved scenario IDs and paths: SCN-001..SCN-006.
- Constraints: DEC-011 order and lock; fail-stop outcomes; L6; REQ-017; Data Migration Guideline; TESTING.md user-data rule.
- Decisions deferred to design: file names and layout, header/owner identity location, manifest or not, size limit value, duplicate-guard mechanism, append outcome contract, torn-tail repair, rotation commit, migration steps and dispositions, released-migration repoints and ordering.
- Technical facts to verify: every writer path holds the coordinating lock; released-migration import graph; readiness file names; Memory Sync excludes in-progress files.
- Known risks: R-001 (predecessor retry after ours), R-003 (startup readiness reads all logs; out of scope).

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
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed 2026-10-18)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
