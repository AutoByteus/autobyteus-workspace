# Handoff Summary — list-running-agents (autobyteus-492)

## Summary Meta

- Ticket: `list-running-agents` (Project Task `autobyteus-492`): the run ID is the address; the new tool `list_running_agents`.
- Date: `2026-11-18`
- Classification: `task_size: Large`, `architectural_risk: High`.
- Route: architecture review (ARCH-REV-001 … 004, Pass at SR-008/009) → implementation (IR-001, IR-002) → source review (CRR-001 Fail, CRR-002 Pass) → API/E2E (API-REV-001 Pass, 95.3%) → test-code review (CRR-003 Pass) → delivery (DR-001).
- Current Status: `Verified from evidence / finalized on personal; no release` (see `release-deployment-report.md` for the commits).
- Branch: `codex/list-running-agents`, base `origin/personal` @ `bd2053ee51`; delivery refreshes merged `origin/personal` @ `75048cbaf4` as `df6992e0c1` and @ `be11a62449` as `736526af88` (no conflicts). Code commits `deacacf948` (IR-001) and `5f89ecbdf5` (IR-002); tests `9fc0df5db3`, `ec66ee7d01`.

## Delivery Summary

- **`send_message_to` reaches any running agent by run ID** (CM-13). On this node, the run ID alone; on a paired node, the run ID with the new optional `node` (the peer's name). Any sender may use it: a run a person started, a task agent, a member of a Team or task agent team, an Org's agent. A different Task is no longer a reason to refuse.
- **It never wakes anything.** A message reaches only an agent that runs now, in its live root. A stopped or unknown run ID is refused "not running" (with a pointer to `list_running_agents` and `node`). Only Task-related runs still wake each other (CM-5), and a closed Task stays closed (`TASK_AGENT_RESOURCE_CLOSED`, except its assigner's reopen); a peer's run whose Tasks this node holds is refused here for every sender, with or without `node`.
- **A team run's ID** is refused with its coordinator's run ID, also by a peer for a team that runs there.
- **New tool `list_running_agents`** (opt-in, like `list_peer_nodes`): lists the Agent and Team runs a person started that run now, here or on a paired node (`node`), with `agent_run_id` / `team_coordinator_agent_run_id`, `workspace`, `state`, `started_at`, `project`; filters `address` and `state`. Never a title, content or member; Org runs, Team members and delegated runs are not listed.
- **Two new peer routes**, both behind the node access gate (signed): `/rest/remote/run-messages` (a one-message `unlinked_run` endpoint, no root named, never wakes) and `/rest/remote/running-agents` (strict reader).
- **Unrelated messages stay out of run views** (DEC-014): both agents' conversations and both runs' logs hold them; the live feed and the Team tab's read do not show them. A Task-related message still shows.
- Removed: the different-Task refusal (M-06, `OTHER_TASK_REFUSAL`), the CONFLICT answer on this path, the outbound "not linked with you" refusal. The result catalogue is M-01 … M-50.
- Docs: `collaboration_model.md` (CM-13, § 1 terms, CM-5/CM-11, § 4 and § 5), `agent_communication.md`, `agent_tools.md`, `remote_collaboration.md` (from implementation, verified by delivery); at delivery `prompt_engineering.md`, `agent_tools_mcp_server.md`, `standalone_agent_run_root.md`, `agent_team_execution.md`, and one sentence in `remote_collaboration.md` (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence by delivery; no user check needed. Every critical acceptance criterion (AC-001, 002, 004 … 008, QR-003) is directly proven on built servers over real HTTP; AC-003, AC-009, QR-001, QR-002 also.
- Key evidence (all under `evidence/`):
  - `API-06-run1/API-06-run1-vitest.log` and `API-06-receipt.json`: two-server suite 48/49; the one failure was RC-47's own `[]`-versus-`{}` assertion (a test defect), which passed 12/12 in `API-06-rc47/` with the cases it depends on. RC-48 gate block (unsigned 401, owner bearer 403, wrong secret 401, unpaired 401), RC-49 row 13 (six senders refused `TASK_AGENT_RESOURCE_CLOSED`) and row 14 (beta's and zeta's agents delivered), RC-47 `g1` (unrelated `false`, related `true`, live and stored).
  - `API-07-cpw-e2e.log`: collaboration-prompt-wording 14/14 (CPW-R2: a task agent messaging another Task's running agent is delivered).
  - `API-08-run1/` and `API-08-reruns/`: contract stories §5.1, §5.2 (U9 delivered) and §5.3 (O9) on built servers, every file compared after every step.
  - `API-03`, `API-04`, `API-05`, `API-09`, `API-10`, `API-12`: typecheck, whole `test:integration` and `pnpm test:e2e`, the search of gated suites for exact tool lists, tracked imports, fresh-start build.
- Integrated state (`evidence/DEL-post-integration/`): the base moved twice during delivery, so the branch was merged twice (`df6992e0c1`, `736526af88`).
  - After the first merge (49 base commits): both typechecks PASS; the whole server unit suite `Tests 1 failed | 8394 passed` (the one failure is a real-file-event timeout in `skill-folder-watcher.test.ts`, a file identical to `personal`, which passes alone 9/9); the server rebuilt and the two-server suite's RC-01…RC-11 plus RC-47/48/49 `14 passed`.
  - After the second merge (autobyteus-491): both typechecks PASS (baselines `1008 in 315` and `87 in 37`); 213 files / 1554 tests of the touched areas, the migration registry and `tests/architecture` pass; the server rebuilt and the same 14 two-server cases pass again.
- Final confidence 95.3%, no category below 95%.

## Residual Risks For The User

- **BEH-007** (a message waits for a busy receiver's turn) is proven in process only; the scripted runtime on built servers answers at once.
- **`workspace` carries a local folder path** to the asking node (DEC-013, your request). A paired node's agents show their paths to the node that asks.
- **Both nodes need this release** (DESIGN.md rule 9, no version handling): an older peer answers 404 and reads as unreachable for these two requests.
- **Environment-bound tests outside the change** fail by time on a loaded machine (FSEvents, in-process `close()`): FU-001, FU-005; the same kind failed once more on the integrated unit run and passed alone (`evidence/DEL-post-integration/`). None reaches code this ticket changed.
- The contract model's executable files live in a done ticket's evidence folder, and this ticket edited them (FU-004).

## Follow-ups

`follow-ups.md`: FU-001 … FU-005 (implementation, code review and API/E2E: test timing under load, the contract model's location) and FU-006 (delivery: `remote_collaboration.md` intro still says peers have no authentication). The Solution Designer sends them. FU-001 and FU-005 name tests the base's autobyteus-517 also edited, so the Solution Designer should check what remains before sending them.

## Release

- No release. The requirements doc says the founder releases only on his word, none was asked for, and RELEASE.md's default is no release. `release-notes.md` holds the user-facing notes for whichever release includes this change.
