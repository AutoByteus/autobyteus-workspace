# Requirements Document: autobyteus-581

## Document Status

- Status: **Approved** (SR-005): REQ-001 to REQ-016 (SR-002), REQ-010 as revised by DEC-110, REQ-017 (DEC-111), REQ-018 (DEC-112), REQ-009 with shared folders (DEC-113).
- Current solution revision: SR-005
- Package identifier: `sandbox-provider-relay-581`
- Request / ticket: autobyteus-581, "Provider relay through a paired node and disposable sandbox nodes"
- Requested by: `/project_task_manager`, carrying the user's direction from autobyteus-484 (DEC-008 to DEC-019 in [history-484/requirements-doc.md](history-484/requirements-doc.md))
- Requirements owner: Solution Designer
- Date: 2026-11-26
- Approved by and reference: **the user**, 2026-11-26, in the Solution Designer's conversation. He answered DEC-105 and DEC-108, decided DEC-109, and approved the rest ("that's okay for me … let's do it this way").
- Behavior-defining supplements: [history-484/sandbox-relay-data-contract.md](history-484/sandbox-relay-data-contract.md) (draft contract; it becomes part of the design and is revised there with this ticket's findings)

## Problem And Desired Outcome

- **Problem:** evaluations and other untrusted or parallel agent work need a fresh, sealed AutoByteus node per run. Today a fresh node either has no model access, or holds real credentials that its agents can read (measured in 484). Nothing creates, isolates or removes such nodes for an agent.
- **Affected:**
  - the user's own node (host node and relay node);
  - sandbox nodes;
  - evaluator agents (agents-101);
  - every agent runtime: native, Claude Agent SDK, Codex, Grok Build, Antigravity, DeepSeek Harness.
- **Desired outcome:**
  1. A node can be set to send every runtime's model calls through a **paired relay node**, which adds the credential. No credential is ever on the relayed node.
  2. A **sandbox** (a fresh node from the server image, paired, relayed, network-limited, with mapped folders, expiring) can be created, used and removed by an agent through three tools.
- **Observable success:** an evaluator creates a sandbox, has an agent package answer a request in it through a real provider, reads the result and transcript from the mapped folders, and removes it. A scan of everything the sandbox wrote, and of its processes' environments, finds no credential. Without the relay setting, every node behaves exactly as today.

## Relevant Current And Desired Behavior

| ID | Kind | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | Contract | Runtimes call providers directly, with the node's own vault key or the runtime's own login; only DeepSeek Harness goes through the local provider relay (credential_proxy.md) | With the relay peer setting, every supported runtime's model calls go through the local provider relay to the paired relay node | Setting empty: unchanged for every runtime |
| BEH-002 | Contract | The provider relay attaches the node's own vault key | The relay node attaches its API key; or, only when its login-token switch is on and a login token exists, the login token | The DeepSeek relay as today on a node without the setting |
| BEH-003 | System | Runtime status reads each runtime's own sign-in (`claude auth status`, `codex` account, `grok models`); Claude reads SIGNED_OUT in api-key mode (FU-001) | A relayed runtime shows signed in when the relay node has its credential, and signed out with the reason otherwise; Claude api-key mode with a vault key shows signed in | Other runtimes' readings unchanged |
| BEH-004 | Contract | Native providers use fixed base URLs (FU-003) | On a relayed node, native provider calls use the relay | Unrelayed native calls unchanged |
| BEH-005 | User / Operational | No current supported behavior. Proposed trigger: an agent calls `create_sandbox`. | A sandbox is created as described | — |
| BEH-006 | Operational | No current supported behavior. Trigger: `exec`, `destroy_sandbox`, expiry, host-node start. | Sandboxes are used and always removed | — |
| BEH-007 | Contract | Pairing and peer calls exist; remote collaboration is off by default | A sandbox pairs with its host automatically; the host's switch must be on | Pairing rules NA-5, NA-9, NA-10 and NA-11 unchanged |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | A node with the relay peer setting runs agents on every supported runtime, with credentials attached only by the paired relay node | SCN-001, SCN-005 |
| UC-002 | The relay node's owner switches login tokens on; supported runtimes then run on the owner's subscription through the relay (off by default) | SCN-002 |
| UC-003 | An agent creates a sandbox with agent packages to evaluate; it is paired, relayed, network-limited, with fresh mapped folders | SCN-003 |
| UC-004 | The agent delegates work to the sandbox, runs checks inside it (`exec`), reads the mapped folders, and removes it | SCN-003 |
| UC-005 | Sandboxes are removed on destroy, at expiry, and at host-node start | SCN-004 |
| UC-006 | Runtime status reflects the relay, and Claude api-key mode (FU-001) | SCN-001 |
| UC-007 | The owner sets the relay peer setting on a paired node they manage themselves | SCN-005 |

### Out Of Scope

- A native-runtime sandbox on the user's own machine (DEC-018).
- Revisiting Codex full access under auto-execute (DEC-018).
- A UI for sandboxes. Agents use tools; the owner uses advanced settings.
- **Implementing** sandboxes on hosts other than macOS with Docker Desktop. The design covers them; their implementation is a follow-up (DEC-105, FU-581-02).
- Micro-VM sandboxes.
- Spend or usage limits per sandbox (no reader yet).
- Antigravity in relayed nodes and sandboxes (DEC-101).

### Non-Goals

- Isolating agents from each other inside one sandbox.
- Protecting against a container escape.
- Making login-token use legal for every provider. It stays off; the user decides when to use it.

### Preserved Behavior Boundary

- BEH-001 to BEH-004, "setting empty" columns.
- The node access model NA-1 to NA-15, including pairing, signatures and revocation.
- The test vault contract.
- DESIGN rule 9 (one release across nodes).
- Existing provider relay refusals and logging (no pass or header value logged).

### Prerequisites

None. FU-001, FU-002 and FU-003 are part of this ticket by the Task's scope.

### Review Authority

As in the template: every blocking finding cites a REQ, AC or BEH ID; new behavior is a Requirement Gap for the user.

## Requirements

| ID | Requirement | BEH | Priority | Feasibility evidence | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A node has a relay peer setting naming a **paired** peer by node ID. When set, every supported runtime's model calls on that node go through the paired peer, and the node never uses its own vault credentials or runtime logins for model calls. When empty, nothing changes. | 001 | Must | P-3, P-5, P-7 (runtimes follow a relay URL); peer signing exists | DEC-008, DEC-009, DEC-015 |
| REQ-002 | Each relayed call is signed by the peer secret and accepted only from a paired peer. A call from an unpaired, revoked or unknown node is refused before any provider call. | 001, 007 | Must | NA-9 verifier | DEC-015 |
| REQ-003 | The relay node attaches its own API key for the relay's provider, or, with its login-token switch on and a login token configured for that runtime, the login token. Whoever sets up the relayed node gives it, **at start**, the credential kind per runtime: the sandbox manager reads the relay node's switch, or the owner sets it on a node they manage; the default is API key. The runtimes are launched in that kind's request shape. The relay node checks each call's declared kind against its current switch and refuses a mismatch with a clear reason (no silent swap). | 002 | Must | P-3 vs P-4, P-5 vs P-6 | DEC-010, DEC-109 |
| REQ-004 | Supported runtimes through the relay. **API key:** native AutoByteus, Claude Agent SDK, Codex, Grok Build, DeepSeek Harness. **Login token** (built, off by default): Claude, Grok. Codex: not supported (DEC-116). Antigravity: not supported on a relayed node (DEC-101). | 001, 002, 004 | Must | P-3 to P-8; FU-003 for native | DEC-010, DEC-012, DEC-101 |
| REQ-005 | Login-token sources on the relay node. **Claude:** a vault entry filled from a `claude setup-token` token through an explicit operator command, never the plain-text settings. **Grok:** the relay node's own runtime login (Codex: not supported, DEC-116), read when needed and **never renewed by AutoByteus**; an expired one is refused with a message to sign in again. | 002 | Must (built; off) | Codex and Grok login files present (key names); Claude setup-token documented | DEC-017, DEC-102 |
| REQ-006 | The login-token switch is an advanced setting, off unless set; no visible UI. | 002 | Must | — | DEC-009 |
| REQ-007 | The relay node keeps one log line per relayed call, refusals included: time, peer node ID, relay, credential kind, method, path, status or refusal code, duration. Never a header value, body, key, token or pass. | 001 | Must | — | contract C5 |
| REQ-008 | Runtime status on a relayed node shows each relayed runtime as signed in when the relay node has its credential, and signed out with the reason otherwise. Claude in api-key mode with a vault key shows signed in, so launch checks and the Model Router accept it. | 003 | Must | Code read (FU-001) | FU-001 |
| REQ-009 | An agent granted the sandbox tools creates a sandbox, which is: a fresh node from the server image of the host node's own release; paired with the host node; relaying to the host node; given fresh workspace and run-memory folders on the host computer; holding copies of the requested agent packages, imported; with the requested shared folders mounted read-only (DEC-113); with a lifetime. The result names the sandbox, its peer name, its folders, the packages' agent and team addresses, and its expiry. | 005, 007 | Must | P-12; pairing candidates (code); DESIGN rule 9 | DEC-013, DEC-014, contract O-6 |
| REQ-010 | A sandbox has full network access (internet, local network, host computer) like a normal container. On the host node it is a normal paired peer (REQ-017). | 005 | Must | P-1, P-2 (Docker default) | DEC-110 |
| REQ-011 | No credential ever enters a sandbox: no key, login token, node credential or peer secret of the host node in its image, environment, files or processes. | 005 | Must | Relay design; 484 scan | DEC-008 |
| REQ-012 | `run_in_sandbox` runs an argument list inside a sandbox with a time limit and returns the exit code and capped output. `destroy_sandbox` removes it. Only the creating run may use or remove a sandbox; expiry and the start sweep remove the rest (DEC-117). | 006 | Must | `docker exec` (P-12) | DEC-013 |
| REQ-013 | Every sandbox is removed at its expiry, and every sandbox from before a host-node start is removed at that start. Removal unpairs it and removes its containers, network and volumes, and keeps its folders. | 006 | Must | — | DEC-019 |
| REQ-014 | Limits per host node: at most 4 sandboxes at once; lifetime default 120 min, maximum 480; memory 6 GiB and 4 CPUs per sandbox. When Docker is unavailable, remote collaboration is off, or the platform is not supported, `create_sandbox` refuses with a clear reason and creates nothing. | 005 | Must | Image and run sizes (484: about 450 MB per sandbox) | DEC-019, DEC-104, DEC-105, DEC-106 |
| REQ-015 | Files the evaluator reads from mapped folders are read without following symbolic links out of the folder. | 006 | Must | P-11 | contract V-7 |
| REQ-016 | The sandbox tools are granted per agent through the agent definition's tool list. | 005 | Must | Agent tools model (code) | DEC-107 |
| REQ-017 | A sandbox is a normal paired peer of its host: it has the same peer rights as any paired node, with no sandbox-specific limits (DEC-111, revised). The host marks the peer as a sandbox only for its own lifecycle (label, cleanup). | 005, 007 | Must | — | DEC-111 |
| REQ-018 | A public skill `autobyteus-sandboxes` in the AutoByteus public skill package (`AutoByteus/autobyteus-skills`) teaches an agent to use sandboxes: when to use one; the three tools and their results; preparing inputs in the workspace folder; delegating with `delegate_task(node: <sandboxId>)`; reading results and transcripts from the mapped folders without following links; checks with `run_in_sandbox`; always destroying; the refusals and their meaning; what a sandbox cannot do (Antigravity, media tools); that a sandbox is a normal paired peer of its host (DEC-111); never putting secrets into the workspace folder. It matches the tools exactly and ships with them. | 005, 006 | Must | — | DEC-112 |

## Acceptance Criteria

| ID | REQ | Trigger | Expected | Failure outcome | Verification intent |
| --- | --- | --- | --- | --- | --- |
| AC-001 | 001, 002, 004 | A paired node with the relay setting runs a turn on native (one provider), Claude, Codex and Grok, all with API keys | Each turn completes; the relay node's log shows one line per call with `apiKey`; the relayed node has no provider key in its vault | — | Live, test vault on the relay node (two nodes on one machine) |
| AC-002 | 001 | The setting is empty | The same runtimes call providers directly as before | — | Existing suites, plus one live check |
| AC-003 | 002 | A call signed by an unpaired node, a call after unpairing, and a call with a bad signature | Refused before any provider call; the run shows the refusal | No silent fallback to local credentials | Automated |
| AC-004 | 003, 005, 006 | Login-token switch off (default), with a Claude login token stored | API key attached; log `apiKey` | — | Automated |
| AC-005 | 003, 005 | Switch on, login token stored for Claude or Grok | The relayed node runs the runtime in its login-token request shape; the relay node attaches the login token; log `loginToken`. An expired Grok login is refused with "sign in again". | — | Automated with recorded request shapes, **and live per runtime** (DEC-108) |
| AC-006 | 007 | Any relayed call | One log line, with no secret in it | — | Automated scan of the log |
| AC-007 | 008 | Relayed node, relay node with or without the credential; and Claude api-key mode with a vault key | Status signed in, or signed out with the reason; Model Router and launch checks accept a signed-in relayed runtime | — | Automated |
| AC-008 | 009, 011, 016 | A granted agent calls `create_sandbox` with one package | Within the documented time, a sandbox exists: paired, relayed, packages imported, folders created, result as specified | A refusal names its reason and leaves nothing behind | Live |
| AC-009 | 010 | From inside a sandbox | The internet answers; the host node is reachable as a paired peer | — | Live |
| AC-010 | 011 | After an evaluation run with tools | A value scan of the sandbox's files, mapped folders and process environments finds no credential of the relay node | — | Live (leak scan) |
| AC-011 | 009, 012, 015 | An evaluator delegates a request to the sandbox's agent, runs `exec`, reads results and transcript, and destroys the sandbox | The result arrives by delegation; files are read from the folders; a planted link is not followed; after destroy, no container, network, volume or pairing remains | — | Live end to end (the Task's "done when") |
| AC-012 | 012 | Another agent's run tries `exec` or `destroy_sandbox` on a sandbox it did not create | Refused | — | Automated |
| AC-013 | 013 | Expiry passes; the host node restarts with sandboxes alive | Each is removed as in AC-011; folders are kept | — | Automated, plus one live restart |
| AC-014 | 014 | A fifth sandbox; Docker stopped; remote collaboration off; an unsupported platform | Each is refused with its reason; nothing is created | — | Automated |
| AC-015 | 017 | A sandbox agent answers the host run that delegated to it, with a file | The answer and the file arrive, as between any paired nodes; the host's Nodes page labels the peer as a sandbox, and the start sweep unpairs orphaned sandbox peers | — | Live |
| AC-016 | 018 | An agent with the three tools and the skill, and no other instructions, is asked to evaluate a package in a sandbox | It creates the sandbox, delegates, reads the result and transcript from the folders, and destroys the sandbox; no step contradicts the skill; the skill's tool names, fields and refusal codes match the implementation | — | Live (one run), plus a review of the skill against the tool contracts |

## Relevant Scenarios And Journeys

| ID | Kind | Actor | Goal | Trigger | Steps | Outcome | Alternate / error | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Owner, then runs | Run agents on a node that holds no credentials | Relay peer setting set on a paired node | A run starts → the node asks the relay node which kind applies → the runtime is launched in that shape against the local relay → calls are relayed and signed → the provider answers | Turns complete; the relay node logs them | Peer unpaired, credential missing or expired: the run fails with the reason | Supported Normal | DEC-008, DEC-015 |
| SCN-002 | Operational | Relay node's owner | Use the subscription instead of API billing | Login-token switch set, token stored | As SCN-001, with the login token | — | Expired Codex or Grok login: refused | Supported Explicit Edge (built, off by default) | DEC-010, DEC-017 |
| SCN-003 | User (agent) | Evaluator agent | Evaluate an agent package in a sealed node | `create_sandbox` | create → copy inputs to the workspace folder → delegate → read folders → `exec` checks → destroy | Results and transcripts on the host; no credential inside | Refusals per AC-014 | Supported Normal | agents-101; DEC-013, DEC-014 |
| SCN-004 | System | Host node | Never leave sandboxes behind | Expiry, start | Remove and unpair | Clean host | — | Supported Normal | DEC-019 |
| SCN-005 | Operational | Owner | A Docker node they manage, relayed | Pair, then set the setting | As SCN-001 | — | — | Supported Normal | DEC-008 (W5) |
| SCN-X | — | — | A sandbox relaying to a node other than its host; nested sandboxes; Antigravity in a sandbox | — | — | — | — | Technically Possible but Unsupported | contract § 4 |

## UI, Interaction, And Experience Requirements

- Applicable: No. N/A: not applicable. Agents use tools; the owner uses advanced settings and the operator command for the Claude login token.

## Quality And Non-Functional Requirements

| ID | REQ / AC | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | AC-008 | Performance | `create_sandbox` ready in ≤ 90 s on this Mac (484 measured 20–28 s for a bare node; pairing and package import add to it) | Live timing |
| QR-002 | AC-001 | Performance | The relay adds ≤ 1 s to a call's time to first byte on one machine | Live timing |
| QR-003 | REQ-011 | Security | No secret in any log line, tool result or error text | Automated scans |
| QR-004 | REQ-001 | Reliability | Relayed bodies up to 32 MiB are accepted (large contexts) | Automated |

## Data Continuity And Acceptable Loss

- Persisted data affected: **Yes, new data only.**
  - Host node: the sandbox list; the relay activity log.
  - Relay node: the Claude login-token vault entry.
  - Both nodes: settings in `.env`.
- Existing data: no change. A missing new file means empty.
- Loss of the sandbox list is acceptable: the host-node start sweep also finds sandbox containers by label.

## External Contracts And Dependencies

| Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Claude Code | `ANTHROPIC_BASE_URL`; `ANTHROPIC_API_KEY` sends `x-api-key`; `CLAUDE_CODE_OAUTH_TOKEN` sends Bearer plus the OAuth beta | P-3, P-4 | Header changes in new versions |
| Codex | Custom `model_providers` with `base_url`/`env_key` (Bearer); ChatGPT mode follows `chatgpt_base_url` and sends `chatgpt-account-id` | P-5, P-6 | U-1 |
| Grok Build | `GROK_XAI_API_BASE_URL`; Bearer | P-7 | U-2 |
| Antigravity | No endpoint override | P-8 | Not supported (DEC-101) |
| Docker Desktop (macOS) | Internal networks publish no ports; `host.docker.internal` reaches host loopback services; mapped files are owned by the user | P-1, P-9, P-10, P-11 | Linux and Windows differ (DEC-105) |
| Node 22 `fetch` | Honors proxies with `NODE_USE_ENV_PROXY=1` (experimental) | P-9 | R-1 |
| Provider terms | Login tokens off by default; Antigravity excluded | history-484/relay-comparison.md | User's decision |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user's desktop node publishes its server URL as loopback, so it offers `host.docker.internal:<port>` as a candidate | Pairing from a sandbox | Design-phase check of the desktop's `AUTOBYTEUS_SERVER_HOST` | Open |
| ASM-002 | The server image for the host's release exists on Docker Hub | REQ-009 | Release workflow publishes `autobyteus/autobyteus-server:<version>` | To confirm in design |

## Decisions

| ID | Question | Why it matters | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-101 | Antigravity on a relayed node or in a sandbox | `agy` has no endpoint override (P-8), so its calls cannot reach a relay without TLS interception (a private certificate authority trusted inside, and a relay that decrypts Google traffic). | Your rule (484 DEC-010): what can be built is built; what cannot is "not supported". TLS interception could be built, but it is a large security mechanism of its own. **Antigravity is not supported on relayed nodes and in sandboxes** (it says so). Follow-up FU-581-01 if it is ever needed. | Solution Designer (applying the user's DEC-010) | Decided |
| DEC-102 | Source of Codex and Grok login tokens | They have no long-lived token like Claude's `setup-token`. Their logins renew themselves. | Read the relay node's own login file for each call and **never renew it**: renewing from two places invalidates one of them. An expired login is refused with "sign in again in Codex/Grok". Built, off by default. | Solution Designer (within DEC-010) | Decided |
| DEC-103 | How DEC-016 is enforced | Docker's default network reaches the host and the local network (P-2). A rule inside the container can be undone by the agent, which runs as root. | Each sandbox sits on its own internal Docker network. A companion container is the only way out: an egress proxy (internet yes; private ranges no; the relay route yes) and the inbound forward the host uses. P-9 and P-10 measured this. | Solution Designer | Decided (**superseded by DEC-110**: full network, no companion container) |
| DEC-104 | Remote collaboration is off by default; pairing needs it on | Turning it on is the owner's switch | `create_sandbox` refuses with "Turn on remote collaboration in Settings" when it is off on the host node. Sandbox nodes have it on. | Solution Designer | Decided |
| DEC-105 | **Supported host platforms for sandboxes** | Measured only on macOS with Docker Desktop. On Linux, a node bound to 127.0.0.1 is not reachable from containers. Windows is untested. | **Recommend:** macOS with Docker Desktop in this ticket; other platforms refuse with "not supported yet" (follow-up FU-581-02). The relay setting itself (REQ-001) works on every platform. | User | **Decided (user)**: "that's okay for me … you provide a design for different platform and a contract and you only do for the current Mac … leave the other ones at the follow-up but you also validate your design." macOS with Docker Desktop is implemented and verified here. The design and its contract cover Linux and Windows hosts and are validated by walks, so the follow-up (FU-581-02, which the PM can give to a Linux node) starts from a ready design. |
| DEC-106 | Limits and image | Resource safety; DESIGN rule 9 | At most 4 sandboxes at once; lifetime 120 min default (max 480); 6 GiB and 4 CPUs each. The image is the host node's own release tag, so the sandbox runs the same version (rule 9). A development build without a published image refuses with that reason. | Solution Designer (DEC-019) | Decided |
| DEC-107 | Who may use the sandbox tools | They start machines and spend money | Granted per agent through its tool list, like other server tools. Only the creating run, or the owner, may use or remove a sandbox. | Solution Designer (DEC-019) | Decided |
| DEC-108 | **How login-token mode is proven** (AC-005) | A live proof needs your real subscription logins, which are credentials. | **Recommend:** automated tests with the request shapes recorded in P-4, P-6 and P-7, with no real login used. Plus, only if you want it, one live check per runtime after you add a Claude `setup-token` to the test vault (`pnpm test-vault setup`) and agree that the Codex and Grok checks may read your logins once. Untested otherwise: the providers' acceptance of the relayed login (U-1, U-2). | User | **Decided (user)**: "of course we need to prove both, one is API key and another one is login token." Both kinds are proven live. Claude: the user adds a `claude setup-token` token to the test vault once. Codex and Grok: the validation's relay test node reads the user's own logins for those checks only, never renewing them. All results are value-free. |
| DEC-109 | How the relayed node learns the credential kind | Runtimes must start in the matching request shape | The user, 2026-11-26: "who is starting the sandbox should provide this kind of variable … when you start the sandbox you should already provide all those variables." Decided: the kind per runtime is a start variable of the relayed node. The sandbox manager takes it from the relay node's switch at creation; on a self-managed node the owner sets it; the default is API key. The relay node stays the authority: a call whose declared kind no longer matches its switch is refused ("the relay node's login-token setting changed; create a new sandbox"). This replaces the per-run question to the relay node. | User | Decided (user) |
| DEC-110 | The sandbox's network (replaces 484 DEC-016 and DEC-103) | Simplicity vs. limiting what an evaluated agent can reach | The user, 2026-11-26: "I personally wouldn't make it too complicated in the beginning … two containers is too complicated … I would personally allow all the network in the beginning … so we don't have the companion gateway." Decided: **full network by default**; one container per sandbox on Docker's normal network; no egress proxy or companion container. Protection on the host stays: credentials on every node request (NA-1), the relay, and the sandbox peer rule (AR-001). Accepted exposure: devices and services on the host's network or computer that have no authentication of their own. A restricted-network mode is a later option (FU-581-05). | User | Decided (user) |
| DEC-111 | What a sandbox may do on its host node (architecture review AR-001) | A paired peer may call every peer route (NA-7). An evaluated agent could start or steer host runs, which hold the host's credentials and files, through normal `delegate_task` / `send_message_to`. UC-004 still needs the sandbox to answer its delegators. | Option A: the host marks the peer as a sandbox in its own peer record and accepts from it only the relay, answers to runs that delegated to it, and the availability check. The rule lives on the host, never in the sandbox (the agent is root there). Option B: all peer routes, risk accepted. **Recommend A.** | User | **Revised by the user to option B** (supersedes the earlier option A record). The user, 2026-11-26: "the sandbox is able to communicate with the node which it is paired with, and I also don't want to add a lot of weird logic … that limits the sandbox agents … our whole application is like … the nodes which are paired are able to communicate with each other." A sandbox is a normal paired peer: it may call every peer route, like any paired node. **Accepted risk:** an agent under evaluation can start or message agents on the host node through the normal collaboration tools, and those agents hold the host's credentials and files. A sandbox-restricted mode is a possible later option (FU-581-06). |
| DEC-112 | A skill for using sandboxes | Tools say what they do; a skill says how to use them well (order, folders, pitfalls) | The user, 2026-11-26: "it's better to have a skill … in the skill we can write how to use the tool … we can put the skill in our public skill package." Decided: a public skill `autobyteus-sandboxes` in `AutoByteus/autobyteus-skills`, written against the final tool contracts and delivered with this ticket (its own branch and pull request in that repository). The evaluation skill (agents-101) then points to it instead of repeating it. | User | Decided (user) |
| DEC-113 | Folders the agent may give a sandbox | Large inputs without copying; safety of the user's data | The user, 2026-11-26: "share the folder … that's actually more practical … I like to share the folder. Agent packages works as well." Decided: `create_sandbox` takes `agentPackages` (copied, imported), optional `sharedFolders` [{path, name}] mounted **read-only** at `/home/autobyteus/shared/<name>` (P-14: writing and deleting refused even as root), and optional `lifetimeMinutes`. The relay is always the creating node and is not a parameter. A shared folder may not be, or contain, the user's home folder or a credential or app-data folder (refused). | User | Decided (user) |
| DEC-114 | Which paired peers may use the relay node's credentials (architecture review R-I) | REQ-002 lets **any** paired peer use the relay. A user's other paired nodes, or a colleague's node paired for delegation, could then spend the user's keys and login tokens. | **Recommend:** the relay serves sandbox peers automatically, plus only the peers the owner lists on the relay node (advanced setting `AUTOBYTEUS_PROVIDER_RELAY_ALLOWED_PEERS`, node IDs; needed for UC-007's self-managed node). Any other peer gets `RELAY_PEER_NOT_ALLOWED`. Alternative: keep "any paired peer". | User | **Decided (user):** any paired peer may use the relay (REQ-002 unchanged), by the same principle. The user, 2026-11-26: "the sandbox is able to communicate with the node which it is paired with, and I also don't want to add a lot of weird logic … that limits the sandbox agents … our whole application is like … the nodes which are paired are able to communicate with each other." |
| DEC-115 | Codex login token through the relay (implementation IR-001, U-1, evidence IMP-10) | Live: Codex's side calls go through the relay, but the model call never does. It first tries a Responses WebSocket (not relayed), then fails with "selected workspace missing from routing discovery", because its placeholder account ID differs from the real account list. | Your rule (484 DEC-010): build what can be built, otherwise "not supported". The fix is small: give the sandbox, at start, the relay node's real ChatGPT **account ID** (an account identifier, not a credential), and turn off Codex's Responses WebSocket transport for the relayed app-server (its `responses_websockets` feature flags). **Decided:** do that, prove it live once. If either part does not work (no flag stops the WebSocket, or the account check still fails), Codex's login token is **not supported**: the relay offer never lists `codex_app_server`, and the result is reported to the user. The API-key mode is unaffected (IMP-08). | Solution Designer (applying the user's DEC-010; user informed) | Decided |
| DEC-116 | Codex login token after the DEC-115 live check (IR-002, IMP-11, IMP-12) | With the real account ID and `openai_base_url` on the relay, the account check passes and model listing goes through the relay (28 calls, 200). But Codex 0.171 refuses the model call: "workspace backend must use an HTTPS origin without credentials". The relay is plain HTTP on loopback; HTTPS would need a certificate authority the sandbox trusts, which is outside the design. The WebSocket flags are removed in 0.171. | By the user's rule (484 DEC-010) and DEC-115's fallback: **Codex login token not supported.** `codex_app_server` is never a login-token runtime, and the Codex login-token path is removed. Codex in sandboxes and relayed nodes uses the relay node's API key (IMP-08). Reported to the user. | Solution Designer (DEC-010, DEC-115 fallback; user informed) | Decided |
| DEC-117 | Who may use or remove a sandbox (code review CR-001) | REQ-012's "or the owner" had no product surface: the owner has no sandbox UI; agents use the tools. | Only the creating run may run commands in or remove its sandbox. Expiry and the host-start sweep remove everything else, so nothing is left behind. Recorded as implementation deviation 10. | Solution Designer (within DEC-019) | Decided |
| DEC-118 | Evidence decision, AC-005 live part, Claude and Grok login tokens (API/E2E request, round 1, code d624f09ce6) | The user explicitly required both kinds proven live (DEC-108: "of course we need to prove both"). The proof needs the user's credentials: a Claude `setup-token` in the test vault, and a fresh Grok login that DEC-102 forbids us to renew. | **Arrange the safe environment, option (a):** the user adds the setup-token to the test vault and uses Grok once. API/E2E then runs `probes/sandbox-live-smoke.mjs --login-tokens --runtimes=claude_agent_sdk,grok_build` (value-free). Not accepted as unverified risk, because the user asked for live proof. Until the user is ready, AC-005 stays "Not Tested" and the round continues. If the user is still not ready when the ticket reaches delivery, delivery takes it to the user as a user check (option c), never silently dropped. Evidence today: unit request shapes, the two-node integration test, IMP-09. | User (DEC-108), applied by the Solution Designer | Decided (waiting for the user's action) |
| DEC-119 | Evidence decision, AC-005 live part: supersedes DEC-118 | The user reconsidered, 2026-11-27: "I wouldn't consider it as a risk … I can test it any time … as long as you tested the sandbox works [with the] API key and my normal functionality works." | **Accepted unverified, by the user.** Untested scope: whether Anthropic and xAI accept a login token attached by the relay node (Claude C9, Grok C10). Evidence: unit request shapes, the two-node integration test with the real gate and handler (loginToken route and refusals), IMP-09. Bounds: login tokens are off by default (C2); API-key mode is proven live (AC-001, AC-005 apiKey part). The user can prove it any time by switching it on (FU-581-08). | User | Decided (user) |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| 001, 002 | 001, 007 | 001, 007 | 001, 002, 003 | 001, 005 |
| 003, 005, 006 | 002 | 002 | 004, 005 | 002 |
| 004 | 001 | 001, 004 | 001 | 001 |
| 007 | 001 | 001 | 006 | 001 |
| 008 | 006 | 003 | 007 | 001 |
| 009, 011, 016 | 003 | 005 | 008, 010 | 003 |
| 010 | 003 | 005 | 009 | 003 |
| 012, 015 | 004 | 006 | 011, 012 | 003 |
| 013 | 005 | 006 | 013 | 004 |
| 014 | 003 | 005 | 014 | 003 |

## Architecture Phase Input

- **Scenarios to map:** SCN-001 to SCN-005.
- **Constraints:**
  - the gate buffers and hashes peer bodies (raise the body limit);
  - one relay per run pass today;
  - the runtime credential header differs by kind (`x-api-key` or Bearer);
  - pairing uses address candidates;
  - DESIGN rule 9;
  - the existing provider relay vocabulary.
- **Deferred to design:**
  - the relay node's route and the "which kind" answer;
  - the per-runtime launch changes;
  - native base URLs (FU-003);
  - discovery (model lists) on a relayed node;
  - the companion container's content and image;
  - the sandbox record and lifecycle;
  - the tool payloads;
  - the operator command for the Claude login token.
- **To verify:** ASM-001, ASM-002; Codex and Grok login-token details (U-1, U-2) within DEC-108.

## Readiness Check

- Content ready for approval: Yes.
- Approval recorded: Yes (the user, 2026-11-26; SR-002, and SR-005 for DEC-110 to DEC-113).
- Approved basis ready for design: **Yes**.
