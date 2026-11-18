# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` SR-002 (the user for the direction, 2026-11-02; the Solution Designer within it, user informed)
- Behavior-defining supplements: `storage-analysis.md` (storage stays)
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/agent-settings-focused/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (this conversation)
- Conflicts: none

## Current-State Read

`RunConfigPanel` keeps Settings open while the user clicks between agents (`WorkspaceAdaptiveLayout.vue:81`: selected run and config mode only). `ExistingRunConfigEditor` loads one draft per **selected run**, keyed by `selectedType:selectedRunId` (`RunConfigPanel.vue:17`), and builds:
- `view.root` and `view.members` (`buildSavedRunMemberTree`);
- `delegatedRows` (open copies, local and remote).

`ExistingRunSettings.vue` always draws the root card, then "Members", then "Delegated copies" (`:43-92`). Edits route by kind: `changeScope(address)` for the root and members, `changeDelegated(key)` for copies. One Save commits all of them atomically (`save`, `configuredPatches`).

All the data for any one agent is already in these structures. The focused agent is known on the client: `activeContextStore.activeWorkspaceTarget`, the collaboration store's `selectedChild`, a team view's `getFocusedAgentRunId`, an org context's `selection`.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: web only: one new pure resolver, the editor, the settings view, the save bar, strings (en, zh-CN), tests and one probe; about 10–15 files. No server, contract or stored-data change.
- Architectural risk: `Low`
- Risk rationale: a presentation change over existing data, edit routes and the one existing save. No new persistence, stream or lifecycle.
- Escalation trigger: a focusable agent with no row in these structures that cannot be added from loaded data; or a need for a server change.

## Architecture Investigation Evidence

| Source | Observation | Decision Supported |
| --- | --- | --- |
| E-10, E-11 | Settings ignores focus; focus and data are on the client | A client-side resolver |
| `ExistingRunConfigEditor.vue` `delegatedRows`, `view` | Rows hold values, locks, stop facts and children | Reuse the rows; compute them as today |
| `RunMemberNode` (`runMemberTree.ts:29-66`) | Keys are addresses or `address@runId`; no `agentRunId` field on a member node | Add `agentRunId` to the node |
| `delegatedLaunchRows.ts:222-290` | A Team copy row has member children and a team-level target | The group of a copy's member is its Team copy row |

## Intended Change

Settings show one subject: the focused agent. A member's or team copy's group settings are one switch away. Nothing is removed from the data or the save; only what is drawn changes.

## Change Scope (Mandatory)

- In scope: UC-001…UC-003; the files in the mapping below.
- Derived consumers: `RunMemberNode` gains an optional `agentRunId`; other consumers (New chat drawer, Org launch page) ignore it.
- Deliberately left alone: stored data; the server; `RunMemberRow`/`RunMembersSection` (still used by New chat, the Org launch page and the group view); the stop rules; editing a member while its team runs.
- Follow-ups: none. The Task's bookmark on the four shapes is the user's.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Trigger | Change | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001…003; AC-001, AC-003 | Hub or copy focused with Settings open | One card; a hint on the hub | DS-001 |
| BEH-002 | REQ-001…004; AC-002…004 | Member focused | One card; switch to group view | DS-001 |
| BEH-003 | REQ-005; AC-005 | Edits across focus changes | The save bar names them | DS-002 |

## Relevant Supplemental Task Artifacts

`storage-analysis.md`: the decision that storage stays. The user's screenshot: the current state.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`. Settings' subject is the selected run, not the focused agent.
- Structural triggers: none beyond that. An edit's routing already splits by kind in one owner.
- Root cause classification: `Boundary Or Ownership Issue` (the view has no notion of a subject)
- Refactor needed now: `No`. One resolver and a smaller view.
- Evidence: E-10, E-11.
- Design response: `resolveSettingsSubject`.
- Intentional deferrals: none.

## Terminology

- **Subject**: the one agent Settings shows.
- **Group**: the team, org or Team copy the subject belongs to, with its own settings.

## Legacy Removal Policy (Mandatory)

- Obsolete in this scope: the "Delegated copies" section in `ExistingRunSettings.vue` and its strings `runSettings.delegated.title` and `.description` (en, zh-CN), if no other reader remains; the root-card-plus-all-lists layout as the default.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`.

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, BEH-002 | Focus or draft changes | One subject card, or the group view | `ExistingRunConfigEditor`, `resolveSettingsSubject` |
| DS-002 | Bounded | BEH-003 | An edit | Save bar naming every edited agent; the one Save | `ExistingRunConfigEditor` |

## Primary Execution Spine(s)

- DS-001: `focused agent run ID (activeContextStore target; for an org: the org context's selection) -> resolveSettingsSubject({ kind, root, members, delegated, focusedAgentRunId }) -> { subject, group } -> ExistingRunSettings (one card, or the group view when the switch says so) -> change -> the existing route by the node's origin (changeScope or changeDelegated)`.
- DS-002: `draftStore dirty scopes + delegatedDraft.edits -> names through the same nodes -> save bar -> existing save()`.

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | The resolver is pure. See the rules below. The switch's state lives in the editor and returns to "this agent" when the focus changes. Rows and model options are still computed for the whole run, so a focus change needs no load |
| DS-002 | Edits stay pending across focus changes, as the draft already allows. Because they may be off screen, the save bar says whose they are: "Unsaved changes: code reviewer, implementation engineer". Save and Cancel act on all of them, as today |

### Subject and group rules

| Focused | Subject | Group (the switch) | Edit route | Stop in the header |
| --- | --- | --- | --- | --- |
| A standalone run itself | The root card, as today | None. When it has open copies: a one-line hint, "Select a copy on the left to change its settings." | `change-root` | The run |
| A delegated Agent copy (local) | Its node | None | `changeDelegated` | That copy (`node.delegated.stop`) |
| A member of a Team copy | Its child node | "Team settings": the copy's Team node, with its members | `changeDelegated` | That copy's team (the row's stop) |
| A remote copy | Its node, read-only, with its node chip | As above when it is a team | none | As today's row |
| A Team member (the coordinator too) | Its member node | "Team settings": the root card and "Members", today's layout without copies | `changeScope(address)`; the group's root card `change-root` | The Team, labelled as such |
| An Org direct agent or a member of a placed team | Its member node | "Organization settings": the root card and "Members" with placed teams and workspaces | `changeScope(address)`; workspace in the group view | The Org, labelled as such |
| A copy of a Team or Org root | As a copy above | None, or its Team copy | `changeDelegated` | That copy |
| No row found (not loaded yet, or an unknown ID) | The group view, never an empty page | — | — | The run |

- A subject card uses `RunSettingsCard` with the node's values, its locks (`node.locked` over the section's) and its model menu (`lockedModelsFor` or `delegatedLockedModelsFor` by origin), plus its notes and routing reason as `RunMemberRow` shows them today.
- The header shows the subject's name and live status. For a member or Team copy member, a small line under it names the group.
- A running copy shows today's text ("Stop one to change its model; its next message resumes it on the new model.") on its own card.
- Org mode: `AgentOrgWorkspaceView.vue` passes `:target` for the org with its `selection`. With nothing selected, the subject falls back to the group view.

## Spine Actors / Main-Line Nodes

`ExistingRunConfigEditor`, `resolveSettingsSubject`, `ExistingRunSettings`.

## Ownership Map

- `resolveSettingsSubject`: which node is the subject and which is its group. Pure, no store.
- `ExistingRunConfigEditor`: reads focus, holds the switch state, routes edits, computes the save bar's names.
- `ExistingRunSettings`: draws what it is given.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A: none.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| The "Delegated copies" `RunMembersSection` in `ExistingRunSettings.vue`, its props (`delegated`, `delegatedLockedModelsFor`) as a list, and the two strings | REQ-002 | The subject card; focus in the left tree |
| The tests asserting the list on a focused run (`RunDelegatedLaunchSection.spec.ts`, `ExistingRunConfigEditor.delegatedSave.spec.ts`, `tests/e2e/run-settings-live-probe.mjs`) | The behavior changed | The same assertions per focused copy |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

Switch state: `this agent <-> group`; a focus change returns to `this agent`.

## Off-Spine Concerns Around The Spine

| Concern | Responsibility |
| --- | --- |
| Strings (en, zh-CN) | The switch labels, the hint, the save bar's names (`runSettings.*`) |

## Ownership Boundaries

The view does not read stores. The resolver does not edit. Edits go only through the existing `changeScope`, `changeDelegated` and `save`.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Forbidden Bypass |
| --- | --- | --- |
| `resolveSettingsSubject` | Focus-to-node mapping | The view searching rows itself |

## Dependency Rules

`utils/runSettings/settingsSubject.ts` depends only on the `RunMemberNode` types.

## Interface Boundary Mapping

| Interface | Subject | Identity |
| --- | --- | --- |
| `resolveSettingsSubject({ runKind, members, delegated, focusedAgentRunId }) -> { subject: RunMemberNode \| 'root' \| null, origin: 'member' \| 'delegated' \| 'root', group: RunMemberNode \| 'root' \| null }` | The focused agent's node | `agentRunId` |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Risk |
| --- | --- | --- | --- |
| `resolveSettingsSubject` | Yes | Yes | Low |

## Main Domain Subject Naming Check

| Name | Natural? | Glossary-Consistent? |
| --- | --- | --- |
| `settingsSubject`, "Team settings", "Organization settings" | Yes | Yes |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| The card | `RunSettingsCard` | Reuse |
| Group view | Root card + `RunMembersSection` | Reuse |
| Rows, edits, save | `runMemberTree`, `delegatedLaunchRows`, the editor | Reuse; add `agentRunId` to nodes |

## Subsystem / Capability-Area Allocation

`autobyteus-web/components/run-settings`, `components/workspace/config`, `utils/runSettings`: Extend.

## Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `utils/runSettings/settingsSubject.ts` (new) | The resolver |
| `utils/runSettings/runMemberTree.ts`, `delegatedLaunchRows.ts` | `agentRunId` on nodes |
| `components/workspace/config/ExistingRunConfigEditor.vue` | Focus, switch state, routing, the save bar's names |
| `components/run-settings/ExistingRunSettings.vue` | One card or the group view; the switch; the hint; names in the save bar |
| `components/workspace/org/AgentOrgWorkspaceView.vue` | Only if the org's selection must be passed explicitly |
| `localization/messages/{en,zh-CN}/runSettings.ts` | Strings |
| `docs/settings.md` (web) | The behavior |
| Specs: a new `settingsSubject.spec.ts`; the existing editor and settings specs; `tests/e2e/run-settings-live-probe.mjs` | Coverage |

## Target Subsystem / Folder / File Mapping

As above.

## Folder Boundary Check

Compact: one new utility beside its peers. Low risk.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| The user's screenshot | The Project Task Manager focused: its four lines and one hint. Click "agent package creator" on the left: its own card | The list of every copy |
| Team | Focus "code reviewer": its card and a "Team settings" switch | The team card first with a member list to search |
| Unsaved | Edit A, click B: the save bar still says "A" | Silently saving or losing A's edit |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep the copy list collapsed under the hub | Rejected: it is the user's complaint |

## Change / Refactor Sequence

1. `agentRunId` on nodes; `settingsSubject.ts` with its table-driven spec (every row above).
2. Editor and view; strings.
3. The save bar's names.
4. Specs and the probe; docs.
5. Merge the latest 348 branch in when it changes. Delivery merges only after 348 is on `personal`, then refreshes from it.

## Key Tradeoffs

- Copies leave Settings, so finding one relies on the left tree, which already shows them. A closed copy appears in neither, as today.
- Rows are still computed for the whole run: simple, no new loads, and small next to the data already loaded.

## Risks

- A copy hidden under a collapsed team in the left tree takes one more click. Accepted.
- 348 may still change the shared files. Merge its branch in; delivery waits for its landing.

## Guidance For Implementation

- Work in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-settings-focused` (branch `codex/agent-settings-focused`), already fast-forwarded to 348's `3261712e06`.
- Reproduction to start from: `None`; a stopped hub with copies, a stopped Team and an Org on isolated test data show the current layout (`tests/e2e/run-settings-live-probe.mjs`).
- Done-when: per the Task. Isolated data only; no stored data changes.
