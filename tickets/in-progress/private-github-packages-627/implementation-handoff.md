# Implementation Handoff — autobyteus-627 Private GitHub Repositories for Agent Packages and Skills

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (`Medium`/`High`);
  ARCH-REV-001 Pass. Handoff rule for a completed implementation with High risk → `/code_reviewer`.
- Requirements doc: [requirements-doc.md](requirements-doc.md) (Approved, SR-002)
- Investigation notes: [investigation-notes.md](investigation-notes.md)
- Solution revision record: [solution-revision-record.md](solution-revision-record.md)
- Design spec (required on every route): [design-spec.md](design-spec.md) (Ready, SR-002)
- Supplemental task artifacts: [probe-627-results.txt](probe-627-results.txt), [follow-ups.md](follow-ups.md)
- Design review report: [design-review-report.md](design-review-report.md) (ARCH-REV-001, the reviewer's file, not
  committed by me)
- Architecture review revision record: [architecture-review-revision-record.md](architecture-review-revision-record.md)
  (the reviewer's file, not committed by me)
- Triggering rework report, revision record, or evidence: N/A (initial).

## Current Implementation Summary

One access rule in `GitHubRepositoryClient` serves every GitHub request of Agent Packages, Skill sources (integration
sources included) and the Codex release check: each request goes without a token first; only on 401/404 is this
node's GitHub token read from the vault (`readNodeGitHubToken`, entry `integration.github.token`) and the request sent
again with the header of its host (Bearer for api.github.com/codeload, Basic `x-access-token` for github.com,
recomputed per redirect hop after the host check). With the token, 401 is "rejected" and 403/404 "no access"; without
one, "connect GitHub"; a vault failure gives the vault text (C-4). All archive downloads go through the client's
`downloadArchive`. The node's GitHub connection has its own GraphQL API (`githubConnection`, `connectGitHub`,
`disconnectGitHub`) over `IntegrationConnectionService`, used by the new **GitHub connection line** in the Agent
Packages import box and the Skill sources dialog.

- Implementation cycle: `Initial`
- Implementation revision record: [implementation-revision-record.md](implementation-revision-record.md)
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A` (AR-001 measured: ls-refs 404 for a valid token without access; IMP-01, IMP-02)

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the implementation stayed within the named owners (about 13
  server source files, 9 web source files, docs); no persistence change. The High drivers are exactly the designed
  ones: a second consumer of the vault secret, a new write path without an imported integration, the shared client's
  contract, the undocumented codeload header behavior.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. AR-001 holds (404), so no Design Impact. No token or
  credential-bearing URL reaches a log, error, record or response (IMP-02, IMP-06/IMP-13 custody checks, IMP-10).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (UC-001) | Private repository imports as an Agent Package with the node's token | `AgentPackagesManager` → `importAgentPackage` → `AgentPackageService` (one client, `readNodeGitHubToken`) → `GitHubAgentPackageInstaller.installPackage` → `client.fetchRepositoryRevisionMetadata` + `client.downloadArchive` → extract/validate/rename | Unit IMP-04 (installer, access rule); GraphQL e2e with faked GitHub IMP-06; live transport IMP-02; browser IMP-10 |
| BEH-001 (UC-002) | Private repository imports as a Skill source (and integration source) | `SkillSourceService` (client with `readNodeGitHubToken`) → `client.fetchRepositoryRevisionMetadata` → `GitHubSkillRepository.prepare` → `client.downloadArchive` | Skill unit tests over the client fake (IMP-04); same client and rule as UC-001 |
| BEH-001 / REQ-002 | Not connected: "private or not found; connect GitHub" with the connect step in place | client `tokenFor` → `notVisibleMessage`; `GitHubConnectionLine` in both import areas → `connectGitHub` → `IntegrationConnectionService.connect("github")` (verifyToken, then vault) | IMP-04, IMP-06, IMP-08, IMP-10 |
| BEH-002 (UC-003) | Checks and updates of a private source use the token on the schedule; failure keeps content | `GitHubAgentPackageUpdates` / `SkillSourceService` → `client.fetchDefaultBranchHead` (ls-refs 401 → Basic) → `downloadArchive` for update and edit capture | IMP-04 (access rule, installer `downloadRevision`), IMP-06 (check UP_TO_DATE, then CHECK_FAILED with content kept after disconnect), IMP-02 (live ls-refs) |
| BEH-003 | Token used server-side as a header only; agents unchanged | `gitHubRequest` `credentialHeader`; credential proxy untouched | IMP-04 (`github-request-credentials`), custody IMP-02/06/10 |
| BEH-004 / REQ-004 | Three cases told apart: not connected, rejected, no access | client `request` (401 → `TOKEN_REJECTED_MESSAGE`; 403/404 → `noAccessMessage`); codeload 404 with a token → no access | IMP-04 (every case), IMP-02 live (no access on REST and ls-refs, rejected with an invalid token) |
| REQ-005 | Token and signed URLs never in logs, errors, records, UI, exports | No REST tarball; no URL ever carries a credential; the generic URL-logging downloader is no longer used for archives | IMP-02, IMP-06 (responses, captured output, data dir, vault DB file), IMP-10 (page text, backend/frontend logs, data dir) |
| REQ-006 (UC-005) | Docker node with its own connection | Same code; the node's own vault and window | Not run here; left to API/E2E (see below) |
| REQ-007 | Public repositories work with no token and with a rejected token | Anonymous first: the reader is never called on a 2xx | IMP-04 (`REQ-007` case), IMP-02 (public repo reads no token) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/src/`):
- `integrations/github/github-request.ts` (renamed from `public-github-request.ts`): `gitHubRequest`, `token` option,
  `credentialHeader` per hop.
- `integrations/github/node-github-token.ts` (new): `GitHubTokenReader`, `readNodeGitHubToken`.
- `integrations/github/github-repository-client.ts`: constructor `{ readToken, fetchImpl? }`, access rule `request`,
  `tokenFor`, the C-4 texts, `downloadArchive`; `private` refusal removed.
- `integrations/github/github-repository-source.ts`: `buildGitHubRepositoryArchiveUrl` removed; URL errors no longer
  say "public".
- `agent-packages/installers/github-agent-package-installer.ts`: `githubClient` required; `downloadArchive` helper
  writes `<target>/download/repository.tar.gz`; generic downloader, `fetchImpl`, `downloadFileFromUrlImpl`, the
  unused `getDownloadDir` config field and the branch path removed.
- `agent-packages/services/agent-package-service.ts`: one client for installer and updates.
- `skills/installers/github-skill-repository.ts`: takes `client`; `download` and options removed.
- `skills/services/skill-source-service.ts`, `runtime-management/.../codex-agent-runtime-strategy.ts`: construct with
  `readNodeGitHubToken`.
- `api/graphql/types/integrations.ts`: `GitHubConnection`, the three operations, shared `requireToken`.

Web (`autobyteus-web/`): `components/github/GitHubConnectionLine.vue`, `stores/githubConnectionStore.ts`,
`graphql/githubConnection.ts`, `components/settings/AgentPackagesManager.vue`, `components/skills/SkillSourcesModal.vue`,
`localization/messages/{en,zh-CN}/githubConnection.ts` (+ index, `skills.ts`, `integrations.ts` wording),
`generated/graphql.ts`, `demo/graphql/unreachable-operations.json`, `tests/e2e/github-connection-line-probe.mjs` +
`tests/e2e/fixtures/github-private-upstream.mjs` (`test:e2e:github-connection-line`).

Tests (server): `tests/unit/integrations/github/github-access-rule.test.ts`, `github-request-credentials.test.ts`,
`node-github-token.test.ts` (new); installer download tests; `tests/e2e/integrations/github-private-repository-graphql.e2e.test.ts`
(new), `github-private-repository-live.e2e.test.ts` (new, gated `RUN_GITHUB_PRIVATE_REPOSITORY_E2E=1`);
`tests/helpers/unused-github-client.ts` (new); stale constructions and texts rewritten in the agent package, skill,
update-budget, rate-limit and e2e tests.

Docs: `GLOSSARY.md` (Integration entry corrected; GitHub connection, Private repository, Access rule),
`docs/modules/{agent_packages,credential_proxy,secret_management,skills,update_notifications}.md`,
`autobyteus-web/docs/{settings,skills,integrations}.md`.

## Important Assumptions

- The vault runtime is initialized at startup before any import or scheduled check (the design's P16 reasoning);
  `readNodeGitHubToken` looks it up per call and a missing runtime throws `VAULT_UNAVAILABLE` (→ the vault text).
- `GitHubRepositoryClient` leaves `fetchImpl` to `gitHubRequest` when absent, which then uses the global `fetch` at the
  time of each request (as the skill download and the generic downloader did). E2E suites that stub the global `fetch`
  after the service exists keep working.

## Known Risks

- **Test token expiry (2026-11-25).** The live transport test (IMP-02) ran and passed on 2026-11-24. Re-running it after
  the expiry needs a renewed `test.github.token` that can read a private repository.
- **codeload's header support is undocumented** (design Risks). The live test catches a change: metadata would pass and
  the download fail with "no access".
- **Rate-limit gate keyed by host family, not token** (design Risks; not designed for).
- **No real private agent-package fixture.** The live test proves the transport against the token's private repository
  (which is not an agent package); the full import of a valid private package is proven with a faked GitHub (IMP-06,
  IMP-10). API/E2E may ask for an evidence decision if it needs a real private package.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: Duplicated Policy Or Coordination (archive download) plus the feature
- Reviewed refactor decision: `Refactor Needed Now` (archive download moved into the client)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: one `downloadArchive` owner; the agent package archive no longer goes through
  `utils/download-utils.ts` (which logged URLs, had no gate and a 30 s timeout); that utility stays for its other
  callers (media, Application Packages).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` — `publicGitHubRequest`/
  `PublicGitHubRequestOptions` (renamed), the `private` refusal and both "clone locally" texts,
  `GitHubSkillRepository.download` and its `fetchImpl`/`download` options, the installer's `fetchImpl`,
  `downloadFileFromUrlImpl`, `getDownloadFileFromUrl`, the `downloadFileFromUrl` import, the unreachable
  `latestRevision?` branch and `buildGitHubRepositoryArchiveUrl` (integrations copy; evidence: `types.ts:17`, no other
  caller — Application Packages import their own copy), and the installer config's `getDownloadDir` field (read
  nowhere in the installer; `git grep` shows only the type and test literals, which were removed).
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`GitHubConnection` has `connected`, `login`; `connectedAt` left out as designed)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: `None`. Additions beyond the design's file list,
  all within the change's scope:
  - P15 wording in touched files: the URL errors `Only github.com repository URLs are supported.` and `Use an HTTPS
    github.com repository-root URL …` no longer say "public"; the Integrations import hint
    (`integrations.import.hint`, en/zh-CN) too, because integration sources use the same client. The Application
    Packages texts keep "public" (out of scope, FU-627-01).
  - `tests/helpers/unused-github-client.ts`: one loud-failing fake for the client methods a test never reaches.
  - The iOS demo's `unreachable-operations.json` lists the three new operations (TESTING.md: every operation the web
    defines is answered or listed), with the existing `settings` reason (desktop Settings, integrations).
  - A browser probe for the line (`test:e2e:github-connection-line`), used for the rendered check (IMP-10).
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Largest touched:
  `agent-package-service.ts` 447 lines, `skill-source-service.ts` 339, `github-agent-package-installer.ts` 323,
  `integrations.ts` 248, `github-repository-client.ts` 219; no file passes 500.
- Notes: the change is large in lines mostly from tests and docs; source deltas are per owner.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: design-spec.md § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: records keep their shape; only the stored check-error
  wording changes (IMP-06 shows `lastError` with the new text).
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Node v22.23.1, macOS. Server tests use their own test database (`tests/.tmp`); the live test reads only the test vault
  (`AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`, read-only). Nothing touched `~/.autobyteus`.
- Web specs need `nuxt prepare` (the web typecheck runs it) and `NUXT_TEST=true`.
- Untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are build
  output from `prepare:source`; not committed (RELEASE.md).

## Checks Run

Evidence files are in [evidence/](evidence/). Commits: `3a83f76325` (implementation), `30fcc50ec7` (two e2e type
fixes and the browser probe; no source change). IMP-03 and IMP-05 are superseded by IMP-11 and IMP-12.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Temporary read-only probe (removed): the valid test token to a repository name it can't read; REST, ls-refs, codeload | 6545fcfad3 (before code) | macOS, Node 22, test vault | GitHub itself (AR-001) | AC-004, AR-001 | Pass (404) | `IMP-01-ar001-probe.log` | `"lsRefsWithToken":404` |
| IMP-02 | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault AUTOBYTEUS_LIVE_STRICT=1 RUN_GITHUB_PRIVATE_REPOSITORY_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/integrations/github-private-repository-live.e2e.test.ts --no-watch` | work tree before 3a83f76325 (same client code) | live GitHub, test token (expires 2026-11-25) | client access rule, `downloadArchive`, `gitHubRequest` headers | AC-001, AC-003, AC-004, AC-005, AC-007, AR-001 | Pass | `IMP-02-live-private-repository.log` | `Tests  1 passed (1)`; no `github_pat`/`Bearer`/`token=` in the log |
| IMP-13 | Same live test plus `github-private-repository-graphql.e2e.test.ts` (`tests/e2e/integrations`, gate set) | 30fcc50ec7 | live GitHub + in-process GraphQL, own vault | as IMP-02 and IMP-06 | AC-001…AC-005, AC-007 | Pass | `IMP-13-new-e2e-and-live.log` | `Tests  2 passed (2)` |
| IMP-11 | `pnpm -C autobyteus-server-ts typecheck` | 30fcc50ec7 | macOS, Node 22 | server src + tests | — | Pass | `IMP-11-server-typecheck.log` | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)` |
| IMP-04 | `pnpm -C autobyteus-server-ts test:unit` | 3a83f76325 | macOS, Node 22, no test vault | whole server unit suite (access rule, request headers, token reader, installer, services, skills, update budget) | AC-002, AC-003, AC-004, AC-005, AC-007 | Pass | `IMP-04-server-unit.log` | `Tests  9035 passed \| 9 skipped (9044)` |
| IMP-12 | `pnpm -C autobyteus-server-ts test:integration:prepare && pnpm -C autobyteus-server-ts test:integration` | 30fcc50ec7 | macOS, Node 22 | whole integration suite (installer constructions) | — | Pass | `IMP-12-server-integration.log` | `Tests  523 passed \| 71 skipped (594)` |
| IMP-06 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/integrations <agent-packages-graphql, skill-name-catalog-graphql, github-skill-sources-graphql, agent-package-definitions-live-refresh, update-notifications-live, package-personal-settings, agy-skill-update-notice-roots, credential-proxy/integrations-graphql> --no-watch` | 3a83f76325 + the two e2e type fixes (committed in 30fcc50ec7) | macOS, Node 22, no test vault (live file skipped) | every e2e that imports or checks through the GitHub client or its stub | AC-001, AC-002, AC-003, AC-005, AC-007 | Pass | `IMP-06-server-e2e-affected.log` | `Tests  79 passed \| 6 skipped (85)` |
| IMP-07 | `pnpm -C autobyteus-web typecheck` | 3a83f76325 | macOS, Node 22 | web app, cross-package tests | — | Pass | `IMP-07-web-typecheck.log` | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)` |
| IMP-08 | `pnpm -C autobyteus-web exec cross-env NUXT_TEST=true vitest run` | 3a83f76325 | macOS, Node 22 | whole web suite (line, store, manager, modal, integrations page) | AC-002, AC-004 | Pass | `IMP-08-web-nuxt-tests.log` | `Tests  6121 passed \| 2 skipped (6123)` |
| IMP-09 | web guards (`guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`), demo coverage spec, `codegen:check` | 3a83f76325 | macOS, Node 22 | localization, demo operation list, generated types | — | Pass | `IMP-09-web-guards-codegen.log` | `Passed with zero unresolved findings`; `Tests  8 passed (8)`; `exit=0` |
| IMP-10 | `pnpm -C autobyteus-server-ts build && node autobyteus-web/tests/e2e/github-connection-line-probe.mjs <fresh dir>` | 30fcc50ec7 | built backend (own data dir + vault), Nuxt dev, headless Chrome 1440×1000, GitHub emulated | the line, both screens, a private import through the real stack, en + zh-CN, custody | AC-001, AC-002, AC-005 | Pass | `IMP-10-browser-probe.log`, `IMP-10-browser-probe/` (result.json, 5 screenshots) | `"result":"Pass"`, five cases Pass, `leaks: []`, `pageErrors: []`, all cleanup true |
| — | `gitleaks protect --staged` before each commit | both | local | the diff | REQ-005 | Pass | — | `no leaks found` |

- Not run, and why: AC-006 Docker (left to API/E2E); the whole server E2E suite (the affected files ran, IMP-06);
  `scripts/check_secrets.sh` over the branch range (before the first push, delivery's gate); the iOS demo build
  (`prepare-demo-web.sh --build`), left to delivery/API-E2E: the source-level demo coverage check passed (IMP-09).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings → Agent Packages import box; Skills → Sources dialog (add-source area).
- Approved UI/UX, interaction, requirement, or design references: design-spec.md § Concrete Examples (connection line
  states), REQ-002, DEC-002 (SR-002 refinement). No Product Design spec.
- Existing design system, shared components, and adjacent product surfaces reviewed: `IntegrationDetail.vue` token
  field (password input, coded messages), the manager's and dialog's existing buttons and spacing.
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md § Browser probes — a
  probe-owned built backend, Nuxt dev server and fresh headless Chrome (IMP-10).
- States, layouts, viewports, and interactions inspected: not connected (both screens), the token form (password
  field, guidance, link), a refused token, connected with usage text and Replace token / Disconnect, disconnect in the
  dialog, zh-CN text and layout, 1440×1000. I looked at each screenshot: the line sits under the import input inside
  the same box, aligned with it; texts fit on one line in en and zh-CN; buttons match the surrounding small buttons.
- Visual or interaction issues found and corrected: replaced a scoped `@apply` style (no other component uses it) with
  inline class strings.
- Remaining observations: after Connect, the import's earlier error ("… connect GitHub on this node.") stays above the
  list until the next Import (WEB-627-02 screenshot), as the design's walk 3 has the user press Import again. I left
  it, rather than coupling both screens' stores to the connection; a reviewer may judge otherwise. The server's C-4
  texts and the manager's existing intro are English in zh-CN (the intro was already hard-coded; the server texts are
  stored as is by design).

## Downstream Coverage Hints / Suggested Scenarios

- Private agent package import end to end on a built server against real GitHub, if the founder provides a private
  package fixture (or an evidence decision instead).
- AC-006: the same on a Docker node with its own connection (connect in that node's window; nothing from the host).
- AC-007: a public package import and check with a rejected token stored (unit and e2e cover it; a built-server run
  would confirm).
- The scheduled check path (not only "Check again") for a private source with the token, then after disconnect.
- The integration card: a token saved from the import line shows the GitHub card CONNECTED once the integration is
  imported; removing the integration's source disconnects and the next private check says "connect GitHub".
- Custody across the built server's log and app-data folder, including GraphQL request logging (the token is a
  mutation argument; the server logs no GraphQL variables: `git grep` finds no variable logging in `src/`).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-006 Docker (not run here).
- Built-server private import and update against real GitHub (the live test here is client-level).
- The full server E2E suite was not run here; the affected E2E files were (IMP-06).
- The browser probe `pnpm -C autobyteus-web test:e2e:github-connection-line` is reusable (fresh output dir).
