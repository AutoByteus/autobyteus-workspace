# Investigation Notes — Integrations page (autobyteus-337)

## Investigation Meta

- Package identifier: `integrations-page`
- Request / ticket: Project Task `autobyteus-337`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`. It depends on autobyteus-311 step 1 (released in `v1.5.11-beta.4`).
- Workspace root / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page`, branch `codex/integrations-page`
- Base: `origin/personal` @ `e4bebdc858` (fetched 2026-10-30); finalization target `origin/personal`
- Bootstrap: OK; no blocker
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md` (this conversation, 2026-10-30); `finding-the-cause.md` and `ticket-scope.md` (read earlier in this conversation)
- Investigation status: requirements investigation complete

## Initial Request And Clarifications

- **The Task:** replace the GitHub card in Server Settings → Basics with an Integrations page. Each integration handles its own configuration:
  - one card per integration (name and description from `integration.json`);
  - install from the card (the skill), then connect (a token);
  - agent access follows the skill;
  - a clean cut of the old card and of the per-agent tick.
- **Two questions for the user:** who decides where a token may go; whether "all installed skills" agents get access.
- **The user's words (2026-10-30, relayed in the Task):** "Why does the user have to go to a server setting to do the GitHub thing? … Each integration should handle their own configuration." "each integration has their own card … when we install the integration the integration will ask the user to … log in GitHub or … provide some kind of token … it's basically a skill … then the user can basically go to any agent like how they do now and install that skill."
- **The PTM (2026-10-30):** the repository part is delivered (`AutoByteus/autobyteus-integrations` `main` `8887475`); what the page needs is in `delivery-receipt-verification.md` (REQ-010 there); do not put "the user has verified" into Done-when.

## Source Log

| Date | Type | Source | Finding |
| --- | --- | --- | --- |
| 2026-10-30 | Contract | `autobyteus-integrations` `origin/main:docs/integration-manifest.md` | **The manifest contract.** The folder name is the ID (`^[a-z][a-z0-9-]*$`). The `SKILL.md` `name` is the integration's skill (GitHub: `github-integration`). `icon.svg` is optional. `integration.json` has only `name`, `description`, `token.help` and `prerequisites` (tool names, checked with `command -v`). No unknown fields, no version. "Where a token may be sent is decided by the app, not by the integration" (§ Adding an integration, step 1) |
| 2026-10-30 | Data | `origin/main:github/integration.json` | `{name: "GitHub", description, token: {help}, prerequisites: ["curl","jq","git"]}` |
| 2026-10-30 | Doc | `delivery-receipt-verification.md` (integrations-1) | What the page needs: list from `integration.json` + folder (ID, `SKILL.md` name, `icon.svg`); install from the card and ask for the token with `token.help`; access follows the skill; clean cut of the card; state and each prerequisite's `command -v` result; the two questions; optional single-integration install |
| 2026-10-30 | Code | `autobyteus-server-ts/src/credential-proxy/integration-definitions.ts` L26-61 | The app definition carries `displayName` and `description`. Once the manifest owns them, they are a second source for the same fact (P11) |
| 2026-10-30 | Code | `credential-proxy/integration-connection-store.ts` L9-66 | `connections.json` per integration: `login`, `connectedAt`, `agentDefinitionIds`. `allowedIntegrations(agentDefinitionId)` and `isAllowed` read the ticks |
| 2026-10-30 | Code | `credential-proxy/integration-run-access.ts` L29-41 | The run decision = `store.allowedIntegrations(agentDefinitionId)`. This is the one place that changes to "follows the skill" |
| 2026-10-30 | Code | `api/graphql/types/github-integration.ts` L23-30, L74-77; `integration-connection-service.ts` L98-100, L144 | `setGitHubIntegrationAgentAccess` and the `agentDefinitionIds` field: replaced |
| 2026-10-30 | Code | `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue` L14, L37; `GitHubIntegrationCard.vue`; `stores/githubIntegrationStore.ts` L17 | The card's current home and its agent ticks |
| 2026-10-30 | Code | `agent-definition/domain/models.ts` L7-13, L34-35 | An agent definition has `skillNames` and `skillScope` (`CONFIGURED`, the default, or `ALL_INSTALLED`) |
| 2026-10-30 | Code | `skills/services/skill-service.ts` L262-289; `configured-agent-skill-resolver.ts` L44-80 | Effective skills: `ALL_INSTALLED` = every enabled installed skill; `CONFIGURED` = names resolved against the catalog. Application-owned agents resolve their bundle first |
| 2026-10-30 | Doc+Code | `docs/modules/skills.md` § Managed GitHub source lifecycle; `skills/services/skill-source-service.ts` | GitHub skill sources: import a public repository root (one source = every skill folder in it), update checks, Update, Remove. Metadata checks never download archives. A name clash refuses the whole import |
| 2026-10-30 | Code | `integrations/github/github-repository-client.ts` L16-60; `public-github-request.ts` | Shared public GitHub transport (default-branch head, revision metadata, rate-limit gate). The page can reuse it to read the official repository before install |
| 2026-10-30 | Code | `autobyteus-web/composables/useShellPrimaryNavigation.ts` L33-41, L44-63 | Primary navigation keys (chat, agents, teams, orgs, projects, applications, skills, memory, nodes). "Integrations" becomes one more key |

## Relevant Existing Behavior

| ID | Current behavior | Evidence |
| --- | --- | --- |
| BEH-001 | GitHub is set up in Settings → Server Settings → Basics: token, Test, Remove, and a list of agents to tick | Card files above |
| BEH-002 | The GitHub skill is installed separately: Skills → add the GitHub source `https://github.com/AutoByteus/autobyteus-integrations` | skills.md; integrations-1 AC-001 evidence |
| BEH-003 | A run gets the GitHub address when its agent is ticked, whatever its skills | `integration-run-access.ts` L29-41 |
| BEH-004 | No list of available integrations exists anywhere | — |

## Structural Surfaces

- **Server:**
  - a new integration catalog (official repository and installed source, manifests);
  - a change to the run-access decision;
  - the connection store/service (the ticks are removed);
  - GraphQL (new page queries; the access mutation removed).
- **Web:** a new page and its navigation key; the card moves; Server Settings → Basics loses the card.
- **Persisted:** `connections.json` drops `agentDefinitionIds` (tolerant reader: an existing field is ignored). No new store is expected beyond reading installed sources.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Status |
| --- | --- | --- | --- |
| UNK-001 | Unknown | The cheapest way to read the official repository's integration folders before install (contents API vs raw files vs archive), and its rate limit when not signed in | Architecture phase |
| RSK-001 | Risk | One source installs every integration in the repository, and a skill-name clash refuses the whole import | Accepted now (only GitHub exists); single-integration install is optional, later |
| RSK-002 | Risk | Agents ticked on the beta.4 card lose GitHub access unless the GitHub skill is configured on them | Stated to the user (DEC-005) |

## Requirement Implications

- Under the current contract (the app decides where tokens go), the page lists integrations that exist both in the official repository (the manifest) and in the app (a delivery definition). The manifest owns the presentation; the app owns the security part. Question DEC-001 for the user.
- Access follows the effective configured skills of the run's agent definition.
