# Solution Designer Handoff: autobyteus-296 (application-reentry-worker-stopped)

- Result: `Architecture Design Complete`, `task_size=Medium`, `architectural_risk=High` → architecture review
- Package: `application-reentry-worker-stopped`, Project Task `autobyteus-296`, SR-001
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped`, branch `codex/application-reentry-worker-stopped`, base `origin/personal` @ `ddd6fdcdf6`; finalization target `origin/personal`; no release (the user cuts betas); prove from a clean clone; any change to the user's data needs his approval and a backup (none planned)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped/tickets/in-progress/application-reentry-worker-stopped/`
- Approval: requirements approved by the Solution Designer within the Task's direction ("decide with the docs"); user informed (2026-10-24)
- The user's rule: one ticket at a time for this team.

## Original request (summary)

A reload or repair of a previously ACTIVE application ends QUARANTINED when its worker's start hook calls the host (Brief Studio). An application imported while Codex is signed out cannot be repaired after sign-in without a restart, and the quarantine does not say why. Decide with the docs; make the quarantine name the readiness diagnostics as startup does; add the reload/repair e2e as durable coverage. Done when reload and repair return a previously active application to ACTIVE, recovery after sign-in works without a restart, the quarantine names the reason, the e2e passes, and the change is merged to personal. User comment: also report design issues in the application SDK and framework (report only).

## Finding

- Reproduced on base (`evidence/SD-01-repro-base.log`):
  - after a package reload: 503, "currently reentering";
  - repair answers `state: QUARANTINED`;
  - signed-out import: generic "Application setup is required after catalog transition."
- Cause:
  - `recoverParticipants` starts the worker while REENTERING (`application-reentry-service.ts:151`), so the worker's host call is refused;
  - its dispatch resume runs before ACTIVE and is a no-op;
  - only IDs reach reentry, so the readiness reason is lost.
- Control (`evidence/SD-02-control-reentry-order.log`): the documented order (recover → ACTIVE → dispatch resume → tools open, no worker start) makes reload and repair keep Brief Studio usable.

## Design (see design-spec.md)

- **Reentry order:** recover bindings → ACTIVE → resume dispatch → open tools; the worker stays stopped and starts on demand.
- **Transition → reentry:** the transition passes each not-ready application's setup reason from readiness, and reentry quarantines with it.
- **Setup text:** readiness owns the "Application setup is required: …" text, also used by startup.
- **Docs:** the two module docs are corrected (dispatch resumes after ACTIVE).
- **Tests:** a new durable e2e, and unit tests updated.

## Design findings for the user

`application-framework-design-findings.md`: 12 findings ranked by risk with evidence. 1–3 are fixed here; 4–12 are for the user to decide. Notable among them:
- the web app has no repair/reload action (#4);
- package reload keeps a previously quarantined app quarantined (#5);
- two owners answer "is active" differently (#6).

## Validation expectations

AC-001…004 (durable e2e on the real studio server with scripted CLIs), AC-005/006 (units), AC-007 (existing suites, including the 238 import→launch e2e and the architecture tests), AC-008 (docs).

## Route

Handoff rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer` (2026-10-24).
