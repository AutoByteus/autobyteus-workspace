# Personal-branch task approval / selection comparison

2026-09-14, Code Reviewer bounded F-002 investigation, CRR-005. Read-only Git comparison; no original application/server/provider rerun. No fetch, checkout, user-data inspection or original-branch mutation. User asks why earlier personal use did not expose the current task approval symptom.

## Precisely which personal revision?
- Local `personal`: `d1a399a5919cf9b6040050d5699caeb0cd1e6633`, 2026-08-30, chore(delivery): record remote open tab finalization.
- Locally recorded `origin/personal`: `5645b49d6f51faa60bd3545bc8e3f0e7e3f96793`, 2026-09-11, verified v1.4.69 publication. This was the pinned reference used in earlier F-001 comparisons. No fresh remote-tip claim.
- Local personal is an ancestor of that remote-tracking snapshot (`git merge-base --is-ancestor`, exit0). These are different historical states; saying simply “personal has the same implementation” without naming the revision was insufficient.
- Current child tested `c0bbe9c270e350dce9141860106bfc315a8567b7`; implicated F-002 paths unchanged from child base72dee5ad. Not introduced by IR-001 lazy readiness or IR-002 Org recovery.

## Approval policy: not an unconditional task override
Current `TaskAgentExecutionRegistry.prepare` copies configured recipient sourceNode and only replaces run ID/provider binding. Flat handle and shared handle forward autoExecuteTools into AgentRunConfig. Actual tested worker config was false. Codex dynamic-tool approval coordinator307–323 executes directly only when that flag is true; otherwise records/emits approval and waits.

Pinned Sep11 personal `task-delegation/task-delegation-service.ts:150–159` forwards configured source; `backends/mixed/members/mixed-task-agent-execution-registry.ts:107` copies it; `mixed-agent-member-handle.ts:444` forwards autoExecuteTools. Its frontend `useDefinitionLaunchDefaults.ts:149` default is false. Thus task startup alone is not proof of auto-approval. User's memory question was answered; user acknowledged remembering incorrectly and requested continuation. No approved policy change to force true.

## Older selection did not replace this live state
At Aug30 local personal:
- `components/workspace/running/RunningAgentsPanel.vue:210–213` calls `focusTeamMemberAndEnsureHydrated`.
- `stores/runHistoryNavigationStoreActions.ts:72–82`, despite that name, only resolves retained Team, calls view.focusAgent and patches navigation. No projection fetch, conversation assignment or Activity replacement.
- Team streaming dispatches live approval to exact task AgentContext. For an already-received approval, this focus-only path does not perform the downgrade found in current first-inspection hydration.
- This is narrow source evidence, not certification that every older task journey worked. Historical design documents record a separate blank/Offline task-monitor failure because materialized shells could lack retained content.

## Concrete historical change
`9ba13698fb85c5a24daeca8a05761bf09b790f5f`, Aug31 18:35:58 +0200, **fix(web): hydrate exact task monitor projections**, introduced `teamMemberProjectionHydrationService.ts` and `teamMemberInspectionCoordinator.ts`, and changed RunningAgentsPanel/TeamMembersPanel from focus-only to inspect-before-focus.

Its historical `tickets/in-progress/task-agent-monitor-visibility/design-spec.md` states the original helper only focused and patched navigation; live task contexts could remain blank while the server already held exact conversation/Activity. The change addressed that supported problem by fetching exact projections and guarded replacement. It checks revision changes during the fetch, but does not preserve an already-received live pending approval when the historical projection has less state.

Sep11 pinned personal retains this path: task activation invalidates the new member's projection authority; it does not eagerly hydrate every unfocused task. First task selection calls exact hydration. The selected current differences (selection-intent guards, retained versus visible identity checking, Team Send admission and atomic view publication) do not remove the pre-existing before-fetch replacement behavior. Projection status inference still maps pending trace to parsed, not live awaiting-approval.

This locates introduction of the relevant replacement mechanism, not a replay-verified historical end-to-end regression/bisect. Current reviewer diagnostic proves the mechanism on current real Team stream/hydration with controlled projection transport; no claim that original binaries were executed.

## Why the recorded earlier validation did not expose this
Pinned personal historical evidence:
- `tickets/done/task-agent-monitor-visibility/api-e2e-evidence/api-rev-003/ac017-isolated/setup-team.mjs:63`: autoExecuteTools true.
- Matching setup.json/evidence.json show root and configured members auto_execute_tools true. The ac017 sibling setup also uses true.
- `tickets/done/task-agent-monitor-visibility/api-e2e-execution-coverage-report.md` AC017-002 validates **early-selected** task with stream updates; two live tasks passed that stated scenario.
- Its `teamMemberProjectionHydrationService.spec.ts` covers tool mutations arriving **during** projection fetch, not a live pending approval already present **before** first selection.

Those are concrete coverage differences: no manual pending approval exists with auto-approval true; early hydration allows a later approval event to set awaiting-approval afterward. Current diagnostic checks both orderings: approval-before-hydration becomes parsed in conversation/Activity; approval-after-hydration remains awaiting-approval. Both use same retained context and ready stream.

We cannot reconstruct the user's actual past versions/settings/click timing from these records. It is plausible they used the earlier focus-only version, auto approval, or early selection, but none is asserted as personal usage history. We can explain why documented earlier tests missed this case without dismissing the user's experience.

## Design consequence, not a revert recipe
Do not restore focus-only selection: it loses the necessary blank-monitor correction. Do not force autoExecuteTools true or display Approve for every parsed historical tool: parsed history does not prove a currently pending authorized invocation. Designer should define how exact historical hydration and live approval authority coexist, preserving retained content, current interaction state, identity and revision safeguards. Start with supported manual task already awaiting approval before first selection; retain actual frontend acceptance, with backend diagnostics only corroborating it.
