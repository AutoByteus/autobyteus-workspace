# API/E2E Test Progress — runtime-lifecycle-review

Working log. `Started` before a case, `Completed` with its result right after.

| Time (UTC) | Case ID | Event | Result / Note |
| --- | --- | --- | --- |
| 2026-10-20 | API-00 | Started | `test:integration:prepare` |
| 2026-10-20 | API-00 | Completed | Pass — `Integration test prerequisites are present.`, `EXIT 0` |
| 2026-10-20 | API-02 | Started | real CLI signed-out shapes, empty temp HOME |
| 2026-10-20 | API-02 | Completed | Pass — shapes recorded |
| 2026-10-20 | API-01 | Started | `test:integration` (background) |
| 2026-10-20 | API-01 | Completed | Pass — `Test Files  78 passed | 20 skipped (98)`, `Tests  419 passed | 70 skipped (489)`, EXIT 0 |
| 2026-10-20 | API-10 | Started | first run of agent-runtimes-graphql.e2e |
| 2026-10-20 | API-10 | Completed | Pass — `Tests  12 passed (12)`, AR-11 `hits 0` (3 runs) |
| 2026-10-20 | API-11 | Started | running-agents + readiness e2e |
| 2026-10-20 | API-11 | Completed | Pass — `Tests  4 passed (4)`, EXIT 0 (2 runs) |
| 2026-10-20 | API-20 | Started | browser probe run 1 |
| 2026-10-20 | API-20 | Completed | Pass — 10/10 ARP cases, browserErrors 0, cleanup removed (runs 2 and 3; run 1 had 3 probe-assertion bugs, fixed) |
| 2026-10-20 | API-10 | Started | rerun after fixture changes (Claude SDK handshake, Codex turn/interrupt) |
| 2026-10-20 | API-10 | Completed | Pass rerun with final fixture — `Tests  12 passed (12)`, `hits 0` |
| 2026-10-20 | API-21 | Completed | Pass — 3 web guards EXIT 0 |
| 2026-10-20 | API-30 | Completed | Not Tested — would read the user's real runtime accounts (design: never in automated tests); delivery/user check |
| 2026-10-20 | API-12 | Started | temporary: real CLIs signed out + real sources |
| 2026-10-20 | API-12 | Completed | Pass — real installs: versions = own --version, 4× SIGNED_OUT, sources answered; temp file removed |
| 2026-10-20 | — | Note | durable tests committed in 76570a40e4; reports written |
