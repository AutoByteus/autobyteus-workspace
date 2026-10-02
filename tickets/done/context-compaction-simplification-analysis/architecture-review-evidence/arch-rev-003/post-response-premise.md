# MP-007 / prospective ARCH-F002 — reachable post-response exhaustion

2026-09-30. Ongoing round, not a completed verdict. SR029 clarification introduced
explicit preservation of a real path, distinct from the rejected continuation
premise. Authority: REQ004/005/012, AC005/013/017, BEH001/005, SCN001/005;
API-RQ-001 user's instruction that after three failed attempts the agent is in
error state, and that the next user message triggers compaction first.

- Independent initiating basis: **supported system event** during ordinary native
  conversation — parent finishes a response with observed prompt tokens crossing
  the existing configured threshold. User's normal chat/tool work supplies the
  history; no synthetic gate mutation or invented mid-tool compaction safe point.
- Forward production path: native user submission -> turn input pipeline ->
  LlmPhase request/parent stream -> response ingestion ->
  evaluateLlmPhaseCompaction -> coordinator threshold request -> no returned tool
  invocations -> LlmPhase:367–391 executeIfAuthorized -> target direct strategy
  exhausts three attempts -> precommit failure keeps pending request -> catch
  diagnostic + final/isError -> AgentTurnRunner final branch emits completion ->
  AgentWorker.observeTurnSettlement emits AgentIdleEvent and clears active turn.
- Lifecycle: A has already been consumed by parent. It must NOT be held or replayed.
  Compaction pending/failure nevertheless survives that completed turn. Existing
  coordinator retry is authorized by user origin + different turn ID, not by the
  later admission time required for exhaustion recovery. SR029 explicitly preserves
  these old post-response lifecycle/retry behaviors while improving only held A.
- Reachability: **Reachable**. This is an ordinary automatic-compaction caller in
  production, independently found by SD and reread by reviewer. The separately
  excluded pre-tool-continuation execution cannot justify or dismiss this path.
- Consequence: preserving old final/completed/IDLE after exhaustion does not meet
  approved visible recoverable-error contract. Preserving different-turn retry
  alone does not prove genuinely later-user authorization or no queued-cycle credit.
- Proportionate correction requested: reconcile post-response exhaustion,
  truthful completed A, live recoverable error, pending gate/admission cut, later
  user retry and queue cases with existing owners. Do not suspend/replay consumed
  work, change tool safe points or invent durability. If an exemption is intended,
  return the behavior ambiguity to SD/user approval rather than silently weaken it.

Clarification sent to existing Solution Designer and confirmed DELIVERED. No
new executable test result inferred: current10 core tests include the evaluator
and pre-request assembler, not execution of this entire post-response path.
