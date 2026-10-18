# Delivery Integration Blocker — remove-nested-task-team (DR-001)

- Classification: **Local Fix** (implementation; integration conflicts with the latest base). Recommended recipient: `/software_engineering_team/implementation_engineer`.
- Ticket branch `codex/remove-nested-task-team` @ checkpoint `783b96f0d6`. The base it was reviewed and validated on is `db00ba16a9`; `origin/personal` is now `a716a4632e`, 25 commits ahead.
- Delivery checkpoint commit: the two new e2e suites, the harness update and the ticket artifacts were committed locally (not pushed) before integration. A credential scan of those files and of the branch history found 0 matches.
- `git merge origin/personal` stopped with conflicts in 10 files. The merge was aborted, so the branch is unchanged at the checkpoint.

## Conflicts

| File | Upstream cause |
| --- | --- |
| `autobyteus-web/services/agentOrgExecution/agentOrgTeamBranchStatus.ts` (2 hunks) | `d1a66feca9` universal Team status (delegated-team-aggregate-status). It replaced `foldTeamAggregateStatus`/`authority` with `resolveTeamStatus(…, runAlive)` and `isListed` filtering, and recurses into `AgentOrgTaskTeamMember` (nested members). This branch flattens task Teams. |
| `autobyteus-web/components/workspace/history/WorkspaceTeamExecutionTree.vue` (3), `WorkspaceStableExecutionRow.vue` (1), `workspaceHistoryTeamBranchStatus.ts` + its spec | `d1a66feca9` and its merges |
| `autobyteus-web/package.json` | Upstream added `test:e2e:team-status-live` and `test:e2e:nested-team-hierarchy`; this branch removed `test:e2e:nested-team-aggregate-status` |
| `autobyteus-web/tests/e2e/nested-team-aggregate-status-probe.mjs` | Deleted on this branch, modified upstream (`c30bc4fe80` baseline fix) |
| `autobyteus-server-ts/tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` | `0205b9ed79` (baseline fix), `285acae39a` (project-tool-split) |
| `autobyteus-web/components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts` | `ebf5ca614c` (baseline fix) |
| `TESTING.md` | `1c7eb70151` and `7af116e8de`: "fix every failure from its cause, without a base-branch comparison"; they drop the standing exception notes. This branch (`45291d105f`) keeps "Known baseline exception" and adds "Known intermittent e2e … fails sometimes, on the base too". |

## Overlaps Without A Textual Conflict

- Upstream added `autobyteus-web/tests/e2e/nested-team-hierarchy-probe.mjs` with its `fixtures/nested-team-hierarchy.page.vue`. This ticket removes nested task Teams, so that probe has to be judged against the new flat model: kept, adapted or removed.
- `utils/agentOrgHistoryRows.ts` on this branch calls `foldTeamAggregateStatus`/`TeamStatusAuthority`. Upstream kept these exports, but the Team-status callers moved to `resolveTeamStatus`, so check the merged result for one consistent status path.

## TESTING.md Policy Point

The new TESTING.md rule removes base-comparison exception notes. The branch's "Known intermittent e2e" note (FU-1, Task 7e13a4af) and its "both fail the same way on the base" framing contradict it. Choose one when resolving:
- drop the note and keep FU-1 in its Task;
- or reword it to fit the new rule.

If the API/E2E judgement of FU-1 and FU-2 as pre-existing rests on base comparison, the new rule may require re-stating that evidence. That is for API/E2E after the merge.

## What Delivery Needs Back

1. The latest `origin/personal` merged into `codex/remove-nested-task-team`, with the conflicts resolved for the flat-Team model and universal Team status together.
2. Implementation checks on the merged state (web typecheck and specs for the Team-status files; the server e2e that conflicted).
3. Re-validation of the merged behavior through the team's usual route (code review / API-E2E), since Team status behavior changed on both sides.

No docs sync, archive, push or merge to `personal` was done.
