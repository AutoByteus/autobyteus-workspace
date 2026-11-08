# Personal Settings File Contract — Your Own Tools, Skills, Avatar And Runtime/Model For Package Agents, Teams And Orgs (autobyteus-95)

Status: proposal for the user's review, 2026-11-07; renamed 2026-11-08 (was `data-contract.md`, first drafted as `data-model.md`). Validated against real package data (section 9).

## 1. Purpose

A package's files stay as the author or GitHub made them. The user's own choices for an agent, Team or Org from a package are stored by AutoByteus in one file per node and applied on top of the package when a definition is read:
- tools added and removed;
- skills enabled and disabled;
- the avatar;
- the runtime/model choice.

A package update replaces only package files, so these choices are never lost, and a git checkout never shows changes made through them.

## 2. Storage

| Item | Value |
| --- | --- |
| Node | Each AutoByteus server keeps its own file: the desktop's embedded server, and each Docker server. Nothing is synced between nodes. |
| File | `<app-data>/agent-packages/personal-settings.json`, next to the existing `registry.json` |
| Desktop path | `~/.autobyteus/server-data/agent-packages/personal-settings.json` |
| Docker path | `/home/autobyteus/data/agent-packages/personal-settings.json` (the `autobyteus-server-data` volume, kept across container rebuilds) |
| Format | UTF-8 JSON, 2-space indent, trailing newline. No version field (project rule). |
| Missing file | No personal settings. Definitions load with package values. |
| Unreadable or wrongly shaped file | Treated as no personal settings, with a logged warning. The file is left as it is, so the user's data is never deleted. It is rewritten only by the user's next change, after a copy is saved as `personal-settings.json.unreadable-<time>`. |
| Writer | One owner in the server writes the file, one change at a time, atomically (write a temporary file, then rename). |
| Avatar images | Unchanged: they stay where uploads go today (`/rest/files/images/<id>.png` in app data). The file stores only the reference. |

## 3. Shape

The file is one JSON object. Each property is one definition's record.

```text
{ "<kind>:<definitionId>": { <fields> }, ... }
```

### 3.1 Key

| Part | Rule |
| --- | --- |
| `kind` | `agent`, `agent_team` or `agent_org` |
| `definitionId` | AutoByteus's existing definition ID (see the table below). Not empty. |
| Separator | The first `:`. Kinds contain no `:`; IDs may (for example `team-local-agent:…`). |

| Definition | `definitionId` form |
| --- | --- |
| Agent in `agents/` | `<agent folder>` |
| Agent in a Team | `team-local-agent:<team id>:<agent folder>` (each part URL-encoded) |
| Team in `agent-teams/` | `<team folder>` |
| Org in `agent-orgs/` | `<org folder>` |
| Agent owned by an Org | `agent-org-owned-agent:<org>:<agent>` |
| Team owned by an Org | `agent-org-owned-team:<org>:<team>` |

### 3.2 Fields

Every field is optional. A missing field means "use the package's value". A record with no fields is not stored.

| Field | Allowed on | Type | Meaning |
| --- | --- | --- | --- |
| `toolsAdded` | agent | non-empty list of unique tool names | Tools (MCP tools included) the user turned on that the package does not have |
| `toolsRemoved` | agent | non-empty list of unique tool names | Package tools the user turned off |
| `skillsAdded` | agent | non-empty list of unique skill names | Skills the user enabled that the package does not have |
| `skillsRemoved` | agent | non-empty list of unique skill names | Package skills the user turned off |
| `avatarUrl` | agent, agent_team, agent_org | non-empty string | The user's avatar |
| `defaultLaunchConfig` | agent, agent_team, agent_org | `{ "runtimeKind": string, "llmModelIdentifier": string, "llmConfig": object \| null }`, exactly these three keys | The user's runtime/model choice, as one unit |

Rules on a record:
- A name is never in both the added and the removed list of the same kind (tools, or skills).
- Names are compared exactly, as AutoByteus compares tool and skill names today.

### 3.3 Example

```json
{
  "agent:solution-designer": {
    "toolsAdded": ["github_create_issue"],
    "avatarUrl": "/rest/files/images/9c958cfd-ed4e-4b6f-86e9-5231764e474d.png"
  },
  "agent_team:software-engineering-team": {
    "defaultLaunchConfig": { "runtimeKind": "codex_app_server", "llmModelIdentifier": "gpt-5.5", "llmConfig": null }
  }
}
```

`github_create_issue` stands for an MCP tool name, which carries the server's optional `tool_name_prefix`. `codex_app_server` is a real runtime value.

### 3.4 What Was Removed From The First Draft, And Why

| Removed | Why it is not needed |
| --- | --- |
| `updatedAt` | Nothing reads it. |
| `avatarUrl: null` ("the user chose no avatar") | Packages almost never ship an avatar. Removing a personal avatar simply returns to the package's. |
| `defaultLaunchConfig: null` ("no default") | The user's launch choice already comes before any default at every launch, so "no default" adds nothing. |
| A per-package "already moved" marker for §7 | Capturing at every update is harmless: an unchanged file yields nothing (validated, V-C). |

## 4. Reading Rules (Tolerant)

| Case | Result |
| --- | --- |
| Unknown kind, empty ID, or a record that is not an object | The record is skipped. |
| Unknown field, or a field not allowed on its kind | That field is skipped. |
| A field with the wrong type, an empty or duplicated list, or a `defaultLaunchConfig` without exactly its three keys | That field is skipped. |
| The same name in added and removed | Both lists of that kind are skipped. |
| Nothing valid left | The record is skipped. |

Skipping only affects what is applied. The file is not rewritten by reading.

## 5. Effective Definition (Applied Where Definitions Are Read)

With package values `P` and record `R`:

```text
toolNames           = (P.toolNames  minus R.toolsRemoved)  then (R.toolsAdded  not already present)
skillNames          = (P.skillNames minus R.skillsRemoved) then (R.skillsAdded not already present)
avatarUrl           = R.avatarUrl           if present, else P.avatarUrl
defaultLaunchConfig = R.defaultLaunchConfig if present, else P.defaultLaunchConfig
everything else     = P
```

- A tool the author adds later arrives, unless the user removed it.
- A personal tool whose MCP server is missing on this node is not available there, as with any tool today.
- Launch order stays: the user's launch choice > the definition default (personal if present, else the package's) > routing > inherit.

## 6. Writing Rules

The user's actions in the app, for a definition from a package:

| Action | Change |
| --- | --- |
| Turn on a tool the package does not have | Add it to `toolsAdded` |
| Turn off a package tool | Add it to `toolsRemoved` |
| Return a tool to the package's state | Remove it from `toolsAdded` / `toolsRemoved` |
| Skills: the same | `skillsAdded` / `skillsRemoved` |
| Set the avatar / runtime-model | Set `avatarUrl` / `defaultLaunchConfig` |
| "Reset to the package's setting" | Remove that field |

Writing rules:
- A list that becomes empty is removed.
- A record that becomes empty is removed.
- Nothing else writes the file. A package update, reinstall or removal never touches it. A reinstalled package finds its records again, because the IDs come from folder names.

## 7. Package Updates (GitHub-Installed Packages)

At every update, by click or automatic, before the new revision replaces the folder:
1. Download the installed revision by its commit (`codeload.github.com/<owner>/<repo>/tar.gz/<commit>`, outside the API quota).
2. **Capture:**
   - for every `agent-config.json`, `team-config.json` and `org-config.json`, compare the installed revision's values with the files on disk;
   - list differences in `toolNames` and `skillNames` become `toolsAdded` / `toolsRemoved` and `skillsAdded` / `skillsRemoved`;
   - a different `avatarUrl` or `defaultLaunchConfig` becomes that field, unless the record already has one (the personal value wins).
   - This keeps tools added inside package files before this change, for example on a Docker server.
3. **Backup:**
   - every file that differs from the installed revision is copied to `<app-data>/agent-packages/backups/<install key>/<UTC time>/<path in package>`;
   - example: `backups/AutoByteus__autobyteus-agents/20261107T093000Z/agents/solution-designer/agent-config.json`;
   - the latest 5 backups per package are kept.
4. Update as today.

If the installed revision cannot be downloaded, the update stops and nothing changes, because the update cannot know the user's changes. An automatic update then shows "Automatic update failed. Nothing was changed."

Local folder packages: AutoByteus never updates them, so this section does not apply.

## 8. Which Definitions Use Personal Settings

| Source | Uses this contract |
| --- | --- |
| Packages imported from GitHub | Yes |
| Packages linked from a local folder (e.g. `autobyteus-agents`) | Yes (Q2) |
| The app's own storage (`<app-data>/agents`, the user's own agents) | No: edits keep going into those files |

## 9. Validation

Script: `evidence/validate-personal-settings-file.mjs`. Run: `evidence/personal-settings-file-validation-run.log` (2026-11-07). It reads, read-only:
- two real revisions of `AutoByteus/autobyteus-agents`: `181b784c10` as the installed version and `327b59748e` as the update;
- the local `autobyteus-agents` and `autobyteus-private-agents` folders.

| ID | Check | Result |
| --- | --- | --- |
| V-A | Keys built with the contract's ID rules are unique within each package (126, 129, 132 and 66 definitions) and parse back to their kind | Pass |
| V-A note | 129 keys exist both in the GitHub repository and in the local `autobyteus-agents` checkout (the same package, installed twice); 25 of them are Teams or Orgs | A node only ever uses one definition per ID: the first package for an agent; a duplicated Team or Org is refused (`DEFINITION_IDENTITY_DUPLICATED`). So a record always applies to the definition in use. |
| V-B | The tolerant reader keeps the 2 valid records and drops exactly the 7 invalid ones (unknown kind, empty ID, field on the wrong kind, empty list, duplicated list, added/removed overlap, incomplete launch config); a non-object file reads as empty | Pass |
| V-C | A real update (`agent:agent-package-creator`, where the author added `search_memory`):<br>- the user's edits on the installed revision (one added MCP tool, one removed tool, avatar, runtime/model) are captured as a 4-field record;<br>- after applying it to the new revision: the added tool is present, the removed tool absent, every other new tool present (including `search_memory`), avatar and runtime/model are the user's, skills follow the package | Pass |
| V-C | The captured record passes the reader; capture on an unchanged file yields nothing; capture keeps an existing record; a definition the new revision dropped (`agent:chemistry-module-designer`) leaves its record unused | Pass |
| V-D | All 129 configs of the new revision read into the package values; with no record the effective values equal the package's | Pass |

The first run had one failing check, in the test itself: it counted the skip log entries instead of the dropped records. That run's log is `evidence/personal-settings-file-validation-run-first.log`. The script was corrected; the contract did not change.

Evidence from code reading (Read):
- the IDs come from folder names (`team-local-definition-id.ts:53-57`, `agent-org-owned-definition-id.ts:8-15`);
- one definition per ID per node (`agent_package_definitions.md:83, 92-93`);
- the four fields exist in today's configs (`agent-definition-config.ts:10-21`, `agent-team-definition-config.ts:22`, `agent-org-definition-config.ts:22-23, 67-70`);
- MCP tools are listed by name in `toolNames` (`mcp_server_management.md:18-21`);
- the default launch config is used only as a whole (`agent_definition.md`).

Not yet verified (it belongs to the design): every reader of definitions applies the record through one owner. The design will trace each reader.

## 10. Questions For The User

| ID | Question | Recommendation |
| --- | --- | --- |
| Q1 | Personal settings by this contract, instead of merging inside the files | Yes |
| Q2 | Also for local folders you author (e.g. `autobyteus-agents`): the app never changes these four in the checkout | Yes |
| Q3 | Skills too, like tools | Yes |
| Q4 | Capture at every GitHub update (§7), which keeps the tools you already added, with backups | Yes |
