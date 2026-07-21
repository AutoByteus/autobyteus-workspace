# Design Spec

## Current-State Read

### Approved basis

- Requirements: `requirements.md`, status `Design-ready`, approved by the user on 2026-07-21.
- Investigation: `investigation-notes.md`, complete.
- Intended-behavior supplement: `ui-ux-spec.md`, status `Refined`, approved by the user on 2026-07-21.
- Evidence supplement: `reproduction-evidence.md`, status `Complete`, approval `N/A`.

### Current production structure

The supported artifact path is:

`Artifact selection -> ArtifactContentViewer -> FileViewer(preview) -> MarkdownPreviewer -> MarkdownRenderer -> MermaidDiagram -> MermaidDiagramViewer`

`ArtifactContentViewer` owns artifact selection/presentation and a body-teleported maximize shell at Tailwind tier `z-[120]`. `MarkdownRenderer` delegates Mermaid fences to `MermaidDiagram`. `MermaidDiagram` owns render-generation validity, inline height preservation, one-current-SVG ownership, viewer open state, and focus return. `MermaidDiagramViewer` owns the body-teleported dialog, backdrop, fit/zoom/pan geometry, focus containment, body-scroll isolation, link return, and dismissal.

The current viewer backdrop is `z-[100]`. On nested open, `MermaidDiagram` removes the inline SVG and mounts the sole current copy in the viewer. Because the maximized artifact at `120` remains above the viewer at `100`, the artifact hides the viewer while its former inline region is intentionally empty. The retained browser probe verified artifact `z=120`, viewer `z=100`, inline SVG count `0`, viewer SVG count `1`, and viewport hit-testing inside the artifact rather than the dialog.

For keyboard dismissal, `MermaidDiagramViewer.handleKeydown` prevents default on `Escape`, emits `close`, and allows the event to continue bubbling. `ArtifactContentViewer` (and other supported fullscreen Markdown hosts) listens at `window` and closes its own maximize state on the same key. One physical Escape therefore closes both independently owned layers.

### Adjacent supported hosts

The same shared Mermaid path is reachable from normal conversation Markdown and Markdown file/reference previews. Maximized `FileExplorerTabs`, `TeamReferenceFileViewer`, and `TeamCommunicationReferenceViewer` also use tier `120` and global Escape handlers. A shared viewer correction therefore removes the same composition defect for all supported maximized Markdown hosts without consumer-specific branches.

### Current test structure

- `MermaidDiagramViewer.spec.ts` covers the named dialog, actions, fit/zoom/pan, focus trap, body overflow, close/backdrop/Escape emission, and links, but does not assert the supported overlay-tier relationship or prevent Escape from reaching a global lower-layer listener.
- `MermaidDiagram.spec.ts` covers one-SVG transfer, inline height lock, focus return, link forwarding, and render-generation invalidation.
- `ArtifactContentViewer.spec.ts` covers artifact maximize/restore but stubs `FileViewer`, so it cannot exercise the real Mermaid composition.
- `tests/e2e/diagram-zoom-viewer-probe.mjs` uses real shared Mermaid components across conversation and file-preview consumers, but its fixture never maximizes the containing Markdown host.

## Intended Change

Make `MermaidDiagramViewer` enforce the two missing top-dialog invariants at its existing authoritative boundary:

1. Its backdrop/dialog layer is tier `130`, immediately above supported workspace fullscreen Markdown hosts at `120` and below intentionally higher unrelated/system surfaces at `1000`/`9999`.
2. When the dialog handles `Escape`, it prevents default, stops propagation, and requests its own close. The lower host never receives the same key event.

Keep the host mounted and maximized. Preserve the current `MermaidDiagram` one-SVG handoff and close-return lifecycle. Do not add host-specific state coupling, a second viewer, a global modal manager, or changes to Mermaid rendering/viewport/link behavior.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Approved change / preserved outcome | Evidence basis | Target production path | Lifecycle boundary | Spine IDs |
| --- | --- | --- | --- | --- | --- |
| `BEH-001` | Preserve maximized host content and embedded diagram before nested open. | User screenshots 1–2; probe before state. | Artifact selection -> artifact maximize -> existing Markdown/Mermaid inline path. | Host viewer owns maximize state. | `SP-001`, `SP-004` |
| `BEH-002` | Make the viewer-owned SVG visible above the maximized host by moving the shared viewer to tier `130`. Preserve one-copy transfer and geometry. | Probe z/hit-test/SVG counts; source trace. | Diagram expand -> `MermaidDiagram.openViewer` -> `MermaidDiagramViewer` Teleport -> tier `130` backdrop/dialog -> fitted SVG. | `MermaidDiagramViewer` owns top presentation; `MermaidDiagram` owns SVG lifecycle. | `SP-001`, `SP-005` |
| `BEH-003` | Explicit close, backdrop, and first Escape close only the diagram. Escape is contained at the dialog. Preserve inline SVG/focus restoration and host maximize. | Probe explicit close vs. Escape; approved UI journey. | Viewer dismissal -> close emit -> `MermaidDiagram.closeViewer` -> inline remount/focus return; no same-event host dismissal. | Viewer owns top dismissal; host remains independent. | `SP-002`, `SP-005`, `SP-006` |
| `BEH-004` | Apply the invariant through the shared viewer and preserve non-nested behavior. Add nested durable coverage using the real host/component path. | Shared consumer code; coverage gap inspection. | Supported Markdown consumers -> shared Mermaid components. | Shared viewer boundary; API/E2E fixture/probe boundary. | `SP-001`–`SP-004` |

## Relevant Supplemental Task Artifacts

| Artifact | Role in this design | Status / approval |
| --- | --- | --- |
| `ui-ux-spec.md` | Governs nested layer order, one-action/one-layer dismissal, focus return, responsive behavior, and state transitions. | Refined; approved 2026-07-21. |
| `reproduction-evidence.md` | Supplies current-state z-index, SVG ownership, hit-test, explicit-close, and Escape evidence. | Complete; approval N/A. |

## Task Design Health Assessment (Mandatory)

- Change posture: bug fix.
- Root-cause classification: `Missing Invariant`.
- Design issue exposed: the shared diagram dialog did not encode its relation to supported fullscreen Markdown hosts or exclusively contain its handled dismissal event.
- Refactor needed now: no broad refactor. The existing owners, APIs, file placement, and state separation are healthy. The top dialog already owns stacking and input isolation; the host already owns maximize state. Two local corrections strengthen that boundary.
- Why a local correction is sufficient:
  - no caller bypasses an owner;
  - no duplicated state or coordination is needed;
  - explicit close already demonstrates independent layer state;
  - one shared viewer change covers all supported hosts;
  - existing DTOs, stores, APIs, and persisted data are unaffected.
- Deferred residual risk: z-index tiers are manually assigned throughout the application. A centralized overlay stack might become justified by future overlapping modal requirements, but this task has no evidence that such a refactor is necessary. The new nested browser scenario will guard the concrete supported tier relation.

## Terminology

- **Host:** a Markdown-capable surface that may itself be maximized, such as `ArtifactContentViewer`, Files, or a team-reference viewer.
- **Host layer:** the host's body-teleported fullscreen shell at tier `120`.
- **Diagram layer:** `MermaidDiagramViewer` backdrop/dialog teleported to `body`.
- **Topmost:** the layer that must receive current pointer/focus/dismissal interaction before any lower layer.
- **One-current-SVG:** `MermaidDiagram` renders the successful SVG either inline or in the viewer, never as two authoritative copies.
- **Handled Escape:** Escape while focus is in the diagram dialog; the diagram viewer consumes it and closes itself.

## Design Reading Order

1. Read the behavior map and task health assessment.
2. Follow `SP-001` nested open and `SP-002` top-layer close.
3. Review ownership/boundary maps to see why only the shared viewer changes.
4. Review file mapping and sequence for exact implementation scope.
5. Review test guidance for the production-shaped nested scenario and preserved regressions.

## Legacy Removal Policy (Mandatory)

This is a clean-cut correction:

- replace the obsolete diagram tier `100` with the supported top-dialog tier `130`;
- replace pass-through handled Escape with contained handled Escape;
- do not retain conditional old/new tiers, consumer detection, fallback stacking values, or duplicate Escape paths;
- do not add compatibility wrappers around `MermaidDiagramViewer`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

Not applicable. The affected host maximize state, viewer open state, focus state, body overflow, pointer state, fit/zoom state, and SVG mounting are transient. No persisted store/schema, backend state, or migration is involved.

## Data-Flow Spine Inventory

| Spine ID | Type | Use case | Arrow chain | Governing owner |
| --- | --- | --- | --- | --- |
| `SP-001` | Primary execution | Nested diagram open | User -> host maximize control -> maximized host `120` -> diagram expand -> `MermaidDiagram.openViewer` -> `MermaidDiagramViewer` Teleport `130` -> measure/fit -> visible SVG | `MermaidDiagramViewer` for top dialog; host for host maximize; `MermaidDiagram` for SVG lifecycle |
| `SP-002` | Primary return | Top diagram dismissal | Close/backdrop/handled Escape -> `MermaidDiagramViewer.requestClose` -> `close` emit -> `MermaidDiagram.closeViewer` -> viewer unmount -> inline SVG remount -> focus return -> maximized host remains | `MermaidDiagramViewer` then `MermaidDiagram` |
| `SP-003` | Secondary execution | Later host dismissal | Separate restore or later Escape -> host handler/store -> host Teleport disabled/unmounted -> workspace context revealed | Host viewer |
| `SP-004` | Regression execution | Non-nested diagram open/close | Normal Markdown -> diagram expand -> viewer `130` -> existing navigation/dismissal -> normal Markdown | Shared Mermaid components |
| `SP-005` | Bounded local | Viewer key dispatch | Dialog keydown -> default-prevented check -> Tab/zoom/Fit branches or Escape preventDefault + stopPropagation + close | `MermaidDiagramViewer.handleKeydown` |
| `SP-006` | Bounded local | SVG return/focus | Close emit -> capture restore flag -> set viewer closed -> nextTick -> rAF -> unlock inline height -> focus connected opener | `MermaidDiagram.closeViewer` |

## Primary Execution Spine(s)

### `SP-001` — Open diagram from maximized host

`User -> ArtifactContentViewer maximize -> host Teleport/body tier 120 -> Markdown preview -> MermaidDiagram expand -> one SVG transferred -> MermaidDiagramViewer Teleport/body tier 130 -> viewer measure/fit -> visible interactive diagram`

The host remains mounted. The diagram backdrop covers it because `130 > 120`; pointer hit-testing and focus belong to the dialog. The inline container retains its measured height while the viewer owns the SVG.

### `SP-002` — Close only the top diagram layer

`User close/backdrop/Escape -> MermaidDiagramViewer -> close emit -> MermaidDiagram -> viewer unmount -> inline SVG remount -> focus return -> still-maximized host`

For Escape, the viewer stops propagation before the event can reach `window`. The host's existing handler stays unchanged and remains available for a later distinct Escape after the diagram is gone.

### `SP-003` — Subsequently close host

`User host restore or later Escape -> host owner -> exit host maximize -> workspace surface`

This is unchanged; it proves layer ownership is sequential, not coupled.

### `SP-004` — Preserve non-nested path

`Conversation/file Markdown -> MermaidDiagram -> MermaidDiagramViewer tier 130 -> existing controls/dismissal -> source context`

Increasing the tier does not change normal geometry, SVG lifecycle, focus, or interactions.

## Spine Narratives (Mandatory)

### Nested-open narrative

The artifact host becomes a body child at tier `120`. Its Markdown tree stays mounted inside that host. Activating diagram expand causes `MermaidDiagram` to lock the inline preview height and switch its sole successful SVG from the inline container to `MermaidDiagramViewer`. The viewer is separately teleported to `body`. At tier `130`, it now paints above the host rather than behind it. After mount, existing viewBox measurement and canvas fit run unchanged; the diagram appears fitted with its four actions.

### Layered-dismissal narrative

The diagram dialog is the current input owner. Close-button and backdrop routes already emit only diagram close. On Escape, `handleKeydown` prevents the browser default and stops DOM propagation, then emits close. `MermaidDiagram` unmounts the viewer, remounts the inline SVG after Vue's update, unlocks the source height after browser layout, and focuses the connected expand button. Because the host never received that Escape and its state was never modified, it remains fullscreen. Only a later distinct host action exits host maximize.

### Regression narrative

Normal Markdown surfaces still open exactly the same viewer. Tier `130` remains above normal workspace chrome. The key handler performs the same close action with stronger event containment; there is no lower fullscreen owner to affect. Fit, zoom, pan, link handling, focus trap, body lock, and one-SVG behavior do not change.

## Spine Actors / Main-Line Nodes

| Actor/node | Subject | Owns | Does not own |
| --- | --- | --- | --- |
| Maximized host viewer | Host presentation | Host maximize state, selected content/view mode, host restore | Diagram dialog stacking, diagram Escape, SVG viewport |
| `MarkdownRenderer` | Markdown segments | Delegation and external-link policy | Viewer stacking or host maximize |
| `MermaidDiagram` | One rendered diagram lifecycle | Render generation, inline/viewer switch, height lock, viewer open state, focus return | Body overlay tier or host state |
| `MermaidDiagramViewer` | Top diagram dialog | Backdrop/dialog tier, current dialog input, measurement/fit, navigation, focus/body isolation, close emission | Host maximize state or source rendering generation |
| Browser DOM/body | Composed presentation | Teleport target and event propagation semantics | Domain policy |

## Ownership Map

| Concern | Authoritative owner | Target rule |
| --- | --- | --- |
| Host maximized/not maximized | Existing host component/store | Unchanged; never mutated by diagram viewer. |
| Diagram viewer open/not open | `MermaidDiagram` | Unchanged; driven by current SVG and close event. |
| Diagram layer tier | `MermaidDiagramViewer` | Fixed at `130`, above supported host `120`. |
| Handled dialog Escape | `MermaidDiagramViewer` | Prevent default, stop propagation, close dialog. |
| One-current-SVG movement | `MermaidDiagram` | Unchanged. |
| Fit/zoom/pan geometry | `MermaidDiagramViewer` + `mermaidDiagramViewport.ts` | Unchanged. |
| Focus containment/body lock | `MermaidDiagramViewer` | Unchanged while open. |
| Focus return/height unlock | `MermaidDiagram` | Unchanged after close. |
| Durable nested coverage | Existing diagram browser probe/fixture | Extend production-shaped coverage; no parallel script. |

## Thin Entry Facades / Public Wrappers (If Applicable)

- `MarkdownPreviewer` and `MarkdownRenderer` remain thin composition/delegation surfaces. They gain no overlay policy.
- No new facade or wrapper is introduced.
- `MermaidDiagramViewer` is not a pass-through facade; it is the actual dialog owner and therefore the correct change location.

## Removal / Decommission Plan (Mandatory)

| Remove/decommission | Replacement | Verification |
| --- | --- | --- |
| `z-[100]` on `.mermaid-viewer-backdrop` | `z-[130]` | Focused class assertion plus browser computed z/hit-test above host `120`. |
| Escape propagation beyond the top dialog | `event.stopPropagation()` in the handled Escape branch before close | Focused window-listener assertion plus nested browser first-Escape host-state assertion. |
| Coverage assumption that non-maximized fixtures represent all hosts | Production-shaped nested artifact/host scenario in existing probe | Browser scenario checks explicit close, Escape, later host dismissal, repeated lifecycle. |

No file or API becomes obsolete.

## Return Or Event Spine(s) (If Applicable)

### Diagram close return

`MermaidDiagramViewer emit('close') -> MermaidDiagram.closeViewer -> isViewerOpen=false -> viewer Teleport removed -> inline SVG restored -> focus returned`

The event remains subject-specific and contains no host selector/state. No new event or payload is needed.

### External link return (preserved)

`Viewer SVG HTTP link -> MermaidDiagramViewer emit('external-link', url) -> MermaidDiagram -> MarkdownRenderer -> browser/Electron external-link policy`

This return path is unchanged and remains covered by existing tests.

## Bounded Local / Internal Spines (If Applicable)

### `SP-005` viewer key dispatch

`keydown -> defaultPrevented guard -> Tab trap | Escape containment/close | modifier guard | zoom/Fit keys`

Only the Escape branch changes. `stopPropagation()` is specific to a key the viewer fully owns; it must not be applied indiscriminately to all keys, because the dialog already has explicit behavior and existing tests for Tab/zoom keys.

### `SP-006` close/remount

`close emit -> remember restoreFocus -> viewer false -> nextTick -> requestAnimationFrame -> unlock preview height -> focus connected opener`

Unchanged. Nested browser validation must wait for the layout/focus return rather than assert immediately after dialog detachment.

### Measure/fit loop (preserved)

`viewer mount/ResizeObserver -> read SVG size + canvas size -> calculate fitted size/plane -> reset zoom/scroll`

No sizing fix belongs in this task because the probe showed a normal SVG in the viewer; occlusion, not measurement, caused the apparent blank state.

## Off-Spine Concerns Around The Spine

| Concern | Owner | Decision |
| --- | --- | --- |
| Localization | Existing localization keys/viewer labels | Preserve; no new copy. |
| Responsive toolbar | `MermaidDiagramViewer` styles | Preserve. |
| Dark mode/contrast | Existing viewer styles | Preserve. |
| Body scroll lock | `MermaidDiagramViewer` mount/unmount | Preserve exact prior overflow restoration. |
| Focus trap/return | Viewer + diagram lifecycle | Preserve and verify nested focus return. |
| Backend availability | Outside presentation spine | Not involved; durable fixture should use buffered content or controlled setup. |
| System-critical overlays | Existing higher tiers | Diagram tier `130` intentionally remains below `1000`/`9999`. |

## Ownership Boundaries

1. Hosts may mount Markdown and own host maximize, but may not choose the diagram dialog's tier or close the diagram.
2. `MermaidDiagram` may decide when the viewer exists and where the single SVG is mounted, but may not mutate host maximize.
3. `MermaidDiagramViewer` may isolate the active dialog's input and presentation, but may only emit diagram-specific close/link events.
4. Tests may observe tiers/state but must not introduce production-only selectors or test-only behavior branches.

## Boundary Encapsulation Map

| Public/outer boundary | Internal owned mechanism | Allowed callers | Forbidden shortcut |
| --- | --- | --- | --- |
| `MermaidDiagram` component | Render generation, `isViewerOpen`, inline height/focus lifecycle | `MarkdownRenderer` | Host components manipulating `isViewerOpen` or SVG DOM. |
| `MermaidDiagramViewer` props/events | Teleport, tier, key handler, focus/body/viewport internals | `MermaidDiagram` | Host-specific z/close props or direct host store access. |
| Host maximize component/store | Teleport and host fullscreen state | Host header/global handler | Diagram viewer calling host exit actions. |
| Existing E2E probe | Disposable installed fixture page and owned dev server/browser | API/E2E execution command | New ad hoc permanent probe duplicating viewer coverage. |

## Dependency Rules

### Allowed

- `MermaidDiagram -> MermaidDiagramViewer` via `svgContent`, `close`, and `external-link`.
- `MermaidDiagramViewer -> Vue/DOM`, localization, icon component, link resolver, and viewport math.
- Host -> existing Markdown/FileViewer composition.
- E2E fixture -> real production components and typed artifact constructor.

### Forbidden

- `MermaidDiagramViewer -> artifactContentDisplayMode` or any host-specific store.
- Host -> Mermaid viewer internal refs/DOM or a viewer-specific z override.
- Consumer-specific viewer duplicates or `isInsideArtifact` props.
- Global window key listener added by the diagram viewer when its dialog key boundary already owns the event.
- `z-[1000]`/`z-[9999]` escalation that overtakes unrelated system-critical surfaces without evidence.
- Changes to viewport math as a workaround for occlusion.

## Interface Boundary Mapping

| Boundary | Subject / identity | Current shape | Target change |
| --- | --- | --- | --- |
| `MermaidDiagramViewer` prop | One current diagram SVG | `svgContent: string` | None. |
| Viewer close event | Current diagram dialog | `close` with no payload | None. |
| Viewer external link event | HTTP(S) URL from current diagram | `external-link(url)` | None. |
| Host maximize state | Current host instance/store | Existing local/Pinia boolean | None. |
| Dialog keydown | Current dialog DOM event | `KeyboardEvent` | Escape containment only. |

## Interface Boundary Check

- No ambiguous IDs/selectors exist.
- No new API or generic modal interface is needed.
- Close remains diagram-specific and does not acquire a host action payload.
- The design avoids making a shared base “modal context” with optional host fields.

## Main Domain Subject Naming Check

Existing names are accurate:

- `ArtifactContentViewer` owns artifact content.
- `MarkdownRenderer` owns Markdown segment rendering.
- `MermaidDiagram` owns one diagram render lifecycle.
- `MermaidDiagramViewer` owns expanded diagram viewing.

No rename is warranted.

## Existing Capability / Subsystem Reuse Check

- Reuse existing body Teleport; it is required to escape constrained ancestor layout.
- Reuse the existing dialog focus/body/geometry subsystem inside `MermaidDiagramViewer`.
- Reuse the existing diagram browser fixture/probe and extend it with nested host composition.
- Do not reuse generic media modals: they do not own Mermaid SVG lifecycle, zoom geometry, or link behavior.
- Do not introduce a new overlay service; the existing shared viewer can enforce the required relation locally.

## Subsystem / Capability-Area Allocation

| Capability area | File(s) | Allocation |
| --- | --- | --- |
| Diagram top-layer presentation/input | `MermaidDiagramViewer.vue` | Modify. |
| Diagram focused tests | `MermaidDiagramViewer.spec.ts` | Modify. |
| Diagram lifecycle | `MermaidDiagram.vue`, its spec | Preserve unless implementation needs only a narrowly justified assertion update. |
| Host maximize | Artifact/Files/team host components and stores | Preserve production source. |
| Durable real-browser coverage | Existing diagram E2E fixture/probe | API/E2E-owned proportional modification. |
| Ticket artifacts | Current ticket directory | Append downstream reports/evidence. |

## Draft File Responsibility Mapping

| Change | File | Responsibility after change |
| --- | --- | --- |
| Modify | `autobyteus-web/components/conversation/segments/renderer/MermaidDiagramViewer.vue` | Enforce tier `130` and contain handled Escape while preserving all current dialog behavior. |
| Modify | `autobyteus-web/components/conversation/segments/renderer/__tests__/MermaidDiagramViewer.spec.ts` | Assert tier and that handled Escape emits close without reaching a lower/global listener. |
| Preserve | `autobyteus-web/components/conversation/segments/renderer/MermaidDiagram.vue` | Continue one-SVG transfer, height lock, and focus return. |
| Preserve | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Continue owning independent artifact maximize and later distinct Escape. |
| API/E2E modify | `autobyteus-web/tests/e2e/fixtures/diagram-zoom-viewer.page.vue` | Add production-shaped real maximized artifact/host surface using buffered Markdown content. |
| API/E2E modify | `autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs` | Execute nested tier/hit-test/dismissal/lifecycle scenario without weakening existing scenarios. |

## Reusable Owned Structures Check

No new shared type, composable, constant file, or helper is warranted:

- the tier is one component-owned presentation value;
- the event policy is one component-owned branch;
- extracting either into a generic “overlay utilities” module would add empty indirection.

If implementation finds an existing canonical overlay-tier token not found during investigation, architecture rework is required before replacing this explicit tier decision; do not invent a new global token opportunistically.

## Shared Structure / Data Model Tightness Check

No DTO/schema/model changes. Existing `DiagramSize`, `DiagramPoint`, and viewport calculations are tight and unaffected. No optional host identity or modal nesting field should be added to shared props.

## Final File Responsibility Mapping

| File | Action | Exact intended edit | Must not change |
| --- | --- | --- | --- |
| `MermaidDiagramViewer.vue` | Modify | Backdrop class `z-[100] -> z-[130]`; in handled Escape branch call `preventDefault()`, `stopPropagation()`, then request close. | Props/events, Teleport target, action order, viewport math, pointer/link/focus/body lifecycle, styles unrelated to tier. |
| `MermaidDiagramViewer.spec.ts` | Modify | Assert `z-[130]`; dispatch a real bubbling Escape with a `window` listener and prove close emits once while listener is not invoked; retain existing close/backdrop assertions. | Geometry/link coverage. |
| E2E fixture | Modify later by API/E2E | Add a clearly selected real `ArtifactContentViewer`/supported host with buffered Mermaid Markdown and stable test selectors/control surface. | Existing three diagram surfaces and their scenarios. |
| E2E probe | Modify later by API/E2E | Add scenario for host maximize -> diagram open -> z/hit/SVG -> explicit close -> reopen/Escape -> later host close -> repeated cleanup. | Existing evidence and scenario truthfulness. |

## Applied Patterns (If Any)

- **Adapter/Teleport boundary:** existing viewer translates component content into a body-level dialog; preserved.
- **Bounded event ownership:** handled Escape is contained at the active dialog rather than coordinated across parents.
- No new formal pattern is introduced.

## Target Subsystem / Folder / File Mapping

The layout stays flat inside the established renderer concern because the change has one real owner and no new structural depth:

```text
autobyteus-web/
├─ components/conversation/segments/renderer/
│  ├─ MermaidDiagram.vue                         # preserve SVG/open/focus lifecycle
│  ├─ MermaidDiagramViewer.vue                   # modify top-tier + Escape containment
│  └─ __tests__/
│     └─ MermaidDiagramViewer.spec.ts            # focused invariant coverage
└─ tests/e2e/
   ├─ fixtures/diagram-zoom-viewer.page.vue      # API/E2E: real nested host fixture
   └─ diagram-zoom-viewer-probe.mjs              # API/E2E: nested scenario
```

## Folder Boundary Check

- Renderer production changes remain under the existing Mermaid renderer folder.
- No `common/` or `utils/` extraction is justified.
- E2E changes remain with the existing domain-specific durable probe.
- The flat mapping is clearer than a new overlay subsystem for two local invariant corrections.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

### Good stacking shape

```text
system loading/shutdown: 9999 (unchanged)
unrelated high modals:   1000 (unchanged)
diagram viewer:           130 (target)
maximized Markdown host:  120 (existing)
workspace chrome:       <= 10/normal flow
```

### Good Escape shape

```ts
if (event.key === 'Escape') {
  event.preventDefault();
  event.stopPropagation();
  requestClose();
  return;
}
```

The active dialog consumes the input it handles. The host receives a later Escape only after the diagram has closed.

### Rejected shapes

```ts
// Rejected: host-specific knowledge in shared viewer
if (props.insideArtifact) artifactStore.exitZenMode();

// Rejected: consumer workaround
<MermaidDiagramViewer class="z-[130]" /> // repeated by each host

// Rejected: indiscriminate escalation
class="z-[9999]" // would compete with intentional system overlays

// Rejected: dual SVG workaround
renderInlineSvg && renderViewerSvg // violates one-current-SVG ownership
```

## Backward-Compatibility Rejection Log (Mandatory)

| Proposed compatibility behavior | Decision | Reason |
| --- | --- | --- |
| Keep `z=100` for normal sources and use `130` only in artifacts | Reject | Duplicates behavior and requires leaking consumer identity into shared viewer. |
| Accept a z-index prop from every host | Reject | Makes callers coordinate dialog policy and permits inconsistent tiers. |
| Patch only artifact Escape handler to check `defaultPrevented` | Reject | Leaves Files/team hosts exposed and duplicates lower-layer defenses instead of containing the top-owned event. |
| Render a second SVG above the artifact | Reject | Violates the validated one-current-SVG contract and masks the actual stacking defect. |
| Add a legacy fallback if `130` appears hidden | Reject | No evidence supports a dual tier; durable hit-testing should fail truthfully. |

## Derived Layering (If Useful)

Explanatory only:

1. Workspace/host presentation (`ArtifactContentViewer`, Files, team references).
2. Markdown/diagram lifecycle (`MarkdownRenderer`, `MermaidDiagram`).
3. Top dialog presentation/input (`MermaidDiagramViewer`).
4. Pure viewport geometry (`mermaidDiagramViewport.ts`).

Dependencies already follow this shape. The design does not create a new layer.

## Change / Refactor Sequence

1. Implementation engineer updates `MermaidDiagramViewer.vue` tier to `130` and contains handled Escape.
2. Extend `MermaidDiagramViewer.spec.ts` with tier and bubbling-event ownership coverage.
3. Run focused implementation checks for viewer/diagram tests and relevant type/build guard if proportionate.
4. Code reviewer performs implementation-source review.
5. API/E2E engineer investigates current coverage formally, extends the existing fixture/probe with a real nested host scenario, and runs focused/full/browser checks according to its skill.
6. Code reviewer proportionally reviews durable test-code changes.
7. Delivery engineer refreshes against latest `origin/personal`, records integration verification, handles docs/no-impact, and prepares user verification/final handoff.

## Key Tradeoffs

| Decision | Benefit | Cost / mitigation |
| --- | --- | --- |
| Explicit tier `130` | Small, readable, directly matches supported `120` hosts and existing Tailwind convention. | Manual tier relation remains; mitigate with browser computed-z/hit-test coverage and design documentation. |
| Stop Escape at viewer | One-event/one-layer ownership across all hosts without coupling. | Window observers no longer see a handled dialog Escape; correct because the modal owns it and already prevents default. |
| No host source changes | Preserves independent state and avoids duplicated guards. | Relies on viewer containment; focused and E2E tests lock it. |
| Extend existing E2E probe | Reuses real Mermaid coverage, server lifecycle, evidence format, and Chrome setup. | Fixture grows slightly; keep nested section/scenario isolated and production-shaped. |
| No generic overlay manager | Proportional to evidence and risk. | Does not solve hypothetical future arbitrary nesting; record residual risk rather than speculative architecture. |

## Risks

- Tailwind must include the literal `z-[130]`; using a literal in the component matches current static extraction.
- A future supported host above `130` could recreate occlusion. The nested scenario should compare computed values and hit-testing, not only DOM presence.
- Unit-test `trigger('keydown')` alone may not prove propagation containment. Use a real bubbling `KeyboardEvent` on an attached teleported dialog and observe `window`.
- Focus return occurs after `nextTick` plus animation frame; browser tests must wait for the opener to regain focus.
- Existing E2E fixture starts with three rendered diagrams. A buffered artifact may initially be in Edit mode; the durable scenario should activate the real Preview control before waiting for its diagram rather than weaken global readiness.
- Backend health noise must not make the nested fixture depend on backend content. Use buffered artifact content or another deterministic existing production path.

## Guidance For Implementation

- Make only the two production edits described in `MermaidDiagramViewer.vue` unless new evidence demonstrates design impact.
- Keep `stopPropagation()` inside the handled Escape branch; do not blanket-stop all key events.
- Do not edit host Escape handlers as redundant defense without routing that design impact back to `solution_designer`.
- Do not change SVG rendering, geometry, body-lock, focus trap, close event shape, or external-link behavior.
- Add focused tests that fail on the current code for both tier and event propagation.
- Implementation engineer should not own or alter API/E2E fixture/probe files; those are allocated to `api_e2e_engineer` after source review.
- Preserve all existing tests and ticket evidence. If the literal tier conflicts with an undiscovered canonical overlay convention, stop and report `Design Impact` rather than improvising a new system.
