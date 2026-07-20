# Diagram Zoom Viewer Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements/UI contract re-refined after live Electron verification; design package updated for architecture re-review
- Investigation Goal: Preserve the validated diagram inspection capability while correcting the candidate implementation's inline and toolbar visual hierarchy with an input-adaptive, verifiable UX contract.
- Scope Classification: `Medium`
- Scope Classification Rationale: The change is local to a shared renderer subsystem but adds a modal interaction with responsive, input, focus, localization, and realistic browser validation requirements.
- Scope Summary: Improve readability and inspection of Mermaid diagrams rendered by the shared frontend Markdown path.
- Primary Questions Resolved:
  - Which parser/renderer produces the diagrams? `useMarkdownSegments.ts` -> `MarkdownRenderer.vue` -> `MermaidDiagram.vue` -> `mermaidService.ts` -> Mermaid SVG.
  - Which formats are supported? Fenced `mermaid` and `mmd` only.
  - Why was the original UX insufficient? The SVG could be constrained by its inline wrapper/aspect ratio, and no expanded/zoomable inspection path existed.
  - What did live verification expose after implementation? The always-visible 44×44 inline action occupies a dedicated row and creates excess whitespace; the Fit action is uniquely wide because it renders localized text while adjacent actions are icon-only.
  - Which owner should change? The shared Mermaid rendering boundary, not every Markdown consumer and not the image/gallery modal.
  - What refined interaction is recommended? Full-width inline overview plus a zero-layout-space hover/focus-adaptive expand overlay (visible by default on no-hover/touch), near-full-screen viewer, and four uniform icon-only controls for zoom out, fit, zoom in, and close.

## Request Context

The user initially supplied two screenshots of detailed diagrams rendered at a small inline size within agent responses and asked for zoom and click-to-enlarge behavior. After implementation, the user ran the Electron build from this task worktree and supplied two more screenshots. The live functional viewer was usable, but its visible chrome did not meet the user's quality expectation: the inline expand action was too large and permanently consumed a row, and the wide text Fit action was inconsistent with the icon toolbar. The user explicitly requested a conventional hover-revealed desktop affordance and icon-only Fit treatment, while retaining a clean, simple journey.

Reference screenshots:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_aeb13bd8909a4a6e995addacaee86ac8/solution_designer_a3912dab261f4bb7af4081c9fc2f9523/context_files/ctx_fc77bf517448__image.png` — 3024×1900 pixels; a detailed architecture diagram occupies only a small fraction of the available conversation width.
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_aeb13bd8909a4a6e995addacaee86ac8/solution_designer_a3912dab261f4bb7af4081c9fc2f9523/context_files/ctx_b7116016a789__image.png` — 2410×1352 pixels; a sequence diagram is visible but its labels are too small to read comfortably.
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_aeb13bd8909a4a6e995addacaee86ac8/solution_designer_a3912dab261f4bb7af4081c9fc2f9523/context_files/ctx_0fe969e4c33e__image.png` — 2222×906 pixels; live Electron inline state shows the always-visible expand button above the diagram, with a large blank strip introduced by its reserved row.
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_aeb13bd8909a4a6e995addacaee86ac8/solution_designer_a3912dab261f4bb7af4081c9fc2f9523/context_files/ctx_f516efa0dc49__image.png` — 3016×1816 pixels; live Electron viewer shows a wide `Fit diagram` text pill between three square icon actions.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer/tickets/in-progress/diagram-zoom-viewer`
- Current Branch: `codex/diagram-zoom-viewer`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-07-20; `origin/personal` remained at `8c7e2c2aa591b174a3d5c90eb0d05584538bbf12`.
- Task Branch: `codex/diagram-zoom-viewer`
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Current Candidate State At Rework: Branch is two implementation commits ahead of `origin/personal` (`ff48ec538`, `6c55c7fb8`); downstream API/E2E and delivery artifacts plus documentation/test edits are present in the worktree and must be preserved through rework.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Use only the dedicated task worktree. The shared checkout contains unrelated modifications. An ignored symlink from `autobyteus-web/node_modules` to the shared installation was used for the baseline test; API/E2E remains responsible for its own environment decision.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer/tickets/in-progress/diagram-zoom-viewer/ui-ux-spec.md` | Define adaptive inline chrome, compact icon-only toolbar, diagram expansion, zoom/pan, dismissal, responsive states, accessibility, and rendered-quality evidence. | Intended user-visible behavior. | Requirements, design spec | REQ-001–REQ-010; AC-001–AC-018 | `Refined` | Approval required / user-directed revision approved 2026-07-20 | Re-review with architecture; keep aligned through rework. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-20 | Other | User request and two reference screenshots listed above | Establish the observed problem | Detailed diagrams are visually present but labels/relationships are not inspectable at the shown scale. | No |
| 2026-07-20 | Command | `git remote -v; git symbolic-ref --short refs/remotes/origin/HEAD; git fetch origin personal; git worktree add -b codex/diagram-zoom-viewer ... origin/personal` | Resolve base and isolate work | `origin/personal` is the tracked default; refresh and dedicated worktree creation succeeded. | No |
| 2026-07-20 | Doc | `autobyteus-web/AGENTS.md` | Read repository-specific instructions | Frontend tests are colocated; `pnpm test:nuxt ... --run` is the required one-shot form. | No |
| 2026-07-20 | Doc | `autobyteus-web/docs/content_rendering.md` lines 164–232 | Confirm documented Markdown/Mermaid architecture | Shared Markdown renderer parses Mermaid fences, `MermaidDiagram.vue` renders, and `mermaidService.ts` wraps client-side Mermaid. | No |
| 2026-07-20 | Code | `autobyteus-web/composables/useMarkdownSegments.ts` lines 81–98 and 357–365 | Verify recognized source forms and segmentation | Only `mermaid` and `mmd` fenced tokens become Mermaid segments; source is trimmed and passed separately from HTML. | No |
| 2026-07-20 | Code | `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Trace shared delegation and link behavior | Mermaid segments delegate to one component. Clicks on HTTP(S) anchors use `openExternalLink`, including Electron when available. | No |
| 2026-07-20 | Code | `autobyteus-web/components/conversation/segments/renderer/MermaidDiagram.vue` | Inspect current lifecycle, sizing, and interaction owner | Loading/error/success are local; SVG has `max-width: 100%; height: auto`; there is no expand/zoom; `isHovering` and `containerRef` are unused. | No |
| 2026-07-20 | Code | `autobyteus-web/services/mermaidService.ts` | Verify rendering boundary | Service initializes Mermaid and returns an SVG string; no network or persistence is involved. | No |
| 2026-07-20 | Code/Dependency | `autobyteus-web/package.json`, `pnpm-lock.yaml`, installed `mermaid/dist/mermaid.js` lines 21460–21500 | Confirm dependency/version and generated sizing contract | Lock resolves Mermaid 11.12.3. Its max-width sizing path writes `width="100%"`, an intrinsic `max-width`, and a `viewBox`. | No |
| 2026-07-20 | Command | `rg -n "MarkdownRenderer" autobyteus-web --glob '!node_modules/**' --glob '!tickets/**'` | Inventory production consumers | Shared renderer is used by agent/inter-agent/system/thinking messages, file/Markdown preview, delegated-task detail, and team communication. | No |
| 2026-07-20 | Code | `autobyteus-web/components/common/FullScreenImageModal.vue` and `rg -n "FullScreenImageModal" ...` | Evaluate reuse | Existing image modal has wheel zoom and mouse pan but is URL/image/gallery-specific, includes copy/download/navigation semantics, lacks a reusable SVG content boundary, and is not a clean Mermaid owner. | No |
| 2026-07-20 | Code | `autobyteus-web/components/workspace/team/TeamReferenceFileViewer.vue`, modal/dialog searches, `@iconify/vue` searches | Identify overlay/icon conventions | Teleport-to-body and workspace maximize patterns exist; Iconify is the established icon source. Accessibility quality varies, so new dialog behavior must be specified explicitly. | No |
| 2026-07-20 | Code | `autobyteus-web/localization/messages/en/workspace.ts`, `zh-CN/workspace.ts`, generated catalogs | Identify localization ownership | Hand-authored workspace catalogs are available for new semantic labels and override generated catalogs in the composed locale. | No |
| 2026-07-20 | Setup | `ln -s .../autobyteus-web/node_modules autobyteus-web/node_modules; pnpm -C autobyteus-web exec nuxi prepare` | Reuse existing dependencies in isolated worktree for baseline test | Nuxt types generated successfully; symlink and `.nuxt` are ignored task-local setup. | No |
| 2026-07-20 | Test | `pnpm -C autobyteus-web test:nuxt components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts --run` | Establish baseline shared-renderer coverage | 12/12 existing tests passed. They verify Mermaid delegation but no direct Mermaid component, zoom, focus, or browser behavior. | Yes — downstream coverage must expand. |
| 2026-07-20 | Probe | Temporary direct Mermaid rendering Vitest probe (removed after execution) | Attempt to retain an example generated SVG open tag | Nuxt component scanning failed during startup before the probe ran; no product conclusion depends on this probe. Installed Mermaid source provides the sizing contract instead. | No |
| 2026-07-20 | Command | `sips -g pixelWidth -g pixelHeight <reference screenshots>` | Record input dimensions | Screenshots are 3024×1900 and 2410×1352. | No |
| 2026-07-20 | Other | User approval/refinement message | Lock intended behavior before design | User approved the recommendation and asked that it remain clean and familiar, centered on clicking visible zoom controls. Design interpretation: `Fit` restores overview; `Escape` closes the modal, following common convention. | No |
| 2026-07-20 | Other / Live Electron | User live-verification feedback and `ctx_0fe969e4c33e__image.png`, `ctx_f516efa0dc49__image.png` | Evaluate the implemented UX in the actual task-worktree Electron build | Functional behavior is present, but permanent inline chrome creates a blank row and the text Fit pill breaks toolbar consistency. User explicitly requests desktop hover reveal, smaller refined styling, and icon-only Fit. | Yes — revise requirements, UI/UX, and design; architecture re-review. |
| 2026-07-20 | Code | Candidate `MermaidDiagram.vue` at commits `ff48ec538`/`6c55c7fb8` | Trace the live inline screenshot to implementation | Success wrapper is `flex-col`; expand button precedes SVG with `mb-2`, `min-h-11`, `min-w-11`, and `self-end`. It is always visible and participates in layout. | Replace with zero-flow overlay and capability-adaptive visibility. |
| 2026-07-20 | Code | Candidate `MermaidDiagramViewer.vue` at commits `ff48ec538`/`6c55c7fb8` | Trace the live toolbar screenshot to implementation | Shared action class is 44×44, while Fit uniquely adds `min-w-fit gap-1.5 px-3` and a visible text `<span>`, making it a wide pill. The existing inward-corners Iconify glyph is already semantically appropriate for fit. | Remove visible Fit text and normalize all four action surfaces. |
| 2026-07-20 | Command | `sips -g pixelWidth -g pixelHeight <two live screenshots>; git log --oneline -5; git status --short --branch` | Preserve exact evidence dimensions and candidate state | Live screenshots are 2222×906 and 3016×1816. Branch is `codex/diagram-zoom-viewer`, ahead of `origin/personal` by two implementation commits, with downstream test/docs artifacts still present. | Include cumulative package in re-review handoff. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | A shared Markdown surface receives a closed fenced `mermaid` or `mmd` block. | Conversation/file/team/task surface -> `MarkdownRenderer` -> `useMarkdownSegments` -> Mermaid segment -> `MermaidDiagram` -> `mermaidService.render` -> full-width inline SVG plus expand action. | Candidate viewer entry works, but the action is permanently visible in a dedicated 44×44-plus-margin row, creating excess vertical whitespace and poor content/chrome hierarchy. | Four screenshots; candidate `MermaidDiagram.vue`; implementation/API-E2E reports. |
| BEH-002 | User | Rendered Mermaid SVG contains an HTTP(S) anchor and the user activates it. | SVG anchor click -> bubbles through `MarkdownRenderer.handleLinkClick` -> Electron `openExternalLink` when present, else `window.open`. | Link action is distinct from diagram presentation and must remain reachable. | `MarkdownRenderer.vue` lines 113–149; Mermaid `securityLevel: 'loose'`. |
| BEH-003 | System | Mermaid component mounts or its `content` prop changes. | generation invalidation -> clear SVG -> loading -> service initialize/render -> latest success SVG or error -> loading ends; open viewer invalidates on source change. | A current success or error is shown; inspection chrome exists only for current success; no persisted state is created. | Candidate `MermaidDiagram.vue`; implementation/code/API-E2E reports. |
| BEH-004 | Contract | Any existing component uses shared `MarkdownRenderer` with Mermaid content. | Consumer -> shared renderer -> same Mermaid owner. | Consistent Mermaid behavior is centrally reusable; parent-specific behavior is absent. | Consumer `rg` inventory and representative files. |
| BEH-005 | User | User opens the current successful diagram. | `MermaidDiagram` open state -> teleported `MermaidDiagramViewer` -> measured fit -> zoom/pan/Fit/dismiss -> source restoration. | Functional viewer is validated, but toolbar visual treatment is inconsistent: three square icons plus one wide visible `Fit diagram` text pill. | Live viewer screenshot; candidate viewer source; implementation/code/API-E2E reports. |

## Design Health Assessment Evidence

- Change posture: `Behavior Change` / `UI Quality Rework`
- Candidate root cause classification: `Local Implementation Defect` with a previously underspecified visual invariant
- Refactor posture evidence summary: The correct owner, dependency direction, viewer, geometry, and link boundaries now exist. Live evidence isolates the remaining problem to template/CSS presentation in the two Mermaid components. No parent, service, geometry, or modal-ownership refactor is justified.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `MermaidDiagram.vue` | One component owns render lifecycle and success DOM. | Keep expansion state and current-SVG handoff at this boundary. | Detail component split in design. |
| Shared consumer inventory | Many surfaces delegate through `MarkdownRenderer`. | Do not add per-consumer props/state; shared behavior is the coherent path. | Verify two representative surfaces downstream. |
| Mermaid generated sizing contract | SVG expects a coherent containing width and retains an intrinsic max. | Correct wrapper width without blindly stretching simple diagrams. | Browser validate actual layout. |
| `FullScreenImageModal.vue` | Similar interaction exists but is coupled to image URL, copy/download, and gallery events. | Reusing it would mix subjects and lose live SVG interaction; do not force a generic media abstraction in this task. | None. |
| Screenshots | Even an overview fitted to content can leave text too small. | Width correction alone is insufficient; expanded zoom is required. | Viewer UX is requirements basis. |
| Live Electron inline screenshot + candidate source | The 44×44 action is a normal-flow flex child with bottom margin. | Accessibility target sizing was implemented as heavy permanent layout chrome; replace with a compact absolute overlay and input-capability states. | Re-review visual contract. |
| Live Electron viewer screenshot + candidate source | Fit alone adds visible text and horizontal padding. | The toolbar has no structural issue; remove visible Fit text and normalize the existing four actions. | Re-run visual and proportional test coverage. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/composables/useMarkdownSegments.ts` | Parse Markdown into HTML/Mermaid segments | Correctly isolates supported diagram source. | Preserve unchanged. |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Render shared segments and route links/file actions | Correct public shared boundary and current Mermaid delegate. | Preserve API; do not add viewer state here. |
| `autobyteus-web/components/conversation/segments/renderer/MermaidDiagram.vue` | Own current render, inline preview, open/close coordination, layout lock, and focus return | Candidate implementation is functionally correct, but the expand action participates in a permanent flex row. | Preserve lifecycle; rework only success-shell template/classes and adaptive-control styling/tests. |
| `autobyteus-web/components/conversation/segments/renderer/MermaidDiagramViewer.vue` | Own teleported modal, toolbar, viewport input, focus/body lifecycle | Candidate viewer is validated; Fit uniquely renders text and extra width. | Preserve session/geometry logic; make toolbar four uniform icon-only actions. |
| `autobyteus-web/services/mermaidService.ts` | Initialize/render/validate Mermaid | Correct technical renderer; returns SVG. | No API change anticipated. |
| `autobyteus-web/components/common/FullScreenImageModal.vue` | Full-screen image/gallery viewing | Similar but semantically/capability mismatched. | Preserve; no reuse/refactor in scope. |
| `autobyteus-web/localization/messages/en/workspace.ts` | Hand-authored English workspace strings | Correct catalog for new labels. | Add semantic viewer labels. |
| `autobyteus-web/localization/messages/zh-CN/workspace.ts` | Hand-authored Simplified Chinese workspace strings | Correct catalog for translations. | Add matching labels. |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | Test Markdown parsing/delegation integration | Covers Mermaid delegation only. | Preserve; may add integration assertion if needed. |
| Direct Mermaid/viewer specs and durable E2E fixture/probe | Candidate coverage exists and passed prior gates | Some assertions/evidence encode the superseded persistent-row/text-Fit presentation. | Coverage owner must classify stale assertions and add hover/focus/no-hover/visual-state checks. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-20 | Setup | Task-local ignored dependency symlink plus `pnpm -C autobyteus-web exec nuxi prepare` | Isolated worktree can execute frontend tests with the existing dependency installation. | Baseline test is meaningful; downstream owns final environment. |
| 2026-07-20 | Test | `pnpm -C autobyteus-web test:nuxt components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts --run` | 12 tests passed. | Existing parser/delegation baseline is green. |
| 2026-07-20 | Probe | Temporary Mermaid render probe | Startup failed inside Nuxt component scan (`scule` `toLowerCase`) before test collection; file removed. | No claim about generated sample dimensions; rely on dependency source and later browser execution. |
| 2026-07-20 | Live user verification | User ran the built Electron app from the task worktree and supplied current inline/viewer screenshots | Zoom viewer works, but permanent inline control-row spacing and the uniquely wide Fit text pill are visibly low quality. | Treat as authoritative rendered evidence; reset through requirements/design review. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None required. Installed Mermaid 11.12.3 source is the authoritative dependency evidence for this task.
- Version / tag / commit / freshness: Workspace lock resolves `mermaid@11.12.3` on base commit `8c7e2c2aa`.
- Relevant contract, behavior, or constraint learned: The responsive path emits `width="100%"`, intrinsic `max-width`, and a `viewBox`.
- Why it matters: The host should establish available width and preserve intrinsic capping; the viewer can scale vector content without rasterization.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No backend is needed for component tests; realistic browser validation will need a frontend fixture/story/page or controlled application state containing a detailed Mermaid fence.
- Required config, feature flags, env vars, or accounts: `NUXT_TEST=true` is set by `test:nuxt`; no account or permission is required for client-side Mermaid.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `pnpm -C autobyteus-web exec nuxi prepare`; ignored symlink to the shared `autobyteus-web/node_modules` installation.
- Cleanup notes for temporary investigation-only setup: Temporary probe test was deleted. `.nuxt` and the dependency symlink are ignored and may be discarded/recreated by downstream environment setup.

## Findings From Code / Docs / Data / Logs

1. The screenshots align with the shared client-side Mermaid path documented and implemented in `autobyteus-web`.
2. The original inline success container underused available space. The candidate implementation corrected width but introduced a `flex-col` action row: the button's 44×44 minimum plus margin now creates the blank strip visible in Electron.
3. Mermaid's vector `viewBox` makes lossless UI zoom feasible without rerendering or network access.
4. A high-aspect-ratio or dense diagram can still have unreadable text even after correct responsive width; click-to-expand plus zoom is the durable solution.
5. The original unused hover state was correctly removed, but live review now justifies a deliberate CSS capability-state model rather than ad hoc reactive mouseenter/mouseleave state.
6. The existing image modal should be treated as an adjacent pattern, not the owning boundary: converting SVG to an image URL would remove live anchors and import unrelated copy/download semantics.
7. The interaction should apply to all shared Markdown surfaces automatically. Adding parent props would create inconsistent behavior and duplicated coordination.
8. Candidate component and browser coverage is substantial and passed prior gates, but visual presence/spacing was validated against a now-superseded requirement. Existing coverage must be updated rather than discarded wholesale.
9. The Fit glyph is already the correct semantic inward-corners icon. The UX correction is to remove its visible text/pill width and standardize the shared button treatment, not invent a new interaction.
10. A typical polished pattern must distinguish the painted surface from the operable target: compact desktop appearance can coexist with keyboard focus and touch-safe activation.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Message/Markdown text may contain Mermaid fences; storage locations and volume are irrelevant because this change does not alter source or serialization.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal readers and writers, including unknown/extra-field behavior: Unchanged.
- Required semantics and invariants preserved by direct use: `Yes` — current text is parsed and rendered as before; inspection state is ephemeral.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: None introduced.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration is not a candidate.
- Existing migration framework or lifecycle constraints: Not applicable.

## Constraints / Dependencies / Compatibility Facts

- Browser/Electron share the Nuxt frontend component.
- `securityLevel: 'loose'` permits HTML and Mermaid interaction; new click handling must filter interactive descendants.
- Avoid simultaneous duplicate mounting of an SVG string containing Mermaid-generated IDs unless IDs are made unique; duplicate IDs can affect markers/links.
- Teleport is required to escape parent overflow and stacking contexts.
- The project already depends on Iconify; no new library is needed.
- New labels require English and Simplified Chinese catalog entries.
- Removing visible toolbar action labels reduces text-zoom wrapping pressure; localized accessible names/titles remain required.
- Adaptive visibility must use hover/pointer capability queries with a visible no-hover default/fallback, not user-agent detection.
- A visually hidden desktop affordance must not intercept pointer clicks at rest and must become visible immediately on keyboard focus.

## Open Unknowns / Risks

- The new compact top-right overlay could obscure unusually dense content if its painted surface is oversized; rendered inspection must cover representative diagrams.
- Hidden/hover/focus CSS can create an invisible pointer trap or invisible focus if `pointer-events` and focus states are not coordinated.
- Coarse/no-hover emulation must verify the fallback affordance remains visible and usable.
- Prior zoom/scroll/focus/link risks were executed successfully; they remain regression obligations but do not justify redesign.

## Notes For Architecture Reviewer

- Do not treat `FullScreenImageModal.vue` as the diagram owner merely because it contains similar controls; its URL/gallery actions are the wrong subject.
- The requirements basis intentionally combines a local width correction with an expanded vector viewer; either alone is insufficient for the screenshots.
- The target design must preserve SVG links, avoid ID collisions, and make the modal a child concern of the Mermaid owner without leaking state into `MarkdownRenderer` consumers.
- The user-directed live refinement supersedes the prior persistent-inline-control wording. Architecture review round 2 must treat AC-003 and AC-015–AC-018 as authoritative.
- Keep all validated viewport, link, render-generation, one-copy, focus, and body-lock structure. The required source change is a bounded presentation correction, not permission to rebuild the viewer.
- The toolbar remains persistent in the viewer, but all four actions are icon-only. Only the inline expand affordance is hover-adaptive on fine-pointer devices.
