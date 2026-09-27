# Requirements — Team attachment exact execution ownership

## Document Status
Package `docker-image-http400-20260926`; current revision SR-003; owner Solution Designer; 2026-09-26. **Approved**. Approval reference: user message “Yeah, approve.” directly responding to the proposed focused refactor: carry selected agentRunId through finalization/URLs/reads, validate team membership, keep drafts separate, preserve existing attachments/history, test multiple executions sharing an address. This document formalizes that exact scope (baseline R1); not approval for adjacent error-UI redesign, deployment, or deletion. Behavior-defining supplements: none. Diagnostic REQ-001/AC-001 retained from SR-001/002.

## Problem And Desired Outcome
Team image/file finalization loses exact execution identity, causing HTTP 400 when a configured member and retained delegated task share an address. A user sending attachments must target exactly the same execution as the message; subsequent reads and restored history must preserve ownership and file contents.

## Relevant Current And Desired Behavior
| ID | Kind / Scenarios | Current | Desired | Preserved |
|---|---|---|---|---|
| BEH-001 | User / SC-001 | Duplicate address causes finalization 400 | Selected execution owns attachments and receives message | No cross-execution reassignment; text-only send unchanged |
| BEH-002 | User / SC-002 | Final URLs re-resolve logical address | Exact execution remains authoritative for reads/reopen | Existing attachments/history and bytes |
| BEH-003 | User / SC-003 | Pre-launch uploads use draft scope | Keep draft stage; bind once exact execution exists | Upload/preview/remove and retry draft behavior |
| BEH-004 | Contract / SC-004 | Team descriptor lacks exact ID | Reject nonexistent/wrong-team execution, no name fallback | Team-scoped file access and safe path handling |
Evidence: investigation-notes.md SR-001/002 plus SR-003.

## Stakeholders, Actors, And Outcomes
User: send/read images and files reliably without history loss. Runtime: receive files for the intended AgentRun. Operator: preserve data across upgrade; no live mutation during design.

## Scope Guardrail
In-scope UC-001 send Team attachments; UC-002 reopen/read retained Team attachments; UC-003 launch with draft attachments; UC-004 enforce selected execution/team ownership. Preserved boundaries BEH-001..004 apply. Non-goals: broad execution-index rewrite, Org/standalone behavior changes, draft subsystem rewrite, model/provider changes, marketing actions, renaming members, deleting histories, visual redesign, new generic security policy, mixed-version client compatibility or arbitrary external bookmark preservation. Clearer error presentation was discussed earlier but not in the exact five-point approval; not included.
Review authority: blocking findings must cite these approved REQ/AC/BEH IDs. New behavior, policy or retention/compatibility obligations require Solution Designer and renewed approval; reviewers cannot expand scope.

## Requirements
| ID | Requirement | Behavior | Source |
|---|---|---|---|
| REQ-001 | Evidence-backed diagnosis of original failure | BEH-001 | Original request; completed |
| REQ-002 | Final attachment identity is selected canonical agentRunId throughout send and read, independent of repeated member address | BEH-001,002 | Approved five-point scope |
| REQ-003 | Validate execution belongs to specified team; never pick an alternative by address | BEH-004 | Approved scope |
| REQ-004 | Temporary draft stage remains separate until exact execution exists | BEH-003 | Approved scope |
| REQ-005 | Preserve existing attachment files, history and ownership while transitioning | BEH-002 | Approved scope |
| REQ-006 | Verify duplicate-address executions independently; regression coverage for unchanged paths | BEH-001..004 | Approved scope |

## Acceptance Criteria
| ID | Requirements | Scenarios | Observable outcome / verification |
|---|---|---|---|
| AC-001 | REQ-001 | SC-001 | Logs + deployed index establish ambiguity; complete |
| AC-002 | REQ-002,006 | SC-001 | With configured and retained task executions sharing address, sending image/file to selected sendable execution succeeds; attachment and message target have same ID; other execution receives neither |
| AC-003 | REQ-002,005,006 | SC-002 | Final locator still resolves original bytes after another execution is created at same address, navigation, restart and history reload; existing retained attachments remain readable without history deletion |
| AC-004 | REQ-003,006 | SC-004 | Missing/malformed/nonexistent ID or ID outside supplied team cannot finalize/read another execution's file and causes no runtime send on finalize failure |
| AC-005 | REQ-004,006 | SC-003 | Pre-launch draft can upload/preview/remove; launch finalizes into returned exact execution; failure preserves retry input as currently supported |
| AC-006 | REQ-005,006 | SC-002 | Transition preserves attachment byte hashes and all non-locator history content; interrupted/retried transition cannot silently misattribute or lose files |
| AC-007 | REQ-006 | SC-001,003 | Text-only Team send, standalone/Org uploads/reads and existing local-file paths remain functional |

## Relevant Scenarios And Journeys
- SC-001 (Supported Normal Scenario, user, UC-001): select existing Team execution, attach images/files, send; another retained execution may share logical address through supported delegation. Expect selected execution processing, not ambiguous lookup. Evidence: actual Docker incident + tree.
- SC-002 (Supported Normal Scenario, user/system, UC-002): reopen previous conversation after restart/upgrade or another delegation, view/download existing attachment; bytes and original owner preserved. Evidence: persisted raw trace attachment fields + existing read routes.
- SC-003 (Supported Normal Scenario, user, UC-003): compose Team launch draft, upload/preview/remove attachment before run exists, launch and send; bind to resulting execution; retain retry on failure. Evidence: agentTeamRunStore launch branch and draft routes.
- SC-004 (Supported Explicit Edge Scenario, contract, UC-004): final owner request has ID absent from supplied team; approved team validation requires rejection rather than fallback. Boundary tests implement this approved contract, not a new threat model.

## UI, Interaction, And Experience Requirements
No new layout/interactions; existing send/reopen functionality fixed. All Product prototype, UI/UX specification, visual-reference and confirmation fields: N/A — not applicable. No Product Design requested.

## Quality And Non-Functional Requirements
QR-001 reliability maps AC-002/003/005; QR-002 ownership maps AC-004; QR-003 data continuity maps AC-006. No new throughput or latency SLA. All unchanged paths in AC-007.

## Data Continuity And Acceptable Loss
Affected: yes, persisted attachment references. Preserve bytes, history, exact execution ownership and usable retained attachments. No deletion/reset is authorized. Disposable projection regeneration only if reconstructable without losing history. Architecture decides transition mechanism based on evidence. No promise to preserve arbitrary externally copied URLs or run old clients against new server.

## External Contracts And Dependencies
Team final REST DTO and file URLs change; web and server must ship matching contract. Canonical application agentRunId is distinct from provider platformAgentRunId/definition ID. Existing execution tree remains identity authority.

## Supplemental Artifacts
investigation-notes.md and matching-errors.log (evidence, no separate behavior approval). Original three screenshots linked there; no independent normative supplement.

## Assumptions / Open Decisions
No open intended-behavior decisions. Old-reference transition is technical design work, not permission to drop data; irrecoverable ownership requires explicit report rather than guessing. Deployment/release authorization stays delivery-owned.

## Traceability
REQ-001→UC-001/BEH-001/AC-001/SC-001. REQ-002→UC-001,002/BEH-001,002/AC-002,003/SC-001,002. REQ-003→UC-004/BEH-004/AC-004/SC-004. REQ-004→UC-003/BEH-003/AC-005/SC-003. REQ-005→UC-002/BEH-002/AC-003,006/SC-002. REQ-006→all UC/BEH/SC, AC-002..007.

## Architecture Phase Input / Readiness
Approved scenarios SC-001..004, preserve data and unchanged draft/Org/standalone behavior. Verify writers/readers, exact-ID index support and stored locator transition. Current evidence, scope, testability, traceability and approval reference complete. Content ready: Yes; explicit approval: Yes; basis ready for design: Yes. Remaining requirement blocker: none.
