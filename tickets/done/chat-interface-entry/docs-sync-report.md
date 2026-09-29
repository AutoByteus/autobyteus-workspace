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

## Round 2 Addendum (DR-003, UVF-001 rework)

- Integrated base used: `origin/personal@5d6179797`, merged into the ticket branch as `a1f2a26d2`. The code under review is IR-004 `9d65adf6e`.
- `autobyteus-web/docs/chat.md` § Model labels (added by IR-004): checked against the code. `toChatModelOption` and `matchesModelQuery` are in `composables/chat/useChatModelCatalog.ts`, `existingRunChoiceLabelInput` is in `utils/modelSelectionLabel.ts` (also used by `RuntimeModelConfigFields.vue`), and `compareRecommendedFirstBy` is in `utils/modelSelectionOptions.ts`. The per-runtime label/secondary table matches `getModelSelectionOptionLabel` / `getModelSelectionOptionDescription`. Result: `No change`.
- Delivery's round-1 corrections to `settings.md`, `agent_execution_architecture.md` and `antigravity_cli_runtime.md` are committed in `030bab78d`. The merged upstream edit to `antigravity_cli_runtime.md` merged cleanly with them, and the weak-request exception text is still present.
- O-1 (a raw identifier shows on the trigger until the catalog loads) is transient loading behavior. It is not documented as a contract; the doc describes the steady-state label.
- Result: `Pass`

## Round 3 Addendum (DR-007, after D-16..D-19 / DEC-017a / CR-010)

- Integrated base used: `origin/personal@43b6fc0f4`, merged as `5d8329038` (2 code conflicts resolved; no doc conflicts). Delivery docs commit: `531214f15`.
- In-branch docs, checked against the code:
  - web `chat.md` (Run View D-17, Model labels D-16): accurate. `AgentWorkspaceView` ⚙ calls `center.showConfig()` → `RunConfigPanel`, and ＋ calls `chatDraftStore.startNewChat({ agentDefinitionId, workspaceRootPath })`.
  - `skills.md`, `workspace_layout.md`, `agent_execution_architecture.md` § Existing Run Model Configuration.
  - server `skills.md` (D-19 tiers, import validation, Rule 1 with `workspaceCollisionPolicy`), `agent_orgs.md`, `agent_packages.md`, `agent_execution.md`.
  - The merged docs have no conflict residue and no duplicate headings.
- **Delivery corrections.** Three of delivery's own round-1 edits had gone stale after D-17/D-19:

| Doc | Stale statement | Corrected to |
| --- | --- | --- |
| web `settings.md` § Existing Run Configuration | "Standalone Agent runs have no selected-run Settings panel … footer model/thinking controls" | Existing Agent and Team runs mount `ExistingRunConfigEditor`. For a standalone run, Settings is ⚙ on the Chat run view; a `temp-*` draft mounts `DraftRunConfigEditor` |
| web `settings.md` and `agent_execution_architecture.md` § New Run From Existing Run | "Standalone agent runs … have no workspace header new-run action" | The standalone header ＋ starts a New chat preset to the run's agent and workspace (it does not copy the run); the Team launch-template behavior is unchanged |
| server `antigravity_cli_runtime.md` | "weak/strong request … see `skills.md`, request strength" (a section D-19 renamed) | `workspaceCollisionPolicy` `prefer_workspace` / `fail`, see `skills.md` Rule 1 |

- Removed or replaced concepts recorded: the round-1 "footer model controls on a run" (`chatRunModelControls`) is replaced by ⚙ `ExistingRunConfigEditor` / `DraftRunConfigEditor` (D-17). "Request strength" (`skillRequestStrength`) is replaced by `workspaceCollisionPolicy` (D-19). Both are documented in `chat.md` and server `skills.md`.
- Result: `Pass`
