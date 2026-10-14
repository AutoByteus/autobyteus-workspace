# Implementation Revision Record — output-tps-precision

The current code and `implementation-handoff.md` are the authority. This record only locates and explains each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / `design-review-report.md` / round 2 (Pass) | IC-1 (binding); R-2, R-3, R-4 (recommendations) | Initial Baseline | SR-005, ARCH-REV-002; CRR/API-REV/DR: N/A | Implementation complete; handed to code review |
| IR-002 | architecture_reviewer / `design-review-report.md` / round 3 (ARCH-REV-003 Pass) after CRR-002 failure origin | CR-F01; API-L04; IC-2 (binding) | Design Impact (reimplementation of the revised design) | SR-006, ARCH-REV-003, CRR-002, API-REV-001; DR: N/A | Codex timing reimplemented; back to code review |

Downstream review notes (informational):
- IR-001 passed code review as CRR-001 (9.4/10), report `code-review-report.md`.
- Both DS-003 refinements and the `stream-event-payload-token-usage.ts` change were accepted.
- The code reviewer sent C-004 (the README Token Meter paragraph) to delivery's documentation sync as a non-blocking item. No implementation action is needed.
- IR-002 passed code review as CRR-003 (targeted delta review, 9.4/10). CR-F01 is resolved and IC-2 is satisfied.
- Non-blocking C-010: the live-capture path in `codex-model-call-timing.test.ts` points at `tickets/in-progress/` and must be updated when delivery moves the ticket. This is recorded as a delivery finalization action. No implementation action is needed.

## Revision Entries

### IR-001 — Per-call TPS measured by each runtime, carried on the run's usage event, minimal card

- Triggering role, report path, and round: architecture_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-review-report.md`, round 2 (ARCH-REV-002, Pass).
- Triggering finding IDs: N/A (baseline). It applies binding constraint IC-1 and recommendations R-2, R-3 and R-4.
- Classification: Initial Baseline.
- Prior authoritative result: N/A.
- Current authoritative result: implemented and locally checked; ready for independent code review.
- Related solution revision IDs: SR-005 (design D3.1; requirements R3 / SR-004).
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation of design D3.1.
- Approved behavior or requirement IDs affected: BEH-001 to BEH-004; REQ-001 to REQ-009; AC-001 to AC-009 (AC-010 is downstream).
- Implementation delta:
  - Run-side acceptance check `acceptModelCallThroughput` and constants, called from `createTokenUsageUpdatedPayload`.
  - Shared `ModelCallRequestBoundary`.
  - Per-runtime timing and method choice: native `LlmCallTiming`; Claude frame-receipt stamps before the context read; Codex `CodexModelCallTiming`; AGY per-step first `text_delta` or rounded `duration_seconds` (IC-1); ACP session boundaries.
  - Optional nullable `output_throughput` added to the strict presentation DTO (Team inherits it) and mapped by the collaboration adapter and the presentation and Team projectors.
  - Web: newest-TPS map replaces the pairing estimator; both intakes record right after the seen-key check; scope `tps`; REQ-006 card; en/zh-CN keys replaced.
  - Docs rewritten.
  - Browser probe, fixture page, scripted AGY CLI and transport e2e updated (R-2).
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result:
  - Server: typecheck passes. The full unit run had 5,484 passed and 6 failed, all from two causes in this change: the ACP neutrality wording and a fold test missing the new Codex input. Both were fixed and both files re-run (7/7). Integration is recorded in the handoff.
  - autobyteus-ts: unit 2,025/2,025.
  - Web: unit 4,394 passed, 5 skipped; guards pass.
  - Contracts: 18/18, 16/16, 27/27.
  - Fixture-mode browser probe: pass.
- Next recipient or routing: per `get_handoff_rules` (Large/High → code review).
- Remaining limitations or risks: RSK-002 (Codex ships end to end), RSK-005 (AGY thinking count), AGY delta cadence, Grok first-call setup, native hidden reasoning without a count; two documented refinements of the DS-003 boundary rows (see handoff § Important Assumptions).

### IR-002 — Codex call ends at `rawResponse/completed`, paired with its usage update (D3.2)

- Triggering role, report path, and round: architecture_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-review-report.md`, round 3 (ARCH-REV-003, Pass). This followed code review failure-origin CRR-002 (`code-review-report.md`, CR-F01) on API/E2E API-REV-001 (API-L04).
- Triggering finding IDs:
  - CR-F01: the Codex reading included tool time, because the call end was the usage update.
  - API-L04.
  - IC-2 (binding): retire the IR-001 Codex refinement where tool `item/started` froze the boundary.
- Classification: Design Impact, resolved upstream by SR-006. This round implements the revised design.
- Prior authoritative result: IR-001. The Codex call end was the model-call `thread/tokenUsage/updated` receipt, and any non-input `item/started` froze the boundary.
- Current authoritative result:
  - The Codex call ends at `rawResponse/completed` receipt, and `params.usage.outputTokens` is the call's output.
  - The reading is held pending per turn. It attaches to the next model-call usage update only if `last.outputTokens` matches; otherwise the value is null.
  - Only reasoning/agentMessage `item/started` and their deltas freeze the boundary.
  - Boundaries are `turn/started`, the previous call end, any `item/completed`, and the server's reply to an app-server request.
- Related solution revision IDs: SR-006.
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: CRR-002.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: N/A.
- Why this implementation revision is recorded: the revised design changed the Codex call end and the freeze rule.
- Approved behavior or requirement IDs affected: BEH-002 / REQ-002, REQ-003 / AC-004 (as aligned in SR-006), SCN-002.
- Implementation delta:
  - `CodexThreadEventName.RAW_RESPONSE_COMPLETED`.
  - `CodexModelCallTiming` rewritten:
    - `observe(method, itemType, params)`;
    - pending reading per turn;
    - `takeForModelCallUsage(lastOutputTokens)`;
    - `markRequestReplyBoundary()`;
    - the output item set narrowed to reasoning and agentMessage;
    - cleared at turn start and turn end.
  - `resolveCodexThreadTokenUsage` input renamed `completeModelCall` → `takeModelCallThroughput`.
  - `CodexThread` marks a reply boundary after `applyAppServerRequest` resolves and after a pending approval is answered.
  - Docs: the Codex row in `token_meter.md` and the Codex sentence in `token_usage.md`.
- Changed files or areas:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.ts`
  - `.../codex/thread/codex-model-call-timing.ts`
  - `.../codex/thread/codex-thread-notification-handler.ts`
  - `.../codex/thread/codex-thread-token-usage.ts`
  - `.../codex/thread/codex-thread.ts`
  - Tests: `tests/unit/agent-execution/backends/codex/thread/codex-model-call-timing.test.ts` (rewritten) and `tests/unit/token-usage/projections/token-usage-model-call-fold.test.ts` (renamed input).
  - Docs as above.
- Local validation and result:
  - Live wire replay, sample 1:
    - L03: 210 / 2,987 ms.
    - L04 call A: 112 / 1,881 ms = 59.5 tok/s.
    - L04 call B: 173 / 2,381 ms = 72.7 tok/s.
  - Live wire replay, sample 2: 115 / 1,517 ms and 158 / 2,259 ms.
  - Approval reply as a boundary: 100 / 3,000 ms, approval wait excluded.
  - Token mismatch gives null. A missing `rawResponse/completed` gives null, including the recorded 0.161.0 P5 trace.
  - A P6 compaction frame gives no reading and leaves the pending value untouched; the value then pairs.
  - A repeat after pairing gives null. Turn end clears the pending value.
  - Server typecheck: 0 errors. Codex, domain, token-usage and runtime-management unit folders: 595/595.
  - Full server unit: 5,494 passed, 0 failed, 7 skipped.
- Next recipient or routing: per `get_handoff_rules` (Large/High local fix or rework → code review), then the API/E2E rerun of API-L04.
- Remaining limitations or risks:
  - A Codex reading reaches the UI only when the usage update is published, which for a tool-ending call is after the tool. The value still excludes tool time.
  - A Codex CLI without raw events gives no Codex readings, by design: there is no fallback.

