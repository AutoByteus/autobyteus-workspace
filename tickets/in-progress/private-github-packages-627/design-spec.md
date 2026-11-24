# Design Spec — autobyteus-627 Private GitHub Repositories for Agent Packages and Skills

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: [requirements-doc.md](requirements-doc.md) at SR-002, approved by the founder on 2026-11-24 (his words relayed verbatim by `/project_task_manager`; Task comment of the same day)
- Behavior-defining supplements: none
- User approval of the design: `Not required` (the go-ahead covers design and implementation; no release without the founder's word)
- Design status: `Ready`
- Canonical investigation notes: [investigation-notes.md](investigation-notes.md) (§1 current state, §2 probes, §2.4 architecture-phase code facts)
- Authorities read (2026-11-24): `references/architecture-design.md`, `references/design-principles.md`, repository `DESIGN.md` (Mandatory Design Rules, "Start simple", area contracts), `GLOSSARY.md` (Integration entries), `autobyteus-server-ts/docs/modules/credential_proxy.md`, `secret_management.md`, `agent_packages.md`, `skills.md`
- Conflicts or discrepancies: none with the general principles. Discrepancy to fix in this change: `GLOSSARY.md:324-325` calls `src/integrations/github/` "the public GitHub client … (no token)"

## Current-State Read

- One GitHub client (`src/integrations/github/`) serves Agent Packages, Skills (including integration sources) and the Codex release check. It never sends credentials and refuses `private` repositories by design (`github-repository-client.ts:93-118`).
- Archives are downloaded twice over, in two different ways:
  - Agent packages use the generic `downloadFileFromUrl`. It logs URLs, has no rate-limit gate and a 30 s timeout (`github-agent-package-installer.ts:198-201,216-238`; `utils/download-utils.ts:17,69`).
  - Skills use `publicGitHubRequest` (`github-skill-repository.ts:93-100`).
- The node's GitHub token already lives in the vault entry `integration.github.token`:
  - `IntegrationConnectionService` writes it after `verifyToken`;
  - only the credential proxy reads it today (`credential-proxy-routes.ts:112`).
  - Connect requires an imported GitHub integration (`api/graphql/types/integrations.ts:136-140`).
  - Removing the integration's source disconnects it: DEC-015, `integration-catalog.ts:209-228`, "no token is left without a card".

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 12 server files and about 8 web files change. The work stays within existing owners:
  - the GitHub client;
  - the two installers and their services;
  - one resolver;
  - two settings screens;
  - docs.
  No new subsystem, no persistence change, no migration.
- Architectural risk: `High`
- Risk rationale:
  - **Security:** a secret gets a second consumer (server-side GitHub requests), and a new API path writes it without an imported integration.
  - **Shared contract:** the shared GitHub client's request contract changes for every user (packages, skills, integration sources, Codex check).
  - **External dependency:** codeload accepting a header is measured but undocumented.
- Escalation trigger: anything that would put the token or a credential-bearing URL into a log, error, record or response, or that changes the credential proxy's own behavior. Also any need to store a new field on package or skill records.

## Architecture Investigation Evidence

- Probes: investigation notes §2.2 and §2.3. With the token, a private repository gives:
  - REST 200;
  - ls-refs 200;
  - commit-pinned codeload archive 200.
  Without a token: 404/401. With an invalid token: REST 401, ls-refs 401, **codeload 404**.
- Code facts with file:line: investigation notes §2.4.
- autobyteus-457 (local clones following their remote) is not implemented. No code is shared; that route stays separate (system git, desktop).

## Intended Change

GitHub requests made by imports, update checks, updates and downloads follow one **access rule**, owned by `GitHubRepositoryClient`:

1. Each request first goes out **without a token**, exactly as today.
2. If GitHub answers "not visible" (401 or 404), the client reads this node's GitHub token from the vault.
   - **No token:** the error says the repository is not found or private, and to connect GitHub.
   - **Token:** the request is sent again with it.
3. With the token, the answer decides the outcome:
   - 2xx: proceed;
   - 401: "GitHub rejected this node's token";
   - 403 or 404: "not found, or the token can't read it".

The `private` refusal is removed.

All archive downloads go through the client, as one owned method. The agent package installer no longer uses the generic downloader.

The node's GitHub connection gets its own small API (status, connect, disconnect) that does not need an imported integration. A **GitHub connection line**, always visible in the import area of the Agent Packages screen and the Skill sources dialog, uses that API.

## Change Scope (Mandatory)

- **In scope:** UC-001..UC-005. Areas:
  - `src/integrations/github/` (request, client, token reader);
  - agent package installer, service and edit capture wiring;
  - skill repository and service wiring;
  - the Codex strategy constructor call;
  - `api/graphql/types/integrations.ts` (three operations);
  - web: GitHub connection line, store, GraphQL, the two screens, en and zh-CN texts;
  - docs and glossary.
- **Derived consumers:**
  - The update-check error text stored in package and skill records keeps its field and shape. Only the message wording changes; it is shown as is by `AgentPackagesManager.vue:179-183` and `SkillSourceRow.vue:55-57`.
  - The integration card's state reads the same connection (store plus vault). A token saved through the new API shows as CONNECTED on the GitHub card once the integration is imported. No change is needed there.
- **Deliberately left alone:**
  - The credential proxy, its routes, the access rule and DEC-015. Removing the GitHub integration source still disconnects GitHub, and that now also ends private imports. This follows from DEC-001 (one token). The removal confirmation already names the GitHub connection that goes (`IntegrationSourcesDialog.vue:131-136`), and the connection line says what the token is used for.
  - Application Packages (FU-627-01). `utils/download-utils.ts` stays for its other callers.
  - Device Flow (FU-627-02).
  - The rate-limit gate's per-family accounting (see Risks).
- **Follow-ups:** FU-627-01 Application Packages private repositories; FU-627-02 GitHub sign-in (Device Flow). Both are in `follow-ups.md`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Trigger | Target production path | Spine |
| --- | --- | --- | --- |
| BEH-001 import (UC-001) | Agent Packages → Import Package with a GitHub URL | `AgentPackagesManager` → `importAgentPackage` → `AgentPackageService.importPackage` → `GitHubAgentPackageInstaller.installPackage` → `GitHubRepositoryClient.fetchRepositoryRevisionMetadata` + `downloadArchive` → extract, validate, rename | DS-001 |
| BEH-001 import (UC-002) | Skills → Skill sources → Import with a GitHub URL (also Integrations → import) | `SkillSourcesModal` → `importGitHubSkillSource` → `SkillSourceService.importGitHubSkillSource` → client metadata → `GitHubSkillRepository.prepare` → client `downloadArchive` → inspect, publish | DS-001 |
| BEH-002 check / update (UC-003) | Schedule or "Check again" / "Update" | `GitHubAgentPackageUpdates.checkPackage/updatePackage` or `SkillSourceService` check/update → client `fetchDefaultBranchHead` → (update) `downloadArchive` | DS-002 |
| BEH-003/004 connect (UC-004) | GitHub connection line → paste token → Connect | `GitHubConnectionLine` → `connectGitHub` → `IntegrationConnectionService.connect("github")` → `verifyToken` → vault save | DS-003 |
| BEH-004 failure messages | Any of the above with no token, a rejected token or no access | client access rule → `Error(message)` → stored check error / GraphQL error → UI text | DS-001/002 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes`. Two archive download paths serve one capability, with different gates, timeouts and logging, and one of them logs every URL.
- Structural triggers fired:
  - **Several kinds or forms (P1).** Four callers use the client:
    - agent package import;
    - agent package check, update and edit capture;
    - skill import, check and update (integration sources included);
    - the Codex release check.
    All of them go through the same `request`, so the access rule is the same everywhere. The two parallel archive paths are merged.
  - **Repeated coordination / duplicated policy (P13).** Download handling lived in two places. `downloadArchive` gives it one owner.
  - **Data contract (P17).** There is a new GraphQL shape and a new outgoing credential form; see the contract below.
  - **Hidden dependency (P16).** The default token reader looks up the vault runtime. See the deviation below.
  - **Vocabulary drift (P15).**
    - "Private" already names agent-private skills, so this change always says "private repository".
    - "Public GitHub client" in the glossary becomes wrong and is updated.
    - `publicGitHubRequest` is renamed, because it now sends credentials.
  - **Legacy cleanup (P8).** The `private` refusal, the "clone locally" messages and the unreachable branch-archive path are removed.
- Deliberate deviations:
  - **P16.** Production callers pass `readNodeGitHubToken`, which looks up `getSecretVaultRuntime()` per call, the same pattern as `getIntegrationConnectionService` (`integration-connection-service.ts:144-150`).
    - Why the three conditions hold:
      1. The vault runtime is initialized at server startup, before any GraphQL request or scheduled check.
      2. A missing runtime throws `VAULT_UNAVAILABLE` loudly from `requireService()`.
      3. No cycle: `integrations/github` → `secret-management` only.
    - Passing the vault service through every singleton's construction would touch four composition paths for no behavioral gain.
- Root cause: `Duplicated Policy Or Coordination` (archive download) plus the feature.
- Refactor needed now: `Yes`, limited to moving archive download into the client.
- Design response: `GitHubRepositoryClient.downloadArchive` replaces `GitHubSkillRepository.download` and the installer's two `downloadFileFromUrl` uses.
- Residual risk: none for the in-scope behavior.

## Terminology

Project glossary: `GLOSSARY.md`, updated in this change.

- **Private repository:** GitHub's term for a repository GitHub does not show without credentials. Always written with "repository". Not the same as an agent-private skill.
- **GitHub connection:** this node's GitHub token in its vault (`integration.github.token`) and the login it belongs to. It is the same connection as the GitHub integration's: one per node (DEC-001).
- **GitHub connection line:** the UI element in the import areas showing that connection and offering Connect / Replace token / Disconnect.
- **Access rule:** without a token first; with this node's token only when GitHub answers "not visible".

## Legacy Removal Policy (Mandatory)

- Obsolete paths removed:
  - the `payload.private` refusal and both "clone locally and import the local path" messages (`github-repository-client.ts:24-29,95-99,112-117`);
  - `publicGitHubRequest` (renamed `gitHubRequest`);
  - `GitHubSkillRepository.download` and its `fetchImpl`/`download` options;
  - the installer's `downloadFileFromUrlImpl`/`fetchImpl` options and its `downloadFileFromUrl` use;
  - `buildGitHubRepositoryArchiveUrl` (branch form, unreachable: §2.4) and the loose `latestRevision?` branch.
- Compatibility wrappers or dual paths kept: `None`. "Anonymous first" is the one current rule for every request, not a fallback for old behavior.

## Data Contract (Mandatory When The Change Stores Or Exchanges Data)

- Contract location: this section.
- Shown to the user: in the result message after this design (it leads with this contract). No contract decision needs the founder, so design continues.

### C-1 Stored data

- Vault entry `integration.github.token`: unchanged. Same consumer `{ kind: "integration", integrationId: "github" }`; the writer is still only `IntegrationConnectionService`. New reader: `readNodeGitHubToken` (server-side GitHub requests).
- `<app-data>/integrations/connections.json` (login, connectedAt): unchanged.
- Agent package records and skill source records: **unchanged**. They hold no token, no credential and no signed URL. Only the wording of the stored check-error text changes.

### C-2 GraphQL: the node's GitHub connection (new)

```graphql
type GitHubConnection {
  connected: Boolean!   # writer: IntegrationConnectionService.status("github"); reader: GitHubConnectionLine (which state to show)
  login: String         # GitHub login when connected, else null; reader: the line ("Connected as @login")
}
type Query    { githubConnection: GitHubConnection! }
type Mutation {
  connectGitHub(token: String!): GitHubConnection!   # trimmed; checked with GitHub (GET /user) before it is saved; replaces an existing token
  disconnectGitHub: GitHubConnection!                # removes the token (idempotent); agents' GitHub access ends too
}
```

- Errors are GraphQL errors with `extensions.code`, carrying no token:
  - `TOKEN_REQUIRED`;
  - `TOKEN_REJECTED`;
  - `TOKEN_CHECK_FAILED`;
  - `VAULT_UNAVAILABLE`.
  These are the existing codes and messages of `IntegrationConnectionError`.
- `connectedAt` is left out: nothing reads it.
- `connectIntegration`/`testIntegration`/`disconnectIntegration` stay for the Integrations page. Both connect paths share the same gate: trim, then require a token. The only difference is the explicit `requireImported` on the card path: connecting GitHub for imports does not need the integration, and agents still get access only through the integration skill (`integration-access-rule.ts`).

### C-3 Outgoing GitHub request credentials (changed)

| Host | Header when the token is used |
| --- | --- |
| `api.github.com`, `codeload.github.com` | `Authorization: Bearer <token>` |
| `github.com` (only `…/<repo>.git/git-upload-pack` and `…/releases/latest`) | `Authorization: Basic base64("x-access-token:<token>")` |

- Hosts: only the hosts `familyOf` already allows. On a redirect, the header is computed again for the next hop's host, and that hop must pass `familyOf`.
- The token is revealed only while the header is built. It never appears in a URL, log line, error, record or response.
- The rest of the request (URL, method, body, timeouts, rate-limit gate) is unchanged.

### C-4 Failure messages (user-visible text; `<url>` is `https://github.com/<owner>/<repo>`)

| Case | Text |
| --- | --- |
| Not visible, no token | `GitHub repository not found, or it is private: <url>. To use a private repository, connect GitHub on this node.` |
| Token rejected (401 with token) | `GitHub rejected this node's GitHub token (expired or revoked). Reconnect GitHub on this node.` |
| No access (403/404 with token) | `GitHub repository not found, or this node's GitHub token can't read it: <url>. Give the token access to this repository with Contents: read.` |
| Vault unavailable while reading the token | `GitHub repository not found, or it is private: <url>. This node's secret vault is unavailable, so its GitHub token can't be used.` |

### Data Contract Validation

Walks:

1. **UC-001, public repository, no token.** REST 200, then codeload 200. Exactly today's requests; the vault is never read.
2. **UC-001, private repository, connected.**
   - REST, without a token: 404. Read the token. REST, with it: 200 (metadata; `private` is ignored).
   - codeload, without a token: 404. With it: 200. Extract and validate.
   - The record stores URL and revision, as today.
3. **UC-001, private repository, not connected.** REST 404, no token, "not visible, no token" text. The GraphQL error is shown above the import box, and the connection line is right there. After Connect, the user presses Import again → walk 2.
4. **UC-003, check, private source.**
   - ls-refs, without a token: 401. Read the token. With it: 200, head. The record's `lastCheck` is updated.
   - If the token was revoked: 401 with the token, "token rejected" text stored as the check error. The installed content is untouched (`github-agent-package-updates.ts:88-99`).
5. **UC-003, update, private source.**
   - ls-refs as in walk 4, then the edit-capture download of the installed revision, then the new revision's download. Each archive request goes without a token (404), then with it (200).
6. **UC-004, the token cannot see the repository.** REST 404 with the token, "no access" text. When the token was rejected: REST 401, "rejected". The download alone can't tell: an invalid token on codeload gives 404 (§2.3). That is why the rejection is read from REST or ls-refs, which always come first.
7. **UC-002, skills and integration sources.** Same as walks 1-5 through `SkillSourceService`.
8. **UC-005, Docker.** Same code; the node's own vault. Connect happens in that node's window.
9. **Codex release check.** `releases/latest` answers 302 without a token, so the token is never read.
10. **REQ-007, public repository, rejected token stored.** The request without a token succeeds, so the token is never used. Public sources are unaffected.

Example (connect):

```json
{ "data": { "connectGitHub": { "connected": true, "login": "octo-dev" } } }
{ "errors": [{ "message": "TOKEN_REJECTED: The service rejected the token.", "extensions": { "code": "TOKEN_REJECTED" } }] }
```

Example (stored check failure, agent package `sourceMetadata.github`, shape unchanged):

```json
{ "updateStatus": "CHECK_FAILED", "lastError": "GitHub rejected this node's GitHub token (expired or revoked). Reconnect GitHub on this node.", "installedRevision": "4f…", "latestRevision": "4f…" }
```

- Checks against real dependencies: probes §2.2 and §2.3 (private repository: REST, ls-refs and commit-pinned codeload with and without the token, and with an invalid token). These are real GitHub responses, read-only.
- Contract changes the validation caused:
  - The rejection is detected from REST or ls-refs only, because codeload says 404.
  - The documented REST tarball endpoint was dropped, because its redirect URL carries a temporary token.

## Persisted Data / State Transition Decision

- Stored subjects: agent package registry, skill source store, connections.json, vault. None changes shape.
- Decision: `Not Affected`.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Governing owner | Why |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Import (packages, skills) | Import button | Installed and recorded source | `AgentPackageService` / `SkillSourceService` | Private import |
| DS-002 | Check and update | Schedule or button | Record updated / content replaced | `GitHubAgentPackageUpdates` / `SkillSourceService` | Private updates |
| DS-003 | Connect / disconnect | Connection line | Vault entry saved or removed | `IntegrationConnectionService` | Token custody |
| LS-1 | Access rule (bounded local) | `request(url)` | Response or access error | `GitHubRepositoryClient` | The one rule |

## Primary Execution Spines

- DS-001: `Import UI → GraphQL import → AgentPackageService / SkillSourceService → Installer / GitHubSkillRepository → GitHubRepositoryClient (metadata, downloadArchive) → GitHub → extract/validate → registry write → UI list`
- DS-002: `Schedule / button → GitHubAgentPackageUpdates / SkillSourceService → GitHubRepositoryClient.fetchDefaultBranchHead (→ downloadArchive) → record (lastCheck / installed) → UI status text`
- DS-003: `GitHubConnectionLine → githubConnectionStore → connectGitHub / disconnectGitHub → IntegrationConnectionService.connect / disconnect("github") → verifyToken (GitHub /user) → vault → GitHubConnection`
- LS-1 (inside `GitHubRepositoryClient`): `gitHubRequest(url) → [401/404] readToken() → [null → not-visible error] → gitHubRequest(url, token) → [401 → rejected; 403/404 → no access; else response]`

## Spine Narratives

- **DS-001.** The import surfaces are unchanged. The installer no longer creates its own client: the service gives it one. The client's `downloadArchive` replaces the generic downloader, so the archive request gets the same host checks, rate-limit gate, access rule and 120 s timeout as the skill path. A private repository becomes importable because the client stops refusing `private` and applies the access rule.
- **DS-002.** Checks and updates already go through `fetchDefaultBranchHead` and the installer; they inherit the rule. Failure handling and stored shapes are unchanged.
- **DS-003.** A new thin resolver entry calls the existing connection service. The service still checks the token with GitHub before saving it, and is still the only writer.

## Ownership Map

| Owner | Owns |
| --- | --- |
| `gitHubRequest` (`github-request.ts`) | One HTTP exchange with an allowed GitHub host: host and path allow-list, redirects, timeout, rate-limit gate, and the credential header form per host (C-3) when given a token |
| `GitHubRepositoryClient` | The access rule (LS-1) and its messages (C-4); repository metadata, head, latest release, archive download |
| `readNodeGitHubToken` (`node-github-token.ts`) | Reading this node's GitHub token from the vault; `null` when none is stored |
| `IntegrationConnectionService` | Connect (check, then save), disconnect, status: unchanged |
| `IntegrationsResolver` | The three new GraphQL operations (thin entries) |
| `GitHubConnectionLine.vue` + `githubConnectionStore` | Showing and changing the connection from the import areas |

## Removal / Decommission Plan (Mandatory)

| Item | Evidence | Action |
| --- | --- | --- |
| `publicGitHubRequest` | Replaced by `gitHubRequest` (callers: client, skill repository, tests) | Rename the file `public-github-request.ts` → `github-request.ts` |
| `private` refusal + "clone locally" texts | The feature replaces them | Remove |
| `GitHubSkillRepository.download`, options `fetchImpl`, `download` | Replaced by the client's `downloadArchive` | Remove; take `client: Pick<GitHubRepositoryClient, "downloadArchive">` |
| Installer `fetchImpl`, `downloadFileFromUrlImpl`, `downloadFileFromUrl` import, `getDownloadFileFromUrl` | Replaced by the client | Remove; take `githubClient` |
| `buildGitHubRepositoryArchiveUrl` (`github-repository-source.ts:93-98`) | Only caller is the unreachable branch (§2.4) | Remove with the branch |
| Tests of removed options | Principle 7 / DESIGN rule 11 | Rewrite against the client fake |

## Off-Spine Concerns

- **Rate-limit gate:** reused unchanged. Requests with and without the token go through it.
- **Logging:** the client logs nothing new. Agent package archive URLs stop being logged at all, because the generic downloader is no longer used for them.

## Dependency Rules

- `integrations/github` → `secret-management` (vault runtime, `SecretVaultError`), plus the `SecretValue` type from `autobyteus-ts`. It must not import `credential-proxy` (cycle: credential-proxy → skills → integrations/github).
- `agent-packages`, `skills` and the `runtime-management` Codex strategy → `integrations/github` (as today).
- `api/graphql/types/integrations.ts` → `IntegrationConnectionService` (as today).

## Interface Boundary Mapping

```ts
// integrations/github/node-github-token.ts
export type GitHubTokenReader = () => Promise<SecretValue | null>;
/** This node's GitHub token (its GitHub connection) from the vault; null when GitHub is not connected. */
export const readNodeGitHubToken: GitHubTokenReader;

// integrations/github/github-request.ts
export type GitHubRequestOptions = Readonly<{ method?; body?; headers?; followRedirects?; fetchImpl?; signal?;
  /** When given, sent as this host's credential header (C-3); revealed only while the header is built. */
  token?: SecretValue }>;
export function gitHubRequest(input: string, options?: GitHubRequestOptions): Promise<Response>;

// integrations/github/github-repository-client.ts
export class GitHubRepositoryClient {
  constructor(deps: { readToken: GitHubTokenReader; fetchImpl?: typeof fetch });
  fetchDefaultBranchHead(owner, repo): Promise<RepositoryHead>;
  fetchLatestReleaseTag(owner, repo): Promise<string>;
  fetchRepositoryRevisionMetadata(source): Promise<GitHubRepositoryRevisionMetadata>;
  /** The repository at `revision` (a commit) as a .tar.gz written to `destinationFile` (created, mode 0600). */
  downloadArchive(owner, repo, revision, destinationFile): Promise<void>;
}
```

- `GitHubTokenReader` is a question the client asks, not a port. Its one production implementation reads the vault, and tests use a fake: a real I/O boundary.
- `readToken` is required; production passes `readNodeGitHubToken` at each of the four construction sites.

## Existing Capability Reuse Check

- Token check and storage: `IntegrationConnectionService` (reused).
- Header forms: the same as `credential-proxy-forwarder.ts:91-94`. They are not imported, because of the dependency rule above. Two lines in `github-request.ts` repeat the formats; that repetition is accepted because the formats are GitHub's own and fixed.
- Rate-limit gate, host allow-list, ls-refs parsing: reused.
- Web: the token-field pattern of `IntegrationDetail.vue` is followed (password input, coded messages). The component is not reused, because it is bound to an integration card and its manifest help.

## Final File Responsibility Mapping

**Server (`autobyteus-server-ts/src/`)**

| File | Change |
| --- | --- |
| `integrations/github/github-request.ts` (renamed from `public-github-request.ts`) | `gitHubRequest`; `token` option; header per host (C-3) |
| `integrations/github/node-github-token.ts` (new) | `GitHubTokenReader`, `readNodeGitHubToken` |
| `integrations/github/github-repository-client.ts` | Access rule (LS-1), messages (C-4), `downloadArchive`; `private` refusal removed; constructor `{ readToken, fetchImpl? }` |
| `integrations/github/github-repository-source.ts` | Remove `buildGitHubRepositoryArchiveUrl` |
| `agent-packages/installers/github-agent-package-installer.ts` | Take `githubClient` (`fetchRepositoryRevisionMetadata`, `downloadArchive`); write the archive to `<staging>/download/repository.tar.gz`; remove the generic downloader and the branch path |
| `agent-packages/services/agent-package-service.ts` | Build one `GitHubRepositoryClient({ readToken: readNodeGitHubToken })` and pass it to the installer and the updates |
| `skills/installers/github-skill-repository.ts` | Take `client`; `prepare` calls `client.downloadArchive`; remove `download` |
| `skills/services/skill-source-service.ts` | Build the client with `readNodeGitHubToken`; pass it to `GitHubSkillRepository` |
| `runtime-management/agent-runtimes/strategies/codex-agent-runtime-strategy.ts` | Construct with `readNodeGitHubToken` |
| `api/graphql/types/integrations.ts` | `GitHubConnection` type, `githubConnection`, `connectGitHub`, `disconnectGitHub` |

**Web (`autobyteus-web/`)**

| File | Change |
| --- | --- |
| `graphql/githubConnection.ts` (new) | Query and two mutations |
| `stores/githubConnectionStore.ts` (new) | `connected`, `login`, `busy`, `error`; `load`, `connect(token)`, `disconnect()`; coded error → localized text |
| `components/github/GitHubConnectionLine.vue` (new) | See the shape below |
| `components/settings/AgentPackagesManager.vue` | Line inside the import box; intro text no longer says "public" |
| `components/skills/SkillSourcesModal.vue` | Line in the import area |
| `localization/messages/en/*`, `zh-CN/*` | New texts; "public GitHub repository" wording updated where it describes imports (`skills.ts`, AgentPackagesManager intro) |
| Generated GraphQL types | Regenerated (`generated/graphql.ts`) |

**Docs**

- `docs/modules/credential_proxy.md`: the GitHub token's second user (server imports), connect without an imported integration, and that removing the integration also ends private imports.
- `docs/modules/secret_management.md`: integration token readers.
- `docs/modules/agent_packages.md`: replace the "not authenticated / clone locally" limits (:239-240, :257).
- `docs/modules/skills.md`: private repositories.
- `GLOSSARY.md`: Integration entry (:320-325) and "GitHub connection".
- `autobyteus-web/docs/settings.md`, `skills.md`, `integrations.md`.

## Concrete Examples / Shape Guidance

Access rule (good shape: one owner, explicit outcomes):

```ts
private async request(url: string, repositoryUrl: string, options: GitHubRequestOptions = {}): Promise<Response> {
  const anonymous = await gitHubRequest(url, { ...options, fetchImpl: this.fetchImpl });
  if (anonymous.status !== 401 && anonymous.status !== 404) return anonymous;
  await anonymous.body?.cancel();
  const token = await this.tokenFor(repositoryUrl);          // null → throws the "connect GitHub" text; vault error → its text
  const response = await gitHubRequest(url, { ...options, fetchImpl: this.fetchImpl, token });
  if (response.status === 401) { await response.body?.cancel(); throw new Error(TOKEN_REJECTED_MESSAGE); }
  if (response.status === 403 || response.status === 404) { await response.body?.cancel(); throw new Error(noAccessMessage(repositoryUrl)); }
  return response;
}
```

Bad shape (avoided): sending the token whenever one is connected. A rejected token would then break public imports, because GitHub's REST and git endpoints answer 401 to bad credentials whatever the repository's visibility (measured 401 on the private repository, §2.3; GitHub's documented behavior for public ones) (REQ-007).

Connection line states:

```
Not connected:  GitHub · not connected — needed only for private repositories.   [Connect GitHub]
  (expanded)    Token [••••••••••]  [Save]   Create a fine-grained token on GitHub ↗ — choose only the repositories you need;
                Repository permissions → Contents: Read-only. Saved in this node's vault, never shown again.
Connected:      GitHub · connected as @octo-dev   [Replace token] [Disconnect]
                Used for private repositories here and by agents that have the GitHub integration.
```

The link is `https://github.com/settings/personal-access-tokens/new`.

## Backward-Compatibility Rejection Log

- No old/new request functions side by side; no "clone locally" message kept; no compatibility for older clients (DESIGN rule 9).

## Change / Refactor Sequence

1. `github-request.ts` (rename, `token` option, header forms), then `node-github-token.ts`.
2. Client: access rule, messages, `downloadArchive`; remove the `private` refusal.
3. Rewire the skill repository and skill source service, then the installer, agent package service and edit capture; Codex strategy constructor; remove `buildGitHubRepositoryArchiveUrl` and the generic downloader use.
4. GraphQL operations, then web (GraphQL, store, line, two screens, i18n, codegen).
5. Tests, docs, glossary.

## Key Tradeoffs

- **Anonymous first vs token whenever connected.** Anonymous first keeps public sources exactly as today and immune to a bad token. The cost is one extra request per call for private sources: ls-refs is not in the REST quota, and REST is called only at import.
- **codeload with a header vs the REST tarball.** No credential-bearing URL exists in the process, and downloads stay outside the REST quota. The endpoint is undocumented, but its behavior is measured.
- **One token (DEC-001):** one place to renew. Disconnecting in one place disconnects it everywhere, which the line's text states.

## Risks

- **codeload stops honouring the header.** Private downloads would fail with "no access" while metadata succeeds. Mitigation: the live test (below) catches it. The fix would be the REST tarball with the signed redirect kept out of logs and errors.
- **Rate-limit gate.** The gate keys by host family, not by token. An authenticated 403/429 rate limit could hold back requests made without a token, or the reverse. This is rare at our request volumes; it is recorded and not designed for (DESIGN "start simple").
- **Test token expiry.** `test.github.token` expires 2026-11-25. Live evidence must run before then, or the founder renews it.
- **No private agent-package fixture.** The test token's private repository is not an agent package, so the live test proves the transport (metadata, head, archive). The full import of a *valid* private package is proven through GraphQL with a faked GitHub (see below). A real private package fixture would need the founder; API/E2E asks for an evidence decision if it judges that necessary.

## Guidance For Implementation

- Reproduction to start from: none (feature).
- Tests:
  - **Unit (client, fake fetch and fake reader):** every C-4 case; the C-3 header per host; the token never in any thrown message; the reader never called for a public 200; codeload 404 with a token → no-access text.
  - **Unit:** `gitHubRequest` with a redirect hop recomputes the header for the hop's host.
  - **Agent package and skill flows:** the existing tests are moved to the client fake.
  - **GraphQL e2e:** `connectGitHub` (fake `verifyToken` fetch) → `githubConnection` connected → `disconnectGitHub`. Then a private import end to end with a faked GitHub: REST/codeload 404 without a token, 200 with it.
  - **Live (test vault, gated like `mcp-github-remote-live`):** a client with `readToken` returning `test.github.token`, against a private repository the token can read, found through `/user/repos` with its name never printed. Metadata, head and archive succeed. Without a token, the "connect GitHub" text.
  - **Custody check:** after the flows, the token value is absent from the captured server log, thrown errors, the registry files and the GraphQL responses.
- Web: component tests for the line's three states and its error texts; the manager and modal render the line.
- Secret Gate before the first push (RELEASE.md).
