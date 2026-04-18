# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/tickets/in-progress/application-team-local-agents-refactor/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/tickets/in-progress/application-team-local-agents-refactor/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/tickets/in-progress/application-team-local-agents-refactor/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/tickets/in-progress/application-team-local-agents-refactor/design-review-report.md`

## What Changed

- Cut application-owned team member agents over from app-root `application_owned` siblings to team-folder `team_local` definitions. The bundled samples and fixture apps now place those agents under `agent-teams/<team-id>/agents/<agent-id>/`, and the old top-level sample agent copies were removed.
- Updated the server’s application-owned team parse/write/integrity path so app-owned team agent members must persist `refScope: "team_local"`, keep local agent refs in file/domain shape, and only canonicalize nested team refs.
- Extended team-local agent discovery and source-path resolution so visible team-local agents can come from both shared teams and application-owned teams while preserving owner-team plus owner-application provenance.
- Updated application launch preparation so team-local team members are canonicalized to `team-local:<team-id>:<agent-id>` when building launch descriptors from application-owned teams.
- Updated the web team-authoring flow so editing an application-owned team uses the current team’s team-local agent library and localizes canonical team-local ids back to persisted local refs on submit.
- Updated agent provenance rendering so TEAM_LOCAL agents owned by application bundles show both team and application/package provenance in card/detail/edit surfaces.
- Refreshed targeted server/web tests and docs for the new app-team-local semantics.
- Local Fix round: corrected the `application-package-service` malformed-fixture mutation path, made `AgentDetail.spec.ts` assert owner-label rendering without hardcoded untranslated strings, and added the replacement team-local sample fixture files into the tracked change set.
- Post-delivery local fix: updated application-package import/remove to refresh application bundles plus agent-definition and team-definition caches together so newly imported application-owned teams and team-local members are immediately launchable without requiring a full app restart.

## Key Files Or Areas

- Sample/fixture app content:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/applications/brief-studio/agent-teams/brief-studio-team/`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/applications/brief-studio/dist/importable-package/applications/brief-studio/agent-teams/brief-studio-team/`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/applications/socratic-math-teacher/agent-teams/socratic-math-team/`
- Server implementation:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-server-ts/src/agent-team-definition/utils/application-owned-team-integrity-validator.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-server-ts/src/agent-definition/providers/team-local-agent-discovery.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-server-ts/src/agent-definition/providers/agent-definition-source-paths.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-server-ts/src/application-packages/services/application-package-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-server-ts/src/application-sessions/services/application-session-launch-builder.ts`
- Web implementation:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-web/components/agentTeams/AgentTeamDefinitionForm.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-web/components/agentTeams/form/useAgentTeamDefinitionFormState.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-web/components/agentTeams/AgentTeamDetail.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-web/stores/agentDefinitionStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-web/components/agents/AgentCard.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-web/components/agents/AgentDetail.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-web/components/agents/AgentEdit.vue`
- Targeted tests/docs:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-server-ts/tests/unit/application-bundles/file-application-bundle-provider.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-server-ts/tests/unit/application-packages/application-package-service.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-server-ts/tests/e2e/applications/application-packages-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-web/components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-web/components/agents/__tests__/AgentCard.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-web/components/agents/__tests__/AgentDetail.spec.ts`

## Important Assumptions

- Direct application-owned agents under `applications/<application-id>/agents/<agent-id>/` remain supported for direct application runtime targets; only agents that belong to a team were migrated to `team_local`.
- Application-owned teams remain same-bundle only. Frontend filtering is UX guidance; the backend provider stays authoritative for persistence-time integrity.
- Canonical visible team-local ids remain `team-local:<owner-team-id>:<local-agent-id>`, while persisted app-owned team member refs stay local (`ref: "<agent-id>"`).

## Known Risks

- `team-local-agent-discovery.ts` carries the largest implementation delta because it is now the single owner for shared + application-owned team-local discovery/provenance logic; please review dedupe/provenance behavior carefully.
- Repo-level `autobyteus-server-ts typecheck` noise (`TS6059` rootDir/test mismatch) was reported during review as unrelated to this refactor’s touched files and was not re-opened in this Local Fix round.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - No fallback support for old app-team `application_owned` agent-member refs was retained.
  - The largest changed source files remained under the 500-line guardrail. `team-local-agent-discovery.ts` exceeded the delta signal and was kept as the centralized owner instead of duplicating equivalent logic across callers.

## Environment Or Dependency Notes

- Local Fix validation rerun on `2026-04-18` succeeded with installed workspace dependencies:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-server-ts test --run tests/unit/agent-team-definition/application-owned-team-source.test.ts tests/unit/agent-team-definition/agent-team-definition-service.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/application-packages/application-package-service.test.ts tests/e2e/applications/application-packages-graphql.e2e.test.ts`
  - Result: `Pass` (`5` files, `24` tests)
- Local Fix validation rerun on `2026-04-18` succeeded for the changed web scope:
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-web exec nuxi prepare`
  - Result: `Pass`
  - `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/autobyteus-web test:nuxt --run components/agentTeams/__tests__/AgentTeamDefinitionForm.spec.ts components/agents/__tests__/AgentCard.spec.ts components/agents/__tests__/AgentDetail.spec.ts stores/__tests__/agentDefinitionStore.spec.ts stores/__tests__/applicationLaunchPreparation.integration.spec.ts`
  - Result: `Pass` (`5` files, `18` tests)
- Post-delivery cache-fix validation rerun on `2026-04-18` succeeded for the changed server scope:
  - `pnpm exec vitest run tests/unit/application-packages/application-package-service.test.ts`
  - Result: `Pass` (`5` tests)
  - `pnpm exec vitest run tests/e2e/applications/application-packages-graphql.e2e.test.ts`
  - Result: `Pass` (`1` test)
- Repo-level typecheck remains noisy outside this fix scope:
  - `pnpm exec tsc --noEmit`
  - Result: existing `TS6059` `rootDir`/`tests` configuration failures unrelated to the touched cache-refresh change

## Validation Hints / Suggested Scenarios

- Server bundle validation/import:
  - valid app-owned team member agent under `agent-teams/<team-id>/agents/<agent-id>/` with `refScope: "team_local"`
  - negative paths for missing local agent folders, malformed `agent.md`, and malformed `agent-config.json`
- Application launch preparation:
  - launch an application whose runtime target is an application-owned team and confirm leaf members are canonicalized to `team-local:<team-id>:<agent-id>`
- Web authoring:
  - edit an application-owned team, add a local team member from the library, and confirm submit payload persists local `ref: "<agent-id>"` instead of the canonical visible id
- Web provenance rendering:
  - verify TEAM_LOCAL agents owned by an application bundle show both owning team and owning application/package provenance in card/detail/edit surfaces
- Package refresh behavior:
  - import/remove a package and confirm app-owned team-local agents appear/disappear in the Agents UI and under the owner-team getter path
  - import Brief Studio from `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/applications/brief-studio/dist/importable-package` and confirm Launch Application succeeds immediately after import without restarting the app

## What Needs Validation

- Broader server/web regression coverage beyond the targeted Local Fix suites if code review wants wider confidence
- End-to-end import/edit/launch coverage for Brief Studio and Socratic Math Teacher with the migrated team-local sample fixtures
- Optional follow-up on the known repo-level `autobyteus-server-ts typecheck` `TS6059` noise if that shared tsconfig issue is being addressed separately

## Current Head / Delivery Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor`
- Current HEAD at handoff update time: `cbe098e1`
