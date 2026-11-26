# The node-8001 relay sandbox compared with the vault-in-container route (autobyteus-484, SR-002)

- Asked by: the founder, through `/project_task_manager` (2026-11-17). He wants to know whether the relay replaces or complements the vault route, and how it fits the provider terms (autobyteus-234; autobyteus-498 could not be read from this Task, so its terms research was taken from the 2026-11-16 journal and Anthropic's current page).
- Read: `/Users/normy/autobyteus_org/autobyteus-delivery-records/sandbox-guide-from-node-8001-20261117/` (README.md, relay.py, start-sandbox.sh, stop-sandbox.sh). Nothing was run against the user's nodes. One offline check in a throwaway container found that `bwrap`, `socat`, `unshare`, `setpriv` and `python3` are all in the `beta` image.
- Author: Solution Designer, 2026-11-17.

## What the relay sandbox is

Inside a Linux container, running as root, each agent runs in a bubblewrap sandbox. The agent gets its own user, its own process list, no network interface except loopback, and only its own folders. It reaches the outside through two Unix-socket "doors":
- **Model API relay (host side).** It removes the agent's placeholder credential and adds the real one, read from the host's Claude Code login file (`~/.claude/.credentials.json`; the access token lasts about 8 hours and the host's own Claude Code renews it). It allows only `/v1/` and `/api/` paths to one API host.
- **Package-registry relay.** An allowlist (npm, PyPI and the like); everything else gets 403.
- **Logging.** Every request is logged with method, path or host, decision and status, never headers or tokens.

## Replace or complement?

**It complements the vault route.** The two answer different questions:

| | Vault in container (484, measured) | Relay sandbox (node 8001) |
| --- | --- | --- |
| Answers | Where the credentials **come from** in a fresh container | Where the credentials are **attached**, and what the agent may reach |
| Credential inside the agent's reach | Yes. The agent can read it: Claude's environment, the vault files as root, Codex `auth.json` (measured) | No. The agent holds a placeholder |
| Network control | None (open network) | Two doors, allowlist, every request logged |
| Process/file isolation between runs | Container per run | Container plus bwrap per agent; private process list |
| Subscription login | Not used (API keys) | Used for Claude: the host login's access token |
| AutoByteus runtimes covered | Native (every vault provider), Claude, Codex: all measured | Claude Code measured on 8001. AutoByteus's own runtimes not yet. |
| Cost to build | One script; probe already works | More: bwrap setup, a relay per provider, base-URL support |

The strongest design uses both. The vault (or a login) stays the single source of credentials, but it sits on the relay's side, **outside** the agent's sandbox. The agent side gets placeholders. This removes the main limit we measured in 484 (agents can read keys), and adds the egress log and the allowlist. The value-match transcript scan stays as a backstop.

Shape for an AutoByteus evaluation:
- One fresh container per evaluation, as in 484.
- Inside it, root holds the credential source (the read-only vault mount, root-only) and runs the relays.
- The AutoByteus server and its runtimes run as the unprivileged sandbox user inside bwrap. The 8001 guide describes this: "an agent app that runs as a server … starts the same way".
- The evaluation drives the server through the third bridge (`server.sock` to a host port).
- Requirement: the container needs namespaces allowed. The user's nodes already run with `seccomp=unconfined` and `SYS_ADMIN`; the 484 probe container did not. The tools are already in the image.

## What the relay needs from AutoByteus (read, not run)

| Runtime | Can it be pointed at a relay? | Evidence |
| --- | --- | --- |
| Claude Agent SDK | **Yes.** `ANTHROPIC_BASE_URL` plus a placeholder credential, passed through the server's environment to Claude Code | 8001 guide, measured there with Claude Code 2.1; the server keeps the caller's environment for Claude |
| Codex | **Probably** (Codex config can set a provider base URL); with ChatGPT login the traffic and token format differ | Not verified |
| Native AutoByteus providers | **No, not today.** Base URLs are fixed in code (`openai-llm.ts:9` `https://api.openai.com/v1`, `deepseek-llm.ts:57` `https://api.deepseek.com`; `anthropic-llm.ts:284` builds the SDK client without a base URL, so only the SDK's own `ANTHROPIC_BASE_URL` default could redirect it). Workaround: a custom OpenAI-compatible provider whose Base URL is the relay. Proper route: a base-URL override (FU-003). | Code read |
| Grok, Antigravity | Unknown or no (and see terms below) | — |

## Provider terms: the subscription question

Anthropic's Legal and Compliance page, read again on 2026-11-17 (https://code.claude.com/docs/en/legal-and-compliance):
- **Allowed:** "Nor does it prevent an end user from signing in to the unmodified Claude Code binary with their own Claude subscription, including where a platform hosts Claude Code." The Help Center (update of 2026-10-07, from the 234 report) says the Agent SDK and `claude -p` can use the subscription limits.
- **Not allowed:** "Anthropic does not permit third-party developers … to route requests through Free, Pro, Max, or Ultra plan credentials on behalf of their users. Moreover, developers may not collect, store, or intermediate Claude.ai credentials or session tokens — sign-in to a Claude account must complete through Anthropic's own flow."
- **Limits:** "Advertised usage limits for Pro, Max, and Ultra plans assume ordinary, individual usage of Claude Code and the Agent SDK." Enforcement may come "without prior notice".

What this means for the relay:
1. **The relay with API keys is clean.** The page explicitly allows keys kept "in a … secrets manager … for use by the customer's own authorized users". This is the vault-plus-relay design above.
2. **As an AutoByteus product feature, the relay with a subscription login is not allowed.** The relay reads the login's session token out of Claude Code's credential file and attaches it to requests from another process. That is what the page forbids developers to do: "intermediate … session tokens", "route requests through … plan credentials on behalf of their users". AutoByteus must not ship this for users.
3. **For the founder's own evaluations on his own account, it is a grey area, not clearly allowed.**
   - In its favour: it is his account and his use, and the client inside is the unmodified Claude Code binary.
   - Against it: the sandbox's Claude Code never signs in through Anthropic's flow (it holds a placeholder), and the token is taken from another installation's credential file. In January 2026 Anthropic enforced its terms against tools that extracted Claude Code OAuth tokens for other clients (The Register, 2026-02-20, in the 234 report).
   - Hundreds of automated evaluation runs can also go beyond "ordinary, individual usage", and enforcement can hit his main account without notice.
4. **The documented subscription route for unattended use is `claude setup-token`.** It is Anthropic's own browser flow and gives a one-year token "for CI pipelines and scripts" that "authenticates with your Claude subscription" (https://code.claude.com/docs/en/authentication). Given to the unmodified Claude Code as `CLAUDE_CODE_OAUTH_TOKEN`, it matches "an end user … signing in … with their own Claude subscription".
   - Cost: the token is then inside the sandbox, so the agent can read it, as with API keys in 484. A relay that attached it from outside would be back in the grey area of point 3.
   - Advantage over reading `~/.claude/.credentials.json`: no 8-hour renewal problem.
5. **Other providers (234):**
   - **Codex** with the ChatGPT login is allowed "for local or open-source" apps, "never … for commercial or hosted services". Routing it through a relay is not described anywhere; same grey area.
   - **Antigravity** on a consumer Google login inside a third-party app is "not supported" and a ToS violation. A relay does not change that; use a Gemini API key.
   - **Grok:** nothing found either way.

The 8001 bench has already run "several hundred agent runs" this way, so this applies to current practice, not only to a plan.

## Recommendation

- **The relay complements the vault; it does not replace it.** Adopt its isolation (bwrap, private process list, two doors, egress log) on top of the 484 fresh container. Keep the credential on the relay side of the sandbox.
- **Credentials, by terms:**
  - API keys from the vault through the relay: clean; this is the default for sandboxed evaluations.
  - Subscription for Claude, if the founder wants to save API cost: use `claude setup-token` (Anthropic's flow) given to the unmodified binary. Accept that it is readable inside the sandbox, use it only for trusted agents, and keep run volume to individual-use levels.
  - Do not build a subscription-token relay into AutoByteus. Using it for his own runs is his decision. If he wants certainty, the 234 report has a draft letter to Anthropic sales, which the legal page names as the place to ask.
- **Order of work, if he wants a build:**
  1. The 484 script (vault in a fresh container), as it is: works today for native, Claude and Codex.
  2. Add the relay layer for Claude first, since `ANTHROPIC_BASE_URL` already works.
  3. Then native providers after a base-URL override (FU-003). Then Codex.

## Decisions for the founder

| ID | Question | Recommendation |
| --- | --- | --- |
| DEC-002 (revised) | Which Claude credential for sandboxed evaluations? | API key through the relay (clean). If subscription: `claude setup-token`, not a relay that attaches the login's token. |
| DEC-006 | Add the relay isolation layer to the sandbox build? | Yes, after the plain 484 script, starting with Claude |
| DEC-007 | Keep using the 8001 subscription-token relay for his own evaluations? | His call. It is a grey area under Anthropic's page; moving it to `setup-token` or an API key removes most of the risk. |
