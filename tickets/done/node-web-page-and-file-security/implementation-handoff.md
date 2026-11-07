# Implementation Handoff

Ticket: autobyteus-416, `node-web-page-and-file-security`. Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security/tickets/in-progress/node-web-page-and-file-security/`.
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security`, branch `codex/node-web-page-and-file-security`, base `origin/personal` @ `6225a734a3`.
Commits: `0c66d3052d` (the handed-over ticket documents), `da207045a5` (implementation; the source every check ran on), then the documents-and-evidence commit that adds this file.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large / High) and passed (ARCH-REV-002). Handoff rule: implementation complete with `task_size=Large` / `architectural_risk=High` → `/software_engineering_team/code_reviewer`.
- Requirements doc: `requirements-doc.md` (Approved, SR-001; DEC-001 = A, DEC-002 = A, user, 2026-11-07)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-001…SR-003)
- Design spec (required on every route): `design-spec.md` (SR-003, `Ready`)
- Supplemental task artifacts: `probes/reproduce-416.sh` (R2d row and the refusal code added by implementation), `probes/d6-file-origin-forms-probe.js`, `probes/d6-http-page-control-probe.js`, `evidence/SR-003-*`, `evidence/A1-*`, `evidence/R4-*`
- Design review report: `design-review-report.md` (ARCH-REV-002, round 2, `Pass`)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: `N/A` (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001, SR-003
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

D1–D9 are implemented as designed, in the Change / Refactor Sequence's order:

1. Shared pieces: `request-host-name.ts` (one Host parser and host normalizer; the MCP gateway and the local access gate use it), `node-browser-access.ts` (`getNodeBrowserAccess()`: the three settings read once, one warning per setting; `parseConfiguredOrigins` moved here; new `parseConfiguredHosts`), `remote-access-refusal.ts` (`refuseRemoteAccessRequest`, plus `toLoggableRequestValue`: escaped, at most 100 characters).
2. Origin rules: the loopback class is removed from `createRequestOriginPolicy`; `createToolEndpointOriginPolicy` (no Origin or a configured one) replaces the MCP gateway's `isOriginAllowed` (hook and handler) and the local access gate's `isAllowedOrigin`. The gate reads the configured origins from the settings owner, so its three construction sites are unchanged.
3. Host rule and gate: `createRequestHostPolicy` (classes → configured names and `.suffix` entries → `isPairedPhoneHost` on a miss), `RemoteAccessPairingService.isPairedPhoneHost` (open sessions, non-revoked phones; stored hosts normalized as Host headers are, R-3), `registerRemoteAccessHostGate` (first request rule), `REMOTE_ACCESS_HOST_REFUSED` (models and close-code table).
4. User files: `sendUserFile` (`src/api/rest/user-file-reply.ts`) answers F1–F15; `PREVIEW_DOCUMENT_SANDBOX` and `context-files.ts`'s `sendFile` are gone; `tests/architecture/user-file-replies.test.ts` keeps file routes on the owner (exceptions `application-bundles.ts`, `project-task-context-files.ts`; a note says why `application-backends.ts` needs none, R-4).
5. Launchers: `EmbeddedServerLaunchConfig.developmentRendererOrigin` (set from the dev start URL when `isDev`, else `null`) appended by `buildServerProcessEnv` to `AUTOBYTEUS_ALLOWED_ORIGINS`; `development-runtime.mjs` owns `AUTOBYTEUS_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000`; 40 browser probes list their frontend origin; server tests that used a localhost origin as a client now configure it.
6. In-app browser: `isFileDocumentRequest` (`electron/browser/browser-file-document-request.ts`), D6 rules 1 and 2a–c verbatim; `BrowserSessionProfile.applySessionPolicy` installs the `onBeforeSendHeaders` listener that sets `Origin: null` when it holds.
7. Docs and GLOSSARY.
8. `probes/reproduce-416.sh`: R1/R2 refused, R3 with both headers, R2d (configured origin) accepted.

Three implementation-level details, each inside the design's decisions (IR-001):

- **WebSocket plugin registered before the Host gate** (`build-studio-server.ts`). `@fastify/websocket` destroys a refused upgrade's raw socket in its `onResponse` hook only when its own `onRequest` hook marked the request (`request.ws`). With the gate registered first, each Host-refused upgrade left its socket open (IMP-12 C3: 8 open sockets after 8 refusals; `fastify.close()` hung). The plugin's `onRequest` hook only sets that mark, so D1's order holds: the Host gate still runs before the MCP hook, CORS preflight handling and the origin/auth hook. This also ends the same leak for an upgrade the MCP hook refuses, which predates this ticket.
- **Disposed frames** (`browser-file-document-request.ts`): Electron throws when a disposed `WebFrameMain`'s properties are read; the rule reads the frame origin through a guard that treats that as no frame, so the listener always answers and rule (c) still applies.
- **`context-files.ts`** keeps one local builder, `contextFileContent(filePath)`, that returns the `{ mimeType, body }` for `sendUserFile` (five routes share it); it no longer sends anything itself.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change touches the node's request gate (two new refusal paths on every request), three other listeners, 15 file routes, the pairing service, the Electron main process (session policy, embedded env), the dev launcher and 40 probes: 102 files in the implementation commit, about 20 source files in two packages. Security boundary and accepted-origin contract changed, as the design classified.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (independent code review route)
- New design impact or escalation trigger: `None`. No supported client was found that sends a Host or Origin outside the approved rule, and no viewer broke under the user-file headers in the checks run here (the viewer checks on the desktop are API/E2E's, below).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Refuse a request addressed to a name that is not the node's, 403 `REMOTE_ACCESS_HOST_REFUSED`, before any handler; `X-Forwarded-Host` ignored; missing Host as today | `build-studio-server.ts` (gate registered after the WebSocket plugin, before `registerMcpGatewayRoutes`) → `remote-access-host-gate.ts` → `remote-access-request-host.ts` (`request-host-name.ts`; `RemoteAccessPairingService.isPairedPhoneHost` on a miss) → `remote-access-refusal.ts` | Unit (IMP-03), e2e (IMP-07: HTTP with/without Origin, `X-Forwarded-Host`, preflight, `/mcp/gateway`, 4 WS families), reproduction R1a/R1b (IMP-02) |
| BEH-002 | Localhost Origin refused unless listed: main listener, `/mcp/gateway`, agent-tools and credential-proxy listeners | `remote-access-request-origin.ts` (`createRequestOriginPolicy` without the loopback class; `createToolEndpointOriginPolicy`) used by `remote-access-policy-plugin.ts`, `mcp-gateway-routes.ts` (hook and handler), `agent-tools-mcp-local-access.ts` (both listeners) | Unit, integration (IMP-06: MCP gateway and agent-tools preflights), e2e (IMP-07), R2a–c refused and R2d accepted (IMP-02) |
| BEH-003 | Every user file: same body and type, plus `CSP: sandbox allow-scripts` and `nosniff` | F1–F15 handlers in `workspaces.ts`, `files.ts`, `context-files.ts`, `run-file-changes.ts`, `team-communication.ts`, `agent-org-references.ts`, `agent-collaboration-references.ts` → `sendUserFile` | Route tests for F1–F15 with HTML/SVG/XML (IMP-03), architecture test (IMP-04), R3a–d (IMP-02) |
| BEH-004 | A `file://` page's requests carry `Origin: null`; nodes refuse them | `BrowserSessionProfile.applySessionPolicy` → `isFileDocumentRequest` | Unit over the Entry-Form and control rows; real Electron 42.11.16 spec with the product's session policy (IMP-10). AC-010 on the isolated desktop instance: API/E2E |
| BEH-005…007 | Desktop, phone, peers keep working: their hosts are allowed hosts | Classes and settings in `remote-access-request-host.ts`; pairing hosts via the pairing service | e2e: every class, `AUTOBYTEUS_SERVER_HOST` host, configured names/suffixes, an open pairing session's host, a company-address paired phone's WS (IMP-07). AC-004 `/mobile`, AC-011, AC-012: API/E2E |
| BEH-008 | Launchers list their frontend origin | `electronApplication.ts` → `EmbeddedServerLaunchConfig.developmentRendererOrigin` → `baseServerManager.ts` → `buildServerProcessEnv`; `development-runtime.mjs`; 40 probes in `autobyteus-web/tests/e2e/` | Electron env tests (IMP-09), dev-stack test (IMP-11), one representative probe (IMP-13) |
| BEH-009/010 | Viewers and an agent-started server in the in-app browser keep working | `sendUserFile` (no PDF exception, per A1); D6 leaves `http(s)` pages and GET navigations unchanged | Real-Electron control rows (IMP-10). AC-008, AC-009, AC-013 on the isolated desktop instance: API/E2E |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The standalone application host's own WebSocket rule is untouched (FU-001); it gets the tool-endpoint rule through the shared gate, as the design states.

## Key Files Or Areas

- Server, new: `src/api/security/{remote-access-host-gate,remote-access-request-host,request-host-name,node-browser-access,remote-access-refusal}.ts`, `src/api/rest/user-file-reply.ts`, `tests/architecture/user-file-replies.test.ts`, `tests/unit/remote-access/{request-host,node-browser-access,paired-phone-host,remote-access-host-gate}.test.ts`, `tests/unit/api/rest/{user-file-reply,user-file-routes}.test.ts`.
- Server, changed: `src/api/security/{remote-access-policy-plugin,remote-access-request-origin}.ts`, `src/compositions/build-studio-server.ts`, `src/mcp-gateway/{mcp-gateway-routes,mcp-gateway-http-helpers,mcp-gateway-access}.ts`, `src/agent-tools/mcp/agent-tools-mcp-local-access.ts`, `src/remote-access/domain/{models,remote-access-close-codes}.ts`, `src/remote-access/services/remote-access-pairing-service.ts`, the 7 route files; tests `tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts` (416 cases added), `tests/integration/{api/studio-server-http-contract,agent-tools/mcp/agent-tools-mcp-routes,api/rest/context-files}.integration.test.ts`, `tests/unit/{remote-access/request-origin,agent-tools/mcp/agent-tools-mcp-local-access,api/rest/workspaces}.test.ts`.
- Electron: `electron/browser/browser-file-document-request.ts` (new), `browser-session-profile.ts`, `electron/server/{embeddedServerLaunchConfig,serverRuntimeEnv,baseServerManager}.ts`, `electron/application/electronApplication.ts`; tests `electron/browser/__tests__/{browser-file-document-request.spec,browser-file-document-request.electron.spec,browser-session-profile.spec,browser-view-factory.spec}.ts`, `electron/server/__tests__/{serverRuntimeEnv,platformServerEnvironment,BaseServerManager,ServerForceStopTree,WindowsServerManagerShutdown}.spec.ts`.
- Launchers: `scripts/development/development-runtime.mjs` (+ `run-dev.test.mjs`); 40 probes: `git show --stat da207045a5 -- autobyteus-web/tests/e2e`. Every probe that starts a node and a frontend now lists the origin (checked: none left without it). Three shapes: the origin added to the node env where the frontend URL was already known; the frontend port chosen before the node where it was chosen after (`createNode`/`startNode` probes, the `stack` probes `delegated-copies-large-hub` and `owner-scoped-file-reads`); a module-level frontend origin for the multi-node probes (`mobile-shell`, `node-vocabulary`, `remote-nodes-page`, `remote-run-title`, `remote-runs-in-tree`; `nodes-docker-address` lists both of its frontends on both nodes, the Docker container through `-e`).
- Docs: `autobyteus-server-ts/docs/features/remote_access.md` (Allowed Hosts, Allowed Origins, User Files, ownership table, refusal log), `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docs/modules/node_desktop.md`, `autobyteus-web/docs/remote_access.md`, `autobyteus-web/docs/browser_sessions.md` (Local `file://` pages), `docs/android_mobile_access.md`, `GLOSSARY.md` (Allowed host new, Allowed origin changed, Tool endpoint, User file reply).

## Important Assumptions

- `@fastify/websocket` 11.3.4's upgrade handling (mark in `onRequest`, destroy in `onResponse`) is why the plugin goes first; IMP-07 asserts no socket stays open after Host-refused upgrades, so a plugin upgrade that changes this shows there.
- The dev stack owns `AUTOBYTEUS_ALLOWED_ORIGINS` as a launcher-owned key, as the design says: an inherited value or a line in its managed `.env` is replaced by the two frontend origins.

## Known Risks

- RSK-001/RSK-002 (accepted by DEC-001/DEC-002): a node reached by an unknown public DNS name, or a localhost tool not listed, is refused until the setting is added. The log line names the setting; docs updated; the release note is delivery's (draft text below).
- R-7 (not widened): a `file://` page's GET subresources also carry `Origin: null`, so a local HTML report that embeds node images will not load them. No supported workflow found that depends on it; if one appears it is a Requirement Gap.
- Dev stack: a developer cannot add a second origin for the dev stack's backend through its environment (launcher-owned key). Outside the dev stack (`pnpm dev`), a node's `.env` line works as DEC-002 describes.
- The real-Electron spec needs a display; it is skipped on Linux without `DISPLAY`/`WAYLAND_DISPLAY`.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (security)
- Reviewed root-cause classification: Missing Invariant (Host never checked) plus Duplicated Policy (15 file handlers; two Host parsers; two loopback-origin copies)
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` (bounded)
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`: one reply owner with an architecture test, one Host parser, one tool-endpoint rule, one refusal owner, one settings owner
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the WebSocket-plugin order is a mechanism detail that keeps D1's guarantee (see Current Implementation Summary).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no flag restores loopback origins; no allow-all host value)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`: `isLoopbackHostname` and the loopback branch, `parseConfiguredOrigins` (moved), the plugin's `readConfiguredOrigins`/`ALLOWED_ORIGINS_SETTING`/`refuse`, MCP `isOriginAllowed`/`isLoopbackHost` and the redundant origin check inside `handleGatewayOptions` (both callers check first), `mcp-gateway-access.ts` `parseHostHeader`, the local access gate's `isAllowedOrigin`/`isCurrentLoopbackOriginHost`/`parseHostHeader`/`isValidOptionalPortSuffix`, `PREVIEW_DOCUMENT_SANDBOX`, `context-files.ts` `sendFile`, the unused `path` import in `workspaces.ts`, and the tests of removed behavior
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` (`NodeBrowserAccess` has the three designed fields)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Largest: `build-studio-server.ts` 493 effective lines (was 488), `electronApplication.ts` 445, `baseServerManager.ts` 439; every new file under 105.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes` (paired devices and sessions are only read)
- Direct-use evidence or discard/rebuild result, when applicable: `N/A`
- Migration implementation and focused checks, only when `Migration Required`: `N/A`
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The server `dist/` used by IMP-02 was rebuilt from this source (`pnpm -C autobyteus-server-ts build`). `autobyteus-web/.nuxt` was prepared (`nuxt prepare`) for the Electron tests.
- Untracked build outputs (`autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/`) are not committed.
- No build input changed (no `package.json`, `tsconfig`, lockfile, workflow); `scripts/development/*` is a dev launcher, not a release build step, so the fresh-start build rule does not apply. Typechecks compile the new test files within their baselines (IMP-05, IMP-08).

## Checks Run

All on macOS (Darwin 25.5.0), node v22.23.1, pnpm 10.28.2. Evidence in `evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `bash tickets/.../probes/reproduce-416.sh <tmp>` before any change | `6225a734a3` | isolated node, own data root | base request gate and file routes | AC-001, AC-005, AC-007 (reproduced) | Pass (attacks accepted, as expected before the fix) | `IMP-01-reproduce-416-before.txt` | `R1a ... status=200`, `R2c ... status=200`, `R3a ... csp=none | nosniff=none` |
| IMP-02 | same, after `pnpm -C autobyteus-server-ts build` | `da207045a5` | isolated node; `AUTOBYTEUS_ALLOWED_ORIGINS=http://127.0.0.1:3000` | Host gate, origin rules, MCP gateway, `sendUserFile`, refusal log | AC-001, AC-005, AC-007, QR-001 | Pass | `IMP-02-reproduce-416-after.txt` | `R1a ... status=403 | code=REMOTE_ACCESS_HOST_REFUSED`; `R2d ... status=200`; `R3c ... csp=sandbox allow-scripts | nosniff=nosniff`; credential-pattern matches `0` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | `da207045a5` source (run before the commit; see IMP-04) | unit isolation | whole server unit suite incl. the new unit tests | REQ-001…REQ-007 | Pass (1 failure = tracked-imports, untracked files then; passes in IMP-04) | `IMP-03-server-unit.log` | `Tests  1 failed | 8149 passed | 9 skipped (8159)`; the only failure `tracked-imports.test.ts` |
| IMP-04 | `pnpm -C autobyteus-server-ts exec vitest run tests/architecture --no-watch` | `da207045a5` | — | architecture tests incl. `tracked-imports`, `user-file-replies` | REQ-007 | Pass | `IMP-04-server-architecture.log` | `Tests  64 passed (64)` |
| IMP-05 | `pnpm -C autobyteus-server-ts typecheck` | `da207045a5` | — | server `src` and tests | — | Pass | `IMP-05-server-typecheck.log` | `production errors: 0; test-file errors: 1182 in 365 files (baseline 1182 in 365 files)`, `PASS` |
| IMP-06 | `pnpm -C autobyteus-server-ts test:integration:prepare`, then `test:integration` | `da207045a5` | integration isolation | MCP gateway routes, agent-tools and credential-proxy listeners, studio HTTP contract, context-file routes, all others | AC-005, AC-007 | Pass | `IMP-06-server-integration.log` | `Tests  517 passed | 69 skipped (586)`, `integration exit 0` |
| IMP-07 | server e2e (clean env): `request-origin-and-phone-routes`, `phone-access-running-routes`, `node-desktop-routes`, `remote-delegation-two-server` | `da207045a5` | `env -i PATH HOME=<tmp> TMPDIR`; real studio server on 127.0.0.1 | full gate on real HTTP and WebSocket | AC-001…AC-005, AC-012 (by IP) | Pass | `IMP-07-server-e2e.log` | run 1 `Tests  23 passed | 41 skipped (64)` (the 41 are the gated two-node file); run 2 (gate set) `Tests  41 passed (41)` |
| IMP-08 | `pnpm -C autobyteus-web typecheck` | `da207045a5` | — | Nuxt app, Electron main, cross-package tests | — | Pass | `IMP-08-web-typecheck.log` | `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`, `PASS` |
| IMP-09 | `pnpm -C autobyteus-web exec vitest run --config ./electron/vitest.config.ts` | `da207045a5` | Electron main-process tests (node env) | session policy listener, env composition, launch config, everything else in `electron/` | AC-006, AC-010 | Pass | `IMP-09-electron-tests.log` | `Tests  446 passed | 1 skipped (447)`; the skip is `managedExtensionService.realRelease.spec.ts` (its own gate) |
| IMP-10 | the real-Electron D6 spec alone (part of IMP-09, recorded with its result lines) | `da207045a5` | Electron 42.11.16 binary, display session | `BrowserSessionProfile` + `isFileDocumentRequest` transpiled from source, in Electron | AC-010 (mechanism), BEH-009/010 control | Pass | `IMP-10-electron-d6-real.log` | `✓ ... sends every request a file:// document makes, in every form, with Origin: null`; `Tests  4 passed (4)` |
| IMP-11 | `node --test scripts/development/run-dev.test.mjs` | `da207045a5` | — | dev-stack launcher | AC-006 | Pass | `IMP-11-dev-stack-test.log` | `# pass 4`, `# fail 0` |
| IMP-12 | negative controls (each new guard test fails without its change) | `da207045a5` working tree with the named file temporarily restored | as listed | architecture test, route tests, WebSocket plugin order, D6 policy | REQ-007, REQ-001, REQ-009 | Pass | `IMP-12-negative-controls.txt` | `expected 8 to be +0`; `Tests  9 failed | 6 passed (15)`; the D6 forms case `×` without the policy |
| IMP-13 | one representative browser probe on a probe-owned node | `da207045a5` | headless Chrome, Nuxt dev, own data roots | probe launcher origin (multi-node shape) | AC-006 | Pass | `IMP-13-browser-probe.txt` | `remote-nodes-page probe: Pass` (12 cases), refusal lines `0`, cleanup `serversLeft:0` |

- Not run, and why: AC-004 `/mobile` load through a Tailscale-shaped Host and the phone WebSockets in a browser; AC-008 (viewers, top-level PDF), AC-009 (HTML file opened top-level from F1 in the in-app browser), AC-010 on the embedded node, the AR-002 check, AC-011 (packaged app, Docker and remote nodes), AC-013: they need a browser probe, the isolated desktop instance or a test-owned Docker container, which TESTING.md and the design assign to API/E2E validation. The full browser-probe set (40 changed) was not run; one representative ran (IMP-13).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no screen or component changes. The visible effects are refusals and, for an HTML file opened top-level, the walled-off page (requirements § UI: `No`). The in-app browser's behavior is covered by IMP-10 and by API/E2E on the isolated desktop instance.

## Downstream Coverage Hints / Suggested Scenarios

- AC-010 on the isolated desktop instance: open a local HTML file in the in-app browser that POSTs `/graphql`, opens `/ws/terminal`, and does the same from an `about:blank` iframe, a `srcdoc` iframe and an `about:blank` popup; all refused by the embedded node, the page itself loads. Then, in that tab, navigate (address bar or agent `navigate`) to a node user-file URL: it displays (AR-002).
- AC-008/AC-009: each viewer type, an attachment and a media-page PDF opened top-level, and an HTML file from F1 opened top-level in the in-app browser (scripts run; its request to the node refused).
- AC-013: an agent-started server on `localhost:<p>` in the in-app browser works with its own server; its request to the embedded node is refused with `REMOTE_ACCESS_ORIGIN_REFUSED`.
- AC-004: `/mobile` through a Host-preserving proxy with `Host: x.y.ts.net`, and with a company URL in `AUTOBYTEUS_SERVER_HOST`.
- AC-011/AC-012: a test-owned Docker node at `localhost:<port>`; two nodes collaborating by `host.docker.internal` and a `.local` name; a peer by an unconfigured public name refused with the logged hint.
- Electron dev (AC-006): `pnpm -C autobyteus-web dev:electron` or equivalent; the renderer at `http://localhost:3000` reaches its embedded node.
- Release note (REQ-010, delivery's): "Nodes now check the name each request is addressed to. A node reached through a public domain name it cannot recognise (a reverse proxy with a company domain, a peer node or desktop entry added by a DNS name, a Docker node addressed by a dotted service name) needs that name in `AUTOBYTEUS_ALLOWED_HOSTS` (comma-separated; `.example.com` covers every name under it); until then requests get 403 `REMOTE_ACCESS_HOST_REFUSED` and the node log names the host. IP addresses, `localhost`, `.local`, `.lan`, dotless, `.internal` and `*.ts.net` names, the `AUTOBYTEUS_SERVER_HOST` host and paired phones need nothing. Pages served from another localhost port are no longer trusted: a developer tool that calls a node from a local page needs its exact origin in `AUTOBYTEUS_ALLOWED_ORIGINS`. Files served by a node now open walled off from it (`Content-Security-Policy: sandbox allow-scripts`, `nosniff`), and local `file://` pages in the in-app browser can no longer act as the desktop app."

## API / E2E / Executable Coverage Investigation And Execution Still Required

Independent API/E2E coverage and sign-off for AC-001…AC-014 remain with `api_e2e_engineer`, in particular the isolated-desktop-instance criteria (AC-008, AC-009, AC-010, AC-013, AR-002 check), AC-004, AC-011 and AC-012, and a decision on how many of the 40 changed browser probes to run.
