# Collaboration follow-up fixes — Requirements

## Document Status
- Package: **COLLAB-FOLLOWUP-001**; ticket: `collaboration-follow-up-fixes`.
- Status: **Ready for Approval**. Current requirements revision: **RER-001**.
- Owner: Requirements Engineer. Date: 2026-09-13.
- User authority: explicit request for ONE NEW ticket covering all three accepted/deferred issues, relayed verbatim in `/home/autobyteus/workspace/.codex/worktrees/collaboration-follow-up-fixes/tickets/in-progress/collaboration-follow-up-fixes/intake/user-request.md`. This authorizes intake, not an implied approval of this newly written requirements baseline.
- Detailed baseline approval: **pending**. Old AORG-FLAT-TEAM-001 remains done; its accepted failures are not rewritten.
- Worktree: `/home/autobyteus/workspace/.codex/worktrees/collaboration-follow-up-fixes`; branch: `requirements/collaboration-follow-up-fixes`.
- Requested base: `origin/requirements/flat-agent-organization-model`, freshly verified at `345d8e0befabe68052ff0e42d0ec9a560ef85326`. `personal` is comparison evidence only, not this ticket's base.

## Problem And Desired Outcome
Three accepted-but-unfixed issues disrupt ordinary collaboration use: unused standalone Team members start early; a background mounted-Team update once displaced the selected Org conversation; and a first sent text-file chip opens a stale draft URL until reload. Correct all three in this single ticket, with focused frontend-led evidence rather than automatic repetition of the former large validation suite.

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Evidence-backed current behavior | Desired behavior | Intentionally preserved behavior | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System; SCN-001–002 | A current newly launched standalone Codex Team has bound Idle members with zero messages; original Team shows gray Offline members until needed. This is a real launch/lifecycle difference. | A newly launched standalone Team can be available without starting every configured Agent. An unused member remains genuinely unstarted/Offline, not cosmetically recolored. Start a member when supported work requires it and show actual state. | Root availability and member execution state are distinct; configured identities, coordinator ingress, commands and retained history remain exact. This does not redefine Org full-scope launch or task-Team activation. | INV-002–003 |
| BEH-002 | User/System; SCN-003–004 | One selected mounted-member Org view became a bare Workspace/prior Team during live task status publication. A distinct repeat did not reproduce. Cause remains unassigned. | Background task/member publications update the displayed data without changing the user's chosen root/member/conversation or discarding that context's draft. | Explicit user navigation still changes selection; genuine status/history changes remain visible. No frozen lifecycle or byte-identical-URL requirement. | INV-004–005 |
| BEH-003 | User; SCN-005–006 | Native DeepSeek first Send sends/persists the finalized file reference, but its live sent chip opens the removed draft URL (404). Reload/reselect opens final URL200 with original bytes. | Immediately after successful first Send, the sent text attachment opens the final file without reload, refocus or resend. | Separate-link opening for uploaded text/JSON, exact file/run association, single accepted input and original retained bytes. No Files-tab redesign. | INV-006–007 |

## Stakeholders, Actors, And Outcomes
| Actor | Goal | Outcome / constraint |
| --- | --- | --- |
| User launching a standalone Team | Know which members have started and use them normally | Truthful initial Offline state and later supported activation, without hidden eager work |
| User working in an Org | Continue the selected conversation while others work | Selection survives incidental publication; deliberate navigation remains available |
| User attaching text to a new standalone Agent | Access the file they just sent | First live Open succeeds, same file after reopen |
| Engineering / validation | Fix the three causes and establish bounded evidence | New isolated ticket, real frontend scenarios, no old-package reopening or wholesale rerun |

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
- UC-001: standalone Team Run/configuration/new-conversation entry and first required configured-member work (BEH-001).
- UC-002: retain the selected Org/member context while ordinary mounted-Team/task work publishes background updates; verify explicit navigation (BEH-002).
- UC-003: new standalone native Agent draft text upload → first Send → immediate sent-chip Open, with reopen continuity (BEH-003).
### Out Of Scope
- Reopening AORG-FLAT-TEAM-001 or changing its original API38 results, accepted closure or delivery records.
- Extending the standalone-Team activation correction to all Org placements/task executions without evidence and a separate approved scope decision. The existing Org launch remains full-scope and initially unfocused.
- Restoring configured nested Teams; adding an Org coordinator, mounted-Team lifecycle/root, new ledger, or alternative runtime ownership.
- Redirecting text/JSON attachments into Files; image/audio/video or unknown-file ingestion; new models/providers or general upload redesign.
- External public/private definition repositories, live data repair, migration/reset/replay/backfill, app restart/cutover/release/deployment. The old actual-installation gate is not waived.
- Broad history/navigation/performance refactoring or automatically rerunning all prior package tests.
### Non-Goals
No new Product prototype, visual invention, root-cause attribution to a particular prior revision without evidence, or guarantee that non-reproduction proves a fix.
### Preserved Behavior Boundary
BEH-001–003 preserved columns and REQ-006 govern: flat coordinator-led Team; coordinator-free Org; exact configured/task identities; existing accepted messages/task history, attachments, focus/command/Stop/Restore ownership and user-initiated navigation. Root availability is not equivalent to all members running. Do not preserve the identified standalone eager-start defect merely because it currently reports truthful Idle.
### Review Authority
Every blocking correction must trace to an approved REQ/AC or preserved BEH here. New behavior, compatibility, security, migration or operational obligations require Requirements re-entry and user approval; incidental concerns may be recorded separately. Downstream review does not amend product intent or this ticket's scope.

## Requirements
| ID | Requirement | BEH | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | Creating/configuring/launching a fresh standalone Team and inspecting its members, before work needs them, must not start every configured Agent merely to populate the UI. Unused members remain unstarted and display established gray/Offline in both tree and selected-member view. Team root availability may remain active. | BEH-001 | Must | User intake; INV-002–003 |
| REQ-002 | First supported work for an exact standalone Team member can start that member normally and shows actual initializing/working/idle/error states as applicable. Other unused members remain Offline until work requires them. A handoff or accepted inter-Agent input counts as real work; lack of a human message alone must not mask an already working Agent. | BEH-001 | Must | Original Team parity; INV-003 |
| REQ-003 | While the selected Org/member still exists, incidental mounted-Team/task status or message publication must not select an earlier Team/root/member, replace the selected conversation, discard its unsent draft, or force reload. Updated data remains visible within its correct scope. | BEH-002 | Must | Explicit requested context stability; INV-004–005 |
| REQ-004 | Explicit supported navigation remains effective. Background updates from the former selection must not override the user's later deliberate choice; truthful transitions to retained history within the same selected identity are not forbidden. | BEH-002 | Must | Preserved selection/command language; INV-005 |
| REQ-005 | After a successful first normal text Send in a new standalone Agent run, the live sent attachment chip must immediately open the finalized, correctly associated file with its original contents, without reload/reselect/resend. Ordinary later reopen must retain the same content/association. | BEH-003 | Must | API-FIND-040 and user intake; INV-006–007 |
| REQ-006 | Preserve existing uploaded text/JSON separate-link behavior and data/identity boundaries for all affected flows. No duplicate accepted input, fabricated file, data loss, hidden resend, broad fallback or mounted-Team root may be introduced as a workaround. | BEH-001–003 | Must | Intake exclusions; old completed contract, narrowed preserved boundary |

## Acceptance Criteria
| ID | REQ | BEH / SCN | Preconditions and trigger | Observable expected outcome | Alternate / failure and verification intent |
| --- | --- | --- | --- | --- | --- |
| AC-001 | 001,006 | 001 / 001 | Normal UI: fresh standalone Team, valid config, launch; do not send. Expand/select configured members. | Root is available under existing Team semantics; each unused member is gray/Offline in tree and center. Runtime evidence corroborates no member start due solely to launch/inspection. | A color-only change with prepared/active members is not success. Use a representative current Codex Team matching the prior observation; do not claim every provider is covered. |
| AC-002 | 002,006 | 001 / 002 | From AC-001, send one normal message to an exact member, then use existing supported communication/handoff to another unused member. | Required member(s) start and process input normally; unrelated unused members remain genuinely Offline. Actual active/error status is not hidden by a pre-message rule. Exact recipients and accepted message count remain correct. | Observe actual lifecycle plus displayed status, not just CSS. Existing error handling remains truthful when activation fails. |
| AC-003 | 003,006 | 002 / 003 | A prior standalone Team exists; user focuses a mounted Agent in an Org. Ordinary existing task/member work publishes status/message updates while user remains in that conversation, including a new unsent draft. | Same root, exact member/conversation, selection and draft survive; correct background rows update. No unsolicited switch to the prior Team or reload. | Repeat with the relevant normal ordering discovered during investigation. Record causes/evidence; one non-reproduction cannot close the issue as fixed. |
| AC-004 | 004,006 | 002 / 004 | During continuing background work, user explicitly chooses another supported run/member, then returns via normal history/sidebar. | Each explicit selection takes effect; late publications do not pull focus back or redirect to an unrelated run. Existing active/history state is represented truthfully. | Do not require URLs to remain byte-identical or suppress real status transitions. Verify selected identity and displayed content. |
| AC-005 | 005,006 | 003 / 005 | Agents catalog → Run → native AutoByteus / DeepSeek V4 Flash (if available in isolated setup) → upload known .txt in new draft → first Send → actual reply → click that sent chip, with no prior reload. | First Open succeeds with final file's exact original bytes and correct run association; no obsolete draft404 and no second Send. | Real GUI/network/file evidence must correlate the sent chip with the observed Open. A unit helper result or raw final URL fetch alone does not satisfy this. Runtime/provider unavailable is an explicit validation limitation, not a Pass. |
| AC-006 | 005,006 | 003 / 006 | After AC-005, normal reload/reselect/history open of that same conversation. | Same single accepted input and file content/association remain available. Text/JSON separate-link opening stays unchanged. | No replay, stored-trace rewriting, Files-tab reroute or inference of image/unknown-file coverage. |
| AC-007 | 001–006 | 001–003 / 001–006 | Focused validation of touched surfaces. | Desktop evidence covers all three primary journeys; targeted narrow-layout checks cover affected selection/status/attachment interactions without losing controls or scope. Durable regressions correspond to established causes. | This is bounded responsive regression coverage, not a claim the original bugs independently occurred on narrow/Org/task attachment paths. API/E2E selects a proportionate matrix; no automatic old whole-suite replay. |

## Relevant Scenarios And Journeys
All below are **Supported Normal Scenarios**, grounded in the user's intake and production UI evidence, not internal calls as product requirements.
| SCN | Kind / actor / goal | Entry and starting condition | Product-level sequence and outcome | Supported alternate / evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User; start a Team without starting work | Team catalog/detail or existing new-run action; valid reusable flat Team | Configure → launch/new conversation → inspect member rows → available root with unused members Offline | Configuration validation remains; no implicit message. INV-002–003 | 001,006 / 001,007 |
| SCN-002 | User/System; use the prepared Team when needed | SCN-001 Team; supported Send/handoff/inter-Agent input | Address exact member → start/process accepted work → communicate to another member when needed → unaffected members remain unused | Already required work is not hidden; no synthetic internal activation as scenario. INV-003 | 002,006 / 002,007 |
| SCN-003 | User/System; work uninterrupted in an Org | Prior Team history plus active Org with mounted flat Team/task work | Focus exact Org member → ordinary background work publishes updates → retain selection/conversation/draft while updates appear | Original single failure and separate non-reproduction both retained. INV-004–005 | 003,006 / 003,007 |
| SCN-004 | User; change working context deliberately | Same background work as SCN-003 | Explicitly choose another run/member → let background updates arrive → return normally | Preserve legitimate active/history transitions; no auto-selection fallback. INV-005 | 004,006 / 004,007 |
| SCN-005 | User; read the text just sent | New standalone native Agent draft, available DeepSeek, known text fixture | Upload → first Send → actual reply → immediate sent-chip Open → original final bytes | Send/upload failure is not successful acceptance and must not fabricate saved access. INV-006–007 | 005,006 / 005,007 |
| SCN-006 | User; revisit the same sent file | Successfully accepted SCN-005 run | Normal reload/reselect/history → open retained chip → same original content, no resend | Does not substitute for SCN-005 immediate-live proof. INV-006 | 005,006 / 006,007 |

## UI, Interaction, And Experience Requirements
Applicable: Yes. Use the existing production Team/Org Workspace, status text/dots, composer and attachment interaction language. No additional dashboard or visual redesign is requested. New Product request/prototype/ticket/commit/UI approval: **N/A — not applicable**. The original screenshot and accepted separate-link behavior are comparison evidence, not authority for incidental fixture content/layout changes. Preserve available labels/accessibility, tree/center status consistency and usable narrow controls on touched surfaces. No new visual decision is required.

## Quality And Non-Functional Requirements
| ID | Area | Constraint | Verification |
| --- | --- | --- | --- |
| QR-001 | Reliability | Lifecycle, selected identity and file access reflect actual state in SCN-001–006. No silent fallback that masks these defects. | Correlate GUI results with runtime/network evidence; preserve negative observations. |
| QR-002 | Operability | Reproduction uses isolated test definitions/data/workspaces and owned processes. Old archived evidence and other-owner live sessions are not repair targets. | New evidence records setup/artifact pin and cleanup; no production-data reset/replay. |

## Data Continuity And Acceptable Loss
Existing run/member identities, provider bindings, accepted conversations/tasks, file contents/associations, configuration and selected-context drafts must be preserved. Acceptable loss/reset/backfill: **none authorized**. No stored-file loss was observed for API-FIND-040. Runtime activation touches identity/persistence invariants; Architecture must verify required preservation without presupposing a migration. Old external data repositories and actual-installation cutover remain outside this ticket.

## External Contracts And Dependencies
- Current Team V2 / Org V1 execution-tree contracts and flat/coordinator boundaries remain unchanged unless a separate approved requirement is obtained.
- Required native DeepSeek model availability/credentials are an isolated validation prerequisite, not assumed by this intake; no new image/provider work is authorized.
- Authoritative original comparison is pinned `5645b49d6f51faa60bd3545bc8e3f0e7e3f96793`; it is not this ticket's base and no historical executable rerun is claimed.

## Supplemental Artifacts
| Artifact | Purpose | Status / approval |
| --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/collaboration-follow-up-fixes/tickets/in-progress/collaboration-follow-up-fixes/intake/user-request.md` | Byte-preserved new-ticket authority and original scope | User-request evidence; not a competing behavior specification |
| `/home/autobyteus/workspace/.codex/worktrees/collaboration-follow-up-fixes/tickets/in-progress/collaboration-follow-up-fixes/intake/evidence-index.json` | Exact scoped source/evidence paths, pins and hashes | Supporting investigation evidence; not new validation |
| `/home/autobyteus/workspace/.codex/worktrees/collaboration-follow-up-fixes/tickets/in-progress/collaboration-follow-up-fixes/investigation-notes.md` | Canonical current behavior, evidence/limits and deferred technical questions | RER-001 approval basis for scope facts |
| `/home/autobyteus/workspace/.codex/worktrees/collaboration-follow-up-fixes/tickets/in-progress/collaboration-follow-up-fixes/requirements-revision-record.md` | Requirements round/approval traceability | RER-001 |

## Assumptions And Open Decisions
- ASM-001: New remote base remained `345d8e0befabe68052ff0e42d0ec9a560ef85326` at setup; verified. Old retained workspace and completed package are separate/read-only.
- ASM-002: Existing Team lazy-member behavior is the intended standalone correction, not merely recoloring. Presented in REQ-001–002 for explicit baseline approval.
- DEC-001: Approve RER-001's bounded intended outcomes? User; pending. No other new visual/policy choice is proposed.
- Technical unknowns (not invented product decisions): precise navigation cause/reproduction ordering; attachment live-reference divergence; safe standalone activation correction while preserving Org/task ownership. Architecture/Engineering owns resolution.

## Traceability
| REQ | UC / BEH | AC | SCN | Evidence |
| --- | --- | --- | --- | --- |
| 001 | 001 / 001 | 001,007 | 001 | INV-002–003 |
| 002 | 001 / 001 | 002,007 | 002 | INV-003 |
| 003 | 002 / 002 | 003,007 | 003 | INV-004–005 |
| 004 | 002 / 002 | 004,007 | 004 | INV-005 |
| 005 | 003 / 003 | 005–007 | 005–006 | INV-006–007 |
| 006 | 001–003 / 001–003 | 001–007 | 001–006 | User intake and preserved boundaries |

## Downstream Architecture Input
After approval, map SCN-001–006 to actual production paths. Investigate standalone lifecycle readiness/bindings versus root availability, selected-context ownership during publication, and first-submission attachment presentation versus final persisted facts. This document does not prescribe files, switches, patch shape, watchers or service composition. A cosmetic Offline override, forced reload, hidden resend or suppressed events is not an acceptable substitute for the required outcomes.

## Readiness Check
Current behavior evidence, desired/preserved outcomes, bounded scope, linked/testable ACs and supported scenarios: Yes. Source/evidence uncertainty visible: Yes. New Product artifact: N/A. New executable reproduction: not performed in Requirements; existing primary observations retained, focused fresh reproduction required downstream. User approval of this baseline: No. Ready for approval: Yes. Ready for downstream handoff: No, pending DEC-001.

## Architecture Design Routing Assessment
Not yet performed: the skill requires user approval first. Assessment status: pending approval; preliminary size/risk and selected route: N/A at this stage, not inherited automatically from the old Large/High package. Investigation identifies a real lifecycle/identity-publication surface plus navigation/attachment continuity concerns. These facts must be assessed after approval; no direct-implementation authorization is inferred from the three issues appearing visually small.
