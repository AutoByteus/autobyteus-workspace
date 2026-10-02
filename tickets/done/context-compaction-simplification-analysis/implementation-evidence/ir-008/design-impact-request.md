# IR008-DI001 — Agent-root integration requires completed ownership design

**Design Impact / not integration-ready. Large / High unchanged.**
Trigger: Delivery DR002 source-integration Local Fix, not a new user feature request.
Current source, including staged mechanical resolutions, is authoritative. No merge commit.

## Supported basis and scope
Compaction Approved SR033 / Ready SR034 requires held-input recovery/reconnect (BEH005, REQ004/012, AC014/017) and truthful retained native terminal activity (BEH007, REQ013/AC018/SCN006).
Upstream cross-scope-agent-mentions Approved SR008 / Ready SR010, REQ001/003/006/008/011/013 and UC001/004, introduces ordinary standalone Agent-root hosted Agents and Teams, direct child chat, live/saved views, and root-wide explicit Stop. Its REQ014/AC016 preserves sender provenance. See /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/done/cross-scope-agent-mentions/requirements-doc.md and design-spec.md.

A user starting a standalone native run, adding a collaborator with the normal @ composer, messaging/opening it, and later reconnecting or using host Terminate is a **Supported Normal Scenario**. Termination while that child is compacting is the already-approved **Supported Explicit Edge Scenario**. No hidden state edit, same-ID retransmission premise, new provider/default or cold persistence obligation is being proposed.

The pre-integration SR034 design names exactly three frontend command owners and corresponding Team/Org snapshot/hydration paths. Upstream adds a different two-owner lifecycle: AgentRunCollaborationRoot owns children, standalone lifecycle owns host. This is not merely the original explicit conflict list. Implementing a fourth root confirmation/hydration path without updating that ownership map would silently broaden the completed design.

## Findings and evidence

### IR008-LF001 — strict snapshot contract mismatch (executed local defect)
Normal @ admission records a dormant child. AgentRunCollaborationRoot.getAgentStatusSnapshots includes that child, with createCollaborationAgentStatusSnapshot supplying recoverableBlock:null. projectAgentCollaborationView drops recoverableBlock; merged agentOrgAgentStatusDtoSchema requires it. Both AgentCollaborationStreamHandler.connect and GraphQL agentRunCollaboration use that projector.

Evidence-only normative probe against current production projector/strict schema: empty-root control Pass; ordinary dormant collaborator snapshot **Fail**, path root_agent.agent_statuses[0].recoverableBlock, received undefined. Exact log and exit1: agent-root-projector-probe.log/.exit; source agent-root-projector.probe.test.ts. Not an API/full-product execution. Existing stream-handler tests have statuses:[] and passed; that does not close the child case.

This one-field omission is a local mapping defect, not itself a new business decision. It remains unfixed in this partial package so no partial contract work is mistaken for completed integration. It should be corrected alongside the coherent Agent-root snapshot design below.

### IR008-DI001.a — live held-input snapshot / host liveness path absent
AgentRunCollaborationPackageSnapshot and agentRunCollaborationViewDtoSchema have no inputStates/agent_input_states. The new root does not aggregate existing rootAgents/Team input-state snapshots. AgentRunCollaborationContext constructor assigns currentStatus only, ignoring recoverableBlock and input projection. Live events use the generic presentation path (including input-state events); this finding is specifically initial/reconnect view loss, not a claim all live events fail.

Separate ordinary host path: useAgentRunCollaborationSync treats every host Error as not running and calls syncHost(false), which disconnects the child stream and performs one inspection. Approved recoverable compaction Error can leave the host and children managed/live. Existing compaction status code distinguishes recoverableBlock; the new sync owner does not. The design must reconcile actual liveness with recoverable Error without treating a dead host as permission to restore it on inspection. These consequences are **source-derived**, not executed live/reconnect proof.

### IR008-DI001.b — successful Stop evidence never reaches Agent-root child contexts
Forward witness: normal standalone Terminate -> agentRunStore.terminateRun -> GraphQL AgentRunService.terminateAgentRun -> terminateCollaborationRoot -> frozen child scopes -> host termination -> response. The new child lifecycle can publish inactive before host success, and even before a child-finish error is returned. Renderer root stream setActive(false)/onInactive disconnects separately; syncHost later inspects. IR007 agentRunStore confirmation only settles the host context and card. There is no public confirmed-stop entry to agentRunCollaborationStore to correlate and settle all retained child native activities before teardown/inspection.

Required design clarification: which existing boundary captures exact root/member/context/state/service/binding and available instance proof; how actual root success is qualified across child-stream early retirement, host failure and replacement; how successful stop/inspection ordering preserves existing terminal facts. Preserve SR034: no Stopped from generic Offline/disconnect, no root-wide confirmation for rejected/partial result, received actual final events remain valid, no absent-card invention. Do not solve by reaching through private maps or creating another root owner/ledger.

### IR008-DI001.c — new hydration publication bypasses SR034 atomic ordering
agentRunCollaborationStore.publish calls adoptLocalContexts(previous) before commitActivities. Adoption replaces prior published contexts' state/config; an activity revision conflict can then throw after visible context mutation. SR034's Org path deliberately does commit-before-adopt with address validation first. New Agent-root staging also captures expectedRevision after awaited projection retrieval, unlike a before-fetch snapshot; the merged design must specify the consistent revision/ownership boundary rather than silently importing old projection over concurrent live updates. This is source evidence, not an executed atomic-conflict test.

### Local test setup incompatibility, not production failure attribution
Two unchanged implementation-owned root-recovery-command unit cases fail before ingress: new MemberExecutionContext requires teamScoped; old fixture omits it. Production Team and Org builders use teamScoped:true. Preserve the tests' actual held-A/B assertions and adapt only setup on implementation return. No API-owned test modified. Do not count these as recovery-runtime failures or baseline waivers.

## Requested Solution Designer action
Investigate/update the cumulative integration design across the new Agent-root live snapshot, recoverable host liveness, child Stop confirmation and atomic publication owners. Reuse existing boundaries; do not revive retired compaction child/category execution, invent a durable native activity store, or change attempts/defaults/provider scope. Confirm existing approved behavior suffices; obtain renewed approval only if intended behavior actually changes. Route any required architecture review, then return a complete implementation-ready integration map.

## State retained / work remaining
All23 explicit merge conflicts mechanically reconciled, generated contracts regenerated;26 explicit resolution/derived paths staged. HEAD026476691c62bda309ce7f2a9342ebb444959f98; MERGE_HEADd057801c89f26bc69a97331b59631c00519aec98; zero unmerged index entries, merge still in progress. No commit/push/fetch/install/app/provider execution. Full676-path automerge assurance is **not completed**: audit stopped at this material design gap. After design return, finish local fixes, audit, checks and applicable source/API/test-review gates before Delivery builds Electron.
