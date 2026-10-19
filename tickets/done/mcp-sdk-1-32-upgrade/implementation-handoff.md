# Implementation Handoff — mcp-sdk-1-32-upgrade

> **Current round: IR-002 (SR-002/SR-003 validation-only parity round).** It is at the end of this file: "IR-002 — SR-002/SR-003 parity round". The sections above it are the IR-001 baseline, delivered as DR-001, and still describe the code, which IR-002 does not change.

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade/tickets/in-progress/mcp-sdk-1-32-upgrade/`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade`, branch `codex/mcp-sdk-1-32-upgrade`, base `origin/personal` @ `436b85ce93`
- Implementation commit: `4923d179c1`. The ticket artifacts and evidence are in the next commit on the branch; its hash is in the handoff message.

## Upstream Artifact Package

- Handoff-rule result: Medium / Low, direct route. My `get_handoff_rules` result: direct API/E2E.
- Requirements doc: `requirements-doc.md` (SR-001)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-001)
- Supplemental artifacts: none. The predecessor baseline is `origin/personal:tickets/done/mcp-http-auth-headers/` (autobyteus-179).
- Design review report / architecture review revision record: `N/A — not applicable`
- Triggering rework: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related ARCH-REV / CRR / API-REV / DR: `N/A`
- Triggering finding IDs: `N/A`

What now happens:

- **SDK version:** `@modelcontextprotocol/sdk` is `1.32.1` (exact pin) in `autobyteus-ts` and `autobyteus-server-ts`. `pnpm-lock.yaml` holds one copy, and the Claude Agent SDK (`0.3.280`) and `@google/genai` (`2.24.0`) peer entries resolve to it. The lock diff is the 13 SDK lines plus the integrity hash; nothing else moved.
- **Redirects:** `redirectPolicy` is not set, so the SDK default `'same-origin'` applies.
  - A cross-origin redirect is returned unfollowed, and connect fails. The SDK's message names the target without userinfo or query, plus `(redirectPolicy: 'same-origin')`.
  - A same-origin redirect is followed.
- **Loaders:**
  - `StdioManagedMcpServer` and `HttpManagedMcpServer` each do `const [{ Client }, { …Transport }] = await Promise.all([import(…), import(…)])`, then `new Client({ name, version })` and `await client.connect(transport)`.
  - There are no seams, hand-written SDK types, casts, fallbacks or `initialize()` branch.
  - The HTTP transport is still `new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: config.requestHeaders() } })`.
- **`BaseManagedMcpServer`:** its session type is now `Pick<Client, 'listTools' | 'callTool' | 'close'>`. `callTool` makes the one SDK call shape, and `listRemoteTools` returns `result.tools`. See "Deviation" below.
- **WebSocket MCP:** removed end to end. `McpTransportType` is `{ STDIO, STREAMABLE_HTTP }`. Parsing or importing `transport_type: "websocket"` throws `Invalid 'transport_type' string 'websocket' for server '<id>'. Valid types are: stdio, streamable_http.`

### Deviation from the design spec (classified as "This ticket", per ticket-scope.md)

The spec lists `BaseManagedMcpServer`'s `ClientSessionLike` under "Deliberately left alone", on the premise that "the SDK `Client` satisfies it". It does not.

- `ClientSessionLike.callTool` was `(...args: unknown[]) => Promise<unknown>`.
- With the loaders returning the real SDK `Client`, `tsc` fails with TS2416/TS2322: `Types of parameters 'params' and 'args' are incompatible`.
- The only cast-free fix inside REQ-004 is to type the session as the SDK's own client.

That makes two branches dead, and both are removed under Core Principle 7:

- `callTool.length >= 2`, a "legacy callTool signature" branch. SDK 1.30/1.32.1 `Client.callTool(params, resultSchema = …, options)` has `length` 1, so only mocks reached it.
- `Array.isArray(listTools())`, because the SDK returns `{ tools }`.

The optional-`close` guard goes too, since `close` is always present. There is no behavior change for real clients. The base test drops its legacy-signature case, and its fakes gain `close`. Everything stays inside `autobyteus-ts/src/tools/mcp/server/`, no other module is affected, and the classification is unchanged.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section: `design-spec.md` → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence:
  - All escalation triggers were checked and none fired:
    - one 1.32.1 lock copy, with the peers resolving to it;
    - nothing outside `autobyteus-ts/src/tools/mcp` used WebSocket MCP (repo-wide grep of source, tests, docs and scripts);
    - the scripted AGY runtime e2e is green on 1.32.1.
  - The deviation above is local to the same module.
  - Packaged Electron/Docker and the live Claude/Codex runtimes are not exercised here; they are left to API/E2E.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed: `Yes`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Stdio and HTTP unchanged on 1.32.1 (incl. 179 credentials, stdio env/cwd) | `stdio-managed-mcp-server.ts`, `http-managed-mcp-server.ts`, `base-managed-mcp-server.ts` | IMP-02: the 179 real-SDK HTTP cases plus the new stdio fixture test (env `test-dummy`, cwd = temp dir). IMP-05/06: server unit and integration. IMP-07/08: 179 e2e (preview, save, import, gateway calls, restart; AGY agent tool call) |
| BEH-002 | Cross-origin redirect refused; same-origin followed | SDK 1.32.1 default inside `StreamableHTTPClientTransport`; no `redirectPolicy` set | IMP-00: red on 1.30.0 (cross-origin connect succeeded via server B). IMP-02: green on 1.32.1 (error matches `/redirect/i`, server B got 0 requests; `/old → /mcp` connect, list and call OK) |
| BEH-003 | `websocket` rejected with the supported list | `types.ts` enum; `config-service.ts` `parseTransportType` | IMP-02 `config-service.test.ts`: exact message, nothing stored |
| BEH-004 | One typed path per loader | Both loaders; base session type | IMP-01 build (tsc); AC-005 grep empty (below) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The base-class contract change is recorded above as a deviation from the spec's "left alone" list, not from the requirements.

## Key Files Or Areas

- Source:
  - `autobyteus-ts/src/tools/mcp/server/{stdio,http,base}-managed-mcp-server.ts`;
  - `server/index.ts`;
  - `server/websocket-managed-mcp-server.ts` (deleted);
  - `types.ts`, `config-service.ts`, `server-instance-manager.ts`, `index.ts`.
- Manifests: `autobyteus-ts/package.json`, `autobyteus-server-ts/package.json`, `pnpm-lock.yaml`.
- Tests:
  - `autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs` (new);
  - `tests/unit/tools/mcp/{stdio-managed-mcp-server,http-managed-mcp-server,base-managed-mcp-server,types,config-service,server-instance-manager}.test.ts`;
  - the WebSocket unit and integration tests (deleted).

## Important Assumptions

- Lazy loading is kept as a typed `import()` (DEC). `import type { Client }` is erased at compile time, so importing the managed-server modules still does not load the SDK.
- The SDK `Client.close()` also closes its transport. Each loader still registers `transport.close()` as a cleanup, as before; a second close is a no-op in the SDK.

## Known Risks

- R-001 (intended): an endpoint that redirects to another origin now fails to connect. The error names the redirect target (without credentials) and the policy.
- R-002: the Claude Agent SDK and GenAI peers now use 1.32.1. There is no production use of the Claude SDK's in-process MCP server (O-002). The live Claude runtime suites are for API/E2E.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup plus a dependency upgrade
- Reviewed root-cause classification: Legacy Or Compatibility Pressure
- Reviewed refactor decision: `Refactor Needed Now` (loaders and WebSocket removal)
- Implementation matched the reviewed assessment: `Yes`. The same classification also covers the base-class branches removed above.
- If challenged, routed as `Design Impact`: `N/A`. The spec's premise about `ClientSessionLike` was factually wrong, but the fix stays inside the designed owner and the requirement (REQ-004), so it is recorded rather than rerouted.
- Evidence: the tsc errors quoted above; the SDK `index.d.ts` `callTool(params, resultSchema?, options?)` signature.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in touched files removed: `Yes`. Everything in the design's removal plan, plus:
  - the base `callTool.length >= 2` branch;
  - the array `listTools` branch;
  - the optional-`close` guard;
  - the now-unreachable `Unsupported McpTransportType` throw in `config-service.ts` (with two enum members, both handled);
  - the `catch` rethrow special case for WebSocket.
- AC-005 scan: `grep -rn "setSdkLoader\|initialize?\|\.default?\.\|as any\|WEBSOCKET\|Websocket" autobyteus-ts/src/tools/mcp` returns nothing (exit 1). `grep … "as unknown as\|sdkLoader"` in `src/tools/mcp/server/` also returns nothing. The two `constructorParams as unknown as …Data` casts in `config-service.ts` are the parser's dictionary-to-constructor input, not SDK values; they are outside AC-005's `server/` scope and untouched.
- Dead code found elsewhere, listed as follow-ups:
  1. O-002 (from the design): `ClaudeSdkClient.createMcpServer`.
  2. `autobyteus-ts/tests/fixtures/certificates/cert.pem` is referenced by nothing, including the deleted WebSocket test, which used the toy repo's certs (`grep -rn certificates autobyteus-ts` finds nothing).
  3. The external-toy integration tests (`autobyteus-ts/tests/integration/tools/mcp/{stdio-managed-mcp-server,http-managed-mcp-server,tool-registrar}.test.ts`):
     - they resolve `path.resolve(repoRoot, '..', 'autobyteus_mcps')`, where `repoRoot` is `autobyteus-ts`, so they look for `<repository root>/autobyteus_mcps`. That folder is missing in every current layout, not only in worktrees, so they fail with `spawn … ENOENT` (the spawn `cwd`) instead of skipping (IMP-03). (Corrected in IR-002: this line first said only a worktree's parent folder was wrong.)
     - In addition, two of the toys they need (`streamable_http_mcp_toy`, `wss_mcp_toy`) exist nowhere, and `pdf_mcp` was removed from `autobyteus_mcps` in `e259f54` (IR-002);
     - this extends the design's test-hygiene follow-up: replace them with the self-contained fixtures, or make them skip when the toy repo is absent.
- Shared structures remain tight: `Yes`. `McpTransportType` and the config union have exactly the two real transports.
- Canonical shared design guidance reapplied: `Yes`
- Size guardrails: `Yes`. Every changed source file shrank (`types.ts` is 187 lines, the loaders are 25 and 26). No change exceeds 220 lines except deletions.

## Persisted Data Transition Check

- Approved decision: `Not Affected`
- Implementation follows it: `Yes`. There is no reader or writer change for stdio or HTTP entries. A `mcps.json` WebSocket entry was never loadable in this product, and the existing per-entry tolerance in `getAll()` skips it.
- Deviation: `None`

## Environment Or Dependency Notes

- Fresh-worktree setup gaps on my first full run (IMP-04, IMP-05, IMP-09x) had setup causes, not code causes:
  - The server typecheck and unit runs needed the Prisma client (`.prisma/client/default` missing). Fixed with `pnpm -C autobyteus-server-ts prebuild`.
  - Web needed `nuxt prepare` (`.nuxt/tsconfig.json` missing).
  - Electron's binary was downloaded lazily at 10:53:22, during the first full web run, because pnpm 10 skipped its postinstall. Parallel workers raced on that first download, and one spec failed with `Electron failed to install correctly` (log kept as `IMP-09x-…`). That spec passes alone, and the full rerun is green.
- The logs in the table are the clean reruns.
- A power-off happened after the last web rerun had finished; no run was cut short, and all evidence was intact afterwards.

## Checks Run

Evidence is in `tickets/in-progress/mcp-sdk-1-32-upgrade/evidence/`. Each log has a header with the command, commit, environment and date. Environment: macOS 26, node v22, pnpm 10.28.2. Implementation commit `4923d179c1` for all rows except IMP-00.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp/http-managed-mcp-server.test.ts` with the new redirect tests on SDK 1.30.0 | `436b85ce93` + new tests | local | old loader on SDK 1.30.0 | AC-002 (red proof) | Fail (expected) | `IMP-00-redirect-red-on-sdk-1.30.0.log` | `× does not follow a redirect to another origin…`, `expected null to be an instance of Error`, `Tests  1 failed \| 5 passed (6)` |
| AC-001 | `grep -n "modelcontextprotocol/sdk@" pnpm-lock.yaml`; both manifests | `4923d179c1` | local | lockfile, manifests | AC-001 | Pass | (this row) | `'@modelcontextprotocol/sdk@1.32.1'`; the Claude Agent SDK and GenAI entries carry `(@modelcontextprotocol/sdk@1.32.1(zod@4.3.6))`; no `sdk@1.30` |
| AC-005 | the two greps above | `4923d179c1` | local | `src/tools/mcp` | AC-005 | Pass | (this row) | empty output |
| IMP-01 | `pnpm -C autobyteus-ts build` | `4923d179c1` | local | all of `autobyteus-ts` (tsc) | AC-005 | Pass | `IMP-01-core-build.log` | `[verify:runtime-deps] OK` |
| IMP-02 | `pnpm -C autobyteus-ts exec vitest run tests/unit` | `4923d179c1` | local | core, incl. stdio fixture, HTTP auth + redirect, parser, factory, base | AC-002, AC-003, AC-004 (core), AC-006, AC-007 | Pass | `IMP-02-core-unit.log` | `Tests  2047 passed (2047)` |
| IMP-03 | `env -i … pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp` | `4923d179c1` | clean env | external-toy integration tests (out of scope) | — | Not a pass (environment/layout) | `IMP-03-core-integration-mcp.log` | `spawn /opt/homebrew/bin/uv ENOENT` (spawn cwd missing); see follow-up 3 |
| IMP-04 | `pnpm -C autobyteus-server-ts typecheck` (after `prebuild`) | `4923d179c1` | local | server `src` against the new `autobyteus-ts` and SDK | AC-005 | Pass | `IMP-04-server-typecheck.log` | exit 0, no `error TS` |
| IMP-05 | `pnpm -C autobyteus-server-ts test:unit` | `4923d179c1` | isolated env | server units incl. the 179 file-provider test | AC-004, AC-008 | Pass | `IMP-05-server-unit.log` | `Tests  6079 passed \| 7 skipped (6086)` |
| IMP-06 | `test:integration:prepare` then `test:integration` | `4923d179c1` | isolated env | server integration | AC-008 | Pass | `IMP-06a-…prepare.log`, `IMP-06-server-integration.log` | `Tests  419 passed \| 70 skipped (489)` |
| IMP-07 | `pnpm -C autobyteus-server-ts build`, then `env -i … vitest run tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` | `4923d179c1` | clean env, built server | 179 e2e: preview, save, import, gateway calls, restart | AC-004 | Pass | `IMP-07a-server-build.log`, `IMP-07-e2e-mcp-http-auth-remote-server.log`, `e2e-observations/remote-server/` | `Tests  2 passed (2)` |
| IMP-08 | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` | `4923d179c1` | clean env, scripted AGY (no model) | 179 agent tool call through `autobyteus_agent_tools` | AC-004 | Pass (AGY only; native, Codex and Claude skipped by gate) | `IMP-08-…agy-scripted.log`, `e2e-observations/agent-tool-call/` | `✓ agy: the agent's tool calls reach both servers with their credentials`; `"auth": "expected"` on `tools/call` for `hdr` and `tok` |
| IMP-09 | `pnpm -C autobyteus-web test:nuxt --run` (after `nuxt prepare`) | `4923d179c1` | local | full web suite (unaffected package; shared-foundation rerun) | AC-008 | Pass | `IMP-09-web-nuxt.log` (`IMP-09x-…` is the race run) | `Tests  4547 passed \| 5 skipped (4552)` |
| AC-009 | grep of the branch diff and the evidence for credential-like strings | `4923d179c1` | local | diff + evidence | AC-009 | Pass | (this row) | only `test-dummy`; `Bearer Authorization` is prose |

- Not run, and why:
  - The live runtimes for AC-004/AC-008 (native with LM Studio, Codex, Claude; gates `RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`), and the rest of the server e2e (`pnpm test:e2e`): owned by API/E2E. The live ones also spend model credits or need local-model compute.
  - Packaged Electron harness and Docker image on 1.32.1 (design escalation trigger): owned by API/E2E.
  - `pnpm -C autobyteus-web test:electron`: Electron main is untouched, and the SDK is not a web dependency.
  - The external-toy integration tests against the real toys: not run in their required layout, because the HTTP toy has no `.venv` and running it would create one inside the user's separate `autobyteus_mcps` repo. The design leaves these tests out of scope (follow-up 3). TESTING.md Rule 9 asks for every failure to be fixed. The Scope Guardrail lists these tests as out of scope, so I recorded the cause and the follow-up instead.

## Frontend Rendered-Result Check

`Not Applicable`: no rendered frontend changed. The GraphQL, web and docs layers do not mention WebSocket MCP, and the form offers only STDIO and STREAMABLE_HTTP.

## Downstream Coverage Hints / Suggested Scenarios

- AC-004 on the live runtimes: `mcp-http-auth-agent-tool-call.e2e.test.ts` with `RUN_CODEX_E2E=1` and/or `RUN_CLAUDE_E2E=1` (real HOME/USER/LOGNAME), and `RUN_LMSTUDIO_E2E=1` for native.
  - Claude also exercises R-002: the Claude Agent SDK now shares SDK 1.32.1.
  - Reuse IMP-07/IMP-08 and the core/server rows while the code they exercise is unchanged.
- AC-002 through the product: a remote server registered via GraphQL whose URL 307s to another local port. Expect preview, save and discover to fail with the redirect message, the second server to see no request, and no credential to appear in server logs.
- AC-006 through the product: bulk import (`importMcpServerConfigs`) with a `websocket` entry is rejected and nothing is saved.
- Server e2e in full (`pnpm test:e2e`), since the dependency change is a shared foundation.
- Packaged Electron and Docker builds start, and stdio/HTTP MCP still connect (design escalation trigger).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-004 and AC-008 on the live runtimes and the full e2e suite.
- AC-002 and AC-006 at the API layer.
- Packaged-build check.
- AC-009 scan of the API/E2E evidence.

---

## IR-002 — SR-002/SR-003 parity round (validation only)

- Round: IR-002. Solution revisions SR-002 (regression parity) and SR-003 (runtime × MCP matrix). Triggered by the user: "we have to make sure that the mcp upgrade doesn't break. Upgrading a library should make things better instead of breaking things." and "the testing should at least make sure the different runtime for different MCP still works."
- Workspace:
  - after: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade-parity`, branch `codex/mcp-sdk-1-32-upgrade-parity`, `f59055f13f` (SDK 1.32.1);
  - before: the test-owned worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade-parity-before`, detached at `bf3c550c18` (SDK 1.30.0), `pnpm install --frozen-lockfile` done. I left it for API/E2E's checks 2–3; remove it with `git worktree remove` when done.
- Upstream: `handoff-sr-002.md` (incl. "SR-003 addition"), `requirements-doc.md` (SR-003), `design-spec.md` ("SR-002 Addendum", "SR-003"), `investigation-notes.md` ("SR-002 Investigation"), `solution-revision-record.md`.
- Code change: **none.** No product source or test file changed in this round.

### Classification

- `task_size=Small`, `architectural_risk=Low`: confirmed (validation only).
- No upgrade-caused difference was found in check 1, so there is no failure to route.
- Self-review: not applicable to code (no code delta). The evidence and records were reviewed.
- Route: direct API/E2E.

### Check 1 (AC-010): toy integration tests, before and after

Setup (test-owned; REQ-010):

- `pdf_mcp` is no longer in `autobyteus_mcps` (removed in its commit `e259f54 Remove PDF MCP project`; only an empty `.venv` and `egg-info` remain).
  - I restored it read-only from that repo's history, `git archive e259f54^ pdf_mcp`, into two test-owned copies under `$TMPDIR/mcp-parity-check1.*/{before,after}/autobyteus_mcps/`.
  - Each copy got a fresh environment from the toy's own `uv.lock` (`uv sync --frozen`: mcp 1.15.0, pymupdf 1.26.4 on both).
  - `--offline` failed because `pymupdf` was not in the local uv cache, so the pinned wheels came from PyPI. These are package installs, not tool calls.
- `streamable_http_mcp_toy` and `wss_mcp_toy` exist nowhere: not in `autobyteus_mcps` or its git history, not in `autobyteus_private_mcps`, and nowhere under `/Users/normy/autobyteus_org` (depth 3).
- Each worktree got `<worktree>/autobyteus_mcps` → its copy (the tests resolve `<repository root>/autobyteus_mcps`). The link is not git-ignored, so I removed both links and both copies after the run.
- The user's `autobyteus_mcps` repo was only read; its `git status` is unchanged.
- Run: `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp`, in each worktree.
- The shared test files are byte-identical between the commits (`git diff --stat bf3c550c18 f59055f13f -- autobyteus-ts/tests/integration/tools/mcp/` shows only the deleted WebSocket test).

| Case | Before (`bf3c550c18`, 1.30.0) | After (`f59055f13f`, 1.32.1) | Same? |
| --- | --- | --- | --- |
| `pdf_mcp` stdio: list tools + `image_to_pdf_page` (`stdio-managed-mcp-server.test.ts`) | Pass (1096 ms) | Pass (1017 ms) | Same |
| `pdf_mcp` via registrar: register, execute via registry, preview (`tool-registrar.test.ts`, 3 cases) | Pass (3/3) | Pass (3/3) | Same |
| HTTP toy `streamable_http_mcp_toy` (`http-managed-mcp-server.test.ts`) | Cannot run: toy missing (`spawn /opt/homebrew/bin/uv ENOENT`, cwd absent; `did not become ready`) | Cannot run: same error | Same (cannot run on either) |
| WebSocket toy `wss_mcp_toy` (`websocket-managed-mcp-server.test.ts`) | Cannot run: toy missing (`spawn … ENOENT`; hook timeout) | Test removed with the transport (IR-001) | Expected difference (designed removal) |
| Leftover `pdf_mcp`/`uv` processes after the run | None | None | Same |

Evidence:

- `evidence/IMP-SR2-01-toy-integration-before.log`. Look for `Tests  4 passed | 2 skipped (6)`, `✓ lists tools and executes image_to_pdf_page`, and the two `FAIL … (streamable_http_mcp_toy)` / `(wss_mcp_toy)` lines.
- `evidence/IMP-SR2-01-toy-integration-after.log`. Look for `Tests  4 passed | 1 skipped (5)` and the one `FAIL … (streamable_http_mcp_toy)` line.
- The file-level `exit=1` on both sides comes only from the toy-less files.

What this proves and doesn't:

- The real Python MCP SDK server (mcp 1.15.0) over stdio via `uv` behaves the same with our client on SDK 1.30.0 and 1.32.1.
- No HTTP toy exists, so the external-HTTP comparison is left to the test-owned HTTP server in check 2.

### Correction to IR-001

The IR-001 follow-up 3 said that the toy tests fail because a worktree's parent folder lacks `autobyteus_mcps`. That was wrong. `repoRoot` is `autobyteus-ts`, so they need `<repository root>/autobyteus_mcps`, which is missing in every layout. The text above is corrected; the conclusion (out of scope, follow-up `autobyteus-189`) stands. New facts for `autobyteus-189`:

- `pdf_mcp` was removed from the toy repo;
- the HTTP and WebSocket toys exist nowhere.

### Checks I did not run (for API/E2E)

- **Check 2 (AC-011, AC-012):** isolated apps of both commits.
  - `VideoAudioServer` and `media-downloader` from env-stripped, test-owned copies (read-only call, list only);
  - a test-owned HTTP MCP server;
  - exit-at-start and hang-at-start servers;
  - then stop the instance and look for orphan processes.
- **Check 3 (AC-013…AC-015):** own endpoints.
  - Agent Tools MCP `create_task`/`update_task`;
  - a `/mcp/gateway` call reaching an external MCP-origin tool.
- **SR-003 (REQ-011, AC-017):** the runtime × MCP matrix.
  - Runtimes: native, Claude, Codex, AGY (scripted CLI where no model is wanted), Grok if installed.
  - Tools: {project tools, external stdio tool, external HTTP tool}.
  - Before and after, cell by cell. An unavailable runtime is "not run" with its reason.
- **Check 4 (AC-016):** the plain-words report.

Notes for those:

- The `pdf_mcp` restore recipe above also works for any other toy the matrix needs.
- `media-downloader` lives in `autobyteus_private_mcps/yt-dlp-mcp`: copy it, and only list its tools.
- Leave the user's `~/.autobyteus` and running app alone.

### Checks Run (IR-002)

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-SR2-01 | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp`, test-owned `autobyteus_mcps` link | `bf3c550c18` and `f59055f13f` | macOS, node v22, uv 0.10.2; clean env | `StdioManagedMcpServer`, `McpToolRegistrar` against the real `pdf_mcp` (Python mcp 1.15.0) | AC-010, BEH-001, REQ-010 | Same before/after: 4/4 pdf_mcp pass on both; HTTP toy cannot run on either; WS toy cannot run on before, removed in after | `evidence/IMP-SR2-01-toy-integration-{before,after}.log` | `Tests  4 passed \| 2 skipped (6)` / `Tests  4 passed \| 1 skipped (5)` |
