# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `3`
- Trigger Stage: `Re-entry`
- Prior Round Reviewed: `1`
- Latest Authoritative Round: `3`

## Testing Scope

- Ticket: `preview-popup-tab-browser-behavior`
- Scope classification: `Medium`
- Workflow state source: [workflow-state.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/workflow-state.md)
- Requirements source: [requirements.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/requirements.md)
- Call stack source: [future-state-runtime-call-stack.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/future-state-runtime-call-stack.md)
- Design source (`Medium/Large`): [proposed-design.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/proposed-design.md)
- Interface/system shape in scope: `Native Desktop UI`, `Integration`
- Platform/runtime targets: `Electron preview runtime`, `Preview shell projection`
- Lifecycle boundaries in scope (`Install` / `Startup` / `Update` / `Restart` / `Migration` / `Shutdown` / `Recovery` / `None`): `None`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - [preview-session-manager.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/__tests__/preview-session-manager.spec.ts)
  - [preview-shell-controller.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/__tests__/preview-shell-controller.spec.ts)
  - [preview-view-factory.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/__tests__/preview-view-factory.spec.ts)
- Temporary validation methods or setup to use only if needed: `None`
- Cleanup expectation for temporary validation: `N/A`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | No | Popup/browser behavior is proven through durable Electron validation; embedded provider acceptance remains documented as best-effort, not guaranteed |
| 2 | Re-entry | Yes | No | Pass | No | bounded-popup policy was added and proven after Stage 8 local-fix review feedback |
| 3 | Re-entry | Yes | No | Pass | Yes | packaged-user verification exposed the Electron popup `createWindow(options)` contract bug; the local fix adopted Electron-provided popup `webContents`, reran the preview Electron suite, and the user verified the packaged fix |

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 / R-002 / R-003 | `window.open()` creates another in-app Preview tab/session instead of a denied popup | AV-001, AV-002 | Passed | 2026-04-02 |
| AC-002 | R-002 / R-003 / R-007 | opener tab remains usable and popup-created tab can be focused and closed through the Preview shell | AV-002 | Passed | 2026-04-02 |
| AC-003 | R-004 | popup-created sessions stay on the same persisted Electron browser profile | AV-003 | Passed | 2026-04-02 |
| AC-004 | R-001 / R-002 / R-003 / R-005 | one realistic popup-driven site flow is validated through the Preview shell | AV-004 | Passed | 2026-04-02 |
| AC-005 | R-006 | remaining embedded OAuth limits are documented truthfully | AV-005 | Passed | 2026-04-02 |
| AC-006 | R-004 / R-005 | follow-up tools continue to work against popup-created tabs by `preview_session_id` | AV-001 | Passed | 2026-04-02 |
| AC-007 | R-007 | non-stealable shell lease rule is preserved | AV-006 | Passed | 2026-04-02 |

## Spine Coverage Matrix (Mandatory)

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `PreviewSessionManager` + `PreviewShellController` | AV-001, AV-002, AV-004 | Passed | popup requests become in-app Preview tabs and stay on the opener shell |
| DS-002 | Return-Event | `PreviewShellController` | AV-002, AV-004 | Passed | popup-opened event activates the child tab and closing it returns focus to the opener |
| DS-003 | Bounded Local | `PreviewSessionManager` | AV-001, AV-003 | Passed | popup decision and child-session creation stay inside the session owner |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001, DS-003 | Requirement | AC-001, AC-006 | R-001, R-002, R-004, R-005 | UC-001, UC-002 | Integration | Electron preview runtime | None | Prove popup requests create a real child Preview session and that popup-created sessions still accept follow-up tool operations by `preview_session_id` | popup request returns `allow + createWindow`, child session is listed, and `read_page` works on the child session | [preview-session-manager.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/__tests__/preview-session-manager.spec.ts) | None | `pnpm vitest run electron/preview/__tests__/preview-session-manager.spec.ts --config ./electron/vitest.config.ts` | Passed |
| AV-002 | DS-001, DS-002 | Requirement | AC-001, AC-002 | R-001, R-002, R-003, R-007 | UC-001, UC-002 | Integration | Electron preview shell projection | None | Prove the opener shell auto-activates popup-created tabs and can close them without losing the opener tab | child tab becomes active in the same shell and closing it returns the shell to the opener tab | [preview-shell-controller.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/__tests__/preview-shell-controller.spec.ts) | None | `pnpm vitest run electron/preview/__tests__/preview-shell-controller.spec.ts --config ./electron/vitest.config.ts` | Passed |
| AV-003 | DS-003 | Requirement | AC-003 | R-004 | UC-001, UC-002 | Integration | Electron preview view factory | None | Prove popup-created tabs stay on the default Electron session/profile that Preview already uses | preview views are created without custom `partition` or `session` overrides, so opener and child views stay on the same default Electron profile | [preview-view-factory.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/__tests__/preview-view-factory.spec.ts) | None | `pnpm vitest run electron/preview/__tests__/preview-view-factory.spec.ts --config ./electron/vitest.config.ts` | Passed |
| AV-004 | DS-001, DS-002 | Design-Risk | AC-004 | R-001, R-002, R-003, R-005 | UC-001 | Integration | Electron preview runtime + shell projection | None | Prove a realistic X -> Google popup-auth shape crosses the Preview shell end to end even if the provider may still reject embedded login later | opener URL `https://x.com/` plus Google OAuth popup URL produces a Preview child tab under the opener shell | [preview-session-manager.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/__tests__/preview-session-manager.spec.ts), [preview-shell-controller.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/__tests__/preview-shell-controller.spec.ts) | None | `pnpm vitest run electron/preview/__tests__/preview-session-manager.spec.ts electron/preview/__tests__/preview-shell-controller.spec.ts --config ./electron/vitest.config.ts` | Passed |
| AV-005 | DS-001 | Design-Risk | AC-005 | R-006 | UC-001 | Other | Ticket truthfulness | None | Record the residual embedded OAuth limit truthfully instead of masking it as a product bug | ticket artifacts explicitly document that provider-side embedded OAuth rejection may still occur even after popup support is added | [investigation-notes.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/investigation-notes.md), [requirements.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/requirements.md) | None | artifact review | Passed |
| AV-006 | DS-002 | Requirement | AC-007 | R-007 | UC-001, UC-002 | Integration | Electron preview shell projection | None | Prove popup support does not reopen the old session-stealing bug | an already leased preview session still cannot be stolen by another shell, and popup-created child sessions are leased only to the opener shell | [preview-shell-controller.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/__tests__/preview-shell-controller.spec.ts) | None | `pnpm vitest run electron/preview/__tests__/preview-shell-controller.spec.ts --config ./electron/vitest.config.ts` | Passed |
| AV-007 | DS-003 | Requirement | N/A | R-009 | UC-001, UC-002 | Integration | Electron preview runtime | None | Prove popup support stays bounded instead of allowing uncontrolled child-tab fan-out | popup requests are denied when the opener is not leased into a shell and popup fan-out is capped per opener session | [preview-session-manager.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/__tests__/preview-session-manager.spec.ts) | None | `pnpm vitest run electron/preview/__tests__/preview-session-manager.spec.ts --config ./electron/vitest.config.ts` | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| [preview-session-manager.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/__tests__/preview-session-manager.spec.ts) | Harness | Yes | AV-001, AV-004, AV-007 | added popup child-session creation coverage, popup-child read-page verification, unleased-opener denial, and popup fan-out cap coverage |
| [preview-shell-controller.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/__tests__/preview-shell-controller.spec.ts) | Harness | Yes | AV-002, AV-004, AV-006 | added opener-shell activation and popup-child close/fallback verification |
| [preview-view-factory.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/__tests__/preview-view-factory.spec.ts) | Harness | Yes | AV-003 | proves Preview does not override Electron session/profile selection |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | No | N/A |

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario ID | Previous Classification | Current Resolution (`Resolved`/`Partially Resolved`/`Still Failing`/`Not Applicable After Rework`) | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | Not Applicable After Rework | Round 1 had no Stage 7 failure; the rerun exists because Stage 8 reopened Stage 6 for a bounded-popup local fix | Stage 7 coverage was strengthened rather than repaired |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required (`Yes`/`No`) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies): `No provider credentials were used in this round; provider-side OAuth acceptance remains intentionally out of scope for guaranteed automation coverage`
- Platform/runtime specifics for lifecycle-sensitive scenarios (OS/device/runtime/version `from` -> `to`/package channel or update feed/signing/access requirements): `Electron preview runtime on macOS arm64 workspace`
- Compensating automated evidence: `popup creation, shell activation, popup-child close, and default-profile invariants are all covered by durable Electron tests`
- Residual risk notes: `Google or other identity providers may still reject embedded login after popup support is added; this is a provider policy limit, not the old in-app popup block`
- Human-assisted execution steps required because of platform or OS constraints (`Yes`/`No`): `No`
- If `Yes`, exact steps and evidence capture: `N/A`
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- If `Yes`, waiver reference (date/user decision): `N/A`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`
- If retained, why it remains useful as durable coverage: `All added validation remains useful as durable preview coverage`

## Stage 7 Gate Decision

- Latest authoritative round: `3`
- Latest authoritative result (`Pass`/`Fail`/`Blocked`): `Pass`
- Stage 7 complete: `Yes`
- Durable executable validation that should live in the repository was implemented or updated: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant spines mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- All executable relevant spines status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Temporary validation-only scaffolding cleaned up or intentionally retained with rationale: `Yes`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes: `This round proves the popup/browser boundary inside Preview is fixed, including the packaged-app popup guest-webContents adoption bug discovered during user verification. Provider-side embedded OAuth acceptance remains a documented best-effort limitation rather than a hidden product guarantee.`
