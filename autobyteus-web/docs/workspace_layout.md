# Workspace Layout and Responsive Shell

The standard `/workspace` route is a desktop-capability workspace that adapts to constrained browser, embedded-browser, and narrow-window sizes. It is not the phone/PWA remote-access product surface.

## Route Ownership

- `pages/workspace.vue` mounts `components/layout/WorkspaceAdaptiveLayout.vue` for every standard workspace size.
- The route no longer switches between separate desktop and mobile workspace layout components. Avoid reintroducing route-level desktop/mobile branches for `/workspace`; responsive behavior belongs in the shared shell/layout policy.
- The true phone/PWA route remains `/mobile`, which renders `MobileRemoteAccessShell` through `pages/mobile.vue` with its own phone-first journey and feature gates.

## App Shell Left Navigation

`layouts/default.vue` owns the outer app shell. It measures the viewport through `useAppShellResponsiveLayout()` and resolves the left navigation presentation in `utils/layout/responsiveLayoutPolicy.ts`:

- **Docked**: wide desktop space keeps the full left panel visible and resizable.
- **Strip**: constrained desktop or short-height windows keep the center workspace usable while preserving drawer access to the left panel.
- **Drawer**: narrow windows use the header menu and drawer surface instead of squeezing the workspace center.

Application-immersive routes still bypass the normal left navigation surfaces.

## Workspace Center and Right Tools

`WorkspaceAdaptiveLayout.vue` measures its own container through `useWorkspaceResponsiveLayout()` and presents the right tools according to measured space, user visibility preference, and the center-width preservation policy.

- Wide/enough space: right tools remain docked and resizable.
- Constrained desktop/tablet space: right tools collapse to a strip or drawer before the center pane falls below its practical minimum.
- Narrow or short-height space: right tools open as a drawer; the center workspace remains the primary visible surface.
- The center pane minimum target is defined by `WORKSPACE_CENTER_MIN_WIDTH_PX` in `utils/layout/responsiveLayoutPolicy.ts`.

Primary narrow-surface controls are centralized in `utils/layout/workspaceSurfaceOrder.ts`. Keep the user-facing order stable:

1. Work
2. Runs
3. Files
4. Tools

Right-tool order is also centralized there and should remain:

1. Files
2. Team members, when applicable
3. Terminal
4. Activity
5. Token, when applicable
6. Artifacts
7. Browser, when applicable
8. VNC, when applicable

`RightSideTabs` opts into the wrapped `TabList` presentation for the right-tool
catalog. Constrained docked, strip, and drawer presentations may use multiple
tab rows instead of horizontal clipping; the catalog order and each tool's
reachability must remain intact.

## `/mobile` Boundary

Do not use `/mobile` or `components/mobile/*` as a fallback implementation for standard `/workspace`. `/mobile` is the paired phone/PWA remote-access shell and intentionally omits desktop-only tool surfaces such as Terminal and VNC in the current mobile contract. Standard `/workspace` must keep those capabilities reachable through the adaptive workspace shell instead.

## Coverage Expectations

Durable unit/component coverage for this policy lives near the relevant sources:

- `utils/layout/__tests__/responsiveLayoutPolicy.spec.ts`
- `utils/layout/__tests__/workspaceSurfaceOrder.spec.ts`
- `components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts`
- `components/layout/__tests__/RightSideTabs.spec.ts`
- `components/tabs/__tests__/TabList.spec.ts`
- `layouts/__tests__/default.spec.ts`

Browser-level responsive validation is available through:

```bash
pnpm -C autobyteus-web test:e2e:workspace-responsive -- --base-url http://127.0.0.1:3000 --output-dir ../tickets/<ticket-name>/probes/api-e2e
```

The E2E probe expects a running frontend/backend target and a Chrome/Chromium executable. Use `--browser-executable <path>` or `PLAYWRIGHT_CHROME_EXECUTABLE_PATH=<path>` when the default browser discovery is not sufficient.
