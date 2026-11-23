# Investigation Notes — autobyteus-627 Private GitHub URLs for Agent Packages

- Ticket: autobyteus-627 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Worktree: `autobyteus-worktrees/private-github-packages-627`, branch `codex/private-github-packages-627`, base `origin/personal` `1f761bc8db`
- Date: 2026-11-23
- Owner: Solution Designer
- All code facts below are read at `HEAD` of the branch (no uncommitted code in the worktree).

## 1. Current behavior (how GitHub imports work today)

### 1.1 One shared, unauthenticated GitHub client

`autobyteus-server-ts/src/integrations/github/` is used by Agent Packages, Skills and the Codex runtime check:

| File | What it does | Auth today |
| --- | --- | --- |
| `public-github-request.ts` | `publicGitHubRequest(url, options)`: the only HTTP door. Manual redirects, 30 s timeout, rate-limit gate families (`api` = api.github.com; `web` = codeload.github.com and github.com `git-upload-pack` / `releases/latest`). Refuses a URL with a username, password or port. | None; sends no `Authorization` header |
| `github-repository-client.ts` | `fetchDefaultBranchHead` (POST `github.com/{o}/{r}.git/git-upload-pack`, ls-refs), `fetchLatestReleaseTag` (github.com `releases/latest` redirect), `fetchRepositoryMetadata` / `fetchRepositoryRevisionMetadata` (REST `api.github.com/repos/...`). | None. 401/404 → "not found or not public … clone locally and import the local path"; `payload.private === true` → "GitHub repository is not public and cannot be imported … Clone it locally and import the local path instead." |
| `github-repository-source.ts` | URL parsing; `buildGitHubRepositoryArchiveUrl` → `https://codeload.github.com/{o}/{r}/tar.gz/refs/heads/{branch}`; `…ForRef`. | — |
| `github-rate-limit-gate.ts` | Persists rate-limit back-off at `<app-data>/github/rate-limit.json`. | — |

The refusal of private repositories is **explicit by design**, not an accident: the client checks `private` and tells the user to clone locally.

### 1.2 Users of the client

| Area | Files | GitHub calls |
| --- | --- | --- |
| Agent Packages: import | `agent-packages/installers/github-agent-package-installer.ts` (:63 revision metadata; download from codeload, extract, validate the package root, rename into place) | REST metadata, codeload tarball |
| Agent Packages: refresh | `agent-packages/services/github-agent-package-updates.ts`, `agent-package-service.ts:100-102` | ls-refs (default branch head) on the update schedule |
| Skills (incl. integration skill sources) | `skills/services/skill-source-service.ts:46`, `skills/installers/github-skill-repository.ts:95` | REST revision metadata, ls-refs, codeload tarball (`publicGitHubRequest`) |
| Application Packages | `application-packages/installers/github-application-package-installer.ts` with its **own** `application-packages/utils/github-repository-source.ts` and own `fetch` (REST metadata at :104-109) | Separate copy; same "public only" behavior |
| Codex runtime | `runtime-management/agent-runtimes/strategies/codex-agent-runtime-strategy.ts:44` | `fetchLatestReleaseTag("openai","codex")`, public; not affected |

Stored state: a package/skill source record keeps the repository URL and the resolved revision; downloaded content is extracted (no `.git` directory, no git remote on disk). Nothing secret is stored today.

### 1.3 A GitHub token already exists on the node (autobyteus-311, credential proxy)

Docs: `autobyteus-server-ts/docs/modules/credential_proxy.md`, `docs/modules/secret_management.md`.

- The user stores a GitHub token **once per node**, write-only, in the node's vault, from the GitHub integration's card on the **Integrations page**. `IntegrationConnectionService.connect` checks it with GitHub first (`delivery-definitions.ts` `verifyToken`, `GET /user`) and shows "Connected as @login"; `test` re-checks; `disconnect` removes it. Error codes: `TOKEN_REJECTED`, `TOKEN_CHECK_FAILED`, `INTEGRATION_NOT_CONNECTED`, `VAULT_UNAVAILABLE`.
- Vault consumer `{ kind: "integration", integrationId: "github" }`, fixed ID `integration.github.token`. Today **only the credential proxy** resolves it, per forwarded call (`secret_management.md:127-133`).
- Agents never see the token: a run gets a loopback proxy address; the proxy adds `Authorization: Bearer <token>` for `api.github.com` and `Basic base64(x-access-token:<token>)` for git smart HTTP on `github.com` (`credential-proxy-forwarder.ts:91-94`). The token is never in an env, command line, log, trace or run file (`credential_proxy.md` Scope).
- Which agents may use it: an agent whose effective skills hold the GitHub integration's skill (`integration-access-rule.ts`).
- The connect card exists only for an **imported** integration (an integration folder in an imported skill source; `credential_proxy.md` "Integrations And Their Sources"). A node that never imported the GitHub integration has no place to enter the token.
- `token.help` already guides the user to a fine-grained token limited to the needed repositories (`credential_proxy.md:335`).

### 1.4 Related ticket autobyteus-457 (local clone auto-update)

Worktree `package-clone-auto-update-457`, requirements Approved at SR-002, no code yet. A registered **local folder that is a git clone** follows its remote by fast-forward on the GitHub-import schedule, using system git and therefore the user's own credentials (SSH key, `gh` helper, keychain). This already gives desktop users a private-repo route that needs no AutoByteus token. It does not help a Docker node (the container does not have the host's git credentials) and it needs the user to clone first.

### 1.5 Project rules on secrets

- `RELEASE.md` Secret Gate: the repository is public; gitleaks scans every ticket branch before push.
- `secret_management.md`: callers name a semantic consumer; the catalog rejects unknown consumers; values are `SecretValue` and are revealed only to a trusted consumer at the point of use.
- `DESIGN.md` area contracts: the Node Access Model and Collaboration Model are not touched by this ticket.

## 2. Measurement (probe)

### 2.1 What, where, why

- **What:** a read-only vitest probe `autobyteus-server-ts/tests/probe-627/private-github.probe.test.ts`, reading `test.github.token` from the test vault (`AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`, `readLiveTestSecret`). It printed only HTTP statuses, hosts and booleans to `probe-627-results.txt`; never the token, never a URL with a query, never the private repository's name.
- **Why:** to know which GitHub endpoints accept the token for a private repository and whether any of them puts a credential into a URL.
- **Removed:** the probe folder was deleted after the run (2026-11-23); it was never committed. `git status` shows only this ticket folder.

### 2.2 Results (`probe-627-results.txt`)

Token kind: fine-grained PAT (`github_pat_` prefix; GitHub returns no `X-OAuth-Scopes` header for it).

| Call | Public repo, no token | Public repo, token | **Private repo, no token** | **Private repo, token** |
| --- | --- | --- | --- | --- |
| REST `GET /repos/{o}/{r}` | 200 | 200 | **404** | **200** (`private: true`) |
| ls-refs `POST github.com/{o}/{r}.git/git-upload-pack` (Basic `x-access-token`) | 200 | 200 | **401** | **200**, HEAD found |
| REST `GET /repos/{o}/{r}/tarball/{ref}` (Bearer) | — | 302 → codeload.github.com, **no** `token=` in the redirect | — | 302 → codeload.github.com, **redirect URL contains a `token=` query** (short-lived signed URL); downloading it: 200, gzip |
| codeload `tar.gz/refs/heads/{branch}` direct | 200 | 200 (Bearer) | **404** | **200** (Bearer) |
| REST `GET /repos/{o}/{r}/releases/latest` (Bearer) | — | 200 | — | 404 (that repository has no release; not conclusive) |

Conclusions:

1. A fine-grained PAT with read access to the repository is enough for every call agent packages and skills make today (metadata, ls-refs update check, tarball).
2. Without a token, a private repository looks like "does not exist" (404 on REST/codeload, 401 on git). With a token that cannot see the repo it also looks like 404, so the error message must say "not found, or your GitHub token cannot read it".
3. **Secret-in-URL risk, measured:** GitHub's documented tarball endpoint answers with a redirect whose URL carries a temporary token. That URL must never be logged, stored, shown in an error, or kept in a record. The direct codeload URL with an `Authorization` header gives the same archive without a credential in any URL (measured 200), but codeload with a header is not a documented GitHub contract; the REST tarball endpoint is.
4. Agent packages and skills keep working without git on the server: the tarball path needs no `.git` folder, no git remote and no credential helper on disk.

## 3. Approaches analyzed

| # | Approach | Works on Docker node | Secret custody | User effort | Verdict |
| --- | --- | --- | --- | --- | --- |
| A | **Reuse the node's GitHub connection token** (vault, already exists) for server-side imports and update checks | Yes (each node has its own vault; set it in that node's window) | Vault only; revealed only while the request header is set; never in URL/log/record/export | One token per node; already familiar for integration users | **Recommended** |
| A′ | Same, but a **separate "package downloads" token** (second vault consumer) | Yes | Same | Two tokens to create and renew | Only if agents' GitHub access must not reach package repos |
| B | Per-package token typed at import | Yes | Many secrets, each bound to a record; renewal per package | High; repeated renewals | Rejected: more secrets, more expiry UX, no benefit over A with fine-grained repo selection |
| C | GitHub OAuth Device Flow (OAuth App; GitHub docs, not measured) | Yes | Token in vault | Lowest (click, enter code in browser) | OAuth App tokens use the classic `repo` scope = read/write to **all** private repos. Needs an AutoByteus-owned OAuth App. Too broad; later at most |
| C′ | Device Flow with a **GitHub App** (user-to-server tokens; GitHub docs, not measured) | Yes | Token + refresh token in vault | Low, but the App must be installed on each owner/org | Fine-grained and expiring (8 h token, refresh), but needs an AutoByteus-owned GitHub App, refresh handling and org installation. A later "Sign in with GitHub" improvement on top of A, not the first step |
| D | Pass through local git / SSH / `gh` credential helper (server runs `git clone`) | **No** (host credentials are not in the container) | Credentials stay with git, but behavior depends on each machine's setup; `gh`/keychain prompts can hang a server process | None on desktop | Rejected for imports. This is exactly what autobyteus-457 already offers for local clones, on desktop |
| E | git clone/fetch instead of the API tarball | Needs git in the image | A token-bearing clone writes credentials to `.git/config` unless done with a header-only config; leaves `.git` on disk | — | Rejected: the tarball path is already built, measured working, keeps no `.git` and no remote |

Docker: a Docker node is a separate node with its own vault. The user connects GitHub in that node's own Integrations/Settings view in the desktop window. Nothing is copied from the host. Memory Sync does not read the vault (no vault reference in `src/memory-sync/`; its only secrets are its own hashed hub credentials), and the package and skill records hold only the URL and revision, so nothing that is synced or exported carries the token.

Revocation and expiry: fine-grained PATs expire (the user picks up to a year, or the org enforces a limit) and can be revoked on GitHub at any time. Today, a revoked token shows up only when an agent call fails. For imports: a 401 on an import or a scheduled update check must say "GitHub rejected the token on this node; reconnect it", and the package keeps its installed content (an update check that fails changes nothing). Organization repos may require the org to approve fine-grained PATs; until approved GitHub answers 404/403, covered by the same "cannot read it" message.

## 4. Open questions for the founder (recorded as decisions in the requirements doc)

- DEC-001: one GitHub token per node shared by agents and imports (A), or a separate import token (A′)?
- DEC-002: where the user connects GitHub when the GitHub integration is not imported (today the card exists only for an imported integration).
- DEC-003: which import kinds get private support: Agent Packages only, or also Skills and Application Packages (all share the same "public only" refusal).
- DEC-004: Device Flow / "Sign in with GitHub" now or later.

## 5. Supplement inventory

| Artifact | Purpose | Status |
| --- | --- | --- |
| `probe-627-results.txt` | Raw probe output (statuses and booleans only) | Evidence, kept |
| `investigation-notes.md` | This file | Current |
| `requirements-doc.md` | Options report, requirements draft, decisions | Ready for the founder's decision |
| `solution-revision-record.md` | Revision index | SR-001 |
