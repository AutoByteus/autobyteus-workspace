# Solution handoff — Architecture Design Complete
## Identity and status
- Package: codex-interrupted-compaction-fix — close Codex compactions abandoned by interrupt or other turn/run endings. Revision SR-002.
- Result: **Architecture Design Complete**; task_size **Medium**, architectural_risk **Low** (design-spec.md).
- Requirements: **Approved** by the user 2026-10-04 (U03: "bootstrap a new ticket to work on … the interrupted-compaction fix … no need to approve now its clear").
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix; branch codex/codex-interrupted-compaction-fix; base origin/personal @ 03d5db06b; finalization target origin/personal. Ticket artifacts are untracked; no commits yet. The worktree and branch were renamed from the codex-compaction-analysis investigation; evidence carried over.

## Request and goal
Per-runtime compaction work (after the Claude and AGY fixes). The Codex investigation found rotation correct, but abandoned compactions are never closed: the UI and history show "compaction started" forever. Fix that only.

## Proven evidence
- Real data: 4,103 started vs 4,071 completed = 4,071 archives; 32 abandoned starts, each followed by the end of its turn and a fresh compaction in the next turn (C04–C06).
- Live: interrupting during an automatic or a manual compaction gives `turn/completed {status:"interrupted"}` and never `item/completed` for that contextCompaction item; the next compaction pairs normally (C10, C11). Normal shape is started/completed with the same item id (C07, C09).
- Other endings without turn/completed: app-server close / runtime terminal error, and run terminate, which drops listeners without events (C14).

## Required implementation
See design-spec.md: an open-operation registry in CodexProviderCompactionStatusProjector; a failed "codex.context_compaction_abandoned" payload with the same provider_event_id, no rotation and a reason; hooks at TURN_COMPLETED, terminal ERROR and backend terminate, emitting the close before the ending event; no migration; no Claude/AGY changes.

## Acceptance
REQ-C01 (AC-C01a–d), REQ-C04 (AC-C04). Replay fixtures: probes/codex-interrupt-auto-raw.jsonl, probes/codex-interrupt-manual-raw.jsonl, probes/codex-auto-raw.jsonl. Live gate RUN_CODEX_E2E=1.

## Artifacts (absolute paths)
- /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/probes/ (codex-probe.mjs, show.mjs, analyze.mjs, unmatched-context.mjs, codex-{manual-api,slash,auto,interrupt-auto,interrupt-manual,empty-compact}-raw.jsonl, real-data-unmatched-started.json)
- Architecture review: N/A — not applicable (Medium/Low direct route). Product artifacts: N/A — not applicable.

## Constraints and open risks
Do not change completed-compaction rotation/dedupe; do not rewrite historical markers; `/compact` is out of scope. Residual: a hard kill of AutoByteus still leaves an open marker. Model-side compaction failure is not reproducible. The live E2E uses Codex quota.

## Expected output
Implementation with implementation-scoped checks and implementation-handoff.md, then the team's validation and delivery flow.

## Routing
get_handoff_rules → "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → /implementation_engineer.
- Sent 2026-10-04 via send_message_to → /implementation_engineer; DELIVERED, target_agent_run_id implementation_engineer_8368905559634bb4a617100bcac1f243.
