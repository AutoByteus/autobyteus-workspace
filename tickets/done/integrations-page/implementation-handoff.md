# Implementation Handoff — autobyteus-337: Integrations page

- From: Implementation engineer
- To: Code reviewer
- Date: 2026-11-01
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page`, branch `codex/integrations-page`, base `origin/personal` @ `0295553657` (fast-forwarded from `e4bebdc858` before work started).
- Code commits: `db704b76ee` (server), `50829d550f` (web), `9f8f1e799c` (one e2e assertion), `cf51bf0c55` (docs), `858e493786` (size splits, no behavior change), `f0eb43c749` (the host takes the agent definitions from its composition; found by the architecture guard in IMP-03), `9e8264614e` (a spec for the left-menu resize). Ticket documents and evidence are in the commit after these; the handoff message gives it.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Large / High). ARCH-REV-002 passed SR-009. Code review is next, by the `Large/High` handoff rule.
- Requirements doc: `tickets/in-progress/integrations-page/requirements-doc.md` (approved at SR-006, UI section at SR-008)
- Investigation notes: `tickets/in-progress/integrations-page/investigation-notes.md`
- Solution revision record: `tickets/in-progress/integrations-page/solution-revision-record.md`
- Design spec (required on every route): `tickets/in-progress/integrations-page/design-spec.md` (SR-009)
- Supplemental task artifacts:
  - the approved UI/UX r2: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/integrations-page-r2/ui-ux-spec.md` (VIS-001…VIS-035), plus the first design's VIS-019, with reference components in that repository's `components/integrations/*`;
  - the manifest contract `AutoByteus/autobyteus-integrations` `8887475` `docs/integration-manifest.md`.
- Design review report: `tickets/in-progress/integrations-page/design-review-report.md` (ARCH-REV-002 Pass)
- Architecture review revision record: `tickets/in-progress/integrations-page/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/integrations-page/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-009 (design), SR-006 (requirements)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A. AR-007 and AR-008 (non-blocking) are applied; see Important Assumptions.

**What exists now:**
- **The integration catalog** (`IntegrationCatalog`) reads the integration folders (`integration.json` plus `SKILL.md`) of the imported skill sources: local folders, and GitHub repositories in the ACTIVE state. It joins them with the app's delivery definitions and the connections.
- **Import** takes a GitHub link or an absolute or `~` folder path. It goes through `SkillSourceService` with the `requireIntegrationFolder` option, so a source with no integration folder is refused before publication or registration.
- **Manage sources** lists the integration sources, with Update (GitHub) and Remove.
- **Removing or updating a source** goes through the new source-change observer. It disconnects the affected integrations, and a failed disconnect refuses the removal or update. This holds on both pages and for automatic updates.
- **Access follows the skill.** At run preparation the full check records grants per run pass. Every proxied call runs the cheap check against those grants.
- **The GitHub card, its GraphQL and the agent ticks are gone.** The web has the Integrations page with its dialogs, plus the Skills page's "Integration" label.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the implementation changes what it was classified for:
  - the proxy's access rule;
  - user-chosen repository content reaching the UI;
  - two `SkillSourceService` extensions;
  - a GraphQL clean cut;
  - a new page.

  None of the three escalation triggers fired:
  - the per-call check is cheap (IMP-01);
  - repository content reaches the UI only as text and an `<img>` data URL;
  - every removal path disconnects or refuses (IMP-04, IMP-07, IMP-08).
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| DS-001 List (REQ-001, REQ-002, REQ-008, REQ-009, AC-001, AC-006) | One card per integration folder in an imported source, with state NEEDS_TOKEN, CONNECTED or NEEDS_NEWER_APP. Tools found on PATH. No network | Query `integrations` → `IntegrationCatalog.list()` (`credential-proxy/integration-catalog.ts`) → `parseIntegrationSource` (`integration-manifest.ts`) and `checkTools` (`tool-presence.ts`). Web: `pages/integrations.vue`, `IntegrationTile.vue`, `IntegrationStatusChip.vue`, `stores/integrationsStore.ts` | Implemented. DEC-017: when two sources hold the same ID, the first in skill-catalog precedence wins (AR-008). Invalid folders are skipped with one warning each |
| DS-002 Import / Manage (REQ-003, AC-002) | One field for a link or a folder. Coded refusals. Manage: Update (GitHub) and Remove | `importIntegrations` → `classifyImportLocation` (`integration-import-outcomes.ts`) → `SkillSourceService.importGitHubSkillSource` / `addSkillSource` with `{requireIntegrationFolder: {reservedIds}}` (`skills/domain/integration-folder-requirement.ts`), with outcomes mapped by `importOutcomeError`. `integrationSources`, `updateIntegrationSource`, `removeIntegrationSource`. Web: `IntegrationImportDialog.vue`, `IntegrationSourcesDialog.vue`, `IntegrationSourceRow.vue` | Implemented. Codes: NOT_A_LINK_OR_PATH, ALREADY_IMPORTED, DIRECTORY_NOT_FOUND, SKILL_NAME_CONFLICT, NO_INTEGRATIONS_FOUND, INTEGRATION_ALREADY_IMPORTED, GITHUB_UNREACHABLE, IMPORT_FAILED, SOURCE_NOT_FOUND, UPDATE_FAILED, REMOVE_FAILED |
| DS-003 Connect (REQ-004, AC-003, AC-007) | Write-only token, checked with GitHub before it is stored. Test, Replace, Remove | `connectIntegration` / `testIntegration` / `disconnectIntegration` → `IntegrationConnectionService` (per integration ID) → `DeliveryDefinition.verifyToken` (`delivery-definitions.ts`). Web: `IntegrationDialog.vue`, `IntegrationDetail.vue`, `IntegrationStepMarker.vue` | Implemented. Codes: TOKEN_REQUIRED, INTEGRATION_NOT_FOUND, TOKEN_REJECTED, TOKEN_CHECK_FAILED, INTEGRATION_NOT_CONNECTED, INTEGRATION_NOT_DELIVERABLE, VAULT_UNAVAILABLE |
| DS-004 Access (REQ-005, REQ-006, REQ-010, AC-004) | Full check at run preparation; cheap check on every call | `IntegrationAccessRule.grantsForAgent` (the resolved skill's real `rootPath` equals the integration folder) → `RunPassRegistry.issue(run, grants)` → `IntegrationRunAccess.environmentForRun` (now async, awaited by all five backends). `credential-proxy-routes.ts`: grant for the integration, then `allowsCall` (definition re-read, skill configured or ALL_INSTALLED, not disabled, source still registered), then the token | Implemented. A missing token gives INTEGRATION_NOT_CONNECTED (Important Assumptions). Refusal texts as in the design's § Proxy Refusal Texts |
| DS-005 Source removed / changed (DEC-015, DEC-016) | Removal from either page, or an update that drops an integration, disconnects. A failed disconnect refuses the removal or update | `SkillSourceService.setSourceChangeObserver`, called with `sourceRemoving` before a removal and `sourceChanging` before an update's publication. The catalog is the observer, registered by `credential-proxy-host.ts` and unset on close. `addSkillSource` / `removeSkillSource` and their resolvers are async | Implemented |
| REQ-006 / REQ-007 / AC-005 clean cut | No GitHub card, tick mutation or `agentDefinitionIds` | Removed: `api/graphql/types/github-integration.ts`, `GitHubIntegrationCard.vue`, `githubIntegrationStore.ts`, the GitHub queries and mutations, the Basics entry, and the store's tick methods | Implemented. Old `connections.json` read tolerantly; `agentDefinitionIds` dropped on the next write |
| Skills page label (r2) | "Integration" label linking to `/integrations#integration-<id>` | `skills` GraphQL `integrationId` (set via the catalog in `skills.ts`'s `skillMapper()`); `SkillCard.vue`; `SkillsList.vue` loads integrations | Implemented |
| Left menu height (r2) | The section follows the menu height until the user drags | `useAppLeftPanelSectionResize.ts` | Implemented |
| AC-008 (the teammate's way) | Import by link, connect, add the skill, `issues.sh list` / `comment` through the proxy, no token in output | Live e2e `github-credential-proxy-live.e2e.test.ts` (built server and in-process) | Pass (IMP-08) |
| AC-009 (integrations repo README) | Install steps describe the page | `/Users/normy/autobyteus_org/autobyteus-integrations-worktrees/integrations-page-readme`, branch `codex/integrations-page-readme` `696758f`, from origin/main `8887475` | Docs only. Not pushed; delivery finalizes it onto that repository's `main` |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

**Server** (`autobyteus-server-ts/src/`):
- **New, under `credential-proxy/`:**
  - `integration-catalog.ts`
  - `integration-import-outcomes.ts`
  - `integration-manifest.ts`
  - `tool-presence.ts`
  - `integration-access-rule.ts`
- **New:** `skills/domain/integration-folder-requirement.ts`, `api/graphql/types/integrations.ts`
- **Changed, under `credential-proxy/`:**
  - `integration-definitions.ts` → `delivery-definitions.ts`
  - `integration-connection-service.ts`, `-store.ts`
  - `integration-run-access.ts`
  - `run-pass-registry.ts`
  - `credential-proxy-routes.ts`
  - `credential-proxy-host.ts` (the access rule's agent-definition lookup is a required input, or the whole access rule is given; no ambient `AgentDefinitionService.getInstance()`, as `tests/architecture/application-framework-boundaries.test.ts` requires)
  - `credential-proxy-forwarder.ts` (type rename)
- **Changed, elsewhere:**
  - `skills/services/skill-source-service.ts`, `skills/services/skill-service.ts` (`listCatalogSourcePaths`, `isSkillDisabled`), `skills/domain/skill-source.ts`
  - `api/graphql/types/skills.ts`, `api/graphql/schema.ts`
  - `compositions/build-studio-server.ts` (passes `hostDefinitionServices.agentDefinitionService` to the host)
  - the five backends' `environmentForRun` awaits: `acp-session-launcher.ts`, `agy-agent-run-backend-factory.ts`, `autobyteus-agent-run-backend-factory.ts` with `autobyteus-integration-shell-environment.ts`, `claude-session-query-options.ts`, `codex-thread-bootstrapper.ts`
- **Removed:** `api/graphql/types/github-integration.ts`

**Server tests:**
- **Unit:** `credential-proxy-core.test.ts` rewritten; new `integration-manifest.test.ts`.
- **Integration:** new `integration-catalog.integration.test.ts`; host, git smart-http and connection-service tests updated.
- **Skills and run manager:** skills tests made async; `agent-run-manager.test.ts` updated.
- **E2E:**
  - new `integrations-graphql.e2e.test.ts`, replacing `github-integration-graphql.e2e.test.ts`;
  - live and runtime-shells e2e moved from ticks to the skill.

**Web** (`autobyteus-web/`):
- **New:**
  - `pages/integrations.vue`
  - `components/integrations/`: `IntegrationTile`, `IntegrationStatusChip`, `IntegrationIcon`, `IntegrationStepMarker`, `IntegrationDialog`, `IntegrationDetail`, `IntegrationToolsRow`, `IntegrationImportDialog`, `IntegrationSourcesDialog`, `IntegrationSourceRow`
  - `stores/integrationsStore.ts`
  - `composables/useModalDialog.ts`
  - `utils/externalLink.ts` (extracted from `MarkdownRenderer.vue`)
  - `utils/integrations/integrationText.ts`
  - GraphQL documents `graphql/queries/integrationsQueries.ts` and `graphql/mutations/integrationsMutations.ts`
  - locales `localization/messages/{en,zh-CN}/integrations.ts`
- **Changed:**
  - `SkillCard.vue`, `SkillsList.vue`
  - `useShellPrimaryNavigation.ts`
  - `useAppLeftPanelSectionResize.ts`
  - `ServerSettingsBasicsPanel.vue`
  - `MarkdownRenderer.vue`
  - `graphql/skills.ts`, `types/skill.ts`
  - the settings locales (GitHub card strings removed)
  - generated GraphQL types (this ticket's hunks only)
- **Removed:** `GitHubIntegrationCard.vue` and its spec, `githubIntegrationStore.ts`, `githubIntegrationQueries.ts`, `githubIntegrationMutations.ts`
- **Specs:**
  - `components/integrations/__tests__/IntegrationsPage.spec.ts`
  - `utils/integrations/__tests__/integrationText.spec.ts`
  - `components/skills/SkillCardIntegrationLabel.spec.ts`
  - the navigation and LeftSidebarStrip specs
- **Rendered probe:** `tests/e2e/integrations-page-probe.mjs` (`pnpm test:e2e:integrations-page`), replacing `github-integration-card-probe.mjs`.

**Docs:**
- `autobyteus-server-ts/docs/modules/credential_proxy.md`, `autobyteus-server-ts/docs/modules/skills.md`
- new `autobyteus-web/docs/integrations.md`; `autobyteus-web/docs/settings.md`
- `GLOSSARY.md`, `TESTING.md`

## Important Assumptions

**The review notes and prove-first items:**
- **AR-007:** the import option has the shape `{requireIntegrationFolder: {reservedIds: readonly string[]}}`. Presence ("a top-level folder with both `SKILL.md` and `integration.json`") and reserved IDs are checked in `skills/domain/integration-folder-requirement.ts`. That file imports nothing from `credential-proxy/`.
- **AR-008 / DEC-017:** when two sources hold the same integration ID, the catalog keeps the first in skill-catalog source precedence. That order comes from `SkillService.listCatalogSourcePaths()`, which wraps `listSkillCatalogSources`, the same order the skill catalog uses. Covered in `integration-catalog.integration.test.ts`.
- **Prove-first results:**
  - **The per-call read is cheap** (IMP-01, at pre-change `0295553657`): `getAgentDefinitionById` mean 0.006 ms (shared) and 0.009 ms (team-local) over 500 calls. The full `resolveConfiguredSkillBindingsForAgent` is 0.369 ms, and it runs only at preparation.
  - **Team-local agents** resolve through `resolveConfiguredSkillBindingsForAgent` (the IMP-01 probe).
  - **Application-owned agents** resolve bundle-first (`configured-agent-skill-resolver.ts`). A bundle copy of the skill therefore resolves to the bundle's folder and grants nothing, because the `rootPath` differs. A test covers this.
  - **A run's source is recorded at preparation** in its grants (`{integrationId, skillName, sourceId}`).

**The access rule:**
- **Recording the source:** the grant records the source ID, not the folder path. It is `local:<path>` for a folder, or the GitHub record ID, because a GitHub source's folder path changes with each published generation. `allowsCall` checks `isSourceRegistered(sourceId)`.
- **A missing token** in the cheap check gives `INTEGRATION_NOT_CONNECTED` ("{name} is not connected on this node. Connect it on the Integrations page.") rather than NOT_ALLOWED. That text tells the user what to fix. The design lists "the token is present" as part of the cheap check without naming the refusal.
- **`environmentForRun` is async,** because the full check reads the agent definition. All five backends await it.

**Web:**
- **Component names** follow the approved r2 UI spec and its reference components, not the design spec's provisional names:
  - `IntegrationImportDialog` for `ImportIntegrationsDialog`;
  - `IntegrationTile` for `IntegrationCard`;
  - `IntegrationDetail` for `TokenConnectStep`, with the step markers in `IntegrationStepMarker`.
- **Locale messages added** beyond the r2 strings, for coded outcomes the UI spec does not word:
  - `errorFailed {reason}`;
  - `errorIntegrationAlready` (INTEGRATION_ALREADY_IMPORTED);
  - `sources.errorChange`;
  - `connect.errorVaultUnavailable`;
  - `connect.errorNotConnected`;
  - `page.loadFailed`.

  The wording follows the spec's tone.
- **A GitHub source's status** in Manage: only `UPDATE_AVAILABLE` shows "Update available". The other states show the spec's up-to-date or neutral label.
- **On mobile,** Integrations is gated like Nodes (desktop settings).
- **`useModalDialog`** carries the shared modal behavior for the three dialogs: focus on open, Tab kept inside, Esc, focus returned to the opener. Two older modals still have their own copy (FU-001).
- **`token.help` links:** only `https:` URLs become links. `helpTextParts` builds text nodes and link elements; nothing goes through `v-html`. Links open through `utils/externalLink.ts`, extracted from `MarkdownRenderer.vue`, which now imports it: `electronAPI.openExternalLink`, or `window.open` with `noopener`. `javascript:`, `data:` and `http:` stay text, and specs cover them.
- **The icon** is shown only as an `<img>` data URL. The server accepts `icon.svg` only up to 64 KB with an `<svg` root and returns it base64-encoded.

**Generated code and tests:**
- **Codegen:** only this ticket's hunks were kept in the generated GraphQL types, plus the `ProjectRunHistoryObject` and `QueryProjectRunHistoryArgs` types that the regenerated file needs to compile. The rest of the regeneration drift is pre-existing and unrelated.
- **The runtime-shells e2e** moved from ticks to the skill: it imports a local integration folder, sets the skill with `updateAgentDefinition`, and connects with `connectIntegration`. The rendered probe was renamed from the GitHub card probe.

## Known Risks

- **R-4 (accepted in the design):** a local integration folder deleted by hand leaves its token in the vault with no card. This ends when the folder comes back or the source is removed.
- **R-2 (the user's DEC-002):** agents set to "all installed skills" get access once the integration is connected. This is documented in `credential_proxy.md` and `autobyteus-web/docs/integrations.md`.
- **Cheap-check limits:** the cheap check compares skill names, plus "the source is still registered". It does not re-resolve the `rootPath` on every call. If the agent keeps the skill name but the name now resolves to a different folder, the run keeps its grant until its next preparation, as long as the original source is still registered. The full check at the next run rejects it. The design accepts this (§ Key Tradeoffs: "Two checks of one rule").
- **GitHub reachability for Update and Import** is covered by fixtures in the integration tests and by the live test's import by link. A real network outage is not simulated.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature` + `Behavior change` (the access rule)
- Reviewed root-cause classification: `Shared Structure Looseness` (name and description in two places) → delivery definitions trimmed; otherwise `No Design Issue Found`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` (bounded)
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: each bounded refactor is done:
  - `delivery-definitions.ts` has no `displayName` or `description`;
  - the connection service is per integration;
  - the ticks are removed;
  - `SkillSourceService` has exactly two named extensions (the import option and the change observer), plus the async add/remove the observer needs and `isSourceRegistered`. There is no parallel importer.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The tolerant `connections.json` read is the approved "Directly Usable — No Migration" decision, not a compatibility layer: unknown fields are ignored and dropped on the next write.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. The following are removed:
  - the tick methods;
  - `setAgentAccess`;
  - `displayName` and `description`;
  - the GitHub card, store, queries, mutations and probe;
  - the old GraphQL e2e.
- Dead code found elsewhere, added to `follow-ups.md`: None. FU-001 is duplication, not dead code.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. IMP-13 at `858e493786` shows no changed file over 500 effective lines. The largest changed files are existing ones that grew a little:
  - `SkillsList.vue`: 479, +3 effective;
  - `autobyteus-agent-run-backend-factory.ts`: 478, +0 effective.

  The over-220 deltas measured at `cf51bf0c55` were split in `858e493786`. Two new files remain just above 220 added lines and are assessed in the IMP-13 log:
  - `IntegrationDetail.vue`: 224 effective;
  - `integration-catalog.ts`: 216 effective.
- Notes: `general-process-run-supervisor.ts` (a size note from autobyteus-311's CRR-001) is not touched by this ticket.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Directly Usable — No Migration` (`connections.json`). The vault entry and skill-source storage are unchanged.
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: the test "reads a beta.4 entry (with agent ticks) as its login, and drops the ticks at the next write" (`tests/unit/credential-proxy/credential-proxy-core.test.ts`, IMP-04). It writes a beta.4-shaped `connections.json` with `agentDefinitionIds`, reads `{login, connectedAt}`, and the next write leaves `agentDefinitionIds` out.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The worktree needed `pnpm install`, `pnpm prepare:shared` and `prisma generate` before tests.
- All checks ran in a clean environment: `env -i PATH HOME=<temp dir> TMPDIR`, through `/tmp/ip-ev/ev.sh`, which writes the evidence header.
- The live checks (IMP-08, IMP-09) read the token from the test vault (`AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`, entry `test.github.token`) inside the test process. The token is never put in a shell variable, a command or a log. IMP-14 scans the ticket folder for it.
- The user's `~/.autobyteus` and the running app were not touched. Every server run used its own temp data root.
- No new dependencies.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Prove-first probe: `pnpm exec vitest run tests/integration/zz-access-cost-probe.test.ts` (the file is kept in evidence, not in the repo) | `0295553657` (pre-change) | macOS 26.5.2 arm64, node v22.23.1 | `AgentDefinitionService.getAgentDefinitionById`, `SkillService.resolveConfiguredSkillBindingsForAgent` | DS-004, R-3 | Pass | `evidence/IMP-01-access-cost-probe.log`, `evidence/probe/access-cost-probe.test.ts` | `getAgentDefinitionById(team-local): mean 0.009 ms over 500 calls`; `full check, whole catalog scan): mean 0.369 ms` |
| IMP-02 | `pnpm -s typecheck` (server) | `f0eb43c749` | same, clean env | all server src | — | Pass | `evidence/IMP-02-server-typecheck.log` | `# Exit code: 0` |
| IMP-03 | `pnpm -s run test:unit` (server: unit, app-data migrations, architecture, work journal) | `f0eb43c749` | same, clean env | all server unit and architecture tests | regression, DS-001…DS-005 | Pass | `evidence/IMP-03-server-unit-full.excerpt.log`, full log `evidence/IMP-03-server-unit-full.log` | `Tests  7681 passed \| 9 skipped (7690)`. At `858e493786` this run caught the host's ambient `AgentDefinitionService.getInstance()` (architecture guard), which `f0eb43c749` fixes |
| IMP-04 | `pnpm -s exec vitest run tests/unit/credential-proxy tests/integration/credential-proxy tests/unit/skills tests/unit/agent-execution/agent-run-manager.test.ts tests/architecture/application-framework-boundaries.test.ts` | `f0eb43c749` | same, clean env | credential proxy (catalog, manifest, access rule, routes, host, connection service and store, run access), skill sources, run manager, the architecture guard | DS-001…DS-005, AC-002…AC-007, DEC-015…DEC-017 | Pass | `evidence/IMP-04-credential-proxy-and-skills.log` | `Tests  309 passed (309)` |
| IMP-05 | `pnpm -s run test:integration:prepare`, then `pnpm -s run test:integration` (server) | `f0eb43c749` | same, clean env | all server integration tests | regression | Fail, with 6 pre-existing failures only (FU-003) | `evidence/IMP-05a-server-integration-prepare.log`, `evidence/IMP-05-server-integration-full.excerpt.log`, full log `evidence/IMP-05-server-integration-full.log`; `evidence/IMP-05b-failing-integration-files-at-base.log` | `Tests  6 failed \| 493 passed \| 69 skipped (568)`. The same 6 fail at the base: IMP-05b `Tests  6 failed \| 36 passed (42)`. None is in credential-proxy or skills |
| IMP-06 | `pnpm -s build` (server) | `f0eb43c749` | same, clean env | server build and bootstrap smoke | — | Pass | `evidence/IMP-06-server-build.log` | `Sanitized built-module/bootstrap smoke passed without DATABASE_URL.` |
| IMP-07 | `pnpm -s exec vitest run tests/e2e/credential-proxy/integrations-graphql.e2e.test.ts` (built server, own data dir and vault) | `f0eb43c749` | same, clean env | GraphQL `integrations`, `integrationSources`, import/remove, connect/test/disconnect refusals, `skills.integrationId`, removed GitHub API | AC-001, AC-002 (folder), AC-005, AC-006, DS-005 | Pass | `evidence/IMP-07-integrations-graphql-built-server.log` | `Tests  5 passed (5)` |
| IMP-08 | Live, gated: `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault AUTOBYTEUS_LIVE_STRICT=1 RUN_GITHUB_PROXY_E2E=1 pnpm -s exec vitest run tests/e2e/credential-proxy/github-credential-proxy-live.e2e.test.ts --no-watch` | `f0eb43c749` | same, clean env, GitHub (`ryan-zheng-teki/autobyteus-mcp-test`) | import by link on a built server, connect, test, remove; AC-008 scripts through the proxy, skill removal → 403, local folder copy; token scans | AC-002 (link), AC-003, AC-004, AC-007, AC-008 | Pass | `evidence/IMP-08-github-live.log` | `✓ runs the integration's own scripts through the proxy for an agent with its skill, from a GitHub source and a local folder (AC-008)`; `Tests  2 passed (2)`. Each run posts one comment on issue #1 (TESTING.md) |
| IMP-09 | Runtime shells, scripted cells: the IMP-08 variables plus `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<server>/tests/fixtures/agy-shell-env-probe-cli.mjs RUN_GROK_SCRIPTED_E2E=1`, `pnpm -s exec vitest run tests/e2e/credential-proxy/github-credential-proxy-runtime-shells.e2e.test.ts --no-watch` | `f0eb43c749` | same, clean env, GitHub | real AGY and Grok runs: variables only with the skill, skill removed → refused, added again, team member scoping | AC-004, REQ-005, REQ-006 | Pass | `evidence/IMP-09-runtime-shells-scripted.log` | `Tests  4 passed \| 6 skipped (10)` (the 6 skipped are live LLM cells, gated) |
| IMP-10 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, `node scripts/typecheck.mjs` (web) | `9e8264614e` | same, clean env | web boundaries, locales, types | — | Pass for this ticket: three guards exit 0; typecheck `production errors: 2`, both pre-existing (FU-002) | `evidence/IMP-10-web-guards-typecheck.log`, `evidence/IMP-10b-web-typecheck-at-base.log` | `test-file errors: 298 in 139 files (baseline 298 in 139 files)`; the 2 production errors are in `autobyteus-server-ts/tests/fixtures/recorded-upload-labels.ts` and appear identically at the base (IMP-10b) |
| IMP-11 | Web full: `cross-env NUXT_TEST=true vitest run`, then `vitest run --config ./electron/vitest.config.ts` | `858e493786` (web unchanged since, apart from the IMP-11b spec) | same, clean env | all web specs | VIS, AC-001…AC-006 (web) | Pass | `evidence/IMP-11-web-full.excerpt.log`, full log `evidence/IMP-11-web-full.log` | `Tests  4944 passed \| 2 skipped (4946)`; electron `Tests  291 passed \| 1 skipped (292)` |
| IMP-11b | Focused web specs: integrations components and text, Skills label, left-menu resize (new), navigation, LeftSidebarStrip, Basics, Markdown renderer | `9e8264614e` | same, clean env | the page, dialogs, store, `helpTextParts` link rules, `useModalDialog` keyboard behavior, `externalLink`, left-menu resize | VIS, AC-001…AC-006, the AR-003 link rules | Pass | `evidence/IMP-11b-web-integrations-specs.log` | `Tests  95 passed (95)` |
| IMP-12 | Rendered probe: `node tests/e2e/integrations-page-probe.mjs --skip-server-build --output-dir=<evidence>/IMP-12-integrations-page-ui` (disposable node on the IMP-06 build, Nuxt, headless Chrome) | `f0eb43c749` | same, Chrome | INT-001…INT-012 (see the frontend section) | AC-001, AC-002 (folder), AC-003 (rejected), AC-005, AC-006, VIS | Pass | `evidence/IMP-12-integrations-page-ui.log`, `evidence/IMP-12-integrations-page-ui/` (`result.json`, 23 screenshots, backend and frontend logs) | `Result Pass`; 12 `Pass INT-…` lines |
| IMP-13 | Size guardrails (script in the log header) | `858e493786` (source unchanged in the later commits apart from `credential-proxy-host.ts`: +10 −7, far below every limit) | same | changed source files | — | Pass | `evidence/IMP-13-size-guardrails.log` | no first column over 500; two rows over +220, assessed at the end |
| IMP-14 | Token scan of the ticket folder: a temporary vitest file reads `test.github.token` from the test vault and scans every file byte for byte, after all documents and evidence were final. The file was deleted afterwards; its source is kept | `9e8264614e` | same, clean env | all ticket documents and evidence, screenshots and probe logs included | AC-007 | Pass | `evidence/IMP-14-token-scan.log`, `evidence/probe/token-scan.test.ts` | `IMP-14 files scanned: 62, bytes: 5992802, files containing the token: 0` |

- Not run, and why:
  - the six live LLM cells of the runtime-shells e2e (Codex, Claude, ACP and others with real models) are gated on real runtimes and accounts; this is left to API/E2E;
  - the gated voice-input real-release spec is unrelated;
  - no installed-app (Electron package) run, which is left to API/E2E or delivery.

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces / journeys:**
  - the Integrations page (empty state, grid, Import dialog, Manage sources, the integration dialog with its connect, rejected, connected and tools states);
  - the left navigation;
  - the Skills page "Integration" label and its deep link;
  - Server Settings → Basics, without the card;
  - the left-menu section height.
- **Approved UI/UX, interaction, requirement, or design references:** r2 `ui-ux-spec.md` VIS-001…VIS-035 and the first design's VIS-019, with the reference components in `autobyteus-web-design/components/integrations/*`; REQ-001…REQ-010.
- **Existing design system, shared components, and adjacent product surfaces reviewed:**
  - the Skills source dialog (Browse pattern, update confirmation);
  - `ProjectDialogFrame.vue` and `SkillSourcesModal.vue` (modal behavior, which led to `useModalDialog`);
  - `MarkdownRenderer.vue` (the external-link path);
  - the Nodes navigation gating.
- **Testing guideline or development / preview instructions and rendered surface used:** `TESTING.md`. The probe starts a disposable backend node on a fresh data root and a Nuxt frontend bound to it, driven in headless Chrome. One folder is imported: a `github` integration with an icon and one missing tool.
- **States, layouts, viewports, and interactions inspected:**
  - **Rendered (IMP-12, INT-001…INT-012):**
    - the empty page, with Integrations last in the menu, after Nodes;
    - the Import dialog's hints (link trust text, folder text) and its three refusals; the folder import with the notice, the needs-token card, the icon and the missing tool; the re-import refusal;
    - the connect step with the help link and tools; a dummy token GitHub rejects (a real 401); the connected card and dialog (an intercepted response);
    - the Skills label opening its card, focused;
    - Manage sources (a folder row without Update, the Remove confirmation, the last-removal notice); removal from Skills → Manage Skill Sources removing the card;
    - Basics without the GitHub card;
    - a narrow 390 px viewport in zh-CN (empty, with a card, with an import error).
  - **Component specs (IMP-11b), not the probe:**
    - keyboard: Tab stays in the dialog, Esc closes it, focus returns to the opener;
    - the `token.help` link rules;
    - GitHub-source rows (Update, status);
    - the left-menu section following the menu height until a drag (new spec).
  - On mobile the page is gated like Nodes; the narrow viewport above is the desktop layout at 390 px.
- **Visual or interaction issues found and corrected:**
  - the probe's `main` locator was replaced by `body`;
  - screenshots now wait for network idle plus 400 ms;
  - the page imports `useRoute` from vue-router explicitly;
  - the left-panel section now follows the menu height (the r2 fix).

  I compared the IMP-12 screenshots (the card, the connected dialog, the narrow zh-CN card among them) with the VIS references; they match.
- **Check IDs with the supporting evidence, and remaining unverified states or limitations:** IMP-12 (screenshots and `result.json`), IMP-11 and IMP-11b (component specs). The left-menu height is checked by a spec with a stubbed `ResizeObserver`, not in a rendered browser. A real GitHub connect is not rendered: the connected state is intercepted, and the real connect is IMP-08. GitHub-source rows (Update) are covered by component specs and IMP-08, not by the probe.

## Downstream Coverage Hints / Suggested Scenarios

- **AC-008 in the real app:** in an installed or dev app on an isolated data root, Import `https://github.com/AutoByteus/autobyteus-integrations` on the page, connect with the test-vault token, and add `github-integration` to an agent. Have a real LLM agent run `issues.sh list` and `issues.sh comment` on `ryan-zheng-teki/autobyteus-mcp-test`. Then check the activity records and run a token scan.
- **Removal from the Skills page** (Manage Skill Sources → Remove) while connected: the connection is gone, and a running agent's next call is refused.
- **Update dropping an integration (DEC-016):** use a local fixture repository published as a new revision without the `github` folder.
- **Agents set to all installed skills** get access. A disabled skill is refused.
- **Team-local and application-owned agents:** a bundle copy of `github-integration` grants nothing.
- **beta.4 upgrade:** a node with an old `connections.json` (`agentDefinitionIds`) and a saved token shows "Connected as @login" right after the repository is imported.
- **`token.help`** with `http:`/`javascript:` links stays text in the rendered dialog.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- the live LLM cells of `github-credential-proxy-runtime-shells.e2e.test.ts` (real runtimes);
- AC-008 driven through the real UI by a real agent;
- an installed-app check of the page and navigation;
- the scenarios above that the implementation checks cover only with fixtures or intercepted responses: the Update path on a real GitHub repository with a new revision; the beta.4 upgrade on a real data root.
