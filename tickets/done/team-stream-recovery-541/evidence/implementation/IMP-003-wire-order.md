# IMP-003 — The probe wire keeps each link's frame order (AC-009, D-A8)

- Date: 2026-11-27. Worktree `<worktree>`.
- Change: `autobyteus-web/tests/e2e/fixtures/stop-generation-wire.mjs` `schedule()` keeps one FIFO queue per link and
  direction. Each frame is due at `max(arrival + delay, the previous frame's due)`, and one timer drains the queue in order;
  there are no per-frame timers. The base read the clock twice per frame (`due = max(Date.now() + latency, link.due)`, then
  `setTimeout(deliver, due - Date.now())`), which let a frame one millisecond later fire first.

## Prototype (Proven)

The base wire module is `git show 80420a8bf6:autobyteus-web/tests/e2e/fixtures/stop-generation-wire.mjs`; the new one is
the worktree's. Each script feeds `link.fromNode` 20 × 400 numbered Team frames at 150 ms latency.

| Script | Base wire | New wire |
| --- | --- | --- |
| `../investigation/real-wire-order.mjs` (the investigation's; frames 0–0.3 ms apart, no clock help) | 0 / 8000 out of order (this run; the investigation saw 1 / 8000) | 0 / 8000 |
| `wire-order-stress.mjs` (this file's sibling; the clock moves 0–2 ms between any two reads: the mechanism itself) | **724 / 8000 out of order** | **0 / 8000** |

Commands: `node <script> <wire module path>`, run 2026-11-27.

## Probe: SGD-06 × 10 at 150 ms

`node autobyteus-web/tests/e2e/stop-generation-probe.mjs --output-dir <tmp>/sgd06-<n> --cases SGD-06 --latency-ms 150`, run
10 times one after another on 2026-11-27, each on its own temp stack: the server built from this branch, the new wire,
and this branch's web code.

| Runs | SGD-06 | Browser errors | Gap lines in the page console (`CHANGE_SEQUENCE_GAP`, "recovery is required") | Numbered Team frames to the page out of order (wire log) | Data root removed |
| --- | --- | --- | --- | --- | --- |
| 1–10 | **Pass ×10** | 0 in each | **0** in each | 0 of 21 per run (the wire logs only its kept types: statuses, acks, snapshots) | yes, each |

For comparison, the investigation's 20 runs on the base wire showed the gap once (run 3, frames 1, 2, 4, 3).
