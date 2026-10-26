# Options Report — How secrets reach skills and MCP servers without the agent reading them (autobyteus-244)

Supplement to `requirements-doc.md`; evidence in `investigation-notes.md`. A proposal for the user's decision. Nothing is built yet.

## 1. The principle

**An agent may *use* a credential but must never *hold* it.** A secret is only ever resolved:
- inside a process the agent does not control (a server-held MCP connection, a proxy, ssh-agent, a broker-run fixed command);
- never into the agent's shell, its environment, a file it can read, or a command whose content the agent controls.

What the agent *can* do with a credential is then limited by scope, approvals and audit.

## 2. Options compared

| Option | How it works | Stops T1 (accidental) | Stops T2 (agent tries to read) | Covers | Cost / limits |
| --- | --- | --- | --- | --- | --- |
| **A. Vault only** (FU-2 as first proposed) | MCP and integration secrets move into the vault; `mcps.json` keeps references; the UI shows Configured/Missing; values resolved at connect | Yes | Partly: no plain file, no API value. But the env of an MCP stdio child is readable (Measured), and the vault key is readable on the desktop (Measured) | MCP servers | Medium. Needed by every other option |
| **B. MCP / tool gateway** (exists) | The server holds the MCP connection; the agent calls tools via the Agent Tools endpoint | Yes (with A) | Yes for remote HTTP MCP (the header stays in the server). For stdio MCP the secret sits in the child's env, so same-user readable | Jira, GitHub and similar via MCP | Already built (179/181/193). Typed tools; costs tool-definition tokens |
| **C. Local reverse proxy per integration** | Scripts and CLIs call `http://127.0.0.1:<port>/<integration>/…`; the proxy adds `Authorization` outward over HTTPS; allow-list of method/path; redaction of echoed secrets; audit; a run-scoped capability so only granted runs can use it. `git` over HTTPS via `url.<proxy>.insteadOf` | Yes | **Yes**: the shell never holds the token | Token-over-HTTPS APIs (GitHub REST, Jira REST, git over HTTPS, most SaaS) | Medium. No TLS interception. Tools must accept a base URL: our scripts, curl and git do; `gh` for github.com does not (use E) |
| **D. ssh-agent held by the broker** | Per run, `SSH_AUTH_SOCK` points at a broker-owned agent with the vault's key loaded. `ssh-add -h` limits it to the granted hosts; a generated ssh config gives Host aliases (user and host not in the command) | Yes | **Yes**: the key can sign but never be exported | SSH, git over SSH, scp/rsync | Small to medium. Passwords are not covered (see E). Destination constraints are "experimental" per OpenSSH |
| **E. Broker-run fixed command templates** | The broker runs a declared command (e.g. `gh` with an allow-listed subcommand, `sshpass … ssh <alias> <cmd>`) in its own process with the secret; the agent supplies only arguments | Yes | Yes, **if** the template can't print the secret (deny `gh auth token`, no arbitrary shell) | CLIs that only take env tokens; SSH passwords | Fiddly: every template needs an allow-list. A fallback, not the main path |
| **F. Credential helpers** (git credential helper, `<tool> token`) | The helper fetches from the vault when the tool asks | Yes | **No**: `git credential fill` prints the token to any same-user caller (docs) | — | Rejected as a boundary |
| **G. HTTP forward proxy with TLS interception** (like Claude Code on the web) | All egress goes through a proxy that swaps a placeholder token for the real one; the sandbox trusts the proxy's CA | Yes | Yes | Any HTTPS tool, unchanged | Large: a CA in every tool's trust store and egress control. Fits Docker nodes later, not the desktop now |
| **H. Root-key hardening** | The vault's root key moves into the macOS keychain (ACL to the signed app; a shell read prompts the user). On Docker nodes, agent shells run as a different OS user from the server and vault | — | — (protects T3) | All secrets, including the cross-node pairing secret | Medium. Windows DPAPI and the Linux keyring do not stop same-user processes, so on those desktops the honest limit stays until a sandbox exists |

## 3. Recommendation: one model, "Integrations in the vault, delivered by a broker"

1. **Integrations live in the vault** (A). The user adds each one once on an Integrations page ("Connect GitHub", "Connect Jira", "Add SSH host"). A secret is never shown again (Configured/Missing, replace, remove). `mcps.json` and skill packages hold **references**, never values.
2. **One server-owned broker delivers each integration** in the form its consumer needs. The agent never holds the secret:
   - MCP servers: the existing gateway (B). Remote: headers server-side. Stdio: env into that one child only (DEC-003, with the honest limit).
   - Our skill scripts and HTTP CLIs: the local reverse proxy (C), with run-scoped capability, allow-list, redaction, audit.
   - SSH and git over SSH: the broker's ssh-agent with destination constraints (D).
   - The rest: fixed templates (E), case by case.
3. **Packages declare, users grant.** A skill or MCP preset declares the integrations it needs (e.g. `integrations: [github:read]`). The user grants them per agent, the way tools are selected today. Write scopes are separate grants; risky operations can require per-run approval. Every use is logged.
4. **Root key out of the shell's reach** (H): macOS keychain on the desktop; a separate OS user for agent shells on Docker nodes. On Windows and Linux desktops the limit is stated plainly (protected against T1/T2, not against a determined agent) until the agent-shell sandbox work (FU-7, autobyteus-219) exists.
5. **The same model serves the cross-node network** (autobyteus-300). The node's pairing/identity secret is a vault record held only by the server (H-protected). Node-to-node calls are made by the server, never from a shell.
6. **Skills versus MCP converge.** With the broker, a skill plus a script (cheaper in tokens, composable in a shell) is as safe as an MCP server for HTTP and SSH, so the user can choose either per integration.

## 4. What the agent can still do (honest limits)

- **Use** any credential granted to its run, within the scope. So scope, approvals, rate limits and audit are part of the design, not extras.
- On a Windows or Linux desktop, a determined same-user agent can still read the vault files and process environments. Real isolation needs a separate user, container or sandbox.
- An API response that echoes a secret is redacted by the proxy only if the proxy knows the value; it does.

## 5. Suggested phases (each its own Task, after approval)

| Phase | Content | Unblocks |
| --- | --- | --- |
| P1 | Vault records for MCP and integration secrets; references in `mcps.json`; Configured/Missing in API and UI; GraphQL stops returning values; a migration of existing plain values **only with the user's approval and a backup** | Safe MCP presets (Jira, GitHub MCP) |
| P2 | Integrations page plus the local reverse proxy (GitHub, Jira) with capability, allow-list, redaction and audit; package declarations and per-agent grants | Skill-based GitHub/Jira; the external board (autobyteus-302/98) |
| P3 | SSH via the broker's ssh-agent, with Host aliases and destination constraints; password fallback via a template | SSH skills |
| P4 | Root-key hardening (macOS keychain; Docker separate user); agent-shell env scrub (autobyteus-219) | T3 on macOS and Docker; autobyteus-300 |
| P5 | Sign-in flows (GitHub App device flow, Jira OAuth / FU-3) | No copy-paste tokens |
