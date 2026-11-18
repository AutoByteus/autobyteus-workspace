# Handoff Summary — automatic-app-node-updates (autobyteus-356: "Update automatically" for the desktop app and Docker nodes)

## Ticket

- Package: `automatic-app-node-updates`; Project Task `autobyteus-356`. It relies on autobyteus-285's restart resume, shipped in `v1.5.11-beta.10`.
- Classification: `task_size=Medium`, `architectural_risk=High`; route `Reviewed`.
- Gates:
  - architecture review: ARCH-REV-001 to ARCH-REV-005, ending in Pass;
  - code review: CRR-001 Pass; CRR-002 Local Fixes; CRR-003 Pass; CRR-004 Design Impact; CRR-005 Pass (9.4/10); CRR-006 test review Not Applicable;
  - API/E2E: API-REV-003 Pass, 93.9%, with every critical AC proven on real Squirrel.
- **The app restarts by itself** as soon as an update is ready, when the user turns the switch on (DEC-001: "once its downloaded then its intall immediately").
- Archived ticket folder: `tickets/done/automatic-app-node-updates/` on `personal`.

## What Changed

- **App switch:** "Update automatically" in the Notification Center and Settings → Updates.
  - Off by default; stored by the desktop only (`userData/app-update-automatic.json`).
  - With it on, a release found on the app's channel downloads, then installs and restarts with no click.
  - On macOS the install waits for Squirrel's own verified copy. That takes about 36 s idle, or 81 s measured on a busy machine, and is bounded at 15 min. Nothing stops during the wait.
  - Each version gets one attempt: an install or trial failure blocks that version for automatic installs, and a download failure is retried at the next check.
  - Failures show a plain reason. After the restart the row says "Updated automatically to <version>".
- **Node switch:** a per-node switch in Nodes.
  - With it on, the desktop's main process updates the node to the desktop's own version, only when the node is older, through the node's existing in-place update.
  - No server surface is added (AC-006).
- Tests: Electron main tests for the policy, run record, install attempt and readiness, the node updater, record, decision and client, and the wiring; renderer tests. All are mutation-checked (IMP-04/05/06/09/11).
- Docs: `electron_packaging.md`, `settings.md`; strings in English and Chinese.

## Integration

- Before merging, delivery committed the architecture reviewer's uncommitted ARCH-REV-003 to -005 edits as a checkpoint: `51aa6398c2`.
- Merged `origin/personal` @ `84ea944ac5` (134 commits: autobyteus-318, -358, -97, -348 and the beta.10 record) → `42d74d09c6`. No conflicts.
  - Files changed on both sides: the two docs, and `electron/tsconfig.json` in separate hunks.
  - The base's new `electron/tsconfig.typecheck.json` extends `tsconfig.json`, so it picks up the new shared includes.
- Post-integration checks (details in `release-deployment-report.md`): Electron main suite; web typecheck; Electron `tsc`; full web suite; Secret Gate; artifact hygiene; licensing.
- **Second integration (DR-002):**
  - `personal` then moved to `v1.5.11-beta.11` (cut by another task, without 356), and the merge conflicted with autobyteus-363's Nodes redesign.
  - The implementation engineer resolved it (merge `08984df524`): the switch sits at the foot of 363's server cell. CRR-007 Pass; API-REV-004 Pass on a real node; suites reran on that code (web 5085, Electron 407).

## Verification

- Judged from the evidence; no user check needed to finalize.
  - **AC-001:** both switches are off on a fresh profile, and nothing changes with them off.
  - **AC-002, idle** (API-02B-r3): a 36.3 s wait with health 200 throughout, 0.1 s from stop to quit, the new version running, `AUTO_UPDATED`, and the sidebar showing "1 updated".
  - **AC-002, busy machine** (API-02D-r3, load up to 415): an 81 s wait with no false failure.
  - **AC-003** (API-03-r3): the busy Claude run kept working through the wait, was recorded, then resumed with 1 notice.
  - **AC-004:** the node is updated to the desktop's version, and the row says so.
  - **AC-005:** a signature refusal (API-05C-r3) and a read-only refusal (API-05-r3, 3 of 3) stop nothing, show the plain reason with "It won't be tried again automatically", and do not repeat; the download and node failures are covered too.
  - **AC-006:** no server surface.
- Not run:
  - a Developer ID signed install, which is the user's own;
  - the live 15-minute bound (rendered from a seeded record);
  - path (a) (unit only);
  - Windows and Linux.
- The user's first real automatic update is the first proof on a properly signed build.

## Release

- **Beta `v1.5.11-beta.12`, released** at the user's request, the first beta containing 356. `v1.5.11-beta.11`, cut by another task, did not contain it.
  - All four workflows succeeded (iOS after a rerun of a transient simulator UI-test timeout).
  - The GitHub pre-release has 23 of 23 assets.
  - The release smoke check passed on Claude, Codex, Antigravity and AutoByteus. The user waived Grok, whose free quota was exhausted.
  - Details: `release-deployment-report.md`.
- `release-notes.md` is user-facing and kept for the next stable release. A beta uses generated notes; no ticket in the release needs a user action.

## For The Solution Designer

- Follow-ups FU-001 to FU-006 are in `follow-ups.md`; none has been sent. FU-006 is new: an overlapping second Squirrel fetch blocks that version. It is rare, needs three user actions within about 36–80 s, and stops nothing.
- Behavior to tell the user:
  - with the switch on, the app restarts by itself as soon as an update is ready;
  - on macOS it first waits about half a minute, or longer under load, while the app and agents keep working;
  - busy agents get one resume turn each.
