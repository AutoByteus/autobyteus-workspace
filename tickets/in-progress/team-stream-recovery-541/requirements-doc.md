# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-001
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder ("Small follow ups should be merged into one", 2026-11-26)
- Approved by: Solution Designer within the direction; user informed 2026-11-27. The Task's items are its leads; each decision below records its reasoning.

## Scope Guardrail

- **Use cases changed:**
  - a Team's live view after its stream loses order or its connection (desktop and phone);
  - opening a run from the Runs view;
  - the composer while a run's stream is down;
  - the composer button's labels.
- **Cleanups:**
  - the Team tool-approval handler's dead branch;
  - the slow Org spec's timeout;
  - the two Org files over 500 lines, and one file's name;
  - the stop-generation probe's wire, which reorders frames (A's cause).
- **Out of scope:**
  - the server's stream order, which is correct (investigation A);
  - the Org stream's recovery, which already recovers itself;
  - the 540/533 send and Stop answers (the not-sent notice, "Stop was not sent: not connected"), which are kept as they are.
- **Preserved:**
  - every Team and run stream contract;
  - the change-sequence check itself (a real gap is still detected);
  - the recovery's verified-snapshot replacement (`replaceFailedTeamStream`), which stays the only way a failed Team stream is replaced;
  - Stops settled across a loss (533);
  - a send's not-sent notice with the text back (540).

## Requirements

| ID | Requirement | Basis |
| --- | --- | --- |
| REQ-001 | A Team stream that needs recovery recovers by itself, on desktop and phone, without the user selecting the member again. Attempts follow the reconnect cadence (1, 2, 4, 8, 16, 30 s, none while the page is hidden). A user's reselect during a recovery joins it instead of starting a second one | Task A ("recover by itself"); DEC-001 |
| REQ-002 | While a Team stream is recovering:<br>- its members keep their last known status;<br>- a send waits for the recovered stream (up to 10 s), then shows the not-sent notice with the text back (540), never "Select this Team member again";<br>- Stop answers "Stop was not sent: not connected…" (533).<br>Only when recovery keeps failing (the fifth consecutive failure) does the view say so, on desktop and phone: "Live updates could not recover automatically. Select this Team member again to reload the complete conversation." (localized). Recovery goes on trying | Task A ("show the truth"); DEC-001 |
| REQ-003 | While a run's or Team's stream is merely disconnected (not recovering), its shown status and its Send stay as they were. A history refresh does not change them to Initializing. The stream's next snapshot sets the truth | Task C; DEC-002 |
| REQ-004 | Opening a live run shows its real status: the run's own status as the page knows it (the run-status feed, which the Runs row shows), else Initializing until the stream's first status. Never a Running placeholder, so an idle run never offers Stop at open | Task B FU-002; DEC-003 |
| REQ-005 | Opening a run whose context another part of the page builds at the same moment never fails and never shows or logs "changed before projection commit". It reads once more, and if the context changed again it shows the context the page now holds | Task B FU-007; DEC-004 |
| REQ-006 | The composer button's "Send message" and "Stop generation" are localized (en, zh-CN), desktop and phone | Task D FU-001 |
| REQ-007 | No behavior change: the Team tool-approval handler loses its unreachable null-run branch and unused inputs; `CollaborationMessagesOrgRoot.integration.spec.ts` gets a timeout sized for a loaded run; `agentOrgContextsStore.ts` and `agentOrgStreamingService.ts` are each under 500 lines, split by owned concern; `agentOrgConnectionLostError.ts` is renamed to name both its contents | Task D FU-003, FU-004; Task E |
| REQ-008 | The stop-generation probe's wire delivers each link's frames in the order they arrived | Investigation A |

## Acceptance Criteria

| AC | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | 001, 002 | A Team stream given a real change-sequence gap (a test node that skips one sequence, or a frame withheld by the wire): the view recovers within one attempt (≤ 3 s at loopback), with no reselect; the member's status is the node's; a send right after works. Desktop and phone | Web spec (fake socket: gap, then recovery); probe case on desktop and phone with a withheld frame |
| AC-002 | 002 | Recovery failing five times (the node unreachable for the recovery's reads): the localized notice shows (desktop and phone). A send waits ≤ 10 s, then gives the not-sent notice with the text back. Once the node is back, recovery succeeds and the notice goes | Web specs; probe |
| AC-003 | 001 | A reselect during a recovery runs no second recovery and opens the member once | Web spec |
| AC-004 | 003 | Test with 540 SDD-12 and SDD-09 (path down, history refresh working). Every probe uses the fixed wire.<br>- SDD-12: the member's shown status stays the one before the loss for 15 s (no Initializing).<br>- SDD-09: Send is enabled after the not-sent notice.<br>- Same for an active standalone run.<br>These must fail on the old code | Probe (old vs new); web spec of the refresh |
| AC-005 | 004 | Open a live idle run: Send, not Stop, from the first frame after open (the run-status feed known). With the status unknown: Initializing until the stream's status | Web spec; probe sampling the button from the click |
| AC-006 | 005 | An open racing a history refresh building the same run's context: no error is thrown or logged; the run is shown | Web spec reproducing the race (fails on old code) |
| AC-007 | 006 | zh-CN shows the Chinese labels; en the English | Web spec |
| AC-008 | 007 | Server and web suites pass; `wc -l` under 500 for both files; no importer of the old file name | Suites; `wc -l`; grep |
| AC-009 | 008 | The wire prototype gives 0 out-of-order deliveries; SGD-06 ×10 at 150 ms has no gap | Prototype; probe |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | What a Team view does after its stream fails | The gap that 533 saw was the probe reordering frames (investigation A), but a real gap must not strand the view. The Org stream already recovers transparently and speaks only after persistent failure; the Team should do the same: one behavior for both roots. **Automatic recovery through the existing verified replacement, on the reconnect cadence, single-flight per Team.** While it runs, members keep their last status (the same rule as a plain disconnect, DEC-002), and send and Stop give their existing plain answers. A notice only after five failures, localized and also on the phone | Solution Designer (within "recover by itself, show the truth") | Decided; user informed |
| DEC-002 | Status while a stream is merely disconnected | An existing context's stream owns its live statuses (SR-045); its snapshot on reconnect sets them. The refresh's `Initializing` placeholder overwrote the last known status and disabled Send for nothing. **Remove it for existing contexts, Team and standalone alike** (the same placeholder causes the same symptom on a standalone run). The unused `activeRunRecoveryCoordinator` goes with it | Solution Designer (consistency across similar surfaces) | Decided |
| DEC-003 | Status at open | The page already holds each listed run's own status (`runStatusStore.statusOf`), the one the Runs row showed when it was clicked. **Use it; unknown → Initializing until the stream's status.** No new query | Solution Designer | Decided |
| DEC-004 | A context built meanwhile | Its builder read at least as recently as the open began. **Retry the read once; if it changed again, keep and select the current context.** The error stays only for a true failure of the read | Solution Designer | Decided |
| DEC-005 | The slow Org spec | It exists to prove behavior at 42,000 references; less data would prove less. **An explicit timeout (20 s) on that test** | Solution Designer | Decided |
