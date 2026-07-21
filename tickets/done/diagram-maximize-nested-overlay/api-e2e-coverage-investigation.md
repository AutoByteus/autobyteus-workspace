# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/done/diagram-maximize-nested-overlay/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/done/diagram-maximize-nested-overlay/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/done/diagram-maximize-nested-overlay/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/done/diagram-maximize-nested-overlay/ui-ux-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/done/diagram-maximize-nested-overlay/reproduction-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/done/diagram-maximize-nested-overlay/probe-evidence/nested-overlay-reproduction.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/done/diagram-maximize-nested-overlay/probe-evidence/01-artifact-maximized-before-diagram.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/done/diagram-maximize-nested-overlay/probe-evidence/02-diagram-viewer-obscured.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/done/diagram-maximize-nested-overlay/probe-evidence/03-escape-closes-both-layers.png`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/done/diagram-maximize-nested-overlay/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/done/diagram-maximize-nested-overlay/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/tickets/done/diagram-maximize-nested-overlay/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Implementation-source review passed commit `425ca42974b7e213c08033480b3301446aae1366` and requested formal production-shaped nested-host browser coverage.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1, updated after repository execution; the completed broader-validation result is recorded in `api-e2e-execution-coverage-report.md`.

## Current Requirement And Design Basis

The reviewed change corrects two shared-dialog invariants without changing host ownership or Mermaid rendering. A body-teleported `MermaidDiagramViewer` must use tier `130`, above supported maximized Markdown hosts at tier `120`, and its handled `Escape` must stop propagation before requesting diagram close. Validation must directly exercise the real `ArtifactContentViewer -> FileViewer -> MarkdownPreviewer -> MarkdownRenderer -> MermaidDiagram -> MermaidDiagramViewer` path. It must prove visible and physically topmost viewer ownership, one current SVG, retained artifact path/content/Preview/maximize state, independent close/backdrop/first-Escape behavior, focus return after the existing `nextTick` plus `requestAnimationFrame` lifecycle, a later distinct host dismissal, repeated-cycle cleanup, fitted usability, and preserved non-nested scenarios (`REQ-001`–`REQ-009`, `AC-001`–`AC-011`, `SP-001`–`SP-006`).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / real artifact host state | Preserved | Requirements `BEH-001`, `REQ-003`; design `SP-001` | Add a real host journey that asserts path, content, Preview selection, and tier-`120` maximize state before and after diagram dismissal. |
| `BEH-002` / body-teleported viewer stacking | Changed | Requirements `BEH-002`, `REQ-001`/`REQ-002`/`REQ-008`; implementation tier `100 -> 130` | Assert computed tiers, center `elementFromPoint`, fitted bounds, and the one-SVG transfer in Chrome. |
| `BEH-003` / top-layer dismissal and return | Changed | Requirements `BEH-003`, `REQ-004`/`REQ-005`/`REQ-009`; implementation adds Escape propagation containment | Exercise close, backdrop, and first Escape separately; assert host retention, SVG restoration, cleanup, and delayed focus return; then dismiss the host with a separate Escape. |
| `BEH-004` / shared and non-nested consumers | Preserved plus coverage addition | Requirements `BEH-004`, `REQ-006`/`REQ-007`; design `SP-004` | Keep all existing `DZV-BR-001`–`DZV-BR-008` scenarios and add one artifact-nested scenario to the existing probe rather than a competing harness. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None | N/A | None | None |
| API / transport / contract | No | None | N/A | None | None |
| Frontend component / state | Yes | Shared viewer presentation tier and handled-Escape propagation | Focused Vue component specs | Component mounting does not prove composed CSS stacking, physical hit-testing, or real host state. | Browser |
| Browser integration / user journey | Yes | Nested artifact maximize -> diagram maximize -> sequential dismissal | Existing custom Playwright-Core probe covers only non-maximized consumers | Real production composition, Teleport stacking, delayed focus return, and sequential overlay ownership remain missing. | Browser |
| Authentication / session / permissions | No | None | N/A | None; buffered deterministic artifact needs no identity. | None |
| Desktop renderer / web-equivalent UI | Yes | Vue/CSS/DOM renderer shared by browser and Electron | Browser-equivalent fixture and existing bridge-emulation scenario | No material renderer uncertainty after a real Chrome run if it agrees with component evidence. | Browser |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, packaging, or native integration changed | Existing `DZV-BR-004` exercises the renderer's optional link bridge branch | Nested overlay behavior is ordinary DOM/CSS/event propagation; actual Electron would add no material evidence unless divergence appears. | Conditional project desktop validation only on divergence |
| Process / lifecycle | Yes | Owned Nuxt server/browser/Teleport mount-unmount/focus/body cleanup | Self-starting probe has verified cleanup mechanics | Repeated nested lifecycle must be added. | Browser plus owned-process cleanup |
| Persisted-data transition | No | All affected state is transient | Requirements/design/handoff all say Not Affected | None | None |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | No | None for changed behavior | Existing probe contains link-dispatch regression coverage | No changed external boundary. | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay`
- Project type and runtime stack: pnpm workspace; Nuxt 3/Vue frontend; Pinia; Vitest/Nuxt Test Utils; a repository-owned self-starting Playwright-Core/Chrome browser probe; optional Electron shell.
- Conflicting, missing, or unclear project instructions: None. The durable probe is documented and is the reviewed owner for this journey. `AGENTS.md` requires `--run` for Nuxt tests.
- Required environment variables or secrets available: N/A. The probe deliberately binds the unused backend proxy to `127.0.0.1:9` and uses buffered artifact content.
- Discovered runtime versions before execution: Node `v22.23.1`; pnpm `10.28.2`; Google Chrome `150.0.7871.129`; macOS/Darwin arm64 host.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/autobyteus-web/AGENTS.md` | Closest repository instruction | Use colocated tests; prefer `pnpm test:nuxt`; always include `--run`; do not use broad git staging. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/autobyteus-web/README.md` | Development/test/browser-probe guide | `pnpm dev`; specific Vitest commands; self-starting `pnpm test:e2e:diagram-zoom-viewer -- --output-dir ...`; the probe selects a free port, discovers Chrome, installs/removes its temporary route, and owns its server. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/autobyteus-web/ARCHITECTURE.md` | Testing strategy | Colocate component/unit tests; use Vitest/Nuxt utilities for frontend and Electron integration. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/autobyteus-web/package.json` | Executable script authority | Defines `test:nuxt`, `test:electron`, `build`, and `test:e2e:diagram-zoom-viewer`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/autobyteus-web/vitest.config.mts` | Nuxt test configuration | Nuxt environment with happy-dom and localization/WebSocket setup; excludes generated/output/Electron resources. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/diagram-maximize-nested-overlay/autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs` | Durable executable browser owner | Uses Playwright Core, installs a temporary page, launches an owned Nuxt process group and Chrome contexts, records JSON/screenshots/logs, and performs verified cleanup. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Nuxt fixture server | `.../autobyteus-web` | Owned internally by `pnpm test:e2e:diagram-zoom-viewer -- --output-dir <dir>` | Free loopback port; backend points at unused port `9`; no shared server reused. | Probe fetches the temporary route until HTTP OK and waits for fixture/Mermaid readiness. | Probe sends TERM/KILL to its owned process group and verifies exit. |
| Chrome browser | Probe-owned Playwright context | Launched internally, discovered at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` | Headless Chrome 150; deterministic viewport/locale/timezone per scenario. | Fixture selectors, SVG render completion, and toolbar icon checks. | Close every owned context, then browser; record cleanup in evidence JSON. |
| Vitest | `.../autobyteus-web` | `pnpm test:nuxt <paths> --run` | Existing dependencies are installed; no secrets/services. | Command exit and per-test counts. | Process exits normally. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Deterministic Markdown artifact with Mermaid | Extend `tests/e2e/fixtures/diagram-zoom-viewer.page.vue` with real `ArtifactContentViewer` and buffered `write_file` artifact | No backend, account, permission, or shared data; production component chain remains real. | Fixture remains durable; temporary installed route is removed by probe. |
| Browser evidence | Existing output-dir JSON, PNG, and Nuxt log mechanism | Ticket-local evidence directory only. | Retain evidence; remove only probe-owned transient page/processes/contexts. |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: `design-spec.md` -> `Persisted Data / State Transition Decision`; `implementation-handoff.md` -> `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: N/A; the fixture uses transient in-memory buffered Markdown.
- Evidence planned for the approved direct-use, discard/rebuild, or migration outcome: N/A.
- Migration-specific completion/recovery scenarios, only when `Migration Required`: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `components/conversation/segments/renderer/__tests__/MermaidDiagramViewer.spec.ts` | Dialog semantics, actions, geometry, focus trap, body lock, dismissal, links; now literal tier `130` and real Escape containment | `REQ-002`, `REQ-004`, `AC-002`, `AC-005`, `SP-005` | Still Valid | Source review and 5 focused scenario definitions | Retain and rerun. |
| `components/conversation/segments/renderer/__tests__/MermaidDiagram.spec.ts` | Loading/error, one-SVG transfer, intrinsic layout, interactive descendants, link forwarding, source invalidation | `REQ-008`–`REQ-009`, `AC-004`, `AC-008`, `AC-010`, `SP-006` | Still Valid | Seven focused scenario definitions | Retain and rerun. |
| `components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | Artifact fetching/buffered content, maximize/restore, Preview/Edit availability and host-state isolation | `REQ-003`, `REQ-005`, `AC-003`, `AC-006` | Still Valid | Seventeen host scenarios; FileViewer is stubbed, so this is host-local evidence only. | Retain and rerun relevant host spec. |
| `tests/e2e/fixtures/diagram-zoom-viewer.page.vue` | Real conversation and file-preview Mermaid consumers plus controlled SVG fallbacks | `REQ-006`–`REQ-009`, `AC-008`–`AC-010` | Needs Update | It intentionally lacks a maximized production host, the admitted coverage gap. | Add deterministic real `ArtifactContentViewer` surface without weakening existing surfaces. |
| `tests/e2e/diagram-zoom-viewer-probe.mjs` / `DZV-BR-001`–`DZV-BR-008` | Real Chrome coverage for shared consumers, SVG ownership, geometry, interaction, focus/body isolation, links, localization, responsive/coarse/hybrid/dark/fallback states | `REQ-006`–`REQ-009`, `AC-008`–`AC-010`, `SP-004`–`SP-006` | Still Valid | Existing durable scenario descriptions and retained repository history | Preserve and execute all scenarios. |
| `tests/e2e/diagram-zoom-viewer-probe.mjs` nested-host coverage | None today | `REQ-001`–`REQ-005`, `AC-001`–`AC-009`, `AC-011`, `SP-001`–`SP-003` | Needs Update | Approved requirements and code-review residual-risk statement explicitly identify this gap. | Add `DZV-BR-009`. |

## Stale Or Obsolete Coverage Decisions

None. Existing non-nested, geometry, link, input-mode, lifecycle, localization, and responsive scenarios describe approved preserved behavior. No test asserts the obsolete viewer tier or the obsolete same-event double dismissal.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `DZV-BR-009` | Real artifact Preview -> host tier-`120` maximize -> diagram tier-`130` open; computed stacking/hit-testing; fitted one-SVG ownership; close/backdrop/first-Escape one-layer results; delayed focus return; later host dismissal; repeated-cycle cleanup | `REQ-001`–`REQ-009`; `AC-001`–`AC-009`, `AC-011`; `SP-001`–`SP-003`, `SP-005`–`SP-006`; `ui-ux-spec.md` `UJ-001`/`UJ-003` | `autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs` | This is the only direct executable proof of the reported production composition and regression. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `DZV-BR-009-FIXTURE` | `autobyteus-web/tests/e2e/fixtures/diagram-zoom-viewer.page.vue` | Add a real `ArtifactContentViewer` backed by deterministic buffered Markdown and an observable underlying fixture surface. | `AC-001`, `AC-003`, `AC-006`, `AC-011`; reviewed design says to extend this existing fixture. | No test-only production branch or duplicated viewer. |
| `DZV-BR-009` | `autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs` | Add requirement-linked assertions and retained JSON/PNG evidence while preserving all existing scenarios. | `AC-001`–`AC-011` | One new scenario in the existing owner is proportionate. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt components/conversation/segments/renderer/__tests__/MermaidDiagramViewer.spec.ts components/conversation/segments/renderer/__tests__/MermaidDiagram.spec.ts --run` | `autobyteus-web`; Nuxt/happy-dom | Changed viewer tier/Escape plus preserved one-SVG/focus lifecycle | Pass — 2 files, 12/12 tests | `probe-evidence/api-e2e/repository/focused-mermaid-tests.log` |
| 2 | `pnpm test:nuxt components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts --run` | `autobyteus-web`; Nuxt/happy-dom | Preserved real host maximize/Preview ownership locally | Pass — 1 file, 17/17 tests | `probe-evidence/api-e2e/repository/artifact-host-tests.log` |
| 3 | `pnpm test:nuxt components/conversation/segments/renderer --run` | `autobyteus-web`; Nuxt/happy-dom | Broader affected renderer regression suite | Pass — 4 files, 34/34 tests | `probe-evidence/api-e2e/repository/renderer-suite.log` |
| 4 | `git diff --check` | Task worktree | Durable coverage/source/report patch hygiene | Pass | `probe-evidence/api-e2e/repository/git-diff-check.log` |

An initial attempt to tee command 1 used a nonexistent relative output directory; the tests themselves reported 12/12 passing, but the shell pipeline exited `1` because `tee` could not open the log. The mistakenly created empty directory was removed, the correct ticket-local directory was created, and the exact test command was rerun successfully with exit `0` and retained output above.

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | Focused viewer/diagram/host suites all pass and map to the approved invariants. | Critical nested-host acceptance criteria remain unexecuted in a browser. | Execute `DZV-BR-009`. |
| Changed-boundary execution directness | 85% | A real bubbling/cancelable Escape and literal tier assertion directly cover the two changed lines. | happy-dom cannot prove computed CSS stacking or physical hit-testing in the real composition. | Execute `DZV-BR-009` in Chrome. |
| Cross-boundary integration realism and mock gap | 78% | The renderer suite covers shared component handoffs and the host suite covers host state. | `ArtifactContentViewer.spec.ts` stubs `FileViewer`; no repository test composes the full host-to-viewer path. | Use the real `ArtifactContentViewer` fixture composition. |
| Environment, configuration, identity, and fixture fidelity | 90% | The durable deterministic fixture is implemented, uses the production component chain, requires no identity/backend, and the harness syntax/diff checks pass. | The updated fixture has not yet been served/executed. | Run the self-starting project probe. |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | Unit coverage proves focus/body/SVG lifecycles and host Escape locally. | Repeated nested close/backdrop/Escape cleanup and later host dismissal remain unexecuted. | Execute the three-cycle `DZV-BR-009` path. |
| User-surface, browser, and desktop-shell confidence | 75% | Prior reproduction and an implementation preview demonstrate browser feasibility. | No formal post-change real-host Chrome evidence exists yet. | Execute Chrome; use Electron only on divergence. |
| Durable regression coverage quality and relevance | 92% | `DZV-BR-009` was added to the established probe with real production components, stable scenario identity, semantic state assertions, retained evidence, and no test-only source branch. | Passing execution is still needed to establish determinism. | Run all `DZV-BR-001`–`DZV-BR-009` scenarios. |

- Overall post-repository confidence: `84.7%`.
- Calculation method: Simple average of the seven applicable categories after repository execution.
- Every critical acceptance criterion directly proven: No; `AC-001`–`AC-009` require the real nested browser scenario.
- Any applicable category below `90%`: Yes — requirement proof, changed-boundary directness, integration realism, lifecycle/recovery, and browser/user-surface confidence.
- Default clean-confidence target of `95%` met: No, not before browser validation.
- Material residual risks: composed Teleport stacking/hit-testing, real artifact host retention, delayed focus return, sequential dismissal, and repeated cleanup.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser`
- Specific confidence gap or residual risk addressed: The defect exists only in the composed real DOM/CSS/event path, and existing durable browser coverage omits maximized hosts.
- Why the selected mode can materially improve confidence: Headless Chrome directly computes the host/viewer tiers, performs physical hit-testing and real key/pointer input, observes Teleport/SVG/focus/body lifecycle, and retains screenshots/JSON/logs.
- Expected confidence after the selected validation: At least 95% overall with every applicable category at or above 90%, assuming all critical scenarios pass.
- Browser-specific decision and rationale: Required; the affected Vue/CSS behavior and accepted Electron-equivalent renderer boundary are directly available through the project-owned browser probe.
- If `Not Required`, evidence proving the real changed boundary without broader execution: N/A.
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: N/A.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron 42.4.1 wraps the same Nuxt/Vue renderer.
- Relevant README or development instructions: `autobyteus-web/README.md`, browser development and Electron build/server sections.
- Web-equivalent behavior: Teleport, CSS z-index, DOM hit-testing, SVG ownership, focus, body overflow, and KeyboardEvent propagation.
- Shell-specific or lifecycle behavior: None changed; no preload/IPC/window/native/packaging code participates.
- Chosen validation approach and why it fits the project: Execute real Chrome through the documented durable probe; reserve actual Electron for observed browser/desktop divergence.
- Server/frontend setup when browser validation is used: Probe-owned Nuxt dev server on a free loopback port with deterministic local fixture and no backend dependency.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: Electron window execution itself will not be run unless divergence appears; this is negligible because the changed boundary is fully web-equivalent.

## Live Environment And Fixture Plan

- Startup order and commands: From `autobyteus-web`, invoke `pnpm test:e2e:diagram-zoom-viewer -- --output-dir ../tickets/in-progress/diagram-maximize-nested-overlay/probe-evidence/api-e2e/browser`; the probe installs its page, chooses a port, starts Nuxt, waits for readiness, then launches Chrome.
- Environment choices that materially affect the run: Headless Chrome 150; primary viewport 1280x900; `en-US`; `Europe/Berlin`; `BACKEND_NODE_BASE_URL=http://127.0.0.1:9`; no shared processes.
- Health / readiness checks: HTTP OK for temporary route; fixture control present; Mermaid expand controls and SVG paths rendered; no `.loading-state`.
- Seed data / fixtures: In-memory buffered Markdown `write_file` artifact with a unique path/title and one Mermaid SVG.
- Test identities, authentication, permissions, or session state: N/A.
- Requirement-linked journeys or scenarios: `DZV-BR-009`, while retaining `DZV-BR-001`–`DZV-BR-008`.
- DOM, screenshot, log, API, process, or other evidence to capture: `evidence.json`, scenario screenshot(s), `nuxt-dev.log`, computed z-index/hit target/SVG/focus/body/host-state snapshots, process cleanup results.
- Owned processes and temporary state to clean up: Chrome contexts/browser, Nuxt process group, installed temporary page, dev log stream; no external data.

## Temporary Executable Validation Plan

None. The required journey is a durable regression and belongs in the existing repository probe.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Actual Electron window | No shell-specific boundary changed; project guidance and reviewed design make it conditional on browser/desktop divergence. | Negligible if real Chrome and existing renderer bridge regression scenario pass. | Run project desktop validation only if browser evidence diverges or exposes shell-specific behavior. |
| Every supported tier-`120` host consumer | Shared viewer is the changed authoritative owner; artifact is the approved representative real composition. | Low manual-tier future risk remains. | Computed tier assertion protects the shared viewer; add another host only if artifact evidence reveals consumer-specific behavior. |

## Ambiguities Or Reroute Triggers

None at investigation time. A browser failure will be recorded against its stable scenario ID and sent to `code_reviewer` for focused failure-origin review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — update two existing durable coverage files; remove none.
- Post-repository confidence: `84.7%`; critical browser composition remains the deliberate gap.
- Broader validation decision: `Required — Browser`.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: This investigation was written before durable coverage edits or final execution, as required. The implementation handoff's compatibility and persisted-data checks agree with the reviewed implementation: no legacy/compatibility path and no persisted-data transition.
