# Investigation Notes

## Investigation Meta

- Package identifier: `test-vault-docker-sandbox-484`
- Request / ticket: autobyteus-484 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-docker-sandbox`
- Repository mode: `Git`
- Task worktree / branch: the above, `codex/test-vault-docker-sandbox`
- Resolved base remote / branch / revision: `origin/personal` @ `a9f2b9f29655c41124fa0df0843de435657a9d5e` (fetched 2026-11-12)
- Finalization target remote / branch: `origin/personal` (only if a build follow-up is approved; this analysis commits nothing)
- Bootstrap result: worktree created from fresh `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`, `references/handoff.md` (2026-11-12); repo `AGENTS.md`, `TESTING.md` "Test vault", `autobyteus-server-ts/docs/modules/secret_management.md`, `autobyteus-server-ts/docs/design/node_access_model.md`
- Investigation status: Complete for the analysis (questions 1 to 4); no architecture phase (nothing to build until DEC-001)

## Initial Request And Clarifications

- Original request: the user's idea (2026-11-12, voice, PM's reading): "How can we provision the test vault into the Docker? … mount the test vault inside the Docker itself, then everything is prepared." The Task asks four questions: (1) mount or copy, and what each runtime needs; (2) safe handling and the transcript scan; (3) the smallest working setup with node credential exchange and a GraphQL smoke run, its cost and its failure points; (4) a recommendation and where to document it.
- Constraints: never read, print or move a key through chat or logs; no changes to the user's running nodes; keep it simple; report the analysis first; build only if the user says so; nothing committed.
- Initial ambiguity: whether a small proof run counts as "build". Read as allowed ("the team may build a small proof if cheap"). The proof is disposable probes in the ticket folder; the setup script itself is not built.

## Source Log

| Date | Type | Exact Source / Command | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-11-12 | Doc | `TESTING.md` §Test vault (l.296–339) | Vault contract | Vault = `test-vault.db` + `.secret.key`; read-only; server ignores it only on the real `~/.autobyteus/server-data`; missing or unusable vault stops startup |
| 2026-11-12 | Doc | `autobyteus-server-ts/docs/modules/secret_management.md` | Vault and runtime credential ownership | Only the Claude Agent SDK (`api-key` mode) and DeepSeek Harness runtimes resolve vault credentials; Codex stays outside vault governance; Docker keeps its topology |
| 2026-11-12 | Code | `autobyteus-ts/src/secrets/vault/secret-root-key-file.ts:26-38`, `verify-established-vault.ts:33-49` | Ownership checks | Key file must be owned by `process.getuid()` with mode `& 0o077 == 0`; DB owned by the uid with no group/other write |
| 2026-11-12 | Code | `autobyteus-ts/src/secrets/vault/secret-vault-sqlite-schema.ts:40` | Read-only mount feasibility | `new DatabaseSync(path, {readOnly: true})` + `PRAGMA query_only=ON` |
| 2026-11-12 | Code | `autobyteus-server-ts/docker/{docker-compose.yml,entrypoint.sh,supervisor-autobyteus-server.conf}` | Container layout | Data `/home/autobyteus/data`; server runs as `root`, `HOME=/root`, through `bash -lc 'exec node /opt/autobyteus/starter/starter.mjs'` |
| 2026-11-12 | Runtime | `docker ps`, `docker image inspect autobyteus/autobyteus-server:beta`, `docker inspect autobyteus-server-0` (sources redacted) | User's nodes, read-only | 3 nodes on `beta`; volumes data, workspace, root-home, chromium-profile, server-packages plus 2 bind mounts; `SYS_ADMIN`, `seccomp=unconfined` |
| 2026-11-12 | Runtime | `docker run --rm --network none --entrypoint bash <image> -c '… --version'` | Image contents | Server package 0.1.1 includes test-vault support (`test-vault-setting.js`); Claude Code 2.1.319, codex-cli 0.167.0, agy 1.5.3, grok 1.0.77 |
| 2026-11-12 | Code | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-spawn-environment.ts` | Claude auth | `api-key` mode sets `ANTHROPIC_API_KEY` in the child environment only; `cli` (default) removes API-key variables and uses the account login |
| 2026-11-12 | Code | `…/agent-runtimes/strategies/{claude,codex,grok,antigravity,deepseek-harness}-agent-runtime-strategy.ts` | Sign-in readers | Claude: `claude auth status --json`; Codex: app-server `account`; Grok: `grok models`; agy: model discovery; DeepSeek Harness: vault status |
| 2026-11-12 | Code | `…/codex/client/codex-app-server-launch-config.ts`; `grok/grok-build-launch-profile.ts:91` | Codex and Grok launch environment | Codex app-server launched as `codex app-server`, with no key handling; Grok launched with `{...process.env}`, with no vault route |
| 2026-11-12 | Code | `launch-preferences/launch-usability-check.ts:193`, `model-routing/services/model-router.ts:54` | Effect of SIGNED_OUT | Saved/inherited launches and the Model Router refuse a signed-out runtime |
| 2026-11-12 | Runtime | `codex login --help`, `grok login --help`, `agy --help` in the image (offline) | Login options | Codex `--with-api-key` (stdin); Grok `--oauth` / `--device-auth` only; agy has no login command |
| 2026-11-12 | Web | [x.ai headless scripting](https://docs.x.ai/build/cli/headless-scripting), [E2B Grok](https://e2b.dev/docs/agents/grok), [x.ai overview](https://docs.x.ai/build/overview) | Grok headless auth | `XAI_API_KEY` (some pages: `GROK_CODE_XAI_API_KEY`); otherwise cached `grok login` |
| 2026-11-12 | Web | [Antigravity CLI install & auth](https://antigravity.google/docs/cli/install) | agy headless auth | `GEMINI_API_KEY` plus `"modelProvider": "gemini"` in `~/.gemini/antigravity-cli/settings.json`; the key alone has no effect; ADC via `AGY_ADC_AUTH=true` |
| 2026-11-12 | Doc / Code | `node_access_model.md` NA-5, NA-6, NA-10; `src/node-access-cli.ts`; `src/api/rest/node-access.ts`; `scripts/public/docker/autobyteus-docker.d/bash/commands.sh:158-190` | Node credential (autobyteus-437) | Setup code from the local control socket `/home/autobyteus/data/node-access/local-control.sock` through `docker exec`; `POST /rest/node-access/setup-exchanges` → `{credentialId, credential}`; Bearer header; WebSocket `access_token` |
| 2026-11-12 | Code | `test-support/live-e2e/live-e2e-evidence-scanner.mjs` | Existing leak scanning | Scans synthetic canaries and secret-looking field names, not real vault values |
| 2026-11-12 | Command | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault pnpm test-vault status` in the shared checkout | Sanctioned vault check | Failed in the build step: the shared checkout's dependencies are stale (`@modelcontextprotocol/client` missing). It regenerated that checkout's `autobyteus-ts/dist` from current sources (459/459 files); nothing else changed. Status was run inside the image instead (below). |

## Runtime, Probe, Or Reproduction Findings

All runs on this Mac (Docker Desktop, arm64), image `autobyteus/autobyteus-server:beta` `52db87304cc4`. All output is value-free; logs are in `probes/`.

| Method / Command | Scenario | Observation | Established | Evidence |
| --- | --- | --- | --- | --- |
| `docker run --rm --network none -v ~/.autobyteus-test/vault:/run/autobyteus-test-vault:ro -e AUTOBYTEUS_TEST_VAULT=… --entrypoint bash <image> -c 'stat …; node dist/secret-management/cli/test-vault-cli.js status'` | Read-only mount, ownership as seen by root | Files show `0 0 600`; `STATE READY`; 10 configured, 6 missing (same IDs as the host) in 0.36 s | Measured | this notes file (output transcribed above in the report) |
| `node probes/sandbox-probe.mjs` | Fresh container, setup code, exchange, GraphQL, value-free checks | Setup code at 19.6 s; GraphQL without a credential returns 401; log `Secret vault: test vault /run/autobyteus-test-vault (read-only)`; 7 providers keyed; ordinary setting write ok; all external runtimes SIGNED_OUT; DeepSeek Harness not installed; writable layer 18.1 MB; `/root` 446 MB; removed | Measured | `probes/probe-run-1.log` |
| `… --smoke=autobyteus:DEEPSEEK:deepseek-v4-flash` | Native runtime, real agent turn | TURN_COMPLETED in 1.5 s, reply correct; 19.8 s total | Measured | `probes/probe-run-2-native-smoke.log` |
| `… --smoke=claude_agent_sdk:haiku` with `CLAUDE_AGENT_SDK_AUTH_MODE=api-key` | Claude from the vault | TURN_COMPLETED in 5.7 s while the status says SIGNED_OUT | Measured | `probes/probe-run-3-claude-api-key-smoke.log` |
| `… --smoke=claude_agent_sdk:haiku --tools --scan --scan-during-turn --prompt=<print only the key length>` | Can the agent's shell see the key? Any leak in files? | The agent's Bash saw `ANTHROPIC_API_KEY`, length 109. During the turn only the `claude` process environment held a key. Value scan of 1020 files (449 MiB) clean during and after the run. | Measured | `probes/probe-run-4-claude-env-and-leak-scan.log` |
| `… --codex-login --smoke=codex_app_server:gpt-5.4-mini --scan` | Codex from the vault through stdin | `codex login --with-api-key` exit 0, Codex SIGNED_IN, TURN_COMPLETED in 4.5 s. The scan flagged `provider.openai.api-key in /root/.codex/auth.json`: an expected true positive that shows the scanner works. | Measured | `probes/probe-run-5-codex-api-key-login.log` |
| `docker ps -a --filter label=autobyteus.sandbox=484`; dangling-volume dates; `docker ps`; `ls -ln ~/.autobyteus-test/vault` | Cleanup and no side effects | 0 probe containers; no dangling volume from 2026-11-12; 3 user nodes still up (Up 3 days); vault files unchanged (mtimes Nov 9 / Oct 20) | Measured | this notes file |
| Linux bind-mount ownership | Vault on a Linux Docker Engine host | Host uid kept, which is not root, so `isPrivateOwnerFile` fails and the server reports `TEST_VAULT_UNAVAILABLE` | Read (not reproduced) | `secret-root-key-file.ts:36` |
| Grok / Antigravity in the sandbox | Sign-in from the vault | No route; SIGNED_OUT | Read + Measured (status) | strategies; probe logs |

- Temporary diagnostics: none in product code. The probes run only against throwaway containers and are kept as disposable evidence in `probes/`.
- Reproduction for implementation to start from: `probes/sandbox-probe.mjs` (options `--smoke`, `--tools`, `--prompt`, `--scan`, `--scan-during-turn`, `--codex-login`, `--keep`), `probes/leak-scan.mjs`, `probes/codex-login-from-vault.mjs`.

## External Contracts, Standards, And Dependencies

| Dependency | Version | Behavior | Risk |
| --- | --- | --- | --- |
| Docker Desktop file sharing (macOS) | current on this Mac | Bind-mounted files appear owned by the container's root | On Linux hosts the uid is kept, so the copy variant is needed |
| Claude Code | 2.1.319 | `ANTHROPIC_API_KEY` in its environment is inherited by its Bash tool | Agent-visible key in api-key mode |
| codex-cli | 0.167.0 | `login --with-api-key` reads stdin and stores the key in `~/.codex/auth.json` | Key on disk in the container |
| grok | 1.0.77 | `XAI_API_KEY` or cached login | No vault route in the server |
| agy | 1.5.3 | `GEMINI_API_KEY` plus `modelProvider` setting, or Google sign-in, or ADC | No vault route in the server |

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `analysis-report.md` | Solution Designer | The result: answers 1 to 4 and the handoff file | Final for this round |
| `probes/sandbox-probe.mjs`, `probes/leak-scan.mjs`, `probes/codex-login-from-vault.mjs` | Solution Designer | Disposable proof; starting point for a build | Evidence, not product code |
| `probes/probe-run-*.log` | Solution Designer | Value-free run output | Evidence |
| `follow-ups.md` | Solution Designer | FU-001, FU-002 | Not yet sent |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Status |
| --- | --- | --- | --- |
| RSK-001 | Risk | Agents in the sandbox can read keys (Claude environment, vault files as root, Codex `auth.json`) and have network access | Measured; mitigated by trusted agents only, value-match scan, throwaway container |
| RSK-002 | Risk | Copying OAuth/subscription logins could conflict on refresh with the user's real login | Not tested; avoided by recommending API keys only |
| UNK-001 | Unknown | Linux host behavior of the read-only bind mount | Read only; copy variant proposed |
| UNK-002 | Unknown | Parallel sandboxes sharing one read-only vault | Supported by the read-only design ("worktrees of different versions can share it"); not measured concurrently |
| UNK-003 | Unknown | Whether browser-driving tasks need `SYS_ADMIN` / `seccomp=unconfined` in the sandbox | Not tested |

## Requirement Implications

A build (if the user approves DEC-001) needs no product change for the native, Claude (api-key) and Codex runtimes: one script plus a TESTING.md section. Grok and Antigravity need a product change (FU-002). The transcript scan must match real vault values, not only patterns.
