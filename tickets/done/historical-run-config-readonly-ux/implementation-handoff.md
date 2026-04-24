# Implementation Handoff

## Status

Frontend-only implementation for `Historical run config read-only UX` is complete and ready for code review.

This handoff intentionally excludes the superseded combined backend/root-cause materialization work. Backend recovery, runtime-history inference, metadata materialization, backfill, and resume/runtime semantics remain out of scope for this split ticket.

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/historical-run-config-readonly-ux/tickets/in-progress/historical-run-config-readonly-ux/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/historical-run-config-readonly-ux/tickets/in-progress/historical-run-config-readonly-ux/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/historical-run-config-readonly-ux/tickets/in-progress/historical-run-config-readonly-ux/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/historical-run-config-readonly-ux/tickets/in-progress/historical-run-config-readonly-ux/design-review-report.md`

## What Changed

- `RunConfigPanel` now treats selected existing agent/team runs as read-only inspection mode and passes `readOnly` to the corresponding config form.
- Selection-mode workspace select/load handlers now no-op instead of mutating selected historical config or creating workspaces from the historical panel.
- The launch/run button remains hidden in selection mode, preserving the distinction between historical inspection and new-run launch configuration.
- `AgentRunConfigForm` and `TeamRunConfigForm` now:
  - disable runtime/model/workspace/auto-approve/skill controls when read-only;
  - guard all direct mutation/update handlers;
  - show localized read-only notices for selected existing runs;
  - expand model advanced/thinking sections in read-only mode.
- `TeamRunConfigForm` propagates disabled/read-only and expanded advanced state into `MemberOverrideItem` rows.
- `RuntimeModelConfigFields` now accepts a read-only mode and suppresses runtime/model/model-config normalization emissions while read-only.
- `ModelConfigSection` and `ModelConfigAdvanced` keep persisted model-thinking values inspectable while disabled and can show a localized `Not recorded for this historical run` display when selected historical metadata has null model config.
- Persisted backend-provided values such as `llmConfig.reasoning_effort = "xhigh"` are displayed as-is when present; null values are not recovered or inferred.
- Focused component tests were added/updated for selected historical agent/team read-only mode, mutation guards, advanced visibility, persisted reasoning display, not-recorded display, and new-run editability.
- Added localized read-only/not-recorded strings in the existing workspace message bundles.

## Key Files Or Areas

- `autobyteus-web/components/workspace/config/RunConfigPanel.vue`
- `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue`
- `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`
- `autobyteus-web/components/workspace/config/MemberOverrideItem.vue`
- `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue`
- `autobyteus-web/components/workspace/config/ModelConfigSection.vue`
- `autobyteus-web/components/workspace/config/ModelConfigAdvanced.vue`
- `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts`
- `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts`
- `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`
- `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts`
- `autobyteus-web/components/workspace/config/__tests__/ModelConfigSection.spec.ts`
- `autobyteus-web/localization/messages/en/workspace.generated.ts`
- `autobyteus-web/localization/messages/zh-CN/workspace.generated.ts`

## Important Assumptions

- This ticket consumes backend-provided historical config as-is. If backend metadata has `llmConfig.reasoning_effort = "xhigh"`, the UI displays `xhigh`; if metadata has `llmConfig: null`, the UI may show an explicit not-recorded state but does not infer a value.
- `RunConfigPanel` remains the authoritative frontend owner for selected-existing-run vs new-launch mode. Child forms receive `readOnly` via props and do not rediscover selection mode through global stores.
- Read-only frontend behavior is separate from existing `config.isLocked` execution locking. Selected existing/historical config is inspect-only regardless of whether the run config is locked.
- Existing generated workspace localization files are the edited localization boundary for this patch.

## Known Risks

- Backend null metadata remains unresolved and must be handled by the later backend/runtime/history root-cause ticket.
- Shared runtime/model components are used outside the historical run panel; read-only and missing-state behavior was kept opt-in via props to preserve new-run editability.
- Localization source-of-truth/generator expectations should still be confirmed during delivery if the project requires generated files to be produced from another source.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: The old selection-mode workspace mutation branches in `RunConfigPanel` were removed. Changed frontend implementation files remain under 500 effective non-empty lines. Components over the 220-line assessment threshold were reviewed and kept because the patch adds narrow opt-in display/guard props to existing owners rather than introducing new mixed responsibilities.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/historical-run-config-readonly-ux`
- Branch: `codex/historical-run-config-readonly-ux`
- Base: `origin/personal` at `0ee19d1c14c1b112dd7dc28680f551bcdd861d6a`
- No backend files are changed. Scope verification: `git diff --name-only` contains only `autobyteus-web/...` paths plus ticket artifacts.
- No package manifest or lockfile changes were made.

## Local Implementation Checks Run

- `pnpm -C autobyteus-web exec nuxi prepare` — passed.
- `pnpm -C autobyteus-web exec vitest run components/workspace/config/__tests__/RunConfigPanel.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts components/workspace/config/__tests__/ModelConfigSection.spec.ts components/workspace/config/__tests__/WorkspaceSelector.spec.ts` — passed; 6 files, 51 tests.
- `pnpm -C autobyteus-web guard:localization-boundary` — passed.
- `pnpm -C autobyteus-web audit:localization-literals` — passed with zero unresolved findings; existing module-type warning observed for `localization/audit/migrationScopes.ts`.
- `pnpm -C autobyteus-web guard:web-boundary` — passed.
- `git diff --check` — passed.
- Scope check: `git diff --name-only | grep '^autobyteus-server-ts/'` returned no backend changes.

## Downstream Validation Hints / Suggested Scenarios

- Select an existing single-agent run and confirm runtime/model/workspace/auto-approve/skill controls are disabled, update handlers do not mutate config, advanced model-thinking values are visible, and the read-only notice appears.
- Select an existing team run and confirm global team controls and member override controls are disabled/guarded, member advanced sections are inspectable, and the team read-only notice appears.
- Use a fixture/config with `llmConfig: { reasoning_effort: "xhigh" }` and confirm `xhigh` is displayed in read-only mode.
- Use a fixture/config with `llmConfig: null` and confirm the UI does not display an inferred/recovered reasoning value; an explicit not-recorded state is acceptable.
- Confirm no selected-historical config interaction creates/changes a workspace or routes to files via the historical panel.
- Confirm new agent/team launch configuration remains editable and still updates launch config as before.

## API / E2E / Executable Validation Still Required

- API/E2E validation was not run by implementation. Downstream validation should focus on frontend selected-run inspection behavior and guard against accidental backend/root-cause scope creep.
