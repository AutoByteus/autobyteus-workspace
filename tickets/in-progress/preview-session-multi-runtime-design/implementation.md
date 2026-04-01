# Implementation

Use this single artifact for both:
- the stable Stage 6 implementation baseline
- the live Stage 6 execution/progress record
- brief downstream handoff/status pointers for Stages 7, 8, and 9

## Scope Classification

- Classification: `Large`
- Reasoning: the change now spans Electron shell composition, native preview-session ownership, preload/renderer projection, server-side preview tooling, and runtime-adapter parity across three runtimes.
- Workflow Depth:
  - `Large` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`
- Investigation notes: `tickets/in-progress/preview-session-multi-runtime-design/investigation-notes.md`
- Requirements: `tickets/in-progress/preview-session-multi-runtime-design/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`

## Document Status

- Current Status: `In Execution`
- Notes: `v8` design basis accepted. The previous dedicated-preview-window implementation is now legacy in scope. Stage 6 restarts from the reviewed shell-tab architecture and reuses only the parts of the earlier implementation that still match the `v8` ownership model.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch

- Use Cases In Scope: `UC-001` through `UC-011`
- Spine Inventory In Scope: `DS-001` through `DS-008`
- Primary Owners / Main Domain Subjects:
  - `PreviewSessionManager`
  - `PreviewShellController`
  - shell window host / registry under `autobyteus-web/electron/shell`
  - `PreviewToolService`
  - preview bridge server/client
  - runtime adapters for `autobyteus`, `codex_app_server`, and `claude_agent_sdk`
  - renderer `previewShellStore` + `PreviewPanel`
- Requirement Coverage Guarantee: `R-001` through `R-011` map to at least one in-scope use case and at least one planned task below.
- Design-Risk Use Cases:
  - `UC-009`: session registry and per-session browser-control invariants survive create/reuse/close/error paths.
  - `UC-010`: shell attachment lifecycle stays coherent with one active view per shell host.
  - `UC-011`: shell renderer reload/reconnect recovers preview state from controller snapshots instead of tool-result replay.
- Target Architecture Shape:
  - keep server-side preview tool contract, bridge client, and runtime adapters under their existing server ownership
  - refactor Electron preview ownership from dedicated `BrowserWindow` sessions to per-session `WebContentsView` sessions
  - introduce `PreviewShellController` as the only owner of shell projection state
  - introduce an Electron shell host/registry boundary so the current workspace window can host the preview view area cleanly
  - expose a bounded preload bridge for preview shell registration, focus, selection, close, and host-rect updates
  - renderer becomes snapshot-driven UI only: outer Preview tab visibility, internal preview tabs, and user requests
- New Owners / Boundary Interfaces To Introduce:
  - `PreviewShellController`
  - shell preview snapshot contract
  - shell window host / registry under `autobyteus-web/electron/shell`
  - renderer `previewShellStore`
  - `PreviewPanel.vue`
- Primary file/task set: see `Implementation Work Table`
- API / Behavior Delta:
  - remove popup preview windows from normal preview behavior
  - add shell preview snapshot IPC (`registerHost`, `focusSession`, `setActiveSession`, `closeSession`, `updateHostRect`, snapshot subscription/getter`)
  - keep `open_preview`, `navigate_preview`, `capture_preview_screenshot`, `get_preview_console_logs`, and `close_preview`
  - add `execute_preview_javascript` and `open_preview_devtools` so each preview session behaves like an independent browser control
  - preserve one opaque `preview_session_id` contract across all runtimes
- Key Assumptions:
  - the current workspace window can be refactored into a shell host that supports one native preview host area on the right
  - Electron main can resolve shell identity from the sender and does not need renderer-owned session truth
  - the existing backend bridge remains local-shell-only for now
  - detached DevTools is acceptable inside the shell-tab model
- Known Risks:
  - the shell host refactor may require deeper main-process window composition changes than the popup-window version
  - `autobyteus-web/electron/main.ts` is already size-sensitive and must stay under Stage 8 pressure limits
  - preview-session manager rewrite must not leak renderer-owned assumptions into Electron main
  - server/runtime adapter work is mostly reusable, but contract extensions for JS/devtools must not introduce runtime drift

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16 | Fail | Yes | Yes | Yes | `Design Impact` | `3 -> 4 -> 5` | `Reset` | 0 |
| 17 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 18 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `18`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: implement main-process owners before renderer dependents.
- Test-driven: keep unit/integration coverage aligned with each implementation slice.
- Spine-led implementation rule: sequence by preview-session owner, shell-projection owner, shell host, preload bridge, renderer projection, then downstream runtime contract extensions.
- Mandatory modernization rule: no popup-window compatibility branch remains for normal preview behavior.
- Mandatory cleanup rule: remove `preview-window-factory.ts` and any dedicated-window-only wiring in scope.
- Mandatory ownership/decoupling/SoC rule: Electron main owns preview session truth and shell projection truth; renderer remains projection-only.
- Mandatory boundary-encapsulation rule: renderer must use preview-shell IPC only and must not infer shell truth directly from tool results.
- Mandatory shared-structure coherence rule: keep `preview_session_id` contract tight and keep shell snapshot metadata separate from the canonical backend tool contract.
- Mandatory file-placement rule: preview shell code belongs under Electron shell/preview ownership; preview-specific server semantics stay under `agent-tools/preview`.
- Mandatory shared-principles implementation rule: if the shell host refactor exposes a design weakness, classify `Design Impact` rather than patching around it in `main.ts`.
- Mandatory proactive size-pressure rule: `autobyteus-web/electron/main.ts`, `preview-session-manager.ts`, and any new shell host file must be kept under proactive Stage 8 pressure control.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-008` | shell window host | `autobyteus-web/electron/shell/*` and shell host registration | None | main-process shell host identity must exist before shell projection can be correct |
| 2 | `DS-007` | `PreviewSessionManager` | refactor `autobyteus-web/electron/preview/preview-session-manager.ts` to `WebContentsView` ownership | 1 | session owner is still the browser-control truth |
| 3 | `DS-008`, `DS-004`, `DS-005` | `PreviewShellController` | add `autobyteus-web/electron/preview/preview-shell-controller.ts` | 1, 2 | shell projection depends on both shell host identity and session owner |
| 4 | `DS-001` through `DS-006` | Electron preview runtime | update `preview-runtime.ts`, `preview-bridge-server.ts`, `main.ts`, remove window factory path | 2, 3 | startup and bridge wiring depend on the new owners |
| 5 | `DS-004`, `DS-005`, `DS-006` | preload + renderer projection | `preload.ts`, typed declarations, `previewShellStore`, `PreviewPanel.vue`, right-side tabs | 3, 4 | renderer can only be written against the final main-process shell boundary |
| 6 | `DS-002`, `DS-003` | server preview tool layer | extend tool contract/service/bridge for JS/devtools and any shell-tab-neutral changes | 2, 4 | backend changes are mostly compatible, but final action set depends on main-process capabilities |
| 7 | `DS-001`, `DS-002`, `DS-003` | runtime adapters | Codex and Claude extension/wiring updates if the action surface changes | 6 | keep adapter parity last and translation-only |

### File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Preview session owner | `autobyteus-web/electron/preview/preview-session-manager.ts` | same path | Electron preview lifecycle | `Modify` | session truth stays in Electron main and uses `WebContentsView` |
| Popup window factory | `autobyteus-web/electron/preview/preview-window-factory.ts` | `N/A` | obsolete popup-window concern | `Remove` | no dedicated preview-window path remains |
| Shell projection owner | `N/A` | `autobyteus-web/electron/preview/preview-shell-controller.ts` | Electron preview shell projection | `Create` | renderer depends on controller snapshots only |
| Shell host / registry | inline `autobyteus-web/electron/main.ts` helpers | `autobyteus-web/electron/shell/*` | workspace shell host ownership | `Split` | shell host identity is main-process-owned and reusable |
| Preload preview shell bridge | `autobyteus-web/electron/preload.ts` | same path + typed declarations | renderer/main preview IPC | `Modify` | renderer uses typed preview API only |
| Renderer preview shell UI | `N/A` | `autobyteus-web/stores/previewShellStore.ts`, `autobyteus-web/components/workspace/tools/PreviewPanel.vue` | renderer projection concern | `Create` | outer Preview tab and internal preview tabs are snapshot-driven |
| Right-side tab chrome | `autobyteus-web/composables/useRightSideTabs.ts`, `autobyteus-web/components/layout/RightSideTabs.vue` | same paths | shell tab chrome | `Modify` | Preview tab is lazy and derived from snapshot state |
| Server preview contract/service | `autobyteus-server-ts/src/agent-tools/preview/*` | same subsystem | server preview semantics | `Modify` | no preview-specific code lands in `autobyteus-ts` |
| Runtime adapters | existing Codex/Claude preview folders | same paths | runtime translation | `Keep/Modify` | adapters remain translation-only |

### Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | `DS-008` | shell window host | extract preview-capable workspace shell host and registry from `main.ts` | `autobyteus-web/electron/main.ts` | `autobyteus-web/electron/shell/*` | `Create` | None | `Planned` | `autobyteus-web/electron/shell/__tests__/workspace-shell-window.spec.ts` | `Planned` | `autobyteus-web/electron/shell/__tests__/workspace-shell-host.integration.spec.ts` | `Planned` | `Planned` | choose clean shell identity model before preview projection logic lands |
| C-002 | `DS-007` | `PreviewSessionManager` | replace popup-window lifecycle with per-session `WebContentsView` lifecycle | `autobyteus-web/electron/preview/preview-session-manager.ts` | same path | `Modify` | C-001 | `Planned` | `autobyteus-web/electron/preview/__tests__/preview-session-manager.spec.ts` | `Planned` | `autobyteus-web/electron/preview/__tests__/preview-session-manager.integration.spec.ts` | `Planned` | `Planned` | preserve screenshot/log behavior while changing native owner shape |
| C-003 | `DS-008`, `DS-004`, `DS-005` | `PreviewShellController` | authoritative shell projection owner | `N/A` | `autobyteus-web/electron/preview/preview-shell-controller.ts` | `Create` | C-001, C-002 | `Planned` | `autobyteus-web/electron/preview/__tests__/preview-shell-controller.spec.ts` | `Planned` | `autobyteus-web/electron/preview/__tests__/preview-shell-controller.integration.spec.ts` | `Planned` | `Planned` | controller publishes shell snapshots and owns attach/detach logic |
| C-004 | `DS-001` through `DS-006` | Electron preview runtime | runtime startup/wiring and popup-path removal | `autobyteus-web/electron/preview/preview-runtime.ts`, `autobyteus-web/electron/preview/preview-bridge-server.ts`, `autobyteus-web/electron/main.ts`, `autobyteus-web/electron/preview/preview-window-factory.ts` | same paths except remove `preview-window-factory.ts` | `Modify`/`Remove` | C-002, C-003 | `Planned` | `autobyteus-web/electron/preview/__tests__/preview-bridge-server.spec.ts` | `Planned` | `autobyteus-web/electron/preview/__tests__/preview-runtime.integration.spec.ts` | `Planned` | `Planned` | keep bridge contract stable; remove dedicated window behavior cleanly |
| C-005 | `DS-004`, `DS-005`, `DS-006` | preload bridge | typed preview shell IPC | `autobyteus-web/electron/preload.ts`, typed declarations | same paths | `Modify` | C-003, C-004 | `Planned` | `autobyteus-web/electron/__tests__/preload-preview-ipc.spec.ts` | `Planned` | `autobyteus-web/electron/__tests__/preload-preview-ipc.integration.spec.ts` | `Planned` | `Planned` | include register/focus/select/close/bounds/snapshot APIs only |
| C-006 | `DS-004`, `DS-005`, `DS-006` | renderer projection | snapshot-driven preview store, panel, and lazy outer Preview tab | `N/A`, `autobyteus-web/composables/useRightSideTabs.ts`, `autobyteus-web/components/layout/RightSideTabs.vue` | `autobyteus-web/stores/previewShellStore.ts`, `autobyteus-web/components/workspace/tools/PreviewPanel.vue`, same tab-chrome paths | `Create`/`Modify` | C-005 | `Planned` | `autobyteus-web/tests/unit/stores/previewShellStore.spec.ts`, `autobyteus-web/tests/unit/components/PreviewPanel.spec.ts` | `Planned` | `autobyteus-web/tests/integration/right-panel-preview-tab.integration.spec.ts` | `Planned` | `Planned` | renderer must stay projection-only and derive tab state from snapshots |
| C-007 | `DS-002`, `DS-003` | server preview tool layer | preserve existing preview contract flow and extend for JS/devtools where needed | `autobyteus-server-ts/src/agent-tools/preview/*` | same subsystem | `Modify` | C-002, C-004 | `Planned` | `autobyteus-server-ts/tests/unit/agent-tools/preview/preview-tool-contract.test.ts`, `autobyteus-server-ts/tests/unit/agent-tools/preview/preview-bridge-client.test.ts` | `Planned` | `autobyteus-server-ts/tests/integration/agent-tools/preview/preview-tool-service.integration.test.ts` | `Planned` | `Planned` | existing open/navigate/screenshot/log/close path is reusable; add JS/devtools cleanly if accepted |
| C-008 | `DS-001`, `DS-002`, `DS-003` | runtime adapters | keep Codex and Claude preview parity after contract updates | existing Codex/Claude preview files | same paths | `Modify` | C-007 | `Planned` | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts`, `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts` | `Planned` | `autobyteus-server-ts/tests/integration/agent-execution/codex-preview-runtime.integration.test.ts`, `autobyteus-server-ts/tests/integration/agent-execution/claude-preview-runtime.integration.test.ts` | `Planned` | `Planned` | adapters remain translation-only; no shell-state policy leaks into them |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001` | `AC-003`, `AC-007` | `DS-002`, `DS-003`, `DS-006`, `DS-007` | `Canonical Preview Contract`, `Session Lifecycle / Shell Projection Rules` | `UC-002`, `UC-006`, `UC-008`, `UC-009` | `C-002`, `C-007`, `C-008` | Unit + Integration | `AV-002`, `AV-006` |
| `R-002` | `AC-002`, `AC-008` | `DS-004`, `DS-005`, `DS-008` | `Summary`, `Architecture Direction Decision` | `UC-005`, `UC-007`, `UC-010`, `UC-011` | `C-001`, `C-003`, `C-005`, `C-006` | Unit + Integration | `AV-001`, `AV-004` |
| `R-003` | `AC-002`, `AC-007` | `DS-004`, `DS-005`, `DS-006` | `Session Lifecycle / Shell Projection Rules` | `UC-005`, `UC-007`, `UC-008`, `UC-011` | `C-003`, `C-005`, `C-006` | Unit + Integration | `AV-004`, `AV-005` |
| `R-004` | `AC-003`, `AC-004` | `DS-002`, `DS-003`, `DS-007` | `Summary`, `Bounded Local / Internal Spines` | `UC-002`, `UC-006`, `UC-009` | `C-002`, `C-007` | Unit + Integration | `AV-002`, `AV-006` |
| `R-005` | `AC-005` | `DS-001`, `DS-002`, `DS-003` | `Summary`, `Ownership Map` | `UC-001`, `UC-002`, `UC-003`, `UC-004` | `C-004`, `C-007`, `C-008` | Integration | `AV-001`, `AV-007` |
| `R-006` | `AC-001`, `AC-006` | `DS-004`, `DS-005`, `DS-008` | `Ownership Map`, `Ownership-Driven Dependency Rules` | `UC-005`, `UC-007`, `UC-010`, `UC-011` | `C-001`, `C-003`, `C-005`, `C-006` | Unit + Integration | `AV-003`, `AV-004` |
| `R-007` | `AC-006` | `DS-004`, `DS-005` | `Return / Event Spine(s)` | `UC-005`, `UC-007`, `UC-011` | `C-003`, `C-005`, `C-006` | Unit + Integration | `AV-003`, `AV-005` |
| `R-008` | `AC-004` | `DS-003`, `DS-007` | `Canonical Preview Contract`, `Summary` | `UC-006`, `UC-009` | `C-002`, `C-007`, `C-008` | Unit + Integration | `AV-006`, `AV-007` |
| `R-009` | `AC-007` | `DS-006`, `DS-007`, `DS-008` | `Session Lifecycle / Shell Projection Rules`, `Bounded Local / Internal Spines` | `UC-008`, `UC-009`, `UC-010` | `C-002`, `C-003`, `C-006` | Unit + Integration | `AV-005`, `AV-006` |
| `R-010` | `AC-005` | `DS-001`, `DS-002`, `DS-003` | `Canonical Preview Contract`, `Ownership Map` | `UC-001`, `UC-002`, `UC-003`, `UC-004` | `C-007`, `C-008` | Integration | `AV-001`, `AV-007` |
| `R-011` | `AC-008` | `DS-006` | `Legacy Removal Policy`, `Removal / Decommission Plan` | `UC-008` | `C-004` | Integration | `AV-004`, `AV-008` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-006` | `DS-004`, `DS-005`, `DS-008` | Electron main remains the authoritative owner for preview session and shell projection lifecycle | `AV-003` | `E2E` | `Planned` |
| `AC-002` | `R-002`, `R-003` | `DS-004`, `DS-005`, `DS-006` | outer Preview tab appears lazily and hides when no sessions remain | `AV-004`, `AV-005` | `E2E` | `Planned` |
| `AC-003` | `R-001`, `R-004` | `DS-002`, `DS-003`, `DS-007` | each preview session maps to one internal tab and independent browser control | `AV-002`, `AV-006` | `E2E` | `Planned` |
| `AC-004` | `R-004`, `R-008` | `DS-003`, `DS-007` | per-session screenshot, console, JS, and DevTools remain available after the shell-tab move | `AV-006`, `AV-007` | `API` | `Planned` |
| `AC-005` | `R-005`, `R-010` | `DS-001`, `DS-002`, `DS-003` | all runtimes preserve one preview-session contract | `AV-001`, `AV-007` | `API` | `Planned` |
| `AC-006` | `R-006`, `R-007` | `DS-004`, `DS-005` | renderer/main coordination is bounded and snapshot-driven | `AV-003`, `AV-009` | `E2E` | `Planned` |
| `AC-007` | `R-001`, `R-003`, `R-009` | `DS-006`, `DS-007`, `DS-008` | close semantics and shell recovery are deterministic | `AV-005`, `AV-009` | `E2E` | `Planned` |
| `AC-008` | `R-002`, `R-011` | `DS-006` | popup preview-window behavior is removed from normal flow | `AV-004`, `AV-008` | `E2E` | `Planned` |

### Design Delta Traceability

| Change ID (from proposed design doc) | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- |
| `C-001` | `C-002` | `No` | Unit + Integration + `AV-002`/`AV-006` |
| `C-002` | `C-004` | `Yes` | Integration + `AV-004`/`AV-008` |
| `C-003` | `C-003` | `No` | Unit + Integration + `AV-003`/`AV-005` |
| `C-004` | `C-001` | `No` | Unit + Integration + `AV-003` |
| `C-005` | `C-005`, `C-006` | `No` | Unit + Integration + `AV-004`/`AV-009` |
| `C-006` | `C-006` | `No` | Unit + Integration + `AV-004`/`AV-005` |
| `C-007` | `C-004` | `Yes` | Integration + `AV-008` |
| `C-008` | `C-003` | `No` | Unit + Integration + `AV-003`/`AV-009` |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | `preview-window-factory.ts` | `Remove` | remove file, remove imports/usages, remove preview-window-only tests | leaving it behind would create a forbidden dual path |
| `T-DEL-002` | dedicated preview-window runtime wiring | `Remove` | remove popup-window creation path from preview runtime/main-process flow | hidden fallback behavior would invalidate the reviewed design |
| `T-DEL-003` | old Stage 6 popup-window execution assumptions | `Remove` | reset execution tracking and validation plans around shell-tab behavior | stale baseline would cause incorrect Stage 7/8 evidence |

### Step-By-Step Plan

1. Build the shell host / registry boundary and prove one main-process shell identity can host a preview surface.
2. Refactor `PreviewSessionManager` from `BrowserWindow` lifecycle to `WebContentsView` lifecycle.
3. Implement `PreviewShellController` and snapshot contract.
4. Wire runtime startup and remove popup-window behavior.
5. Add preload IPC and renderer projection (`previewShellStore`, `PreviewPanel`, right-side tab visibility).
6. Extend backend preview actions for JS/devtools and verify adapter parity.
7. Run targeted unit/integration validation after each slice and classify re-entry immediately if the shell host refactor exposes a design mismatch.

### Backward-Compat And Decoupling Guardrails

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Planned`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/preview-session-multi-runtime-design/code-review.md`
- Scope (source + tests): Electron preview/session/shell host changes, preload/types, renderer preview projection, preview tool contract/service changes, and runtime-adapter updates
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "[^[:space:]]" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action: split `main.ts`, `preview-session-manager.ts`, or any new shell host file before Stage 8 if they approach the limit
- per-file diff delta gate (`>220` changed lines) assessment approach: measure after each major slice; if one file mixes shell host, preview owner, and IPC concerns, split immediately
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan): record any file that needed extraction during Stage 6
- file-placement review approach (how wrong-folder placements will be detected and corrected): compare every touched file against the `v8` ownership map and reject preview shell logic landing in renderer-only folders or generic server/common layers

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | Ownership/SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/main.ts` | `497` | `Yes` | `High` | `Split` | `Design Impact` |
| `autobyteus-web/electron/preview/preview-session-manager.ts` | `376` | `Yes` | `High` | `Refactor` | `Design Impact` |
| `autobyteus-web/electron/preview/preview-shell-controller.ts` | `0` | `Yes` | `Medium` | `Keep` | `Local Fix` |
| `autobyteus-web/electron/shell/workspace-shell-window.ts` | `0` | `Yes` | `High` | `Keep` | `Design Impact` |
| `autobyteus-web/electron/preload.ts` | existing | `Yes` | `Medium` | `Keep` | `Local Fix` |
| `autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` | `351` | `Yes` | `Medium` | `Keep` | `Local Fix` |

### Test Strategy

- Unit tests:
  - Electron shell host / registry
  - `PreviewSessionManager`
  - `PreviewShellController`
  - preload preview IPC typing/behavior
  - renderer `previewShellStore` and `PreviewPanel`
  - preview tool contract / bridge client updates
- Integration tests:
  - shell host + preview attachment integration
  - preview runtime / bridge integration after popup-path removal
  - right-panel Preview tab integration
  - Codex and Claude preview parity after any contract extensions
- Stage 6 boundary: file and service-level verification only (unit + integration)
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/in-progress/preview-session-multi-runtime-design/api-e2e-testing.md`
  - expected acceptance criteria count: `8`
  - critical flows to validate:
    - preview open shows a lazy right-side Preview tab
    - multiple preview sessions coexist as internal tabs
    - active tab switching reattaches the correct `WebContentsView`
    - screenshot/log/JS/devtools stay per-session
    - shell reload/reconnect recovers preview state from snapshots
    - popup-window behavior is gone from the normal preview flow
  - expected scenario count: `9`
  - known environment constraints: live Codex/Claude runtime tests remain env-gated; Electron shell tests may need platform-specific guards

### Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/preview/preview-shell-controller.ts` | `autobyteus-web/electron/shell/*` | shell projection needs host lookup and host lifecycle hooks | keep shell lookup behind one shell registry boundary | shell host/registry files exist and are stable | `Updated` | `PreviewShellController` |

### Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| BrowserWindow shell content still works if preview projection is extracted behind a dedicated shell host boundary | `autobyteus-web/electron/shell/workspace-shell-window.ts`, `autobyteus-web/electron/main.ts` | `Derived Implementation Mapping` | resolved locally by introducing a shell host/registry boundary instead of promoting a wider window-model redesign | `Resolved` |

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/in-progress/preview-session-multi-runtime-design/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-01: Stage 6 baseline rewritten for the `v8` shell-tab preview architecture.
- 2026-04-01: `workflow-state.md` updated to `Current Stage = 6` with `Code Edit Permission = Unlocked`; source implementation can now begin.
- 2026-04-01: Extracted `autobyteus-web/electron/shell/workspace-shell-window.ts` and `workspace-shell-window-registry.ts` so Electron main owns shell identity and preview-host attachment outside `main.ts`.
- 2026-04-01: Replaced popup-window preview ownership with per-session `WebContentsView` ownership in `autobyteus-web/electron/preview/preview-session-manager.ts` and added `PreviewShellController` to publish authoritative shell snapshots.
- 2026-04-01: Wired preview-shell IPC through `main.ts`, `preload.ts`, typed declarations, `previewShellStore.ts`, `PreviewPanel.vue`, `RightSideTabs.vue`, and `toolLifecycleHandler.ts` so `open_preview` now focuses a lazy right-side Preview tab instead of opening a separate OS window.
- 2026-04-01: Extended server/runtime preview tooling for `execute_preview_javascript` and `open_preview_devtools`, removed `preview-window-factory.ts`, and updated Codex/Claude adapter parity tests.
- 2026-04-01: Targeted validation passed for Electron compile, Electron preview unit suite, renderer preview-shell store/tab behavior, and server preview runtime/tool registration slices.
- 2026-04-01: Stage 7 live runtime validation found a bounded local-fix re-entry. Codex preview dynamic tools did not emit canonical lifecycle events or reach the preview bridge in the live runtime path, and Claude preview MCP execution surfaced prefixed tool names instead of canonical preview tool names.
- 2026-04-01: Local-fix re-entry applied runtime normalization without changing the reviewed design. Codex preview dynamic-tool completions now surface canonical tool success events, and Claude preview MCP events now normalize preview tool names to the canonical contract.
- 2026-04-01: Revalidated the local fix with targeted server unit tests, `tsc --noEmit`, and live Codex/Claude `open_preview` integration reruns.
- 2026-04-01: Built the current mac Electron artifact for the shell-tab preview branch at `autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.2.46.dmg` and `autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.2.46.zip`.

### Scope Change Log

| Date | Previous Scope | New Scope | Trigger | Required Action |
| --- | --- | --- | --- | --- |
| 2026-04-01 | popup preview windows | shell-embedded preview tabs backed by `WebContentsView` | user requirement change + Stage 5 `Design Impact` review finding | completed `3 -> 4 -> 5` re-entry, rebuilt the `v8` design/call-stack basis, and restarted Stage 6 from this baseline |

### Implementation Work Updates

| Change ID | Last Failure Classification | Last Failure Investigation Required | Cross-Reference Smell | Design Follow-Up | Requirement Follow-Up | Last Verified | Verification Command | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | `N/A` | `No` | `main.ts <-> shell host extraction` | `Resolved` | `Not Needed` | `2026-04-01` | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web transpile-electron` | shell host/registry extracted and preview-runtime registration moved out of ad hoc `main.ts` state |
| C-002 | `N/A` | `No` | `preview session owner <-> shell host bounds` | `Resolved` | `Not Needed` | `2026-04-01` | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web exec vitest --config ./electron/vitest.config.ts run electron/preview/__tests__/preview-session-manager.spec.ts` | preview sessions now own `WebContentsView`, console, screenshots, JS, DevTools, and bounded tombstones |
| C-003 | `N/A` | `No` | `shell projection owner <-> session owner` | `Resolved` | `Not Needed` | `2026-04-01` | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web exec vitest --config ./electron/vitest.config.ts run electron/preview/__tests__/preview-shell-controller.spec.ts` | `PreviewShellController` is the single source of shell snapshot truth and attach/detach behavior |
| C-004 | `N/A` | `No` | `runtime startup <-> legacy popup path` | `Resolved` | `Not Needed` | `2026-04-01` | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web transpile-electron` | preview runtime now boots session owner + shell controller; `preview-window-factory.ts` removed |
| C-005 | `N/A` | `No` | `preload bridge <-> shell snapshot contract` | `Resolved` | `Not Needed` | `2026-04-01` | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web transpile-electron` | preload exposes focused snapshot/focus/select/close/bounds APIs only |
| C-006 | `N/A` | `No` | `tool result stream <-> renderer preview tab state` | `Resolved` | `Not Needed` | `2026-04-01` | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web exec vitest run services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts stores/__tests__/previewShellStore.spec.ts components/layout/__tests__/RightSideTabs.spec.ts` | renderer preview tab is lazy and snapshot-driven; tool success only requests focus |
| C-007 | `N/A` | `No` | `server preview contract <-> bridge routes` | `Resolved` | `Not Needed` | `2026-04-01` | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec vitest run tests/unit/agent-tools/preview/register-preview-tools.test.ts tests/unit/agent-tools/preview/preview-bridge-client.test.ts` | added JS and DevTools actions without widening the canonical session contract |
| C-008 | `N/A` | `No` | `runtime adapter parity` | `Resolved` | `Not Needed` | `2026-04-01` | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts` | Codex and Claude adapters now expose the same seven preview actions when preview is supported |

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/in-progress/preview-session-multi-runtime-design/api-e2e-testing.md` | `Blocked` | `2026-04-01` | Round 2 resolved the live runtime failures in `AV-001`; desktop-shell executable validation for lazy Preview tab behavior and recovery is still outstanding. |
| 8 Code Review | `tickets/in-progress/preview-session-multi-runtime-design/code-review.md` | `Not Started` | `2026-04-01` | Main risk areas are shell host extraction, preview-session manager refactor, and renderer/main shell-boundary discipline. |
| 9 Docs Sync | `tickets/in-progress/preview-session-multi-runtime-design/docs-sync.md` | `Not Started` | `2026-04-01` | Product docs will need to describe the shell-tab preview behavior instead of popup windows. |
