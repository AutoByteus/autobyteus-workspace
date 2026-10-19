# Requirements Document — File Reads Name The Run They Belong To

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003` (factual corrections to BEH-002/BEH-003 and DEC-003 evidence; AC-003, AC-005 and AC-007 wording made explicit for task agents and running owners. Intended behavior unchanged; the SR-002 approval still applies)
- Package identifier: `run-file-change-owner-scoped-reads`
- Request / ticket: Project Task "File reads should name the run they belong to (today each read searches every saved run, about 1–2 s)" — FU-3 of autobyteus-93 (e6985045)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's request of 2026-10-18
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: Solution Designer conversation message of 2026-10-19 that informs the user of this approval and its decisions (SR-001 → SR-002)
- Exact approved requirements baseline / solution revision: this document at SR-001 (approved in SR-002)
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- Problem: when the app reads the file list or a file's content of an agent that lives inside another run (a delegated copy, a team member, an org member), the server receives only the agent's run id. It then searches every saved team, org and standalone-run tree to find where that agent lives. On the user's machine this takes about 1–2 s per read (680 saved team runs) and keeps growing.
- Affected actors or systems: the user, in the desktop Artifacts tab and the mobile Artifacts view; the server's file-change reads.
- Desired outcome: every file-change read names its owner — the standalone run itself, or the team run, org run or standalone run (hub) that holds the agent, plus the agent. The server reads only that owner's saved tree. No read searches all saved runs.
- Observable definition of success: opening the files (list and content) of a copy, a team member or an org member takes well under a second on a realistic data set, and the time does not depend on how many other runs are saved.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Copy file content: server scans all saved trees (~2 s) | Request names the hub and the copy; one hub tree read | Same bytes, same 404/409 rules | Notes BEH-001 |
| BEH-002 | User | SCN-002 | Team member file list: served live by run id while the member's own run is active; otherwise a scan per member | Request names the team run; one team tree read | Same entries; best-effort hydration of members | Notes BEH-002 |
| BEH-003 | User | SCN-002 | Team member file content: served live by run id while the member's run is active; otherwise a scan, and a team task agent's file answers 404 for lack of a workspace root | Request names the team run; one tree read; task agents' files show like configured members' | Same bytes; 404 for a missing file | Notes BEH-003 |
| BEH-004 | User | SCN-003 | Org member file list: scan per member | Request names the org run and member; one org tree read | Same entries | Notes BEH-004 |
| BEH-005 | User | SCN-003 | Org member file content: scan | Request names the org run and member; one tree read | Same bytes | Notes BEH-005 |
| BEH-006 | User | SCN-004 | Standalone run list and content: no scan | Unchanged; a run-id-only read means "this standalone run" and nothing else | All current outcomes | Notes BEH-006 |
| BEH-007 | User | SCN-001 | Copy file list: hub-scoped (autobyteus-93) | Unchanged | All current outcomes | Notes BEH-007 |
| BEH-008 | User | SCN-002 | Team member conversation and older event-monitor pages: lookup searches saved team trees until found | The same lookup uses the named team run only | Same projection and pages | Notes BEH-008 |
| BEH-009 | User | SCN-005 | Mobile Artifacts view: same paths as desktop | Same owner-scoped reads | Mobile list and viewer behavior | Notes BEH-009 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | See what an agent wrote and open its files | Files appear and open quickly in every kind of run | No visible flow change |
| Server | Serve file lists and content | Cost independent of unrelated saved runs | No storage change |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Open a file of a delegated copy (task agent or task-team member under a standalone run) | SCN-001 |
| UC-002 | Open a team run's member (including the team's task agents): its file list, its files, its conversation and older event-monitor pages | SCN-002 |
| UC-003 | Open an org run's member (including the org's task agents): its file list and its files | SCN-003 |
| UC-004 | Open a standalone run's own file list and files (preserved) | SCN-004 |
| UC-005 | The same reads from the mobile Artifacts view | SCN-005 |
| UC-006 | A read that names no owner, or names the wrong owner, gets no other run's files and costs no search | SCN-006 |

### Out Of Scope

- Context-file (attachment) reads, whose team-member owner lookup also searches across families (`context-file-owner-resolver.ts`): follow-up FU-A.
- Loading team and org members only when opened (autobyteus-93 FU-1), the hub message log payload (FU-2), the "Show Task in Projects" wait (FU-4).
- Other server lookups that search all saved runs (for example token-usage or messaging lookups) unless they are the file-change reads above or the team-member view lookup of UC-002.
- Any storage layout or migration change.

### Non-Goals

- No new caching or index of run locations.
- No promise of a specific latency beyond QR-001.

### Preserved Behavior Boundary

- BEH-006 and BEH-007 outcomes; REQ-008 response rules; the list and content each user sees today for each run (same entries, same bytes).
- Containment (DESIGN.md rule 7): scans that remain still skip an unreadable run with a warning; a read that names one owner whose tree cannot be read reports that owner's error.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Reading a delegated copy's file content names the hub (standalone run) and the copy (member address and agent run); the server reads only that hub's saved tree to find it | BEH-001 | Must | Removes the scan | Task direction |
| REQ-002 | Reading a team member's file list or file content names the team run and the agent run; the server reads only that team run's saved tree (or its live tree while it runs) | BEH-002, BEH-003 | Must | Removes the scan | Task direction |
| REQ-003 | Reading an org member's file list or file content names the org run, the member address and the agent run; the server reads only that org run's tree | BEH-004, BEH-005 | Must | Removes the scan | Task direction |
| REQ-004 | Locating a team member for its conversation and older event-monitor pages uses only the named team run | BEH-008 | Should | Same lookup as REQ-002; opening a member would otherwise still search saved team trees | DEC-004 |
| REQ-005 | A file-change read that names only a run id serves that run only when it is a standalone run (running or saved); for any other run id it returns no files (list) or "not found" (content), without searching saved team, org or hub trees | BEH-006 | Must | "A read never searches every saved run" | DEC-002 |
| REQ-006 | A read that names an owner and an agent that is not in that owner returns an error (list) or "not found" (content); it never returns another run's files | BEH-001..BEH-005 | Must | Correct scoping | DEC-006 |
| REQ-007 | The app sends the owner with every file list and file content read, from desktop and mobile, for standalone runs, copies, team members and org members; the user sees the same lists and files as today | BEH-001..BEH-009 | Must | The app already knows the owner | DEC-001 |
| REQ-008 | Content response rules are the same for every owner: file bytes with the right type when the file exists; "not ready yet" (409) for a pending or streaming file while its owner runs; "not available" (404) when the file is gone; "not found" (404) when the path is not a recorded file change of that agent | BEH-001..BEH-006 | Must | One policy | DEC-003 |
| REQ-009 | While a team run or org run is running, its members' file lists come from the live record (as standalone runs and copies already do); when it is not running, from the saved record | BEH-002, BEH-004 | Should | Consistency across similar surfaces | DEC-003 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-007, REQ-008 | BEH-001 / SCN-001 | A hub with copies; the user opens a copy's file in the Artifacts tab | The file content shows; the request names the hub, the copy's member address and agent run; the server reads only that hub's tree | A copy file whose file was deleted shows "not available" | Server E2E + web component test + browser probe |
| AC-002 | REQ-002, REQ-007 | BEH-002 / SCN-002 | A saved team run; the user opens it | Each member's file list loads through a team-scoped read; same entries as before | — | Server E2E/integration + web unit tests |
| AC-003 | REQ-002, REQ-007, REQ-008 | BEH-003 / SCN-002 | The user opens a team member's file: a configured member and a team task agent, each with the team saved and with it running | Content shows via a team-scoped request; only that team's tree is read; workspace-relative files resolve against the member's own launch workspace | Pending file while the team runs → "not ready yet" | Server integration + web component test |
| AC-004 | REQ-003, REQ-007 | BEH-004 / SCN-003 | A saved org run; the user opens it | Each member's file list loads through an org-scoped read | — | Server E2E/integration + web unit tests |
| AC-005 | REQ-003, REQ-007, REQ-008 | BEH-005 / SCN-003 | The user opens an org member's file: a configured member and an org task agent, each with the org saved and with it running | Content shows via an org-scoped request; workspace-relative files resolve against the member's own launch workspace | Pending file while the org runs → "not ready yet" | Server integration + web component test |
| AC-006 | REQ-005, REQ-008 | BEH-006 / SCN-004 | A standalone run, running and saved | List and content behave exactly as today (including 409 and 404 cases) | — | Existing server integration tests stay green |
| AC-007 | REQ-005 | SCN-006 | A run-id-only list or content read with a team, org or copy member's run id, both with the owner saved and with the owner running (member run active) | List returns empty; content returns 404; no team, org or hub tree is read (provable by a read count or spy) | A hub's own run id is still served (AC-006), running or saved | Server unit/integration test |
| AC-008 | REQ-009, REQ-008 | BEH-002, BEH-004 / SCN-002, SCN-003 | A running team or org whose member has a pending or streaming file | The member's list includes it; opening it answers "not ready yet" | After the run stops, the saved list is returned | Server integration test |
| AC-009 | REQ-006 | SCN-006 | A read names an owner and an agent from another run | List read errors; content read 404; no file of the other run is returned | — | Server unit/integration test |
| AC-010 | REQ-001..REQ-004, QR-001 | SCN-001..SCN-003 | A realistic data set: hundreds of unrelated saved team runs (the user's machine has 680) plus a hub with copies, a team run and an org run | Each owner-scoped list and content read completes in under 0.5 s server time, and does not grow when the number of unrelated saved runs grows (compare a small and a large seed) | — | API/E2E timing, baseline vs fixed build |
| AC-011 | REQ-004 | BEH-008 / SCN-002 | The user opens a team member's conversation and older event-monitor pages | Same content; the lookup reads only the named team run's tree | A run id that is not in the named team → the same error as today | Server unit test |
| AC-012 | REQ-007 | BEH-009 / SCN-005 | Mobile Artifacts view of an agent run and of a team run member | Files open through owner-scoped requests | — | Web component test |
| AC-013 | Preserved boundary | SCN-006 | A saved hub whose tree cannot be read exists next to readable ones | Remaining scans still skip it with a warning naming it; a read that names it reports its error; other runs' files open normally | — | Containment server E2E kept green |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | See what a delegated copy wrote | Workspaces sidebar → standalone run → copy row → Artifacts tab → click a file | A standalone run that delegated work | Select copy → list loads (autobyteus-93) → click file → content shows | Content shows well under 1 s | File gone → "not available"; pending while the hub runs → "not ready yet" | Supported Normal Scenario | User request (FU-3); autobyteus-93 | REQ-001, REQ-007, REQ-008; AC-001, AC-010 |
| SCN-002 | User | User | See what a team member wrote and said | Sidebar → team run → member → Artifacts tab / conversation / event monitor | A team run, running or saved | Open team → member lists load → select member → open a file / load older pages | Lists and content well under 1 s each | Pending file while the team runs → "not ready yet" | Supported Normal Scenario | Task "Who is affected" | REQ-002, REQ-004, REQ-009; AC-002, AC-003, AC-008, AC-011 |
| SCN-003 | User | User | See what an org member wrote | Sidebar → org run → member → Artifacts tab | An org run, running or saved | Open org → member lists load → open a file | Same | Same | Supported Normal Scenario | Task "Who is affected" | REQ-003, REQ-009; AC-004, AC-005, AC-008 |
| SCN-004 | User | User | See a standalone run's own files | Sidebar → standalone run → Artifacts tab | A standalone run | Unchanged | Unchanged | Unchanged | Supported Normal Scenario | Existing behavior | REQ-005; AC-006 |
| SCN-005 | User | User (mobile) | Same as SCN-001/002/004 on mobile | Mobile work shell → Artifacts | Agent run or team run context | Same | Same | Same | Supported Normal Scenario | `MobileArtifacts.vue` | REQ-007; AC-012 |
| SCN-006 | Contract | Server API contract | A read must stay within its owner and never trigger a global search | Any client sending a run-id-only or mismatched owner read | — | Request → owner resolution → result | Empty / not found; no search | — | Supported Explicit Edge Scenario (API contract of the read surfaces; the web no longer sends such reads, other clients or stale tabs may) | DEC-002, DEC-006; DESIGN.md rule 3 | REQ-005, REQ-006; AC-007, AC-009, AC-013 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (no visible flow or layout change; only speed). Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001..REQ-004; AC-010 | Performance | Owner-scoped list and content reads: < 0.5 s server time each, and independent of the number of unrelated saved runs (one owner tree read per request) | Realistic seed: ≥ 500 unrelated saved team runs plus orgs and hubs; warm cache; changed build | API/E2E timing baseline vs fixed; read-count test |
| QR-002 | REQ-005; AC-007 | Performance | A run-id-only read performs zero team/org/hub tree reads | Any data set | Unit/integration spy |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (reads only).
- Data or state that must be preserved: all saved runs, file-change records and files, untouched.
- Loss acceptable: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| GraphQL and REST read surfaces (server ↔ web, same repository, shipped together) | New owner-scoped surfaces; run-id read narrowed to standalone runs; no compatibility fallback | DESIGN.md; design principles clean-cut rule | A web build older than the server would show no files for members until updated; the desktop app ships web and server together |
| Collaboration model | Owner tree records where each agent's data lives | `collaboration_model.md` | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| None behavior-defining | — | — | — | — |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Within one owner, an agent run id identifies one agent | Owner + agent run is enough to locate it | Existing location services already enforce single matches | Holds (code) |
| ASM-002 | No client other than `autobyteus-web` uses the file-change read surfaces | Clean cut | `git grep` across the repository (investigation notes) | Holds |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What identifies the owner of a read? | Must match how the app and server already name members | Options: a new owner model; or the existing one. The app already uses one owner subject per workspace target for event-monitor pages (`run`, `teamMember`, `agentOrgMember`, `standaloneMember`), and the server has one member-view service per family with these identity shapes | Reuse the existing owner identities: standalone run id; team run + agent run; org run + member address + agent run; hub + member address + agent run. No new concept for users or code | Solution Designer | Decided |
| DEC-002 | Does a run-id-only read keep a fallback search? | A fallback keeps the slow path alive and hides missing owners | Options: keep the scan as fallback; scoped-only. Direction: "a read never searches every saved run"; design rules forbid compatibility fallbacks | No fallback. Run-id-only means "standalone run"; other ids get no files / not found | Solution Designer | Decided |
| DEC-003 | While a team or org runs, is a member's list live or saved? And do content reads of a running team/org member answer 409 for pending files? | Today a member whose own run is active is served live by run id. A member whose run is not active is treated as "not running" by the scanning path, so a pending file answers 404 and the list omits unflushed entries (SR-003 correction). Copies and standalone runs already use live data | Options: keep saved-only for teams/orgs; or use the live record like copies | Use the live record while the owner runs. Same rules for every owner; the user sees "not ready yet" instead of "not available" for a file still being written | Solution Designer | Decided |
| DEC-004 | Is the team-member conversation lookup (same locator) in scope? | Opening a team member would still search saved team trees for its conversation | It is the same `requireLocation` the team file reads use; the change is to pass the named team run | In scope (REQ-004). Context-file lookups stay out (FU-A) | Solution Designer | Decided |
| DEC-005 | Content route shape? | Clients must name the owner | Precedent: context-file routes per owner (`/runs/…`, `/team-runs/…/agent-runs/…`, `/agent-org-runs/…/agent-runs/…`, `/agent-collaborations/…/agent-runs/…`) | Follow that precedent (technical detail in the design) | Solution Designer | Decided |
| DEC-006 | What does a read answer when the agent is not in the named owner? | Wrong-owner reads must not leak or search | Sibling member queries throw an error today | List: error, as sibling member queries do. Content: 404 "File change not found" | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-010 | SCN-001 | probe-run1.txt |
| REQ-002 | UC-002 | BEH-002, BEH-003 | AC-002, AC-003, AC-010 | SCN-002 | — |
| REQ-003 | UC-003 | BEH-004, BEH-005 | AC-004, AC-005, AC-010 | SCN-003 | — |
| REQ-004 | UC-002 | BEH-008 | AC-011 | SCN-002 | — |
| REQ-005 | UC-004, UC-006 | BEH-006 | AC-006, AC-007 | SCN-004, SCN-006 | — |
| REQ-006 | UC-006 | BEH-001..BEH-005 | AC-009 | SCN-006 | — |
| REQ-007 | UC-001..UC-005 | BEH-001..BEH-009 | AC-001..AC-005, AC-012 | SCN-001..SCN-005 | — |
| REQ-008 | UC-001..UC-004 | BEH-001..BEH-006 | AC-001, AC-003, AC-005, AC-006, AC-008 | SCN-001..SCN-004 | — |
| REQ-009 | UC-002, UC-003 | BEH-002, BEH-004 | AC-008 | SCN-002, SCN-003 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-006.
- Constraints: no storage change; no compatibility fallback; keep autobyteus-93's copy list path; containment rule 7.
- Deferred to design: interface and route shapes, where owner resolution lives, web owner propagation.
- Technical facts to verify: dead `getEntry`; codegen; containment e2e trigger.
- Risks: R-001..R-003 in the investigation notes.

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

- Approval recorded: `Yes` (Solution Designer within the direction; no `Needs user` decision; user informed in the conversation)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
