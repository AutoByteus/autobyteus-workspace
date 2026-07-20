# Design Spec

> Requirements and intended behavior were approved by the user on 2026-07-20. Architecture review is still required before implementation.

## Current-State Read

Markdown Mermaid segments are composed by MarkdownRenderer and owned at runtime by MermaidDiagram. The component delegates configuration and SVG production to mermaidService, catches rejected renders, and owns the local loading/error/viewer state. The service initializes Mermaid with startOnLoad: false, theme, and securityLevel: loose, but leaves Mermaid's default suppressErrorRendering: false.

Mermaid 11.12.3's render implementation uses document.body when the caller supplies no container. On a parse failure it constructs Mermaid's fallback error diagram, leaves the temporary wrapper in the body, and rejects. The component catch therefore runs after an out-of-boundary DOM mutation. The workspace shell itself is already deliberately bounded, so the defect is at the vendor configuration boundary rather than in the Event Monitor or layout owner.

## Intended Change

Keep the existing Mermaid service/component ownership. Configure Mermaid to suppress its own fallback error rendering so failures are rethrown and handled by the existing MermaidDiagram local error state. Add a narrow width/overflow boundary to the component and its error text so the app-owned message cannot widen the Markdown or workspace parent. Add focused coverage that observes the real DOM boundary and preserves the existing valid rendering/viewer suite.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-MER-001 | User/System | REQ-MER-001/002; AC-MER-001/002 | Invalid Mermaid segment reaches renderer | MarkdownRenderer -> MermaidDiagram -> service -> Mermaid; vendor body leak verified by probe | Suppress vendor fallback; rethrow; component renders only its local error state | DS-001, DS-002 |
| BEH-MER-002 | User/System | REQ-MER-003; AC-MER-003 | Workspace shell owns viewport and feed owns vertical scroll | Shell already uses containment; body leak bypasses it | Remove source of outer document height; do not change shell scroll ownership | DS-001 |
| BEH-MER-003 | User | REQ-MER-004; AC-MER-004 | Valid Mermaid content | Existing successful render/viewer flow | Preserve inline SVG, expand/viewer, focus, and link behavior | DS-001 |
| BEH-MER-004 | System | REQ-MER-001/003; AC-MER-001/003/007 | Multiple component renders/re-renders | One vendor wrapper per failure observed | Every failure cleans up through Mermaid suppression; no accumulation | DS-001, DS-003 |
| BEH-MER-005 | Contract | REQ-MER-005; AC-MER-005 | Renderer failure | No router/backend/persistence edge in current path | Preserve no-navigation/no-data boundary | DS-002 |
| BEH-MER-006 | User | REQ-MER-002/006; AC-MER-002/006 | Long parser error | Local error span lacks explicit width guard | Add width/min-width/overflow-wrap constraints to local component only | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow/tickets/in-progress/event-monitor-mermaid-error-layout-overflow/mermaid-body-leak-probe.md | Mermaid failure-path and DOM-leak evidence | REQ-MER-001–005; AC-MER-001–005 | Justifies the service configuration change and browser-boundary regression | Evidence; approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: Bug Fix
- Current design issue found: Yes
- Root cause classification: Local Implementation Defect / Missing Invariant
- Refactor needed now: No
- Evidence: The correct service and component owners already exist; the missing vendor safety option is the only path that leaks into the host document. The shell's containment is already coherent.
- Design response: Add the invariant at the existing Mermaid service initialization boundary and retain local error presentation at the component boundary. Add defensive component sizing and tests at both boundaries.
- Refactor rationale: Moving Mermaid configuration into layout code or introducing a separate global error manager would widen ownership and make the failure harder to contain.
- Intentional deferrals and residual risk: Exact production Mermaid source is unavailable; browser/Electron-equivalent coverage must confirm all installed render failure paths after implementation. No shell-level overflow masking is introduced, so any unrelated body overflow remains diagnosable.

## Terminology

- Fallback error SVG: Mermaid-generated body-level error diagram containing the bomb icon and “Syntax error in text / mermaid version …”.
- Local error state: The existing MermaidDiagram error card rendered inside the Markdown segment.
- Renderer failure boundary: The service/component boundary between Mermaid's promise rejection and the app-owned local error state.

## Design Reading Order

This design is intentionally compact: the primary spine and failure return spine are both within the existing frontend renderer, and there is no persistence or transport transition.

## Legacy Removal Policy (Mandatory)

- Policy: No backward compatibility; remove legacy code paths.
- No obsolete product path is retained. The Mermaid fallback-error behavior is disabled through the supported configuration option rather than wrapped with a compatibility branch.
- No compatibility wrapper or dual-render path is permitted.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: None; only transient DOM nodes are affected.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal reader/writer behavior and representative evidence: N/A.
- Required semantics and invariants under direct use: No stored semantics are involved.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: None.
- Decision: Not Affected.
- Decision rationale: The fix changes Mermaid initialization and CSS only; conversations and source text remain unchanged.
- Acceptance criteria or design constraints supported by this decision: REQ-MER-005; AC-MER-005.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-MER-001–004 | Markdown Mermaid segment | Local inline SVG or local error card | MermaidDiagram lifecycle with mermaidService configuration | Carries both valid rendering and the failure that currently leaks to body |
| DS-002 | Return-Event | BEH-MER-001, BEH-MER-005, BEH-MER-006 | Mermaid promise rejection | Component error state | MermaidDiagram | Ensures failure returns to the owner without navigation or host mutation |
| DS-003 | Bounded Local | BEH-MER-004 | Component render generation | Cleanup / commit of newest render | MermaidDiagram | Preserves existing stale-generation invalidation while preventing repeated leakage |

## Primary Execution Spine(s)

Markdown segment -> MarkdownRenderer -> MermaidDiagram -> mermaidService.initialize/render -> Mermaid -> inline SVG or rejected promise -> MermaidDiagram local state

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A parsed Mermaid segment mounts. The component asks the service to initialize Mermaid and render. Valid SVG returns to the component; invalid content rejects without a vendor fallback subtree, then the component displays its local error card. | MarkdownRenderer, MermaidDiagram, mermaidService, Mermaid | MermaidDiagram for lifecycle; mermaidService for vendor configuration | Layout containment and test observation |
| DS-002 | The render rejection returns through the component's existing catch path. No router, external-link, backend, or persistence path is called. | Mermaid rejection, MermaidDiagram error ref | MermaidDiagram | Localized copy and accessibility |
| DS-003 | Each component render generation invalidates stale state; the newest outcome alone commits. Vendor suppression guarantees the failed attempt has no leftover body node before the next generation. | renderGeneration, render promise, local state | MermaidDiagram | Multiple segments and unmount cleanup |

## Spine Actors / Main-Line Nodes

- MarkdownRenderer
- MermaidDiagram
- mermaidService
- Mermaid library
- Workspace/feed layout

## Ownership Map

- MarkdownRenderer owns Markdown segment composition and link delegation; it must not own Mermaid vendor configuration.
- MermaidDiagram owns component lifecycle, render-generation ordering, local loading/error state, inline SVG, and viewer state.
- mermaidService owns Mermaid initialization options and the narrow SVG-render facade.
- Mermaid owns parsing/drawing internals; its fallback error rendering must be disabled at the service boundary.
- Workspace layout owns viewport and scroll surfaces; it must not compensate for leaked renderer nodes by globally hiding body overflow.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| mermaidService.render | Mermaid library plus MermaidDiagram lifecycle | Keeps vendor API/configuration out of Vue components | Layout, router, persistence, or user-facing error state |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Mermaid fallback body insertion for app renders | It violates the renderer failure boundary and causes outer layout overflow | mermaidService.initialize({ suppressErrorRendering: true }) plus existing local error card | In This Change | This is a vendor mode change, not a custom legacy branch |
| None | No app-owned legacy wrapper exists | N/A | N/A | Do not add a compatibility cleanup layer |

## Return Or Event Spine(s) (If Applicable)

Mermaid.render rejection -> MermaidDiagram catch -> localized error ref/template -> bounded local error card

The rejection must not emit an external-link event or invoke router/backend/persistence code.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: MermaidDiagram
- Arrow chain: props.content/watch -> increment renderGeneration -> initialize -> render -> commit newest SVG or local error -> invalidate on unmount
- Why it matters: The existing generation guard handles asynchronous rerenders; the fix must not create a second render lifecycle or bypass the newest-generation check.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Mermaid vendor fallback setting | DS-001, DS-002 | mermaidService | Prevent host-document mutation on failure | Vendor default is unsafe for embedded rendering | Layout code would hide rather than fix the owner defect |
| Error-state responsive CSS | DS-002 | MermaidDiagram | Keep long errors inside the component width | Parser messages can be long | Markdown/layout owner would acquire renderer-specific styling |
| Regression coverage | DS-001–003 | Test owners | Observe body, local state, and viewport outcomes | Mock-only tests cannot see vendor DOM behavior | Tests could falsely pass while the leak remains |

## Ownership Boundaries

The authoritative configuration boundary is mermaidService.initialize; every Mermaid component uses it before render. The authoritative user-visible failure boundary is MermaidDiagram; all service rejections are caught there. The workspace shell remains a consumer of rendered content and must not reach into Mermaid internals or compensate with global overflow changes.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| mermaidService.initialize/render | Mermaid config and SVG promise | MermaidDiagram | Components importing Mermaid directly or setting divergent suppression options | Extend the service option only if a future product need is proven |
| MermaidDiagram template/state | Local loading/error/viewer lifecycle | MarkdownRenderer | MarkdownRenderer interpreting Mermaid errors or app shell rendering global error nodes | Keep the existing component state owner |

## Dependency Rules

- MarkdownRenderer may mount MermaidDiagram and receive its existing external-link events.
- MermaidDiagram may call mermaidService; it must not call router/backend/file services for Mermaid failures.
- mermaidService may import Mermaid; it must not import Vue layout or workspace stores.
- Layout components may contain the renderer but must not hide body overflow as a Mermaid workaround.
- Tests may use real Mermaid in an isolated DOM/browser to verify the vendor boundary; component unit tests may mock the service for local lifecycle behavior.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| mermaidService.initialize(isDarkTheme?) | Mermaid runtime config | Apply embedded-renderer-safe options | Theme boolean | Add suppression as an invariant, not a per-call toggle |
| mermaidService.render(content, id?) | Mermaid SVG result | Return SVG or rejection | Mermaid source string + unique diagram ID | No caller-provided global-body cleanup contract |
| MermaidDiagram.renderDiagram | Local component render lifecycle | Commit newest success/error | Component props + generation | Existing owner remains authoritative |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| mermaidService.initialize | Yes | Yes | Low | Add one global safety invariant |
| mermaidService.render | Yes | Yes | Low | Preserve |
| MermaidDiagram.renderDiagram | Yes | Yes | Low | Preserve generation guard |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Mermaid renderer service | mermaidService | Yes | Low | Preserve |
| Diagram UI owner | MermaidDiagram | Yes | Low | Preserve |
| Fallback error output | Mermaid fallback error SVG | Yes | Low | Disable for embedded app rendering |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Mermaid vendor configuration | Existing Mermaid service | Extend | It already owns initialization and render delegation | N/A |
| Local error state and sizing | Existing Mermaid component | Extend | It already owns failure presentation | N/A |
| Workspace containment | Existing workspace layout | Reuse unchanged | It already provides the intended scroll boundaries | N/A |
| Real DOM regression observation | Existing E2E/browser test area | Extend | Existing probes already run browser-equivalent checks | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Conversation rendering | Mermaid segment lifecycle and local UI | DS-001–003 | MermaidDiagram | Extend | Keep Mermaid failure presentation local |
| Mermaid service integration | Vendor initialization/render facade | DS-001–002 | mermaidService | Extend | Set suppression invariant |
| Workspace layout | Viewport and internal scroll containment | DS-001 | Workspace shell/feed | Reuse | No structural change |
| Browser/E2E coverage | Real DOM and viewport assertions | DS-001–003 | Test owners | Extend | API/E2E owns final durable-test decision |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| autobyteus-web/services/mermaidService.ts | Mermaid service integration | Service boundary | Suppression config | Existing config owner | N/A |
| autobyteus-web/components/conversation/segments/renderer/MermaidDiagram.vue | Conversation rendering | Component boundary | Width/wrapping guard | Existing UI owner | Existing lifecycle |
| autobyteus-web/components/conversation/segments/renderer/__tests__/MermaidDiagram.spec.ts | Conversation rendering tests | Component test | Local error containment | Existing unit suite | Existing mocks |
| autobyteus-web/tests/e2e/mermaid-error-layout-overflow-probe.mjs (candidate) | Browser/E2E coverage | Browser test boundary | Real body/viewport regression | Keeps vendor DOM observation out of unit mocks | Existing probe conventions |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| None | N/A | N/A | No new shared data shape is needed | Yes | Yes | N/A |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| None | Yes | Yes | Low | No model change |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| autobyteus-web/services/mermaidService.ts | Mermaid service integration | mermaidService | Set suppressErrorRendering: true while preserving current API | One vendor config owner | N/A |
| autobyteus-web/components/conversation/segments/renderer/MermaidDiagram.vue | Conversation rendering | MermaidDiagram | Add local root/error width containment | One UI owner | Existing render state |
| autobyteus-web/components/conversation/segments/renderer/__tests__/MermaidDiagram.spec.ts | Unit coverage | Component test | Verify bounded local error state and no viewer action | Existing test owner | Existing mocks |
| autobyteus-web/tests/e2e/mermaid-error-layout-overflow-probe.mjs | Browser/E2E coverage | Browser test boundary | Verify real body cleanup and outer viewport behavior | Real DOM only | Existing probe conventions |

## Applied Patterns (If Any)

- Existing service facade pattern: vendor configuration stays in mermaidService.
- Existing component lifecycle pattern: renderGeneration rejects stale async results and MermaidDiagram owns loading/error/viewer state.
- Existing bounded-layout pattern: min-h-0 plus overflow-hidden at shell boundaries and overflow-y-auto at the conversation feed.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| autobyteus-web/services/mermaidService.ts | File | Mermaid service boundary | Configure embedded-safe Mermaid failures | Existing vendor integration owner | UI/layout logic |
| autobyteus-web/components/conversation/segments/renderer/MermaidDiagram.vue | File | Conversation renderer | Bound local error UI | Existing diagram UI owner | Global body cleanup or router logic |
| autobyteus-web/components/conversation/segments/renderer/__tests__/MermaidDiagram.spec.ts | File | Component test boundary | Preserve local behavior tests | Existing focused suite | Vendor implementation assumptions only |
| autobyteus-web/tests/e2e/mermaid-error-layout-overflow-probe.mjs | File | Browser/E2E test boundary | Real DOM/viewport regression | Existing E2E probe folder | Product runtime helpers |
| Workspace layout files | Existing files | Workspace shell | No change; retain containment | They already own scroll boundaries | Mermaid-specific workaround |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| autobyteus-web/services | Off-Spine Concern | Yes | Low | Existing vendor facade location |
| autobyteus-web/components/conversation/segments/renderer | Main-Line Domain-Control | Yes | Low | Existing renderer owner |
| autobyteus-web/tests/e2e | Off-Spine Concern | Yes | Low | Existing executable coverage location |
| Workspace layout files | Main-Line Domain-Control | Yes | Low | Reused unchanged; no new mixed responsibility |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Invalid render | mermaid.render rejects -> no body child -> MermaidDiagram local error card | Append Mermaid fallback SVG to body -> catch in component -> hide body overflow globally | The good path fixes the owner boundary; the bad path conceals the leak and breaks unrelated scrolling |
| Config ownership | One mermaidService.initialize sets suppression for every embedded render | Each component sets a different Mermaid option or imports Mermaid directly | A single config owner prevents divergent failure behavior |
| Layout containment | Feed remains overflow-y-auto; body remains unchanged | Increase shell overflow-hidden or set global body overflow hidden | The renderer must not be allowed to create an outer page surface |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep Mermaid fallback SVG and remove it later with a global body scan | Could preserve the library's default error output | Rejected | Set supported suppressErrorRendering: true before render |
| Hide document overflow | Would mask the visual symptom | Rejected | Remove leaked nodes at their renderer owner; preserve legitimate scrolling |
| Add a second parser-only rendering path for all diagrams | Could avoid render failures | Rejected for baseline | Use Mermaid's supported suppression option; add parse preflight only if browser coverage finds a remaining vendor path |
| Preserve a legacy app-level error overlay | No existing supported path | N/A | Keep existing local component error only |

## Derived Layering (If Useful)

MarkdownRenderer (composition) -> MermaidDiagram (lifecycle/UI owner) -> mermaidService (vendor boundary) -> Mermaid (parser/renderer). Layout remains a consumer/container, not a Mermaid error owner.

## Change / Refactor Sequence

1. Update the requirements/design package with approval state and preserve the direct probe evidence.
2. After architecture approval, set suppressErrorRendering: true in mermaidService.initialize.
3. Add root/error width containment in MermaidDiagram.vue without changing template ownership or valid SVG flow.
4. Add/update component coverage for local error state and a real Mermaid/browser-boundary probe for body cleanup and repeated failures.
5. Run implementation-scoped frontend checks, source review, API/E2E browser coverage, and proportional test review.
6. Deliver only after integrated-state refresh and documentation/handoff gates. No migration or release-specific step is needed.

## Key Tradeoffs

- Suppression versus parser preflight: Suppression is the smallest supported fix and covers parse and draw exceptions while preserving the existing rejected-promise contract. Parser preflight would add a second Mermaid pass and may produce less specific error details; it remains a fallback only if product execution shows a gap.
- CSS guard versus layout rewrite: CSS containment is useful defense-in-depth for the app-owned error message, but it is not the primary fix. The layout shell is preserved because it already has correct ownership.
- Browser probe versus Electron-only test: The cause is browser DOM behavior shared by Electron and web; browser-level coverage is faster and more deterministic. A packaged Electron run is not required to prove the vendor mutation, but API/E2E should make a targeted Electron decision.

## Risks

- A future Mermaid upgrade could change configuration names or cleanup behavior; the focused real-DOM regression should catch this.
- Malformed source remains visible as an app-owned error; this is intentional and preferable to a silent failure.
- If the actual production bundle uses a different Mermaid version, the locked-version probe must be repeated against that bundle.

## Guidance For Implementation

- Keep the service's public initialize and render signatures stable.
- Add suppressErrorRendering: true alongside the existing initialization options.
- Bound only the Mermaid component root/error text; do not change body overflow or workspace scroll ownership.
- Preserve the existing renderGeneration guard, local catch, viewer, focus, and link behavior.
- Add a real DOM regression that asserts invalid mermaid.render rejects and leaves no Mermaid-generated body children, including after repeated renders.
- Record any missing generated Nuxt/browser setup as execution evidence rather than weakening the regression.
