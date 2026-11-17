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
| 23:56 | — | Checkpoint | | round 2 (IR-002, code 12ecf1bf29): phone bundle rebuilt; container abtest525-desktop up (127.0.0.1:5900) |
| 23:56 | API-11 | Started | | node-525 + live VNC Viewer in host Chrome |
| 23:58 | API-11 | Completed | Pass | 16/16 live layouts fit; keyboard focus; clipboard sheet 360 wide; zh-CN fits |
| 23:58 | API-12 | Started | | emulator booted again (apie2e525_api35, 5650); VNC Viewer at Largest on the device |
| 00:01 | API-12 | Completed | Pass | device Largest 412 and 360 (density 480), View only and Control fit; clipboard sheet 360; cleanup done |
| 00:29 | — | Checkpoint | | round 3 (merged-base rerun, IR-003, HEAD 9b47cb9ab6): plan written; building the new base bundle 3f19d41aa7 |
| 00:32 | API-07 | Started | | round 3: head walks Standard, Largest on the held stack |
| 00:36 | API-07 | Completed | Pass | round 3: 241 matched texts scale 21/17; chip 11→13.59 |
| 00:36 | API-05 | Started | | round 3: base 3f19d41aa7 vs merged head, Standard |
| 00:39 | API-05 | Completed | Pass | round 3: 218/219 same (1 age label re-matched); pixels: ⋮, ages, pulsing running dot, removed Text size |
| 00:39 | API-06 | Started | | round 3: base 3f19d41aa7 → merged head |
| 00:39 | API-06 | Completed | Pass | round 3: stored largest carried over; first screen 19.76 px |
| 00:40 | API-09 | Started | | round 3: pnpm dev of the merged worktree |
| 00:42 | API-09 | Completed | Pass | round 3: 16/18/20 px; stale phone step ignored; dev server stopped |
| 00:42 | API-08 | Started | | round 3: node-525 (run with a message), emulator-5650, container abtest525-desktop |
| 00:45 | API-08 | Completed | Pass | round 3: four steps exact; restart first screen 19.76 px; last frame = Largest |
| 00:45 | API-11 | Started | | round 3 |
| 00:46 | API-11 | Completed | Pass | round 3: 16/16 fit; keyboard; clipboard 360; zh fits |
| 00:46 | API-12 | Started | | round 3 |
| 00:47 | API-12 | Completed | Pass | round 3: device Largest 412/360 fit; cleanup done |
