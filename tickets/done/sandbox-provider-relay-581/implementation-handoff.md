# Implementation Handoff: autobyteus-581

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High); ARCH-REV-003 **Pass**. Next: the source-review rule from `get_handoff_rules`.
- Requirements doc: `tickets/in-progress/sandbox-provider-relay-581/requirements-doc.md` (Approved, REQ-001 to REQ-018, DEC-101 to DEC-114)
- Investigation notes: `…/investigation-notes.md` (P-1 to P-14)
- Solution revision record: `…/solution-revision-record.md` (SR-001 to SR-007)
- Design spec: `…/design-spec.md` (SR-007)
- Supplemental task artifacts: `…/history-484/*`, `…/probes/*`, `…/follow-ups.md`
- Design review report: `…/design-review-report.md` (round 3, Pass; non-blocking N-3, N-4 applied)
- Architecture review revision record: `…/architecture-review-revision-record.md` (ARCH-REV-003)
- Triggering rework report: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `…/implementation-revision-record.md`
- Current implementation revision ID: `IR-004` (IR-001 baseline; IR-002: CR-001, CR-002 / DEC-115; IR-003: CR-003; IR-004: F-1, F-2 via CRR-004)
- Related solution revision IDs: SR-007, SR-008 (DEC-115), SR-009 (DEC-116, DEC-117)
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-001, CRR-002 (Fail, Local Fix), CRR-003 (Pass), CRR-004 (failure origin: Local Fix)
- Related API/E2E / delivery revision IDs: API-REV-001 (Fail: F-1, F-2)
- Triggering finding IDs: CR-001, CR-002, CR-003, F-1, F-2
- Branches: `codex/sandbox-provider-relay` in this worktree (base `origin/personal` @ `9f803aa84d`); the public skill on `codex/autobyteus-sandboxes` in `AutoByteus/autobyteus-skills` (worktree `/Users/normy/autobyteus_org/autobyteus-skills-worktrees/autobyteus-sandboxes-581`, base `origin/main` @ `1213803`, commit `f85b30a`; committed locally, not pushed: its pull request goes with delivery).

What exists now:

**IR-002 delta:** the sandbox caller is the creating run only (CR-001). DEC-115 was implemented and its live check failed (IMP-12), so by its fallback **Codex has no login-token mode through a relay**: `codex_app_server` is no longer a login-token runtime (a C1 value naming it stops startup), and the OpenAI login-token route, the Codex login reader, the Codex account ID setting and the ChatGPT-mode launch are removed. Codex always runs on the relay node's API key (IMP-08). Login tokens remain for Claude (C9) and Grok (C10).

1. **Relayed nodes (C1–C5, C9, C10).** `ProviderRelayAccess` is the only relay owner: `isRelayed`, `routeFor(runtimeKind)`, `routeForNativeProvider(provider)`, `statusOf`, `prepareForRun(run, relayId, runtimeKind)`, `prepareForNode(relayId, runtimeKind)`. C1 is parsed once at start (`provider-relay-settings.ts`; malformed stops startup). C3 is the relay table with per-kind routes (`provider-relays.ts`). The local route forwards to the provider with the node's own key (unrelayed) or to the relay node (relayed) through `ProviderRelayPeerForwarder` → `PeerRelayClient` (signed, streamed, no total timeout). The relay node's `ProviderRelayPeerHandler` behind `/rest/remote/provider-relays/<relay>/<kind>/*` checks, attaches exactly the declared kind's credential, marks every reply, and writes one C5 line. Grok's login is read per call and never renewed (Codex has no login-token mode, DEC-115); the Claude login token is the vault ID `provider.anthropic.login-token`, imported with `pnpm secrets:import` (`CLAUDE_CODE_OAUTH_TOKEN`).
2. **Launch shapes.** Native (autobyteus-ts endpoint option, FU-003), Claude (relay env by kind, no own credentials), Codex (per-cwd app-server: custom provider with the node pass, or ChatGPT mode with a placeholder login in its own `CODEX_HOME`), Grok (`GROK_XAI_API_BASE_URL` + pass by kind), DeepSeek Harness (as before, base URL now `…/relay/deepseek/anthropic`). Relayed status from C1 in the one sign-in owner (`AgentRuntimeSignInReader`); Antigravity signed out on a relayed node; Claude API-key mode signed in from the vault (FU-001); native providers "configured" on a relayed node when the relay lists them (R-E).
3. **Sandboxes (C6–C8, C11).** `SandboxManager` (create, `runIn`, destroy, expiry, start sweep), `SandboxDocker`, `SandboxPairing`, `SandboxRecordsStore`, folder rules, platform check; the three tools on every runtime (native tools and Agent Tools MCP); the peer `role: "sandbox"` saved by the pairing exchange from the invite; the Nodes page label (N-4); Electron passes `AUTOBYTEUS_RELEASE_VERSION`.
4. **Docs** (credential proxy, node access model NAS-42 to NAS-44, secret management, DeepSeek Harness and Grok runtimes, new `sandboxes.md`, GLOSSARY, TESTING sandbox rule) and **the public skill** `autobyteus-sandboxes/SKILL.md`.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: a cross-node credential route, login tokens, container lifecycle and five runtime launch paths, as designed; nothing in implementation lowered or raised it.
- Selected route: `Code Review` (from `get_handoff_rules`)
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (U-1 and U-2 results under Known Risks)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Relayed node: every supported runtime through the relay; empty setting unchanged | `credential-proxy/provider-relays/{provider-relay-settings,provider-relay-access,provider-relay-proxy-routes,provider-relay-peer-forwarder}.ts`; launches: `available-llm-construction.ts`, `claude-session-query-options.ts` + `claude-sdk-client.ts` + `claude-sdk-spawn-environment.ts`, `codex-app-server-launch-config.ts`, `acp-session-launcher.ts` + Grok/DSH profiles | Implemented; unrelayed paths unchanged (existing DeepSeek relay suites green) |
| BEH-002 | Relay node attaches API key, or login token only with its switch on; no swap | `credential-proxy/provider-relay-peer/{provider-relay-peer-handler,relay-login-token-reader,provider-relay-activity-log}.ts`, `api/rest/remote.ts` | Implemented; two-node test covers each refusal |
| BEH-003 | Relayed status from C1; Claude api-key mode from vault (FU-001) | `agent-runtime-sign-in-reader.ts`, `claude-agent-runtime-strategy.ts`, `deepseek-harness-agent-runtime-strategy.ts`, `llm-provider-service.ts` | Implemented |
| BEH-004 | Native provider calls via the relay | `autobyteus-ts/src/llm/llm-endpoint.ts` + provider classes + `llm-factory.ts`; `available-llm-construction.ts` | Implemented (Anthropic, OpenAI, DeepSeek, Grok, GLM, Kimi, Qwen, MiniMax, Mistral, Gemini AI Studio) |
| BEH-005 | `create_sandbox` | `sandboxes/*`, `agent-tools/sandboxes/*`, `agent-tools/mcp/providers/sandbox-tools-mcp-adapter-provider.ts`, `compositions/sandbox-composition.ts` | Implemented |
| BEH-006 | `run_in_sandbox`, destroy, expiry, start sweep | `sandboxes/sandbox-manager.ts` | Implemented |
| BEH-007 | Automatic pairing as a normal peer with the lifecycle mark | `peer-pairing-service.ts` (invite role), `peer-store.ts`, `peer-directory.ts`, `remote-collaboration-settings.ts` (GraphQL `role`), web `NodeRow.vue` | Implemented |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- autobyteus-ts: `src/llm/llm-endpoint.ts` (new), `src/llm/llm-factory.ts`, `src/llm/models.ts`, `src/llm/api/{openai,anthropic,deepseek,grok,kimi,glm,qwen,minimax,mistral,gemini}-llm.ts`, `src/utils/gemini-helper.ts`.
- Server relay: `src/credential-proxy/provider-relays/*` (settings, relays, access, refusals, local route, peer forwarder, process slot helper), `src/credential-proxy/provider-relay-peer/*` (handler, activity log, login reader, relay offer), `credential-proxy-forwarder.ts` (credential headers, drop list), `run-pass-registry.ts` (run and node holders), `credential-proxy-host.ts`, `delivery-definitions.ts` (integration routes keep `auth`), `remote-collaboration/channel/peer-relay-client.ts`, `api/rest/remote.ts`, `api/rest/index.ts`.
- Secret management: `domain/secret-id.ts` (`providerRelay` consumer), `catalog/provider-credential-catalog.ts`, `provisioning/local-import-credential-alias-registry.ts`.
- Runtimes: see BEH-001/003 rows; `runtime-management/acp/{acp-agent-launch-profile,acp-discovery-handshake}.ts`, `runtime-management/grok/grok-build-capability.ts`.
- Peers: `remote-collaboration/settings/{peer-store,peer-directory,peer-pairing-service}.ts`, `domain/peer-node.ts`, `remote-collaboration-services.ts`, `compositions/remote-collaboration-composition.ts`.
- Sandboxes: `src/sandboxes/*` (new), `src/agent-tools/sandboxes/*` (new), `startup/agent-tool-loader.ts`, `agent-work-journal/rendering/platform/sandbox-tool-converters.ts`.
- Composition: `compositions/build-studio-server.ts`, `compositions/sandbox-composition.ts`, `compositions/agent-runtime-status-composition.ts`.
- Web/Electron: `electron/server/{embeddedServerLaunchConfig,baseServerManager}.ts`, `electron/application/electronApplication.ts`, `components/settings/nodes/NodeRow.vue`, `stores/remoteCollaborationStore.ts`, `graphql/queries/remoteCollaborationQueries.ts`, `generated/graphql.ts`, localization.

## Important Assumptions

- ASM-001 (the desktop's node offers `host.docker.internal:<port>` as a pairing candidate) and ASM-002 (`autobyteus/autobyteus-server:<release>` exists): ASM-002 confirmed from the release workflow (`VERSION_TAG=${IMAGE_NAME}:${RELEASE_TAG#v}`); ASM-001 by the live smoke below.

## Known Risks

- **U-1 (Codex login token): NOT SUPPORTED — decided as DEC-116 (SR-009), reported to the user; FU-581-07 records an HTTPS route.** IR-002 ran DEC-115's live check (IMP-12): with the relay node's real account ID in the placeholder login and both `chatgpt_base_url` and `openai_base_url` on the relay, Codex 0.171 passes its account check (no "selected workspace missing") and lists its models through the relay (`GET /backend-api/codex/models` 200, 28 relayed calls all 200), but refuses the model call itself: `workspace backend must use an HTTPS origin without credentials`. The relay is plain HTTP on loopback; making it HTTPS would need a certificate the sandbox trusts, which is outside this design. On the WebSocket part of the SR-008 walk: Codex 0.171 lists `responses_websockets` and `responses_websockets_v2` as **removed** (off by default), so no such flag exists to pass; the IR-001 retries came from its model calls going **directly** to `https://chatgpt.com` (it ignores `chatgpt_base_url` for them, IMP-11), which `openai_base_url` moved onto the relay. History of the IR-001 attempt follows. With a placeholder ChatGPT login in its own `CODEX_HOME` and `chatgpt_base_url` on the relay, Codex 0.171 makes its account, settings, plugin and analytics calls through the relay (26 relayed calls, all 200: `GET /backend-api/wham/accounts/check` ×16, `GET /backend-api/ps/plugins/*`, `GET /backend-api/wham/settings/user`, `POST /backend-api/codex/analytics-events/events`), but its model call never arrives: it tries its Responses WebSocket transport (10 × "Reconnecting… n/5"; the credential proxy does not relay WebSocket upgrades) and then fails the turn with `selected workspace missing from routing discovery` — it checks its own (placeholder) account against the account list the relay returns from the real login. Codex does **not** reject the node pass as a non-JWT access token (R-D: answered). Possible directions, all design changes: give the sandbox the relay node's real ChatGPT account ID at start (an identifier, not a credential), turn off Codex's `responses_websockets` features for the relayed app-server, or mark Codex's login token "not supported" (the relay offer would then never list `codex_app_server`). Until decided the code stays as designed: built, off by default, and the API-key mode works (IMP-08).
- **U-2 (Grok login token) not proven (unchanged):** the Grok login on this Mac had expired about 2.5 h before the check, so the host correctly did not offer it (DEC-102: never renewed) and Grok ran on the API key in that sandbox (IMP-09). It needs a run while the user's Grok login is fresh (after the user uses Grok), or the user's decision.
- **R-E answered:** a sandbox with no keys lists the native providers the relay node offers as usable and runs them (IMP-08: `ANTHROPIC, DEEPSEEK, GEMINI, GLM, GROK, KIMI, OPENAI`; a native Anthropic turn completed).
- The Claude login-token live check (DEC-108) needs the user to add a `claude setup-token` token to the test vault (`CLAUDE_CODE_OAUTH_TOKEN=…` in the setup source); `pnpm test-vault status` shows `provider.anthropic.login-token` as missing until then.
- C3 allowed paths for login-token routes (Claude Code OAuth side calls, Codex ChatGPT side calls) are a list; a CLI version that calls a new path is refused `PATH_NOT_ALLOWED` and shows that code.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement
- Reviewed root-cause classification: Duplicated Policy Or Coordination; Shared Structure Looseness
- Reviewed refactor decision: `Refactor Needed Now` (pass holder, static relay ids, per-runtime credential decisions)
- Implementation matched the reviewed assessment: `Yes` (one owner `ProviderRelayAccess`; holders `run | node` with `providerRelays: Map<relayId, kind>`; `ProviderRelay.routes.{apiKey,loginToken}`; profiles `relay: {relayId, runtimeKind, use}`)
- Routed as `Design Impact`: `N/A`

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Removed: `RunPassHolder.providerRelayId`, `grantProviderRelay(run, id)` (now with kind), `AcpAgentLaunchProfile.providerRelayId`, `ProviderRelay.route/consumer/compactionHeader/streamReader` (now `routes`/`observation`), `createDeepSeekProviderRelay`, the forwarder's `token` + `DeliveryRoute.auth` for relays (integration routes keep `auth` as `IntegrationDeliveryRoute`), the `agentRuntime/deepseek_harness` consumer (now `providerRelay/deepseek/apiKey`), fixed-only base URLs in autobyteus-ts.
- Dead code in touched files removed: `Yes`
- Dead code found elsewhere added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Deviations decided during implementation (each with its reason):
  1. **C3 `localPassHeader` not kept as a field.** The local route reads the pass from whichever of the three credential headers the runtime used (`x-api-key`, `Authorization: Bearer`, `x-goog-api-key`). The `deepseek` API-key route serves dsh (`x-api-key`) and native DeepSeek (Bearer); one header per route would need a second route for one provider. The pass only identifies the run, so the header it came in carries no meaning; the forwarder drops all three either way.
  2. **DeepSeek route base path is empty; dsh's base URL is `<relay>/deepseek/anthropic`.** So native DeepSeek's `/chat/completions` goes through the same relay; the upstream path dsh reaches is unchanged (`/anthropic/v1/messages`).
  3. **Reply-marking rules live in `ProviderRelayPeerForwarder`**, and `PeerRelayClient` is transport only (signed send, streamed reply, refusal reasons before sending). The design gave `PeerRelayClient` the marking rules; keeping them beside the relay refusal codes keeps `remote-collaboration` free of credential-proxy codes.
  4. **No explicit undici `Agent`:** Node's `fetch` defaults are exactly C4's timeouts (connect 10 s, headers 300 s, body 300 s), and the client gives no abort signal, so there is no total timeout.
  5. **Sandbox env also sets `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace`**, so runs that peers start in the sandbox (delegations) work in the mapped workspace folder (C8's "the run's workspace"); C8 listed the mount but not the variable.
  6. **Agent package folders get the same protected-folder rule as shared folders** (`SANDBOX_PACKAGE_INVALID`): they are copied into the sandbox, so a credential folder given as a package would put a credential inside it (REQ-011).
  7. **Gemini through the relay is AI Studio only** (`GEMINI_ENDPOINT_NEEDS_AI_STUDIO` otherwise); on a relayed node native Gemini runs on AI Studio. C3 lists only the AI Studio key.
  8. **`ClaudeSessionManager` takes `providerRelayAccess` as an optional (null) last parameter**, like its existing `integrationRunAccess`. A relayed node without it still refuses loudly in the client.
  9. **The sandbox tools reach the manager through a process binding** (`bindProcessSandboxManager` / `getProcessSandboxManager`): the tools are registered statically in the tool registry and the Agent Tools MCP before remote collaboration is composed. Principle 16's conditions hold: the studio binds it before the server serves, a call with none throws "Sandboxes are not available on this server", and it hides no cycle.
  11. **The run-memory folder is bound at the sandbox node's own memory folder, `/home/autobyteus/data/memory` (F-2, IR-004),** not at `/home/autobyteus/run-memory` with `AUTOBYTEUS_MEMORY_DIR` as design C8 says: the server always keeps memory at `<data-dir>/memory` (`AppConfig.getMemoryDir`), and the image's starter always passes `--data-dir`, so the variable had no reader. The host-facing contract (`runMemoryFolder`, `agents/<runId>/…`) is unchanged. The folder also holds the sandbox node's run indexes and episodic and semantic memory; credential stores are elsewhere in its data folder. Design C8 needs this wording at delivery.
  10. **Only the creating run uses or removes a sandbox (CR-001; now DEC-117, SR-009, so no longer a deviation).** REQ-012 also names "the owner", but no product surface gives the owner a sandbox action (no UI, DEC-107); the owner's sandboxes go at expiry and at the node's start. The unused owner caller was removed.
- Changed source files stayed within size guardrails: `Yes` (`autobyteus-agent-run-backend-factory.ts` 499 → 497; `claude-session.ts` 497 → 498; `server-settings-service.ts` 465 → 483; `build-studio-server.ts` 468 → 471; no file over 500)

## Persisted Data Transition Check

- Approved decision: new data `Not Affected`; `peers.json` `role` `Directly Usable — No Migration`
- Implementation follows it: `Yes` — `PeerStore` reads an absent `role` as `null` and writes the key only when set (test: a row written before roles exists reads as a normal peer; an ordinary invite writes no `role` key).

## Environment Or Dependency Notes

- My shell inherits `ELECTRON_RUN_AS_NODE=1` from the live AutoByteus app: real-Electron specs time out unless run with `env -u ELECTRON_RUN_AS_NODE` (IMP-07).
- Live checks use the test vault (`~/.autobyteus-test/vault`); the Codex and Grok login-token checks read the user's own `~/.codex/auth.json` and `~/.grok/auth.json` through links in a throwaway host HOME, never renewed (DEC-108).

## Checks Run

Evidence in `tickets/in-progress/sandbox-provider-relay-581/evidence/`. Code commit for the checks: `1bc0f90811` (IMP-01..07 ran on the same code with the native factory change before its line-count refactor, which IMP-04b reran); the live probe is `probes/sandbox-live-smoke.mjs`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `ce0e69d8d7` | macOS arm64, Node 22.23.1 | server src + tests | all | Pass | `IMP-01-server-typecheck.log` | `[typecheck] PASS` (production errors 0; tests 972 = baseline) |
| IMP-02 | `pnpm -C autobyteus-web typecheck` | `ce0e69d8d7` | same | web app, Electron main, cross-package tests | AC-015 | Pass | `IMP-02-web-typecheck.log` | `[typecheck] PASS` (86 = baseline) |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` (full) | before `ce0e69d8d7` | same | whole server unit/architecture suite | all | 16 failures, all test updates for the new contract (fixed, IMP-04) | `IMP-03-server-unit-suite-excerpt.log` | `Tests  16 failed \| 9082 passed` |
| IMP-04 | the 13 failed files + every new test + `tests/integration/credential-proxy` | `ce0e69d8d7` | same | relay (two-node, real gate/signing/handler), sandboxes, launch shapes, status, peer role, login reader, tool loader, work-journal converters, codegen currency, NAS coverage | BEH-001..007, AC-003..007, AC-012..014, NAS-42..44 | Pass | `IMP-04-focused-and-new-tests.log` | `Tests  246 passed` after the sandbox test fix (see IMP-04b) |
| IMP-04b | `vitest run tests/unit/agent-execution/backends/autobyteus tests/unit/sandboxes tests/agent-work-journal/rendering` | `1bc0f90811` | same | native factory refactor, folder rule fix | BEH-004, DEC-113 | Pass | (console) | `Tests  330 passed` |
| IMP-05 | web node specs (NodeRow, node list/status stores, connector) | `ce0e69d8d7` | same | Nodes page label | AC-015 | Pass | `IMP-05-web-node-specs.log` | `Tests  113 passed` |
| IMP-06 | `pnpm -C autobyteus-web test:electron` + reruns | `ce0e69d8d7` | same | release version in server env | REQ-009 (image) | Pass after mock fix; 2 real-Electron specs need `env -u ELECTRON_RUN_AS_NODE` (inherited from the live app); the port-owner deadline case missed its 1 s while those specs ran beside it and passes alone | `IMP-06-electron-tests.log` | `Tests  126 passed`, `Tests  11 passed` |
| IMP-07 | `pnpm -C autobyteus-ts exec vitest run tests/unit/llm` | `ce0e69d8d7` | same | endpoint option in every provider client | BEH-004, FU-003 | Pass | `IMP-07-autobyteus-ts-llm-unit.log` | `Tests  584 passed` |
| IMP-08 | live: built host (test vault), sandbox from `autobyteus-server:581-local` (beta image + this worktree's server package), real tools through a scripted agent, one real turn per runtime in the sandbox | `ce0e69d8d7` | Docker Desktop, test vault | the whole path | AC-001 (native, Claude, Codex, Grok), AC-008, AC-011 (destroy part), DEC-113 / P-14 shared folder read-only (REQ-015 link following not proven here), C5, R-E, ASM-001 | Pass | `IMP-08-live-sandbox-api-keys.log` | `ready 9s`; four `SANDBOX-OK: true`; `{"anthropic/apiKey/200":3,"openai/apiKey/200":1,"xai/apiKey/200":7}`; `containers left: none; sandbox peers left: 0` |
| IMP-09 | same with `--login-tokens` | `ce0e69d8d7` | same + the user's Codex/Grok logins via links (never renewed) | relay offer, C2, login readers | AC-005 (Codex, Grok) | Mixed: offer `LOGIN=codex_app_server` (Grok login expired, not offered) | `IMP-09-live-sandbox-login-tokens.log` | `sandbox C1: … LOGIN=codex_app_server` |
| IMP-10 | Codex login token alone, paths listed | `ce0e69d8d7` | same | Codex ChatGPT mode via relay | AC-005 Codex, U-1, R-D | **Fail** (see Known Risks U-1) | `IMP-10-live-codex-login-token.log` | `selected workspace missing from routing discovery`; no `codex/responses` line |

| IMP-11 | Codex 0.171 request targets in ChatGPT mode against the fake relay (placeholders only; `probes/codex-chatgpt-base-url-probe.sh`) | image of `ce0e69d8d7` | Docker | Codex launch shape | U-1 | Finding: model calls ignore `chatgpt_base_url` and go to `https://chatgpt.com`; `openai_base_url` moves them to the relay; `responses_websockets*` features "removed" | `IMP-11-codex-base-url-probe.log` | `6 https://chatgpt.com/backend-api/codex/models`; with `openai_base_url`: `3 GET /relay/openai/backend-api/codex/models` |
| IMP-12 | DEC-115 live check: Codex login token with the account ID and both base URLs | `70eb033f7c` | Docker Desktop, the user's Codex login via a link | relay offer, C1, Codex launch | AC-005 Codex, DEC-115 | **Fail → not supported** (removed in `b2e7e0d3bd`) | `IMP-12-live-codex-login-token-dec115.log` | `workspace backend must use an HTTPS origin without credentials` |
| IMP-13 | after the removal: `vitest run tests/unit/credential-proxy tests/integration/credential-proxy tests/unit/sandboxes`, then `tests/unit/runtime-management tests/unit/secret-management tests/unit/agent-execution/backends/codex tests/architecture/tracked-imports.test.ts`; `pnpm -C autobyteus-server-ts typecheck` | `b2e7e0d3bd` | macOS arm64, Node 22.23.1 | relay, offer, settings, login reader, Codex launch, sandboxes | CR-001, DEC-115 | Pass | (console) | `Tests  123 passed`; `Tests  847 passed`; `[typecheck] PASS` |

| IMP-14 | `pnpm -C autobyteus-server-ts typecheck`; `vitest run tests/unit/credential-proxy tests/integration/credential-proxy tests/unit/sandboxes tests/unit/runtime-management/grok tests/unit/agent-execution/backends/deepseek-harness` | `d624f09ce6` | macOS arm64, Node 22.23.1 | forwarder, relay routes, handler, settings guard | CR-003 | Pass | (console) | `[typecheck] PASS`; `Tests  154 passed` |
| IMP-15 | `pnpm -C autobyteus-server-ts typecheck`; `vitest run tests/unit/sandboxes tests/unit/agent-tools tests/architecture` (new `sandbox-pairing.test.ts`: dropped connection then answer → one exchange; never answering → `SANDBOX_START_FAILED`, no exchange) | `7296a698d6` | macOS arm64, Node 22.23.1 | `SandboxPairing.connect`, sandbox mounts and environment | F-1, F-2 | Pass | `evidence/IMP-15-sandbox-unit.log` | `[typecheck] PASS`; `Tests  487 passed` |
| IMP-16 | live probe `probes/sandbox-connect-and-memory-probe.ts` ×5 (real `SandboxDocker` spec shape and `SandboxPairing.connect`; image `autobyteus-server:581-api-e2e`; one native run each, no model call) | `7296a698d6` | macOS arm64, Docker Desktop 29.0.1, Node 22.23.1 | connect race; where a sandbox run's memory lands | F-1 (AC-008, QR-001), F-2 (AC-011, REQ-009) | Pass | `evidence/IMP-16-sandbox-connect-and-memory-live.log` | connect ok 5/5 (API-E01: 3/4 failed); `run_metadata.json` on the host under `agents/<runId>` 5/5; no container left |

Note on IMP-08/09: `SANDBOX-OK: true` there is read from the run's frames; IMP-10 showed the prompt itself echoes the string, so IMP-08's answers were confirmed by `TURN_COMPLETED` with a relayed `200` per runtime in C5, not by the string alone.

- Not run, and why: the whole `test:integration` and server E2E suites (TESTING.md asks them for a new tool unit; left to API/E2E); the Claude login-token check (no token in the test vault); AC-009 internet reachability, AC-010 leak scan, AC-013 restart, AC-016 skill-following agent, QR-001/002/004 measurements (API/E2E).

## Frontend Rendered-Result Check

- Affected surface: the Nodes page row label "sandbox" (AC-015) only.
- Checked with the component spec (IMP-05): the label renders for a `sandbox` peer and not for a normal one; it uses the row's existing chip style (amber ring), localized en/zh-CN. A rendered check in a real app needs a host with a sandbox peer: left to API/E2E with the live sandbox journey (AC-015). IMP-08 showed the host's peer list returns `role: sandbox` (`host peers: sbx_…:paired:sandbox`).

## Downstream Coverage Hints / Suggested Scenarios

- AC-001 to AC-016 live as the requirements doc says; `probes/sandbox-live-smoke.mjs` drives most of the sandbox journey and can seed the formal suite.
- AC-010 leak scan: host-side scan of the sandbox's folders, image layers and `/proc/*/environ` against the test vault values (484 `leak-scan.mjs`).
- The tool-exposure rule in TESTING.md applies (a new tool unit is registered at start): the whole `test:integration` and server E2E suites, and a search of gated suites for exact tool lists.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Full live matrix (AC-001 per runtime, AC-005 per runtime with login tokens, AC-008 timing QR-001, AC-009, AC-010, AC-011, AC-013 restart, AC-015 rendered, AC-016 with an agent following the skill), QR-002 latency, QR-004 32 MiB body.
