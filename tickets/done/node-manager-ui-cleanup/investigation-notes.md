# Investigation Notes — Node Manager UI Cleanup

Status: Complete
Scope: Small frontend presentation-only change

## Files Inspected
- `autobyteus-web/pages/settings.vue`
- `autobyteus-web/components/settings/NodeManager.vue`
- `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue`
- `autobyteus-web/components/settings/RemoteBrowserSharingPanel.vue`
- `autobyteus-web/components/settings/__tests__/DockerNodeStartGuideCard.spec.ts`
- `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts`
- `autobyteus-web/docs/settings.md`

## Current UI Findings
- The visually dominant problem is `DockerNodeStartGuideCard.vue`: each command uses a near-black `bg-gray-950` code block. With many command cards visible, this creates the heavy black bands shown in the user screenshot.
- The guide also uses a full blue outer panel plus nested blue/white cards, so the entire command guide reads as one large saturated block.
- `NodeManager.vue` stacks every management section in a full-width white content area. There is little page-level containment, so on wide desktop screens the command guide stretches and feels busier.
- The existing tests focus on content presence, command copy behavior, and section ordering. Class-only UI cleanup should not require test fixture changes.

## Runtime/Validation Notes
- `autobyteus-web` is a Nuxt/Electron frontend. `pnpm dev` starts the browser dev server, while Electron can provide the embedded server at `http://127.0.0.1:29695`.
- The Node Manager can render in browser dev mode with local fallback node registry data; Electron-specific remote browser sharing actions remain guarded by `window.electronAPI` checks.

## Scope Decision
Small. This is a frontend visual cleanup with no data-model, API, or runtime behavior changes.
