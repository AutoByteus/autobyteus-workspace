# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `11`
- Trigger Stage: `Re-entry`
- Prior Round Reviewed: `10`
- Latest Authoritative Round: `11`
- Canonical stage-control source: `tickets/in-progress/preview-session-multi-runtime-design/workflow-state.md`

## Authoritative State

- Current authoritative executable-validation state: `Stage 7 Pass for v12`
- Why this round exists:
  - the `v12` re-entry changed ownership and contract strictness in the live preview path,
  - the earlier `v11` Stage 7 evidence was no longer sufficient after Stage 8 reopened,
  - the current round closes the prior thin-evidence gap by proving more than `open_preview` through the real Codex and Claude runtime adapter paths.

## Scope

- Ticket: `preview-session-multi-runtime-design`
- Surface under validation:
  - `open_preview`
  - `navigate_preview`
  - `close_preview`
  - `list_preview_sessions`
  - `read_preview_page`
  - `capture_preview_screenshot`
  - `preview_dom_snapshot`
  - `execute_preview_javascript`
- Platforms / runtimes:
  - Electron preview session owner and shell projection
  - embedded preview bridge
  - Codex runtime adapter
  - Claude runtime adapter
- Lifecycle boundaries in scope:
  - `Startup`
  - `Shutdown`
  - `Recovery`
  - `None`

## Durable Validation Assets

- Electron preview lifecycle and shell projection:
  - [preview-session-manager.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web/electron/preview/__tests__/preview-session-manager.spec.ts)
  - [preview-shell-controller.spec.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web/electron/preview/__tests__/preview-shell-controller.spec.ts)
- Preview contract and parser boundaries:
  - [preview-tool-input-parsers.test.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts/tests/unit/agent-tools/preview/preview-tool-input-parsers.test.ts)
  - [preview-tool-contract.test.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts/tests/unit/agent-tools/preview/preview-tool-contract.test.ts)
  - [preview-bridge-client.test.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts/tests/unit/agent-tools/preview/preview-bridge-client.test.ts)
- Runtime adapter seams:
  - [codex-thread-event-converter.test.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts)
  - [build-preview-dynamic-tool-registrations.test.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.test.ts)
  - [build-claude-preview-mcp-servers.test.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts/tests/unit/agent-execution/backends/claude/preview/build-claude-preview-mcp-servers.test.ts)
- Live runtime adapter scenarios:
  - [codex-agent-run-backend-factory.integration.test.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts)
  - [claude-agent-run-backend-factory.integration.test.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts)
  - [preview-bridge-live-test-server.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts/tests/integration/agent-execution/preview-bridge-live-test-server.ts)

## Validation Round History

| Round | Trigger | Gate Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | `Fail` | `No` | live runtime preview validation first exposed Codex/Claude normalization gaps |
| 2 | Re-entry | `Blocked` | `No` | packaged shell-visible proof still missing |
| 3 | Re-entry | `Fail` | `No` | Codex packaged result collapsed to `{ "success": true }` |
| 4 | Re-entry | `Fail` | `No` | Preview tab mount crashed |
| 5 | Re-entry | `Fail` | `No` | shutdown after preview use crashed Electron main |
| 6 | Re-entry | `Fail` | `No` | preview attachment froze the machine |
| 7 | Re-entry | `Pass` | `No` | earlier shell-tab preview path passed after boundedness fix |
| 8 | Re-entry | `Blocked` | `No` | live Codex transport instability blocked one rerun |
| 9 | Re-entry | `Pass` | `No` | packaged personal-app validation proved the real user path |
| 10 | Re-entry | `Pass` | `No` | `v11` structural refactor kept preview behavior green |
| 11 | Re-entry | `Pass` | `Yes` | `v12` ownership/strictness refactor passed focused suites, live Codex regression reruns, and live Codex/Claude full preview-surface scenarios |

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Criterion Summary | Scenario ID(s) | Current Status | Last Updated |
| --- | --- | --- | --- | --- |
| AC-001 | Electron main remains the authoritative owner for preview session and shell projection lifecycle | `AV-002`, `AV-003`, `AV-005` | `Passed` | `2026-04-02` |
| AC-002 | outer Preview tab appears lazily and hides when no sessions remain | `AV-003`, `AV-004`, `AV-005` | `Passed` | `2026-04-02` |
| AC-003 | each preview session maps to one internal tab and independent browser control | `AV-002`, `AV-004`, `AV-005` | `Passed` | `2026-04-02` |
| AC-004 | navigate/list/read/screenshot/dom-snapshot/javascript/close remain available after the shell-tab move | `AV-002`, `AV-006`, `AV-007` | `Passed` | `2026-04-02` |
| AC-005 | Codex and Claude preserve one preview-session contract | `AV-001`, `AV-006`, `AV-007` | `Passed` | `2026-04-02` |
| AC-006 | renderer/main coordination stays bounded and snapshot-driven | `AV-003`, `AV-005` | `Passed` | `2026-04-02` |
| AC-007 | close semantics and shell recovery are deterministic | `AV-002`, `AV-005`, `AV-007` | `Passed` | `2026-04-02` |
| AC-008 | popup preview-window behavior is removed from the normal flow | `AV-004` | `Passed` | `2026-04-02` |

## Spine Coverage Matrix

| Spine ID | Governing Owner | Scenario ID(s) | Coverage Status | Notes |
| --- | --- | --- | --- | --- |
| DS-001 | runtime adapter + `PreviewToolService` | `AV-001`, `AV-006`, `AV-007` | `Passed` | live Codex and Claude now prove both `open_preview` and the broader preview surface through the real runtime adapter path |
| DS-002 | `PreviewToolService` + bridge client | `AV-001`, `AV-002`, `AV-006`, `AV-007` | `Passed` | the bridge client/server contract is covered locally and through live runtime calls |
| DS-003 | `PreviewSessionManager` | `AV-001`, `AV-002`, `AV-006`, `AV-007` | `Passed` | lifecycle, lease-aware reuse, and follow-up page operations are covered |
| DS-004 | `PreviewShellController` | `AV-003`, `AV-004`, `AV-005` | `Passed` | shell focus/projection and close/hide behavior remain main-owned and bounded |
| DS-005 | preload bridge + renderer preview store | `AV-003`, `AV-004`, `AV-005` | `Passed` | renderer projection remains snapshot-driven |
| DS-006 | `PreviewSessionManager` + `PreviewShellController` | `AV-004`, `AV-005`, `AV-007` | `Passed` | non-stealable lease behavior and deterministic close path are now covered |
| DS-007 | `PreviewSessionManager` | `AV-002`, `AV-006`, `AV-007` | `Passed` | session-oriented browser-style tools remain canonical |
| DS-008 | shell host / registry | `AV-003`, `AV-005` | `Passed` | shell host attachment remains bounded after the freeze/shutdown fixes |

## Scenario Catalog

| Scenario ID | Validation Mode | Objective | Command / Harness | Status |
| --- | --- | --- | --- | --- |
| AV-001 | Integration | prove real runtime `open_preview` execution through Codex + Claude | `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Codex preview dynamic tool path'`; `RUN_CLAUDE_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts vitest run tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts -t 'executes open_preview through the live Claude preview MCP path'` | `Passed` |
| AV-002 | API / Lifecycle | prove session-oriented follow-up operations and lease-aware reuse locally | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web vitest run electron/preview/__tests__/preview-session-manager.spec.ts --config ./electron/vitest.config.ts`; `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts vitest run tests/unit/agent-tools/preview/preview-tool-contract.test.ts tests/unit/agent-tools/preview/preview-bridge-client.test.ts tests/unit/agent-tools/preview/preview-tool-input-parsers.test.ts` | `Passed` |
| AV-003 | Desktop shell / Browser UI | prove shell projection and snapshot-driven renderer behavior | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web vitest run electron/preview/__tests__/preview-shell-controller.spec.ts --config ./electron/vitest.config.ts`; `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-web vitest run components/workspace/tools/__tests__/PreviewPanel.spec.ts stores/__tests__/previewShellStore.spec.ts components/layout/__tests__/RightSideTabs.spec.ts` | `Passed` |
| AV-004 | Desktop UI | prove the packaged app shows the Preview tab instead of popup windows | user-installed packaged personal app validation on `2026-04-02` | `Passed` |
| AV-005 | Lifecycle | prove shutdown/recovery and unchanged-bounds behavior remain bounded | Electron preview controller + renderer regression suites above | `Passed` |
| AV-006 | API / Integration | prove the eight-tool preview surface registers and projects consistently across runtimes | unit builder/registration suites plus live Codex parser regression rerun | `Passed` |
| AV-007 | Integration | prove the full eight-tool preview surface executes through real Codex + Claude runtime adapter paths | `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t 'executes the full preview tool surface through the live Codex preview dynamic tool path'`; `RUN_CLAUDE_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts vitest run tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts -t 'executes the full preview tool surface through the live Claude preview MCP path'` | `Passed` |
| AV-008 | Integration | prove the touched Codex parser boundary no longer corrupts non-preview `edit_file` metadata | `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design/autobyteus-server-ts vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts -t 'converts edit-file activity into edit_file segments and artifact events'` | `Passed` |

## Current Round Evidence

- Focused Electron preview suites:
  - `pnpm vitest run electron/preview/__tests__/preview-shell-controller.spec.ts electron/preview/__tests__/preview-session-manager.spec.ts --config ./electron/vitest.config.ts`
  - Result: `2` files passed, `10` tests passed
- Focused server suites:
  - `pnpm vitest run tests/unit/agent-tools/preview/preview-tool-input-parsers.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts`
  - Result: `2` files passed, `15` tests passed
- Live Codex reruns:
  - `open_preview` live path: passed
  - `edit_file` metadata regression control: passed
  - full eight-tool preview surface: passed
- Live Claude reruns:
  - `open_preview` live path: passed
  - full eight-tool preview surface: passed

## Gate Decision

- Latest authoritative round: `11`
- Latest authoritative result: `Pass`
- Stage 7 complete: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant spines mapped to scenarios: `Yes`
- Validation evidence is strong enough for the changed flow: `Yes`
- Critical live runtime scenarios passed: `Yes`
- Any unresolved executable blockers: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - The prior Stage 7 thin-evidence gap is materially reduced because the live runtime layer now proves the broader eight-tool surface, not only `open_preview`.
  - The touched Codex parser boundary also passed the non-preview `edit_file` live regression control, so the current runtime evidence is no longer preview-happy-path-only.
