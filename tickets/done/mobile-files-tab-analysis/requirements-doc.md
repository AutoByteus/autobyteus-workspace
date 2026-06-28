# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready - approved by user on 2026-06-28 for ticket kickoff and implementation workflow.

## Goal / Problem Statement

Analyze why the mobile **Files** tab does not work across the Android/iOS mobile experience. Determine whether the tab is unimplemented, blocked by missing backend/API support, affected by stale packaging, or failing because of context/workspace resolution behavior.

## Investigation Findings

- The Android and iOS apps do **not** implement the Files tab natively. They are thin native shells that validate/open a paired node and load the server-served `/mobile` web shell in WebView/WKWebView.
- The Files tab itself is implemented in the Nuxt mobile web shell:
  - `autobyteus-web/components/mobile/MobileWorkShell.vue` declares the bottom-nav `files` tab.
  - `autobyteus-web/components/mobile/MobileFiles.vue` implements workspace browsing, filtering, deep search, folder lazy loading, read-only file preview, and attach-to-chat-context behavior.
  - `autobyteus-web/composables/mobile/useMobileWorkspaceFileExplorer.ts` resolves the current workspace/run context and adapts the shared file explorer store for mobile.
- The backend/API capability exists:
  - GraphQL `folderChildren`, `fileContent`, and `searchFiles` exist in `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts`.
  - REST `/rest/workspaces/:workspaceId/content?path=...` exists in `autobyteus-server-ts/src/api/rest/workspaces.ts` for protected binary/media content.
  - File-change streaming exists at `/ws/file-explorer/:workspaceId` and supports mobile credentials.
- Therefore the Files tab is **not unimplemented** and not obviously too complex to implement. It is a partially implemented mobile web feature over existing workspace APIs.
- Additional user requirement added on 2026-06-28: because `/mobile` can be tested visually via browser `open_tab`, the implementation must include frontend-style UI verification after the fix. The implementer should inspect the fixed Files tab in `/mobile`; if the UI state, error messaging, spacing, or interaction quality is not good, improving that UI is in scope for the fix rather than deferred.
- The most likely real failure modes are integration/state issues:
  1. **No active mobile work context**: Home `Files` only switches to the Files tab; if no workspace/run/team-run context is selected, `MobileFiles.vue` shows a choose-workspace state.
  2. **Selected run workspace root is unavailable on the paired node/container**: mobile intentionally resolves from the selected context's workspace root and avoids silently falling back to another workspace. If the root path is not registered/mounted/reachable from the server, the tab cannot browse it.
  3. **Root folder load errors are swallowed by the shared file explorer store**: `fileExplorerTreeActions.fetchFolderChildren(...)` logs GraphQL/server payload errors and returns instead of throwing/returning an error. During mobile root resolution, this can leave the Files tab in a resolved-but-empty state rather than showing a clear workspace-unavailable error. This is the strongest code-level defect found.
  4. **Stale served `/mobile` bundle**: Android/iOS load the desktop/server-served mobile web bundle. Installing a fresh native wrapper alone cannot update Files-tab JavaScript.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Feature Gap Investigation
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, but localized to mobile workspace-resolution/error propagation rather than native Android/iOS implementation.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect + Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed for a first fix; a small contract tightening between file explorer fetch actions and mobile workspace resolution is enough.
- Evidence basis: Current mobile source has a Files implementation and backend APIs; failure path is in root workspace resolution/error propagation and/or stale mobile bundle/runtime context.
- Requirement or scope impact: If implementation is approved, focus on surfacing root folder load failures and improving empty/no-context UX before considering larger architecture work.

## Recommendations

1. Treat this as a **mobile web shell bug/integration issue**, not an Android/iOS native missing-feature problem.
2. First runtime check: on the actual paired phone, identify which state appears:
   - no workspace selected / choose workspace;
   - workspace unavailable for a selected run;
   - empty file list despite a known non-empty workspace;
   - stale UI that does not match current source.
3. If the observed issue is an empty list or silent failure, fix `fetchFolderChildren` to propagate GraphQL/server errors and make `useMobileWorkspaceFileExplorer.resolveWorkspaceForContext()` convert root-load failure into `workspaceResolutionError` / retryable unavailable state.
4. If the observed issue is stale UI, rebuild and refresh the served mobile web bundle (`pnpm -C autobyteus-web build:mobile-web`) and ensure the server/package serves the refreshed `mobile-web/` assets.
5. If the observed issue is wrong/missing workspace path, verify that the selected run's workspace root exists and is mounted inside the paired AutoByteus node/container.
6. During implementation, run or open the served `/mobile` UI through a browser tab, validate the Files tab visually and interactively, and improve any poor UI state introduced or exposed by the fix. This includes loading, empty, workspace-unavailable, retry, and successful file-list states where reachable.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium for investigation; likely Small-to-Medium for implementation depending on runtime reproduction.

## In-Scope Use Cases

- UC-001: User opens the Files tab from Android after pairing.
- UC-002: User opens the Files tab from iOS after pairing.
- UC-003: User opens Files for a selected workspace context.
- UC-004: User opens Files for an existing agent/team run whose workspace root should be browsable.
- UC-005: User sees an actionable error when workspace/root folder loading fails.
- UC-006: Implementer validates the fixed `/mobile` Files tab visually in a browser and improves any unacceptable UI state as part of the same fix.

## Out of Scope

- Native Android/iOS implementation of a separate Files UI.
- Phone-local filesystem browsing from the Files tab.
- Mobile file editing, rename, delete, move, create, or desktop context-menu parity.
- Implementing fixes before user approval.

## Functional Requirements

- REQ-001: The mobile Files tab must be understood as a server-served `/mobile` web-shell feature, not native Android/iOS code.
- REQ-002: Files must resolve from the current workspace, agent-run, or team-run context and must not silently browse an unrelated workspace.
- REQ-003: When no workspace-capable context exists, Files must show an actionable choose-workspace state.
- REQ-004: When selected run/team-run workspace root cannot be resolved or loaded, Files must show a clear workspace-unavailable error and retry path.
- REQ-005: Root folder load errors from the shared file explorer API must be propagated to mobile presentation instead of becoming an empty successful state.
- REQ-006: Served `/mobile` bundle freshness must be verified when validating Android/iOS behavior.
- REQ-007: Implementation MUST include visual/interactive validation of the fixed `/mobile` Files tab using a browser-opened mobile route; if the resulting UI is not good, UI improvement is in scope for the implementation.
- REQ-008: UI validation MUST cover the relevant Files tab states exposed by the fix, including loading, no-context/choose-workspace, workspace-unavailable/error, retry, empty-folder/search, and successful file-list/preview states when those states are reachable in the local setup.

## Acceptance Criteria

- AC-001: Android/iOS wrapper code paths are documented as WebView/WKWebView shells that load `/mobile`.
- AC-002: `MobileWorkShell.vue`, `MobileFiles.vue`, and `useMobileWorkspaceFileExplorer.ts` are identified as the Files tab owner path.
- AC-003: Backend file APIs (`folderChildren`, `fileContent`, `searchFiles`, REST workspace content, file explorer websocket) are identified as existing capabilities.
- AC-004: A selected run with an unavailable workspace root produces an explicit mobile error, not an empty file list.
- AC-005: A root `folderChildren` server error is surfaced to mobile resolution state.
- AC-006: Validation records whether the served `/mobile` bundle is fresh relative to the source fix.
- AC-007: Implementation evidence includes a browser-based `/mobile` UI check of the Files tab after the fix.
- AC-008: If the browser-based check reveals poor Files-tab UI, the implementation includes UI refinements rather than handing off a technically fixed but visibly bad frontend state.

## Constraints / Dependencies

- Android/iOS apps depend on the server-served `/mobile` assets; native app freshness and mobile web bundle freshness are separate.
- Files browse server/workspace paths on the paired AutoByteus node/container, not phone-local files.
- Mobile credentials are already carried by GraphQL/REST/WebSocket helper paths and should be preserved.

## Assumptions

- "Files tab" refers to the mobile bottom-nav Files view under `/mobile`, not the desktop file explorer and not the OS file picker for chat uploads.

## Risks / Open Questions

- Need actual device/server observation to distinguish stale bundle from workspace-root/runtime failure.
- If backend `folderChildren` intentionally returns JSON error strings rather than GraphQL errors, frontend actions must still expose those as errors to mobile.
- If server runs inside Docker, paths visible in run history must match container-mounted paths.

## Requirement-To-Use-Case Coverage

- REQ-001 covers UC-001, UC-002.
- REQ-002 covers UC-003, UC-004.
- REQ-003 covers UC-003.
- REQ-004 covers UC-004, UC-005.
- REQ-005 covers UC-005.
- REQ-006 covers UC-001, UC-002.
- REQ-007 covers UC-006.
- REQ-008 covers UC-006.

## Acceptance-Criteria-To-Scenario Intent

- AC-001 verifies native wrapper ownership.
- AC-002 verifies mobile web Files owner path.
- AC-003 verifies backend feasibility.
- AC-004 verifies selected-run failure clarity.
- AC-005 verifies root-load failure propagation.
- AC-006 verifies Android/iOS served-bundle freshness.
- AC-007 verifies implementation-time browser UI validation.
- AC-008 verifies UI quality is part of the frontend fix, not a deferred polish item.

## Approval Status

Approved by user on 2026-06-28. User requested ticket kickoff after investigation and added the implementation-quality requirement that `/mobile` UI must be visually validated with browser/open_tab-style inspection and improved if not good.
