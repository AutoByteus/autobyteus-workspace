# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `2`
- Trigger Stage: `Re-entry`
- Prior Round Reviewed: `1`
- Latest Authoritative Round: `2`

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
  - `Recovery`
  - `None`

## Coverage Rules

- Every critical requirement must map to at least one scenario.
- Every in-scope acceptance criterion (`AC-*`) must map to at least one executable scenario.
- Every in-scope use case must map to at least one scenario, or explicitly `N/A` with rationale.
- Every relevant spine from the approved design basis must map to at least one scenario, or explicitly `N/A` with rationale.
- `Design-Risk` scenarios must include explicit technical objective/risk and expected outcome.
- Use stable scenario IDs with `AV-` prefix.
- No user waiver exists yet for any executable gap.

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - rerun and, if needed, extend the existing live runtime integration tests for Codex and Claude preview invocation
  - add desktop-shell executable validation only if the current unit/integration mix proves insufficient for Stage 7 closure
- Temporary validation methods or setup to use only if needed:
  - local packaged Electron app launch plus log capture
  - human-assisted desktop smoke only if native desktop automation is not feasible in the current environment
- Cleanup expectation for temporary validation:
  - no temporary harness should remain unless it becomes useful as durable desktop validation

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | `N/A` | `Yes` | `Fail` | `Yes` | Live runtime preview validation ran. Codex did not emit canonical preview tool lifecycle events or reach the preview bridge, and Claude emitted prefixed MCP tool names instead of the canonical preview tool name. Desktop-shell executable validation is still pending after the runtime-path fix. |
| 2 | Stage 7 local-fix re-entry | `Yes` | `No` | `Blocked` | `Yes` | Live Codex and Claude `open_preview` reruns now pass and the current mac Electron artifact was built successfully. Stage 7 remains blocked only on user-assisted shell-visible validation of the lazy right-side Preview tab behavior in the packaged app. |

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-006 | Electron main remains the authoritative owner for preview session and shell projection lifecycle | AV-003 | Not Run | 2026-04-01 |
| AC-002 | R-002, R-003 | outer Preview tab appears lazily and hides when no sessions remain | AV-004, AV-005 | Not Run | 2026-04-01 |
| AC-003 | R-001, R-004 | each preview session maps to one internal tab and independent browser control | AV-002, AV-006 | Not Run | 2026-04-01 |
| AC-004 | R-004, R-008 | per-session screenshot, console, JS, and DevTools remain available after the shell-tab move | AV-006, AV-007 | Not Run | 2026-04-01 |
| AC-005 | R-005, R-010 | all runtimes preserve one preview-session contract | AV-001, AV-007 | Blocked | 2026-04-01 |
| AC-006 | R-006, R-007 | renderer/main coordination is bounded and snapshot-driven | AV-003, AV-009 | Not Run | 2026-04-01 |
| AC-007 | R-001, R-003, R-009 | close semantics and shell recovery are deterministic | AV-005, AV-009 | Not Run | 2026-04-01 |
| AC-008 | R-002, R-011 | popup preview-window behavior is removed from the normal flow | AV-004, AV-008 | Not Run | 2026-04-01 |

## Spine Coverage Matrix

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | runtime adapter + `PreviewToolService` | AV-001, AV-007 | Blocked | runtime open-preview parity now passes; remaining blocker is broader live shell/session-tool validation |
| DS-002 | Primary End-to-End | `PreviewToolService` + bridge client | AV-001, AV-002, AV-006, AV-007 | Blocked | live runtime evidence now proves canonical bridge reach for `open_preview`; shell-visible desktop validation still pending |
| DS-003 | Primary End-to-End | `PreviewSessionManager` | AV-002, AV-006, AV-007 | Blocked | canonical session-owner path is reached for `open_preview`, but shell-visible and per-session diagnostic behaviors still need live validation |
| DS-004 | Return-Event | `PreviewShellController` | AV-003, AV-004, AV-009 | Planned | shell projection is derived from authoritative snapshots |
| DS-005 | Return-Event | preload bridge + renderer preview store | AV-003, AV-004, AV-005, AV-009 | Planned | renderer uses bounded IPC and does not recreate shell truth |
| DS-006 | Bounded Local | `PreviewShellController` | AV-004, AV-005, AV-008, AV-009 | Planned | session close, shell hide, and legacy popup removal behavior |
| DS-007 | Bounded Local | `PreviewSessionManager` | AV-002, AV-006, AV-007 | Planned | session registry invariants and diagnostics stay per-session |
| DS-008 | Bounded Local | shell host / registry | AV-003, AV-009 | Planned | shell identity and host bounds stay main-process-owned |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001, DS-002, DS-003 | Requirement | AC-005 | R-005, R-010 | UC-001, UC-003, UC-004 | Integration | Codex + Claude runtimes | None | prove real runtime tool exposure and invocation still reach the preview bridge after the shell-tab refactor | runtime emits preview tool execution and returns canonical `preview_session_id` results | `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts`, `autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` | env-gated live runtime execution | `RUN_CODEX_E2E=1 pnpm exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Codex preview dynamic tool path'`; `RUN_CLAUDE_E2E=1 pnpm exec vitest run tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Claude preview MCP path'` | Passed |
| AV-002 | DS-002, DS-003, DS-007 | Requirement | AC-003 | R-001, R-004 | UC-002, UC-006 | Desktop-UI | Electron shell | None | prove multiple preview sessions remain independent browser controls under one outer Preview tab | two preview sessions coexist as internal tabs and switching tabs reattaches the correct content | pending desktop-shell executable validation | local packaged Electron smoke if needed | packaged app launch + agent-issued `open_preview` commands | Not Started |
| AV-003 | DS-004, DS-005, DS-008 | Design-Risk | AC-001, AC-006 | R-006, R-007 | UC-005, UC-010 | Desktop-UI | Electron shell | Startup | prove Electron main remains authoritative for shell projection and host identity | preview host attaches only through main-process shell state; renderer reload does not fork shell truth | pending desktop-shell executable validation | local packaged Electron smoke if needed | packaged app startup + preview tab observation | Not Started |
| AV-004 | DS-004, DS-005, DS-006 | Requirement | AC-002, AC-008 | R-002, R-003, R-011 | UC-005, UC-008 | Desktop-UI | Electron shell | None | prove lazy tab appearance/hide and confirm popup preview windows are gone from normal flow | Preview tab appears only after focus and disappears when last session closes; no separate OS preview window appears | pending desktop-shell executable validation | packaged app smoke | packaged app + `open_preview` / `close_preview` flow | Not Started |
| AV-005 | DS-005, DS-006 | Requirement | AC-002, AC-007 | R-003, R-009 | UC-007, UC-008 | Desktop-UI | Electron shell | None | prove close semantics remain deterministic in shell-tab mode | closing the active preview session updates snapshots, removes internal tab state, and hides the outer tab when empty | pending desktop-shell executable validation | packaged app smoke | packaged app + repeated close/reopen flow | Not Started |
| AV-006 | DS-002, DS-003, DS-007 | Requirement | AC-003, AC-004, AC-007 | R-001, R-004, R-008, R-009 | UC-006, UC-009 | API | preview bridge + Electron session owner | None | prove screenshot, console, JS, and session isolation still operate on the correct `preview_session_id` | preview diagnostic tools operate per-session without leaking between internal tabs | pending executable bridge/session harness | local preview bridge execution if needed | existing preview bridge + tool service path | Not Started |
| AV-007 | DS-001, DS-002, DS-003, DS-007 | Requirement | AC-004, AC-005 | R-004, R-005, R-008, R-010 | UC-006 | API | server preview tool layer + runtime adapters | None | prove JS and DevTools additions are exposed consistently across runtimes | seven preview tools are exposed when preview is supported and return canonical result/error shapes | existing Codex/Claude unit coverage plus live runtime integration rerun | env-gated live runtime execution | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts tests/unit/agent-tools/preview/register-preview-tools.test.ts`; `RUN_CODEX_E2E=1 pnpm exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Codex preview dynamic tool path'`; `RUN_CLAUDE_E2E=1 pnpm exec vitest run tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Claude preview MCP path'` | Blocked |
| AV-008 | DS-006 | Requirement | AC-008 | R-011 | UC-008 | Desktop-UI | Electron shell | None | prove popup-window normal flow is fully removed | no preview action creates a standalone preview `BrowserWindow`; shell-tab behavior is the only normal flow | pending desktop-shell executable validation | packaged app smoke | packaged app + preview open/close observation | Not Started |
| AV-009 | DS-004, DS-005, DS-006, DS-008 | Design-Risk | AC-006, AC-007 | R-006, R-007, R-009 | UC-011 | Desktop-UI | Electron shell | Recovery | prove renderer reload/reconnect rebuilds preview UI from snapshots instead of tool replay | reloaded renderer restores the Preview tab/session list from `PreviewShellController` snapshots | pending desktop-shell executable validation | renderer reload inside running app if feasible | packaged app + renderer reload/reconnect harness | Not Started |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` | `Integration` | `Yes` | `AV-001`, `AV-007` | rerun live on `2026-04-01`; passed for `open_preview` after the runtime-event normalization fix |
| `autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` | `Integration` | `Yes` | `AV-001`, `AV-007` | rerun live on `2026-04-01`; passed for `open_preview` after preview MCP tool-name normalization |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| `RUN_CODEX_E2E=1 pnpm exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Codex preview dynamic tool path'` | prove the real Codex runtime path for `open_preview` without requiring manual desktop interaction | `AV-001`, `AV-007` | `No` | `N/A` |
| `RUN_CLAUDE_E2E=1 pnpm exec vitest run tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Claude preview MCP path'` | prove the real Claude runtime path for `open_preview` without requiring manual desktop interaction | `AV-001`, `AV-007` | `No` | `N/A` |
| `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web build:electron:mac` | produce a current mac desktop artifact for later shell-tab smoke validation | `AV-002`, `AV-003`, `AV-004`, `AV-005`, `AV-008`, `AV-009` | `No` | `N/A` |

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Failure ID | Original Round | Rechecked In Round | Resolution Status (`Resolved`/`Still Failing`/`Not Rechecked`) | Evidence |
| --- | --- | --- | --- | --- |
| `AV-001` | `1` | `2` | `Resolved` | `RUN_CODEX_E2E=1 pnpm exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Codex preview dynamic tool path'`; `RUN_CLAUDE_E2E=1 pnpm exec vitest run tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Claude preview MCP path'` |
| `AV-007` | `1` | `2` | `Resolved` | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts tests/unit/agent-tools/preview/register-preview-tools.test.ts`; `RUN_CODEX_E2E=1 pnpm exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Codex preview dynamic tool path'`; `RUN_CLAUDE_E2E=1 pnpm exec vitest run tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Claude preview MCP path'` |

## Failure Escalation Log

| 2026-04-01 | AV-001 | Codex live preview dynamic-tool validation failed: the run produced a `tool_call` segment and text response but never emitted canonical `TOOL_EXECUTION_STARTED` / `TOOL_EXECUTION_SUCCEEDED` events for `open_preview`, so the executable bridge-reach proof could not complete. | `Yes` | `Local Fix` | `6 -> 7` | `No` | `No` | `No` | `No` | `N/A` | `No` |
| 2026-04-01 | AV-007 | Claude live preview MCP validation failed: the runtime emitted `TOOL_EXECUTION_SUCCEEDED` with tool name `mcp__autobyteus_preview__open_preview` and never emitted the canonical started event expected for `open_preview`. | `Yes` | `Local Fix` | `6 -> 7` | `No` | `No` | `No` | `No` | `N/A` | `No` |

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies):
  - live Codex and Claude scenarios require the env-gated runtime setup used by the existing integration suite; in this environment they can use existing local CLI login state and do not require direct API-key injection
  - desktop-shell scenarios require a running Electron app plus a way to capture shell-visible behavior
- Platform/runtime specifics for lifecycle-sensitive scenarios:
  - recovery scenario `AV-009` is currently mac desktop shell focused
- Compensating automated evidence:
  - Stage 6 already added/ran focused Electron/session/controller/store/runtime unit tests, but those do not close Stage 7 by themselves
- Residual risk notes:
  - shell-visible tab attachment and renderer-reload recovery are still unproven in a live app run
  - runtime-path validation is now green for `open_preview`, but live shell-visible preview-tab behavior still needs user-assisted confirmation in the packaged app
- Human-assisted execution steps required because of platform or OS constraints (`Yes`/`No`): `Potentially`
- If `Yes`, exact steps and evidence capture:
  - open the packaged Electron app
  - trigger `open_preview` twice from an agent
  - capture screenshots/logs showing lazy Preview tab behavior, internal tabs, and absence of standalone preview windows
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`
- If retained, why it remains useful as durable coverage: `N/A`

## Stage 7 Gate Decision

- Latest authoritative round: `2`
- Latest authoritative result (`Pass`/`Fail`/`Blocked`): `Blocked`
- Stage 7 complete: `No`
- Durable executable validation that should live in the repository was implemented or updated: `No`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant spines mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `No`
- All executable relevant spines status = `Passed`: `No`
- Critical executable scenarios passed: `No`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Temporary validation-only scaffolding cleaned up or intentionally retained with rationale: `Yes`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `No`
- Notes:
  - Round 2 cleared the prior runtime-event failures and rebuilt the mac Electron artifact successfully.
  - Stage 7 remains blocked only on live shell-visible validation of the right-side Preview tab behavior in the packaged app.
