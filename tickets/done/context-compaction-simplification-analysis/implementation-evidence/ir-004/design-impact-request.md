> Historical IR004 evidence. **SR031 supersedes the production-blocker interpretation only; the failed diagnostic is unchanged.** Current implementation disposition: ../../implementation-handoff.md; continuation evidence ../ir-005/README.md.

# IR004-DI001 — duplicate Team/Org input is not a fresh user admission

**Result: Design Impact; implementation incomplete. Large/High unchanged.**
Approved SR028 requirements / SR030 design; ARCH-REV-003 Pass. BEH005, REQ012,
AC014/017; DS009 and DS010 admission authority. No intended-behavior change is
requested: retain the approved rule that duplicate commands grant nothing.

## Discovered production premise

SR030's admission section and file map rely on existing input identity/command
deduplication. It identifies actual Team/Org `SEND_MESSAGE` -> `post_message` ->
ConfiguredAgentExecutionHandle.postMessage -> AgentRun.postUserMessage, but does
not specify where those routes reject/reconcile duplicate input identities.

Only standalone AgentRunCommandCoordinator calls AgentRunCommandRegistry.begin
before admission. Team/Org stream handlers retain message_id/dedupe_key (Org also
has command_id), but neither root command dispatch nor the shared configured
handle calls that registry. AgentRunInputAdmissionState.admit allocates a fresh
sequence for every successful invocation; metadata identity is currently only
projected. A repeated command therefore passes the proposed sequence high-water
cut despite not being a genuinely later user action.

Inspected paths (relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`):
- autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts: begin/duplicateResult before run admission.
- autobyteus-server-ts/src/agent-execution/services/agent-run-command-registry.ts: standalone in-memory command identity/lifecycle.
- autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts: handleSendMessage.
- autobyteus-server-ts/src/services/agent-streaming/agent-org-stream-handler.ts: SEND_MESSAGE translation.
- autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts: executeAgentCommand.
- autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run.ts: executeAgentCommandWithExecutionKind.
- autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts: postMessage.
- autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts: admit/reserve.

The missing shared duplicate boundary predates this round; the **extra recovery
permission** is reproduced in IR004's new target path. This is not a claim that
the prior production binary already implemented or violated the new recovery
contract, and not attribution of API-F004 to this finding.

## Deterministic reproducer

`autobyteus-server-ts/tests/unit/agent-execution/root-recovery-command.test.ts`
uses actual strict Team and Org stream command parsing, configured live handle,
AgentRun, native backend, and real core runner with synthetic parent/strategy.
Only root package hosting/activation publication is a test-owned facade; this is
not a full-root executable acceptance campaign. No provider calls/credentials.

1. A's required pre-parent compaction fails; A stays held.
2. Actual fresh USER `SEND_MESSAGE` B authorizes one recovery; it also fails.
3. Repeat the **identical** B message_id/dedupe_key (and Org command_id).
4. Required: remain at 2 compression operations and queue [A,B].
5. Actual: 3 compression operations, new failure epoch, queue [A,B,B], on BOTH
   Team and Org. Normal first B control cases pass and do not reactivate the
   configured run. The standalone coordinator duplicate test separately passes.

Evidence: `root-command-final.log`, `.exit`, `root-command-result.json` in this
directory. Final result **2 PASS / 2 FAIL**, process exit1. Earlier probe logs
include corrected test-host status/Org envelope fixture mistakes, not production
findings. No assertion was weakened to obtain a pass.

## Required design decision before dependent implementation

Specify one bounded identity/deduplication authority for these existing live
user ingresses: how it composes with the standalone registry and original
AgentRun admission state, its run-instance/lifetime and completed/rejected
identity handling, exact duplicate ACK/presentation/history behavior and
lifecycle observation. Preserve existing configured/task run readiness and
root ownership; do not bypass it via standalone activation.

A pending-entry-only identity check would fix this particular held example but
would not decide duplicate settled/rejected commands or races across entry
retirement. A new independent registry in each stream handler would duplicate
ownership. Silently treating metadata-free/direct input as duplicate would
change other callers. Therefore no guessed second ledger, durable outbox,
root command wrapper, retry credit exception, or behavior relaxation is added.
The coordinator should choose the proportionate current-memory boundary in the
technical design; no new durable format/migration or general delivery guarantee
is needed or requested by this report.

## Work stopped / preserved

Dependent recovery-admission completion is stopped for this design clarification.
All IR004 source remains uncommitted WIP at the pinned worktree; source patch,
new-file snapshots and hashes are retained in this directory. Existing pending
owner changes remain. This is a sole Solution Designer reroute, not source-review,
API acceptance or Delivery readiness. Once clarified, finish this implementation
round's remaining validation/cleanup before normal Large/High source review.
