# Handoff Summary

## Summary Meta

- Ticket: `org-teams-follow-definition` (Project Task `autobyteus-29`, Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`)
- Date: `2026-11-22`
- Classification: `task_size: Large`, `architectural_risk: High`, reviewed route:
  - architecture review: final Pass ARCH-REV-013;
  - source review: CRR-013 Pass;
  - API/E2E: API-REV-005 Pass at 95%, with the full rerun after the base merges in API-REV-004;
  - test-code review: CRR-014 Pass.
- Current Status: `Verified from evidence / finalized on personal; no release`
- Delivery rounds:
  - DR-001: blocked by integration conflicts with autobyteus-587 and -599. Resolved upstream by SR-016..SR-018 and IR-006..IR-009.
  - DR-002: this round.
- Branch: `codex/org-teams-follow-definition`. Integrated by merge at delivery: `origin/personal` @ `cb5e1c80f3` (9 commits) → `3045cf52e6`, no conflicts. Post-integration checks pass (`evidence/DEL-post-integration/`).
- Final implementation: IR-009, `70dd2b03f1`.

## Delivery Summary

- Delivered scope:
  - An Org run is a container of runs. Each mounted Team is a Team run of its own, and each direct agent an agent run of its own, with `containedIn`. The container keeps the units, former units and the Org-level rules.
  - Teams inside an Org follow their Team definition (autobyteus-22's rules).
  - The Org follows its Org definition: a mounted Team or added agent appears Offline; a removed unit is Leaving while it finishes, then former.
  - Org rules follow the members: a rule to a member that left is left out until it returns, and its sender is told.
  - Messages between units go by Org address and are stored in both units' logs. A Team unit's removed member is refused by name at its Org address with autobyteus-22's text (DEC-007).
  - On a paired node, the delegating node's record of a remote Team copy follows its members (FU-003, REQ-008).
  - Upgrade: startup migration `20261122_agent_org_units_own_runs_v1` converts every stored Org run. Folders are renamed, the Org log is split, delegations are rewritten, and one node pass moves stored absolute paths into renamed folders, including every Windows path form. The container file is written last. Interrupted starts repeat.
  - The Org view looks as before, with the Leaving tag on leaving rows.
- Docs: by the implementation `agent_orgs.md`, `collaboration_model.md`, `agent_team_execution.md`, `agent_memory.md`, `GLOSSARY.md`; at delivery `autobyteus-web/docs/agent_teams.md` and `autobyteus-web/docs/agent_orgs.md` (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence (delivery's judgement; no user check needed). AC-001…AC-008 and REQ-009 are directly proven; the critical evidence was opened (`release-deployment-report.md`, Verification). No criterion rests on an accepted-risk decision.
- Key evidence:
  - `evidence/api-e2e/round-5/OC-01-14/`: 14/14, built server, package Org edited on disk, and a built-server conversion of a released Org (OC-14).
  - `round-4/RC/`: two-server suite, 62/62, including this ticket's RC-56 (AC-007).
  - `round-4/OCL-01-02/`: real models.
  - `round-4/OCU-01-05/`: the rendered Org view, Leaving tag included.
  - `round-5/MIG/`: 651 migration tests; `round-5/AOML/`; `round-5/COST-01/`.
  - Integrated state, `evidence/DEL-post-integration/`:
    - server and web typechecks PASS at baseline;
    - web history specs 256 passed;
    - OC-01..14 14/14 on the merged state.
- Secret Gate PASS on the ticket commits and the merged state; artifact hygiene PASS.

## Residual Risks For The User

- **No rollback:** the upgrade converts saved organization runs, and an older version cannot read them (DEC-001; the release notes say so).
- **Paired nodes:** a node on an older version refuses the new team-membership update; the other node catches up at its next status read. Upgrade both.
- **Not run on this host:**
  - macOS file events;
  - the macOS, x64 and Windows release jobs;
  - the fresh-start job's clean-image step (needs Docker).
  
  Windows path forms are covered by the migration suites only.
- **Cost:** on a 1.35 GB synthetic node, the first start after the upgrade is ready in 8.7 s (a normal start 4.2 s); the conversion itself takes 2.0 s. The sizes are assumptions.
- **Root container:** the 27 root-only unit tests are not proven here.

## Follow-ups

- `follow-ups.md`:
  - FU-001: memory sync of contained runs.
  - FU-002, added by delivery: two two-server cases share the ID RC-56, so one receipt overwrites the other.
- Neither is urgent. The Solution Designer sends them.

## Release

- No release (the user did not ask; RELEASE.md's default). `release-notes.md` holds user-facing notes, including "What you need to do", for the next beta or stable.
