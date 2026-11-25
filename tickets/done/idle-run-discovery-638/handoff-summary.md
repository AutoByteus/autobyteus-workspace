# Handoff Summary — idle-run-discovery-638 (autobyteus-638)

## Summary Meta

- Ticket: `idle-run-discovery-638` (Project Task `autobyteus-638`): a restart keeps a person's running runs running, so other agents find them with `list_running_agents` and reach them with `send_message_to`.
- Date: `2026-11-24`
- Classification: `task_size: Medium`, `architectural_risk: High`.
- Route: architecture review (ARCH-REV-001 Fail, ARCH-REV-002 Pass at SR-003) → implementation (IR-001) → source review (CRR-001 Pass, 9.5/10) → API/E2E (API-REV-001 Pass, 95%) → test-code review (CRR-002 Pass) → delivery (DR-001).
- Current Status: `Verified from evidence / finalized on personal; no release` (the commits are in `release-deployment-report.md`).
- Branch: `codex/idle-run-discovery-638`, base `origin/personal` @ `c1147c8917`; delivery merged `origin/personal` @ `5c0db3a801` (48 commits) as `22dce6a27e` with no conflicts. Code `ae1e36cded`; tests `b61a71452e`.

## Delivery Summary

- **The cause was the restart, not the idle timer (DEC-001).** The restart for an update unloaded every run, so `list_running_agents` did not list an idle run and `send_message_to` refused it, and other agents started duplicates. The founder's rule: "earlier it's idle, after restart it's also idle" (DEC-002, approach B: bring running runs back).
- **Which runs come back.** Agent and Team runs a person started (no `delegatedFrom`, no `containedIn`) whose entry agent was running at the stop: an Agent run's agent, a Team run's coordinator, with any live status. Not Orgs or their units, not delegated runs, not runs unloaded, archived or stopped before the stop.
- **The record.** `<appDataDir>/restart-resume/running-runs.json`, with one writer (`RunningRunRecorder`): rewritten every 2 s when the set changed, and written finally at a graceful stop (before the close); so after a crash it is at most 2 s old.
- **The restore.** `RunningRunRestorer.take()` reads it at startup before the recorders start; after the update wake, `restore()` works through the runs, three at a time: history must be present, a person must have started it, it must not run already; then `resolveOrRestore(root)` and the entry agent made ready without input (`ensureAgentReady`, new on the Team root through its gate). No input is posted, so no model call happens. A stop or a crash during the restore keeps the runs not yet handled in the record.
- **Failures.** One log line per start (`Running runs after the restart: N brought back, S skipped, F failed`) and one per skip or failure; a failure never stops the other runs or the server. A failed run is not retried at the next start (its person opens or messages it).
- **Unchanged:** the update wake, the plain-restart reminder (it still rides the run's next input), `busy-runs.json`.
- Docs: `restart_resume.md` ("Running runs come back", source map, boot order) and `collaboration_model.md` § 1 from the code commit (verified); the Tests bullet extended at delivery (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence by delivery. No user check is needed. Every acceptance criterion (AC-001 … AC-006) is directly proven by its stated method, with one named gap: Codex's conversation across a restart on real inference was not tested (below).
- Key evidence (under `evidence/API/`):
  - `API-01-02-running-runs.log`, `RUN-01.json` … `RUN-04.json`: built server, `Tests 4 passed (4)`: a graceful restart and a forced kill each bring back an Agent run and a Team (listed and reachable), and a stopped run does not come back; a stop (RUN-03) and a kill (RUN-04) in the middle of the restore lose no run (the record keeps the seven, the next start brings them back).
  - `API-03-external-runtimes/`: scripted Antigravity `1 brought back` / `2 brought back`, same session, answered; the real Claude CLI (haiku): the same session (`c66b3bab…` before and after), the answer `ORCHID-D04EA2` / `ORCHID-602969` (the codewords given before the restart), `unchanged: true`; Codex without inference: `2 brought back`, no input or model call.
  - `API-04-docker/RUN-D-01.json`: a test-owned Docker node after `docker stop`/`start` and `docker kill`/`start`: `1 brought back, 0 skipped, 0 failed` each, one session (`3df5fa1b…`) across both, answered, container removed.
  - `API-05-rr01.log`: RR-01 (AC-005): both runs running again, idle, before any input, and nothing woken. `API-06-e2e.log`: whole `pnpm test:e2e` 574 passed.
  - Reused: whole unit and integration suites (IMP-02, IMP-03).
- Integrated state (`evidence/DEL-post-integration/`, merged state `22dce6a27e`): `pnpm install --frozen-lockfile`, both typechecks at baseline (server 972/299, web 86/36), the server rebuilt, the four built-server restart cases `Tests 4 passed (4)` and RR-01 pass, and 1166 unit tests of the touched areas pass (restart-resume, Team execution, compositions, collaboration, remote collaboration, architecture).
- Final confidence 95%, no category below 94%.
- Secret Gate PASS; artifact hygiene and licensing PASS.

## Residual Risks For The User

- **Codex conversation continuity on real inference is unproven.** The host's Codex account hit its usage limit until 2026-11-27. Codex's restore without inference is proven (the run comes back, no model call). The cases `RUN-X-CODEX-TERM` and `RUN-X-CODEX-KILL` are ready to run when the account has credits. No `DEC-*` decision accepts this; AC-001 and AC-002 do not require it (they require the run to be running, listed and its message delivered), and Claude proves the conversation across a restart.
- **A run that fails to come back is not retried at the next start** (by design): its person opens or messages it.
- **Memory:** each brought-back run of an external runtime is a runtime process of about 270 to 330 MB, as before the restart; the restore does three at a time.
- **`root-team-run.ts` is at 495 of 500 non-empty lines**, so the next change there must split it.
- **Red on the base, not caused by this ticket:** the restart-reminder suite's RR-10 expects the old conversation order (FU-001); it fails on the base build too.

## Follow-ups

`follow-ups.md`, both not urgent, for the Solution Designer to send:
- FU-001: RR-10's expected order is stale since autobyteus-628 (the projection now shows a preface notice after its input); it fails identically on `c1147c8917`.
- FU-002: a Codex run a person never messaged has an empty thread that Codex does not save, so each restart renews its session and adds autobyteus-599's renewal line. With this ticket the line repeats once per restart. Reachable only by creating a run through the API without a first message; the desktop and mobile clients create a run with its first message.

## Release

- No release. No release was asked for, and RELEASE.md's default is no release. `release-notes.md` holds the user-facing notes for whichever release includes this change.
