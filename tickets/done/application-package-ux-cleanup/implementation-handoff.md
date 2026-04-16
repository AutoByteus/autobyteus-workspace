# Implementation Handoff — application-package-ux-cleanup

## Summary
- Implemented the reviewed application-package UX cleanup across server and web.
- Added shared `defaultLaunchConfig` normalization/reuse for agent definitions, shared team definitions, and application-owned team definitions.
- Refactored application package presentation so `ApplicationPackageService` now owns the safe list contract and separate debug-details contract.
- Replaced the old agent launch-default editor with shared runtime/model/config launch-preferences UI reused by agent/team definition editors and run forms.
- Updated application launch preparation so team-targeted applications seed launch defaults from the team definition instead of leaf-agent aggregation.
- Applied code-review local fixes for:
  - preserving omitted vs explicit-null `defaultLaunchConfig` semantics on team-definition updates
  - rejecting bundled platform source-root re-import at both application-package import and additional-root registration boundaries

## Delivered Scope

### Server
- Added shared launch-preferences normalizer/types under `autobyteus-server-ts/src/launch-preferences/`.
- Wired `defaultLaunchConfig` through:
  - agent definition domain/config/service/GraphQL
  - team definition domain/config/service/GraphQL
  - application-owned team read/write paths
- Added shared GraphQL launch-config types in `src/api/graphql/types/default-launch-config.ts`.
- Added built-in application package materialization + managed built-in root handling:
  - `BuiltInApplicationPackageMaterializer`
  - `managed-built-in-application-package-root.ts`
  - `bundled-application-resource-root.ts`
- Refactored application package contracts:
  - safe list item contract for default UI surfaces
  - debug details contract for expandable raw path/source diagnostics
  - new `applicationPackageDetails(packageId)` GraphQL query
- Kept `ApplicationPackageService` authoritative for package list/details presentation.
- Preserved existing application-owned team write boundaries; no bypass of source writability/integrity checks was introduced.
- Removed obsolete `built-in-application-package-root.ts` helper.

### Web
- Added shared web launch-default utilities under:
  - `autobyteus-web/types/launch/defaultLaunchConfig.ts`
  - `autobyteus-web/composables/useDefinitionLaunchDefaults.ts`
- Added reusable launch-config components:
  - `components/launch-config/RuntimeModelConfigFields.vue`
  - `components/launch-config/DefinitionLaunchPreferencesSection.vue`
- Replaced `AgentDefaultLaunchConfigFields.vue` and deleted the old component.
- Updated:
  - `AgentDefinitionForm.vue`
  - `AgentTeamDefinitionForm.vue`
  - `AgentRunConfigForm.vue`
  - `TeamRunConfigForm.vue`
  - `agentRunConfigStore.ts`
  - `teamRunConfigStore.ts`
  - `applicationLaunch.ts`
- Extended team-definition web GraphQL/store transport for `defaultLaunchConfig`.
- Reworked application package UI/store/GraphQL for safe list rows + lazy details fetch.
- Updated user-facing copy/docs toward “Platform Applications” / preferred launch defaults.

### Tests / Docs
- Updated targeted server and web tests for the new contracts.
- Added new unit coverage for application-owned team default-launch-config parse/write behavior.
- Added regression coverage for the local-fix review findings:
  - GraphQL + tool/update-path omission coverage for team `defaultLaunchConfig`
  - application-package bundled-source-root rejection coverage in service/store tests
- Updated affected module docs in frontend and server docs.

## Key Files

### New
- `autobyteus-server-ts/src/api/graphql/types/default-launch-config.ts`
- `autobyteus-server-ts/src/application-bundles/utils/bundled-application-resource-root.ts`
- `autobyteus-server-ts/src/application-packages/services/built-in-application-package-materializer.ts`
- `autobyteus-server-ts/src/application-packages/utils/managed-built-in-application-package-root.ts`
- `autobyteus-server-ts/src/launch-preferences/default-launch-config.ts`
- `autobyteus-server-ts/tests/unit/agent-team-definition/application-owned-team-source.test.ts`
- `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue`
- `autobyteus-web/components/launch-config/DefinitionLaunchPreferencesSection.vue`
- `autobyteus-web/composables/useDefinitionLaunchDefaults.ts`
- `autobyteus-web/types/launch/defaultLaunchConfig.ts`

### Deleted
- `autobyteus-web/components/agents/AgentDefaultLaunchConfigFields.vue`
- `autobyteus-server-ts/src/application-bundles/utils/built-in-application-package-root.ts`

## Validation

### Passed
1. `cd autobyteus-server-ts && ./node_modules/.bin/tsc -p tsconfig.build.json --noEmit`
2. `cd autobyteus-server-ts && ./node_modules/.bin/vitest run tests/unit/application-packages/application-package-root-settings-store.test.ts tests/unit/application-packages/application-package-service.test.ts tests/unit/agent-team-definition/agent-team-definition-service.test.ts tests/unit/agent-tools/agent-team-management/update-agent-team-definition.test.ts tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts`
3. Earlier implementation-round checks remain applicable for the broader ticket slice:
   - `cd autobyteus-server-ts && ./node_modules/.bin/vitest run tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/agent-team-definition/application-owned-team-source.test.ts tests/e2e/applications/application-packages-graphql.e2e.test.ts`
   - `cd autobyteus-web && ./node_modules/.bin/vitest run components/settings/__tests__/ApplicationPackagesManager.spec.ts stores/__tests__/applicationPackagesStore.spec.ts components/agents/__tests__/AgentDefinitionForm.spec.ts components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts stores/__tests__/agentRunConfigStore.spec.ts stores/__tests__/teamRunConfigStore.spec.ts stores/__tests__/applicationLaunchPreparation.integration.spec.ts types/agent/__tests__/TeamRunConfig.spec.ts stores/__tests__/agentTeamDefinitionStore.spec.ts`

### Attempted but non-gating
- `cd autobyteus-web && ./node_modules/.bin/nuxi typecheck`
  - not used as a ticket gate because it surfaced many pre-existing repo-wide errors in unrelated areas plus superrepo-linked path resolution noise; none of the failures were needed to validate this ticket’s implementation slice.

Validation note:
- The server checks above were run in the worktree using temporary package-local `node_modules` symlinks to the existing superrepo installs; those temporary symlinks were removed after the checks completed.

## Residual Notes For Code Review
- Shared-team and application-owned-team parsing now share the same `defaultLaunchConfig` normalizer; new unit coverage was added for the application-owned path.
- `AgentTeamDefinitionUpdate` now preserves omitted `defaultLaunchConfig` as `undefined`; only explicit `null` clears the saved value.
- GraphQL update omission and `update_agent_team_definition` tool-driven updates now preserve existing team launch defaults unless the caller explicitly sends `defaultLaunchConfig: null`.
- `ApplicationPackageService` is now the single presentation owner for application-package list/details output; raw paths no longer flow through the default list contract.
- Application package details are intentionally behind an explicit details query/surface; list rows only expose safe summary fields.
- Application-package boundaries now reject both:
  - the managed built-in package root
  - the bundled platform source root
  at local import/additional-root registration boundaries, keeping platform-owned and user-linked package identities disjoint.
- Team-targeted application launch defaults now come from `teamDefinition.defaultLaunchConfig`; reviewers should verify that this matches the approved design for both shared and application-owned teams.
- Web GraphQL generated artifacts were not regenerated in this handoff because local codegen is configured against a live backend schema URL and was not required for the targeted implementation checks above.
