# Progress log
| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-18 13:10 | API-01 | Started | | BTS-03 extended (view after exit) |
| 2026-11-18 13:12 | API-01 | Completed | Pass | BTS-03 view: failed exitCode 3; negative control with base monitor: [] (fails) |
| 2026-11-18 13:12 | API-03 | Started | | run-fu002-base-vs-branch.sh → evidence/API-03-fu002-base-vs-branch.log (load ~60, fseventsd 135%) |
| 2026-11-18 13:38 | API-03 | Completed | Pass (as refined) | base 18 failed (load ~60) vs branch 7 (load rising to 146); alone (load 70–120): folder-watcher unit 4 and file-system-watcher 5 = events not within 30 s (FU-001, FU-003, new FU-004) |
| 2026-11-18 13:38 | API-05 | Started | | server + web typecheck |
| 2026-11-18 13:40 | API-05 | Completed | Pass | both at baseline |
| 2026-11-18 13:40 | API-02 | Started | | server build + build:mobile-web + mobile-shell MSP-47,48,49,59,78 |
| 2026-11-18 13:45 | API-02 | Completed | Pass | MSP-47,48,49,59,78 pass |
| 2026-11-18 13:46 | — | Completed | Pass | round result Pass 95.1%; commits; handoff to /delivery_engineer |
