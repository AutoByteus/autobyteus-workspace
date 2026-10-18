# Docs Sync Report — segment-lifecycle-error-flood

## Scope

- Ticket: `segment-lifecycle-error-flood`
- Trigger: code reviewer's test-code review Pass (CRR-002) for the validated package (API-REV-001 Pass, 96%)
- Bootstrap base reference: `origin/personal` @ `1c718202b2`
- Integrated base reference used for docs sync: `origin/personal` @ `ff8e72e724`, merged into `codex/segment-lifecycle-error-flood` as `5a9df8a8cf` (108 base commits)
- Post-integration verification reference: DR-01..DR-05 in `release-deployment-report.md` (typecheck, focused unit, full unit, full integration on `5a9df8a8cf`)

## Why Docs Were Updated

- Summary: the implementation commit `f4490d258a` already updated the four server docs that describe turn identity, segment admission, the lifecycle notice and its logging. Delivery checked them against the merged state. The base's own edits to two of these docs (Team sequenced segment shape and the content cadence, from autobyteus-139) are in other sections and merged cleanly next to this ticket's text. No further long-lived doc change was needed.
- Why this should live in long-lived project docs: which evidence may end a turn (ordered stream evidence vs. a provisional runtime snapshot) is a run-owned rule that every runtime relies on. The one-notice-per-turn rule and the two log tags are the contract that operators and the web client see.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Turn identity rule, `AgentTurnLedger`, segment admission, notice and log lines | Updated (in `f4490d258a`) | Checked on the merged state: l.524 ledger rule; l.615–632 notice text and `[AgentSegmentLifecycleRejected]` / `[AgentSegmentLifecycleRejectedSummary]` |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Lifecycle notice as seen on the agent stream | Updated (in `f4490d258a`) | l.50–51 match the code; base edits (cadence) elsewhere in the file |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | `AGENT_SEGMENT_LIFECYCLE_INVALID` per-turn semantics on the wire | Updated (in `f4490d258a`) | l.181–183 match; base changed the Team segment shape (`change_sequence`, `agent_run_id`) in a different section |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` | Where segment rejections are counted and logged | Updated (in `f4490d258a`) | l.52 matches |
| Whole repo outside `tickets/` (search) | Stale references to the old message "violated the canonical lifecycle contract", `retiredTurnIds`, `rejectedAfterFirst` | No change | No hits outside tickets; the web client does not match on the message text |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| The four docs above | Behavior/contract (by the implementation engineer, `f4490d258a`) | Ledger rule; at most one plain-language notice per turn, only in the current turn; first-rejection warning plus boundary summaries | Match the shipped behavior |
| `tickets/.../design-spec.md` l.348 (ticket artifact) | Wording | Summary log field `rejectedAfterFirst` → `count` | Aligns with the interface table, REQ-004 and the code (CRR-001/CRR-002 residual note) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Turn evidence rule | Ordered stream evidence may supersede and end a turn; a runtime snapshot only names a turn while the stream holds none and never ends one. Both run-owned states use their own `AgentTurnLedger`. | `design-spec.md`, `experiments/experiment-results.md` | `docs/modules/agent_execution.md` |
| Rejection notice and log bounds | ≤1 notice per turn; log lines bounded by run lifecycle boundaries, not by event count | `requirements-doc.md` REQ-003/REQ-004, DEC-003 | `agent_execution.md`, `agent_streaming.md`, `agent_websocket_streaming_protocol.md`, `streaming_parsing_architecture.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Two copies of turn tracking (turn state's public `retiredTurnIds`, segment state's `openTurn`/`activeTurnId`/`retiredTurnIds`) | `AgentTurnLedger`, one instance per state | `agent_execution.md` |
| Per-event `diagnostic()` chat error "A runtime segment event violated the canonical lifecycle contract." | One notice per turn, "Some of the agent's output in this turn could not be shown.", plus log lines | `agent_execution.md`, `agent_streaming.md`, `agent_websocket_streaming_protocol.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from the evidence, then archive and finalize per RELEASE.md
- Notes: Codex thread-gate rejections (FU-001, `autobyteus-165`) and the Stop window (FU-002, `autobyteus-166`) are out of scope and are not described as fixed in any doc.
