# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `9`
- Trigger Stage: `Re-entry`
- Prior Round Reviewed: `7`
- Latest Authoritative Round: `9`

## Re-Entry Status

- Current authoritative executable-validation state: `Stage 7 Pass for v10`
- Historical note: round `7` remains the completed `v9` validation path only; round `9` below is the authoritative `v10` record
- Required next action before Stage 7 can close: `None`
- Canonical stage-control source: `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`

## Testing Scope

- Ticket: `preview-session-multi-runtime-design`
- Scope classification: `Large`
- Workflow state source: `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`
- Requirements source: `tickets/in-progress/preview-session-multi-runtime-design/requirements.md`
- Call stack source: `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`
- Interface/system shape in scope: `Native Desktop UI`, `Browser UI`, `Worker/Process`, `Other`
- Platform/runtime targets:
  - Electron desktop shell (`darwin` primary)
  - embedded server preview bridge
  - Codex runtime adapter
  - Claude runtime adapter
- Lifecycle boundaries in scope (`Install` / `Startup` / `Update` / `Restart` / `Migration` / `Shutdown` / `Recovery` / `None`):
  - `Startup`
  - `Shutdown`
  - `Recovery`
  - `None`

## Coverage Rules

- Every critical requirement must map to at least one scenario.
- Every in-scope acceptance criterion (`AC-*`) must map to at least one executable scenario.
- Every in-scope use case must map to at least one scenario, or explicitly `N/A` with rationale.
- Every relevant spine from the approved design basis must map to at least one scenario, or explicitly `N/A` with rationale.
- `Design-Risk` scenarios include explicit technical objective/risk and expected outcome.
- Use stable scenario IDs with `AV-` prefix.
- No user waiver exists for any executable gap.

## Validation Asset Strategy

- Durable validation assets updated in the repository:
  - preview tool contract, bridge, and registration unit suites for the eight-tool surface
  - Codex and Claude runtime-adapter preview exposure unit suites
  - Electron preview session-owner and shell-controller regression suites
  - renderer Preview panel/store/right-side-tab regression suites
  - live Codex and Claude `open_preview` integration tests
- Temporary validation methods used only where needed:
  - packaged Electron build artifact generation
  - user-assisted packaged-app smoke already performed on `2026-04-01` for shell-visible Preview-tab behavior
- Cleanup expectation for temporary validation:
  - no temporary harness remains; packaged-app smoke is retained only as historical evidence for the shell-visible behavior

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | `N/A` | `Yes` | `Fail` | `No` | Live runtime preview validation exposed Codex lifecycle normalization and Claude tool-name normalization gaps. |
| 2 | Re-entry | `Yes` | `No` | `Blocked` | `No` | Live runtime reruns passed; packaged-app shell-visible validation remained outstanding. |
| 3 | Re-entry | `Yes` | `Yes` | `Fail` | `No` | Packaged-app Codex result collapsed to `{ "success": true }`, so the Preview tab could not appear. |
| 4 | Re-entry | `Yes` | `Yes` | `Fail` | `No` | Preview tab appeared, but selecting it crashed the renderer with `undefined.length`. |
| 5 | Re-entry | `Yes` | `Yes` | `Fail` | `No` | Preview tab rendered, but app shutdown after preview use crashed Electron main. |
| 6 | Re-entry | `Yes` | `Yes` | `Fail` | `No` | Preview attachment triggered an unbounded responsiveness regression that froze the machine. |
| 7 | Re-entry | `Yes` | `No` | `Pass` | `Yes` | The shell-tab preview path was already user-validated after the boundedness fix, and the v9 follow-up change was contract-surface only: eight-tool contract tests, runtime exposure tests, Electron/renderer regressions, live Codex/Claude reruns, and fresh packaging all passed without reopening shell-projection files. |
| 8 | Re-entry | `Yes` | `Yes` | `Blocked` | `No` | The `v10` structural refactor passed focused server/Electron suites, Claude live preview execution, Electron production compile, and mac packaging. Live Codex preview reruns, and an unrelated live Codex normal-turn control run, both failed before any preview activity with repeated `RUNTIME_ERROR` reconnect events from the Codex app server. |
| 9 | Re-entry | `Yes` | `No` | `Pass` | `Yes` | The blocked Codex harness rerun was superseded by real packaged-app user validation on `2026-04-02`: Codex opened the Preview tab successfully in the installed personal app, so the executable user path is now proven for v10. |

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-006 | Electron main remains the authoritative owner for preview session and shell projection lifecycle | AV-003, AV-005 | Passed | 2026-04-01 |
| AC-002 | R-002, R-003 | outer Preview tab appears lazily and hides when no sessions remain | AV-004, AV-005 | Passed | 2026-04-01 |
| AC-003 | R-001, R-004 | each preview session maps to one internal tab and independent browser control | AV-002, AV-004 | Passed | 2026-04-01 |
| AC-004 | R-004, R-008 | session listing, page reading, DOM snapshot capture, screenshot capture, JavaScript execution, and close remain available after the shell-tab move | AV-002, AV-006 | Passed | 2026-04-01 |
| AC-005 | R-005, R-010 | all runtimes preserve one preview-session contract | AV-001, AV-006 | Passed | 2026-04-02 |
| AC-006 | R-006, R-007 | renderer/main coordination is bounded and snapshot-driven | AV-003, AV-005 | Passed | 2026-04-01 |
| AC-007 | R-001, R-003, R-009 | close semantics and shell recovery are deterministic | AV-002, AV-005 | Passed | 2026-04-01 |
| AC-008 | R-002, R-011 | popup preview-window behavior is removed from normal flow | AV-004 | Passed | 2026-04-01 |

## Spine Coverage Matrix

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | runtime adapter + `PreviewToolService` | AV-001, AV-006 | Passed | unit/runtime surface evidence is green, Claude live remains green, and packaged-app user validation proved the real Codex preview path end to end |
| DS-002 | Primary End-to-End | `PreviewToolService` + bridge client | AV-001, AV-002, AV-006 | Passed | bridge/client evidence is green and the packaged app proved the backend-to-shell open flow in the real user path |
| DS-003 | Primary End-to-End | `PreviewSessionManager` | AV-001, AV-002, AV-006 | Passed | session-owner regression coverage is green and packaged-app Codex validation confirmed the preview session owner opened and projected the session correctly |
| DS-004 | Return-Event | `PreviewShellController` | AV-003, AV-004, AV-005 | Passed | shell controller and packaged-app evidence show focus/projection remain main-owned and bounded |
| DS-005 | Return-Event | preload bridge + renderer preview store | AV-003, AV-004, AV-005 | Passed | renderer store/panel tests and packaged smoke prove snapshot-driven shell UI behavior |
| DS-006 | Bounded Local | `PreviewSessionManager` + `PreviewShellController` | AV-004, AV-005 | Passed | popup-window path is removed and close/hide behavior remains deterministic |
| DS-007 | Bounded Local | `PreviewSessionManager` | AV-002, AV-006 | Passed | session registry invariants remain per-session and contract-tight |
| DS-008 | Bounded Local | shell host / registry | AV-003, AV-005 | Passed | shell-host identity and attach/detach ordering remain bounded after the freeze fix |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001, DS-002, DS-003 | Requirement | AC-005 | R-005, R-010 | UC-001, UC-005 | Integration | Codex + Claude runtimes | None | prove real runtime tool exposure and invocation still reach the preview bridge after the eight-tool contract change | runtime emits canonical `open_preview` success with the returned `preview_session_id` and the preview bridge receives the open request | `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts`; `autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts`; packaged-app user screenshots from `2026-04-02` | none beyond env-gated local runtime execution | `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Codex preview dynamic tool path'`; `RUN_CLAUDE_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec vitest run tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Claude preview MCP path'`; user-installed packaged-app validation on `2026-04-02` | Passed |
| AV-002 | DS-002, DS-003, DS-007 | Requirement | AC-003, AC-004, AC-007 | R-001, R-004, R-008, R-009 | UC-002, UC-003, UC-007 | API | preview bridge + Electron session owner | None | prove follow-up preview operations remain session-oriented on the new eight-tool surface | list, read-page, DOM snapshot, screenshot, JavaScript, and close operate on the correct `preview_session_id` and preserve session cleanup semantics | `autobyteus-web/electron/preview/__tests__/preview-session-manager.spec.ts`; `autobyteus-server-ts/tests/unit/agent-tools/preview/preview-tool-contract.test.ts`; `autobyteus-server-ts/tests/unit/agent-tools/preview/preview-bridge-client.test.ts` | none | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web exec vitest run electron/preview/__tests__/preview-session-manager.spec.ts --config ./electron/vitest.config.ts`; `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec vitest run tests/unit/agent-tools/preview/preview-tool-contract.test.ts tests/unit/agent-tools/preview/preview-bridge-client.test.ts` | Passed |
| AV-003 | DS-004, DS-005, DS-008 | Design-Risk | AC-001, AC-006 | R-006, R-007 | UC-006 | Lifecycle | Electron shell | Startup, Recovery | prove main-process shell projection remains authoritative and bounded | host registration, snapshot publishing, and renderer projection remain bounded and main-owned | `autobyteus-web/electron/preview/__tests__/preview-shell-controller.spec.ts`; `autobyteus-web/stores/__tests__/previewShellStore.spec.ts`; `autobyteus-web/components/workspace/tools/__tests__/PreviewPanel.spec.ts`; `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts` | packaged-app smoke already performed before the v9 contract-only change | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web exec vitest run electron/preview/__tests__/preview-shell-controller.spec.ts --config ./electron/vitest.config.ts`; `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web exec vitest run components/workspace/tools/__tests__/PreviewPanel.spec.ts stores/__tests__/previewShellStore.spec.ts components/layout/__tests__/RightSideTabs.spec.ts` | Passed |
| AV-004 | DS-004, DS-005, DS-006 | Requirement | AC-002, AC-003, AC-008 | R-002, R-003, R-011 | UC-001, UC-003, UC-004, UC-008 | Desktop-UI | packaged Electron app | None | prove the shell-visible Preview tab behavior is correct and popup windows are gone | Preview appears inside the right-side shell, internal preview tabs render there, and no standalone preview window is part of the normal path | existing renderer/controller regression suites listed above plus packaged-app smoke history | user-installed packaged app smoke on `2026-04-01` after the boundedness fix | user-installed `1.2.50` app run with `open_preview` showing the shell-embedded Preview tab working | Passed |
| AV-005 | DS-004, DS-005, DS-006, DS-008 | Design-Risk | AC-001, AC-002, AC-006, AC-007 | R-003, R-006, R-007, R-009 | UC-004, UC-006 | Lifecycle | Electron shell | Shutdown, Recovery | prove cleanup and recovery remain deterministic after the earlier renderer crash, shutdown crash, and freeze fixes | closing, shutdown cleanup, unchanged-bounds handling, and identical-snapshot handling remain bounded with no destroyed-object access | `autobyteus-web/electron/preview/__tests__/preview-shell-controller.spec.ts`; `autobyteus-web/stores/__tests__/previewShellStore.spec.ts`; `autobyteus-web/components/workspace/tools/__tests__/PreviewPanel.spec.ts` | packaged-app smoke already validated the shell path after the final local fix; v9 did not modify shell projection files | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web exec vitest run electron/preview/__tests__/preview-shell-controller.spec.ts --config ./electron/vitest.config.ts`; `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web exec vitest run components/workspace/tools/__tests__/PreviewPanel.spec.ts stores/__tests__/previewShellStore.spec.ts` | Passed |
| AV-006 | DS-001, DS-002, DS-003, DS-007 | Requirement | AC-004, AC-005 | R-004, R-005, R-008, R-010 | UC-002, UC-005, UC-007 | API | server preview tool layer + runtime adapters | None | prove the stable eight-tool preview surface is exposed consistently across runtimes | the eight preview tools register/expose consistently and preserve canonical request/result semantics | `autobyteus-server-ts/tests/unit/agent-tools/preview/register-preview-tools.test.ts`; `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts`; `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts` | none | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec vitest run tests/unit/agent-tools/preview/register-preview-tools.test.ts tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts` | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-tools/preview/preview-tool-contract.test.ts` | `API Test` | `Yes` | `AV-002` | updated for read-page parsing and DOM-snapshot validation on the eight-tool surface |
| `autobyteus-server-ts/tests/unit/agent-tools/preview/preview-bridge-client.test.ts` | `API Test` | `Yes` | `AV-002` | updated for `/preview/list`, `/preview/read-page`, and `/preview/dom-snapshot` |
| `autobyteus-server-ts/tests/unit/agent-tools/preview/register-preview-tools.test.ts` | `API Test` | `Yes` | `AV-006` | now expects the stable eight preview tools only |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts` | `API Test` | `Yes` | `AV-006` | Codex runtime exposure updated to the eight-tool surface |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts` | `API Test` | `Yes` | `AV-006` | Claude runtime exposure updated to the eight-tool surface |
| `autobyteus-web/electron/preview/__tests__/preview-session-manager.spec.ts` | `Lifecycle Harness` | `Yes` | `AV-002` | now covers list/read-page/DOM snapshot behavior and closed-session handling |
| `autobyteus-web/electron/preview/__tests__/preview-shell-controller.spec.ts` | `Lifecycle Harness` | `Yes` | `AV-003`, `AV-005` | covers shell cleanup, unchanged bounds, and bounded preview attachment behavior |
| `autobyteus-web/stores/__tests__/previewShellStore.spec.ts` | `Harness` | `Yes` | `AV-003`, `AV-005` | proves identical snapshots are ignored instead of retriggering state churn |
| `autobyteus-web/components/workspace/tools/__tests__/PreviewPanel.spec.ts` | `Browser Test` | `Yes` | `AV-003`, `AV-005` | direct renderer coverage for preview-panel mount/snapshot behavior |
| `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts` | `Browser Test` | `Yes` | `AV-003` | protects lazy Preview-tab visibility in the shell UI |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` | `Integration` | `Yes` | `AV-001` | rerun live on `2026-04-02`; blocked by repeated Codex app-server reconnect errors before any preview tool event |
| `autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` | `Integration` | `Yes` | `AV-001` | rerun live on `2026-04-02`; passed |
| `/tmp/codex-preview-live-logs/codex-backend-preview-tool.json` | `Process Probe` | `No` | `AV-001` | captured the blocked Codex live preview run and shows only runtime reconnect errors, not preview-tool activity |
| `/tmp/codex-preview-live-logs/codex-backend-normal-turn.json` | `Process Probe` | `No` | `AV-001` | captured an unrelated blocked Codex live control run that failed with the same reconnect-only pattern |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web build:electron:mac` | produce the current mac artifact for the refactored shell-tab feature and confirm packaging still succeeds after the `v10` owner splits | `AV-004` | `No` | `N/A` |
| user-installed packaged app smoke on `2026-04-01` | validate the real shell-visible Preview-tab behavior after the final boundedness fix | `AV-004`, `AV-005` | `No` | `N/A` |

## Prior Failure Resolution Check

| Prior Round | Scenario ID | Previous Classification | Current Resolution (`Resolved`/`Partially Resolved`/`Still Failing`/`Not Applicable After Rework`) | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 6 | AV-004 | `Local Fix` | `Resolved` | user-installed packaged app smoke on `2026-04-01` showed the shell-embedded Preview tab working after the boundedness fix, and `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web build:electron:mac` completed successfully again on `2026-04-02` after the `v10` structural refactor | the `v10` refactor changed internal ownership, not the intended shell-visible behavior |
| 6 | AV-005 | `Local Fix` | `Resolved` | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web exec vitest run electron/preview/__tests__/preview-shell-controller.spec.ts --config ./electron/vitest.config.ts`; `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web exec vitest run components/workspace/tools/__tests__/PreviewPanel.spec.ts stores/__tests__/previewShellStore.spec.ts components/layout/__tests__/RightSideTabs.spec.ts --config ./electron/vitest.config.ts` | shutdown/boundedness regressions remain covered after the `v10` ownership split |
| 6 | AV-006 | `Not Applicable After Rework` | `Resolved` | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec vitest run tests/unit/agent-tools/preview/register-preview-tools.test.ts tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts` | the eight-tool surface is now owned by one shared manifest and remains consistent in runtime projections after the `v10` refactor |
| 7 | AV-001 | `Pass` | `Resolved` | `RUN_CLAUDE_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec vitest run tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Claude preview MCP path'`; `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Codex preview dynamic tool path'`; `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t 'converts status and assistant text segments for a normal Codex turn'`; user-installed packaged-app validation on `2026-04-02` | Claude remained green, the Codex live harness stayed unstable, but the real packaged-app Codex path was manually validated successfully and is authoritative for the executable user flow |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required (`Yes`/`No`) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-04-01 | AV-001 | Live runtime preview validation initially failed because Codex did not emit canonical preview lifecycle events and Claude emitted prefixed preview tool names. | `Yes` | `Local Fix` | `6 -> 7` | `No` | `No` | `No` | `No` | `N/A` | Yes |
| 2026-04-01 | AV-004 | Packaged-app validation initially failed because the Codex preview result collapsed to `{ "success": true }`, then because the Preview tab renderer crashed on mount. | `Yes` | `Local Fix` | `6 -> 7` | `No` | `No` | `No` | `No` | `N/A` | Yes |
| 2026-04-01 | AV-005 | Packaged-app validation later failed because shutdown cleanup touched destroyed Electron objects, then because preview attachment entered an unbounded responsiveness loop. | `Yes` | `Local Fix` | `6 -> 7` | `No` | `No` | `No` | `No` | `N/A` | Yes |
| 2026-04-01 | AV-006 | After the shell-tab path worked, the stable preview tool surface changed from seven tools to the reviewed eight-tool browser-style surface. | `No` | `Requirement Gap` | `2 -> 3 -> 4 -> 5 -> 6 -> 7` | `No` | `Yes` | `Yes` | `Yes` | `20` | Yes |

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario:
  - `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies):
  - live Codex and Claude scenarios rely on existing local CLI login state
  - the Codex live harness is currently unstable: repeated app-server sampling disconnects prevent completion of even a normal control run, but the packaged-app user path was validated successfully and is authoritative for the executable preview feature
  - packaged shell-visible validation on mac still requires a local installed app run
- Platform/runtime specifics for lifecycle-sensitive scenarios:
  - shell-visible preview behavior was validated on the packaged mac Electron app
- Compensating automated evidence:
  - the v9 contract change did not modify the shell-projection files; shell behavior remains covered by durable Electron/renderer regression tests plus the earlier packaged-app smoke
- Residual risk notes:
  - the standalone live Codex harness is still environmentally unstable, so future runtime-only debugging may need a separate Codex transport ticket if the instability matters outside preview validation
  - `read_preview_page` cleaning fidelity and DOM-snapshot richness may need later tuning if the product wants closer browser-MCP parity, but that is not a Stage 7 blocker for the current contract
- Human-assisted execution steps required because of platform or OS constraints (`Yes`/`No`): `Yes`
- If `Yes`, exact steps and evidence capture:
  - packaged app was opened locally
  - `open_preview` was triggered from the agent
  - the user provided screenshots showing the right-side Preview tab rendering the embedded Google page successfully after the final local fix
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`
- If retained, why it remains useful as durable coverage: `N/A`

## Stage 7 Gate Decision

- Latest authoritative round: `9`
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
- Notes:
  - The `v10` structural refactor validated locally: focused server suites passed, Electron regression suites passed, `pnpm transpile-electron` passed, Claude live preview passed, the mac Electron package rebuilt successfully, and packaged-app user validation confirmed that Codex opens and renders the shell-embedded Preview tab in the real product flow.
  - The separate live Codex harness remains environmentally unstable, but it no longer blocks Stage 7 because the executable user path is already proven with the installed app.
