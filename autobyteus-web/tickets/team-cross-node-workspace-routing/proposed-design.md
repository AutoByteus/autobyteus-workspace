# Proposed Design

## Version
v1

## Current State (As-Is)
- Team run UI exposes one global workspace selector.
- Remote members were allowed to launch without explicit remote filesystem path.
- Team run payload primarily relied on `workspaceId`; remote execution could fail when host workspace was unusable on remote node.

## Target State (To-Be)
- Embedded members keep using selected host `workspaceId`.
- Remote members require explicit `workspaceRootPath` in member override UI.
- Run action is blocked until all remote members provide workspace path.
- Payload includes both `workspaceId` and `workspaceRootPath` per member.
- Backend runtime resolves workspace by `workspaceId` or `workspaceRootPath` according to node locality.

## Change Inventory
- Add: `components/workspace/config/MemberOverrideItem.vue` remote workspace input behavior.
- Modify: `components/workspace/config/RunConfigPanel.vue` run-gate validation for remote path completeness.
- Modify: `stores/agentTeamRunStore.ts` member payload mapping to include `workspaceRootPath`.
- Modify: `src/api/graphql/types/agent-team-run.ts` normalize/persist `workspaceRootPath`.
- Modify: `src/agent-team-execution/services/agent-team-run-manager.ts` node-local workspace resolution with `ensureWorkspaceByRootPath`.
- Modify: distributed binding snapshots/tests to retain `workspaceRootPath`.

## Responsibilities and Boundaries
- Frontend form layer:
  - collects remote workspace path,
  - validates required inputs before run.
- Frontend run payload layer:
  - computes per-member workspace fields from definition + overrides.
- Backend resolver layer:
  - normalizes input and writes run manifest metadata.
- Backend execution layer:
  - resolves concrete workspace object on the node where member executes.

## Naming Decisions
- Keep `workspaceId`: identifier for known workspace objects on a node.
- Use `workspaceRootPath`: explicit filesystem root path string for node-local materialization.
- No alias names introduced; fields are explicit and non-overlapping.

## Use Case Coverage Matrix
| use_case_id | primary | fallback | error | mapped call stack |
|---|---|---|---|---|
| UC1 | Yes | N/A | Yes | UC1 |
| UC2 | Yes | N/A | Yes | UC2 |
| UC3 | Yes | N/A | N/A | UC3 |
| UC4 | Yes | Yes | Yes | UC4 |
| UC5 | Yes | N/A | N/A | UC5 |

## Risks
- User-provided remote paths may still be invalid on remote node.
- Mixed stale UI state from previously created temp contexts can confuse validation until rerun.
