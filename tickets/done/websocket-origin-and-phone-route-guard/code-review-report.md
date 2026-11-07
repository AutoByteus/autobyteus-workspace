# Code Review Report — websocket-origin-and-phone-route-guard (autobyteus-403)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-001; DEC-001 = B, DEC-010 = keep)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (phone wrapper and client-origin rows)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001…FU-003); `evidence/origin-probe/` (as cited by the design)
- Relevant Solution Revision IDs: SR-001, SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002 section)
- Delivery Revision Record Reviewed As Context: `delivery-revision-record.md` (DR-001: base integration blocked by an autobyteus-407 conflict); `release-deployment-report.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: 2
- Review Scope: `Full Re-Audit`
- Review Scope Evidence (round >1): the merge resolution touches the WS spine (adapter, route policy export), a shared module from autobyteus-407 (`remote-access-close-codes.ts`) and a WS handler (`node-desktop.ts`). These are beyond round 1's files. All structural checks were rerun on the merged code. The IR-001 files the merge did not touch are byte-identical to `88a93aaf26`: `remote-access-policy-plugin.ts`, `remote-access-request-origin.ts`, `build-studio-server.ts`, `models.ts` and both unit tests (`git diff 88a93aaf26 6f59bab2a2 --stat` is empty for them). So their round-1 evidence carries forward.
- Trigger: IR-002, the delivery Local Fix for DR-001: merge of origin/personal @ 6341292552 (autobyteus-407, node desktop on the phone), merge commit `6f59bab2a2` (implementation engineer, 2026-11-07)
- Prior Review Round Reviewed: 1 (CRR-001 Pass); test review CRR-002 Pass
- Latest Authoritative Round: 2
- Coverage Investigation / Execution Report / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Round 2 reviewed code: `git diff 6341292552 6f59bab2a2 -- autobyteus-server-ts` (this ticket applied on top of 407), plus `node-desktop-viewers.ts` for context. Ticket docs and evidence are in `1e1d6482a7`. Round 1 reviewed code: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/websocket-origin-and-phone-route-guard`, branch `codex/websocket-origin-and-phone-route-guard`, range `git diff 3bf9240d42 88a93aaf26`. Commit `a24421610f` holds only ticket documents (`git diff 88a93aaf26 a24421610f -- . ':!tickets'` is empty).

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. The change is one subsystem (`src/api/security` plus the WS adapter), with one new file and five modified source files. It changes the security gate that every request crosses, adds two refusal contracts and one setting. No correction is needed.

## Review Scope

- Changed implementation and behavior reviewed:
  - the origin rule;
  - the request gate (origin refusal, CORS delegator, single refusal log);
  - the single WebSocket credential rule with `PHONE_WEBSOCKET_ROUTES`;
  - the peer-WebSocket phone refusal;
  - the thin close-code adapter;
  - removal of CORS from the composition;
  - two failure codes, and removal of the dead `WebSocketAuthPolicy`;
  - the docs and glossary.
- Files / areas reviewed:
  - `src/api/security/remote-access-request-origin.ts` (new)
  - `src/api/security/remote-access-policy-plugin.ts`
  - `src/api/security/remote-access-route-policy.ts`
  - `src/api/websocket/remote-access-websocket-auth.ts`
  - `src/compositions/build-studio-server.ts`
  - `src/remote-access/domain/models.ts`
  - `tests/unit/remote-access/request-origin.test.ts`, `tests/unit/remote-access/route-policy.test.ts`
  - `tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts`
  - `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-web/docs/remote_access.md`, `GLOSSARY.md`
- Also read for context:
  - `remote-access-local-trust.ts`;
  - all 13 `authorizeRemoteAccessWebSocket` call sites and every `{ websocket: true }` route in `src/`;
  - `@fastify/cors` 11.3.1 `index.js:92-200`, the callback-delegator and `addCorsHeadersHandler` paths.
- Explicit exclusions:
  - executable validation AC-007…AC-009 (owned by API/E2E);
  - the standalone application server, the MCP gateway rule and the message gateway (out of scope by design).
- Checks rerun: none. All recorded checks IMP-01…IMP-08 ran on `88a93aaf26`, and no source changed after them. I read the IMP-04, IMP-05 and IMP-08 log results (`7 passed`, `4 passed`, `5 failed | 2 passed` on base).

## Round 2 — Base Integration (IR-002)

The resolution, checked against the merged code:

1. **One close-code table.** 407's `REMOTE_ACCESS_CLOSE_CODE_BY_FAILURE` (`remote-access-close-codes.ts`) gains both new codes at 4403, and IR-001's local `closeCodeByFailure` is gone. The adapter throws `remoteAccessCloseForFailure(result.code)`. The `?? 4401` fallback is removed. It was unreachable: the table is an exhaustive `Readonly<Record<RemoteAccessAuthFailureCode, number>>`, and both callers pass a typed code: the adapter, and 407's `NodeDesktopViewers.recheckEntry` (`node-desktop-viewers.ts:112`, which gets it from `authorizeMobileCredential`). Typecheck IMP-09 passes.
2. **The adapter keeps IR-001's shape.** It makes one `authorizeWebSocket` call. 407's second credential parser, its trusted-network context and the `routeClass` parameter are not revived. A grep finds no `extractRemoteAccessWebSocketCredential` anywhere in `src`, `tests` or `autobyteus-web`.
3. **node-desktop keeps the phone's credential through the policy's reader.** `node-desktop.ts:99` uses `readWebSocketQueryCredential(req)` to build 407's viewer identity, after `authorizeRemoteAccessWebSocket(req)` has accepted the same request. The credential is not used for authorization there; 407's live re-check validates it again through `authorizeMobileCredential`. `remote-access-route-policy.ts` keeps one reader and exports it, and the adapter re-exports it under the same name. Handlers therefore still depend only on the adapter, and the code now has one query-credential reader instead of 407's two.
4. **Tests and docs.** The e2e AC-001 case adds a foreign-Origin `/ws/node-desktop?mode=view` upgrade, which returns 403. The server doc names `remote-access-close-codes.ts` as the close-code owner. `autobyteus-server-ts/README.md` and `docs/android_mobile_access.md` mention the allowed-origin rule, and both match the code (delivery docs sync).

Checks on `6f59bab2a2`, all recorded by implementation (not rerun):
- IMP-09: typecheck PASS.
- IMP-10: 152 passed. Covers the origin/phone e2e, 407's node-desktop e2e (View only, Control, limits, live revoked/disabled re-check closing with 4403), viewer, websocket and remote-access units, and the contract test.
- IMP-11: 26 passed.
- IMP-12: 8043 passed, including the architecture tests.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`.
  - REQ-001…REQ-008, AC-001…AC-010.
  - Preserved: BEH-004…BEH-008, phone HTTP access, owner/peer/loopback rules, close codes.
- Design-spec behavior map verified against the implementation: `Yes`. DS-001, DS-002 and DS-003 match the code (see table).
- Design review report and round confirmed: round 2, `Pass` (ARCH-REV-002); MP-001 resolved through AR-001.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `registerRemoteAccessPolicyPlugin` `onRequest`: `originPolicy.isAllowed(request.headers)` → `refuse(...ORIGIN_REFUSED...)` runs before `shouldDeferToWebSocketHandler` (`remote-access-policy-plugin.ts:67-73`). So every `/ws/*`, `/graphql` and `/rest/remote/run-observations` upgrade meets it. IMP-04 AC-001: 403 on all four families for both foreign and `null`; `TerminalHandler.connect` not called | — |
| BEH-002 | Confirmed | Same gate for HTTP. CORS goes through a callback delegator from the same rule (`:61-65`). In `@fastify/cors` (`index.js:131-139,165-200`), `origin:false` means no ACAO and `next()` to the gate, which answers 403. An allowed preflight is answered 204 by CORS before the gate, as before. A no-Origin request gets `origin:true`, which reflects `undefined` and so sends no ACAO; strict preflight still answers 400 as before | — |
| BEH-003 | Confirmed | `RemoteAccessRoutePolicy.authorizeWebSocket` (`remote-access-route-policy.ts:208-218`). `/graphql` reaches it through `authorizeHttpRequest:197-199`; `/ws/*` through the adapter (`remote-access-websocket-auth.ts:33-40`). All 13 `/ws/*` handlers call the adapter: `grep "websocket: true"` lists 14 node routes, and the 14th, `/remote/run-observations`, is covered by the `REMOTE_PEER` branch `:185-187` | — |
| BEH-003 (round 2, `/ws/node-desktop`) | Confirmed | `/ws/node-desktop` stays a phone WebSocket route (REQ-004, S3/407). The path is handler → adapter → `authorizeWebSocket` (listed pattern) → `authorizeMobileCredential` → viewer built from the same credential → 407's registry admits it and re-checks it live. A foreign Origin on it is refused 403 at the gate (IMP-10) | — |
| BEH-004…008 | Confirmed (server side) | The origin rule allows: absent, `file://`, Host / first X-Forwarded-Host, loopback (brackets handled by `normalizeClientAddress`), configured. IMP-04 AC-002 uses real upgrades; IMP-05 shows the MCP gateway contract is unchanged; IMP-06/IMP-07 keep the existing WS suites green. Executable client validation is API/E2E's (AC-007…AC-009) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001/002/005 | Contract | Attacker page | Open a node WS cross-origin | Browser WS handshake with Origin | Explicit Edge | Gate → origin rule → 403 before any handler | Refused, nothing runs | Requirements SCN-001; IMP-04 AC-001, IMP-08 base fails | Supported Explicit Edge Scenario | Use |
| SCN-002 | BEH-002, REQ-003 | Contract | Attacker page | Call GraphQL cross-origin | Preflight + POST `/graphql` | Explicit Edge | CORS (no grant) → gate 403 | Refused | IMP-04 AC-003 | Supported Explicit Edge Scenario | Use |
| SCN-003 / SCN-008 | BEH-004, BEH-007 | User | Desktop app, app iframe | Use nodes, apps | `file://` WS, no-Origin HTTP, node-origin iframe | Normal | Origin rule allows → existing authorization | Unchanged | Origin probe; AC-002 | Supported Normal Scenario | Use |
| SCN-004 | BEH-005, REQ-004 | User | Paired phone | Runs, files, desktop view | Same-origin WS with `access_token` on phone routes | Normal | Gate allows → handler → adapter → `authorizeWebSocket` → listed pattern → `authorizeMobileCredential` | Accepted; revoked/disabled as today | IMP-04 AC-005 (each pattern registered and opens) | Supported Normal Scenario | Use |
| SCN-005 | BEH-003, REQ-004/005 | Contract | Holder of a phone credential | Open a non-phone WS route | WS with `access_token=mra_…` | Explicit Edge | `authorizeWebSocket` → pattern not listed → `PHONE_ACCESS_ROUTE_REFUSED` before validation | 4403 / 403 | IMP-04 AC-004, unit tests | Supported Explicit Edge Scenario | Use |
| SCN-006 | BEH-006 | System | Peer node | Remote collaboration | `/rest/remote/*` with no Origin | Normal | Gate allows → `REMOTE_PEER` branch unchanged without query credential | Unchanged | Unit peer tests; AC-009 for API/E2E | Supported Normal Scenario | Use |
| SCN-007 / SCN-009 | BEH-008, REQ-002b/d/e | Operational | Developer; owner behind a gateway | Dev shell; gateway access | Loopback origin; X-Forwarded-Host or configured origin | Normal / Explicit Edge | Origin rule allows | Unchanged | Unit table; IMP-04 AC-002 | Supported | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C01 | The delegator returns `origin: isAllowed(headers)` (`true`/`false`) instead of the design's literal `isAllowed && origin ? origin : false` | REQ-003 ("HTTP without Origin behaves as today"), DS-003 | Any no-Origin OPTIONS (non-browser client) | Literal form: `origin:false` → CORS skips → no `OPTIONS *` answer → 404. Implemented form: `true` reflects `undefined` (no ACAO) → strict preflight 400, as on base | `@fastify/cors` `index.js:165-200`; IMP-04 `noOriginPreflight` → 400; IMP-05 green | Reject | — | Not a defect: same headers for allowed Origins, and it preserves the base behavior REQ-003 requires. The deviation is recorded in the handoff; no design change is needed |
| CR-C02 | `REMOTE_PEER` branch refuses a mobile `access_token` query credential on every `/rest/remote/*` request, HTTP included, with `PHONE_ACCESS_ROUTE_REFUSED` | AR-003 / design file mapping | A phone credential in a query string on a peer HTTP route | No phone flow uses peer routes (REQ-004 list; investigation) | design-spec row for `remote-access-route-policy.ts` | Reject | — | Exactly as designed. The HTTP form has no supported client, so the code name has no misleading consumer |
| CR-C03 | The gate now writes a warn line for every refusal it replies with, including owner-route and `LOCAL_DEV_ONLY` refusals | DS-001 narrative ("whatever refusal the gate replies with … one log line") | Any refusal | Log only | Plugin `refuse(...)` | Reject | — | Designed behavior; volume risk recorded in handoff as Low |
| CR-C04 | Same-origin also accepts the first `X-Forwarded-Host` value | DEC-003, REQ-002b | A browser cannot set X-Forwarded-Host on a WS handshake. A cross-origin fetch that sets it is non-simple, so its preflight (foreign Origin) is refused first | Not reachable by an attacker page | REQ-002, External Contracts | Reject | — | Approved rule; DNS rebinding is FU-001 |
| CR-C05 | `closeCodeByFailure.REMOTE_ACCESS_ORIGIN_REFUSED` (4403) is never reached | Engineering contract: exhaustive `Record` | — | Type completeness only | ARCH-REV-002 accepted it | Reject | — | Required by the exhaustive `Record` type; it is not dead logic |
| CR-C06 | A revoked or invalid `mra_` credential on a non-phone route gets `PHONE_ACCESS_ROUTE_REFUSED`, not `AUTH_INVALID`/`DEVICE_REVOKED` | REQ-004, design ("route check before credential validation") | Revoked phone opening `/ws/terminal` | Client does not unpair, but it never offers that route | design-spec `authorizeWebSocket`; `remoteAccessAuthFailure.ts` | Reject | — | Designed order; it keeps the refusal free of validation work (QR-001) |
| CR-C08 | `node-desktop.ts` (a WS handler the design said to leave alone) changed one import and one call | Design Change Scope; base integration with 407 | 407 added the handler's credential read after the design was written | The change is a rename to the policy's single reader. Behavior is identical (same parsing, `trim() \|\| null`) | Merge diff; IMP-10 node-desktop e2e | Reject | — | Forced by the base, minimal, and it removes a duplicate reader. Not a design deviation that needs upstream revision |
| CR-C09 | The adapter re-exports `readWebSocketQueryCredential` | Design Dependency Rules (handlers → adapter only; no handler reading `access_token` for authorization) | — | The reader serves only viewer identity after authorization | `remote-access-websocket-auth.ts:15` | Reject | — | Keeps the dependency rule; one reader, one name (P15) |
| CR-C10 | `?? 4401` removed from 407's `remoteAccessCloseForFailure` | Dead code in a touched file (P7) | — | Both callers pass a typed `RemoteAccessAuthFailureCode`; the table is exhaustive | Grep of callers; IMP-09 | Reject | — | Correct removal of unreachable code |
| CR-C07 | Origin value logged raw in `refuse(...)` | REQ-005 / AC-006 | Foreign page | Node's HTTP parser rejects CR/LF in header values, so no log injection. Origin carries no credential | AC-006 lines in IMP-04 | Reject | — | As designed: the origin value is logged for the origin refusal only |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Duplicated WS rule removed. The adapter imports only `getRemoteAccessRoutePolicy`/`setRemoteAccessAuthContext`, and `authorizeWebSocket` is the only `access_token` authorization reader | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None are behavior-defining; probe premises match the code | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001 order: MCP hook → CORS → origin gate → `/ws/*` deferral or `authorizeHttpRequest`. DS-002: handler → adapter → `authorizeWebSocket` | — |
| Ownership boundary preservation and clarity | Pass | Gate owns sequence and replies. The origin rule is a pure module. The route policy owns the WS rule and the phone list; the adapter only translates | — |
| Off-spine concern clarity | Pass | Configured-origin parsing sits in the rule module; the reading and warning sit in the gate; redaction is reused | — |
| Existing capability/subsystem reuse check | Pass | Reuses `isLoopbackClientAddress`, `redactSensitiveUrl`, `RemoteAccessRejection` and `appConfigProvider` | — |
| Reusable owned structures check | Pass | `trustedNetworkContext` / query-credential reader now exist once (route policy) | — |
| Shared-structure/data-model tightness check | Pass | Two codes added to the existing union; no new parallel shapes | — |
| Repeated coordination ownership check | Pass | One origin rule for gate and CORS; one WS credential rule for both WS forms | — |
| Empty indirection check | Pass | The adapter owns the close-code translation and context set (designed facade) | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Origin logic only in `remote-access-request-origin.ts`; no origin logic in the route policy | — |
| Ownership-driven dependency check | Pass | `request-origin` → `local-trust` only; adapter → route policy only; composition no longer imports CORS | — |
| Authoritative Boundary Rule check | Pass | The adapter no longer calls `RemoteAccessAuthService` directly alongside the policy; the bypass the base code had is removed. Round 2: `node-desktop.ts` depends only on the adapter; 407's live re-check of an admitted stream validates through the auth service, which is base behavior and not a second route rule | — |
| File placement check | Pass | All in `src/api/security` / `src/api/websocket` per design | — |
| Flat-vs-over-split layout judgment | Pass | One new file for one new owner | — |
| Interface/API boundary clarity | Pass | `isAllowed(headers)`, `authorizeWebSocket(request)` (route pattern identity), `parseConfiguredOrigins(raw)`; the dead `routeClass` parameter is gone | — |
| Naming quality and one-vocabulary check | Pass | `RequestOriginPolicy`, `PHONE_WEBSOCKET_ROUTES`, `REMOTE_ACCESS_ORIGIN_REFUSED`, `PHONE_ACCESS_ROUTE_REFUSED` match the glossary entries and families | — |
| No unjustified duplication in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | Initial round; straight-line code | — |
| Dead code removed in the touched files and modules | Pass | Round 2: IR-001's local `closeCodeByFailure` is dropped in favor of 407's table; the `?? 4401` fallback is removed (CR-C10); 407's duplicate reader is not revived. Round 1 removals: `extractRemoteAccessWebSocketCredential`, the adapter's `trustedNetworkContext`/`parseRequestUrl`, `routeClass` + 4404 branch, `?? 4401`, CORS import, `WebSocketAuthPolicy`/`WEBSOCKET_AUTH_POLICY`. A repo grep finds no remaining reference | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Unit REQ-002 table incl. near misses; route-policy per pattern, refusal before validation, peer WS. E2E AC-001…AC-006 on the real studio server with real upgrades, `hasRoute` per listed pattern, exact log lines | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `upgrade`/`inject`/`pairPhone` helpers; `webSocketUpgrade`/`mobileAuthService` in unit test | — |
| No stale, duplicated, or compatibility-only tests retained | Pass | The old "validates mra on GraphQL WS" test was replaced by the refusal test | — |
| API/E2E readiness | Pass | Server-side ACs proven; AC-007…AC-009 hints in handoff | — |

## Source File Size And Structure Audit

| Source File | Effective Lines Before (base) | Effective Lines After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `remote-access-policy-plugin.ts` | 24 | 73 | Pass | Pass | Pass | Pass | — | — |
| `remote-access-request-origin.ts` | 0 (new) | 70 | Pass | Pass | Pass | Pass | — | — |
| `remote-access-route-policy.ts` | 182 | 210 | Pass | Pass | Pass | Pass | — | — |
| `remote-access-websocket-auth.ts` | 99 | 63 | Pass | Pass | Pass | Pass | — | — |
| `build-studio-server.ts` | 493 | 488 | Pass (removals only) | Pass | Pass | Pass | — | — |
| `models.ts` | 133 | 135 | Pass | Pass | Pass | Pass | — | — |
| Round 2 (base 6341292552 → 6f59bab2a2): `remote-access-websocket-auth.ts` | 82 | 53 | Pass | Pass | Pass | Pass | — | — |
| Round 2: `remote-access-close-codes.ts` | 22 | 24 | Pass | Pass | Pass | Pass | — | — |
| Round 2: `node-desktop.ts` | 108 | 108 | Pass | Pass | Pass | Pass | — | — |
| Round 2: `remote-access-route-policy.ts` | 182 | 211 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No warn-only mode, no `origin: true` kept |
| No legacy old-behavior retention in changed scope | Pass | Duplicate WS rule removed |
| Dead code removed in the touched files and modules | Pass | See structural row |
| Approved persisted-data transition decision is followed | Pass | `Not Affected`; one optional setting read |
| No version-specific dual reads/writes or old-shape fallback | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None remaining.

## Docs-Impact Verdict

- Docs impact: `Yes`, and it was delivered in this change (AC-010).
- Why: a new refusal contract, a new setting, and phone WS routes (Phase Two for WebSockets).
- Files updated: `autobyteus-server-ts/docs/features/remote_access.md` (Owners table, Allowed Origins, Route Policy, log line, Phase Two), `autobyteus-web/docs/remote_access.md`, `GLOSSARY.md` (two entries). The content matches the code: the 8 patterns, the codes, close 4403 vs HTTP 403, and the log formats.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | `registerMcpGatewayRoutes` still runs before the plugin; the gateway rule is untouched. Round 2: `build-studio-server.ts` is identical to IR-001, and IMP-10 includes the unchanged contract test |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score: 9.5 / 10 (simple average; summary only)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | The gate's order of checks is readable top-down, and the docblock names the MCP-first order | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | One owner each for origin, the WS credential rule and replies; the adapter's former boundary bypass removed | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Small explicit signatures; route identity by exact pattern | `isAllowed` takes a generic headers map (designed) | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Pure rule module, gate, policy, adapter each in place | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | Codes added to the existing union; `RemoteAccessRejection` reused | The unreachable `REMOTE_ACCESS_ORIGIN_REFUSED` close-code entry is forced by the `Record` (accepted) | — |
| 6 | Naming Quality and Local Readability | 9.5 | Names match the glossary; short comments explain non-obvious choices (callback delegator, host-only compare) | — | — |
| 7 | API/E2E Readiness | 9.5 | Real-server e2e covers AC-001…AC-006; base reproduction fails as expected | AC-007…AC-009 are still to run (by design) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Traced against `@fastify/cors` source: the refused, allowed and no-Origin paths each match REQ-003; the delegator deviation preserves base behavior | Client compatibility rests on ASM-001/ASM-002 until executable validation | API/E2E confirms them |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cut: no warn-only mode, no `origin: true`, no `routeClass` | — | — |
| 10 | Cleanup Completeness | 9.5 | All designed removals done, plus the dead `WebSocketAuthPolicy` in a touched file | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None (FU-001…FU-003 already recorded upstream).

## Classification

None: the review passes.

## Recommended Recipient

- API/E2E engineer (primary pass rule); implementation engineer informed.

## Residual Risks

- ASM-001 / ASM-002: no shipped client sends an Origin outside REQ-002, and the phone uses no WS route outside the list. These rest on executable validation AC-007…AC-009, especially the Android/iOS WebView wrappers and Electron dev.
- Phone access depends on exact Fastify route patterns. IMP-04 AC-005 (`hasRoute` per listed pattern) guards against a renamed parameter.
- RSK-001…RSK-003 are unchanged (FU-001, FU-002).

## Latest Authoritative Result

- Review Decision: `Pass` (round 2, CRR-003)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (MP-001 confirmed)
- Score Summary: 9.5 average; every category ≥ 9.4
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: classification Medium / High preserved. The delegator deviation is accepted as REQ-003-preserving (CR-C01). Round 2: the base integration with autobyteus-407 keeps one WS credential rule, one query-credential reader and one close-code table. The scorecard is unchanged, because no category moved: the resolution reduced duplication and added no new owner. Next is API/E2E, for the phone journey on the node desktop under the origin gate (View only, Control, live revocation) and a foreign-origin `/ws/node-desktop` from a browser page.
