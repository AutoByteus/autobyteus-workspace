# Investigation Notes

## Investigation Meta

- Package identifier: `imported-team-defaults-edit`
- Request: Project Task `project_task_70a4e762-6aa2-4e87-88da-43b8cdd80900` (URGENT, user, 2026-10-14)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit` / `codex/imported-team-defaults-edit`
- Base: `origin/personal` @ `c285adf6bf49ec5ac239386eb250904d513dc34e`; finalization target `origin/personal`
- Current solution revision ID: `SR-003`
- Authorities read: `references/requirements-engineering.md` (this conversation); `AGENTS.md`
- Status: complete. Final decision (SR-003): registered packages are editable for Teams/Orgs like Agents (user, 2026-10-14); the earlier keep-in-app decision is withdrawn

## Evidence

| Source | Finding |
| --- | --- |
| Task screenshots 48/49 | Team edit Save → "Failed to update agent team definition: Definition source '…/autobyteus-agents/agent-teams/software-engineering-team' is external_readonly; cannot be written by the server runtime." A member (agent) edit Save succeeds |
| `autobyteus-server-ts/src/agent-package-definitions/domain/registered-package-roots.ts:14-40` | Every registered package root (`AUTOBYTEUS_AGENT_PACKAGE_ROOTS`) is `sourceClass: "external_read_only"`; only the app-data default root is `server_data` |
| `~/.autobyteus/server-data/agent-packages/registry.json` | The user's packages: `/Users/normy/autobyteus_org/autobyteus-agents` and `/Users/normy/autobyteus_org/autobyteus-private-agents`, both `LOCAL_PATH` |
| `collaboration-definition-admission/domain/definition-source-descriptor.ts:43-55` | `assertDefinitionSourceWritableByRuntime` refuses non-`server_data` sources (this produces the error text) |
| `agent-team-definition/providers/file-agent-team-definition-provider.ts:182,200`; `agent-org-definition/providers/file-agent-org-definition-provider.ts:97,106` | Team and Org update/delete call that assertion, so they are read-only for imported packages (**Org is affected the same way**) |
| `agent-definition/providers/file-agent-definition-provider.ts:342-380`; `agent-definition-source-paths.ts:170-183` | Agent update does **not** use the source-class policy. It only checks filesystem writability (`isWritable`), then **writes `agent.md` and `agent-config.json` directly into the package** |
| `cd /Users/normy/autobyteus_org/autobyteus-agents && git status/diff agent-teams/software-engineering-team` | Uncommitted modifications to `delivery-engineer`, `implementation-engineer` and `solution-designer` `agent-config.json`: the server added `defaultLaunchConfig` (e.g. `claude_agent_sdk`/`sonnet`) plus empty processor lists, `skillScope`, `avatarUrl: null`. **Member edits are written into the external package source** |

## Root Cause

- The two definition kinds follow inconsistent policies.
  - Teams and Orgs enforce "registered packages are read-only to the runtime".
  - Agents bypass it and write into the package checkout whenever the files are writable.
- So "member edits work" only because they violate the read-only rule the Task asks to keep ("Never write into the external package source").
- The Task's direction ("apply the same model as member edits" and "never write into the external package") is contradictory. The user must choose the model.

## Open Decision

DEC-001 (see `requirements-doc.md`): a local overlay of launch defaults vs. writing into the user's own package checkouts.

## Architecture Facts (2026-10-14)

| Source | Finding |
| --- | --- |
| `agent-team-definition/services/agent-team-definition-service.ts:195-312` | `getDefinitionById`/`getAllDefinitions`/`updateDefinition` (revision check, validation, `fileStore.update`, `reloadOwningFolder`) |
| `agent-definition/services/agent-definition-service.ts:218-350` | Read via `readStoredDefinition`; update patches keys incl. nullable `defaultLaunchConfig`, then `fileStore.update` |
| `agent-org-definition/providers/file-agent-org-definition-provider.ts:25-60` | Org source class by root: app-data → `server_data`; registered packages → `external_read_only` |
| `agent-definition/domain/models.ts:15-18` | Agent `sourceInfo` has dirs only (no source class), so the agent needs a root check |

## SR-003 Facts

| Source | Finding |
| --- | --- |
| `agent-team-definition/providers/file-agent-team-definition-provider.ts:176-202` | Update: Org-owned check → source lookup → **source-class assert** → `ensureWritableTeamSourcePaths` → atomic `transaction.commit` with `expectedRevision` and validation → reread. Delete: assert → `transaction.remove` |
| `collaboration-definition-admission/services/definition-admission-service.ts:198` | `ownerAction` for package load issues keyed on `external_read_only` |
| Usage count | `external_read_only` / `external_project` / the assert appear in 8 non-test server files; none in the web |
