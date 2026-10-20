# Delivery Revision Record

Ticket `stable-release-v1-5-7` (autobyteus-213): stable release v1.5.7 from the `origin/personal` tip.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Solution Designer's handoff; the user: "please release a stable version for me now" (2026-10-20) | N/A | `Delivery Completed`: v1.5.7 published completely | `release-deployment-report.md`, this record |
| DR-002 | The user, 2026-10-20: desktop and Docker nodes updated | DR-001 `Delivery Completed` | Informational items recorded: the user runs v1.5.7 on desktop and Docker | this record |

## Revision Entries

### DR-001: stable v1.5.7

- Delivery round and trigger: the Solution Designer's handoff (`delivery-handoff.md`). The user's words: "release the latest … whatever on the personal", and directly to delivery: "please release a stable version for me now thanks a lot".
- Prior authoritative result: N/A
- Candidate: `origin/personal` @ `9227d61597` at cut time. The only product change since `v1.5.7-beta.4` is the MCP Bulk Import fix, which the notes cover.
- Release/publication/deployment report: `release-deployment-report.md`
- Current authoritative result: `Delivery Completed`. Release commit `79b638e787` and tag `v1.5.7` are on `personal`. All four workflows succeeded. The release is non-prerelease and Latest, with 17 assets, and its body equals the archived notes. Docker `:1.5.7` = `:latest` = `:beta` on amd64 and arm64.
- Terminal return to `/solution_designer`: `Sent`

### DR-002: the user runs v1.5.7 on desktop and on his Docker nodes

- Trigger: the user, 2026-10-20: "already runnign latest stable version now", then "already runnign latest now. docker node updated as well". This answers the handoff's informational item about his own Docker node.
- Delivery's read-only check:
  - `/Applications/AutoByteus.app` `CFBundleShortVersionString` = `1.5.7`.
  - Docker containers `autobyteus-server-0`, `-1` and `-2` run `autobyteus/autobyteus-server:latest` = `sha256:821e777d8e88b348d983b4febae70a87e2eb61784f3dd3118704e7886ffcdae4` (the v1.5.7 digest), started 2026-10-20T08:04Z. Before the update they ran beta.4 (`sha256:bad18888f91e…`).
  - `http://localhost:8001/rest/health` returns `{"status":"ok"}`. Each node log shows "Database migrations completed successfully." and "Server listening on 0.0.0.0:8000". The remaining error lines are from the container's desktop environment (D-Bus, CopyQ, Chrome GCM), not the server.
  - No new data conversion between v1.5.7-beta.4 and v1.5.7 (`git diff --name-only v1.5.7-beta.4 v1.5.7 -- autobyteus-server-ts/src/app-data-migrations` is empty). The nodes converted their data under beta.4.
- Still open (informational, not blocking): the user's own check of the sudden-shutdown restore fix.
