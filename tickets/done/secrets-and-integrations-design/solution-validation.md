# Solution And Self-Validation — Integrations, the vault and a credential broker (autobyteus-244)

- Package: `secrets-and-integrations-design`, SR-002; Project Task `autobyteus-244`. Companion to `options-report.md` (options) and `investigation-notes.md` (evidence).
- The user's direction, 2026-10-25: "all of them are supported by integrations. And when user tries to install this integration, then they configure. And then when they configure, then it is stored in the vault … on the server side … validate by yourself whether this works or not … write it to a file for your solutions and the validations … provide a simplest user journey as well."
- Every probe ran locally on macOS 26.5.2 with OpenSSH 10.2, git and Node. They used **dummy values only**, local test services and temporary directories; nothing was written to the repository or the user's data. The probe sources are in `probes/` (this folder).

## 1. The solution: everything is an Integration

An **Integration** is one installable thing (GitHub, Jira, an SSH host, an MCP server's credential) with three parts:

| Part | What it is | Where it lives |
| --- | --- | --- |
| Configuration | What the user fills in once: token, username + token, SSH key, host, base URL | **Vault, on the server** (encrypted); never shown again; Configured/Missing |
| Delivery | How a consumer gets to use it **without holding it** | Server-owned **credential broker**: an HTTP proxy, an ssh-agent, the MCP gateway, or a fixed command |
| Grants | Which agents may use it, and how far (read / write; risky actions need approval) | Agent settings, next to tool selection; every use in an audit log |

**The rule:** an agent may *use* a credential, never *hold* it. The secret is resolved only inside a server-owned process: the proxy, the ssh-agent, the server-held MCP connection, or a fixed command. Never in the agent's shell, its environment, a readable file, or a command the agent writes.

Delivery by integration kind:

| Integration | Delivery | Validated |
| --- | --- | --- |
| GitHub, Jira, any token-over-HTTPS API (our skill scripts, curl, REST) | Local **credential proxy**: `http://127.0.0.1:<port>/i/<run-capability>/<integration>/…` adds `Authorization` outward, enforces the run's grant and an allow-list, redacts echoes, audits | **Yes**, V1 |
| git over HTTPS (clone, fetch, push) | git rewrites `https://github.com/` to the proxy (`url.<proxy>.insteadOf`); the proxy adds the token | **Yes**, V1b (a real clone) |
| SSH, git over SSH, scp/rsync | The broker's **ssh-agent** holds the key; the shell gets only `SSH_AUTH_SOCK` plus a generated ssh config with Host aliases; the key is restricted to the integration's hosts (`ssh-add -h`) | **Yes**, V2 (sign, no export, real SSH login, host restriction enforced) |
| MCP servers (Jira/GitHub MCP, any) | The **MCP gateway** (exists): the server holds the connection. Remote: header from server memory. Stdio: env of that one child only | Remote: yes (autobyteus-179 evidence). Stdio env: **readable** (V4), so the stated exception (DEC-006) |
| CLIs that only accept an env token (e.g. `gh` for github.com) | A **fixed command template** run by the broker with a subcommand allow-list and redaction | **Yes**, V6. Needs an allow-list per CLI, so it's a fallback |
| Cross-node pairing/identity secret (autobyteus-300) | A vault record used only by the server for node-to-node calls | Same storage rule; covered by the root-key work (H) |

## 2. Validation results

| ID | Claim tested | Probe (in `probes/`) | Result | Established | Verdict |
| --- | --- | --- | --- | --- | --- |
| V1 | A script's shell can call an API through the proxy without holding the token; forged auth, calls outside the allow-list and other runs are refused; echoed secrets are redacted; uses are audited | `proxy-probe.mjs` + `agent-shell.sh` | Token in the shell env: **0** matches. `GET /user` → 200, echo `[REDACTED]`. A forged `Authorization` is replaced (the service saw only the real token). A POST outside the allow-list → **403**. Another run's capability → **403**. The audit log has one line per call (`proxy-audit-sample.jsonl`) | **Measured** | **Works** |
| V1b | A real `git clone` over HTTPS works through the proxy; the same git without the proxy has no access | `git-proxy-probe.mjs` (git's own `http-backend` as the service, requiring a token) | Direct: `could not read Username` (no access). Through the proxy: **cloned** the commit "hello from the probe"; the service saw `info/refs` and `git-upload-pack` with a valid token | **Measured** | **Works** |
| V2 | The SSH key can be used but not exported; a real SSH login works with nothing in the shell; a host-restricted key is refused elsewhere | `ssh-agent-probe.sh` (two throwaway `sshd` on 127.0.0.1; rerun on 2026-10-25: same result) | Key file deleted; the shell has only `SSH_AUTH_SOCK`. `ssh-add -L` shows the public key only, and there is no export. Signing through the agent works. A **real login** ran a remote command. A key restricted with `ssh-add -H kh -h [127.0.0.1]:A`: server A **connected**, server B with the same authorized key gave **`Permission denied (publickey)`** | **Measured** | **Works** |
| V3 | A git credential helper hides the token | `git -c credential.helper=… credential fill` | Printed `password=dummy-helper-token-777` to the caller | **Measured** | **Rejected** as a boundary |
| V4 | A secret in an MCP stdio server's environment is safe from a shell | `env MCP_SERVER_TOKEN=dummy… node` + `ps -E` from another shell | `MCP_SERVER_TOKEN=dummy-mcp-env-token-555` visible | **Measured** | **Not safe** against a same-user agent; only an exception (DEC-006) |
| V5 | The vault's root key is out of a same-user shell's reach | `test -r …/production.db.secret.key` (content not printed) | Readable | **Measured** | **Gap**: needs root-key hardening (H) |
| V6 | A broker-run CLI template cannot leak its token | `broker-run.sh` + `fake-gh` | Without an allow-list the CLI's `auth token` prints the token (redaction saved it); with an allow-list `auth token` is **refused**, while `api user` works | **Measured** | **Works with an allow-list**; fallback only |
| V7 | The macOS keychain with an app-only ACL stops a shell reading the root key silently | Not run: it would pop a dialog on the user's screen | Apple docs: an untrusted caller triggers a user prompt | Read (docs) | To validate in P4, with the user present |

## 3. Which solution is best, per credential kind (scored)

Criteria: **S** = the agent cannot read it (V-results), **E** = easy for the user, **C** = works with common tools, **K** = cost to build. 3 is best.

| Kind | Proxy | ssh-agent | MCP gateway | Fixed template | Credential helper | Env injection | Best |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HTTP token API (GitHub/Jira REST) | S3 E3 C3 K2 | — | S3 E3 C2 K3 (if an MCP server exists) | S2 E2 C2 K1 | S0 | S0 | **Proxy** (MCP gateway equally good when the user prefers MCP tools) |
| git over HTTPS | S3 E3 C3 K2 | — | — | — | S0 | S0 | **Proxy** |
| SSH (key) | — | S3 E3 C3 K2 | — | S2 (password) | — | S0 | **ssh-agent** |
| SSH (password only) | — | — | — | S2 E2 C2 K1 | — | S0 | **Fixed template** (recommend switching to a key) |
| MCP stdio server needing an env token | — | — | S1 E3 C3 K3 | — | — | S1 | **MCP gateway + env** (stated exception) |
| `gh` / env-only CLI | (REST via proxy instead) | — | — | S2 E2 C2 K1 | S0 | S0 | **Proxy for our scripts**; template for the CLI |

**Conclusion:** a credential broker with three delivery forms (proxy, ssh-agent, MCP gateway), plus templates as a fallback, covers every kind with S≥2. Credential helpers and plain env injection score S0/S1 and are not used as boundaries.

## 4. Honest limits (what this does not stop)

1. **A determined same-user agent on the desktop** can still read the vault files (V5) and other processes' environments (V4) until the root key leaves the readable disk (H: macOS keychain, V7 to validate) or agent shells run as a separate user (Docker nodes). Windows DPAPI and an unlocked Linux keyring don't stop same-user processes (known OS behavior, not run). So on those desktops the product states this limit.
2. **Use is not theft.** An agent can still *use* a granted integration through the proxy or ssh-agent. Hence read-only by default, separate write grants, per-run approval for risky actions, rate limits and the audit log (V1 shows the log).
3. **The capability in the shell is not the secret.** The run's proxy URL (with its capability) is in the shell. It only lets *that run* use *its granted* integrations, and it ends with the run.
4. **Allow-lists need care.** Too broad an allow-list gives broad use (V6 shows why templates need one).
5. **Production gaps the probes don't cover:** the real upstreams are HTTPS (the proxy speaks HTTPS outward; TLS to localhost isn't needed); long-running streams; GitHub's rate limits; Windows ssh-agent named pipes.

## 5. The simplest user journey

**Connect GitHub** (the same pattern for Jira, an SSH host, an MCP server's token):

1. **Install**: Settings → **Integrations** → *GitHub* → **Install**.
2. **Configure**: paste a fine-grained token (later: "Sign in with GitHub"). AutoByteus tests it (one call through the proxy) and shows "Connected as @octo". The token goes to the **server's vault** and is never shown again; the card shows *Configured*, with Replace and Remove.
3. **Grant**: open an agent (e.g. the Software Engineering team) → **Integrations** → tick *GitHub: read* (and *write* if wanted). A skill package that declares `github:read` shows as "needs GitHub", one click to grant.
4. **Work**: the agent's skill script runs `curl "$AUTOBYTEUS_GITHUB_URL/repos/…"`, or `git clone https://github.com/…`, which the proxy handles. The agent never sees the token. If it tries `env`, `cat` or `git credential fill`, there is nothing to find (V1, V1b, V3 avoided).
5. **Approve risky actions**: a delete or force-push through the proxy pauses with "Agent X wants to delete branch Y on GitHub: Allow once / Deny".
6. **See and revoke**: Integrations → GitHub → **Activity** lists each use (run, method, path, result). **Remove** revokes it everywhere at once.

**Add an SSH host:** Integrations → *SSH* → Add host (name, address, user) → import a key (or generate one and copy the public key to the server) → grant to an agent. The agent runs `ssh build-server 'uptime'`; the broker's ssh-agent signs. The key never exists in the shell, and works only for that host (V2).

**MCP server with a token** (e.g. Atlassian's): Integrations → *Jira* → token → the preset MCP server uses it from the vault. The tools appear for granted agents only.

## 6. What changes in the requirements (SR-002)

- DEC-001 is now framed as "Integrations: install → configure (stored in the vault on the server) → grant → use through the broker", as the user described.
- The evidence for DEC-004 (import the SSH key into the vault) and DEC-006 (stdio env is the exception) is now Measured (V2, V4).
- The phase order is unchanged, but **P4 root-key hardening on macOS should come right after P1**: without it, the vault is readable by a determined agent on the desktop (V5).
