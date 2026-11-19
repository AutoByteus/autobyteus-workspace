# E06 (agy-linked-skills-transport) — is the v1.5.14-beta.1 failure a regression? (Solution Designer, 2026-11-18)

- Same command as the release smoke's Antigravity step: `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs npx vitest run tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts [-t E06] --no-watch`, in two worktrees of my own: v1.5.13 (`f7b4d68711`) and the beta (`3809cdb035`), each after `pnpm install` and `prepare:source`.
- The test and its scripted CLI are unchanged since v1.5.13 (`git diff v1.5.13 HEAD` empty for both files).
- E06 alone, 10 runs each, alternating, load 15–70 (`e06-alone-timing-v1.5.13-vs-beta.txt`): v1.5.13 1.1–31.9 s (mean 16.3 s); beta 3.1–33.8 s (mean 17.9 s). Both pass every time, and both come within about 12 s of E06's own 45 s wait.
- Whole file: v1.5.13 3/3 pass (E06 ~0.75 s); beta 5/5 E06 pass (0.75–18 s); the other failures were model-discovery timeouts (load).
- Delivery's 3 failures (37–44 s) were at loads up to 137; in run 2 the child's workspace creation appears late in the log, so the delegation arrived late, not lost.
- Conclusion: a pre-existing timing margin of E06 (its 45 s wait includes the cold start of the delegated child under load), the same on v1.5.13 and the beta; not a regression of this beta. Follow-up: give E06's wait a margin for the child's cold start, or measure from the child's start (test-only change).
