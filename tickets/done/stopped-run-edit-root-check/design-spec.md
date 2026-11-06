# Design Spec — stopped-run-edit-root-check

## Solution And Approval Basis
- Revision: `SR-001`. Approved requirements: `requirements-doc.md` @ SR-001 (Solution Designer within the direction; user informed). User approval of the design: `Not required`. Status: `Ready`.
- Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-edit-root-check/tickets/in-progress/stopped-run-edit-root-check/investigation-notes.md` (F-01…F-09).
- Authorities read: skill references (see the notes), `DESIGN.md` (rules 1, 4, 5, 6, 7, 12; no conflict), `TESTING.md`.

## Current-State Read
`StandaloneStoppedRunSelectionUpdater` (agent-execution, in the run's transition lane) saves the selection; the root (`standalone-agent-run-root`) holds a launch captured at load that backs catalog copies' inherited launch (F-01, F-03). `AgentRunService` holds the root manager as the `StandaloneRunLifecyclePort` (F-07).

## Task Size And Architectural Risk
- Task size: `Small` (one port method, one manager method, one root setter, a getter in the collaborators; tests). Risk: `Low` (in-memory value; no stored data; no API).
- Escalation trigger: the first failing test shows another holder of the stale launch (for example inside the collaborator admission) or a race the single swap does not cover; revisit.

## Intended Change
1. `StandaloneRunLifecyclePort` (`standalone-run-ports.ts`) gains `refreshInheritedLaunch(runId): Promise<void>`: "after the run's saved selection changed, a registered root follows it".
2. `StandaloneAgentRunRootManager` implements it: wait for a loading root (`this.pending.get(id)`), return if none is registered, read the host's current metadata (`options.host.readMetadata`), and call `root.setInheritedLaunch(launchConfigurationOf(metadata))`. No metadata or an ineligible run: nothing.
3. `StandaloneAgentRunRoot` keeps the launch in one mutable field and offers `setInheritedLaunch(launch)`; it passes a getter to `StandaloneRootCollaborators` (option `rootLaunchConfiguration` becomes `inheritedLaunch(): AgentLaunchConfiguration`), which `portFor` reads at each call. `launchBase()` keeps its sync shape.
4. `AgentRunService.updateStoppedSelection` (the entry that already holds `standaloneRuns`) calls `standaloneRuns?.refreshInheritedLaunch(runId)` after an `UPDATED` outcome. A thrown refresh is logged and does not fail the saved edit (the file is already correct; a later activation also re-reads it: see below).
5. The manager also re-sets the launch from the metadata it already reads at `resolveRootAndEnsureHost` (line ~204: `readMetadata` after the host is ready), so a missed refresh heals at the next use. (No new read.)

## Change Scope (Mandatory)
- In scope: UC-001: `standalone-run-ports.ts`, `standalone-agent-run-root-manager.ts`, `standalone-agent-run-root.ts`, `standalone-root-collaborators.ts`, `agent-run-service.ts`, and their tests.
- Derived consumers: `standaloneRootCollaboratorPortFor` (takes the launch as a parameter; unchanged); `launchBase` consumers in `collaborator-admission.ts` (unchanged, sync).
- Deliberately left alone: Team/Org roots; `updateStoredTree`; the updater's checks (host-live refusal stays); `canSwitchRuntime`; Stop; the switch sequence of 348.
- Follow-ups: none new. FU-005 is recorded as covered (F-08). FU-004/FU-001: Task autobyteus-396.

## Relevant Behavior And Production-Path Map
BEH-001: `GraphQL updateStoppedAgentRunSelection → StudioRunModelConfigService → AgentRunService.updateStoppedSelection → lifecycle (transition lane) → updater → catalog commit` ⇒ UPDATED ⇒ `★ standaloneRuns.refreshInheritedLaunch → manager (await loading root) → readMetadata → root.setInheritedLaunch`; later `delegate catalog agent → root collaborators → portFor() → launchBase()` reads the new launch. BEH-002: unchanged updater checks.

## Task Design Health Assessment (Mandatory)
- Posture: `Bug Fix`. Current design issue: `Yes`: a value captured once at load, with no owner for keeping it current. Trigger: Boundary Or Ownership (the lifecycle owns the metadata; the root consumes a copy). Refactor needed now: `Yes`, minimal (a getter and one refresh entry instead of a captured value).
- Alternatives rejected: refuse the edit while a root is registered (blocks a working edit; Stop not offered offline); end the root on edit (stops copies that may still work); make `launchBase` async or read metadata per call (four implementers of the collaborator port, a file read on each call).
- Deferrals: none.

## Legacy Removal Policy
The root's captured `rootLaunchConfiguration` option is replaced by the getter; nothing is kept beside it.

## Persisted Data / State Transition Decision
`Not Affected`.

## Ownership, Dependency Rules, Interfaces
- Owner of "the inherited launch of a root": the root; the manager keeps it fed from the host's metadata (the host's metadata owner remains the lifecycle). Dependency direction unchanged: the service reaches the manager only through the port (agent-execution does not import the root).
- Interface: `StandaloneRunLifecyclePort.refreshInheritedLaunch(runId)`: producer the manager, consumer `AgentRunService`.

## Backward-Compatibility Rejection Log
No compatibility shims; the option rename is internal.

## Change / Refactor Sequence
1. Failing tests first (below). 2. Root getter and setter. 3. Manager method and the heal at `resolveRootAndEnsureHost`. 4. Port and service call.

## Key Tradeoffs
A launch that is refreshed after the save rather than at delegation time: there is a short window between the commit and the refresh in which a copy could still take the old launch (the refresh runs right after, inside the same request). Accepted: the host edit already runs in the transition lane, and the window is the same request.

## Risks
A refresh that throws leaves the root stale until the next use (item 5 heals it).

## Guidance For Implementation
- Reproduction to start from: first write the failing test through the product path, in `tests/unit/standalone-agent-run-root/` with the existing fixture: `f.host.crash()`, save a new model through the stopped-run edit (`AgentRunService.updateStoppedSelection` if the fixture can host it, else the updater plus the metadata the fixture's host reads), then `delegateToNewCopy`; show the copy carries the OLD model on the base (this settles U-1) and the NEW model after the change. Record in the implementation handoff how it was reproduced.
- Tests (TESTING.md layers): unit for AC-001…005 (host crash fixture; loading root; live host refused; no root); the existing standalone root, collaborator-port and updater tests stay green. API/E2E decides on a built-server case (a real stopped run with a registered root is hard to stage; the unit fixture with real classes may be the right level; API/E2E states it).
- Do not edit the 348/316 switch code beyond the call site.
