# Investigation Notes

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Architecture review round 1 returned `Design Impact`; design spec is being revised for reroute.
- Investigation Goal: Confirm the current application-owned team/member ownership model and capture the concrete boundaries that must change for the clean-cut team-local refactor.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The refactor spans application sample layout, bundle validation, team/agent definition parsing, generic discovery/provenance surfaces, runtime launch preparation, and durable docs/tests, but remains within one coherent ownership model change.
- Scope Summary: Refactor application-owned team member agents from application-root `application_owned` siblings to team-folder `team_local` definitions with no fallback support.
- Primary Questions To Resolve:
  1. Where does the current system encode application-team member agents as `application_owned`?
  2. Which authoritative boundaries must be updated so application-team-local agents resolve correctly everywhere?
  3. What shipped sample/docs/tests currently teach or assert the old semantics?

## Request Context

- User wants to start the refactor now and considers the intended semantics clear.
- User explicitly prefers a clean cutover with no backward compatibility, fallback resolution, or migration-code path retention.
- Agreed semantic direction: application-root direct definitions remain `application_owned`; agents that belong to a team, including inside applications, become `team_local` and live inside that team folder.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor/tickets/in-progress/application-team-local-agents-refactor`
- Current Branch: `codex/application-team-local-agents-refactor`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed without reported errors on 2026-04-18.
- Task Branch: `codex/application-team-local-agents-refactor`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Treat this as a clean-cut semantics refactor. Do not preserve the old `application_owned` team-member shape.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-18 | Command | `git rev-parse --show-toplevel && git branch --show-current && git remote show origin | sed -n '/HEAD branch/s/.*: //p'` | Resolve repo root, current branch, and likely base branch | Active repo is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; current shared branch was `personal`; remote HEAD branch resolves to `personal` | No |
| 2026-04-18 | Command | `git fetch origin --prune` | Refresh tracked remote refs before branch/worktree bootstrap | Remote refresh completed without reported errors | No |
| 2026-04-18 | Command | `git worktree add -b codex/application-team-local-agents-refactor /Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor origin/personal` | Create dedicated task worktree/branch per workflow requirement | Dedicated worktree created from latest `origin/personal` | No |
| 2026-04-18 | Code | `applications/brief-studio/agent-teams/brief-studio-team/team-config.json` | Inspect current shipped sample semantics | Member agents use `refScope: "application_owned"` | Yes |
| 2026-04-18 | Code | `applications/brief-studio/**`, `applications/socratic-math-teacher/**` | Confirm current sample bundle folder layout | Sample apps keep member agents under application-root `agents/` rather than inside team folders | Yes |
| 2026-04-18 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | Verify authoritative parse/write behavior for application-owned teams | Application-owned team config parser requires agent refs to use `application_owned`; writer localizes/canonicalizes members through application-owned ref normalizer | Yes |
| 2026-04-18 | Code | `autobyteus-server-ts/src/agent-team-definition/utils/application-owned-team-integrity-validator.ts` | Verify current validation contract | Application-owned team agent members are required to use `application_owned` and resolve to app-root agents in the same bundle | Yes |
| 2026-04-18 | Code | `autobyteus-server-ts/src/agent-definition/providers/application-owned-agent-source.ts` | Verify application-owned agent source-path contract | Application-owned agents always resolve from `applications/<app>/agents/<agent-id>/` | Yes |
| 2026-04-18 | Code | `autobyteus-server-ts/src/agent-definition/providers/agent-definition-source-paths.ts`, `autobyteus-server-ts/src/agent-definition/providers/team-local-agent-discovery.ts` | Confirm existing team-local discovery model | Team-local agents already resolve from `<team-root>/<team-id>/agents/<agent-id>/` with separate team provenance | Yes |
| 2026-04-18 | Code | `autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts` | Inspect bundle discovery/validation expectations | Bundle scan enumerates only top-level app `agents/` and `agent-teams/`; validation canonicalizes application-team agent refs against top-level app agents | Yes |
| 2026-04-18 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/team-definition-config.ts`, `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts` | Inspect generic team member ref validation | Shared team config allows `shared`, `team_local`, and `application_owned`; application-owned team service revalidates application-owned membership through app-bundle ownership maps | Yes |
| 2026-04-18 | Code | `autobyteus-server-ts/src/application-sessions/services/application-session-launch-builder.ts` | Inspect application launch descriptor behavior | Launch builder treats team member agent refs as already-resolved definition ids and does not care whether they are application-owned or team-local if upstream resolution is correct | Yes |
| 2026-04-18 | Code | `autobyteus-server-ts/docs/modules/agent_definition.md`, `autobyteus-server-ts/docs/modules/agent_team_definition.md` | Capture current documented ownership model | Docs currently describe application-owned agents as `applications/<application-id>/agents/<agent-id>/` and state application-owned team agent members must use application-owned refs | Yes |
| 2026-04-18 | Command | `grep -R "refScope: \"application_owned\"\|application_owned" -n applications autobyteus-server-ts/tests` | Find durable fixtures/examples using old semantics | Old semantics appear in both sample apps and multiple server tests | Yes |
| 2026-04-18 | Doc | `tickets/in-progress/application-team-local-agents-refactor/design-review-report.md` | Capture architecture-review findings that require upstream redesign | Round 1 design review failed with `DAR-001` (update-time validation owner ambiguous) and `DAR-002` (UI canonical-to-local persisted-ref boundary ambiguous) | Yes |
| 2026-04-18 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts`, `autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts` | Determine the concrete current update path for app-owned teams | Current service validates app-owned membership before provider update, while the provider already resolves `sourcePaths` and writes app-owned team files; this makes the provider the natural owner for source-aware local-member validation after redesign | Yes |
| 2026-04-18 | Code | `autobyteus-web/utils/teamLocalAgentDefinitionId.ts`, `autobyteus-web/utils/teamDefinitionMembers.ts` | Find existing UI-side team-local id utilities to reuse in the form path | Web already has `buildTeamLocalAgentDefinitionId(...)` and uses it during team-member launch preparation, but it lacks a parse/localize counterpart for form editing | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Application bundle scan reads `application.json`, top-level application `agents/`, and top-level application `agent-teams/`.
- Current execution flow:
  1. `FileApplicationBundleProvider.scanBundleRoot()` lists local app agent ids from `applications/<app>/agents/*` and local team ids from `applications/<app>/agent-teams/*`.
  2. `readApplicationOwnedTeamDefinitionFromSource()` parses `team-config.json` and requires agent members to declare `refScope: "application_owned"`.
  3. `canonicalizeApplicationOwnedTeamMembers()` rewrites those local agent refs into canonical application-owned agent ids.
  4. `assertApplicationOwnedTeamIntegrity()` verifies each agent member points at an application-owned agent in the same bundle.
  5. Generic agent-definition lookup resolves canonical application-owned agent ids through `buildApplicationOwnedAgentSourcePaths()` back to application-root `agents/<agent-id>/`.
- Ownership or boundary observations:
  - The application-bundle provider, application-owned team source parser, application-owned team ref normalizer, and application-owned team integrity validator together encode the old semantics.
  - Existing team-local discovery code is already path-based and provenance-aware; it is the natural authoritative pattern to reuse for application-team member agents.
- Current behavior summary: Application-owned teams currently treat their member agents as application-root sibling definitions rather than team-local definitions.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `applications/brief-studio/agent-teams/brief-studio-team/team-config.json` | Sample application-owned team config | Uses `application_owned` for member agents | Sample authoring contract must change |
| `applications/brief-studio/agents/*` | Sample application-root agents | Holds team-private sample members | These should move under the owning team if they are team-private |
| `applications/socratic-math-teacher/**` | Minimal sample app | Repeats the same application-owned team member pattern | Both built-in samples need cutover |
| `autobyteus-server-ts/src/agent-team-definition/providers/application-owned-team-source.ts` | Parse/write boundary for app-owned teams | Hardcodes `application_owned` for agent members | Must be redesigned around application-team-local semantics |
| `autobyteus-server-ts/src/agent-team-definition/utils/application-owned-team-ref-normalizer.ts` | Canonical/local ref mapping for app-owned team members | Assumes app-owned agent refs | May need replacement or narrowing |
| `autobyteus-server-ts/src/agent-team-definition/utils/application-owned-team-integrity-validator.ts` | Integrity rules for app-owned teams | Requires app-owned agent refs from same bundle | Must enforce same-team team-local agent membership instead |
| `autobyteus-server-ts/src/agent-definition/providers/application-owned-agent-source.ts` | Source-path builder for app-owned agents | Only resolves app-root agents | Direct app agents remain here; team-private agents should resolve elsewhere |
| `autobyteus-server-ts/src/agent-definition/providers/team-local-agent-discovery.ts` | Existing team-local discovery | Already resolves `<team>/agents/*` with team provenance | Good reuse candidate for the new semantics |
| `autobyteus-server-ts/src/application-bundles/providers/file-application-bundle-provider.ts` | Application bundle scan/validation | Scans only top-level app agents/teams and validates app-owned team refs against app-root agents | Bundle validation/discovery shape must change |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Durable ownership docs | Documents current application-owned agent shape | Needs documentation update |
| `autobyteus-server-ts/tests/**` | Durable validation fixtures | Multiple tests assert `application_owned` team-member refs | Test contracts need cutover |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-18 | Setup | Worktree bootstrap via `git worktree add -b codex/application-team-local-agents-refactor ... origin/personal` | Dedicated task workspace created cleanly | Authoritative artifacts and future implementation should stay in this worktree |
| 2026-04-18 | Probe | `grep -R "refScope: \"application_owned\"\|application_owned" -n applications autobyteus-server-ts/tests` | Old semantics are durable across samples and tests, not only one sample app | Cutover scope must include tests/docs/fixtures, not only runtime code |

## External / Public Source Findings

- No external/public sources were required for this local codebase refactor investigation.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for bootstrap investigation.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - `git fetch origin --prune`
  - `git worktree add -b codex/application-team-local-agents-refactor /Users/normy/autobyteus_org/autobyteus-worktrees/application-team-local-agents-refactor origin/personal`
- Cleanup notes for temporary investigation-only setup: Keep the dedicated worktree for the rest of the task.

## Findings From Code / Docs / Data / Logs

- Current application-owned team semantics are not just folder convention; they are encoded in parse rules, integrity validation, canonical-id mapping, bundle scan assumptions, docs, and tests.
- Existing shared-team `team_local` logic already proves the platform can surface and resolve team-local agents independently from their owning team folder.
- Application launch preparation depends on already-resolved definition ids, so the main refactor burden sits upstream in source resolution and validation rather than in the launch-builder leaf logic.
- Architecture review round 1 narrowed the remaining design risk to two boundary contracts:
  - the authoritative owner for update-time validation of application-owned teams with `team_local` members; and
  - the authoritative UI boundary for converting visible canonical team-local ids back into persisted local `ref` values during app-owned team editing.
- `FileAgentTeamDefinitionProvider.update(...)` already resolves concrete `sourcePaths`, so it is the natural persistence boundary for source-aware local-member existence checks.
- `autobyteus-web/utils/teamLocalAgentDefinitionId.ts` is the right existing reuse point for canonical/local team-local id conversion in the web form path.

## Constraints / Dependencies / Compatibility Facts

- Clean-cut target only: no fallback support for old application-team member refs.
- Application manifests can still target a single direct agent, so top-level application-owned agents remain necessary.
- Generic platform surfaces still need independently discoverable/editable application-team member agents with provenance.
- Package/sample mirrors under `dist/importable-package` must remain aligned with the canonical repo-local app roots.

## Open Unknowns / Risks

- Whether application package summary or import management code outside the currently inspected provider path also needs explicit changes for nested team-local agent counting.
- Whether any GraphQL or frontend filters assume application-owned team members always surface as application-owned agents rather than team-local agents with application provenance.
- Exact revised ownership split between `AgentTeamDefinitionService.updateDefinition(...)` and `FileAgentTeamDefinitionProvider.update(...)` must be made explicit in the design reroute.
- Exact UI-side canonical-to-local persisted-ref conversion point must be made explicit in the design reroute.

## Notes For Architect Reviewer

- The intended target is a semantics cleanup, not a compatibility-preserving migration.
- The likely critical path is: redefine semantics -> adjust authoritative provider/validation boundaries -> update sample apps/package mirrors -> update docs/tests -> verify generic surfaces and launch preparation still behave correctly.
