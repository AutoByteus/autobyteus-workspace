# Handoff Summary — private-github-packages-627 (autobyteus-627)

## Summary Meta

- Ticket: `private-github-packages-627` (Project Task `autobyteus-627`): import and update private GitHub repositories as agent packages and skill sources.
- Date: `2026-11-24`
- Classification: `task_size: Medium`, `architectural_risk: High` (design spec § Task Size And Architectural Risk), so architecture review, source review and test-code review were selected; the SR-003 text change (a Small / Low delta) ran on the direct route.
- Route: architecture review → implementation (IR-001, IR-002) → source review (CRR-001 Pass, 9.5/10) → API/E2E (API-REV-001 Pass 95%; API-REV-002 Pass 95% for SR-003) → test-code review (CRR-002 Pass; Not Required for SR-003) → delivery (DR-001).
- Current Status: `Verified from evidence / finalized on personal; no release` (the commits are in `release-deployment-report.md`).
- Branch: `codex/private-github-packages-627`, base `origin/personal` @ `e3cf5454a4`; delivery merged `origin/personal` @ `c2f21f18ba` (49 commits, mostly autobyteus-628) as `6d2a3e88bf` with no conflicts. Code `3a83f76325` and `30fcc50ec7` (IR-001), `12651e48f7` (IR-002, SR-003); tests `35a2f84fbf`.

## Delivery Summary

- **Private repositories import and update.** An agent package or a skill source can be a private GitHub repository. `GitHubRepositoryClient` owns one **access rule**: each request (REST metadata, the `ls-refs` head, the codeload archive pinned to a commit) goes without a token first; only when GitHub answers 401 or 404 does it read this node's GitHub token from the vault and send the request again with it (`Authorization: Bearer` for `api.github.com` and `codeload.github.com`, `Basic x-access-token` for `github.com`, computed for each redirect hop's own host). A public repository never reads the token.
- **Connect in place.** A **GitHub connection** line in the import areas of Agent Packages and Skill sources shows the node's connection and offers **Connect GitHub**, **Replace token**, **Disconnect** (GraphQL `githubConnection`, `connectGitHub`, `disconnectGitHub`). A saved token is checked with GitHub first (an invalid one is refused, nothing saved), kept in the node's vault and never shown again. It is the same token the GitHub integration uses (DEC-001).
- **Updates on schedule.** Update checks and updates of a private source use the token on the normal schedule, including the node's own automatic updates; a failed check keeps the installed content and stores its reason.
- **Clear refusals.** Not connected ("private, or not found … connect GitHub on this node"), token rejected ("expired or revoked, reconnect"), no access ("give the token Contents: read"), vault unavailable. Each is the text of an import error and of a failed check's `lastError`.
- **Custody.** The token is only ever a request header: never in a URL, log line, error, record or response; the archive is a staging file (0600) extracted without a `.git` folder. Scans of answers, output and every file of the node found no token (API-02, API-03, API-04).
- **Update checks card (SR-003, AC-008).** Settings → Update checks no longer says "No account or token is used"; it says "No account is used. This node's GitHub token is sent only to GitHub, and only for private repositories. Nothing is sent to AutoByteus." (zh-CN too). Delivery found this: the change had made the old text false.
- Docs: from the code commits `agent_packages.md`, `credential_proxy.md`, `secret_management.md`, `skills.md`, `update_notifications.md`, `GLOSSARY.md`, web `integrations.md`, `settings.md`, `skills.md` (verified); at delivery the lines the source review's C-01 named, the test lists, and web `agent_management.md` (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence by delivery. No user check is needed: every acceptance criterion (AC-001 … AC-008) is directly proven.
- Key evidence (under `evidence/API/`):
  - `API-01-live-client.log`, `API-02-built-server-live.log`: real GitHub with the vault token, `Tests 1 passed` each: the client's transport, the built server's token-save path, refusals and validation. The token's one private repository holds no package, so a private package's install and update run against an emulated GitHub on the built server (`API-04`: the node's own scheduled pass installs the new commit; after Disconnect "not connected"; after a revocation the package stays).
  - `API-03-docker-node.log`: a test-owned Docker node, the container's client byte-identical to this worktree's, `0 left` afterwards.
  - `API-05-e2e.log`: whole `pnpm test:e2e` 574 passed; `API-06-probe.log`: the browser probe, all five WEB-627 cases Pass (en and zh-CN), custody `leaks: []`.
  - `API-11-sr003-text.log`: both catalogues equal AC-008 word for word; 59 settings spec files / 399 tests pass, UpdateChecksCard 8/8.
  - Reused from the handoff: whole unit 9035, whole integration 523, web 6121.
- Integrated state (`evidence/DEL-post-integration/`, merged state `6d2a3e88bf`): `pnpm install --frozen-lockfile`, `codegen:check` ("generated/graphql.ts is current"), both typechecks at baseline (server 972/299, web 86/36), server rebuilt, the three GitHub E2E files with the live cases in strict mode against real GitHub: `Test Files 3 passed, Tests 4 passed`, no token pattern in the log. On the final state: the card spec 8/8, web typecheck and `codegen:check` pass.
- Final confidence 95%, no category below 95%.
- Secret Gate PASS; artifact hygiene and licensing PASS.

## Residual Risks For The User

- **`test.github.token` expires 2026-11-25.** After that the live cases skip, or fail under `AUTOBYTEUS_LIVE_STRICT=1`, until the founder renews it. They ran on the final base today.
- **codeload's `Authorization` header is undocumented** (measured, not promised by GitHub; the design decided it). The live client test and the built-server and Docker-node cases catch a change, but only while a token is valid.
- **The rate-limit gate counts per host family, not per token** (a recorded, accepted design risk): an authenticated 403/429 could hold back the other kind of request.
- **One token per node, shared with agents.** The GitHub integration uses the same token, so agents that have it can read what the token can read (DEC-001): pick the token's repositories with that in mind.
- A repository GitHub answers 404 for (private or missing) gets the same "private, or not found" text, and a public repository whose installed commit codeload no longer serves would too (the design's accepted limit).
- Application Packages still import public repositories only (FU-627-01).

## Follow-ups

`follow-ups.md`: FU-627-01 (Application Packages onto the same client) and FU-627-02 ("Sign in with GitHub", Device Flow). Docs sync found none. The Solution Designer sends them.

## Release

- No release. No release was asked for, and RELEASE.md's default is no release. `release-notes.md` holds the user-facing notes for whichever release includes this change.
