# Requirements Document — Secrets and integrations for skills and MCP servers (autobyteus-244)

## Document Status

- Status: `Approved` for this ticket's scope (MCP secrets in the vault, SR-005): MREQ-001…MREQ-008 with MDEC-001…MDEC-005 approved by the user, or decided with his direction (MDEC-005: test token and repository created at his request). The long-term model decisions (DEC-001, DEC-003, DEC-009, DEC-010) were approved earlier; DEC-002 and the other DEC-* move with the follow-ups
- Current solution revision ID: `SR-008`. MDEC-006 and MDEC-007 were added by the Solution Designer under the user's standing direction; MREQ-001…008 are unchanged
- Package identifier: `secrets-and-integrations-design`
- Request / ticket: Project Task `autobyteus-244`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's direction of 2026-10-25
- Requirements owner: Solution Designer
- Date: 2026-10-25
- Approved by and reference: the User, in the Solution Designer conversation, 2026-10-25/26 (quotes in each decision row and in `solution-revision-record.md` SR-003…SR-005)
- Exact approved baseline: this document at SR-005 (section "MCP Secrets In The Vault (this ticket)")
- Behavior-defining supplements: `options-report.md` (SR-001) and `solution-validation.md` (SR-002: the Integration model, validations V1–V7 and the user journey), awaiting approval

## Scope Of This Ticket (SR-004)

The user, 2026-10-26: "i guess this proxy ticket could be future ticket. currently we work on mcp secret in vault?" This ticket now builds **MCP server secrets in the vault** (the original FU-2), on a vault record shape that later integrations reuse. The Integrations page, the proxy, SSH and root-key hardening are follow-ups FU-001…FU-003 (`follow-ups.md`). The model approval (DEC-001) stays the long-term direction. The MCP-secrets requirements are in the section "MCP Secrets In The Vault (this ticket)" below.

## Problem And Desired Outcome

- Problem:
  - Integrations need credentials: GitHub and Jira tokens, SSH usernames with keys or passwords, the API tokens of MCP servers. These credentials have no safe home. MCP server secrets sit in plain `mcps.json` and are returned by the API.
  - The vault holds only provider keys, and on the desktop its key file is readable by any same-user process.
  - Agent shells inherit the server's whole environment, and can read other processes' environments.
  - Skills' scripts run in the agent's own shell, so a token given to a script is a token given to the agent.
- Desired outcome:
  - A user connects an integration once; its secret lives encrypted and is never shown again.
  - Skills and MCP servers that need it can use it, while the agent can never read it, and what the agent may do with it is scoped, approvable and logged.
  - The same model protects the secret of the secure cross-node network.

## Relevant Current And Desired Behavior

| ID | Current (evidence: investigation notes) | Desired |
| --- | --- | --- |
| BEH-001 | MCP secrets are plain in `mcps.json` and returned via GraphQL | Encrypted in the vault; `mcps.json` holds references; APIs and UI show Configured/Missing only |
| BEH-002 | Integration tokens have no home; a skill's script would need the token in its own shell | The integration is configured once; a script reaches the service through the broker without holding the token |
| BEH-003 | SSH keys and passwords: no support | The key stays in the vault; SSH authenticates through a broker-held agent; the shell can't export the key |
| BEH-004 | Agent shells can read the vault key file and other processes' environments (Measured) | macOS desktop and Docker nodes: no silent read of the root key; other platforms: the limit is stated in the product and docs |
| BEH-005 | Nodes trust each other without authentication | (Design input for autobyteus-300) node secrets are vault records the shell cannot read |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-001 | Connect an integration once (GitHub, Jira, SSH host, an MCP server's token) |
| UC-002 | An MCP server uses its credential without the agent reading it |
| UC-003 | A skill's script or CLI uses an HTTP-token integration without the agent reading it |
| UC-004 | A skill uses SSH (key; password as fallback) without the agent reading it |
| UC-005 | The user grants integrations per agent, sees what was used, and approves risky operations |
| UC-006 | Existing plain MCP secrets move into the vault (with approval and a backup) |

### Out Of Scope

- Building anything before the user approves this design.
- Peer authentication itself (autobyteus-300 consumes this model).
- The Jira board design (autobyteus-98).
- A general agent sandbox (FU-7/autobyteus-219).
- TLS-intercepting egress (option G, later for Docker).

- The message gateway's refactor into integrations (the user's direction, 2026-10-25: "The messaging gateway will possibly be integrated, will be refactored, maybe changed into integrations in the future"). It's a later Task; the integration model must leave room for it (see REQ-009).

### Non-Goals

Protection against a determined same-user agent on Windows and Linux desktops in this round; enterprise secret managers.

### Prerequisites

None identified.

### Preserved Behavior Boundary

Provider keys keep their vault behavior. MCP servers keep working through the migration. Per-agent tool selection.

### Review Authority

Standard (`ticket-scope.md`).

## Requirements (proposed)

| ID | Requirement | Behaviors |
| --- | --- | --- |
| REQ-001 | The vault holds integration and MCP secrets of these shapes: a token; a username plus a token or password; an SSH private key (material, optional passphrase); several values per integration. No API, UI, log or file outside the vault ever returns a value. | BEH-001..003 |
| REQ-002 | A secret is resolved only into a process the agent does not control: the server-held MCP connection, the broker's proxy, the broker's ssh-agent, or a broker-run fixed command. It is never resolved into an agent's shell, its environment, a readable file, or an agent-written command. | BEH-001..003 |
| REQ-003 | HTTP-token integrations are reachable through a local broker endpoint that adds the credential outward. It is limited to the integration's allowed methods/paths, redacts the secret from responses, records each use (run, integration, method, path, status), and serves only runs granted that integration. | BEH-002 |
| REQ-004 | SSH uses a broker-held ssh-agent, restricted to the integration's hosts, with Host aliases. A password-only host uses a broker-run command template. | BEH-003 |
| REQ-005 | Skill packages and MCP presets declare the integrations they need. The user grants integrations per agent (read and write separately), sees the use log, and (DEC-005) approves risky operations. | — |
| REQ-006 | Root key: macOS desktop uses the keychain with an app-only ACL; Docker nodes run agent shells as a separate OS user without read access to the vault. Elsewhere the product states the limit. | BEH-004 |
| REQ-007 | Existing plain MCP secrets are moved only after the user approves, after a backup, and with every server still working afterwards. | BEH-001 |
| REQ-009 | The integration definition and its vault record do not assume outbound-only use. An integration can later also **receive** (a bot connection or webhook, as the message gateway's Discord/Telegram/WeChat channels do today), with the same vault, grants and audit. Design room only; nothing inbound is built in P1–P3. | — |
| REQ-008 | The same storage and broker rules apply to the cross-node pairing/identity secret (consumed by autobyteus-300). | BEH-005 |

Acceptance criteria are written per phase after approval (each phase becomes its own Task).

## Decisions

| ID | Question | Why It Matters | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | The model | Product direction, security | The user's framing (2026-10-25): everything is an **Integration**. Install → configure (stored in the vault on the server) → grant per agent → used through the server's broker (proxy, ssh-agent, MCP gateway; templates as a fallback). Validated: V1, V1b, V2, V6 work; credential helpers (V3) and env injection (V4) are not boundaries. See `solution-validation.md` | User | **Approved by the user** 2026-10-25: he proposed the framing ("all of them are supported by integrations … stored in the vault … on the server side"), the broker/proxy idea (Task comments), and said "I think the integration idea is really, really good" |
| DEC-002 | GitHub: fine-grained token first, or a GitHub App device-flow sign-in? | Setup effort and token lifetime | Fine-grained token first: simple, scoped per repository, no app to register. Device flow later (P5): 8 h tokens with refresh, no copy-paste | User | **Needs user** |
| DEC-003 | Jira: Cloud or self-hosted (and can an admin enable Rovo API tokens)? | Which presets and auth | Needed for any Jira plan; carried over from autobyteus-175. **Market evidence (Read, web, 2026-10-25):** Atlassian ends Data Center: no new-customer sales since 2026-03-30, no new licenses for existing customers after 2028-03-30, end of life 2029-03-28 (licenses read-only). Atlassian says 99% of its 300,000+ customers have a Cloud footprint (reported via The Register and partners). Recommendation: **design the Jira integration for Jira Cloud** (API token: email + token; OAuth sign-in later). Self-hosted Jira only through the generic HTTP-token integration (base URL + personal access token), with no dedicated work. GitHub goes first, as the user agreed | User | **Approved by the user** 2026-10-25: "okayyy. sounds good.", answering "I'll keep it in the plan that way: GitHub first, then Jira Cloud" |
| DEC-004 | SSH: store the key material in the vault, or a path to a key file? | A path stays readable by the shell | Key material in the vault (imported once; the original file can then be removed by the user); passwords only as a fallback | User | **Needs user** |
| DEC-005 | What may an agent do with a credential it cannot read? | T4 (use, not theft) | Read-only by default; write is a separate grant per agent; per-run approval for destructive operations (delete, force push, admin); everything logged | User | **Needs user** |
| DEC-006 | Env-var delivery to MCP stdio servers (old DEC-003) | Some servers only take env tokens | Allow it for MCP stdio children only, as the one exception. It protects against accidental exposure but not against a same-user agent on the desktop (Measured). Prefer remote/proxy forms when available | User | **Needs user** |
| DEC-007 | May packages declare required integrations, and who approves? | Easy setup versus control | Packages may declare; nothing is granted until the user grants it per agent | User | **Needs user** |
| DEC-008 | Existing plain values in `mcps.json` | User data | One-click migration offered in the UI, with an automatic backup; never automatic | User | **Needs user** |
| DEC-009 | Phase order | Effort | P1 vault + Integrations model + MCP references → P4 root-key hardening on macOS (V5: the vault key is readable today) → P2 proxy + Integrations page (GitHub/Jira) → P3 SSH → P5 sign-in flows | User | **Partly approved** 2026-10-25: GitHub first, then Jira Cloud ("sounds good"); the rest of the order is as proposed |

| DEC-010 | How are integrations distributed (a marketplace, our GitHub, built in)? | Easy install versus trust | The user asked (2026-10-25): "do we need to have one integration marketplace … or … all the integrations are put on our GitHub, like we have an integration repository … view all those integrations and then click install". Facts (Read): AutoByteus already installs agent packages and skill sources from public GitHub repositories, with update checks and notifications (`docs/modules/agent_packages.md` L33; tickets `github-agent-package-import`, `github-skill-sources`). Recommendation: an **integration definition** is a small **declarative** file (name, fields to fill, allowed hosts and paths, delivery kind, test call); no code, so installing one never runs code near the secret. v1: a few definitions **built into the app** (GitHub, Jira, SSH host, generic HTTP token, MCP credential) plus a 'custom' form, so no marketplace is needed. v2: an official `AutoByteus/autobyteus-integrations` GitHub repository, shown on the Integrations page as a catalog and installed and updated with the existing GitHub package installer. Third-party repositories later, with a trust step that shows the hosts a definition may send the secret to. The secret itself is never in a repository: it's entered on the node and stored in that node's vault | User | **Needs user**; partial direction from the user 2026-10-25: installing integrations contributed by other people from GitHub "will be quite dangerous", so no open third-party install |

## MCP Secrets In The Vault (this ticket)

Evidence (investigation notes; the user's `mcps.json` read for key names only, 2026-10-19/25): the user's 6 stdio servers have env keys `TTS_MCP_BACKEND`; `AUTOBYTEUS_AGENT_WORKSPACE`, `AUTOBYTEUS_API_KEY`, `AUTOBYTEUS_LLM_SERVER_HOSTS`, `DEFAULT_*_MODEL`; `SSH_MCP_DEFAULT_HOST`, `SSH_MCP_DEFAULT_USER`, `SSH_MCP_PRIVATE_KEY_FILE` (a path), `SSH_MCP_DEFAULT_PORT`. So **most env values are settings, not secrets**; only some (here `AUTOBYTEUS_API_KEY`, which the user says is no longer usable: "our server is already not working now") are. HTTP servers carry `token` and `headers` (autobyteus-179).

| ID | Requirement |
| --- | --- |
| MREQ-001 | An MCP server's secret values (chosen env values, the HTTP `token`, chosen header values such as `Authorization`) are stored encrypted in the node's vault. `mcps.json` keeps a reference in their place and never the value. Non-secret values stay as they are |
| MREQ-002 | No API response, UI field, export or log shows a secret value. The UI shows Configured/Missing with Replace and Remove; the GraphQL `mcpServers` query no longer returns secret values |
| MREQ-003 | When AutoByteus connects to the server (registration, preview, tool calls), it resolves the reference from the vault: into the HTTP request headers for remote servers, and into that one child process's environment for stdio servers (MDEC-003) |
| MREQ-004 | The vault records use a shape that later integrations reuse (e.g. owner `mcp-server:<id>`, field `env:<NAME>` / `header:<Name>` / `token`), so the follow-ups (FU-001/FU-002) don't need another store |
| MREQ-005 | Existing plain values move into the vault only after the user approves, after a backup of `mcps.json`; every server still connects afterwards (MDEC-002) |
| MREQ-006 | Bulk import of JSON containing plain secret values stores the values chosen as secret directly in the vault (MDEC-004) |
| MREQ-007 | A server whose secret is missing or whose vault is unavailable is shown as "needs secret". It does not connect with an empty value and does not fall back to plain text |
| MREQ-008 | The test vault accepts the live-check GitHub token (the user puts a line such as `AUTOBYTEUS_TEST_GITHUB_TOKEN=…` into his owner-private secrets file and runs `pnpm test-vault setup --source <file>` himself, per TESTING.md "Test vault"). Today the test vault imports only known provider aliases (read: `test-vault-commands.ts`, the closed catalog), so this ticket adds the alias. The gated live check reads the token from there and skips with "missing capability" when it's absent. The token never appears in chat, the repository or evidence. **The user, 2026-10-26: "please add this token into test vault yourself, because it will be there, we will not remove this test project. maybe in the future we could use it for testing as well".** So once the alias exists, the team imports `~/.autobyteus-test/secrets/github-mcp-test.env` into the test vault itself (`pnpm test-vault setup --source …`), and verifies it with `pnpm test-vault status` (IDs only). The repository `ryan-zheng-teki/autobyteus-mcp-test` stays as the team's permanent GitHub live-test target. The alias name is general (e.g. `AUTOBYTEUS_TEST_GITHUB_TOKEN` → a test-only GitHub secret ID), not tied to MCP, so later GitHub tests reuse it |

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| MDEC-001 | Which values count as secret? | Most env values are settings (evidence above), so not everything should be hidden. Recommendation: the HTTP `token` and an `Authorization` header are always secret; for env values and other headers the user ticks "secret" (a lock toggle per row), and a simple rule pre-ticks it. (a) Names: the name contains KEY, TOKEN, SECRET, PASSWORD/PASS, CREDENTIAL or AUTH. (b) Values: the value starts with a well-known token prefix (e.g. `github_pat_`, `ghp_`, `sk-`, `xoxb-`, `glpat-`, `ATATT`, `AKIA`), the same kind of rule secret scanners such as gitleaks use (autobyteus-221). No AI or semantic detection. It's only a suggestion: the user can lock or unlock any row, so misses and false hits (e.g. `TOKEN_LIMIT=4096`) are corrected by hand. The user asked (2026-10-26): "you meant we use some basic sementic detection or something?" | User | **Approved by the user** 2026-10-26: "i like your suggestion. thats good." (the lock-toggle UI, pattern pre-ticks, the one-time "Review and move to vault" banner) |
| MDEC-002 | The existing plain values in `mcps.json` | User data (approval and backup required). Recommendation: a one-click "Move secrets to vault" on the MCP page, with an automatic backup of `mcps.json`, listing which values will move; never automatic. UI (2026-10-26): a page banner "N values look like secrets but are stored as plain text → Review and move to vault", plus a per-row "Move to vault" on an existing plain value that matches a pattern | User | **Approved by the user** 2026-10-26: "i like your suggestion. thats good." (the lock-toggle UI, pattern pre-ticks, the one-time "Review and move to vault" banner) |
| MDEC-003 | Stdio servers only take env values | There's no other way to hand the value to such a server. The limit (Measured V4): a same-user agent shell can read a process environment with `ps -E`. Recommendation: accept for stdio MCP servers only, state the limit, and close it later with FU-003 or the sandbox work. Demonstrated to the user with a dummy value: the agent's own `env` shows nothing; `ps -E -p <server pid>` shows the value | User | **Approved by the user** 2026-10-26: "I get it … it is able to get the mcp server like a process ID and then use issue some specific command to get it … I think it is the way I am much better now, right? Obviously we cannot guarantee every case, but as long as we are better than that's fine." |
| MDEC-005 | Which real MCP server proves it? | The user, 2026-10-26: "AUTOBYTEUS_API_KEY is actually not usable anymore because our server is already not working now. i guess this mcp better use jira or github mcp as way for testing". Recommendation: automated tests use our own local test MCP servers (autobyteus-189/179) with dummy secrets. One **gated live check** uses **GitHub's remote MCP server** (`https://api.githubcopilot.com/mcp/`, `Authorization: Bearer` header in the vault), with a dedicated fine-grained, read-only test token limited to one test repository, imported into the test vault (TESTING.md) and never the user's everyday token. Jira Cloud's remote MCP server as a second live check only if the user has a Jira Cloud site and test token. **Test target created 2026-10-26** at the user's request ("are you able to create one test repo? … go ahead"): private repository `ryan-zheng-teki/autobyteus-mcp-test` (README on `main`, issue #1 "MCP live check: test issue"). The fine-grained token can only be created by the user in GitHub's web UI (GitHub has no API for it) | User | **Decided with the user's direction** 2026-10-26: the token was created at his request by the Computer Use Operator (he completed GitHub's sudo step himself): `autobyteus-mcp-test`, read-only, only that repository, expires 2026-11-25, stored in `~/.autobyteus-test/secrets/github-mcp-test.env` (600) |
| MDEC-004 | Bulk import with plain secrets | Recommendation: values matching the secret rule (MDEC-001) go straight into the vault on import; the result says which values were stored as secrets | User | **Approved by the user** 2026-10-26: "i like your suggestion. thats good." (the lock-toggle UI, pattern pre-ticks, the one-time "Review and move to vault" banner) |
| MDEC-006 | What does "one-time" mean for the "Review and move to vault" banner? (code review CR-002) | The banner was proposed as one-time, and false hits are corrected by hand (MDEC-001). A banner that returns for a value the user deliberately left plain would nag forever. Decision: the banner shows only candidates the user has not reviewed. Reviewing means unticking in the dialog, "Keep as they are", or unlocking a pre-locked row and saving. The per-row hint stays, so the user can still move a value later. The review state is a per-device display preference | Solution Designer | **Decided by the Solution Designer** 2026-10-26 under the user's standing direction ("You can make reasonable decisions …"); the user is informed |
| MDEC-007 | What does bulk import do with an entry that holds a secret reference (`{"vaultSecretId": …}`)? (code review CR-003) | autobyteus-190 SCN-002: a `mcps.json` moved to another install imports all entries. Sharing a foreign reference would let one server's delete remove another's entry. Decision: the entry always imports. If a server with the same ID here already holds a reference at that field, it keeps its own current secret (re-importing your own file, even an older copy). Any other reference imports as "needs secret" (a new empty reference) and is listed in the import result. This narrows 190 SCN-002 only for values that are secrets: the entries import, and those values must be entered again on this node, because secrets stay per node | Solution Designer | **Decided by the Solution Designer** 2026-10-26 under the user's standing direction; the user is informed |

## Readiness Check

- Content ready for approval: Yes (evidence-backed; options and limits explicit)
- Approved basis ready for design: Yes for this ticket's scope (MREQ-001…008, MDEC-001…005, SR-005). DEC-002, DEC-004…DEC-008 and DEC-010 move with the follow-ups
