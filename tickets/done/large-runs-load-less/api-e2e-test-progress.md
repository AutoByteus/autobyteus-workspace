# API/E2E Test Progress

Read it first whenever you pick the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-01T12:26:56Z | API-01, API-02 | Completed | Pass | Reused IMP-12/IMP-13 and IMP-10/IMP-11 (windows checked with git diff --name-only) |
| 2026-11-01T12:33:53Z | API-03..API-06 | Started | | pnpm -C autobyteus-web test:e2e:large-runs-load-less --output-dir /tmp/ab358e2e/LRL-r1 (head f4e7b1d13b + probe files; load 3.34 5.99 12.65) |
| 2026-11-01T12:39:22Z | API-03..API-06 | Checkpoint | | r1: LRL-002/003 Pass; LRL-001 and LRL-004 failed on probe-side assertions (participant count window; phone click overlap); fixed; r2 started |
| 2026-11-01T12:46:22Z | API-03..API-06 | Completed | Pass | r3 (final): LRL-001..004 Pass; Team open 1 member pair; Org open 0, writer 1 pair; live merge + reconnect once each; damaged log unavailable w/ reason desktop+phone, restore refused w/ reason (UI silent: console only, pre-existing composer path) |
| 2026-11-01T12:46:22Z | API-07/08 | Started | | large-hub seed --teams 12 --unrelated 50, then --live --large-shape unbroken |
| 2026-11-01T12:53:26Z | API-07/08 | Checkpoint | | hub-live r1 stopped at L-004: probe used removed isChildHydrated (drift) -> fixed (reads MemberLoader); r2 |
| 2026-11-01T12:53:26Z | API-07 | Completed | Pass | L-010 unbroken: 179 ms; 40 long blocks with class, 0 overflowing, whole 60 KB block selected+copied, find-in-page true, distance from bottom 0 |
| 2026-11-01T12:53:26Z | API-08 | Completed | Fail | S, S-ROWS, L-001..L-011 Pass, but a running hub's participant lists are re-read on every context publish: hub click = 2 hub list reads (first abandoned 51 ms in); each new delegation re-reads every loaded list (hub's whole log) - see API-08-hub-participant-reloads.log |
| 2026-11-01T14:25:05Z | round 2 | Started | | code 99cd853f79 (IR-004, IR-005), head feb69a02a3; rebuild server dist |
| 2026-11-01T14:25:32Z | API-03..API-06, API-09 | Started | | LRL-001..005 on the rebuilt head; out /tmp/ab358e2e/r2-LRL |
| 2026-11-01T14:29:31Z | API-03..API-06, API-09 | Completed | Pass | r2: LRL-001..005 Pass; LRL-005 running Team open 1 fetch, live msg 0, resume 1 reload |
| 2026-11-01T14:29:31Z | API-07, API-08 | Started | | hub probe --from-seed /tmp/ab358e2e/seed --live --large-shape unbroken (L-001/L-002 participant-count assertions) |
| 2026-11-01T14:42:10Z | API-07, API-08 | Completed | API-07 Pass; API-08 Fail | r2: L-001 1 fetch (fixed), S-001 1, L-010 179 ms + display pass; L-002: delegation adding no hub message (62->62) still refetches hub + open copy lists once each (4/4 runs); L-002 now asserts SR-004's 0; FU-006 terminal flake (1/4 runs) |
| 2026-11-01T15:24:31Z | round 3 | Started | | code 65a5b34c9b (IR-006, SR-007/SR-008), head 2b00c20f0a; L-012 added; rebuild server dist |
| 2026-11-01T15:24:48Z | API-07, API-08 | Started | | hub probe --live --large-shape unbroken, out /tmp/ab358e2e/r3-hub |
| 2026-11-01T15:32:47Z | API-07, API-08 | Completed | Pass (cases); probe Fail on FU-006 in 2 of 5 runs | r3: S-001 1, L-001 1, L-002 0 refetch (62->62), L-012 report once, 0 refetch; L-010 pass; FU-006 traced: xterm Viewport.syncScrollArea during L-006 navigation |
| 2026-11-01T15:32:47Z | API-03..06, API-09 | Started | | LRL-001..005 r3 |
| 2026-11-01T15:38:05Z | API-03..06, API-09 | Completed | Pass | r3 LRL-001..005 Pass |
| 2026-11-01T15:38:05Z | round 3 | Completed | Pass | 94%; seed removed |
| 2026-11-01T15:44:54Z | API-04, API-06, API-09 | Started | | CR-T-001 Local Fix: LRL-002/004/005 rerun (--cases LRL-002,LRL-004,LRL-005) |
| 2026-11-01T15:47:44Z | API-04, API-06, API-09 | Completed | Pass | r4: LRL-004 asserts the reason on server, Team tab and phone; resume waits for the restore response; LRL-002 waits for inactive; LRL-005 exactly 1 reload |
| 2026-11-01T16:17:16Z | round 5 (integrated head) | Started | | head add88e6e59 (merge bd79cb1601 of origin/personal 92fffca77a); rebuild server dist; LRL-001..005; hub L-001/L-002/L-012 on a new seed |
| 2026-11-01T16:23:21Z | round 5 | Completed | Pass | LRL-001..005 Pass; hub S-001 1, L-001 1, L-002 0 (62->62), L-012 once/0; no browser errors; seed removed |
