# Current-state browser/UI connection audit (SR-004)

This is investigation, not an approved design or expansion of corrective requirements.

## Actual ownership / communication
1. `BrowserRuntime.start` creates an app-global BrowserTabManager and BrowserShellController; BrowserBridgeServer shares that same manager.
2. BrowserTabManager holds an in-memory Map of records, each with tab ID, native WebContentsView, navigation/device state and lease owner. This is live session state, not a database entry guaranteeing visible UI. Browser profile persistence is a separate concern.
3. Agent open_tab -> BrowserToolService -> HTTP browser bridge `/browser/open` -> manager.openSession. Creates/loads a native view and returns opened/tab_id. The bridge takes browser open args, not a window-shell ID, and does not call controller.focusSession. Thus the result does not acknowledge presentation.
4. AGY's event converter receives provider MCP output, projects name/args, then wraps successful browser result as provider_state/output. Server streams normal TOOL_EXECUTION_SUCCEEDED. No browser-specific result canonicalization on AGY path; Codex/Claude have dedicated canonicalization.
5. Renderer agentStreamMessageProjector records generic success and independently invokes the async browser success handler (void). The handler extracts only direct result.tab_id; missing ID returns silently before even requesting browser store/focus. No missing-ID warning or UI error here.
6. On canonical eligible embedded success, store.focusSession -> preload.focusBrowserTab -> IPC browser-shell:focus-session. IPC handler uses event.sender.id to identify the calling shell. Controller checks session existence and cross-window lease; claims session, includes its ID in that shell's list, sets active session, publishes shell snapshot.
7. Handler selects right-side Browser. BrowserPanel measures its host rectangle and sends update-host-bounds via IPC. Controller needs BOTH active session and nonzero host bounds; then obtains native view, sizes it, and WorkspaceShellWindow attaches it using BrowserWindow.contentView.addChildView. The HTML panel renders chrome, not the website itself.
8. BrowserShellStore subscribes to browser-shell:snapshot-updated and reads shell get-snapshot on first initialize. BrowserPanel renders ONLY those shell sessions. Global list_tabs separately enumerates manager.sessions; it is not the panel's data source.

## Why this incident does not recover on its own
Controller.handleSessionUpserted only publishes to shells whose sessionIds already contain the changed ID. It does not assign new unclaimed sessions. Snapshot build also filters only those assigned IDs. BrowserPanel mounting/clicking initializes store and sends bounds; it does not enumerate/adopt global sessions. A missing initial focus therefore leaves the session out of the UI list, even when native creation and subsequent page updates work. The real isolated desktop reproduction already verified that merely clicking Browser does not restore the tab.
No automatic recovery for this exact missing-initial-assignment path was found in inspected owners/call sites. This is not a claim that all app reconnection or refresh behavior is broken, nor that blind global auto-adoption would be safe. Remote windows and per-window leases have explicit documented isolation requirements.

## Mechanism / cause / reliability distinction
- Confirmed incident cause: AGY converter-to-renderer contract mismatch -> early return -> no focus IPC -> no shell membership -> no native attachment.
- Structural exposure: agent-driven browser presentation relies on processing a provider-mediated streamed tool result after native session creation. Backend tool success and visible UI completion are separate, with no presentation acknowledgement returned to the tool.
- Missing recovery: new native sessions do not self-assign to a UI; shell snapshot refresh cannot repair missing membership.
- Missing observation: the incident's invalid result shape is silently ignored; Activity success is not a visibility guarantee.
- Protection worth preserving: separate engine/shell ownership supports multiwindow leases and remote-node restrictions; the separation itself does not justify a wholesale rewrite.

## Additional fault-injection probe
Command: `node evidence/deep-connection-probe.cjs <task-worktree>` relative to ticket directory. It runs actual production converter, parser, handler, controller and store with explicit Vue/Pinia primitive, manager and IPC doubles. 13 assertions/cases passed (11 earlier controls plus 2 additional fault cases).
- Valid canonical open result + focus IPC rejects: real store writes lastError but resolves instead of throwing, so real handler still selects Browser. activeTabId remains null. This strengthens F-002 as an independently reproduced error-propagation weakness; it did not cause the observed AGY incident, which never reached IPC.
- Subsequent unchanged empty snapshot: real applySnapshot clears lastError. Error lifetime can therefore end without a successful focus. The BrowserPanel does display lastError while present; do not claim all errors are hidden.
No production/source mutations, no new app instance, no real failure introduced into user environment. No claim these injected faults occurred in the user's run.

## Sources (task-worktree relative)
- autobyteus-web/electron/browser/browser-runtime.ts
- autobyteus-web/electron/browser/browser-bridge-server.ts
- autobyteus-web/electron/browser/browser-tab-manager.ts
- autobyteus-web/electron/browser/browser-shell-controller.ts
- autobyteus-web/electron/browser/register-browser-shell-ipc-handlers.ts
- autobyteus-web/electron/preload.ts
- autobyteus-web/electron/shell/workspace-shell-window.ts
- autobyteus-web/stores/browserShellStore.ts
- autobyteus-web/components/workspace/tools/BrowserPanel.vue
- autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts
- autobyteus-web/services/agentStreaming/agentStreamMessageProjector.ts
- autobyteus-server-ts/src/agent-tools/browser/open-tab.ts
- autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts

## Non-authoritative next decisions
Fix the proven browser-result contract first against REQ-001–003 if approved. Stronger presentation failure reporting and recovery may be worth separate approved behavior requirements; their ownership/window policy must be resolved before architecture. No automatic retries/global-adoption redesign is approved. Intermittent successful automatic-display cases remain uncaptured.
