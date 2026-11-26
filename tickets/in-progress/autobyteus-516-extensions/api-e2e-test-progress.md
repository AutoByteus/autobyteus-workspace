# API/E2E Test Progress — autobyteus-516

Your own progress log while tests run. Read it first whenever you pick the run back up, or are unsure what has already run. Only add rows; never change earlier ones.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)
- Evidence folder: `evidence/api-e2e/`; temporary probe scripts: `probes/api-e2e/`

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-26 16:59:35 | API-01 | Started | — | whole server E2E, env -i, fresh HOME; log /tmp/516-api-01-e2e.log |
| 2026-11-26 17:22:24 | API-01 | Completed | Pass | 128 files passed, 175 skipped (gated); 575 tests passed |
| 2026-11-26 17:22:35 | API-08 | Checkpoint | — | building the packaged desktop (pnpm build:electron:mac) for API-06/API-08…API-13; log /tmp/516-api-electron-build.log |
| 2026-11-26 17:28:24 | API-06 | Started | — | pnpm -C autobyteus-web test:e2e:electron |
| 2026-11-26 17:40:20 | API-06 | Completed | Pass | test:e2e:electron ready exit 0; :isolation probe passed |
| 2026-11-26 17:40:26 | API-12 | Checkpoint | — | docker buildx server-package linux/arm64 → /tmp/516-api-docker-pkg; log /tmp/516-api-docker-build.log |
| 2026-11-26 17:43:36 | API-08 | Started | — | isolated-app start --from-worktree --data-root /private/tmp/516-api-iso-a (old install present) |
| 2026-11-26 17:44:39 | API-10 | Started | — | packaged Install of Voice Input (iso-56338-577d, control 56338) |
| 2026-11-26 17:46:25 | API-10 | Checkpoint | — | install done 101 s, On; next page check + Test |
| 2026-11-26 17:46:54 | API-10 | Completed | Pass | install 101 s → On; page 0.3.2, language en saved, refused []; Test 360 ms transcript ok; log readable |
| 2026-11-26 17:46:59 | API-08 | Completed | Pass | old folder deleted at start 1 (log), start 2 no deletion line, Not installed → Install works (API-10) |
| 2026-11-26 17:46:59 | API-11 | Started | — | packaged Update 1.0.0→1.0.1, then broken 1.0.2 |
| 2026-11-26 17:48:59 | API-11 | Completed | Pass | 1.0.1: On, en kept, 1 worker, Test ok; 1.0.2: 'Update to 1.0.2 failed: … HTTP 404', 1.0.1 stays, Update offered, Test ok |
| 2026-11-26 17:49:06 | API-09 | Started | — | isolated-app start on /private/tmp/516-api-iso-b (locked old install) |
| 2026-11-26 17:50:00 | API-09 | Completed | Pass | EACCES warning logged, health 200, page loads; next start removed it |
| 2026-11-26 17:50:36 | API-12 | Started | — | Docker node autobyteus-516-api-e2e 127.0.0.1:57499; add to packaged instance iso-56338-577d |
| 2026-11-26 17:51:45 | API-13 | Started | — | Docker window dictation via Memory search |
| 2026-11-26 17:56:54 | API-13 | Completed | Pass | dictation in Docker window → embedded node, text inserted; Off: focus listener re-read hides button; surface reopen; stale press → 409 EXTENSION_OFF hides; OS focus delivery not drivable (recorded) |
| 2026-11-26 17:57:16 | API-12 | Completed | Pass | Docker window: own list, no Voice Input + voice note, linux-arm64 not available; install/page/remove on container; Failed card contained; restart ok; no-credential 401 |
| 2026-11-26 17:57:52 | API-14 | Started | — | after median 218 ms done; before (base service, runtime 0.3.0) installing in /tmp/516-api-qr002/run-030 |
| 2026-11-26 18:00:20 | API-14 | Completed | Pass | warm median before 202 ms (0.3.0), after 218 ms (+16 ms); worker alone 208/208 |
| 2026-11-26 18:01:13 | API-04 | Started | — | pnpm -C autobyteus-web test:e2e:extensions-page --extensions-repo=… --skip-server-build --output-dir=/tmp/516-api-04 (server dist built at start of round) |
| 2026-11-26 18:06:19 | API-04 | Checkpoint | — | run 1: R1-R8 Pass, U1/U2 Fail in probe helper (settings section collapsed after reload; update itself succeeded per U1-failure.png); fixed recordTest; run 2 to /tmp/516-api-04b |
| 2026-11-26 18:10:07 | API-04 | Completed | Pass | run 2: 10/10 incl. U1, U2; browserErrors [], refusedRequests [] |
| 2026-11-26 18:10:12 | API-02 | Started | — | test:e2e:composer-voice-lifetime --output-dir /tmp/516-api-02 |
| 2026-11-26 18:14:45 | API-02 | Checkpoint | — | run 1 Fail B-001: stale fixture (window-start GetExtensions read in flight before the fixture's fetch stub; Apollo dedup). Fixed: probe route answers GetExtensions; run 2 → /tmp/516-api-02b |
| 2026-11-26 18:15:15 | API-02 | Completed | Pass | run 2: B-001…B-007 Pass after the stale-fixture fix |
| 2026-11-26 18:15:28 | API-03 | Started | — | test:e2e:projects --voice-input --skip-server-build --output-dir=/tmp/516-api-03 |
| 2026-11-26 18:26:45 | API-03 | Checkpoint | — | run 1 Fail: PT-E2E-005 stale since autobyteus-workspace-6 (localized attach text) → 006-011 cascade; B-001…006 microphone denied by PT-E2E-017 clipboard-only grant (diag run /tmp/516-api-03-diag, reverted). Baseline fixes applied; run 2 → /tmp/516-api-03b |
| 2026-11-26 18:34:15 | API-03 | Checkpoint | — | run 3 (/tmp/516-api-03c): PT all but 017 Pass; B-002+ fail: GetExtensions stub installed after page load loses to the in-flight window-start read (Apollo dedup), cascades. Stub moved to the network; run 4 → /tmp/516-api-03d |
| 2026-11-26 18:38:47 | API-03 | Completed | Pass | run 5: 23/23 (PT-E2E-001…017, B-001…006) after 3 baseline fixes + network stub; PT-E2E-017 one load failure → FU-004 |
| 2026-11-26 18:39:56 | API-15 | Started | — | release:test run 45869596069 on codex/autobyteus-516-extensions @ 75eab7845a |
| 2026-11-26 18:39:56 | API-05 | Started | — | fresh clone /tmp/516-api-05/clone @ 75eab7845a; log /tmp/516-api-05/build.log |
| 2026-11-26 18:47:49 | API-05 | Completed | Pass | frozen install, build:electron:mac exit 0 (typecheck PASS), Prisma + terminal runtime verify PASS |
| 2026-11-26 18:48:26 | API-07 | Started | — | mobileBuildChecks spec, prepare-demo-web.sh --build, build:mobile-web; log /tmp/516-api-07.log |
| 2026-11-26 18:49:37 | API-07 | Completed | Pass | spec 8/8; 'The demo answers all 261 compiled operations'; phone bundle rebuilt |
| 2026-11-26 19:11:51 | API-15 | Completed | Pass | run 45869596069 success: Linux x64, Linux ARM64, Windows x64, macOS ARM64, macOS Intel x64 |
