# autobyteus-437 — Architecture Design Complete (handoff to architecture review)

- Package: `node-universal-authentication-437`, SR-004
- Classification: `Architecture Design Complete`, task_size `Large`, architectural_risk `High` (design-spec.md, "Task Size And Architectural Risk")
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437`, `codex/node-universal-authentication-437`, `origin/personal` @ `b690a5dfdb`; finalization target `origin/personal`. Documents are uncommitted in the worktree; no source changed.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user; Project Task `autobyteus-437` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`).

## Request and approval basis

- The user's direction (Task): every endpoint of a node needs a credential; the desktop gets its credential when it starts its node; phones and peer nodes get theirs by pairing; no credential, no access, on any network.
- Requirements approved by the user (SR-002, 2026-11-08: he delegated the five open decisions to the recommendations).
- Design, the node access contract and building slice 1 after an architecture review pass approved by the user (SR-004, 2026-11-08: "Yes approved"). Release only on the user's word.

## What to review

- `design-spec.md`: slice 1 "no key, no access": one gate (Host → Origin → network admission → credential → route permission), the new `node-access` subsystem (owner/launch credentials, setup codes, network admission, credential resolver), phone verifier with an in-memory registry, peer pairing with signed requests (HMAC, nonce, ±300 s), MCP gateway token always, memory sync sources as a gate credential kind, Electron main-process credential store and attachment, Docker launcher publishing, dev runtime, upgrade states.
- The project contract it implements: `autobyteus-server-ts/docs/design/node_access_model.md` (NA-1…NA-14, scenarios NAS-01…NAS-30), registered in `DESIGN.md` and `autobyteus-server-ts/docs/design/README.md`; written at the user's request, following `collaboration_model.md`.
- Evidence: PROBE-02 (`evidence/PROBE-02-client-addresses.log`: a container cannot tell host from LAN; loopback publishing keeps host and container paths), PROBE-03 (`evidence/PROBE-03-electron-header-injection.log`: Electron main attaches a header to fetch, WebSocket, img, iframe and its subresources; other partitions get none), autobyteus-436 PROBE-01 (no credential needed today).
- Known risks: RSK-001 client paths that never sent a credential (found by running probes under enforcement); RSK-002 Docker Desktop publishing on the host's Tailscale address not measured (fallback Tailscale Serve); RSK-003 VPN/company networks need `AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS`; RSK-004 losing the desktop's credential file means connecting nodes again.
- One frozen contract touched: `/rest/node-update` (C1, DESIGN.md rule 9) gains only the 401 refusal code.
- Follow-ups (not in scope): FU-001 message gateway posts to a removed route; FU-002 standalone application host has no gate.

## Documents (all in `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/tickets/in-progress/node-universal-authentication-437/` unless noted)

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`
- `evidence/PROBE-02-client-addresses.log`, `evidence/PROBE-03-electron-header-injection.log`, `probes/`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/autobyteus-server-ts/docs/design/node_access_model.md`

## Route

`get_handoff_rules`: the rule for `Architecture Design Complete` with task_size Large or architectural_risk High → `/software_engineering_team/architecture_reviewer`.
