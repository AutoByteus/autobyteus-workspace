# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline: `requirements-doc.md` at SR-002, approved by the user on 2026-11-07 in the Solution Designer conversation (DEC-001 = option A: `allow-scripts` only; DEC-006: no storage stand-in, user informed)
- Behavior-defining supplements: None
- User approval of the design: `Not required` (the Task does not ask for it)
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation/tickets/in-progress/html-preview-isolation/investigation-notes.md`
- Authorities read (2026-11-07): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`; project `DESIGN.md` (root; no closer `DESIGN*.md` under `autobyteus-web` or `autobyteus-server-ts`); `GLOSSARY.md` (no entry for preview); `TESTING.md`; `autobyteus-web/docs/file_explorer.md` (HTML Preview Resource Contract), `docs/agent_artifacts.md`, `docs/content_rendering.md`
- Project design-principle conflicts or discrepancies: None. DESIGN.md "smallest solution that satisfies … real security obligations" matches the chosen option.

## Current-State Read

Every HTML preview in the app goes through one component, `HtmlPreviewer.vue` (`FileViewer.vue:71`). It renders an iframe with `sandbox="allow-scripts allow-same-origin"` (`HtmlPreviewer.vue:8`) and picks its source:

- **Workspace preview** (Files area): `<node rest>/workspaces/<id>/static/<path>` (`HtmlPreviewer.vue:31-39`), served by the node's static route (`autobyteus-server-ts/src/api/rest/workspaces.ts:60-104`) with the file's MIME type and no security headers. With `allow-same-origin` the document has the node's origin, so its requests and WebSockets pass the node's Origin rule (`remote-access-request-origin.ts:72-76`) with trusted-network rights (`remote-access-route-policy.ts:132-139`). Measured: BEH-001.
- **Blob preview** (Artifacts, team/collaboration references, local files in the desktop window; phone Artifacts): a `blob:` URL the app window makes from `<base href="${window.location.origin}/">` + the content (`HtmlPreviewer.vue:41-53`). With `allow-same-origin` the document has the app window's origin: window, preload API, app storage, node rights. Measured: BEH-002 (desktop); BEH-003 (phone, same-origin reasoning).

The node's request gate refuses `Origin: null` on every HTTP request and WebSocket (`remote-access-policy-plugin.ts:67-70`). The Electron app window is unaffected by the change (`workspace-shell-window.ts:39-58`); the preload API lives on the main frame (`preload.ts:34`). Application iframes are a separate component (`ApplicationIframeHost.vue`) and the app's only `message` listener checks source and origin (`ApplicationIframeHost.vue:88-96`).

There is no structural problem: one owner per side (the previewer for the iframe, the static route for served documents). The defect is one wrong sandbox flag plus a missing response header.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: two production files (`HtmlPreviewer.vue`, `api/rest/workspaces.ts`), their two existing test files, two web docs; no new owner, file, API, route or persistence.
- Architectural risk: `High`
- Risk rationale: it changes a security boundary (what preview content may do, a new response header on a node route) and removes capabilities from previewed pages (module scripts, `fetch` of workspace files, fonts, storage). Bounded and measured, but a security-boundary change is `High` by the standard.
- Escalation trigger: any preview surface found that does not go through `HtmlPreviewer.vue`; the CSP header breaking a non-HTML file the preview needs; any need to change the node's Origin rule or the Electron shell.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Electron probe, current vs `allow-scripts` | `evidence/preview-probe/electron-output.txt`, `server-log.txt` | `allow-scripts` only: origin `null`; window, preload, storage → `SecurityError`; node requests carry `Origin: null`; inline/classic scripts and CSS work | D1 | — |
| Electron probe, CSP header | `evidence/preview-probe/electron-output-csp.txt`, `server-log-csp.txt` (`PROBE_CSP_SANDBOX=1`, `main-csp.cjs`) | With `Content-Security-Policy: sandbox allow-scripts` on every static response: the document is opaque in an iframe with `allow-scripts`, with `allow-scripts allow-same-origin`, with no sandbox attribute, and top-level; classic scripts and CSS on the same route still load | D2 (header on all static responses; holds even if the attribute regresses) | — |
| Code | `HtmlPreviewer.vue:47-48` | `<base href=window.location.origin/>`: packaged `file:///`, browser/phone node root; never the file's folder | D3 (remove) | — |
| Code | `CollaborationMessageReferenceViewer.vue:109-119`, `TeamReferenceFileViewer.vue:107-112`, `MobileTeamReferenceViewer.vue:9` | Phone references set `disableRichTextPreview`: HTML shown as code | Phone surface = Artifacts only | — |
| Code | `ArtifactContentViewer.vue:168-172`, `MobileArtifacts.vue:28` | Artifacts preview HTML on desktop and phone | Covered by D1 | — |
| Code | `api/rest/workspaces.ts:13-58` (`/content`) | Serves files with their MIME type; consumers fetch text or load media (`workspaceResourceUrl.ts:48-54`) | Left alone; FU-002 | — |
| Code | `tests/unit/api/rest/workspaces.test.ts:62-141` | Static route tests with `fastify().inject` | Header test lands here | — |

## Intended Change

Drop `allow-same-origin` from the preview iframe, remove the blob preview's dead `<base>`, and have the node's workspace static route send `Content-Security-Policy: sandbox allow-scripts` on the files it serves.

## Change Scope (Mandatory)

- In scope: UC-001…UC-004. Areas: the HTML previewer (web), the workspace static route (server), their tests, the HTML preview docs.
- Derived consumers: N/A (no shared structure changes).
- Deliberately left alone: the node's Origin rule and CORS (403's, unchanged: it is what refuses the opaque preview); `ApplicationIframeHost.vue` (REQ-007); the Electron shell and preload; the `/content` route and other file routes (no preview uses them as documents; FU-002); Markdown preview; the in-app browser.
- Follow-ups: FU-001 (loopback origins, urgent), FU-002 (other node file routes serve HTML at the node's origin, urgent).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, 003, 004, 006; AC-001…005, AC-007 | Files area, `.html` in preview | Node origin (probe) | Opaque; node refuses its requests; inline/classic scripts, CSS, images, CDN work; approved losses | DS-001 |
| BEH-002 | User | REQ-001…004; AC-001…004 | Artifacts, references, local files (desktop) | App window origin (probe) | Opaque; window/preload/storage/node refused | DS-002 |
| BEH-003 | User | REQ-001, 002, 004; AC-006 | Phone Artifacts | Phone app origin (Read) | Opaque; credential unreadable | DS-002 |
| BEH-004 | User | REQ-007; AC-008 | Applications | Separate component | Preserved | N/A |
| BEH-005 | User | REQ-004 | Preview chrome | No popups/forms/modals/top navigation; refresh; revoke | Preserved (sandbox flags unchanged apart from `allow-same-origin`) | DS-001, DS-002 |
| BEH-006 | User | REQ-005; AC-005 | Static URL opened outside the preview | Node origin | Opaque wherever opened (CSP) | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `evidence/preview-probe/` | Measured reach and the CSP header in Electron | REQ-001…005 | Basis of D1, D2; reproduction for implementation | Current, evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (security) with an approved `Behavior Change`
- Current design issue found: `No`
- Structural triggers: none fire. Plausible ones ruled out: *Several kinds or forms* — the previewer serves two source kinds (workspace, blob) and several surfaces; each is traced (DS-001, DS-002) and both get the same sandbox from one attribute. *Repeated coordination* — the sandbox is set in one place on the web side; the server header is the node's own guarantee for its route (two layers, not a repeated policy; see Key Tradeoffs). *Legacy cleanup* — no compatibility path kept.
- Root cause classification: `Local Implementation Defect` (a wrong sandbox flag; a missing header on the route that serves preview documents)
- Refactor needed now: `No`
- Evidence: one component owns every preview (`FileViewer.vue:71`, grep of `HtmlPreviewer`); one route serves workspace preview documents (grep `/static/`: only `HtmlPreviewer.vue:38`).
- Design response: change the flag and add the header in the existing owners.
- Refactor rationale: owners and boundaries are correct.
- Intentional deferrals and residual risk: RSK-001 (a page can send its own content out); FU-001; FU-002.

## Terminology

- *Workspace preview* / *blob preview*: the two sources of the preview iframe (investigation notes). No project glossary entry is added: these are component-internal terms, not domain words.

## Legacy Removal Policy (Mandatory)

- Obsolete paths in scope: the blob preview's `<base>` tag (Removal plan).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. App data is untouched. Pages previewed earlier lose access to what they stored in browser storage (approved, requirements Data Continuity).

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 005, 006 | User opens a workspace `.html` in preview | Opaque preview document; its node requests refused | `HtmlPreviewer` (iframe), workspace static route (document) | The node-rights path |
| DS-002 | Primary End-to-End | BEH-002, 003, 005 | User previews an artifact, reference or local HTML | Opaque preview document | `HtmlPreviewer` | The app-window path |
| DS-003 | Return-Event | BEH-001…003 | Previewed page sends a request / message | Refused by node gate / browser / source-checked listener | Node gate (403), browser, `ApplicationIframeHost` | Shows nothing new is needed on the receiving side |

## Primary Execution Spine(s)

- DS-001: `Files area (FileExplorer) -> fileExplorerContentActions (workspace context) -> FileViewer -> HtmlPreviewer (static URL, sandbox allow-scripts) -> node request gate (navigation carries no Origin) -> workspace static route (file + CSP sandbox) -> opaque preview document`
- DS-002: `Artifacts / reference viewers / local file -> FileViewer -> HtmlPreviewer (blob of the content, sandbox allow-scripts) -> opaque preview document`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The previewer points the iframe at the node's static URL with scripts allowed but no same-origin; the node serves the file with a CSP sandbox, so the document is opaque even if loaded elsewhere. Its classic scripts, CSS and images load (no-cors GETs carry no Origin); module scripts, `fetch` and fonts carry `Origin: null` and the gate refuses them; WebSockets and POSTs the same | preview iframe, static route, preview document | `HtmlPreviewer`; static route | none |
| DS-002 | The previewer wraps the loaded text in a blob URL (content only) and shows it in the same sandboxed iframe; the document is opaque, so the app window, preload and storage are out of reach and node requests carry `Origin: null` | preview iframe, preview document | `HtmlPreviewer` | blob URL lifecycle (revoke), unchanged |

## Spine Actors / Main-Line Nodes

`FileViewer`, `HtmlPreviewer`, the node's request gate, the workspace static route, the preview document.

## Ownership Map

- `HtmlPreviewer.vue`: the preview iframe — its source choice, its sandbox flags, blob URL lifecycle.
- `api/rest/workspaces.ts` static route: serving workspace files for the preview, containment (`workspace.getAbsolutePath`), and now the document sandbox of what it serves.
- Node request gate (unchanged): which Origins may use the node.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `allow-same-origin` in `HtmlPreviewer.vue:8` | It is the defect | `sandbox="allow-scripts"` | — |
| `<base href="${window.location.origin}/">` and `baseUrl` in `buildBlobUrl` (`HtmlPreviewer.vue:47-48`) | Dead: it points relative URLs at the app's origin root (`file:///` packaged, node root in browser/phone), never at the file's folder, so no supported preview loads anything through it (docs: "Blob-base limitation", `file_explorer.md:232-234`); with an opaque document it reaches nothing | The blob holds the content only | Docs sentence updated |

## Return Or Event Spine(s) (If Applicable)

DS-003: `preview document -> (WS / CORS fetch / POST) -> node request gate -> 403 REMOTE_ACCESS_ORIGIN_REFUSED`; `preview document -> parent / parent.electronAPI / localStorage -> browser SecurityError`; `preview document -> postMessage -> ApplicationIframeHost listener -> ignored (source check)`. No change on any receiving side.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

N/A — none added.

## Ownership Boundaries

The web side owns the iframe's sandbox; the node owns how its route's documents run. Each enforces isolation on its own: the attribute covers blob previews (no server involved); the header covers anything the static route serves, wherever it is opened.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `HtmlPreviewer` | iframe attributes, blob lifecycle | `FileViewer` | another component rendering preview HTML in its own iframe | route it through `FileViewer`/`HtmlPreviewer` |

## Dependency Rules

Unchanged. The web previewer does not depend on server code or vice versa; the sandbox flags are not shared through a package (two independent layers, Key Tradeoffs).

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `GET /rest/workspaces/:workspaceId/static/*` | a workspace file served for preview | file bytes + MIME type + `Content-Security-Policy: sandbox allow-scripts` on success | workspace ID + relative path (unchanged) | Header only on the file response, not on JSON errors |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| static route | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Server header constant | `PREVIEW_DOCUMENT_SANDBOX` (value `sandbox allow-scripts`) in `workspaces.ts` | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Isolate preview documents | iframe `sandbox`; browser CSP | Reuse | Platform mechanisms, measured | — |
| Refuse preview requests at the node | 403 request gate | Reuse | Already refuses `null` | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns Which Concerns | Spine | Owner Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-web file viewers | preview iframe | DS-001, DS-002 | `HtmlPreviewer` | Extend | — |
| autobyteus-server-ts REST workspaces | served preview documents | DS-001 | static route | Extend | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction applies).

## Reusable Owned Structures Check

N/A — no repeated structure. The flag string `allow-scripts` appears in the iframe attribute and the server header by design (two layers).

## Shared Structure / Data Model Tightness Check

N/A.

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue` | web file viewers | `HtmlPreviewer` | sandbox `allow-scripts`; blob = content only | Existing owner | No |
| `autobyteus-web/components/fileExplorer/viewers/__tests__/HtmlPreviewer.spec.ts` | tests | — | both paths: sandbox exactly `allow-scripts`; blob text equals the content (no `<base>`) | Existing spec | — |
| `autobyteus-server-ts/src/api/rest/workspaces.ts` | server REST | static route | `Content-Security-Policy` header on served files | Existing owner (~105 lines) | No |
| `autobyteus-server-ts/tests/unit/api/rest/workspaces.test.ts` | tests | — | static responses (HTML and an asset) carry the header; `/content` does not; error replies unchanged | Existing spec | — |
| `autobyteus-web/docs/file_explorer.md` (HTML Preview Resource Contract), `autobyteus-web/docs/content_rendering.md` (HTML row/section where it describes the preview) | docs | — | isolation contract and what previewed pages cannot do | Existing docs | — |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As Final File Responsibility Mapping; no files added, moved or deleted.

## Folder Boundary Check

N/A — no folder change.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Iframe | `<iframe :src="iframeSrc" sandbox="allow-scripts" …>` | `sandbox="allow-scripts allow-same-origin"`; adding `allow-popups`/`allow-forms`/`allow-modals` (not approved: BEH-005 preserved) | Only the approved flag |
| Blob | `new Blob([props.content \|\| ''], { type: 'text/html' })` | prepending a `<base>` or a script shim (DEC-006) | Dead / not approved |
| Route | `reply.header('Content-Security-Policy', PREVIEW_DOCUMENT_SANDBOX); reply.type(mime); return reply.send(stream)` | a global `onSend` hook adding CSP to every node response (breaks the app and phone shell); adding it to `/content` (FU-002, PDF/media viewers) | Header belongs to the preview route only |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep `allow-same-origin` for workspace previews only | Keeps module scripts/`fetch`/storage there | Rejected | That path is the node-rights hole (DEC-001) |
| Allow `Origin: null` on the static route so modules/`fetch` load | Restores features | Rejected | Opens workspace files to any null-origin page (DEC-001 option B needs a capability path; not approved) |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Start from the reproduction: run `evidence/preview-probe/` (README); `*/current` frames show the hole.
2. Web: set `sandbox="allow-scripts"`; drop `baseUrl`/`<base>` from `buildBlobUrl`; update `HtmlPreviewer.spec.ts` (sandbox on both paths; blob text = content).
3. Server: add `PREVIEW_DOCUMENT_SANDBOX` and set the header on the static route's successful file reply (`workspaces.ts:83-85`); add tests to `workspaces.test.ts`.
4. Docs: rewrite the HTML Preview Resource Contract bullet "Both paths use the existing sandboxed iframe" and the "Blob-base limitation" sentence to state: previews run isolated (opaque origin); scripts run; relative classic scripts, CSS and images of workspace files load; not available: module scripts and `fetch`/XHR of the workspace's files, web fonts from the workspace, Web Workers, browser storage, cookies; complex UIs belong in the in-app browser through a server.
5. Validation (API/E2E): AC-002/003/004/006 against a worktree build per TESTING.md (isolated desktop instance; browser probe for the phone web app), with synthetic test pages only.

## Key Tradeoffs

- **Two layers, same flags.** The iframe attribute (web) and the CSP header (node) both say `allow-scripts`. They are kept independent on purpose: the attribute is the only control for blob previews, the header is the node's guarantee for its route wherever the URL is opened. Sharing the string through a package would couple web and server for one literal. Measured: the header alone isolates even with `allow-same-origin` set (`electron-output-csp.txt`).
- **Losses accepted** (DEC-001): module scripts, `fetch`, fonts, workers, storage in previews; the user runs complex UIs in the in-app browser.
- Refused `Origin: null` requests from previews appear as `Remote Access request refused REMOTE_ACCESS_ORIGIN_REFUSED` warnings in the node log (`remote-access-policy-plugin.ts:42`). Accepted: they are real refusals.

## Risks

- RSK-001: a previewed page can still send its own content to the internet (accepted, out of scope).
- A preview surface outside `HtmlPreviewer` would not be covered: none found (grep of `<iframe` in `autobyteus-web`: `HtmlPreviewer.vue`, `ApplicationIframeHost.vue` only).
- Electron version: probes ran on 42.4.1, the repo pins 42.11.16; the behavior is Chromium's standard sandbox/CSP. API/E2E validates on the worktree build.

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/html-preview-isolation/evidence/preview-probe/` — `node server.mjs 47921 "$PWD/server-log.txt" & env -u ELECTRON_RUN_AS_NODE <repo>/autobyteus-web/node_modules/.bin/electron main.cjs` (hole) and `PROBE_CSP_SANDBOX=1 … main-csp.cjs` (header). The probe is evidence, not a product test.
- Do not touch the node's Origin rule, CORS, the Electron shell, `ApplicationIframeHost.vue` or `/content`.
- Tests use synthetic HTML only (QR-002).
