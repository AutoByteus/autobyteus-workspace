# Original personal versus current Team/Org stop — ACTIVITY-RETAIN-20260914-001
Evidence-only SR-002, not an authoritative architecture design. User requests end-to-end comparison to understand why paths differ and improve the eventual design.

## Source pins / method
Current new ticket base c208f33dcc3a8a56563a2f132f3de65862e68cab, refreshed origin/personal5645b49d6f51faa60bd3545bc8e3f0e7e3f96793; Aug30d1a399a5919cf9b6040050d5699caeb0cd1e6633 checked too. git show/diff/grep/log only, no original runtime reproduction. Worktree is retain-activity-after-termination. Requirements-doc SR-001 remains Ready for Approval; no automatic transfer of previous ticket approval.

## Compared ordinary UI path
| Stage | Personal nested Team | Current flat Team | Current Org |
|---|---|---|---|
| Entry | Workspace history terminate wrapper → Team run store | Same Team owner | Org context stopAndInspect → Org run command store |
| Confirm stop | Successful backend terminate result | Same | Successful backend terminate result; retire obsolete stream and invalidate competing work |
| Runtime/presentation | Retain contexts, mark Offline, explicitly delete Activity store entries | Identical stop body | Keep retained contexts historical/Offline, then inspect |
| Post-stop read | Sidebar history refresh and inactive-root status reconciliation, not Activity reload | Same | Strict inspection stages projections/Activity and publishes through retained context owner |
| Later Send | Restore, hydrate, commit Activity, addressed send | Same with additional submission safeguards | Deliberate continuation through existing readiness/submission owner |

Key personal sources: autobyteus-web/composables/useWorkspaceHistoryMutations.ts:onTerminateTeam; stores/agentTeamRunStore.ts:200–218,250–263; stores/runHistoryLoadActions.ts:reconcileDiscoveredActiveRuns; stores/agentTeamContextsStore.ts:activeTeamContext; components/progress/ActivityFeed.vue:activities. Current Org: stores/agentOrgContextsStore.ts:stopAndInspect/readInspection/publish; services/agentOrgExecution/agentOrgContextHydration.ts:stageAgentOrgExecutionContext.

## Why this happened
The Team stop implementation was retained from personal; source diff shows no stop-body change during the current flat-Org transition. The deletion predates it: Aug11 57ab99fcc reformatted already-existing cleanup; even Feb26 embedded-source commit b1c89884e contains it. These facts do not date the original first introduction.
Org got an explicitly reworked retained inspection/continuation lifecycle in Sep12 commit61f633abe669d1283a617847c7294ce7b8047bb6. Historical feature package tickets/done/flat-agent-organization-model/implementation-revision-record.md IR-046 documents replacement of restore-on-select and Stop-to-config flows, preserving exact retained content/drafts and separating observation from activation. That explains the extra read: it belongs to a newer observational-state design, not a rule that hierarchical containers must stop differently. Original feature DS-037/047 later protected confirmed stop from delayed reads. Subsequent child restart correction reused inspection rather than inventing this stop path.

## Correct design assessment
Both containers should have the same semantic lifecycle: stop execution; preserve per-Agent inspectable content; reconcile truthful inactive/control state; permit later deliberate continuation without unrelated startup. Team/Org may retain different root queries/address traversal. Runtime status, historical content and command eligibility must not be conflated. A full historical read can settle final outcomes but should not require blanking known content or treating read errors as empty history. Do not make every stop perform extra fetches merely for code symmetry; don't remove Org stale-read/identity safeguards. Prefer a small correction at existing ownership boundaries after approval rather than a new shared global coordinator/cache. This is investigation-informed advice; detailed file/interface design and risk classification await approval.

## Limits / next step
For the inspected personal path, no automatic compensating Activity reload was found, so the same visible symptom is expected from source. This is not proof about the user's earlier installation or all old versions. Actual current frontend reproduction and Agent/Org parity remain downstream validation. No speculative historical explanation asserted as fact. Supplement doesn't expand scope; retain SR-001 outcomes and approval hold.
