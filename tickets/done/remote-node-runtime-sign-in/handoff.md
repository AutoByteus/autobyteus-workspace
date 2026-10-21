# Handoff — remote-node-runtime-sign-in (Solution Designer → Implementation Engineer)

- Result: **Architecture Design Complete**, task_size **Medium**, architectural_risk **Low** → direct implementation route (no independent architecture review), per handoff rules.
- Package: `remote-node-runtime-sign-in`, current SR-002.
- Ticket folder: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/remote-node-runtime-sign-in/tickets/in-progress/remote-node-runtime-sign-in/`
- Worktree / branch: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/remote-node-runtime-sign-in`, branch `feature/remote-node-runtime-sign-in`, base `origin/personal` at `a22394f0c`; finalization target `origin/personal`.
- Requested by: `/project_task_manager` (run `project_task_manager_21a48907070a400cb84ae3c055534692`), Project Task folder `/home/ryan-ai/.autobyteus/server-data/projects/project_de48ed0e-f4a2-43d7-b22a-4c162c9b1dda/tasks/project_task_cd8178f2-8534-4aae-bfd0-b598a52fc105`.

## Original request (Task, summarized)

On a remote Docker node (`http://localhost:8002`), Settings → Agent Runtimes is "Status only" with every runtime "Not signed in" and no Sign in. The user wants to sign runtimes in on a Docker/remote node from the app. The page should use the node's own browser, which the user sees through the app's VNC view, or another workable flow. Answer first why sign-in is missing and why only some providers have in-app sign-in. Confirm or rule out that the chat's "An Error Occurred, Reconnecting… n/5" comes from not being signed in. Done = explained; sign-in works on a Docker/remote node and status shows Signed in; unsupported cases explained and recorded as follow-ups; merged to the base, verified against a running Docker node, cleaned up (worktrees, branches, test containers), follow-ups recorded.

## Answers (details in requirements-doc "Answer To The User's Question")

- Sign-in is hidden on remote nodes because of a web-only gate. The first version chose "status only" (D-3 of `runtime-lifecycle-review`), assuming the browser is always on the user's desktop. The node's server already accepts the sign-in. The Docker image already opens browser requests in its VNC Chromium (reproduced, E-08).
- Codex and Grok have the vendor's own browser login, and the vendors allow it (in-app). Claude: Anthropic's terms forbid offering claude.ai login without approval (user decision UD-006). Antigravity: no login command, interactive-only, unclear Google position (user decision UD-008).
- Chat errors: confirmed. Codex got `401 Unauthorized` six times on the user's node (E-07); Codex is not signed in there. FU-001 records that the chat does not say so.

## Approval basis

Requirements SR-001 approved by the Solution Designer within the Task's direction, user informed; no `Needs user` decisions (DEC-001…DEC-006 decided with reasoning).

## What to build (design-spec.md)

- Server: `isSignInBrowserAvailable(platform, env)` rule (macOS/Windows yes; else `BROWSER`/`DISPLAY`/`WAYLAND_DISPLAY` set). `AgentRuntimeStatusService.signInBrowserAvailable()` (injectable). GraphQL `agentRuntimeSignInBrowserAvailable: Boolean!`.
- Web: read the field in the `AgentRuntimes` query. The manager derives `nodeAccess` (`own` / `remoteDesktop` / `remoteStatusOnly`). The row renders by `canSignInHere` / `canUpdateHere`. Three new copy keys (en + zh-CN, texts in design-spec). Docs.
- Own node and Update gating unchanged; no Docker image change; mutations unchanged.

## Start here

- Reproduction: `evidence/SD-probe-remote-signin.sh [image]` (server path on a throwaway Docker node; already passes on `autobyteus/autobyteus-server:beta`). The failing piece is the web gate. Start from a web unit test of a remote-node window with the node fact true, expecting Codex's Sign in.
- Real Docker check: build the server image from the branch and run the probe against it; real-account completion (AC-001/002 end, AC-007) is the final check on the user's node once it runs this build (R-01, R-02).

## Open risks

R-01 real-account completion not yet observed; R-02 the user's node must run a server with the new field; R-03 Chromium needs the shipped container security options.

## Follow-ups (not yet sent; sent when the ticket leaves the team)

FU-001 chat error for unsigned runtimes; FU-002 device-code sign-in for headless nodes. See `follow-ups.md`.

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, `evidence/` (probe script and logs, user screenshots).

## Route

Handoff rule applied: "task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer` (2026-10-21).
