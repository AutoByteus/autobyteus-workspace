# Investigation Notes

- Package `e06-delegation-wait-margin`; worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/e06-delegation-wait-margin`, branch `codex/e06-delegation-wait-margin`, base `origin/personal` `53b72018ad`; target `origin/personal`.
- Authorities read: requirements-engineering.md, ticket-scope.md, finding-the-cause.md, architecture-design.md, design-principles.md, DESIGN.md (2026-11-18).
- Source: `autobyteus-server-ts/tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts`:
  - `until(…, ms = 30_000)` at line 134;
  - E06 at lines 341–388: `until(frames, "delegation result", …)` with the default 30 s at line 377; the child-launch deadline `Date.now() + 30_000` at line 382; the test limit `90_000` at line 388.
- Test and fixture unchanged since v1.5.13 (`git diff v1.5.13 HEAD` empty).
- Measured (Reproduced/Measured; `evidence/e06-alone-timing-v1.5.13-vs-beta.txt`, `evidence/summary.md`): E06 alone, 10 runs each, alternating, load 15–70: v1.5.13 1.1–31.9 s, beta 3.1–33.8 s, all pass. Delivery's beta runs failed 3/3 at 37–44 s (load up to 137); in run 2 the child's workspace creation shows up late in the log (late, not lost).
- Reproduction for implementation: the whole-file command in the requirements (AC-001).
