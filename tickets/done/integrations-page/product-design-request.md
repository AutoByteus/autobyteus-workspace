# Product Design Request — Integrations page (autobyteus-337)

- From: Solution Designer (Software Engineering Team, run `solution_designer_9a83b5676cdb4488a7e25094626f527c`)
- Purpose: `New Request`
- Date: 2026-10-31
- The user's request (2026-10-31, in the Solution Designer conversation): "maybe we work on the ui first? … you can task @Product Team to work on the UI?"

## The user's requested outcome, in his words

- "Why does the user have to go to a server setting to do the GitHub thing? … Each integration should handle their own configuration."
- "each integration has their own card … when we install the integration the integration will ask the user to … log in GitHub or … provide some kind of token … it's basically a skill … if it's integration it's just a nicer way of configuring things and also install the skill … then the user can basically go to any agent like how they do now and install that skill. This is how I imagined."

## What the design must answer

The experience of a new **Integrations** page in the AutoByteus app: how a user discovers, installs, connects and checks an integration, and how he understands that giving an agent access means adding the integration's skill to that agent.

## Requirements context

`requirements-doc.md`: Ready for Approval; DEC-001 and DEC-002 are open with the user.

| ID | What | Feasibility |
| --- | --- | --- |
| REQ-001 | Main-menu item **Integrations**; one card per integration from the official repository `AutoByteus/autobyteus-integrations`: name, one-sentence description, optional icon (`icon.svg`) | Feasible (manifest exists) |
| REQ-002 | One state per card: **Not installed** · **Installed, needs a token** · **Connected as @login** · **Needs a newer AutoByteus** (the repository has it but this app can't deliver its credential yet; depends on DEC-001) | Feasible |
| REQ-003 | **Install** on the card installs the integration's skill (technically the whole official repository as one skill source). Then the card asks for the token, showing the integration's own help text (`token.help`, may contain a link) | Feasible (skill sources exist) |
| REQ-004 | Connect / Test / Remove. The token is write-only, checked with GitHub before it is stored ("Connected as @login"), and never shown again. A rejected token gives an error | Exists today on the Server Settings card |
| REQ-005/006 | Agent access = the integration's skill is configured on the agent. The tick list is gone. DEC-002 (open): agents set to "all installed skills" do **not** get access automatically (recommended) | Feasible |
| REQ-007 | The GitHub card leaves Server Settings → Basics | — |
| REQ-008 | The card lists the tools the integration needs (GitHub: curl, jq, git) and whether each is found on this node. Missing ones are shown as missing; there is no install action | Feasible |
| REQ-009 | The official repository can't be reached and nothing is installed → a message with Retry; installed integrations still show | Feasible |
| REQ-010 | The card tells the user how to give agents access ("Add the *github-integration* skill to an agent"), with a way to the agents | Feasible |

## Established constraints and non-goals

- Only the official repository; no third-party integrations.
- No uninstall on the card in this step: one source holds every integration, and removal stays on the Skills page.
- No sign-in flow yet (later a "Sign in with …" may sit where the token field is).
- Jira and SSH come later as more cards. The page should read naturally with 1 card now and several later.
- The token is never displayed after saving.
- The app's existing look: the Settings cards (for example `autobyteus-web/components/settings/GitHubIntegrationCard.vue`, `ProviderAPIKeyManager.vue`) and the primary navigation (`autobyteus-web/composables/useShellPrimaryNavigation.ts`: Chat, Agents, Agent Teams, Agent Orgs, Projects, Applications, Skills, Memory, Nodes).
- Product vocabulary: an **integration** is a connection to an outside service.

## Open questions the design may help the user with

- How the four states look and what action each offers.
- Where "how to give an agent access" lives: on the card, or a link to the agents page.
- How the tool check reads when a tool is missing.

## Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page/tickets/in-progress/integrations-page/requirements-doc.md`
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page/tickets/in-progress/integrations-page/investigation-notes.md`
- The integration manifest contract: `AutoByteus/autobyteus-integrations` `main` `docs/integration-manifest.md`, and `github/integration.json`
- App source (read-only): the worktree above, branch `codex/integrations-page`, base `origin/personal` `e4bebdc858`
