# Review premise — existing Team/Org native member termination

Not a new product workflow inferred from a test. Authority to be confirmed with Solution Designer against REQ013/AC018/SCN006; technical reachability independently established below. One in-round question, not an inferred Pass or a new durable-history requirement.

## Team
Independent initiating trigger: user uses visible TeamMembersPanel Terminate and confirms, or the workspace-history Team Terminate action, while a native member is compacting.

Forward path: TeamMembersPanel.vue:223–228 -> agentTeamRunStore.terminateActiveTeam -> terminateTeamRun:203–220 -> GraphQL TerminateAgentTeamRun -> team-run-service:211 -> agent-team-run-manager:354 -> managed root.terminate -> configured member termination -> AgentRun/native backend. Existing compaction events travel back through collaboration adapter and strict Team projector to the shared agent status/activity projection.

Material client boundary: successful mutation returns, then disconnectTeamStream removes the listener before member Offline cleanup; no call to standalone agentRunStore.terminateRun. Independent WebSocket delivery can arrive after the success response. SR033 itself already recognizes this cross-channel ordering for standalone. Mapping stopped through the strict DTO does not establish receipt before Team teardown. Failed termination does not invoke this success teardown.

## Org
Independent initiating trigger: user selects workspace-history Org Terminate, a supported stop-and-inspect action while a native direct or Team member compacts.

Forward path: WorkspaceAgentRunsTreePanel.vue:452 -> useWorkspaceHistorySubjectActions command action=stop:38 -> agentOrgContextsStore.stopAndInspect:256 -> retireStream BEFORE agentOrgRunStore.terminate -> GraphQL TerminateAgentOrgRun -> agent-org-run-service.terminate -> manager/root.terminate -> configured member AgentRun/native backend. Successful response -> markHistorical -> readInspection -> stageAgentOrgExecutionContext -> publish/commitActivities then adoptLocalContexts.

Material client boundary: old listener is absent even before native abort. The existing inspection projection uses actual traces (no native compaction-status persistence); commitActivities replaces projection activities at captured content revisions. adoptLocalContexts assigns newly hydrated state to old context objects, not a preservation mechanism for old native compaction phase/card. Thus standalone response reconciliation plus native stream drainage alone is not a complete target path for this root.

## Proportionate review consequence
Ask the owning Solution Designer to confirm native member applicability and specify successful root-command evidence reconciliation/retained same-session card handling at existing root owners, or identify approved exclusion. Do not demand global lifecycle/persistence/ACK infrastructure, infer termination from Offline or disconnection, overwrite known completed/failed facts, reintroduce withdrawn same-ID machinery, or use the API-authored reload string as a durable-history premise.

Current tests7files/85Pass characterize existing paths only; no targeted stopped implementation exists. This source witness, not those tests, establishes the supported controls and reached teardown boundaries.

## Completed review disposition
Solution Designer confirmed REQ013/AC018 includes these existing native-member controls. ARCH-F003 recorded as Medium Design Impact, resolved at design level by independently verified SR034 rules6/8/9 and DS011T/O/013. Both controls remain supported/reachable; correction uses their existing owners plus the existing atomic activity-store boundary, not new persistence or a root lifecycle framework. Latest result ARCH-REV-004 Pass; target implementation/acceptance not claimed.
