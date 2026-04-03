# Investigation Notes

## Status

`Current`

## Scope Triage

`Large`

Reason:
- The refactor changes a stable agent-facing tool contract.
- The rename spans server tool ownership, Electron ownership, UI labeling, runtime adapters, tests, and docs.
- The gating change must be applied consistently across AutoByteus, Codex, Claude, and `send_message_to`.
- The reopened scope also changes Browser shell UX, permanent tab visibility, manual user actions, and full-view layout behavior.

## Investigated Code Paths

- Native AutoByteus agent-tool exposure:
  - [autobyteus-agent-run-backend-factory.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts)
- Codex runtime bootstrap:
  - [codex-thread-bootstrapper.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts)
- Claude session MCP assembly:
  - [build-claude-session-mcp-servers.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-server-ts/src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.ts)
- Codex team dynamic tool bootstrap:
  - [codex-team-thread-bootstrap-strategy.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-thread-bootstrap-strategy.ts)
- Current preview/browser contract boundary:
  - [preview-tool-contract.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts)
  - [preview-tool-manifest.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-server-ts/src/agent-tools/preview/preview-tool-manifest.ts)
- Electron shell/browser ownership:
  - [preview-session-manager.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/electron/preview/preview-session-manager.ts)
  - [PreviewPanel.vue](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/components/workspace/tools/PreviewPanel.vue)

## Findings

1. Native AutoByteus already respects `agentDef.toolNames`. It only creates tool instances named on the agent definition.
2. Codex still appends the current preview-tool registrations at bootstrap regardless of `agentDef.toolNames`.
3. Claude still merges the preview MCP server map at session assembly regardless of `agentDef.toolNames`.
4. Codex team `send_message_to` is still injected from team runtime context instead of going through the same agent tool-selection rule.
5. The current capability is no longer accurately described as `preview`. It now owns persistent browsing state, multiple tabs, popup-created tabs, DOM snapshots, page reads, scripting, and screenshots.
6. The current naming therefore misaligns across multiple layers:
   - tool names
   - result payload names
   - folder names
   - type names
   - UI labels
7. The user has explicitly narrowed this ticket:
   - no provider-setting work
   - no external MCP/browser-provider work
   - no remote-node browser routing work
   - only refactoring/rename plus strict tool-name gating
8. Independent review found the remaining weakness is ownership, not naming:
   - team prompt composition still advertises `send_message_to` based on teammate presence alone
   - Claude session computes exposure, but the Claude SDK client still reconstructs the allowlist below that boundary
   - configured-tool normalization and browser-tool derivation are duplicated across runtimes
9. A deeper round with a longer spine exposed one more unresolved Claude ownership leak:
   - [claude-turn-input-builder.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-turn-input-builder.ts) still builds runtime prompt instructions from `runContext` without consuming the session-owned `sendMessageToToolingEnabled` decision
   - that means the Claude prompt can still diverge from the actual exposed-tool set
10. The current focused Claude validation did not assert the built prompt text, so this remaining leak escaped the previous passing round.
11. The Browser shell UX extension is dependent on the current refactor worktree state and therefore must stay on this existing ticket/worktree rather than branching from plain `personal`.
12. The current Browser panel is still functionally lazy and agent-driven; there is no user-driven manual open path yet.
13. The current file-content full-view behavior is implemented cleanly as a zen-mode pattern:
   - [FileExplorerTabs.vue](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/components/fileExplorer/FileExplorerTabs.vue)
   - [fileContentDisplayMode.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/stores/fileContentDisplayMode.ts)
   - it uses one simple display-mode store plus a `<Teleport to="body">` full-screen layer
14. That file-viewer zen-mode pattern is a strong candidate for Browser maximize/full-view, because it reuses one viewer surface instead of inventing a second rendering model.
15. The Browser subsystem already has the right ownership split for added UX controls:
   - Electron main owns browser tab lifecycle and native `WebContentsView`
   - the renderer owns Browser chrome, empty state, and bounds reporting
   - this means address bar, refresh, close, and maximize are renderer/shell concerns layered on top of the same browser-tab model
16. The current right-side Browser top-level visibility still encodes the old lazy-preview assumption:
   - [useRightSideTabs.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/composables/useRightSideTabs.ts) hides the Browser tab whenever `browserShellStore.browserVisible` is false
   - [browserShellStore.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/stores/browserShellStore.ts) only mirrors `browserVisible` from shell snapshots
   - [browser-shell-controller.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/electron/browser/browser-shell-controller.ts) currently computes `browserVisible` from `sessions.length > 0`
17. The current Browser panel is intentionally minimal but incomplete for the new UX scope:
   - [BrowserPanel.vue](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/components/workspace/tools/BrowserPanel.vue) only renders:
     - internal tab strip
     - empty state telling the user to wait for `open_tab`
     - attach-host area
   - it does not yet render a manual open path, address bar, refresh, or maximize affordance
18. The preload/main IPC surface is also still shaped around the lazy agent-driven Browser shell:
   - [preload.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/electron/preload.ts) exposes snapshot, focus, set-active, host-bounds, and close only
   - [main.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/electron/main.ts) mirrors the same shell IPC surface
   - there is no manual-open, active-tab navigate, or active-tab refresh command yet
19. The Electron browser owner already contains the correct lower-level capability primitives, so the UX gap is not a browser-runtime feasibility problem:
   - [browser-tab-manager.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/electron/browser/browser-tab-manager.ts) already owns open, navigate, close, screenshot, DOM snapshot, script execution, page read, popup adoption, and lease-aware tab lifecycle
   - [browser-shell-controller.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/electron-browser-tool-refactor/autobyteus-web/electron/browser/browser-shell-controller.ts) already owns shell projection, active tab selection, and host-bounds attachment
   - so the missing work is mostly shell/UI extension plus a few browser-shell IPC commands, not a new browser engine design

## Investigation Conclusion

The main implementation problem is not runtime feasibility. It is ownership inconsistency plus an expanded Browser-shell UX requirement:
- the browser capability is still named as `preview`
- exposure policy is not centralized around agent-definition `toolNames`
- `send_message_to` remains a special injected path without the same rule
- the shared exposure policy is still fragmented across bootstrap, prompt composition, and the Claude SDK boundary
- even after the shared exposure-owner refactor, Claude prompt composition still bypasses the session-owned exposure result, so the longer Claude spine is not yet clean
- the Browser UI still behaves like an agent-opened projection surface, not yet like a first-class user-facing browser tab
- the reopened UX scope should be implemented on this same ticket because it depends directly on the refactored Browser naming and browser-shell architecture

This ticket should therefore proceed as a design-led refactor with two core outcomes:
1. rename the capability from `preview` to a browser/tab model
2. make runtime exposure consistent so these tools only exist when the agent definition includes them
3. give configured-tool normalization and derived optional-tool exposure one authoritative shared owner
4. make prompt emission and Claude allowlisting consume that resolved exposure instead of recomputing it downstream
5. make Claude turn-input assembly consume the same resolved `sendMessageToToolingEnabled` decision that the session uses for MCP exposure and allowed tools
6. extend the Browser shell so it is always visible, supports a clean empty state and manual open flow, and reuses the file-viewer zen/full-view pattern for Browser maximize
7. keep the Browser shell extension on the current authoritative browser-shell boundary:
   - renderer should depend on browser-shell APIs/stores
   - browser-shell boundaries should depend on `BrowserShellController`
   - browser-shell boundaries should not bypass directly into lower-level browser runtime internals

## Recommended Direction For Stage 2

- Refine the public contract around browser/tab naming.
- Make `send_message_to` follow the same agent tool-selection rule.
- Refine the Browser-shell UX requirements around permanent visibility, manual open, clean browser chrome, and full-view behavior.
- Defer provider-selection, external MCP, and remote-node browser routing to future tickets.
