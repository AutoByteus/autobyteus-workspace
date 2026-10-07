# API/E2E Revision Record — `project-manager-ux`

## Revision Index

| Revision ID | Trigger / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer` CRR-001 Pass; round 1 | SR-003, SR-005, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail / 89% |
| API-REV-002 | `/code_reviewer` CRR-003 Pass (IR-002); round 2 | IR-002, CRR-003 | Fail / 89% | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline: feed and roots proven on the wire and in the browser; the release build fails the localization audit

- Trigger: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/code-review-report.md`, round 1
- Triggering IDs: CRR-001 residual list (AC-001..023, `/ws/projects` contract/auth, two windows, volume, Org cold open, real-provider status)
- Why recorded: the first completed API/E2E result
- Coverage changed:
  - added `autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts`;
  - updated `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (PMU-008..012, error assertions, failure console capture);
  - updated `autobyteus-web/package.json` (`test:e2e:project-manager-ux`);
  - updated `TESTING.md`.
- Cases:
  - REPO-*;
  - FEED-* (7);
  - PMU-001..012;
  - PT-E2E-001..016;
  - RELEASE-BUILD (Fail);
  - USER-JOURNEY (Blocked).

#### Prior Failure Resolution

None.

- Canonical artifacts updated: investigation, execution report, ledger, `api-e2e-evidence/`
- Prior: N/A. Current: Fail, 89%
- New failure IDs:
  - F-001: `build:electron:mac` fails `audit:localization-literals` because of dynamic keys in `ProjectTaskWorkers.vue:37` and `TempTaskBoard.vue:37`.
- Observation O-1: PMU-002 intermittent, 1 in 15, not reproduced.
- Recommended owner: `/implementation_engineer` (`Local Fix`), via `/code_reviewer` failure-origin review
- Remaining: the real-product desktop journey with a real model (blocked by F-001), and real-provider worker status

### API-REV-002 — Rerun after IR-002: F-001 resolved; desktop real-product journey; probe warm-up

- Trigger: CRR-003 (targeted delta review of IR-002, commit `8ef467696`), round 2
- Related revision IDs: IR-002, CRR-003
- Why recorded: the rerun after the F-001 fix
- Coverage changed:
  - `project-manager-ux-probe.mjs` gained a dev-server warm-up step;
  - `TESTING.md` gained a warm-up note.
- Cases rechecked or added:
  - RELEASE-BUILD (F-001);
  - REPO-WEB;
  - all gated `tests/e2e/projects` including FEED-*;
  - USER-JOURNEY (first execution);
  - PMU-001..012 (cold attempt, warm, forced-cold with the warm-up);
  - PT-E2E-001..016.

#### Prior Failure Resolution

| Prior Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-001 (`build:electron:mac` fails `audit:localization-literals`) | Local Fix (implementation) | Resolved by IR-002: the audit reports "zero unresolved findings"; the packaged build succeeds | `api-e2e-evidence/r2/r2-l10n-audit.log`, `r2-electron-build.log` |
| O-1 (PMU-002 intermittent, 1/15) | Observation | Explained as a dev-server cold dependency-optimization reload: the same 4 reloads appear in the round-1 baseline `frontend.log` and in the round-2 cold attempt; warm runs have 0. Resolved by the probe warm-up (forced-cold rerun 12/12) | `pmu-baseline/frontend.log`, `r2/pmu-full-attempt1-cold/`, `r2/pmu-full-cold-warmup/` |

- Canonical artifacts updated:
  - investigation (unchanged plan);
  - execution report (round 2);
  - ledger (events 16–23);
  - `api-e2e-evidence/r2/`, `user-journey/`.
- Prior: Fail, 89%. Current: Pass, 96%
- New or remaining failure IDs: none
- Recommended next: `/code_reviewer` proportional test-code review
- Remaining risks:
  - a real-provider `error` worker status is not exercised;
  - AC-004's in-place update is wire/browser-proven (in the desktop journey the agent finished before the page loaded);
  - the Projects-toggle first-click observation (outside scope).
