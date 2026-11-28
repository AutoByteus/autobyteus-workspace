# API/E2E Test Progress

Ticket autobyteus-669 (agent-avatars-669), round 1, code head `950061c296` (review docs `f1d6c89356`). Working root
`/tmp/api669` (mine).

| Time (2026-11-28) | Case | Event | Note |
| --- | --- | --- | --- |
| 16:45 | — | Checkpoint | server build and `build:mobile-web` in the worktree: both exit 0. The installed app from 16:08 is reused (only tests, the probe and docs changed after it) |
| 16:45 | API-001, API-002 | Started | server unit suite, then the web suite (`env -i`, fresh HOME) |
| 16:57 | API-001 | Completed: Pass | server unit: 1117 files passed, 5 skipped; 9308 tests passed |
| 17:02 | API-002 | Completed: Pass (2 base failures) | web: 819 files passed, 2 failed. The demo coverage names `SetUsageLimitSwitchEnabled` (FU-001); the font audit names `NodeRow.vue` line 39 (autobyteus-541 FU-001). Neither file changed on this branch; IMP-002 records both |
| 17:02 | API-004 | Completed: Pass (first run) | new `definition-avatars-github.e2e.test.ts` alone: 2 of 2; one `DEFINITION_AVATAR_IGNORED` line each for the 2 MiB PNG and the text named `avatar.jpg` |
| 17:03 | API-003 | Started | the whole server e2e suite (`pnpm test:e2e`, root). The chain's first try used a wrong script name (exit 254) |
| 17:22 | API-003 | Completed: 5 files failed | 3 Brief Studio files: package not prepared. Terminal: HOME under `/tmp` resolves to `/private/tmp`. Both are my environment (API-003b). AV-02 failed at "a new version" (F-1) |
| 17:23 | API-004 | Checkpoint | F-1 reproduced: the update writes new bytes (a new inode) of the same size with the same whole-second archive time, and the address keeps the old version (1 run in 3 with natural timing) |
| 17:25 | API-004 | Completed: Fail (F-1) | AV-02 pins revision 2's picture to revision 1's time: red 3 of 3. The route answers the old ETag `"99-<mtime>"` with the new bytes, so revalidation gives 304 |
| 17:25 | API-004 | Checkpoint | diagnosis: `ino` and `ctimeMs` added to the hash cache check make AV-02 pass (2 of 2). Source restored; no diff |
| 17:26 | API-005…014 | Started | `definition-avatars-probe.mjs --installed-app …` (with D-002, D-003, P-002, P-003 added) |
| 17:28 | API-005…014 | Completed: 9 Pass, D-003 Fail | D-003: my harness asked for a glyph `T` the probe does not draw. Fixed |
| 17:31 | API-005…014 | Completed: Pass | round 2: 10 of 10 |
| 17:35 | API-005…014 | Completed: Pass | round 3: 10 of 10, with D-003's upload drawn as a distinct picture (`L`, red; `U` gold was also the package's replacement); cleanup clean. Evidence from this round |
| 17:36 | API-015 | Completed: Pass | `mobile-shell-probe.mjs --cases=MSP-121`: the peer row shows the fallback on the phone and the desktop |
| 17:38 | API-015 | Completed: Pass | rerun with the desktop peer row scrolled into view for its screenshot; cleanup clean |
| 17:39 | API-003b | Completed: Pass | `test:integration:prepare`, then the 4 files with HOME `/private/tmp/…`: 4 files, 16 tests passed. The 3 build folders the prepare made were removed |
| 17:40 | — | Checkpoint | server typecheck: production 0; tests at baseline (972 in 299 files), none from the new spec |
