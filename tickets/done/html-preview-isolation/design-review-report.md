# Design Review Report — html-preview-isolation (autobyteus-417)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation/tickets/in-progress/html-preview-isolation/requirements-doc.md` (Approved, baseline SR-002; SR-003 wording clarification)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation/tickets/in-progress/html-preview-isolation/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation/tickets/in-progress/html-preview-isolation/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation/tickets/in-progress/html-preview-isolation/design-spec.md` (SR-003, status `Ready`)
- Supplemental Task Artifacts Reviewed: `evidence/preview-probe/` (README, `app.html`, `app-csp.html`, `server.mjs`, `workspace/report.html`, `electron-output*.txt`, `server-log*.txt`); `follow-ups.md`; `handoff.md`
- Relevant Solution Revision IDs: `SR-003` (design), `SR-002` (approval basis)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation/tickets/in-progress/html-preview-isolation/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Solution Designer `Architecture Design Complete` (Small / High), 2026-11-07
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation`, branch `codex/html-preview-isolation` @ `ff68bfb5fa` (no product changes yet). Opened: `HtmlPreviewer.vue:1-80`, `FileViewer.vue:1-110`, `api/rest/workspaces.ts:1-104`, `remote-access-request-origin.ts:25-90`, `remote-access-policy-plugin.ts:30-80`, `remote-access-route-policy.ts:128-140`, `tests/unit/api/rest/workspaces.test.ts:55-80`, `docs/file_explorer.md:215-245`, `docs/content_rendering.md` (HTML rows), `credential-proxy-routes.ts:1-100`, `application-backends.ts:60-110`; `git grep "/static/"`, `git grep -i "content-security-policy|helmet"`, grep of server GET routes.

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `High`
- Classification rationale reviewed: two production files in existing owners, no new owner/route/persistence (Small); changes a security boundary and adds a response header on a node route (High). Matches the shared design principles' Task Size And Architectural Risk definitions: "security … impact is present" → `High`.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: every HTML preview (workspace and blob source, desktop and phone/browser) runs with an opaque origin; window, preload, storage and node refused; inline/classic scripts, CSS, images, CDN keep working; approved losses per DEC-001 option A; static route isolates its documents wherever opened (DEC-003); no UI change (DEC-004); no storage shim (DEC-006).
- Relevant existing behavior and evidence confirmed: `HtmlPreviewer.vue:8` has `sandbox="allow-scripts allow-same-origin"`; `:31-39` workspace static URL; `:41-53` blob with `<base href="${window.location.origin}/">`. Static route `workspaces.ts:60-104` sets only the MIME type. Only `/static/` consumer is `HtmlPreviewer.vue:38` (git grep). No existing CSP or helmet anywhere in server/electron (git grep). Gate refuses `Origin: null` (`remote-access-request-origin.ts` `isAllowed`: `null` is not `undefined`, not `file://`, and `new URL("null")` throws → `false`; plugin `onRequest` refuses).
- Scope guardrail confirmed: In-Scope UC-001…UC-004; Out of Scope: application iframes, 403's Origin rule (incl. loopback, FU-001), in-app browser, exfiltration (RSK-001), Markdown; Preserved: BEH-004, BEH-005, REQ-004, AC-004, AC-006; Review Authority read.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none raised).
- Remaining material ambiguity: None blocking. See Residual Risks for three validation notes.
- Statements about existing code the design relies on, opened at their cited lines: all checked statements hold (`HtmlPreviewer.vue:8,31-39,41-53,47-48`; `FileViewer.vue:71`; `workspaces.ts:13-58,60-104,83-85`; `remote-access-route-policy.ts:132-139`; `docs/file_explorer.md:232-234` "Blob-base limitation"; `workspaces.test.ts` uses `fastify().inject`). `remote-access-policy-plugin.ts:67-70` is the `onRequest` refusal (lines ~70-73 in the current file; off by a few lines, no impact).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (probe `static/current`; code) | Pass (DS-001) | Confirmed | — |
| BEH-002 | User | Pass | Pass (probe `blob/current`) | Pass (DS-002) | Confirmed | — |
| BEH-003 | User | Pass | Pass (same component; phone Artifacts only, SR-003) | Pass (DS-002) | Confirmed | — |
| BEH-004 | User | Pass | Pass (`ApplicationIframeHost` separate; not touched) | Pass (N/A, untouched) | Confirmed | — |
| BEH-005 | User | Pass | Pass (sandbox has no popups/forms/modals/top-nav) | Pass (flags unchanged except `allow-same-origin`; CSP header carries the same flag set) | Confirmed | — |
| BEH-006 | User | Pass | Pass (static URL top-level has node origin today) | Pass (probe `csp/top-level` origin `null`) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/preview-probe/` | Pass | Pass (investigation notes inventory, design-spec evidence table, requirements) | Pass (see Residual Risk R-1: `pixel.png` absent, so the relative-image check never measured a load) | Pass | Pass (evidence only, not behavior-defining) | None blocking |
| `follow-ups.md` | Pass | Pass (design Change Scope, handoff) | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug fix (security) + approved behavior change | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Local Implementation Defect`: one owner per side verified (one `<iframe>` preview component; one `/static/` consumer) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `No`, with reason | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ownership map, file mapping, triggers ruled out with reasons | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Workspace preview | Pass | Pass | N/A | Pass | Pass (inventory row lists two governing owners, one per side — iframe vs served document — which is the real split of authority, not a compound owner of one node) | Pass | Pass |
| DS-002 | Blob preview | Pass | Pass | N/A | Pass | Pass | Pass (blob revoke stays off-line) | Pass |
| DS-003 | Return/refusal | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `HtmlPreviewer` | Pass | Pass | Pass | Pass | Only preview iframe (grep `<iframe`: `HtmlPreviewer`, `ApplicationIframeHost`) |
| Workspace static route | Pass | Pass | Pass | Pass | Header set inside the route's success reply, not via a global hook |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| web previewer ↔ server route | Pass | Pass (no shared package for the literal; no global `onSend`; no `/content`) | Pass | Pass | Two independent layers by design |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `GET /rest/workspaces/:workspaceId/static/*` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Isolate preview documents | Pass | Pass (platform sandbox + CSP) | N/A | Pass | No existing CSP machinery in the node to reuse (grep) |
| Refuse preview requests | Pass | Pass (403 gate unchanged) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-web file viewers | Pass | Pass | Pass | Pass | — |
| autobyteus-server-ts REST workspaces | Pass | Pass | Pass | Pass | — |

Kinds and forms: both source kinds (workspace, blob) and every surface (Files area, Artifacts, team/collaboration references, local file, phone Artifacts) are traced through the one component. Pass.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `allow-scripts` flag in attribute and header | Pass | N/A | N/A | Pass | Two independent enforcement layers on different sides; sharing one literal across web and server would add coupling for no gain |

## Shared Structure / Data Model Tightness Verdict

N/A — no shared structure changes.

Derived consumers of a changed structure listed with a decision for each: `N/A`

Each domain word keeps one meaning: `Pass` (*workspace preview* / *blob preview* used consistently; `PREVIEW_DOCUMENT_SANDBOX` names what it is).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `HtmlPreviewer.vue` | Pass | Pass | N/A | Pass | — |
| `HtmlPreviewer.spec.ts` | Pass | Pass | N/A | Pass | Existing assertion of the sandbox string changes with the fix |
| `api/rest/workspaces.ts` | Pass | Pass | N/A | Pass | — |
| `tests/unit/api/rest/workspaces.test.ts` | Pass | Pass | N/A | Pass | Existing `inject` tests |
| `docs/file_explorer.md`, `docs/content_rendering.md` | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

N/A — no file added, moved or deleted.

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `allow-same-origin` | Pass | Pass | Pass | Pass | — |
| Blob `<base>` / `baseUrl` | Pass | Pass | Pass | Pass | Evidence: resolves relative URLs against the app's origin root (`file:///` packaged; node root in browser/phone), never the file's folder; documented as a limitation (`file_explorer.md:232-234`). Removal also stops same-document `#fragment` links from resolving to the app root. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Preview sandbox | No | Pass | Pass | Per-source exception and `Origin: null` allowance rejected in the log |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Browser storage written by previewed pages | `Not Affected` (app data); loss of page storage approved | Pass | Pass | N/A | Pass | Requirements Data Continuity |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Web, server, docs, validation | Pass | N/A (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| iframe, blob, route header | Yes | Pass | Pass (global `onSend`, `/content`, extra sandbox flags, `<base>`/shim) | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A previewed page can change node state with a request that carries no Origin (no-cors GET)

- Related approved requirement or established contract: REQ-003 second clause ("no request it can make without an Origin changes node state").
- Relevant behavior ID(s): BEH-001, BEH-002.
- Initiating basis kind: `User` (SCN-004, hostile HTML previewed — a supported explicit edge scenario by the Task's security contract).
- Independent product-supported initiating trigger: user previews untrusted HTML (Files area / Artifacts).
- Support evidence: SCN-004.
- Forward path: opaque preview document → `<img>`/`<script>`/`<link>` GET (no-cors, no Origin header; probe `server-log*.txt`) → node `onRequest`: `origin === undefined` → allowed → route policy trusted-network context → GET handler. Non-GET requests always carry `Origin: null` and are refused; forms and navigation are sandbox-blocked. GET handlers read: listed in `src/api` (status, settings, devices, file/media reads, health); GraphQL refuses mutations over GET (mercurius, investigation notes); `/r/*` credential proxy requires an unguessable run pass and loopback gate (`credential-proxy-routes.ts:94-96`); `…/backend/routes/*` forwards GETs to an installed application's own handlers (`application-backends.ts:76-100`).
- Lifecycle preconditions and material consequence: a state change would need a mutating GET handler. None found in the node's own routes. Application backend GETs are owned by each installed application; a no-Origin GET to them is equally possible from any web page the user visits in any browser today, because 403's gate allows an absent Origin (403's approved model, out of scope here). Responses are opaque to the page (no-cors), so nothing is read.
- Reachability: `Not Reachable` for a node-state change through the node's own routes; application-backend GET semantics are outside this ticket and not created by it.
- Review consequence / proportionate response: no finding; recorded as Residual Risk R-2 so validation and the design's REQ-003 evidence line are read with it.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer (per handoff rules); informational notice to the Solution Designer.

## Residual Risks

- **R-1 — Relative image load not actually measured.** `workspace/report.html` references `pixel.png`, which is not in `evidence/preview-probe/workspace/`, so `img-relative` is `error` in every frame including `static/current`. The server logs show the image GET is sent with no Origin (which the gate allows), so loading is expected, but REQ-004/AC-004 "images load" is not yet demonstrated. API/E2E's AC-004 page must include a real relative image.
- **R-2 — REQ-003 no-Origin GET clause** (MP-001): the design's evidence cites only the GraphQL GET guard. No node-owned GET route mutates state; application-backend GETs are application-owned and equally reachable from any website under 403's gate. Not new exposure; noted for completeness.
- **R-3 — Workspace preview refresh is unchanged by this design.** On the workspace path `updateSrc` reassigns the same URL when content changes (`HtmlPreviewer.vue:55-62`), so any refresh comes from outside the component. The design does not change this; AC-004 "preview updates after the file changes" should be checked as preserved behavior and, if it does not hold today, returned as a basis question rather than fixed silently in this ticket.
- **R-4 — Electron version.** Probe ran on 42.4.1; repository pins 42.11.16. Standard Chromium behavior; API/E2E validates on the worktree build (design already states this).
- Accepted upstream: RSK-001 (exfiltration of the page's own content); FU-001 (loopback origins); FU-002 (other file routes).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 `Not Reachable` for node-owned routes)
- Notes: Small / High classification confirmed. Design is concrete and actionable in the current code; two independent enforcement layers (iframe attribute for every preview, CSP header for every static-route document) are correctly owned and measured in Electron.
