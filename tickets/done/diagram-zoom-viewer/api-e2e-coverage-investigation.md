# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer/tickets/done/diagram-zoom-viewer/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer/tickets/done/diagram-zoom-viewer/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer/tickets/done/diagram-zoom-viewer/proposed-design.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer/tickets/done/diagram-zoom-viewer/ui-ux-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer/tickets/done/diagram-zoom-viewer/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer/tickets/done/diagram-zoom-viewer/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer/tickets/done/diagram-zoom-viewer/code-review-report.md`
- Current Investigation Round: 3
- Trigger: Proportional durable test-code review round 3 found `E2E-TR-003`, a bounded false-pass risk in the hybrid CSSOM proxy's media-condition selection.
- Prior Investigation Reviewed: Round 2, which refreshed the visual-refinement coverage and produced eight passing Chrome scenarios at 97.0% confidence; its execution evidence remains truthful while the durable proxy predicate is tightened.
- Latest Authoritative Investigation: Round 3 (this file)

## Investigation Round History

| Round | Trigger | Material Coverage Decision | Result / Status | Latest Authoritative |
| --- | --- | --- | --- | --- |
| 1 | Original implementation-source review round 2 Pass | Add six production-shaped Chrome scenarios plus preload bridge proof | Completed; execution rounds 1–2 and proportional test review round 2 passed | No — functional history remains valid but visual evidence is superseded |
| 2 | Source review round 4 Pass after user-directed compact/adaptive visual refinement | Refresh stale direct-button/persistent-toolbar expectations; add desktop state, light/dark, pure-coarse, and honest hybrid-cascade proof while rerunning all functional scenarios | Completed; plan executed with eight Chrome scenarios passing and refreshed execution evidence | No |
| 3 | Proportional test review round 3 `Fail`: `E2E-TR-003` | Require a normalized standalone media-list disjunct before cloning any hybrid proxy rule: exact sole branch for inline rules and an exact independent branch for the viewer list | Completed; bounded harness fix implemented and all eight Chrome scenarios reran successfully | Yes |

## Round 3 Bounded Coverage Validity Correction

The prior round's current evidence recorded the correct emitted conditions and remains valid, but the durable extractor accepted any condition text containing `(any-pointer: coarse)`. That could false-pass a future wide-hybrid regression if the condition became conjoined, narrowed, or negated. Round 3 therefore keeps the same requirement and execution scope while strengthening test validity: media lists are split only at top-level commas, branches are normalized, inline declarations are cloned only from the exact sole condition `(any-pointer: coarse)`, viewer declarations require that same condition as an independent branch, and DZV-BR-008 asserts those predicate semantics before declaration and geometry checks. The affected durable browser command reran successfully; unrelated repository checks remain current because no implementation, fixture, preload, package, or production source changed in this correction.

## Current Requirement And Design Basis

The approved behavior is the shared `MarkdownRenderer -> MermaidDiagram -> MermaidDiagramViewer` experience defined by REQ-001–REQ-010 and AC-001–AC-018. Successful diagrams must use available inline width without over-stretching intrinsically small output; expose a zero-flow, hidden-at-rest fine-pointer expand affordance that reveals on whole-preview hover or keyboard focus; remain visibly operable for coarse/no-hover and fine-primary/coarse-secondary devices; transfer one current SVG copy into a fitted, near-full-viewport modal with four uniform icon-only controls; support clamped 1×–4× zoom, focal wheel zoom, pointer/touch pan, native reachability, and Fit; preserve Mermaid HTTP(S) and non-HTTP interactions through the existing Markdown/browser/Electron authority; retain loading/error/source-replacement correctness; work in conversation and non-conversation Markdown consumers; and remain keyboard-, focus-, narrow-width-, localized-, dark/light-, and 200%-text-scale usable. Viewer state is ephemeral and persisted Markdown/message data is not affected.

The implementation and source review identify realistic downstream obligations: refresh stale fine-pointer button activation; prove rest/hover/leave/focus and zero SVG motion/control-row space; four uniform icon-only wide/narrow/coarse actions with icon-only Fit; representative light/dark rendering; real pure coarse/no-hover behavior; the strongest honest hybrid-state proxy available in installed Chrome; and regression of production-shaped shared consumers, one-mounted-SVG behavior, zoom/pan/edge/Fit, modal lifecycle/background isolation/source replacement, browser/Electron-branch link dispatch, both locales at 360 CSS px and 200% text scale, and controlled missing/malformed-viewBox fixtures.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / inline shared Mermaid view and adaptive entry chrome | Refined | Requirements AC-001–AC-004/AC-015–AC-016/AC-018; reviewed design DS-001/DS-002 | Execute real Mermaid output through both a conversation `TextSegment` and non-conversation `MarkdownPreviewer`; inspect layout/overflow plus fine-pointer rest/hover/leave/focus, zero normal-flow control space, stable SVG geometry, pure coarse visibility, and the coarse-secondary override. |
| BEH-002 / SVG/HTML link normalization and external dispatch | Changed | Requirements AC-011; CR-001 resolution in code review | Execute actual Mermaid `xlink:href` inline and in the teleported viewer through browser `window.open` and Electron renderer `electronAPI.openExternalLink`; preserve non-HTTP behavior. |
| BEH-003 / async render and source lifecycle | Changed | Requirements AC-012; design DS-004 | Execute source replacement while viewer is open and verify stale viewer/body lock/focus state are removed before the new result is usable. |
| BEH-004 / shared consumer reach | Preserved and extended | Requirements AC-013; consumer inventory | Prove unchanged parents receive the new behavior through actual `TextSegment` and `MarkdownPreviewer` components. |
| BEH-005 / modal viewport interaction and toolbar presentation | Refined | Requirements AC-005–AC-010/AC-014/AC-017–AC-018; design DS-003/DS-005 | Browser execution is required for geometry, focus, scroll, input, responsive layout, dismissal, and exactly four uniform icon-only controls on wide, coarse/hybrid, narrow, light, and dark surfaces. |
| Input capability cascade | Refined by CR-002; validity tightened by E2E-TR-003 | Requirements AC-003/AC-016/AC-018; implementation/source review | Installed Chrome proves real fine-primary and real pure coarse contexts, but CDP cannot expose simultaneous fine-primary/coarse-secondary. Use only emitted rules whose normalized media list has `(any-pointer: coarse)` as the exact sole branch for inline rules or an exact independent branch for viewer rules, then exercise them in a deterministic combined-cascade proxy and label it non-hardware evidence. |
| SVG bounds fallback | Added | Design guidance/risk; implementation handoff known risk | Add controlled rendered missing/malformed-viewBox browser fixtures and decide validity of the general fallback path. |
| Persisted Markdown/message source | Preserved | Persisted-data outcome `Not Affected` | Confirm no persistence/API/store transition exists; no migration validation is applicable. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None | N/A | None | None |
| API / transport / contract | No | No GraphQL/REST/WebSocket change | N/A | None | None |
| Frontend component / state | Yes | Shared Markdown/Mermaid components, pure viewport math, locale catalogs, refined adaptive CSS and icon-only toolbar | 30 focused Nuxt tests reported; reviewer reran both changed component suites (11 tests) | happy-dom cannot prove real layout, media capability cascades, transition geometry, scroll, focus, contrast, or SVG runtime representations | Browser |
| Browser integration / user journey | Yes | Fine-pointer hover/focus entry, coarse fallback, teleported modal, wheel/pointer/focus/body/scroll | Component tests plus implementation self-probe | Independent full acceptance journey, consumer realism, responsive/text-scale, dark/light rendering, source replacement, honest hybrid classification | Browser |
| Authentication / session / permissions | No | None | N/A | None | None |
| Desktop renderer / web-equivalent UI | Yes | Same Nuxt renderer path used in browser/Electron | Renderer test stubs Electron API; Electron preload/main paths are unchanged | Actual renderer choice between browser and Electron bridge with real Mermaid anchor | Browser with Electron bridge emulation plus Electron repository checks |
| Desktop shell / Electron-specific integration | No source change | Existing `preload.ts` bridge and `main.ts` `open-external-link` handler are preserved | Existing preload suite; direct MarkdownRenderer test | OS `shell.openExternal` itself is unchanged and unsafe to invoke as a test side effect | Repository Electron coverage + renderer bridge emulation; no desktop launch unless a shell-specific gap remains |
| Process / lifecycle | Yes, component-local | mount/unmount, ResizeObserver, body lock, source invalidation | Component tests | exact cleanup in real browser | Browser |
| Persisted-data transition | No | Viewer state only; source readers/writers unchanged | Upstream `Not Affected` decision and source diff | None | None |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | Preserved | browser `window.open` or Electron bridge | Component tests | live browser choice and actual SVG `xlink` representation | Browser; shell code unchanged |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-zoom-viewer`
- Project type and runtime stack: pnpm workspace; Nuxt 3 / Vue 3 frontend; Vitest with Nuxt test utils/happy-dom; Mermaid 11.12.x; Electron 42.4.1; Playwright Core; macOS arm64; Google Chrome available.
- Conflicting, missing, or unclear project instructions: No conflict. `autobyteus-web/AGENTS.md` requires `--run` for Nuxt tests. README documents browser development via `pnpm dev` and the existing Playwright-Core probe pattern. No existing diagram-specific live fixture or route exists.
- Required environment variables or secrets available: N/A. This client-only feature can execute without a backend; expected unrelated dev-proxy health failures must not be treated as feature failures.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | Closest repository instructions | Colocated tests; `pnpm test:nuxt ... --run`; frontend and Electron suites separated; never use `git add .`/`-A`. |
| `autobyteus-web/README.md` | Development/E2E instructions | `pnpm dev` on a selected port; browser path preferred for web-equivalent Electron behavior; Playwright Core probes accept base URL/output/browser executable. |
| `autobyteus-web/package.json` | Executable script authority | `test:nuxt`, `test:electron`, guards/audit/build/dev; Playwright Core and Chrome discovery are available. |
| `autobyteus-web/vitest.config.mts` | Nuxt test environment | happy-dom with Nuxt environment and localization/websocket setup; excludes generated/build/server resources. |
| `autobyteus-web/nuxt.config.ts` | Runtime config | Browser dev uses backend proxy but the isolated Markdown fixture has no backend dependency. |
| `autobyteus-web/electron/preload.ts`, `electron/main.ts` | Existing desktop dispatch boundary | Renderer calls `electronAPI.openExternalLink`, preload invokes `open-external-link`, main calls `shell.openExternal`; these files are unchanged. |
| `autobyteus-web/tests/e2e/workspace-responsive-probe.mjs` | Existing browser probe convention | Playwright Core, explicit Chrome discovery, JSON/screenshot evidence, and caller-selected output directories are established patterns. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Focused Nuxt coverage | worktree root | `pnpm -C autobyteus-web test:nuxt <files> --run` | Existing install is lock-consistent per implementation handoff | Vitest exit/result | Process exits |
| Electron repository coverage | worktree root | `pnpm -C autobyteus-web test:electron --run` or focused preload spec | No desktop app launch required for unchanged bridge exposure | Vitest exit/result | Process exits |
| Diagram browser fixture | `autobyteus-web` | Durable probe will install a bounded temporary Nuxt page, start `pnpm dev --port <owned port>`, then drive Chrome | Backend intentionally absent; no credentials/data; route uses actual shared production components and Mermaid service | HTTP readiness plus fixture marker and rendered expand controls | Probe-owned dev server terminated; temporary page removed; browser closed |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Dense linked flowchart and wide/simple diagrams | Static Mermaid fences in a test fixture page | No backend/store/persisted writes | Durable fixture retained; generated temporary page removed |
| Missing/malformed-viewBox SVG | Controlled direct viewer fixtures in test-only page | General current-input fallback, not legacy/version compatibility | Durable fixture retained; no data cleanup |
| Locale | Existing localization runtime/localStorage preference | Isolated browser contexts | Contexts closed |
| Browser/Electron dispatch sinks | `window.open` capture and injected renderer `electronAPI.openExternalLink` capture | Prevents OS/browser side effects; does not claim Electron main-process execution | Browser contexts closed |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: `proposed-design.md` “Persisted Data / State Transition Decision”; `implementation-handoff.md` “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: Existing Mermaid fences remain ordinary Markdown strings supplied unchanged to existing consumers.
- Evidence planned: Use static existing-format Markdown fences through normal current readers and verify no API/store/persistence mutation occurs in changed code or execution.
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: No.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `renderer/__tests__/mermaidDiagramViewport.spec.ts` (5 scenarios) | fit/aspect, invalid input, 1×–4× clamp, plane extents, focal anchor, edge clamping | REQ-003–REQ-005; AC-005–AC-009; DS-005 | Still Valid | Pure formulas match approved target policy | Rerun; pair with live layout/input evidence. |
| `renderer/__tests__/MermaidDiagramViewer.spec.ts` | modal/four controls/body restore, icon-only Fit, fit/zoom/Fit, wheel/keyboard/pointer, focus/dismiss, link return | REQ-003–REQ-006/REQ-009–REQ-010; AC-005–AC-011/AC-014/AC-017 | Still Valid After Refinement | Updated source assertions reject a visible Fit span and preserve four common action classes; happy-dom limitations remain explicit | Rerun; pair with wide/narrow/coarse/dark browser geometry and rendered icons. |
| `renderer/__tests__/MermaidDiagram.spec.ts` | loading/error, zero-flow expand overlay classes, one copy, interactive exclusion, link forwarding, latest-source gate | REQ-001–REQ-002/REQ-006–REQ-010; AC-001–AC-004/AC-011–AC-013/AC-015–AC-016 | Still Valid After Refinement | Updated assertions reject the removed control row and cover the shared entry structure; CSS capability behavior remains browser-only | Rerun; live rest/hover/leave/focus/coarse geometry required. |
| `renderer/__tests__/MarkdownRenderer.spec.ts` Mermaid/link scenarios | fence delegation and browser/Electron authority for ordinary href/xlink | REQ-006/REQ-008; AC-011/AC-013; DS-006 | Still Valid | CR-001 production-shaped fixture validated in source review | Rerun; execute real Mermaid links in Chrome. |
| `components/fileExplorer/viewers/__tests__/MarkdownPreviewer.spec.ts` | non-conversation consumer delegates content/resolver | REQ-008; AC-013 | Still Valid | Parent boundary remains unchanged | Rerun as part of broader affected suite if practical; browser fixture will use actual parent. |
| `components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts` | conversation/team content delegates to Markdown rendering | REQ-008; AC-013 | Still Valid | Existing math/content assertions prove real renderer integration but not Mermaid viewer | Rerun affected consumer suite if practical; browser fixture will use `TextSegment`. |
| `electron/__tests__/preload.spec.ts` | preload exposes locale and `openExternalLink` IPC-facing renderer APIs | Preserved Electron path under AC-011 | Still Valid From Round 1 | Round-1 API/E2E work already added direct `openExternalLink(url) -> ipcRenderer.invoke('open-external-link', url)` proof; no Electron boundary changed in the visual refinement | Rerun focused preload coverage; do not launch desktop solely to retest unchanged `shell.openExternal`. |
| `tests/e2e/diagram-zoom-viewer-probe.mjs` / DZV-BR-001–008 | Production-shaped functional and refined presentation journey | REQ-001–REQ-010; AC-001–AC-018 | Needs Bounded Update for E2E-TR-003, then Current | Round-2 behavior assertions are valid, but the hybrid rule extractor could clone a conjoined/narrowed/negated media condition and hide a future wide-hybrid regression | Completed: exact normalized media-branch predicate and explicit semantic assertions added; affected 8/8 Chrome command reran successfully. |
| `tests/e2e/workspace-responsive-probe.mjs` | workspace shell responsiveness | Only indirectly relevant to overlay environment | Out Of Scope | Does not render or exercise diagram viewer | Do not run for this feature. |

## Stale Or Obsolete Coverage Decisions

The prior browser probe's direct fine-pointer `.click()` on an expand action assumed the old always-hit-testable control and is stale. Its pre-refinement screenshots cannot be treated as authoritative for AC-003/AC-015–AC-018. The functional assertions remain valid and must be rerun after adapting entry actions; no compatibility-only test is retained.

## Durable Coverage To Add Or Refresh

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| DZV-BR-001 | Real conversation and non-conversation consumers; fine-pointer rest/hover/leave/keyboard focus; zero-flow/no SVG motion; keyboard/button/non-interactive opening; complex/simple sizing; one mounted SVG; uniform wide light toolbar | REQ-001–REQ-003/REQ-007–REQ-010; AC-001–AC-005/AC-012–AC-015/AC-017–AC-018 | `autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs` + fixture page | Real CSS capability/transition geometry and actual shared-parent integration cannot be proven in happy-dom. |
| DZV-BR-002 | Fit, 4× clamp, focal wheel stability, mouse/touch pointer pan, native edge reachability, Fit origin | REQ-003–REQ-005; AC-005–AC-009 | Same durable browser probe | Real layout, scroll extents, and PointerEvent behavior are critical requirements. |
| DZV-BR-003 | close/Escape/backdrop, focus containment/return, exact body overflow, source replacement, background isolation | REQ-007/REQ-009; AC-010/AC-012/AC-014 | Same durable browser probe | Modal lifecycle and background behavior require browser execution. |
| DZV-BR-004 | Real Mermaid HTTP(S) inline/expanded dispatch for browser and Electron renderer branches; non-HTTP preservation | REQ-006; AC-011; DS-006 | Same durable browser probe | Exercises actual Mermaid SVG/xlink runtime representation and both renderer dispatch choices without unsafe OS side effects. |
| DZV-BR-005 | Real pure coarse/no-hover at 360 CSS px + 200% root text scale in English and zh-CN; visible/tappable inline action and four uniform icon-only viewer actions | REQ-002/REQ-009–REQ-010; AC-014/AC-016–AC-018; UI/UX supplement | Same durable browser probe | Responsive layout, touch capability, and localized label/title lengths are rendered-surface requirements. |
| DZV-BR-006 | Missing and malformed viewBox measured-bounds fallback | Design risk/guidance; implementation-handoff obligation | Same durable browser fixture/probe | Closes the known rendered fallback uncertainty with controlled current-input fixtures. |
| DZV-BR-007 | Representative fine-pointer dark-surface hover and uniform wide icon-only viewer chrome | REQ-010; AC-017–AC-018 | Same durable browser probe with `colorScheme: dark` | Independent current CSS/render proof and retained screenshots are required for the revised contrast contract. |
| DZV-BR-008 | Wide real pure-coarse fallback and fine-primary/coarse-secondary combined cascade | REQ-002/REQ-009–REQ-010; AC-003/AC-016–AC-018; CR-002; E2E-TR-003 | Same durable browser probe | Chrome can directly prove fine-primary and pure coarse separately. Because CDP cannot expose both simultaneously, accept only a normalized exact standalone inline condition or an exact independent viewer media-list branch, assert that predicate semantically, then apply accepted declarations behind a test-only document prefix while real fine-primary stays active; record this as a deterministic cascade proxy, not hardware evidence. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| DZV-BR-001–008 | `autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs` | Retain capability-aware functional/presentation coverage; in round 3, normalize top-level media disjuncts and reject hybrid rules unless the source condition has the required exact standalone branch semantics | REQ-001–REQ-010; AC-001–AC-018; E2E-TR-003 | Preserve bounded maximum-zoom and failure-producing cleanup safeguards; rerun the entire coherent eight-scenario command because the probe executes and cleans up as one surface. |
| DZV-BR-007 | `autobyteus-web/tests/e2e/fixtures/diagram-zoom-viewer.page.vue` | Add dark variants to the test-only application surfaces so dark custom chrome is inspected in a representative surrounding surface | REQ-010; AC-018 | No production route or source behavior changes. |
| DZV-SCRIPT-001 | `autobyteus-web/package.json` | Add a named script for the durable diagram probe | Project execution discoverability | Implemented as `test:e2e:diagram-zoom-viewer`; no production dependency change. |
| DZV-EL-001 | `autobyteus-web/electron/__tests__/preload.spec.ts` | No new change; rerun the prior durable assertion that `openExternalLink` invokes `open-external-link` with the URL | REQ-006; AC-011; preserved Electron bridge | Visual refinement does not alter this boundary. |

## Durable Coverage To Remove

None.

## Round 2 Repository And Browser Execution Plan

| Order | Command | Boundary / Reason | Round 2 Status At Investigation Checkpoint |
| --- | --- | --- | --- |
| 1 | `node --check autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs`; `git diff --check`; durable-file whitespace audit | Updated harness and artifact hygiene | Pass |
| 2 | `pnpm -C autobyteus-web test:nuxt components/conversation/segments/renderer/__tests__/{MermaidDiagram,MermaidDiagramViewer,MarkdownRenderer}.spec.ts components/conversation/segments/renderer/__tests__/mermaidDiagramViewport.spec.ts --run --reporter=verbose` | Refined source owners plus retained geometry/link boundaries | Pass — 4 files / 30 tests |
| 3 | `pnpm -C autobyteus-web test:nuxt components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts components/fileExplorer/viewers/__tests__/MarkdownPreviewer.spec.ts --run --reporter=verbose` | Conversation and non-conversation consumers | Pass — 2 files / 10 tests |
| 4 | `pnpm -C autobyteus-web test:electron electron/__tests__/preload.spec.ts --run --reporter=verbose` | Preserved Electron renderer bridge | Pass — 1 file / 1 test |
| 5 | Web/localization guards and literal audit | Boundary/catalog regression | Pass — zero unresolved literal findings |
| 6 | `pnpm -C autobyteus-web build` | Integrated production presentation build | Pass — 15 prerender routes; existing chunk warnings only |
| 7 | `pnpm -C autobyteus-web test:e2e:diagram-zoom-viewer -- --output-dir ../tickets/done/diagram-zoom-viewer/api-e2e-evidence/browser` | Authoritative refreshed DZV-BR-001–008 in installed Chrome | Pass — 8/8 scenarios, zero failures/page errors, verified owned-resource cleanup |

The full Nuxt suite was not repeated because the refinement changes only already-focused presentation owners, every selected source/consumer/browser boundary passed, and the earlier full-suite run is transparently base-red on four unrelated files. The prior full-suite logs remain historical evidence and are not presented as a fresh round-2 run.

## Round 2 Post-Repository Confidence Scorecard (Before Required Chrome)

| Confidence Category | Score | Supporting Evidence Before Chrome | Remaining Uncertainty Requiring Browser |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | Updated component tests plus retained functional suites map to REQ-001–REQ-010/AC-001–AC-018 | Refined visual/media states still indirect |
| Changed-boundary execution directness | 91% | Both changed presentation owners execute in the focused 30-test set; production build passes | Real layout/transition/CSS media geometry absent |
| Cross-boundary integration realism and mock gap | 89% | Shared renderer, consumer, link authority, and preload paths pass | No current real Mermaid/Teleport/capability run yet |
| Environment, configuration, identity, and fixture fidelity | 91% | Locked Nuxt/Vitest/Electron configs and production build; no backend identity required | Current installed Chrome surface pending |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | Prior lifecycle/fallback tests remain valid and focused reruns pass | Visual refinement plus functional interaction not yet integrated |
| User-surface, browser, and desktop-shell confidence | 83% | Source review and implementation screenshots are coherent | Independent light/dark/fine/coarse/hybrid evidence pending |
| Durable regression coverage quality and relevance | 95% | Stale assertions were identified and the cohesive probe updated without dropping cleanup safeguards | Updated command not yet executed at this checkpoint |

- Overall round-2 post-repository confidence: `90.1%` (simple average, rounded to one decimal).
- Critical acceptance criteria directly proven before Chrome: `No` — AC-003, AC-015–AC-018 and real-layout portions of earlier ACs remained outstanding.
- Any category below 90%: `Yes` — cross-boundary realism and user-surface confidence.
- Required decision: Execute the refreshed installed-Chrome plan; do not reuse pre-refinement screenshots as final evidence.

## Round 1 Historical Repository Coverage Results (Superseded As Final Visual Evidence)

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `git diff --check`; `node --check autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs`; added-file trailing-whitespace audit | worktree root | Patch/harness hygiene | Pass | `tickets/done/diagram-zoom-viewer/api-e2e-evidence/git-diff-check.log` |
| 2 | `pnpm -C autobyteus-web test:nuxt components/conversation/segments/renderer/__tests__/{MermaidDiagram,MermaidDiagramViewer,MarkdownRenderer}.spec.ts components/conversation/segments/renderer/__tests__/mermaidDiagramViewport.spec.ts --run --reporter=verbose` | worktree root / Nuxt happy-dom | Direct changed components, geometry, lifecycle, and link authority | Pass — 4 files / 30 tests | `tickets/done/diagram-zoom-viewer/api-e2e-evidence/focused-renderer-vitest.log` |
| 3 | `pnpm -C autobyteus-web test:nuxt components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts components/fileExplorer/viewers/__tests__/MarkdownPreviewer.spec.ts --run --reporter=verbose` | worktree root / Nuxt happy-dom | Existing conversation/non-conversation consumer regression | Pass — 2 files / 10 tests | `tickets/done/diagram-zoom-viewer/api-e2e-evidence/consumer-vitest.log` |
| 4 | `pnpm -C autobyteus-web test:electron electron/__tests__/preload.spec.ts --run --reporter=verbose` | worktree root / Electron Vitest config | Locale and updated external-link preload bridge | Pass — 1 file / 1 scenario | `tickets/done/diagram-zoom-viewer/api-e2e-evidence/electron-preload-vitest.log` |
| 5 | `pnpm -C autobyteus-web guard:web-boundary`; `guard:localization-boundary`; `audit:localization-literals` | worktree root | frontend boundary/localization invariants | Pass; literal audit zero unresolved findings | `tickets/done/diagram-zoom-viewer/api-e2e-evidence/guards-and-localization.log` |
| 6 | `pnpm -C autobyteus-web test:nuxt --run` | worktree root / full Nuxt suite | Broad frontend regression | Fail on known unrelated base-red scope — 4 failing files / 376 passing / 1 skipped; 4 failing tests / 2051 passing / 1 skipped. No changed task/test path appears in a failure. | `tickets/done/diagram-zoom-viewer/api-e2e-evidence/full-nuxt-vitest.log`; `.result` |
| 7 | `pnpm -C autobyteus-web build` | worktree root | Production Nuxt bundling/prerender | Pass — 15 routes; existing large-chunk warnings only | `tickets/done/diagram-zoom-viewer/api-e2e-evidence/production-build.log` |
| 8 | `pnpm -C autobyteus-web test:e2e:diagram-zoom-viewer -- --output-dir ../tickets/done/diagram-zoom-viewer/api-e2e-evidence/browser` | probe-owned Nuxt server / Chrome 150 | Required broader browser scenarios DZV-BR-001–006 | Pass — all six scenarios; zero page errors; owned server/page/browser cleanup passed | `tickets/done/diagram-zoom-viewer/api-e2e-evidence/browser/evidence.json`; screenshots; `browser-command.log` |

The full Nuxt suite is repository-base red, not a task failure. The four current failures are `workspace-history-draft-send.integration.test.ts`, `MemoryHome.spec.ts`, `CodexFullAccessCard.spec.ts`, and `zhCnGlossaryConsistency.spec.ts`; none imports, asserts, or names a changed diagram/API-E2E path. The prior implementation run had the same first three/glossary failures plus one transient managed-extension failure; the current managed-extension suite passed.

## Round 1 Historical Post-Repository Confidence Scorecard (Superseded)

This scorecard deliberately excludes the required Chrome run and records the confidence available from repository component/consumer/Electron tests, guards, and build alone.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 30 direct renderer/viewer/geometry tests plus 10 consumer tests map to every behavior family | Critical CSS layout, pointer, focus, and SVG runtime ACs remain indirect | DZV-BR-001–006 |
| Changed-boundary execution directness | 90% | Direct component methods/state and pure calculations execute | happy-dom supplies mocked rectangles and cannot prove real scroll/focus layout | Chrome probe |
| Cross-boundary integration realism and mock gap | 88% | Markdown authority and parent consumers execute; preload bridge is direct | Mermaid output, Teleport event runtime, and actual consumer layout are not real-browser evidence | Actual Mermaid through production parents in Chrome |
| Environment, configuration, identity, and fixture fidelity | 90% | Locked dependencies, Nuxt runner, Electron config, production build; no identity/backend is required | No live renderer surface yet | Probe-owned Nuxt development path |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Unit scenarios cover stale render, error/loading, body restore, focus trap, clamp, anchors, and edge math | Source replacement, background coverage, and malformed bounds are not live | Chrome lifecycle/fallback fixtures |
| User-surface, browser, and desktop-shell confidence | 82% | Source review and repository behavior are coherent; Electron bridge contract is direct | User-visible layout, gestures, narrow/text scale, and real SVG link representation remain unproven independently | Chrome plus renderer bridge emulation |
| Durable regression coverage quality and relevance | 95% | Existing tests are narrow, requirement-linked, and valid; preload gap was corrected | Durable browser probe had not yet executed at this checkpoint | Execute named probe and assess determinism/cleanup |

- Overall post-repository confidence: `89.3%`
- Calculation method: Simple average of seven applicable categories: `(90 + 90 + 88 + 90 + 90 + 82 + 95) / 7`.
- Every critical acceptance criterion directly proven: `No` — browser-specific critical behavior remained outstanding at this checkpoint.
- Any applicable category below `90%`: `Yes` — cross-boundary integration realism (88%) and user-surface/browser/desktop-shell confidence (82%).
- Default clean-confidence target of `95%` met: `No`.
- Material residual risks: Real CSS sizing, one-copy transfer with Mermaid IDs, wheel focal behavior, real pointer/touch/native scroll, focus/body/background isolation, source replacement, actual Mermaid xlink runtime values, 360 px/200% text scale, and invalid-viewBox rendered fallback.

## Round 2 Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser`
- Specific confidence gap or residual risk addressed: AC-001–AC-018 include material adaptive chrome, light/dark rendering, media-capability cascade, layout, actual SVG, pointer/wheel/native scroll, focus, responsive, text-scale, icon-only toolbar, and dispatch behavior not directly exercised by happy-dom.
- Why the selected mode can materially improve confidence: Chrome executes actual Mermaid 11.12.x output, emitted CSSOM, SVGAnimatedString/xlink runtime values, CSS layout/transitions, scroll geometry, Pointer Events, focus, localization, light/dark preferences, real fine and pure-coarse contexts, and the browser/Electron renderer branch while leaving unchanged shell code isolated.
- Expected confidence after selected validation: At least 95% overall with no category below 90%, provided all critical scenarios pass.
- Browser-specific decision and rationale: Required and preferred for the web-equivalent renderer behavior. Actual desktop launch is not justified because no Electron shell file changed, the bridge can be repository-tested, and invoking real `shell.openExternal` would create an uncontrolled external side effect without improving viewer-boundary proof. A real hybrid-input device is unavailable: installed Chrome/CDP can expose real fine-primary or real coarse-primary but not simultaneous coarse secondary input, so combined-cascade evidence must be explicitly labeled as a deterministic emitted-CSSOM proxy.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron 42.4.1.
- Relevant README or development instructions: `autobyteus-web/README.md` development and desktop sections; `electron/preload.ts`; `electron/main.ts`.
- Web-equivalent behavior: All inline/render/modal/geometry/focus/locale/link classification in changed files.
- Shell-specific or lifecycle behavior: Existing preload `openExternalLink` -> `ipcRenderer.invoke('open-external-link')` -> main `shell.openExternal` boundary; unchanged.
- Chosen validation approach and why it fits the project: Real Chrome for changed web-equivalent behavior, focused Electron preload repository test, and injected renderer bridge capture for live dispatch. No desktop launch.
- Server/frontend setup when browser validation is used: Probe-owned isolated Nuxt dev server and static fixtures; no backend.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: OS opening of an external browser is not invoked; bounded residual uncertainty is negligible because the shell boundary is unchanged and outside the feature delta. A physical hybrid-input device is unavailable; exact emitted-CSSOM combined-cascade evidence is selected and explicitly qualified instead.

## Live Environment And Fixture Plan

- Startup order and commands: Probe verifies/copies its owned temporary page, chooses caller port, starts `pnpm dev --port`, waits for HTTP and fixture marker, launches installed Chrome, runs isolated contexts, then stops/removes owned resources.
- Environment choices: localhost/127.0.0.1; backend absent; Chrome 150 headless; Europe/Berlin; isolated browser contexts; explicit locale preferences.
- Health / readiness checks: HTTP response and `[data-test="diagram-zoom-probe"]`; rendered expand controls.
- Seed data / fixtures: Static Mermaid fences plus direct raw-SVG fallback fixtures.
- Test identities/authentication/permissions: N/A.
- Requirement-linked journeys: DZV-BR-001–008.
- Evidence: structured JSON, eighteen current-run screenshots for fine states, light/dark wide, narrow/localized coarse, wide coarse/hybrid, zoom/Fit, and fallback; dev-server and command logs.
- Owned processes and temporary state: Probe-owned Nuxt child, Chrome process/contexts, temporary page path; all cleaned.

## Temporary Executable Validation Plan

None beyond the probe-generated page copy. The probe and source fixture remain durable; only the Nuxt page installation and live processes are temporary and self-cleaning.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Actual macOS `shell.openExternal` side effect | Unchanged shell code; running it would open an uncontrolled OS browser/application and does not test changed viewer logic | Low | Focused preload test + live renderer bridge capture; launch desktop only if these expose a shell-specific defect. |
| Physical simultaneous fine-primary/coarse-secondary hardware | Installed Chrome/CDP exposes fine-primary or coarse-primary rather than a coarse secondary pointer alongside fine-primary | Low after exact emitted-rule combined-cascade proof | Retain explicit proxy classification; use physical hybrid hardware only if later compatibility evidence contradicts the emitted-cascade result. |
| Pinch zoom | Explicitly desirable but not required | None for acceptance | No follow-up. |

## Ambiguities Or Reroute Triggers

None at the initial investigation stage. A failing browser criterion will be recorded with the same DZV scenario ID and routed by failure origin.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — update the existing durable probe and fixture for refined presentation; prior package/preload changes remain relevant; remove none.
- Post-repository confidence: `90.1%` before required browser execution; final confidence is `97.0%` in the execution coverage report.
- Broader validation decision: Required — Browser.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Round 3 retains the round-2 scope and evidence basis, resolves E2E-TR-003 by enforcing and asserting exact normalized media-branch semantics before hybrid rule cloning, and records a fresh 8/8 affected browser rerun. Final confidence and per-scenario details are recorded in the execution coverage report.
