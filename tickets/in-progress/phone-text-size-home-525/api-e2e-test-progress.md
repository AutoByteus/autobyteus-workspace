# API/E2E Test Progress — phone-text-size-home-525

- Execution coverage report: `api-e2e-execution-coverage-report.md` (same folder)
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 22:44 | API-08 | Started | | AVD apie2e525_api35 emulator-5650 booted; hold stack alpha port 64302; pairing the app |
| 23:00 | API-08 | Completed | Pass | paired, four steps by real taps, restart at Largest; app still paired (emulator kept for later) |
| 23:00 | API-07 | Started | | host Chrome walk, head bundle, Standard then Largest |
| 23:13 | API-07 | Completed | Pass | 241 texts on 14 screens scale 21/17; Monaco 14→17; 11 px chip 11→13.59 |
| 23:13 | API-05 | Started | | swap to base bundle; base Standard walk |
| 23:16 | API-05 | Completed | Pass | 217/217 texts same; pixel diffs only ⋮, ages, removed Text size, icon load timing |
| 23:16 | API-06 | Started | | base bundle → Largest in run ⋮ → swap head → reload |
| 23:23 | API-06 | Completed | Pass | beta.9 Largest carried over; first screen 19.76 px |
| 23:23 | API-09 | Started | | pnpm dev of the worktree, desktop page / |
| 23:25 | API-09 | Completed | Pass | root 16/18/20 px for none/large/extra-large; stale phone step ignored; dev server stopped |
| 23:25 | API-02 | Started | | full web unit suite, background |
| 23:34 | API-02 | Completed | Pass | 765 files, 5743 passed, 2 skipped |
| 23:34 | API-03 | Started | | server typecheck |
| 23:35 | API-03 | Completed | Pass | production 0; tests 1012 in 316 = baseline |
| 23:37 | API-10 | Started | | VNC Viewer bar rebuilt in the production phone page at three steps × two widths |
| 23:39 | API-10 | Completed | Fail | Control mode: full screen right 443 at 412/Largest, 404 at 360/Large, 443 at 360/Largest; View only clean; 360/Standard 4 px over (FU-002) |
