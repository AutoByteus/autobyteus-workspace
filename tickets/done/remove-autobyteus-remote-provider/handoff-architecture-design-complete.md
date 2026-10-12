# Handoff — Architecture Design Complete

- Result classification: `Architecture Design Complete`
- Package identifier: `remove-autobyteus-remote-provider`
- Current solution revision: `SR-003`
- Date: 2026-10-11
- From: Solution Designer (`/software_engineering_team/solution_designer`)
- Route applied: handoff rule "task_size=Large or architectural_risk=High → independent architecture review" → `/software_engineering_team/architecture_reviewer`

## Original Request

Project Task `project_task_7fed5fe3-3ffc-45bd-8925-9873d0850546`, delegated by `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The task is a clean-cut removal of the AutoByteus remote-server LLM provider integration, including `LLMRuntime.AUTOBYTEUS` (user correction 2026-10-11), because the remote server no longer exists. The native agent runtime (`RuntimeKind.AUTOBYTEUS`) must be unaffected.

Origin brief: `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_7fed5fe3-3ffc-45bd-8925-9873d0850546/context/ctx_a442c59ec8c3__follow-up-autobyteus-provider-removal.md`. Its "`LLMRuntime.AUTOBYTEUS` must stay" note is superseded by the user's correction.

## Approval Basis

- Requirements `Approved` by the user on 2026-10-11 ("approve", replying to "approve as recommended").
- DEC-001 = (a): remove the image and audio providers too.
- DEC-002 = (a): no migration. Saved remote model selections show the existing unavailable state; a leftover `AUTOBYTEUS_LLM_SERVER_HOSTS` appears as an ordinary deletable custom setting; the saved vault key stays inert.
- No behavior-defining supplements.

## Classification

- `task_size`: **Large**. Deletion across 3 packages and many subsystems, plus docker, the live-E2E harness and docs; about 25 source files, about 45 test files and about 12 docs.
- `architectural_risk`: **High**:
  - shared public contract removals (exported `autobyteus-ts` enums and the root `clients` export; the GraphQL provider catalog entry; the `modelDiscovery` secret consumer kind);
  - a released app-data migration (`20260730_token_usage_provider_name_snapshot_backfill`, v1.4.53+) repointed to a frozen migration-owned display-name table;
  - a wide test blast radius (many generic tests use AUTOBYTEUS as their sample provider).
- No new owner, no data migration, no concurrency or deployment-order change.
- Escalation triggers are listed in design-spec "Task Size And Architectural Risk".

## Key Design Decisions (see design-spec.md)

- Pure deletion at the existing seams. The owners (`ModelCatalogService`, `ModelAvailabilityService`, `ProviderCredentialCatalog`, the readiness adapter, the web settings stores) stay; only their AUTOBYTEUS branches go.
- Dead code exposed by the deletions is removed in the touched files:
  - the media source-model registry;
  - LLM `syncRuntimeModels`/`retainSourceModels`;
  - `multimedia/model-identifier.ts` and the media `hostUrl`;
  - `ModelCatalogService.notifyCredentialRevision`/`credentialRevisions`;
  - web `DiscoverySettingCatalogTarget.modelKinds`.
- Kept, as a Follow-up: `MultimediaRuntime` with the single value `API`, because the shared GraphQL `ModelDetail.runtime` field carries it for media rows.
- Persisted data: `Directly Usable — No Migration`. Data Migration Guideline §2 is answered in the design.
- The released backfill migration gets `src/app-data-migrations/legacy/released-llm-provider-display-names.ts` (frozen); current runtime must not import it.
- The native runtime (`RuntimeKind`, `"AUTOBYTEUS"` runtime-kind fixtures, `resolveAutoByteusAuthority`) is explicitly not touched.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider`
- Branch: `codex/remove-autobyteus-remote-provider`
- Base: `origin/personal` @ `beb6b3b494779eba207feac94a70cb050db7dcbc`
- Finalization target: `origin/personal`

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/solution-revision-record.md`
- Prior review artifacts: N/A — not applicable (first review)
- Product Design artifacts: N/A — not applicable

## Open Risks

- ASM-002 (low): no external consumer of the removed `autobyteus-ts` exports.
- Coordination with anthropic-incomplete-content-block (compile-only edit in `autobyteus-llm.ts`): whichever lands second rebases. If this lands first, that ticket drops its edit.
- Coverage loss if generic tests are deleted instead of retargeted (mitigated by the retarget list in the design).

## Expected Next Action

Independent architecture review of the cumulative package against the approved requirements. On Pass, the reviewer routes per its rules; on findings, they return to the Solution Designer.
