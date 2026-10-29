# Handoff Summary: application-reentry-worker-stopped (autobyteus-296)

- Status: verified from the evidence, proven from a clean clone as the user asked, archived and finalized on `personal`. No release (the user cuts betas). The final repository state is in `release-deployment-report.md`.
- Classification: `task_size=Medium`, `architectural_risk=High`, reviewed route. Architecture review: ARCH-REV-001 Fail → ARCH-REV-002 Pass (SR-002). Code review: CRR-001 Pass, 9.5/10. API/E2E: API-REV-001 Pass → test review CRR-002 Fail (TR-001) → API-REV-002 Pass → CRR-003 Pass.
- Revisions: SR-002 / IR-001 / API-REV-002 / CRR-003 / DR-001.
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped`, branch `codex/application-reentry-worker-stopped`.

## What Changed

- Problem: a package reload or a repair of a previously ACTIVE application (Brief Studio) ended QUARANTINED. Reentry started the worker while the app was REENTERING, so the worker's start-hook host call was refused. Its dispatch resume ran before ACTIVE and did nothing. An application imported while Codex was signed out was quarantined with a generic text and could not be repaired after sign-in without a restart.
- Fix (`6950a24e1b`):
  - Reentry runs binding recovery → ACTIVE (worker stopped) → dispatch resume → tools open, and never starts the worker.
  - A stop (`stopEngine`) always ends in `stopped`, also for a crashed, detached worker.
  - Readiness owns "Application setup is required: …", used by startup and by catalog transitions, which pass each not-ready app's reason to reentry.
  - `getDiagnosticsByApplicationId` was removed.
- Tests: new durable `autobyteus-server-ts/tests/e2e/runtime/application-reload-repair.e2e.test.ts` RE-01…RE-05 (RE-04/05 from API/E2E, `ebb6c8ef88`, `16190e8c2a`); updated reentry, transition, lifecycle, readiness and invoker unit tests.
- Docs: `application_orchestration.md`, `applications.md` (implementation); `application_backend_api_gateway.md` (delivery).
- AC-009: `application-framework-design-findings.md`, the Solution Designer's report of 12 findings (1–3 fixed here, 4–12 for the user).

## Integration And The Clean-Clone Proof

- Method: merge. `origin/personal` @ `fc06a7355d` (autobyteus-248/249: Fastify 5 server and gateway, SheetJS) merged into the ticket branch as `8ba58a1072`, with no conflicts; the base and the ticket changed different files. The base upgraded the server's HTTP framework, which the repair route runs on, so the full check set was rerun.
- Clean clone (the user's "prove from a clean clone"): `git clone --no-local --branch codex/application-reentry-worker-stopped` at `8ba58a1072` into `/tmp/ab296-clone`, with no untracked build output. Steps in order:
  1. `pnpm install --frozen-lockfile`.
  2. `pnpm --filter "@autobyteus-example/brief-studio-authoring..." build`. This built the server, SDKs and devkit, then stopped at `autobyteus-app: command not found` because the devkit bin is linked only after the devkit is built.
  3. A second `pnpm install --frozen-lockfile`.
  4. `pnpm -C applications/brief-studio build`, which generated the importable package.
  5. All checks, run in a clean env with a throwaway HOME, as the implementation's commands.
- Results:
  - DEL-01: reload-repair e2e → **5/5 (RE-01…RE-05 run, not skipped)**.
  - DEL-02: application units + architecture → 74 files / 433 tests.
  - DEL-03: import→launch e2e 2/2; running-agents e2e 1 failed / 3 passed (RA-04, see below).
  - DEL-03b: running-agents e2e rerun three times → 4/4 each.
  - DEL-04: application-backend integration → 14 files / 34 tests.
  - DEL-05: server typecheck → exit 0.
- RA-04: 1 failure in 6 runs. It is a race in that test between RA-03's automatic re-check and RA-04's wait loop. The Codex update operation from RA-03 stays on the row because no user check clears it. The test and the agent-runtimes service are untouched by this ticket. Recorded as FU-007; not a defect of this change.

## Verification From Evidence

- AC-001…AC-004: proven. RE-01…RE-03 pass in API-07 and in the clean clone (DEL-01). IMP-00 shows them failing on base ("currently quarantined …", `state: QUARANTINED`).
- AC-005: proven by the unit order tests (IMP-02, DEL-02) and by RE-05 on the real stack. Mutation API-08(a), which removes the dispatch resume, is caught by RE-05 only.
- MP-001 (crashed worker reset): proven by RE-04. Mutation API-08(b) is caught by RE-04 only.
- AC-006, AC-007: proven by IMP-02…05 and DEL-02…05 (RA-04's flake is FU-007).
- AC-008: proven by API-06 and delivery's docs review, plus the gateway sentence correction.
- AC-009: the Solution Designer's report exists (`application-framework-design-findings.md`); it is delivered as part of the package.
- API/E2E final confidence: 97%; code review 9.5/10; test review CRR-003 Pass. No user check is required.

## Follow-ups (`follow-ups.md`, sent by the Solution Designer)

- FU-001…FU-006: from the design assessment and API/E2E (unchanged).
- FU-007 (new, delivery): the running-agents e2e RA-04 race.
- FU-008 (new, delivery): the Brief Studio e2e files skip silently on a clean checkout, and building the package there needs an undocumented second install.

## Release

- Decision: no release; the user cuts betas (SD handoff).
