# Handoff Summary — atomic-agent-run-creation (autobyteus-349: a failed start leaves nothing; empty never-started runs removed at startup)

## Ticket

- Package: `atomic-agent-run-creation`; Project Task `autobyteus-349`. It comes from autobyteus-339's FU-004 and FU-003.
- Classification: `task_size=Small`, `architectural_risk=High`; route `Reviewed`.
- Gates:
  - architecture review: ARCH-REV-001 Fail (AR-001, AR-002), then ARCH-REV-002 Pass;
  - code review: CRR-001 Pass; CRR-002 Requirement Gap (F-API-001, the hard-kill leftover); CRR-003 closed it as residual FU-005 after the user chose DEC-003 = C; CRR-004 test review Not Applicable;
  - API/E2E: API-REV-002 Pass, 93.0%.
- **Deletes persisted user data at startup**: DEC-001, approved by the user.
- Archived ticket folder: `tickets/done/atomic-agent-run-creation/` on `personal`.

## What Changed

- **A one-call creation is all or nothing.** When activation fails, `createAgentRun` cancels the run it prepared and returns the activation error. If the cancel is refused because the run already started, the run is kept and the refusal is logged.
- **Empty never-started runs are removed at startup.** This runs before the server accepts requests (`removeEmptyNeverStartedRuns`).
  - A run is removed only when its standalone record is readable, it has `preparedAt` and no `startedAt`, and its folder holds nothing but directories and the record. Symbolic links are not followed.
  - Every removal is logged with the run ID and title.
  - Everything else is kept: content of any kind, an unreadable record or folder, task-agent folders, active runs.
  - The removal never fails startup.
  - The unused 24 h `cleanupStalePreparedRuns` is deleted.
- Tests:
  - the removal rule on a real store (mutation-checked);
  - the create undo on a real catalog (fails on the base);
  - the startup stage order;
  - an architecture-guard entry.
- Docs: `agent_execution.md` and `docs/design-cases.md` (by the change); `run_history.md` and `remote_collaboration.md` (by delivery).

## Integration

- Before merging, delivery committed the architecture reviewer's untracked review record (ARCH-REV-001/002) as a checkpoint: `0ff4505277`.
- Merged `origin/personal` @ `f7f331d96b` into the ticket branch → `7d1bc66ba3`, no conflicts. The one new commit is the autobyteus-352 release record (ticket documents only), so the code under test is unchanged.
- Post-integration checks, all Pass: server typecheck; the focused suites (62); the full server unit suite; artifact hygiene; licensing.

## Verification

- Judged from the evidence; no user check needed. Every critical AC is directly proven:
  - **AC-001** (API-01-clean): two real activation failures each return their error, with no history row and no folder left. The base build leaves 2 of each.
  - **AC-002** (IMP-02): an already-started run is kept and the refusal logged.
  - **AC-003** (API-02/02B, IMP-01): only the two empty shapes and 300 of 300 bulk empties are removed, each logged. Kept: the May shape (9 files), context-file-only, collaboration root, started, task-agent and unreadable runs, and 300 started bulk runs.
  - **AC-004** (API-03G ×3, API-03 stuck activation): creates sent before SIGTERM are answered; after relaunch there are 0 never-started and 0 unknown runs.
  - **AC-005**: API-04 (two-step creation) and API-05 (284's E2E).
- Cost: about 15 ms per removal, and 124 ms for a start with nothing to remove.

## Release

- No release, the release guide's default; the request did not ask for one. The change ships with the next release.
- `release-notes.md` holds the user-facing text for that release: what is removed at the first start, what is always kept, and that rolling back is possible.

## For The Solution Designer

- On the user's real data, the first start after the release removes the 6 content-free never-started runs, each logged as "Removed empty never-started run '<id>' ('<title>')". The 11 May runs that hold conversations are kept.
- Follow-ups FU-001 to FU-005 are in `follow-ups.md`; none has been sent. The user marked FU-005 (the hard-kill leftover) as lowest priority.
- Not tested:
  - remote delegation across two nodes (covered by the unit suite only);
  - the first start on real data (not run, by rule).
