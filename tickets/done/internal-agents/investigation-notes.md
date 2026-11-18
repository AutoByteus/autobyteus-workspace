# Investigation Notes — autobyteus-308 (internal agents)

## Investigation Meta

- Package identifier: `internal-agents`
- Request / ticket: Project Task autobyteus-308 (part of autobyteus-32)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/internal-agents`
- Repository mode: `Git`; branch `codex/internal-agents`
- Resolved base: `origin/personal` at `651071758f17e1ff9ae9bbc23b58af4e58852b16` (fetched 2026-10-25)
- Finalization target: `origin` / `personal`
- Bootstrap: worktree created; `pnpm install --frozen-lockfile --ignore-scripts` ok. Blocker: none.
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md`, `finding-the-cause.md`, `ticket-scope.md`, `architecture-design.md`, `design-principles.md`, `DESIGN.md`, `docs/design-cases.md`, `GLOSSARY.md`, `TESTING.md` (read in this conversation, 2026-10-24/25); the updated `solution-designer` SKILL.md (2026-10-25).
- Task read with `get_project_task` (2026-10-25).
- Earlier input read: the unmerged analysis `/Users/normy/autobyteus-worktrees/internal-agent-frontend-visibility/tickets/in-progress/internal-agent-frontend-visibility/` (Sept 2026; setting `AUTOBYTEUS_SHOW_INTERNAL_AGENTS`; filters in `getVisibleAgentDefinitions`, `listRunHistory`; built-in-registry classification). Taken as input: the setting name and the two filter points; not taken: registry-only classification (this Task uses a definition attribute) and its missing collaboration/peer coverage.

## Source Log (Read)

| ID | Source | Finding | Implication |
| --- | --- | --- | --- |
| C-01 | `agent-definition/providers/agent-definition-config.ts:10-80` | `agent-config.json` is normalized by `normalizeAgentConfigRecord`; saves rebuild via `buildAgentConfigRecord` and `mergeAgentConfigRecord`, which keeps unknown keys of the existing file | Add `internal` to the record, normalize and build; existing saves already keep unknown keys |
| C-02 | `agent-definition/services/agent-definition-service.ts:233-258`; callers: GraphQL `agentDefinitions` (`api/graphql/types/agent-definition.ts:252`), `application-orchestration/services/application-execution-resource-resolver.ts:64` | One "visible" list feeds the Agents page, pickers, mobile and application resources | One filter here |
| C-03 | `agent-collaboration/collaborators/collaborator-candidate-policy.ts:67,120-160,195,205-207`; `collaborator-definition-catalog.ts:15`; `remote-collaboration/inbound/remote-catalog-lister.ts` | `isEligibleAgent` decides eligibility for listing (`listEligible`, `listCandidates`), by-ID mentions and the catalog address map used by `delegate_task` and the peer catalog; built-in agents already excluded | One rule here covers agents and peers |
| C-04 | `run-history/services/agent-run-history-service.ts:68-110`; `workspace-run-history-service.ts:68-90` | Run history groups catalog rows by `agentDefinitionId` | Filter rows of hidden definitions |
| C-05 | `agent-memory/services/agent-memory-explorer-service.ts` | Memory page lists agents with memory per definition | Same filter |
| C-06 | `agent-tools/agent-management/list-agent-definitions.ts:40-50` | Lists `getAllAgentDefinitions()` | Same rule |
| C-07 | `services/server-settings-service.ts:88-210`; `config/task-execution-idle-shutdown-setting.ts` | Settings registered with descriptions; config modules read `appConfigProvider` on each use | `config/show-internal-agents-setting.ts` |
| C-08 | `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue`; `LiveResponseStreamingCard.vue:84,131` | Basics cards update a setting through the server settings store | New toggle card |

## Persisted Data And State Facts

- `agent-config.json`: optional `internal`; absent in every existing file → normal (Directly usable, no migration).
- Server setting: new key, absent → off.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Status |
| --- | --- | --- | --- |
| RSK-001 | Risk | A surface listing agents outside the visible list or the policy is missed | Design lists every consumer; API/E2E checks the pages |
