# Investigation Notes

## Investigation Meta

- Package identifier: `html-preview-isolation`
- Request / ticket: Project Task `autobyteus-417` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), follow-up FU-002 of autobyteus-403
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation`, `codex/html-preview-isolation`
- Resolved base remote / branch / revision: `origin/personal` @ `ff68bfb5fa` (fetched 2026-11-07; contains 403's merge `6f69dfb52d`)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from refreshed `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-004`
- Authorities read (design reading gate, 2026-11-07): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, `DESIGN.md`, `GLOSSARY.md`, web docs `file_explorer.md`, `agent_artifacts.md`, `content_rendering.md`
- Authorities read (requirements reading gate; 2026-11-07): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`; `TESTING.md` (test layers, choosing the path, browser probes, rules)
- Investigation status: Complete (requirements and architecture)

## Initial Request And Clarifications

- Original request: Task autobyteus-417 — "Security: isolate the desktop app's HTML preview (previewed pages run with the app window's own origin and can reach the app)". Source row: `/Users/normy/autobyteus_org/autobyteus-delivery-records/websocket-origin-guard-403-20261107/follow-ups.md` FU-002.
- Clarifications received: none yet.
- User-supplied facts and constraints: keep the preview useful (scripts in previewed pages, the app iframe pages and artifacts must keep working; check what the preview is used for first); the user is told before behaviour changes; no private data in tests; follow DESIGN.md and TESTING.md; release only on the user's word.
- Initial ambiguity: the Task's direction ("drop `allow-same-origin` or serve previews from a separate origin") leaves open which usefulness losses are acceptable.

## Product And Domain Understanding

- Product area: autobyteus-web file viewers (desktop renderer and the phone/browser web app served by the node), the node's workspace static route.
- Affected actors or systems: the user previewing HTML; the HTML author (agent output, a cloned repository, a download); the app window and its preload API; the node(s) the window is bound to; the phone web app and its stored phone credential.
- Existing user or operational purpose: see the agent's HTML output (reports, small pages, games, mock-ups) rendered, with its scripts, without leaving the app.
- Relevant terminology: *blob preview* — iframe `src` is a `blob:` URL the app window creates from the file text; *workspace preview* — iframe `src` is the node's `/rest/workspaces/<id>/static/<path>`; *opaque origin* — the `null` origin a sandboxed document without `allow-same-origin` gets.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-07 | Code | `autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue:4-10,31-64` | The preview | iframe `sandbox="allow-scripts allow-same-origin"`; `src` = workspace static URL when a workspace context exists, else a `blob:` URL of `<base href="${window.location.origin}/">` + content | — |
| 2026-11-07 | Code | `components/fileExplorer/FileViewer.vue:64-108` | Who renders it | Text file in `preview` mode with `.html`/`.htm` → `HtmlPreviewer`, given `content`, `path`, `relativeResourceContext` | — |
| 2026-11-07 | Code | `stores/fileExplorerContentActions.ts:60-160` | Where context comes from | File explorer workspace files get `{kind:'workspace', workspaceId}`; local absolute paths in the embedded desktop window are read through `electronAPI.readLocalTextFile` and get none | — |
| 2026-11-07 | Code | `components/workspace/agent/ArtifactContentViewer.vue:72-84,118,313`; `team/TeamReferenceFileViewer.vue:60-70`; `collaboration/CollaborationMessageReferenceViewer.vue:58-66` | Other preview surfaces | Pass no `relativeResourceContext` → blob preview. Artifacts open in `preview` by default when previewable | — |
| 2026-11-07 | Code | `components/mobile/views/MobileArtifacts.vue:28,37`, `MobileTeamReferenceViewer.vue:9`, `CollaborationMessageReferenceViewer.vue:109-119`, `MobileFileViewer.vue:45-49` | Phone surfaces | Phone Artifacts preview HTML (blob preview). Phone team references pass `disableRichTextPreview` → HTML shown as code (corrected 2026-11-07 during design; first read said they preview). Phone file viewer opens HTML as code | — |
| 2026-11-07 | Code | `components/applications/ApplicationIframeHost.vue` | "App iframe pages" | Separate component: no `sandbox`, own bridge contract; its `message` listener checks `event.source` and `expectedIframeOrigin` (:88-96). Not part of the preview | Preserved |
| 2026-11-07 | Code | `grep addEventListener('message'` over autobyteus-web | postMessage reach | `ApplicationIframeHost` is the only window `message` listener | — |
| 2026-11-07 | Code | `electron/shell/workspace-shell-window.ts:39-58` | App window | `preload`, `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`; `will-navigate` prevented; window-open denied | — |
| 2026-11-07 | Code | `electron/preload.ts:34-150` | Preload API | `electronAPI` exposes ~50 calls incl. `resetServerData`, `restartServer`, `readLocalTextFile`, `openExternalLink`, `installExtension`, `upsertNodeRegistry`, `openBrowserTab` | — |
| 2026-11-07 | Code | `autobyteus-server-ts/src/api/rest/workspaces.ts:60-104` | Workspace static route | Serves any workspace file with its MIME type; no security headers; only consumer is `HtmlPreviewer` (grep `/static/`) | — |
| 2026-11-07 | Code | `src/api/security/remote-access-request-origin.ts`, `remote-access-policy-plugin.ts` | Node gate (403) | Every HTTP request and WS upgrade: Origin absent / `file://` / same host / loopback any port / configured → allowed; `null` refused (403 `REMOTE_ACCESS_ORIGIN_REFUSED`); CORS grants follow the same rule | — |
| 2026-11-07 | Code | `src/api/security/remote-access-route-policy.ts:50-238` | What an allowed request may do | Trusted-network model: a request without a phone credential is `trusted_network`/`loopback` (full rights) | — |
| 2026-11-07 | Code | `node_modules/.pnpm/mercurius@13.4.1…/index.js:495-502` | GET side effects | Mercurius refuses non-query operations over GET | No GET mutation path |
| 2026-11-07 | Code | `utils/remoteAccess/mobileCredentialStorage.ts:26-48` | Phone credential | Stored in the phone web app's `localStorage` (node origin) | — |
| 2026-11-07 | Code | `composables/useMarkdownSegments.ts:70-105,365-385` | Neighbouring renderer | Markdown HTML passes DOMPurify; not a preview iframe | No finding |
| 2026-11-07 | Doc | `tickets/done/websocket-origin-and-phone-route-guard/` (requirements DEC-004, notes RSK-002, origin probe) | 403 context | Packaged renderer origin `file://`; loopback origins allowed on any port (DEC-004) | FU-001 here |
| 2026-11-07 | Command | `evidence/preview-probe/` (see README) | Measure reach | See Runtime findings | — |
| 2026-11-07 | Command | `git log -- HtmlPreviewer.vue`; `components/fileExplorer/viewers/__tests__/HtmlPreviewer.spec.ts` | History, tests | Last change 0d35457b2a (keep local HTML content); spec asserts the current sandbox string | Test changes with the fix |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Open a `.html` workspace file in preview (file explorer, desktop or browser) | Iframe loads `<node>/rest/workspaces/<id>/static/<path>` with `allow-scripts allow-same-origin` | Page runs at the node's origin: inline, classic and module scripts, relative CSS/images/`fetch`, storage all work. Its WebSocket and POST carry the node's Origin → the node's gate accepts them with full trusted rights (e.g. `/ws/terminal`). On desktop the app window (`file://`) is cross-origin, so no parent access | Probe `static/current` | Measured |
| BEH-002 | User | Preview an HTML artifact, team/collaboration reference, or a local absolute-path HTML file (desktop) | Iframe loads a `blob:` URL the app window made (`blob:file:///…`) with `allow-scripts allow-same-origin` | Page runs at the app window's origin (`file://`): reads `parent.document`, calls `parent.electronAPI` (IPC arrives in main as the app window), shares the app's `localStorage`; WS sends `Origin: file://`, `fetch` sends no Origin → both accepted by the node. Relative resources resolve against `file:///` (never the file's folder) | Probe `blob/current` | Measured |
| BEH-003 | User | Phone web app (served by the node) previews an HTML artifact | Same blob preview; the app window's origin is the node's origin | Page shares the phone app's origin: reads its window and the stored phone credential in `localStorage`; full node rights | Code (same-origin policy) + BEH-002 measurement | Read |
| BEH-004 | User | Application iframe pages (installed applications) | `ApplicationIframeHost`, no sandbox, origin-checked bridge | Works; unrelated to the preview | Code | Read |
| BEH-005 | System | Preview sends `postMessage` to the app window | Only listener checks source and origin | No effect | Code | Read |
| BEH-006 | User | Preview chrome | No `allow-popups/forms/modals/top-navigation`; blob preview refreshes on content change (new Blob URL); workspace preview does not reload when the open file changes (`FileExplorerTabs.vue:31,177` keys `FileViewer` by workspace + file; `HtmlPreviewer` re-assigns the same static URL) — corrected 2026-11-07 (implementation R-3, Read); blob URLs revoked | Popups, forms, `alert` and top navigation already blocked | Code, spec | Read |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `HtmlPreviewer.vue` | Single owner of every HTML preview | One change covers file explorer, artifacts, references, desktop and phone | Remove `allow-same-origin`; the `<base href=app origin>` of the blob path never pointed at the file's folder (dead) |
| `api/rest/workspaces.ts` static route | Serves preview documents at the node's origin | Opening its URL outside the iframe (in-app browser, a tab) gives the node's origin | A `Content-Security-Policy: sandbox allow-scripts` response header makes the document opaque wherever it is opened |
| Node gate (403) | Refuses `Origin: null` on every HTTP request and WS | An opaque preview cannot use the node; it also cannot load relative module scripts, `fetch` workspace files or fonts (CORS requests carry `Origin: null`) | Restoring those would need a narrow, unguessable preview route with a gate exception (DEC-001 option B) |
| Electron app window | Preload exposed to the main frame's main world | Same-origin iframes reach it through `parent` | Opaque origin blocks it; no Electron change needed |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: workspace HTML and its relative assets (served by the node); artifact/reference text (fetched by the app); local text files (desktop IPC).
- Readers: `HtmlPreviewer.vue` only.
- Evidence paths: above.

### Structural Surfaces

- `HtmlPreviewer.vue` (web), workspace static route (server). The node gate and Electron shell are read, not changed.
- Existing structural surfaces that can support the approved behavior: iframe `sandbox`; CSP `sandbox` response header.

### Potential Structural Impacts To Investigate

- API or external-contract change: static route gains a response header (option A); a new preview route (option B only).
- Persistence schema or invariant change: none.
- Security or privacy boundary change: yes, narrows what preview content can reach.
- Concurrency or lifecycle change: none.
- Deployment, migration, ownership-boundary change: none (option C would add an Electron protocol handler).
- Confirmed absent, present, or unknown: as above.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| Electron 42.4.1, app webPreferences, `blob/current` | SCN-002/003/004 today | origin `file://`; `parent.document` readable; `parent.electronAPI` is an object and its call reached the main process as the app window (`senderFrame=file:///…/app.html`); `localStorage` works (app's); WS `Origin: file://`; POST without Origin | Reproduced | The hole is real: preview = app window rights | `evidence/preview-probe/electron-output.txt`, `server-log.txt` |
| same, `static/current` | SCN-001/004 today | origin `http://127.0.0.1:47921`; parent blocked; POST `/graphql` and WS `/ws/terminal` sent with the node's own Origin (allowed by the gate); module script, relative `fetch`, CSS, storage work | Reproduced | Workspace preview = node rights | same |
| same, `blob/scripts-only` | Proposed | origin `null`; parent, preload, `localStorage` → `SecurityError`; WS `Origin: null`; POST preflighted with `Origin: null` (refused by the gate); inline script runs | Measured | Isolation holds for blob previews; nothing useful lost except storage | same |
| same, `static/scripts-only` | Proposed | origin `null`; parent/preload/storage blocked; WS and POST `Origin: null`; inline + classic relative script run, relative CSS applies; module script request sent with `Origin: null` and does not run; relative `fetch` sent with `Origin: null` and fails | Measured | Isolation holds; losses: module scripts, `fetch` of workspace files, storage (fonts: CORS mode, same as modules — Read) | same |
| Read: mercurius GET guard | Opaque page uses GET (no Origin) | GET mutations refused | Read | No GET side-effect path to node rights | Source log |

- Temporary diagnostics: None (probe is standalone; no product code changed).
- Reproduction for implementation to start from: `evidence/preview-probe/` (command in README). The `*/current` frames show the hole; `*/scripts-only` show the target.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Task autobyteus-417 (user's team) | Previewed pages must not reach the app window, preload or node with the app's rights; previews keep working for their purpose; user told before behaviour changes | Direction | REQ-001…REQ-004 | Which losses are acceptable (DEC-001) |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| HTML iframe `sandbox` | HTML Standard | Without `allow-same-origin` the document has an opaque origin; storage throws `SecurityError` | Probe | — |
| Fetch: Origin header | Fetch Standard | CORS-mode requests (module scripts, `fetch`, fonts) and non-GET requests carry `Origin`; no-cors GETs (classic scripts, CSS, images) do not | Probe (server log) | — |
| CSP `sandbox` directive | CSP3 | Response header sandboxes the document wherever it is loaded | Read | Verify in Electron (design) |
| Electron | 42.x (package.json 42.11.16; probe 42.4.1) | `contextBridge` API lives on the main frame's window; same-origin subframes reach it via `parent` | Probe | — |

## Persisted Data And State Facts

- Affected stored subject: browser storage written by previewed pages (today: the app window's own storage on desktop blob previews; the node origin's storage for workspace previews, shared with the phone web app).
- Required semantics to preserve: none for preview pages. The app's own storage is untouched.
- Acceptable loss: previewed pages lose access to storage; anything they stored is no longer readable by them.
- Remaining evidence gap: None.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- No visible UI change proposed.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/preview-probe/` | Solution Designer | Measured reach today and with `allow-scripts` only; reproduction for implementation | Electron 42.4.1, stand-in node | REQ-001…REQ-004; AC-002, AC-004 | Current | Evidence; not behavior-defining |
| `follow-ups.md` | Solution Designer | Findings outside this ticket | — | — | Current | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | An isolated preview can still send data out (`fetch` no-cors to the internet, image beacons) of whatever its own page contains | Exfiltration of the page's own content is not "the app's rights" | Out of scope; a network-blocking CSP would break CDN use | Accepted |
| RSK-002 | Risk | Any page served from a loopback port on the desktop machine (e.g. a dev server the agent starts and opens in the in-app browser) passes the node's Origin rule (403 DEC-004) | Same class of reach as this ticket, different surface | `follow-ups.md` FU-001 | Open (follow-up) |
| UNK-001 | Unknown | How many real previews rely on module scripts / `fetch` / storage | Decides how much option A costs | Not measured: would read the user's private workspaces. Presented to the user as DEC-001 | Open (user) |

## Architecture Investigation Findings

| Method / Source | Observation | Established | Design implication |
| --- | --- | --- | --- |
| Electron probe `main-csp.cjs`, server with `PROBE_CSP_SANDBOX=1` (`evidence/preview-probe/electron-output-csp.txt`, `server-log-csp.txt`) | `Content-Security-Policy: sandbox allow-scripts` on every static response makes the document opaque in an iframe with `allow-scripts`, with `allow-scripts allow-same-origin`, with no sandbox attribute, and top-level; classic scripts and CSS from the same route still load; WS/POST carry `Origin: null` | Measured | Header on all static file responses (design D2) |
| `HtmlPreviewer.vue:47-48` | Blob `<base>` = app origin root (`file:///` packaged, node root in browser/phone); never the file's folder | Read | Dead; removed |
| `api/rest/workspaces.ts:13-58` `/content`; `workspaceResourceUrl.ts:48-54`; `contextAttachmentPresentation.ts:57` | `/content` serves files with their MIME type; the app fetches text or loads media through it, never shows it as a document | Read | Left alone; HTML opened top-level there is FU-002 |
| `tests/unit/api/rest/workspaces.test.ts:62-141` | Static route tested with `fastify().inject` | Read | Header test placement |
| grep `<iframe` in autobyteus-web | `HtmlPreviewer.vue`, `ApplicationIframeHost.vue` only | Read | No other preview surface |

## Requirement Implications

- One component owns every preview, so isolation is one change for all surfaces, desktop and phone.
- Dropping `allow-same-origin` is sufficient for reach (measured) and keeps inline/classic scripts, CSS and images; it loses module scripts, `fetch` of workspace files, fonts and storage in workspace previews — a visible behavior change the user decides (DEC-001).
- The static route is reachable outside the iframe; a CSP sandbox header closes that (REQ-005).

## Notes For Architecture Design

- Verify that a CSP `sandbox allow-scripts` header on the static route behaves in Electron's iframe as the attribute does (and top-level).
- Decide the blob path's dead `<base>` (Core Principle 7 in touched files).
- Tests: component spec (sandbox string), server route test (header), a real-browser/Electron check of reach (AC-002/AC-003).
