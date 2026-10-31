# Handoff Summary — projects-left-navigation (autobyteus-347: Projects in the left panel)

## Ticket

- Package: `projects-left-navigation`; Project Task `autobyteus-347`
- Classification: `task_size=Large`, `architectural_risk=High`; route: reviewed. Architecture review through ARCH-REV-003 Pass; source review CRR-001 (CR-001 record placement, CR-002) → CRR-002 Pass, CRR-003 (CR-003 Stop in Projects mode) → CRR-004 Pass; API/E2E API-REV-001 Fail (PLN-09 Stop) → IR-003 → API-REV-002 Pass (95%); test-code review CRR-005 Pass (no findings).
- Archived ticket folder: `tickets/done/projects-left-navigation/` on `personal`

## What Changed

- **Projects mode in the left panel.** The run section's header is a flat `Workspaces | Projects` switch, remembered per node. Each Project lists the runs started under it plus every run hosting its Tasks' work, grouped like a workspace (agent groups: 6 newest + every run hosting open work of the Project; Teams and Orgs uncapped). Delegated rows under a run are limited to the Project's copies (server `scopes`); a run started under the Project also shows its Temp-task work. Live through the Projects change feed, with five explicit re-read triggers, including Stop (CR-003).
- **Start under a Project.** "+" on a Project or one of its groups, or the New chat chip's Projects tab ("No project" for a plain start). The run starts in the Project's first linked folder, else the temp workspace, unless the user picked a folder. The server records the start in a new Projects-owned file `projects/<projectId>/project_runs.json` before the run's own records, refuses an unknown Project with `PROJECT_NOT_FOUND`, and gives the run (or every Team member) a `## Project` instruction section on start and restore, on all five runtimes.
- **New API.** `projectRunHistory(projectId, limitPerAgent = 6)`; optional `projectId` on `CreateAgentRunInput` (`prepareAgentRun`, `createAgentRun`) and `CreateAgentTeamRunInput`. Run metadata, history index rows and Team trees are unchanged (rollback-safe).
- **Briefcase icon** for Projects in the navigation, cards, empty states, the right panel tab and the chip.
- Docs: server `projects.md`, `run_history.md`, `prompt_engineering.md`; web `projects.md`, `workspace_layout.md`, `chat.md` (delivery docs sync, `docs-sync-report.md`). The design spec's DS-004 text was corrected at delivery to say what IR-003 implemented: live status needs no re-read only for runs with a live context; Stop is trigger (4).

## Integration

- Checkpoint commit `754d9f6373` (review records), then merge of `origin/personal` @ `bfb6d5b154` (106 commits: update/restart reliability, cross-runtime resume, Docker in-place update) into the ticket branch as `0c8a6f4d22`; no conflicts. Six files changed on both sides; the merged code keeps both (the runtime switch builds its config through the same `buildConfig` that carries the Project; every touched file stays under 500 effective lines).
- The base changed `autobyteus-ts` (memory store), a shared foundation, so every recorded case was rerun (TESTING.md Rule 4). All Pass on `0c8a6f4d22`: install and rebuild (DEL-00); server and web typechecks, web guards (DEL-02); server unit 901 files / 7652 tests (DEL-01, includes the rollback-shape test); web suite 680 / 4927 (DEL-03); server E2E projects + run-history + agent-team-runs 39 files, 180 passed / 4 skipped, PRH-01…PRH-10 (DEL-04); browser probe PLN-01…PLN-10 (DEL-05); isolated desktop journey (DEL-06). Evidence: `evidence/delivery/`.

## Verification

- Judged from the evidence; no user check needed. Every critical acceptance criterion is directly proven by a real-boundary case (server E2E with real GraphQL/MCP delegation, browser journeys on a real stack, the packaged desktop app), and the integrated-state rerun reproduces each one. Confidence 95% against the 95% target, no category below 94%. Details: `release-deployment-report.md` § Verification.

## Release

- `No release`: the Task's bootstrap says "release only on the user's word" and the user did not ask; RELEASE.md's default is no release. `release-notes.md` is ready for the next beta or stable release; rolling back is possible (no existing data changes; older builds never read `project_runs.json`).

## For The Solution Designer

- Follow-ups in `follow-ups.md`, none sent: FU-001…FU-005, FU-007, FU-008 (FU-006 withdrawn). FU-007's race did not recur in the delivery rerun; it stays recorded.
- Residual risks (from API/E2E): the `## Project` section on restore for a runtime that recomposes its prompt is unit-tested only; SCN-010 remote runs are covered only by the shared scope key; Org Stop is covered by the store spec, not the browser; under Project P, a copy holding Tasks of P and Q shows its current (Q) Task line.
- Design text: DS-004 corrected at delivery (narrow, attributed edit; behavior unchanged, CRR-004 accepted it).
