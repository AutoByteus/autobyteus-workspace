# Docs Sync Report — private-github-packages-627 (autobyteus-627)

## Scope

- Ticket: `private-github-packages-627` (autobyteus-627), route `Reviewed` (architecture review ARCH-REV; source review CRR-001 Pass 9.5/10; API/E2E API-REV-001 Pass 95% and, for SR-003, API-REV-002 Pass 95% on the direct Small/Low route; test-code review CRR-002 Pass).
- Trigger: API/E2E's API-REV-002 Pass for SR-003 (the Update checks card text), which returned the package after delivery's hold.
- Bootstrap base reference: `origin/personal` @ `e3cf5454a4`.
- Integrated base reference used for docs sync: `origin/personal` @ `c2f21f18ba` (49 commits, mostly autobyteus-628), merged as `6d2a3e88bf` with no conflicts and no file changed by both sides. The base did not move again while the SR-003 round ran.
- Post-integration verification reference: `6d2a3e88bf` and the final state `b14be62209`; see `release-deployment-report.md` § Initial Delivery Integration Refresh.

## Why Docs Were Updated

- Summary: Agent Packages and Skill sources import and update private GitHub repositories with this node's GitHub token. One `GitHubRepositoryClient` owns the access rule: every request goes without a token first, and only when GitHub answers 401 or 404 is it sent again with the node's token (`Authorization: Bearer` for `api.github.com` and `codeload.github.com`, `Basic x-access-token` for `github.com`). Imports check the token with GitHub when it is saved, update checks and updates use it on the normal schedule, and the token is only ever a request header. The Update checks card in Settings now says where the token goes (SR-003).
- Why this should live in long-lived project docs: the module docs are what the next change to GitHub imports, update checks or the secret vault reads first, and they also state what the product promises about the token.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | The ticket follows the rules (one owner of the access rule, visible dependencies with a recorded deviation) and adds none. |
| `TESTING.md` | New gated suites; a vault secret ID | No change | It keeps no per-suite descriptions or vault IDs; the gates and the secret live in `secret_management.md`. The fresh-start build for a build-input change (`autobyteus-web/package.json`, `generated/graphql.ts`) ran (API-08). |
| `RELEASE.md` | Finalization and release rules | No change | Followed as written. |
| `GLOSSARY.md` | Terms | No change by delivery (already updated) | "Private repository" and "Access rule (GitHub client)" verified against `GitHubRepositoryClient`. |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | The package GraphQL and the private-repository section | Updated | The implementation's "Private GitHub Repositories" section (access rule, texts, custody, tests) verified. Delivery: `importAgentPackage` no longer says "public"; "identity and visibility" is now "identity"; the test list names the built-server and the Docker-node suites with their gates (C-01 and the reviewer's test list). |
| `autobyteus-server-ts/docs/modules/update_notifications.md` | Network calls and what the card promises | Updated | It said "one unauthenticated request … A `401` or `404` means the repository is missing or not public", "identity and visibility" and "No account or token is used". Now: the request goes without a token first and with the node's token on 401/404; "identity" only; no account, and the token goes to GitHub only to read a repository GitHub did not show without it (C-01, and the paragraph beside it). |
| `autobyteus-server-ts/docs/modules/skills.md` | Skill source checks | Updated | "identity and visibility" → "identity" (C-01). |
| `autobyteus-server-ts/docs/modules/secret_management.md` | The vault's test-only secret IDs | Updated | `test.github.token` is read by the live client test and now also the built-server and Docker-node suites, each with its gate. |
| `autobyteus-server-ts/docs/modules/credential_proxy.md` | The other consumer of the GitHub token | No change by delivery (already updated) | Verified: agents still never see the token; the per-agent access rule is unchanged. |
| `autobyteus-web/docs/settings.md` | The Update checks card and the GitHub connection line | No change by delivery (already updated; SR-003 by implementation) | Card text matches AC-008 (API-11 parsed it against the requirements row); the connection line section matches the component. |
| `autobyteus-web/docs/skills.md`, `integrations.md` | The skill sources import area; the integration's token | No change by delivery (already updated) | The shared GitHub connection line is described. |
| `autobyteus-web/docs/agent_management.md` | Package row actions | Updated | "Public GitHub package rows can Check again" is now "GitHub package rows (a public repository, or a private one through the node's GitHub connection)"; the row's actions are not limited to public sources (`AgentPackagesManager.vue` gates on `sourceKind` and `updateInfo.canCheck`). |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `agent_packages.md`, `credential_proxy.md`, `secret_management.md`, `skills.md`, `update_notifications.md`, `GLOSSARY.md`, web `integrations.md`, `settings.md`, `skills.md` | Update (code commits) | The access rule, the connection line, custody, the vault ID's consumers | The ticket's behavior |
| `update_notifications.md` | Update (delivery) | Network Calls: access rule instead of "unauthenticated … not public"; "identity"; the token promise | The old lines described public-only behavior |
| `agent_packages.md`, `skills.md` | Update (delivery) | "public" and "visibility" dropped; test list | Same |
| `secret_management.md` | Update (delivery) | Two more users of `test.github.token` with their gates | Test lists |
| `autobyteus-web/docs/settings.md` | Update (SR-003, implementation) | The card text | AC-008 |
| `autobyteus-web/docs/agent_management.md` | Update (delivery) | "Public GitHub package rows" | Private rows have the same actions |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The access rule | One owner; the token is read only after GitHub answers 401 or 404; header form per host and per redirect hop; with a token 401 = rejected, 403/404 = no access; a public repository never reads it | `design-spec.md` DS-001 … DS-003 | `agent_packages.md`, `GLOSSARY.md` |
| Custody | The token is a request header only: never in a URL, log, error, record or response; the archive is written to a staging file (0600) and extracted, with no `.git` | requirements REQ-005, AC-005 | `agent_packages.md`, `credential_proxy.md` |
| Texts as the card and the check show them | The four refusal texts; the card's token promise | `design-spec.md` C-1 … C-4, SR-003 | `agent_packages.md`, `update_notifications.md`, web `settings.md` |
| Accepted design risks | codeload's `Authorization` header is measured but undocumented (live cases catch a change while a token is valid); the rate-limit gate counts per host family, not per token | `design-spec.md` § Design Risks | The requirements and design (not a project rule) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `publicGitHubRequest` (renamed `gitHubRequest`) and the generic URL-logging download for archives | `GitHubRepositoryClient.request`, which carries the access rule, and `downloadArchive` | `agent_packages.md` |
| "Imports and checks are public-only; a 401/404 means not public" | The access rule | `agent_packages.md`, `update_notifications.md`, `skills.md` |
| "No account or token is used" on the Update checks card | The card's SR-003 text | web `settings.md`, `update_notifications.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verify from the evidence (done: `release-deployment-report.md` § Verification), commit, archive, finalize.
- Notes: no out-of-scope doc problem found; `follow-ups.md` keeps FU-627-01 and FU-627-02.
