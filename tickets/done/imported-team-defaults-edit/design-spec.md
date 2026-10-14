# Design Spec — imported-team-defaults-edit

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (replaces SR-001/SR-002; the personal-preference design is withdrawn by the user)
- Approved requirements: `requirements-doc.md` SR-003 (user decision 2026-10-14: "all of them are editable … keep it simple")
- Design status: `Ready`
- Authorities read (this conversation): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md`.

## Current-State Read

- **Package roots:** `listRegisteredPackageRoots` marks every registered package root `external_read_only`; the app-data root is `server_data` (`agent-package-definitions/domain/registered-package-roots.ts`). The Org provider computes the same classes (`file-agent-org-definition-provider.ts:33-44`).
- **The blocking check:** `assertDefinitionSourceWritableByRuntime` allows only `server_data`. Team update/delete (`file-agent-team-definition-provider.ts:182,200`) and Org update/delete (`file-agent-org-definition-provider.ts:97,106`) call it.
- **What remains after it:** Team/Org saves already go through an atomic package transaction with a revision check and validation, plus `ensureWritableTeamSourcePaths` (filesystem). Agents use only the filesystem check (`agent-definition-source-paths.ts:170-183`).
- **Admission:** `definition-admission-service.ts:198` derives an `ownerAction` for `external_read_only` load issues (fix in the package).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
  - one source-class rename across about 8 server files;
  - one rule change (writable: `server_data` | `registered_package`);
  - error text;
  - tests.
- Architectural risk: `Low`. The change aligns Teams/Orgs with the existing Agent behavior, under the user's explicit decision, and reuses the existing atomic writer, revision check and filesystem check. There is no new persistence, contract, API, concurrency mechanism or owner. The boundary relaxation is a single, user-decided policy flip with an existing precedent (Agents).
- Escalation trigger: package auto-refresh or file-watch interactions causing reload races on save, or any need for new UI → Design Impact.

## Intended Change

1. **Rename** `DefinitionSourceClass` `external_read_only` → `registered_package` everywhere it is produced or read:
   - `registered-package-roots.ts`, `agent-package-definition-types.ts`;
   - the Org provider descriptor;
   - Team/Org services' `sourceClass` unions;
   - the admission service `ownerAction` condition (keep its meaning: load issues are fixed in the package).
   Its `DefinitionMutationOwner` becomes `"package_author"`, replacing `"external_project"`.
2. **Writability:** `assertDefinitionSourceWritableByRuntime` allows `server_data` and `registered_package`; `implementation_repository` stays refused.
3. **Team and Org update/delete** keep calling it, now passing for registered packages. The existing filesystem checks then produce the real "read-only at source path" error when the disk refuses.
4. No web change: the edit pages already send full payloads, and Save now succeeds. Definitions reload through the existing `reloadOwningFolder` after a save.

## Spine

`Edit page Save → GraphQL update{Team,Org}Definition → service (revision check, validation) → provider: assertDefinitionSourceWritableByRuntime (passes) → ensureWritable… (filesystem) → atomic package transaction → reload → GraphQL result`

## Removal / Compatibility

- Removed: the `external_read_only` name and the runtime refusal for registered packages. No compatibility alias for the old name; no persisted data uses it (it is computed at read time).

## File Mapping

| File | Change |
| --- | --- |
| `collaboration-definition-admission/domain/definition-source-descriptor.ts` | Class/owner rename; writability rule |
| `agent-package-definitions/domain/registered-package-roots.ts`, `agent-package-definition-types.ts` | Rename |
| `agent-org-definition/providers/file-agent-org-definition-provider.ts`, `agent-org-definition/services/agent-org-definition-service.ts` | Rename |
| `agent-team-definition/services/agent-team-definition-service.ts` | Rename (union) |
| `collaboration-definition-admission/services/definition-admission-service.ts` | Rename in the `ownerAction` condition |
| Tests that assert the old refusal or name | Update to the new rule |
| Docs: server `agent_team_definition.md`, `agent_orgs.md`, `agent_definition.md`; web `agent_teams.md`, `agent_orgs.md` | Registered packages are editable |

## Tests

- **Server unit:**
  - the writability rule (`server_data` and `registered_package` pass; `implementation_repository` refused);
  - Team/Org provider update and delete on a temp registered package root succeed and write atomically;
  - a stale revision gives a conflict;
  - an Org-owned Team direct update is still refused;
  - a non-writable folder gives the filesystem error.
- **Server integration (GraphQL):** update a registered-package Team's `defaultLaunchConfig`; read it back; a catalog/delegation launch resolution uses it.
- **User check:** AC-007 on a beta.

## Risks

- GitHub-installed package edits are overwritten by later updates (known; the same as Agents).
- Agent saves still add empty fields to `agent-config.json` (follow-up).
