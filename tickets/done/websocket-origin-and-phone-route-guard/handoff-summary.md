# Handoff Summary: websocket-origin-and-phone-route-guard (autobyteus-403)

- Status: verified from the evidence (audited, not redone; DR-002), archived and finalized on `personal`. DR-001 was blocked by a conflict with autobyteus-407. The implementation engineer resolved it (IR-002, merge `6f59bab2a2`), and it was re-reviewed (CRR-003) and revalidated (API-REV-002). **No release**: the ticket says "release only on the user's word", and the release guide's default is no release. A beta or stable release is available on request; this ticket's `release-notes.md` carries a `## What you need to do` section for it.
- Classification: `task_size=Medium`, `architectural_risk=High`, reviewed route. Architecture review passed; source review CRR-001 Pass (9.5); API/E2E API-REV-001 Pass, 95.4%; test-code review CRR-002 Pass. Round 2 after the 407 integration: CRR-003 Pass (Full Re-Audit, no findings), API-REV-002 Pass at 95.6%, CRR-004 Not Applicable (no durable test changed).

## What Changed

- Source `88a93aaf26`:
  - Every HTTP request and WebSocket upgrade, on any path, first meets an allowed-origin rule in the request gate (`remote-access-request-origin.ts`, `remote-access-policy-plugin.ts`). Allowed: no Origin, the node's own origin (`Host` or the first `X-Forwarded-Host`), `file://`, loopback, and exact origins in the new optional node setting `AUTOBYTEUS_ALLOWED_ORIGINS`. Anything else gets 403 `REMOTE_ACCESS_ORIGIN_REFUSED` and one redacted log line.
  - CORS is granted from the same rule; the studio server's `@fastify/cors` `origin: true` registration is gone.
  - A phone credential (`mra_…`) opens only the phone WebSocket routes (`PHONE_WEBSOCKET_ROUTES` in `remote-access-route-policy.ts`). On any other WebSocket it is refused with `PHONE_ACCESS_ROUTE_REFUSED` (4403 on `/ws/*`, 403 on `/graphql` and `/rest/remote/run-observations`), without unpairing.
- Integration of autobyteus-407 (`6f59bab2a2`, IR-002): one WebSocket credential rule (the route policy), one query-credential reader, and one close-code table, 407's `remote-access-close-codes.ts`, with `REMOTE_ACCESS_ORIGIN_REFUSED` and `PHONE_ACCESS_ROUTE_REFUSED` at 4403. `/ws/node-desktop` (407's phone VNC Viewer) is a phone WebSocket route.
- Tests: `tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts`, unit tests for the origin rule and route policy; `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (`14e3681cdc`) keeps the phone's Host and Origin in its LAN emulation.
- Docs: the feature docs and glossary in the source commit; delivery added the setting to `autobyteus-server-ts/README.md`, an ingress note to `docs/android_mobile_access.md`, and the request gate to the route order in `autobyteus-server-ts/docs/modules/node_desktop.md` (`docs-sync-report.md`).

## Integration

- Bootstrap base `3bf9240d42`; latest `origin/personal` `e427a0c9cf` (autobyteus-415, Android `configChanges` only) merged into the ticket branch as `18fd9f4e5c`, no conflicts.
- Rerun on the merged state: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/remote-access tests/unit/api/websocket tests/architecture tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts --no-watch` → `Test Files 22 passed (22)`, `Tests 151 passed (151)` (IMP-02's 144 plus IMP-04's 7). Log: `evidence/delivery/DEL-01-merged-state-remote-access-checks.log`.
- The base then moved to `6341292552` (autobyteus-407). That merge conflicted (DR-001), and the implementation engineer resolved it as `6f59bab2a2`. Round 2 ran on `1e1d6482a7`, whose source is identical to the delivery HEAD (`git diff --name-only 1e1d6482a7 HEAD -- . ':!tickets'` is empty): IMP-10 (`Test Files 18 passed`, `Tests 152 passed`), IMP-11 (26/26), IMP-12 whole server unit suite (`8043 passed | 9 skipped`), and API-01 and API-03…API-09. `origin/personal` was still `6341292552` when delivery resumed, so delivery reran nothing.

## Verification (audit of the evidence)

- AC-001 (foreign Origin refused on every WS family): API-06 — from a real Chrome page at `http://evil.example:56853`, `terminal`, `projects`, `graphqlWs`, `peerObservation` all `"opened": false, "frames": 0`; the sandboxed `null` iframe `"opened": false`; the node log has `REMOTE_ACCESS_ORIGIN_REFUSED /ws/terminal/abx403-evil-term origin http://evil.example:56853` and `/ws/projects origin null`. The loopback control opened the terminal (`"frames": 5`). IMP-04 7/7 passes; IMP-08 shows 5 of those 7 fail on the base.
- AC-002 (allowed classes accepted): API-04 same-origin over LAN (`('http://192.168.77.10:55079', 101)`) and through the Tailscale-shaped proxy (`Host alpha.tail-probe.ts.net:55195` → `101`); API-07 the configured origin (403 without the setting, 200 / `101` with it, and the `ftp://` entry warned once); API-08 `file://`; API-03/05 loopback.
- AC-003 (HTTP and CORS): API-06 foreign preflighted POST `TypeError: Failed to fetch`, `definitionsAfter` only `ABX403-LOOPBACK-PREFLIGHT` (the foreign create did not happen); IMP-04/05.
- AC-004 / AC-005 (phone credential only on phone routes): IMP-04 (4403 / 403 per route, every listed pattern registered and opens) and IMP-02; API-04 `outsidePhoneList: []` over every route the shell used.
- AC-006 (refusal log): API-06 `noCredentialInLogs: true`, 7 refusal lines with route and origin.
- AC-007 (desktop app, embedded and Docker node): API-08 recorder — all 16 WS handshakes `origin: "file://"`, status `101`, across agent, agent-collaboration, agent-package-definitions, file-explorer, terminal, update-notifications, node-desktop; 488 HTTP requests, none sending an Origin; 0 refusal lines in the three logs.
- AC-008 (phone shell over LAN and a Host-preserving HTTPS proxy shaped like Tailscale Serve): API-03 all 15 MSP cases `Pass`, no origin/route refusal in either node log; API-04 Chrome LAN, Chrome Tailscale-shaped and WebKit Tailscale-shaped journeys, every step `Pass`, `node refusal lines during journeys: {'alpha': [], 'beta': []}`.
- AC-009 (nodes collaborating): API-05 `RTP-01…07` Pass, 0 refusal lines on both nodes; API-04 `remoteRun` Pass.
- AC-010 (docs): reviewed in CRR-001 and in this delivery's docs sync.
- No user check is needed. AC-008 as approved is proven by its stated method: a Host-preserving proxy shaped like Tailscale Serve, in Chrome and in WebKit, the engine of the iOS wrapper. A real tailnet and the wrapper apps on devices are residual risk outside the criterion (below), not a gap in its proof.

## Round 2 (after the autobyteus-407 integration)

- API-09, the phone's node desktop under the gate, on a test-owned Docker node: the Chrome LAN, Chrome Tailscale-shaped and WebKit Tailscale-shaped journeys each passed `pair`, `openViewer` (`Connected · View only`), `viewOnly`, `control` (`Connected · Control`) and `liveRevocation`, which ended the stream with `{"code": 4403, "reason": "REMOTE_ACCESS_DEVICE_REVOKED"}` 18–21 s after revocation (UI `This viewer is not allowed on this node`). The node log has no origin or route refusal from the journeys; its one `REMOTE_ACCESS_ORIGIN_REFUSED` is API/E2E's own `curl` check of `/rest/health` before the run.
- API-06: foreign `/ws/node-desktop` `"opened": false, "frames": 0`, `foreignNodeDesktopLogged: true`, 8 refusal lines, `noCredentialInLogs: true`; from the loopback control page it opened (101).
- API-03 `mobile-shell probe: Pass`; API-04 `node refusals during journeys {'alpha': [], 'beta': []}`, `outsidePhoneList: []`. API-01 shows only the four FU-004 base failures (`Test Files 4 failed | 111 passed | 120 skipped (235)`).

## Residual

- Real Tailscale Serve on the user's tailnet and the iOS/Android wrapper apps on devices were not used; the proxy follows `serve.go` (Host kept, X-Forwarded-Host set) and both wrappers load the node's `/mobile` URL directly. If a phone ever shows the node as unreachable after this change, the node log line `REMOTE_ACCESS_ORIGIN_REFUSED … origin <value>` names the origin to check.
- Electron dev (`http://localhost:3000`) was not run; it is the loopback class, which is covered.
- A gateway that rewrites `Host` without `X-Forwarded-Host` now needs `AUTOBYTEUS_ALLOWED_ORIGINS` (in the release notes' user action).
- Follow-ups FU-001…FU-004 in `follow-ups.md` (FU-001 DNS rebinding and FU-002 HTML preview isolation are marked urgent).

## Release

- None. The change ships in the next release the user asks for.
