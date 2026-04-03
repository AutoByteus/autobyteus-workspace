# Implementation

## Status

`Complete`

## Scope

Keep the completed browser/tab rename refactor and strict agent `toolNames` gating work intact, then extend the Browser shell UX so Browser is always visible, manually operable, and able to enter a clean full-view mode without creating a second browser-tab model.

## Pre-Edit Intent

- No compatibility aliases for old `preview_*` contract names.
- No partial mixed naming in the stable public contract.
- No unconditional runtime injection of browser tools or `send_message_to`.
- No prompt/tool mismatch for `send_message_to`.
- No lower-boundary reconstruction of Claude tool-exposure policy.
- No Browser top-level visibility rule based on `sessions.length > 0`.
- No direct `window.electronAPI` use from Browser UI components.
- No second browser runtime or UI-only browser-tab model for manual Browser actions.
- No separate fullscreen browser path; full-view must reuse the same Browser shell host projection.

## Planned Work Items

| ID | Change Type | Area | Summary |
| --- | --- | --- | --- |
| C-001 | Rename/Move | `autobyteus-server-ts/src/agent-tools/preview` | rename stable tool boundary to browser/tab terminology |
| C-002 | Rename/Move | `autobyteus-server-ts/src/agent-execution/backends/*/preview` | rename runtime adapter folders/files to browser terminology |
| C-003 | Rename/Move | `autobyteus-web/electron/preview` | rename Electron native browser owner |
| C-004 | Rename/Move | workspace Browser panel/store/controller naming | rename UI projection from Preview to Browser |
| C-005 | Modify | AutoByteus/Codex/Claude runtime tool exposure | filter browser tools by `agentDef.toolNames` |
| C-006 | Modify | team/runtime `send_message_to` paths | filter `send_message_to` by `agentDef.toolNames` |
| C-007 | Add/Modify | shared execution policy owner | extract one shared configured-tool exposure owner used by Codex and Claude |
| C-008 | Modify | team prompt composition | emit `send_message_to` guidance only when the tool is actually exposed |
| C-009 | Modify | Claude session / SDK boundary | move final allowed-tool list shaping into Claude session and pass the resolved allowlist into the SDK client |
| C-010 | Modify | tests and docs | update validation and docs for the stricter ownership model |
| C-011 | Modify | `useRightSideTabs` / Browser shell store/types | make Browser a permanent top-level tab without session-count visibility coupling |
| C-012 | Modify | Browser shell IPC/controller/store | add authoritative Browser-shell commands for manual open, navigate, and refresh |
| C-013 | Modify | Browser panel UI | add clean empty state and populated-state manual-open affordances |
| C-014 | Modify | Browser panel UI | add minimal Browser chrome for address entry, refresh, close-current-tab, and full-view toggle |
| C-015 | Add | Browser display-mode store | reuse the file-viewer zen-mode pattern for Browser full-view state |
| C-016 | Modify | Browser shell tests | add renderer/Electron coverage for always-visible Browser, manual open, shell commands, and full-view projection |
| C-017 | Modify | Browser docs | update durable docs for Browser UX and manual shell operation |

## Completed Work Items

| ID | Result | Notes |
| --- | --- | --- |
| C-001 | Complete | Stable tool boundary renamed to browser/tab terminology with no active `preview_*` public contract path |
| C-002 | Complete | Codex and Claude runtime adapter folders/files moved to browser terminology |
| C-003 | Complete | Electron native browser owner renamed from preview to browser |
| C-004 | Complete | Workspace right-side tool tab and shell projection renamed to Browser |
| C-005 | Complete | AutoByteus/Codex/Claude browser-tool exposure now filters against agent `toolNames` |
| C-006 | Complete | `send_message_to` runtime exposure now follows agent `toolNames` in the touched Codex/Claude paths |
| C-007 | Complete | Shared configured-tool exposure owner now derives normalized tool names, browser-tool exposure, and `send_message_to` exposure once |
| C-008 | Complete | Team prompt now advertises `send_message_to` only when the tool is actually exposed for the run |
| C-009 | Complete | Claude session now owns the final allowed-tool list and passes it into the SDK client as data |
| C-010 | Complete | Focused ownership validation was rerun after the cleanup and is green |
| C-011 | Complete | Browser top-level visibility now follows desktop-browser availability instead of session-count coupling |
| C-012 | Complete | Browser shell IPC/controller/store now own manual open, navigate, and refresh commands |
| C-013 | Complete | Browser panel now shows a clean empty state and manual open affordance without a second tab model |
| C-014 | Complete | Browser panel now provides address entry, refresh, close-current-tab, and full-view toggle chrome |
| C-015 | Complete | Browser full-view now uses a dedicated display-mode store that reuses the file-viewer zen-mode pattern |
| C-016 | Complete | Focused Browser renderer/Electron tests now cover permanent Browser visibility, manual open, refresh, and full-view toggle |

## Re-Entry Baseline For Current Scope

- Completed baseline retained from earlier ticket scope:
  - browser/tab rename
  - strict browser-tool gating by `agentDef.toolNames`
  - strict `send_message_to` gating by `agentDef.toolNames`
  - shared configured-tool exposure owner
  - prompt/allowed-tools alignment
- Active delta for this re-entry:
  - permanent Browser top-level tab
  - manual user Browser open/navigate/refresh/close path
  - Browser full-view mode over the same native browser tab

## Implementation Validation

- Electron/browser compile passed:
  - `pnpm -C autobyteus-web transpile-electron`
- Focused Electron/browser suites passed:
  - `pnpm vitest run --config ./electron/vitest.config.ts electron/browser/__tests__/browser-tab-manager.spec.ts electron/browser/__tests__/browser-shell-controller.spec.ts electron/browser/__tests__/browser-view-factory.spec.ts electron/browser/__tests__/browser-screenshot-artifact-writer.spec.ts`
  - result: `4 files passed`, `17 tests passed`
- Focused server/browser/gating suites passed:
  - `pnpm vitest run tests/unit/agent-tools/browser/register-browser-tools.test.ts tests/unit/agent-tools/browser/browser-tool-contract.test.ts tests/unit/agent-tools/browser/browser-tool-input-parsers.test.ts tests/unit/agent-tools/browser/browser-tool-semantic-validators.test.ts tests/unit/agent-execution/backends/codex/browser/build-browser-dynamic-tool-registrations.test.ts tests/unit/agent-execution/backends/codex/backend/codex-configured-tool-gating.test.ts tests/unit/agent-execution/backends/claude/browser/build-claude-browser-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts`
  - result: `11 files passed`, `35 tests passed`
- Focused Claude session/SDK unit suites passed after the final tool-gating/allowlist fix:
  - `pnpm vitest run tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/claude/session/claude-session.test.ts`
  - result: `4 files passed`, `13 tests passed`
- Focused ownership-boundary rerun passed after the shared exposure-owner refactor:
  - `pnpm exec vitest run tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/session/claude-session.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/codex/backend/codex-configured-tool-gating.test.ts tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts`
  - result: `7 files passed`, `20 tests passed`
- Focused Claude prompt-boundary rerun passed after threading the resolved `sendMessageToEnabled` decision into turn-input construction:
  - `pnpm exec vitest run tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/claude/session/claude-session.test.ts tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts tests/unit/agent-team-execution/member-run-instruction-composer.test.ts`
  - result: `4 files passed`, `13 tests passed`

These results remain the baseline validation for the already-completed rename/gating scope. New Browser-shell UX validation will be added in this implementation round.

New Browser-shell UX validation:

- Nuxt test scaffold refreshed for the worktree:
  - `pnpm --dir autobyteus-web exec nuxt prepare`
- Focused Browser renderer/Electron suites passed:
  - `pnpm --dir autobyteus-web exec vitest run components/workspace/tools/__tests__/BrowserPanel.spec.ts stores/__tests__/browserShellStore.spec.ts composables/__tests__/useRightSideTabs.spec.ts components/layout/__tests__/RightSideTabs.spec.ts services/agentStreaming/browser/__tests__/browserToolExecutionSucceededHandler.spec.ts electron/browser/__tests__/browser-screenshot-artifact-writer.spec.ts electron/browser/__tests__/browser-shell-controller.spec.ts electron/browser/__tests__/browser-tab-manager.spec.ts electron/browser/__tests__/browser-view-factory.spec.ts`
  - result: `9 files passed`, `32 tests passed`
- Electron/browser compile still passes on the Browser-shell UX changes:
  - `pnpm --dir autobyteus-web transpile-electron`
- Focused Browser shell acceptance-gap rerun passed after adding explicit close-current-tab and full-view state-retention coverage:
  - `pnpm --dir autobyteus-web exec vitest run components/workspace/tools/__tests__/BrowserPanel.spec.ts stores/__tests__/browserShellStore.spec.ts composables/__tests__/useRightSideTabs.spec.ts electron/browser/__tests__/browser-shell-controller.spec.ts`
  - result: `4 files passed`, `20 tests passed`
- Packaged personal mac Electron build reran cleanly after the Claude team restore-path local fix:
  - `AUTOBYTEUS_BUILD_FLAVOR=personal pnpm --dir autobyteus-web build:electron:mac`
  - result: `Build completed` with personal DMG/ZIP artifacts under `/autobyteus-web/electron-dist/`

## Stage 7 Local-Fix Resolution

- The Stage 7 packaged desktop build rerun failed before packaging completed:
  - `AUTOBYTEUS_BUILD_FLAVOR=personal pnpm --dir autobyteus-web build:electron:mac`
- Failure location:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts`
- Failure summary:
  - `createClaudeAgentRunContext(...)` now requires `configuredToolExposure`, but the Claude team-manager restore path still constructs the context without that required field.
- Re-entry classification:
  - `Local Fix`
- Resolution:
  - the Claude team restore path now carries `configuredToolExposure` through `ClaudeTeamMemberContext`, resolves it during restore for older contexts when needed, and the packaged personal mac build now completes cleanly

## Expected Validation

- Unit tests for browser contract/parser/manifest paths
- Runtime bootstrap/session tests for AutoByteus, Codex, and Claude tool exposure
- Team/runtime tests for `send_message_to` gating
- Focused Electron/browser UI tests after Browser-shell UX extension
- Browser renderer/store tests for:
  - permanent Browser visibility
  - empty-state manual open
  - populated-state manual open
  - refresh / close-current-tab
  - full-view display mode
- Focused executable validation for agent-driven browser flows after the Browser shell UX extension

## Risks To Watch

- Partial rename that leaves mixed `preview` and `browser` naming in the stable public contract
- Runtime-specific exposure drift after changing only one backend
- Team-runtime behavior regressions if `send_message_to` gating is not propagated consistently
- Review failure if the rename leaves legacy aliases or dual paths
- Browser UI clutter if the chrome is solved by simply stacking controls without a clear shell owner
- Architecture drift if manual Browser actions bypass the Browser shell store/controller and call lower-level Electron APIs directly
- Full-view regressions if Browser fullscreen is implemented as a second renderer/browser path instead of a layout-only mode
