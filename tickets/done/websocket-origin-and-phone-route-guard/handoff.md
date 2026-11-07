# Handoff — websocket-origin-and-phone-route-guard (autobyteus-403)

- Result: `Architecture Design Complete` (revised), SR-003, answering ARCH-REV-001 (AR-001, AR-002, AR-003). task_size `Medium`, architectural_risk `High` → architecture re-review of AR-001…AR-003.
- From: Solution Designer (team coordinator), 2026-11-06.
- Original request: Project Task autobyteus-403 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). It combines FU-001 (no Origin check on node WebSocket routes; a malicious web page can open `/ws/terminal`) and FU-002 (a paired phone's `mra_…` credential opens `/ws/terminal`) of autobyteus-394.
- Goals:
  - A web page from another origin cannot open any WebSocket route or GraphQL subscription of a node, nor (user decision DEC-001 = B) call its HTTP API.
  - A phone credential is refused on WebSocket routes the phone product does not offer.
  - Tests show the allowed and refused cases.
  - Desktop app, phone shell, Docker/remote nodes and collaboration between nodes keep working.
  - Finalized on the base branch; release only on the user's word.
- Approval basis: requirements SR-001 approved by the user in the Solution Designer conversation, 2026-11-06. Decisions: DEC-001 = B (HTTP in scope); DEC-010 = keep the phone limit. Quote: "thanks. i trust your professinoalism. because you understand my project".
- Workspace:
  - worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/websocket-origin-and-phone-route-guard`, branch `codex/websocket-origin-and-phone-route-guard`;
  - base `origin/personal` @ `3bf9240d4229dc01012aa3bfd0819a971ab3b32a`; finalization target `origin/personal`;
  - dependencies installed (`pnpm install --frozen-lockfile`);
  - ticket documents are not committed yet (no source changes).
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/websocket-origin-and-phone-route-guard/tickets/in-progress/websocket-origin-and-phone-route-guard/`

## Documents

- `requirements-doc.md` — Approved (SR-001): REQ-001…REQ-008, AC-001…AC-010, SCN-001…SCN-009, DEC-001…DEC-010.
- `investigation-notes.md` — evidence incl. the phone WebSocket route table, measured client origins, architecture findings.
- `design-spec.md` — Ready (SR-002): spines DS-001…DS-003, file mapping, removal plan, sequence, classification.
- `solution-revision-record.md` — SR-001, SR-002.
- `follow-ups.md` — FU-001 (DNS rebinding, urgent), FU-002 (HTML preview same origin, urgent), FU-003 (message gateway CORS); not yet sent (sent when the ticket leaves the team).
- `evidence/origin-probe/` — probes (README with commands).

## Design in short

- **One origin gate.** `remote-access-policy-plugin.ts` checks `Origin` first on every request and WebSocket upgrade; 403 `REMOTE_ACCESS_ORIGIN_REFUSED` unless allowed. The rule lives in the new `remote-access-request-origin.ts`. Allowed:
  - no Origin;
  - exactly `file://`;
  - same host as `Host` / `X-Forwarded-Host`;
  - loopback http(s);
  - `AUTOBYTEUS_ALLOWED_ORIGINS`.
- **CORS moves from `build-studio-server.ts` into the plugin**, as a delegator built on the same rule.
- **One WebSocket authorization.** `RemoteAccessRoutePolicy.authorizeWebSocket` serves both `/graphql` (hook) and `/ws/*` (handlers via the thin `authorizeRemoteAccessWebSocket` adapter). It removes the duplicated rule and the dead `routeClass` parameter. A mobile credential is accepted only on `PHONE_WEBSOCKET_ROUTES` (exact route patterns), else `PHONE_ACCESS_ROUTE_REFUSED` (4403 / 403). The peer route also refuses a mobile query credential.

## SR-003 revision (ARCH-REV-001)

- AR-001: `/mcp/gateway` keeps its own narrower origin rule (absent or loopback) as a deliberate route-family rule that runs first. Hook order is gateway → CORS → gate → route authorization, with the plugin registered after `registerMcpGatewayRoutes`. The forbidden bypass is now "admitting an origin the node rule refuses". `studio-server-http-contract.integration.test.ts` must stay green unchanged.
- AR-002: the gate logs one redacted line per refusal it replies with (code, URL; origin for origin refusals). This covers `/graphql` and peer WS phone refusals; AC-006 test extended.
- AR-003: a phone query credential on the peer WS → 403 `PHONE_ACCESS_ROUTE_REFUSED`. Peer HTTP bearer refusal unchanged.
- Non-blocking: 13 call sites; CORS delegator in `(req, cb)` form.

## Open risks

- RSK-001 DNS rebinding (FU-001).
- RSK-002 same-origin content (FU-002).
- RSK-003 trusted-network model limits the phone refusal (user informed).
- UNK-001 Safari `file://`.
- S3 (autobyteus-407) and autobyteus-415: no conflict found; `/ws/node-desktop` stays on the phone list.

## Expected next action

Independent architecture review of design-spec.md against the approved requirements. Then the configured route to implementation.

## Route record

- Rule applied (2026-11-06, SR-002): "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
- Rule applied (2026-11-06, SR-003): same rule → `/software_engineering_team/architecture_reviewer` (re-review of AR-001…AR-003).
- Review result (2026-11-06): ARCH-REV-002 Pass on SR-003 (design-review-report.md, architecture-review-revision-record.md); the architecture reviewer routed the package to `/software_engineering_team/implementation_engineer`. Recorded as informational; no duplicate forwarding.
