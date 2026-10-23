# Handoff Summary — one-nodes-tab

## What Changed

Nodes → **Manage Nodes** is now the one place for every node. The Remote Collaboration tab is gone (`?nodeTab=remoteCollaboration` opens Manage Nodes).

- **This node** card: the window's node, with its remote collaboration switch and how-it-works rules.
- **One list**: each node appears once. The desktop's list and this node's peers are joined by node ID. Each row has a reachability dot, name (rename), address, collaboration switch, Open and Remove, and at most one status line with one fixing button.
- **Add a node once**: duplicates are recognised by address or node ID. Adding never opens a window. With collaboration on, one confirmation registers both sides.
- **Two-node changes**: turning collaboration on or off, Remove and rename each run as one confirmed plan. This node's side goes through its own stores; the other node's side goes through that node's settings API. Each server resolves the address that works for itself. Turning on stops at the first failure (Try again finishes it). Turning off and Remove continue and report what could not be done.
- **Causes, not "fetch failed"**: refused, timed out, name not found, not AutoByteus, a different node. A Docker node that is given a loopback address gets a `host.docker.internal:<port>` hint with Use this.
- **Server**: `addPeerNode {nodeId, name, baseUrl}` (identity pinned), `changePeerAddress`, `resolvePeerAddress`, `peerAddressCandidates`, `peerNodeAvailability`; settings errors carry `{code, reason, address, loopbackInContainer, attempts}`. Agent-facing tool texts unchanged.
- **Desktop registry**: entries gain `serverInstanceId` and drop `capabilities`/`capabilityProbeState`. The existing data is directly usable, with no migration.

## Classification

- `task_size`: `Large`; `architectural_risk`: `High`; route: `Reviewed`.

## Validation

- Architecture review Pass. Source review Pass (CRR-004, CR-001…CR-005 resolved). API/E2E Pass (API-REV-003, 95%). Test-code review Pass (CRR-006).
- Coverage: browser probes NP-01…NP-12 and ND-01…ND-05 (Docker node), an isolated desktop instance with a Docker node (EL-01…EL-07), the two-server E2E and the server integration suite.

## Integration

- Branch `codex/one-nodes-tab`. The latest `origin/personal` (`be315bcf1c`: autobyteus-269 run titles, task comments, v1.5.8) was merged at `e84a0d6253` (merge, no conflicts).
- Post-integration checks all passed (`evidence/delivery/`): server typecheck; server build; server remote-collaboration unit tests (19 files / 131 tests); the two-server E2E (30/30, including 269's new RC-30); the ticket's 17 web spec files (118 tests); web guards.

## Docs

- `autobyteus-web/docs/settings.md` § Nodes: Manage Nodes (one list).
- `autobyteus-server-ts/docs/modules/remote_collaboration.md`, with one sentence corrected at delivery.
- Design-spec § Run Rules `changeAddress` row reconciled (A1 / CR-002). See `docs-sync-report.md`.

## Verification

- Every critical acceptance criterion is proven by the evidence (see `release-deployment-report.md` § Verification).
- **AC-711 is the user's check**: the user manages all his nodes in one tab on his own desktop and Docker nodes, adds a node once, and collaboration works both ways. Status: **accepted by the user** on `v1.5.9-beta.1` ("i am runing the latest now. the task is done.", 2026-10-23).

## Known Residuals

- The Docker image in API-08/API-09 had 4 `dist` files from autobyteus-269 under the mounted `dist`. This is negligible, and the merged branch now contains 269.
- AC-704: agents' own `list_available_agents` calls were not driven. `peerNodeOffer` is checked instead, and the API-06 two-server E2E (RC-26) shows it returns the same list.
- Follow-ups FU-001 (cause in the agent-facing unreachable text) and FU-002 (container interface address candidates): `follow-ups.md`. The Solution Designer sends them.

## Release

- Beta `v1.5.9-beta.1`, the user's decision (2026-10-23): published completely (4/4 workflows, 17 assets, Docker `:1.5.9-beta.1` and `:beta`). `personal` is at `8c8c099a73`.
