# Investigation Notes: Node Manager Tabs

- Date: 2026-05-13
- Stage: 1 Investigation + Triage
- Scope classification: Small UI structure change in `autobyteus-web/components/settings/NodeManager.vue`, plus tests, localization, and docs.

## Current Behavior

- `components/settings/NodeManager.vue` owns the Settings → Nodes page content.
- The page header is `Node Manager` and the scroll body currently renders, in order:
  1. Current Window Node card
  2. `RemoteBrowserSharingPanel`
  3. `DockerNodeStartGuideCard`
  4. Add Remote Node form
  5. Run Full Sync form
  6. Configured Nodes list
- `DockerNodeStartGuideCard.vue` is static/tutorial/help content. It shows copyable install and lifecycle CLI commands and does not persist application settings.
- Because the Docker tutorial is placed above Add Remote Node and sync/configured-node content, the settings page can visually read as a Docker tutorial page before the actual node management settings.

## Relevant Tests

- `components/settings/__tests__/NodeManager.spec.ts` currently stubs `DockerNodeStartGuideCard` and asserts it renders before Add Remote Node.
- `components/settings/__tests__/DockerNodeStartGuideCard.spec.ts` validates the Docker guide content and copy behavior independently.

## Relevant Localization/Docs

- Node Manager strings live in `localization/messages/en/settings.ts` and `localization/messages/zh-CN/settings.ts`.
- `docs/settings.md` currently documents the Docker guide as rendering before the Add Remote Node form.

## UX Analysis

- The user's observation is accurate: Docker launcher instructions are tutorial/onboarding content, not saved node settings.
- A two-tab layout is appropriate because it preserves discoverability while separating two modes:
  - **Manage Nodes**: actual node registry/settings/sync operations.
  - **Docker Setup**: static Docker launcher tutorial and command-copy help.
- The default tab should be **Manage Nodes** so Settings → Nodes opens to the actionable settings/management surface.
- Moving Docker tutorial content into the second tab avoids implying that Docker command copy cards are required settings fields.

## Risks / Constraints

- Keep all existing node management behavior intact.
- Keep Docker guide implementation unchanged and only move its placement.
- Preserve localization coverage for English and Chinese.
- Avoid persisting tab state unless a current product requirement asks for it; a local tab state is enough.
- Use accessible tab semantics (`role=tablist`, `role=tab`, `aria-selected`, `role=tabpanel`) and stable test ids.

## Re-Entry Investigation: Stage 8 CR-001

- Date: 2026-05-13
- Trigger: Stage 8 code review
- Finding: `NodeManager.vue` measured 543 effective non-empty lines after the initial tab implementation, exceeding the workflow hard limit of 500 for changed source implementation files.
- Root cause: adding tab chrome directly to an already large `NodeManager.vue` mixed the tab display boundary into the node management owner and increased file-size pressure.
- Required design response: extract the tab strip into a small owned settings component so `NodeManager.vue` keeps node-management orchestration while the child component owns tab presentation/accessibility. This should reduce `NodeManager.vue` below 500 non-empty lines and improve separation of concerns without changing runtime behavior.
