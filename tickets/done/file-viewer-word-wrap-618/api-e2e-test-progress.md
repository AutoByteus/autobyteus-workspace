# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-24T18:24:06Z | builds | Started | | `pnpm -C autobyteus-server-ts build` then `pnpm -C autobyteus-web build:mobile-web`, both under the clean env, at 0f5e844087 code + the MSP-110 edit |
| 2026-11-24T18:25:16Z | builds | Completed | Pass | server build exit 0, `build:mobile-web` exit 0 (logs /tmp/ae618/build-*.log) |
| 2026-11-24T18:25:16Z | AE-001, AE-002 | Started | | `mobile-shell-probe.mjs --cases=MSP-108,MSP-109,MSP-110 --output-dir=/tmp/ae618/run1` under the clean env |
| 2026-11-24T18:28:01Z | AE-001, AE-002 | Completed | Fail | run1: test-side causes. (1) The new highlighting check expected YAML tokens, but `languageDetector.ts` maps `.yaml` to `plaintext` (pre-existing, unchanged by this ticket): the check is now JSON-only and YAML is a follow-up. (2) MSP-110 pressed Escape to close suggestions, which also leaves the maximized (Zen) view (`FileExplorerTabs.vue:321`): now the typed text ends with "." and the run waits for the suggestions to close. Next: run2 |
| 2026-11-24T18:28:01Z | AE-001, AE-002 | Started | | run2, same command, `--output-dir=/tmp/ae618/run2` |
| 2026-11-24T18:30:48Z | AE-001, AE-002 | Completed | Pass | run2: MSP-108 Pass, MSP-110 Pass, MSP-109 Pass; probe Pass; cleanup serversLeft 0, rootRemoved true. Next: report, commit, handoff |
