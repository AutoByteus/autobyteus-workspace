# Design Spec — Task-copy stop styling

## Solution And Approval Basis
- Package `task-copy-stop-style`; current revision **SR-002**; design **Ready**.
- Approved requirements **R1 / SR-001**, Solution Designer within direction; approval message and exact baseline in requirements-doc.md. No intended-behavior change since approval.
- Canonical directory: `/home/autobyteus/workspace/.codex/worktrees/task-copy-stop-style/tickets/in-progress/task-copy-stop-style`; investigation authority: `investigation-notes.md` there. Supporting screenshots inventoried there; Product specification: **N/A — not applicable**.
- Worktree `/home/autobyteus/workspace/.codex/worktrees/task-copy-stop-style`, branch `codex/task-copy-stop-style`; refreshed base `origin/personal@e22245f097c208e66065302cfc30814cc5ffd14f`; finalization `origin/personal`.
- Authorities read 2026-10-13: supplied solution-designer `references/architecture-design.md`, `references/design-principles.md` and design-spec template under `/home/autobyteus/workspace/autobyteus-workspace/.codex/skills/solution-designer`; task root `DESIGN.md`, `TESTING.md`, root/package AGENTS.md. No closer DESIGN.md found under autobyteus-web. Design examples not needed. Design-authority conflicts: None.

## Current-State Read / Architecture Investigation Evidence
E2–E5 in investigation establish one shared sidebar component for Agent and Team copies, supplied with explicit root/reference identities. Parent sidebar Stop is neutral `text-gray-400` with `hover:bg-red-50 hover:text-red-600 transition-colors`; copy button is identical in those hover tokens but rests on `text-red-500`. E3 verifies gray-400 is project `#999999`. E10/E11 trace preserved server ownership. E6/E7 identify ready regression seams.

## Intended Change
Replace only the shared sidebar copy button's resting foreground token with the normal run's `text-gray-400`, and correct its “small red stop icon” comment to describe neutral-at-rest/red-on-hover. Keep existing hover tokens, transition, size, shape, placement, focus ring, accessibility, pending/disabled presentation, icon and event handlers. No script changes expected.

## Change Scope
- In scope: UC-001/002, one sidebar component's color/comment and bounded regression/rendered coverage for both copy types.
- Deliberately left alone: normal sidebar parent; Settings `RunMemberRow`/`ExistingRunSettings`; tree geometry/disclosure/selection; docking/overlay; stores/clients/backend/lifecycle/persistence; Task status; release/update UI.
- Existing collaborator/sidebar consumers of shared component inherit the neutral presentation; no new branch or new caller is introduced.
- Follow-up FUP-001: web ARCHITECTURE.md overview says Python backend despite current TS production path (investigation notes). Non-blocking docs-consistency Task for delegator; do not grow this patch.

## Relevant Behavior And Production-Path Map
| Behavior | Approved REQ / AC / trigger | Current evidence and preserved/change outcome | Target path |
|---|---|---|---|
| BEH-001 | REQ-001/004; AC-001/002; user observes/hovers/leaves copy Stop | E1–E4; change resting foreground only; parent reference unchanged | DS-001 |
| BEH-002 | REQ-002/004; AC-003; keyboard focus/activation and pending | E2/E5/E6; retain native button, ring/labels, stop propagation, disabled/pulse | DS-001, DS-002/003 |
| BEH-003 | REQ-003/004; AC-004; click one copy Stop | E4/E5/E9–E11; exact Agent/whole-Team target, lifecycle and visibility unchanged | DS-002/003 |

## Task Design Health Assessment
- Posture: Bug Fix. Current design issue: no structural issue; **Local Implementation Defect** in one color token.
- Refactor needed now: **No**. Existing shared component already owns presentation for both types; no duplicated stop orchestration, mixed-subject selector ambiguity or boundary bypass introduced by this delta. Root/reference union has explicit identity keys, not a generic guessing selector.
- Structural triggers checked: repeated coordination (not introduced; same existing store); responsibility overload (component is a small labelled stop control); shared structure looseness (no structure changes); empty indirection (reject adding wrapper/helper just for one token); capability reuse (reuse current component/Tailwind theme); legacy/data transition (none).
- Response: local token substitution and regression proof; do not extract a new generalized stop component or consolidate parent and copy lifecycles.
- Deferrals: only FUP-001 outside scope. Residual risk: CSS assertions alone cannot prove rendered pointer behavior; browser evidence required.

## Terminology
Copy Stop is the shared sidebar control, not the normal parent termination action or the red Settings control.

## Legacy Removal Policy / Removal Plan
| Remove | Why | Replacement | Scope |
|---|---|---|---|
| Copy button's resting `text-red-500` and misleading “small red” comment | Wrong presentation at rest | `text-gray-400`; accurate state comment in same owner | In this change |
No obsolete runtime path, dead code, compatibility wrapper, dual path or fallback retained/introduced. Existing live component consumers remain. No dead code established by source inspection; do not invent cleanup.

## Persisted Data / State Transition Decision
**Not Affected**. No schema, serialization, reader/writer, runtime-state or stored semantic changes. No migration/rebuild/reset or compatibility mechanism; required conversations/Tasks/worker state remain untouched. Migration plan: N/A.

## Data-Flow Spine Inventory / Execution / Narratives
| ID | Scope / start → end | Governing owner and narrative |
|---|---|---|
| DS-001 | Primary visual: user sees live copy in run sidebar → root's task tree row → DelegatedStopButton → project Tailwind classes/pointer hover → neutral/red/neutral rendered glyph | Sidebar button owns appearance; existing tree owners supply identity and placement. Full visual path is local, no API call for hover/focus. |
| DS-002 | Primary preserved command: user activates copy Stop → row's typed root/reference → DelegatedStopButton → delegatedLaunchDraftStore.stop → stopDelegatedExecution GraphQL client → resolver → DelegatedLaunchSelectionService → live root gate → DelegatedLaunchSelectionCommand → root task lifecycle stopForUser → restorable stopped copy | Root owns stop sequencing/lifecycle; UI store owns per-target pending. Both Agent and Team selectors use existing path, with whole-Team identity for Team copy. Task remains open; parent/other copies are not substituted as target. |
| DS-003 | Return/event: stop result → store feedback/finally clears pending; existing live status publication → root context → isDelegatedCopyLive → button hidden once no longer live | Existing store and context owners remain authoritative; CSS change does not affect event or state publication. |
No new bounded local state machine/loop: N/A. Existing backend queue semantics are not being redesigned.

## Main-Line Owners, Off-Spine Concerns And Boundaries
- Tree row owns root/reference mapping and row selection; button owns presentation and event containment; store owns pending/error feedback; client owns GraphQL serialization; service finds live root; root/command/task lifecycle own actual stop.
- Off-spine dependencies: Tailwind owns project colors/CSS transition; localization owns labels; liveness reads root context. Reuse all unchanged.
- Dependency rule: copy button calls existing store, not parent terminate action, Task closure tool, GraphQL directly or runtime internals. No boundary bypass or new global CSS. Parent control is read-only visual evidence, not a dependency to refactor.
- Public boundary `stop(root, reference)` accepts `rootKind + rootRunId` and exactly one `{agentRunId}` or `{teamRunId}`. Explicit identities and singular stop responsibility remain; selector risk Low, no correction needed. Service/root internals remain encapsulated.
- Entry facades, new interface/type/shared structure extraction: N/A — no API or model delta. Current natural names and subsystem placement remain appropriate.

## Subsystem Reuse / File Responsibilities / Target Mapping
Paths relative to isolated worktree. Draft and final responsibility mapping are identical; no extraction justified.
| Change / path | Owner / concrete concern | Must not contain |
|---|---|---|
| Modify `autobyteus-web/components/workspace/history/DelegatedStopButton.vue` | Existing sidebar control; one resting token/comment | New lifecycle logic, size/focus/disabled redesign, Task state changes |
| Modify `autobyteus-web/components/workspace/history/__tests__/DelegatedStopButton.spec.ts` | Colocated regression: both copy types use neutral/rest and existing hover/focus/loading classes, exact action targeting, containment, visibility | Live user actions, a test-only replacement of the production button |
| Modify `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Extend DCP-001 Agent and DCP-002 Team sidebar cases with rendered state assertions/screenshots before existing test-owned stop click | New app behavior or a parallel harness; live-app testing |
| Optional bounded test-only changes in existing store/liveness suites if needed | Close pending/focus/identity proof gaps only | Production store/backend edits |
| Add/update ticket evidence/reports | Durable design/validation/delivery record | Claims beyond observed layer/build |
Folders already reflect presentation/test ownership; no new module/folder abstraction. Shared data tightness check: N/A — no data fields added. Local pattern: native CSS pseudo-class states plus existing Vue button; no JS hover state.

## Concrete Shape
`text-red-500 transition-colors hover:bg-red-50 hover:text-red-600` → `text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600` in DelegatedStopButton only. Keep every focus/disabled/motion utility and handler already surrounding it. Do not replace gray-400 with stock Tailwind RGB: project overrides it to #999999.

## Backward-Compatibility Rejection Log
N/A — no compatibility mechanism required. Old always-red resting style is removed directly, not kept behind a flag.

## Change / Validation Sequence
1. Reconfirm R1 approval, worktree/branch and current parent control before patch; preserve parallel work.
2. Implementation changes token/comment only. Extend component tests parameterized for Agent/Team reference: neutral and hover token parity, no base red token; focus/labels/type; pending disabled/pulse/motion behavior; exact stop invocation and no select/toggle; stopped/no-root/member visibility. Keep existing store tests.
3. Run focused Nuxt suites after TESTING.md preparation, e.g. `pnpm -C autobyteus-web test:nuxt components/workspace/history/__tests__/DelegatedStopButton.spec.ts stores/__tests__/delegatedLaunchDraftStore.spec.ts --run`. Add parent/reference suite where useful; do not claim CSS hover is proved in DOM-only tests.
4. API/E2E owner extends/runs existing isolated browser probe with DCP-001,DCP-002: compare computed neutral/hover/leave foreground and background to normal sidebar reference (or recorded computed reference from same current build), waiting for transition completion. Capture each state for both types, plus keyboard focus and pending evidence. Include selected and unselected rows where fixture permits. Confirm existing exact stop/parent-survival behavior; add request-payload assertions if current probe does not expose target identity sufficiently. Test-only delayed/mocked boundary may supplement pending checks, clearly labelled.
5. Existing reusable command: `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --cases DCP-001,DCP-002 --output-dir <fresh-ticket-evidence-directory>`. Read probe prerequisites/header, build this worktree's server if running it, clean inherited environment, use only test-owned root/HOME/ports/scripted runtimes. These cases also exercise model switching; that remains regression activity, not new product scope.
6. Test layer decision: renderer-only change needs unit/component + real-browser probe under TESTING.md. Browser evidence is web-equivalent, not proof of installed Electron update. If claiming a full real-product/desktop journey, run the required isolated current Electron build; never substitute old installed binary. No paid inference needed for CSS.
7. Delivery records source integration, release choice/default no release, installed/running app state, verification judgement or needed user check and cleanup. Never restart/update the user's app or stop real workers to make a test pass. Read RELEASE.md fully before finalization.

## Key Tradeoffs / Risks / Guidance
- One-token production change is preferable to a shared-control refactor: the controls have distinct lifecycles and accessible/pending conventions; merging them expands scope without benefit.
- Preserve copy hit area/radius and focus ring rather than copying every parent class. “Match” governs the requested rest/hover presentation, not removing useful existing focus/loading states.
- Existing shared component changes all its sidebar consumers consistently. No settings control changes warranted.
- Risk: CSS/transition timing and wrong copy target can be missed by screenshots alone; use computed style + action/payload assertions and inspect screenshots.
- Integration risk: concurrent docking work may change surrounding sidebar source; refresh and reconcile without importing its scope.
- Validation not yet run; no implementation or delivery pass claimed.

## Task Size And Architectural Risk (completed after design)
- `task_size`: **Small** — one runtime Vue class/comment plus bounded existing tests/probe assertions.
- `architectural_risk`: **Low** — no new/changed contract, data, security, concurrency, deployment or ownership boundary; cause and shared consumers verified. Payload evidence volume does not alter scope.
- Escalation: if implementation requires changing event/liveness/stop targets, global theme, parent/Settings control, backend/lifecycle or a broader UI redesign, stop and return Design Impact/Requirement Gap rather than silently broaden.
- Independent architecture/code review artifacts: **N/A — not applicable**. Configured Small/Low direct route selected after rule lookup; see solution-handoff.md. Self-checks and executable validation still required.
