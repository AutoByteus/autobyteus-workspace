# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `runtime-handover-journal-read` (autobyteus-583)
- Request / ticket: Project Task `autobyteus-583` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`: "Runtime hand-over notice: explicitly instruct the incoming agent to read the full latest active work journal file first (investigate & verify transition)"
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (`project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the founder's word (Task comment 2026-11-21)
- Requirements owner: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`)
- Date: 2026-11-21
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: my message to the founder in this conversation, 2026-11-21, "583: requirements approved within the direction". No decision needs the user (Decisions below).
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: none. The probe in `probes/` is evidence, not a supplement.

## Problem And Desired Outcome

- **Problem:** after an agent runtime switch, the new agent often misses the previous agent's recent work. When the founder tells it to read the complete latest journal, it picks up the context and works much better (Task, 2026-11-21).
  - The investigation found the cause. A switch archives the previous agent's records as a closed segment, and the new raw-trace file starts with the switch marker (contract §3.3, I-3, I-7).
  - So when the notice is built, `work_journal_active.md` holds only one line: `Notice: Agent runtime changed from … to …`. The previous agent's work is in the newest closed file, for example `work_journal_000001.md`.
  - The notice still says: "The latest one, work_journal_active.md, shows what was done most recently, so it is a good place to start." It calls the file that holds the work one of "the earlier ones … if you want to look further back". Probe cases A, B and C show this on every switch (`investigation-notes.md`, PRB-001).
  - The notice only suggests a starting point. It never asks the agent to read that file completely before it acts.
- **Affected actors or systems:** the incoming agent of any runtime (standalone runs, Team and Org members, delegated copies), the user who switched it, and the hand-over notice text.
- **Desired outcome:** the notice names the file that holds the previous agent's most recent work. It tells the agent to read that file completely, from the first line to the last, before it replies or continues. It still lists every journal file, so the agent can look further back.
- **Observable definition of success:**
  - On a switched run, the text the new agent receives names the newest closed journal file that holds work, with a read-it-completely instruction.
  - It never points to the near-empty open file as the place where recent work is.
  - In a live switch, the agent reads that file to its last line before its first reply.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001 | The notice calls the last file in the list (`work_journal_active.md`) the latest and "a good place to start". At hand-over, that file holds only the switch notice line (5 lines, about 444 B). | The notice names the previous agent's most recent work: the newest closed journal file that holds work. The open file is never presented as that place. | The notice is built from facts the journal service gives. The journals are made current first. | PRB-001 A; `runtime-handover-notice-builder.ts`; contract §3.3, §3.4, §3.6 |
| BEH-002 | Contract | SCN-001, SCN-003 | It gives no instruction. "Facts and pointers only; the agent decides what to read" (contract §3.6), and a unit test forbids `you must|you should`. | The agent is told to read the named file completely, from first line to last, before it replies or continues the work. When the file is long, it reads it in parts until it reaches the end. | The notice names no runtime or model and does not repeat the user's request (contract §3.6, the user 2026-10-30). | builder test "names no agent runtime or model, does not tell the agent how to proceed"; Task direction |
| BEH-003 | Contract | SCN-002 | After two switches with no input between them, the newest closed file holds only the first switch's notice line. The work is one file further back. The notice still points to the open file. | The named file is the newest closed file that holds at least one work entry: a request, reply, action or note. A file of notice lines alone is skipped. | Old journal files are not changed (I-8). | PRB-001 B |
| BEH-004 | Contract | SCN-001 | Every journal file is listed oldest first, with its period, size and line count. The earlier ones are "there too … if you want to look further back". | Unchanged list. Files before the named one stay optional reading. | The list format and the entry-format sentence | builder test |
| BEH-005 | Contract | SCN-004 | A run that switched before any work has no closed file. The notice lists only the open file. | No read instruction when no closed file holds work. The rest of the notice is unchanged. | — | contract §3.3 rule 2 (no segment when the watermark is absent) |
| BEH-006 | System | SCN-001 | Once per switch, with the next external input, before the user's text, under its own system sender. The chat shows the marker line. | Unchanged. | Delivery, pending derivation, settle rules and the chat presentation (contract §3.6, I-11) | service tests; built-server E2E MS-01 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Founder (user) | Switch a run's runtime and keep working | The new agent continues with the full recent context, without being told to read the journal | No release without his word |
| Incoming agent | Take over the run | Knows which file holds the recent work and reads all of it first | Has file tools only; reads by path |
| Hand-over notice (server) | Tell the agent where the work is | Correct pointer and instruction, from facts only | No model writes it |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A switched run's first input carries a hand-over notice that names the previous agent's most recent journal file and asks the agent to read it completely before it acts | SCN-001, SCN-002, SCN-003, SCN-004 |

### Out Of Scope

- How a switch archives raw traces, writes the marker or derives that a hand-over is pending (contract §3.3, §3.6 and I-11 are unchanged).
- How journals are rendered: their format, the shortening of long output, the file split per raw segment.
- Compaction notices and other platform notices: restart reminder, tool list, skill updates.
- What the chat shows: the marker line.
- Splitting or capping very large journal files.

### Non-Goals

- No guarantee that every model obeys the instruction. The server delivers a clear instruction; the live check (AC-005) records what real agents do.
- No summary of the journal in the notice; it stays pointers and facts.

### Preserved Behavior Boundary

BEH-004, BEH-006 and the preserved column of BEH-001 and BEH-002 must stay unchanged. Contract §3.6 delivery rules, invariants I-1…I-11, and the journal service's other readers (the Work Journal view) keep what they show.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The notice names, by file name and full path, the journal file with the previous agent's most recent work: the newest closed file that holds at least one work entry (any entry that is not a notice). | BEH-001, BEH-003 | Must | At hand-over, the open file holds only the marker and the candidate's records; no record of the previous agent is in it (I-7). | Reproduced: PRB-001 A and B | Task direction 2; DEC-001, DEC-002 |
| REQ-002 | The notice tells the agent to read that file completely, from its first line to its last, before it replies or continues the work. It says to read a long file in parts until the end. | BEH-002 | Must | The founder's observation: an explicit full read restores the context | User evidence (Task, 2026-11-21); confirmed live by AC-005 | Task direction 2; DEC-003, DEC-004 |
| REQ-003 | The notice does not present the open file (`work_journal_active.md`) as where the recent work is. It says that the open file starts with this hand-over. | BEH-001 | Must | It removes the misleading pointer | Reproduced: PRB-001 | DEC-005 |
| REQ-004 | Every journal file stays listed, oldest first, with its period, size and line count. Files before the named one are optional reading. | BEH-004 | Must | Preserved: the agent can look further back | N/A | contract §3.6 |
| REQ-005 | When no closed file holds work, the notice has no read instruction and lists the files as before. | BEH-005 | Should | No false pointer | N/A | DEC-006 |
| REQ-006 | The notice still names no runtime or model, does not repeat the user's request, and keeps its delivery: once per switch, before the user's text, its own sender, the marker as presentation. | BEH-002, BEH-006 | Must | Preserved contract | N/A | contract §3.6, the user 2026-10-30 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-003 | BEH-001, BEH-002, SCN-001 | A run's previous agent did work; its runtime is switched; the next input is sent | The notice names `work_journal_000001.md` (the newest closed file with work) with its full path and asks for a complete read, first line to last, before replying or continuing. It does not call `work_journal_active.md` the latest work or a place to start; it says that file starts with the hand-over. | — | Unit (builder) and a journal-backed test on real switch rotation (synthetic records) |
| AC-002 | REQ-001 | BEH-003, SCN-002 | Two switches with no input between them | The named file is the closed file holding the first agent's work, not the newer notice-only file | — | Unit / journal-backed test |
| AC-003 | REQ-004, REQ-006 | BEH-004, BEH-006, SCN-001 | As AC-001 | Every file is listed oldest first in the existing format. No runtime or model name, and no repeated request. Delivered once, first, with the marker presentation. | — | Unit (builder, service) and built-server E2E MS-01 |
| AC-004 | REQ-005 | BEH-005, SCN-004 | A switch before any work: no closed file | No read instruction; the list as before | — | Unit |
| AC-005 | REQ-002 | BEH-002, SCN-003 | A real switch with a real runtime on a synthetic run whose previous era has enough lines to need more than one read | The agent's tool calls read the named file through its last line before its first reply | When a runtime does not, record it with its evidence as a follow-up; the server text stays as approved | Live check by API/E2E (gated, isolated data, synthetic run) |
| AC-006 | REQ-001…REQ-006 | SCN-001 | The built server with a scripted runtime that echoes its input (MS-01) | The echoed input begins with the notice, which names the archived segment's journal file and carries the read instruction | — | Built-server E2E MS-01 extended |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Founder; contract §3.6 | Continue a run with another runtime | Stopped-run runtime/model change, then the next message (standalone, Team member, Org member, delegated copy) | The previous agent did work | The switch archives the work and the marker starts the new file. The first message carries the notice. The agent reads the named file, then answers. | The agent continues with the recent context | The notice cannot be built: the input goes on without it and it stays pending (unchanged) | Supported Normal Scenario | contract §3.3–§3.6; MS-01 | REQ-001–006, AC-001, AC-003, AC-006 |
| SCN-002 | User | Founder | Change his mind and switch again before sending anything | Two stopped-run changes, each made real by an activation | The first switch's file holds only its marker | The second switch archives the marker-only era | The notice skips the notice-only file | — | Supported Explicit Edge Scenario: each activation records a switch (contract §3.3 rules) and the Task names the just-rotated case | PRB-001 B; Task direction 1 | REQ-001, AC-002 |
| SCN-003 | User | Founder | Long-running work before the switch | As SCN-001 | The previous era's journal has hundreds or thousands of lines | The agent reads the file in parts to its end | Full context | — | Supported Normal Scenario. Measured on the founder's switched runs: previous-era journals of 32–3,001 lines, 2.5–393 KB | PRB-002 | REQ-002, AC-005 |
| SCN-004 | User | Founder | Switch a run before its first message | As SCN-001 | Nothing recorded yet | The notice is built with no closed file | No read instruction | — | Supported Explicit Edge Scenario (contract §3.3 rule 2) | contract | REQ-005, AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. The notice is agent-facing text; the chat keeps showing the marker line only.
- All Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 | Performance | Building the notice reads no more journal content than today (the journal service already parses every file to list it) | Per hand-over, once | Review |
| QR-002 | REQ-006 | Privacy | Tests and fixtures use synthetic records only; no private path or personal data in commits | All tests | Review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. The notice is built on demand. Journal files, the manifest and raw traces are unchanged.
- Data or state that must be preserved: all of it, unchanged.
- Loss, reset, rebuild, or regeneration that is acceptable: N/A.
- Constraints: the founder's data is only read; this ticket only took read-only size counts from it.
- Unknowns requiring downstream investigation: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Run runtime switch contract §3.6 (archived `tickets/done/cross-runtime-resume/run-runtime-switch-contract.md`) | Delivery and derivation unchanged. The wording rule "facts and pointers only; the agent decides what to read" is replaced by REQ-002 on the founder's direction. | Task 583 | The archived contract is not edited; the living module doc and code comment carry the new rule |
| Real agent runtimes (Codex, Claude, Antigravity, Grok, native) | They follow a clear read instruction | Founder's manual evidence | AC-005 records what they actually do |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/handover-transition.probe.test.ts`, `probes/handover-transition.probe.log` | Reproduction of the current notice on real switch rotation (synthetic) | REQ-001, REQ-003 | Evidence | Not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | At hand-over, the open file never holds a record of the previous agent (I-7) | REQ-001 looks only at closed files | Contract I-7 and its tests; AC-001 on real rotation | Holds |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Which file is "the latest active work journal" the agent must read? | The Task says `work_journal_active.md`, but at hand-over that file holds only the marker | (a) the open file; (b) the newest closed file; (c) the newest closed file with work. PRB-001 | By I-7, the open file never holds the previous agent's records, so (a) is the bug itself. The founder's intent is "the previous agent's latest work". Recommend (c): it also covers SCN-002. | Solution Designer | Decided: (c) |
| DEC-002 | What counts as "holds work"? | Decides SCN-002 | The journal reader already classifies entries: request, reply, action, notice, note | Any entry that is not a notice. A notice-only file has nothing to read; interrupted-turn notes and records are real history. | Solution Designer | Decided |
| DEC-003 | How strong should the instruction be? | The contract said "the agent decides" | A suggestion (today's wording) or an instruction | The Task asks for an explicit instruction, on the founder's evidence. Recommend: "Before you reply or continue the work, read it completely, from its first line to its last." | Solution Designer | Decided |
| DEC-004 | Very large files: cap, tail, or complete? | Context cost | Measured: at most 393 KB / 3,001 lines (PRB-002) | The founder asks for the complete file, and the measured sizes fit one session's reading in parts. The size is shown in the list. Recommend: complete, in parts, to the end; no cap. | Solution Designer | Decided |
| DEC-005 | What does the notice say about the open file? | Agents may go to it by name, since the founder's own words call it "active" | Say nothing, or one fact | One factual clause: it starts with this hand-over (and records the new agent's work from now on). It prevents the mistaken start without telling the agent how to work. | Solution Designer | Decided |
| DEC-006 | What if no closed file holds work? | SCN-004 | Instruction to read the open file, or no instruction | Nothing earlier exists to read. Recommend no instruction; the rest stays. | Solution Designer | Decided |
| DEC-007 | Does the founder need to approve the exact wording? | Product taste | The text is agent-facing and the direction settles its intent | No user decision. The wording is in the design and he can see it in the handoff summary. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-003 | AC-001, AC-002, AC-006 | SCN-001, SCN-002 | PRB-001 |
| REQ-002 | UC-001 | BEH-002 | AC-001, AC-005, AC-006 | SCN-001, SCN-003 | PRB-002 |
| REQ-003 | UC-001 | BEH-001 | AC-001 | SCN-001 | PRB-001 |
| REQ-004 | UC-001 | BEH-004 | AC-003 | SCN-001 | — |
| REQ-005 | UC-001 | BEH-005 | AC-004 | SCN-004 | — |
| REQ-006 | UC-001 | BEH-002, BEH-006 | AC-003, AC-006 | SCN-001 | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001…SCN-004.
- Product and system constraints architecture must preserve: contract §3.6 delivery, I-1…I-11, the journal's other readers, a builder that stays pure.
- Decisions intentionally deferred to architecture design: where the "holds work" fact is computed; the exact wording.
- Technical facts architecture should verify: the readers of `WorkJournalFileSummary`; the tests that assert the old wording.
- Known feasibility or integration risks: AC-005 depends on model behavior.

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

- Approval recorded: `Yes` (Solution Designer within the direction; founder informed 2026-11-21)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
