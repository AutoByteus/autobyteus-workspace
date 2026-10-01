# SR-027 — Held-input continuation proposal

Package context-compaction-simplification-analysis · Solution Designer · 2026-09-30. **Ready for Approval of bounded held-input continuation; architecture Needs Revision.**

## Request, evidence and recommended outcome

User asks whether each AgentRun should queue/cache input so messages survive a compaction error and a later message triggers compaction before continuation. Read current SR026 result and canonical latest approval state; inspect actual server/web/core boundaries. A per-AgentRun queue already exists: server AgentRunInputAdmissionState. The needed addition is hold/resume of input proven not yet sent to the parent, not inventing another frontend queue.

Full source evidence, behavior proposal, scope and acceptance map: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/input-hold-proposal.sr027.md`. Proposed flow: A held after three internal strategy failures; show recoverable error; admit B; new user action permits another strategy operation; after successful compaction/commit, continue A then B in order without duplicate submission. Held entries must not create autonomous retry cycles. Runtime owns messages/hold/admission; CompressionStrategy owns only content transformation with three internal attempts.

User's retention direction is captured, not ignored as an unanswered A/B preference. The exact bounded FIFO continuation/minimal scope is presented for confirmation before final execution design. Busy backend queue/append capability is already present; do not claim the current frontend offers all busy-send interactions. Keep existing runtime differences. Offline needs activation before dispatch. Current queue is not restart-durable; no new durable outbox/migration or generic retry of already consumed work is authorized.

## Canonical authority and prior full context

`/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/requirements-doc.md` contains SR027 / proposed REQ012/AC017, refined DEC02103/AC014. `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/design-spec.md` remains Needs Revision with current queue facts, not a finalized architecture. `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/investigation-notes.md` E27 and `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-revision-record.md` carry evidence/history. Prior full cumulative artifact/supplement indexes: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-revision.sr026.md` -> SR025/SR024/SR023/SR022/SR021, original requests and specialist evidence indexes. Exact prompt-v5/output contract and natural-compression assumption remain unchanged; historical specialist results not edited.

Approvals SR012/017/020/022/024/026 retain scope. API005 interrupted; API004 Fail90.7 last-complete; F005 accepted nonblocking/not fixed and Qwen stopped; F004 cause unknown; F006 corrected; SR022 diagnostic retained. No score or acceptance change. Eventual nine-path successful-test review, inherited suite/typecheck and integrated browser/retry/resume/crash/Delivery gates remain. Large/High cumulative, not reclassified from an incomplete design. Product coordination N/A — not requested.

## Workspace, checks and next step

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`; branch codex/context-compaction-simplification-analysis; HEAD5cb7b049/sourceebaf3a78/local origin/personal8caa610f unchanged, no fresh remote check. Delivery owns eventual origin/personal finalization. Documentation/source inspection only, zero tests/provider calls/private-data access/source edits/migration/fetch/rebase/commit/push/merge/release/cleanup. Sources and before-state in solution-recovery-evidence/sr027/input-audit.json.

Present the simple reuse recommendation and proposed flow. On confirmation complete technical queue/core/status/transport integration, reclassify and route the ready review package. No formal architecture/implementation/API restart now. Fresh handoff rules follow full result persistence; routine approval proposal has no presumed recipient.


SR-027 verification/routing: inspected source, nine API-owned durable paths, exact prompt and all non-owned pre-existing ticket files unchanged; zero tests/provider calls. Fresh rules fetched after full result persistence; none matches this user-facing proposal/approval stage. No specialist handoff or API restart. Return source-backed reuse recommendation and proposed flow for confirmation.
