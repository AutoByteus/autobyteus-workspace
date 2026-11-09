# Personal Settings

## Scope

Tools, skills, avatar and default runtime/model of a definition from an agent
package, or of a built-in agent, are **personal settings**: they are kept on
this node in one file, outside the definition's files, so package updates,
restarts and AutoByteus updates keep them. Teams and Orgs have two of them:
avatar and default runtime/model. The value in the definition's files is the
**base value** (see the [Glossary](../../../GLOSSARY.md#agent-definitions)).
Every reader gets the **effective** definition: the base value with the
personal settings applied.

| Definition | Personal settings apply | Editor's reset link |
| --- | --- | --- |
| From a registered agent package (GitHub or local folder; source class `registered_package`): shared, team-local, Org-owned agents; Teams; Orgs | Yes | "Reset to the package's setting" |
| Built-in agents (`autobyteus-daily-assistant`, `autobyteus-model-router`) in the app's storage | Yes | "Reset to the built-in setting" |
| The user's own definitions in the app's storage (`server_data`) | No: edits go into their files | — |
| Application-owned definitions | No | — |

## TS Source

- `src/personal-settings/domain/personal-setting-record.ts`: the record type,
  keys, field rules and the tolerant record reader.
- `src/personal-settings/stores/personal-settings-store.ts`: the file.
- `src/personal-settings/services/personal-settings-service.ts`: the scope rule,
  applying records, turning edited values into a record, reset, the capture
  merge and announcing changes. It is the only reader and writer of the file.
- `src/api/graphql/types/personal-settings.ts`: the GraphQL enums.

## The File

`<app-data>/agent-packages/personal-settings.json`, one JSON object keyed by
`<kind>:<definitionId>` (`agent`, `agent_team`, `agent_org`; the key is split at
the first `:`, because IDs may contain `:`):

```json
{
  "agent:solution-designer": {
    "toolsAdded": ["github_create_issue"],
    "toolsRemoved": ["write_file"],
    "avatarUrl": "/rest/files/images/a.png"
  },
  "agent_team:software-engineering-team": {
    "defaultLaunchConfig": { "runtimeKind": "codex_app_server", "llmModelIdentifier": "gpt-5.5", "llmConfig": null }
  }
}
```

- Fields: `toolsAdded`, `toolsRemoved`, `skillsAdded`, `skillsRemoved` (agents
  only), `avatarUrl`, `defaultLaunchConfig` (exactly `runtimeKind`,
  `llmModelIdentifier`, `llmConfig`, naming both a runtime and a model).
- Written atomically, with a 2-space indent and a trailing newline; no version
  field.
- Reading is tolerant: an invalid field or record is skipped with the warning
  `PERSONAL_SETTINGS_ENTRY_SKIPPED`; a name in both lists of a kind skips both
  lists. A file that cannot be read means no personal settings and the warning
  `PERSONAL_SETTINGS_FILE_UNREADABLE`; before the first rewrite it is copied to
  `personal-settings.json.unreadable-<UTC time>`. Entries skipped while reading
  are written back unchanged.

## Effective Values

- Tools: the base list minus `toolsRemoved`, then `toolsAdded` not already
  present, in that order. Skills alike.
- Avatar and default runtime/model: the personal value replaces the base value.
- A record for a definition that no longer exists is kept and unused.

Applied on every store-backed read of the three definition services: by ID,
lists, team-local lists and the collaboration admission entries (run start, the
GraphQL Team and Org lists, delegated copies). Writes never start from an
effective read: every save starts from the base value.

## Saving In The Editor

The editor keeps sending full values. For a definition where personal settings
apply, the service:

1. reads the base value;
2. builds the candidate with the non-personal fields from the input and the
   personal fields at their base values;
3. writes the definition's files only if the candidate renders differently from
   the base (`fileStore.rendersDifferently`), so a personal-only save writes no
   package file;
4. turns the input's personal fields into the record
   (`PersonalSettingsService.setEdited`): additions and removals against the
   base; a value equal to the base removes that field; empty lists and empty
   records are removed; an absent input field leaves its personal field as it
   is; a runtime/model that does not name both is not personal;
5. returns the effective definition.

Teams and Orgs: an absent or `null` avatar in the update input means "not sent";
`""` clears the personal avatar back to the base value. The Team editor sends
trimmed name, description, category and instructions: a text equal to the
files' up to surrounding whitespace (e.g. the final newline of `team.md`) keeps
the files' text, so it is not counted as a change.

## Reset And GraphQL

- `AgentDefinition`, `AgentTeamDefinition` and `AgentOrgDefinition` carry
  `personalSettings: [PersonalSetting!]!` (`TOOLS`, `SKILLS`, `AVATAR`,
  `DEFAULT_LAUNCH_CONFIG`) and `personalSettingsBase: PersonalSettingsBase`
  (`PACKAGE`, `BUILT_IN`, or `null` when personal settings do not apply).
- `resetAgentPersonalSetting`, `resetAgentTeamPersonalSetting`,
  `resetAgentOrgPersonalSetting` (`definitionId`, `setting`) remove one personal
  setting and return the effective definition. A setting that is not personal
  for the kind, or a definition without personal settings, is an error.

## Announcements

Every change of the file (save, reset, capture) is announced through the same
function as package folder reloads (set on the reloader and on
`PersonalSettingsService` by the definition feed composition): loaded web lists
reload, and running agents get their changed tools
([tool list updates](./tool_list_updates.md)).

## Package Updates

Before a GitHub update replaces a package folder, edits of these settings made
inside the package files are captured into this file, and changed files are
backed up. See [Agent Packages](./agent_packages.md#keeping-the-users-edits-at-an-update).

## Process Instance

The host composition binds one `PersonalSettingsService` per process
(`bindProcessInstance`, released on close); `getInstance()` returns it, or a
separate unbound instance when none is bound (tests, standalone validators).
The standalone application validator's instance only reads: it has no publisher.
