# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction; the founder was informed in this conversation on 2026-11-21.
- Behavior-defining supplements: none.
- User approval of the design: `Not required` (the Task does not ask for it).
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-handover-journal-read-583/tickets/in-progress/runtime-handover-journal-read/investigation-notes.md`
- Authorities read (2026-11-21): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root; no closer `DESIGN*.md` for `autobyteus-server-ts`), `GLOSSARY.md` (Work Journal entries), `docs/design-cases.md` (format, cases 17–24).
- Project design-principle conflicts or discrepancies: none.

## Current-State Read

On the first input after a switch, `RuntimeHandoverNoticeService.takePreface` makes the journal current, lists its files and passes them to the pure `buildRuntimeHandoverNoticeText` (`runtime-handover-notice-service.ts:62-67`). The builder takes the last listed file as "the latest one … a good place to start" (`runtime-handover-notice-builder.ts:29-33`).

The journal has one file per raw-trace file (`work-journal-service.ts:205-215`). A switch archives the previous agent's records as a segment, and the active raw file becomes `[marker, candidate records]` (`run-memory-file-store.ts:276-320`; contract §3.3 table). The notice is pending only until a `user` record follows the marker (`runtime-handover-reader.ts:16-33`). So the open journal file named by the notice always holds only the `Notice:` line, while the previous agent's work is in the newest closed file (PRB-001 A, B, C).

The owners are sound:
- the journal service owns per-file facts;
- the builder owns the wording;
- the notice service connects them.

The defect is a wrong premise in the builder ("the last file holds the most recent work"), plus the missing per-file fact needed to choose the right file.

## Task Size And Architectural Risk (Mandatory)

- **Task size:** `Small`.
- **Size rationale:**
  - Source changes: one pure builder, one added field on one summary type and its one computation in `listJournalFiles`.
  - Tests: four existing test files changed, one new journal-backed test.
  - Docs: one module doc sentence, one glossary line and one design case.
  - All of it sits in two existing folders, `runtime-handover-notices` and `agent-work-journal`.
- **Architectural risk:** `Low`.
- **Risk rationale:**
  - No persistence, API, GraphQL, lifecycle, concurrency, security or deployment change.
  - The agent-facing text is the ticket's approved change. No code parses it except tests: MS-01 checks only its first line and order.
  - The summary type gains one field. Its other reader, the GraphQL view (`work-journal-view.ts:84-87`), maps fields explicitly, so the field is not exposed.
- **Escalation trigger:** if a runtime's candidate records turn out to be rendered into a closed file of the new era, or if the journal manifest must change, return a `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| PRB-001 | `probes/handover-transition.probe.test.ts`, `.log` | Open file = 5 lines, one `Notice:`; work in `work_journal_000001.md`; double switch leaves a notice-only `000002` | Choose the newest closed file with work entries | — |
| PRB-002 | investigation notes | Previous-era journals 32–3,001 lines, ≤ 393 KB | Complete read, in parts, no cap | Model compliance (RSK-001) |
| Code | `work-journal-service.ts:99-116` | `listJournalFiles` already parses each file with `readJournalEntries` | Compute the count there; no extra read | — |
| Code | `journal-entry-reader.ts:52-58` | Entry kinds; the marker is a `notice` | "Work entry" = kind ≠ `notice` | — |
| Contract | §3.3 table, I-7 | The new era's file never holds a previous-agent record | Only closed files are candidates | — |
| Code | `work-journal-view.ts:84-87` | Explicit field mapping | Added field stays internal | — |

## Intended Change

The journal summary gains a per-file count of work entries. The builder names the newest closed file that has work entries as the previous agent's most recent work, and tells the agent to read it completely before replying or continuing. It says the open file starts with this hand-over, and keeps the full file list.

## Change Scope (Mandatory)

- **In scope:**
  - UC-001;
  - the hand-over notice text (`runtime-handover-notices`);
  - the journal file summary (`agent-work-journal`);
  - their tests, the run-history module doc, `GLOSSARY.md` and `docs/design-cases.md`.
- **Derived consumers of `WorkJournalFileSummary`:**
  - `RuntimeHandoverNoticeService`/builder: uses the new field.
  - `readWorkJournalView` (GraphQL): unchanged; it maps fields explicitly and does not expose the new one.
  - `work-journal-reading.test.ts`: updated to the new shape.
- **Deliberately left alone:**
  - switch rotation and the marker (§3.3);
  - pending derivation and delivery (§3.6, I-11);
  - journal rendering and its format;
  - the chat marker line;
  - the archived contract file, a finalized document that is not edited;
  - other platform notices.
- **Follow-ups:** none.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, REQ-003; AC-001, AC-006 | First input after a switch (§3.6) | Points to the open file (PRB-001 A) | Names the newest closed file with work; the open file "starts with this hand-over" | DS-001 |
| BEH-002 | Contract | REQ-002, REQ-006; AC-001, AC-003, AC-005 | same | No instruction | Read completely, first line to last, in parts if long, before replying or continuing | DS-001 |
| BEH-003 | Contract | REQ-001; AC-002 | Second switch before input | Notice-only closed file (PRB-001 B) | Skipped (work entries = 0) | DS-001, DS-002 |
| BEH-004 | Contract | REQ-004; AC-003 | same | List oldest first | Preserved | DS-001 |
| BEH-005 | Contract | REQ-005; AC-004 | Switch before any work | Only the open file | No instruction | DS-001 |
| BEH-006 | System | REQ-006; AC-003, AC-006 | §3.6 delivery | Once, first, own sender | Preserved (service untouched in behavior) | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/handover-transition.probe.test.ts` (+ `.log`) | Reproduction | REQ-001–003, AC-001, AC-002 | Implementation starts from it; its cases A and B become the journal-backed test | Evidence |

## Task Design Health Assessment (Mandatory)

- **Change posture:** `Bug Fix` with an approved `Behavior Change` to the wording rule.
- **Current design issue found:** `Yes`. The builder decides "the most recent work" by position: the last file. That stopped being true when switches began opening a file that holds only the marker.
- **Structural triggers:**
  - **Derived data** fires: a new per-file fact. Response: one owner derives it. `listJournalFiles` computes it from the entries it already parses, and the builder reads it without recomputing.
  - **Behavior by absence** was checked. The start file is chosen by an explicit rule ("closed and has work entries"), and the no-start case has its own text (REQ-005). No behavior hangs on a missing lookup.
  - **Vocabulary drift** was checked. "Work entry" is a new word, defined once in `GLOSSARY.md` (Terminology below).
  - **Empty indirection** does not fire: no interface, port or wrapper is added.
  - **Several kinds or forms** does not fire. The notice service is one path for every runtime and for standalone, Team, Org and delegated runs (one platform notice source, `docs/modules/run_history.md:223`), and the rule does not depend on the runtime.
- **Deliberate deviations:** none.
- **Root cause classification:** `Missing Invariant`. The owner is right, but it does not enforce "point to where the previous agent's work is".
- **Refactor needed now:** `No`.
- **Evidence:** the builder is pure and small (50 lines). The service already obtains the facts and the reader already classifies entries.
- **Design response:** add one fact, and use one rule in the builder.
- **Refactor rationale:** the existing boundaries absorb the change.
- **Intentional deferrals and residual risk:** RSK-001 (model compliance), verified by AC-005.

## Terminology

- **Work entry:** a journal entry that is not a notice: a request, reply, action or note (`JournalEntryKind`). Added to `GLOSSARY.md` under Work Journal.
- **Previous agent's latest journal:** the newest closed journal file with at least one work entry.

## Legacy Removal Policy (Mandatory)

- **Obsolete paths in this scope:**
  - the builder's "latest = last file" sentence and the "if you want to look further back" phrasing for the file that holds the work;
  - the builder-test assertions of the old sentence and the `you must|you should` prohibition, which are stale against REQ-002.
- **Compatibility wrappers, dual paths or fallbacks kept:** `None`.

## Persisted Data / State Transition Decision

- **Decision:** `Not Affected`. The summary lives in memory, built per call from the journal files. The manifest, journal files and raw traces are unchanged, and the renderer revision is unchanged.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001…006 | The user's first message after a switch | The agent receives the notice before the user's text | `RuntimeHandoverNoticeService` | Where the notice is built and delivered |
| DS-002 | Bounded Local | BEH-003 | `listJournalFiles` reads a file | Summary with `workEntryCount` | `WorkJournalService` | The one place the fact is derived |

## Primary Execution Spine(s)

DS-001: `User message → AgentRunPlatformNotices (notice slot) → RuntimeHandoverNoticeService.takePreface → WorkJournalService.ensureCurrent → WorkJournalService.listJournalFiles → buildRuntimeHandoverNoticeText → preface before the user's text → agent runtime`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Unchanged up to the builder. The builder now picks the previous agent's latest journal from the summaries and writes the read instruction around it. | notice slot, hand-over notice service, journal service, notice builder | `RuntimeHandoverNoticeService` | none |
| DS-002 | For each manifest file: read, parse entries, then count the entries whose kind is not `notice` | journal service, entry reader | `WorkJournalService` | — |

## Spine Actors / Main-Line Nodes

The notice slot, `RuntimeHandoverNoticeService`, `WorkJournalService` and `buildRuntimeHandoverNoticeText`.

## Ownership Map

- `WorkJournalService` owns the journal files and every fact about them, including the new `workEntryCount`.
- `buildRuntimeHandoverNoticeText` owns the notice wording and the choice of the file it names, from the facts it is given. It stays pure.
- `RuntimeHandoverNoticeService` owns the sequence and delivery. Its code is unchanged; only its test fixture gains the field.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| Builder sentence "The latest one, <last file>, shows what was done most recently, so it is a good place to start." and "if you want to look further back" for the whole list | Wrong premise (PRB-001) | The new text below, in the same builder | — |
| Builder test assertions of the old sentence and of `/you must|you should|please continue|last request/i` | Stale against REQ-002 | New assertions; keep "names no runtime or model" and "does not repeat the request" (`/please continue|last request/i`) | ticket-scope: stale tests are rewritten |

## Return Or Event Spine(s) (If Applicable)

N/A: the existing settle rules are unchanged.

## Bounded Local / Internal Spines (If Applicable)

DS-002, inside `WorkJournalService.listJournalFiles`: `manifest file → readJournalFile → readJournalEntries → count entries with kind ≠ notice → summary`.

## Off-Spine Concerns Around The Spine

None added.

## Ownership Boundaries

The builder receives facts only and never reads files. The journal service is the only reader of journal files (its existing rule, `work-journal-service.ts:52-58`).

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `WorkJournalService.listJournalFiles` | `readJournalEntries`, the store | `RuntimeHandoverNoticeService` | The builder or service parsing journal files or calling `readJournalEntries` itself | The summary field (this design) |

## Dependency Rules

- The builder may import only the summary type. The service keeps `Pick<WorkJournalService, "ensureCurrent" | "listJournalFiles">`.
- No new collaborator, binding or singleton: `None`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `WorkJournalFileSummary.workEntryCount: number` | one journal file | Number of entries in the file whose kind is not `notice` | — | Added field; required, not optional |
| `buildRuntimeHandoverNoticeText(facts)` | the hand-over notice | Text from `{journalFolder, files}` | — | Signature unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `workEntryCount` | Yes | Yes | Low | — |
| `buildRuntimeHandoverNoticeText` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Count of non-notice entries | `workEntryCount` | Yes | Yes, after the glossary line | Low | Add "Work entry" to `GLOSSARY.md` |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Per-file entry classification | `journal-entry-reader.ts` | Reuse | Already the one parser of the format | — |
| Per-file facts | `WorkJournalService.listJournalFiles` | Extend | Already parses every file | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-work-journal` | `workEntryCount` | DS-002 | notice service | Extend | — |
| `runtime-handover-notices` | wording, file choice | DS-001 | — | Extend | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction needed).

## Reusable Owned Structures Check

No repeated structure. `WorkJournalFileSummary` stays the one summary.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `WorkJournalFileSummary` | Yes. `lineCount` counts lines and `workEntryCount` counts non-notice entries | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Change |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-work-journal/domain/work-journal-models.ts` | agent-work-journal | types | Add `workEntryCount: number` to `WorkJournalFileSummary`, with a doc comment | Modify |
| `autobyteus-server-ts/src/agent-work-journal/services/work-journal-service.ts` | agent-work-journal | `WorkJournalService` | `listJournalFiles` sets `workEntryCount: reading.entries.filter((entry) => entry.kind !== "notice").length` | Modify |
| `autobyteus-server-ts/src/runtime-handover-notices/services/runtime-handover-notice-builder.ts` | runtime-handover-notices | builder | New file choice and text (below); update the doc comment (§3.6 wording rule replaced by autobyteus-583) | Modify |
| `autobyteus-server-ts/tests/unit/runtime-handover-notices/runtime-handover-notice-builder.test.ts` | tests | — | Rewrite to AC-001…AC-004 | Modify |
| `autobyteus-server-ts/tests/unit/runtime-handover-notices/runtime-handover-notice-service.test.ts` | tests | — | Fixture gains `workEntryCount` | Modify |
| `autobyteus-server-ts/tests/unit/runtime-handover-notices/runtime-handover-notice-transition.test.ts` | tests | — | New: real `RuntimeSwitchRecorder` + `WorkJournalService` + `readPendingRuntimeHandover` + `RuntimeHandoverNoticeService` on synthetic folders (probe cases A and B, plus a switch before any work) | Add |
| `autobyteus-server-ts/tests/agent-work-journal/services/work-journal-reading.test.ts` | tests | — | Expect `workEntryCount` | Modify |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-members-built-server.e2e.test.ts` | tests | — | MS-01: the echoed notice names the segment's journal file (`work_journal_<index>.md`, from the archived segment's index) and contains `completely` | Modify |
| `autobyteus-server-ts/docs/modules/run_history.md` | docs | — | One sentence in the hand-over bullet (223-227): the notice names the newest closed journal file with work entries and asks for a complete read before replying | Modify |
| `GLOSSARY.md` | docs | — | "Work entry" line under Work Journal | Modify |
| `docs/design-cases.md` | docs | — | Case 25 (already written by the Solution Designer in this worktree) | Modify |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping; no new folder.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `runtime-handover-notices/services/` | Main-Line Domain-Control | Yes | Low | Existing |
| `agent-work-journal/` | Off-Spine Concern (journal facts) | Yes | Low | Existing |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

**File choice (in the builder):**

```ts
const previousWork = [...facts.files].reverse().find((file) => file.state === "closed" && file.workEntryCount > 0);
const open = facts.files.find((file) => file.state === "open");
```

**Target text** with a previous agent's latest journal (PRB-001 case A; `<dir>` = `journalFolder`):

```
[System: runtime hand-over]
Another agent worked on this run before you and kept a work journal as it went. You are taking over.

The journals are in <dir>/. The previous agent's most recent work is in work_journal_000001.md.
Before you reply or continue the work, read <dir>/work_journal_000001.md completely, from its first line to its last.
If it is long, read it in parts until you reach the end.
work_journal_active.md starts with this hand-over; your own work is recorded there from now on.

All journal files, oldest first (the earlier ones are there if you need to look further back):
  work_journal_000001.md | 2026-09-22 | 1010 B, 16 lines
  work_journal_active.md | 2026-11-21 | 444 B, 5 lines

Each entry is one line, such as "[HH:MM:SS] User: …", "Agent: …" or "Command: … → ok", and ends with a
link to the full record. Long output is shortened.
```

- The `work_journal_active.md` line uses the open file's name from the facts and is left out when there is no open file.
- The list line format is unchanged.

**Without a previous agent's latest journal** (REQ-005):

```
[System: runtime hand-over]
Another agent worked on this run before you and kept a work journal as it went. You are taking over.

The journals are in <dir>/:
  work_journal_active.md | 2026-11-21 | 444 B, 5 lines

Each entry is one line, …
```

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Which file | The newest closed file with `workEntryCount > 0` | `files[files.length - 1]`, or "the newest closed file" (fails PRB-001 B) | The open file never holds the previous agent's work (I-7) |
| Where the fact is derived | `listJournalFiles` | The builder or service re-reading journals | One owner per fact |

The wording above is the approved shape. Implementation may make editorial changes only if every element AC-001…AC-004 names stays:
- the file name and full path;
- "completely, from its first line to its last";
- "before you reply or continue";
- reading in parts;
- the open-file clause;
- the list.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keeping the old "good place to start" sentence beside the new one | Smaller diff | Rejected | It contradicts the new pointer; replaced |
| Optional `workEntryCount?` for old callers | Tests building summaries | Rejected | Required field; fixtures updated |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Start from PRB-001: copy it into `tests/probes-583/` or go straight to the new transition test. It fails on the current code because the notice names `work_journal_active.md`.
2. Add `workEntryCount` (model and service) and update `work-journal-reading.test.ts`.
3. Change the builder and rewrite its unit tests; update the service test fixture.
4. Add the transition test, covering cases A, B and a switch before any work.
5. Extend MS-01.
6. Update `run_history.md` and `GLOSSARY.md`. `docs/design-cases.md` Case 25 is already written.
7. Remove the untracked `autobyteus-server-ts/tests/probes-583/` (the Solution Designer's probe; its copy stays in the ticket's `probes/`).

## Key Tradeoffs

- **A count instead of a boolean "has work":** the same cost, and clearer as a fact about the file. The builder decides what "has work" means for the notice.
- **No size cap (DEC-004):** a complete read is what the founder asked for, and the measured sizes fit.

## Risks

- **RSK-001:** a model may still read only part of the file. AC-005's live check records it; if it happens, a follow-up names the runtime.
- **A future very large journal:** the agent sees its size and reads it in parts.

## Guidance For Implementation

- **Reproduction to start from:** `tickets/in-progress/runtime-handover-journal-read/probes/handover-transition.probe.test.ts`. Copy it to `autobyteus-server-ts/tests/probes-583/` and run `pnpm -C autobyteus-server-ts exec vitest run tests/probes-583 --silent=false --reporter=verbose`. Cases A and B must name `work_journal_000001.md` after the fix. Its `candidate` record shape is not one the normalizer accepts (it logs "omitted malformed system instruction"). That does not affect the finding, but the committed transition test should use a valid candidate record, or none.
- **Fixtures:** synthetic only (`tests/agent-work-journal/raw-trace-folder-fixtures.ts`). Never use the founder's paths or data.
- **MS-01 run:** it needs a current build and its gate, `RUN_AGY_FAILURE_E2E=1` with the scripted CLI. The command is in the test file header.
- **AC-005 live check (API/E2E):**
  - Use an isolated test data root, a synthetic run whose previous era's journal has more than 2,000 lines, a real switch to at least one live runtime (behind its live gate, keys through the test vault) and one message.
  - Record the agent's read calls on the named file and whether they reach its last line before the first reply.
