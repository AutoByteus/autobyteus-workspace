# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning: the change extends the existing Preview subsystem across lifecycle, shell projection, and executable validation, but it does not require a new top-level subsystem.
- Workflow Depth:
  - `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review -> `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: [workflow-state.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/workflow-state.md)
- Investigation notes: [investigation-notes.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/investigation-notes.md)
- Requirements: [requirements.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/requirements.md)
  - Current Status: `Design-ready`
- Runtime call stacks: [future-state-runtime-call-stack.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/future-state-runtime-call-stack.md)
- Future-state runtime call stack review: [future-state-runtime-call-stack-review.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/future-state-runtime-call-stack-review.md)
- Proposed design: [proposed-design.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/proposed-design.md)

## Document Status

- Current Status: `Local Fix Implemented`
- Notes: The popup child session is now created inside Electron's `createWindow(options)` callback and adopts Electron-provided popup `webContents`. Downstream Stage 7/8/9 reruns are still pending.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch

- Use Cases In Scope: `UC-001 X + Google popup auth`, `UC-002 generic window.open() new tab`
- Spine Inventory In Scope: `DS-001 popup-to-preview-tab primary flow`, `DS-002 popup-opened return/event spine`, `DS-003 session-manager bounded local popup decision flow`
- Primary Owners / Main Domain Subjects: `PreviewSessionManager`, `PreviewShellController`, `PreviewViewFactory`
- Requirement Coverage Guarantee: all refined requirements map to at least one use case and one Stage 7 scenario
- Design-Risk Use Cases: `UC-001` because embedded OAuth remains provider-dependent even after popup support is added
- Target Architecture Shape: the preview view forwards popup requests to the session owner; the session owner accepts them through Electron `createWindow(...)`, creates child sessions and child `webContents`, and emits popup-opened events; the shell controller attaches child sessions to the opener shell and activates them as Preview tabs
- New Owners/Boundary Interfaces To Introduce: callback contract from `PreviewViewFactory` to `PreviewSessionManager`, popup-opened event from `PreviewSessionManager` to `PreviewShellController`
- Primary file/task set: see `Implementation Work Table`
- API/Behavior Delta: popup/new-window requests no longer hard-fail; accepted popup requests become Preview tabs through Electron’s real popup boundary
- Key Assumptions: Electron `window.open` interception plus `createWindow(...) => WebContents` remains sufficient for the targeted popup flows
- Known Risks: provider-side embedded OAuth rejection may remain even when popup support is working correctly

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Fail | Yes | No | Yes | Design Impact | `3 -> 4 -> 5` | Reset | 0 |
| 2 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 3 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `3`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: implement popup callback and session-lifecycle support before shell/controller adaptation.
- Test-driven: extend focused unit/Electron tests before or with the implementation.
- Spine-led implementation rule: sequence work by popup lifecycle owner first, then shell projection, then renderer/test validation.
- Mandatory modernization rule: remove the old blanket popup deny behavior.
- Mandatory cleanup rule: no dormant duplicate popup policy paths remain in scope.
- Mandatory ownership/decoupling/SoC rule: keep popup lifecycle in `PreviewSessionManager` and shell projection in `PreviewShellController`.
- Mandatory `Authoritative Boundary Rule`: no direct shell-controller dependency from `PreviewViewFactory`.
- Mandatory file-placement rule: keep all popup implementation inside the existing `preview` capability area unless the concern clearly belongs to `shell`.
- Mandatory proactive size-pressure rule: touched source files are currently under the 500-line source limit and must stay there.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-003 | `PreviewViewFactory` + `PreviewSessionManager` | popup callback wiring and popup lifecycle handling through `createWindow(...)` | N/A | real popup semantics must exist before shell projection can react to it |
| 2 | DS-001 / DS-002 | `PreviewShellController` | attach popup-created sessions to opener shell and activate tab | Order 1 | shell logic depends on popup-created sessions/events |
| 3 | DS-002 | Renderer Preview projection | verify snapshot-driven tab rendering still works for popup-created sessions | Order 2 | renderer only needs the final snapshot behavior |
| 4 | DS-001 / DS-002 / DS-003 | Validation | focused unit/Electron/live scenario updates | Orders 1-3 | prove popup-to-tab behavior and best-effort OAuth evidence |

### File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| preview popup callback wiring | `autobyteus-web/electron/preview/preview-view-factory.ts` | same | preview native view creation | Keep / Modify | view factory stays a thin adapter |
| popup-created session lifecycle | `autobyteus-web/electron/preview/preview-session-manager.ts` | same | preview session lifecycle | Keep / Modify | manager remains authoritative boundary |
| popup shell activation | `autobyteus-web/electron/preview/preview-shell-controller.ts` | same | preview shell projection | Keep / Modify | controller remains shell authority |
| popup request shared types | `autobyteus-web/electron/preview/preview-session-types.ts` | same | preview shared internal types | Keep / Modify | no cross-subsystem promotion needed |

### Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-001 | DS-003 | `PreviewSessionManager` | popup request lifecycle, child session creation, and child `webContents` return | `autobyteus-web/electron/preview/preview-session-manager.ts` | same | Modify | N/A | Completed | `autobyteus-web/electron/preview/__tests__/preview-session-manager.spec.ts` | Passed | N/A | N/A | Planned | popup requests now create child sessions, emit `popup-opened`, deny unleased openers, and cap popup fan-out per opener |
| T-002 | DS-003 | `PreviewViewFactory` | forward popup requests through `allow + createWindow(...)` instead of blanket deny | `autobyteus-web/electron/preview/preview-view-factory.ts` | same | Modify | T-001 | Completed | `autobyteus-web/electron/preview/__tests__/preview-view-factory.spec.ts` | Passed | N/A | N/A | Planned | factory is adapter-only and intentionally leaves Electron on the default session profile |
| T-003 | DS-001 / DS-002 | `PreviewShellController` | lease popup-created session into opener shell and activate it | `autobyteus-web/electron/preview/preview-shell-controller.ts` | same | Modify | T-001 | Completed | `autobyteus-web/electron/preview/__tests__/preview-shell-controller.spec.ts` | Passed | N/A | N/A | Planned | popup-created child tabs auto-activate in the opener shell without violating the lease rule |
| T-004 | DS-002 | Renderer Preview UI/store | confirm popup-created sessions render as tabs from snapshot | renderer Preview files | same | Modify if needed | T-003 | Completed | renderer Preview tests | N/A | N/A | N/A | Planned | existing snapshot-driven renderer behavior required no source changes after shell-controller activation wiring |
| T-005 | DS-001 / DS-002 / DS-003 | Validation | popup/new-tab and best-effort OAuth evidence | tests + executable artifacts | same | Modify | T-001, T-002, T-003 | In Progress | focused preview/Electron tests | Passed | live/manual scenario artifact | Passed | Planned | local-fix re-entry requires rerunning Stage 7 after bounded popup policy is added |

### Requirement, Spine, And Design Traceability

| Requirement | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 / R-002 | DS-001 / DS-003 | Data-Flow Spine Inventory, Ownership Map | UC-001, UC-002 | T-001, T-002, T-003 | Focused preview/Electron tests | AV-001 |
| R-003 | DS-001 | Requirements / Invariants | UC-001, UC-002 | T-001 | Focused preview/Electron tests | AV-002 |
| R-004 | DS-002 | Return/Event Spine | UC-002 | T-003, T-004 | Preview tab rendering tests | AV-003 |
| R-005 | DS-001 | Current-State Read / Failure Paths | UC-001 | T-005 | Executable evidence + docs note | AV-004 |
| R-006 | DS-001 / DS-002 | Ownership Map / Dependency Rules | UC-001, UC-002 | T-003 | Shell controller tests | AV-005 |

### Step-By-Step Plan

1. Add popup lifecycle support to the session owner and remove blanket popup deny behavior.
2. Attach popup-created sessions to the opener shell through the shell controller.
3. Adjust renderer projection only if current snapshot-driven tab rendering needs it.
4. Run focused preview/Electron tests.
5. Run executable validation for popup/new-tab behavior and best-effort OAuth evidence.

## Execution Tracking (Update Continuously)

### Progress Log

- 2026-04-02: Stage 6 baseline refreshed after design-impact re-entry and Stage 5 `Go Confirmed`
- 2026-04-02: Implemented popup-owned child-session creation in `PreviewSessionManager` and removed the blanket popup deny from `PreviewViewFactory`
- 2026-04-02: Implemented opener-shell activation for popup-created tabs in `PreviewShellController` without changing the renderer preview projection path
- 2026-04-02: Validation passed for `pnpm transpile-electron` and `pnpm vitest run electron/preview/__tests__/preview-*.spec.ts --config ./electron/vitest.config.ts` (`4` files, `14` tests)
- 2026-04-02: Stage 8 local-fix re-entry reopened implementation to add a bounded popup policy after independent review found unrestricted popup fan-out
- 2026-04-02: Added bounded popup policy in `PreviewSessionManager` (deny unleased opener sessions, cap popup fan-out per opener) and reran `pnpm transpile-electron` plus the preview Electron suite (`4` files, `16` tests)
- 2026-04-02: Stage 10 packaged-user verification found a main-process `Invalid webContents` crash on X and LinkedIn Google-login popups because the popup child session was still created outside Electron's `createWindow(options)` adoption contract
- 2026-04-02: Fixed the popup contract bug by adopting Electron-provided popup `webContents` inside `PreviewViewFactory` / `PreviewSessionManager`, strengthened the test doubles to enforce the real Electron contract, reran `pnpm transpile-electron`, and reran the preview Electron suite (`4` files, `17` tests)
- 2026-04-02: Built a fresh personal mac package after the fix: `AutoByteus_personal_macos-arm64-1.2.52.dmg` / `.zip`

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/in-progress/preview-popup-tab-browser-behavior/api-e2e-testing.md` | Pass (stale after re-entry) | 2026-04-02 | rerun required after the bounded-popup local fix lands |
| 8 Code Review | `tickets/in-progress/preview-popup-tab-browser-behavior/code-review.md` | Fail | 2026-04-02 | round 1 found missing bounded popup policy |
| 9 Docs Sync | `tickets/in-progress/preview-popup-tab-browser-behavior/docs-sync.md` | Not Started | N/A | pending implementation |

### Completion Gate

- Stage 6 implementation execution complete: `Yes`
- Downstream stage authority stays in Stage 7/8/9 artifacts once created.
