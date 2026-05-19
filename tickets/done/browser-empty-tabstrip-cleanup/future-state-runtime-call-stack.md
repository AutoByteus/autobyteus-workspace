# Future-State Runtime Call Stack: Browser Empty Tab Strip Cleanup

Status: Current

## Use Case 1: Render Browser with Zero Tabs
1. `BrowserPanel.vue` setup reads `sessions` from `useBrowserShellStore()` via `storeToRefs`.
2. `hasBrowserTabs` computes `false` from `sessions.value.length === 0`.
3. Template skips the tab-strip row guarded by `v-if="hasBrowserTabs"`.
4. Template renders the address toolbar row immediately under the panel chrome container without the tab-strip divider styling.
5. Browser content area renders the existing zero-tab empty-state message when Browser is available.

## Use Case 2: Render Browser with Existing Tabs
1. `BrowserPanel.vue` setup reads one or more sessions from the store.
2. `hasBrowserTabs` computes `true`.
3. Template renders the tab-strip row:
   - session tab pills;
   - mobile badge when applicable;
   - close-tab control per session;
   - maximize/restore control.
4. Template renders the address toolbar row below the tab strip with the visual divider.
5. Browser host bounds continue to sync through the existing mounted/watch flows.

## Use Case 3: Open a New Tab from Zero-Tab State
1. User enters a URL in the always-visible address input.
2. `handleAddressSubmit` normalizes the URL.
3. Since `activeTabId` is absent, `handleOpenTab` calls `browserShellStore.openTab`.
4. Store receives a session snapshot from Electron.
5. `sessions.length` becomes greater than zero.
6. `hasBrowserTabs` flips to `true`, and the tab-strip row with maximize/zen affordance appears.

## Use Case 4: Close the Last Active Tab
1. User closes the active tab through the existing close-active control while a tab exists.
2. Browser shell store receives an empty sessions snapshot.
3. `sessions.length` becomes zero.
4. `hasBrowserTabs` flips to `false`.
5. Template removes the tab-strip row and maximize/zen button, while preserving the address toolbar and empty-state message.

## Error/Fallback Behavior
- If Browser shell API is unavailable, the unavailable message path remains unchanged.
- Disabled toolbar buttons remain bound to `!activeTabId` and are unaffected by the tab-strip visibility change.
- Host bounds sync remains tied to host element size and existing watchers; tab-strip height changes still flow through `nextTick` and resize observer behavior.
