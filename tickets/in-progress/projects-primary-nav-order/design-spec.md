# Design Spec — Projects primary navigation order

## Solution And Approval Basis
Package: projects-primary-nav-order. Current solution revision: SR-002. Requirements baseline SR-001 approved unchanged by AP-001: user “yesss” on 2026-10-03 in response to the exact order and preservation scope. Design status: Ready. Behavior-defining supplements: none; Product/review artifacts: N/A — not applicable.
Canonical investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/investigation-notes.md.

## Current-State Read
Shared shell composable owns ordered entries, route resolution, active matching and capability/runtime filtering. AppLeftPanel and LeftSidebarStrip consume its ordered projection. Current Projects row is last, after Nodes. Capability stores/runtime utility own eligibility independently. Evidence E-007–E-011; no ownership fragmentation found.

## Task Size And Architectural Risk (Mandatory)
- task_size: Small — one existing ordered metadata row moves; one focused colocated regression file changes; bounded renderer validation may extend existing tests or add a focused probe.
- architectural_risk: Low — no interface/route, persistence, security, concurrency, deployment or ownership-boundary change. Existing consumers read the same item contract.
- Payload surfaces: navigation metadata ordering and test expectations; task documents. Structural surface touched: existing composable only, without contract change. No new runtime subsystem.
- Escalation: return Design Impact if another authoritative navigation owner is found or production changes beyond ordering are required. Feature/runtime enablement changes are Requirement Gaps requiring renewed approval.

## Architecture Investigation Evidence
E-007 supports single-owner reorder; E-008 establishes both rendering paths; E-009 confirms eligibility remains separate; E-010 identifies the obsolete order assertion and adjacent regression sites; E-011 documents preserved default/mobile semantics; E-012 supplies existing realistic test conventions. Exact sources/commands in investigation-notes.md. Remaining gap: tests/rendered proof are downstream work, not claimed complete.

## Intended Change
Move the existing `projects` object in `allShellPrimaryNavItems` directly after `agentOrgs`, before `applications`. Preserve its key, labelKey and icon, all route/active helper logic, filter conditions and readiness calls. Replace obsolete after-Nodes test with exact expected order assertions both with Applications enabled and disabled. Keep the remaining metadata rows in their original relative order.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Approved basis | Trigger / current evidence | Target / preservation | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 User | REQ-001/002, AC-001/004, SCN-001 | User opens shell and chooses Projects; E-007/008 | Shared ordered projection places Projects after Agent Orgs; existing button → route resolver → Vue Router → /projects page; active matching unchanged | DS-001, DS-002 |
| BEH-002 System | REQ-002, AC-002/003, SCN-002 | Shell renders capability/runtime-eligible entries; E-009/011 | Existing filter still hides Projects for disabled capability or mobile runtime; other entries retain relative order | DS-001 |

## Relevant Supplemental Task Artifacts
User screenshot at the absolute source in investigation inventory: current-state context for REQ-001/AC-001, evidence only. No normative UI/UX specification or additional approved supplement.

## Task Design Health Assessment (Mandatory)
- Change posture: Behavior Change. Current design issue: No.
- Root cause classification: No Design Issue Found; prior order is a product priority to change, not a defect in ownership.
- Refactor needed now: No. E-007/008 show a coherent shared owner and two consuming renderers; array/filter/public key shape already realize the new order without duplication.
- Response: local metadata reorder, not a second array, consumer-side sort or nav abstraction.
- Deferrals: none in scope. Residual risk: stale regression or missing enabled-Applications check; mitigated by exact-order coverage and rendered proof.

## Terminology
Primary navigation includes expanded AppLeftPanel and compact LeftSidebarStrip; optional Applications is shown only when its existing capability/runtime allows it.

## Design Reading Order
Current state/evidence → approved behavior map → health/removal/state decision → spines and boundaries → existing file mapping → sequence/validation.

## Legacy Removal Policy (Mandatory)
No backward compatibility; remove replaced ordering. No legacy modules or APIs become obsolete. Do not retain old after-Nodes order under a flag, runtime branch or consumer override.

## Persisted Data / State Transition Decision
Not Affected: change is source-level list order only. Project metadata, node capability readers/writers, storage model and serialization remain untouched. No state loss, migration, admission gate or old-shape handling. Migration plan: N/A.

## Data-Flow Spine Inventory
| Spine | Scope / behavior | Start → end | Governing owner | Purpose |
| --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End / BEH-001/002 | Shell mount → visible eligible nav entries | useShellPrimaryNavigation for order/eligibility projection; UI for rendering | Locate Projects or see eligible alternatives |
| DS-002 | Primary End-to-End / BEH-001 | Projects selection → Projects route/active item | Shared resolver plus existing Vue Router | Open unchanged destination |

## Primary Execution Spine(s)
DS-001: Shell mount → capability readiness/runtime eligibility → useShellPrimaryNavigation ordered filtered projection → AppLeftPanel/LeftSidebarStrip v-for → visible navigation.
DS-002: User selects Projects → existing UI click handler → resolvePrimaryRoute('projects') → router.push('/projects') → existing Projects page and active navigation.

## Spine Narratives (Mandatory)
DS-001: The mounted renderer asks existing capability owners to resolve state; the composable filters its ordered metadata without sorting. Each renderer iterates the same output, so one row move changes placement consistently while disabled/mobile Projects stays omitted.
DS-002: Projects selection follows the existing click behavior and route helper. Compact drawer activation semantics stay as implemented; navigation-bearing selections still route to /projects. Route path changes continue to feed existing active matching. The reorder does not intercept clicks or alter page ownership.

## Spine Actors / Main-Line Nodes
Shell/renderer; existing capability readiness and runtime predicate; shared navigation projection/resolver; existing click handler; Vue Router; Projects page.

## Ownership Map
Capability stores own node eligibility state; runtime utility owns supported-runtime predicate. Composable owns metadata order, eligibility projection and route/active key mapping. Renderers own presentation and existing interaction; router owns transition; Projects pages own existing content. No authority moves.

## Thin Entry Facades / Public Wrappers
N/A — no new wrapper. Existing composable is the governing navigation policy boundary, not a proxy for consumer-owned order.

## Removal / Decommission Plan (Mandatory)
Remove Projects' old final array position and replace the test's after-Nodes expectation. Reuse the same row once at its new location; no duplicate entry. No files/modules to decommission.

## Return Or Event Spine(s)
N/A as a changed architecture surface — existing reactive route/capability updates remain unchanged; no new event or callback protocol.

## Bounded Local / Internal Spines
N/A — no new loop, worker, dispatcher or state machine; existing filter is a projection within the shared owner.

## Off-Spine Concerns Around The Spine
Localization supplies label text and Icon supplies existing icon rendering to UI; eligibility providers supply unchanged state/predicates to shared navigation. Preserve these concerns, do not copy them into per-consumer ordering logic. No new concerns introduced.

## Ownership Boundaries
Consumers use shared `primaryNavItems`, route resolver and active predicate. Ordered array remains private to the composable. Capability/runtime policy stays behind current owners; no direct backend/storage dependency added.

## Boundary Encapsulation Map
Shared navigation boundary encapsulates private ordered metadata/projection; AppLeftPanel and LeftSidebarStrip must consume it. Forbidden: exporting metadata solely to sort it elsewhere, consumer-local arrays, or moving Projects through DOM/CSS reordering. API extension: none needed.

## Dependency Rules
Keep renderer → composable → existing capability/runtime APIs. No capability store dependency on renderer; no consumer-specific order or mobile-enable workaround. No new core/server dependency in web tests.

## Interface Boundary Mapping
Existing `ShellPrimaryNavKey` identifies one nav item; `primaryNavItems` exposes ordered readonly item projection; `resolvePrimaryRoute(key)` resolves route; active helper matches path. All unchanged; no new API/identity form.

## Interface Boundary Check
Existing interfaces remain singular and explicit; selector risk Low (typed nav key). No corrective action needed.

## Main Domain Subject Naming Check
Projects, primary navigation, capability, route are existing natural names. No renames or naming drift introduced.

## Existing Capability / Subsystem Reuse Check
Reuse shell navigation composable, existing capability stores, runtime gate, renderers, and colocated tests. No new helper, factory, registry or subsystem needed.

## Subsystem / Capability-Area Allocation
Shell navigation owns the metadata delta and its policy tests. UI renderer owns unchanged consumption. Projects capability/runtime subsystems are preserved dependencies, not modification targets.

## Draft File Responsibility Mapping
Existing composable: order change. Existing capability spec: replace stale ordering test and expand optional-Applications order coverage. Consumer tests/probe: bounded rendered regression only if needed. No repeated production logic to extract.

## Reusable Owned Structures Check
Already shared `ShellPrimaryNavItem` and one ordered source are sufficient. No extraction or new schema.

## Shared Structure / Data Model Tightness Check
Item key, localization key and icon retain distinct meanings. No redundant position/index field introduced; array position is canonical. Parallel representation risk Low if consumers remain unchanged.

## Final File Responsibility Mapping
| File | Responsibility / action |
| --- | --- |
| autobyteus-web/composables/useShellPrimaryNavigation.ts | Modify: move only Projects metadata row |
| autobyteus-web/composables/__tests__/useShellPrimaryNavigation.capabilities.spec.ts | Modify: expected full orders, preserve gating/route tests |
| autobyteus-web/components/layout/__tests__/LeftSidebarStrip.spec.ts | Optional focused addition: rendered enabled-Projects adjacency with existing store mocks |
| autobyteus-web/components/AppLeftPanel.vue and components/layout/LeftSidebarStrip.vue | Unchanged production consumers; verify both |
| autobyteus-web/tests/e2e/ | Existing probe conventions; API/E2E owner may add focused durable renderer coverage if no existing probe closes gap |

## Applied Patterns
Existing shared metadata projection; no new pattern.

## Target Subsystem / Folder / File Mapping
Existing composables/ owns shared nav policy; colocated __tests__/ owns focused assertions; tests/e2e/ owns executable browser probes when needed. No production Add/Move/Delete. Modify files above only; consumer test/probe additions must not contain duplicate production ordering logic.

## Folder Boundary Check
Existing UI/composable/test separation is clear, Low risk. New folder hierarchy would over-split a single-row change; retain existing placement.

## Concrete Examples / Shape Guidance
With both capabilities enabled: `chat, agents, agentTeams, agentOrgs, projects, applications, skills, memory, nodes`.
Applications disabled: same list minus applications. Projects disabled: original non-Projects relative order. Avoid placing Projects after Applications or sorting each consumer independently.

## Backward-Compatibility Rejection Log (Mandatory)
Old-order option / dual array: Rejected; there is one approved new order. Clean-cut row move and replacement regression, no compatibility flag.

## Derived Layering
N/A — no new layer or structural depth.

## Change / Refactor Sequence
1. Move existing row once in composable; preserve all adjacent metadata.
2. Replace after-Nodes expectation with full ordered lists for Projects enabled, Applications enabled/disabled. Verify disabled and mobile still omit Projects.
3. Run focused non-watch tests and existing consumers; perform assertion-first rendered browser proof for expanded and compact paths, retaining artifacts and cleaning owned services.
4. Report implementation/validation; downstream delivery syncs documentation if necessary and owns user verification/finalization. No migration/refactor sequencing.

## Key Tradeoffs
One source-level reorder is simpler and more reliable than CSS order or consumer sorting. Full ordered assertions lock intentional other-item preservation while guarding optional Applications placement. No broad Projects CRUD test requirement solely for a navigation reorder.

## Risks
Validation prerequisites may need dependency install/prepare in this fresh worktree; not executed at design stage. Mock/source-only tests do not prove rendered behavior; require browser dev-path evidence per TESTING.md. Do not test user's running app/data or an old installed binary.

## Guidance For Implementation
Apply narrow delta, no feature default/mobile changes. Focused command plan:
`pnpm -C autobyteus-web test:nuxt composables/__tests__/useShellPrimaryNavigation.capabilities.spec.ts composables/__tests__/useShellPrimaryNavigation.spec.ts components/__tests__/AppLeftPanel.spec.ts components/layout/__tests__/LeftSidebarStrip.spec.ts --run`.
Implementation owner runs checks; API/E2E owner supplies executable/rendered validation for AC-001–004 through test-owned surfaces. No test results are claimed by this design. Return unexpected structural needs for reclassification rather than broadening scope silently.
