# Handoff Summary: internal-agents (autobyteus-308)

- Status: verified from the evidence, archived and finalized on `personal`. No release (Task constraint: "no release unless asked"). The final repository state is in `release-deployment-report.md`.
- Classification: `task_size=Medium`, `architectural_risk=Low`, direct route.
  - Architecture review: `N/A — not applicable`.
  - Code review and test-code review: `N/A — not applicable` (direct low-risk route).
  - API/E2E: API-REV-001 Pass, final confidence 95%.
- Revisions: SR-001 / IR-001 / API-REV-001 / DR-001.
- Worktree (removed after finalization): `/Users/normy/autobyteus_org/autobyteus-worktrees/internal-agents`, branch `codex/internal-agents`.

## What Changed

- An agent definition may carry `"internal": true` in its `agent-config.json` (shared, team-local and application-owned definitions alike). Saving keeps it; a normal agent's file gains no key.
- New server setting **Show internal agents** (`AUTOBYTEUS_SHOW_INTERNAL_AGENTS`), off by default. It can be set in Settings → Server Settings → Basics ("Internal agents" card) or as an environment variable, and it applies on the next read without a restart.
- While the setting is off, internal agents and their runs are left out of:
  - the Agents page and every agent picker;
  - run history and the Memory page;
  - `list_available_agents`, `@` candidates and `@` mentions;
  - `delegate_task` (refused with today's "not an available agent" text);
  - a peer node's offer and delegation;
  - `list_agent_definitions`.
- While it is on, internal agents appear like other agents, with an "Internal" badge on the Agents page.
- Opening an internal agent's definition or run by ID always works. Hidden is not protected.
- One rule, `InternalAgentVisibility`, is asked by every owner listed above.
- Code commit: `813f7208d2`. Tests (API/E2E): `17a6904e70`.
- Durable tests:
  - server E2E `tests/e2e/agent-definitions/internal-agents.e2e.test.ts` (IA-01…05);
  - RC-38 in the two-server E2E;
  - browser probe `autobyteus-web/tests/e2e/internal-agents-probe.mjs` (IP-01…05);
  - unit and component tests.
- Docs:
  - By the implementation: `agent_definition.md`, `settings.md`, `GLOSSARY.md`.
  - By delivery: exclusion lists in `run_history.md`, `agent_memory.md`, `remote_collaboration.md` and `agent_communication.md`; the FU-001 note and test listings (`docs-sync-report.md`).

## Integration

- `origin/personal` was still at the bootstrap base `651071758f`, so the branch was already current. Nothing was merged.
- Delivery smoke rerun on the final state: the internal-agents server E2E passed 5/5 (`evidence/delivery/DEL-01-internal-agents-e2e-rerun.log`).
- The Task's clean-clone proof was done by API/E2E (API-10, fresh clone of `17a6904e70`):
  - typecheck exit 0;
  - focused unit 73/73;
  - web 9/9;
  - new E2E 5/5.

  The commits after it change only ticket documents and docs.

## Verification From Evidence

All six critical acceptance criteria are directly proven. The table is in `release-deployment-report.md`.

- **AC-001, AC-007:** IA-01 and the browser probe (IP-01) show the agent hidden from the list, the store every picker reads and the featured picker, while normal agents are unchanged.
- **AC-002:** IA-03 uses a real recorded run. It is absent from run history and the Memory page (not moved to Unattributed) and opens by run ID.
- **AC-003:** IA-04 runs the real tools over Agent Tools MCP. `list_available_agents` leaves the agent out, `delegate_task` is refused and nothing starts, and an `@` mention is refused. RC-38 shows the same between two real nodes.
- **AC-005:** IA-01, 03 and 04, RC-38 and IP-03/04 show the setting turned on and off without a restart: everything shows the agent, delegation starts a copy, and the badge appears.
  - The requirement's verification intent also names a "user check". The real-stack browser run is that check, with screenshots.
  - Neither the Task's constraints nor its completion conditions as recorded ask the user to check personally, so no user check was requested (see the report).
- **AC-006:** IA-02 shows the file keeps `"internal": true` after a save.
- **AC-004** (not critical, REQ-006 "Should"): the filter is proven at code level only. The tool `list_agent_definitions` is registered on no node today, on base too (FU-001), so no agent can reach it either way.
- Evidence note: the screenshot `IP-03b-basics-card-on.png` draws the switch off. It was captured inside the switch's 150 ms animation, after the probe had asserted `aria-checked="true"` and the server's saved `true`. The switch's look is bound to the same value, and `IP-03c` shows the result (badge).

## Follow-ups (`follow-ups.md`, sent by the Solution Designer)

- FU-001: the agent-management tools (`list_agent_definitions` and the rest) are registered on no node, because `registerAgentManagementTools()` has no caller, since `b1c89884e6`.
- Delivery found no new follow-up.

## Notes For autobyteus-32

- From the implementation handoff: while hidden, an application bound to a *shared* internal agent would not resolve at launch.
- O-1: a hidden agent's run opened by URL shows a generic avatar.
- O-2: a hidden `@` mention is refused with `COLLABORATOR_ADD_FAILED`, today's wrapping of an ineligible mention.

## Release

- Decision: no release (Task constraint; the user did not ask). The change ships with the next beta or stable release.
- The stale analysis worktree `/Users/normy/autobyteus-worktrees/internal-agent-frontend-visibility` was not touched (the Task Manager asks the user).
