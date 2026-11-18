# Design Review Report — websocket-origin-and-phone-route-guard (autobyteus-403)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/websocket-origin-and-phone-route-guard/requirements-doc.md` (Approved, SR-001)
- Upstream Investigation Notes: `.../investigation-notes.md`
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001, SR-002, SR-003)
- Reviewed Design Spec: `.../design-spec.md` (SR-003, `Ready`)
- Supplemental Task Artifacts Reviewed: `evidence/origin-probe/` (README, `fastify-gate-probe.mjs`, `route-pattern-probe.mjs`); `follow-ups.md`
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: revised design SR-003 answering ARCH-REV-001 (AR-001…AR-003), from the Solution Designer, 2026-11-06
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/websocket-origin-and-phone-route-guard`, base `origin/personal` @ `3bf9240d42` (no source changes). I read the code at the cited lines. I reran `fastify-gate-probe.mjs` and `route-pattern-probe.mjs` on a copy against the worktree dependencies, and the results match the design. I also read `@fastify/cors` 11.3.1 `index.js:95-200`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: one subsystem (`src/api/security` plus the WS adapter), one new file, four modified files. It is a security boundary that every request crosses, with new refusal contracts and a new setting.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. The design's user approval is `Not required`, not `Pending`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. These are REQ-001…REQ-008 and AC-001…AC-010, with DEC-001 = B (HTTP in scope) and DEC-010 = keep the phone limit.
- Relevant existing behavior and evidence confirmed:
  - `remote-access-policy-plugin.ts:4-28` (root `onRequest`; `/ws/*` deferred).
  - `remote-access-route-policy.ts:71-73,88-96,119-136,147-187` (classification; duplicated WS credential rule).
  - `remote-access-websocket-auth.ts:21-81` (second copy, dead `routeClass`).
  - `build-studio-server.ts:458-480` (registration order; CORS `origin: true`).
  - 13 node WS route patterns, plus `/rest/remote/run-observations` and mercurius `/graphql`.
  - All 13 `authorizeRemoteAccessWebSocket(req)` call sites pass only `req` (`terminal.ts:154`, `file-explorer.ts:100`, and the others). Every handler authorizes before it does any route work.
- Scope guardrail confirmed: Yes. UC-001…UC-003 are in scope. DNS rebinding, same-origin content, the standalone server and the message gateway are out of scope. BEH-004…BEH-008 and the close codes are preserved.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes` (AR-001 → REQ-003/REQ-006/QR-003; AR-002 → REQ-005/AC-006; AR-003 → REQ-004/REQ-005).
- Remaining material ambiguity: None in the requirements.
- Statements about existing code, opened at their cited lines:
  - All cited lines match.
  - Round 1 found that the "12 call sites" count was really 13. SR-003 corrects it to 13 (design-spec lines 48, 188).
  - Round 1 found the claim "nothing else decides it" false. SR-003 now records the MCP gateway's origin hook at its real lines (`mcp-gateway-routes.ts:65-89`, `mcp-gateway-http-helpers.ts:51-73`), and the ownership statement matches the code (design-spec lines 24, 202, 209).

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | Contract | Pass | Pass (`/mcp/gateway` hook traced, SR-003) | Pass (DS-001 shows gateway hook → CORS → gate → route authorization) | Confirmed | — |
| BEH-003 | Contract | Pass | Pass | Pass (gate logs every refusal it replies with; peer WS uses `PHONE_ACCESS_ROUTE_REFUSED`) | Confirmed | — |
| BEH-004…008 | User/System/Operational | Pass | Pass (probe measured; `@fastify/cors` delegator keeps `Vary: Origin` because `dynamic` is true, `index.js:163-166`, so the no-Origin case is unchanged) | Pass | Confirmed | — |

Overall basis: confirmed. Every row is `Confirmed`.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose/Scope | Linked | Complete | Consistent | Status/Approval | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/origin-probe/` | Pass | Pass | Pass | Pass | Pass (evidence, not behavior-defining) | Optional: in `fastify-gate-probe.mjs` the `"null"` string case and the absent-Origin case share one output key (`origin=null`), so the `"null"` result is overwritten. Not material: the real rule is specified separately and AC-001 tests `null`. |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | design-spec "Task Design Health Assessment" | — |
| Root cause explicit and evidence-backed | Pass | Duplicated WS rule (`route-policy.ts:175-181` vs `websocket-auth.ts:57-81`); Missing Invariant (no Origin rule, no phone route rule) | — |
| Refactor decision explicit | Pass | Refactor now: one `authorizeWebSocket` | — |
| Decision reflected in design sections | Pass | File mapping, removal plan, sequence step 2 | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner, Call Order | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Every HTTP request / WS upgrade | Pass | Pass | N/A | Pass | Pass (SR-003: gateway hook for `/mcp/gateway` → CORS → gate; registration order stated) | Pass | Pass |
| DS-002 | WS credential incl. phone routes | Pass | Pass | Pass (adapter → `authorizeWebSocket`) | Pass | Pass | Pass (the gate logs HTTP-reply refusals; the adapter logs `/ws/*` closes; one line each) | Pass |
| DS-003 | CORS delegator | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RemoteAccessRoutePolicy.authorizeWebSocket` | Pass | Pass | Pass | Pass | Adapter keeps no credential rule; imports trimmed per Dependency Rules |
| Origin rule (`RequestOriginPolicy`) | Pass | Pass | Pass | Pass | SR-003 forbids admitting an origin the node rule refuses, or a second node-wide rule. The gateway's narrower, earlier rule is kept and may not be widened |
| `authorizeRemoteAccessWebSocket` adapter | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remote-access-websocket-auth.ts` | Pass | Pass | Pass | Pass | No auth-service / local-trust / query-key imports |
| `remote-access-request-origin.ts` | Pass | Pass | Pass | Pass | → `remote-access-local-trust.ts` only. `isLoopbackClientAddress` already strips brackets (`local-trust.ts:9-10,45-53`) |
| `remote-access-policy-plugin.ts` | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `createRequestOriginPolicy(configuredOrigins)` | Pass | Pass | Pass | Low | Pass |
| `RequestOriginPolicy.isAllowed(headers)` | Pass | Pass | Pass | Low | Pass |
| `parseConfiguredOrigins(raw)` | Pass | Pass | Pass | Low | Pass |
| `RemoteAccessRoutePolicy.authorizeWebSocket(request)` | Pass | Pass | Pass (route pattern from `routeOptions.url`, measured) | Low | Pass |
| `authorizeRemoteAccessWebSocket(request)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Request gate | Pass | Pass | N/A | Pass | Extend plugin |
| WS credential rule | Pass | Pass | N/A | Pass | Extend route policy |
| Loopback test, redaction | Pass | Pass | N/A | Pass | Reuse |
| Origin comparison | Pass | Pass | Pass | Pass | The standalone server and the MCP gateway's `isOriginAllowed` are both weighed. The gateway's rule is kept, not reused: its set is inside REQ-002's set |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/api/security` | Pass | Pass | Pass | Pass | — |
| `src/api/websocket` | Pass | Pass | Pass | Pass | Shrinks to adapter |
| `src/remote-access/domain` | Pass | Pass | Pass | Pass | +2 codes |
| `src/mcp-gateway` | Pass | Pass (left unchanged) | Pass | Pass | Deliberate narrower route-family rule |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| WS credential rule (2 copies) | Pass | Pass | Pass | Pass | — |
| `trustedNetworkContext` / query reader (2 copies) | Pass | Pass | Pass | Pass | Removed from adapter |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RemoteAccessAuthFailureCode` (+2) | Pass | Pass | Pass | N/A | Pass | `REMOTE_ACCESS_ORIGIN_REFUSED` never reaches the adapter. Its `closeCodeByFailure` entry exists only because the `Record` type requires it. Acceptable |

Derived consumers of a changed structure listed with a decision for each: `Pass` (`closeCodeByFailure`, plugin reply body, web `remoteAccessAuthFailure.ts` unchanged by design).

One vocabulary: `Pass`. "Allowed origin" and "Phone WebSocket route" are added to `GLOSSARY.md`. "Upstream origins" in the credential-proxy entry (`GLOSSARY.md:178`) is a different, qualified term. AR-003 is a code-consistency point, not drift in vocabulary.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remote-access-request-origin.ts` (new) | Pass | Pass | N/A | Pass | — |
| `remote-access-policy-plugin.ts` | Pass | Pass | N/A | Pass | One local `refuse(...)` sends every reply and its log line; it is registered after `registerMcpGatewayRoutes` |
| `remote-access-route-policy.ts` | Pass | Pass | Pass | Pass | Peer WS query credential → `PHONE_ACCESS_ROUTE_REFUSED`; peer HTTP bearer keeps `REMOTE_ACCESS_AUTH_INVALID` |
| `remote-access-websocket-auth.ts` | Pass | Pass | Pass | Pass | — |
| `remote-access/domain/models.ts` | Pass | Pass | N/A | Pass | — |
| `build-studio-server.ts` | Pass | Pass | N/A | Pass | Only shrinks (502 lines) |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear | Folder Matches Owner | Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/api/security/remote-access-request-origin.ts` | Pass | Pass | Low | Pass | — |
| Tests (`tests/unit/remote-access/request-origin.test.ts`, `route-policy.test.ts`, new e2e) | Pass | Pass | Low | Pass | `studio-server-http-contract.integration.test.ts` named as must stay green, unchanged |

## Removal / Decommission Completeness Verdict

| Item / Area | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Adapter's `trustedNetworkContext`, `extractRemoteAccessWebSocketCredential` | Pass | Pass | Pass | Pass | Export is used only inside the file (grep) |
| `routeClass` parameter + 4404 branch | Pass | N/A | Pass | Pass | 13 call sites, all `(req)` |
| CORS registration + import in composition | Pass | Pass | Pass | Pass | — |
| `TRUSTED_NETWORK_WEBSOCKET` body in `authorizeHttpRequest` | Pass | Pass | Pass | Pass | — |
| Imports left unused in the adapter (`isLoopbackClientAddress`, `getRemoteAccessAuthService`, `isMobileRemoteAccessCredential`, `WEBSOCKET_ACCESS_TOKEN_QUERY_KEY`, `RemoteAccessRouteClassification`) | Pass (Dependency Rules) | N/A | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Retention Exists | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| CORS `origin: true`, warn-only mode, `routeClass` | No | Pass | Pass | Rejection log present |

## Persisted-Data Transition Verdict (When Applicable)

N/A. The decision is `Not Affected`: no stored data, one optional env/config setting read through `app-config.ts:480-485`.

## Change / Refactor Safety Verdict

| Area | Realistic | Temporary Seams | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–6 | Pass | Pass (step 2 behavior-identical first) | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Phone route identity, WS ownership, Tailscale same origin, near misses | Yes | Pass | Pass | Pass | — |
| Hook order with the MCP gateway | Yes | Pass | N/A | Pass | DS-001 chain plus registration order |

## Material Premise Validation (Only When Needed)

### `MP-001` — A legitimate client sends an Origin to `/mcp/gateway` that the new node rule refuses, or the gateway rule admits an origin the node rule refuses

- Related approved requirement: REQ-003, REQ-006, QR-003.
- Relevant behavior ID(s): BEH-002.
- Initiating basis kind: `System`.
- Independent trigger: agent runtimes and MCP clients on the node's machine call `POST /mcp/gateway` (contract test `studio-server-http-contract.integration.test.ts:117-159`, loopback origin `http://127.0.0.1:3000`).
- Forward path:
  1. Gateway root hook (`mcp-gateway-routes.ts:69-88`): absent or loopback origin passes; foreign origin gets 403; OPTIONS is answered here.
  2. CORS.
  3. New gate: loopback is allowed.
  4. `authorizeHttpRequest` (`TRUSTED_NETWORK_PROTECTED`).
- Consequence: the gateway's set (absent, `localhost`/`127.0.0.1`/`::1`) is inside REQ-002's set, so no supported client breaks with the current registration order. In round 1 the risk was the design's false claim of a single origin authority. SR-003 records the gateway's rule and forbids widening it, so that risk is resolved.
- Reachability: `Reachable` (contract test exercises it).
- Review consequence: AR-001, resolved in SR-003.

## Unresolved Approved-Behavior Or Current-State Gaps

None in the requirements. See the findings for gaps in the design.

## Review Decision

`Pass`

## Findings

None open. AR-001, AR-002 and AR-003 are resolved in SR-003. ARCH-REV-002's prior-finding table in `architecture-review-revision-record.md` gives the evidence.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). The Solution Designer gets an informational notification.

## Residual Risks

- RSK-001 (DNS rebinding, FU-001), RSK-002 (same-origin content, FU-002) and RSK-003 (trusted-network model) are accepted upstream and unchanged.
- The gate now logs one warn line for every refusal it replies with, including refusals that exist today (owner-route, `LOCAL_DEV_ONLY`). This is log-only and nothing a client can see. A hostile page or a misbehaving client can raise the log volume. Low impact.
- `REMOTE_ACCESS_ORIGIN_REFUSED` has a `closeCodeByFailure` entry that nothing reaches (it exists for type completeness). Acceptable.
- Executable validation (AC-007…AC-009) remains the evidence for ASM-001 and ASM-002: no shipped client uses another origin or another phone route.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 reachable; resolved through AR-001)
- Notes: ARCH-REV-002 checked the SR-003 changes against the current code at the cited lines. Requirements SR-001 and the Medium / High classification are unchanged. The design is ready for implementation.
