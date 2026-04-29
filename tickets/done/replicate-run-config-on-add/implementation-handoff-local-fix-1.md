# Implementation Handoff — Local Fix 1

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/replicate-run-config-on-add/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/replicate-run-config-on-add/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/replicate-run-config-on-add/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/replicate-run-config-on-add/design-review-report.md`
- Prior implementation handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/replicate-run-config-on-add/implementation-handoff.md`
- Code review report requiring local fix: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/replicate-run-config-on-add/review-report.md`

## What Changed

Local fix for `CR-001`:

- Added team-form owner cleanup for member override `llmConfig` entries that depend on an inherited global runtime/model.
- On global team runtime change, member override `llmConfig` is pruned when the member did not have an explicit runtime override.
- On global team model change, member override `llmConfig` is pruned when the member did not have an explicit model override.
- Pruning preserves unrelated meaningful member override fields such as explicit runtime/model and `autoExecuteTools`.
- Empty member override records are removed after pruning.
- Added focused `TeamRunConfigForm` regression coverage for global model change and global runtime change.

## Key Files Or Areas

- `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`
- `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`

## Important Assumptions

- A member override without an explicit `runtimeKind` inherits the global runtime; a global runtime change invalidates its explicit member `llmConfig`.
- A member override without an explicit `llmModelIdentifier` inherits the global model; a global model change invalidates its explicit member `llmConfig`.
- Explicit member runtime/model fields remain meaningful after pruning and must be preserved.

## Known Risks

- No new design or requirement gap found. This is a bounded cleanup in the team config owner path.
- `runHistoryStore.ts` remains at the existing `500` effective-line guardrail from the prior implementation; this local fix did not add to it.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: The fix stays in `TeamRunConfigForm` as the global team runtime/model selection owner; `ModelConfigSection` remains renderer-only.

## Environment Or Dependency Notes

- The worktree still has no local dependency install. For checks, I temporarily symlinked `node_modules` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` and removed those symlinks afterward.

## Local Implementation Checks Run

- `pnpm -C autobyteus-web test:nuxt --run components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/ModelConfigSection.spec.ts` — passed (`31` tests).
- `pnpm -C autobyteus-web test:nuxt --run components/workspace/config/__tests__/ModelConfigSection.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts composables/__tests__/useDefinitionLaunchDefaults.spec.ts composables/messaging-binding-flow/__tests__/launch-preset-model-selection.spec.ts` — passed (`34` tests).
- `pnpm -C autobyteus-web test:nuxt --run components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/running/__tests__/RunningAgentsPanel.spec.ts stores/__tests__/runHistoryStore.spec.ts stores/__tests__/agentContextsStore.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts` — passed (`70` tests).
- `git diff --check` — passed.

## Downstream Validation Hints / Suggested Scenarios

- In a team draft, set a member override with only `llmConfig`; change the global model and confirm the member override record is removed.
- Repeat while the member override also has `autoExecuteTools`; confirm only `llmConfig` is removed and `autoExecuteTools` remains.
- Change the global runtime and confirm inherited member `llmConfig` is pruned while explicit member runtime/model fields are preserved.

## API / E2E / Executable Validation Still Required

API/E2E validation remains required after code review passes. Focus remains on browser-level add-flow replication under async model-catalog loading and no stale config after explicit runtime/model changes.
