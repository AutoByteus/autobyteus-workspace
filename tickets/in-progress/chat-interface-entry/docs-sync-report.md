# Docs Sync Report — chat-interface-entry

## Scope

- Ticket: `chat-interface-entry` (`task_size=Large`, `architectural_risk=High`, route `Reviewed`: ARCH-REV-006 → CRR-003 → API-REV-002 → CRR-004)
- Trigger: delivery handoff from `code_reviewer` after CRR-004 Pass (2026-09-29)
- Bootstrap base reference: `origin/personal@fcd3e83a4`
- Integrated base reference used for docs sync: `origin/personal@e6c16d801` (merged into the ticket branch as `7aa53519b`; C-12 test fix `4b440e719`)
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh; `delivery-evidence/`

## Why Docs Were Updated

- Summary: the change makes Chat the default entry and the only center view for standalone agent runs, adds definition-level `skillScope` (`ALL_INSTALLED`), a seeded built-in Daily Assistant, and D-15 skill request strength across runtimes. The implementation already updated the owning docs. Delivery verified them against the integrated code and fixed four stale statements in docs the change did not touch. Those docs still said that a standalone agent run has a Settings run-config editor and a header new-run action, and that every AGY workspace skill collision fails closed.
- Why this should live in long-lived project docs: routing (`/`, `/chat`, `/chat?id=`), the chat draft/launch owners, the footer model-lock contract, `skillScope` semantics, the `seedIfMissing` built-in policy and the request-strength rules are durable behavior that future changes must preserve.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/chat.md` | New Chat surface doc (implementation) | No change | Checked routes, draft store, launch order, route sync, and the footer mode by run id against `pages/chat.vue`, `chatDraftStore`, `chatLaunchService`, `chatRunModelControls.ts` |
| `autobyteus-web/docs/workspace_layout.md` | Shell and right-panel scopes | No change | Implementation update is accurate (`WorkspaceToolShell`, per-scope `useRightPanel`) |
| `autobyteus-web/docs/agent_execution_architecture.md` | Activation marker, selection routing, existing-run config, new-run-from-existing | Updated | Implementation sections accurate; delivery fixed two stale sections (below) |
| `autobyteus-web/docs/agent_management.md` | `skillScope`, Daily Assistant, catalog Run | No change | Accurate |
| `autobyteus-web/docs/skills.md` | Use all installed skills; `/` menu | No change | Accurate |
| `autobyteus-web/docs/settings.md` | Existing Run Configuration; New Run From Existing Run | Updated | Both sections still described standalone Agent behavior that this change removed |
| `autobyteus-web/docs/agent_orgs.md` | Mentions a header gear | No change | The gear is the Org-owned surface (`AgentOrgWorkspaceView`), unchanged by this ticket |
| `autobyteus-web/docs/agent_teams.md`, `remote_access.md`, `agent_integration_minimal_bridge.md` | Team view / new-run wording | No change | Team behavior unchanged; mobile and bridge docs are unaffected |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | `skillScope`, Daily Assistant built-in, `syncPolicy` | No change | Accurate against `built-in-agent-registry.ts` and `models.ts` |
| `autobyteus-server-ts/docs/modules/skills.md` | Installed records, `ALL_INSTALLED`, request strength (D-15) | No change | Accurate against `workspace-skill-materializer.ts`, `skill-request-strength.ts`, AGY materializer |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | AGY skill materialization; also changed by the merged base | Updated | "protected destination collisions ... fail closed" omitted the D-15 weak-request exception |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` § Existing Run Configuration | Correction | `ExistingRunConfigEditor` is for Team runs. A standalone Agent run is edited from the Chat footer through the same `existingRunConfigStore` | `WorkspaceAdaptiveLayout.showSelectedTeamRunConfig` is now Team-only |
| `autobyteus-web/docs/settings.md` § New Run From Existing Run | Correction | The header new-run action applies to team runs. Standalone agents start a new chat from the pencil or the tree `+` | `AgentWorkspaceView.vue` (the `@new-agent` / `@edit-config` header) was removed |
| `autobyteus-web/docs/agent_execution_architecture.md` § Existing Run Model Configuration | Correction | Same Team-only scoping, plus the Chat footer path (model and thinking only, locked while live) | Same as above |
| `autobyteus-web/docs/agent_execution_architecture.md` § New Run From Existing Run | Correction | Same as the `settings.md` counterpart | Same as above |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Clarification | For an `ALL_INSTALLED` (weak) request, a user-owned `<workspace>/.agents/skills/<name>` is skipped with `skipped-workspace-owned`. Configured requests still fail with `AGY_SKILL_NAME_COLLISION` | `agy-configured-skill-materializer.ts` L159–L164 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Chat routing and ownership | `/` → `/chat`; standalone agent runs live only at `/chat?id=`; `/workspace` is Team/Org | design-spec D-01..D-07, D-13 | `autobyteus-web/docs/chat.md`, `workspace_layout.md` |
| Footer model lock | The mode is chosen by run id, not `isLocked`. It is locked while live, and the runtime is fixed once persisted | D-08, CR-002 | `chat.md`, `agent_execution_architecture.md`, `settings.md` |
| Activation-pending marker | Reconcile skips a run whose send is not yet activated; the conditions that end the marker | D-14 (SR-010) | `agent_execution_architecture.md` |
| `skillScope` / `ALL_INSTALLED` | Definition-level scope, resolved only by `SkillService` | D-11 | server `agent_definition.md`, `skills.md`; web `agent_management.md`, `skills.md` |
| Built-in `seedIfMissing` | Daily Assistant user edits persist; overwrite built-ins do not | D-10 / DEC-010 | server `agent_definition.md` |
| Request strength | Weak requests yield to a user-owned entry, another run's holder, and configured requests | D-15 | server `skills.md`, `antigravity_cli_runtime.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `components/workspace/agent/AgentWorkspaceView.vue` (standalone agent center with the header gear and new-agent action) | `ChatRunView.vue` at `/chat?id=<runId>` | `chat.md`; `settings.md` and `agent_execution_architecture.md` (corrected) |
| `stores/runHistoryDraftActions.ts` / `runHistoryStore.createDraftRun` | `chatDraftStore.startNewChat(preset)` + `chatLaunchService` | `chat.md` |
| Selected standalone-agent `RunConfigPanel` / `ExistingRunConfigEditor` mode | Chat footer `chatRunModelControls.ts` (model and thinking only) | `settings.md`, `agent_execution_architecture.md` |
| Daily Assistant as a user/private package agent | Server built-in `autobyteus-daily-assistant` (`seedIfMissing`) | server `agent_definition.md`, web `agent_management.md` |
| `AppLeftPanel.isPlainWorkspaceRoute()` selection routing | `resolveSelectionRoute()` | `agent_execution_architecture.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and user-verification hold
- Notes: `autobyteus-web/generated/graphql.ts` has a hand-applied `skillScope` delta, because full codegen produced unrelated drift. This is recorded in the handoff summary. No doc claims codegen parity.
