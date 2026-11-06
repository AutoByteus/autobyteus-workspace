# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-06 | API-00 | Started | — | route.fetch header measurement + Chrome host mapping, /tmp/abx403-api-e2e/route-probe |
| 2026-11-06 | API-00 | Completed | Pass | Rewrite forwards `Origin: http://192.168.77.10:<p>` with `Host: 127.0.0.1:<p>`; Host override works; Chrome MAP keeps Host/Origin on HTTP and WS |
| 22:01Z | API-01 | Started | — | full server e2e, env -i, temp HOME; log /tmp/abx403-api-e2e/API-01-server-e2e.log |
| 22:14Z | API-01 | Completed | Fail (out of scope) | 4 failed / 489 passed / 586 skipped, 235 files. All 4 are base failures unrelated to the gate (FU-004); AR-14 fails alone and on base src. Every gate-crossing suite passed |
| 22:20Z | API-02 | Started | — | mobile-shell probe at HEAD (the unmodified file from git), --cases=MSP-01 |
| 22:18Z | API-02 | Completed | Fail (expected: harness) | pairing never shows; alpha refused the phone's assets with REMOTE_ACCESS_ORIGIN_REFUSED, origin http://192.168.77.10:<p>, Host rewritten |
| 22:18Z | API-03 | Started | — | updated mobile-shell probe, all cases, /tmp/abx403-api-e2e/API-03/out |
| 22:25Z | API-03 | Completed | Pass | 15/15 MSP cases, 0 unknown browser errors; only MSP-13's intended AUTH_INVALID/DEVICE_REVOKED refusals in alpha log; cleanup ok |
| 22:25Z | API-04 | Started | — | phone origins probe (hold stack, chrome-lan, chrome-tailscale, webkit-tailscale), /tmp/abx403-api-e2e/API-04 |
| 22:53Z | API-04 | Completed | Pass | 3 journeys × 9 steps pass; WS 101 with phone origins; 0 node refusals; ASM-002 none outside list; WebKit console lines = proxy-refused Iconify hosts + known localhost:8000 (cause recorded) |
| 22:53Z | API-05 | Started | — | remote-runs-in-tree probe, /tmp/abx403-api-e2e/API-05/out |
| 22:55Z | API-05 | Completed | Pass | RTP-01..07 pass (liveAnswer true from beta); 0 refusal lines on alpha and beta |
| 22:55Z | API-06/07 | Started | — | browser attack + Host-rewriting gateway, /tmp/abx403-api-e2e/API-06 |
| 22:57Z | API-06/07 | Completed | Pass | attempt 1 failed only on my own log filter (banner line counted); rerun Pass: 7 refusal lines, no foreign effects; gateway refused without setting, allowed with it |
| 22:57Z | API-08 | Started | — | docker buildx server-package (linux/arm64) → /tmp/abx403-api-e2e/server-package |
| 23:00Z | API-08 | Checkpoint | — | Docker node abx403-api-e2e-node up on 127.0.0.1:57310 with the worktree server package (evil POST 403, plain POST 200); starting isolated-app start --build |
| 23:05Z | API-08 | Checkpoint | — | isolated instance iso-58042-7c90 up (control 58042, backend 58043); recorder attached |
| 23:12Z | API-08 | Checkpoint | — | instance .env: scripted AGY (linked_skills), ENABLE_APPLICATIONS=true, restarted; Docker node recreated with AGY_FAKE_CASE=linked_skills and re-seeded |
| 23:20Z | API-08 | Completed | Pass | embedded + Docker: run stream, terminal, files live; Brief Studio iframe WS connected; VNC Connected; 13 WS routes file:// → 101; HTTP no Origin, no errors; 0 refusals in 3 logs |
| 23:24Z | cleanup | Completed | — | instance stopped (data root removed, list empty); container removed; temp builds removed; no probe processes |
