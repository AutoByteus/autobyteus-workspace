# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/design-review-report.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/code-review-report.md`
- Current API/E2E validation report with AE2E-019/AE2E-016 Local Fix input: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/api-e2e-validation-report.md`
- Delivery hold report for AE2E-022: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/in-progress/self-evolving-harness-feasibility/delivery-hold-ae2e-022-20260605.md`

## What Changed In The Round 5 Rework, CR-006, AE2E-022, AE2E-019/016, And CR-007 Follow-Ups

Aligned the implementation to the latest approved MVP design:

- Kept self-evolution config runtime/run-owned only: standalone/team/member launch config plus run/member metadata snapshots. No definition-owned `selfEvolution` fields were added or retained.
- Kept manual start mutations snapshot-owned: `startAgentRunSelfEvolution(input)` uses `runId` only; team-member start uses `teamRunId + memberRunId`; no start-time config override is accepted.
- Changed editable target semantics from exact `SKILL.md` file-only to exact skill package/root directories plus primary `SKILL.md` paths. The task prompt lists root directories and allows supporting files inside those roots.
- Removed stale MVP change-recorder/audit implementation and tests:
  - deleted `self-evolution-change-recorder.ts`;
  - deleted `self-evolution-git-change-auditor.ts`;
  - deleted `self-evolution-path-canonicalizer.ts`;
  - deleted `self-evolution-change-recorder.test.ts`.
- Removed stale MVP metrics/reporting implementation and tests:
  - deleted `self-evolution-metrics-service.ts`;
  - removed `getSelfEvolutionMetricsReport` GraphQL query and metrics object types/converters;
  - deleted `self-evolution-metrics-service.test.ts`.
- Tightened `SelfEvolutionRunRecord` to minimal provenance only: target/source IDs, visible evolver run linkage, runtime/model, workspace, skill targets, evidence hash, notification summary, timestamps, and errors.
- Added `SelfEvolutionWorkHistoryProjector` and rewired `SelfEvolutionEvidenceBuilder` so prompt-facing evidence is anonymized human-readable work history. `SelfEvolutionEvidencePackage` no longer contains raw trace paths, run metadata paths, or raw trace JSON references.
- Updated the built-in Skill Self-Evolver template to describe a skill improvement coach, exact skill-root edit boundaries, no symlink/path-alias escape, and no sensitive/one-off detail copying.
- Updated target notifications to list affected skill packages/roots and to avoid implying helper-run completion proves improvement.
- Reconciled durable server/web docs to describe the simplified MVP: capability gate, run-owned snapshots, skill-root direct edit, anonymized evidence, minimal provenance, no product audit service, and no MVP metrics/reporting service.

CR-006 local fix after fresh full code review:

- Removed raw `sourceRunIds` from `SingleAgentEvolverStrategy` prompt content. The prompt now uses neutral `Source: anonymized work-history digest from prior source work session(s)` wording.
- Removed raw source run IDs from the self-evolver user-message metadata as well, because message metadata can be visible in run traces/replay. Internal provenance remains in records/GraphQL where intentionally record-facing.
- Strengthened `SelfEvolutionWorkHistoryProjector.clean` to redact Authorization headers, Bearer tokens, `*_API_KEY`, `api_key`, token/password/secret key-value patterns, common provider-key-looking tokens (`sk-*`, `AIza*`, `ghp_*`, `github_pat_*`, Slack-style `xox*`), private paths, emails, trace/tool/provider IDs, and run-like bookkeeping IDs.
- Added focused tests proving raw source/target run IDs are absent from strategy prompt content/metadata and common credential strings are redacted from anonymized work-history evidence.
- Cleaned the stale server docs wording called out by review: removed `orchestration and metrics` from `PROJECT_OVERVIEW.md` and tightened the manual-start requester wording in `docs/modules/self_evolution.md`.

AE2E-022 local fix after API/E2E round 6:

- Added visible self-evolution eligibility controls to the standalone agent run configuration form. When the global self-evolution capability is enabled, users can now mark a normal UI-created standalone run launch eligible; the config mutates to `selfEvolution: { enabled: true }` or `{ enabled: false }` before `prepareAgentRun`.
- Added the equivalent team-run global eligibility control and member override selector. Team launches can now send `TeamRunConfig.selfEvolution`, and individual member overrides can send `MemberConfigOverride.selfEvolution` where needed.
- Kept definition ownership unchanged: these are runtime/run-launch configuration controls only; no agent/team definition config fields were added.
- Improved run-history action discoverability by making the standalone self-evolution action visible instead of hover-only and adding accessible labels for standalone and team-member self-evolution actions.
- Added focused repository validation for the visible form path and launch payload: config form tests toggle eligibility, member override tests preserve/clear member overrides, and `agentRunStore` verifies the visible launch override is included in `prepareAgentRun`.

AE2E-019/AE2E-016 local fix after API/E2E round 7:

- Fixed the prompt-evidence classification gap where `DURABLE_SKILL_UPDATE:` and future-answer correction language appeared in the interaction history but still rendered `No explicit correction signal was detected`.
- `SelfEvolutionWorkHistoryProjector` now classifies explicit durable skill updates, skill-update markers, future/next-run answer corrections, exact-answer directives, and "going forward/from now on" guidance as prompt-facing feedback signals.
- Explicit durable updates are rendered as `Explicit durable skill update requested: ...`, preserving useful durable correction text while continuing to redact credentials/tokens/paths/run IDs.
- `SingleAgentEvolverStrategy` now adds a dedicated "Explicit durable correction handling" section instructing the helper to prioritize concrete future-behavior/exact-answer updates, edit the durable rule/examples/change log, avoid process-only guidance, and not claim completion unless skill content reflects the correction.
- The built-in Skill Self-Evolver template now carries the same concrete durable-correction priority so the helper's system prompt and task message agree.
- Added focused server regression tests proving a round-7-style durable marker correction is classified as a feedback signal, the old "no explicit correction" fallback is not emitted, secrets remain redacted, and the helper prompt contains the durable-correction handling instructions.

CR-007 local fix after code review round 10:

- Narrowed non-marker durable-signal classification so standalone exact-answer wording such as `Answer with only ...` or `Please answer exactly ...` is not promoted into `Explicit durable skill update requested`.
- Direct explicit markers remain positive: `DURABLE_SKILL_UPDATE:` and `SKILL_UPDATE:`.
- Non-marker exact-answer/future-answer language now requires a concrete behavior directive plus either forward-looking context (`future`/`next`/`subsequent` answers/runs, `going forward`, `from now on`, `in future`) or durable/skill update/correction/change context.
- Added negative projector regression coverage proving ordinary one-off exact-answer instructions still render in interaction history but produce no feedback signals and keep the no-explicit-correction fallback.
- Preserved the round-7 positive durable marker regression.

## Key Files Or Areas

Server implementation:

- `autobyteus-server-ts/src/self-evolution/domain/models.ts`
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts`
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-record-lifecycle.ts`
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-skill-target-resolver.ts`
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-evidence-builder.ts`
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-work-history-projector.ts`
- `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-notification-service.ts`
- `autobyteus-server-ts/src/self-evolution/services/strategies/single-agent-evolver-strategy.ts`
- `autobyteus-server-ts/src/api/graphql/types/self-evolution*.ts`
- `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md`

Tests:

- `autobyteus-server-ts/tests/self-evolution/self-evolution-effective-config-resolver.test.ts`
- `autobyteus-server-ts/tests/self-evolution/manual-trigger-strategy.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-graphql-converters.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-graphql-resolver.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-work-history-projector.test.ts`
- `autobyteus-server-ts/tests/self-evolution/single-agent-evolver-strategy.test.ts`
- `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts`

Frontend/docs:

- `autobyteus-web/graphql/queries/selfEvolutionQueries.ts`
- `autobyteus-web/stores/selfEvolutionStore.ts`
- `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue`
- `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`
- `autobyteus-web/components/workspace/config/MemberOverrideItem.vue`
- `autobyteus-web/components/workspace/config/MemberOverrideTree.vue`
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
- `autobyteus-web/stores/agentRunStore.ts`
- `autobyteus-web/utils/teamRunConfigUtils.ts`
- `autobyteus-server-ts/docs/modules/self_evolution.md`
- `autobyteus-server-ts/docs/ARCHITECTURE.md`
- `autobyteus-web/docs/agent_execution_architecture.md`
- `autobyteus-web/docs/skills.md`
- `autobyteus-web/docs/settings.md`

## Important Assumptions

- The feature remains globally disabled by default and every backend start mutation enforces the global gate.
- The visible launch config controls are shown only when the typed global capability has resolved enabled, or when an existing config already has an explicit self-evolution override to display read-only/history state.
- Only `manual_only` and `single_agent` are executable; scheduled/signal triggers and agent-team evolver remain not-implemented descriptors only.
- The visible evolver run and manual Git inspection/revert are the MVP review surface. The product service does not classify file changes or off-target edits in MVP.
- The service resolves current configured skill roots at evolution time; exact historical skill binding/path snapshots remain deferred as an accepted MVP risk.
- Prompt/evidence privacy is part of the implementation boundary: raw trace paths are not retained in the evidence package or run record, and raw source/target run IDs are not prompt-facing.
- UI/notifications must not imply helper-run completion proves quality or downstream benefit.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature rework / scope simplification.
- Reviewed root-cause classification: Boundary Or Ownership Issue / Legacy Or Compatibility Pressure from stale earlier implementation paths.
- Reviewed refactor decision: Refactor Needed Now, bounded to removing stale audit/metrics/raw-evidence surfaces and aligning self-evolution service ownership to the round 5 design.
- Implementation matched the reviewed assessment: Yes.
- If challenged, routed as Design Impact: N/A for this pass; AE2E-022 was a Local Fix because the reviewed design already requires visible run-launch eligibility controls and the implementation had omitted the UI path. AE2E-019/AE2E-016 is also a Local Fix because the reviewed evidence/prompt boundary exists and the defect was isolated to signal classification plus helper instructions. CR-007 is a bounded precision fix inside the same projector boundary.
- Evidence / notes: `SelfEvolutionService` remains the authoritative lifecycle boundary. `SelfEvolutionEvidenceBuilder` now delegates anonymized projection to `SelfEvolutionWorkHistoryProjector`. `SelfEvolutionRunRecord` is minimal provenance, not an audit/metrics model.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` — stale change recorder/Git auditor/path canonicalizer/metrics service and their focused tests were removed.
- Shared structures remain tight: `Yes` — `SelfEvolutionSkillTarget`, `SelfEvolutionEvidencePackage`, and `SelfEvolutionRunRecord` no longer carry stale Git/audit/raw-path/metrics fields.
- Changed source implementation files stayed within guardrails: `Yes`; no changed source implementation file exceeds 500 effective non-empty lines.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility`
- Branch: `codex/self-evolving-harness-feasibility`
- Recorded base/finalization branch: `origin/personal`; delivery owns refresh/rebase later.

## Local Implementation Checks Run

Current CR-007 pass:

- Passed: `pnpm -C autobyteus-server-ts exec vitest run tests/self-evolution/self-evolution-work-history-projector.test.ts tests/self-evolution/single-agent-evolver-strategy.test.ts`
- Passed: `pnpm -C autobyteus-server-ts exec vitest run tests/self-evolution/self-evolution-effective-config-resolver.test.ts tests/self-evolution/manual-trigger-strategy.test.ts tests/self-evolution/self-evolution-graphql-converters.test.ts tests/self-evolution/self-evolution-graphql-resolver.test.ts tests/self-evolution/self-evolution-work-history-projector.test.ts tests/self-evolution/single-agent-evolver-strategy.test.ts tests/self-evolution/self-evolution-service.integration.test.ts`
- Passed: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- Passed: `pnpm -C autobyteus-server-ts build`
- Passed: `git diff --check`

Prior AE2E-019/AE2E-016 pass:

- Passed: `pnpm -C autobyteus-server-ts exec vitest run tests/self-evolution/self-evolution-work-history-projector.test.ts tests/self-evolution/single-agent-evolver-strategy.test.ts`
- Passed: `pnpm -C autobyteus-server-ts exec vitest run tests/self-evolution/self-evolution-effective-config-resolver.test.ts tests/self-evolution/manual-trigger-strategy.test.ts tests/self-evolution/self-evolution-graphql-converters.test.ts tests/self-evolution/self-evolution-graphql-resolver.test.ts tests/self-evolution/self-evolution-work-history-projector.test.ts tests/self-evolution/single-agent-evolver-strategy.test.ts tests/self-evolution/self-evolution-service.integration.test.ts`
- Passed: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- Passed: `pnpm -C autobyteus-server-ts build`
- Passed: `git diff --check`

Prior AE2E-022 pass:

- Passed: `pnpm -C autobyteus-web test:nuxt --run components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts stores/__tests__/agentRunStore.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
- Passed: `pnpm -C autobyteus-web test:nuxt --run components/workspace/config/__tests__/RunConfigPanel.spec.ts stores/__tests__/agentRunConfigStore.spec.ts stores/__tests__/teamRunConfigStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts`
- Passed: `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web audit:localization-literals`
- Passed: `pnpm -C autobyteus-server-ts exec vitest run tests/self-evolution/self-evolution-effective-config-resolver.test.ts tests/self-evolution/manual-trigger-strategy.test.ts tests/self-evolution/self-evolution-graphql-converters.test.ts tests/self-evolution/self-evolution-graphql-resolver.test.ts tests/self-evolution/self-evolution-work-history-projector.test.ts tests/self-evolution/single-agent-evolver-strategy.test.ts tests/self-evolution/self-evolution-service.integration.test.ts`
- Passed: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- Passed: `git diff --check`

Prior CR-006 pass:

- Passed: `git diff --check`
- Passed: `pnpm -C autobyteus-server-ts exec vitest run tests/self-evolution/self-evolution-work-history-projector.test.ts tests/self-evolution/single-agent-evolver-strategy.test.ts`
- Passed: `pnpm -C autobyteus-server-ts exec vitest run tests/self-evolution/self-evolution-effective-config-resolver.test.ts tests/self-evolution/manual-trigger-strategy.test.ts tests/self-evolution/self-evolution-graphql-converters.test.ts tests/self-evolution/self-evolution-graphql-resolver.test.ts tests/self-evolution/self-evolution-work-history-projector.test.ts tests/self-evolution/single-agent-evolver-strategy.test.ts tests/self-evolution/self-evolution-service.integration.test.ts`
- Passed: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- Passed: `pnpm -C autobyteus-server-ts build`

Previously passed after the round 5 web/API surface cleanup and not rerun for the server-only CR-006 prompt/projector/docs fix:

- `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web audit:localization-literals`
- `pnpm -C autobyteus-web test:nuxt --run components/settings/__tests__/SelfEvolutionFeatureToggleCard.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`

Known project-wide note from earlier rounds:

- Full Nuxt typecheck had existing unrelated project-wide failures before this rework. It was not rerun as a sign-off gate for this implementation pass; focused web guards/component tests passed after the query/type field cleanup.

## Suggested Downstream Review / Validation Focus

- Verify no source imports or GraphQL schema fields remain for change recorder, Git auditor, audit summaries, update metrics, benefit metrics, or `getSelfEvolutionMetricsReport`.
- Verify eligibility/start still enforce global capability and run/member metadata snapshots.
- Verify normal UI-created standalone runs can be marked self-evolution eligible from the visible run configuration form after Settings > Self-evolution is enabled, and that `prepareAgentRun` receives/snapshots `selfEvolution: { enabled: true }`.
- Verify team run global and member override controls send the expected launch-level `selfEvolution` overrides without adding definition-owned config.
- Verify the run-history self-evolution action is visible/discoverable enough for an eligible run and still uses backend eligibility before starting.
- Verify the evolver task prompt lists exact skill root directories plus primary `SKILL.md` paths and does not include raw trace file paths, raw source run IDs, or raw target run IDs.
- Verify the work-history projector redacts common credential/token/secret forms while preserving useful high-level correction and tool-outcome feedback.
- Verify round-7-style `DURABLE_SKILL_UPDATE:` / future-answer corrections are classified under `Feedback and improvement signals` and no longer render the "No explicit correction signal was detected" fallback.
- Verify ordinary one-off exact-answer task instructions such as `Answer with only ...` and `Please answer exactly ...` are not rendered as `Explicit durable skill update requested`.
- Verify the self-evolver prompt and built-in agent instructions force concrete durable behavior updates for explicit correction signals instead of process-only guidance.
- Verify evolution records persist minimal provenance only and notification outcomes, not raw trace paths or change/metrics summaries.
- Re-run API/E2E full loop with the revised expectation: normal UI-created eligible run, visible evolver run, durable marker update applied in `SKILL.md`, minimal record/notification, and post-evolution next-run behavior; no product-level changed-file audit or metrics report.
