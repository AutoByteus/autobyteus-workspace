# Data Model — Personal Settings For Package Definitions (autobyteus-95)

Status: proposal for the user's review (2026-11-06). Verified against the code (section "Verification"). Not yet a design.

## 1. Idea In One Paragraph

A package's files stay exactly as the author or GitHub made them. The user's own choices for an agent, Team or Org from a package are kept in AutoByteus's data folder on that machine:
- tools added and removed;
- skills enabled and disabled;
- the avatar;
- the runtime/model choice.

When AutoByteus reads a definition, it takes the package's values and applies the personal ones on top. A package update replaces only package files, so personal settings are never touched, and a git checkout of a package never shows changes made through these settings.

## 2. Which Definitions It Covers

| Source | Personal settings? | Why |
| --- | --- | --- |
| Packages imported from GitHub (`GITHUB_REPOSITORY`) | Yes | Updates replace their files |
| Packages linked from a local folder (`LOCAL_PATH`, e.g. the `autobyteus-agents` checkout) | Yes (open question Q2) | Clean checkouts; nothing to commit |
| The app's own storage (`BUILT_IN` root, `<app-data>/agents`, the user's own agents) | No | The user's own files: no updates, no git; edits keep going into the files |

## 3. The Record

One record per definition, keyed by **kind and definition ID**:

```text
key = "<kind>:<definitionId>"
kind ∈ { agent, agent_team, agent_org }
```

The `definitionId` is AutoByteus's existing ID; all forms are built from folder names (Verification V1):

| Definition | ID form | Example |
| --- | --- | --- |
| Agent in `agents/` | `<agent folder>` | `solution-designer` |
| Team-local agent | `team-local-agent:<team>:<agent>` | `team-local-agent:software-engineering-team:solution-designer` |
| Team | `<team folder>` | `software-engineering-team` |
| Org | `<org folder>` | `autobyteus-org` |
| Org-owned agent | `agent-org-owned-agent:<org>:<agent>` | — |
| Org-owned Team | `agent-org-owned-team:<org>:<team>` | — |

Fields per kind. Every field is optional: **absent = follow the package**.

| Field | agent | agent_team | agent_org | Type and meaning |
| --- | --- | --- | --- | --- |
| `toolsAdded` | ✓ | — | — | `string[]`: tool names (MCP tools included) the user added |
| `toolsRemoved` | ✓ | — | — | `string[]`: tool names from the package the user turned off |
| `skillsAdded` | ✓ | — | — | `string[]`: skill names the user enabled (Q3) |
| `skillsRemoved` | ✓ | — | — | `string[]`: package skill names the user turned off (Q3) |
| `avatarUrl` | ✓ | ✓ | ✓ | `string` = the user's avatar; `null` = the user chose no avatar |
| `defaultLaunchConfig` | ✓ | ✓ | ✓ | `{ runtimeKind, llmModelIdentifier, llmConfig }` as one unit = the user's runtime/model; `null` = the user chose no default |
| `updatedAt` | ✓ | ✓ | ✓ | ISO time of the last change (shown nowhere; for support) |

Tools and skills belong to agents only. A Team's or Org's members are agents with their own records (Verification V4).

## 4. How The Effective Definition Is Computed

For one definition with package values `P` and personal record `R`:

```text
tools        = (P.toolNames minus R.toolsRemoved) followed by (R.toolsAdded not already in it)
skills       = (P.skillNames minus R.skillsRemoved) followed by (R.skillsAdded not already in it)
avatarUrl    = R.avatarUrl if present, else P.avatarUrl
launch       = R.defaultLaunchConfig if present, else P.defaultLaunchConfig   (one unit)
anything else = P
```

Consequences:
- A tool the author adds in a new version arrives automatically, unless the user removed it.
- A tool the author removes is gone, unless the user added it.
- A tool the user added that the author later also adds appears once.
- A personal tool whose MCP server is not installed on this node is skipped, as tools always are when unavailable.
- The runtime/model choice is one unit: never the user's model with the author's runtime.
- Launch order stays: the user's launch choice > the definition default (personal if present, else the package's) > routing > inherit.

## 5. When A Record Changes

Writes happen only on the user's action:

| User action in the app (package definition) | Record change |
| --- | --- |
| Turns a tool on that the package does not have | adds to `toolsAdded` (removes it from `toolsRemoved` if there) |
| Turns off a package tool | adds to `toolsRemoved` |
| Turns a tool back to the package's state | removes it from both lists |
| Same for skills | `skillsAdded` / `skillsRemoved` |
| Sets the avatar / runtime-model | sets the field |
| "Reset to the package's setting" | removes the field |
| All fields absent | the record is deleted |

Nothing else writes these records:
- **Package update or reinstall:** never touches records. A reinstalled package finds its records again (same IDs).
- **Package removed:** records stay, so they come back if the package is imported again. They are ignored while no definition has that ID.
- **Definition gone from the package:** the record stays and is ignored.

## 6. Storage

- File: `<app-data>/personal-definition-settings/settings.json`, one file per node (the desktop and each Docker node have their own). A node is one machine's AutoByteus server; nothing is synced between nodes.
- Shape: a JSON object keyed by `key`. In this example, `github_create_issue` stands for an MCP tool named with an optional per-server prefix (`tool_name_prefix`, `mcp-server-management/providers/file-provider.ts:40`), and `codex_app_server` is a real runtime value (`runtime-kind-enum.ts:4`):

```json
{
  "agent:solution-designer": {
    "toolsAdded": ["github_create_issue"],
    "avatarUrl": "/rest/files/images/9c958cfd-ed4e-4b6f-86e9-5231764e474d.png",
    "updatedAt": "2026-11-06T09:00:00.000Z"
  },
  "agent_team:software-engineering-team": {
    "defaultLaunchConfig": { "runtimeKind": "codex_app_server", "llmModelIdentifier": "gpt-5.5", "llmConfig": null },
    "updatedAt": "2026-11-06T09:00:00.000Z"
  }
}
```

- Reading is tolerant: a record or field with the wrong shape is skipped with a warning, and a missing or unreadable file means "no personal settings". The definitions always load, with package values.
- Writing is exact: only known fields, atomic.
- Avatar images stay where they are today (`/rest/files/images/...` in app data). Only the reference is stored.

## 7. One-Time Move Of Changes Already In Package Files (Q4)

Only for GitHub-installed packages, at the first update after this change ships:
1. Download the installed revision once (by its commit, from `codeload.github.com`, outside the API quota).
2. For each `agent-config.json`, `team-config.json` and `org-config.json`, compare the user's file with the installed revision's file. Differences in `toolNames`, `skillNames`, `avatarUrl` and `defaultLaunchConfig` become a personal record, with only the fields that differ.
3. Copy every file that differs from the installed revision to `<app-data>/agent-packages/backups/<packageId>/<time>/` before the update replaces it.
4. Then update as today.

Local folders need no move: their files are the user's own and stay as they are.

## 8. What Stays In Package Files

Instructions (`agent.md`, `team.md`, `org.md`), skills content, members, handoffs, processors, `skillScope`, and the package's own `toolNames`, `skillNames`, `avatarUrl` and `defaultLaunchConfig` (the author's values).
- Editing these in the app for a GitHub package still writes the files, and the next update replaces them (with the backup of §7 step 3 at every update).
- For a local package, it writes the files, cleanly (stage 2: only the changed field).

## 9. Verification

| ID | What | Evidence | How |
| --- | --- | --- | --- |
| V1 | Definition IDs come from folder names, not package paths, so they stay the same across updates and reinstalls | `agent-team-definition/utils/team-local-definition-id.ts:53-57`; `agent-org-definition/utils/agent-org-owned-definition-id.ts:8-15`; shared agents, Teams and Orgs use their folder name | Read |
| V2 | An ID names one definition per node. An agent ID: the first registered package wins. A Team or Org ID must be unique (duplicates are unusable, `DEFINITION_IDENTITY_DUPLICATED`) | `docs/modules/agent_package_definitions.md:83, 92-93`; `agent-package-definition-store.ts:253-254` | Read |
| V3 | The four personal fields exist in today's files: agents have `toolNames`, `skillNames`, `avatarUrl`, `defaultLaunchConfig`; Teams and Orgs have `avatarUrl` and `defaultLaunchConfig` | `agent-definition-config.ts:10-21`; `agent-team-definition-config.ts:22, 115-153`; `agent-org-definition-config.ts:22-23, 67-70`; a real `agent-config.json` (investigation F-02) | Read |
| V4 | Tools and skills belong to agents only; Team and Org tools come from the member agents | `agent_team_definition.md` (Default Launch Preferences: skills only in members' agent definitions); the team config has no tool field | Read |
| V5 | MCP tools are selected by name in `toolNames` | `mcp_server_management.md:18-21` | Read |
| V6 | `defaultLaunchConfig` is used only as a whole | `agent_definition.md` (Default Launch Config); Org config validates exactly `llmModelIdentifier`, `runtimeKind`, `llmConfig` | Read |
| V7 | The app's own storage is not overwritten at startup any more (the built-in agent sync was removed in autobyteus-205, `1f12b46b8b`) | `git log -- autobyteus-server-ts/src/built-in-agents` | Read |
| V8 | Same key scheme as the design reviewed in imported-team-defaults-edit (`<kind>:<definitionId>`, Pass) | `tickets/done/imported-team-defaults-edit/design-review-report.md:82` | Read |

Not yet verified, for the design: every place that reads definitions must apply the record in one owner (AgentDefinitionService, the Team and Org services, run start, delegated copies). The design will trace each reader.

## 10. Questions For The User

| ID | Question | Recommendation |
| --- | --- | --- |
| Q1 | Personal settings (this model) instead of merging inside the files | Yes |
| Q2 | Also for local folders you author (e.g. `autobyteus-agents`)? Then the app never changes those four fields in the checkout; to change the package itself, edit the files and commit | Yes |
| Q3 | Skills too (enabled/disabled skills like tools)? | Yes |
| Q4 | The one-time move of changes already in GitHub package files (§7), with a backup | Yes |
