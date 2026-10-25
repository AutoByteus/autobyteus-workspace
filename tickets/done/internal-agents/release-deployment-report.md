# Delivery / Release / Deployment Report — autobyteus-308 (internal agents)

## Release / Publication / Deployment Scope

The change covers an agent-definition attribute, a server setting, one visibility rule asked by every listing owner, a Basics settings card and badge, durable tests and docs. Finalization target: `origin/personal`. No release.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `83e8e12125`
- Deviations from the guide and why: `None`. The ticket branch follows `codex/<ticket-name>`, finalization runs in the ticket worktree on `finalize/internal-agents`, and the Secret Gate runs before the first push and on the merged state.
- Build output: the untracked `*/dist/` folders are not committed; paths are staged explicitly.
- Proposed guide fixes: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/internal-agents/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `651071758f`
- Latest tracked remote base reference checked: `origin/personal` @ `651071758f` (`git fetch origin personal`, 0 new commits)
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Not needed` (the validated state was committed at `1352168e67`; the worktree had only untracked build output)
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`, as a delivery smoke check. DEL-01: `env -i PATH="$PATH" HOME=<mktemp -d> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/internal-agents.e2e.test.ts --no-watch` gave `Tests  5 passed (5)`.
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on:
  - the execution report's Acceptance-Criteria Proof and Cases (API-REV-001, final confidence 95%, no category below 95%);
  - the test file's assertions (`internal-agents.e2e.test.ts`, IA-01…05) with the passing log;
  - the RC-38 record in `API-06-two-server-receipt.json`;
  - the probe summary and screenshots;
  - the clean-clone log;
  - API-09 regression 79/79;
  - delivery's DEL-01.
- Mocked: the agent runtime CLI (the scripted AGY fixture). The tools, sessions and refusals it drives are real. No model decides the calls, which does not affect a visibility rule.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | IA-01 assertions (test lines 177–190); `API-08-probe-summary.log` IP-01; `IP-01a-agents-hidden.png` | Hidden by default; normal agents `internal: false`; by ID `{id, name, internal: true}`. The page shows "2 agents" without it. Store `{"count": 2, "internal": []}`; featured picker without it | Proven |
| AC-002 | IA-03 assertions (lines 210–238); `IP-01c`, `IP-02` | Run absent from `listWorkspaceRunHistory`, Memory agents, its run list and `UNATTRIBUTED`. `getRunProjection` shows the reply. Present once shown | Proven |
| AC-003 | IA-04 assertions (lines 241–278) and log line 328; RC-38 record | `list_available_agents` leaves it out. `delegate_task` → "is not the address of an available agent or agent team" (today's text, `collaborator-errors.ts:39` on base); nothing started. `@` → `COLLABORATOR_ADD_FAILED`. Peer: `hiddenOffer` without "Hidden Helper"; refusal "has no Agent … at /hidden_helper" | Proven |
| AC-004 (not critical) | IMP-03 / API-10 unit; `API-07-list-agent-definitions-live.log`; `git grep registerAgentManagementTools` (definition only, no caller) | Filter in the tool, unit-tested; the tool is registered on no node, also on base | Proven at code level; the surface is unreachable (FU-001) |
| AC-005 | IA-01/03/04 "shown" steps after `updateServerSetting` (no restart); RC-38 `shownOffer` with "Hidden Helper", `accepted {"delegated": true}`; IP-03 (`aria-checked` true, saved `true`, badge `Internal`), `IP-03c-agents-shown-badge.png`; IP-04 hidden again, no reload | Shown everywhere without a restart; delegation starts a copy; badge; hidden again | Proven |
| AC-006 | IA-02 assertions (lines 193–207) | `internalConfig.internal === true` after the save; a saved normal agent's file has no `internal` key | Proven |
| AC-007 | IA-01; API-09 `Tests  79 passed (79)` over 15 existing E2E files | Normal agents unchanged | Proven |

- More evidence requested: `None`
- Evidence note: `IP-03b-basics-card-on.png` draws the switch off.
  - The probe takes it after asserting `aria-checked === 'true'` and the server's saved value `true` (`internal-agents-probe.mjs:259–264`).
  - The switch's colour and knob are bound to the same `shown` value as `aria-checked` (`ShowInternalAgentsCard.vue`), so the image is the first frame of its 150 ms transition.
  - The DOM record and `IP-03c` are the proof. Not sent back.
- User check needed: `No`.
  - AC-005's verification intent says "Server + web tests; user check". API/E2E performed it on the real stack in a browser (IP-03/04, screenshots).
  - The Task's constraints, as recorded in `handoff-implementation.md` ("synthesized data only in tests; prove from a clean clone; no release unless asked; clean up"), do not ask the user to check personally.
  - The change is not released, so the user's own app does not have it yet.
  - The Solution Designer is told this explicitly in the terminal message. If the Task's completion conditions do require the user's own check, delivery will ask the user.
- Re-verification after later re-integration: `Not needed` (see Finalization Record)

## Release Decision

- Decision: `No release`
- Decided by: the Task constraint "no release unless asked" and the RELEASE.md default. A beta or stable release is available when the user wants one.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated:
  - By delivery: `run_history.md`, `agent_memory.md`, `remote_collaboration.md`, `agent_communication.md`, `agent_definition.md` (FU-001 note, tests), `settings.md` (tests).
  - By the implementation, verified by delivery: `agent_definition.md`, `settings.md`, `GLOSSARY.md`.

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/internal-agents/`

## Version / Tag / Release Commit

None.

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required`

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: one optional attribute and one setting; absent means normal or off; no migration (requirements, "Data Continuity").
- Delivery action required: `None`. API/E2E confirmed existing agents are directly usable (API-01, API-02, API-09).

## Rollback Criteria

Revert the merge on `personal`. An `"internal": true` key left in a file would then be ignored by the older code (all agents shown), and the setting would be unused. Nothing needs converting.

## Repository Finalization

Recorded after the merge in "Finalization Record" below.

## Finalization Record

- Bootstrap context source: the Solution Designer's `handoff-implementation.md` (branch `codex/internal-agents`, base and target `origin/personal` `651071758f`) and RELEASE.md
- Ticket branch: `codex/internal-agents`
- Ticket branch commit result: archive commit `ba01026b0a`. Code: `813f7208d2`. Tests: `17a6904e70`. Ticket documents: `692e884b77`, `1352168e67`.
- Name check before the commit: `check_repository_artifact_hygiene.py` passed. The longest ticket path is 109 characters, with no Windows-hostile names.
- Ticket branch push result: pushed `origin/codex/internal-agents` @ `ba01026b0a`, after the Secret Gate on `origin/personal..codex/internal-agents` passed
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification: `No` (`651071758f` at verification, at the merge and right before the push)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `finalize/internal-agents` created from `origin/personal` @ `651071758f`
- Merge into target result: `git merge --no-ff` → `e34321789d`. Checks on the merged state:
  - Secret Gate PASS;
  - `check_repository_artifact_hygiene.py` passed;
  - `check_licensing.py`: "Licensing is consistent." (exit 0).
- Push target branch result: `651071758f..e34321789d  HEAD -> personal`
- Repository finalization status: `Completed`

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/internal-agents`
- Worktree cleanup result: `Completed`.
  - Its only uncommitted content was untracked build output (`*/dist/`).
  - No process ran from it, and no container mounted it.
  - It was removed with `git worktree remove --force`, and the path no longer exists.
- Worktree prune result: `Completed`
- Local ticket branch cleanup result: `Completed`. `codex/internal-agents` (`ba01026b0a`) and `finalize/internal-agents` (`e34321789d`) were deleted; both are contained in `origin/personal`.
- Remote branch cleanup result: `Not required`. `origin/codex/internal-agents` is kept as the pushed ticket history.
- Other:
  - The stale analysis worktree `/Users/normy/autobyteus-worktrees/internal-agent-frontend-visibility` was not touched (Task constraint).
  - The main checkout was not touched.
  - This record was committed from a temporary detached checkout of `origin/personal` (`/tmp/ia-record`), which is removed after the push.

## Final Status

- Verification complete: `Yes` (from the evidence; no user check required, with the AC-005 wording flagged to the Solution Designer)
- Repository finalization complete: `Yes` (`e34321789d` on `personal`)
- Applicable release/deployment/rollout complete or not required: `Yes` (no release)
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: sent with `send_message_to` to the address from `get_handoff_rules`, right after this record is pushed
