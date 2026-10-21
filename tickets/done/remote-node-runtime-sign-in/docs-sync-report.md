# Docs Sync Report — remote-node-runtime-sign-in

## Scope

- Ticket: `remote-node-runtime-sign-in` (task_size `Medium`, architectural_risk `Low`, route `Direct Low-Risk`; review gates `Not Applicable`)
- Trigger: API/E2E Pass (API-REV-001, commit `591a72fbc`), handed to delivery
- Bootstrap base reference: `origin/personal` at `a22394f0c`
- Integrated base reference used for docs sync: `origin/personal` at `9e7a45880`, merged into the ticket branch as `ec4dcb177`
- Post-integration verification reference: DR-01…DR-06 on `ec4dcb177` (`evidence/DR-*.log`), all pass

## Why Docs Were Updated

- Summary: Remote nodes with a desktop browser, such as the AutoByteus Docker image, now offer Sign in for Codex and Grok in Settings → Agent Runtimes. The login runs on the node and opens in its Chromium, which the user sees in the VNC Viewer. The server reports this per node with `agentRuntimeSignInBrowserAvailable`. The implementation already updated the two main docs. Delivery found two more that still described sign-in as own-node or terminal only, and fixed them.
- Why this should live in long-lived project docs: the node fact, the rule behind it (platform / `BROWSER` / `DISPLAY` / `WAYLAND_DISPLAY`) and the three page modes (`own`, `remoteDesktop`, `remoteStatusOnly`) are lasting behavior, and Docker users need to know how to sign in.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | Owns the runtime status service and GraphQL API | No change (updated by implementation, `c0b385524`) | Matches the code: rule file, `signInBrowserAvailable()`, the field, remote-node behavior |
| `autobyteus-web/docs/settings.md` | Owns the Agent Runtimes page | No change (updated by implementation) | Copy matches the screenshots (ARP-11b, API-08 D1). The base merge changed a different section (Remote Collaboration); no conflict |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Its Authentication section names where `grok login --oauth` can start | Updated | It said "on the desktop's own node" only |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Its Authentication section names the sign-in surface | No change | It names Settings → Agent Runtimes without limiting it to a node; still accurate |
| `autobyteus-server-ts/docker/README.md` (CLI Auth Model) | User-facing Docker sign-in instructions | Updated | It listed only terminal logins; it now also gives the in-app Sign in for Codex and Grok |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | Implementation (`c0b385524`) | Node fact, rule, field, remote-node behavior | New API and behavior |
| `autobyteus-web/docs/settings.md` | Implementation (`c0b385524`) | Sign in on remote nodes with a desktop browser, node access modes, copy | New page behavior |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Delivery | Grok's login can also start on a remote node that can open a browser on its own desktop, such as a Docker node | Was stale |
| `autobyteus-server-ts/docker/README.md` | Delivery | Paragraph in CLI Auth Model: Codex and Grok can be signed in from Settings → Agent Runtimes in the node's window and finished in the VNC Viewer; Claude and Antigravity stay terminal logins | Docker users' main sign-in instructions |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Sign-in browser availability | One rule per node, decided at server start; the web offers Sign in on a remote node only when it is true, never Update | design-spec.md | `agent_runtimes.md`, `settings.md` |
| Docker sign-in path | The image's `BROWSER` bridge opens the vendor login in the VNC Chromium; the CLI callback listens on the node's loopback | investigation-notes E-08, API-08 | `docker/README.md`, `agent_runtimes.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "Remote and Docker node windows are status only" (D-3 of `runtime-lifecycle-review`) | Status only applies only when the node has no desktop browser; otherwise Sign in is offered | `settings.md`, `agent_runtimes.md` |
| Web `isOwnNode` gate | `nodeAccess` (`own` / `remoteDesktop` / `remoteStatusOnly`) | `settings.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A, docs were updated

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification. The parts only the user can check (AC-001/AC-002 end, AC-007) need the user, then finalization.
- Notes: no long-lived doc outside this ticket's behavior was found wrong; no new follow-up.
