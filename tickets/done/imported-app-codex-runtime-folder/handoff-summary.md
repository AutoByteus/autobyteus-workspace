# Handoff Summary: imported-app-codex-runtime-folder (autobyteus-238)

- Status: verified from the evidence, archived and finalized on `personal`. No release. The final repository state is in `release-deployment-report.md`.
- Classification: `task_size=Small`, `architectural_risk=Low`, route Direct Low-Risk. Architecture review: `N/A — not applicable`. Source code review: not selected. The code reviewer ran a failure-origin review (CRR-001) after API-REV-001 failed; it found the pre-existing reentry defect C-01, which became FU-003 and narrowed AC-003 (SR-002/DEC-004). Test-code review: `Not Required` (direct route).
- Revisions: SR-001 → SR-002 / IR-001, IR-002 (no code change) / API-REV-001 (Fail), API-REV-002 (Pass) / CRR-001 / DR-001.
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-app-codex-runtime-folder`, branch `fix/imported-app-codex-runtime-folder`.

## What Changed

- Problem: an application imported while the server runs, with Codex as its launch runtime, was quarantined until the server restarted. The import's catalog transition ran launch readiness, which spawns Codex in `<data>/applications/<app>/runtime`. That folder did not exist yet, so the spawn failed with `ENOENT`.
- Fix (`1d49973440`): `ApplicationCatalogTransitionService` prepares each current application's runtime folder after the catalog commit and before readiness, as startup does. It is wired in `build-application-platform-runtime.ts`.
- Tests: new `autobyteus-server-ts/tests/e2e/runtime/application-import-codex-launch.e2e.test.ts` (import then launch with Codex signed in, and signed out); order tests in `application-catalog-transition-service.test.ts`.
- Docs (delivery): `autobyteus-server-ts/docs/modules/applications.md`.

## Integration

- Method: merge. `origin/personal` @ `036b2d780b` (incl. autobyteus-290, -253, -265, -232, -208) merged into the ticket branch as `ef987888a3`, with no conflicts. The base changed no application or Codex server source. `pnpm install --frozen-lockfile` was run.
- Post-integration checks on `ef987888a3`, using the implementation's clean-env commands:
  - DEL-01: `application-import-codex-launch.e2e` → 2/2.
  - DEL-02: transition, journal-recovery, lifecycle and runtime-isolation units → 20/20.
  - DEL-03: `agent-runtimes-running-agents.e2e` → 4/4.
  - DEL-04: server typecheck → exit 0.
  - DEL-05: `application-framework-boundaries.test.ts` → **20/20**, now green because of the base (FU-001 resolved by `68eb520da9`).
- The desktop journey (API-07) was not rerun after integration. The base changed no application/Codex code, DEL-01 reruns import → readiness → launch on the integrated server, and a rerun would spend the user's Codex sign-in again.

## Verification From Evidence

- AC-001: proven. IMP-01's IC-01 passes, and IMP-00 fails on base with `currently quarantined: Application setup is required after catalog transition.` DEL-01 shows 2/2 on the integrated state.
- AC-002: proven. IC-02 gives readiness `HOST_REQUIREMENT_MISSING` with the Codex sign-in text. DEL-01 reran it.
- AC-003 (as narrowed by SR-002): proven by the transition-order unit tests (IMP-02, DEL-02).
- AC-004: proven by IMP-02/03/04 and DEL-02…04. The architecture guard failure seen in round 1 (FU-001) is fixed on the integrated base (DEL-05).
- AC-005: proven on a desktop build of this worktree with the real `codex` 0.164.0 (API-07). It shows "Application package imported." and the runtime folder present right after the import. Launch settings returned `HTTP 200` with readiness `RUNNABLE` on `codex_app_server` / `gpt-5.6-luna`, and the backend reported ready. Both Codex sessions (Researcher, Writer) ran with `cwd=<dataRoot>/server-data/applications/<storageKey>/runtime` and `task_complete=True`. The screenshot shows the brief "AB238 imported app launch check" `in_review` with 2 drafts, 1 final. The instance stop shows `dataRootRemoved: true` and both ports released. No restart, reload or repair happened in the journey.
- API/E2E final confidence: 95%, every category ≥ 90%. The user check for AC-005 is optional and was not needed: the journey ran on the real app with the real runtime.

## Follow-ups (in `follow-ups.md`, sent by the Solution Designer)

- FU-001 (was urgent): **resolved on `personal`** by `68eb520da9` (autobyteus-253 W-01); no Task needed. A delivery note was added to `follow-ups.md`.
- FU-002 (not urgent): catalog transition quarantine should name the readiness diagnostics, as startup does.
- FU-003 (not urgent, schedule soon): a reload or repair of an ACTIVE application (Brief Studio) quarantines it, because reentry starts the worker while the app is REENTERING. This is pre-existing. An application imported while Codex is signed out cannot be repaired after sign-in without a restart.

## Release

- Decision: no release, the RELEASE.md default (the Task asks for "finalized on personal"). A beta or stable release is available on request.
