# Investigation Notes

## Investigation Status

Complete; requirements basis approved by the user on 2026-07-21, and code/browser-equivalent reproduction established both direct causes and the bounded target ownership.

## Request Context

The user reports that maximizing a diagram from inside an already-maximized artifact preview causes the diagram to disappear, leaving a blank white diagram area. The requested behavior is a diagram overlay stacked above the artifact overlay; closing it must leave the artifact overlay open.

## Environment Discovery / Bootstrap Context

- Repository mode: Git super-repository.
- Shared checkout discovered at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, branch `personal`, tracking `origin/personal`; it was not used as the authoritative task workspace.
- Remote refresh: `git fetch origin personal` on 2026-07-21 succeeded.
- Resolved base branch: `origin/personal` (also `refs/remotes/origin/HEAD`).
- Base commit at worktree creation: `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`.
- Dedicated task branch: `codex/diagram-maximize-nested-overlay`.
- Authoritative worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay`.
- Expected finalization target: latest tracked `origin/personal` through the delivery workflow.
- Dependency setup for probe: `pnpm install --frozen-lockfile --offline` from the workspace root; 1,717 packages reused from the local pnpm store.

## Supplemental Task Artifact Inventory

| Artifact | Canonical path | Purpose / scope | Status | Core-artifact relationship | Approval applicability |
| --- | --- | --- | --- | --- | --- |
| UI/UX specification | `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/in-progress/diagram-maximize-nested-overlay/ui-ux-spec.md` | Defines nested host/diagram overlay journeys, state transitions, layer-specific dismissal, responsive behavior, and accessibility expectations. | Refined | Supports `BEH-001`–`BEH-004`, `REQ-001`–`REQ-009`, and the later overlay design. | Required |
| Reproduction evidence | `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/in-progress/diagram-maximize-nested-overlay/reproduction-evidence.md` | Records exact browser-equivalent reproduction, computed stack values, SVG ownership, dismissal behavior, screenshots, and raw metrics. | Complete | Evidence basis for current behavior, root-cause classification, recommendations, and target design. | N/A |

## Source Log

### User-provided evidence

- User narrative in the current task.
- Screenshot 1: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_4fca2acafe3e4ed190b888bf16801306/solution_designer_802abdb6e525482caf5bd8f4cbf17d68/context_files/ctx_0cbfbb3513e2__image.png` — normal Files preview containing rendered Mermaid diagram and artifact maximize control.
- Screenshot 2: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_4fca2acafe3e4ed190b888bf16801306/solution_designer_802abdb6e525482caf5bd8f4cbf17d68/context_files/ctx_e6d0efee7c20__image.png` — artifact maximized; diagram remains visible with its own maximize control.
- Screenshot 3: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_4fca2acafe3e4ed190b888bf16801306/solution_designer_802abdb6e525482caf5bd8f4cbf17d68/context_files/ctx_4eec8949aa0e__image.png` — after diagram maximize; diagram absent and large white region remains while artifact close control is visible.

### Code and history sources

- `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`
- `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue`
- `autobyteus-web/components/workspace/team/TeamReferenceFileViewer.vue`
- `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue`
- `autobyteus-web/components/fileExplorer/FileViewer.vue`
- `autobyteus-web/components/fileExplorer/viewers/MarkdownPreviewer.vue`
- `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`
- `autobyteus-web/components/conversation/segments/renderer/MermaidDiagram.vue`
- `autobyteus-web/components/conversation/segments/renderer/MermaidDiagramViewer.vue`
- `autobyteus-web/components/conversation/segments/renderer/mermaidDiagramViewport.ts`
- Focused tests under `autobyteus-web/components/conversation/segments/renderer/__tests__/` and `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts`.
- Durable probe: `autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs` and its fixture.
- Historical package: `tickets/done/diagram-zoom-viewer/`.
- Historical package: `tickets/done/artifact-maximize-button/`.
- `git log`, `git blame`, and `git show` for diagram viewer commit `ff48ec538` and artifact maximize commit `097314866`.
- Shared design reference: `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md`.

### Commands / probes

- Bootstrap commands: `git status --short --branch`, `git remote -v`, `git worktree list --porcelain`, `git symbolic-ref refs/remotes/origin/HEAD`, `git fetch origin personal`, `git worktree add -b codex/diagram-maximize-nested-overlay ... origin/personal`.
- Code discovery: focused `rg`, `find`, `sed`, `nl`, `git log`, `git blame`, `git show`, and `diff` commands recorded in the terminal session.
- Dependency setup: `pnpm install --frozen-lockfile --offline`.
- Runtime server: `pnpm dev --port 31847` in `autobyteus-web`.
- Browser probe: disposable Nuxt page plus Playwright/Chrome 150 at 1440×1000; exact observations retained in `reproduction-evidence.md` and `probe-evidence/nested-overlay-reproduction.json`.
- Cleanup: stopped the owned Nuxt server and removed the disposable page; `git status --short` showed only the intended ticket artifact directory.

## Relevant Existing Behavior And Production Paths

| Behavior ID | Supported behavior / observed defect | Evidence | Current production path | Verification status |
| --- | --- | --- | --- | --- |
| `BEH-001` | Artifact preview and artifact maximize show rendered diagram content. | User screenshots 1–2; browser probe before state. | User artifact selection -> `ArtifactsTab` -> `ArtifactContentViewer` -> `FileViewer(preview)` -> `MarkdownPreviewer` -> `MarkdownRenderer` -> `MermaidDiagram` inline SVG. | User-observed and browser-reproduced. |
| `BEH-002` | Nested diagram maximize removes the inline SVG and shows a blank source region because the viewer holding the SVG is underneath the artifact. | User screenshot 3; probe computed artifact `z=120`, viewer `z=100`, inline SVG `0`, viewer SVG `1`, center hit inside artifact. | Diagram expand -> `MermaidDiagram.openViewer` -> inline height lock + `isViewerOpen` -> `MermaidDiagramViewer` Teleport to body -> viewer painted behind maximized host. | Browser-reproduced with real component chain. |
| `BEH-003` | Explicit diagram close preserves host maximize, but one Escape closes both diagram and host. | Browser probe explicit-close and Escape observations; source event trace. | Dialog keydown -> `MermaidDiagramViewer.handleKeydown` preventDefault + close emit -> event continues to `window` -> host `handleKeydown` exits maximize. | Browser-reproduced. |
| `BEH-004` | Shared Mermaid path serves conversation and file previews; several supported host viewers use z `120`, while durable diagram browser coverage exercises only non-maximized fixture surfaces. | Code and E2E probe inspection. | Host consumers -> shared `FileViewer`/`MarkdownPreviewer`/`MarkdownRenderer` -> shared Mermaid components. | Statically verified; missing nested durable coverage confirmed. |

## Design Health Assessment Evidence

- Change posture: bug fix.
- Root cause: `Missing Invariant`.
- The shared viewer is already the correct owner for dialog stacking, focus, body scroll, SVG viewport, and dismissal. Host viewers correctly own their independent maximize states.
- The invariant was omitted when two previously independent capabilities were composed: diagram viewer (`z=100`, introduced 2026-07-20) and artifact/Files/team-reference maximize (`z=120`).
- Explicit diagram close already keeps the artifact maximized, proving no shared-state redesign is needed.
- The same top-dialog owner must contain the handled Escape event before global host listeners. Consumer-specific guards would duplicate policy and risk missing another supported host.
- Broad refactor not needed: no duplicated Mermaid state, ambiguous identity, persistence, API, or data-model issue is involved.
- Deferred residual risk: manually assigned overlay tiers are not centrally modeled. A global overlay system is out of scope because the supported relationship can be corrected and locked by production-path browser coverage locally.

## Relevant Files / Components

| File/component | Current owner/responsibility | Relevant finding | Expected design impact |
| --- | --- | --- | --- |
| `MermaidDiagramViewer.vue` | Body-teleported top dialog, viewport, zoom/pan/Fit, focus trap, body lock, close/Escape/backdrop | Backdrop tier `100` is lower than supported maximized hosts; Escape is prevented but not propagation-contained. | Primary implementation owner; correct tier and top-layer Escape containment. |
| `MermaidDiagram.vue` | Render lifecycle, one-current-SVG handoff, inline height lock, viewer open state, focus return | Correctly moves the sole SVG into viewer, making obscured viewer appear as a blank source region. | Preserve behavior; tests may help prove host remains and inline SVG returns. |
| `ArtifactContentViewer.vue` | Artifact content/header and artifact maximize state | Maximize shell is body-teleported at `120`; global Escape closes artifact without checking handled state. | Prefer no production change if shared viewer contains the event; use in nested integration coverage. |
| `FileExplorerTabs.vue` | Files view maximize and global shortcuts | Maximized host at `120`; same bubbling Escape exposure. | Shared fix covers it; durable scenario may use artifact primary path and representative host regression. |
| `TeamReferenceFileViewer.vue` / `TeamCommunicationReferenceViewer.vue` | Team reference preview/maximize | Maximized hosts at `120`; same bubbling Escape exposure. | Shared fix covers them without consumer-specific patches. |
| `MarkdownPreviewer.vue` / `MarkdownRenderer.vue` | Shared Markdown and Mermaid delegation | Healthy transparent path; no overlay policy. | No production change. |
| `MermaidDiagramViewer.spec.ts` | Focused viewer lifecycle and interaction tests | Covers single-layer Escape but not propagation ownership or tier relation. | Extend focused assertions. |
| `ArtifactContentViewer.spec.ts` | Artifact state/maximize tests with `FileViewer` stub | Does not compose real Markdown/Mermaid viewer. | Avoid forcing shallow test to imitate production; durable nested browser fixture should exercise real chain. |
| `tests/e2e/diagram-zoom-viewer-probe.mjs` + fixture | Durable real Mermaid browser coverage | Covers conversation and file previews, geometry, focus, dismissal, links, responsive input; no nested maximized host. | Extend with production-shaped host nested scenario rather than create a parallel probe. |

## Runtime / Probe Findings

- Exact current-state metrics and screenshots are retained in `reproduction-evidence.md`.
- The observed screenshot pattern was reproduced: heading/content remain visible, diagram region becomes blank, expand control remains, and the artifact still visually owns the viewport.
- The viewer DOM and SVG exist and are CSS-visible but are occluded by the artifact layer.
- Body overflow becomes `hidden`, and focus moves into the hidden dialog, further confirming the dialog mounted normally below the host.
- Explicit close restores one inline SVG and preserves host maximize.
- One physical Escape closes both layers.
- No production source was modified during probing.

## External / Public Source Findings

None. Repository code, its historical packages, user evidence, and direct runtime reproduction are authoritative; no external source was needed.

## Reproduction / Environment Setup

See `reproduction-evidence.md`. The disposable page rendered a buffered `write_file` Markdown artifact so backend availability could not affect the content or overlay result. Development-shell backend health requests failed as expected and are recorded as unrelated noise in the raw JSON.

## Findings From Code / Docs / Data / Logs

1. `MermaidDiagramViewer` comment/requirements history intended the modal to appear above workspace chrome, but its fixed `z-[100]` does not account for supported fullscreen Markdown consumers at `z-[120]`.
2. `MermaidDiagram` intentionally renders either inline SVG or viewer SVG, not both. The blank source region is therefore expected while viewer-open; visibility depends entirely on the viewer being topmost.
3. Existing dialog Escape behavior calls `event.preventDefault()` and emits close. Because it omits `stopPropagation()`, the same event reaches global host listeners.
4. Host maximize state is independently owned; no store unification or parent-child state coupling is required.
5. Existing durable browser tests verify valuable Mermaid behavior but do not create a maximized host around the file preview, allowing the regression to pass.

## Persisted Data Transition Evidence (When Applicable)

Not applicable. No stored data, schema, reader/writer, API, or migration is affected.

## Constraints / Dependencies / Compatibility Facts

- Preserve the one-current-SVG design and existing viewport math.
- Preserve existing localized labels, focus containment/return, body-overflow restoration, backdrop behavior, and external-link routing.
- The diagram overlay must sit above supported host tier `120` but need not overtake server-loading/shutdown tier `9999` or unrelated system surfaces at `1000`.
- A local shared-viewer correction is preferred over editing every host Escape listener or introducing duplicate viewer implementations.
- Existing non-nested browser and unit coverage remains valid and must continue to pass.

## Open Unknowns / Risks

- No blocker or requirement ambiguity remains.
- Downstream implementation should verify focus returns to the connected opener inside the teleported maximized artifact after one-layer close.
- API/E2E should decide exact proportional expansion of the existing durable probe and whether one additional representative maximized host beyond artifact is valuable.
- Actual Electron execution is not currently justified: the reproduced failure is ordinary DOM stacking/event propagation in the shared web path. Reassess only if browser evidence diverges from desktop behavior.

## Notes For Architecture Reviewer

Requirements basis approved on 2026-07-21. The design should remain narrow: shared diagram-viewer layer tier + Escape containment, preservation of host ownership, no broad overlay-manager refactor, and durable nested production-path browser coverage.
