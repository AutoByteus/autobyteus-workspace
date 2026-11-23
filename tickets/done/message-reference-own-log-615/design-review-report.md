# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/message-reference-own-log-615/tickets/in-progress/message-reference-own-log-615/requirements-doc.md` (SR-001, Approved by the founder 2026-11-23)
- Upstream Investigation Notes: `…/investigation-notes.md`, with `root-cause-report.md`
- Upstream Solution Revision Record: `…/solution-revision-record.md`
- Reviewed Design Spec: `…/design-spec.md` (SR-001, Ready)
- Supplemental Task Artifacts Reviewed: `root-cause-report.md` (evidence), `follow-ups.md` (FU-001), `solution-designer-handoff.md`
- Relevant Solution Revision IDs: SR-001
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff, 2026-11-23 (Medium / High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `codex/message-reference-own-log-615` at `1956c232c8`.
  - Server: `run-history/services/participant-messages-reader.ts:30-110` (the page; `rootRecords` at `:79-93`; process getter at `:100-109`); `compositions/collaboration-composition.ts:345-360`; `agent-org-execution/services/agent-org-reference-content-service.ts:55-102`.
  - The three route files: `api/rest/agent-org-references.ts`, `agent-collaboration-references.ts`, `team-communication.ts`.
  - Callers of `TeamCommunicationContentService`, `AgentOrgReferenceContentService`, `resolveReference`, `resolveCommunication`, `projectMessage` and `projectTeamReferenceFile`.
  - Web: `services/collaborationMessages/participantMessageRows.ts:60-95`; every `referenceContentPath` user, including `components/mobile/views/MobileMessages.vue:53-57` and `MobileTeamReferenceViewer.vue:6, 18`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High` (a REST contract clean cut, an extracted ownership boundary, and the file-serving boundary moving to a new owner)
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood:
  - every listed message's reference opens, wherever its log is (REQ-001);
  - the reference is found only through a message of the same view the list reads, and only a file that message names is served (REQ-002, QR-001);
  - the viewer tells not-found apart from file-missing (REQ-003);
  - one web link builder from the list's key (REQ-004);
  - context files are unchanged (REQ-005).
- Relevant existing behavior and evidence confirmed:
  - **The correct view derivation:** the page derives the view correctly (`rootRecords`: own records plus `openRunsBelow`, `composeRunViewMessages`).
  - **The three readers each read one log:** the Org/standalone service through `getCollaborationRecordsSnapshot(orgRunId|runId)`; the Team route through `resolveReference`.
  - **Removals are clean:**
    - Each route file holds exactly one route.
    - Each content service has one public method, used only by those routes.
    - `projectMessage` is used only inside `resolveReference`.
    - `projectTeamReferenceFile` stays: `team-execution-view-projector.ts` also uses it.
- Scope guardrail confirmed: yes.
- Every prospective blocking `Design Impact` finding is traceable: N/A (none).
- Remaining material ambiguity: none.
- Statements about existing code the design relies on: checked at their cited lines. One is inexact: "`ParticipantMessagesReader` … still takes `delegatedRunAgents` for `CounterpartIdentities` where needed". The reader itself uses `records` and `delegatedRunAgents` only inside `rootRecords`; `CounterpartIdentities` receives `delegatedRunAgents` from the composition (`collaboration-composition.ts:355-358`). See N-1.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001, BEH-002 | User | Pass | Pass | Pass (DS-001 reads the same view as DS-002) | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass (codes on 404) | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass (one route with the query's identity; the file must be named by a message of the view) | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass (`MobileMessages` → `MobileTeamReferenceViewer` wraps the same viewer and reads the same context view) | Confirmed | N-3 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `root-cause-report.md` | Pass | Pass | Pass | Pass | Pass (evidence) | — |
| `follow-ups.md` (FU-001) | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | design-spec § Task Design Health | — |
| Root cause explicit and evidence-backed | Pass | `Duplicated Policy Or Coordination`: one fact derived in four places (root-cause report; code) | — |
| Refactor decision explicit | Pass | Extraction plus removals | — |
| Refactor reflected in sections | Pass | Ownership Map, Removal plan, file mapping | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | click → route → reference reader → view reader → file | Pass | Pass | Pass (the route is a thin entry; `MessageReferenceContentReader` governs) | Pass | Pass | Pass | Pass |
| DS-002 | page → participant reader → view reader | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunViewMessagesReader` | Pass | Pass | Pass | Pass | Owns the composition of logs; two real consumers (not empty indirection) |
| `MessageReferenceContentReader` | Pass | Pass | Pass | Pass | Owns lookup, the ID rule's use, file checks, mime type and codes; QR-001 at one place |
| `participantMessagesView` (web) | Pass | Pass | Pass | Pass | The link comes from the same `key` that loads the list |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Route → reference reader → view reader → `RunRecordsSource`, `DelegatedRunAgentsReader` | Pass | Pass | Pass | Pass | — |

Principle 16: `Pass — deviation recorded, reason holds`. `getMessageReferenceContentReader()` mirrors `getParticipantMessagesReader()` (`participant-messages-reader.ts:100-109`):
- it is set in `composeCollaboration` beside it before the server listens;
- a missing one throws;
- it hides no cycle.

The standalone application host also runs `composeCollaboration`, so the binding exists there too. The host does not register the studio REST routes, which is harmless.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `GET /rest/collaboration-messages/:rootKind/:rootRunId/messages/:messageId/references/:referenceId/content` | Pass | Pass | Pass (`rootKind` parsed by `collaborationRootKindSchema`; the query's identity) | Low | Pass |
| `RunViewMessagesReader.read(view)` | Pass | Pass | Pass | Low | Pass |
| `MessageReferenceContentReader.resolve(input)` | Pass | Pass | Pass | Low | Pass |
| `participantMessagesView(...).referenceContentPath` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Messages of a view | Pass | Pass (extracted, moved as is) | Pass | Pass | — |
| Reference ID rule | Pass | Pass (the one server copy, `projectTeamReferenceFile`) | N/A | Pass | N-2 (naming) |
| Readable-file check, mime type | Pass | Pass (one implementation instead of two) | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/services` (both readers), `api/rest` (the route), web `collaborationMessages` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| View composition | Pass | Pass | Pass | Pass | — |
| File checks and the ID rule (two copies → one) | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Error body `{ detail, code }` | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure (Principle 11): `Pass`. The consumers table covers the participant reader, the panel, the viewer, the live feed and the phone; N-3 adds `MobileMessages` explicitly.

One vocabulary (Principle 15): `Pass` (N-2 suggestion only).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New readers, route, web owner | Pass | Pass | Pass with N-1 | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All new files | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Three routes and their registration | Pass | Pass | Pass | Pass | One route each; no other caller |
| `TeamCommunicationContentService`, `AgentOrgReferenceContentService` | Pass | Pass | Pass | Pass | Only those routes call them |
| `resolveReference`, `projectMessage` | Pass | Pass | Pass | Pass | `projectMessage` is used only by `resolveReference` |
| Web hand-written links (3 plus test-support) | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| REST routes | No (aliases rejected; no stored URL) | Pass | Pass | DESIGN.md rule 9 |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Reference URLs | Not Affected | Pass (`attachment-link-conversion.ts:20`) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–7 (starting from a failing test) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Link, server lookup, viewer | Yes | Pass | Pass | Pass | — |

## Review Of The Designer's Specific Questions

- **The extraction boundary:** `Pass`. `RunViewMessagesReader` owns exactly today's `rootRecords` (own records plus `openRunsBelow`, composed), with two real consumers. The page keeps its filtering, paging and counterparts. Drop the now-unused page dependencies (N-1).
- **The process binding:** `Pass — reason holds`. It is the same pattern and the same composition step as `getParticipantMessagesReader()`, it throws when missing, and it hides no cycle.
- **Each removed route and service has no other caller:** `Pass`. Verified (see the Removal table). Implementation repeats the search and the typecheck before deleting, as planned.
- **QR-001:** `Pass`.
  - The new owner serves a path only if a message of the requested view names it, and the view is the same composition the list reads.
  - The view can hold messages beyond one participant's filtered page. REQ-002 and QR-001 are stated per view, so this is the approved boundary: a reference of any listed message is always in it (UNK-001).

## Material Premise Validation

None. The scenarios are the approved basis (SCN-001…004, founder-observed).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed, and the design is ready for implementation.

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

- **N-1.** After the extraction, `ParticipantMessagesReader` no longer reads `records` or `delegatedRunAgents` itself (today both are used only in `rootRecords`, `participant-messages-reader.ts:79-93`). Take them out of its constructor and give it the `RunViewMessagesReader`. The composition still passes `delegatedRunAgents` to `CounterpartIdentities` and to the view reader. This avoids unused dependencies in a touched file (Principle 7).
- **N-2 (suggestion).** The single reference ID rule is reused through `projectTeamReferenceFile(...).referenceId` from `agent-team-execution`, but it now serves agent and org roots too. Consider exporting the rule under a kind-neutral name beside it (for example `messageReferenceId(messageId, path)`), used by both the team projector and the new reader, so a team-named function does not decide every root's IDs. Non-blocking.
- **N-3.** Add `components/mobile/views/MobileMessages.vue` (through `MobileTeamReferenceViewer` → `CollaborationMessageReferenceViewer`) to the derived consumers. It reads `referenceContentPath` from the same context view and so gets both fixes. Include it in AC-004's rendered check, or in a phone-sized check for SCN-004.
- **N-4.** FU-001 (duplicate design case numbers) is outside this ticket, as recorded.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: one owner for "the messages of a view", used by both the page and the reference read behind one route with the query's identity, plus one web builder from the same key. This removes the cause, not only the symptom.
