# Delivery / Release / Deployment Report — list-running-agents (autobyteus-492)

## Release / Publication / Deployment Scope

- Ticket `list-running-agents` (Project Task `autobyteus-492`), `task_size: Large`, `architectural_risk: High`, reviewed route (`handoff-summary.md`).
- Scope: two base refreshes, docs sync, verification from evidence, finalization onto `personal`, the archive and cleanup. No release.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` @ `be11a62449` (read in the ticket worktree after the base refresh).
- Deviations from the guide and why: `None`. The guide's "audit, do not redo" rule held: delivery opened the execution report and the files it names and did not rerun the suites, clean clones or builds API/E2E ran. It reran only what the guide names after a base refresh (both typechecks and relevant checks on the merged state).
- Proposed guide fixes: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/list-running-agents/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/list-running-agents/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: ticket documents are archived under `tickets/done/list-running-agents/`; paths in earlier documents that say `tickets/in-progress/list-running-agents/` mean this folder.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `bd2053ee51`
- Latest tracked remote base reference checked: refresh 1 `75048cbaf4`; refresh 2 `be11a62449`; checked again before the push (below).
- Base advanced since bootstrap: `Yes`, twice during delivery.
- New base commits integrated into the ticket branch: `Yes`.
  - Refresh 1: 49 commits (v1.5.13 release records, autobyteus-517 round 2, 526 restored-run-turn-ids, 534 phone text size). They touched `autobyteus-ts` memory and pipeline files, two presentation contract packages, the agent presentation event adapters, platform notice builders, restart-resume, and web phone files.
  - Refresh 2: 17 commits (autobyteus-491: the retired memory item model in `autobyteus-ts`, a startup migration that deletes two retired built-in agents, the migration registry, `typecheck-baseline.json`).
- Local checkpoint commit result: `Completed`. `437bcacae3` (the architecture reviewer's uncommitted ARCH-REV-003/004 documents) before refresh 1; `3c2a6f11f5` (delivery docs, evidence of refresh 1) before refresh 2.
- Integration method: `Merge`. Refresh 1 `df6992e0c1`, refresh 2 `736526af88`; neither had conflicts. `typecheck-baseline.json` changed on both sides and merged cleanly to `1008 in 315 files`.
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`, after each refresh (`evidence/DEL-post-integration/`).

| Check | Refresh 1 (`df6992e0c1`) | Refresh 2 (`736526af88`) |
| --- | --- | --- |
| `pnpm -C autobyteus-server-ts typecheck` | `production errors: 0; test-file errors: 1009 in 315 files (baseline 1009 in 315 files)`, PASS (`DEL-01`) | `... 1008 in 315 files (baseline 1008 in 315 files)`, PASS (`DEL-07`) |
| `pnpm -C autobyteus-web typecheck` | `... 87 in 37 files (baseline 87 in 37 files)`, PASS (`DEL-02`) | same, PASS (`DEL-07`) |
| Server unit tests | whole `test:unit`: `Tests 1 failed \| 8394 passed \| 9 skipped (8404)` (`DEL-03`); the failure, `skill-folder-watcher.test.ts` "releases a folder's OS handles…" (CR-005), timed out at 45 s waiting for real file events with `fseventsd` at ~120 % CPU and load average 58–92; the file and its source are identical to `origin/personal`; alone it passes `Tests 9 passed (9)` (`DEL-04`) | the touched areas plus the migration registry and `tests/architecture`: `Test Files 213 passed`, `Tests 1554 passed` (`DEL-08`) |
| Server rebuild | `pnpm -C autobyteus-server-ts build` exit 0 (`DEL-05`) | exit 0 |
| Built-server E2E, two-server suite `RC-(0[1-9]\|1[01]\|4[789])` | `Tests 14 passed \| 35 skipped (49)`; receipt `cleanup {rootRemoved: true, serversStopped: true, leftoverAgy: [], errors: []}`; RC-47 `g1` unrelated `false` / related `true` live and stored (`DEL-06`) | `Tests 14 passed \| 35 skipped (49)`, same cleanup (`DEL-09`) |

- Post-integration verification result: `Passed`
- Delivery edits started only after the integrated state was current: `Yes` for the docs and records written after refresh 1 (`3c2a6f11f5`); refresh 2 changed no file they describe (docs-sync report § Scope).
- Handoff state current with latest tracked remote base: `Yes` (`be11a62449` at the fetch before each push).

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (API-REV-001), its Acceptance-Criteria Proof and Cases, and the files they name; final confidence 95.3%, no category below 95%, every critical acceptance criterion directly proven; the test-code review (CRR-003, no findings); the integrated-state reruns above. Mocked: model inference only (scripted AGY CLI); the agents' own choices (picking the PM from the list) are scripted. Not tested: BEH-007 on built servers (the scripted runtime answers at once), the user's real paired nodes, the rendered app (no renderer code changed).

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (critical) | RC-47, RC-48: `API-06-run1/API-06-run1-vitest.log`, `API-06-rc47/API-06-rc47-vitest.log`; `DEL-06` rerun | RC-47 ✓ in the rerun (`12 passed`) and in both integrated reruns; RC-48 ✓ in run 1 and both reruns; listing is exactly the roots a person started | Proven |
| AC-002 (critical) | RC-47, RC-48; RC-20 in `API-06-receipt.json` | each entry `toEqual` the REQ-002 fields; RC-48 receipt `wire.answer.agents`: Bystander and Project Task Manager (`project: "Beta Project"`) and Studio Team entries with `workspace`, `state`, `started_at`, no title or content; RC-20 `"/rest/remote/running-agents": 3` | Proven |
| AC-003 | RC-47, RC-48 | `address` and `state` filters; unknown address gives `{}` (the platform's tool-result rule), the run 1 failure was this assertion, fixed and rerun | Proven |
| AC-004 (critical) | RC-48, RC-27, RC-28: `API-06-run1-vitest.log` | `✓ RC-48`, `✓ RC-27` (black-holed beta refused in the 20 s bound), `✓ RC-28`; RC-20 counts show one signed request per listing | Proven |
| AC-005 (critical) | RC-47; `IMP-06-in-process-scenarios.log` | ✓ in the rerun log; two user-started roots message each other in both directions, one line in each log with one message ID (`g1.logs`, e.g. `collabmsg_oPMgFFwER…`) | Proven |
| AC-006 (critical) | RC-48 | ✓; delivery with `node`, header naming the sender's node, answer delivered back, both nodes' logs checked | Proven |
| AC-007 (critical) | RC-47, RC-48 | ✓; a stopped root and a never-started member are refused with the not-running text and nothing is woken; on beta `REMOTE_TARGET_NOT_RUNNING` | Proven |
| AC-008 (critical) | RC-49, RC-47, RC-48, RC-10/11/23, RC-06/22; `API-07-cpw-e2e.log`; `API-08-*` | RC-49 receipt `closed`: six senders, each "This task agent's Task is closed. Only the agent that assigned the Task can continue it …"; row 14 delivered from beta and from zeta; CPW-R2 ✓ "a task agent messaging a running agent of a different Task is delivered (492 AC-008)"; contract stories `✓ §5.1 S0 … S27`, `✓ §5.2 U0 … U11`, `✓ §5.3 O0 … O9` | Proven |
| AC-009 | RC-47; code review | tool texts over Agent Tools MCP equal the wording authority | Proven |
| QR-003 (critical) | RC-48 `gate`, RC-20 | per route: unsigned 401 `NODE_CREDENTIAL_REQUIRED`, owner bearer 403 `NODE_ROUTE_NOT_PERMITTED`, wrong secret and unpaired 401 `NODE_CREDENTIAL_INVALID`, `wrongTo` 200 `PEER_IDENTITY_MISMATCH` | Proven |
| QR-001, QR-002 | RC-27 (`heldRunning.elapsedMs` 20217), RC-20 (strict fields) | as the report states | Proven |

- More evidence requested: `None`. Weigh these gaps: API-04b not run (macOS delivered no file events while measured) and the environment failures API/E2E recorded (FU-005). Neither reaches code this ticket changed; delivery's integrated unit run met the same kind of failure once and it passes alone.
- User check needed: `No`. Nothing is unreachable without the user, and none was asked for.
- Re-verification after later re-integration: refresh 2 (above) with the same relevant check. No third refresh was needed (Repository Finalization).

## Release Decision

- Decision: `No release`
- Decided by: the requirements doc ("Release only on his word", the founder); no release was asked for in the request or after, and RELEASE.md's default is no release. A release is available; `release-notes.md` holds the notes.

## Docs Sync Result

- Docs sync artifact: `tickets/done/list-running-agents/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: from the code commits `collaboration_model.md`, `agent_communication.md`, `agent_tools.md`, `remote_collaboration.md` (verified); at delivery `prompt_engineering.md`, `agent_tools_mcp_server.md`, `standalone_agent_run_root.md`, `agent_team_execution.md`, and one sentence in `remote_collaboration.md`. `DESIGN.md`, `TESTING.md`, `RELEASE.md`: no change.

## Ticket State Transition

- Ticket moved to `tickets/done/list-running-agents`: `Yes`
- Archived ticket path: `tickets/done/list-running-agents/`

## Version / Tag / Release Commit

- None (no release).

## Repository Finalization

- Bootstrap context source: `RELEASE.md` Finalization Target (`origin/personal`) and the ticket's recorded bootstrap
- Ticket branch: `codex/list-running-agents`
- Secret Gate before the first push: `scripts/check_secrets.sh origin/personal..codex/list-running-agents` PASS (29 commits). Artifact hygiene PASS (99084 tracked files, after the archive move); licensing PASS; no Windows-hostile character in this ticket's file names.
- Ticket branch commit result: `ac1454ed6f` (delivery records, archive), on top of base merge `736526af88`, checkpoint `3c2a6f11f5`, base merge `df6992e0c1`, checkpoint `437bcacae3`
- Ticket branch push result: pushed `origin/codex/list-running-agents` (new branch)
- Finalization target remote / branch: `origin` / `personal`
- Target advanced after verification / acceptance: `No` after the second refresh (`be11a62449` at every fetch before the push)
- Delivery-owned edits protected before re-integration: `Completed` (checkpoint commits `437bcacae3`, `3c2a6f11f5`)
- Re-integration before final merge result: `Not needed` (the target did not advance after `736526af88`)
- Target branch update result: `finalize/list-running-agents` created from `origin/personal` @ `be11a62449` in the ticket worktree (RELEASE.md Finalization Target)
- Merge into target result: `--no-ff` merge `002b4d781a`; its tree equals the ticket branch's `ac1454ed6f` (`git diff --stat codex/list-running-agents HEAD` empty). Secret Gate on the merged state: PASS (30 commits)
- Push target branch result: `be11a62449..002b4d781a  HEAD -> personal`
- User's checkout of the target branch (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`): fast-forwarded with `git merge --ff-only origin/personal` after this record commit's push when it is on `personal` with no local commits; the result is in the terminal message.
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (notes ready for the next release: `release-notes.md`)

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents`
- Plan, run after the record commit's push: `git worktree remove --force` (only untracked build output `*/dist/` remains), `git worktree prune`, delete the local branches `codex/list-running-agents` and `finalize/list-running-agents`.
- Remote branch: `Not required` (the repository keeps pushed `codex/*` branches).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected` (messages use the existing log line shape; the list reads run files read-only).
- Delivery action required: `None`. The release's `RELEASED` migration set in `app-data-migration-registry-order.test.ts` is for the release step only; this ticket adds no migration.

## Verification Checks

- Secret Gate on the ticket commits (29 commits) and on the merged state (30 commits): PASS.
- `python3 scripts/check_repository_artifact_hygiene.py`, `python3 scripts/check_licensing.py`: PASS.

## Rollback Criteria

- Revert the merge on `personal`. Nothing is stored in a new shape, so nothing needs converting. Messages already logged by this build stay valid log lines for an older build. A paired node on the older release reads the two new routes as 404, which is the same as before the change.

## Final Status

- Verification complete (from the evidence): `Yes`
- Repository finalization complete: `Yes` (`002b4d781a` on `personal`; this record commit follows it)
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: run after this record's push (Post-Finalization Cleanup); the result is in the terminal message
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: by `send_message_to` after the record commit's push
