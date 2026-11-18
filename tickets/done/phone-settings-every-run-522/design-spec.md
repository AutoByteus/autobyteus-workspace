# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the founder's direction (the Task's comment), founder informed in this conversation, 2026-11-17
- Behavior-defining supplements: the approved 506/458 phone specification (UIS-003), unchanged except REQ-004's sentence
- User approval of the design: `Not required` (the Task does not ask for it)
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/phone-settings-every-run-522/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md` (2026-11-17); `DESIGN.md` (repository root); `autobyteus-server-ts/docs/design/node_access_model.md` (NA-7), `collaboration_model.md` (delegated runs)
- Project design-principle conflicts: None

## Current-State Read

The phone's run screen (`MobileRunTargetView.vue:80-81`) offers Settings when `mobileRunSettingsScope(target)` returns a scope and the run is not remote. That function (`utils/mobile/mobileRunSettingsScope.ts:14-27`) switches on `target.kind`: `standalone_agent` → the agent run; `standalone_team_member` → the Team run at `team.focusedMemberAddress`; `agent_org_direct_agent` / `agent_org_team_member` → the Org run at `target.address`; the four delegated kinds → `null`. The Settings screen (`MobileRunSettings.vue:87-155`) loads `useExistingRunConfigStore` for the scope (`loadAgentCanonical` / `loadTeamCanonical` / `loadAgentOrgCanonical`), edits the scope's address and stops the scope's run through `useRunStopAction`.

Every target already carries `browse: AgentRunReadSubject` (`types/agent/agentRunReadSubject.ts`), the run that holds the opened agent, built by that run's own open: `run` for an agent run (a delegated one too, `delegatedRunsStore.ts:173`), `teamMember` for a member of a Team run (the standalone Team at its focused member, `activeContextStore.ts:96-98`; a task team at the member's address in its own team run, `delegatedRunsStore.ts:175-177`), `agentOrgMember` for an Org's own agent or Org Team member (`agentOrgExecutionContext.ts:143-144`), `peerRun` for a run on another node (`delegatedRunsStore.ts:163-166`).

Two defects follow from deciding by `kind`: the delegated kinds and the peer run get no Settings (BEH-002…004, the founder's report); and a task agent delegated by a standalone Team's member is built as `standalone_team_member` with the host Team's `team` view but its own `context` and `browse` (`activeContextStore.ts:80-89`), so Settings shows the task agent's name over the Team member's settings and a Save changes the Team member (BEH-005, R2).

The node serves every one of these runs by its own id with the calls the phone already uses (investigation R1); a run on another node cannot be changed from this node (peer commands: message, interrupt, stop).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one phone utility function rewritten (`mobileRunSettingsScope.ts`), the Settings screen gains a remote variant (`MobileRunSettings.vue`), the run screen and menu drop the conditional entry (`MobileRunTargetView.vue`, `MobileRunMenu.vue`), two catalog keys, specs and probe cases. All within the phone shell's existing owners; no new owner, store, API or server change.
- Architectural risk: `Low`
- Risk rationale: no contract, persistence, security, concurrency or ownership change: the phone uses the existing resume-config reads, model options, terminate and stopped-run updates, which a phone key already reaches (NA-7) and which the node serves for delegated runs (R1). The decision source (`browse`) already exists on every target and is already authoritative for the same agent's reads (event monitor pages, file changes).
- Escalation trigger: a delegated or Org case that the node refuses or answers differently from R1, or a target whose `browse` does not name the run that holds the agent → `Design Impact` back to the Solution Designer.

## Architecture Investigation Evidence

See `investigation-notes.md` (Source Log; R1, R2). Key: R1 node facts (`RUN_ACTIVE` live; editable stopped; `UPDATED` saves on every delegated kind; only the saved run or member changes); R2 (a) Settings on a Team member's task agent saved to the Team member; peer protocol has no remote change.

## Intended Change

The Settings decision moves from the kind of run to the run that holds the opened agent (`target.browse`). `mobileRunSettingsScope(target)` maps `browse` to a scope and never returns `null`: `run` → the agent run; `teamMember` → that Team run at the member's address; `agentOrgMember` → that Org run at the member's address; `peerRun` → `remote`. The run screen always offers Settings. For a `remote` scope the Settings screen shows the run line and the one sentence of REQ-004, with no rows and no Save. Everything else (loading, rows, Save, refusal, stop) is 458's, driven by the scope as today.

## Change Scope (Mandatory)

- In scope: UC-001…UC-003. The phone shell's Settings decision, the Settings screen's remote state, the run menu's Settings entry, two catalog keys, specs and the phone probe's cases.
- Derived consumers: `MobileRunSettingsScope` is read by `MobileRunSettings.vue` (load, edit, stop subject) and `MobileRunTargetView.vue` (entry): both updated. No other reader (`grep mobileRunSettingsScope`).
- Deliberately left alone: the desktop (its delegated rows already reach each run as itself); `ActiveAgentWorkspaceTarget` and how each kind is built (BEH-005's mixed `standalone_team_member` target serves the Team view's composer and tree and is correct for them; only Settings read the wrong field); the node; `existingRunConfigStore`; `useRunStopAction`.
- Follow-ups: None found.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior / Scenario | Trigger | Target production path | Lifecycle boundary |
| --- | --- | --- | --- |
| BEH-002 / SCN-001 (founder's case) | ⋮ → Settings on a task team's member | `MobileRunTargetView` (entry) → `MobileRunSettings` → `mobileRunSettingsScope(target)`: `browse = teamMember(taskTeamRunId, /reviewer)` → scope `team` → `existingRunConfigStore.loadTeamCanonical(taskTeamRunId)` → `getTeamRunResumeConfig` → rows of `planner.scopesByAddress['/reviewer']` → Save `updateStoppedTeamRunSelections` (the store's `saveTeam`) → back | Live: `isActive` → stop icon → `useRunStopAction({kind:'team', teamRunId: taskTeamRunId})` → `terminateTeamRun` → `reloadCanonical` |
| BEH-002 / SCN-002 | task agent | `browse = run(agentRunId)` → scope `agent` → `loadAgentCanonical` → `getAgentRunResumeConfig` → `updateStoppedAgentRunSelection` | stop `terminateRun(agentRunId)` |
| BEH-003 / SCN-003 | an Org's task agent / task team member | same as SCN-002 / SCN-001 (their `browse` is their own run's) | stop: that delegated run, never the Org |
| BEH-005 / SCN-004 | a Team member's task agent | `browse = run(helperRunId)` → scope `agent` (today: `team` at the Team's focused member) | — |
| BEH-001 / SCN-005 | 458's kinds | `browse` gives the same scope as today's kind switch (standalone Team: `teamMember(rootTeamRunId, focusedMemberAddress)` = `team.rootRunId`/`focusedMemberAddress`; Org: `agentOrgMember(orgRunId, agent.address)` = `root.orgRunId`/`address`) | unchanged |
| BEH-004 / SCN-006 | a peer's run | `browse = peerRun` → scope `remote` → the screen shows the sentence with the node's name from `useTargetConversation(...).remoteView.remote` (the run screen's chip source); the store is cleared | no stop, no Save |

Stopped-run update call per kind (the Task's question):

| Opened run (kind) | `browse` | Saved through | Stop stops |
| --- | --- | --- | --- |
| Standalone agent (`standalone_agent`) | `run` | `updateStoppedAgentRunSelection` | the agent run |
| Standalone Team's member (`standalone_team_member`) | `teamMember` (the Team run) | `updateStoppedTeamRunSelections` (member scope) | the Team run |
| A task agent opened in a standalone Team's tree (`standalone_team_member`, BEH-005) | `run` | `updateStoppedAgentRunSelection` | the task agent's run |
| A task team's member opened in a standalone Team's tree (`standalone_team_member`) | `teamMember` (the task team run) | `updateStoppedTeamRunSelections` | the task team run |
| Org's own agent / Org Team member (`agent_org_direct_agent`, `agent_org_team_member`) | `agentOrgMember` | `updateStoppedAgentOrgRunConfig` (the store's `saveAgentOrg`) | the Org run |
| Task agent of a standalone agent or of an Org (`agent_run_task_agent`, `agent_org_task_agent`) | `run` | `updateStoppedAgentRunSelection` | the task agent's run |
| Task team member of a standalone agent or of an Org (`agent_run_task_team_member`, `agent_org_task_team_member`) | `teamMember` (the task team run) | `updateStoppedTeamRunSelections` (member scope) | the task team run |
| A run on another node (any `*_task_agent` with a peer) | `peerRun` | — (no node-to-node change): REQ-004's sentence | — |

No kind of this node's runs cannot be changed: each is a stopped agent, Team or Org run the node updates. Only a run on another node cannot, and Settings says so.

## Relevant Supplemental Task Artifacts

| Artifact | Use |
| --- | --- |
| `evidence/investigation/mobile-settings-every-run-repro-cases.mjs` | The reproduction (MSP-R522, MSP-R522B); start from it for the probe cases |
| `evidence/investigation/r1/`, `r2/` | Evidence and screenshots |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (a gap in 458's scope plus BEH-005)
- Current design issue found: `Yes`
- Structural triggers that fire:
  - Several kinds or forms (Principle 1): Settings serves eight target kinds and a peer form; each traced (table above; R1, R2). Response: one rule over the field that already names the owning run.
  - Derived data (Principle 11): the owning run was derived twice, once by each target builder into `browse` and again by `mobileRunSettingsScope` from `kind`/`team`/`root`; the second derivation disagreed for BEH-005. Response: Settings reads `browse`; the second derivation is removed.
  - Behavior by absence (Principle 13): Settings disappeared because the switch "finds no scope" (`default: return null`). Response: every `browse` kind maps to an explicit scope, `remote` included; no `null`.
- Deliberate deviations: None
- Root cause classification: `Duplicated Policy Or Coordination` (a second, kind-based derivation of the owning run)
- Refactor needed now: `Yes` (small: the scope function reads `browse`)
- Evidence: `mobileRunSettingsScope.ts:14-27`; `activeContextStore.ts:80-89`; R1, R2
- Design response: Intended Change
- Intentional deferrals: None

## Terminology

GLOSSARY.md and `collaboration_model.md` § 1 (task agent, task team, delegated run, remote node). No new word. Code words: `MobileRunSettingsScope` keeps its meaning ("whose runtime and model Settings change"), gaining `remote`.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the kind switch in `mobileRunSettingsScope`; its `null` result; the `showSettings` computed in `MobileRunTargetView.vue` and the `showSettings` prop of `MobileRunMenu.vue` (always true now); the `&& !remote` condition; the spec asserting that delegated kinds get `null`.
- Compatibility wrappers kept: `None`

## Persisted Data / State Transition Decision

- Decision: `Not Affected` (no stored shape changes; saves go through the node's existing updates, R1).

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Change a stopped run's agent | ⋮ → Settings | the node holds the new launch; back in the conversation | `MobileRunSettings` (screen), `existingRunConfigStore` (draft and save) | UC-001 |
| DS-002 | Stop a live run from Settings | the stop icon | the run stopped, rows open | `useRunStopAction` | UC-002 |
| DS-003 | A run on another node | ⋮ → Settings | the sentence | `MobileRunSettings` | UC-003 |

## Primary Execution Spine(s)

- DS-001: `Run menu (MobileRunMenu) → MobileRunSettings → mobileRunSettingsScope(target.browse) → existingRunConfigStore.load*Canonical → node resume-config read → rows → existingRunConfigStore.save → node stopped-run update → back to the conversation`

## Spine Narratives (Mandatory)

DS-001: the menu always offers Settings. The screen asks `mobileRunSettingsScope` which run holds the opened agent and at which address; the answer comes from `target.browse`, which the run's own open built. The store loads that run's saved settings, the rows edit the scope's selection, Save calls that run's stopped-run update and returns. DS-002: a live run's stop calls the stop of the scope's run (agent run, Team run, Org run), as for 458. DS-003: `remote` scope → no load; the sentence names the node.

## Ownership Map

| Owner | Owns |
| --- | --- |
| `mobileRunSettingsScope.ts` | Which run and address a target's Settings change (from `browse`) |
| `MobileRunSettings.vue` | The screen: load by scope, rows, Save, stop subject, the remote sentence |
| `existingRunConfigStore` | Draft, editability, save (unchanged) |
| `useRunStopAction` | Stop (unchanged) |
| The target builders | `browse` (unchanged) |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Evidence |
| --- | --- | --- |
| The `kind` switch and `default: return null` in `mobileRunSettingsScope.ts` | Replaced by the `browse` mapping | Intended Change |
| `showSettings` in `MobileRunTargetView.vue` (computed, import of `mobileRunSettingsScope`), `showSettings` prop of `MobileRunMenu.vue` | Always true: a prop with one value | Principle 7 |
| `mobileRunSettingsScope.spec.ts` "serves no delegated copy" | Asserts removed behavior | ticket-scope common situations |

## Off-Spine Concerns Around The Spine

- The node's name for the sentence: `useTargetConversation(() => target).remoteView.remote.value?.nodeName`, already used by `MobileRunSettings` (`remoteView`) and the run screen's chip.

## Dependency Rules

- `MobileRunSettings` and `MobileRunTargetView` depend on `mobileRunSettingsScope`; it depends only on the target type. No new dependency.

## Interface Boundary Mapping

```ts
export type MobileRunSettingsScope =
  | Readonly<{ kind: 'agent'; runId: string; address: '/' }>
  | Readonly<{ kind: 'team'; teamRunId: string; address: string }>
  | Readonly<{ kind: 'agent_org'; orgRunId: string; address: string }>
  | Readonly<{ kind: 'remote' }>;

export const mobileRunSettingsScope = (target: ActiveAgentWorkspaceTarget): MobileRunSettingsScope => {
  const run = target.browse;
  switch (run.kind) {
    case 'run': return { kind: 'agent', runId: run.runId, address: '/' };
    case 'teamMember': return { kind: 'team', teamRunId: run.teamRunId, address: run.memberAddress };
    case 'agentOrgMember': return { kind: 'agent_org', orgRunId: run.orgRunId, address: run.memberAddress };
    case 'peerRun': return { kind: 'remote' };
  }
};
```

(An exhaustive switch over `AgentRunReadSubject`: a new read-subject kind fails the type check here.) No new interface or wrapper.

## Existing Capability / Subsystem Reuse Check

`browse` (owning run), `existingRunConfigStore`, `useRunStopAction`, `useTargetConversation().remoteView`, `mobileRunSubjectLine`: all reused.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-web/utils/mobile/mobileRunSettingsScope.ts` | Modify: map `browse`; doc comment says the decision is the run that holds the agent, for every kind |
| `autobyteus-web/components/mobile/views/MobileRunSettings.vue` | Modify: `remote` scope: `store.clear()`; render the sentence (`mobile.settings.remoteRun` with `{node}`) under the subject row, no rows, no Save bar; stop subject `null` for `remote` |
| `autobyteus-web/components/mobile/runScreen/MobileRunTargetView.vue` | Modify: remove `showSettings` and its import; `<MobileRunMenu>` without the prop |
| `autobyteus-web/components/mobile/runScreen/MobileRunMenu.vue` | Modify: Settings after Activity always; drop the `showSettings` prop |
| `autobyteus-web/localization/messages/{en,zh-CN}/mobileSettings.ts` | Add `mobile.settings.remoteRun`: en "This run is on {node}. Its runtime and model can be changed only on that node."; zh-CN "此运行位于 {node}。只能在该节点上更改它的运行时和模型。" |
| Specs: `utils/mobile/__tests__/mobileRunSettingsScope.spec.ts`, `components/mobile/views/__tests__/MobileRunSettings.spec.ts`, `components/mobile/runScreen/__tests__/MobileRunMenu.textSize.spec.ts` (and any spec mounting the menu with `showSettings`) | Rewrite to the new rule: each `browse` kind's scope (BEH-005's mixed target included); the remote sentence; the menu always has Settings |
| `autobyteus-web/tests/e2e/mobile-run-settings-cases.mjs` (or a new `mobile-delegated-run-settings-cases.mjs` imported by `mobile-shell-probe.mjs`) | Add probe cases for AC-001…AC-006 from the reproduction; next free MSP IDs |

## Concrete Examples / Shape Guidance

- Good: `scope = mobileRunSettingsScope(target)` from `target.browse` (the run's own open decided which run holds the agent).
- Bad (today): a second decision from `target.kind` + `target.team.focusedMemberAddress`, which for a Team member's task agent names the Team member.

## Backward-Compatibility Rejection Log (Mandatory)

- No dual path: the kind switch is removed, not kept beside the `browse` mapping.

## Change / Refactor Sequence

1. Start from the reproduction (`evidence/investigation/mobile-settings-every-run-repro-cases.mjs`): turn MSP-R522/R522B into the ticket's probe cases (failing now: no Settings on delegated kinds; R522B's Save changes the lead).
2. Rewrite `mobileRunSettingsScope` and its spec.
3. `MobileRunSettings.vue` remote state and keys; `MobileRunTargetView`/`MobileRunMenu` entry always.
4. Unit specs, typecheck, phone bundle, the probe cases; the existing 458 cases (MSP-60…66) and the full phone probe.

## Key Tradeoffs

- Deciding by `browse` instead of adding four kinds: one rule (the founder's direction), fixes BEH-005, and a future kind needs no Settings change.
- A remote run's Settings shows only a sentence (not read-only rows): this node has no reliable read of a peer run's launch (peer rows keep no editable launch, `delegatedLaunchRows.ts:242`).

## Risks

- R-001: the remote sentence needs the node's name from the run tree's peer row; it is there whenever the run screen shows its chip (the same source). Low.
- R-002 (coordination, PM 2026-11-17): autobyteus-525 (branch `codex/phone-text-size-home-525`, another team) edits the same files: it removes the Text size block from `MobileRunMenu.vue`, deletes `MobileRunMenu.textSize.spec.ts` (its run-menu entry assertions move to a run-menu spec), moves the `mobile.settings.textSize*` keys out of `localization/messages/{en,zh-CN}/mobileSettings.ts`, and edits `tests/e2e/mobile-shell-probe.mjs`. Agreed: whichever ticket merges second rebases on `origin/personal` and keeps both changes (522: Settings always offered after Activity, `mobile.settings.remoteRun`; 525: no Text size in the run menu). The two do not conflict in behavior; no founder decision is needed unless a rebase shows otherwise (then to the Solution Designer). 525's record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/tickets/in-progress/phone-text-size-home-525/handoff.md` (Risks and coordination).

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/phone-settings-every-run-522/evidence/investigation/mobile-settings-every-run-repro-cases.mjs`; command: copy it into `autobyteus-web/tests/e2e/`, import it in `mobile-shell-probe.mjs`, then `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-R522,MSP-R522B --output-dir=<fresh>` after `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`. Turn it into asserting cases with the next free MSP IDs.
- Tests on isolated nodes with scripted runtimes only (TESTING.md); no provider keys.
- Android emulator: one journey of the founder's case (AC-001) for API/E2E.
