# CRR-010 — bounded actual-owner/source audit

## Independent basis and confirmed origin
Approved SCN-005/006/011, REQ-007/009/013, AC-007/008/015 and design DONE/force release authorize ordinary explicit completion during submitted native work and exact retry. New Team-root lifecycle is independently supported, not made valid by a debugger or callable internal method.

Actual diagnostic at16:19:07.317Z: reader input guard throws, member runtime/component result rejects, both logical Task Team proof requests reject. The retained forwarded entry explains the observed assertion. Existing owner-level contract failure is established even though the prior native/processing event that should have settled the entry is not recorded.

Inspect raw evidence before using extracts:
- api-008-owner-debugger.jsonl: input-unresolved-assertion; exact error-caller-facts; agent-manager-components; team-proof-settled; root-proof-settled.
- api-008-fapi-008-witness.json: memberFacts; actualNestedRootRejections; agentComponentReceipts; teamMemberSettlements.
- api-008-fapi-008-origin.md; exact first/ordinary/diagnostic JSONs/logs.
Reader backend return not available; no lexical null/negative-control absence is an acceptance receipt.

## Smallest relevant production authorities
Paths relative autobyteus-server-ts/src:
1. projects/services/project-task-service.ts and collaboration Task/root release retain business commitment and exact outstanding refs; no compact-result change needed.
2. agent-collaboration/execution/task/root-task-execution-lifecycle.ts and Team task adapter/factory reach exact retained member controls; actual root registered-control and physical-adapter calls coalesce only at existing exact owners, not separate generations.
3. agent-team-execution/local/owned-flat-team-runtime-release.ts: allSettled independent members, rejected errors aggregate, dispose only after proof. Actual branch0 coordinator succeeds, branch1 reader rejects. The aggregate is not the causal leaf.
4. agent-execution/services/agent-run-manager.ts: runtime/component errors preserved, attachments successful, published exact reader retained rather than removed. No attachment failure established.
5. agent-execution/domain/agent-run.ts:
   - forceReleaseRuntime fences new input and commits termination without quiet wait (approved).
   - publishSourceEvents -> dispatchProcessedAgentRunEvents -> observeAgentRunInputEvents updates ledger from actual canonical terminal/error evidence.
   - finishCommittedTerminationOnce first awaits backend; its source negative path returns without queued finalization. Later it handles undetermined claim, calls settleAcceptedTermination, then releases pipeline/subscription. **Source control flow is not substituted for an observed backend return.**
6. input/agent-run-input-admission-state.ts:
   - fenceForRootShutdown cancels unforwarded queued/committed/reserved, preserves forwarded work.
   - associated turn terminal completes/removes forwarded entry; safety assertion requires quiescence.
   - actual one forwarded start_turn/no active claim/dispatch/pendingTerminal reaches that assertion. Removing assertion or silently clearing entry would replace proof with false success.
7. backends/codex/backend/codex-agent-run-backend.ts: terminateThread exact owner; native event conversion -> awaited source listener; thread callback launches async processing. Delivery and provider release need coherent proof but no particular async race is attributed.
8. codex/thread/codex-thread-manager.ts / codex-thread-release-scope.ts: fence finite RPCs, require active-turn closure, clear provider listeners/unbind and release exact lease/map authority. Actual thread released/absent/closed pending0 matches provider-owner state, not total physical proof.
9. codex-thread-notification-handler.ts, codex-thread.ts, codex-turn-event-converter.ts, codex-thread-lifecycle-event-converter.ts: distinguish native turn completion from status. In particular **setCurrentStatus(IDLE) also clears active turn and sets lastTerminalTurnId**. Thus lastTerminalTurnId is not independent evidence that a TURN_COMPLETED canonical event settled AgentRun input. Current thread IDLE/lastTerminal cannot identify which path occurred.
10. events/dispatch-processed-agent-run-events.ts, lifecycle and segment processing/input observer: terminal observation is different from lifecycle snapshot retirement/offline. Stream/snapshot differences must not be collapsed.

## Lower mechanism held, not a demanded patch
Possible native status-before-terminal, terminal conversion/delivery/processing issue, or another input handoff cause remains unconfirmed. Neither static possibility nor first stream's missing terminal proves a specific native sequence. No source patch, new drain protocol, arbitrary wait, fallback, status-to-terminal synthesis or backend certificate shape is prescribed from that held candidate.

Confirmed local outcome: existing owners must make ordinary exact release settle admitted input from trustworthy exact-generation evidence and keep same-DONE retry truthful. This stays within already reviewed concerns; no new business rule/global ownership/retry scheduler demonstrated. If actual owner investigation instead proves structural contract insufficiency, return exact receipt/path for Designer review before redesign.

## Review scope / prior assurance
New runtime integration failure reopens the forced input settlement dependency, not whole source scorecard. CRR007 publication-after-success evidence did not prove this real-provider handoff. No historical score rewrite or assertion that original FAPI007 had this cause. Original held candidateIDs remain independent.

Reviewer no executable runtime/provider/test rerun; actual receipt replaces generic-error resubmission. Read-only own historical logfile lookup found path removed, so no new native payload recovered; source subcause remains honestly held. No external process/inspector touched. Reviewer filters captured frames by exact payload.agent_run_id, not recipient text mentions:58 reader frames, zero canonical turn terminal/error/offline, lastidle. Extract cannot certify later stream or backend/physical release.

All reviewed283 paths and intentional baseline HTTP test284 unchanged. Upstream specialist canonicals and execution evidence preserved; reports/evidence only.
