# Member switch record contract — data of a member's runtime switch (autobyteus-348)

Status: part of the design (SR-001). It extends `run-runtime-switch-contract.md` of autobyteus-316 (finalized in `tickets/done/cross-runtime-resume/`), which defines the marker, the archive step, the journal's per-file runtime, the chat reader and the hand-over derived from the raw traces. **Nothing of those changes.** This contract adds only where a member's pending switch lives and how its binding is committed. Facts marked *Read* are from `origin/personal` @ `c952758a81`.

Words: **member** = a configured Agent of a Team or Org run (direct Agent, Agent of a mounted Team) or a delegated copy's Agent (task Agent; member of a task Team). **Record** = the saved entry that holds a member's binding.

## 1. The pending switch is the one type of autobyteus-316, on the member's record

`PendingRuntimeSwitch = { switchId, from: RunProviderBinding }` (`run-history/store/agent-run-metadata-types.ts`) is used unchanged. Optional on every record that holds a member's binding; absence means none. *Read:* the records are

| Record | Type | Where it is saved | Binding fields today |
| --- | --- | --- | --- |
| Configured member (Team, Org, mounted Team) | `ConfiguredAgentExecutionNode` | the run's execution tree (`agent_teams/<team>/…`, Org tree) | `launchConfiguration.{runtimeKind, llmModelIdentifier, llmConfig}`, `platformAgentRunId` |
| Delegated Agent copy | `TaskAgentExecution` | the copy's own `run_metadata.json` (`taskAgent` section); the coordinating tree holds a link; in memory the two are composed (`task-execution-tree-split.ts`) | started launch in `source.launchConfiguration`; user choice `userLaunchSelection`; `platformAgentRunId` |
| Member of a delegated Team copy | `TaskTeamAgentExecution` | the same, inside `TaskTeamExecution.members` | the Team copy's `source` members; `userLaunchSelection`; `platformAgentRunId` |

### 1.1 Configured member

While pending: `launchConfiguration.{runtimeKind, llmModelIdentifier, llmConfig}` hold the NEW selection, `platformAgentRunId` is `null`, `pendingRuntimeSwitch.from` holds the previous `{runtimeKind, llmModelIdentifier, llmConfig, platformAgentRunId}` (desired state plus last applied, as in 316). The member's address, run ID, workspace and tool policy never change.

### 1.2 Delegated copy

The started values never change (DEC-005, AR-005). The user's choice gains one optional field: `UserLaunchSelection = { llmModelIdentifier, llmConfig, selectedAt, runtimeKind? }`; absent `runtimeKind` means the started runtime. The effective launch is still decided by the one rule `effectiveCopyAgentLaunch` (the agent's own choice, else the Team's for a follower, else the started launch); the rule now also yields the runtime. While pending: the record's `platformAgentRunId` is `null` and `pendingRuntimeSwitch.from` holds the previous EFFECTIVE binding. A Team-level choice (`userTeamLaunchSelection`) that changes the runtime of followers records a pending switch on each following member that has conversation history.

### 1.3 Written the same way everywhere

One pure function decides the result for every kind, `applyRuntimeSelection(record, selection, switchId)` (generalizing `buildRuntimeSwitchMetadata` of 316): the previous runtime again while pending = undo (session ID back, pending cleared, the chosen model kept); the current runtime = model-only edit; another runtime = switch (new binding, no session ID, first `from` and first `switchId` kept when already pending). The standalone metadata, the configured-node patch and the copy-selection write all call it through a small adapter that reads and writes their own fields.

## 2. The activation commit clears the pending switch in the same durable write as the binding

`CollaborationAgentPlatformBindingChange` (`agent-collaboration/execution/domain/collaboration-agent-platform-binding.ts`) gains a third kind, `runtime_switch`: `{ kind, switchId, binding: CollaborationAgentPlatformBinding | null }` (`null` for the native runtime, which has no provider session). Every root already implements `commitAgentPlatformBindingChange(change)` under its persistence lock before the new run is published (*Read:* `RootTeamRun`, `AgentOrgRun`, `StandaloneAgentRunRoot`, each through its tree mutator). For `runtime_switch` the mutator matches the member (address and run ID, in the root's members and in every `taskExecutions` list), requires the stored pending switch to carry the same `switchId`, sets `platformAgentRunId` to the binding (or leaves `null`), and removes `pendingRuntimeSwitch`, in one tree write. A copy's facts are saved in its own file by the existing compose-at-load, split-at-save persistence (notes F-09 (a)); the mutators work on the composed record. Stored before and after, a Team member, external target:

```
before: member { address: "/reviewer", agentRunId: "run-7", platformAgentRunId: null,
                 launchConfiguration: { runtimeKind: "codex_app_server", llmModelIdentifier: "…", llmConfig: {…}, … },
                 pendingRuntimeSwitch: { switchId: "7c1e…", from: { runtimeKind: "claude_agent_sdk", …, platformAgentRunId: "sess-1" } } }
after:  member { address: "/reviewer", agentRunId: "run-7", platformAgentRunId: "thread-9",
                 launchConfiguration: { runtimeKind: "codex_app_server", … } }          // no pendingRuntimeSwitch key
```

## 3. What a switched member's folder looks like

The member's memory folder (`agent_teams/<team>/<agentRunId>/`, `agents/<taskAgentRunId>/`, …) is exactly the standalone run's folder of 316: `raw_traces_NNNNNN.jsonl` segment of boundary type `runtime_switch` for the previous agent, the active file starting with the marker, and the manifest entry with the previous agent's `RuntimeKind` as `runtime_kind`. The key is `runtime_switch:<agentRunId>:<switchId>`.

## 4. The open raw-trace file's runtime

`openRawTraceRuntimeKind` (316) is generalized from run metadata to any record with a binding and an optional pending switch: the previous runtime while pending, otherwise the record's runtime. Memory discovery calls it for Team, Org and task members (*Read:* `memory-run-discovery.ts` takes `launch.runtimeKind` from the configured placement or the task member's launch today).

## 5. Invariants

| ID | Invariant |
| --- | --- |
| M-1 | A record has a pending switch only while its `platformAgentRunId` is null and its binding fields hold the selection made after `from`. |
| M-2 | The commit of a switch removes the pending switch and sets the binding in one write; a commit whose `switchId` does not match the stored pending switch changes nothing. |
| M-3 | A copy's started values (`source`) are never changed by a switch. |
| M-4 | A member's address, run ID, memory folder and workspace never change at a switch. |
| M-5 | I-1…I-11 of the standalone contract hold for every member's folder. |
| M-6 | A member with no conversation history has its pending switch cleared by its first activation without a marker, an archive or a hand-over (the commit is the same; the archive step is skipped). |
