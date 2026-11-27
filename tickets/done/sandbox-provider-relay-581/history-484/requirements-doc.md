# Requirements Document

## Document Status

- Status: `Ready for Approval`. This is the investigation's result. It is also the proposed basis for a build, which waits for the user (DEC-001).
- Current solution revision ID: `SR-001`
- Package identifier: `test-vault-docker-sandbox-484`
- Request / ticket: autobyteus-484
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-12
- Approved by and reference: not approved. The analysis needs no approval; a build needs the user's DEC-001 to DEC-003.
- Exact approved requirements baseline: N/A
- Behavior-defining supplements: [analysis-report.md](analysis-report.md)

## Problem And Desired Outcome

- Problem: evaluations (agents-101) and some live checks need a fresh, disposable AutoByteus server node with working model providers. A fresh container has no provider sign-in.
- Desired outcome: one documented, safe way to start a fresh server container from the existing image, with the test vault read-only, a node credential, the run's inputs, a leak scan and removal afterwards.
- Observable definition of success: a real agent turn through GraphQL in a fresh container on each supported runtime. No key appears in any command line, environment variable passed from the host, output, image or exported artifact. Nothing of the user's is changed.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | Operational | A server with `AUTOBYTEUS_TEST_VAULT` reads the test vault read-only; works in the `beta` image through a read-only mount (Measured) | Documented and scripted as the sandbox route | Vault read-only; no fallback; the real app data ignores the selector |
| BEH-002 | Contract | Claude Agent SDK `api-key` mode takes `provider.anthropic.api-key` from the vault (Measured) | Used in the sandbox | `cli` mode stays the default elsewhere |
| BEH-003 | Operational | Codex signs in only through its own login (`auth.json`); `--with-api-key` from stdin works (Measured) | Sandbox signs Codex in from the vault through stdin | Codex outside vault governance |
| BEH-004 | Operational | Node credential through local-control-socket setup code and exchange (Measured) | Scripted, kept in memory | NA-1, NA-8, NA-10 |
| BEH-005 | Contract | Grok Build and Antigravity have no vault route (Read + status) | Out of scope unless DEC-003 | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Start a fresh sandbox node with the test vault read-only and a node credential | SCN-001 |
| UC-002 | Run an agent through GraphQL on native, Claude (api-key) and Codex runtimes | SCN-001 |
| UC-003 | Scan for leaked vault secrets, export artifacts, throw the container away | SCN-002 |

### Out Of Scope

- Subscription or OAuth logins in sandboxes.
- Grok and Antigravity vault routes (FU-002).
- The evaluation skill itself (agents-101).
- Changes to the user's running nodes or vault.
- Building or publishing images.

### Non-Goals

- Isolating agents from the keys inside the sandbox.
- Replacing the in-process live suites or `isolated-app`.

### Preserved Behavior Boundary

- The test vault contract in TESTING.md and secret_management.md (read-only, no fallback, value-free status).
- The node access model NA-1 to NA-15.

### Prerequisites

None. The analysis was reached without any; a build needs no product change for UC-001 to UC-003.

### Review Authority

As in the template: findings cite REQ/AC IDs; anything new is a `Requirement Gap`.

## Requirements

| Requirement ID | Requirement | Behavior | Feasibility Evidence | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | One command starts a fresh container from a given server image, with fresh volumes, the test vault mounted read-only, and only the vault's location passed in | BEH-001 | probe-run-1 | Task Q1, Q3 |
| REQ-002 | No provider key, setup code or node credential appears in a command line, a `-e` value, the image, stdout or logs of the script | BEH-001, BEH-004 | probe-run-1..5 | Task Q2 |
| REQ-003 | The script obtains a node credential through the local control socket and the setup exchange, kept in memory | BEH-004 | probe-run-1 | Task Q3; autobyteus-437 |
| REQ-004 | Claude Agent SDK runs from the vault (`api-key` mode); Codex is signed in from the vault through stdin | BEH-002, BEH-003 | probe-run-3, probe-run-5 | Task Q1 |
| REQ-005 | A value-match leak scan (raw, base64, base64url) plus shape patterns runs over every artifact kept from a run, before export; it prints IDs and paths only | — | probe-run-4, probe-run-5 | Task Q2 |
| REQ-006 | The container and its volumes are removed after the run, also on failure | — | probe-run-1..5 | Task Q2 |
| REQ-007 | TESTING.md documents the sandbox, including the Linux copy variant and the key-visibility limits | — | — | Task Q4 |

## Acceptance Criteria

| AC ID | Requirements | Trigger | Expected | Failure Outcome | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | Start the sandbox | Node ready, credential exchanged, GraphQL 200 with the credential and 401 without | A clear error, and the container removed | Run on this Mac |
| AC-002 | REQ-004 | Smoke on native, Claude (haiku) and Codex | TURN_COMPLETED on each | Runtime error reported value-free | Live run |
| AC-003 | REQ-002, REQ-005 | Scan after a run | Clean, except Codex's own `auth.json` inside the container; a planted canary in an exported file is detected | Run marked failed | Live run plus canary |
| AC-004 | REQ-006 | Normal end and a forced failure | No container or volume with the sandbox label left | — | `docker ps -a`, `docker volume ls` |
| AC-005 | REQ-007 | Docs review | TESTING.md section present and consistent | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Steps | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Evaluation run (agents-101) or a live check | Run agents in a disposable node | start → credential → load the run's inputs → runs → results | Results with no side effects | Supported Normal Scenario (Task) | probes 1 to 5 |
| SCN-002 | Operational | Same | Export results safely | scan → export → remove | Clean artifacts only | Supported Normal Scenario (Task Q2) | probes 4, 5 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. N/A: not applicable.

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`. All sandbox data is disposable; the vault is read-only.

## Decisions

| Decision ID | Question | Why It Matters | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Build the sandbox script and the TESTING.md section? | The Task says to build only if the user says so | The probe proves every step and already does most of the work; a build is one small ticket. Recommend yes. | User | Needs user |
| DEC-002 | API keys only (no subscription logins) in sandboxes? | Cost: API billing instead of subscription; security | Copying logins touches the user's real login state (forbidden), cannot be done for the macOS Keychain, risks refresh-token conflicts and Anthropic's third-party policy. Recommend API keys only. | User | Needs user |
| DEC-003 | Add vault-backed api-key modes for Grok Build and Antigravity? | Scope: product change | Needed only if evaluations use those runtimes; it follows the Claude api-key pattern. Recommend deciding when agents-101 needs them. | User | Needs user |
| DEC-004 | Read-only bind mount by default, copy variant on Linux | Simplicity | Measured to work on macOS; the code shows a uid mismatch on Linux. Decided. | Solution Designer | Decided |
| DEC-005 | The scan matches real vault values, not only patterns | Safety | Patterns miss keys without a known prefix; value matching was measured to catch Codex's `auth.json`. Decided. | Solution Designer | Decided |
| DEC-008 | Build a credential gateway (one URL setting on a node; empty = current behavior) instead of only the vault-in-container script? | Scope: new product feature beyond this analysis | The user, 2026-11-21, in the Solution Designer's conversation: "let's build it … for other providers and including login token … we just don't use it is alright." Decided: build it for all providers, API keys and login tokens; login-token use stays off. Supersedes DEC-001/002 (the 484 script becomes part of the new feature) and DEC-006. Open for the new Task: how "off" is enforced, and whether Antigravity's login mode is built at all. | User | Decided (user) |
| DEC-009 | Where the gateway URL (and the login-token switch) is configured | Decides whether the product "offers" login-token use | The user, 2026-11-21: "it's in advanced setting … on the application setting area … you can put any key value there … normally people don't know." Verified: Server Settings has an advanced area that adds custom key/value settings (`ServerSettingsManager.vue`, "Custom setting added"). Decided: the gateway URL and the login-token switch are advanced key/value server settings, with no dedicated UI. Carry into autobyteus-581. | User | Decided (user) |
| DEC-010 | Which runtimes get the gateway's login-token mode | Scope per runtime; provider terms | The user, 2026-11-23: "for the runtime[s] we can implement, we implement; for the runtime we cannot implement then we use … not supported. At least for now we know that only Antigravity is not supported." Decided: every runtime gets login-token support through the gateway where it can be built. A runtime where it cannot be built (technically or by its provider's terms) shows "not supported" for login tokens. Antigravity: not supported (Google forbids its consumer login in third-party apps); it uses a Gemini API key through the gateway. Claude, Codex and Grok: to be built, unless the 581 investigation shows one cannot be. API keys are supported for every runtime. Carry into autobyteus-581. | User | Decided (user) |
| DEC-011 | Build the login-token mode for Antigravity too? (revises DEC-010 for Antigravity) | Provider terms (Google forbids it today); future-proofing | The user, 2026-11-23: "can we also build it for [Antigravity] … do not use it, because who knows, in the future Antigravity [may] change the policy … I think we can build it but we don't use it for now." His technical point holds: runtimes' own sandboxes also send traffic through a proxy over Unix sockets (Claude Code's sandbox uses bubblewrap plus socat to its proxy, and can mask credentials with a placeholder while the proxy adds the real value; code.claude.com/docs/en/sandboxing). Decided: build the login-token mode for every runtime, Antigravity included, all off by the advanced setting. Antigravity's stays off while Google's terms forbid it, and the requirements will say so. Technical feasibility per runtime is for the 581 investigation, for example whether agy's traffic can be redirected without TLS interception. | User | Decided (user) |
| DEC-012 | Antigravity login-token mode (supersedes DEC-011, back to DEC-010) | Provider terms | The user, 2026-11-23: "for Antigravity let's do not build it and just do not support it." Decided: no login-token mode is built for Antigravity; the runtime shows "not supported" for login tokens and uses a Gemini API key through the gateway. Claude, Codex and Grok: login-token mode built, off by default (DEC-010). Carry into autobyteus-581. | User | Decided (user) |
| DEC-013 | Sandbox form and agent access | Scope of 581 | The user, 2026-11-25, answering option A: "Yeah … the easiest way [is] to still use docker … use a container", because agents often need to operate a computer UI, which process-level sandboxes do not give. Decided: a sandbox is a fresh, disposable AutoByteus node from the server image (container, full desktop), managed by one server-side sandbox manager. A sandbox MCP (create, files in/out, run agent, exec, destroy; host-side only, limits, automatic expiry, per-agent grant) is in 581's scope (option A). Carry into autobyteus-581. | User | Decided (user) |
| DEC-014 | How the evaluator reads what the sandbox produced | Simplicity; matches the current evaluation skill | The user, 2026-11-26: give the sandbox a local workspace folder, so the evaluator reads it directly. Checked: the Package Creator's agent-package-evaluation skill already works this way with isolated instances (`workspaceRootPath` = a per-run copy on the host; outputs read from it; transcripts scanned with scan-transcript.py), and the user's Docker nodes already bind-mount host workspace folders. Decided: each sandbox gets a fresh per-run host folder bind-mounted as its workspace (and its run-memory folder exposed for transcripts). The evaluator reads them directly, so `put_files` / `get_files` become unnecessary for evaluations. Precautions for the requirements: a fresh copy per run; never mount the evaluator's own folder (criteria, expected answers); the evaluator does not follow symlinks out of the folder (an agent could plant a link to a host secret); the leak scan runs on the folder before the content is used. Carry into autobyteus-581. | User | Decided (user) |
| DEC-015 | Must the sandbox node and the relay node be paired? | Security of the relay | The user, 2026-11-26: "Of course these two nodes must be paired in order to be the provider relay … we have to make it secure." Decided: pairing is required. The relay setting holds the relay node's node ID, and every relayed call is signed with the peer secret (contract V-1). | User | Decided (user) |
| DEC-016 | Sandbox network | Security | The user, 2026-11-26, to the three questions and the details: "you have a really really good … I trust your reasonable recommendations, thanks a lot." Decided as recommended: internet allowed; the host's home network, the host computer and other nodes blocked, except the route to the relay node; relayed calls logged (C5). Docker-on-Mac enforcement is checked in 581. | User | Decided (user) |
| DEC-017 | Where the relay node keeps a Claude login token (contract O-1) | Security | The user, 2026-11-26, to the three questions and the details: "you have a really really good … I trust your reasonable recommendations, thanks a lot." Decided as recommended: a vault entry filled once from `claude setup-token`, never the plain-text advanced settings; login-token use stays off by default. | User | Decided (user) |
| DEC-018 | Native-runtime sandbox on the user's own machine; revisiting Codex full access when auto-execute is on | Scope | The user, 2026-11-26, to the three questions and the details: "you have a really really good … I trust your reasonable recommendations, thanks a lot." Decided as recommended: a separate, later Task, not part of 581. | User | Decided (user) |
| DEC-019 | Design details within the direction (default lifetime, maximum concurrent sandboxes, memory/CPU limits, per-agent grant of the sandbox MCP, behavior without Docker) | Solution details | The user, 2026-11-26, to the three questions and the details: "you have a really really good … I trust your reasonable recommendations, thanks a lot." The Solution Designer decides them in 581's design and tells the user. | Solution Designer | Delegated by the user |

## Readiness Check

- Content ready for approval: `Yes` (for a build follow-up); remaining: DEC-001 to DEC-003 need the user.
- Approved basis ready for design: `No`. It waits for DEC-001.
