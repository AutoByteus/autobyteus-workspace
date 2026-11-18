# Handoff Summary — restart-resume (autobyteus-285: busy agents continue by themselves after an update restart)

## Ticket

- Package: `restart-resume`; Project Task `autobyteus-285` (after autobyteus-284 and -339; also completes autobyteus-305's step 5 for Docker nodes).
- Classification: `task_size=Large`, `architectural_risk=High`; route `Reviewed`.
- Gates:
  - architecture review: ARCH-REV-001 Fail, then ARCH-REV-002 and ARCH-REV-003 Pass;
  - code review: CRR-001 Pass; CRR-002 Design Impact (the eligibility race; member notices unseen); CRR-003 Pass (9.4/10); CRR-004 test review Not Applicable;
  - API/E2E: API-REV-002 Pass, 95.1%.
- **Runs paid agent turns unattended after an update**, as the user decided (DEC-001 = A: update restarts only, busy runs only).
- Archived ticket folder: `tickets/done/restart-resume/` on `personal`.

## What Changed

- **Record (D2):** the shutdown cleanup becomes `record(); app.close()`. Before anything is interrupted, the busy (`initializing`/`running`) runs held by a collaboration root are written atomically to `<appDataDir>/restart-resume/busy-runs.json`. That covers standalone hosts, Team and Org members, and delegated copies, each with its root, place and release version.
- **Release stamp (D1):** `build:full` writes `dist/release-identity.json` from the `autobyteus-web` package version. A different stamp at the next start means an update restart.
- **Resume:** after `recoverAfterListen`, in the background:
  - the record is read and deleted before any resume, so nothing is resumed twice;
  - only entries from another release are kept, and at most 3 posts run at once;
  - each run is restored through its root without posting, re-checked for stop or archive, then sent one notice that the run admits only as its first input (`onlyAsFirstInput`, decided inside the run's dispatch queue);
  - a host's or member's notice lists its resumed delegated runs.
- **One notice display:** each place shows the notice once as the run's own system notice, live and after a reload.
- `CollaborationRootResolver` is shared with inbound remote messages.
- Tests: unit tests for the record, recorder, resumer, notice, `placeOf`, resolver, first-input rule, member presentation and memory, each mutation-checked (IMP-02, IMP-08).
- Docs: `restart_resume.md` (new), `agent_execution.md`, `remote_collaboration.md`, the module index, `docs/design-cases.md`.

## Integration

- Before merging, delivery committed the architecture reviewer's untracked review record (ARCH-REV-001 to -003) as a checkpoint: `b265c98464`.
- Merged `origin/personal` @ `bea544af1b` (49 commits) → `1459807ff9`. No conflicts.
  - The base adds autobyteus-357's no-behavior-change cleanups, autobyteus-345's server package (`files` whitelist, frozen installs), the closure of 305 and the release guide's beta user-action rule.
  - Files changed on both sides: `autobyteus-server-ts/package.json` (separate hunks) and one test file.
- The base changed `pnpm-lock.yaml`, so delivery ran `pnpm install --frozen-lockfile` before the checks.
- Packaging check on the merged base: the stamp is in `dist/`, which 345's whitelist keeps. The Docker build copies `autobyteus-web/package.json` before `build:full`, and the in-place update package is taken from that image. 345's package-contents test passes.
- Docker self-check check: it runs the candidate server on its own empty data folder before the node's server stops, so it cannot consume the record.
- Post-integration checks (details in `release-deployment-report.md`): server typecheck; full server unit suite; build with the stamp read back; 284's gated E2E; artifact hygiene; licensing.

## Verification

- Judged from the evidence; no user check needed to finalize.
  - AC-002 (API-02-r2, live Codex and Claude):
    - 6 runs recorded and resumed: two standalone, a Team member, an Org member, and a host with its delegated copy;
    - each run has exactly 1 notice, and each produced new output 3–12 s after the restart;
    - the host's notice names its resumed copy.
  - O-1 (API-05T-r2, desktop screenshots): the notice is shown once as a system notice, live and after a reload.
  - AC-003 (API-04/04B/04C-r2, live; API-04E, 42 timed targets, 0 violations): archived, stopped and already-messaged runs get no notice; the idle and Task-closed cases are covered.
  - AC-004 (API-03-r2 P1): a restart on the same version resumes nothing.
  - AC-005 (API-03-r2 P3, API-04D): a corrupt record is removed and startup continues; a crash during resume is not retried.
  - AC-006: the integrated full suite and 284's E2E.
- Not run:
  - the real Squirrel install, which only the user can do;
  - the Docker in-place update with a signed feed.
  The server side of both is the same path API-02-r2 ran, a different stamp on the same data. The first real update the user installs with busy agents will be the first end-to-end run through the installer.

## Release

- No release, as the release guide's default; the request did not ask for one. `release-notes.md` holds user-facing text for the release that ships it. No user action is needed, so it has no "What you need to do" section.
- The feature first acts on the update *after* the release that ships it: the update that installs that release stops a version with no recorder, so nothing is recorded.

## For The Solution Designer

- Follow-ups FU-001 to FU-003 are in `follow-ups.md`; none has been sent. FU-004 was absorbed and resolved.
- Observations from review and API/E2E, not blocking:
  - O-2: an archive that lands during the restore is logged as "could not resume" and counted as failed; nothing is posted.
  - The same-run-instance property behind the first-input rule is proven live, but has no durable end-to-end test.
  - `configured-agent-execution-handle.ts` (496 lines) and `root-team-run.ts` (500) are at the size limit.
