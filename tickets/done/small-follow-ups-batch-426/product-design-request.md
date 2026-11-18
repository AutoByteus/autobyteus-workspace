# Product Design Request — small-follow-ups-batch-426 (round 2 text)

- Purpose: `New Request`
- Requested by: the user, through Project Task autobyteus-426 (2026-11-07), items 15 and 16: "Product UI/UX text first". Delegated by `/project_task_manager` to the Software Engineering Team; sent by its Solution Designer.
- Requirements context: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/requirements-doc.md` (REQ-015, REQ-016, round 2) and `investigation-notes.md` (E-15, E-16)
- Related approved Product work: the Phone Setup UI/UX spec of autobyteus-395 (one-step phone pairing), in the Product Team's repository for that ticket.

## What the user wants

Two short wording refinements in the desktop's Phone Setup panel ("Connect a phone"), both written by the Product Team before engineering builds them.

### Item 15 — Phone Setup in the window of a node with an older server

- Today: in the window of a node that runs an older server (a Docker node or a node on another machine not yet updated), Phone Setup cannot load, because the older server has no `GET /rest/remote-access/network` (new in 395). The panel shows the raw request error (e.g. a 404 message).
- Wanted (Task lead): when the window's node is older than the desktop, say in plain words that the node needs an update, e.g. "Update `<node>` to connect a phone", with the update command for a Docker node.
- Questions for the Product text: the title/body/action of this state; whether the Docker update command is shown (and how, e.g. copyable) and what a non-Docker remote node shows instead; what Retry/Check looks like after the update.
- Facts: the desktop knows the node's kind (`embedded`, `local_container`, `remote`) and its name; a phone already paired to an older node keeps working (it talks only to that node). The Docker node update today is described in the product's Docker update docs (engineering can supply the exact command once the text is set).

### Item 16 — Not-ready lines in a remote node's window

- Today: in a remote node's window, the not-ready status lines speak of "this computer", e.g. "No VPN found on this computer. Connect it, then Check again." and the Wi-Fi/LAN line, even though the node is on another computer whose own addresses exist but do not reach this desktop. Users read "this computer" as their desktop. Current keys: `settings.components.settings.phone.status.*`, `note.*` (`autobyteus-web/localization/messages/en/settings.ts:306-321`); evidence: autobyteus-395 API/E2E `evidence/API-10-remote-node.txt` §5.
- Wanted (Task lead): word these lines for that node (e.g. "`<node>` isn’t reachable on a Wi-Fi or LAN address from this computer").
- Questions: the wording of each not-ready (and, if needed, ready) line for a remote node, per way (Same Wi-Fi or LAN, Tailscale, VPN); whether embedded and local-container nodes keep today's text (engineering assumes yes).

## Constraints and non-goals

- Desktop Phone Setup panel only; no layout change beyond the text and the update state's action(s); English source text (the app localizes it).
- Non-goals: phone screens, Android app, iOS.

## Expected result

An approved, user-confirmed text spec (strings per state and node kind, any action and command presentation) that engineering can build, returned to the Solution Designer (run id of the requester in the delegation) with its durable path.
