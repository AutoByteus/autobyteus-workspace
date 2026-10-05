# FAPI-008 — actual reopened Team-root cleanup failure / causal receipt

2026-10-03, API-REV-008. **Fail**. Preliminary product runtime/input-settlement origin observed; **Local Fix vs Design Impact not certified**. This is NOT successful-test review or Delivery. Original FAPI-007 Org/helper relationship remains **unestablished**, not retroactively resolved.

## Approved supported path and reproduction
REQ-BL-008 / SR-014 / ARCH-REV-005 / IR-006, Large/High/Reviewed. SCN-002/003/005/006/010/011; REQ-003/005–010/013; AC-002/003/007/008/009/013/014/015. Explicit business DONE is valid, including while a native worker submission is ongoing; actual file read is content evidence, not an invented work-completion convention. No timers/forced races/delays/self-DONE/notifier were used to cause the fault.

`node E/round8-concrete-lifecycle-probe.mjs agent_team` on the own worktree-built desktop follows real public GraphQL/multipart setup + `/ws/agent-team/<root>` SEND_MESSAGE → ordinary configured shipped Manager → actual Codex gpt-6.1-sol low native MCP. Create two saved Tasks A/B and read-only packet/context; activate configured non-task-owned borrowed Agent by native sentinel read. Delegate each saved ID once, mark IN_PROGRESS after dispatch. A and both B members actually read saved bytes. Explicit DONE-B first lifetime releases with genuine member terminal events. Send late input to old closed ingress: rejected, no trace/seed/wake. Explicit TODO alone starts nothing and retains old history. ONE saved-ID Team redelegation creates fresh lifetime/Team/ingress; both new members actually read B bytes. Explicit DONE-B once commits and acknowledges compact recorded status, but cleanup fails. Then ONE ordinary same-DONE retry fails. After safe exact-owned inspector became available, ONE final bounded diagnostic same-DONE fails and captures the actual nested error. No fourth retry, no new copy/seed on retry, no Root Stop as repair.

Existing probes assume the recorded own live setup/instance; **that instance is now cleaned up**. Never call old stopped endpoints or user app. Reproduction requires a fresh documented isolated-worktree setup/new namespace and authorized provider; use these complete scripts/receipts as reproduction steps, not deterministic guarantee. Only the selected real Team journey and two exact retries ran; Org/Team-root Stop/restore were held at the failure.

## Exact authority / calls
- Own instance iso-55024-a24c; backend31575/parent30630, listener55025 and embedded worktree cwd verified before inspector; control55024. No foreign inspector/Stop.
- Root `api008_concrete_root_team_b1450c819aa949079b05eadc6d52f9fb`.
- Manager `project_task_manager_e2ba134e193e4786b004abb78512bf6e`.
- Project `project_0fc2e5bd-e806-4406-802f-a20b83b742a6`, B `project_task_17cd817c-f8bf-41f2-911e-392e6d5d5773`.
- New lifetime `project_task_lifetime_d25faaac-5824-4dd3-baa6-a0229195beca`, opened15:59:49.329Z, reservation15:59:49.337Z, completed16:00:36.636Z.
- Assignment Team `api008_packet_team_66adda0d15544a6aa0f186ed58465aa2`; ingress/coordinator `api008_team_coordinator_1c86cad97e984c9caf9105543e0bbdd8`.
- Failed reader `api008_team_reader_68e39fdf22fe4d12bdf8e3512805b148`, generation `06c3bcb3-80d8-4229-a311-f18673ab85e2`.
- First call/final nonce, ordinary retry nonce `API008_EXACT_FAILED_RETRY_b591f22b-ee1e-43bb-acb3-8d9cd295ef00`, diagnostic nonce/call/ack in `api-008-fapi-008-witness.json`. EACH retry has exactly ONE actual create_or_update_task DONE, compact `{task:{projectId,taskId,status}}` acknowledgement, real assistant SEGMENT_END; same completedAt/root/lifetime/ref/ingress/purpose/reservation/dispatch/tree and no new copy/seed.
- All three attempts retain bounded120s all-released assertion failure. Compact ack/final is NOT cleanup proof. First and ordinary retry had no inspector; their nested error was unobserved. Actual cause below was captured only on diagnostic retry at16:19:07Z.

## Actual nested error BEFORE generic aggregation
Leaf **Error**: `AgentRun termination cannot settle while submitted input remains unresolved.`
Actual built stack: `AgentRunInputAdmissionState.settleAcceptedTermination` at `dist/agent-execution/input/agent-run-input-admission-state.js:351:19` → queued `dist/agent-execution/domain/agent-run.js:472:38`.
The manager captures it in `AggregateError('Exact AgentRun runtime/component release failed.')`; Team captures `AggregateError('Owned Team exact release failed.')`; physical adapter adds `AggregateError('Exact Task Team cleanup failed.')`. Actual `AggregateError.errors`, names/messages/stacks/cause and registered-control vs physical-adapter rejected receipts are preserved verbatim in `api-008-owner-debugger.jsonl` and extracted witness. Root request has proofCount2, both exact same assignment; logical requests are distinct even where exact AgentRun termination is coalesced. Team member results: coordinator branch0 fulfilled `{accepted:true}`, reader branch1 rejected with the above leaf. Do NOT rename coordinator member receipt to backend acceptance.

## Separate actual facts and limits
| Boundary | Actual diagnostic observation | Limit |
| --- | --- | --- |
| Reader input | acceptingfalse/fencedtrue; activeClaimnull; one sequence1 forwarded start_turn; associatedTurn01a1027e-9fe9-7973-b782-12d26f003c9f; observedTurn/pendingTerminal/heldTurnnull; no active/uncertain input dispatch | This is the actual thrown assertion, not a speculative input hypothesis. WHY this forwarded record remains requires focused owner investigation. |
| Canonical state | lastStatusoffline, activeTurnNONE, pendingCommandfalse, same associated turn in retiredTurnIds | Offline does not settle the input ledger or prove full release. |
| Actual Codex owner | thread01a1027e-3ae7-75f2-ac7a-96b5d899d188, activeTurnnull, lastTerminal same associated turn, IDLE; thread/preparation absent, exact thread in released set; closed releaseScope pending0/unknownfalse | Concrete resource state, NOT reconstructed physical/backend receipt. |
| Backend stop return | Reader accepted/negative/thrown result **unobserved**: lexical result scoped out/null in queued caller | No accepted backend invented from reachability/offline. No negative capture hit is not proof of acceptance. |
| Attachments/registry | actual attachments.errors[]; reader activePublishedtrue/retiredfalse; Manager component failure preserves exact reader error | No successful reader registry removal or Team finalization receipt. Team is terminating; diagnostic remains failed. |
| Shared provider | workspace client exists, holders2, closingfalse/closeAttemptfalse | Protected shared retention is not a leak; no task-only provider PID exit or all-five physical proof. |
| Public/internal projection | reopened coordinator genuine offline events; reader last initial captured frame idle/NO offline frame; later current snapshot/canonical offline separate; strict public projection; internal lifetime/ref retained and failed | Truthful business state separate from internal proof. No forced icon/event/reload/error discard. |

Debugger read-only property observations, no mutation/hook/new production logger/UI/protocol. Ten pauses0–2ms/total10ms, zero read errors; successful pre-input points disabled. Diagnostic pause/deoptimization remains a limit; no uninstrumented timing certificate. Detach confirmed16:21:26.214Z before cleanup.

## Protection and cleanup
Other lifetimes and prior closed B remain exact; current trees exact across both retries. A stays IN_PROGRESS/open/not_requested, Manager/root and borrowed exact identity retained; borrowed full parsed trace identical, four saved packet descriptions/full persisted metadata/bytes and four workspace sentinels unchanged. No worker/history/file deletion to pass. See final witness and22 allowlisted history/packet archives. Own environment cleanup later is not a Task release repair: exact documented graceful stop, all74 captured own PIDs gone, own root/importedDB/key removed, ports55024/55025/9229 free. Four contemporaneous foreign records exact unchanged; fifth entry foreign instance removed externally BEFORE own cleanup, actor/cause unobserved, no agent action on it.

## Requested focused classification
Review this actual causal receipt and owner spine for Local Fix vs demonstrated Design Impact; decide the correction owner, not a guessed provider/input workaround. No patch or redesign performed by API. Do not clear forwarded input/history, swallow aggregate errors, force terminal/offline, call global Stop, or assign Manager a cleanup loop. Original FAPI-007 remains independently open/Unclear after nine positive controls; its FO-CAND-010/011 are not certified by this different actual failing generation. Full provider/three-root/private/recursive/approval/recovery acceptance remains required after correction.
