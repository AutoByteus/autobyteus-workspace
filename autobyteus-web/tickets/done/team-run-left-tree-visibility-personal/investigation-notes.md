# Investigation Notes

## Stage

- Understanding Pass: `Completed`
- Last Updated: `2026-02-20`

## Sources Consulted

- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/components/AppLeftPanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/runHistoryStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/agentTeamContextsStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/agentTeamRunStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- `enterprise:/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `enterprise:/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/runTreeStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/run-history.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/agent-team-instance.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/tests/e2e/run-history/run-history-graphql.e2e.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/tickets/in-progress/team-run-left-tree-visibility-personal/future-state-runtime-call-stack.md`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/tickets/in-progress/team-run-left-tree-visibility-personal/future-state-runtime-call-stack-review.md`
- `enterprise:/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/agent-team-instance.ts`
- `enterprise:/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`
- `enterprise:/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/team-run-history.ts`

## Key Findings

1. Repro behavior is valid
- After `Run Team`, team context exists and workspace/team view opens.
- Left panel workspace tree does not show any team row.

2. Personal frontend root cause (primary)
- Left panel uses `WorkspaceAgentRunsTreePanel`.
- `WorkspaceAgentRunsTreePanel` consumes `runHistoryStore.getTreeNodes()`.
- `runHistoryStore.getTreeNodes()` projects only agent run rows (`workspace -> agents -> runs`); it does not include team contexts.
- Result: team exists in memory (`agentTeamContextsStore`) but is never rendered in the left workspace tree.

3. Personal backend capability gap (secondary)
- Personal server run-history GraphQL exposes agent-run history only (`listRunHistory`, `getRunResumeConfig`, etc.).
- No team-run history GraphQL in personal (`listTeamRunHistory`, `getTeamRunResumeConfig`, `deleteTeamRunHistory` absent).
- Therefore persisted/historical team rows cannot be sourced from backend in personal branch.

4. Enterprise comparison
- Enterprise frontend uses `runTreeStore` + `WorkspaceAgentRunsTreePanel` with both workspace nodes and team nodes (`getTreeNodes()` + `getTeamNodes()`).
- Enterprise backend has dedicated team-run history GraphQL resolver/types.
- So enterprise already solved this with both frontend and backend support.

5. Scope decision for personal
- Immediate UX requirement (team should appear under workspace right after run) can be solved on frontend by projecting live team contexts by workspace root path.
- Full historical parity with enterprise requires backend team-run history APIs and storage model.

6. Backend regression check for this bug path
- Personal backend still exposes team lifecycle/message mutations through `AgentTeamInstanceResolver` (`sendMessageToTeam`, `createAgentTeamInstance`, `terminateAgentTeamInstance`).
- Personal backend tests run in this pass:
  - `pnpm test tests/integration/agent-team-execution/agent-team-instance-manager.integration.test.ts` -> passed.
  - `pnpm test tests/e2e/run-history/run-history-graphql.e2e.test.ts` -> passed.
- These results do not indicate a backend regression specifically causing "team does not appear in left tree after Run".

7. Deep review gate result
- Built future-state call stacks for `UC-001..UC-007` across frontend and backend.
- Round-1 deep review found requirement gaps (persisted team-member auto-open behavior, canonical team workspace grouping, delete policy clarity), then required write-backs were applied to requirements/design/call-stack (`v2`).
- Rounds 2 and 3 were clean; review gate reached `Go Confirmed` with two consecutive clean rounds.

8. Additional deep review round + offline continuation expectation
- User added explicit requirement: persisted/offline team member selection must load history and allow continued member-targeted messaging.
- Enterprise reference confirms this through continuation flow in `sendMessageToTeam` (`teamRunContinuationService.continueTeamRun(...)`).
- Design and call-stack were updated to include this as `UC-008` and reviewed in round 4 (clean pass).

## Conclusion

- This issue is **not frontend-only in absolute terms**:
  - Immediate missing-left-row symptom: frontend projection issue.
  - Historical team-run persistence/listing parity: backend also missing in personal.

- For your stated personal constraint (single shared workspace per team run), frontend live projection is sufficient to satisfy "appear on left under workspace after Run".

## Reopened Investigation (2026-02-21)

### Trigger

- After branch/worktree reconciliation, two regressions were reported in personal web:
  1. Terminated team row disappeared from workspace tree unexpectedly.
  2. Selecting a persisted/offline team member showed empty/fresh context instead of restored history.

### Findings

1. `WorkspaceAgentRunsTreePanel` currently renders team rows from `agentTeamContextsStore.allTeamInstances` only.
- Consequence: any team that is not currently hydrated in memory is invisible, even if persisted in server run-history.
- This directly breaks post-terminate/persisted visibility expectations.

2. Team member selection path (`onSelectTeamMember`) only calls `setFocusedMember(...)` on local team context.
- For persisted/offline runs where no local team context exists, this does not load projection/resume config.
- Consequence: send/continue starts from incomplete runtime context and member history is not restored.

3. Regression source is frontend composition drift, not backend API absence.
- Personal server already exposes `listTeamRunHistory`, `getTeamRunResumeConfig`, and `getTeamMemberRunProjection`.
- Current web branch lacks corresponding store/query integration despite server support.

### Required Remediation

- Reintroduce persisted team history fetch into `runHistoryStore.fetchTree(...)`.
- Add store-level team projection API:
  - `getTeamNodes(...)` (persisted + live merge),
  - `openTeamMemberRun(teamId, memberRouteKey)`,
  - `selectTreeRun(...)` union handling for team member rows.
- Update workspace tree panel to consume store-provided team nodes and route member selection through the store open flow.
- Add regression tests for:
  - persisted team visibility after terminate/reload path,
  - team-member history restoration before continuation send.

### Resolution Update (2026-02-21)

- Implemented remediation in:
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/graphql/queries/runHistoryQueries.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/graphql/mutations/runHistoryMutations.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/runHistoryStore.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
  - `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/services/runOpen/runOpenCoordinator.ts`
- Regression tests added/updated and passing:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web exec vitest --run stores/__tests__/runHistoryStore.spec.ts` (`19 passed`)
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web exec vitest --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` (`19 passed`)

## Follow-up Investigation (2026-02-21)

### Question

- Is `hostNodeId` needed in personal run-history payloads and frontend tree rendering?

### Findings

1. `hostNodeId` is not used by personal frontend behavior.
- Personal left tree rendering uses workspace root path + member ids/route keys only.
- Personal run open/continue path does not branch on host node id.

2. `hostNodeId` entered personal history via enterprise checkpoint lineage.
- Server introduction observed in `1a8d75d` (`feat: checkpoint team history restore and distributed runtime fixes`).
- Web pass-through appeared when restoring enterprise-style run-tree pieces into personal (`266255bb` lineage, then personal restore commit `aa9962b1`).

3. In personal server code, this field was always written as `null`.
- No personal runtime placement logic consumed it.
- Keeping it created conceptual drift from personal single-node constraints.

### Action

- Removed `hostNodeId` from personal run-history domain, GraphQL contract, manifest normalization, frontend query/store types, and related tests.
- Revalidated targeted backend/frontend suites after removal.

## Follow-up Investigation (2026-02-21, team delete control regression)

### Trigger

- User reported: after terminating a team in personal workspace tree, no trash/delete control appears on the team row.

### Additional Sources Consulted

- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
- `enterprise:/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/components/workspace/history/TeamRunsSection.vue`
- `enterprise:/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/composables/workspace/history/useRunTreeActions.ts`

### Findings

1. UI gap confirmed in personal panel
- Team row actions only rendered terminate (`stop`) for active teams.
- No inactive-team delete action was rendered, despite `runHistoryStore.deleteTeamRun(...)` already existing.

2. Enterprise reference confirms intended behavior
- Enterprise `TeamRunsSection` renders a delete trash button for inactive teams and routes to `requestDeleteTeam -> confirmDelete -> deleteTeamRun`.

3. Requirement/design mismatch was implementation-only
- Existing requirements already covered UC-007 (inactive team history delete).
- Regression was missing UI wiring, not a backend contract gap.

### Resolution

- Restored inactive-team delete action in personal `WorkspaceAgentRunsTreePanel`:
  - render trash icon when team cannot be terminated and `deleteLifecycle === READY`,
  - route through existing confirmation modal,
  - call `runHistoryStore.deleteTeamRun(teamId)`,
  - preserve `.stop` behavior so delete click does not select/toggle team row.
- Extended panel tests for:
  - inactive team delete button visibility,
  - confirmed delete invokes `deleteTeamRun` without changing selection.

### Verification

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web exec vitest --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` -> `21 passed`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web exec vitest --run stores/__tests__/runHistoryStore.spec.ts` -> `19 passed`

## Re-investigation (2026-02-21, offline continue shows no professor response)

### Trigger

- User report: after terminating team runtime, opening a new tab, selecting offline `professor`, and sending a new message, no visible reply arrives in UI.

### Sources Consulted

- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/stores/agentTeamRunStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/stores/runHistoryStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/api/graphql/types/agent-team-instance.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/personal/autobyteus-server-ts/tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`
- Runtime state under `/tmp/autobyteus-personal-server-runtime/memory/`

### Findings

1. Backend continuation path succeeds for offline team sends.
- `sendMessageToTeam(teamId=existing)` branches to `TeamRunContinuationService.continueTeamRun(...)` when runtime is missing.
- Existing server e2e already verifies terminate -> continue -> projection contains restored history.

2. Runtime trace evidence showed server-side processing without backend failure.
- Persisted traces in `/tmp/autobyteus-personal-server-runtime/memory/agents/<member>/raw_traces.jsonl` included resumed user input and assistant completion entries.
- No corresponding backend error surfaced in current server output for this path.

3. Frontend gap caused the observed “no response” UX.
- In `agentTeamRunStore.sendMessageToFocusedMember(...)`, existing-team send (`teamId` non-temp) did not reconnect team websocket stream after successful continuation.
- Result: backend continues and processes, but UI remains unsubscribed (`Offline`), so streamed assistant updates are not rendered.

4. Why tests did not catch it.
- Backend tests cover continuation correctness (mutation + restored projection), not frontend stream re-subscription after continuation.
- Frontend `agentTeamRunStore` tests previously covered stream connect and terminate only; no test for offline persisted team send -> reconnect.

### Implications

- This regression is frontend orchestration, not GraphQL continuation correctness.
- Required fix is in web store send flow plus regression coverage in web store tests.

### Enterprise test visibility check (no checkout)

- Verified we can inspect enterprise tests directly from current personal worktree repo using remote refs:
  - `git show origin/enterprise:tests/e2e/run-history/team-run-restore-lifecycle-graphql.e2e.test.ts`
  - `git show origin/enterprise:tests/e2e/run-history/team-member-projection-contract.e2e.test.ts`
- Observation: those enterprise files are useful contract coverage but include mocked manager/ingress seams; they are not the strongest "no-mock runtime" proof for continuation behavior.
- Action taken in personal instead: strengthened existing real runtime E2E (non-mocked continuation flow) with a multi-member terminate/continue targeted-member scenario.
