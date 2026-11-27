# Analysis: the test vault in a fresh Docker server container (autobyteus-484)

- Task: autobyteus-484 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager` for the user; context: the Agent Package Creator's evaluation skill (AutoByteus Agents Task autobyteus-agents-101).
- Author: Solution Designer, 2026-11-12. Status: **analysis complete; nothing built.** The probe scripts in `probes/` are disposable evidence, not the setup.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-docker-sandbox`, branch `codex/test-vault-docker-sandbox`, base `origin/personal` @ `a9f2b9f296`. Nothing is committed.
- Image tested: `autobyteus/autobyteus-server:beta` (local id `52db87304cc4`, 2026-11-08, arm64, 8.34 GB; server package 0.1.1; Claude Code 2.1.319, codex-cli 0.167.0, agy 1.5.3, grok 1.0.77).
- Evidence: [investigation-notes.md](investigation-notes.md) (sources, commands, measurements); probe logs in [probes/](probes/).

## Short answer

Yes, it works. On this Mac, a fresh container from the existing `beta` image gets the test vault by a **read-only bind mount** plus one variable that holds only the vault's location (`AUTOBYTEUS_TEST_VAULT=/run/autobyteus-test-vault`). The server opens it read-only and every vault provider is configured, with no code change. A real agent answered through GraphQL about 20 s after `docker run`. I measured it on three runtimes:

| Runtime | From the vault alone? | Measured in a fresh container |
| --- | --- | --- |
| AutoByteus native (all vault providers: Anthropic, DeepSeek, Gemini, GLM, Grok, Kimi, OpenAI) | **Yes** | DeepSeek `deepseek-v4-flash`: turn completed in 1.5 s |
| Claude Agent SDK | **Yes**, with `CLAUDE_AGENT_SDK_AUTH_MODE=api-key` (uses `provider.anthropic.api-key`) | `haiku`: turn completed in 5.6 s |
| Codex | **Yes, after one setup step in the container**: the vault's OpenAI key goes into `codex login --with-api-key` through stdin | `gpt-5.4-mini`: turn completed in 4.5 s |
| Grok Build | **No.** The runtime has no vault route; it needs `XAI_API_KEY` in the server's environment, or an interactive OAuth or device-code login | Not run (SIGNED_OUT) |
| Antigravity (`agy`) | **No.** It needs `GEMINI_API_KEY` in the environment plus `modelProvider: "gemini"` in its settings file, or a Google sign-in | Not run (SIGNED_OUT) |
| DeepSeek Harness | Its key would come from the vault (credential proxy), but the runtime is **not installed** in the `beta` image | Not run |

**Recommendation:** make Docker plus the read-only test vault the default sandbox for evaluations and for any live check that needs a whole server node. Use API keys only, never copied subscription logins. Use it for the native, Claude (api-key mode) and Codex runtimes now; Grok and Antigravity come later, after a small product change (FU-002). It runs the **published image**, so it tests agent packages, not unreleased server code. For unreleased server code, keep `isolated-app` or a locally built image.

## 1. Getting the vault in, and what each runtime needs

### The vault: read-only mount (measured)

- `docker run … --mount type=bind,src=$HOME/.autobyteus-test/vault,dst=/run/autobyteus-test-vault,readonly -e AUTOBYTEUS_TEST_VAULT=/run/autobyteus-test-vault`.
- Inside the container, the server logs `Secret vault: test vault /run/autobyteus-test-vault (read-only)`. `providerCredentialSettings` shows a key for ANTHROPIC, DEEPSEEK, GEMINI, GLM, GROK, KIMI and OPENAI. The offline `test-vault-cli status` inside the image reports `STATE READY` with the same IDs as on the host: 10 configured, 6 missing.
- Why it works here: the vault's checks require the key file to be owned by the process's own uid and to be `0600`. Docker Desktop's file sharing presents the bind-mounted files as `0 0 600` to the container's root, and the server runs as root (supervisord `user=root`). SQLite opens the file `readOnly` with `query_only`, which works on a read-only mount. Ordinary server settings in the container's own data volume still save; vault writes would fail with `SECRET_VAULT_READ_ONLY` (by design).
- The host vault files did not change: same size and mtime before and after six container runs.
- **Where it would fail: a Linux host** (Docker Engine without Docker Desktop's mapping). There the bind mount keeps the host uid, for example 1000, which is not root, so the server refuses the vault (`TEST_VAULT_UNAVAILABLE`). This is from reading the code; I could not reproduce it on this Mac. Fallback, the task's "copy into a fresh volume" option: `docker create` → `docker cp ~/.autobyteus-test/vault/. <c>:/run/autobyteus-test-vault` (files arrive owned by root) → `docker start`. The copy lives in the container and is removed with it.
- An older image without test-vault support would ignore the variable and start with an empty vault. The current `beta` image has the support.

### Per runtime

- **Native AutoByteus runtime:** reads keys only through the server's vault service, so the vault is enough. Gemini still needs its explicit setup mode (`GEMINI_SETUP_MODE`) when used.
- **Claude Agent SDK:** in the default `cli` mode it uses the Claude account login in `/root/.claude`, which a fresh container lacks. With `CLAUDE_AGENT_SDK_AUTH_MODE=api-key`, the server reads `provider.anthropic.api-key` from the vault just before each launch and sets `ANTHROPIC_API_KEY` in the Claude Code child process only. The mode is not a secret, so it can be a `-e` variable. Two side effects:
  - The Agent Runtimes status still says **SIGNED_OUT**, because it asks `claude auth status`, which does not see the vault key. Direct `createAgentRun` works (measured). Saved or inherited launch checks and the Model Router refuse a signed-out runtime (read in `launch-usability-check.ts:193` and `model-router.ts:54`), so delegation that inherits a Claude launch may be refused in the sandbox. This is follow-up FU-001.
  - Usage is billed to the API key, not to the Claude subscription.
- **Codex:** outside vault governance by design; it uses its own `~/.codex/auth.json`. `codex login --with-api-key` reads the key from stdin. The probe helper reads the OpenAI key from the mounted vault inside the container and pipes it into that command. After that, the server reports Codex SIGNED_IN and a turn completes. The key then lives in `/root/.codex/auth.json` inside the container's fresh `/root` volume and is removed with the container. Billing goes to the OpenAI API key.
- **Grok Build:** `grok login` offers only `--oauth` and `--device-auth`. xAI documents `XAI_API_KEY` for headless use, but the server starts `grok` with its own environment and has no vault route for it. Options: (a) a vault-backed api-key mode like Claude's (FU-002, recommended); (b) a container-only start wrapper that reads the vault and exports the variable into the server's environment (works, but is a workaround); (c) a device-code login per container (interactive, not suitable for automation).
- **Antigravity:** no login command; Google sign-in from its command line. The official headless route is `GEMINI_API_KEY` plus `"modelProvider": "gemini"` in `~/.gemini/antigravity-cli/settings.json`; the vault's `provider.google.ai-studio.api-key` could provide the key. Same options and recommendation as Grok (FU-002).
- **Subscription logins (Claude account, ChatGPT login for Codex, Google for agy, Grok OAuth): not recommended in the sandbox.**
  - Copying the user's login state would touch the user's real home and nodes, which the task forbids. The three running nodes keep their logins in their own `root-home` volumes.
  - On macOS, Claude Code keeps its login in the Keychain, not in a file you could mount.
  - OAuth refresh tokens shared between copies can conflict, so the user's real login could be signed out. This is a risk I did not test.
  - The server's own code records that Anthropic does not allow third-party products to offer the claude.ai login (UD-006).
  - Spending subscription instead of API credit is a cost decision for the user (DEC-002 in the requirements doc).

## 2. Safe handling

What the measured setup already does:
- **Keys stay in the vault.** The only thing on the command line and in `docker inspect` is the vault's location. No key is in the image, a `-e` value, a host file or the probe output.
- **The vault is read-only.** It is mounted `readonly` and opened read-only, and the host files were unchanged after the runs.
- **The node credential stays in memory.** The setup code and the owner credential live only in the probe process; neither is printed or written. GraphQL without the credential returns HTTP 401.
- **The container is thrown away.** After each run, `docker rm -f -v` removes the container and its anonymous volumes. Checked: 0 containers left with the probe label, no dangling volume from today, the three user nodes still up.
- **Codex stays inside the container.** Its key goes in through stdin, never as an argument.

What it cannot prevent, because these are the same exposures an agent has on the host today, and the evaluation must know about them:
- **An agent with a shell can read keys.**
  - Measured: in Claude api-key mode, the agent's Bash tool sees `ANTHROPIC_API_KEY`. I had it report only the length, 109.
  - The container's root can read the mounted vault. Measured: root inside the container opened it and reported READY.
  - Codex's key is in `/root/.codex/auth.json`.
  - So an agent under evaluation could print a key into its transcript, or send one out over the network the providers need. Keep the sandbox to agents and packages the user trusts. The read-only mount and throwaway container limit damage to the vault and the host, not reading.
- **The whole vault is visible, not only the keys a run needs.** A smaller per-run vault would need a plaintext source file. Not worth it now; recorded as a risk.

**What the evaluation's transcript and report scan must check:**
1. **Value matching against the vault (required).** Read every configured vault secret in memory and search every file the evaluation keeps for the raw value and its base64 and base64url forms. Cover transcripts, run memory, the server and runtime logs, the workspace and the report. Print only the secret ID and the file path. Pattern matching alone misses keys without a known prefix.
   - The probe `probes/leak-scan.mjs` does this. It was clean after the Claude and native runs, both during and after the turn. After the Codex run it correctly flagged `provider.openai.api-key in /root/.codex/auth.json`, which shows it catches real leaks.
   - The only allowed hit is the runtime's own credential file inside the container (`/root/.codex/auth.json`), and only when the run did not export it. Any hit in exported artifacts fails the run.
2. **Shape patterns (also).** For credentials that are not in the vault: `sk-ant-`, `sk-proj-` / `sk-`, `xai-`, `AIza…`, `ghp_` / `github_pat_`, and the node's own `own_`, `mra_`, `mhub_`, `mcpg_`. Also field names such as `api_key=`, `authorization:`, as the existing `LiveE2eEvidenceScanner` checks.
3. **Process environments while the run is live (diagnostic).** Optional, to see which processes hold a key. Measured: only the `claude` process during a Claude api-key turn.
4. **Scan before export.** Run it inside the container before throwing it away, or on the host on the exported folder with `AUTOBYTEUS_TEST_VAULT` set. Never copy secrets out to scan them.

## 3. The smallest working setup (measured with the probe)

This sequence is the one `probes/sandbox-probe.mjs` runs. A built version would be one short script (DEC-001):

```bash
# 1. Fresh container: fresh anonymous volumes, the vault read-only, only the vault's location in the environment.
PORT=<free port>
docker run -d --name autobyteus-sandbox-<id> --label autobyteus.sandbox=<id> \
  -p 127.0.0.1:$PORT:8000 \
  --mount type=bind,src=$HOME/.autobyteus-test/vault,dst=/run/autobyteus-test-vault,readonly \
  -e AUTOBYTEUS_TEST_VAULT=/run/autobyteus-test-vault \
  -e CLAUDE_AGENT_SDK_AUTH_MODE=api-key \
  -e AUTOBYTEUS_SERVER_HOST=http://localhost:$PORT \
  -v /home/autobyteus/data -v /root -v /home/autobyteus/server-packages \
  -v /app/autobyteus-server-ts/workspace -v /home/autobyteus/workspace \
  autobyteus/autobyteus-server:beta
#    (+ the run's inputs, read-only: --mount type=bind,src=<inputs>,dst=/home/autobyteus/inputs,readonly)

# 2. Optional, Codex: inside the container, the vault's OpenAI key goes into `codex login --with-api-key` through stdin
#    (probes/codex-login-from-vault.mjs, copied in with docker cp and run with docker exec).

# 3. Node credential (autobyteus-437): ask the node's local control socket for a setup code with docker exec, the same
#    client `autobyteus-docker setup-code` uses (socket /home/autobyteus/data/node-access/local-control.sock), then
#    POST /rest/node-access/setup-exchanges {setupCode, desktopName} -> {credentialId, credential}. Keep both in memory
#    only; send `Authorization: Bearer <credential>` on GraphQL and `?access_token=` on /ws/agent/<runId>.

# 4. Smoke: createAgentDefinition -> createAgentRun {runtimeKind, llmModelIdentifier, workspaceRootPath} -> WebSocket
#    SEND_MESSAGE -> wait for TURN_COMPLETED -> terminateAgentRun.

# 5. Leak scan inside the container (probes/leak-scan.mjs), export the evaluation's artifacts, then:
docker rm -f -v autobyteus-sandbox-<id>
```

- **Socket path (autobyteus-476):** the container's socket path is 52 characters, far under the macOS limit of about 104 bytes, so the problem does not occur. The socket is reached through `docker exec`, so no host data root is involved.
- **Time (measured, 5 runs):**
  - `docker run`: 1.4–4.7 s.
  - Node ready with a setup code: 9.7–19.6 s after start.
  - Credential exchange and GraphQL ready: under 0.1 s more.
  - Runtime status check: 1–5 s.
  - One smoke turn: 1.5 s (native DeepSeek), 4.5 s (Codex), 5.6 s (Claude haiku).
  - From start to removal: 20–28 s.
- **Disk:**
  - The image is 8.34 GB, already present and shared by all sandboxes.
  - Each sandbox adds about 450 MB, because Docker copies the image's `/root` into the fresh `/root` volume, plus a writable layer of 18–170 MB and under 1 MB of data.
  - All of it is removed with the container.
- **Money:** the probe made four tiny API calls, a fraction of a cent. An evaluation spends API credit per token on every runtime, because no subscription is involved.
- **Where it fails or is limited:**
  - Grok and Antigravity cannot sign in (FU-002).
  - DeepSeek Harness is not installed in the image.
  - The Claude runtime shows SIGNED_OUT in api-key mode, so launch checks may refuse it (FU-001).
  - Linux hosts need the copy variant.
  - The image must be pulled (8 GB) where it is missing.
  - Provider outages or quota limits show as run errors.
  - The sandbox tests the published image's server, not a worktree's.
  - The container needs normal outbound network access for the providers.
  - The probe did not add the `SYS_ADMIN` capability or `seccomp=unconfined` that the user's nodes use, and nothing it ran needed them. Tasks that drive the in-container browser may need them; not tested.

## 4. Recommendation and where to document it

- **Recommended:** Docker plus the read-only test vault as the **default sandbox for evaluations** (agents-101): fresh container, fresh volumes, only the run's inputs mounted, API keys only, with the value-match leak scan before export and removal. Supported now: the native runtime with every vault provider, Claude Agent SDK in api-key mode, and Codex through stdin login.
- **For live tests:** use the sandbox for checks that need a whole running node from a released image. It does **not** replace the existing in-process live suites (`pnpm test:e2e:real`, autobyteus-ts live tests), which already use the vault on the host and test the worktree's code. Nor does it replace `isolated-app` for unreleased desktop or server changes.
- **Not recommended:** subscription logins in sandboxes; copying anything from the user's nodes or home; giving the sandbox to agents the user does not trust while keys can be read inside it.
- **Where to document it:**
  - **TESTING.md**, "Test vault": a short subsection, "In a Docker sandbox", with the command, the read-only rule, api-key mode for Claude, the Codex stdin login, the leak scan and removal. The Linux copy variant also goes there. Per the team's project-documents rule, the API/E2E engineer owns TESTING.md, so it is written when the build follow-up is delivered.
  - The script itself goes under `scripts/`, if the user wants it built.
  - The evaluation skill's `live-checks.md` belongs to the Package Creator. The PM passes this report to agents-101.

## Decisions for the user (details in requirements-doc.md)

| ID | Question | Recommendation |
| --- | --- | --- |
| DEC-001 | Build the sandbox script plus the TESTING.md section as a follow-up Task? | Yes. The probe already does about 80% of it; about one small ticket. |
| DEC-002 | API billing only (no subscription logins) in sandboxes? | Yes: API keys from the vault. Subscription logins mean touching the user's real login state, plus policy and refresh-token risks. |
| DEC-003 | Add vault-backed api-key modes for Grok Build and Antigravity (FU-002), so they also work in the sandbox? | Only if evaluations need those runtimes. It follows the existing Claude api-key design. |

## Follow-ups (see follow-ups.md)

- **FU-001:** the Claude Agent SDK runtime reports SIGNED_OUT in `api-key` mode although runs work, so launch-usability checks and the Model Router can refuse it.
- **FU-002:** no vault route for Grok Build (`XAI_API_KEY`) or Antigravity (`GEMINI_API_KEY` plus `modelProvider`).

## Route

- Handoff rules checked on 2026-11-12. No rule covers an investigation result: the rules cover architecture review or implementation of a completed design, a release, and a delivery receipt gap.
- The result returns to the delegating `/project_task_manager` with FU-001 and FU-002. It passes the report to agents-101 and, if the user wants, creates the build Task.
- Self-check: the value scan over this ticket folder on the host (`probes/leak-scan.mjs`, 13 files) is `LEAK_SCAN CLEAN`.

## Also noted

`pnpm test-vault status` failed in the shared checkout (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`). Its build step stops because that checkout's installed dependencies are stale (`@modelcontextprotocol/client` is not installed; it needs `pnpm install`). The failed build regenerated that checkout's `autobyteus-ts/dist` from its current sources (459 of 459 files). Nothing else there was changed. I ran the vault status inside the image instead.
