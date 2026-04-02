# API / E2E Testing

## Status

- Validation Round: `6`
- Prior Validation Round Reviewed: `5`
- Latest Authoritative Round: `6`
- Current Status: `Pass`
- Gate Decision: `Pass`
- Date: `2026-04-02`

## Scope

- Ticket: `agent-team-local-member-import-analysis`
- Validation scope:
  - package-root GraphQL/API rename and counts
  - scoped team-member parsing and validation
  - mixed shared/local runtime member identity projection
  - TEAM_LOCAL GraphQL create/read/update persistence
  - ownership-aware visible agent list for the generic Agents page
  - team-owned agent detail/edit access through the generic visible agent payload
  - shared-only picker preservation despite the broader visible agent list
  - web edit-form preservation of file-authored TEAM_LOCAL members
  - sync preservation of team-local agents
  - bundled skill discovery for team-local agents
  - settings/web executable coverage for renamed package-root surface
- Non-blocking baseline noise:
  - sync e2e suites still log a stale invalid fixture warning for `team_sync_team_1775124295976_58cc0016a7cc1` missing `refScope`
  - this warning existed in the test app-data fixture and did not fail assertions

## Prior Failure Resolution Check (Mandatory On Round >1)

- Round `3` had no unresolved executable failures, but the user correctly rejected it as insufficient because it still lacked durable executable proof for the `TEAM_LOCAL` authoring and GraphQL persistence path.
- Round `4` therefore focuses first on closing that evidence gap, then reruns the broader affected server/web executable spines with the restored frontend boundary.
- Round `5` rechecks the refreshed requirement-gap slice: the generic Agents page now consumes an ownership-aware visible agent payload, team-owned agents remain configurable from that surface, and shared-only team-authoring selectors stay filtered.
- Round `6` rechecks the Stage 8 Round 6 local fix: unsupported team-local delete attempts from the generic agent-definition API must now fail safely instead of removing the owned local agent folder.

## Commands Executed

```bash
pnpm test tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts \
  tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts \
  tests/integration/agent-definition/agent-definition-service-batch-mapping.integration.test.ts \
  tests/unit/agent-definition/cached-agent-definition-provider.test.ts
```

- Result: `4 test files passed`, `18 tests passed`
- Round `6` server focus: reran the ownership-aware visible-agent executable spine after the delete-boundary local fix and added negative-path proof that team-local delete requests are rejected safely.

```bash
pnpm test:nuxt components/agents/__tests__/AgentCard.spec.ts \
  components/agents/__tests__/AgentList.spec.ts \
  components/agents/__tests__/AgentDetail.spec.ts \
  components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts \
  stores/__tests__/agentDefinitionStore.spec.ts
```

- Result: `5 test files passed`, `19 tests passed`
- Round `6` web focus: reran the same ownership-aware generic Agents page and shared-only selector tests to confirm the local-fix rerun did not regress the visible-agent slice.

```bash
pnpm guard:web-boundary
```

- Result: `Pass`
- Round `6` boundary focus: reconfirmed the re-entry fix did not disturb the enforced frontend/core dependency boundary.

```bash
pnpm test tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts \
  tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts \
  tests/integration/agent-definition/agent-definition-service-batch-mapping.integration.test.ts \
  tests/unit/agent-definition/cached-agent-definition-provider.test.ts
```

- Result: `4 test files passed`, `18 tests passed`
- Round `5` server focus: reran the ownership-aware visible-agent API and service/provider coverage, including get/update flows for team-local agents and the mixed visible-vs-shared list contract.

```bash
pnpm test:nuxt components/agents/__tests__/AgentCard.spec.ts \
  components/agents/__tests__/AgentList.spec.ts \
  components/agents/__tests__/AgentDetail.spec.ts \
  components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts \
  stores/__tests__/agentDefinitionStore.spec.ts
```

- Result: `5 test files passed`, `19 tests passed`
- Round `5` web focus: reran the generic Agents page card/list/detail surfaces plus the shared-only team-authoring selector tests for the ownership-aware visible-agent slice.

```bash
pnpm guard:web-boundary
```

- Result: `Pass`
- Round `5` boundary focus: confirmed the refreshed visible-agent slice did not reintroduce the forbidden `autobyteus-web -> autobyteus-ts` dependency.

```bash
pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-local-member-import-analysis/autobyteus-server-ts exec vitest run \
  tests/unit/config/app-config.test.ts \
  tests/unit/skills/services/skill-service.test.ts \
  tests/unit/skills/services/skill-sources-management.test.ts \
  tests/unit/agent-team-execution/team-run-service.test.ts \
  tests/integration/agent-definition/md-centric-provider.integration.test.ts \
  tests/e2e/agent-definitions/agent-package-roots-graphql.e2e.test.ts \
  tests/unit/agent-team-definition/agent-team-definition-service.test.ts \
  tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts \
  tests/e2e/sync/json-file-persistence-contract.e2e.test.ts \
  tests/e2e/sync/node-sync-graphql.e2e.test.ts \
  tests/integration/skills/skill-integration.test.ts \
  tests/integration/skills/skill-versioning-integration.test.ts
```

- Result: `12 test files passed`, `97 tests passed`
- Round `4` server focus: reran the full server executable/integration spine and added durable proof that `TEAM_LOCAL` members survive GraphQL create/read/update persistence.

```bash
pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-local-member-import-analysis/autobyteus-web exec \
  cross-env NUXT_TEST=true vitest run \
  components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts \
  components/workspace/config/__tests__/TeamRunConfigForm.spec.ts \
  components/settings/__tests__/AgentPackageRootsManager.spec.ts \
  stores/__tests__/applicationRunStore.spec.ts \
  stores/__tests__/agentTeamContextsStore.spec.ts \
  stores/__tests__/agentTeamRunStore.spec.ts \
  pages/__tests__/settings.spec.ts
```

- Result: `7 test files passed`, `44 tests passed`
- Round `4` web focus: reran the affected executable web surfaces and added durable proof that the team-definition form preserves and emits file-authored `TEAM_LOCAL` members correctly during edit/submit.

```bash
pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-local-member-import-analysis/autobyteus-ts build
```

- Result: `Pass`
- Round `3` setup: rebuilt `autobyteus-ts` so the shared helper export consumed by server and web resolved from the canonical package owner.

```bash
pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-local-member-import-analysis/autobyteus-server-ts exec vitest run \
  tests/unit/sync/node-sync-selection-service.test.ts \
  tests/unit/agent-team-execution/team-run-service.test.ts \
  tests/e2e/sync/node-sync-graphql.e2e.test.ts \
  tests/e2e/agent-definitions/agent-package-roots-graphql.e2e.test.ts
```

- Result: `4 test files passed`, `22 tests passed`
- Round `3` server focus: reran the provider/runtime/sync/package-root paths that now consume the shared `autobyteus-ts` helper.

```bash
pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-local-member-import-analysis/autobyteus-web exec \
  cross-env NUXT_TEST=true vitest run \
  stores/__tests__/applicationRunStore.spec.ts \
  stores/__tests__/agentTeamContextsStore.spec.ts \
  stores/__tests__/agentTeamRunStore.spec.ts \
  components/workspace/config/__tests__/TeamRunConfigForm.spec.ts
```

- Result: `4 test files passed`, `27 tests passed`
- Round `3` web focus: reran the executable consumers of `resolveLeafTeamMembers` to prove the shared package dependency resolves correctly in the Nuxt runtime and preserves team-local member projection.

```bash
./node_modules/.bin/vitest run \
  tests/e2e/sync/json-file-persistence-contract.e2e.test.ts \
  tests/e2e/sync/node-sync-graphql.e2e.test.ts
```

- Result: `2 test files passed`, `11 tests passed`
- Round `2` focus: rerun `AV-006` on the affected sync spine and prove the new negative path where selective export rejects a missing `team_local` agent before bundle emission.

```bash
./node_modules/.bin/vitest run \
  tests/unit/config/app-config.test.ts \
  tests/unit/skills/services/skill-service.test.ts \
  tests/unit/skills/services/skill-sources-management.test.ts \
  tests/unit/agent-team-execution/team-run-service.test.ts \
  tests/integration/agent-definition/md-centric-provider.integration.test.ts \
  tests/e2e/agent-definitions/agent-package-roots-graphql.e2e.test.ts \
  tests/unit/agent-team-definition/agent-team-definition-service.test.ts \
  tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts \
  tests/e2e/sync/json-file-persistence-contract.e2e.test.ts \
  tests/e2e/sync/node-sync-graphql.e2e.test.ts \
  tests/integration/skills/skill-integration.test.ts \
  tests/integration/skills/skill-versioning-integration.test.ts
```

- Result: `12 test files passed`, `95 tests passed`
- Round `1` baseline: original full server validation sweep

```bash
./node_modules/.bin/vitest run \
  components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts \
  components/settings/__tests__/AgentPackageRootsManager.spec.ts \
  pages/__tests__/settings.spec.ts
```

- Result: `3 test files passed`, `16 tests passed`
- Round `1` baseline: original web executable-validation sweep

## Scenario Results

| Scenario ID | Acceptance Criteria | Validation Evidence | Result | Notes |
| --- | --- | --- | --- | --- |
| `AV-001` | `AC-001`, `AC-016`, `AC-019` | `tests/e2e/agent-definitions/agent-package-roots-graphql.e2e.test.ts` | `Passed` | Canonical `agentPackageRoots` API returns separate shared-agent, team-local-agent, and team counts. |
| `AV-002` | `AC-002`, `AC-003`, `AC-011` | `tests/integration/agent-definition/md-centric-provider.integration.test.ts`, `tests/unit/agent-team-definition/agent-team-definition-service.test.ts`, `tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts`, `components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts` | `Passed` | Scoped team configs load correctly, GraphQL create/read/update preserves `TEAM_LOCAL` members, the web edit form preserves/emits file-authored `TEAM_LOCAL` scope, and invalid agent refs without valid `refScope` are rejected. |
| `AV-003` | `AC-010` | `tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts` | `Passed` | Explicit shared refs continue to work through the team-definition API surface. |
| `AV-004` | `AC-005`, `AC-006` | `tests/unit/agent-team-execution/team-run-service.test.ts`, `stores/__tests__/agentTeamContextsStore.spec.ts`, `components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | `Passed` | Launch member configs and their web consumers resolve shared refs to top-level agents and team-local refs to owning-team identities without demanding global registration. |
| `AV-005` | `AC-004`, `AC-007` | `tests/unit/agent-team-execution/team-run-service.test.ts`, `stores/__tests__/applicationRunStore.spec.ts`, `stores/__tests__/agentTeamRunStore.spec.ts`, `stores/__tests__/agentTeamContextsStore.spec.ts` | `Passed` | Different teams can reuse the same raw local ref while generated `agentDefinitionId` values stay collision-free across both server runtime config generation and the web leaf-member projection helpers. |
| `AV-006` | `AC-008` | `tests/e2e/sync/json-file-persistence-contract.e2e.test.ts`, `tests/e2e/sync/node-sync-graphql.e2e.test.ts` | `Passed` | Sync export/import preserves team-local agents beneath the owning team instead of flattening them into top-level `agents/`, and selective export now rejects a selected team whose `team_local` member is missing from the owning team payload. |
| `AV-007` | `AC-012`, `AC-013`, `AC-014`, `AC-015`, `AC-017`, `AC-018` | `tests/unit/config/app-config.test.ts`, `tests/e2e/agent-definitions/agent-package-roots-graphql.e2e.test.ts`, `components/settings/__tests__/AgentPackageRootsManager.spec.ts`, `pages/__tests__/settings.spec.ts` | `Passed` | Server config/env naming, GraphQL naming, settings labels, and settings section routing all use the package-root terminology. |
| `AV-008` | `AC-009` | `tests/unit/skills/services/skill-service.test.ts`, `tests/integration/skills/skill-integration.test.ts`, `tests/integration/skills/skill-versioning-integration.test.ts` | `Passed` | Bundled `SKILL.md` discovery works for both shared and team-local agent folders. |
| `AV-009` | `AC-020`, `AC-021`, `AC-022`, `AC-023`, `AC-024`, `AC-025` | `tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts`, `tests/integration/agent-definition/agent-definition-service-batch-mapping.integration.test.ts`, `components/agents/__tests__/AgentCard.spec.ts`, `components/agents/__tests__/AgentDetail.spec.ts`, `components/agents/__tests__/AgentList.spec.ts`, `stores/__tests__/agentDefinitionStore.spec.ts`, `components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts` | `Passed` | The generic visible agent payload now carries ownership metadata, team-owned agents stay visible and configurable from the Agents surface with a minimal `Team: ...` cue, unsupported shared-only actions are both hidden in the UI and rejected safely at the backend boundary, and team-authoring continues to consume the shared-only subset. |

## Acceptance Criteria Gate Map

| Acceptance Criteria ID | Scenario ID(s) | Status |
| --- | --- | --- |
| `AC-001` | `AV-001` | `Passed` |
| `AC-002` | `AV-002` | `Passed` |
| `AC-003` | `AV-002` | `Passed` |
| `AC-004` | `AV-005` | `Passed` |
| `AC-005` | `AV-004` | `Passed` |
| `AC-006` | `AV-004` | `Passed` |
| `AC-007` | `AV-005` | `Passed` |
| `AC-008` | `AV-006` | `Passed` |
| `AC-009` | `AV-008` | `Passed` |
| `AC-010` | `AV-003` | `Passed` |
| `AC-011` | `AV-002` | `Passed` |
| `AC-012` | `AV-007` | `Passed` |
| `AC-013` | `AV-007` | `Passed` |
| `AC-014` | `AV-007` | `Passed` |
| `AC-015` | `AV-007` | `Passed` |
| `AC-016` | `AV-001` | `Passed` |
| `AC-017` | `AV-007` | `Passed` |
| `AC-018` | `AV-007` | `Passed` |
| `AC-019` | `AV-001` | `Passed` |
| `AC-020` | `AV-009` | `Passed` |
| `AC-021` | `AV-009` | `Passed` |
| `AC-022` | `AV-009` | `Passed` |
| `AC-023` | `AV-009` | `Passed` |
| `AC-024` | `AV-009` | `Passed` |
| `AC-025` | `AV-009` | `Passed` |

## Gate Summary

- All executable mapped acceptance criteria: `Passed`
- Waived scenarios: `None`
- Blocked scenarios: `None`
- Relevant executable spines covered: `Yes`
- Stage 7 recommendation: `Advance to Stage 8 code review`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Decision (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | `Initial Stage 7 validation after Stage 6 implementation` | `N/A` | `No` | `Pass` | `No` | Full server (`95/95`) and web (`16/16`) executable validation passed across scenarios `AV-001` to `AV-008`. |
| `2` | `Stage 6 local-fix re-entry from Stage 8 Round 2` | `N/A` | `No` | `Pass` | `No` | Reran the affected sync spine and confirmed both preserved ownership and the new fail-fast missing-`team_local` negative path. |
| `3` | `Stage 6 local-fix re-entry from Stage 10 for shared-helper ownership cleanup` | `N/A` | `No` | `Pass` | `No` | Rebuilt `autobyteus-ts`, reran the affected server executable spines plus web member-projection consumers, and confirmed the shared helper extraction preserved behavior while removing the remaining duplicated contract. |
| `4` | `User-directed Stage 7 validation-strengthening round after frontend boundary correction` | `Yes` | `No` | `Pass` | `Yes` | Added durable executable proof for `TEAM_LOCAL` GraphQL create/read/update persistence and web edit-form preservation, then reran the broader affected server/web executable spines: server `97/97`, web `44/44`. |
| `5` | `Requirement-gap follow-up for the ownership-aware visible agent list` | `Yes` | `No` | `Pass` | `No` | Reran the focused server/web executable spines for the generic Agents page behavior: server `18/18`, web `19/19`, plus `guard:web-boundary` passed. |
| `6` | `Stage 8 Round 6 local-fix rerun for the generic delete boundary` | `Yes` | `No` | `Pass` | `Yes` | Reran the same focused server/web executable spines after blocking team-local delete at the service boundary and added the missing negative-path GraphQL proof: server `18/18`, web `19/19`, boundary guard `Pass`. |
