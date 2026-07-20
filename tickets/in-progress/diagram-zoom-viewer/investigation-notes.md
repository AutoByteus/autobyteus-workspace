# Diagram Zoom Viewer Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements basis approved; target design completed for architecture review
- Investigation Goal: Trace the production diagram-rendering path, identify supported formats and sizing behavior, inspect reusable interaction patterns, and define a verifiable UX recommendation.
- Scope Classification: `Medium`
- Scope Classification Rationale: The change is local to a shared renderer subsystem but adds a modal interaction with responsive, input, focus, localization, and realistic browser validation requirements.
- Scope Summary: Improve readability and inspection of Mermaid diagrams rendered by the shared frontend Markdown path.
- Primary Questions Resolved:
  - Which parser/renderer produces the diagrams? `useMarkdownSegments.ts` -> `MarkdownRenderer.vue` -> `MermaidDiagram.vue` -> `mermaidService.ts` -> Mermaid SVG.
  - Which formats are supported? Fenced `mermaid` and `mmd` only.
  - Why is current UX insufficient? The SVG can be constrained by its inline wrapper/aspect ratio, and no expanded/zoomable inspection path exists.
  - Which owner should change? The shared Mermaid rendering boundary, not every Markdown consumer and not the image/gallery modal.
  - What interaction is recommended? Full-width inline overview plus persistent expand, near-full-screen fitted viewer, zoom/pan/fit/dismiss, link non-interference, and accessible responsive behavior.

## Request Context

The user supplied two screenshots of detailed diagrams rendered at a small inline size within agent responses and asked for a better experience, explicitly suggesting zoom and click-to-enlarge behavior.

Reference screenshots:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_aeb13bd8909a4a6e995addacaee86ac8/solution_designer_a3912dab261f4bb7af4081c9fc2f9523/context_files/ctx_fc77bf517448__image.png` — 3024×1900 pixels; a detailed architecture diagram occupies only a small fraction of the available conversation width.
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_aeb13bd8909a4a6e995addacaee86ac8/solution_designer_a3912dab261f4bb7af4081c9fc2f9523/context_files/ctx_b7116016a789__image.png` — 2410×1352 pixels; a sequence diagram is visible but its labels are too small to read comfortably.

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
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Use only the dedicated task worktree. The shared checkout contains unrelated modifications. An ignored symlink from `autobyteus-web/node_modules` to the shared installation was used for the baseline test; API/E2E remains responsible for its own environment decision.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer/tickets/in-progress/diagram-zoom-viewer/ui-ux-spec.md` | Define intended inline sizing, diagram expansion, zoom/pan, dismissal, responsive states, and accessibility. | Intended user-visible behavior. | Requirements, design spec | REQ-001–REQ-009; AC-001–AC-014 | `Refined` | Approval required / approved 2026-07-20 | Keep aligned through design/rework. |

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

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | A shared Markdown surface receives a closed fenced `mermaid` or `mmd` block. | Conversation/file/team/task surface -> `MarkdownRenderer` -> `useMarkdownSegments` -> Mermaid segment -> `MermaidDiagram` -> `mermaidService.render` -> inline SVG. | Diagram remains in Markdown flow. Complex/aspect-heavy content may be unreadably small; no inspection path exists. | Screenshots; parser, renderer, service files. |
| BEH-002 | User | Rendered Mermaid SVG contains an HTTP(S) anchor and the user activates it. | SVG anchor click -> bubbles through `MarkdownRenderer.handleLinkClick` -> Electron `openExternalLink` when present, else `window.open`. | Link action is distinct from diagram presentation and must remain reachable. | `MarkdownRenderer.vue` lines 113–149; Mermaid `securityLevel: 'loose'`. |
| BEH-003 | System | Mermaid component mounts or its `content` prop changes. | `onMounted`/watch -> clear SVG -> loading -> service initialize/render -> success SVG or error -> loading ends. | A current success or error is shown; no persisted state is created. | `MermaidDiagram.vue` lines 44–70. |
| BEH-004 | Contract | Any existing component uses shared `MarkdownRenderer` with Mermaid content. | Consumer -> shared renderer -> same Mermaid owner. | Consistent Mermaid behavior is centrally reusable; parent-specific behavior is absent. | Consumer `rg` inventory and representative files. |
| BEH-005 | User | User wants to inspect rendered Mermaid detail beyond inline scale. | No Current Path. No expand, modal, zoom, pan, or fit control is rendered by the Mermaid owner. | User must rely on global OS/browser zoom or cannot inspect the detail comfortably. | Screenshots; absence verified in `MermaidDiagram.vue`. |

## Design Health Assessment Evidence

- Change posture: `Feature` / `Behavior Change`
- Candidate root cause classification: `Missing Invariant`
- Refactor posture evidence summary: The correct owner and dependency direction already exist. The local component lacks both a full-width child constraint and a “successful diagrams remain inspectable” invariant. A local viewer addition is sufficient; no parent or service refactor is justified.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `MermaidDiagram.vue` | One component owns render lifecycle and success DOM. | Keep expansion state and current-SVG handoff at this boundary. | Detail component split in design. |
| Shared consumer inventory | Many surfaces delegate through `MarkdownRenderer`. | Do not add per-consumer props/state; shared behavior is the coherent path. | Verify two representative surfaces downstream. |
| Mermaid generated sizing contract | SVG expects a coherent containing width and retains an intrinsic max. | Correct wrapper width without blindly stretching simple diagrams. | Browser validate actual layout. |
| `FullScreenImageModal.vue` | Similar interaction exists but is coupled to image URL, copy/download, and gallery events. | Reusing it would mix subjects and lose live SVG interaction; do not force a generic media abstraction in this task. | None. |
| Screenshots | Even an overview fitted to content can leave text too small. | Width correction alone is insufficient; expanded zoom is required. | Viewer UX is requirements basis. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/composables/useMarkdownSegments.ts` | Parse Markdown into HTML/Mermaid segments | Correctly isolates supported diagram source. | Preserve unchanged. |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Render shared segments and route links/file actions | Correct public shared boundary and current Mermaid delegate. | Preserve API; do not add viewer state here. |
| `autobyteus-web/components/conversation/segments/renderer/MermaidDiagram.vue` | Own Mermaid render lifecycle and inline SVG | Correct change owner; lacks inspection and explicit full-width child. | Modify to own opening/current SVG and delegate modal mechanics. |
| `autobyteus-web/services/mermaidService.ts` | Initialize/render/validate Mermaid | Correct technical renderer; returns SVG. | No API change anticipated. |
| `autobyteus-web/components/common/FullScreenImageModal.vue` | Full-screen image/gallery viewing | Similar but semantically/capability mismatched. | Preserve; no reuse/refactor in scope. |
| `autobyteus-web/localization/messages/en/workspace.ts` | Hand-authored English workspace strings | Correct catalog for new labels. | Add semantic viewer labels. |
| `autobyteus-web/localization/messages/zh-CN/workspace.ts` | Hand-authored Simplified Chinese workspace strings | Correct catalog for translations. | Add matching labels. |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | Test Markdown parsing/delegation integration | Covers Mermaid delegation only. | Preserve; may add integration assertion if needed. |
| New direct Mermaid/viewer tests | No current files | Direct behavior has no durable coverage. | Needed downstream for lifecycle, event filtering, controls, and accessibility. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-20 | Setup | Task-local ignored dependency symlink plus `pnpm -C autobyteus-web exec nuxi prepare` | Isolated worktree can execute frontend tests with the existing dependency installation. | Baseline test is meaningful; downstream owns final environment. |
| 2026-07-20 | Test | `pnpm -C autobyteus-web test:nuxt components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts --run` | 12 tests passed. | Existing parser/delegation baseline is green. |
| 2026-07-20 | Probe | Temporary Mermaid render probe | Startup failed inside Nuxt component scan (`scule` `toLowerCase`) before test collection; file removed. | No claim about generated sample dimensions; rely on dependency source and later browser execution. |

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
2. The current inline success container is a flex row with a centered auto-width child. Only the nested SVG is constrained; the child itself is not explicitly full width. This can underuse available space, depending on generated SVG sizing.
3. Mermaid's vector `viewBox` makes lossless UI zoom feasible without rerendering or network access.
4. A high-aspect-ratio or dense diagram can still have unreadable text even after correct responsive width; click-to-expand plus zoom is the durable solution.
5. The current component already contains unused hover/container state, suggesting the interaction never reached a complete implementation; those members are not evidence of supported behavior.
6. The existing image modal should be treated as an adjacent pattern, not the owning boundary: converting SVG to an image URL would remove live anchors and import unrelated copy/download semantics.
7. The interaction should apply to all shared Markdown surfaces automatically. Adding parent props would create inconsistent behavior and duplicated coordination.
8. The current direct test gap is substantial: there is no `MermaidDiagram.spec.ts` and no modal zoom/focus browser test.

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
- App font sizing and browser text zoom can expand toolbar labels; layout must wrap rather than clip.

## Open Unknowns / Risks

- Exact pointer-centered zoom/scroll math and scaled scroll extents require rendered browser evidence.
- Existing modal implementations are not a complete accessibility model; the new viewer must independently meet the approved focus/background requirements.
- Mermaid may produce different SVG attributes across diagram types, so validation must include at least one dense flow/architecture diagram and one wide sequence diagram.
- The failed disposable probe is not a task blocker; it does mean generated sample dimensions were not captured during design investigation.

## Notes For Architecture Reviewer

- Do not treat `FullScreenImageModal.vue` as the diagram owner merely because it contains similar controls; its URL/gallery actions are the wrong subject.
- The requirements basis intentionally combines a local width correction with an expanded vector viewer; either alone is insufficient for the screenshots.
- The target design must preserve SVG links, avoid ID collisions, and make the modal a child concern of the Mermaid owner without leaking state into `MarkdownRenderer` consumers.
- Requirements and the UI/UX supplement were explicitly approved on 2026-07-20. The design must keep the toolbar minimal and the visible button journey primary.
