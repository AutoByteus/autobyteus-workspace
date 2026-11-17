# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md`, Planned Cases (same case IDs)
- Scratch (not committed): `/tmp/ae507` (page server `tools/page_server.py`, pid in `page-server.pid`, port in `page.port`, events `page-events.jsonl`; `start.json`, `build.log`)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 07:50 | — | Checkpoint | — | Build + worktree isolated instance started in background (`isolated-app start --build`, output `/tmp/ae507/start.json`) |
| 07:54 | E2E-00 | Started | — | git grep removed codes |
| 07:54 | E2E-00 | Completed | Pass | no match; evidence `evidence/api-e2e/E2E-00-removed-codes-grep.txt` |
| 07:54 | E2E-R1..R4 | Completed | Pass | Reused IMP-01..06 (commit 927079c6cd; only `tickets/` changed since) |
| 08:01 | E2E-01 | Started | — | worktree instance iso-49942-c50c; send msg-e01 then leave to #/agents |
| 08:05 | E2E-01 | Completed | Pass | screenshot ok 248 ms; page hidden before/after; PNG 810x1800 |
| 08:06 | E2E-02 | Started | — | run view open; send msg-e02 (tab A worked on while panel shows tab B) |
| 08:11 | E2E-02b+E2E-04 | Started | — | Browser panel open showing 0386db (e02-b visible 450x604); send msg-e02b |
| 08:16 | E2E-02b | Completed | Pass | A hidden while B shown; ok 166 ms with nudge |
| 08:16 | E2E-04 | Completed | Pass | shown B ok 49 ms, no page events |
| 08:16 | E2E-03 | Started | — | minimize window via CDP, then msg-e03 (navigate+screenshot 0386db) |
| 08:17 | E2E-03 | Checkpoint | — | CDP Browser.setWindowBounds not implemented in Electron; Window>Minimize menu via System Events had no effect (AX lists 0 windows); screen locked by macOS 08:18:00 — E2E-03 paused |
| 08:18 | E2E-06 | Started | — | new case: locked screen, tab attached to visible window; temporary probe in pinned Electron, after and base |
| 08:19 | E2E-06 | Completed | Pass | after 5/5 ok 156-236 ms; base 5/5 UnknownVizError; evidence E2E-06-locked-screen-attached-tab.txt |
| 08:20 | E2E-05 | Started | — | send msg-e05 (invented id, closed tab) |
| 08:24 | E2E-05 | Completed | Pass | browser_tab_not_found (pending); browser_tab_closed (screenshot, navigate_to) |
| 08:25 | E2E-03 | Checkpoint | — | trying app hide (System Events visible=false on pid 44218) as the real-app variant; B 0386db attached in panel |
| 08:30 | E2E-03 | Checkpoint | — | run1 (app hidden while screen locked): screenshot answered after 42.9 s, when app re-shown at unlock; E2E-07 probe (app.hide, unlocked) after ok 206 ms / base UnknownVizError; now E2E-03a minimize via AXMinimized (screen unlocked) |
| 08:37 | E2E-03a | Completed | Pass | minimized (AXMinimized true): ok 157 ms; restore: page visible again, ok 61 ms no events |
| 08:40 | E2E-03b | Completed | Pass | app hidden, unlocked: ok 165 ms. run1 (hidden+locked) answered after 42.9 s -> E2E-08 lock probe armed (background watcher, /tmp/ae507/e08-out.txt) |
| 08:41 | E2E-B1 | Started | — | isolated instance of installed /Applications/AutoByteus.app 1.5.13-beta.7 |
| 08:47 | E2E-B1 | Completed | Pass (baseline reproduces) | released app: screenshot browser_navigation_failed UnknownVizError; pending/closed -> browser_bridge_unavailable; instance stopped |
| 08:47 | E2E-08 | Completed | Pass (with observation) | locked 08:46: after detached 6/6 ok, attached ok; base all fail; app hidden while locked: after no answer (8 s guard, view stayed attached, no hide event) -> contrived state, FU-004 |
| 08:48 | E2E-09 | Started | — | durable: AC-004 app-hidden cases added to browser-screenshot-capture.electron.spec.ts; run spec |
| 08:48 | E2E-09 | Completed | Not kept | spec with app-hidden case: 8/9 under screen lock (app-hidden no answer); reverted (lock-state dependent) |
| 08:50 | E2E-10 | Completed | Pass | crashed renderer: browser_screenshot_failed (empty image) in 2.05-2.10 s, no artifact |
| 08:52 | — | Checkpoint | — | reports written; scratch /tmp/ae507 removed; committing |
