# API/E2E Test Progress

- Execution coverage report: `tickets/in-progress/node-universal-authentication-437/api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-08T15:53:41Z | API-00 | Started |  | build:electron:mac of b6a57ab154 in background; log evidence/api-e2e/API-00-electron-build.log |
| 2026-11-08T15:54:41Z | API-00 | Completed | Pass | electron-dist/mac-arm64 built from b6a57ab154 (exit 0) |
| 2026-11-08T16:06:01Z | API-01 | Started |  | isolated instance iso-59228-236e, CDP steps |
| 2026-11-08T16:06:01Z | API-01 | Completed | Pass | transcript evidence/api-e2e/API-01-electron/API-01-transcript.txt; instances stopped, data root removed |
| 2026-11-08T16:06:01Z | API-04 | Started |  | /tmp/abtest437/api04.mjs, node on 0.0.0.0 |
| 2026-11-08T16:06:46Z | API-04 | Completed | Pass | second run (first run: probe bugs, wrong network field + non-phone socket; rerun only); evidence/api-e2e/API-04/ |
| 2026-11-08T16:15:22Z | API-02 | Started |  | /tmp/abtest437/api02.sh (launcher part), then Electron |
| 2026-11-08T16:19:23Z | API-14b | Completed | Pass | launcher pytest 61 passed, 2 skipped (pwsh; port 8001 busy) incl. new upgrade --all case |
| 2026-11-08T16:19:23Z | API-02 | Completed | Pass | launcher log + desktop transcript; containers/volumes removed; image abtest437/autobyteus-server:test kept until final cleanup |
| 2026-11-08T16:19:23Z | API-05 | Started |  | test:e2e:remote-run-title |
| 2026-11-08T16:28:04Z | API-05 | Checkpoint | Fail | first run (dev-proxy mode): RRT-01 Pass, window never loaded: /ws upgrades through nuxt dev answered 200, Nuxt restarts (ECONNRESET) -> API-15 |
| 2026-11-08T16:28:04Z | API-15 | Started |  | pnpm dev runner reproduction |
| 2026-11-08T16:28:04Z | API-15 | Completed | Fail | /ws and /graphql upgrades to :3000 answered 200 text/html by Nuxt; 7 Nuxt restarts; window unusable; dev stack stopped |
| 2026-11-08T16:30:22Z | API-05 | Completed | Pass | run3 (browser attachment, header kept on loopback); run1 dev-proxy -> API-15; run2 harness CORS noise |
| 2026-11-08T16:30:22Z | API-06 | Started |  | test:e2e:remote-runs-in-tree |
| 2026-11-08T16:32:17Z | API-06 | Completed | Pass | RTP-01..07 |
| 2026-11-08T16:32:17Z | API-07 | Started |  | test:e2e:model-routing-decisions |
| 2026-11-08T16:34:06Z | API-07 | Completed | Pass | MRD cases all Pass incl. window switched to beta |
| 2026-11-08T16:34:06Z | API-08 | Started |  | test:e2e:node-vocabulary |
| 2026-11-08T16:36:27Z | API-08 | Completed | Fail | NVP-01..04 Pass; NVP-05 Fail: settings GraphQL answers HTTP 503 (statusCode on MemorySyncNotMigratedError) -> card shows 'Received status code 503'; cause in API-08-NVP-05-cause.txt |
| 2026-11-08T16:36:27Z | API-03 | Started |  | test:e2e:mobile-shell |
| 2026-11-08T16:55:59Z | API-03 | Completed | Fail | 19/20 Pass; MSP-08 Fail (rerun alone: Fail): searchFiles aborted by the gate's async preValidation hook; cause in API-03-MSP-08-cause.txt |
| 2026-11-08T16:55:59Z | API-12 | Completed | Pass | pwsh 7.6.9 in alpine: parse + CLI contract tests |
| 2026-11-08T16:56:05Z | API-09 | Started |  | test:e2e:remote-nodes-page |
| 2026-11-08T17:03:30Z | API-09 | Completed | Pass | run3: NP-01..13 Pass (run1: stale epsilon expectation + probe variable; run2: NP-07 naming race outcome changed by pairing exchange) |
| 2026-11-08T17:03:42Z | API-10 | Started |  | test:e2e:nodes-docker-address --docker-image=abtest437/autobyteus-server:test |
| 2026-11-08T17:06:08Z | API-10 | Completed | Pass | run2 ND-01..05 Pass (run1: stale address assertion, M-9 picks the invite's first candidate) |
| 2026-11-08T17:06:08Z | API-11 | Started |  | nginx gateway probe |
| 2026-11-08T17:06:23Z | API-11 | Completed | Pass | nginx 1.30 prefix-stripping gateway; evidence/api-e2e/API-11-gateway/ |
| 2026-11-08T17:06:35Z | API-13 | Started |  | three built-server suites, clean env |
| 2026-11-08T17:07:29Z | API-13 | Completed | Pass | 3 files, 15 tests |
| 2026-11-08T17:10:51Z | API-FS | Completed | Not Tested | deferred to the fix round (F-1 fix changes nuxt.config.ts) |
| 2026-11-08T17:10:51Z | API-16 | Completed | Not Tested | 36 other probes not moved to the fixture this round |
| 2026-11-08T17:10:51Z | cleanup | Completed |  | test image, scratch, worktree removed; no instance, no abtest437 container |
| 2026-11-08T17:46:17Z | round 2 | Started |  | CRR-004 Pass on IR-003, HEAD 32e9ad944c; plan in the investigation's Round 2 rerun plan |
| 2026-11-08T17:46:17Z | API-00 | Started |  | round 2 rebuild build:electron:mac at 32e9ad944c |
| 2026-11-08T17:52:24Z | API-00 | Completed | Pass | round 2 build at 32e9ad944c |
| 2026-11-08T17:52:24Z | API-01 | Started |  | round 2 partial: files search in the app window |
| 2026-11-08T17:53:41Z | API-01 | Completed | Pass | round 2: searchFiles 200 [src/app-437.ts] in the app window; terminal env 0 |
| 2026-11-08T17:53:41Z | API-15 | Started |  | round 2: real pnpm dev window |
| 2026-11-08T17:55:23Z | API-15 | Completed | Pass | round 2: upgrades 101, window sockets 101, 0 restarts |
| 2026-11-08T17:55:23Z | API-03 | Started |  | round 2: build:mobile-web then mobile-shell |
| 2026-11-08T17:55:46Z | API-03 | Started |  | round 2: test:e2e:mobile-shell |
| 2026-11-08T18:05:46Z | API-03 | Completed | Pass | exit 0; mobile-shell probe: Pass |
| 2026-11-08T18:05:46Z | API-08 | Started |  | round 2: test:e2e:node-vocabulary |
| 2026-11-08T18:06:52Z | API-08 | Completed | Pass | exit 0; [probe] result Pass; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/tickets/in-progress/node-un |
| 2026-11-08T18:06:52Z | API-05 | Started |  | round 2: test:e2e:remote-run-title |
| 2026-11-08T18:07:55Z | API-05 | Completed | Pass | exit 0; remote-run-title probe: Pass |
| 2026-11-08T18:07:55Z | API-06 | Started |  | round 2: test:e2e:remote-runs-in-tree |
| 2026-11-08T18:09:45Z | API-06 | Completed | Pass | exit 0; remote-runs-in-tree probe: Pass |
| 2026-11-08T18:09:45Z | API-07 | Started |  | round 2: test:e2e:model-routing-decisions |
| 2026-11-08T18:11:29Z | API-07 | Completed | Pass | exit 0; Model Routing decisions probe: Pass → /Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/tickets/in-progre |
| 2026-11-08T18:11:29Z | API-09 | Started |  | round 2: test:e2e:remote-nodes-page |
| 2026-11-08T18:13:25Z | API-09 | Completed | Pass | exit 0; remote-nodes-page probe: Pass |
| 2026-11-08T18:13:39Z | API-10 | Started |  | round 2: server package build for the test image |
| 2026-11-08T18:18:15Z | API-10 | Completed | Pass | round 2: ND-01..05 with the rebuilt test image |
| 2026-11-08T18:18:15Z | API-16 | Started |  | runner /tmp/abtest437r2/run-probes.sh, 26 probes; ledger evidence/api-e2e/API-16-probes/API-16-ledger.md |
| 2026-11-08T19:39:17Z | API-16 | Checkpoint |  | 26 run + reruns; open: internal-agents IP-03, memory-search 030, runtime-switch RSW-01, github-skill-sources WEB-002, run-history-read-budget RB-B1/B2 (load ~90) -> base comparison |
| 2026-11-08T19:39:17Z | API-16-base | Started |  | base b690a5dfdb worktree build for comparison |
| 2026-11-08T19:54:09Z | API-16 | Completed | Pass | all migrated deterministic probes pass or fail identically on base (FU-003 SIR-002, FU-004 IP-03/RSW-01/WEB-002); fixed in tests: agent-org-role-labels selector, LRL socket, memory-search wait |
| 2026-11-08T19:54:09Z | API-FS | Started |  | fresh clone of d115fd9c71 |
| 2026-11-08T20:04:29Z | API-FS | Completed | Pass | fresh clone of d115fd9c71: install, typecheck, build, prisma and terminal-runtime verify all exit 0 |
| 2026-11-08T20:04:29Z | cleanup | Completed |  | test image, scratch, base worktree, fresh clone removed; no instance; no abtest437 container |
