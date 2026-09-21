# Restart / Resume Analysis — AORG-FOLLOWUP-20260914-001

## Result and authority
Source analysis complete; high-confidence causal explanation of the reported symptom, not a live reproduction or an implementation-ready design. SR-001, requirements Draft. User cancelled the API/E2E message before it was sent and requested analysis of Org restart/continuation. No specialist contacted, tests run, source edited, server restarted, or live data changed.

## Request / supported scenario
SCN-001: website remains open, server restarts, user focuses a retained offline Agent in an existing AgentOrg and sends a message. User observes every Org Agent becoming green. Desired outcome stated by user: activate agents when they receive work, rather than activate all when resuming one. SCN-002: another member subsequently receives a real peer/human message and can activate normally. This second scenario preserves the user's work-driven principle, not a new all-to-all communication policy.

## Exact basis
- Task workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up
- Task branch: codex/flat-agent-organization-model-follow-up
- Source: 72dee5ad2c2e332272a0c00eb36af1a036bd69fb, from origin/requirements/flat-agent-organization-model.
- Comparison: origin/personal freshly fetched successfully at 5645b49d6f51faa60bd3545bc8e3f0e7e3f96793. Compared read-only with git show; did not switch or merge.
- Provisional finalization target remains requested requirements branch; no finalization authority exercised.

## Findings
### INV-R01 — sending to a retained Agent first restores the whole Org scope
`autobyteus-web/stores/agentOrgContextsStore.ts:181-203` calls restore(id), reconnects/awaits the stream, then sends the exact prepared member message. `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-manager.ts:91-105,186-208` loads the retained package and materializes it in restore mode. The message is not broadcast to every Agent; the root restoration preceding delivery causes the eager preparation.

### INV-R02 — restore activates all configured members, unlike fresh launch
`autobyteus-server-ts/src/agent-org-execution/services/agent-org-execution-scope-builder.ts:119-139` iterates every direct Agent and mounted Team.
- Direct Agent: `agent-org-root-agent-execution-registry.ts:55-71` skips configured activation only when mode === fresh. Restore always prepares the Agent, then commits it.
- Mounted Team: `agent-org-team-execution-directory.ts:55` sets prepareConfiguredAgents to activationMode !== fresh. `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-factory.ts:95-106` invokes activation; `flat-team-execution-manager.ts:85-87` iterates all configured Agents.
- Shared `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-activation-planner.ts:61-116` chooses new vs restored runtime based on conversation activity/binding. No history means prepare a NEW run, not leave it Offline. Having never received a message does not exempt a member from the Org restore loop.
- Shared `configured-agent-execution-handle.ts:150-177` prepares runtime candidates and publishes/binds each AgentRun. `agent-execution/services/agent-run-manager.ts:321-360` calls the backend create/restore factory and publishes through the activation registry. This is actual backend materialization/publication, not just Org availability or painting every row green.

### INV-R03 — green means Idle, not actively reasoning
`agent-org-agent-status-snapshot-projector.ts:13-28` (same Org services directory) reads actual direct and mounted-Team handle status. Shared handle `configured-agent-execution-handle.ts:105-106` uses the run status or Offline when no run exists. `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts:71-76` applies exact per-Agent statuses from the view; `autobyteus-web/utils/workspaceStatusDotPresentation.ts:11-22` maps idle to green, running to blue, offline to gray. Thus successful eager preparation can show all Agents green/Idle without all doing model inference. Provider resource/cost effects have not been measured; no claim that every Agent gets a prompt or incurs generation charges.

### INV-R04 — older nested-Team implementation is lazy on restore
At refreshed origin/personal, `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts:97-134` restores a manager/context with restore mode, not a loop preparing every worker. `mixed-team-manager.ts:47-111` constructs registries and projects missing handles as Offline (including configured nested-Team descendants). `members/mixed-configured-member-registry.ts:50-83` creates handles on demand; `members/mixed-agent-member-handle.ts:88-97,221-250` readies/publishes a runtime when member work requests it. This supports the user's comparison at source level. No historical runtime replay performed.

### INV-R05 — prior fix deliberately addressed fresh launch only
Commit 5710fdd5347bb1b3c464775dd9e32470c88a2ef5 introduced the fresh-only conditions above. `tickets/done/collaboration-follow-up-fixes/design-spec.md:37-44` explicitly retains eager restore preparation, and its requirements exclude changing existing Restore policy. This is a lifecycle coverage/scope gap relative to the newly requested behavior, not evidence that the implementation disobeyed its prior fresh-launch design.
`autobyteus-server-ts/tests/unit/agent-org-execution/agent-org-execution-scope-builder.test.ts` even expects preparation/publication of a no-conversation member while restoring an Org. Read-only test inspection; not executed and not an end-to-end reproduction.

## Conclusion and requirements implication
Restoring the collaboration scope is coupled to activating every configured runtime. Fresh creation already separates those concepts, but restore does not. User's expected work-driven lifecycle is consistent with the compared original implementation. Proposed intended outcome: restore the full Org identity/history/routing scope while leaving configured members Offline until actual work requires activation; preserve exact retained conversation/provider identity and failure-closed continuation safety. This is not solved by hiding Idle status as gray.

No target design approved. Retained history/binding durability and task lifecycle need analysis before changing restore preparation; replacing restore mode with fresh would risk incorrect conversation semantics. Standalone flat Team restore uses a similar eager switch (`agent-team-execution/services/team-root-materializer.ts:100`), recorded as adjacent evidence, not silently added to this Org-focused scope.

## Limits and next action
No user's live server identity/runtime kind/logs were inspected. Source explains the observation strongly, but exact deployed revision and live provider effects remain unverified. No executable API/E2E requested now. Present explanation to user; if correction is requested, confirm narrow intended behavior and its preserved outcomes, obtain explicit approval, then architecture design. Historical completed artifacts remain unchanged, with no retroactive failure or new delivery-receipt verification.

## Artifact inventory
- /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/restart-resume-analysis.md (this full result)
- Original bootstrap receipt and both source done-ticket packages remain relevant historical context.
- Design/review/implementation/validation for this new round: N/A — not applicable.

## Routing
Current handoff-rule lookup completed: no rule matches; return analysis directly to user, no specialist contacted. Analysis only / requirements conversation; not Architecture Design Complete, Product Design Requested or delivery receipt correction.

## SR-005 / INV-R06 — Standalone Team parity and approved scope
User explicitly approves SR-004 Org correction (“Yeah, I approve.”) and conditionally directs the same fix for AgentTeam if inspection confirms it (“if it has, we should also fix that”). Source inspection confirms the condition.

| Lifecycle | Standalone Team | AgentOrg |
| --- | --- | --- |
| Fresh configured launch before work | unused configured members deferred | unused direct and mounted-Team Agents deferred |
| Restore / continuation after server restart | every configured member prepared eagerly | every configured member prepared eagerly |

Exact Team path:
1. `autobyteus-web/stores/agentTeamRunStore.ts:251-264`: sending to focused member of inactive retained Team calls RestoreAgentTeamRun, then rehydrates the same root/member before message submission.
2. `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:146-155` creates in fresh mode; lines 163–188 load retained state and materialize in restore mode.
3. `autobyteus-server-ts/src/agent-team-execution/services/team-root-materializer.ts:92-101` passes `prepareConfiguredAgents: input.mode !== "fresh"` to the same FlatTeamExecutionFactory used for Org-mounted Teams.
4. `local/flat-team-execution-factory.ts:95-106` invokes configured activation when that flag is true; `local/flat-team-execution-manager.ts:85-87` loops every configured member.
Thus Team restore shares the same backend cause, not only a similar UI symptom. Fresh creation of definitions is distinct from execution; the inspected fresh configured execution paths do not eagerly prepare unused workers. Tasks already assigned real work remain a separate preserved lifecycle.

Current outcome: requirements Approved for Org and Team work-driven continuation, with fresh behavior preserved. User-authorized conditional extension satisfied; no naming/interface cleanup. No live reproduction, tests, or implementation claimed. Prior source/ref/workspace/package and evidence limits above remain; this addendum supersedes earlier Org-only scope/approval holds. Design remains pending and no forward-ready classification is asserted. API/E2E has not been contacted.

SR-005 handoff-rule lookup: no matching rule for completed Team-parity investigation and approval capture. Return findings directly to user; architecture investigation/design remains next. No specialist contacted.

## SR-006 / INV-R07 — Why origin/personal differed
Current source lineage is pinned in the canonical investigation notes: 37d05c7f7 introduces unconditional eager member preparation in both Team materialization and Org direct-member construction; 5710fdd53 fixes fresh configured activation but retains eager restore. Original-personal on-demand member activation was therefore not preserved across the refactor's restore path. Flat membership and mixed-runtime composition do not require this lifecycle change.

This is a source-policy regression finding, not a live historical bisect. No claim that the naming change itself caused the issue, or that a particular person made a mistake. Binding-before-publication durability still needs preservation when correcting activation timing. Requirements remain approved at SR-005; SR-006 is evidence-only and changes no behavior/AC scope. Current workspace/base/package, artifact inventory and validation limits above remain authoritative. Current routing lookup complete: no matching rule; return evidence update to user. No design-complete or delivery-complete result.

## SR-009 / F-001 recovery integration correction
Original eager configured restoration is implemented as lazy in IR-001. API-REV-001/CRR-003 exposes separate pre-existing Org inactive reconnect failure before first input: live-only checkpoint prevents publishing retained inactive context; header remains Idle. AINV-007–011 in canonical investigation and DS-REV-002 define inspection-first disconnected recovery and bounded history-triggered reconciliation. Team check: successful history already reconciles retained contexts, and supplied worker restart headers are Offline; no same F-001 Team defect established, but RET-07/full B02 validation remains. Approved SR-005 intent unchanged; no new provider policy or naming work.

## SR-010 qualification — task hydration and actual Team liveness
F-001 is resolved in actual API-REV-002. F-002/CRR-005 is a distinct first-task inspection semantic authority defect, not Agent-owned status or lazy activation regression. See canonical AINV-012–015 and DS-REV-003. Local Aug30 personal differs from Sep11 reference; reviewer personal-task-approval-comparison.md records chronology without asserting past user settings. API-R2 Team root may correctly be Active after scope-only stream restoration (TeamRunService202–206), with member providers Offline; earlier active-only Team admission wording was incomplete. No container policy change; preserve separation of scope and member readiness.
