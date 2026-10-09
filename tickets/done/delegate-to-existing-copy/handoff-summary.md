# Handoff Summary — delegate-to-existing-copy

## User Verification

- Verified by the user on 2026-10-09: "Okay finalize and release a new beta version." The user also asked for the API/E2E video to be made smaller before committing it.
- Decisions:
  1. Release a new beta (`v1.4.99-beta.8`).
  2. Trim the recording: `journey.mp4` went from 387 s / 12.6 MB to 58 s / 1.4 MB at 1512 px. Every near-frozen stretch keeps 0.5 s from its start and 0.8 s from its end. The full original is kept outside the repo at `/Users/normy/autobyteus_org/ticket-media/delegate-to-existing-copy/journey-full-387s.mp4`. An unreferenced `journey-5x.mp4` (77 s, 4.8 MB, full resolution) appeared in the evidence folder at 12:03, created by someone else. It duplicates the trimmed recording, so it was moved to the same folder rather than committed.
  3. Push the agents repo to `main` together with the server finalization.

## State For User Verification

- Server worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy`, branch `codex/delegate-to-existing-copy` (local only).
  - `c395e24a5`: S1 rename.
  - `1e5d757a9`: the feature.
  - `1e676ca54`: docs.
  - `24056ffdd`, `1aa02f256`: test alignment.
  - `88e59f500`: the CR-001 fix.
  - `75bcb39c8`: delivery checkpoint (durable E2E and API/E2E artifacts).
  - `97b767186`: merge of `origin/personal` @ `927796780`, which includes delegated-copy-member-contact-delegator and beta.7.
  - `17a5f2125`: IR-003 aligns two base-added tests to the explicit `delegate_task` contract.
  - `97c6b5b8e`: CRR-005/006 and API-REV-003 artifacts.
  - Ticket-artifact commits `cc6ca46d3`, `9d9cc56d1` and `1252b6034`.
  - Not yet committed:
    - the delivery artifacts;
    - `api-e2e-evidence/electron/journey.mp4` (see Decisions).
- Agents worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-agents-delegate-to-existing-copy`, branch `codex/delegate-to-existing-copy`, commit `0bd84e0` (PTM skill and board template).
  - It is 1 ahead of `origin/main` `fd2b99e`, which has not moved, so it can fast-forward.
  - **It must ship with the server change.** DEC-008 is a clean break: a Team result no longer has `target_agent_run_id`.
- Base and finalization target: `origin/personal`. The ticket branch contains the latest `origin/personal` (`927796780`), re-checked when this summary was written.
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed.
- Not to be committed: the untracked `*/dist/` folders.

## What Changed

- **Follow-up Task to the same copy:**
  - `delegate_task({target_team_run_id | target_agent_run_id, task_id})` gives a new Task to an existing copy, which resumes with its conversation.
  - This is allowed only when the copy's current Task is DONE or CANCELLED, and only for the copy's most recent assigner. A busy copy is refused, not queued.
  - The earlier Task stays DONE and is never reopened. Closing it again never stops the copy while it works on the new Task.
- **Explicit IDs (clean break):**
  - An Agent copy returns `target_agent_run_id`.
  - A Team copy returns `target_team_run_id` and `target_team_coordinator_agent_run_id`.
  - A refusal is `{delegated: false, message}`.
  - `send_message_to` refuses a team run ID and names the coordinator's ID to use.
- **One current Task per copy:**
  - `list_project_tasks` gives `assignments` (open) and `closedAssignments`, both with explicit IDs.
  - The board root of the new Task is the reused copy.
- **Internals:** "agent run resources" was renamed to "task execution resources". The persisted names are unchanged, and no migration is needed.
- **Texts and docs:** all agent-facing tool descriptions and prompts, plus `projects.md`, `agent_team_execution.md`, `agent_tools.md`, `agent_tools_mcp_server.md`, `agent_communication.md`, `codex_integration.md`, `prompt_engineering.md` and `TESTING.md` (see `docs-sync-report.md`).
- **Agents repo:** the Project Task Manager skill uses the follow-up path, and its board keeps the copy IDs.

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-003 Pass |
| Code review | CRR-003 Pass; CRR-005 Pass (round 4: the merge and IR-003). Test-code review CRR-004 Pass with no findings; CRR-006 Not Applicable (no test change) |
| API/E2E | API-REV-002 Pass (95.4%): real HTTP/WS/scoped-MCP E2E in all three roots, 48 parallel-call race rounds, a real Claude case, browser BR-012..016 across backend restarts. API-REV-003 Pass (~96%) on the integrated base, plus a **packaged Electron journey with a real model**: the PTM reused the same Team copy for follow-up Task B, and the copy recalled Task A's context (`api-e2e-evidence/electron/`) |
| Delivery, on the integrated state `97c6b5b8e` | • `pnpm -C autobyteus-server-ts typecheck`: clean.<br>• `pnpm -C autobyteus-server-ts test:unit`: 669 files, 5167 tests pass (7 skipped). This is the full suite.<br>• Fake-AGY E2Es `task-existing-copy-assignment`, `delegated-copy-member-contact-host` and `ad-hoc-task-delegation`: 11 pass, 1 skipped (the gated live-Claude case, which passed in API-REV-003).<br>• Logs: `delivery-evidence/dr2-*.log`. The first run (DR-001) caught two stale base-added tests, which IR-003 fixed. |

## How To Verify

The API-REV-003 Electron run already covered this journey. To try it yourself, start an isolated app built from this worktree. It uses separate data and does not touch your own app.

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy
pnpm --silent isolated-app start --build
```

1. In Settings → Agent Packages, add the local path `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-agents-delegate-to-existing-copy`. This loads the updated Project Task Manager skill.
2. In a Project, start a Project Task Manager run. Ask it for Task A for a Team (e.g. the software engineering team), with something memorable in it, and let the Team finish. Mark A DONE.
3. Ask the manager for a follow-up Task B "for the same team that did A".
   - Expected: the manager delegates B to the **same** Team copy, not a new one.
   - Expected: the Team's conversation continues, and it knows about A.
4. On the Projects board, A stays DONE, and B shows the same Team copy as its root.
5. Optional: mark A DONE again. The Team keeps working on B.

Stop the app with `pnpm --silent isolated-app stop`.

## Decisions Needed At Verification

1. **Release:** finalize only, or also publish a new beta (`v1.4.99-beta.8`)?
2. **Recording:** `api-e2e-evidence/electron/journey.mp4` is 387 s and 12.6 MB. As on the last ticket, I propose committing only a trimmed version (about 1 MB, with near-frozen stretches cut) and keeping the full one out of history.
3. **Agents repo:** with your approval, I push `0bd84e0` to `AutoByteus/autobyteus-agents` `main` right after the server merge to `personal` (and after the release, if any). Users who update the agent package before upgrading the server would get skill text that names the new fields.

## Residual Risks (non-blocking)

- MP-003: the release window is covered only probabilistically (48 race rounds, no violation).
- C-09 (accepted): while a failed copy's own Task is still open, the refusal is generic.
- `project-task-service.ts` is at 489 of 500 lines; split it before the next feature.
- Downgrading after a copy has been reused is not supported (documented).
- O-001..O-003 and a renderer agent-catalog reload after an API-side package import are unrelated to this ticket.
