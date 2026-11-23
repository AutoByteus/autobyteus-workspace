# Requirements Document — autobyteus-627 Private GitHub URLs for Agent Packages

## Document Status

- Status: `Ready for Approval` (waiting for the founder's decisions DEC-001..DEC-004)
- Current solution revision ID: `SR-001`
- Package identifier: `private-github-packages-627`
- Request / ticket: autobyteus-627 "Investigate: supporting private GitHub URLs for Agent Packages (feasibility, auth process & UX options)"
- Requested by: `/project_task_manager` (for the founder)
- Requirements owner: Solution Designer
- Date: 2026-11-23
- Approved by and reference: not yet. The Task requires the founder's decision before design or implementation
- Exact approved requirements baseline / solution revision: none yet
- Behavior-defining supplements: none (evidence: [investigation-notes.md](investigation-notes.md), [probe-627-results.txt](probe-627-results.txt))

## Options Report (summary for the founder)

**Feasible, measured.** With a GitHub fine-grained token that can read a private repository, every call AutoByteus makes for a GitHub import works:

- reading the repository details;
- the update check;
- the download.

Without the token, a private repository looks like "not found". The measurement used the test token against a real private repository ([investigation-notes.md §2](investigation-notes.md#2-measurement-probe)).

**Recommended path (A): use the GitHub connection the node already has.** The Integrations page already stores one GitHub token per node in the vault. It checks the token with GitHub ("Connected as @login") and never shows it again. Today only agents' GitHub calls use it, through the credential proxy. Imports and update checks would use the same token, on the server, as a request header only.

What the user does:

1. The user pastes a private repository URL into "Import Agent Package" (or a Skill source).
2. **If GitHub is not connected on this node:** the import says *"This repository is private or doesn't exist. Connect GitHub to import private repositories."* It offers the token field right there, with a short guide: create a fine-grained token, select the repositories, permission *Contents: read*.
   - The guide links to GitHub's page for creating the token.
   - The user pastes the token. GitHub checks it, and it is saved for the node, exactly as on the Integrations page.
   - The import continues.
3. **If GitHub is connected:** the import just works. The package card looks like any GitHub package (it can show a "Private" mark).
4. **Updates:** the package keeps updating on the usual schedule with the same token.
5. **When the token expires or is revoked:** the update check fails, and the package keeps what it has. The card says *"GitHub rejected this node's token. Reconnect GitHub"*, with a button to the connection.
6. **When the token cannot see the repository** (it was not selected, or the organization has not approved the token): the message is *"Not found, or this node's GitHub token can't read it."*
7. **Docker node:** the same steps, in that node's own window. A Docker node has its own vault, and nothing is taken from the host.

What happens technically:

- The server reads the token from the vault only at the moment it sends a request. It is sent only as an HTTP header to `api.github.com`, `codeload.github.com` and `github.com`.
- The download is the tarball, as today: there is no git clone, no `.git` folder and no git remote on disk.
- One measured detail needs care: GitHub's documented download endpoint for private repositories redirects to a link that **contains a temporary token**. That link is handled like a secret:
  - it is never logged, stored or shown in an error;
  - the alternative, the direct download address with the header, also measured working, avoids it. The design picks one.
- Package records keep only the URL and revision, as today. Nothing secret goes into records, Memory Sync, exports or the UI.

**Options rejected** (details in [investigation-notes.md §3](investigation-notes.md#3-approaches-analyzed)):

- A token per package: many secrets and many renewals, for no gain, because a fine-grained token already selects repositories.
- Passing through the machine's own git, SSH or `gh` login:
  - it does not work on a Docker node;
  - a server process can hang on a credential prompt;
  - autobyteus-457 already gives desktop users this route for a folder they cloned themselves.
- A git clone instead of the tarball: it needs git in the image, risks credentials in `.git/config`, and leaves `.git` on disk.
- GitHub sign-in (Device Flow):
  - the OAuth App kind gets read and write access to **all** private repositories;
  - the GitHub App kind is fine-grained, but AutoByteus would have to own and publish an App, handle refresh tokens, and each organization would have to install it.
  - It is a good later improvement to *how* the same token is obtained, not a first step.

## Problem And Desired Outcome

- Problem: an Agent Package or Skill source in a private GitHub repository can't be imported. The shared GitHub client sends no credentials and explicitly refuses `private` repositories ("Clone it locally and import the local path instead"). Users must clone by hand, and a Docker node can't use the host's git login at all.
- Affected actors or systems: users importing Agent Packages and Skills from GitHub; desktop and Docker nodes; the scheduled update check.
- Desired outcome: a private GitHub URL imports and keeps updating like a public one, once the node has a GitHub token that can read it, with the token kept as safe as the integration token is today.
- Observable definition of success:
  - a private repository the token can read imports and updates;
  - every failure says which of three cases it is: not connected, rejected token, or no access;
  - the token appears nowhere outside the vault and the outgoing request header.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | Private GitHub URL is refused: "not public … clone locally" | Imports when this node's GitHub token can read it; when no token is connected, the user can connect one from the import | Public imports unchanged | notes §1.1, §2.2 |
| BEH-002 | System | SCN-003 | Update check (ls-refs) is anonymous; a private source can't exist | Private sources' update checks use the token; failure keeps installed content and shows the reason | Public update checks unchanged; schedule unchanged | notes §1.2, §2.2 |
| BEH-003 | Contract | SCN-004 | GitHub token used only by the credential proxy for agents | Also used by the server for imports and update checks (subject to DEC-001) | Agents still never see the token; per-agent access rule unchanged | notes §1.3 |
| BEH-004 | User | SCN-004 | Revoked/expired token is noticed only when an agent call fails | Import/update failure names "token rejected, reconnect" | Connect / test / disconnect flows unchanged | notes §1.3, §3 |

## Scope Guardrail

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Import an Agent Package from a private GitHub repository URL | SCN-001, SCN-002 |
| UC-002 | Import a Skill source from a private GitHub repository URL (same client; subject to DEC-003) | SCN-001, SCN-002 |
| UC-003 | Scheduled and manual update of a private GitHub source | SCN-003 |
| UC-004 | Clear outcome when the token is missing, rejected, expired, revoked or lacks access | SCN-004 |
| UC-005 | The same on a Docker node, with its own connection | SCN-005 |

### Out Of Scope

- Application Packages (they have their own separate GitHub copy, `application-packages/utils/github-repository-source.ts`), unless DEC-003 includes them.
- GitHub sign-in / Device Flow (DEC-004 recommends a follow-up).
- Hosts other than github.com (GitHub Enterprise Server, GitLab).
- Local clones following their remote: autobyteus-457.
- Protection against other processes of the same OS user reading the vault (existing limit R-1, autobyteus-310).
- The application-wide security layer (the 587 follow-up).

### Non-Goals

- Per-package tokens; several GitHub accounts on one node.
- Copying a token between nodes, or from the host into Docker.

### Preserved Behavior Boundary

- Public GitHub imports and update checks work as today, including when no token is connected or the connected token is rejected.
- Agents never receive the token (credential proxy contract). Which agents may use GitHub is unchanged.
- Rate-limit back-off, timeouts and the refusal of URLs with credentials or ports in them stay.

### Prerequisites

None.

### Review Authority

As the template states: blocking findings cite a REQ/AC/BEH ID here; new policy is a Requirement Gap for the founder.

## Requirements (draft; final wording follows the decisions)

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | A GitHub URL to a private repository imports as an Agent Package (and a Skill source per DEC-003) when this node's GitHub token can read the repository. The result is the same as a public import | BEH-001 | Must | The ticket's goal | Measured: REST 200, tarball 200 and codeload 200 with the token; 404 without it | Task; DEC-001, DEC-003 |
| REQ-002 | When GitHub is not connected on this node and the repository is not readable anonymously, the import says it may be private and offers to connect GitHub without leaving the import. The token is checked with GitHub before it is saved | BEH-001, BEH-004 | Must | Without it, the user meets a dead end | Existing `connect` + `verifyToken` | DEC-002 |
| REQ-003 | Update checks and updates of a private source use the token on the normal schedule | BEH-002 | Must | A package that can't update goes stale | Measured: ls-refs 200 with Basic, 401 without | Task |
| REQ-004 | A failed import or update tells the three cases apart: not connected; token rejected (expired or revoked, so reconnect); not found or the token can't read it (repository not selected, or org approval missing). A failed update keeps the installed content | BEH-002, BEH-004 | Must | Expiry and revocation are normal for fine-grained tokens | Measured statuses: 401 rejected; 404 no access | Task |
| REQ-005 | The token, and any URL that GitHub signs with a temporary token, never appears in a log, error message, stored record, git remote or file on disk, the UI, Memory Sync or an export. It is sent only as a request header to GitHub hosts | BEH-003 | Must | The Task's custody rule; the repository is public | Measured: the documented tarball redirect carries `token=` in its URL | Task; RELEASE.md Secret Gate |
| REQ-006 | A Docker node works with its own GitHub connection, set in that node's window. Nothing is read from the host | BEH-001 | Must | Docker is a supported node kind | The vault is per node | Task |
| REQ-007 | Public imports and updates keep working with no token and with a rejected token | Preserved | Must | No regression | — | Preserved boundary |

## Acceptance Criteria

| AC ID | Requirements | Trigger | Expected | Failure / Alternate | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Private repo URL; connected token can read it | Package installed; same content and validation as a public import | — | Live test with `test.github.token` on a private test repository (the test token already reads one) |
| AC-002 | REQ-002 | Private repo URL; GitHub not connected | Message names "private or not found" and offers to connect; after a valid token is saved, the import completes | An invalid token is refused and nothing is saved | Server + web tests; live check with the test token |
| AC-003 | REQ-003 | Private source; upstream gets a new commit | The scheduled or manual check finds the update and installs it | — | Live ls-refs with the token; unit test of the flow |
| AC-004 | REQ-004 | Token revoked or expired; or the repository is not selected | Exact message for each of the three cases; installed content unchanged | — | Unit tests with recorded statuses (401, 404 and 403) |
| AC-005 | REQ-005 | Any import or update, including a failed one | The token and any signed URL are absent from server logs, errors, records, the app-data folder and API responses | — | Log and file scan in tests for the token value and `token=`; gitleaks on the branch |
| AC-006 | REQ-006 | Docker node with its own connection | AC-001 passes on the Docker node | — | Docker run, or an evidence decision if Docker is unavailable |
| AC-007 | REQ-007 | Public repo; no token, or a rejected token | Import and update work as today | — | Existing tests plus one with a rejected token |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Steps | Outcome | Alternate | Validity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Node user, GitHub connected | Use a private team package | Import dialog | Paste URL → import | Package installed | No access → REQ-004 message | Supported Normal (Task) |
| SCN-002 | User | Node user, not connected | Same | Import dialog | Paste URL → "private or not found; connect GitHub" → paste token → checked → import | Installed; node now connected | Invalid token refused | Supported Normal (Task) |
| SCN-003 | System | Update schedule | Keep a private package current | Schedule or "Check for updates" | Check head with the token → download → swap | Updated | Failure keeps the content and shows the reason | Supported Normal |
| SCN-004 | User | Node user | Recover from expiry or revocation | Card shows "token rejected" | Reconnect GitHub → next check succeeds | Updates resume | — | Supported Normal |
| SCN-005 | User | Docker node user | SCN-001/002 on Docker | That node's window | As SCN-001/002 | Same | — | Supported Normal |

## UI, Interaction, And Experience Requirements

- Applicable: Yes (small: the import error state with inline connect, the "Private" mark, and the update-failure message on the package card). The founder has not requested Product Design. The flow above is the proposal; the exact wording follows DEC-002.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-005 | Security | Token only in the vault and in the outgoing header; signed redirect URLs treated as secrets | Scans in AC-005; gitleaks |
| QR-002 | REQ-007 | Compatibility | No change for public sources | AC-007 |

## Data Continuity And Acceptable Loss

- Persisted data affected: No new stored secret; at most one new field on a source record (e.g. "private") if the design needs it. Existing records are unchanged.

## External Contracts And Dependencies

| Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| GitHub REST `repos`, `tarball` | Bearer fine-grained token; 404 for no access | Measured | Redirect URL carries a temporary token |
| GitHub git smart HTTP ls-refs | Basic `x-access-token:<token>` | Measured | — |
| codeload with an Authorization header | Works (measured) | Not a documented contract | GitHub could change it; prefer the documented route, or fall back |
| Fine-grained PAT policy | Expiry; org approval | GitHub docs | Covered by REQ-004 |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | One GitHub account per node is enough | Open (DEC-001) |
| ASM-002 | The test token's private repository can serve as the live test fixture (read only; its name is not written down) | To confirm in design |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Do imports use the same per-node GitHub token as agents' GitHub access? | With one token, the repositories selected for packages can also be read by agents that have the GitHub integration skill | (A) one token per node; (A′) a separate "package downloads" token | One token is the simplest: one place to connect, renew and revoke. The user already controls what it reaches by choosing repositories on GitHub. Agents get it only through the GitHub skill the user assigns, and never see the value. A′ doubles the expiry work and only helps someone who wants packages private *from their own agents*. **Recommend A.** | Founder | Needs user |
| DEC-002 | Where does the user connect GitHub when the GitHub integration isn't imported? | Today the token field exists only on an imported integration's card | (a) inline in the import dialog when a repository looks private; (b) also a GitHub entry on the Integrations page that is always there; (c) require importing the integration first | (c) is a confusing detour. (a) puts the step exactly where the need appears. The same connection then shows on the Integrations page when the integration is imported. **Recommend (a)**; (b) only if you want one fixed place too. | Founder | Needs user |
| DEC-003 | Which imports get private support? | All three have the same refusal | Agent Packages only; + Skills; + Application Packages | Agent Packages and Skills use the same GitHub client, so supporting both costs almost nothing, and a private package often comes with private skills. Application Packages have a separate copy of the GitHub code; adding them is a separate piece of work. **Recommend Agent Packages + Skills now; Application Packages as a follow-up.** | Founder | Needs user |
| DEC-004 | GitHub sign-in (Device Flow) now? | It would remove the "create a token" step | OAuth App (broad `repo` access); GitHub App (fine-grained, but needs an AutoByteus-owned App, refresh tokens and installation per org) | It changes only how the token is obtained, not how it is used, so it can come later without rework. **Recommend a follow-up ticket.** | Founder | Needs user |
| DEC-005 | Which download address? | The documented address puts a temporary token in a redirect URL | REST `tarball` (documented; signed redirect) vs codeload with a header (measured; undocumented) | A technical choice within REQ-005. Decided in design: either is acceptable if the signed URL is never logged, stored or put in an error. | Solution Designer | Deferred to design |

## Traceability

| Requirement | Use Cases | Behavior | AC | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-001, UC-002 | BEH-001, BEH-004 | AC-002 | SCN-002 |
| REQ-003 | UC-003 | BEH-002 | AC-003 | SCN-003 |
| REQ-004 | UC-004 | BEH-002, BEH-004 | AC-004 | SCN-004 |
| REQ-005 | all | BEH-003 | AC-005 | all |
| REQ-006 | UC-005 | BEH-001 | AC-006 | SCN-005 |
| REQ-007 | — | preserved | AC-007 | — |

## Architecture Phase Input

- Constraints: the vault consumer rules (`secret_management.md`); the credential proxy contract (agents never see the token); the existing rate-limit gate and URL refusals.
- Deferred to design: DEC-005; whether to try a public request first or always send the token when connected; how the shared client receives the token; the data contract of any record field (Principle 17: the contract comes before the design spines).
- Technical facts to verify: undici drops the `Authorization` header on a cross-origin redirect; the signed codeload URL's lifetime; the 403 vs 404 statuses when an org has not approved the token.

## Readiness Check

### Content Ready For Approval

- Current behavior evidence-backed: Yes
- Desired and preserved behavior explicit: Yes
- Scope and non-goals clear: Yes, pending DEC-003
- Requirements and AC testable and traceable: Yes
- Scenarios covered: Yes
- Product design: N/A (not requested)
- Decisions visible with reasoning: Yes
- Content ready for approval: Yes
- Remaining content blocker: the founder's decisions DEC-001..DEC-004

### Approved Basis Ready For Design

- Approval recorded: No
- Remaining blocker: the founder's decision (the Task requires it before design and implementation)
