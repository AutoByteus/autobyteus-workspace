# Investigation notes — settings-saved-model-refresh

## Meta / Bootstrap
- Package `settings-saved-model-refresh`; Task `project_task_5ee10f33-b73e-4373-b646-e87613e9c57b`.
- Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh`.
- Git branch `codex/settings-saved-model-refresh` (initially created as `fix/settings-saved-model-refresh`, renamed after reading source-current RELEASE.md).
- Refreshed `origin` with `git fetch origin`; origin default `personal`; resolved base `1a2379c57088e8976aeb0f43e1e607e1acc103c6`. Finalization target `origin/personal`.
- Bootstrap Pass on 2026-10-13. Main checkout is dirty and behind remote; untouched. Source-current root AGENTS adds RELEASE.md compared with initial checkout. Source-current TESTING.md is 242 lines; read fully, supersedes older main-checkout guidance.
- Created Draft requirements and investigation from provided templates before deeper source investigation. No workspace blocker. Current completed solution revision SR-002; requirements baseline SR-001.
- Authorities read: provided solution-designer SKILL.md; full references/requirements-engineering.md, architecture-design.md, design-principles.md; their requirements/investigation/revision/design templates; task-worktree root AGENTS.md, DESIGN.md, TESTING.md, RELEASE.md; web/server AGENTS.md. Design gate passed before architectural decisions; no closer web DESIGN*.md found. All read 2026-10-13. Web ARCHITECTURE.md architecture/test section consulted (its Python-backend prose is outdated versus actual TS source; not used as current runtime evidence).

## Request / Product / Scenario Basis
User explicitly asked immediate bug dispatch, not another feature/release. Parent (Project Task Manager example) is Offline; gear opens middle Settings; choose model/config for listed stopped collaborator/delegated Agent/Team/member and Save; current view remains old, returning to chat/reopening reveals choice. This is reported, not independently reproduced yet. Prior Task 025b20cb remains closed; prior completed feature commit `5eb5361cdd` and default-selection commit `e2060dfd` are context. New Task allocated upstream; no duplicate created here.

BEH-001 / SCN-001/002: normal existing stopped model editing, same-view saved result required. BEH-002 / SCN-003: explicit failed/cancelled-save constraint, truthful readback recovery. BEH-003 / SCN-004: existing stop/edit/resume restrictions and per-instance choices preserved. Screenshots show Offline and the model/Thinking/Fast/locked approval controls, expanded collaborator Team and member rows, and Save bar. They are not before/after proof.

## Source Log And Technical Evidence
All code paths below are relative to the task workspace; inspected using `cat`, `sed -n`, `rg -n` and `git show --stat` on the resolved base.

| Evidence | Exact source / command | Observation and implication |
|---|---|---|
| E-01 | `tickets/done/delegated-copy-model-change/requirements-doc.md`, `git show --stat 5eb5361cdd` | Prior approved feature explicitly requires saved choice shown on rows, stopped-copy edits, Team followers/own overrides and per-instance isolation. No extra “Your choice” label or separate Reset. Current bug repairs that existing journey. |
| E-02 | `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue`, especially delegatedRows and save | Agent-root delegatedRows reads `useAgentRunCollaborationStore().contextFor(runId)?.view`; Team/Org rows read `draft.executionTree`. Save invokes delegatedDraft.save, discards root drafts then calls draftStore.reloadCanonical. |
| E-03 | `autobyteus-web/stores/delegatedLaunchDraftStore.ts` save/discard/loadOptions; `services/runConfigEditing/delegatedLaunchSelectionClient.ts` | Successful mutation immediately clears edits/originals, sets success, reloads options. Mutation result is only success/outcome/message/fieldErrors, **not canonical settings**. Options refresh does not publish saved row data. Rejected/exception result keeps edits/error. |
| E-04 | `autobyteus-web/stores/existingRunConfigEditActions.ts` reloadCanonical; `stores/existingRunConfigStore.ts` loadAgentCanonical/syncAgentCanonical/loadTeamCanonical/loadAgentOrgCanonical | Agent reload reads only parent resume metadata; no collaborator/copy view. Team/Org reloads include their complete execution tree. Canonical loader clears draft then catches errors into feedback/reconciliationRequired. It returns void, so fulfilled promise is not proof of success. |
| E-05 | `autobyteus-web/stores/agentRunCollaborationStore.ts` inspect/syncHost/publish; `composables/agentCollaboration/useAgentRunCollaborationSync.ts` | Stopped inspection reads/publishes saved view without attach; triggered by host lifecycle/selection sync, not delegated Save. inspect skips when live stream owns data, deduplicates pending requests, catches errors, and hydrates every child's projection/activity/artifacts before publication. Its full hydration is unnecessary for merely refreshing Settings values. |
| E-06 | `autobyteus-web/services/agentCollaboration/agentRunCollaborationHydration.ts` readAgentRunCollaboration | Existing read-only exported query client uses network-only + queryDeduplication:false; validates envelope/root ID and returns root_agent/null; never restores. Separate stageAgentRunCollaborationContext performs history hydration. A settings read needs only the former. |
| E-07 | `autobyteus-server-ts/src/api/graphql/types/agent-run-collaboration.ts` agentRunCollaboration; `src/standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` getInspection/updateStoredTree | Inspection uses active snapshot or stored tree without restore. Stopped save validates, applies selections, writes tree and rereads it; reports UPDATED only after committed and equal readback (UNCHANGED also success). Supports persistence lead; no execution proof of user's exact install. |
| E-08 | `autobyteus-server-ts/src/run-history/services/delegated-launch-selection-service.ts` update/updateStopped | Root-kind dispatcher preserves running/stopped behavior. Stopped Agent writes collaboration tree through its manager; host-selection update, if supplied, goes through host service separately. Existing partial failure message exists; do not promise new cross-file transaction atomicity in this bug. |
| E-09 | `autobyteus-web/utils/runSettings/delegatedLaunchRows.ts` builders/camelRule/snakeRule/collaborationDelegatedLaunchNodes | Draft overlays recorded user choices; absent draft falls back to recorded choices/started values. Shared contract helpers own Team-follow/member-own policy. Keys address@exact-run-ID and agent:/team: target keys protect separate copies. Clearing draft over unchanged Agent collaboration view deterministically selects OLD recorded state. |
| E-10 | `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts` delegated_launch_selections_changed | Active-root event causes checkpoint refresh. Stopped-root Save has no active stream to deliver that refresh. Do not start/reconnect a run to refresh Settings. |
| E-11 | `autobyteus-web/components/workspace/config/__tests__/ExistingRunConfigEditor.delegatedSave.spec.ts` | Collaboration context mocked null, presentation stubbed. Existing assertion only checks reloadCanonical called, not rendered canonical values, so it misses this stopped-root split-read bug. |
| E-12 | `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` DCP-001..005; prior `api-e2e-execution-coverage-report.md` | DCP-001 saves stopped copy while parent **stays running**, using live event publication. Others focus Team/Org roots/restart/per-member. This does not prove reported fully stopped Agent-parent no-navigation case. Probe provides safe real server + fake CLI setup, zero inference. Prior receipts are not current-source validation. |
| E-13 | `autobyteus-web/components/run-settings/ExistingRunSettings.vue` and `stores/existingRunConfigResultActions.ts` | Existing refresh-required state/action and Save bar available. Warning currently takes precedence over error text; failed initial canonical load renders only loading/error paragraph (no retry action). Readback failure needs accessible retry and no stale success. Reuse these surfaces, no redesign. |

## Current-State Causal Trace / Architecture Findings
1. User edits old A→B; draft overlay makes visible B.
2. Save API accepted and stored B (server code reads back stored tree before returning success).
3. delegated draft clears overlay. Agent rows now read old in-memory collaboration view A.
4. Parent canonical reload only reads host metadata; it does not update the collaboration view supplying these rows. Options reload likewise cannot update it. Settled open view therefore displays A despite success.
5. Chat/host sync triggers fresh stopped inspection when relevant view is remounted; reopen can then show B. This explains the reported workaround, but exact navigation/runtime chronology still needs probe confirmation.

Root-cause classification: **Local Implementation Defect / missing post-save read-model refresh**. Existing boundaries can absorb a bounded change. No evidence warrants changing persistence, Team policy, stream protocol or runtime lifecycle. Architectural design must complete the stopped Agent Settings canonical snapshot rather than optimistically relabeling submitted values.

## Structural / Payload Inventory
- Payload: existing root resume config, Agent collaboration DTO execution_tree/closed_task_executions, Team/Org execution trees, existing mutation outcome. UserLaunchSelection carries accepted model/config/selection time. No new wire shape planned.
- Structural delta under consideration: settings draft type, canonical loader/retry and editor row source, delegated Save settlement/error coordination; focused tests/probe.
- Confirmed absent from intended delta: server endpoints, persistence format/readers/writers, runtime/security boundaries, background jobs, shared schema/generated dist, deployment.
- Existing runtime store remains live stream owner. Settings store already owns stopped Team/Org snapshot; Agent stopped read-model completeness is the gap.

## Runtime / Reproduction Status
No app, server, CLI/provider runtime or tests have been started by Solution Designer. No runtime reproduction/pass claimed. Static trace E-02..10 establishes the missing publication path; current tests E-11..12 establish the coverage gap. Implementation must capture pre-fix failing same-view assertion before changing source; API/E2E must independently execute source-current desktop proof after implementation. User screenshots corroborate exposed journey only.

## Data Continuity
Stored subject is the existing per-run collaboration tree and optional per-Agent/Team userLaunchSelection. Existing backend write/readback stays unchanged. No installed user data inspected, edited or copied. Volume not measured/not needed for a format change (none planned). Zero loss/reset acceptable; runtime/provider identities and conversations remain unchanged. Proposed Settings snapshot retains only tree/closure data, not child history. Scope of work per refresh is one selected root, never all saved runs.

## Product / Supplement Inventory
Product design request not stated; Product-owned artifacts N/A.
- User image 1 (context only): `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_5ee10f33-b73e-4373-b646-e87613e9c57b/context/ctx_fe9024fc6544__ctx_5bfbc4d3d847_image.png`
- User image 2 (context only): `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_5ee10f33-b73e-4373-b646-e87613e9c57b/context/ctx_a0382557d7a7__ctx_7f59b12cbf9b_image.png`
Both inspected via view_image 2026-10-13; owner user; BEH-001/SCN-001; no separate approval applies. Prior feature package at task-worktree `tickets/done/delegated-copy-model-change/` is historical evidence, not a current pass/approval substitute. No external Product package.

## Unknowns / Risks / Follow-ups
- U-01: exact runtime reproduction still pending implementation/API-E2E; escalate if canonical API itself is stale or writes fail.
- U-02: preserving stopped/running transition behavior and repeated edits needs tests at canonical load + rendered boundary. Reuse existing request/target guards, no generalized concurrency framework.
- U-03: zero-quota desktop setup: use owned fake runtime/public API-created fixtures and source-current isolated app (potentially connected to owned test node), documenting controlled boundary. Never import user's runs or copy paid runtime transcripts.
- No new out-of-scope product defect confirmed. Prior feature's previously recorded observations are not reopened or adopted as new fixes here. Stale web ARCHITECTURE Python wording is unrelated documentation context, not this ticket's runtime design authority.

## Requirement Implications
REQ-001/002 require authoritative row refresh, not merely Save API success; REQ-003 separates write failure from readback failure and uses read-only recovery; REQ-004 forbids resume side effects or changing defaults; REQ-005 requires current-source isolated desktop proof and cleanup. Approved SR-001 requirements remain unchanged by the architecture findings.
