# API/E2E Test Progress — integration-credential-proxy (autobyteus-311)

My progress log while tests run. Read it first whenever the run is picked back up.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-30 | API-R01 | Completed | Pass (reused) | IMP-01…IMP-14 reused: `git diff --name-only 2529eaaec1 b95bad702f` lists only `tickets/` |
| 2026-10-30 09:57 | API-01 | Started | | AGY scripted cells of the new suite, clean env, temp HOME |
| 2026-10-30 10:00 | API-01 | Checkpoint | | ticked and unticked AGY cells passed; team cell failed: members start on first message (no probe in 90 s). Team cell now messages each member; rerunning it alone |
| 2026-10-30 10:01 | API-01 | Completed | Pass | ticked, unticked and team AGY cells pass (team after the fix to message each member) |
| 2026-10-30 10:01 | API-02 | Started | | native cell, LM Studio qwen3.6-35b-a3b, temp HOME |
| 2026-10-30 10:02 | API-02 | Completed | Pass | native cell passed; LM Studio model unloaded |
| 2026-10-30 10:02 | API-03…API-07 | Started | | Claude, Codex workspace-write, Codex full-access, Grok, AGY live cells in one invocation; real HOME/USER/LOGNAME, temp CODEX_HOME |
| 2026-10-30 10:04 | API-03…API-07 | Completed | Pass except API-06 | Claude, Codex workspace-write, Codex full-access and AGY live passed; Grok live refused by xAI 429 subscription:free-usage-exhausted for grok-4.7 (the only model; grok models) |
| 2026-10-30 10:04 | API-06b | Started | | Grok recorded fake CLI cell added (probe in the Grok process env) |
| 2026-10-30 10:05 | API-06b | Completed | Pass | Grok recorded fake CLI cell passed |
| 2026-10-30 10:05 | API-09 | Started | | CODEX_HOME scan fix (realpath); AGY scripted ticked cell with CODEX_HOME = the live run's temp home, which holds the two Codex sessions |
| 2026-10-30 10:06 | API-09 | Checkpoint | | in-suite scans clean in every cell; CODEX_HOME scan fix verified (477 files, 0 with token); CLI transcripts scan clean (evidence API-09-cli-home-token-scan.txt) |
| 2026-10-30 10:06 | API-10 | Started | | server build, test:integration:prepare, then pnpm test:e2e (clean env, background) |
| 2026-10-30 10:24 | API-10 | Completed | Pass for this ticket | 109 files passed, 97 skipped, 9 failed: 8 cannot load (FU-002 syntax error in claude-live-agent-harness.ts) and scoped-org-history (stale expectation after base 47f44c3df6; FU-005). github-integration-graphql passed |
| 2026-10-30 10:24 | API-11 | Started | | isolated-app start --build, owned data root /tmp/s311/desktop-root, throwaway CODEX_HOME |
| 2026-10-30 10:35 | API-11 | Completed | Pass | attempt 1 stopped at the first navigation (renderer went back to #/chat after reload; driver fix); attempt 2 passed every step; instance stopped (forced); scan clean |
| 2026-10-30 10:35 | API-01 | Started | | final run of the scripted cells (AGY ticked, unticked, team; Grok) on the final test file |
| 2026-10-30 10:37 | API-01 | Completed | Pass | final scripted run on the final file: 4 passed |
| 2026-10-30 10:37 | API-12 | Completed | Pass | ticket folder + new tests: 0 files with the token; 0 unmasked passes |
| 2026-10-30 10:37 | API-06 | Started | | Grok live retry (one attempt) |
| 2026-10-30 10:39 | API-06 | Completed | Pass | Grok live retry passed on the final file; its session scanned (no token, marker 3) |
