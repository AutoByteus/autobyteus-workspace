# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `html-preview-isolation`
- Request / ticket: Project Task `autobyteus-417` (FU-002 of autobyteus-403)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-07
- Approved by and reference: `User`; the user's messages of 2026-11-07 in the Solution Designer conversation, after the behaviour change was explained ("the majority of the functionality still works right?" → answered → "okayyyy. thats fine. because currently what i mostly use when i want to see those complicated ui is to ask agent to directly start a server and display in the browser area")
- Exact approved requirements baseline / solution revision: this document at SR-002 (DEC-001 = option A; DEC-006 added)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: The HTML preview gives the previewed page the app's own origin. Measured in Electron with the app window's settings: an artifact or reference preview reads the app window, calls the preload API (the call reaches the main process as the app window) and uses the node with full rights; a workspace file preview runs at the node's own origin, so its WebSocket and requests pass the node's Origin rule (e.g. the terminal WebSocket). In the phone web app, a preview shares the phone app's origin and can read the stored phone credential. Any HTML an agent writes, a cloned repository contains, or a download brings can do this.
- Affected actors or systems: the user previewing HTML; desktop app window and preload API; the bound node(s); the phone web app.
- Desired outcome: every previewed page runs isolated from the app and the node, while previews still show the agent's HTML with its scripts.
- Observable definition of success: a previewed page reports origin `null`; its attempts on the app window, preload API, app storage, node WebSocket and node API fail; a typical agent HTML page (inline/classic scripts, CSS, images, CDN libraries) still renders and runs.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-004 | Workspace file preview runs at the node's origin: full node rights; module scripts, `fetch`, storage work | Runs with an opaque origin; node refuses its WebSocket and API requests | Page renders; inline and classic scripts, relative CSS and images, CDN resources work | Probe `static/*` |
| BEH-002 | User | SCN-002, SCN-003, SCN-004 | Artifact / reference / local-file preview runs at the app window's origin: reads window, calls preload, app storage, node rights | Opaque origin; window, preload, storage and node refused | Page renders, inline scripts run | Probe `blob/*` |
| BEH-003 | User | SCN-002, SCN-004 | Phone web app: an HTML artifact preview shares the phone app's origin and its stored credential (phone references show HTML as code) | Opaque origin; credential unreadable | Phone artifact/reference preview renders | Read |
| BEH-004 | User | SCN-005 | Application iframe pages work | Unchanged | All | Read |
| BEH-005 | User | SCN-001…003 | Preview blocks popups, forms, dialogs, top navigation. A blob preview refreshes when its content changes (new Blob URL). A workspace preview does not reload when the open file changes (viewer keyed by workspace + file, same static URL re-assigned; `FileExplorerTabs.vue:31,177`, `HtmlPreviewer.vue` `updateSrc`); it shows the new version when the file is reopened or another tab is selected and back (corrected SR-004, R-3) | Unchanged | All | Read |
| BEH-006 | User | SCN-001 | Workspace HTML can be opened at its static URL outside the preview (in-app browser, a tab) and then has the node's origin | Runs isolated wherever it is opened | Content served unchanged | Read |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User (desktop, phone) | See agent HTML rendered | Preview works and cannot act as the app | Told before behaviour changes |
| HTML author (agent, repository, download) | Untrusted | Gets no app, preload or node rights | — |
| Node | Serves preview content | Refuses preview pages' requests | 403's Origin rule unchanged |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Preview a workspace HTML file (file explorer; desktop and browser) | SCN-001, SCN-004 |
| UC-002 | Preview an HTML artifact, team reference or collaboration reference (desktop); an HTML artifact (phone) | SCN-002, SCN-004 |
| UC-003 | Preview a local absolute-path HTML file in the desktop window | SCN-003, SCN-004 |
| UC-004 | Workspace HTML served by the node for the preview | SCN-001, SCN-004 |

### Out Of Scope

- Application iframe pages (`ApplicationIframeHost`) and their bridge.
- The node's Origin rule from 403, including the loopback-origin allowance (follow-up FU-001).
- The in-app browser's handling of arbitrary sites.
- Blocking previewed pages from sending their own content to the internet (RSK-001).
- Markdown preview (already sanitized).

### Non-Goals

- Making relative resources of artifact/reference previews resolve (they never did).
- A separate preview origin on the desktop (DEC-001 option C) unless the user chooses it.

### Preserved Behavior Boundary

BEH-004, BEH-005 fully; BEH-001/002/003 "Intentionally Preserved" column; REQ-004; AC-004, AC-006.

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
| REQ-001 | Every HTML preview (UC-001…UC-003, desktop and phone/browser) runs the previewed page with an opaque origin, never the app window's or a node's origin. | BEH-001…003 | Must | The origin is what grants app and node rights | Measured (`*/scripts-only`: origin `null`) | Task; DEC-001 |
| REQ-002 | A previewed page cannot read or script the app window, cannot call the preload API, and cannot read the app's browser storage (desktop app storage, phone credential). | BEH-002, BEH-003 | Must | Task "cannot reach the app window, the preload API" | Measured (`SecurityError` on each) | Task |
| REQ-003 | A previewed page's WebSocket and API requests to any node carry an Origin the node refuses, so it gets no node rights; no request it can make without an Origin changes node state. | BEH-001, BEH-002 | Must | Task "or the node with the app's rights" | Measured (`Origin: null`); Read (gate refuses `null`; GET mutations refused) | Task |
| REQ-004 | Previews keep working for their purpose: the page renders; inline scripts, classic scripts, stylesheets and images run/load, including relative ones of a workspace file; resources from other sites (CDN) load; a blob preview refreshes when its content changes, and a workspace preview keeps today's refresh behavior (BEH-005). | BEH-001…003, BEH-005 | Must | Task "keep the preview useful" | Measured (classic relative script, CSS, inline) | Task |
| REQ-005 | Workspace HTML the node serves for the preview runs isolated also when its URL is opened outside the preview. | BEH-006 | Should | Same isolation for the route whose only consumer is the preview | Read (CSP `sandbox`); verify in design | DEC-003 |
| REQ-006 | What a previewed page can no longer do is exactly what DEC-001 approves, and the user-facing notes say so. | BEH-001 | Must | "The user is told before behaviour changes" | Measured losses (probe) | DEC-001 |
| REQ-007 | Application iframe pages and non-HTML viewers behave as before. | BEH-004 | Must | Task constraint | N/A | Task |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001…003 | Workspace preview and blob preview mounted | Preview iframe never grants `allow-same-origin` | — | Web component test |
| AC-002 | REQ-001, REQ-002 | SCN-004 | Desktop isolated instance (or Electron with the app's window settings); a hostile test page previewed as a workspace file and as an artifact | Page reports origin `null`; `parent.document`, `parent.electronAPI` and `localStorage` throw; no IPC call from it reaches the main process | — | Real Electron check |
| AC-003 | REQ-003 | SCN-004 | Same hostile page against a real node | Its WebSocket to `/ws/terminal/…` and its POST to `/graphql` are refused (`REMOTE_ACCESS_ORIGIN_REFUSED`); no terminal session is created | — | Isolated instance or server E2E + browser |
| AC-004 | REQ-004 | SCN-001, SCN-002 | Test pages: workspace page with inline script, relative classic script, relative CSS and image; artifact page with inline script | Each renders and its scripts run (relative image loads); an artifact preview updates when its content changes; a workspace preview shows the changed file after reopening it (same as before this change) | — | Isolated instance / browser probe |
| AC-005 | REQ-005 | SCN-001 | Request a workspace HTML file from the static route; open it top-level | Response sandboxes the document; opened top-level it reports origin `null` | Non-HTML files still served with their type | Server test + probe |
| AC-006 | REQ-002, REQ-004 | SCN-002 | Phone/browser web app with a stored phone credential; preview an HTML artifact | Preview renders; it cannot read the credential (origin `null`) | — | Browser probe |
| AC-007 | REQ-006 | SCN-005 | Per DEC-001 | The approved losses behave as documented (option A: relative module script and relative `fetch` do not run/load; storage throws); release notes and docs state them | — | Probe + docs check |
| AC-008 | REQ-007 | SCN-005 | Existing application iframe and viewer tests | Pass unchanged | — | Existing suites |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | See a workspace HTML file rendered | File explorer, preview mode | Workspace bound | Open file → preview | Renders, scripts run, isolated | Per DEC-001 losses | Supported Normal Scenario | FileViewer / fileExplorerContentActions | REQ-001, 003, 004, 005; AC-001…005 |
| SCN-002 | User | User | See an HTML artifact or reference | Artifacts tab (default preview), team/collaboration references on desktop; Artifacts on phone | Run produced HTML | Open → preview | Renders, isolated | — | Supported Normal Scenario | ArtifactContentViewer, Mobile views | REQ-001…004; AC-001…004, AC-006 |
| SCN-003 | User | User | See a local HTML file referenced by events | Embedded desktop window | Absolute path | Open → preview | Renders, isolated | — | Supported Normal Scenario | fileExplorerContentActions `_loadLocalFile` | REQ-001…004 |
| SCN-004 | User | Untrusted HTML author | Use the app's rights | Any of SCN-001…003 | Hostile HTML previewed | Page scripts try window, preload, storage, node | All refused | — | Supported Explicit Edge Scenario (Task security contract) | Probe | REQ-001…003; AC-002, AC-003, AC-006 |
| SCN-005 | User | User | Use applications and other viewers | Applications, image/PDF/… viewers | — | Normal use | Unchanged | — | Supported Normal Scenario | Code | REQ-007; AC-008 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (no UI change; only what previewed pages may do changes)
- Product Design fields: `N/A — not applicable`

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001…003 | Security | 0 of the checks in AC-002/AC-003/AC-006 succeed from a previewed page | Desktop and phone | Real Electron + browser |
| QR-002 | AC-002…AC-006 | Privacy | Test pages and data are synthetic; no user workspace content | All tests | Review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (app data unchanged)
- Loss acceptable: previewed pages can no longer read what they stored before.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| iframe `sandbox`, Fetch Origin rules | Opaque origin; CORS requests carry `Origin: null` | Probe | — |
| CSP `sandbox` header | Sandboxes the served document | CSP3 | Verify in Electron (design) |
| 403 Origin rule | Refuses `null` | Code, 403 tests | Unchanged here |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/preview-probe/` | Measured reach | REQ-001…004 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Most previewed HTML is single-file or uses classic scripts/CDN libraries | Sizes the cost of option A | Confirmed by the user's own use (viewing; complex UIs in the browser area), 2026-11-07 | Confirmed |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How to isolate, and which preview capabilities may be lost | Visible behavior change with security trade-off; the Task says the user is told first | **A** `allow-scripts` only, all previews. Loses in workspace previews: relative `type="module"` scripts, `fetch`/XHR of workspace files, relative web fonts; in all previews: `localStorage`/`sessionStorage`/IndexedDB/cookies. Small web change. **B** = A + a node preview route with an unguessable per-preview path that answers opaque-origin GETs, restoring module scripts/`fetch`/fonts (storage still lost); server + web, a narrow exception to 403's rule. **C** = desktop serves previews from a separate custom-scheme origin (keeps everything incl. storage on desktop); phone still A; Electron protocol handler that reads/proxies node files; largest | **Recommend A.** It closes every measured path on desktop and phone with one small change, and keeps what agent HTML usually uses (inline/classic scripts, CSS, images, CDN libraries). B and C add new trusted surfaces to restore features whose use is unmeasured; B can be a follow-up if multi-file module apps matter. **Decided: A** — the user uses the preview to view HTML and runs complex UIs from an agent-started server in the in-app browser (2026-11-07) | User | Decided |
| DEC-002 | Which surfaces | Partial isolation leaves the hole | All `HtmlPreviewer` uses share one component | All preview surfaces, desktop and phone (REQ-001) | Solution Designer | Decided |
| DEC-003 | Also isolate the static route itself | Its URL can be opened outside the iframe | CSP `sandbox` header; only consumer is the preview | Add it: same isolation, no supported use of the node origin there (REQ-005) | Solution Designer | Decided |
| DEC-004 | Notice in the preview UI about the restrictions | Visible UI | None / a hint | None: no UI change; release notes and docs tell the user (REQ-006) | Solution Designer | Decided |
| DEC-006 | In-memory stand-in for browser storage in previews (offered to the user) | Interactive pages that touch storage unguarded may stop | None / inject a shim (blob: prepend; workspace: the node rewrites served HTML) | None: the user's complex UIs run in the browser area, the preview is for viewing; a shim on the workspace path means the node rewriting served HTML. Can be its own task later. User informed 2026-11-07 | Solution Designer | Decided |
| DEC-005 | Application iframes | Task: must keep working | Separate component with its own contract | Unchanged (REQ-007) | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001…003 | BEH-001…003 | AC-001, AC-002 | SCN-001…004 | probe |
| REQ-002 | UC-002, UC-003 | BEH-002, BEH-003 | AC-002, AC-006 | SCN-004 | probe |
| REQ-003 | UC-001…003 | BEH-001, BEH-002 | AC-003 | SCN-004 | probe |
| REQ-004 | UC-001…003 | BEH-001…003, BEH-005 | AC-004, AC-006 | SCN-001…003 | probe |
| REQ-005 | UC-004 | BEH-006 | AC-005 | SCN-001 | — |
| REQ-006 | UC-001 | BEH-001 | AC-007 | SCN-001 | probe |
| REQ-007 | — | BEH-004 | AC-008 | SCN-005 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001…SCN-005 (after approval).
- Constraints: 403's Origin rule unchanged; application iframes unchanged; no UI change.
- Deferred to design: the blob preview's `<base>`; CSP header form; test layers.
- Technical facts to verify: CSP `sandbox` in Electron iframes and top-level.
- Known risks: RSK-001 (accepted), FU-001.

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
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (user, 2026-11-07)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-002; no behavior-defining supplements)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
