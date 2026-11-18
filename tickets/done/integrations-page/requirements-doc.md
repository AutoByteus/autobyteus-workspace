# Requirements Document — Integrations page (autobyteus-337)

## Document Status

- Status: `Approved` (SR-006; SR-008 added AC-008/AC-009 from the Task comment of 2026-10-30; SR-009 aligned AC-001, AC-002, QR-002, SCN-001 with REQ-002/REQ-009 and the approved r2 UI, and added DEC-017; the intent is unchanged)
- Current solution revision ID: `SR-009`
- Package identifier: `integrations-page`
- Request / ticket: Project Task `autobyteus-337`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's direction of 2026-10-30
- Requirements owner: Solution Designer
- Date: 2026-10-31
- Approved by and reference: **User**: the UI/UX ("its much better now. approve", 2026-10-31), DEC-001 (2026-10-31) and DEC-002 (2026-11-01); quotes in the decision rows. All other decisions are the Solution Designer's within the direction, with the user informed
- Behavior-defining supplements: the manifest contract `AutoByteus/autobyteus-integrations` `main` `8887475` `docs/integration-manifest.md` (delivered, read-only)

## Problem And Desired Outcome

- **Problem:** GitHub is set up in Server Settings, the skill is installed somewhere else (Skills → add a source), and access is a separate tick list. The user: "Why does the user have to go to a server setting to do the GitHub thing? … Each integration should handle their own configuration."
- **Desired outcome:** an **Integrations** page in the main menu shows one card per integration. On a card the user:
  - installs the integration, which installs its skill;
  - gives what it asks for: a token now, a sign-in later.

  Then he adds the integration's skill to any agent, the way he adds skills today, and that agent's runs can use the integration through the proxy.
- **Success:** on an isolated instance, a user opens Integrations, installs GitHub, pastes a token, adds the GitHub skill to an agent, and that agent's shell reaches GitHub through the proxy. The token is in no output or log.

## Relevant Current And Desired Behavior

| ID | Current (evidence: investigation) | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | The GitHub card is in Server Settings → Basics | Server Settings → Basics has no GitHub card; GitHub is on the Integrations page | The token stays in the vault; Test and Remove behave as today |
| BEH-002 | The skill is installed from Skills → add source | The card's Install adds the official integrations source (installing the skill) | Skills page source management unchanged (it lists the same source) |
| BEH-003 | Access = ticked on the card | Access = the integration's skill is among the agent's configured skills (DEC-002 for "all installed") | The proxy, run passes, routes and activity log unchanged |
| BEH-004 | No list of integrations | Cards from the official repository's manifests, with state | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use case |
| --- | --- |
| UC-001 | The user opens Integrations and sees the available integrations with their state |
| UC-002 | The user installs an integration from its card |
| UC-003 | The user connects it (token), tests it, removes it |
| UC-004 | An agent whose configured skills include the integration's skill gets the integration in its runs |

### Out Of Scope

- Jira and SSH integrations;
- sign-in flows (OAuth);
- a built-in list or link of integration repositories (the user chooses the link; the token rule stays in the app per DEC-001);
- installing a single integration out of the repository (optional, later);
- removing a single integration out of a source (Remove on Manage removes the whole source and its skills);
- installing prerequisite tools;
- the proxy's behavior itself.

### Non-Goals

None beyond the above.

### Preserved Behavior Boundary

autobyteus-311's AC-002…AC-008: the proxy, passes, routes, redaction, activity log, refusals and the loopback-only rule are unchanged.

### Prerequisites

None (autobyteus-311 step 1 is delivered).

### Review Authority

Standard.

## Requirements

| ID | Requirement | BEH | Priority | Feasibility | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The main menu has **Integrations**. The page shows one card per integration the user has imported: every folder with an `integration.json` in an imported skill source, also one imported on the Skills page (DEC-011). Each card has the integration's name, description and icon (when present), read from its folder. The app has **no built-in repository link** (the user, 2026-11-01) | BEH-004 | Must | N/A | User |
| REQ-002 | Each card shows one state: **Installed, needs a token** · **Connected as @login** · **Needs a newer AutoByteus** (imported, but this app can't deliver its credential yet, per DEC-001). There is no "Not installed" state, because a card exists only after an import | BEH-004 | Must | N/A | Task; user 2026-11-01 |
| REQ-003 | **Import** on the Integrations page takes **a GitHub repository link or a local folder path** in one field, with Browse where the native picker exists, like the Skills source dialog and Agent Packages (the user, 2026-11-01). It is imported as a skill source (DEC-012): a GitHub link is downloaded as a managed GitHub source; a folder is registered as a local skill source and stays where it is, with nothing copied. The skills appear in the catalog, the integrations as cards. A source with no integration folder is refused ("No integrations in this folder/repository") and nothing is imported. Other errors: "Directory not found: <path>", a skill-name clash, GitHub unreachable with the reason. **Manage** lists the imported sources that contain integrations: a GitHub source has Update and Remove; a local folder has Remove only (DEC-014). Removing a source also removes its integrations' connections (DEC-015). Connecting a card shows the manifest's `token.help` | BEH-002 | Must | Exists (GitHub and local skill sources) | User 2026-11-01 |
| REQ-004 | Connect, Test and Remove behave as the current GitHub card: the token is write-only, checked with GitHub before it is stored, never returned, shown or logged | BEH-001 | Must | Exists | 311 REQ-001 |
| REQ-005 | A run gets an integration's address and git redirection when its agent definition's **effective skills** include the integration's skill: its configured skills, or every installed skill for an agent set to all installed skills (DEC-002), the same rule as for any skill. Access is still checked on every proxied call, so removing the skill from an agent stops its next call | BEH-003 | Must | N/A | User; Task |
| REQ-006 | The per-agent tick list is gone (clean cut): its mutation, field and stored lists. Agents ticked before keep access only through their skill (DEC-005) | BEH-003 | Must | N/A | Task |
| REQ-007 | Server Settings → Basics no longer has the GitHub card | BEH-001 | Must | N/A | User |
| REQ-008 | Each card lists the integration's prerequisites with whether each tool is found on this node (`command -v`). Missing ones show as "missing" with no install action | BEH-004 | Should | N/A | Manifest contract |
| REQ-009 | Cards are read from the imported sources on this node, so the page needs no network to show them (QR-002). Import and Update report a failure to reach GitHub as an error with the reason. With nothing imported, the page shows an empty state that invites Import | BEH-004 | Must | N/A | — |
| REQ-010 | The card tells the user how to give agents access ("Add the *github-integration* skill to an agent"), linking to the agents page | BEH-003 | Should | N/A | User ("go to any agent like how they do now") |

## Acceptance Criteria

| ID | REQ | Trigger | Expected | Alternate | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-009 | Open Integrations on a fresh isolated instance; then after an import | Nothing imported → the empty state inviting Import (no toolbar). After the import → one card per integration in that source with name, description, icon or letter tile, and its chip | — | e2e on an isolated instance; web tests against the r2 references |
| AC-002 | REQ-003 | Import with a GitHub link, then with a local folder, then each error case | The source is imported; its skills are in the catalog; a success notice names the new integrations; their cards show "Installed, needs a token" | No integration in it → `NO_INTEGRATIONS_FOUND`, nothing imported. Already imported → `ALREADY_IMPORTED`. Not a link or path → `NOT_A_LINK_OR_PATH`. A folder that doesn't exist → `DIRECTORY_NOT_FOUND`. A skill-name clash. An integration ID already imported from another source → `INTEGRATION_ALREADY_IMPORTED`. GitHub unreachable → `GITHUB_UNREACHABLE` with the reason | e2e |
| AC-003 | REQ-004 | Paste a token, Test, Remove | "Connected as @login"; the value is never in any response; Remove → "Installed, needs a token" | A rejected token → "GitHub rejected the token" | e2e with the test-vault token |
| AC-004 | REQ-005, REQ-006 | Add the GitHub skill to an agent; start a run; run `curl "$AUTOBYTEUS_GITHUB_API_URL/repos/<test repo>/issues/1"` | GitHub's answer; one activity record | An agent without the skill has no variables; removing the skill → the next call is `INTEGRATION_NOT_ALLOWED` | Live (gated) on an isolated instance |
| AC-005 | REQ-007, REQ-006 | Open Server Settings → Basics; check the API | No GitHub card; no agent-access mutation or field | — | Web and API tests |
| AC-006 | REQ-008 | Open the card on a node where one tool is missing | That tool shows as missing | — | Web and server tests |
| AC-007 | REQ-004, all | After AC-001…AC-004 | The token value is in no output, log, trace or file of the test | — | Scan |
| AC-008 (integrations-1 AC-009, moved here by the Task comment of 2026-10-30) | REQ-001…REQ-005 | On an isolated instance, a teammate's way: Integrations → Import `https://github.com/AutoByteus/autobyteus-integrations` → Connect with the token → add `github-integration` to an agent → the agent runs the integration's scripts | The agent lists issues and comments on an issue of the test repository `ryan-zheng-teki/autobyteus-mcp-test` through the proxy; the activity log shows the calls. The token is in no output or log | — | Live (gated). The test-vault token `test.github.token` has Contents, Issues and Pull requests read/write on that repository only (integrations-1 UP-001, edited 2026-10-30) |
| AC-009 | REQ-003 (docs) | The README of `AutoByteus/autobyteus-integrations` | Its install steps describe the page: Integrations → Import (link or folder) → Connect → add the skill to an agent. The old "Settings → Server Settings → Basics → GitHub" steps are gone | — | Doc review; finalized on that repository's `main`. The Task allows this to go to the Agent Package Creator |

## Relevant Scenarios

| ID | Kind | Goal | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Set up GitHub | Integrations → Import (link or folder) → GitHub card → Connect → paste token → Test → Agents: add the skill | The agent's runs use GitHub | Supported Normal Scenario |
| SCN-002 | User | A teammate on another node does the same | Same, on their node and with their token | Same | Supported Normal Scenario |
| SCN-003 | User | Stop an agent's access | Remove the skill from the agent, or Remove the token | Next call refused | Supported Normal Scenario |

## UI, Interaction, And Experience Requirements

- Applicable: Yes.
- **UI/UX specification (normative):** `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/integrations-page-r2/ui-ux-spec.md`, Status `Approved`. It supersedes the first design except where it says "Unchanged".
- **Final visual references (normative):**
  - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/integrations-page-r2/visual-references/` VIS-001…VIS-035 (31 at 1440×900, 4 at 390×844);
  - plus the first design's VIS-019 (Server Settings → Basics without the GitHub card) at `tickets/done/integrations-page/visual-references/`.
- **Runnable UI reference:** the design repository root `/Users/normy/autobyteus_org/autobyteus-web-design` (default branch `personal`, result commit `6ad06427f1`, record commit `2f31380eb9`). Run with `corepack pnpm dev --port 4950` and open `/integrations`. The runbook section is "integrations-page".
- **Ticket record and notes:** `tickets/done/integrations-page-r2/product-ticket.md` and `design-review-notes.md` (DC-001…DC-010).
- **User confirmation (2026-11-01):** "If you think the UI is consistent, now I would say I'm fine with the UI." The designer did the consistency check. The "Integration" label on the Skills page and the name "Manage sources" are as approved.
- **In short (the spec is the authority):**
  - The toolbar has Manage sources and Import; it is hidden while the page is empty. The empty state invites Import.
  - Cards only for imported integrations, with the three chips.
  - **Import dialog:** one field "GitHub repository link or folder path" plus Browse…; a web address is a repository, anything else a folder. A trust text for links; "nothing is copied" for folders. The listed errors. A success notice.
  - **Manage sources:** a repository has Update and Remove; a local folder has Remove only. The Remove confirmation adds "This also removes your GitHub connection." when connected (DEC-015).
  - **Integration dialog:** step 1 is "Imported from …". There is no "all installed" line (DEC-002 = Yes).
  - **Skills page:** an "Integration" label links to `/integrations#integration-<id>`. Imported sources are listed in Skills → Manage Skill Sources, and removing one there removes its card.
  - **Unchanged:** the grid, the card anatomy, the three-step dialog, the token form, the menu position after Nodes, the left-menu fix, no GitHub card in Basics.
  - **Focus returns** for all three dialogs, using the product's shared modal behavior (which traps Tab).
- **Mocked in the reference** (data, outcomes keyed by typed words, timings, reason texts, exact importer wording): illustrative. Production uses the importer's own rules and texts for "already imported", "not a link or path" and the name clash.
- Product decisions that need the user: none open.

## Quality And Non-Functional Requirements

| ID | Area | Constraint |
| --- | --- | --- |
| QR-001 | Security | The token handling is unchanged from 311: write-only, vault only |
| QR-002 | Operability | Opening the page makes no network request: cards are read from the imported sources on this node. Only Import and Update reach GitHub |

## Data Continuity

- `connections.json`: `login` and `connectedAt` are kept. `agentDefinitionIds` is no longer used (DEC-005).
- The vault entry is kept. Users of beta.4 stay connected.

## Decisions

| ID | Question | Why | Options | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Who decides where an integration's token may be sent? | Security; how new integrations ship | (a) **The app**: each service has a definition in the app's code (hosts, how the token is added, the variables). A new service (Jira) needs an app release. (b) **The integration's `integration.json`**: it declares hosts and auth format, shown to the user when connecting; official repository only | (a) is today's design, and the manifest contract says so. It means a change in the GitHub repository can never send tokens somewhere new. The proxy also does things a simple declaration can't express safely: GitHub needs a different auth format for git than for the API, redirects are rewritten, git's URLs are redirected. With (b), anyone who can merge to that repository (or takes over an account that can) could add a host that receives every user's token on the next update. New integrations are rare, and betas ship often. **Recommend (a)**; revisit when there are many integrations. Under (a), a repository integration the app doesn't know shows "Needs a newer AutoByteus" | User | **Decided by the user** 2026-10-31: (a). After the explanation: "the first one, app keeps the rule, which is definitely true. That's really, really much higher security." |
| DEC-002 | Do agents set to "all installed skills" get integration access automatically? | "Nothing is exposed automatically" | Yes / **No: only an explicitly configured skill grants access** | "All installed" agents would get every integration silently as soon as it's installed, against the user's rule. **Recommend No.** Such an agent gets access by switching to configured skills and adding the integration's skill | User | **Decided by the user** 2026-11-01: **Yes, it is a normal skill.** Access follows the agent's effective skills, as for any skill: configured skills, or all installed skills. "so basically, after the plugin is isntalled, teh skill is not one normal skill like any other skill. it can be configured for other agent. for all the skilled one, it also able to use the github integration installed skill. i want to make things simple, of course the configuration is like like how other people configure the in the agent or team or org individual agent edit page" The consequence was stated to him: once GitHub is connected, every agent set to all installed skills can use it |
| DEC-003 | (Superseded at SR-005 by REQ-003 and DEC-012) What does Install install? | The importer accepts a whole repository only | The official repository as one source, all its integrations' skills | Only GitHub exists today. Single-integration install is optional, later (RSK-001) | Solution Designer | Decided |
| DEC-004 | (Superseded at SR-005: Manage on the page has Remove) Uninstall from the card? | One source holds every integration | Not in this step: the card has Remove (token); source removal stays on the Skills page | Uninstalling GitHub would remove every integration's skill | Solution Designer | Decided |
| DEC-005 | Agents ticked on the beta.4 card | Clean cut | Their ticks are dropped; they keep access only if the GitHub skill is configured on them | The beta.4 card was used only by the user (and the integrations-1 test). The card states the new rule | Solution Designer | Decided (user informed) |
| DEC-006 | App definition's `displayName`/`description` | One fact, one owner (P11) | Removed; the manifest is the only source for name, description, token help and prerequisites | — | Solution Designer | Decided |
| DEC-007 | (Revised at SR-005 by REQ-009: cards are local; empty means nothing imported) When is the page empty, and what does it say? (asked by the Product designer for the user) | Three cases: (a) the repository is reachable but has no valid integration (all removed, or every manifest invalid, which is skipped with a logged warning per rule 7): a plain empty state, "No integrations are available yet."; (b) unreachable and nothing installed: the message with Retry (REQ-009); (c) the repository has integrations the app can't deliver: not empty, those show as "Needs a newer AutoByteus" cards. Also: unreachable but some installed → the installed cards show, plus a small note that the repository couldn't be checked | Solution Designer | Decided |
| DEC-008 | Card order | Alphabetical by name. It is stable and predictable, and there are few cards; no grouping by state | Solution Designer | Decided |
| DEC-009 | (Revised at SR-005 by REQ-001: only imported ones) Which integrations are listed | Every integration in the official repository's latest revision, plus every one in the installed copy (an installed one that has since left the repository still shows normally, because it is installed and works; the Skills page's update handles its removal). A "Needs a newer AutoByteus" card shows name, description and icon from the manifest, the state, and no Install or connect step. With no `icon.svg`, a letter tile | Solution Designer | Decided |
| DEC-010 | Is the connect step always "paste a token"? | No. What a card asks for comes from its manifest; today the only kind is `token` (GitHub). Jira Cloud will need more (site address and email beside the token), SSH a host and key, and a later sign-in a button. So the card has one **Connect** step whose content depends on the integration. In this ticket only the token form exists; the wording must not say "token" outside that form | Solution Designer | Decided |
| DEC-011 | Do integrations from a repository imported on the Skills page show as cards? | One mechanism, no duplicates | Yes / No | It is the same skill source. **Yes** | User | **Decided by the user** 2026-11-01 ("Sounds good", to the recommendation) |
| DEC-012 | Import as a skill source, or as a separate integration source? (SR-006: a GitHub link becomes a managed GitHub source, a folder an existing local skill source) | One owner for the files | A skill source underneath, shown and managed as integrations on the page / a new source kind | An integration is "skill plus authentication" (the user). Its skill must be in the skill catalog anyway, and the skill-source machinery (download, safe unpacking, update checks, Update, Remove) exists. A separate kind would put the same files under two owners. The same skill shows in two places: the Skills page (the skill) and the Integrations page (its card and connection). **Skill source underneath** | User | **Decided by the user** 2026-11-01 ("Sounds good") |
| DEC-013 | Trust in an imported repository | Security | — | AutoByteus still decides where a token may go (DEC-001), so an imported repository can't send the token elsewhere. Its scripts can use the service as the user through the proxy, so import only trusted repositories, as with any skill | Solution Designer | Decided (user informed 2026-11-01) |
| DEC-014 | What does Remove do for a local folder source? | User data on disk | Unlink only / delete files | The folder is the user's own work (often an integration he is developing). Remove unlinks the source and its skills; the files on disk are never deleted. There is no Update: changes in the folder show directly | Solution Designer | Decided (asked by the Product designer, 2026-11-01) |
| DEC-015 | When a source is removed, is the stored token of its integrations removed too? | No hidden secrets left behind | Keep it / remove it | Once the source is gone its card is gone, so a kept token would sit in the vault with nothing on screen to see or remove it. A skill-name clash refuses a second source with the same integration skill, so no other source can still use that connection. **Remove it**, whichever page the source is removed from (Integrations or Skills). The Remove confirmation says so ("This also removes your GitHub connection"). Re-importing means connecting again | Solution Designer | Decided (asked by the Product designer, 2026-11-01; the user is informed) |
| DEC-016 | Updates of an integration source | The user asked (2026-11-01) whether an imported integration repository updates like agent packages and skills | — | It is a skill source, so the existing skill-source update checks and the optional automatic updates apply unchanged; a local folder needs none. An update that **drops** an integration folder removes that integration's connection, by DEC-015's rule; if that fails, the update is refused | Solution Designer | Decided (user informed 2026-11-01) |
| DEC-017 | Two sources with the same integration ID (folder name), for example two `github/` folders under different skill names | One connection per ID (DEC-015's premise) | Keep one / refuse | **Import on the Integrations page refuses it** (`INTEGRATION_ALREADY_IMPORTED`, naming the source that has it). If such a source arrives through the Skills page, the catalog keeps the entry from the source first in the skill catalog's source precedence, skips the other with a logged warning, and a source removal or update disconnects only the entry it holds | Solution Designer | Decided (architecture review AR-004) |

## Traceability

| REQ | UC | AC | SCN |
| --- | --- | --- | --- |
| REQ-001, REQ-002, REQ-009 | UC-001 | AC-001 | SCN-001 |
| REQ-003 | UC-002 | AC-002 | SCN-001 |
| REQ-004 | UC-003 | AC-003, AC-007 | SCN-001, SCN-003 |
| REQ-005, REQ-006, REQ-010 | UC-004 | AC-004, AC-005 | SCN-001, SCN-003 |
| REQ-007 | UC-001 | AC-005 | — |
| REQ-008 | UC-001 | AC-006 | — |

## Architecture Phase Input

- To verify:
  - how to read the official repository's folders before install, within the unauthenticated rate limit (UNK-001);
  - where an installed source's manifests are read from;
  - the effective configured-skill check at run preparation for team members and application-owned agents.
- Deferred to design:
  - the GraphQL shape for the page;
  - caching;
  - the card component structure.

## Readiness Check

- Content ready for approval: Yes.
- Approved basis ready for design: Yes (SR-003).
