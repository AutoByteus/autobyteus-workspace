# Implementation Revision Record — websocket-origin-and-phone-route-guard (autobyteus-403)

The current code and `implementation-handoff.md` remain authoritative. This record helps a reviewer locate each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-001, SR-003, ARCH-REV-002 | Implementation ready for code review |

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
