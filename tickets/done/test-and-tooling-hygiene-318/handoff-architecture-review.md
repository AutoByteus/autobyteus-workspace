# Handoff — autobyteus-318 → Architecture Review

- Result: `Architecture Design Complete`; `task_size = Large`, `architectural_risk = Low`.
- Route: the handoff rule for `task_size=Large` → `/software_engineering_team/architecture_reviewer` (rules read 2026-11-01).
- Package: `test-and-tooling-hygiene-318`, SR-002 (resolves ARCH-REV-001; SR-001 was the first round).
- Task: autobyteus-318 in project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`.
  - Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
  - Merged into it: 12 older Tasks (autobyteus-59, 103, 104, 112, 115, 116, 148, 220, 225, 237, 239, 257).
  - Plus comment items from 311, 331, 316, 343, 355 and 357.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-318`.
  - Branch: `codex/test-and-tooling-hygiene-318`.
  - Base: `origin/personal` `efd28d5c4a`; finalization target: `origin/personal`.
  - No commits yet; the ticket documents are untracked in the ticket folder.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-and-tooling-hygiene-318/tickets/in-progress/test-and-tooling-hygiene-318/`

## Original request (summary)

The second test and tooling hygiene round:
- burn down the web type-check baseline by area, largest first;
- type-check the three web tests that import server code;
- remove the unused transcription URL and `@nuxtjs/apollo`;
- fix the Electron download race;
- update the stale `openStreamingSession` call and docs line;
- fix the watcher timing from its cause;
- fix every merged item that is still true, and report the fixed or obsolete ones with evidence.

Constraints:
- test data and the test vault only;
- no paid live suites without the user's approval (list them);
- keep the type gate in the pipeline;
- prove from a clean clone;
- no release;
- parallel teams (345, 357, 358, 285, 337, 355): keep to this area and resolve merge conflicts.

## Approval basis

- Requirements: `Approved` by the Solution Designer within the direction; the user was informed on 2026-11-01. There are no `Needs user` decisions.
- Dropping items: the PM's message of 2026-11-01 (the user's addition) gives that decision to the Solution Designer.
- Design approval by the user: not required.

## What to review

- **`design-spec.md`:**
  - the shared gate under root `scripts/typecheck-gate/` (rules plus runner; per-package configuration);
  - the server test type check (`tsconfig.tests.json` on the build policy, shrink-only baseline, inside `pnpm -C autobyteus-server-ts typecheck`), which replaces the one-off `typecheck:claude-interrupt-resume-e2e`;
  - the web cross-package tests project;
  - the Electron `globalSetup`;
  - the probe output-dir helper;
  - the per-item test changes.
- **`requirements-doc.md`:** REQ-001..REQ-016 and DEC-001..DEC-012. Note DEC-003 (server test gate, from autobyteus-225), DEC-002 (baseline areas: components, services, stores) and DEC-006 (failures seen only under host overload are dropped, with their cause).
- **`investigation-notes.md`:** the triage table T-01..T-56, with evidence and how each finding was established; also the list of live suites that would spend credits or plan quota.

## Evidence

- `evidence/SD-01-server-tests-typecheck-build-policy.txt`: 1,316 server test type errors under the build policy; `src` has 0.
- `evidence/SD-02-web-cross-package-project.txt`: 4 errors for the three tests in their own project.

## Open items (investigation-first, for implementation)

- U-01: file-watcher latency under the full integration suite.
- U-02: the second failure in `context-file-storage-runtime`.
- U-03: whether the four web probes still fail.
- AE-006: check it in the full server e2e run.
- T-52: QR-001, 10 consecutive runs.

## Follow-ups (not sent yet; sent when the ticket leaves the team)

`follow-ups.md`:
- FU-001: the remaining stale gated server suites;
- FU-002: the remaining web baseline areas;
- FU-003: type-checking `autobyteus-ts` tests.

## Next expected action

Architecture review of the package. On a pass, the reviewer routes to implementation by its own rules.

## Round 2 (SR-002): response to ARCH-REV-001

- **AR-001, resolved.**
  - `design-spec.md` § File Classification Rule: paths are package-relative; test files are defined only by each package's own rule; every other reached file, other packages' source included, is production at 0 errors.
  - Per-Item Design T-57: a type-only `as unknown as` cast in `autobyteus-ts/src/llm/transport/local-long-running-fetch.ts` L33.
    - Why not the import you suggested: the file is reached through `test-support/live-e2e/live-e2e-harness.ts` → `autobyteus-ts/src/index.js`, not only through the frozen test. Rerouting that test's import left 1 production error (measured with `--explainFiles`).
    - Measured with T-10 and T-57 applied: 0 production errors and 1,327 test errors; the `autobyteus-ts` build stays at 0 errors.
  - Sequence steps 1 and 4: the server gate passes on day one with 0 production errors.
  - The web project's out-of-package files (`../autobyteus-server-ts/src/**`, `tests/fixtures/**`) are production, cleared by the aligned options and T-01.
- **R-1, adopted:** the default output dir is a fresh `test-results/<name>-<UTC timestamp>`; a passed non-empty dir is refused with a message.
- **R-2, adopted:** `isTestFile` lives in each package's `scripts/typecheck.mjs`.
- **R-3, adopted:** Risks entry naming the coupling and where the aligned options live.
- **R-4, adopted:** the kept spec tests the runner's fail-closed paths.
- Requirements unchanged. Classification unchanged: `Large` / `Low`.

## Round 3 (SR-003): T-28 signature 2, after the implementation's Design Impact

- **Trigger:** the implementation engineer (HEAD `351265ce41`) found that the server records no idle-arm time and no shutdown time. That is the case the design anticipated. Its options:
  - (a) a product timestamp;
  - (b) the fixture's process times;
  - (c) drop the item.
- **Decision: (b), for both ends of the window** (design-spec Per-Item Design T-28 sig. 2).
  - End: the fixture's existing SIGTERM log time (`agy-failure-cli.mjs` L47-57).
  - Start: new fixture-logged `turn_end` (quiet copy) and `background_exit` (background copies) events in the same log.
  - The server can only arm the grace timer after those moments, so `SIGTERM − start ≥ GRACE_MS` by construction. The lower bound tightens from `GRACE_MS − 1 s` to `GRACE_MS`; the upper bound is unchanged.
- **(a) rejected:** it changes a product contract for a test.
- Test-only. Requirements intent unchanged; REQ-008 and AC-008 wording updated to "times frame delivery cannot delay". Classification unchanged: Large / Low.
- The rest of the package is unchanged. Implementation continues steps 8–10 meanwhile.

## Round 4 (SR-004): response to ARCH-REV-003 (T-28 signature 2 only)

- **AR-002, resolved.** Design-spec T-28 sig. 2:
  - the fixture's lifecycle log is gated by `AGY_FAKE_PROCESS_LOG` alone;
  - outside `interrupt_resend` the SIGTERM handler logs, removes itself and re-raises SIGTERM, so the process ends at once by the signal, as today;
  - the handler exists only when the log is set, so the other `linked_skills` users are untouched;
  - the exit delay stays specific to `interrupt_resend`;
  - the test sets and restores the variable.
- **AR-003, resolved.**
  - `turn_end` and `background_exit` are recorded before the stdout `result` line and the exit-message file are written.
  - The lower bound is `GRACE_MS − 250 ms`, with the reason recorded.
- Premise checked: the quiet copy's process is alive while idle (test L366), so SIGTERM is the shutdown moment.
- No other change. Classification unchanged: Large / Low.
