# Implementation Handoff — autobyteus-308 (internal agents)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review not selected. The direct route applies: Architecture Design Complete with task_size Medium and architectural_risk Low (`handoff-implementation.md`). Downstream: API/E2E validation (the handoff rule for Small or Medium with Low risk).
- Requirements doc: `tickets/in-progress/internal-agents/requirements-doc.md` (SR-001, Approved within the direction, user informed)
- Investigation notes: `tickets/in-progress/internal-agents/investigation-notes.md` (C-01…C-08)
- Solution revision record: `tickets/in-progress/internal-agents/solution-revision-record.md`
- Design spec: `tickets/in-progress/internal-agents/design-spec.md` (SR-001)
- Supplemental task artifacts: none
- Design review report: N/A (direct route)
- Triggering rework report: N/A (initial implementation)

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/internal-agents`, branch `codex/internal-agents`, base `origin/personal` `651071758f`. Code commit: `813f7208d2`. Ticket documents and evidence are committed after it.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Triggering finding IDs: N/A

An agent definition may carry `"internal": true` in `agent-config.json`. The server setting "Show internal agents" (`AUTOBYTEUS_SHOW_INTERNAL_AGENTS`) is off by default and read on every use. One owner, `InternalAgentVisibility`, answers "is this definition hidden now?", meaning internal with the setting off. Five places ask it:
- the visible agent list;
- collaboration eligibility;
- run history;
- the Memory page;
- `list_agent_definitions`.

None of them reads the setting or the attribute itself. A Basics card toggles the setting, and the Agents page badges internal agents "Internal" while they are shown.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section: design-spec § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence:
  - Every change sits in the owners the design lists.
  - There is one new owner file and one new config module.
  - The attribute, the setting and the GraphQL field are additive.
  - The eligibility change narrows the existing rule in its existing owner.
  - No subsystem, persistence format or ownership changed.
  - No surface was found that lists agents or runs outside the listed owners (escalation trigger not hit; one observation under Known Risks).
- Selected route: `API/E2E validation` (direct)
- Lightweight implementation self-review for the direct route: `Done`. I reviewed the full diff against the design's Final File Responsibility Mapping, Dependency Rules and Interface Boundary Mapping. Results:
  - The rule lives in one place (`internal-agent-visibility.ts`); the setting parse lives in one place (`show-internal-agents-setting.ts`).
  - The callers ask the rule through narrow `Pick<>` dependencies.
  - The catalog member `isAgentHidden` is explicit: no silent default, and every test catalog states it.
  - There is no import cycle, because the process rule loads the definition service lazily, like the memory explorer's `PROCESS_AGENT_DEFINITIONS`.
  - A normal agent's saved file gains no key.
  - By-ID reads are untouched.
  - One fix came out of the review: a floating doc comment in `list-agent-definitions.ts` became an inline comment.
- New design impact or escalation trigger: `None`.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, 003, 007; AC-001, 005, 006, 007) | Internal agents left out of the Agents list and every picker while hidden; badge while shown; the attribute survives a save | `agent-config.json` → `normalizeAgentConfigRecord` (`internal: value === true`) → `buildAgentDefinitionFromFiles` / `readApplicationOwnedAgentDefinitionFromSource` → `AgentDefinition.internal` → `AgentDefinitionService.getVisibleAgentDefinitions()` (= `getAgentDefinitionsWithTeamLocal()` minus `visibility.isHidden`) → GraphQL `agentDefinitions` (+ `internal` field) → web store → pickers / `AgentCard.vue` badge. Save: `buildAgentConfigRecord` writes `internal: true` only when set; `mergeAgentConfigRecord` keeps it | Implemented. Application resources derive from the same list (`application-execution-resource-resolver.ts:64`) |
| BEH-002 (REQ-004, 008; AC-002) | Internal agents' runs left out of run history and their memory out of the Memory page while hidden; open by ID still works | `AgentRunHistoryService.listRunHistory` skips rows whose `agentDefinitionId` is in `visibility.hiddenDefinitionIds()` → `listWorkspaceRunHistory` / `getWorkspaceRunHistory`; `AgentMemoryExplorerService.buildGroups` skips runs of hidden definitions | Implemented. Run projection, `agentDefinition(id)`, `getAgentDefinitionById` untouched |
| BEH-003 (REQ-005; AC-003) | Not an eligible collaborator while hidden | `CollaboratorCandidatePolicy.isEligibleAgent` adds `!catalog.isAgentHidden(definition)`; `createCollaboratorDefinitionCatalog({…, visibility})` maps it to `InternalAgentVisibility.isHidden`; the process wiring (`general-process-run-supervisor.ts`) passes `getInternalAgentVisibility()` | Implemented. `list_available_agents`, `@` candidates, `@` by ID (`COLLABORATOR_MENTION_INVALID`), the catalog address map (`catalogDefinitionAt` → null → today's "is not the address of an available agent or agent team" refusal) and `RemoteCatalogLister` all derive from it; no own filter |
| BEH-004 (REQ-006; AC-004) | `list_agent_definitions` leaves them out while hidden | `list-agent-definitions.ts` filters `getAllAgentDefinitions()` with `getInternalAgentVisibility().isHidden` | Implemented. `get_agent_definition` (by ID) untouched |
| BEH-005 (REQ-002; AC-005) | Setting off by default, editable in Settings and by environment variable, effective on the next read | `config/show-internal-agents-setting.ts`: `readShowInternalAgents()` reads `appConfigProvider.config.get` per call (only `"true"`, case- and space-insensitive, means on); `normalizeShowInternalAgentsForPersistence` accepts true/false only; registered in `ServerSettingsService` with a description. Web `ShowInternalAgentsCard.vue` in `ServerSettingsBasicsPanel.vue` saves it, then reloads the agent definitions and run history | Implemented. Rendered on the dev stack (IMP-05) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. No team definitions changed, no UI to mark an agent internal was added, token statistics are untouched, and the built-in exclusion is unchanged.

### Implementation decisions inside the design (for API/E2E and later reviewers)

1. **Two lists in `AgentDefinitionService`.** The old body of `getVisibleAgentDefinitions` (all agents plus team-local ones) is now the public `getAgentDefinitionsWithTeamLocal()`. The visible list is that list minus hidden ones. `InternalAgentVisibility.hiddenDefinitionIds()` reads the full list so run rows of team-local internal agents are found too.
2. **The rule as a catalog member.** `CollaboratorDefinitionCatalog.isAgentHidden(definition)` is how the policy asks the rule (the design's "policy asks `InternalAgentVisibility`"), keeping the policy free of process singletons. Fourteen test catalogs state `isAgentHidden: () => false` explicitly.
3. **Setting parse.** Read: only `true` means on (absent, `false` or anything else means off). Persist: `true`/`false` only, normalized to lower case, otherwise "Show internal agents must be true or false."
4. **Card copy.** The requirement's one sentence is split into the card description ("Internal agents are the system's own helpers, such as the Model Router.") and the row explanation ("Show them in the Agents list, pickers and history, for debugging. While off, they are also not offered to other agents or peer nodes."). The added clause tells the user that the toggle also governs collaboration (REQ-005). zh-CN translated.
5. **After a toggle the card refreshes** with `Promise.allSettled([reloadAllAgentDefinitions(), refreshTreeQuietly()])`. A failed refresh does not fail the save; a failed save reverts the switch and shows the error.

## Key Files Or Areas

- New:
  - `autobyteus-server-ts/src/agent-definition/services/internal-agent-visibility.ts`
  - `autobyteus-server-ts/src/config/show-internal-agents-setting.ts`
  - `autobyteus-web/components/settings/ShowInternalAgentsCard.vue`
  - tests `tests/unit/agent-definition/internal-agents.test.ts`, `tests/unit/agent-collaboration/collaborators/internal-agent-eligibility.test.ts`, `components/settings/__tests__/ShowInternalAgentsCard.spec.ts`
- Changed (server):
  - `agent-definition/domain/models.ts`
  - `providers/agent-definition-config.ts`, `agent-definition-node-reader.ts`, `application-owned-agent-source.ts`
  - `services/agent-definition-service.ts`
  - GraphQL `types/agent-definition.ts` and `converters/agent-definition-converter.ts`
  - `services/server-settings-service.ts`
  - `agent-collaboration/collaborators/collaborator-candidate-policy.ts` and `collaborator-definition-catalog.ts`
  - `agent-execution/runtime/general-process-run-supervisor.ts`
  - `run-history/services/agent-run-history-service.ts`
  - `agent-memory/services/agent-memory-explorer-service.ts`
  - `agent-tools/agent-management/list-agent-definitions.ts`
- Changed (web):
  - `components/agents/AgentCard.vue`
  - `components/settings/ServerSettingsBasicsPanel.vue`
  - `graphql/queries/agentDefinitionQueries.ts`
  - `stores/agentDefinitionStore.ts`
  - i18n en + zh-CN `agents.ts`, `settings.ts`
- Tests extended:
  - `server-settings-service.test.ts`
  - `agent-run-history-service.test.ts`
  - `agent-memory-explorer-service.test.ts`
  - `list-agent-definitions.test.ts`
  - `AgentCard.spec.ts`
  - 14 test catalogs (`isAgentHidden`)
  - `package-auto-refresh.integration.test.ts` (`visibility`)
- Docs:
  - `autobyteus-server-ts/docs/modules/agent_definition.md` § Internal Agents
  - `autobyteus-web/docs/settings.md` § Server Settings: Internal Agents
  - `GLOSSARY.md` § Agent Definitions ("Internal agent")

## Important Assumptions

- The future Model Router (autobyteus-32) is a built-in with a fixed ID. Its local runs are hidden from the Memory page, including a memory-sync imported view, by the same rule, as the design intends.
- Cost: while the setting is off, each run-history and Memory-page list also reads the full definition list (`getAgentDefinitionsWithTeamLocal()`, the same read the Agents page does) to learn the hidden IDs. While the setting is on, nothing extra is read. I did not measure it; the dev stack's lists stayed responsive.

## Known Risks

- **Application bound to a shared internal agent (observation, not a change).** `ApplicationExecutionResourceResolver.resolveExecutionResource` resolves through `listAvailableExecutionResources` → `getVisibleAgentDefinitions()`. While the setting is off, an application whose resource is a *shared* internal agent would therefore not resolve at launch, not only be hidden in the picker.
  - No application references an internal agent today, and applications own their agents (application-owned definitions come from the same list).
  - I kept the design's single rule. The designer and API/E2E should note this if autobyteus-32 binds an application to the Model Router.
- RSK-001 (design): a browsing surface outside the listed owners. The traced callers of `getVisibleAgentDefinitions` are GraphQL `agentDefinitions` and the application resolver. Every collaboration surface goes through `isEligibleAgent`.
- Internal agents are hidden, not protected: by-ID access works (non-goal).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No` refactor needed. The only restructure is the visible-list split into two named lists inside the same service.
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as Design Impact: `N/A`
- Evidence: IMP-01…IMP-05.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (an absent attribute or setting has its truthful meaning: a normal agent, off).
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (none created; nothing became unused)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`. The rule's consumers take `Pick<InternalAgentVisibility, "isHidden">` or `"hiddenDefinitionIds"` only.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. The largest touched is `agent-definition-service.ts`, with +15 lines.

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration`. Implementation follows it: `Yes`. A normal agent's `agent-config.json` is written exactly as before (no `internal` key), as the test shows. An unset setting is off.

## Environment Or Dependency Notes

- No dependency or lockfile change.
- The fresh worktree needed `pnpm -C autobyteus-ts build`, `pnpm -C autobyteus-server-ts prebuild` and `pnpm -C autobyteus-server-ts test:integration:prepare` before typecheck and integration tests.
- The untracked build outputs (`autobyteus-application-*/dist`) are not committed.

## Checks Run

Evidence: `tickets/in-progress/internal-agents/evidence/implementation/`. Environment: macOS (darwin 25.5), Node v22, this worktree.

All checks ran on the tree committed as `813f7208d2`. One exception: IMP-01's unit run started before the self-review moved one comment in `list-agent-definitions.ts`, a comment-only change. IMP-03 includes that file's tests after the move.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-server-ts test:unit` | 813f7208d2 (see note) | local | all server | AC-007 (existing behavior unchanged) | Pass | `IMP-01-server-typecheck-unit.log` | `typecheck exit 0`; `Test Files  836 passed \| 4 skipped (840)`, `Tests  6967 passed \| 7 skipped (6974)` |
| IMP-02 | `test:integration:prepare`, then `vitest run` on the 7 integration files that build the changed catalog or service (package auto-refresh, task-delegation lifecycle, standalone root suites, brief-studio imported package, batch mapping) | 813f7208d2 | local | real catalogs and services | AC-007 | Pass | `IMP-02-server-integration.log` | `Test Files  7 passed (7)`, `Tests  55 passed (55)` |
| IMP-03 | focused server tests, verbose: internal-agents, internal-agent-eligibility, server settings, run history, memory explorer, `list_agent_definitions` | 813f7208d2 | local | attribute, setting, rule, every consumer | AC-001…006 | Pass | `IMP-03-server-focused.log` | `Tests  73 passed (73)`; "while hidden: not listed, not an `@` candidate, `@` by ID fails, no catalog address to delegate to, not offered to peers"; "once shown (no restart)…"; "saving an internal agent keeps "internal": true" |
| IMP-04 | web `vitest run` (ShowInternalAgentsCard, AgentCard, `components/settings/__tests__`) + `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | 813f7208d2 | jsdom | card, badge, settings panel | AC-005 (UI) | Pass | `IMP-04-web-tests-guards.log` | `Test Files  35 passed (35)`, `Tests  205 passed (205)`; three guard `exit 0` |
| IMP-05 | `pnpm dev` with a synthesized internal agent; GraphQL + rendered Agents page + Basics card; toggle on, then off client-side | 813f7208d2 | dev stack | whole path, server to page | AC-001, AC-005, REQ-008 | Pass | `IMP-05-rendered-dev-stack.md`, `IMP-05a/b/c-*.png` | 119 agents without the probe; by-ID open works; setting saved `"true"`; badge "Internal"; after toggling off without a reload the probe is gone |

- Not run, and why:
  - delegation, `@` and `list_available_agents` through a live agent run, and a real peer node: covered by the unit tests over the real policy, catalog and `RemoteCatalogLister`; live runs are API/E2E's;
  - the run history and Memory page with real recorded runs of an internal agent: unit-tested with synthesized rows; no runs on the dev stack;
  - the full server `test:integration` and the E2E suites (only the integration files that touch the change ran);
  - the mobile apps (same GraphQL list);
  - an isolated desktop instance;
  - a clean-clone proof (the Task asks for it; it belongs to validation and delivery).

## Frontend Rendered-Result Check

- Affected: Settings → Server Settings → Basics (new "Internal agents" card) and the Agents page (an "Internal" badge on internal agents while shown).
- Checked on the dev stack (IMP-05):
  - The card renders after "Live response streaming" in the Basics card style. The title, description and explanation read correctly, and the switch reflects the saved value.
  - Toggling saves without error.
  - The badge is a small amber pill in the card's badge row (screenshot IMP-05c).
  - Client-side navigation after toggling off shows the refreshed list.
- Verified only at the browser tab's narrow width (~450 px CSS); the text wraps beside the switch. Not checked: wide layout, dark theme, zh-CN rendering (the strings are in the catalog, and the localization guards pass).

## Downstream Coverage Hints / Suggested Scenarios

- AC-002 end to end: run a synthesized internal agent once, so that a real run exists. With the setting off, check that the run is absent from workspace run history and the Memory page, and that it still opens by run ID. Then turn the setting on and check that both lists show it.
- AC-003 live:
  - from a running agent, `list_available_agents` leaves the agent out;
  - `delegate_task` to its address is refused with "is not the address of an available agent or agent team";
  - an `@` mention fails as unavailable;
  - a peer node's available-agents answer leaves it out.

  Then turn the setting on without a restart and check that all four work.
- AC-004: `list_agent_definitions` from an agent, with the setting off and then on.
- Environment variable path: start with `AUTOBYTEUS_SHOW_INTERNAL_AGENTS=true` and check that the agent is shown without any Settings change.
- Pickers: new-run, team member, Org placement, featured items and application resource pickers leave the agent out while hidden.
- The application resolver observation (Known Risks), if a scenario needs it.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. None of IMP-* is API/E2E sign-off. The scenarios above, plus the Task's clean-clone proof.
