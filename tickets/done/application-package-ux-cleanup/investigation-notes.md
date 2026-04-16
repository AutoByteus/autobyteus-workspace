# Investigation Notes

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Investigation Status

- Bootstrap Status: Completed.
- Current Status: Requirements basis remains user-approved; upstream artifacts have now been refined to close architecture finding `AR-001` by explicitly carrying application-owned team definitions through the new team-level launch-preference model, and the package is ready for architecture re-review.
- Investigation Goal: Determine the correct product model and UX/data-ownership boundaries for (a) built-in versus imported application package presentation in Settings → Application Packages, and (b) general default/preferred launch settings for agent and team definitions.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The ticket now spans two related but distinct UX/design cleanup slices. The package-source slice touches trust, source-ownership mental model, API/store presentation shape, and built-in-vs-imported package-source contract. The launch-preferences slice touches agent-definition UX, team-definition domain/API/store expansion, and shared launch/run configuration interaction patterns.
- Scope Summary: Clarify how built-in platform applications should appear (or not appear) in the Application Packages UI, whether raw paths should ever be shown by default, how zero-built-in-app states should work, whether built-in applications should be materialized into server-data-managed storage, and how reusable definition-level launch preferences for agents and teams should be modeled, surfaced, and aligned with existing run-configuration UX.
- Primary Questions To Resolve:
  1. Should empty built-in application sources be hidden entirely in the normal UI?
  2. Should built-in application sources ever expose raw filesystem paths outside details/debug surfaces?
  3. Should built-in platform apps continue to be resolved from bundle resources while imported packages keep their current storage models, or should built-ins be materialized into a managed server-data package root instead?
  4. How should built-in, linked local, and GitHub-installed application packages differ in normal user-facing presentation?
  5. Which boundary should own this package-source presentation policy?
  6. Should definition-level launch defaults be treated as a general reusable-definition capability rather than an application-specific one?
  7. How should shared and application-owned team definitions gain equivalent launch-default support without inventing a second inconsistent model or leaving ownership-specific launch fallbacks behind?
  8. Which existing runtime/model/config UI boundary should be reused so definition editing matches run-time configuration UX?
  9. Where should the optional launch-preference section sit in the editor information architecture so it does not dominate primary authoring concerns?

## Request Context

The earlier application-bundle ticket is already merged. The user first reported live packaged Electron feedback that the Settings → Application Packages screen still shows a confusing built-in row even when `applicationCount = 0`, and that row exposes a raw filesystem path which can look like a personal repo/worktree path in local builds or an internal resources path in installed builds. The user explicitly escalated this as a design-owned trust/mental-model problem and requested a new follow-on ticket/design slice.

During clarification on the new ticket, the user added a second requirement: the current **Default launch settings** UI visible in agent definition editing should be reconsidered as a general feature. The user’s view is that runtime choice, model identifier, and LLM config are not only relevant for application-launched agents; they are also a reasonable reusable-definition preference for directly launched agents and agent teams. The user also explicitly called out that the current UI is poor compared with the existing direct run configuration forms and asked for analysis of the broader design.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup/tickets/in-progress/application-package-ux-cleanup`
- Current Branch: `codex/application-package-ux-cleanup`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded before worktree creation.
- Task Branch: `codex/application-package-ux-cleanup`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): not yet confirmed; likely the repository’s normal integration/finalization path for follow-on merged tickets.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This is a new post-merge follow-on ticket. Do not treat the earlier merged application-bundle ticket folder as the canonical artifact location for this slice.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-16 | Command | `git remote show origin`; `git worktree list`; `git fetch origin --prune`; `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup -b codex/application-package-ux-cleanup origin/personal` | Bootstrap the new ticket in a dedicated worktree/branch from fresh remote state | Default remote branch for this repo is `origin/personal`; new dedicated follow-on worktree/branch created successfully | No |
| 2026-04-16 | Code | `autobyteus-web/components/settings/ApplicationPackagesManager.vue` | Inspect the current Settings UI behavior | Component always renders every package row returned by the store, prints `Built-in | Applications: {{ applicationCount }}`, and prints raw `pkg.path` for non-GitHub rows, including the built-in row | Yes |
| 2026-04-16 | Code | `autobyteus-web/stores/applicationPackagesStore.ts` | Inspect current frontend data contract | Store preserves backend package records directly and does not classify or redact built-in path/source metadata before the UI renders it | Yes |
| 2026-04-16 | Code | `autobyteus-server-ts/src/application-packages/services/application-package-service.ts` | Inspect current package-list product contract | `listApplicationPackages()` always prepends one built-in package row via `mapBuiltInPackage(...)` even when no built-in applications exist; the built-in row exposes raw `path` and `source` values | Yes |
| 2026-04-16 | Code | `autobyteus-server-ts/src/application-packages/stores/application-package-root-settings-store.ts` | Inspect how built-in package roots are resolved and protected | Built-in root path is resolved separately from additional roots and cannot be registered as an extra package root | Yes |
| 2026-04-16 | Code | `autobyteus-server-ts/src/application-bundles/utils/built-in-application-package-root.ts` | Inspect why local/personal builds surface personal-looking paths | Built-in root is resolved by upward scan from the server app root to the nearest ancestor containing an `applications/` directory, which can yield a developer repo/worktree root in local builds | Yes |
| 2026-04-16 | Code | `autobyteus-server-ts/src/application-packages/utils/application-package-root-summary.ts` | Inspect how application counts are computed | `applicationCount` is simply the number of direct child app roots under `applications/` containing `application.json`; this is why an empty built-in root still yields a row with `applicationCount = 0` | No |
| 2026-04-16 | Code | `autobyteus-server-ts/src/application-packages/installers/github-application-package-installer.ts` | Inspect imported-package storage semantics | GitHub-installed application packages are materialized into app-managed storage under `AppDataDir/application-packages/github/...`; this differs from built-in bundle resources and linked local package roots | Yes |
| 2026-04-16 | Code | `autobyteus-server-ts/src/config/app-config.ts` | Verify whether the server already has a canonical app-data-root boundary analogous to agents/teams storage | `AppConfig` already exposes `getAppDataDir()` and stores built-in shared agents/teams under server-data-managed `agents/` and `agent-teams/` directories | Yes |
| 2026-04-16 | Doc | `autobyteus-server-ts/docs/modules/applications.md` | Confirm documented built-in/imported discovery model | Docs explicitly state discovery walks built-in roots plus registered additional roots, with the repo-local built-in container remaining authoritative for built-in identity | Yes |
| 2026-04-16 | Code | `autobyteus-web/components/settings/__tests__/ApplicationPackagesManager.spec.ts`; `autobyteus-web/stores/__tests__/applicationPackagesStore.spec.ts`; `autobyteus-server-ts/tests/e2e/applications/application-packages-graphql.e2e.test.ts` | Check whether tests currently encode the confusing built-in-row behavior | Tests currently assume the built-in row is always present and often first, so the UX cleanup will require intentional behavior/test changes | Yes |
| 2026-04-16 | Command | `rg -n "Default launch settings|defaultLaunchConfig|LLM model identifier|LLM config JSON|runtime kind|RunConfig|launch settings|member override|team run config" autobyteus-web autobyteus-server-ts` | Find the current launch-default implementation and adjacent run-config UX boundaries | Located the current agent-definition launch-default component plus the better existing run-config forms and domain/store references | No |
| 2026-04-16 | Code | `autobyteus-web/components/agents/AgentDefaultLaunchConfigFields.vue` | Inspect current agent-definition launch-default editor UX | Current UI uses raw free-text runtime/model inputs and a raw JSON textarea | Yes |
| 2026-04-16 | Code | `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Inspect existing good runtime/model/config UX for direct agent runs | Already has runtime availability dropdown, model selector, and schema-driven config editing | Yes |
| 2026-04-16 | Code | `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Inspect existing good runtime/model/config UX for team runs | Already has strong runtime/model/config UX plus team-specific behavior; good reuse/alignment reference | Yes |
| 2026-04-16 | Code | `autobyteus-web/components/agents/AgentDefinitionForm.vue` | Inspect current placement of agent default launch settings in the editor | Launch-default section is currently rendered above skills/tools, making an optional advanced preference too prominent | Yes |
| 2026-04-16 | Code | `autobyteus-web/stores/agentDefinitionStore.ts`; `autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts`; `autobyteus-server-ts/src/agent-definition/domain/models.ts`; `autobyteus-server-ts/src/agent-definition/providers/agent-definition-config.ts`; `autobyteus-server-ts/src/api/graphql/converters/agent-definition-converter.ts` | Confirm whether agent-definition default launch config is a real domain/API concept | Agent definitions already have end-to-end `defaultLaunchConfig` support for `runtimeKind`, `llmModelIdentifier`, and `llmConfig` | Yes |
| 2026-04-16 | Code | `autobyteus-web/stores/agentRunConfigStore.ts`; `autobyteus-web/stores/teamRunConfigStore.ts`; `autobyteus-web/types/agent/TeamRunConfig.ts` | Check whether direct launch template creation already consumes stored definition defaults | Direct run template creation currently ignores stored agent defaults and team definitions currently default to empty `TeamRunConfig` values | Yes |
| 2026-04-16 | Code | `autobyteus-web/stores/agentTeamDefinitionStore.ts`; `rg -n "defaultLaunchConfig" autobyteus-server-ts/src/agent-team-definition autobyteus-server-ts/src/api/graphql/converters/agent-team-definition-converter.ts autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts autobyteus-web` | Determine whether team definitions already support equivalent launch-default storage | No team-definition `defaultLaunchConfig` support exists today in the store/domain/API surface | Yes |
| 2026-04-16 | Code | `autobyteus-web/utils/application/applicationLaunch.ts`; `autobyteus-web/docs/applications.md` | Confirm how the current system consumes agent-definition default launch config | Application launch-preparation logic already reads agent-definition `defaultLaunchConfig`, reinforcing that the concept exists but should not be explained as application-owned | Yes |
| 2026-04-16 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts`; `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts`; `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-source-paths.ts` | Inspect whether application-owned team definitions already have a first-class read/write path that the new team-default design must cover | Application-owned teams already load through the same `AgentTeamDefinition` subject boundary and already write back through `FileAgentTeamDefinitionProvider.update(...)` when the source is writable, but their separate config parser/write contract currently omits `defaultLaunchConfig` | Yes |
| 2026-04-16 | Code | `autobyteus-server-ts/src/agent-definition/providers/application-owned-agent-source.ts`; `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | Compare the application-owned agent path with the missing team path | Application-owned agent definitions already parse and persist `defaultLaunchConfig`, which makes extending the application-owned team path the coherent direction | Yes |
| 2026-04-16 | Code | `autobyteus-web/stores/__tests__/applicationLaunchPreparation.integration.spec.ts`; `autobyteus-web/stores/agentTeamDefinitionStore.ts` | Verify whether application launch currently exercises imported/application-owned team definitions | The current application-launch path already exercises imported/application-owned team launches, so removing leaf-agent aggregation without replacing that path would change exercised behavior rather than only an obscure edge case | Yes |
| 2026-04-16 | Spec | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup/tickets/in-progress/application-package-ux-cleanup/design-review-report.md` | Capture the architecture re-review finding that forced upstream rework | Architecture finding `AR-001` confirms the current design gap is specifically the omitted application-owned team source/parser/write path under the new `defaultLaunchConfig` model | Yes |

## Current Behavior / Current Flow

### Package-source slice

- Current entrypoint or first observable boundary:
  - Settings → `ApplicationPackagesManager.vue`
  - GraphQL query `applicationPackages`
  - backend owner `ApplicationPackageService.listApplicationPackages()`
- Current execution flow:
  1. The frontend mounts `ApplicationPackagesManager.vue`.
  2. The component calls `applicationPackagesStore.fetchApplicationPackages()`.
  3. The store queries the backend GraphQL `applicationPackages` field and stores the returned package rows directly.
  4. `ApplicationPackageService.listApplicationPackages()` resolves the built-in root path via `ApplicationPackageRootSettingsStore.getBuiltInRootPath()`.
  5. The service always prepends one built-in row via `mapBuiltInPackage(builtInRootPath)`.
  6. The service appends linked local and GitHub-managed package records for additional roots.
  7. The UI sorts the rows with built-in first and renders each row’s source-kind label, `applicationCount`, and raw path/source text.
- Ownership or boundary observations:
  - The higher-layer authoritative product boundary for application package listing is already `ApplicationPackageService`; this is the correct place to refine built-in-vs-imported presentation semantics if the API contract needs tightening.
  - The current frontend component is thin and mostly reflects backend fields directly; a safer product model may require both backend/API and frontend/UI changes instead of a component-only wording patch.
  - Built-in source resolution is an internal platform concern today, but the current API/UI leaks it directly to end users.
- Current behavior summary:
  - The current design treats built-in, local, and GitHub sources too uniformly in the normal settings surface.
  - That uniformity is causing a trust/mental-model problem because the built-in source is not really a user-imported path, yet it is rendered like one.
  - The built-in storage location also differs from built-in agents/teams: applications still come from an upward-scanned app root instead of a managed server-data location.

### Definition-level launch-preference slice

- Current entrypoint or first observable boundary:
  - Agent definition editor → `AgentDefinitionForm.vue` → `AgentDefaultLaunchConfigFields.vue`
  - Direct run flows → `AgentRunConfigForm.vue` and `TeamRunConfigForm.vue`
  - agent-definition domain/API owner `agent-definition-service.ts`
- Current execution flow today for agents:
  1. User edits an agent definition.
  2. `AgentDefinitionForm.vue` renders `AgentDefaultLaunchConfigFields.vue` near the top of the form.
  3. The user enters runtime/model/config through raw text + raw JSON fields.
  4. `agentDefinitionStore` persists `defaultLaunchConfig` through GraphQL mutations.
  5. Later launch flows can consume those stored values, including application launch preparation.
- Current execution flow today for teams:
  1. User edits a team definition.
  2. No equivalent definition-level default launch editor exists.
  3. Users can only choose runtime/model/config at team-run time, not store team-definition preferences.
  4. Direct team launch templates are created with empty/default values by `createDefaultTeamRunConfig(...)`.
  5. Application launches can target imported/application-owned team definitions, and `applicationLaunch.ts` currently synthesizes global team defaults for those launches by aggregating leaf agent defaults.
- Ownership or boundary observations:
  - The concept already belongs to definition ownership for agents; the current problem is bad UX and poor information architecture, not absence of a valid domain concept.
  - The direct run-config forms already own a much better interaction model for runtime/model/config selection; reusing/aliging with that boundary is cleaner than inventing a second inconsistent editor pattern.
  - Team definitions currently lack the corresponding domain/API/store support, so the team side of the request is a real model expansion rather than a local component tweak.
  - Application-owned team definitions are already first-class `AgentTeamDefinition` subjects behind the same provider/service boundary, so adding team defaults only to the shared-team config path would leave the subject structurally split.
- Current behavior summary:
  - The product already half-acknowledges definition-level launch defaults for agents but presents them poorly.
  - The product does not yet acknowledge the same concept for teams, even though the user mental model and run-config domain make that symmetry reasonable.
  - Even on the agent side, direct run template creation currently does not consistently consume the stored defaults, so the feature is not yet acting like a general reusable-definition capability.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/settings/ApplicationPackagesManager.vue` | Settings UI for application packages | Always shows built-in row and raw path text for non-GitHub rows | UI needs explicit product-model rules rather than blindly rendering raw path/source fields |
| `autobyteus-web/stores/applicationPackagesStore.ts` | Frontend store for package list/import/remove | Preserves backend package rows directly without path/source classification | Store/API contract may need intentional shaping for safer presentation |
| `autobyteus-server-ts/src/application-packages/services/application-package-service.ts` | Higher-layer package management owner | Always emits built-in package row with raw built-in path/source | Correct higher-layer owner for any product-model change to built-in package listing |
| `autobyteus-server-ts/src/application-packages/stores/application-package-root-settings-store.ts` | Built-in/additional root settings | Built-in root is protected from user registration as an additional root | Supports a clean product split between platform-owned and user-imported sources |
| `autobyteus-server-ts/src/application-bundles/utils/built-in-application-package-root.ts` | Built-in root-path resolver | Upward scan can yield local developer repo/worktree paths in personal builds | Strong reason not to expose built-in raw path in normal user-facing UI |
| `autobyteus-server-ts/src/application-packages/installers/github-application-package-installer.ts` | GitHub package installation owner | GitHub imports are materialized into app-managed storage under the app data dir | Demonstrates an existing managed-storage pattern that built-in applications can follow too |
| `autobyteus-server-ts/src/config/app-config.ts` | Server data-root owner | Already owns canonical server-data paths for agents and teams | Supports moving built-in applications into a managed server-data package root |
| `autobyteus-web/components/agents/AgentDefaultLaunchConfigFields.vue` | Current agent-definition launch-default editor | Uses raw text fields and raw JSON textarea | Strong candidate for replacement or heavy reshaping |
| `autobyteus-web/components/agents/AgentDefinitionForm.vue` | Agent definition authoring form | Places launch-default section before skills/tools | Information architecture should demote this section to optional secondary placement |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Direct agent run configuration UX | Already owns high-quality runtime/model/config interaction patterns | Best current reuse/alignment reference for agent-definition launch-preference editing |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Direct team run configuration UX | Already owns high-quality team runtime/model/config interaction patterns | Best current reuse/alignment reference for team-definition launch-preference editing |
| `autobyteus-web/stores/agentDefinitionStore.ts` + backend `agent-definition` files | Agent-definition domain/API/store contract | End-to-end `defaultLaunchConfig` support already exists for agents | Reuse this boundary; do not invent an application-specific parallel shape |
| `autobyteus-web/stores/agentTeamDefinitionStore.ts` + backend `agent-team-definition` files | Team-definition domain/API/store contract | No equivalent default launch config support exists yet | Team side needs intentional model/API/store/editor design |
| `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | Application-owned team parser/write owner | Already owns application-owned team `team-config.json` parsing and serialization | Must be extended to carry `defaultLaunchConfig`, not left outside the new team-default boundary |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | Team-definition source routing and update owner | Already reads and writes both shared and application-owned team definitions | Correct persistence boundary to keep one team subject across ownership scopes |
| `autobyteus-server-ts/src/agent-definition/providers/application-owned-agent-source.ts` | Application-owned agent parser owner | Already carries `defaultLaunchConfig` through the application-owned definition path | Strong precedent for extending application-owned team definitions the same way |
| `autobyteus-web/utils/application/applicationLaunch.ts` | Application launch-preparation logic | Already consumes agent-definition `defaultLaunchConfig` and currently derives team defaults for imported/application-owned team launches | Confirms application flows are consumers, not the rightful owner of the feature |
| `autobyteus-web/stores/__tests__/applicationLaunchPreparation.integration.spec.ts` | Application launch integration coverage | Exercises imported/application-owned team launch preparation | The new design must replace that behavior intentionally, not leave it implicit |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-16 | Trace | Code-trace of Settings → GraphQL → `ApplicationPackageService.listApplicationPackages()` | The built-in row is a deterministic backend-produced entry, not a frontend accident | Correct fix likely needs explicit contract/presentation design at the package-service/API level |
| 2026-04-16 | Trace | Code-trace of `AgentDefinitionForm.vue` → `AgentDefaultLaunchConfigFields.vue` and comparison with `AgentRunConfigForm.vue` / `TeamRunConfigForm.vue` | The current definition editor uses a materially worse UX boundary than the one already available in run-time configuration flows | Strong case for shared/reused interaction design rather than maintaining two inconsistent UX models |
| 2026-04-16 | Trace | Store/domain search for team-definition launch defaults | Team definitions currently stop at description/instructions/nodes; there is no parallel `defaultLaunchConfig` support | Team support requires deliberate full-stack model expansion |
| 2026-04-16 | Trace | Read/write trace of `application-owned-team-source.ts` -> `FileAgentTeamDefinitionProvider.update(...)` | Application-owned teams already have a dedicated parser/write path and writable-source guard, but that path carries no `defaultLaunchConfig` field yet | The clean fix is to extend this existing path into the new team-default model rather than scope application-owned teams out or keep an application-launch fallback |
| 2026-04-16 | Trace | Compare application-owned agent parsing with application-owned team parsing | Application-owned agents already use config normalization that includes `defaultLaunchConfig`; application-owned teams do not | A shared server-side launch-default normalizer should be reused across both shared and application-owned team configs |
| 2026-04-16 | Test | Review `applicationLaunchPreparation.integration.spec.ts` imported team scenario | Imported/application-owned team launch preparation is already covered by integration-style store tests | Design removal of leaf-agent aggregation must include the application-owned team replacement path explicitly |

## External / Public Source Findings

- Public API / spec / issue / upstream source: none required for this slice; current repository evidence is sufficient.
- Version / tag / commit / freshness: repository state in dedicated follow-on worktree created from `origin/personal` on 2026-04-16.
- Relevant contract, behavior, or constraint learned: none beyond repository-local implementation/docs.
- Why it matters: this is a product/architecture cleanup inside the current codebase rather than an external integration question.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: none for this initial design slice.
- Required config, feature flags, env vars, or accounts: none beyond a working repo checkout.
- External repos, samples, or artifacts cloned/downloaded for investigation: none.
- Setup commands that materially affected the investigation:
  - `git fetch origin --prune`
  - `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/application-package-ux-cleanup -b codex/application-package-ux-cleanup origin/personal`
  - `rg -n "Default launch settings|defaultLaunchConfig|LLM model identifier|LLM config JSON|runtime kind|RunConfig|launch settings|member override|team run config" autobyteus-web autobyteus-server-ts`
- Cleanup notes for temporary investigation-only setup: none yet.

## Findings From Code / Docs / Data / Logs

1. The built-in application package row is currently not conditional on actual built-in application presence.
2. The raw built-in path is currently user-visible by default.
3. In local/personal builds that built-in path can resemble a personal repo/worktree path because built-in root discovery is based on upward filesystem scan.
4. GitHub-installed application packages already have a different storage model from built-ins and linked local packages, which means a more source-kind-aware presentation model is already justified by the implementation reality.
5. `AppConfig` and the existing built-in agent/team storage model show that server-data already serves as the platform-managed home for built-in reusable definitions. Built-in applications are the outlier.
6. The current package UX does not distinguish between “platform-owned source” and “user-imported source” strongly enough.
7. Current tests encode the built-in-first/always-present behavior, so the package UX slice needs intentional product-model decisions before implementation.
8. Agent-definition launch defaults are already a real stored capability across domain/API/store layers; the issue is the current UX and framing, not lack of domain legitimacy.
9. The current agent-definition launch-default UI is materially worse than the existing runtime/model/config run forms and therefore likely increases user confusion.
10. The current agent-definition form places optional launch preferences too high in the information architecture.
11. Team definitions do not yet support equivalent stored launch preferences, even though the team run-config domain already uses the same underlying runtime/model/config concepts.
12. Application launch helpers already consume agent-definition launch defaults, which reinforces that the feature should be explained as definition-owned and generally reusable rather than application-owned.
13. Direct run template creation still ignores those stored defaults today, so the launch-preference capability is fragmented across different launch entrypoints.
14. Application-owned team definitions are already first-class `AgentTeamDefinition` subjects discovered and updated through `file-agent-team-definition-provider.ts`, not a side channel outside the main team-definition boundary.
15. `application-owned-team-source.ts` already owns a separate parser/write contract for application-owned team `team-config.json`; that concrete path is the real gap behind architecture finding `AR-001`.
16. `FileAgentTeamDefinitionProvider.update(...)` already writes application-owned team definitions back through `buildApplicationOwnedTeamWriteContent(...)` when the source is writable, so there is an existing persistence seam to extend rather than a missing write path.
17. Application-owned agent definitions already carry `defaultLaunchConfig` through their source/parser path, which makes extending application-owned team definitions into the same shared launch-default shape the coherent design choice.
18. The current application-launch integration coverage already includes imported/application-owned team launches, so omitting application-owned team definitions from the replacement path would create a real behavior regression.

## Constraints / Dependencies / Compatibility Facts

- This is a post-merge follow-on ticket; the earlier application-bundle architecture work is already merged.
- The current merged implementation already has `ApplicationPackageService`, `ApplicationPackagesManager.vue`, and GraphQL/store boundaries for package management.
- Changing built-in package presentation may require contract changes in GraphQL or store-level shaping, not only component copy changes.
- The built-in root is still authoritative for bundle discovery today, so the package slice must either preserve discovery through a new managed server-data root or explicitly replace the old root-resolution behavior.
- The current merged implementation already has agent-definition `defaultLaunchConfig` support end-to-end.
- Team-definition launch-preference support does not yet exist and therefore needs real backend/domain/API/store/editor design.
- Application-owned team definitions already have a first-class provider/source-path boundary, so the new team-default model must explicitly cover that path rather than assume “team definitions” means only shared-team config files.
- The existing run-config forms already provide a better UX pattern that should influence this follow-on design.

## Open Unknowns / Risks

- Whether the cleanest product move is to hide empty built-in sources entirely or to show a generic platform-owned informational row still needs user approval.
- Whether the final managed built-in package root should be `AppDataDir/application-packages/platform/` or another nearby server-data path still needs design locking.
- Whether normal UI should show any path/source text at all for GitHub-installed packages needs a more explicit UX decision.
- If the UI keeps relying on generic `path`/`source` fields from the backend, future trust/UX issues may recur even after this immediate cleanup.
- Whether the user-facing label should stay “Default launch settings” or shift to something like “Preferred launch settings” still needs product judgment.
- If the team-definition slice later expands into member-level default authoring, scope could grow again; this should be resisted unless a concrete use case demands it.
- Shared-team and application-owned-team config parsing must stay aligned on one tight `defaultLaunchConfig` normalizer; otherwise launch behavior will drift by ownership scope.
- Application-owned team updates still depend on source writability, so UI/error handling should continue respecting the existing read-only-source boundary even after launch preferences are added.

## Notes For Architect Reviewer

This follow-on slice now likely needs explicit design around two related but separate ownership boundaries:
- `ApplicationPackageService` and the application-package UI/API contract for trustworthy package-source presentation.
- The agent-definition / agent-team-definition boundaries for stored launch-preference ownership, with reuse/alignment to the existing run-configuration UX boundary rather than application-specific launch helpers.

For `AR-001`, the investigation conclusion is now explicit: application-owned team definitions should participate in the same team-level `defaultLaunchConfig` model through `application-owned-team-source.ts` and the existing `FileAgentTeamDefinitionProvider.update(...)` path, not be left behind a special application-launch fallback.

The important architecture theme across both slices is the same: keep the higher-layer product semantics clear, and do not let lower-level implementation shapes leak confusing raw internals into the user-facing surface.
