# ADB Mobile Artifacts Tab Click Regression

## Status

Local Fix required.

## Trigger

On 2026-05-28 the user reported that, while running the delivered Electron/mobile build, tapping the phone **Artifacts** bottom-nav item produced no visible UI change even when no artifacts existed.

## Device / Runtime Observed

- ADB device: `dfd6c5c0`, model `2109119DG`, product `lisa_eea`.
- Android package in foreground: `org.autobyteus.mobile/.MainActivity`.
- Installed package version: `versionName=1.3.30`, `versionCode=10033099`, `lastUpdateTime=2026-05-24 07:17:55`.
- Current worktree inspected: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-artifacts-tab/autobyteus-web` at `40287821` on `codex/mobile-artifacts-tab`.

## ADB Reproduction Evidence

Commands used included:

- `adb devices -l`
- `adb shell wm size`
- `adb shell dumpsys window | grep -E 'mCurrentFocus|mFocusedApp'`
- `adb exec-out screencap -p`
- `adb shell uiautomator dump /sdcard/window.xml`
- `adb shell input tap <x> <y>`

Observed bottom-nav tap behavior at y=2152:

| Tap target | x coordinate | Result |
| --- | ---: | --- |
| Chat | 108 | Chat screen |
| Runs | 324 | Runs screen |
| Files | 540 | Files screen |
| Artifacts | 756 | Chat screen / no visible change when already on Chat |
| Activity | 972 | Activity screen |

Evidence files:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-artifacts-tab/autobyteus-web/tickets/done/mobile-artifacts-tab/evidence/adb-mobile-artifacts-tab-tap-montage-20260528.jpg`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-artifacts-tab/autobyteus-web/tickets/done/mobile-artifacts-tab/evidence/adb-mobile-artifacts-tap-stays-chat-20260528.png`

## Expected Behavior

Tapping **Artifacts** should set `mobileWorkStore.activeTab` to `artifacts`, render `MobileArtifacts.vue`, and show the appropriate empty state such as **No Artifacts yet** when the focused run has no artifact rows.

## Actual Behavior

Tapping **Artifacts** emits/selects the tab visually/focus-wise, but the screen remains or returns to Chat. From Chat this looks like a no-op. From Files/Activity it jumps to Chat.

## Root Cause Found In Source

`stores/mobileWorkStore.ts` normalizes tab ids before storing them:

```ts
const normalizeMobileTaskTab = (tab: MobileTaskTab | string | null | undefined): MobileTaskTab => (
  tab === 'chat' || tab === 'runs' || tab === 'files' || tab === 'activity'
    ? tab
    : 'chat'
);
```

The new `'artifacts'` tab was added to `MobileTaskTab` and `MobileWorkShell.vue`, but it was not added to this normalizer. Therefore:

- `MobileWorkShell.vue` emits `update:activeTab` with `tab.id === 'artifacts'`.
- `MobileRemoteAccessShell.vue` passes that to `mobileWorkStore.setActiveTab`.
- `setActiveTab('artifacts')` calls `normalizeMobileTaskTab('artifacts')`.
- The normalizer rejects it and coerces it to `'chat'`.

This exactly matches the ADB behavior.

## Recommended Fix

Add `'artifacts'` to `normalizeMobileTaskTab` in `stores/mobileWorkStore.ts`:

```ts
const normalizeMobileTaskTab = (tab: MobileTaskTab | string | null | undefined): MobileTaskTab => (
  tab === 'chat' || tab === 'runs' || tab === 'files' || tab === 'artifacts' || tab === 'activity'
    ? tab
    : 'chat'
);
```

Also add a regression test covering the store/event path, not only direct `MobileWorkShell` prop rendering. Suggested coverage:

- `useMobileWorkStore().setActiveTab('artifacts')` preserves `activeTab === 'artifacts'`.
- A `MobileRemoteAccessShell` or store-backed shell test clicking/tapping `mobile-tab-artifacts` renders `MobileArtifacts` or at minimum updates `mobileWorkStore.activeTab` to `artifacts`.

## Classification

- Classification: `Local Fix`
- Recommended recipient: `implementation_engineer`
- Reason: The reviewed product behavior remains valid; the bug is a bounded implementation regression in a tab-id normalization helper after integration/delivery refresh.
