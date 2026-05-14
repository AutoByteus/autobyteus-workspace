# Future-State Runtime Call Stack Review — Disable Artifact Auto-Focus

## Review Round 1 — Candidate Go

### Coverage Review

- FS1 covers the core bug: live `FILE_CHANGE` updates data but no longer changes right-side active tab.
- FS2 covers manual Artifacts usage and preserves latest artifact selection inside the tab.
- FS3 covers existing unrelated tab-switch rules and confirms they are out of scope.

### Missing-Use-Case Discovery Sweep

- Repeated artifact bursts: covered by FS1/off-spine concerns; no focus loop remains.
- Active tab already Artifacts: safe; the tab remains active by prior user/system state, not forced by artifact signal.
- Manual user click on Artifacts after signals: covered by FS2.
- Team-run member artifacts: covered by the shared `FILE_CHANGE` ingestion path; focus policy removal is shell-level and independent of single/team stream source.
- Historical/hydrated artifacts: no auto-focus path in `replaceRunProjection`; no change needed.
- Other right-side auto-switch behavior: covered by FS3 and preserved.

### Findings

No blockers. No required artifact updates. No newly discovered use cases.

### Decision

Candidate Go.

## Review Round 2 — Go Confirmation

### Coverage Review

Re-reviewed requirements AC1-AC7 against FS1-FS3. The future state has one clear ownership change: `RightSideTabs.vue` stops consuming artifact discoverability as a focus command, while `ArtifactsTab.vue` continues consuming it for in-tab row selection.

### Missing-Use-Case Discovery Sweep

- Regression risk: removing imports/computed watcher from `RightSideTabs.vue` should not affect `ArtifactsTab.vue`, because it imports and watches `RunFileChangesStore` independently.
- Test risk: existing tests assert old behavior; must be inverted to fail on focus stealing.
- Documentation risk: one durable doc says auto-focus; must be updated.
- Configuration risk: no user preference/toggle is required by current requirements.

### Findings

No blockers. No required artifact updates. No newly discovered use cases.

### Decision

Go Confirmed. Unlock Stage 6 source implementation.
