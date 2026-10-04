# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `org-member-switch-performance`
- Request / ticket: Slow member switching in a long-running Agent Org (user report, 2026-10-04)
- Requirements owner: Solution Designer
- Date: 2026-10-04
- Approval state and reference: **Approved** by the user on 2026-10-04 in the requirements conversation: "I think on the message list changes, I think you did a good job with UI. Show first the 25 hours, then show all. Yeah, use this approach. It's a good one. Let's work on the first this ticket, the app ticket, because the other agent package belongs to the agent package project." The phrase "25 hours" is a speech transcription of the preview count. It is interpreted as the proposed first **20** files shown in the approved mockup. The value is one constant and stays within QR-002 either way.
- Exact approved requirements baseline / solution revision: This document as of SR-003 (SR-001 baseline + SR-002 evidence + SR-003 approval capture, DEC resolutions and REQ-006 wording clarification)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: In a long-running Agent Org, clicking another member while the right-side **Org** tab is open freezes the UI for seconds. Reproduced on a snapshot of the user's org run: api e2e engineer → code reviewer takes **3.2–4.2 s**; with the Files tab open instead, the same switch takes **5–51 ms**. The cause is not raw traces. The Org *Messages* panel does work proportional to the **total number of reference files** across the focused member's messages (code reviewer: 42 messages, **41,965** reference rows, 188,589 DOM nodes). On every switch it (a) runs a crypto-js SHA-256 per reference, twice (≈1.5 s), and (b) mounts a button + icon for every reference (≈1.3–1.8 s plus layout). Reference lists grow because agents attach cumulative file lists, up to 3,136 per message.
- Affected actors or systems: Desktop users viewing Agent Org runs (and Agent Team / standalone agent runs, which share the same Messages panel).
- Desired outcome: Member switching stays immediate however many messages or reference files the org has accumulated. Every message and reference file stays accessible.
- Observable definition of success: On the captured snapshot, with the Org tab open, every member switch settles within the target in QR-001. The Messages panel no longer mounts one row per reference for every message.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Member switch with Org tab open blocks the UI for 0.3–4.2 s, scaling with reference count | Switch settles within QR-001 regardless of reference count | Focus semantics, center feed, sidebar selection | `evidence/switch-Org-results.json` |
| BEH-002 | User | SCN-001 | With other tabs open, switching is 5–51 ms | Unchanged | Same | `evidence/switch-Files-results.json` |
| BEH-003 | User | SCN-002 | Every message in the list shows all its reference rows inline (thousands per message) | Message list shows each message's reference **count**. Reference rows appear per the DEC-001 decision (recommended: only for the selected message, initially limited, with an explicit "show all"). | Newest-first order, message summary, counterpart, timestamp, "N Messages" count, auto-selection of first message, Markdown detail | Investigation BEH-003 |
| BEH-004 | User | SCN-003 | Clicking a reference opens the file viewer via `referenceId` = sha256(messageId\0path) | Unchanged result: same file opens. The ID may be computed only when needed. | Reference-content route and server ID contract | Investigation BEH-004 |
| BEH-005 | System | SCN-004 | New message arrival in a live org re-hashes and re-renders the whole perspective | Arrival cost is bounded by the new message, not by total history | Live ordering/appearance of new messages | Code evidence (untimed, UNK-001) |
| BEH-006 | User | SCN-005 | Agent Team / standalone collaboration views use the same unbounded panel | Same bounded behavior | Their existing identities and ordering | Code |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop user | Move quickly between members of a long-running org | Immediate switch; messages and files still reachable | Must not lose access to any reference |
| Agent Org / Team runtime | Produces messages with reference files | No change required for this ticket | Producer volume is out of scope (DEC-002) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Switch focused member in an Agent Org with the Org tab open | SCN-001 |
| UC-002 | Browse a member's collaboration messages and their reference files | SCN-002, SCN-003 |
| UC-003 | Receive new collaboration messages while the Org tab is open on a live run | SCN-004 |
| UC-004 | Same Messages panel in Agent Team and standalone-agent collaboration views | SCN-005 |

### Out Of Scope

- Raw-trace / center Event Monitor loading (already bounded by `agent-run-history-performance`; measured fast here).
- Agent/skill behavior that attaches large cumulative reference lists (separate-ticket candidate, DEC-002).
- Org-open payload size (10 MB execution view) and initial org hydration time (DEC-002).
- Mobile `MobileTeamMessages` (DEC-003; out of scope unless the user includes it).
- Server persistence formats; no data migration.

### Non-Goals

- Redesigning the Messages panel beyond what bounding reference rows requires.
- Search/filter of reference files.

### Preserved Behavior Boundary

BEH-002, and the preserved column of BEH-003/BEH-004/BEH-005/BEH-006. Cross-cutting invariant: every message and every reference file that is reachable today must stay reachable and open the same content.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Switching the focused member while the Org tab is open must not do work proportional to the member's total reference-file count; switch latency must meet QR-001. | BEH-001 | Must | Root cause of the reported freeze | User report; reproduction |
| REQ-002 | The Messages panel must not mount reference rows for all messages at once. The number of reference rows mounted on a switch is bounded (QR-002), following the DEC-001 presentation. | BEH-003 | Must | DOM creation and layout alone take ≈1.3–1.8 s | Profile |
| REQ-003 | Each message in the list must show how many reference files it has, so users know files exist without the rows being rendered. | BEH-003 | Must | Keeps references discoverable once collapsed | DEC-001 |
| REQ-004 | Every reference file of every message must stay reachable through an explicit user action. Opening it must show the same content as today, under the existing server reference-ID contract. | BEH-004 | Must | No loss of access | Server contract |
| REQ-005 | A member switch must compute the message perspective at most once. Reference identifiers must not be derived for references that are not displayed or opened. | BEH-001, BEH-004 | Must | ≈1.5 s of duplicated eager hashing | Profile |
| REQ-006 | A new collaboration message arriving on a live run must update the panel without deriving reference identities for, or re-rendering reference rows of, the existing history. Recomputing the lightweight message list is acceptable within QR-001. | BEH-005 | Should | Same root cause on the live path | Code |
| REQ-007 | The bounded behavior applies wherever the shared Messages panel is used (Agent Org, Agent Team, standalone agent collaboration). | BEH-006 | Should | Shared component; same risk | Code |
| REQ-008 | Existing message semantics are preserved: newest-first order, per-message summary/counterpart/timestamp, "N Messages" count, auto-selection of the first message, Markdown detail and reference viewer. | BEH-003, BEH-004 | Must | No regression | Current UI |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-005 | BEH-001 / SCN-001 | Snapshot org `autobyteus_org_be52ac…`, Org tab open, production build, harness `probes/measure.mjs` | Every switch in the harness sequence (including api e2e → code reviewer) settles within QR-001 | — | Re-run harness; compare to baseline 3.2–4.2 s |
| AC-002 | REQ-002 | BEH-003 / SCN-001 | Same, after switching to code reviewer | Reference rows mounted ≤ QR-002 (baseline 41,965). Total DOM nodes is a small fraction of baseline 188,589. | — | Harness DOM counts |
| AC-003 | REQ-005 | BEH-001 | Unit/integration level, member with ≥40k references | One perspective computation per switch. No reference ID is derived for undisplayed references. | — | Instrumented test or call-count assertion |
| AC-004 | REQ-003, REQ-004 | BEH-003, BEH-004 / SCN-002, SCN-003 | Message with 3,136 references | Row shows the count. The user can reveal and open any of the 3,136 references, including the last one. The opened content matches today's for the same path. | Unreadable/missing file shows the existing viewer error state | Browser test opening first and last reference |
| AC-005 | REQ-002, REQ-004 | BEH-003 / SCN-002 | User reveals all references of the largest message | The reveal stays responsive (QR-003). Other messages do not render their reference rows. | — | Harness timing |
| AC-006 | REQ-008 | BEH-002, BEH-003 | Any member | Order, count header, auto-selection, Markdown detail and viewer behave as before. Files-tab switching stays ≤ 60 ms. | — | Existing component tests + harness control |
| AC-007 | REQ-006 | BEH-005 / SCN-004 | Live org with Org tab open on a member with large history; new message arrives | New message appears. Main-thread work for the update stays within QR-001 and does not re-render existing reference rows. | — | Synthetic stream-event test |
| AC-008 | REQ-007 | BEH-006 / SCN-005 | Agent Team (or standalone) run whose messages carry many references | Same bounded rendering and reachability as AC-002/AC-004 | — | Component test with team-shaped data |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Desktop user | Inspect another member of a long-running org | Sidebar member row | Org run open, Org tab active | Click member → header, center feed and Org messages update | Immediate update | — | Supported Normal Scenario | User report + reproduction | REQ-001/002/005, AC-001/002/003 |
| SCN-002 | User | Desktop user | Find a message and see its files | Org tab message list | Member focused | Scan list → select message → see its files (per DEC-001) | Files visible for the chosen message | Message without files shows no count | Supported Normal Scenario | User screenshots | REQ-002/003/008, AC-004/005/006 |
| SCN-003 | User | Desktop user | Open a referenced file | Reference row | Reference visible | Click reference → viewer shows content | Same content as today | Missing/unreadable file → existing error | Supported Normal Scenario | Current UI + server contract | REQ-004, AC-004 |
| SCN-004 | System | Live org stream | New inter-agent message | Stream event | Org tab open on live run | Message arrives → list updates | Bounded update | — | Supported Normal Scenario | Code | REQ-006, AC-007 |
| SCN-005 | User | Desktop user | Same as SCN-001/002 in Agent Team / standalone agent | Team/agent Messages tab | Run open | Same as SCN-001/002 | Same bounded behavior | — | Supported Normal Scenario | Shared component | REQ-007, AC-008 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (reference-list presentation in the Messages panel)
- Linked UI/UX or interaction supplement: None. The decision is captured in DEC-001.
- Linked runnable UI reference, design repository, UI/UX specification: N/A — not applicable
- Product ticket record and folder: N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: User approval 2026-10-04 (see Document Status), approving the message-list mockup presented in the conversation
- Approved visual-reference baseline: N/A — not applicable
- Normative details (option A, approved 2026-10-04): each message row shows a compact file-count indicator (e.g. a paperclip with "3,136"). The selected message shows its reference rows under it, initially up to 20, followed by a plain "Show all N files" control. Unselected messages show only the count. Feasibility spike 2 measured every switch at 26–82 ms and "Show all 3,136" at 254 ms, with no virtualization (see investigation notes).
- Permitted variation: exact limit, icon and wording are left to design, within QR-002/QR-003.
- Required states: message with 0 / few / thousands of references; reference selected; viewer error.
- Unresolved product decisions: None.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, REQ-006 / AC-001, AC-007 | Performance | Member switch settles (click → end of last long task) in **≤ 200 ms** for every member. Baseline: up to 4,232 ms. | Snapshot data, production build, headless Chrome 2000×1250 via `probes/measure.mjs` on the reference machine | Harness; confirm subjectively in Electron |
| QR-002 | REQ-002 / AC-002 | Performance | Reference rows mounted after a switch **≤ 50**, independent of total reference count | Same | Harness DOM count |
| QR-003 | REQ-002, REQ-004 / AC-005 | Performance | Revealing all references of a 3,136-reference message settles in **≤ 300 ms** | Same | Harness extension |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: All messages and reference paths; reference-content contract.
- Loss, reset, rebuild, or regeneration that is acceptable: None needed.
- Retention, privacy, compliance, volume, downtime, or operational constraints: None.
- Unknowns requiring downstream investigation: None.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Org reference content REST route | `referenceId == sha256hex(messageId + "\0" + path)` must keep resolving the same file | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-reference-content-service.ts` | Design may keep the contract (lazy hashing) or extend it; any change must be backward-compatible |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/measure.mjs` | Reproduction / regression harness | AC-001, AC-002, AC-005, AC-006 | Current | Evidence only; N/A |
| `evidence/` | Baseline measurements and profile | AC-001–AC-006 | Current | Evidence only; N/A |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Users do not need thousands of file names inline in the list to find a message | Basis for collapsing references | User decision DEC-001 | Confirmed by user approval |
| ASM-002 | Headless-Chrome harness timing is representative of the Electron renderer | Measurable acceptance | Downstream Electron spot check | Open |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | How should reference files appear in the message list? | Visible UI change | A: count on every row; reference rows only under the selected message, first 20 plus "Show all N files". (B: virtualized inline, C: collapse/expand: not chosen) | User | **Resolved 2026-10-04: Option A approved** |
| DEC-002 | Should the producer side be a separate ticket? Agents attach cumulative lists of up to 3,136 files (including `dist/` and evidence files), and the org view payload is 10 MB at open. | Volume keeps growing; affects org open time and agents' context | Separate ticket recommended | User | **Resolved 2026-10-04: producer side out of scope; it belongs to the agent package project** |
| DEC-003 | Include mobile `MobileTeamMessages` (8 newest messages, all references)? | Same pattern on mobile | Recommend separate follow-up | User | **Resolved by approved scope: app ticket as presented; mobile stays out of scope (follow-up candidate)** |
| DEC-004 | Are the targets QR-001 ≤ 200 ms / QR-002 ≤ 50 rows / QR-003 ≤ 300 ms acceptable? | Acceptance thresholds | Baseline 3.2–4.2 s; control 5–51 ms; spike 26–82 ms / Show all 254 ms | User | **Accepted with the approved approach (targets presented with the measured spike result)** |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | harness |
| REQ-002 | UC-001, UC-002 | BEH-003 | AC-002, AC-005 | SCN-001, SCN-002 | harness |
| REQ-003 | UC-002 | BEH-003 | AC-004 | SCN-002 | DEC-001 |
| REQ-004 | UC-002 | BEH-004 | AC-004, AC-005 | SCN-003 | server contract |
| REQ-005 | UC-001 | BEH-001, BEH-004 | AC-001, AC-003 | SCN-001 | profile |
| REQ-006 | UC-003 | BEH-005 | AC-007 | SCN-004 | code |
| REQ-007 | UC-004 | BEH-006 | AC-008 | SCN-005 | code |
| REQ-008 | UC-002 | BEH-002, BEH-003, BEH-004 | AC-006 | SCN-002, SCN-003 | current UI |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001–SCN-005 (pending approval).
- Product and system constraints architecture must preserve: server reference-ID contract; message ordering/count/selection semantics; no persistence change.
- Decisions intentionally deferred to architecture design: how reference IDs are derived on demand. Simplicity constraint from the user conversation: prefer removing unnecessary work over adding caching/reactivity/virtualization machinery. Spike 2 shows the minimal change meets QR-001–QR-003, so additional mechanisms need measured justification.
- Technical facts architecture should verify: live-arrival cost (UNK-001); team/standalone dataset behavior; Electron vs headless timing.
- Known feasibility or integration risks: crypto-js is synchronous. Async Web Crypto would change the timing of reference opening.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes` — conversation mockup approved (no Product package)
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
