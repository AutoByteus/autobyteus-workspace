# Handoff — Architecture Design Complete: S0 (autobyteus-402)

- Package: `docker-node-publish-needed-ports`, SR-001
- Task: autobyteus-402 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), slice S0 of autobyteus-394; requested by `/project_task_manager` for the user
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-publish-needed-ports`, branch `codex/docker-node-publish-needed-ports`, base `origin/personal` @ `6324fb056da909aeab6b19d74815bcfaddc633a8`; finalization target `origin/personal` (RELEASE.md). Ticket documents are not committed yet; commit them with the implementation.
- Ticket folder: `tickets/in-progress/docker-node-publish-needed-ports/`
- Approval: requirements approved by the user (parent autobyteus-394 REQ-012/REQ-018/AC-015 at SR-004, 2026-11-06: "Let's only publish the port that we need … the development port don't have to be published, then don't publish it"; "we work on the S0 first"); S0 details decided within that direction (DEC-S0-1…5).
- Classification: `task_size = Small`, `architectural_risk = Low` (design-spec.md) → direct implementation.

## What to build

New and recreated Docker nodes publish only the backend port (as today, all interfaces) and the VNC Viewer port 6080 on `127.0.0.1`; 5900 and 9223 are no longer allocated, stored, published or printed. Bash and PowerShell launchers, compose file, `.env.example`, `docker-start.sh`, launcher tests, docs and one in-app Docker Guide string (en, zh-CN). `CONFIG_HASH_VERSION` `v7` → `v8` so an existing node is recreated once, at the user's next `start`/`upgrade`, keeping its named volumes and its backend and VNC Viewer ports. Exact file list, removal plan and examples: design-spec.md.

## Must not change

- `-e AUTOBYTEUS_VNC_SERVER_HOSTS` (today's viewer reads it; slice S1 removes it), `Dockerfile.monorepo` `EXPOSE`, the base image repository, the viewer, the server.
- The user's running nodes `autobyteus-server-0/1/2`: run nothing against them. Tests use temp `AUTOBYTEUS_DOCKER_STATE_DIR` / `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR` and a test node name; remove the test container and its volumes afterwards.

## Acceptance

AC-001 … AC-007 (requirements-doc.md). Reproduction to start from: `scripts/tests/test_public_docker_launcher_shared_workspace.py:245-250` rewritten to the new expectations fails on the current launcher. RFB transport check for AC-006: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-desktop-access-through-node-server/tickets/in-progress/remote-desktop-access-through-node-server/probes/rfb-forwarding-probe.mjs` (`MODE=handshake WSF_PORT=<VNC Viewer port>`).

## Risks

`pwsh` is not installed on this Mac: PowerShell parity by static test and review. Release only on the user's word.

## Documents

requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md (this folder). Parent package: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-desktop-access-through-node-server/tickets/in-progress/remote-desktop-access-through-node-server/`.

## Route

Handoff rule: Architecture Design Complete, Small + Low → `/software_engineering_team/implementation_engineer`.
