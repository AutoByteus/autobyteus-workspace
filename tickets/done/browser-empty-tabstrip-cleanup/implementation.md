# Implementation Plan: Browser Empty Tab Strip Cleanup

Status: Implementation Complete
Scope: Small

## Solution Sketch

### UI Structure
Refactor `BrowserPanel.vue` chrome from one wrapping flex row into two explicit chrome rows:

1. Conditional tab strip row, rendered only when `hasBrowserTabs` is true.
   - Contains session tab pills.
   - Contains maximize/restore button.
2. Address toolbar row, rendered for all states.
   - Contains open-new-tab button, URL input, refresh, device mode, close.
   - Adds a top divider only when the tab strip is present.

### State Derivation
Add a local computed value:

```ts
const hasBrowserTabs = computed(() => sessions.value.length > 0)
```

This keeps template conditionals semantic and avoids repeating raw collection checks.

### Behavioral Boundaries
- Do not change Browser shell store behavior.
- Do not change Electron IPC behavior.
- Do not change URL normalization/open/navigate behavior.
- Do not change empty content-state copy.

### Tests To Update
- Strengthen empty-state test to assert that `Maximize Browser view` is absent while URL controls remain present.
- Update full-view toggle test so it seeds one Browser session before expecting the maximize button.
- Strengthen close-active-tab regression to assert the maximize button disappears after returning to zero tabs.

## Execution Tracking
- Updated `autobyteus-web/components/workspace/tools/BrowserPanel.vue`:
  - added `hasBrowserTabs` computed state;
  - gated the session tab-strip and maximize/restore button behind `hasBrowserTabs`;
  - kept address toolbar always visible with tab-strip divider only when tabs exist.
- Updated `autobyteus-web/components/workspace/tools/__tests__/BrowserPanel.spec.ts`:
  - zero-tab compact chrome assertion;
  - close-last-tab regression assertion;
  - full-view toggle assertion now uses a real session.
- Installed workspace dependencies in the dedicated worktree to run validation.
- Ran `pnpm --dir autobyteus-web exec nuxi prepare` to generate `.nuxt` test tsconfig.
- Ran `pnpm --dir autobyteus-web exec vitest run components/workspace/tools/__tests__/BrowserPanel.spec.ts` and confirmed 9/9 tests pass.
