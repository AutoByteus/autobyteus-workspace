# Requirements Document — Credential proxy for integrations, step 1: GitHub (autobyteus-311)

## Document Status

- Status: `Approved` (SR-002; DEC-011 decided by the user at SR-005)
- Current solution revision ID: `SR-005` (requirements approved at SR-002; AC-006 made testable at SR-004 without changing intent; DEC-011 decided by the user at SR-005)
- Package identifier: `integration-credential-proxy`
- Request / ticket: Project Task `autobyteus-311` (step 1 of it), Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's direction of 2026-10-26 and 2026-10-30
- Requirements owner: Solution Designer
- Date: 2026-10-30
- Approved by and reference: **User**, the user, 2026-10-30, after the explanation of how the proxy works: "It's really smart, very smart. I think other requirement already clear now. We started to implement this proxy." Taken as approval of the requirements with the recommended answers to DEC-001…DEC-004. The user was told this so he can correct it
- Exact approved requirements baseline: this document at SR-002
- Behavior-defining supplements: none. `tickets/done/secrets-and-integrations-design/solution-validation.md` (244, V1/V1b) is the validated design basis, read-only.

## Problem And Desired Outcome

- **Problem:** an agent's script or CLI (curl, `gh`, git) can use GitHub only if the token is in its shell, where the agent can read it. autobyteus-244 put MCP server secrets into the vault, but nothing hands a vault credential to a script (investigation BEH-001). The paused GitHub integration (autobyteus-integrations-1) waits for this.
- **Affected actors:**
  - the user, who connects GitHub once;
  - agent runs in all five runtimes and their shells;
  - integration skills (their scripts);
  - GitHub.
- **Desired outcome (the user's words):**
  - an integration is "skill plus authentication";
  - "the proxy service gets those tokens from the vault";
  - many integrations share the one proxy;
  - "the address is replaced": the shell gets the proxy's address, and the AutoByteus server adds the token on the way out.
- **How an agent uses it (the user's question, answered):**
  - **Ordinary bash, no special command.** The agent's shell gets one per-run address, never the token. Scripts call it instead of `https://api.github.com`:
    ```bash
    curl -s "$AUTOBYTEUS_GITHUB_API_URL/repos/OWNER/REPO/issues"
    gh api "$AUTOBYTEUS_GITHUB_API_URL/repos/OWNER/REPO/issues"
    ```
  - git needs no change: inside that shell, `git clone https://github.com/OWNER/REPO.git` goes through the proxy automatically.
  - The AutoByteus server adds `Authorization` with the token from the vault, and only toward GitHub.
  - Jira later gets its own address on the same proxy (`$AUTOBYTEUS_JIRA_URL/rest/api/3/...`), with its own token in the vault.
- **Observable definition of success:**
  - a script in an agent's shell calls the GitHub API and clones a repository through the proxy, using the token from the vault;
  - the token is in no shell environment, output, log or file;
  - the allow-list, the redaction and the audit log are proven.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current behavior | Desired behavior | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | No way to store a GitHub token for scripts | The user stores it once in the node's vault, write-only, and sees Connected (as @login) or Not connected | Provider keys and MCP secrets unchanged | H-4 |
| BEH-002 | System | SCN-002 | A run's shell has no per-run AutoByteus address | A run allowed to use GitHub gets a per-run address in its shell, in every runtime; never the token | The rest of the shell environment unchanged (FU-004 is separate) | Investigation BEH-002 |
| BEH-003 | System | SCN-002, SCN-003 | — | Calls to that address reach GitHub with the token added by the server, within GitHub's hosts and paths only; echoes redacted; each use recorded | — | 244 V1, V1b |
| BEH-004 | System | SCN-004 | — | A wrong, foreign or ended pass, a call outside the allow-list, or a missing token gives a clear refusal; nothing is sent to GitHub | — | 244 V1 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| User | Connect GitHub once; agents work with it safely | The token is never shown again; he decides which agents may use it | No automatic exposure; no secret in logs |
| Agent run | Use GitHub from its scripts | API and git work with ordinary tools | Never holds the token |
| Integration author (autobyteus-integrations) | Write scripts against a stable contract | Documented variable names and behavior | The skill can't change where the token goes |
| Platform skills (autobyteus-141, later) | A per-run identity for scripts | The same run pass can be reused | 141 is not designed yet |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | The user connects GitHub on a node (stores, tests, replaces, removes the token) and chooses which agents may use it | SCN-001 |
| UC-002 | An allowed agent's script uses the GitHub API (REST and GraphQL) through the proxy | SCN-002 |
| UC-003 | An allowed agent's shell uses git over HTTPS with GitHub (clone, fetch, push) through the proxy | SCN-003 |
| UC-004 | The proxy refuses what it must refuse and records every use | SCN-004 |

### Out Of Scope

- the Integrations menu (later step of 311);
- Jira Cloud (later step; it only has to fit the same proxy, REQ-011);
- SSH through an ssh-agent (later step);
- approval prompts for risky actions (DEC-003);
- `gh`'s own commands such as `gh issue list` (DEC-004);
- the GitHub integration skill itself (autobyteus-integrations-1, paused, not touched);
- the vault root key (autobyteus-310);
- what agent shells inherit from the server (autobyteus-219, FU-004);
- the ambient `gh` login on a node (pre-existing);
- platform skills (autobyteus-141).

### Non-Goals

- Protection against a determined agent running as the same OS user on the desktop. This is a stated limit (244 V5; autobyteus-310).
- GitHub Enterprise Server.
- Sign in with GitHub (OAuth device flow); later.

### Preserved Behavior Boundary

- Provider keys and MCP secrets in the vault: unchanged.
- Agent runs without GitHub access: no new variables, no behavior change.
- Existing git and `gh` behavior outside allowed runs: unchanged.

### Prerequisites

None. autobyteus-244 (the vault, delivered) is the base.

### Review Authority

Standard (`ticket-scope.md`).

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The user can store a GitHub token in the node's vault, replace it, remove it, and test it. The surface is per DEC-001. The value is write-only: never returned, shown or logged. The surface shows Connected (with the GitHub login the token belongs to) or Not connected | BEH-001 | Must | The user enters it once | N/A | User 2026-10-30; 244 MREQ-002 pattern |
| REQ-002 | Only the agents the user allowed (DEC-002) get GitHub access. Each of their runs, including team members, in every runtime (AutoByteus, Claude, Codex, Antigravity, Grok), gets in its shell environment: a documented API address (`AUTOBYTEUS_GITHUB_API_URL`) and the git redirection (REQ-004). It never gets the token | BEH-002 | Must | "the address is replaced"; "never hold it" | Native/Claude/AGY/Grok: Read (per-run env exists). Codex: **Measured** (M-1: two threads in one app-server, each with its own value) | User; 244 DEC-001 |
| REQ-003 | A request to that address is forwarded to GitHub's API (REST paths and `/graphql`), with `Authorization` added by the server from the vault. The response is returned as GitHub sent it, except for REQ-007 | BEH-003 | Must | The core of the proxy | Measured (244 V1, dummy service) | 244 V1 |
| REQ-004 | Inside an allowed run's shell, git commands using `https://github.com/...` (clone, fetch, pull, push) go through the proxy with no change to the URL, and git asks for no credentials | BEH-003 | Must | Scripts and agents use git normally | Clone and push: Measured (V1b; M-2). Real GitHub git auth: Basic `x-access-token` (M-3) | 244 V1b |
| REQ-005 | The proxy forwards only to the hosts and paths of the app's own GitHub definition (`api.github.com` API, git smart-HTTP on `github.com`). Anything else is refused. A caller's own `Authorization` or cookie header is dropped, never forwarded. Where the token may go is decided by the app, never by an installed skill | BEH-003, BEH-004 | Must | An installed skill must not be able to send the token elsewhere | Measured (V1 allow-list) | User 244 DEC-010 ("quite dangerous") |
| REQ-006 | A run pass is unguessable, belongs to one run, and works only while that run is active. A wrong, foreign or ended pass is refused. A restored run gets a new pass | BEH-004 | Must | The address in the shell is not the secret, but must be worth only what its run may do | Measured (V1: another run's capability → 403) | 244 §4.3 |
| REQ-007 | If GitHub's response contains the token (an echo), it reaches the caller as `[REDACTED]` | BEH-003 | Must | Defense in depth | Measured (V1) | 244 V1 |
| REQ-008 | Every proxied call is recorded with time, run, agent, integration, method, path without query string, and result status. The record never holds the token, headers or bodies | BEH-003 | Must | Use is not theft: the user can see what agents did | Measured (V1 audit line) | 244 §4.2 |
| REQ-009 | The token appears in no shell environment, command line, process listing, tool output, run trace, server log or file written for the run | All | Must | The user's constraint | Measured in V1 for the env | Task constraints |
| REQ-010 | When GitHub is not connected, or the run's agent has no access, the proxy answers with a clear error ("GitHub is not connected on this node" / "this agent has no GitHub access") and sends nothing to GitHub | BEH-004 | Must | Scripts must fail understandably | N/A | — |
| REQ-011 | The run pass and the proxy are general. Another integration (Jira Cloud next) is added by a new app-owned definition (its own hosts, auth scheme and address variable) on the same proxy. Platform skills (autobyteus-141) can reuse the same run pass as the run's identity | BEH-002, BEH-003 | Should | The user: "many integrations"; one credential model with 141 | N/A (design shape) | User 2026-10-30; PTM 141 note |
| REQ-012 | The contract for integration authors is documented: the variable names, example curl, `gh api` and git calls, errors, and what is not supported (DEC-004) | — | Must | The paused integration builds on it | N/A | — |

## Acceptance Criteria

| ID | REQ | Scenario | Trigger | Expected outcome | Alternate / failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | The user saves a token, then tests it | Shows Connected as the token's login. The value is never returned by the API or the page. Remove → Not connected | Invalid token → "GitHub rejected the token" | Server and web tests; API check that no field carries the value |
| AC-002 | REQ-002, REQ-009 | SCN-002 | An allowed agent's run starts, in each of the five runtimes | Its shell has `AUTOBYTEUS_GITHUB_API_URL` and the git redirection. `env`, `ps` and its files contain no token | A run of a not-allowed agent has neither | Per-runtime e2e; a scan for the token value |
| AC-003 | REQ-003, REQ-007, REQ-008 | SCN-002 | The run's script calls `curl "$AUTOBYTEUS_GITHUB_API_URL/repos/<test repo>/issues/1"` and `gh api` for the same | GitHub's answer for the test issue. One audit record per call. An echo of the token comes back as `[REDACTED]` | — | Live check with the test-vault token (gated) plus a deterministic echo test |
| AC-004 | REQ-004 | SCN-003 | The run's shell runs `git clone https://github.com/<test repo>.git`, then a push | Clone succeeds with no credential prompt. Push goes through the proxy with the token | Not allowed run: git uses the URL as before | Live clone (gated); push against a local git server through the same proxy |
| AC-005 | REQ-005 | SCN-004 | A call to a path or host outside the definition, or with its own `Authorization` | Refused (no upstream call), or the caller's header is replaced | — | Deterministic tests |
| AC-006 | REQ-006, REQ-010 | SCN-004 | An unknown pass; a revoked pass (its run ended or its activation failed); a live pass whose run's agent has no access (never ticked, or unticked since); no token | Refused with the stated error; nothing reaches GitHub | A same-user process that copies a live pass from another run's shell is the stated same-user limit (non-goal; R-1), not a test case | Deterministic tests |
| AC-007 | REQ-009 | All | After AC-002…AC-006 | The token value is found in no log, trace, output or file of the test runs | — | Scan of the run's logs, traces and data root |
| AC-008 | REQ-011, REQ-012 | — | Reading the docs | The contract, examples and limits are written; the design shows Jira as one added definition | — | Doc review |

## Relevant Scenarios And Journeys

| Scenario | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Connect GitHub | The surface of DEC-001 | Not connected | Paste token → save → Test → choose agents (DEC-002) | Connected as @login; chosen agents may use it | Invalid token; Remove | Supported Normal Scenario | Task comment 2 | REQ-001, REQ-002; AC-001 |
| SCN-002 | System | Allowed agent run | Use the GitHub API from a script | The agent runs a skill's script or curl | GitHub connected; agent allowed | Script calls the address → server adds the token → GitHub | API answer; recorded | Errors per REQ-010 | Supported Normal Scenario | 244 V1 | REQ-002…REQ-003, REQ-007…REQ-009; AC-002, AC-003 |
| SCN-003 | System | Allowed agent run | Clone and push a repository | `git clone https://github.com/...` | Same | git → proxy → GitHub | Works without credentials in the shell | — | Supported Normal Scenario | 244 V1b | REQ-004; AC-004 |
| SCN-004 | System | Any shell | A misuse or mistake | Wrong pass, foreign host or path, forged header, ended run | — | — | Refused or header replaced; recorded | — | Supported Explicit Edge Scenario (security contract, 244 V1) | 244 V1 | REQ-005, REQ-006, REQ-010; AC-005, AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, small. One GitHub card (DEC-001) with:
  - a write-only token field;
  - Connected as @login / Not connected;
  - Test, Replace and Remove;
  - the agent access choice (DEC-002).
- No Product Design round: the card follows the existing Settings card pattern (`ProviderAPIKeyManager`, `ClaudeRuntimeCard`). The Integrations menu (a later step) will take it over.
- Product decisions that need the user: DEC-001, DEC-002.

## Quality And Non-Functional Requirements

| ID | REQ / AC | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-005, REQ-006 | Security | The proxy accepts connections from the node itself only (loopback), never from the network, even when remote access is on | Test from a non-loopback address |
| QR-002 | REQ-003, REQ-004 | Reliability | Large and streamed responses (git packfiles, big API pages) pass through without loading the whole body into memory, except where REQ-007 needs to scan text bodies | Clone of a repository larger than a few MB |
| QR-003 | REQ-009 | Privacy | Tests use the test vault and dummy values. The real token lives only in the vault | Evidence scan |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes`, new only:
  - one vault entry (the GitHub token);
  - the access choice;
  - the audit records.
- Must be preserved: every existing vault entry and setting.
- Acceptable: removing the token deletes its vault entry. Audit records may be rotated (size-bounded).

## External Contracts And Dependencies

| Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| GitHub API and git smart HTTP | Bearer token; HTTPS upstream | GitHub docs; V1b | Rate limits |
| `gh` 2.86 | Its own commands need HTTPS to the host | H-1 (Measured) | DEC-004 |
| git ≥ 2.31 | Config through `GIT_CONFIG_COUNT` env | git docs | Docker images with older git |
| Fine-grained GitHub tokens | Can't reach user-owned Projects boards | H-5 (Measured) | Affects the paused integration, not this proxy |

## Supplemental Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| `tickets/done/secrets-and-integrations-design/solution-validation.md` | Validated design basis (V1, V1b) | Read-only input |

## Assumptions

| ID | Assumption | Validation | Status |
| --- | --- | --- | --- |
| ASM-001 | Codex can give one thread's shell its own environment variables | Measured M-1 | Confirmed |

## Decisions

| ID | Question | Why it matters | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Where does the user enter the GitHub token in this step? | Visible product surface; the Integrations menu comes later | (a) A **GitHub card in Settings**, like the provider-key cards; (b) a command line only; (c) build the Integrations menu now | (a) is small and familiar, and the later Integrations menu can take the card over unchanged. (b) is unfriendly. (c) is a later step by the Task. **Recommend (a)** | User | **Approved by the user** 2026-10-30 (the recommendation; see Document Status) |
| DEC-002 | Which agents may use GitHub? | Security; "no automatic exposure" | (a) every agent on the node; (b) **only agents the user ticks on the GitHub card** (default: none); (c) agents whose skills mention GitHub (an installed skill could claim it) | (b) follows the user's rule that nothing is exposed automatically, and it is one list on the card. (c) lets an installed skill grant itself access. **Recommend (b)**: a team member gets access when its agent is ticked | User | **Approved by the user** 2026-10-30 (the recommendation; see Document Status) |
| DEC-003 | What may an allowed agent do on GitHub, and do risky actions need approval in this step? | Use is not theft (244 §4.2) | (a) **Whatever the token allows**: the proxy covers the API and git including push, the user narrows the token itself (a fine-grained token per repository), and every call is recorded; (b) read-only in step 1; (c) approval prompts now | The integration must create issues and comments, so (b) would block it. (c) is a bigger feature (pause a call, ask in the UI). (a) puts the limit in GitHub's own permissions, where the user sets it when creating the token. **Recommend (a)**; approval prompts become a follow-up | User | **Approved by the user** 2026-10-30 (the recommendation; see Document Status) |
| DEC-004 | Must `gh`'s own commands (`gh issue list`, `gh pr create`) work through the proxy? | Integration authors' tools; security | They need an HTTPS proxy that `gh` trusts (H-1, Measured). On macOS that means installing a local root certificate in the user's keychain. That certificate could intercept any HTTPS traffic of the user, so it is a big trust change. Without it: curl, `gh api <address>` and git all work | Integration scripts lose little by using `gh api` or curl, while a local root certificate is a large new risk. **Recommend: not in this step**; documented as unsupported | User | **Approved by the user** 2026-10-30 (the recommendation; see Document Status) |
| DEC-005 | Who decides where a token may be sent? | An installed skill must not redirect the token | App-owned definitions versus definitions read from the installed skill | The user called third-party installs "quite dangerous" (244 DEC-010). The app keeps the hosts and paths; a skill only uses the address | Solution Designer | Decided |
| DEC-006 | Which GitHub token types? | Board access (H-5) | Fine-grained or classic | The proxy only carries the token, so both work. The card recommends a fine-grained token limited to the needed repositories, and notes that a personal-account Projects board needs a classic token with `project` scope | Solution Designer | Decided |
| DEC-007 | What exactly does the shell get? | Contract for integration authors | One variable per integration versus one base URL | One per integration is clearest (`AUTOBYTEUS_GITHUB_API_URL`; later `AUTOBYTEUS_JIRA_URL`), plus git's redirection through `GIT_CONFIG_*` variables (no file). The run pass is inside the address; 141 can reuse it | Solution Designer | Decided (exact names fixed in the design) |
| DEC-008 | Where can the user see the activity? | Audit visibility | Log file now versus an Activity view now | The records are written in this step; an Activity view belongs to the Integrations menu (later step) | Solution Designer | Decided |
| DEC-009 | Test targets | Real GitHub check without a write token | The permanent test repo `ryan-zheng-teki/autobyteus-mcp-test` and the read-only test-vault token (`test.github.token`) cover the API and clone. Push is tested against a local git server through the same proxy | A write token isn't needed for this step | Solution Designer | Decided |
| DEC-010 | Can the proxy forward to a company's own server instead of GitHub directly? | Companies may manage access centrally | (a) The agent always talks to the node's own proxy, and only where the proxy forwards to becomes configurable later; (b) agents talk directly to a company proxy (it would need to check our run passes; our records would miss the calls) | (a) keeps every protection. The user, 2026-10-30: "For the current [one], let's keep it simple … I currently have no idea." Decision: in step 1 the upstream address is a field of the app's GitHub definition (default `api.github.com` / `github.com`), not hard-coded, and there is no visible setting. A user-only setting can be added later (Jira needs the same field for its site) | User (direction), Solution Designer (shape) | Decided (keep simple; no setting in step 1) |
| DEC-011 | Codex runs in the default `workspace-write` sandbox can't connect to the proxy (measured M-5). What should happen? | REQ-002 promises every runtime | (a) turn on network for those Codex runs only; (b) leave the sandbox, GitHub works for Codex only with full access; (c) Codex's experimental per-domain allow-list | (a) puts Codex on par with the other runtimes (none of which sandbox the network), for agents the user ticked. But it opens the whole network for those runs, which is a security choice. **Recommend (a)** | User | **Decided by the user** (option a, automatic): the user, 2026-10-30: "Auto Execute was already the default now … do we add the permission by default so [the user] doesn't need to configure but the permission is added for default is it possible". Evidence given to him: auto-execute is on by default for new runs (`chatDraftStore.ts` L95, L230; `agentOrgLaunchDraftStore.ts` L118; `useDefinitionLaunchDefaults.ts` L135, L152), and then Codex runs with full access, where the proxy works (M-5). Only runs with auto-execute turned off use the sandbox; for them AutoByteus adds network access automatically when the run's agent is ticked for GitHub |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-002, UC-003 | BEH-002 | AC-002 | SCN-002 |
| REQ-003 | UC-002 | BEH-003 | AC-003 | SCN-002 |
| REQ-004 | UC-003 | BEH-003 | AC-004 | SCN-003 |
| REQ-005 | UC-004 | BEH-003, BEH-004 | AC-005 | SCN-004 |
| REQ-006 | UC-004 | BEH-004 | AC-006 | SCN-004 |
| REQ-007 | UC-002 | BEH-003 | AC-003 | SCN-002 |
| REQ-008 | UC-004 | BEH-003 | AC-003 | SCN-002 |
| REQ-009 | all | all | AC-002, AC-007 | all |
| REQ-010 | UC-004 | BEH-004 | AC-006 | SCN-004 |
| REQ-011 | — | BEH-002, BEH-003 | AC-008 | — |
| REQ-012 | — | — | AC-008 | — |

## Architecture Phase Input

- Scenarios to map: SCN-001…SCN-004.
- Constraints:
  - loopback only;
  - the token never leaves the server process except toward GitHub;
  - app-owned definitions;
  - the run pass lifecycle follows the run.
- Deferred to design:
  - the vault ID and consumer kind;
  - the proxy's route and port;
  - the exact variable names;
  - where the audit records live;
  - one "run shell environment" owner for the five runtimes.
- To verify:
  - the Codex per-thread shell env (UNK-001);
  - git push (UNK-002);
  - a real API call and clone with the test-vault token;
  - the git version in the Docker image.
- Risks: RSK-001 (same-user limit), RSK-002 (use within the token's permissions).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Scenarios covered with validity and evidence: `Yes`
- Product design evidence: `N/A`
- Decisions visible with reasoning: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none. REQ-002 for Codex is `Unclear` until UNK-001 is measured; if it fails, the design brings the user an alternative before implementation.

### Approved Basis Ready For Design

- Approval recorded: `Yes` (the user, 2026-10-30; SR-002)
- Approved requirements package ready for architecture design: `Yes`
