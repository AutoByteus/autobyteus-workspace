# API/E2E Revision Record — node-vocabulary (autobyteus-290)

| Revision | Trigger | Code validated | Investigation round | Result | Durable coverage | Key evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API-REV-001 | CRR-002 pass of IR-002 (Large / High) | `127fc4806e` (handoff `260df99337`); tests `383b1500a2` | 1 | **Pass**, 95%. Prior result: N/A. Every stored-name migration proven on its real start (server incl. a real released-build upgrade, desktop, browser, phone web shell, iOS, Android); hold-backs stated and recovered; two-server E2E 37/37; clean clone. Open: RC-12 timed out once in six runs, cause not found (FU-007). Outside this ticket: FU-004, FU-005, FU-006 | new `node-vocabulary-stored-names-startup.e2e.test.ts`, new `node-vocabulary-probe.mjs` (+ script), RC-26 extended; baseline fixes in three probes (`b631d63023`) | `API-01-run2/`, `API-03-run3.log`, `API-04/`, `API-05-run4/`, `API-07/`, `API-08/`, `API-10-clean-clone.log` | Code reviewer: test-code review |

## API-REV-001 notes

- RC-12 diagnostics (step timings, a fetch watchdog) were temporary, used only on the worktree, and reverted before the commits.
- API-03 runs 1–2 and API-05 runs 1–3 failed on my tests or the probe harness; the progress log lists each cause.
