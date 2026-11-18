# autobyteus-437 — round 3 (answers ARCH-REV-002)

- Package: `node-universal-authentication-437`, SR-006; Large / High; approval basis unchanged (SR-002 requirements, SR-004 design by the user; no behavior change since).
- AR-003 residual → design-spec M-3: fail-closed default (HTTP refusal, no upgrade) for any `/ws/*` route; close-code delivery only on routes marked `routeOptions.config.gatedWebSocket` by `registerGatedWebSocketRoute`; architecture test: every WebSocket route wrapped or one of `/graphql`, `/rest/remote/run-observations`.
- AR-004 residual → M-4: GraphQL subscription sockets register in Mercurius `subscription.context(socket, request)` / leave in `onDisconnect` (`api/graphql/index.ts`, today `subscription: true`); the run-observation route (`api/rest/remote.ts:43`) registers on open, removes on close.
- AR-011 → DS-004, DS-005, DS-007 narratives, `SetupCodeService` ownership line, Boundary Encapsulation Map, `createPeerInvite` row, peer-signature example rewritten to M-1…M-10; contract NA-10 (setup codes are memory-only hashes; MCP token 0600) and §2 (refusal forms for gated and other upgrades).
- Documents: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/tickets/in-progress/node-universal-authentication-437/design-spec.md`, `solution-revision-record.md` (SR-006); contract `/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/autobyteus-server-ts/docs/design/node_access_model.md`.
- Route: `Architecture Design Complete`, Large/High → `/software_engineering_team/architecture_reviewer`.
