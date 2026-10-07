# Investigation Notes

## Meta
- Package: `projects-always-on`
- Request: remove the `ENABLE_PROJECTS` feature flag; Projects always available (user, 2026-10-07)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on`, branch `codex/projects-always-on`
- Base: `origin/personal@93d1b18b4` (fetched 2026-10-07); target `origin/personal`
- Current SR: `SR-001` (Draft)
- Authorities read: `references/requirements-engineering.md` (2026-10-06)

## Request
User (2026-10-07): "I think we can already enable the projects now. The feature is already mature. We can enable it now… we can remove this feature flag now."

Context: this came while discussing a right-panel "Projects" tab next to the conversation (separate, not yet opened). Earlier residual (`project-manager-ux` delivery): the Server Settings Projects toggle needed a second click.

## Source Log
| Source | Finding |
| --- | --- |
| `autobyteus-server-ts/src/projects/domain/settings.ts`; `services/projects-capability-service.ts`; `api/graphql/types/projects-capability.ts`; `api/graphql/schema.ts` | Server setting `ENABLE_PROJECTS`. Unset is persisted as `false` (default off). GraphQL capability query and mutation. It is a UI visibility flag only; backend CRUD, agent tools and the change feed are independent (`docs/modules/projects.md`). |
| `autobyteus-web/stores/projectsCapabilityStore.ts`; `graphql/queries/projectsCapabilityQueries.ts`; `graphql/mutations/projectsCapabilityMutations.ts` | Web capability store and transport |
| `autobyteus-web/middleware/feature-flags.global.ts` | `/projects*` redirects to `/` when disabled. It also gates `/applications` (unrelated, stays). |
| `autobyteus-web/composables/useShellPrimaryNavigation.ts:92-103` | The Projects nav item shows only when the capability is enabled AND `isFeatureAvailableInRuntime('projects')`. The runtime gate (mobile) is separate and stays. |
| `autobyteus-web/components/settings/ProjectsFeatureToggleCard.vue`; `ServerSettingsBasicsPanel.vue`; `stores/serverSettings.ts:61-64` (Advanced key → capability refresh); localization `settings` en/zh-CN | Settings UI for the flag |
| Tests and probes | `projects-capability-service.test.ts`, schema/type tests, server settings tests, web settings/middleware/navigation specs, `projects-feature-probe.mjs`, `projects-primary-navigation-probe.mjs`, `fresh-run-auto-approval-probe.mjs` (capability stub) |
| Docs | `autobyteus-web/docs/projects.md` ("Scope And Gating"), `docs/settings.md`, `autobyteus-web/AGENTS.md` catalog line, server `docs/modules/projects.md` |
| `autobyteus-web/resources/server/**` | Git-ignored packaged copy; not a source |

## Persisted state
- Server settings may contain `ENABLE_PROJECTS=true|false` (written as `false` on first capability read).
- After removal the key has no meaning. Whether it is ignored or cleaned up is DEC-001.
- Projects/Task data is unaffected.
