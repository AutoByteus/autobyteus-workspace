# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-21T10:37:31Z | TF-01..TF-10 | Started | | built-server suite first run (scripted AGY), dist built from 4773d95936 |
| 2026-11-21T10:42:24Z | TF-01..TF-10 | Checkpoint | | run 1: 3 pass, 7 fail; test errors fixed (no restoreAgentTeamRun mutation, expectedRevision, former-member projection reads); real finding kept: run-ID message to a removed member is not refused with the former-member text |
| 2026-11-21T10:47:19Z | TF-01..TF-10 | Checkpoint | | run 2: 5 pass; TF-08/TF-09 failed from the harness env (AUTOBYTEUS_AGENT_PACKAGE_ROOTS='' hid the package after restart), fixed; TF-04 diagnostics added; run 3 next |
| 2026-11-21T10:50:55Z | TF-01..TF-10 | Checkpoint | | run 3: 7 pass; TF-04 was the test's malformed interrupt (no command_id), fixed; TF-02/TF-03 run-ID refusal remains; run 4 next |
| 2026-11-21T10:55:44Z | TF-01..TF-10 | Checkpoint | | run 4: TF-04 passes; server #2 start timed out (passed in run 3): stop/start diagnostics added; run 5 next |
| 2026-11-21T10:59:47Z | TF-01..TF-10 | Completed | Fail | run 5: 8 pass; TF-02, TF-03 fail on the run-ID refusal (real finding); run-4 server start hang not reproduced (recorded) |
| 2026-11-21T11:01:33Z | TFL-01, TFL-02 | Started | | live suite (Codex gpt-6.1-terra + native claude-haiku-5-5), built server |
| 2026-11-21T11:12:58Z | TFL-02 | Checkpoint | | run 2: TFL-01 Pass; TFL-02 command approved and ran but the leaving writer's message did not reach the lead; rerunning TFL-02 alone with diagnostics |
| 2026-11-21T11:21:06Z | TFL-02 | Checkpoint | | run 3: cause found: the writer's send_message_to also asks approval (auto-execute off); test approves each request now; full live run 4 next |
| 2026-11-21T11:22:13Z | TFL-01, TFL-02 | Completed | Pass | run 4: 2/2 |
| 2026-11-21T11:24:05Z | TFU-01..TFU-03 | Started | | rendered probe (built backend + nuxt dev + chromium) |
| 2026-11-21T11:32:55Z | TFU-01..TFU-03 | Checkpoint | | probe run 3: TFU-02 pass; TFU-01 Team tab checked with the wrong member focused (fixed); TFU-03: no Leaving row or tag in the rendered app (TeamMembersPanel is not mounted); run 4 next |
| 2026-11-21T11:34:48Z | TFU-01..TFU-03 | Completed | Fail | probe run 4: TFU-01, TFU-02 Pass; TFU-03 Fail (no Leaving row/tag in the rendered app); evidence/API-TFU/ |
| 2026-11-21T11:35:34Z | API-PEER | Started | | test:integration:prepare then two-server suite with RC-51 |
| 2026-11-21T11:48:06Z | API-PEER | Completed | Pass | 51/51 incl. RC-51 |
| 2026-11-21T11:48:22Z | API-REG | Started | | collaboration-prompt-wording, delegated-team-lazy-member-activation, unclean-shutdown-delegated-team-restore |
| 2026-11-21T11:53:41Z | API-REG | Completed | Pass | 14/14, 2 pass + 1 gated skip, 8/8 |
| 2026-11-21T11:53:41Z | API-TC | Started | | server typecheck |
| 2026-11-21T12:02:07Z | API-TC | Completed | Pass | after a type-only fix of the new suite's stopServer parameter |
| 2026-11-21T12:04:36Z | API-FS | Started | | fresh clone of 443f1c2c0f, install, build:electron:linux:arm64 + verify steps (background), log /tmp/tf-fs.log |
| 2026-11-21T12:56:38Z | API-FS | Checkpoint | | attempt 2 (all job steps parsed from the workflow) stopped: units step fails as root ('Trusted login home required', uid 0 refused by design); continuation interrupted by the app crash at 12:48; attempt 3: fresh clone, every step, units step recorded not fatal |
| 2026-11-21T13:03:39Z | API-FS | Checkpoint | | attempt 3: packaging stopped at go build (GOTOOLCHAIN=local, host go 1.22.2); attempt 4 puts go1.27.4 on PATH as setup-go does |
| 2026-11-21T13:12:01Z | API-FS | Completed | Pass | attempt 4: build, sign, packaged startup pass; units step root-limited (27 node tests); verify needed libz.so provided (FU-004); clone removed |
