# Solution Handoff — agy-docker-node-availability-diagnostics

- Result: **Architecture Design Complete**. `task_size = Small`, `architectural_risk = Low`, so it goes straight to implementation, without independent architecture review.
- Package identifier: `agy-docker-node-availability-diagnostics`
- Current SR: SR-003
- Priority: **URGENT**. User, 2026-10-12: "we need a ticket to fix this bug immediately"; later "fix the agy bug now".
- Originating Task: Project Task `project_task_4fbcd0c4-a279-4ead-85a3-17a2a7513e38`, delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics`
- Branch: `codex/agy-docker-node-availability-diagnostics`
- Base: `origin/personal` @ `2756d7b29` (fetched 2026-10-12)
- Finalization target: `origin/personal`
- Ticket folder: `tickets/in-progress/agy-docker-node-availability-diagnostics/` (in the worktree)

## Artifacts (absolute paths)

- Requirements (Approved, SR-002): `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/solution-revision-record.md`
- User screenshots (evidence): `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_4fbcd0c4-a279-4ead-85a3-17a2a7513e38/context/ctx_f977267ffa8a__34.png`, `…/ctx_2f1b43f59734__35.png`, `…/ctx_8409b97bcc15__36.png`
- Architecture review artifacts: N/A — not applicable (Small/Low direct route)
- Product Design artifacts: N/A — not applicable

## Original Request And Goals

The Docker node `http://localhost:8003` shows "Antigravity CLI — Not installed", although `which agy` → `/usr/local/bin/agy`. The goals:

- find the real cause;
- make Antigravity offered where it is installed and usable;
- where it can't be used, show the actual reason with a way to recover;
- check the Docker image and docs.

Done means:
- a signed-in Docker node lists Antigravity models and a run works;
- the UI states the actual reason;
- tests are at the right levels;
- the fix is released and the user checks it on their Docker node.

## Root Cause (verified live, 2026-10-12)

- Both nodes run the same, newest image: `autobyteus/autobyteus-server:beta` = `1.5.3-beta.1`, `sha256:62ee64827c53…`. Both have `agy` 1.3.3, the same PATH, and run as root.
- Node 8003's persistent `/root` volume has **no Antigravity sign-in**. `agy models` exits 1: "Please sign in to view available models. Launch the CLI without arguments to sign in." Node 8001 is signed in and works.
- The server maps that failure to the generic "Antigravity model discovery failed; check authentication or network and retry."
- `ChatModelMenu.vue` labels every unavailable runtime "Not installed"; the reason appears only as a tooltip.
- The menu checks availability once per session, so signing in doesn't show until the app reloads.

## Approved Scope (summary; requirements doc is authoritative)

- REQ-001: sign-in-required classification with the fixed text "Antigravity CLI is not signed in. Run `agy` in this node's terminal and complete sign-in, then try again." It reaches every existing consumer, and no CLI output is echoed.
- REQ-002: clearer AGY texts for "not installed" and "too old".
- REQ-003: the menu uses a neutral "Unavailable" label (en/zh-CN), never "Not installed", and shows the server reason visibly under the runtime name.
- REQ-004: opening the menu re-checks runtimes that were unavailable.
- REQ-005: the signed-in path is preserved (models + run).
- REQ-006: Docker README and AGY module doc updates.
- REQ-007: tests at the right levels.
- **Not in scope:** Codex (user: "codex is not a bug"); any GraphQL/API change (DEC-002: the app has no handling for an older node, so a new field would break it); Dockerfile/image changes; other runtimes' detection logic.

## Constraints

- Keep the discovery bounds and sanitization; no GraphQL schema change; don't touch `runtimeAvailabilityStore`, the Codex/Claude/Grok providers or the Dockerfile.
- Follow `DESIGN.md` and `TESTING.md`. Never print or copy credentials. Never modify the user's running containers' volumes (`autobyteus-server-*`); use test-owned homes/containers for validation.

## Expected Output From Implementation

The implementation per the `design-spec.md` "Final File Responsibility Mapping" and "Guidance For Implementation", the implementation-scoped checks, and `implementation-handoff.md`. Then follow the team's handoff rules.

## Open Risks

- RSK-001: upstream may reword the sign-in message, which degrades to the generic text.
- RSK-002: each menu open spawns `agy` (~2 s) while it is signed out; the spawn doesn't block the menu.

## Next Expected Actions

1. Implementation.
2. Code review.
3. API/E2E validation, including on a Docker node: signed out → sign-in reason; signed in → models + run.
4. Delivery: release, then the user verifies on node 8003. The user signs in with `agy` in the 8003 Terminal, then reopens the menu.

## Route Record

- `get_handoff_rules` (2026-10-12) matched the rule "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`.
