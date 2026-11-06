# Implementation Handoff — websocket-origin-and-phone-route-guard (autobyteus-403)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/websocket-origin-and-phone-route-guard`, branch `codex/websocket-origin-and-phone-route-guard`, base `origin/personal` @ `3bf9240d42`. Implementation commit: `88a93aaf26` (all checks ran on it). The ticket documents and evidence are committed right after it, with no source change.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Medium / High) and passed (ARCH-REV-002). Code review is selected for this package.
- Requirements doc: `tickets/in-progress/websocket-origin-and-phone-route-guard/requirements-doc.md` (Approved, SR-001)
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md` (SR-001…SR-003)
- Design spec (required on every route): `.../design-spec.md` (SR-003, Ready)
- Supplemental task artifacts: `.../evidence/origin-probe/`; `.../follow-ups.md`
- Design review report: `.../design-review-report.md` (round 2, Pass)
- Architecture review revision record: `.../architecture-review-revision-record.md` (ARCH-REV-002)
- Triggering rework report, revision record, or evidence: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `.../implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001, SR-003
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A

What the change does, following the design's Change / Refactor Sequence, steps 1–5:

1. **Origin rule** (`src/api/security/remote-access-request-origin.ts`, new). `createRequestOriginPolicy(configuredOrigins).isAllowed(headers)` implements REQ-002:
   - an absent Origin is allowed;
   - exactly `file://` is allowed;
   - an `http(s)` Origin whose `URL.host` equals `Host` or the first `X-Forwarded-Host` value is allowed (lowercased; scheme not compared);
   - an `http(s)` Origin whose hostname is `localhost` or a loopback IP (`isLoopbackClientAddress`) is allowed;
   - an Origin whose `URL.origin` is in the configured set is allowed;
   - everything else is refused, including `null`, other schemes, malformed values and a non-string header.

   `parseConfiguredOrigins(raw)` returns `{ origins, invalidEntries }`.
2. **Request gate** (`remote-access-policy-plugin.ts`):
   - It reads `AUTOBYTEUS_ALLOWED_ORIGINS` once through `appConfigProvider.config.get` and logs one warning for invalid entries.
   - It registers `@fastify/cors` with a callback-form delegator `(request, callback)` that uses the same rule.
   - In `onRequest`, a non-allowed Origin is refused first with 403 `REMOTE_ACCESS_ORIGIN_REFUSED`. After that come the `/ws/*` deferral and `authorizeHttpRequest`, as before.
   - Every reply it sends goes through one local `refuse(request, reply, rejection, origin?)`. That function writes one line, `Remote Access request refused <code> <redactSensitiveUrl(url)>`, adding ` origin <value>` only for the origin refusal, and sends `{ error, code, message }`.
3. **One WebSocket credential rule** (`remote-access-route-policy.ts`):
   - `PHONE_WEBSOCKET_ROUTES` holds the 8 exact route patterns.
   - `authorizeWebSocket(request)` works in this order:
     1. no mobile query credential → trusted-network or loopback context, as today;
     2. a mobile credential and a `request.routeOptions.url` not in the list → 403 `PHONE_ACCESS_ROUTE_REFUSED`, before validation;
     3. otherwise `authService.authorizeMobileCredential`.
   - The `TRUSTED_NETWORK_WEBSOCKET` branch of `authorizeHttpRequest` returns `this.authorizeWebSocket(request)`.
   - In the `REMOTE_PEER` branch, a mobile bearer still gets `REMOTE_ACCESS_AUTH_INVALID`, and a mobile `access_token` query credential gets `PHONE_ACCESS_ROUTE_REFUSED` (AR-003).
4. **Adapter** (`src/api/websocket/remote-access-websocket-auth.ts`): `authorizeRemoteAccessWebSocket(request)` calls `getRemoteAccessRoutePolicy().authorizeWebSocket`. On a refusal it throws `{ code: closeCodeByFailure[code], reason: code }`; otherwise it sets the context. `closeCodeByFailure` gains both new codes (4403). `closeSocketForRemoteAccessRejection` is unchanged and still logs the `/ws/*` refusals. All 13 call sites are unchanged.
5. **Composition**: the CORS registration and its import are removed from `build-studio-server.ts`. The order stays `registerMcpGatewayRoutes` → … → `registerRemoteAccessPolicyPlugin`, so the root `onRequest` order is: MCP gateway hook (`/mcp/gateway` only) → `@fastify/websocket` → CORS → origin gate → route authorization. The MCP gateway rule is untouched.
6. **Codes** (`models.ts`): `REMOTE_ACCESS_ORIGIN_REFUSED` and `PHONE_ACCESS_ROUTE_REFUSED` are added.
7. **Docs**:
   - `autobyteus-server-ts/docs/features/remote_access.md`: new "Allowed Origins" section; phone WebSocket routes and the refusal log under Route Policy and Mobile Credential Enforcement; Phase Two marked done for WebSockets.
   - `autobyteus-web/docs/remote_access.md`: the phone-route refusal and the origin rule as phone users see them.
   - `GLOSSARY.md` (Nodes): "Allowed origin" and "Phone WebSocket route".

**One deviation from the design's literal delegator.** The design wrote `origin: isAllowed && req.headers.origin ? req.headers.origin : false`. I implemented `origin: isAllowed(req.headers)`, which is `true` (reflect) or `false`.
- For a request with an allowed Origin, the two produce the same headers (`@fastify/cors` reflects the same value).
- For a request without Origin, the literal form gives `false`, and an OPTIONS request would then fall through to `@fastify/cors`'s `options('*')` route and answer 404 instead of today's 400 (strict preflight). `true` keeps today's answer exactly (REQ-003: "HTTP requests without Origin behave as today").
- IMP-04 pins this case (`noOriginPreflight` → 400), and the unchanged contract test shows `vary: Origin` without ACAO for an MCP POST that sends no Origin.

The owner, the rule, the callback form and every allowed or refused outcome are as designed.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - The change matches the scope: one subsystem (`src/api/security` + the WS adapter), one new source file, five modified source files (the design's four + the composition), tests and docs.
  - The risk stays High: it is the security boundary every request crosses, it adds two refusal contracts and one setting.
  - No escalation trigger fired: no legitimate client outside REQ-002 was found, and no phone WS route outside the list.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Every WS upgrade with a non-allowed Origin is refused (403) before its handler | `remote-access-policy-plugin.ts` `onRequest` → `RequestOriginPolicy.isAllowed` → `refuse(…ORIGIN_REFUSED…)` (before the `/ws/*` deferral) | IMP-04 AC-001: `/ws/terminal`, `/ws/projects`, `/graphql`, `/rest/remote/run-observations` with `https://evil.example` and `null` → 403, and `TerminalHandler.connect` is not called. AC-002 near misses → 403 |
| BEH-002 | HTTP with a non-allowed Origin, preflight included → 403; CORS only for allowed origins | Same gate; `@fastify/cors` delegator (callback form) from the same rule | IMP-04 AC-003: foreign OPTIONS/POST `/graphql` → 403, no ACAO; allowed preflight → 204 with ACAO and methods; allowed POST → 200 with ACAO; no-Origin POST → 200 with `vary: Origin` only; no-Origin OPTIONS → 400 as before. IMP-05: MCP gateway contract unchanged and green |
| BEH-003 | Phone credential only on phone WS routes; refused elsewhere (4403 / 403) | `RemoteAccessRoutePolicy.authorizeWebSocket` + `PHONE_WEBSOCKET_ROUTES`; `/ws/*` through the adapter, `/graphql` through `authorizeHttpRequest`; peer WS through the `REMOTE_PEER` branch | IMP-02 unit: each pattern accepted, 6 non-phone patterns and an unregistered route refused before validation, peer WS query credential → `PHONE_ACCESS_ROUTE_REFUSED`, peer bearer → `REMOTE_ACCESS_AUTH_INVALID`. IMP-04 AC-004: terminal, update-notifications, 3 application routes → close 4403 `PHONE_ACCESS_ROUTE_REFUSED`; `/graphql` and the peer WS → 403. AC-005: every listed pattern is registered (`hasRoute`) and opens with the credential. Disabled Phone Access → today's 4403 `PHONE_ACCESS_DISABLED` |
| BEH-001/003 log (REQ-005, AC-006) | One line per refusal with code and redacted URL; origin only for the origin refusal; no credential | Gate `refuse(...)`; adapter `closeSocketForRemoteAccessRejection` (unchanged) | IMP-04 AC-006: the exact four lines (origin, `/ws/terminal`, `/graphql`, peer WS), `access_token=%5BREDACTED%5D`; no line contains the credential or `mra_` (Authorization header also sent on the origin probe, not logged) |
| BEH-004…008 | Preserved: absent Origin, `file://`, same origin (Host / X-Forwarded-Host, Tailscale shape), loopback, configured | Origin rule | IMP-01 unit table; IMP-04 AC-002 over real upgrades; IMP-06 existing WS route suites (phone-access REST, node-desktop, terminal, file-explorer) green; IMP-07 update-notifications WS suite green. Desktop app, phone and peer executable validation (AC-007…AC-009) is API/E2E's |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. No WS handler file, client, MCP gateway rule, standalone server or message gateway was changed.

## Key Files Or Areas

- `autobyteus-server-ts/src/api/security/remote-access-request-origin.ts` (new, 79 lines)
- `autobyteus-server-ts/src/api/security/remote-access-policy-plugin.ts` (82 lines)
- `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` (237 lines)
- `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts` (68 lines, was 109)
- `autobyteus-server-ts/src/remote-access/domain/models.ts`
- `autobyteus-server-ts/src/compositions/build-studio-server.ts` (497 lines, was 502; only removals)
- Tests: `tests/unit/remote-access/request-origin.test.ts` (new), `tests/unit/remote-access/route-policy.test.ts`, `tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts` (new)
- Docs: `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-web/docs/remote_access.md`, `GLOSSARY.md`

## Important Assumptions

- ASM-001 / ASM-002 from the requirements (no shipped client uses another origin or another phone WS route) remain to be shown by executable validation (AC-007…AC-009).
- `request.routeOptions.url` is the route pattern in the root `onRequest` hook and in WS handlers (measured in the route-pattern probe; IMP-04 uses it on the real server). For an unmatched route it is `undefined`, which counts as "not a phone route".

## Known Risks

- RSK-001 (DNS rebinding, FU-001), RSK-002 (same-origin content, FU-002) and RSK-003 (the trusted-network model) were accepted upstream and are unchanged.
- The gate now logs one warn line for every refusal it replies with, including today's owner-route and `LOCAL_DEV_ONLY` refusals. This is log only; a hostile page can raise the log volume. Low.
- `REMOTE_ACCESS_ORIGIN_REFUSED` has a `closeCodeByFailure` entry (4403) that nothing reaches; it exists because the `Record` type needs it (accepted in ARCH-REV-002).
- A Fastify upgrade that changes `routeOptions.url`, or a renamed route parameter, would drop phone access to that route. AC-005 in IMP-04 fails in that case (`hasRoute` plus a credential upgrade per listed pattern).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (security hardening)
- Reviewed root-cause classification: Duplicated Policy Or Coordination (WS credential rule), plus Missing Invariant
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes:
  - The adapter no longer imports `remote-access-auth-service`, `remote-access-local-trust` or `WEBSOCKET_ACCESS_TOKEN_QUERY_KEY`.
  - `authorizeWebSocket` is the only place that reads `access_token` for authorization.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`
  - From the adapter: `extractRemoteAccessWebSocketCredential` (export; no reference outside the file), the adapter's `trustedNetworkContext` and `parseRequestUrl`, the `routeClass` parameter with its 4404 branch (13 call sites, all `(req)`), and the `?? 4401` fallback (the `Record` covers every code). The now-unused imports went with them.
  - From `build-studio-server.ts`: CORS `origin: true` and its import.
  - From `models.ts`: `WebSocketAuthPolicy` / `WEBSOCKET_AUTH_POLICY`, which nothing references. A repository search finds them only in `tickets/done/mobile-remote-access-requirements/`; typecheck IMP-01 passes.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (two codes added to the existing union; `RemoteAccessRejection` reused for the origin refusal)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`
  - Largest is `remote-access-route-policy.ts` at 237 lines (+36/−5).
  - `build-studio-server.ts` went from 502 to 497 lines (removals only).
  - No file has a delta >220.
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`. Nothing is stored; one optional setting is read at plugin registration.
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- No dependency changes. `@fastify/cors` 11.3.1 is now imported by the plugin instead of the composition.
- `pnpm -C autobyteus-server-ts test:integration:prepare` was run once in this worktree; the file-explorer e2e needs its `dist/` watcher runtime. It and the typecheck leave untracked build outputs (`autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/`, server `dist/`). They are not committed.
- The update-notifications e2e must run with `env -i` and a resolved temp `HOME`, as its header says. Run with the real HOME, it fails API-20…22 because the home settings turn automatic runtime updates on. That cause is environmental and was confirmed by the passing IMP-07 run.

## Checks Run

Evidence folder: `tickets/in-progress/websocket-origin-and-phone-route-guard/evidence/implementation/`. Environment for all rows: macOS, Node 22 (versions in each file's header).

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `88a93aaf26` | macOS, Node 22 | all server `src` + tests | — | Pass | `IMP-01-server-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 1182 in 365 files (baseline 1182 in 365 files)` and `[typecheck] PASS` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/remote-access tests/unit/api/websocket tests/architecture --no-watch` | `88a93aaf26` | macOS, Node 22 | origin rule, route policy, WS handler units, architecture rules (tracked imports) | REQ-002, REQ-004, REQ-007; AC-002, AC-004, AC-005 (unit) | Pass | `IMP-02-unit-remote-access-architecture.log` | `Tests  144 passed (144)` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | `88a93aaf26` | macOS, Node 22 | the whole server unit suite | regression | Pass | `IMP-03-server-unit.log` | `Test Files  938 passed \| 5 skipped (943)`, `Tests  8031 passed \| 9 skipped (8040)` |
| IMP-04 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts --reporter=verbose --no-watch` | `88a93aaf26` | macOS, Node 22, real studio server on 127.0.0.1, `ws` client | gate, CORS, origin rule, route policy, adapter, real WS routes, mercurius `/graphql`, `/rest/remote` WS, pairing | AC-001…AC-006 | Pass | `IMP-04-e2e-request-origin-and-phone-routes.log` | `Tests  7 passed (7)` |
| IMP-05 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/studio-server-http-contract.integration.test.ts --reporter=verbose --no-watch` (file unchanged) | `88a93aaf26` | macOS, Node 22 | MCP gateway hook order, studio CORS headers | BEH-002 preserved (AR-001) | Pass | `IMP-05-integration-studio-http-contract.log` | `Tests  4 passed (4)` |
| IMP-06 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts tests/e2e/node-desktop tests/e2e/terminal tests/e2e/file-explorer --no-watch` | `88a93aaf26` | macOS, Node 22, after `test:integration:prepare` | existing WS routes through the new adapter; plugin on bare Fastify apps | BEH-004…008 (server side) | Pass | `IMP-06-e2e-websocket-route-suites.log` | `Tests  33 passed (33)` |
| IMP-07 | `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/update-notifications --no-watch` | `88a93aaf26` | macOS, Node 22, temp HOME | `/ws/update-notifications` and studio HTTP through the new gate | regression | Pass | `IMP-07-e2e-update-notifications.log` | `Tests  15 passed (15)` |
| IMP-08 | Base reproduction: `git checkout 3bf9240d42 -- autobyteus-server-ts/src`, a copy of the IMP-04 test with the `PHONE_WEBSOCKET_ROUTES` import replaced by a local copy, run with `vitest run`; then `src` restored to `HEAD` | base `3bf9240d42` `src` + IMP-04 test | macOS, Node 22 | the same cases on the old gate | AC-001…AC-006 fail on base | Fails as expected | `IMP-08-base-reproduction.log` | `Tests  5 failed \| 2 passed (7)`; the 2 passing are the preserved behaviors (AC-005, disabled refusal) |

- Not run, and why:
  - The full server E2E suite (`pnpm test:e2e`) is left to API/E2E; the relevant WS and studio suites ran as IMP-04…IMP-07.
  - AC-007 (desktop app, isolated instance with an embedded and a Docker/remote node), AC-008 (phone shell over LAN HTTP and a Host-preserving HTTPS proxy) and AC-009 (two peer nodes) are executable validation, owned by API/E2E.
  - The web package's tests were not run: there is no web code change, only docs.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: backend-only change (server request gate and WS authorization). There is no UI change; the web change is documentation only.

## Downstream Coverage Hints / Suggested Scenarios

- AC-007: desktop app from this branch (`pnpm --silent isolated-app start --build`), embedded node plus an isolated Docker or remote node:
  - run streaming (agent / team / org);
  - terminal;
  - file explorer;
  - an application iframe (`/ws/applications/...`);
  - VNC Viewer (`/ws/node-desktop`).
  The node log should contain no `Remote Access request refused` and no `Remote Access WebSocket rejected` lines.
- AC-008: phone `/mobile` served by an isolated node, paired; over LAN HTTP, and through an HTTPS proxy that preserves Host (shaped like Tailscale Serve):
  - run list;
  - run screens (agent, team, org);
  - delegated tree;
  - Files;
  - New run.
  The node log should have no refusals.
- AC-009: two isolated peer nodes: remote run observation (`/rest/remote/run-observations` WS) and peer REST.
- `AUTOBYTEUS_ALLOWED_ORIGINS`: a gateway that rewrites Host without `X-Forwarded-Host` is refused without the setting and allowed with it.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Executable validation AC-007, AC-008 and AC-009 (design step 6).
- An independent check of ASM-001 and ASM-002 against real clients (desktop renderer `file://`, Electron dev loopback, the phone WebView wrappers if available).
