# Integrations Page

The Integrations page (main menu → **Integrations**, last after Nodes) lets the
user bring integrations onto the node, connect them and keep their sources up to
date. An integration is a skill plus authentication: a folder with an
`integration.json` and a `SKILL.md` in an imported skill source. Agents use it
through the node's credential proxy, and never see the token.

Approved design: `autobyteus-web-design` `tickets/done/integrations-page-r2/ui-ux-spec.md`
(VIS-001…VIS-035). Server side: [Credential Proxy](../../autobyteus-server-ts/docs/modules/credential_proxy.md).

## Files

- `pages/integrations.vue`: the toolbar (Manage sources, Import), the notice, the
  empty state, the card grid, and the card reached from `#integration-<id>`
  (scrolled to and focused).
- `components/integrations/`:
  - `IntegrationTile.vue`, `IntegrationStatusChip.vue`, `IntegrationIcon.vue`:
    the card, its chip (**Installed, needs a token** · **Connected as @login** ·
    **Needs a newer AutoByteus**) and its icon (an `<img>` of the icon's data URL,
    never inline SVG; a letter tile without an icon);
  - `IntegrationImportDialog.vue`: one field, "GitHub repository link or folder
    path"; a web address is a repository, anything else a folder. **Browse…**
    appears where the native folder picker exists. The hint follows the input
    (the trust text for a link, "nothing is copied" for a folder). Each refusal
    (`NOT_A_LINK_OR_PATH`, `DIRECTORY_NOT_FOUND`, `NO_INTEGRATIONS_FOUND`,
    `SKILL_NAME_CONFLICT`, `GITHUB_UNREACHABLE`, `ALREADY_IMPORTED`,
    `INTEGRATION_ALREADY_IMPORTED`) has its message under the field; success
    closes the dialog and the page names the new integrations;
  - `IntegrationSourcesDialog.vue`: the imported sources that hold integrations. A
    GitHub source has **Update** (the product's "Update entire skill source?"
    confirmation) and Remove; a local folder has Remove only (its files stay).
    The Remove confirmation adds "This also removes your … connection." when an
    integration in it is connected. Removing the last source closes the dialog
    with a page notice;
  - `IntegrationDialog.vue`, `IntegrationDetail.vue`, `IntegrationStepMarker.vue`:
    the three steps (Imported, with the source; Connect, with the integration's
    help text and the token form; Give agents access) and the tools row.
- `stores/integrationsStore.ts`: the cards and sources (read on the node, no
  network), import, update, remove, connect, test, disconnect; server errors keep
  their code and details (`IntegrationError`).
- `composables/useModalDialog.ts`: the three dialogs' shared behavior: focus moves
  in on open (the Import field, or the dialog), Tab and Shift+Tab stay inside,
  Esc closes (not while an operation runs, not while a confirmation is open), and
  focus returns to the button that opened the dialog.
- `utils/integrations/integrationText.ts`: the skill name shown as code in a
  sentence, and the help text split into text and links. Only `https:` addresses
  become links; `http:`, `javascript:`, `data:` and anything else stay text. The
  parts render as text nodes and link elements, never through `v-html`. A link
  opens through `utils/externalLink.ts` (the desktop app's handler, or a new tab
  without an opener).
- Skills page: `components/skills/SkillCard.vue` shows a small **Integration**
  label on an imported integration's skill (`integrationId` from the server),
  linking to its card. Skills → Manage Skill Sources lists the imported sources
  like any; removing one there removes its cards and connections.
- `composables/useShellPrimaryNavigation.ts`: the `integrations` key (hidden in
  the mobile remote-access runtime, like Nodes). `useAppLeftPanelSectionResize.ts`
  makes the menu section follow the menu's height until the user drags the divider,
  so a late item is never cut off.
- Strings: `localization/messages/{en,zh-CN}/integrations.ts`.

## Tests

- `components/integrations/__tests__/IntegrationsPage.spec.ts`: the page, the
  three dialogs and their texts against the approved design, through the real store.
- `utils/integrations/__tests__/integrationText.spec.ts`: which help-text
  addresses become links.
- `components/skills/SkillCardIntegrationLabel.spec.ts`: the Skills label.
- `tests/e2e/integrations-page-probe.mjs` (`pnpm test:e2e:integrations-page`,
  after a server build): the page in a real browser against a disposable node,
  with a folder import, the refusals, the Skills label, removal from either page,
  Basics without the GitHub card, 390 px and zh-CN.
