# Diagram Zoom Viewer Design Spec

## Current-State Read

The approved behavior basis is [requirements.md](./requirements.md), supported by [investigation-notes.md](./investigation-notes.md) and the approved [ui-ux-spec.md](./ui-ux-spec.md).

The relevant current production path is centralized rather than fragmented:

`Markdown consumer -> MarkdownRenderer -> useMarkdownSegments -> MermaidDiagram -> mermaidService -> inline SVG`

`useMarkdownSegments.ts` classifies fenced `mermaid` and `mmd` blocks. `MarkdownRenderer.vue` is the shared Markdown boundary and delegates each Mermaid segment to `MermaidDiagram.vue`. `MermaidDiagram.vue` owns loading, error, and successful SVG state and calls `mermaidService.ts`, which wraps Mermaid 11.12.3.

The ownership is healthy for this scope. The problem is a missing inspectability invariant inside the existing Mermaid owner:

- the successful SVG's immediate flex child does not explicitly occupy the available inline width;
- detailed or high-aspect-ratio diagrams can remain unreadable even when correctly fitted;
- no expand, zoom, pan, or fit path exists;
- `MermaidDiagram.vue` contains unused hover state and a container ref but no completed interaction;
- the existing success wrapper and generated root SVG use the same ID, creating unnecessary duplicate DOM IDs;
- when SVG is teleported into a future dialog, native anchor clicks will no longer bubble to `MarkdownRenderer`, so preserved external-link routing needs an explicit return event.

The existing `FullScreenImageModal.vue` is not a reusable owning boundary for this change. It is tied to image URLs, download/copy/gallery semantics, and an `<img>` element. Converting Mermaid SVG into an image URL would discard live SVG interactions and mix unrelated subjects.

Constraints:

- keep all existing Markdown consumers behind the shared `MarkdownRenderer` boundary;
- keep Mermaid source rendering in `MermaidDiagram`/`mermaidService`;
- keep the visible interaction minimal: `−`, `Fit`, `+`, and close only;
- `Escape` closes the modal; `Fit` restores the overview;
- preserve Mermaid links, loading/error behavior, source changes, vector output, and message/file content;
- avoid simultaneous duplicate mounting of the same SVG markup because Mermaid emits internal IDs;
- require rendered-browser evidence for focal zoom, pan extents, responsive toolbar, and focus/background behavior.

## Intended Change

Extend the existing Mermaid rendering capability with two coordinated views owned by `MermaidDiagram.vue`:

1. **Inline overview:** make the SVG host full-width up to Mermaid's intrinsic maximum, add a persistent expand button, and let a non-interactive preview click open the viewer.
2. **Expanded inspection:** mount a new internal `MermaidDiagramViewer.vue` through `Teleport`, move the current successful SVG markup from the inline host into that viewer while open, and provide fitted vector rendering, click-first zoom controls, pointer-centered wheel zoom, pointer/touch pan, reset/fit, accessible modal focus, and conventional dismissal.

A small pure geometry file, `mermaidDiagramViewport.ts`, owns fit/plane/anchored-scroll calculations so the viewer component does not bury critical numeric policy in DOM event handlers and the calculations can be tested without browser-layout fakes.

No parent above `MarkdownRenderer` changes. No new dependency, API, backend path, store, persistence, image conversion, or compatibility branch is introduced.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001–REQ-002; AC-001–AC-004 | Shared Markdown surface receives a closed Mermaid fence and render succeeds | Investigation “Relevant Existing Behavior” BEH-001; screenshots; current renderer/component files | Inline host uses available width up to intrinsic cap; persistent expand and non-interactive preview activation open the viewer | Consumer -> MarkdownRenderer -> parser -> MermaidDiagram render owner -> inline success shell -> expand; DS-001, DS-002 |
| BEH-002 | User | REQ-006; AC-011 | User activates an HTTP(S) Mermaid anchor or other interactive SVG descendant | Investigation BEH-002; `MarkdownRenderer.handleLinkClick` | Interactive descendants are never treated as expand/pan/dismiss; expanded HTTP(S) anchors explicitly return to MarkdownRenderer's existing external-link owner | Inline anchor -> MarkdownRenderer DOM route, or viewer anchor -> custom event -> MermaidDiagram -> MarkdownRenderer -> Electron/window; DS-006 |
| BEH-003 | System | REQ-007; AC-012 | Mermaid component mounts or source prop changes | Investigation BEH-003; `MermaidDiagram.vue` lifecycle | Loading/error remain; every render generation invalidates the viewer and only the latest async render may commit current SVG | Source -> generation token -> service -> current-generation gate -> success/error; DS-004 |
| BEH-004 | Contract | REQ-008; AC-013 | Any production consumer uses `MarkdownRenderer` | Investigation BEH-004 and consumer inventory | All consumers receive behavior through shared boundaries; no consumer-specific viewer state or props | Consumer -> MarkdownRenderer -> MermaidDiagram -> viewer; DS-001, DS-002 |
| BEH-005 | User | REQ-003–REQ-005, REQ-009; AC-005–AC-010, AC-014 | User expands a current successful SVG | Investigation BEH-005: no current path | Open fitted viewer; visible `− Fit + ×`; optional wheel/keyboard accelerators; pan overflow; fit/reset; close and restore context | Expand -> MermaidDiagram state -> viewer -> measured fit -> zoom/pan -> fit or close -> inline/focus restored; DS-002, DS-003, DS-005 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer/tickets/in-progress/diagram-zoom-viewer/ui-ux-spec.md` | Defines user journeys, four-control toolbar, loading/error behavior, responsive layout, input modes, and accessibility | REQ-001–REQ-009; AC-001–AC-014 | Authoritative user-visible interaction contract used to shape component state and validation | `Refined`; approval required and approved by user 2026-07-20 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` / `Behavior Change`
- Current design issue found: `Yes`, bounded to Mermaid presentation.
- Root cause classification: `Missing Invariant`
- Refactor needed now: `No`
- Evidence: The shared parser, Markdown boundary, Mermaid owner, and service already form a coherent path used by all relevant production surfaces. Missing behavior is local: the success view lacks a coherent width and inspectable-detail path. Adjacent image viewing is not the same subject.
- Design response: Extend the existing Mermaid owner, add one internal viewer and one testable geometry module, and preserve Markdown external-link authority via an explicit return event from teleported SVG content.
- Refactor rationale: No owner, API subject, persistence model, or folder boundary must change. The new viewer is an internal capability of the correct owner. Extracting or redesigning the image modal would enlarge risk without improving the Mermaid boundary.
- Intentional deferrals and residual risk: Generic zoom/pan reuse with `FullScreenImageModal` is deliberately deferred because the image modal has different data and actions. Residual duplication is conceptual only; no shared stable interaction contract presently exists. If another live-vector viewer is added later, the geometry module can be evaluated for broader ownership then, rather than generalized speculatively now.

## Terminology

- **Inline overview:** The successful Mermaid SVG embedded in normal Markdown flow.
- **Expanded viewer:** The teleported modal that temporarily owns the one mounted copy of the current SVG.
- **Fitted size:** The largest aspect-preserving SVG size that fully fits within the current viewer canvas.
- **Zoom factor:** A clamped multiplier relative to fitted size; `1` is Fit and `4` is the approved maximum.
- **Diagram plane:** The real scroll-extent element sized to contain either the canvas or the scaled SVG, whichever is larger.
- **Interactive descendant:** An SVG descendant representing a link/control/clickable Mermaid node and therefore excluded from expand or pan-start behavior.

## Design Reading Order

This design follows current state -> approved behavior -> spines/owners -> interfaces -> files -> sequence. The primary visible flow stays simple even though viewport geometry and focus behavior are implemented rigorously behind it.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete in-scope items:
  - unused `isHovering` state and root mouseenter/mouseleave assignments in `MermaidDiagram.vue`;
  - unused `containerRef` in `MermaidDiagram.vue`;
  - duplicate `:id="uniqueDiagramId"` on the SVG host wrapper when the generated root SVG already owns that Mermaid render ID;
  - current auto-width success-host shape, replaced directly by the full-width inline host.
- No compatibility prop, legacy no-viewer branch, alternative image conversion, or dual rendering path remains after the change.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Existing message/Markdown text may contain Mermaid fences; no storage read/write is changed.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal reader/writer behavior and representative evidence: Existing Markdown source continues through `useMarkdownSegments` and `mermaidService` unchanged.
- Required semantics and invariants under direct use: Current text, Mermaid syntax, links, and render result remain unchanged; new viewport state is ephemeral.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No new storage, credential, or network path.
- Decision: `Not Affected`
- Decision rationale: The task changes only DOM presentation and local input state. Migration would have no subject or benefit.
- Acceptance criteria or design constraints supported by this decision: REQ-007–REQ-008; AC-012–AC-013.

### Migration Plan

N/A — persisted data is not affected.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-004 | Supported Mermaid fence reaches a Markdown consumer | Successful full-width inline overview and expand affordance | `MermaidDiagram.vue` behind `MarkdownRenderer.vue` | Preserves the real render path and central reuse. |
| DS-002 | Primary End-to-End | BEH-001, BEH-004, BEH-005 | User activates expand/non-interactive preview | Expanded fitted SVG and usable four-action toolbar | `MermaidDiagram.vue` owns opening/current SVG; viewer owns open-session interaction | Delivers the core user value. |
| DS-003 | Return-Event | BEH-005 | User closes via ×, Escape, or backdrop | Viewer unmounted, inline SVG remounted, source layout/focus restored | `MermaidDiagram.vue` | Makes exit conventional and preserves reading context. |
| DS-004 | Bounded Local | BEH-003 | Mount/source update starts Mermaid render | Only latest generation commits success/error and controls | `MermaidDiagram.vue` | Prevents a stale SVG from becoming inspectable. |
| DS-005 | Bounded Local | BEH-005 | Viewer mounts/resizes or receives zoom/pan input | Clamped zoom, real scroll extents, anchored scroll, or fitted reset | `MermaidDiagramViewer.vue` with pure geometry module | Makes every vector region reachable while keeping UI simple. |
| DS-006 | Primary End-to-End | BEH-002 | User activates a Mermaid anchor/clickable node | Existing external-link or descendant behavior occurs without viewer action | `MarkdownRenderer.vue` remains external-link owner | Protects existing SVG interaction across Teleport. |

## Primary Execution Spine(s)

### DS-001 — Render inline overview

`Markdown consumer -> MarkdownRenderer -> useMarkdownSegments -> MermaidDiagram render lifecycle -> mermaidService -> current SVG -> full-width inline overview`

### DS-002 — Inspect a diagram

`Inline expand/non-interactive click -> MermaidDiagram open state + preview height lock -> MermaidDiagramViewer Teleport -> fitted SVG canvas -> visible zoom/fit controls or pointer pan -> readable detail`

### DS-006 — Preserve diagram links

`Mermaid anchor activation -> interactive-target filter -> inline Markdown DOM route OR expanded custom event -> MarkdownRenderer external-link policy -> Electron openExternalLink / browser window.open`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The existing shared Markdown path isolates Mermaid source, renders one current SVG, and presents it inside a width-owning success shell with one visible expand affordance. | Markdown boundary, Mermaid render owner, current SVG, inline overview | `MermaidDiagram.vue` | Mermaid adapter, localization |
| DS-002 | A successful preview records its height, unmounts its SVG copy, and mounts the same SVG markup once inside a body-teleported viewer. The viewer measures vector aspect ratio and exposes only `− Fit + ×`. | Expand trigger, current SVG, viewer session, viewport | `MermaidDiagram.vue` then `MermaidDiagramViewer.vue` | Geometry calculations, Iconify, ResizeObserver |
| DS-003 | Any accepted dismissal emits close; the parent removes the viewer, remounts inline SVG inside its locked-height shell, clears the height lock after layout, and returns focus when the opener remains. | Close request, viewer session, inline overview, opener | `MermaidDiagram.vue` | Body scroll restoration, next-tick focus |
| DS-004 | Every render obtains a monotonically increasing generation. Opening is invalidated immediately on source change; only the matching generation may write SVG/error/loading state. | Source generation, render request, current result | `MermaidDiagram.vue` | Mermaid service/logging |
| DS-005 | Viewer mount/resize reads the root SVG viewBox, computes fitted dimensions, makes a plane with real scaled extents, and updates scroll around a pointer or canvas-center anchor. Pointer drag changes scroll, and Fit restores factor 1/origin. | Canvas, fitted size, zoom factor, plane, scroll | `MermaidDiagramViewer.vue` | Pure geometry module, Pointer Events, ResizeObserver |
| DS-006 | Interactive descendants are excluded from expand and pan-start. Teleported HTTP(S) anchors emit a custom return event through MermaidDiagram to MarkdownRenderer because native DOM bubbling no longer reaches it. | SVG interaction, link event, Markdown link boundary | `MarkdownRenderer.vue` | Electron/window adapter already inside MarkdownRenderer |

## Spine Actors / Main-Line Nodes

- **Markdown consumer:** Existing conversation, team/task, or file-preview surface; initiates rendering but owns no diagram behavior.
- **MarkdownRenderer:** Thin shared segment boundary and authoritative owner of Markdown external-link routing.
- **MermaidDiagram:** Governing Mermaid presentation owner; owns source render lifecycle, current SVG, inline success shell, open state, height lock, and focus return.
- **mermaidService:** Mermaid library adapter; transforms source into an SVG string.
- **MermaidDiagramViewer:** Governing owner for one open inspection session; owns modal semantics, fit/zoom/pan state, pointer/keyboard input, and cleanup.
- **mermaidDiagramViewport:** Internal pure geometry mechanism used by the viewer; owns calculations, not lifecycle or DOM.

## Ownership Map

| Node | Owns | Does Not Own |
| --- | --- | --- |
| Markdown consumer | Which Markdown content is displayed | Mermaid viewer state, sizing, or controls |
| MarkdownRenderer | Segment delegation and external HTTP(S) link routing | Mermaid render lifecycle or zoom state |
| MermaidDiagram | Current render generation/result, successful inline UI, open/close state, one-copy invariant, preview layout lock, focus return | Viewport geometry details or external-link execution |
| mermaidService | Mermaid initialization/render call | UI state, viewport, modal behavior |
| MermaidDiagramViewer | Open-session modal/focus/body-scroll lifecycle; four controls; measurements; zoom/pan/fit | Rendering Mermaid source, persisting state, image actions, parent focus target |
| mermaidDiagramViewport | Pure fit, plane-size, zoom-clamp, and anchored-scroll calculations | DOM access, event listeners, Vue state |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MarkdownRenderer.vue` Mermaid branch | `MermaidDiagram.vue` | Shared Markdown segments need one component boundary | Diagram open state, geometry, modal controls |
| `mermaidService.render(content, id)` | Mermaid library | Isolate library initialization/rendering | Viewer state or layout policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `isHovering` and mouseenter/mouseleave wiring | State has no current effect; persistent control replaces speculative hover-only UI | Inline success state in `MermaidDiagram.vue` | In This Change | Do not leave dead compatibility state. |
| `containerRef` on current diagram content | Unused; target uses explicit inline shell ref and viewer-owned canvas refs | `inlinePreviewRef` and viewer refs with defined responsibilities | In This Change | Rename rather than reuse vague ref. |
| Wrapper `:id="uniqueDiagramId"` | Duplicates generated root SVG ID | Generated SVG root remains sole owner of Mermaid render ID | In This Change | Viewer wrapper uses data-test/class, not Mermaid ID. |
| Auto-width SVG host shape | Can underuse available width | Full-width, intrinsic-capped inline host | In This Change | Clean-cut CSS replacement. |

## Return Or Event Spine(s) (If Applicable)

### DS-003 — Viewer close and context restoration

`Close button / Escape / backdrop -> MermaidDiagramViewer emits close -> MermaidDiagram clears open state -> viewer cleanup restores body overflow -> inline SVG remounts inside locked-height shell -> height lock clears -> expand button receives focus`

Focus return is skipped when a source re-render invalidates the viewer and removes the successful opener; no synthetic fallback focus target is invented.

### DS-006 — Expanded external link

`Viewer SVG anchor click -> viewer recognizes HTTP(S) interactive target and prevents in-modal navigation -> emits external-link URL -> MermaidDiagram forwards event -> MarkdownRenderer.openExternalLink -> Electron API or browser fallback`

Non-HTTP(S) interactive descendants are not converted to expand/pan; their native behavior remains unchanged.

## Bounded Local / Internal Spines (If Applicable)

### DS-004 — Current render generation

- Parent owner: `MermaidDiagram.vue`
- Chain: `mount/content change -> increment generation + close viewer -> loading/clear -> mermaidService.render -> compare generation -> commit current success/error -> expose expand only on current success`
- Why it matters: An open viewer makes stale async render commitment user-visible and therefore unacceptable.

### DS-005 — Viewer viewport

- Parent owner: `MermaidDiagramViewer.vue`
- Chain: `mount/resize -> read canvas + SVG viewBox -> calculate fitted size -> factor 1 -> zoom request -> clamp -> calculate plane/scaled size -> calculate anchored scroll -> update actual scroll; pointer drag -> update actual scroll; Fit -> factor 1 + origin`
- Why it matters: CSS transforms alone do not guarantee scrollable extents. The plane must own real geometry so every edge stays reachable.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization catalogs | DS-001–DS-003, DS-005 | MermaidDiagram and viewer | English/zh-CN labels for expand, title, −, Fit, +, close, canvas | User-facing controls require current localization ownership | Hard-coded text or generated-catalog edits would drift. |
| Iconify | DS-001–DS-003 | MermaidDiagram/viewer | Decorative expand/zoom/close glyphs | Established visual dependency | New icon system would be unnecessary. |
| Pure viewport geometry | DS-005 | Viewer | Numeric fit/plane/anchor calculations | Keeps critical math deterministic/testable | DOM handlers become unreviewable and happy-dom-dependent. |
| ResizeObserver | DS-005 | Viewer | Recompute fitted dimensions after viewport/toolbar/text-zoom change | Responsive viewer | Global window sizing logic would miss container changes. |
| Body scroll lock | DS-003, DS-005 | Viewer | Save prior inline overflow, set hidden during mount, restore exactly on unmount | Prevent background scrolling | Global permanent class or blind reset could corrupt other state. |
| Focus trap | DS-003, DS-005 | Viewer | Initial focus, Tab containment, Escape close | Modal accessibility | Reusing drawer stack would mix overlay subjects. |
| Console error reporting | DS-004 | MermaidDiagram | Preserve current render failure log | Existing operational visibility | Viewer must not swallow render errors. |

## Ownership Boundaries

- Existing production surfaces depend only on `MarkdownRenderer`; they must not import the viewer or pass diagram-viewer props.
- `MarkdownRenderer` remains the authoritative boundary for HTTP(S) Markdown link routing. It may listen to a Mermaid custom event but must not own diagram state.
- `MermaidDiagram` remains the authoritative Mermaid presentation owner. It alone calls `mermaidService`, decides which SVG is current, and decides whether inspection can open.
- `MermaidDiagramViewer` is internal to Mermaid presentation. It accepts already-rendered SVG markup and must never call `mermaidService`, parse Markdown, or infer a parent consumer.
- `mermaidDiagramViewport.ts` is internal calculation policy. It receives explicit numeric shapes and returns numeric shapes; it must not read DOM or Vue state.
- `FullScreenImageModal` remains independent and unchanged.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MarkdownRenderer.vue` | Segment parser integration, external-link routing | Conversation/team/task/file Markdown consumers | Consumer importing MermaidDiagramViewer or opening links itself | Add a shared renderer event/prop only if a real consumer contract requires it; not needed here. |
| `MermaidDiagram.vue` | Render generation, current SVG, inline/open coordination | `MarkdownRenderer.vue` | MarkdownRenderer calling viewer or mermaidService directly | Strengthen MermaidDiagram's internal component/event boundary. |
| `MermaidDiagramViewer.vue` | Modal lifecycle, toolbar/input state, DOM measurement/scroll | `MermaidDiagram.vue` only | Parent mutating zoom/pan refs or viewer calling parent DOM | Keep a singular SVG prop and close/link events. |
| `mermaidDiagramViewport.ts` | Pure geometry | MermaidDiagramViewer only | Tests/components duplicating formulas | Add/tighten explicit geometry functions, not DOM access. |

## Dependency Rules

Allowed:

- Markdown consumers -> `MarkdownRenderer.vue`.
- `MarkdownRenderer.vue` -> `useMarkdownSegments` and `MermaidDiagram.vue`.
- `MermaidDiagram.vue` -> `mermaidService.ts` and `MermaidDiagramViewer.vue`.
- `MermaidDiagramViewer.vue` -> `mermaidDiagramViewport.ts`, Vue Teleport/lifecycle APIs, DOM Pointer/Resize APIs, localization, and Iconify.
- Viewer custom `external-link` event -> MermaidDiagram forward -> MarkdownRenderer external-link handler.

Forbidden:

- Any consumer above MarkdownRenderer -> viewer, geometry module, or mermaidService.
- Viewer -> Mermaid source, Markdown parser, Mermaid service, stores, Electron API, or persistence.
- Geometry module -> Vue, DOM, localization, or component refs.
- `MermaidDiagram` -> `FullScreenImageModal` or SVG-to-image conversion.
- Two simultaneous DOM copies of the same rendered SVG string.
- A compatibility prop that retains an old success rendering branch.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `MermaidDiagram` prop `content: string` | Mermaid source | Current source to render | Mermaid definition text | Existing public interface preserved. |
| `MermaidDiagram` prop `diagramId?: string` | Render identity | Optional explicit Mermaid render identity | Single string | Existing interface preserved; generated root SVG remains sole DOM owner. |
| `MermaidDiagram` event `external-link(url)` | Expanded diagram link request | Forward teleported HTTP(S) link to MarkdownRenderer | Absolute URL string | New return event; no viewer state payload. |
| `MermaidDiagramViewer` prop `svgContent: string` | Current rendered vector | Display exactly one already-successful SVG | Non-empty SVG string from owner | Internal component contract; no source or ID prop. |
| `MermaidDiagramViewer` event `close` | Viewer session | Request conventional dismissal | No payload | Parent owns open state/focus return. |
| `MermaidDiagramViewer` event `external-link(url)` | Expanded vector link | Request Markdown link-owner handling | Absolute HTTP(S) URL string | Viewer filters interaction and prevents local navigation. |
| `calculateFittedDiagramSize(viewBox, canvas)` | Viewport geometry | Aspect-preserving fitted dimensions | Positive finite numeric sizes | Pure function. |
| `calculateDiagramPlane(canvas, fitted, zoom)` | Scroll geometry | Real plane and scaled stage dimensions | Positive sizes; clamped zoom | Pure function. |
| `calculateAnchoredScroll(before, after, anchor)` | Zoom focus | Preserve inspected point after scale change | Explicit rectangles/scroll/anchor point | Pure function; returns clamped scroll target. |
| `mermaidService.render(content, id)` | Mermaid render | Produce SVG | Existing source/id | Unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| MermaidDiagram props/events | Yes | Yes | Low | None. |
| Viewer props/events | Yes | Yes | Low | Keep source/rendering out. |
| Geometry functions | Yes | Yes | Low | Reject non-finite/zero dimensions through safe fallback. |
| Mermaid service | Yes | Yes | Low | Preserve. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Mermaid renderer owner | `MermaidDiagram` | Yes | Low | Preserve. |
| Expanded inspection owner | `MermaidDiagramViewer` | Yes | Low | Avoid generic `Modal`/`ZoomHelper`. |
| Viewport geometry | `mermaidDiagramViewport` | Yes | Low | Keep Mermaid-specific until real reuse appears. |
| Reset control | UI label `Fit` / function `fitDiagram` | Yes | Low | Do not label Escape as reset. |
| Plane | `diagramPlane` | Yes | Low | Use consistently for scroll extent, not SVG host. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Markdown parsing/delegation | Shared Markdown renderer | Reuse | Already owns supported Mermaid segmentation. | N/A |
| Mermaid rendering | MermaidDiagram + mermaidService | Extend | Correct source/result owner. | N/A |
| Icons | Iconify | Reuse | Existing dependency and visual convention. | N/A |
| Localization | Hand-authored workspace catalogs | Extend | Correct current semantic label owner. | N/A |
| Image zoom modal | FullScreenImageModal | Reuse rejected | Different subject, URL/gallery actions, `<img>`, and no live SVG semantics. | New specialized viewer is required by subject and one-copy/link invariants. |
| Drawer accessibility stack | useAccessibleDrawer | Reuse rejected | It owns independent shell drawer stacking and return-to-strip behavior, not a child modal. | Viewer-local modal lifecycle is narrower and avoids mixed overlay authority. |
| Viewport geometry | No coherent shared capability | Create New | Nontrivial vector fit/scroll math is new and Mermaid-specific. | Generic extraction would be speculative; image modal uses different transform behavior. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared Markdown rendering | Segment classification/delegation and external-link policy | DS-001, DS-006 | MarkdownRenderer | Reuse/Extend | One new custom event binding only. |
| Mermaid presentation | Render lifecycle, inline overview, open state, viewer session | DS-001–DS-005 | MermaidDiagram | Extend | Primary task subsystem. |
| Mermaid viewport geometry | Fit, scaled plane, anchor-preserving scroll | DS-005 | MermaidDiagramViewer | Create New | Internal pure file, not global utility. |
| Workspace localization | New control/title labels | DS-001–DS-005 | Mermaid UI owners | Extend | English + zh-CN. |
| Content rendering documentation | Durable behavior description | All | Delivery/documentation owner | Extend | Delivery stage owns final docs sync. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `MermaidDiagram.vue` | Mermaid presentation | Governing owner | Render generation/current SVG, inline shell, viewer open/close, preview lock, focus return, event forwarding | One component owns the source-to-two-views lifecycle | Uses service/viewer |
| `MermaidDiagramViewer.vue` | Mermaid presentation | Internal viewer owner | Modal/toolbar/focus/body lock/DOM measurement/pointer orchestration | One open viewer session is one cohesive UI owner | Uses pure geometry |
| `mermaidDiagramViewport.ts` | Mermaid viewport geometry | Internal calculation boundary | Pure numeric fit/plane/anchor math and constants/types | Separates critical math from DOM/event lifecycle | N/A |
| `MermaidDiagram.spec.ts` | Mermaid presentation tests | Owner coverage | Render lifecycle, entry, interaction filtering, one-copy, focus return, event forwarding | Tests parent component contract | Mocks service/viewer as appropriate |
| `MermaidDiagramViewer.spec.ts` | Viewer tests | Owner coverage | Modal semantics, four controls, keyboard/focus/body cleanup, pointer hooks | Tests UI lifecycle | Stubs geometry/layout |
| `mermaidDiagramViewport.spec.ts` | Geometry tests | Calculation coverage | Aspect ratios, clamping, plane extents, anchored scroll | Pure deterministic coverage | Tests module directly |
| Locale catalogs | Localization | Locale owner | New labels | Existing language boundaries | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Fit/plane/anchored-scroll formulas repeated across viewer handlers/tests | `mermaidDiagramViewport.ts` | Mermaid presentation | One calculation source supports toolbar, wheel, resize, and tests | Yes | Yes | Generic media zoom kitchen sink |
| Modal focus selector | None | Viewer | Used only in viewer and short enough to stay private | N/A | N/A | New one-use global accessibility helper |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `DiagramSize { width, height }` | Yes | Yes | Low | Use for viewBox/canvas/fitted/plane values with contextual parameter names; do not add optional DOM fields. |
| Anchored-scroll input/output | Yes | Yes | Low | Keep explicit stage offsets, current scroll, anchor point, and max scroll; no DOM objects. |
| Zoom constants | Yes | Yes | Low | Keep `MIN=1`, `MAX=4`, button step in geometry/viewer boundary; no separate percentage model. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Shared Markdown rendering | Public Markdown boundary | Bind forwarded expanded-link event to existing `openExternalLink` policy | Small extension of existing authority | Existing handler |
| `autobyteus-web/components/conversation/segments/renderer/MermaidDiagram.vue` | Mermaid presentation | Governing Mermaid owner | Current render, inline success/open coordination, one-copy/layout/focus invariant, viewer event forwarding | Cohesive source/result lifecycle | Viewer + service |
| `autobyteus-web/components/conversation/segments/renderer/MermaidDiagramViewer.vue` | Mermaid presentation | Internal viewer owner | Teleported modal and open-session interaction | Cohesive session lifecycle; math extracted | Geometry module |
| `autobyteus-web/components/conversation/segments/renderer/mermaidDiagramViewport.ts` | Mermaid viewport geometry | Internal calculation boundary | Pure fit/plane/anchor calculations | Critical deterministic policy | N/A |
| `.../renderer/__tests__/MarkdownRenderer.spec.ts` | Shared Markdown tests | Boundary coverage | Verify forwarded expanded HTTP(S) link uses existing external-link route | Protects return spine | Existing mocks |
| `.../renderer/__tests__/MermaidDiagram.spec.ts` | Mermaid presentation tests | Owner coverage | Render/open/current-result/interaction/focus/event behavior | Direct missing coverage | Service mock |
| `.../renderer/__tests__/MermaidDiagramViewer.spec.ts` | Viewer tests | Owner coverage | Minimal toolbar/modal/keyboard/body/pointer lifecycle | Direct viewer contract | Geometry/layout fixtures |
| `.../renderer/__tests__/mermaidDiagramViewport.spec.ts` | Geometry tests | Calculation coverage | Numeric edge/aspect/anchor cases | Direct pure coverage | N/A |
| `autobyteus-web/localization/messages/en/workspace.ts` | Localization | English catalog | Semantic viewer labels | Existing catalog | N/A |
| `autobyteus-web/localization/messages/zh-CN/workspace.ts` | Localization | zh-CN catalog | Matching translations | Existing catalog | N/A |
| `autobyteus-web/docs/content_rendering.md` | Durable docs | Content-rendering documentation | Document inline expand and four-control viewer behavior | Existing architecture chapter | Delivery stage |

## Applied Patterns (If Any)

- **Owner with internal specialized view:** `MermaidDiagram` retains authoritative source/result state; the viewer is a child concern rather than a peer coordinator.
- **One mounted representation:** Inline SVG is unmounted while the expanded SVG is mounted; a locked inline height preserves page layout.
- **Pure geometry boundary:** Numeric viewport calculations are extracted from DOM orchestration without generalizing to unrelated media.
- **Return event across Teleport:** Expanded native DOM events that cannot bubble to MarkdownRenderer are translated into a narrow Vue custom event back to the existing link owner.
- **Generation gate:** Latest render generation is the only result allowed to become current.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/conversation/segments/renderer/` | Folder | Shared Markdown/Mermaid rendering | Existing renderer subsystem plus specialized viewer/geometry | All relevant components already live here; a flat addition is clearer than a one-feature nested folder | Consumer state, persistence, backend APIs |
| `.../MarkdownRenderer.vue` | File | Public Markdown boundary | Segment delegation and link authority | Existing owner | Zoom/pan state |
| `.../MermaidDiagram.vue` | File | Mermaid owner | Render and inline/expanded coordination | Existing owner | Geometry formulas, image actions |
| `.../MermaidDiagramViewer.vue` | File | Viewer owner | Modal interaction session | Direct child concern | Mermaid parsing/rendering, storage |
| `.../mermaidDiagramViewport.ts` | File | Geometry boundary | Pure calculations | Same subsystem, specialized name, testable | DOM/Vue/Electron |
| `.../renderer/__tests__/` | Folder | Colocated test boundary | Direct component and geometry coverage | Repository convention | E2E-only environment logic |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` | File | Locale owners | New labels | Current semantic override catalogs | Hard-coded component labels |
| `autobyteus-web/docs/content_rendering.md` | File | Durable docs | Describe supported viewer | Existing content rendering chapter | Implementation logs |

The renderer folder remains flat because there is one existing Mermaid owner, one internal view, and one math file; adding a nested module or moving existing service/files would create artificial structural depth for a bounded feature.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/.../renderer/` | Mixed Justified | Yes | Low | Established shared rendering subsystem; component + its specialized calculation remain readable together. |
| `renderer/__tests__/` | Off-Spine Concern | Yes | Low | Repository colocation convention. |
| `localization/messages/...` | Off-Spine Concern | Yes | Low | Existing locale ownership. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Normal UX | `open -> + -> + -> drag if needed -> Fit -> Escape` | Hover-only toolbar, percentage dropdown, minimap, mode switcher | Matches user-approved familiar journey. |
| Ownership | `MarkdownRenderer -> MermaidDiagram -> MermaidDiagramViewer` | Every conversation/file consumer imports viewer | Keeps shared behavior consistent. |
| One-copy invariant | `inline SVG v-if !open; locked-height placeholder; viewer SVG v-if open` | Keep inline SVG hidden while cloning same IDs into Teleport | Prevents ID collisions without scroll jump. |
| Teleported links | `viewer emits URL -> MermaidDiagram forwards -> MarkdownRenderer opens` | Viewer directly calls Electron API or lets expanded anchor bypass existing policy | Preserves authoritative link boundary. |
| Scroll geometry | `stage has real fittedSize × zoom dimensions inside explicit plane` | CSS `transform: scale(...)` only | Visual scaling alone may leave unreachable edges. |
| Input filtering | `closest(interactive selector/clickable Mermaid node) => preserve action` | Any SVG click opens viewer or starts pan | Protects link/callback semantics. |
| Geometry | Pure numeric functions with explicit sizes/anchor | DOM-querying global zoom helper | Makes correctness reviewable and bounded. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Optional `enableDiagramViewer` prop defaulting off | Could limit rollout per consumer | Rejected | Shared successful Mermaid behavior changes once for all consumers, as approved. |
| Keep old inline host alongside new host | Could reduce CSS risk | Rejected | Replace auto-width host directly and test complex/simple diagrams. |
| Render SVG both inline and expanded | Simplifies open transition | Rejected | Use locked-height placeholder and one mounted SVG copy. |
| Convert SVG to image and use FullScreenImageModal | Reuses existing modal | Rejected | Specialized live-SVG viewer preserves IDs, vector semantics, and links. |
| Let viewer open external links directly through Electron/window | Avoids event forwarding | Rejected | Return event preserves MarkdownRenderer authority. |

## Derived Layering (If Useful)

N/A as a primary design device. The meaningful structure is ownership-led: shared Markdown boundary -> Mermaid owner -> internal viewer, with a pure geometry concern beside the viewer.

## Change / Refactor Sequence

1. Add pure `mermaidDiagramViewport.ts` types/constants/calculations and deterministic tests for fit, max/min clamping, plane extents, and anchored scroll.
2. Add English and Simplified Chinese labels for expand, viewer title/canvas, zoom out, fit, zoom in, and close.
3. Implement `MermaidDiagramViewer.vue` against the geometry boundary:
   - Teleport to body and mount only for a non-empty successful SVG;
   - render title and exactly four persistent action buttons (`− Fit + ×`);
   - read SVG viewBox, compute fitted size, size real diagram plane/stage, observe canvas resize;
   - implement button/keyboard zoom, pointer-centered wheel zoom, pointer/touch drag, Fit, disabled bounds;
   - implement interactive-descendant filtering and expanded HTTP(S) link event;
   - implement focus entry/trap, Escape close, backdrop close, prior body-overflow restoration, and unmount cleanup.
4. Modify `MermaidDiagram.vue`:
   - add render-generation gate and invalidate/close inspection on source change;
   - replace current success host with a full-width intrinsic-capped shell and persistent expand button;
   - filter non-interactive preview activation;
   - capture/lock preview height on open, mount only one SVG copy, restore height/focus on close;
   - forward viewer external-link event;
   - remove unused hover/ref wiring and duplicate wrapper ID.
5. Modify `MarkdownRenderer.vue` to bind the forwarded event to its existing external-link policy; leave consumer API unchanged.
6. Add/update direct component tests for all parent/viewer/link/lifecycle contracts. Run targeted Nuxt tests and implementation-scoped static/type checks.
7. Leave realistic browser scenarios to `api_e2e_engineer`: complex flowchart, wide sequence diagram, narrow viewport, 200% text zoom, wheel focal stability, pointer/touch-equivalent pan, focus containment/return, body scroll, and external link routing.
8. Delivery stage updates `docs/content_rendering.md` with the approved behavior after integrated-state validation.

There is no temporary compatibility seam; each step builds toward the one target path.

## Key Tradeoffs

- **Specialized viewer vs generic media modal:** Specialized wins because Mermaid is live SVG with internal IDs/links; generic reuse would mix unrelated download/gallery semantics.
- **Four visible controls vs feature-rich toolbar:** Four controls win because the user explicitly prefers simple, familiar clicking. Gestures/shortcuts remain accelerators without added chrome.
- **Pure geometry file vs all-in-one component:** A small specialized math file adds one boundary but materially improves correctness and testability of fitted/anchored scrolling.
- **One SVG copy vs seamless hidden duplicate:** One copy avoids ID collisions. The parent-owned height lock preserves page layout during the modal.
- **Escape close vs Escape fit:** Close follows modal convention and the user's broader request for familiar behavior. The visible `Fit` button provides an unambiguous reset.
- **No generic accessibility composable:** Viewer-local logic avoids misusing the drawer stack. Generalization should wait for a real second modal contract.

## Risks

- SVG diagram types may expose different viewBox/size shapes. Use viewBox first with safe root-bounds fallback and browser fixtures for a flowchart plus sequence diagram.
- Pointer-centered zoom can drift if stage offset/plane changes are not included. Geometry API must model offsets explicitly and tests must cover both centered and overflow states.
- CSS scaling without real plane dimensions would make edges unreachable. Do not substitute transform-only scaling.
- Toolbar wrapping changes canvas size. ResizeObserver must recompute fitted dimensions without hiding controls.
- Native clicks inside Teleport do not reach MarkdownRenderer. Missing event forwarding would regress Electron link opening.
- If inline height lock clears before SVG remount layout, page scroll may jump. Clear it only after the inline SVG has returned on a post-render tick.
- Body overflow must restore its exact previous inline value, including empty string; do not always set `auto`.
- Focus return must not target a removed opener during source invalidation.

## Guidance For Implementation

- Keep the primary visible journey obvious: expand -> click `−`/`+` -> optional drag -> Fit -> Escape/×. Do not add percentage text, menus, minimap, download, or tooltip-only actions.
- Use native `<button type="button">` controls with at least approximately 44×44 CSS-pixel touch targets, localized `aria-label`/title, visible focus rings, and native `disabled` at zoom bounds.
- Use `role="dialog"`, `aria-modal="true"`, a localized title referenced by `aria-labelledby`, and a labeled canvas region.
- Use Pointer Events and pointer capture for mouse/touch panning; ignore non-primary activation and interactive descendants.
- Treat links, `[role=link]`, buttons, form controls, tabbable descendants, Mermaid `.clickable` nodes, and explicit click handlers as interactive. Do not open or start pan from them.
- Use `MIN_ZOOM = 1`, `MAX_ZOOM = 4`, and a simple consistent button step such as `0.25`; wheel increments may be smaller but use the same clamp.
- The zoom factor is relative to fitted size. Fit sets factor 1, recenters/origin-resets, and disables zoom-out.
- The geometry module must return finite non-negative values and clamp scroll to actual maximums; a malformed/zero viewBox uses measured SVG bounds before any final safe fallback.
- Do not mutate the SVG string to rewrite IDs. Enforce the one-mounted-copy invariant instead.
- In tests, mock DOM rect/client sizes explicitly. Component tests should assert observable state and delegated math, while pure tests own numeric precision.
- Preserve existing console error behavior and localized loading/error output.
- Do not alter `mermaidService.initialize`, security level, theme TODO, parser fence support, or `FullScreenImageModal` in this change.
