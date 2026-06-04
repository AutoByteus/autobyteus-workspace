# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/design-review-report.md`
- Code review report addressed in this rework: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/code-review-report.md`

## What Changed

Implemented the feature-gated manual skill self-evolution MVP and the code-review/design-correction rework:

- Added the server-side `self-evolution` subsystem with typed domain models, global capability gate, effective run-config snapshot resolution, strategy catalog, manual trigger strategy, target context/skill/evidence resolution, visible single-agent evolver launch, change recording, durable run records, target notification, and update/benefit metrics.
- Added the built-in `autobyteus-skill-evolver` helper agent template with `run_bash` access and no hardcoded runtime/model.
- Generalized built-in helper-agent default setting initialization so memory compactor and skill evolver use the same setting-key path.
- Added standalone/team run-launch `selfEvolution` config fields and launch-time metadata snapshots (`AgentRunMetadata.selfEvolutionEffective`, `TeamRunMemberMetadata.selfEvolutionEffective`).
- Applied the round 3 architecture correction: removed the prior definition-owned `selfEvolution` surface from agent/team definition domain models, config JSON parsing/writing, definition GraphQL types/inputs/converters, web definition queries/mutations/stores, and launch-template propagation from definitions.
- Changed effective config precedence to runtime/run ownership only:
  - standalone: default disabled -> `AgentRunConfig.selfEvolution` -> run metadata snapshot;
  - team member: default disabled -> `TeamRunConfig.selfEvolution` -> `TeamMemberRunConfig.selfEvolution` -> member metadata snapshot.
- Added GraphQL capability, strategy catalog, eligibility, manual start, run-record, and metrics-report surfaces. Definition update APIs do not accept self-evolution config.
- Added frontend self-evolution capability/action stores, settings toggle card, run-launch config propagation, and run-history manual action buttons for standalone runs and team member runs.
- Addressed CR-001/CR-003: change recording now snapshots target file hashes and Git roots, audits staged/unstaged/untracked/committed path changes against exact editable `SKILL.md` paths, exposes off-target paths/policy violations, and avoids counting same-content rewrites as persistent skill changes.
- Addressed the round 2 CR-001 follow-up: configured-but-non-editable `SKILL.md` mutations are policy violations regardless of Git backing, are excluded from `changedSkillPaths`, and therefore cannot count as valid update/benefit metric inputs. Focused recorder coverage now includes editable target mutation, non-Git read-only configured mutation, and Git-backed read-only configured mutation.
- Addressed CR-004: benefit metrics now require overlap between changed skill targets and currently configured skill targets when collectible; otherwise metrics stay `not_enough_data`/`not_collectible` instead of implying benefit linkage.
- Addressed CR-005: visible run-history self-evolution buttons lazy-load backend eligibility for expanded rows and remain disabled/unavailable until backend eligibility says the target is eligible.
- CR-002 from code review is superseded by the accepted round 3 design correction and resolved by deleting the definition-owned config surface rather than preserving omitted-vs-clear semantics on definition updates.

## Key Files Or Areas

Server:

- `autobyteus-server-ts/src/self-evolution/`
- `autobyteus-server-ts/src/api/graphql/types/self-evolution*.ts`
- `autobyteus-server-ts/src/agent-execution/domain/agent-run-config.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`
- `autobyteus-server-ts/src/run-history/store/*metadata*`
- `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/`
- `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts`
- `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts`
- `autobyteus-server-ts/src/services/server-settings-service.ts`

Web:

- `autobyteus-web/types/agent/SelfEvolutionConfig.ts`
- `autobyteus-web/types/agent/AgentRunConfig.ts`
- `autobyteus-web/types/agent/TeamRunConfig.ts`
- `autobyteus-web/stores/selfEvolutionCapabilityStore.ts`
- `autobyteus-web/stores/selfEvolutionStore.ts`
- `autobyteus-web/graphql/queries/selfEvolutionQueries.ts`
- `autobyteus-web/graphql/mutations/selfEvolutionMutations.ts`
- `autobyteus-web/components/settings/SelfEvolutionFeatureToggleCard.vue`
- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`

Tests:

- `autobyteus-server-ts/tests/self-evolution/self-evolution-effective-config-resolver.test.ts`
- `autobyteus-server-ts/tests/self-evolution/manual-trigger-strategy.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-metrics-service.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-change-recorder.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-graphql-converters.test.ts`

## Important Assumptions

- Global backend capability remains the authoritative safety gate. It initializes disabled and every start mutation calls `SelfEvolutionCapabilityService.requireEnabled()` before launching an evolution run.
- Only `manual_only` trigger and `single_agent` evolver are executable. Scheduled/signal triggers and agent-team evolver remain catalog-visible not-implemented placeholders/rejections.
- Manual starts do not accept start-time config overrides; they read the target run/member `selfEvolutionEffective` snapshot. Runs without snapshots are ineligible.
- Agent/team definitions are used only for target identity and configured skill lookup, not self-evolution eligibility/config ownership.
- The evolver is a separate visible `AgentRun`; it is not inserted into the target business team.
- The direct-edit MVP relies on exact absolute editable target `SKILL.md` paths supplied by the service plus post-run Git/file audit. No custom proposal/apply tool was introduced.

## Known Risks

- Direct skill edits are prompt/tool-contract constrained rather than service-mediated patch application. Git/off-target audit now improves reviewability and policy enforcement but does not create a sandbox.
- Active target notification is best-effort for active idle standalone runs; team member notification is recorded as next-run-only.
- Benefit metrics are proxy/initial metrics. They intentionally report `not_enough_data` or `not_collectible` until later linked runs or feedback exist.
- Frontend full typecheck remains blocked by existing project-wide type errors unrelated to this rework; changed self-evolution/history files are covered by focused component tests and guards.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement / Feature.
- Reviewed root-cause classification: Boundary Or Ownership Issue / Duplicated Policy Or Coordination.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now, bounded to self-evolution ownership boundaries, run-launch config snapshots, direct-edit audit, and generic built-in helper-agent setting initialization.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): Yes — the user/architecture-review correction was applied by moving config ownership out of definitions and back to runtime/run-launch surfaces.
- Evidence / notes: `SelfEvolutionService` remains the authoritative lifecycle boundary; `SelfEvolutionEffectiveConfigResolver` owns runtime/run-launch precedence; GraphQL/UI call service/capability/eligibility boundaries instead of assembling internals. Definition-owned self-evolution config was removed cleanly.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` — definition-owned self-evolution fields and the compactor-specific bootstrap setting special case were removed/replaced.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` — override/effective config, run records, change summary, update metrics, and benefit metrics remain separated.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes` — no changed non-test source file exceeds 500 effective non-empty lines. Larger existing files were touched narrowly; self-evolution transport remains split into resolver/types/converters.
- Notes: Old run metadata without `selfEvolutionEffective` is intentionally ineligible. Existing agent/team config files remain valid without self-evolution fields.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility`
- Branch: `codex/self-evolving-harness-feasibility`
- Recorded base/finalization branch: `origin/personal`; delivery owns refresh/rebase later.
- `.tmp_external/a-evolve` remains an untracked investigation-only clone documented in upstream investigation notes as non-committable research context.

## Local Implementation Checks Run

Latest CR-001 follow-up checks passed:

- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- `pnpm -C autobyteus-server-ts exec vitest run tests/self-evolution/self-evolution-effective-config-resolver.test.ts tests/self-evolution/self-evolution-metrics-service.test.ts tests/self-evolution/manual-trigger-strategy.test.ts tests/self-evolution/self-evolution-change-recorder.test.ts tests/self-evolution/self-evolution-graphql-converters.test.ts`
- `pnpm -C autobyteus-server-ts build`

Previously passed before the server-only round 2 CR-001 follow-up and not rerun after this bounded server patch:

- `pnpm -C autobyteus-web guard:web-boundary`
- `pnpm -C autobyteus-web guard:localization-boundary`
- `pnpm -C autobyteus-web audit:localization-literals`
- `pnpm -C autobyteus-web test:nuxt --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`

Checked / known project-wide failure:

- `pnpm -C autobyteus-web exec nuxi typecheck` exits with existing project-wide type errors (259 TS errors; examples include build script type-only imports, missing `~/stores/agents`, stale component/test fixture typings, and unrelated store typing issues). A targeted grep of the saved log for changed self-evolution/history/definition-removal files returned no direct changed-file errors.

## Downstream Validation Hints / Suggested Scenarios

- Confirm `selfEvolutionCapability` initializes disabled, `setSelfEvolutionEnabled(false/true)` persists, and all start mutations reject while disabled.
- Launch a standalone run with run-launch `selfEvolution.enabled=true`; verify metadata contains an effective snapshot and old runs without snapshots are ineligible.
- Start standalone self-evolution and verify the separate evolver run is visible, uses target workspace/runtime/model fallback, has `autoExecuteTools: true`, and records an evolution run record.
- Repeat for a team member with team-run and member-run overrides; verify member override wins and only that member's configured skill targets are supplied.
- Verify no agent/team definition GraphQL input, web definition type/store, or `agent-config.json` / `team-config.json` path accepts or persists `selfEvolution`.
- Exercise direct-edit audit against a Git-backed disposable skill root: target `SKILL.md` edit should be recorded as a skill change; off-target edits should produce policy violations/failure; same-content rewrites should not count as changed skill files.
- Verify benefit metrics do not link later same-agent runs unless configured skill targets overlap the evolved skill name/path.
- Verify run-history buttons lazy-load eligibility for expanded rows, remain disabled for old/ineligible runs, and show warnings/tooltips when backend eligibility reports them.

## API / E2E / Executable Validation Still Required

API/E2E validation remains required. Suggested ownership for the next stage:

- GraphQL capability, strategy catalog, eligibility, start rejection, and metrics-report executable coverage.
- End-to-end visible evolver launch in a disposable Git-backed skill package/workspace.
- Browser/UI validation for settings toggle, run-launch config surfaces, and run-history manual actions.
- Validation that no repository-resident durable validation added during API/E2E bypasses code review before delivery.
