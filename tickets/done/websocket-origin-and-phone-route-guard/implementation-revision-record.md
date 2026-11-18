# Implementation Revision Record — websocket-origin-and-phone-route-guard (autobyteus-403)

The current code and `implementation-handoff.md` remain authoritative. This record helps a reviewer locate each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-001, SR-003, ARCH-REV-002 | Implementation ready for code review |
| IR-002 | Delivery Engineer, `release-deployment-report.md` (Escalation), DR-001 | DR-001 base conflict (autobyteus-407) | `Local Fix` | SR-003, CRR-001, CRR-002, API-REV-001, DR-001 | Merge resolved at `6f59bab2a2`; ready for code review |

## Revision Entries

### IR-001 — One origin gate for every request and upgrade; one WebSocket credential rule with phone WebSocket routes

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/websocket-origin-and-phone-route-guard/design-review-report.md`, round 2 (ARCH-REV-002, Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: design SR-003 steps 1–5 implemented; implementation-scoped checks pass (see the handoff's Checks Run).
- Related solution revision IDs: SR-001 (requirements), SR-003 (design).
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the initial implementation of the reviewed design.
- Approved behavior or requirement IDs affected: REQ-001…REQ-005, REQ-007, REQ-008 (changed); REQ-006 / BEH-004…BEH-008 (preserved).
- Implementation delta:
  - New allowed-origin rule `remote-access-request-origin.ts` (REQ-002) and its unit test.
  - The request gate (`remote-access-policy-plugin.ts`) registers CORS from the same rule and refuses a non-allowed Origin with 403 `REMOTE_ACCESS_ORIGIN_REFUSED` first, on every request. Every refusal it sends goes through one `refuse(...)` with one warn line.
  - `RemoteAccessRoutePolicy.authorizeWebSocket` is the only WebSocket credential rule. A phone credential is refused outside `PHONE_WEBSOCKET_ROUTES` with `PHONE_ACCESS_ROUTE_REFUSED`. The `REMOTE_PEER` branch refuses a phone query credential in the same way.
  - `authorizeRemoteAccessWebSocket` becomes an adapter. Its duplicate rule and the dead `routeClass` parameter are removed.
  - CORS registration is removed from `build-studio-server.ts`.
  - Two failure codes are added. The dead `WebSocketAuthPolicy`/`WEBSOCKET_AUTH_POLICY` are removed from `models.ts`.
  - New e2e test on the real studio server. Docs and glossary are updated.
- Changed files or areas: `autobyteus-server-ts/src/api/security/`, `src/api/websocket/remote-access-websocket-auth.ts`, `src/remote-access/domain/models.ts`, `src/compositions/build-studio-server.ts`, `tests/unit/remote-access/`, `tests/e2e/remote-access/`, `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-web/docs/remote_access.md`, `GLOSSARY.md`.
- Local validation and result: see `implementation-handoff.md`, Checks Run (IMP-01…IMP-07).
- Next recipient or routing: Code Reviewer (Medium / High).
- Remaining limitations or risks: see the handoff's Known Risks. Executable validation AC-007…AC-009 is API/E2E's.

### IR-002 — Integrate the latest base (autobyteus-407, node desktop on the phone)

- Triggering role, report path, and round: Delivery Engineer, `release-deployment-report.md` (Escalation section), DR-001. Merging `origin/personal` @ `6341292552` conflicted in `remote-access-websocket-auth.ts`.
- Triggering finding IDs: DR-001 blocker. It has three parts:
  1. 407's close-code table lacks the two new codes.
  2. 407's `node-desktop.ts` imports the removed `extractRemoteAccessWebSocketCredential`.
  3. The combined behavior on `/ws/node-desktop` has not been run.
- Classification: `Local Fix` (integration). No requirement or design change.
- Prior authoritative result: IR-001 at `88a93aaf26`: CRR-001 Pass, API-REV-001 Pass, CRR-002 Pass.
- Current authoritative result: merge commit `6f59bab2a2`; checks IMP-09…IMP-12 pass.
- Related solution revision IDs: SR-003.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: CRR-001, CRR-002.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: DR-001.
- Why this revision is recorded: the latest base must be integrated before delivery.
- Approved behavior or requirement IDs affected: none changed. REQ-004/REQ-005 close codes and the 407 node-desktop behavior are preserved together.
- Implementation delta (resolution only, against `origin/personal`):
  - `src/remote-access/domain/remote-access-close-codes.ts`:
    - 407's `REMOTE_ACCESS_CLOSE_CODE_BY_FAILURE` is now the only close-code table; it gains `REMOTE_ACCESS_ORIGIN_REFUSED: 4403` and `PHONE_ACCESS_ROUTE_REFUSED: 4403`.
    - `remoteAccessCloseForFailure` loses `?? 4401`, which nothing could reach because the `Record` covers every code.
  - `src/api/websocket/remote-access-websocket-auth.ts`:
    - IR-001's adapter is kept, now throwing `remoteAccessCloseForFailure(result.code)`; IR-001's local `closeCodeByFailure` is dropped.
    - It re-exports the route policy's `readWebSocketQueryCredential`, so WS handlers still depend only on the adapter.
    - 407's copy of the credential parsing, the trusted-network context and the `routeClass` parameter are not revived.
  - `src/api/security/remote-access-route-policy.ts`: `readWebSocketQueryCredential` is exported. It is the only reader of the WS query credential.
  - `src/api/websocket/node-desktop.ts`: `viewerFor(context, readWebSocketQueryCredential(req))` replaces `extractRemoteAccessWebSocketCredential(req)`. That is the same value the policy authorized, handed to 407's viewer registry for its re-check.
  - The e2e AC-001 case also sends a foreign-origin `/ws/node-desktop?mode=view` upgrade and expects 403.
  - `autobyteus-server-ts/docs/features/remote_access.md` (Runtime Ownership) names `remote-access-close-codes.ts` as the close-code owner.
- Changed files or areas: the five source and doc files above, plus `tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts`.
- Local validation and result:
  - IMP-09: typecheck PASS.
  - IMP-10: 152 tests pass. They cover the remote-access e2e (IR-001's IMP-04 case and the phone-access REST suite), 407's node-desktop e2e and `node-desktop-viewers` unit, the websocket, node-desktop and remote-access unit tests, and the contract test.
  - IMP-11: terminal and file-explorer e2e, 26 tests pass.
  - IMP-12: the full server unit suite, including architecture tests, 8043 passed.
- Next recipient or routing: Code Reviewer (Medium / High), then API/E2E.
- Remaining limitations or risks:
  - The phone node desktop (View only, Control, live revocation) under the origin gate and the route limit is covered here at server level by 407's node-desktop e2e plus AC-005; the real phone journey is API/E2E's.
  - Delivery rechecks 407's doc edits (`autobyteus-web/docs/remote_access.md`, `docs/android_mobile_access.md`), which merged automatically.
