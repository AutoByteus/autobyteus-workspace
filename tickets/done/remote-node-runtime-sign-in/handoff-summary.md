# Handoff Summary — remote-node-runtime-sign-in

## What Changed

On a remote node whose server can open a browser on its own desktop, Settings → Agent Runtimes now offers **Sign in** for Codex and Grok. The AutoByteus Docker image is such a node. The vendor's own login runs on the node and opens in its Chromium; the user finishes it in the workspace's **VNC Viewer**, and the row ends **Signed in**.

- Server: `isSignInBrowserAvailable(platform, env)` returns true on macOS/Windows; otherwise true only when `BROWSER`, `DISPLAY` or `WAYLAND_DISPLAY` is set. `AgentRuntimeStatusService.signInBrowserAvailable()` exposes it, and GraphQL `agentRuntimeSignInBrowserAvailable: Boolean!` returns it.
- Web: the `AgentRuntimes` query reads the field. The manager derives `nodeAccess` (`own` / `remoteDesktop` / `remoteStatusOnly`), and each row renders from it. Remote desktop nodes show a note pointing to the VNC Viewer, Sign in with "Finish signing in to <Runtime> in the browser on that node (VNC Viewer).", and "Sign in from its command line on that node." for Claude and Antigravity. A remote node without a desktop browser stays status only. Update is never offered on a remote node. Copy is in English and zh-CN.
- Unchanged: own-node behavior, Update gating, the mutations, the Docker image.
- Not in scope, recorded as follow-ups: FU-001 (chat shows "Reconnecting… n/5" instead of "not signed in"), FU-002 (device-code sign-in for headless nodes), FU-003 (two server unit test files that fail only in an HDD checkout).

## Answers To The Task's Questions

- Sign-in was missing on remote nodes because of a web-only gate (status only on every remote node). The node's server already accepted the sign-in.
- Only Codex and Grok get in-app sign-in. Their vendors provide and allow a browser login. Anthropic's terms forbid offering claude.ai login without approval (UD-006). Antigravity has no login command (UD-008).
- The chat's "An Error Occurred, Reconnecting… n/5" on the user's node is Codex getting `401 Unauthorized`: Codex is not signed in there (E-07).

## Route And Classification

- task_size `Medium`, architectural_risk `Low`, route `Direct Low-Risk`. Architecture, code and test-code review: `Not Applicable`.

## Repository State

- Worktree `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/remote-node-runtime-sign-in`, branch `feature/remote-node-runtime-sign-in`
- Implementation `c0b385524`; tests `5d2d1b53f`; API/E2E reports `591a72fbc`
- Delivery integration: merged `origin/personal` at `9e7a45880` (36 commits, the remote-agent-teams and remote-discovery work plus release 1.5.8-beta.6) as `ec4dcb177`. No conflicts, and the base touched no agent-runtimes file.
- Finalization target: `origin/personal`
- Finalized: merge `6d0898586` on `personal`; released as beta `v1.5.8-beta.7` (release commit `d2ef61aff`), complete: four of four workflows, 17 assets, Docker `:1.5.8-beta.7` and `:beta`. Decided by the user: "release a new beta please".

## Validation

- API/E2E Pass, final confidence 95%: server GraphQL E2E (AR-13), settings browser probe (ARP-08/10/11/12), and a real Docker node with the real Codex and Grok CLIs (API-08). That run covers the vendor page in the node's Chromium on its VNC display, the CLI callback on the node's loopback, Cancel, and a privacy scan with no hits.
- Post-integration rerun on `ec4dcb177`, all pass:
  - DR-01 server agent-runtimes unit tests: 55/55
  - DR-02 server typecheck
  - DR-03 web agent-runtimes and catalog tests: 35/35
  - DR-04 server GraphQL E2E: 13/13
  - DR-05 web guards: 3 × exit 0
  - DR-06 settings probe: 12/12, `Result: Pass`, ARP-10 scan with 0 hits, cleanup done

## Only The User Can Check

- AC-001/AC-002 end: Codex and Grok reach Signed in with the user's real accounts on the user's Docker node.
- AC-007: a Codex agent on that node answers without "Reconnecting… n/5".
- The user chose to check on the published beta. How to check:
  1. Update the desktop app to `1.5.8-beta.7` (Settings > Updates, with Receive beta updates on).
  2. Run `autobyteus-docker upgrade --all --tag beta`. The nodes keep their `/root` volumes.
  3. Open the :8002 node's window, go to Settings → Agent Runtimes, choose Sign in on Codex, finish in the VNC Viewer, and see Signed in. Do the same for Grok.
  4. Send a Codex agent on that node a message; it answers without "Reconnecting… n/5".
- Update the app and the nodes together (R-02). A failure is fixed forward in a later beta.

## Docs

- See `docs-sync-report.md`. Implementation updated `agent_runtimes.md` and `settings.md`; delivery updated `grok_build_runtime.md` and the Docker README's CLI Auth Model.

## Residual Risks

- R-01: real-account completion (the user check above). R-02: the app and the node must both run this change. If the app is updated first, it shows a load error for a node without the field. R-03: Chromium needs the container security options the image ships with (unchanged).
