# Requirements — Electron host file preview regression

## Document Status
- Package identifier: `electron-host-file-open`
- Status: **Approved**
- Current solution revision: SR-004 (approved requirements baseline R1 from SR-001/SR-002, 2026-10-06).
- Owner: Solution Designer.
- Authorities read: solution-designer SKILL.md; references/requirements-engineering.md; root AGENTS.md, DESIGN.md, TESTING.md; web/server AGENTS.md (2026-10-06).
- User approval: **Received** in current user follow-up “...go ahead because it's very clear.” Exact basis R1 (SR-001, evidence-only SR-002); approval and reproduction-disclosure reference: user-approval-r1.md.
- Behavior-defining supplements: None. Screenshot and probe are evidence, not a visual design baseline.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open`; branch `codex/electron-host-file-open`.
- Refreshed base: origin/personal at `30c3f40d5721124c466d464004b004053173280c`; finalization target origin/personal.

## Problem And Desired Outcome
The user clicks an absolute Markdown file path in a selected Team member's Event Monitor in macOS Electron and sees “This file is available only on the host workspace.” The user reports a native server, not Docker. The warning does not establish that the server is containerized or remote.

Restore the supported native desktop workflow: explicit activation of a supported readable local file opens its read-only preview in Files, without being falsely rejected solely because selected-agent workspace metadata is absent/incomplete. Preserve remote/browser/mobile containment and current native validation. Exact installed-app runtime state remains unverified; see investigation.

## Relevant Current, Desired And Preserved Behavior
| ID | Kind / scenario | Current evidence-backed behavior | Desired behavior | Preserved behavior |
| --- | --- | --- | --- | --- |
| BEH-001 | User; SCN-001 | Launcher ignores config.workspaceId when active target exists, suppresses workspace getter fallback, and can reject before testing native capability. Controlled baseline produces the exact warning with a trusted embedded runtime. | Native host preview remains usable for selected Agent/Team/Org/task members despite missing/incomplete workspace metadata. | Explicit activation, shared read-only Files preview, center conversation and selected member remain intact. |
| BEH-002 | Contract; SCN-002/003 | Browser/remote/mobile map paths inside the selected workspace before authorized content access; unmapped candidates are refused. | Unchanged. | No arbitrary remote absolute-file reads and no client-local fallback for a remote node. |
| BEH-003 | User/contract; SCN-004 | Native byte readers validate absolute path, existence, readability, regular file; content failure is represented by viewer status. | Missing/unreadable local files show the ordinary failure state, not a false claim that the client is not the host. | Native validation, type eligibility, no changes to external-link navigation or structured reference/artifact behavior. |

## Stakeholders And Outcomes
Desktop user wants to inspect the file explicitly linked by an Agent. Native/server byte readers retain their existing authorization responsibilities. Other clients retain workspace-relative restrictions.

## Scope Guardrail
### In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Activate a supported absolute local file link from the selected run/member Event Monitor in native embedded Electron. | SCN-001/004 |
| UC-002 | Preserve the existing selected-workspace-only preview behavior of browser/remote/mobile clients. | SCN-002/003 |

### Out Of Scope
- Granting arbitrary filesystem access to browser, phone or remote-node windows (including a separately configured loopback node without established trusted-local identity).
- Docker/server deployment changes, generic OS file launching, new file types, editable incidental previews, migration or persistence changes.
- Reworking all run hydration, File Explorer, reference attachments or unrelated links as a cleanup project.
- Publishing a release or modifying the user's running app/data during investigation.

### Non-Goals
No general-purpose preview framework or performance target. No guarantee of support for every native OS/codec beyond existing product contracts.

### Preserved Boundary And Review Authority
BEH-002/003 and REQ-002/003 govern preserved guarantees. Do not fall back to an unrelated execution's workspace to make a preview appear to succeed. Blocking downstream findings must cite these approved IDs once approved. New access policies or adjacent reliability improvements are Requirement Gaps requiring renewed user approval.

## Requirements
| ID | Intended behavior | Behaviors | Priority / rationale |
| --- | --- | --- | --- |
| REQ-001 | Explicitly activating an eligible readable absolute path in a native embedded Electron Event Monitor opens the selected file read-only in Files even when selected-member workspace metadata is unavailable/incomplete. | BEH-001 | Must; restore user-reported desktop workflow. |
| REQ-002 | Preview stays associated with the selected execution; center conversation/selection and existing tabs remain intact; reopening the same file reuses its tab. Passive rendering never reads a file. | BEH-001 | Must; existing incidental-preview contract. |
| REQ-003 | Retain trusted native validation and browser/remote/mobile selected-workspace containment; do not read a remote execution's path from the desktop host as a fallback. | BEH-002/003 | Must; existing runtime boundary. |
| REQ-004 | Local missing/unreadable/non-regular file failures remain user-visible through the ordinary localized preview error rather than falsely reporting a host-only restriction. | BEH-003 | Must; distinguish content failure from access-runtime refusal. |

## Acceptance Criteria
| ID | Requirements / behaviors / scenarios | Preconditions and trigger | Observable result / alternate | Verification intent |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001/002; BEH-001; SCN-001 | Native embedded Electron; selected member; eligible readable .md file; full selected workspace metadata; explicit click or keyboard activation. | Correct file is visible read-only in Files; conversation/member selection unchanged. | Current-worktree isolated desktop journey. |
| AC-002 | REQ-001/002; BEH-001; SCN-001 | Same supported workflow while selected-member metadata is missing/incomplete (including known workspace identity). | Correct local preview opens, without the false host-only warning or use of an unrelated workspace. | Owner regression tests plus isolated native product journey using test-owned context/file. |
| AC-003 | REQ-002; BEH-001; SCN-001 | File reopened; existing user tab; ordinary passive message rendering. | Preview deduplicates; user tab survives; passive rendering performs no file read. | Existing assertions plus focused regression. |
| AC-004 | REQ-003; BEH-002; SCN-002 | Browser/remote/mobile path maps within selected authorized workspace; activation. | Existing relative-route/read-only flow remains functional, with no native read. | Focused renderer/mapper coverage; relevant browser/system probe. |
| AC-005 | REQ-003; BEH-002; SCN-003 | Browser/remote/mobile path is outside selected workspace; or native bridge absent. | Unmapped candidate remains unavailable/copyable; no arbitrary absolute-byte request/native fallback or wrong-context preview. | Negative boundary assertions; no weakening of byte-reader tests. |
| AC-006 | REQ-004/003; BEH-003; SCN-004 | Native eligible path points to missing/unreadable/non-regular file; activation. | Existing visible preview error; no bytes leaked; native validation remains intact. | Existing native validation tests and focused product error case. |

## Supported Scenarios And Journeys
| ID | Actor / goal | Trigger / starting condition | Product sequence and expected outcome | Alternate / validity / evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | Native desktop user inspecting an Agent-produced file. | Selected Agent/Team/Org/task member; eligible absolute path in Event Monitor. | Activate link, view correct read-only file in Files without changing conversation/member. | Supported Normal Scenario. User request/screenshot; file_explorer.md and content_rendering.md documented embedded preview. Missing metadata is an internal failure condition, not a new user workflow. |
| SCN-002 | Browser/remote/phone user inspecting workspace content. | Selected context and path inside its authorized workspace. | Activate link; existing client-appropriate read-only Files preview via selected workspace. | Supported Normal Scenario; existing documentation and launcher contract. |
| SCN-003 | Browser/remote/phone user encounters a host-only path. | Path outside selected workspace, explicit activation. | Localized unavailable state; original content remains copyable; no arbitrary host access. | Supported Explicit Edge Scenario; explicit existing workspace-access contract in file_explorer.md. |
| SCN-004 | Native user encounters an unavailable local file. | Eligible path deleted/unreadable/non-regular when activated. | Localized viewer failure without unauthorized content. | Supported Explicit Edge Scenario; current native file validation and viewer failure contract. |

## UI And Interaction
Corrective behavior only; retain existing Files viewer, read-only controls, focus/keyboard behavior, and warning/error presentation. Product Team support was not requested. External UI/UX spec, visualizer, design repo, product ticket, visual approval: **N/A — not applicable**. Screenshot is symptom evidence, not an instruction to redesign the UI.

## Quality, Data And Contracts
- Native and remote access guarantees: REQ-003 / AC-004–006.
- Persisted or external data affected: **No**. No accepted data loss. Preserve conversations, files, references, artifacts and workspace records; incidental previews remain transient.
- Existing contract: embedded local capability is supplied by trusted Electron bridge plus embedded-node binding, not Docker detection. Separate remote windows remain remote even inside Electron.
- External model/provider: not needed for this correction's deterministic evidence.

## Evidence Supplements And Assumptions
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/investigation-notes.md`: canonical evidence, owned by Solution Designer; non-behavior-defining.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-host-file-open/tickets/in-progress/electron-host-file-open/evidence/baseline-owner-probe.cjs` and `.json`: controlled unchanged-source reproduction; non-behavior-defining, no user approval needed for evidence.
- Screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_5f305ef437574859b26f46b8bf36740b/solution_designer_d8f96b3e1cb04d7a932d86e4fcc75eda/context_files/ctx_dce19a48b3ee__image.png`; user evidence only.
- ASM-001: Missing selected-member metadata may explain the screenshot. Controlled code path is proven; the screenshot's exact bound node/capability/config is not known. Verify through owned native reproduction, not tests against the user's app.

## Open Decisions And Architecture Input
- DEC-001: User approval of unchanged baseline R1 received; see user-approval-r1.md (2026-10-06).
- Technical work after approval: establish the selected-context identity/metadata and Files presentation path; decide the smallest correction that realizes REQ-001 without wrong-context fallback. Do not assume a local preview can use an empty workspace ID; current store/UI are workspace-scoped.
- Separately configured local-native node semantics are not expanded here; investigate if actual symptom is a remote-node binding rather than the reproduced metadata class.

## Traceability
| Requirement | Use cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001/002 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-001/002/003 | SCN-001 |
| REQ-003 | UC-001/002 | BEH-002/003 | AC-004/005/006 | SCN-002/003/004 |
| REQ-004 | UC-001 | BEH-003 | AC-006 | SCN-004 |

## Readiness
Current behavior evidence-backed, desired/preserved behavior explicit, scope clear, criteria traceable/testable, supported scenarios identified, uncertainty visible: **Yes**. Product design applicability: **N/A**. Content ready for approval: **Yes**. Approved basis ready for design: **Yes — R1 approved; user-approval-r1.md**. Design: **Ready D2 at design-spec.md**, task_size Medium / architectural_risk Low; independent review applicability determined by handoff rules, recorded in architecture-design-complete.md. Requirements remain R1; no intended behavior change.

## Evidence-Only Follow-Up SR-002
Historical source probe dates the false refusal to 3d59992a4 (Sept 1 2026), integrated into personal Sept 21, first containing release tag v1.4.70. v1.4.69 source opens the same controlled path. Dynamic collaborator contexts added Oct 1 (bcff48200) may explain more recent visibility; exact user runtime attribution remains uncertain. See historical-investigation-result.md and canonical investigation E-012–015. Intended behavior/ACs/R1 approval basis unchanged; approval still pending.

## SR-003 Approval Capture
User go-ahead authorizes R1 corrective scope; see user-approval-r1.md. Earlier pending-status statements in the SR-002 historical follow-up describe that earlier round, not current status. No requirements behavior changes. Design phase may now proceed; exact installed-runtime attribution remains uncertain and validation must not overclaim.

## Approved Architecture Basis
R1/SR-003 is approved and internally consistent. D2 maps all approved behavior to existing selected-context, Files and byte-access owners; see design-spec.md. The exact installed-state assumption remains a disclosed validation limitation, not an approval gap.

## SR-004 Design-Only Recovery
IR-001 / DI-001 native evidence showed correct selected bytes but no automatic Files drawer reveal. D2 completes that technical presentation path. R1 intended behavior, stable IDs, supported scenarios and user-approval-r1.md are unchanged: AC-001/002 already require visible content, AC-006 already requires visible ordinary error. No new visual/access policy or behavior-defining supplement; renewed approval is not required. IR-001 is partial implementation evidence, not acceptance completion.

Reported user clarification, received via Implementation Engineer at user-drawer-clarification.md (commit887417ee1): “ahhh. okayy. basilaly click the file will open the file drawer good notice”. This confirms the same one-activation visible preview in the default drawer presentation, not an instruction to replace fitting desktop docks or change mobile UI. Recorded as clarification evidence, not a new R2 or release authority.
