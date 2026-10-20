# Handoff Summary: delegated-copy-restore-from-own-file

## Ticket

- Package `delegated-copy-restore-from-own-file`. Project Task `autobyteus-197`, requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on the user's direction of 2026-10-19.
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed (architecture review ARCH-REV-007; source review CRR-002 and CRR-004 for the merge; API/E2E API-REV-001 and API-REV-002; test-code review CRR-003, and CRR-005 Not Applicable).
- Revisions: SR-001..SR-008, IR-001..IR-003, CRR-001..CRR-005, API-REV-001..002, DR-001..DR-002.

## What Changed

- **Restore and view from the copy's own file only.** Every delegated copy (agent or Team, in Team, Org and Agent roots) carries a required `source`, the definition and launch it started with. Activation records it and restore reads only it. Settings, the run view (including its runtime session id), indexes and web contexts read a copy by run ID from its `source`. Removed: `taskAgent.origin`, the three task-source resolvers and `readTaskSource`, the configured follower rule, and the web catalog-only selectors.
- **Team copies.** Each member records its complete launch and `followsTeam` (DEC-010).
- **Behavior change (DEC-001, approved).** Editing a configured member in a stopped run changes only that member and copies started afterwards.
- **Startup migration `20261019_delegated_copy_own_file_complete_v1`** (registered last). It completes old own files from their slot as it is at upgrade, removes `origin` from every own file, and leaves unchanged and reports any copy whose slot is gone or whose file is unreadable. It writes each file once, and a second start writes nothing. A same-ID repair (D-9) of `20261017_task_agent_own_run_v1` keeps that migration's retry working.
- **Contracts:** `autobyteus-team-stream-contracts` and `autobyteus-collaboration-stream-contracts` (with rebuilt `dist/`).
- **Durable tests:** migration units on synthesized released shapes; startup and upgrade e2e; browser probe cases DCR-001..003 (`pnpm -C autobyteus-web test:e2e:delegated-copy-own-file`).
- **Docs:** see `docs-sync-report.md`. Delivery corrected `autobyteus-web/docs/agent_teams.md`.

## Integration

- DR-001: merging `origin/personal` @ `ad784b0a8f` (46 commits) conflicted in the three task-execution adapters (INT-001). Base's `ingressMember` looked up a Team copy's coordinator through the configured place, so delivery blocked and routed the merge.
- IR-003 resolved it in merge `26ad4ace20`: base's `ingressMember` is kept, and the coordinator address comes from the copy's own `source`. CRR-004 passed it.
- Checks on the merged state, all Pass:
  - IMP-15 typecheck;
  - IMP-16 server unit, 6169;
  - IMP-17 integration, 419;
  - IMP-18 build;
  - IMP-19 base's unclean-shutdown e2e, 5/5;
  - IMP-20 startup and upgrade e2e, 9/9;
  - IMP-21 web unit, 4565;
  - IMP-22 guards;
  - IMP-23 AC-009 sweep, including no `this.sources` and no stale `ingressAgentRunId`;
  - browser probe round 2, 18/18.
- At DR-002, `origin/personal` is still `ad784b0a8f`, so the branch is current.

## Verification

- Judged from the evidence: AC-001..AC-009 and AC-011 are proven on the merged state. Details are in `release-deployment-report.md`.
- AC-010 needs the user. His real data is converted only by a released build, after his backup (REQ-010, REQ-011, DEC-002). He then checks his copies in the app, including the 4 converted agent copies (`article_reviewer`, `investigator`, `vp_sales`, `prototype_bootstrapper`) and the 2 `StudentStudyGroup` Team copies.

## Accepted Residual

- Until docker-node-1 updates and syncs, its 13 unconvertible mirrored copies are not shown in its imported source on this machine. The 2 configured-place agent copies among them appear under "Unattributed runs" on the Memory page. Nothing is lost.

## Release

- The user chose a beta. **`v1.5.7-beta.4`** (release commit `41be799edb`, merge `d7c0222eb7` on `personal`) was published completely: all four workflows succeeded, the GitHub pre-release has 17 assets, and Docker `autobyteus/autobyteus-server:1.5.7-beta.4` = `:beta`. `release-notes.md` is kept for the next stable. The release cannot be rolled back (data migration; the notes say so).
- **AC-010:** the user upgraded after his backup and reports all good. Delivery's read-only check of his data: 110/110 own files `MIGRATED`, 0 with `origin`, the 4 + 2 copies complete, no restore errors since the upgrade.

## Follow-ups

- **F-1** (Solution Designer's): skill improvement and memory targets still use the slot for a copy at a configured address (`skill-improvement-target-context-resolver.ts`).
- `followups/suggested-task-retire-old-migrations.md` (Solution Designer's suggestion).
- **TO-001** (optional): the DCR-001 line in the header comment of `autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs` still mentions the replaced "+" prefill check. It is comment-only and left unchanged so the validated test code stays as reviewed.
- Follow-ups go to the agent that manages the project's Tasks: `/project_task_manager`.
