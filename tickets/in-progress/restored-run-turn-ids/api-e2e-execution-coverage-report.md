# API/E2E Execution Coverage Report — autobyteus-526 round 1 (`restored-run-turn-ids`)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`; revision record `api-e2e-revision-record.md` (API-REV-001); progress `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation IR-001 (direct route, Medium / Low). Code `10217e9a0b`, `cbea910d08`; tested at `238be7dbc0`.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/restored-run-turn-ids/tickets/in-progress/restored-run-turn-ids/evidence/` (`V-*`)
- Stale tests: none. No test asserted that a restored run restarts at `turn_0001`.

## Routing Classification

- Task size `Medium`, architectural risk `Low`; input route `Direct`.
- Result `Fail`, so the outcome goes to the failure-origin review (code reviewer).

## Tested Builds And Environments

| Env | Commit | Build | Notes |
| --- | --- | --- | --- |
| E1 | `238be7dbc0` | server `dist/` from `test:integration:prepare`; production phone bundle `build:mobile-web` | macOS 26 arm64, node 22.23.1, load 45–57 |
| E2 | base `2e9ac1e65b` | the same builds, in a temporary worktree (removed) | for the before; the new tests pointed at it |
| E3 | `238be7dbc0` | isolated desktop app (`isolated-app start --build`), real model claude-fable-5 from the test vault | renderer zone Europe/Berlin |

## Cases

| Case | Criteria | Surface | Command / Steps | Env | Result | Evidence | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-R01 | AC-001 (unit), AC-003 (component), typechecks | — | reused IMP-00..IMP-04 | — | Pass | implementer's | the MemoryManager test fails on base and passes with the fix |
| V-01 (RR-10) | REQ-001, AC-002 (server, reload path) | built server, scripted model, two graceful restarts with a build running | `RUN_RESTART_REMINDER_E2E=1 … -t RR-10` | E1 / E2 | Pass on this build; Fail on base (before) | `V-01-RR-10/` | head: stored inputs `turn_0001..0003`; notices `turn_0002`, `turn_0003`; live `[[turn_0001],[turn_0002],[turn_0003]]`; the loaded conversation lists each input, reminder and reply once, replies `@turn_0001/2/3`. Base: `turn_0001` three times, all replies `@turn_0001` |
| V-02 (RR-11) | DEC-003 | a run restarted twice on base, then opened and continued on this build (same data root) | `RESTART_REMINDER_BASE_SERVER_DIR=<base> … -t RR-11` | E1+E2 | Pass | `V-02-RR-11/RR-11.json` | stored lines unchanged byte for byte; next turn `turn_0002` (highest stored + 1). The old turns stay `turn_0001` ×3, all three old replies `@turn_0001`, so a view grouping by turn shows the old part merged as before |
| V-03 (MSP-75) | AC-002 and AC-003 on the phone | production phone bundle; own node; a native run; node restarted twice; Europe/Berlin | `mobile-shell-probe.mjs --cases=MSP-75` | E1 / E2 | **Fail** (live) | `V-03-phone-MSP-75/` | Head: live after restart 1 → **2 cards** for 1 restart; after restart 2 → **3 cards**; after a reload → 2 cards. Every input and reply is shown once at every point. Cards read "18 Nov 2026, 07:58 CET"; the agent received "06:58 UTC". Base: the same 2/3/2 cards; REPLY_ONE (then REPLY_ONE and REPLY_TWO) hidden live; UTC on the card |
| V-04 | AC-002 and AC-003 on the desktop | isolated app, real model, the app's Restart server | journey | E3 | **Fail** (live and after a reload of a live run) | `V-04-desktop/` | live after restart 1 → **2 cards**; after restart 2 → 3 cards (the newest twice); **after a reload of the live run, still 3**; every reply once; cards "07:42 CET" / "07:49 CET", stored "06:42 UTC" / "06:49 UTC"; traces `turn_0001..0003` |
| V-05 | regression | restart suite RR-01..06 (the file changed) | full scripted run | E1 | Pass | `V-05-restart-suite/` | `Tests  8 passed \| 3 skipped (11)` |
| V-06 | typecheck | server tests | `pnpm -C autobyteus-server-ts typecheck` | E1 | Pass | `V-05-restart-suite/vitest-results.log` | `1012 in 316 files (baseline 1012 in 316 files)`, `PASS` |

## Failure F-1: the reminder card still shows twice live (phone and desktop), and after a reload on the desktop while the run is live

- **What fails:** REQ-002 / AC-002 ("each turn shown once … the reminder once per restart … live and after a reload"). The newest restart's reminder is shown twice:
  - one card ends the previous reply (above the user's message);
  - one starts the new reply.
- **Where:**
  - phone and desktop, live;
  - desktop also after a reload while the run is live (an idle run).
  - The phone after a reload is correct.
- **What this build did fix:**
  - Turn ids are unique (traces, live).
  - Replies are no longer hidden, on the phone and the desktop, live and after a reload. On base, REPLY_ONE and REPLY_TWO were hidden live.
  - The card time is in the viewer's zone (AC-003 holds).
- **Same on base:** the extra card is there in the same counts (2, then 3), so its cause is independent of the turn ids.
- **Facts about the cause:**
  - The server sends **one** `SYSTEM_TASK_NOTIFICATION` per restart, before `TURN_STARTED` of the input's turn (`V-01-RR-10/RR-10-head-frame-order.json`, a temporary recording).
  - The loaded conversation (`getRunProjection`) has each reminder once (RR-10).
  - So the second card is made in the web.
  - In the web, `handleSystemTaskNotification` adds the notice to `findOrCreateAIMessage(context)` (`services/agentStreaming/handlers/systemTaskNotificationHandler.ts`, `handlers/segmentHandler.ts` L254).
  - The other copy, before the user's message, matches the stored conversation's placement (`runHydration/runProjectionConversation.ts` L275).
  - My reading, not proven: the live segment and the conversation loaded on (re)connect each render the same notice. A desktop reload of a live run combines the loaded conversation with the live stream's snapshot.
- **Classification (my view, for the code reviewer's failure-origin review):** `Design Impact`.
  - DEC-001 and the design assume that unique ids make every layer show each turn once. A second, web-side cause exists that the design does not cover.
  - The escalation trigger in the design ("validation shows the conversation still merges turns with distinct ids") applies in kind.

## Acceptance-Criteria Proof

| AC | Proven By | Result |
| --- | --- | --- |
| AC-001 | V-R01 (unit), V-01 (stored and live ids on the built server) | Proven |
| AC-002 | V-01 (ids, loaded conversation), V-03, V-04 | **Not met**: unique ids and every reply shown, but the reminder shows twice live (phone, desktop) and after a reload of a live run (desktop) — F-1 |
| AC-003 | V-03 (phone: "07:58 CET" for "06:58 UTC"), V-04 (desktop: "07:42/07:49 CET" for "06:42/06:49 UTC"), component tests | Proven |
| DEC-003 | V-02 | Reported: stored data untouched; new turns continue; old turns of such runs still share `turn_0001` and stay merged in a turn-grouped view |

## Validation Confidence Scorecard (Mandatory)

| Category | Final | Supports | Residual |
| --- | --- | --- | --- |
| Requirement and AC proof | 92% (of the result) | each AC exercised at the real boundary, before and after | — |
| Changed-boundary directness | 95% | built servers, real restarts, production phone bundle, the real app | — |
| Integration realism | 92% | real model on the desktop; scripted model for the repeatable cases | — |
| Environment fidelity | 90% | macOS; the app's own restart | the second desktop restart hit the app's stop budget (load); the reminder still came (the app restarted the server) |
| User surface | 95% | phone and desktop, live and reload, screenshots | — |
| Durable regression coverage | 92% | RR-10, RR-11, MSP-75 (MSP-75 asserts REQ-002 and fails until F-1 is fixed) | RR-11 needs a base build |

- Confidence in the Fail: high. It is reproduced on two surfaces and on base, with the server's frames read directly.

## Broader Validation Decision (Mandatory)

- Executed: `Required`.
  - `Project Desktop Validation`: the isolated app with a real model.
  - The phone probe on the production bundle.
  - Base comparisons.

## Persisted-Data Transition Checks

- Not Affected (format unchanged). RR-11 proves the stored traces of an older run are not rewritten.

## Compatibility / Legacy Scope Check

- None.

## Durable Coverage Changed In The Codebase

| Path | Change |
| --- | --- |
| `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` | RR-10 and RR-11 (with `RESTART_REMINDER_BASE_SERVER_DIR`); helpers `tracesOf`, `conversationOf`, `shownOf`, `restartedTwice`; header updated |
| `autobyteus-web/tests/e2e/mobile-restored-run-cases.mjs` (new), `mobile-shell-probe.mjs` (wired, listed) | MSP-75; fails until F-1 is fixed |

## Temporary Methods And Cleanup

- Base worktree `api526-base-2e9ac1e65b`: removed.
- The frame-order recording in RR-10: reverted. It was restored from a saved copy; no `TEMP` is left.
- Isolated instance: stopped, data root removed.
- Background test processes: killed by the cases.
- A wait loop of mine got stuck on the failed restart; I stopped it.

## Latest Authoritative Result

- Result: `Fail` (F-1).
- Recommended next: the code reviewer's failure-origin review. My classification is `Design Impact` → Solution Designer.
- What passes and stays valid for the next round:
  - AC-001 and AC-003;
  - DEC-003 (reported);
  - the reload-path conversation (RR-10);
  - hidden replies (fixed).
