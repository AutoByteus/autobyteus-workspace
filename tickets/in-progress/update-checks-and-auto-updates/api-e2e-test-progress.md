# API/E2E Test Progress

Working log while tests run. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-23 (setup) | (build) | Completed | — | build:electron:mac at 48fe98d65d (code 985246c53b), exit 0; /tmp/a210/build.log |
| 2026-10-23 (setup) | (inventory) | Completed | — | 8 existing suites run read-only; 6 stale (stubs), 2 skipped; /tmp/a210/inv-*.log |
| 2026-10-23 23:13 | API-30 | Started | — | instance A first start on /private/tmp/a210/rootA (import step) |
| 2026-10-23 23:17 | API-30 | Completed | Pass | first tick 21:15:58: package, skill, 4 runtime notifications; REST used 4 = imports only; nothing updated |
| 2026-10-23 23:17 | API-34 | Started | — | app interval 15 min saved 21:17; 1.6.0 published 21:17; expect periodic check ~21:29:37 |
| 2026-10-23 23:17 | API-31 | Started | — | package switch in the panel: Cancel, then Confirm |
| 2026-10-23 23:18 | API-31 | Completed | Pass | Cancel → off; Turn on 21:17:53 → AUTO_UPDATED d705e9a at 21:18:00, compare link, entry '1 updated automatically' |
| 2026-10-23 23:18 | API-32 | Started | — | local edit + added file; skill switch on in the card |
| 2026-10-23 23:19 | API-32 | Completed | Pass | skill on in card 21:18:45 → AUTO_UPDATED 8c307f3 at 21:19:01; edit and added file gone; panel shows both switches on |
| 2026-10-23 23:19 | API-33 | Started | — | runtimes: running Codex agent, manual Update, runtime switch |
| 2026-10-23 23:27 | API-33 | Completed | Pass | blocked Update aria-disabled 50% no-op; agy manual → Updated to 1.5.0; grok manual failure + Try again; runtime auto on 21:21:14 → codex AUTO_WAITING (read kept), claude/grok AUTO_FAILED; agent ended 21:23:51 → codex AUTO_UPDATED 0.164.0 21:24:04 |
| 2026-10-23 23:29 | API-34 | Completed | Pass | periodic check 21:29:37.455 (15:00 after launch) found 1.6.0; Settings → Updates 'Update available'; panel app row |
| 2026-10-23 23:30 | API-35 | Started | — | app check off, stop, gate file web wait, start |
| 2026-10-23 23:30 | API-36 | Started | — | card banner on A3 iso-60666-dc1f |
| 2026-10-23 23:32 | API-35 | Completed | Pass | off: no launch request 2+ min after start, 0 updater lines, 'Automatic checks are off'/'Never'; manual Check for Updates → 1 request, 'Update available' |
| 2026-10-23 23:32 | API-36 | Completed | Pass | card banner 'GitHub asked this node to wait until Sat 01:30 AM.' from the node's persisted web wait |
| 2026-10-23 23:34 | API-37 | Started | — | remote node R (standalone dist, no embedded flag) in a desktop window of A3 |
| 2026-10-23 23:40 | API-37 | Completed | Pass | R desktopEmbeddedNode false; R window card has no runtime switch/interval/contact line; R ran no update-check commands in 6 min |
| 2026-10-23 23:41 | API-01e | Started | — | harness Codex redirect; agent-runtimes-graphql |
| 2026-10-23 23:42 | API-01a-d | Started | — | four GitHub suites with the head-read stub |
| 2026-10-23 23:44 | API-01a-e | Completed | Pass | after stub updates (head read, Codex redirect, 40-hex fixture SHAs): 29/29, 9/9, 8/8, 8+2 skipped, 13/13 |
| 2026-10-23 23:44 | API-01f | Started | — | test:integration:prepare (background) |
| 2026-10-23 23:55 | API-01f | Completed | Pass | RA-04 race pre-existing (base 2/5, same timeout): test re-presses Check; 6/6 pass after fix |
| 2026-10-23 23:55 | API-02..12 | Started | — | rewrite update-notifications-live to SR-005 |
| 2026-10-24 00:02 | API-02..12,17,18 | Completed | Pass | 12/12 ×3 runs; mutation (pass ignores the switch) fails 10 cases |
| 2026-10-24 00:03 | API-20..22 | Started | — | new agent-runtime-update-notifications E2E |
| 2026-10-24 00:10 | API-20..22 | Completed | Pass | 3/3 ×6 after deterministic first tick; mutation (agents ignored) fails API-21/22 |
| 2026-10-24 00:12 | API-13 | Completed | Pass | 8 files 86 passed 2 skipped |
| 2026-10-24 00:14 | (handoff) | Completed | Pass | reports written; commits 821563587d, baff097813, 5faba271f5 + docs |
