# Implementation Handoff — integration-credential-proxy (autobyteus-311, step 1)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large/High, so independent architecture review applied; ARCH-REV-002 Pass (`design-review-report.md`). The rule for Large/High sends implementation to the code reviewer.
- Requirements doc: `requirements-doc.md` (approved at SR-002; DEC-011 decided by the user at SR-005).
- Investigation notes: `investigation-notes.md`.
- Solution revision record: `solution-revision-record.md` (SR-001…SR-005).
- Design spec (required on every route): `design-spec.md` (SR-005).
- Supplemental task artifacts: `follow-ups.md` (FU-001 from the designer; FU-002…FU-004 added here); `handoff.md` (designer's, stale per AR-007, the designer's artifact).
- Design review report: `design-review-report.md` (ARCH-REV-002 Pass).
- Architecture review revision record: `architecture-review-revision-record.md`.
- Triggering rework report, revision record, or evidence: N/A (initial round).

## Current Implementation Summary

The GitHub credential proxy as designed:

- **Vault:** consumer kind `{kind:"integration", integrationId:"github"}` → `integration.github.token`, not in `isKnownSecretId`.
- **`src/credential-proxy/`:** the GitHub definition (`api` Bearer, `git` Basic `x-access-token`), the connections store, the connection service (token checked with GitHub's `/user` before it is stored), in-memory run passes, `IntegrationRunAccess`, the forwarder, one route on a loopback-only Fastify listener, the activity log, the host.
- **Runtime delivery (DS-002):** native (`initialCustomData.terminalChildEnvironment`), Claude (run-session spawn only), Codex (thread config on start and resume, plus `sandbox_workspace_write.network_access` for `workspace-write`, DEC-011), AGY (`process.start` env), ACP/Grok (launcher env).
- **Release (DS-004):** the pass is revoked in `AgentRunResourceManager.release` and in the failed-activation hook of `AgentRunManager`.
- **Studio wiring:** the proxy host is created after the Agent Tools host, listens before the HTTP server, and closes after the Agent Tools host. The standalone application host and application execution scopes pass an explicit `integrationRunAccess: null`.
- **GraphQL:** `githubIntegration`, `connectGitHubIntegration`, `testGitHubIntegration`, `disconnectGitHubIntegration`, `setGitHubIntegrationAgentAccess`; coded errors; the token is in no output.
- **Web:** `GitHubIntegrationCard` on Server Settings → Basics, its store, documents, codegen, en/zh-CN text.
- **Docs:** `credential_proxy.md` (with the integration-author contract, REQ-012), `secret_management.md`, `GLOSSARY.md` (Integrations), `docs/design-cases.md` (Case 5), `TESTING.md`.

- Commits: code `84602c9a38`…`2529eaaec1`; ticket artifacts and evidence `9f0aefd4c5` (this file updated in the next commit only to name it). Branch `codex/integration-credential-proxy`, base origin/personal `8760c83788`.
- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change is what the design scoped: a new loopback security boundary that adds credentials, a per-run identity across five runtimes, new persisted files, and a new contract for integration authors.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. None of the design's escalation triggers occurred: every runtime receives the variables; the token reaches no shell, file, log or response (IMP-08 scans); the proxy is loopback-only (IMP-03 `NOT_LOOPBACK`).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| DS-001 / BEH-001 Connect | Token checked, then stored; Test, Remove, agent ticks | `api/graphql/types/github-integration.ts` → `credential-proxy/integration-connection-service.ts` → `SecretManagementService` + `integration-connection-store.ts`; web `GitHubIntegrationCard.vue`, `stores/githubIntegrationStore.ts` | Done. 401 → `TOKEN_REJECTED`, nothing stored; disconnect keeps ticks (IMP-03, IMP-07, IMP-08, IMP-12) |
| DS-002 / BEH-002 Run gets its address | Allowed runs get the variables in every runtime; others nothing | `integration-run-access.ts`; `backends/autobyteus/autobyteus-integration-shell-environment.ts`; `claude-session-query-options.ts` + `claude-sdk-client.ts` (run-session spawn only, not L177/L205 spawns); `codex-integration-thread-config.ts` + `codex-thread-bootstrapper.ts` + `codex-agent-run-backend.ts` (reopen); `agy-agent-run-backend-factory.ts`; `acp-session-launcher.ts` | Done (IMP-04). Premises proven, see Important Assumptions |
| DS-003 / BEH-003 Proxied call | Gate → pass → route → allowed → path → token → forward → record | `credential-proxy-routes.ts`, `credential-proxy-local-server.ts`, `integration-activity-log.ts` | Done (IMP-03, IMP-08) |
| DS-004 Run end | Pass revoked at release and on failed activation | `agent-run-resource-manager.ts` `release`; `agent-run-manager.ts` `releaseLocalSessions` hook (`agent-run-activation-operation.ts`) | Done (IMP-04: "ends the credential-proxy pass a backend got during an activation that fails before attachment (AR-002)", "ends an attached run's credential-proxy pass when the run is released") |
| DS-005 Forward one call | Path rules, origin check, `redirect: "manual"` with same-origin rewrite, caller credentials dropped, auth per route, redaction, git 401 → 403 | `credential-proxy-forwarder.ts` | Done (IMP-03, incl. real git clone/push, IMP-08 live). Redaction covers response headers including a rewritten `Location` (`2529eaaec1`) and API text/JSON bodies |
| BEH-004 Refusals | Clear coded refusals, nothing sent upstream | `credential-proxy-routes.ts` `messageFor` | Done (IMP-03) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server, new: `src/credential-proxy/*` (10 files), `src/api/graphql/types/github-integration.ts`, `src/agent-execution/backends/codex/backend/codex-integration-thread-config.ts`, `src/agent-execution/backends/autobyteus/autobyteus-integration-shell-environment.ts`.
- Server, changed: `secret-management/domain/secret-id.ts`, `secret-management/catalog/provider-credential-catalog.ts`; the five backends (native factory, Claude session manager/state/session/query options, `claude-sdk-client.ts`, Codex bootstrapper and backend, AGY factory, ACP factory and launcher, Grok factory); `providers/agent-provider-factory-builder.ts`; `runtime/general-process-run-supervisor.ts`; `services/agent-run-resource-manager.ts`, `agent-run-manager.ts`, `agent-run-activation-operation.ts`; `compositions/build-studio-server.ts`; `server-runtime.ts`; `application-execution-scope-kernel-builder.ts`; `start-standalone-application-host.ts`; `api/graphql/schema.ts`.
- Web: `components/settings/GitHubIntegrationCard.vue`, `ServerSettingsBasicsPanel.vue`, `stores/githubIntegrationStore.ts`, `graphql/queries/githubIntegrationQueries.ts`, `graphql/mutations/githubIntegrationMutations.ts`, `generated/graphql.ts` (GitHub additions only), `localization/messages/{en,zh-CN}/settings.ts`, `tests/e2e/github-integration-card-probe.mjs`, `package.json` (probe script).
- Tests, new: `tests/unit/credential-proxy/credential-proxy-core.test.ts`; `tests/integration/credential-proxy/{credential-proxy-host,integration-connection-service,credential-proxy-git-smart-http}.integration.test.ts`; `tests/e2e/credential-proxy/{github-integration-graphql,github-credential-proxy-live}.e2e.test.ts`; native and Claude delivery tests; cases added to the Codex, AGY, ACP, Claude SDK client, agent-run-manager and fixture tests.

## Important Assumptions

How each architecture-review point was applied:

- **Two release points (DS-004):** `AgentRunResourceManager.release` calls `revokeForRun` (errors joined like its other releases); the failed-activation hook in `agent-run-manager.ts` now ends the MCP session and the pass. The hook was renamed `deactivateMcp` → `releaseLocalSessions` in `agent-run-activation-operation.ts`, because it now releases both.
- **Upstream request (DS-005):** `\`, `%5c`, `%2f`, `.`/`..` (also `%2e%2e`), empty segments and bad encoding are refused; `upstream.origin === route.origin` is checked after building the URL; `redirect: "manual"`; a same-origin `Location` is rewritten through the same route and pass; `401` → `403` on the git route only.
- **No `registerHttpAccessLogPolicy`** on the proxy listener; Fastify's own logger is also off (`logger: false`), because its error logging includes the URL. IMP-03 asserts no console line holds the pass or token.
- **Codex:** `sandbox_workspace_write.network_access: true` only for `workspace-write` runs with integration variables, in the same thread `config` sent on `thread/start` and `thread/resume`.
- **Claude:** variables merged only into the run session's spawn (`claude-sdk-client.ts`, the `spawnClaudeCodeProcess` of the streaming session), not the model-listing and control-query spawns (test "adds the run's integration variables to the run session's CLI spawn only").
- **AR-008:** stated in `credential_proxy.md` (Not supported).
- **AR-007** (stale `handoff.md`, `requirements-doc.md` L6): the Solution Designer's artifacts; left unchanged.

Premises the design asked to prove first:

1. A function in `initialCustomData` reaches the native runtime: nothing in `src` calls `AgentConfig.copy()` (which would deep-clone); `autobyteus-integration-shell-environment.test.ts` builds a real core agent with `AgentFactory` and runs `runBash` in its context: the child sees the variable; `process.env` doesn't.
2. A team member's run carries its own `agentDefinitionId`: the member run config is built with `execution.agentDefinitionId` (`configured-agent-execution-handle.ts` L435-447).
3. AGY: `launch()` serves create and restore; before this change it passed no `env` (the process inherited the server's). Now `env` is passed only when the run has variables.
4. **R-4 (measured, IMP-05):** on Codex 0.166.0, thread-level `config` tables **merge** with the user's own `config.toml` tables: the user's `shell_environment_policy.set` entry and `inherit = "core"` still apply, as do `sandbox_workspace_write.writable_roots`. No change needed. Nested and dotted forms behave the same. Measured with a real `codex app-server`, a private `CODEX_HOME` and a loopback fake model provider (no login, no inference).

Additions beyond the design (all local, no contract change):

- `502 UPSTREAM_UNREACHABLE` (GitHub unreachable) and `500 PROXY_FAILED` (unexpected) besides the design's 403 codes.
- `buffersRequestBody` per route: GitHub's API needs a real `content-length` on POST bodies; git bodies stay streamed (QR-002).
- Codex tool-list reopen (`codex-agent-run-backend.ts` `reopenWithCurrentTools`) rebuilt the thread config from `mcp_servers` only and would have dropped the integration part; it now starts from the run's current `appServerConfig` (test in `codex-tool-list-reopen.test.ts`).
- `TOKEN_REQUIRED` GraphQL error for an empty token.
- Claude and ACP compute the variables per process start, so a reopen reuses the run's live pass (one pass per run while active).
- The insteadOf value is the definition's git origin + `/` (`https://github.com/` in production).
- `gh api` needs some token of its own before it sends anything; documented as `GH_TOKEN=unused gh api "$AUTOBYTEUS_GITHUB_API_URL/…"` (the proxy drops it). Measured live (IMP-08).

## Known Risks

- R-1 same-user limit (documented in `credential_proxy.md` § Security Limits, with the AR-005 meaning of AC-006).
- A Codex run in the `read-only` sandbox gets the variables but can't reach the proxy (AR-008, documented).
- R-3: `activity.jsonl` grows without bound (≈200 bytes per call), as designed for phase 1.
- The live check depends on the GitHub test token, which expires 2026-11-25.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature` (security).
- Reviewed root-cause classification: `No Design Issue Found` for the existing owners.
- Reviewed refactor decision: `No Refactor Needed`.
- Implementation matched the reviewed assessment: `Yes`. Backends only apply the variables they are given; policy stays in `IntegrationRunAccess` and the proxy.
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes: the one structural move is the native helper in its own module, to keep the native factory under 500 lines (IMP-13).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (none found)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (IMP-13: largest 496 effective lines, native factory, base 492; largest delta +207, the new card)
- Notes: `integrationRunAccess` is a required disposition in the provider factory builder and the supervisor (an explicit `null` where a host has no proxy), so a new composition can't forget it silently.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (new stores only).
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: absent or malformed `connections.json` reads as not connected and is not rewritten until a save (`credential-proxy-core.test.ts` "reads a missing or malformed connections file as not connected, and keeps it until a save").
- Migration implementation and focused checks: N/A.
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- First server typecheck in this worktree needed `pnpm install`, `pnpm -C autobyteus-ts build` and `pnpm -C autobyteus-server-ts exec prisma generate`; the web needed `nuxt prepare`.
- Built-server tests and codegen need `pnpm -C autobyteus-server-ts build` (IMP-06).
- No new dependencies.
- Tests used dummy tokens; the live check reads `test.github.token` from the read-only test vault. The user's `~/.autobyteus`, the running app, port 4822 and `autobyteus-integrations-1` were not touched.

## Checks Run

All files are in `evidence/`, each with a header (command, commit, environment, date). Clean env: `env -i PATH HOME=<temp> TMPDIR`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `2529eaaec1` | macOS 26, arm64, Node 22 | all server `src` | — | Pass | `IMP-01-server-typecheck.log` | `# Exit code: 0` |
| IMP-02 | `pnpm exec vitest run tests/unit` (server) | `32f14bfd4d` | same | whole server unit suite | all | Pass | `IMP-02-server-unit-full.log` (excerpt: `IMP-02-server-unit-full.excerpt.log`) | `Test Files  799 passed | 4 skipped (803)`, `Tests  6690 passed | 7 skipped (6697)` |
| IMP-03 | `vitest run tests/unit/credential-proxy tests/integration/credential-proxy` | `2529eaaec1` | same; git 2.50.1 | `src/credential-proxy/*` | DS-001, DS-003, DS-005, AC-001, AC-003…AC-006 | Pass | `IMP-03-credential-proxy-unit-integration.log` | `Tests  41 passed (41)`; cases "clones and pushes through the proxy, with GitHub's Basic format on every upstream call", "refuses a revoked pass", "logs no line with the pass" |
| IMP-04 | `vitest run` on the 11 delivery/release files (list in the log header) | `32f14bfd4d` | same | five backends, release points, builder, startup order | DS-002, DS-004, AC-002, AC-006 | Pass | `IMP-04-runtime-delivery-and-release.log` | `Tests  180 passed (180)` |
| IMP-05 | `node evidence/probe/r4-codex-thread-config-merge.mjs` | `32f14bfd4d` | codex-cli 0.166.0, private CODEX_HOME, fake loopback provider | Codex thread config merge (R-4), DEC-011 sandbox network | R-4, DEC-011 | Pass (merge) | `IMP-05-codex-thread-config-merge-R4.log`, `probe/r4-codex-thread-config-merge.mjs` | E2: `USER_OWN_VAR=from-user-config THREAD_VAR=from-thread-config SERVER_ONLY_VAR=<unset>`; S2: `WRITABLE_ROOT=kept LOOPBACK=reachable`; S1: `LOOPBACK=blocked` |
| IMP-06 | `pnpm -C autobyteus-server-ts build` | `2529eaaec1` | same | build output for built-server tests | — | Pass | `IMP-06-server-build.log` | `Sanitized built-module/bootstrap smoke passed` |
| IMP-07 | `vitest run tests/e2e/credential-proxy/github-integration-graphql.e2e.test.ts` (built server, own vault) | `2529eaaec1` | same | GraphQL resolver, service, store on a real server | DS-001, AC-001 | Pass | `IMP-07-graphql-built-server.log` | `Tests  3 passed (3)` |
| IMP-08 | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault AUTOBYTEUS_LIVE_STRICT=1 RUN_GITHUB_PROXY_E2E=1 vitest run tests/e2e/credential-proxy/github-credential-proxy-live.e2e.test.ts` | `2529eaaec1` | same; network to GitHub | connect on a built server; proxy against real GitHub: curl issue #1 and `/user`, `gh api`, `git ls-remote`, `git clone`; token scans | AC-001, AC-003, AC-004, AC-007 | Pass | `IMP-08-github-live.log` | `Tests  2 passed (2)`; the token-scan assertions are inside the two cases (booleans only) |
| IMP-09 | `pnpm exec vitest run tests/integration` (server) | `32f14bfd4d` | same | whole server integration suite | all | Pass for this ticket; 7 pre-existing failing files (FU-004) | `IMP-09-server-integration-full.log` (excerpt: `IMP-09-server-integration-full.excerpt.log`) | `Test Files  7 failed | 75 passed | 20 skipped (102)`; the 7 are the 6 `application-backend` files (ENOENT `applications/brief-studio/dist/importable-package`) and `org-owned-team-local-agent.test.ts` (`Cannot destructure property 'topology' of 'input.plan'`, same failure on base 8760c83788) |
| IMP-10 | web: `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, `node scripts/typecheck.mjs` | `32f14bfd4d` | same | web card, store, locales | — | Pass (typecheck: 2 pre-existing production errors, FU-003) | `IMP-10-web-guards-typecheck.log` | `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.`, `test-file errors: 298 in 139 files (baseline 298 in 139 files)`, the 2 errors only in `recorded-upload-labels.ts` |
| IMP-11 | web: `NUXT_TEST=true vitest run` (full Nuxt suite); then the one timed-out file alone | `2529eaaec1` | same | all web specs incl. `GitHubIntegrationCard.spec.ts` | AC-001 | Pass (one unrelated timing failure, passes alone) | `IMP-11-web-full.log` (excerpt: `IMP-11-web-full.excerpt.log`), `IMP-11b-web-nfs-timing-rerun.log` | `Tests  1 failed | 4864 passed | 2 skipped (4867)`: the failure is `nfsLauncherCommands.spec.ts > … macos: success` `Test timed out in 5000ms` (5652 ms); rerun alone `Tests  24 passed (24)`. No `autobyteus-web/utils` change on this branch; the earlier full run at `9fc98a8038` passed `Test Files  669 passed (669)` |
| IMP-12 | `node autobyteus-web/tests/e2e/github-integration-card-probe.mjs --skip-server-build --output-dir=<evidence>/IMP-12-github-card-ui` | `2529eaaec1` | headless Chrome, disposable node + Nuxt dev | the card rendered against a real node | AC-001, SCN-001 | Pass | `IMP-12-github-card-ui/` (`result.json`, `GHC-00*.png`), `IMP-12-github-card-probe.log` | `Result Pass`; screenshots GHC-001…GHC-005 |
| IMP-13 | effective-line count of changed source files vs base | `2529eaaec1` | — | size guardrails | — | Pass | `IMP-13-size-guardrails.log` | `496 492 +5 …autobyteus-agent-run-backend-factory.ts` |
| IMP-14 | throwaway vitest file (deleted after) reads `test.github.token` from the test vault and scans every file under the ticket folder (paths only) | `2529eaaec1` | same | evidence and ticket files | AC-007, REQ-009 | Pass | `IMP-14-evidence-token-scan.log` | `scanned files: 35; files with the token: 0` |

- Commits: IMP-02, IMP-04, IMP-05, IMP-09 and IMP-10 ran at `32f14bfd4d`. The only later code change, `2529eaaec1` (the rewritten `Location` header is redacted too, with its test), is covered by IMP-03, IMP-07, IMP-08 and IMP-11 at `2529eaaec1`; the new assertion fails without the fix (checked by reverting it locally).
- Not run, and why:
  - Per-runtime **live** runs (a real Claude/Codex/AGY/Grok agent executing curl through the proxy) are left to API/E2E: delivery is covered per runtime with real process/env seams (IMP-04), the proxy against real GitHub with the run access's variables (IMP-08), and Codex's sandbox network with a real app-server (IMP-05).
  - A large-repository clone for QR-002 (streaming): git bodies stream by construction (`buffersRequestBody: false`, `duplex: "half"`); not measured with a multi-MB repository.
  - Pre-existing failures outside the ticket (not caused here): FU-002 (test-file syntax error blocks `tsc` on tests), FU-003 (web typecheck fixture), FU-004 (org planner test drift; brief-studio integration tests need a built package).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings → Server Settings → Basics, the new GitHub card (connect, test, remove, agent ticks).
- Approved UI/UX, interaction, requirement, or design references: requirements § UI (DEC-001 card in Settings, DEC-002 ticked agents, DEC-006 token hint); no Product Design round (requirements: follows `ProviderAPIKeyManager`/`ClaudeRuntimeCard`).
- Existing design system, shared components, and adjacent product surfaces reviewed: `ClaudeRuntimeCard`, `WebSearchConfigurationCard`, `MemorySyncCard` (card shell, typography, password field, buttons, status pills).
- Testing guideline or development / preview instructions and rendered surface used: the repo's probe pattern (`embedding-settings-probe.mjs`): disposable built node, Nuxt dev bound to it, headless Chrome.
- States, layouts, viewports, and interactions inspected: not connected (1440 px); agent tick persisted on the node and after reload; dummy token rejected by real GitHub (plain error, nothing stored, masked field); connected state (status response intercepted: login pill, Replace token, Test, Remove, connected date); zh-CN at 820 px.
- Visual or interaction issues found and corrected: the error message first rendered under the agent list, far from the token field; moved directly under the token controls.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-11, IMP-12. The connected state in IMP-12 uses an intercepted status (a real connect needs a real token; covered by IMP-08 on the API).

## Downstream Coverage Hints / Suggested Scenarios

- A real agent run per runtime (at least Codex with auto-execute off, i.e. `workspace-write`, and one of Claude/native) whose shell runs `curl "$AUTOBYTEUS_GITHUB_API_URL/repos/ryan-zheng-teki/autobyteus-mcp-test/issues/1"` and `git ls-remote https://github.com/ryan-zheng-teki/autobyteus-mcp-test.git`; then `env`/`ps` in that shell holds no token (AC-002, AC-007).
- A team member whose agent is ticked gets the variables; one whose agent isn't, doesn't.
- Untick an agent during a run: the next call is refused `INTEGRATION_NOT_ALLOWED`.
- Stop a run: a call with its old address is refused `RUN_PASS_INVALID`.
- Remote access on: the proxy port is not reachable from another host (QR-001).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-002 per-runtime live runs (above); AC-007 scan of a real run's logs, traces and data root.
- QR-001 from a non-loopback address on a real network interface.
- QR-002 with a repository larger than a few MB.
