# IMP-001 — The new and changed specs fail on the base

- Date: 2026-11-28. Worktree `<worktree>`, branch `codex/agent-avatars-669`, base `origin/personal` @ `ea787a37b1`.
- Method:
  1. Copy the changed production files aside.
  2. Write the base's versions in their place (`git show ea787a37b1:<file> > <file>`).
  3. Keep the new additive modules.
  4. Run the ticket's specs.
  5. Copy this ticket's versions back, and check each restored file byte for byte with `cmp`; `git status` was clean for the server afterwards.
- Every run used `env -i PATH HOME TMPDIR USER`.
- Specs for modules that do not exist on the base fail there by import:
  - web: `DefinitionAvatar.spec.ts`, `useAvatarObjectUrl.spec.ts`, `definitionAvatarStore.spec.ts`;
  - server: `definition-avatar-file.test.ts`, `definition-avatar-address.test.ts`, `api/rest/definition-avatars.test.ts`.

  They are not counted below.

## Web

- Base versions swapped in:
  - `utils/mobile/mobileRunListRows.ts`;
  - `components/agents/AgentDefinitionForm.vue`, `components/agentTeams/AgentTeamDefinitionForm.vue`;
  - `components/agentOrgs/AgentOrgAvatarEditor.vue`, `AgentOrgExperience.vue`, `AgentOrgAvatar.vue`;
  - the en `agentOrgs.ts`, `agents.ts` and `agentTeams.ts` messages.
- Command: `NUXT_TEST=true npx vitest run` on these specs:
  - `mobileRunListRows.spec.ts`;
  - `AgentDefinitionForm.personalSettings.spec.ts`;
  - `AgentTeamDefinitionForm.spec.ts`;
  - `AgentOrgAvatar.spec.ts`;
  - `AgentOrgAuthoringActions.spec.ts`.
- Result: `Test Files  5 failed (5)`, `Tests  10 failed | 29 passed (39)`.

Failing on the base, each one is a case this ticket added or changed:

- Org avatar presentation and real upload store > previews the package's picture, captioned, with no Remove, while the user has none of their own
- AgentDefinitionForm personal settings > the picture > previews the package's picture, captioned, with no Remove, and saves no picture of the user's
- AgentDefinitionForm personal settings > the picture > fills the user's own picture, with Remove and no caption; Remove saves null
- AgentDefinitionForm personal settings > the picture > a new agent shows no package picture
- AgentTeamDefinitionForm > a package Team: the note and the avatar mark; reset takes the base avatar and keeps the unsaved name
- AgentTeamDefinitionForm > the picture > previews the package's picture, captioned, with no Remove, and saves no picture of the user's
- AgentTeamDefinitionForm > the picture > fills the user's own picture, with Remove and no caption; Remove saves null
- buildMobileRunListRows > gives each row its definition's picture: the listed run's, a tree row's by its definition ID, none for a peer
- Org authoring controls > keeps unchanged avatar omitted, sends null on explicit clear (autobyteus-669 W-6), and omits it on subsequent unchanged Save
- Org authoring controls > retains a cleared avatar draft and error on failed Save, then retries the same explicit clear

## Server

- Base versions swapped in:
  - `run-tree-records.ts`, `run-tree-view.ts`;
  - the agent, team and org node readers;
  - `agent-team-definition.ts`, `agent-team-definition-service.ts`;
  - `api/rest/index.ts`, `personal-settings-service.ts`, `run-own-agents-reader.ts`.
- Command: `npx vitest run` on the 10 test files this ticket added or changed.
- Result: `Test Files  6 failed | 4 passed (10)`, `Tests  14 failed | 96 passed (110)`.

| Test file | Failing on the base |
| --- | --- |
| `definition-avatar-readers.test.ts` | 5 of 7: the picture read for an agent, a team and an org; a replaced picture's new version (×3); an invalid picture ignored and logged once |
| `personal-settings-service.test.ts` | 3: a definition-avatar address clears (relative and absolute); a package address is never stored |
| `run-own-agents-reader.test.ts` | 2: the own tree names each part's definition |
| `run-tree-view.test.ts` | 2: rows carry `definitionId` |
| `run-tree-records.test.ts` | 1: a delegated team's record carries its definition |
| `agent-team-definition-service.test.ts` | 1: absent keeps the picture; `null`, `""` and a package address clear it |

`node-route-permissions.test.ts` passes on the base: it pins the new route's access class, which the default owner rule already gives.

## The watcher fix (`30132f3351`)

`agent-package-layout.test.ts` with the new picture cases, before the fix: `Tests  5 failed | 36 passed (41)`. All five
"watches the package picture …" cases fail. After the fix, 41 of 41 pass.
