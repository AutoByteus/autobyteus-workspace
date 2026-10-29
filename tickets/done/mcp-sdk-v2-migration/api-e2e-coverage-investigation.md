# API/E2E Coverage Investigation — mcp-sdk-v2-migration

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (approved basis SR-002; SR-004 wording of AC-001/AC-008)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-004)
- Supplemental Task Artifacts: `probes/` and `probes/probe-output.txt` (evidence only); `follow-ups.md` (FU-001…FU-006)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass 9.5)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `N/A` until the first result (`API-REV-001`)
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 (reviewed route, `Medium` / `High`)
- Prior Investigation Reviewed: none for this ticket. The predecessor's parity method and harness (`tickets/done/mcp-sdk-1-32-upgrade/`, API-10…API-18) are reused as the method the design names.
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

Both packages move the MCP client from `@modelcontextprotocol/sdk` 1.32.1 to `@modelcontextprotocol/client` 2.3.1. Production change: 3 adapter files in `autobyteus-ts/src/tools/mcp/server/` (imports; `callTool(params, { timeout, signal })`), no client options (defaults `legacy` negotiation, `same-origin` redirects), and the dead Claude `createMcpServer` path removed. Tests and fixtures move to the v2 packages.

What must be proven (REQ-009 / AC-009 / AC-012): before (base `dc530fdcb0`, SDK 1.32.1) and after (this branch) give the same result on every check, apart from DEC-003 (error wording) and DEC-004 (all pages of a paginating server). Each side runs in its own worktree, build and packaged isolated app. Checks: the suites of "Verifying An MCP SDK Upgrade", the gated runtime × MCP matrix, real servers (Python fixture, published `server-filesystem` 2026.8.31 = v1 SDK and 2.0.0 = v2 SDK, test-owned copies of the user's `uv` servers, a token HTTP server, exit/hang-at-start), `/mcp/gateway` and the Agent Tools endpoint, packaged apps (R-002), timings (QR-001), orphan processes, `outputSchema` dialects (RR-001), per-server protocol-era statement (AC-012).

Expected values given by the reviewer: our endpoints negotiate `2025-03-26` with every SDK client on both sides (D-1, IMP-06, FU-005); our client sends `initialize` first and then `mcp-protocol-version: 2025-11-25`, with one stdio start; v2 error wording `Error POSTing to endpoint: …` and the redirect message with advice text before `(redirectPolicy: 'same-origin')`.

Escalation triggers (design): a real server that works on 1.32.1 fails on v2 (protocol era → REQ-013 to the Solution Designer; strictness → defect of this ticket); the lockfile or packaged app cannot resolve the v2 client; a runtime behaves differently; something else imports the SDK.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (preview/register stdio and HTTP), SCN-002 (agent on native, Claude, Codex, AGY, Grok calls an external MCP tool; tool error, timeout, cancellation), SCN-003 (redirects), SCN-004 (external MCP client → our endpoints), SCN-005 (build, package, run).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-002 cancellation in the product: the user stops a native AutoByteus run (`INTERRUPT_GENERATION` over the agent WebSocket) while an external MCP tool call is running. The run's execution-scope signal is passed to `McpTool` → `BaseManagedMcpServer.callTool` (`autobyteus-ts/src/agent/loop/tool-phase.ts` L175/L238, `tools/mcp/tool.ts` L58). This is the path whose options position changed (IMP-01). Planned as API-13.
  - Strictness on real tool calls (R-003): v2 validates `structuredContent` against a tool's `outputSchema` on every call. Calls on real servers that declare output schemas (VideoAudioServer, Python fixture, `server-filesystem` draft-07 and 2020-12) exercise it. Planned in API-11.
  - The user's actual server set, read once (read-only, values redacted) from `~/.autobyteus/server-data/mcps.json`: VideoAudioServer, tts, autobyteus-image-audio, ssh_remote, ssh_ali, media-downloader, all `uv` Python servers. Test-owned copies of VideoAudioServer (`autobyteus_mcps` `a947f1a^`, the last version with `server.py`), media-downloader (`autobyteus_private_mcps` `HEAD`) and ssh-mcp (`HEAD`, listing only, dummy host) are used. tts is excluded: its executable entrypoint installs runtimes at start (README L14), which would download. autobyteus-image-audio is excluded: the user's folder is untracked and has no `pyproject.toml`, so no faithful copy can be made.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 stdio connect/list/call, env, cwd, exit/hang, close | Preserved | IMP-02, IMP-03 | Before/after suites + real servers in packaged apps + orphan check |
| BEH-002 headers on every request; 401 | Preserved | IMP-02, IMP-10 | Before/after e2e + token HTTP server in packaged apps |
| BEH-003 redirect rule | Preserved (rule) / Changed (wording, DEC-003) | IMP-10 | Before/after e2e; error text recorded in packaged apps |
| BEH-004 HTTP error wording | Changed (DEC-003) | probe | 401 error text recorded before/after |
| BEH-005 paging | Changed (DEC-004) | IMP-02 | Paginating HTTP server in packaged apps: page 1 only before, all after |
| BEH-006 timeout, cancellation, tool error, structured content | Preserved | IMP-01, IMP-02 | Before/after suites; product-level cancellation (API-13); tool error and structured content via the gateway |
| BEH-007 2025 handshake, one start | Preserved | IMP-02 | Start counts and HTTP request headers recorded in the packaged apps |
| BEH-008 our endpoints serve v1/v2 SDK clients | Preserved | IMP-05, IMP-06 | Before/after endpoint suites; v1, v2 default and v2 `auto` clients against both packaged gateways |
| BEH-009 O-002 removed | Removed | IMP-07, IMP-08, IMP-09 | Reused |
| BEH-010 packaged app / image use MCP | Preserved | IMP-04 (`verify:runtime-deps`) | Packaged app contents (R-002) and runs; Docker image of each side |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `*ManagedMcpServer` → SDK client | Unit + core integration with real v2/Python servers | Published third-party servers; the user's servers | Live API (packaged apps) |
| API / transport / contract | Yes | MCP wire (stdio, streamable HTTP); our endpoints with v2 clients | Unit (handshake), endpoint integration | Real packaged server; v1 vs v2 clients on the same build | Live API |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | Only SDK error text shown in existing error areas | — | — | None (GraphQL message is the UI's source) |
| Authentication / session / permissions | Yes (preserved) | `requestInit.headers`, redirect rule | e2e | Packaged build | Live API |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | Yes | Packaged server `node_modules` (new v2 packages) | `verify:runtime-deps` only | Packaged app missing a dependency (R-002) | Project Desktop Validation |
| Process / lifecycle | Yes (preserved) | stdio spawn/close, exit/hang, cancellation | Unit/integration | Packaged app; orphans after stop | Lifecycle |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Real MCP servers (Python SDK 1.26/1.28/2.3, TS SDK v1 and v2) and runtimes' CLIs | Fixtures only | Real servers' responses under v2 validation (R-003) | Live API, gated runtime suites |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration` (branch `codex/mcp-sdk-v2-migration`). Before side: test-owned worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration-parity-before` (detached at `dc530fdcb0`).
- Project type and runtime stack: pnpm monorepo; Node 22.23.1, pnpm 10.28.2; Electron desktop app with embedded Fastify server; macOS 26 arm64.
- Project testing guideline path(s): `TESTING.md` (root). No closer `TESTING*.md` under `autobyteus-ts` or `autobyteus-server-ts`.
- Conflicting, missing, or unclear project instructions: none. The machine is heavily loaded by other agents (load average 40-48), so timings are compared only between paired before/after runs.
- Required environment variables or secrets available: `Yes` for the signed-in CLIs on the host (Claude, Grok, Codex, AGY) and LM Studio; no API keys are needed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing guideline | Layers and commands; `env -i PATH HOME=<resolved temp> TMPDIR` for e2e and core integration; gates; isolated instances with `pnpm --silent isolated-app start --from-worktree`; stop what you start; never the user's app or data; LM Studio one run at a time; Docker test containers on 127.0.0.1 without user volumes |
| `autobyteus-server-ts/AGENTS.md` | Server test commands | `test:integration:prepare` after SDK change; `vitest run <file> --no-watch` |
| `docs/isolated-app-instances.md` | Isolated packaged instances | `start --from-worktree`, `stop <id>`; embedded server gets a baseline env (only `CODEX_HOME` of the CLI homes passes) |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` "Verifying An MCP SDK Upgrade" | Suite list for an SDK change | core integration, unit, endpoint integration, two HTTP e2e files, runtime matrix gates |
| `autobyteus-server-ts/tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts` header | Matrix gates | `RUN_AGY_FAILURE_E2E` + `ANTIGRAVITY_CLI_COMMAND`, `RUN_LMSTUDIO_E2E`, `RUN_CLAUDE_E2E`, `RUN_CODEX_MCP_E2E`, `RUN_GROK_E2E`; `MCP_MATRIX_E2E_EVIDENCE_DIR` |
| `autobyteus-ts/tests/integration/tools/mcp/real-user-kind-mcp-server.test.ts` header | Opt-in real `uv` folder | `RUN_REAL_MCP_SERVER_E2E=1`, `AUTOBYTEUS_MCPS_DIR` (temp copy) |
| `autobyteus-web/package.json` | Packaged build | `build:electron:mac` (prepare-server, generate, build) |
| `autobyteus-server-ts/docker/Dockerfile.monorepo`, `build.sh` | Image build | build args as `build.sh` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Per-side build | each worktree | `pnpm install --frozen-lockfile`; server `prebuild`; `autobyteus-ts build`; server `build`; `nuxt prepare`; `build:electron:mac` | sequential per worktree; sides in parallel | exit codes in `/tmp/mcp182/logs/build-*.log` | build outputs stay untracked |
| Packaged isolated instance per side | each worktree | `pnpm --silent isolated-app start --from-worktree` | own ports and data root | `/rest/health`; `start` JSON | `isolated-app stop <id>` |
| Test-owned MCP servers | `/tmp/mcp182/servers/{before,after}` | `git archive` copies + `uv sync --frozen`; `npm install` of `server-filesystem` 2026.8.31 and 2.0.0 | per side copies | raw probe (API-14) | remove `/tmp/mcp182` after evidence |
| Harness HTTP servers (token, paging, 401, redirect, slow) | `/tmp/mcp182/harness` | started by the harness on 127.0.0.1 free ports | constant instrument for both sides | — | closed by the harness |
| Docker image per side | each worktree | `docker buildx build -f autobyteus-server-ts/docker/Dockerfile.monorepo` | test-owned tag, container on 127.0.0.1 | `/rest/health` | `docker rm -f -v`, `docker rmi` |
| LM Studio model | host | loaded just in time by the runs | one model run at a time | — | `lms unload` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Server configs | GraphQL `previewMcpServerTools`, `importMcpServerConfigs`, `discoverAndRegisterMcpServerTools` on each instance | dummy token `test-dummy`; dummy env; no user env values | instance data roots removed on stop |
| Project / agents / runs | GraphQL `createProject`, `createAgentDefinition`, `createAgentRun`; agent WebSocket | own data root | removed with the data root |
| CLI sign-ins | host login (Claude, Grok, AGY); throwaway `CODEX_HOME` with `auth.json` symlink | never printed; sessions added to user CLI histories (stated in report) | sessions left |
| Media sample | `video-audio-mcp/tests/sample.mp4` from the archive | read-only input | removed with `/tmp/mcp182` |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/tools/mcp/*` | managed servers vs real v2 servers; handshake, paging, signal, timeout | AC-002, AC-004, AC-005, AC-006 | Still Valid | IMP-02; reviewed CRR-001 | Run before/after (API-01) |
| `autobyteus-ts/tests/integration/tools/mcp/*` | Python + Node fixtures, stdio + HTTP | AC-002 | Still Valid | IMP-03 | Run before/after (API-02); opt-in real-user-kind (API-06) |
| `autobyteus-server-ts/tests/integration/{agent-tools/mcp,mcp-gateway}/*routes.integration.test.ts` | SDK clients (default, `auto`) vs our routes | AC-007 | Still Valid | IMP-05 | Run before/after (API-03) |
| `tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts`, `mcp-http-redirect-and-transport.e2e.test.ts`, `tests/e2e/runtime/mcp-run-session-cleanup.e2e.test.ts` | credentials, redirect rule (v2 wording), run-session cleanup | AC-003, BEH-001 | Still Valid | IMP-10 | Run before/after (API-04) |
| `tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts` | runtime × {project, stdio, HTTP} tools | AC-009 matrix | Still Valid (unchanged by this ticket) | 181 API-18 | Run before/after (API-05) |
| `tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | live Claude client cases | AC-008 | Still Valid for its remaining cases; live cases broken before this ticket (FU-004) | IMP-07 | Not run live (FU-004) |
| `tests/e2e/helpers/collaboration-root-harness.ts` users (gated collaboration e2e) | collaboration via v2 test client | — | Still Valid (import change only) | — | Covered by the same client pattern in API-05 (AGY fixture) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001, AC-008 | greps, `pnpm why` | Reused | IMP-07 | Ran on `ae7e907bf2`; head adds only ticket docs |
| API-R02 | REQ-001, REQ-008, regressions | build, typecheck, server unit + integration, full `autobyteus-ts` | Reused | IMP-04, IMP-08, IMP-09, IMP-11 | Same commit basis; parity of these whole suites is not the AC-009 subject |
| API-01 | AC-002, AC-004, AC-005, AC-006 | `autobyteus-ts` MCP unit suite | Existing Test | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp` on before and after | Before/after suite logs (AC-002) |
| API-02 | AC-002 | core MCP integration (Python + Node fixtures) | Existing Test | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp` on both | Same |
| API-03 | AC-007 | endpoint integration (Agent Tools, gateway) | Existing Test | `vitest run` of the two route files on both | v1 clients before, v2 default + `auto` after |
| API-04 | AC-003, BEH-001 | built-server MCP e2e | Existing Test | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… vitest run` of the three files on both | Same |
| API-05 | AC-009 (matrix), SCN-002 | runtime × MCP matrix | Existing Test (gated) | gates AGY scripted, Codex MCP client, native LM Studio, Claude, Grok on both | The design's matrix |
| API-06 | AC-009 (user kind) | opt-in real `uv` folder | Existing Test (gated) | `RUN_REAL_MCP_SERVER_E2E=1 AUTOBYTEUS_MCPS_DIR=<temp copy>` on both | Real user-kind folder |
| API-10 | AC-009, AC-012, REQ-002/003/005/006, QR-001 | packaged isolated app → GraphQL preview/import/discover of real servers | Temporary Probe (harness) | `node parity-harness.mjs <side> <backendUrl> …` per side | The before commit cannot carry tests; same harness on both |
| API-11 | AC-007, AC-009, R-003 | packaged `/mcp/gateway` → external tools; v1, v2 default, v2 `auto` clients | Temporary Probe | same harness | Same |
| API-12 | AC-009 (packaged agent call), SCN-002 | packaged app: native (LM Studio) and Claude agents call project, external stdio and HTTP tools | Temporary Probe | same harness | Agent path inside the packaged dependency tree |
| API-13 | AC-004, SCN-002 cancellation | packaged app: native run interrupted during a slow external HTTP tool | Temporary Probe | same harness | Product-level cancellation through the changed options position |
| API-14 | RR-001, AC-012 | raw JSON-RPC to each real server | Temporary Probe | `node raw-dialect-probe.mjs` | SDK-independent record of dialects and answered versions |
| API-15 | R-002, AC-001, QR-002 | packaged app contents | Temporary Probe | `find`/`node -e require.resolve` in each `AutoByteus.app/Contents/Resources/server` | Packaging risk |
| API-16 | BEH-001, QR-001 | stop instances; orphan check | Journey | `isolated-app stop`; `ps` | Lifecycle |
| API-17 | REQ-010 | user data and repos untouched; dummy values only | Temporary Probe | `git status`, `stat`, evidence scan | Safety |
| API-18 | BEH-010, R-002, DS-003 | Docker image per side → GraphQL + gateway probe | Temporary Probe | `docker buildx build` per worktree; container on 127.0.0.1; probe | Fresh Linux install from the lockfile |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None planned. The changed behaviors already have durable coverage added by the implementation (AC-004 signal, AC-005 paging, AC-006 handshake, AC-007 `auto`), reviewed in CRR-001. Real published-server compatibility is shown by the parity run, not by a durable test (DEC-005). This decision is revisited if a case finds a gap.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron, packaged mac-arm64 build per worktree.
- Testing guideline, README, or development instructions used: `TESTING.md`, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: none changed.
- Shell-specific or lifecycle behavior: the packaged server's `node_modules` (R-002) and its MCP behavior; stop and orphan cleanup.
- Chosen validation approach: `isolated-app start --from-worktree` per side, driven through the reported `backendUrl` (GraphQL, agent WebSocket, `/mcp/gateway`).
- Server/frontend setup when browser validation is used: N/A.
- How the run avoids disturbing an already-running desktop application: separate ports and data roots; the user's app and another agent's isolated instance (`iso-61386-5d91`) are left alone; only my instance ids are stopped.

## Live Environment And Fixture Plan

- Startup order: build both sides → start both instances → harness before, then after, for each section (paired) → stop.
- Environment choices: throwaway `CODEX_HOME`; host sign-ins for Claude; LM Studio `qwen/qwen3.6-35b-a3b`, one run at a time.
- Health / readiness checks: `/rest/health`.
- Seed data / fixtures: GraphQL only; dummy token `test-dummy`.
- Evidence: harness JSON per side, comparison table, process listings, packaged contents listings.
- Owned processes and temporary state: two instances, harness HTTP servers, `/tmp/mcp182`, the before worktree, Docker containers/images.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| tts and autobyteus-image-audio servers | tts installs runtimes at start (download); image-audio folder is untracked without `pyproject.toml` | Low: same Python SDK family as the three copies used | No | None |
| Codex live model turn | Codex's own MCP client path (no model turn) proves the MCP side; a live turn spends usage | Low | No | None |
| Live Claude client integration file | Broken before this ticket (FU-004) | None for MCP | No | FU-004 |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| Design text expects `2025-11-25` for AC-007; real routes give `2025-03-26` on both sides | Not a finding (stale design text, D-1, accepted in CRR-001) | IMP-06 | Solution Designer may correct the text |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` (revisited on findings)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: API-14 already ran during discovery (dialects: none, draft-07, 2020-12; no draft-04).
