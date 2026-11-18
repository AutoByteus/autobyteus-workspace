# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer package (design-spec.md) | N/A | `Initial Baseline` | SR-001 | Implemented; ready for direct API/E2E |

## Revision Entries

### IR-001 — A registered root follows the saved edit of its stopped host (FU-008)

- Triggering role, report path, and round: Solution Designer, `design-spec.md` "Intended Change" 1-5; round 1.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: a delegated copy started after a saved stopped-run edit carries the saved model, settings and runtime.
- Related solution revision IDs: SR-001; others N/A
- Why recorded: the root kept the launch it captured when it loaded (U-1, now reproduced).
- Approved behavior or requirement IDs affected: REQ-001, REQ-002; AC-001..AC-005.
- Implementation delta (commit `79b268d2f9`):
  - `StandaloneRunLifecyclePort.refreshInheritedLaunch(runId)` (`agent-execution/services/standalone-run-ports.ts`).
  - `StandaloneAgentRunRootManager.refreshInheritedLaunch`: awaits a loading root, returns when none is registered, reads the host metadata and, for an eligible run, calls `root.setInheritedLaunch(launchConfigurationOf(metadata))`; `resolveRootAndEnsureHost` re-sets the launch from the metadata it already reads (design item 5).
  - `StandaloneAgentRunRoot`: one mutable `inheritedLaunch` field and `setInheritedLaunch`; `StandaloneRootCollaborators` takes `inheritedLaunch(): AgentLaunchConfiguration` instead of the captured option (the pure `standaloneRootCollaboratorPortFor` keeps its value parameter).
  - `AgentRunService.updateStoppedSelection`: after an `UPDATED` outcome it calls the refresh; a rejected refresh is logged (`console.warn`) and the saved edit still returns as saved.
- Changed files: the five source files above plus tests (`standalone-root-inherited-launch.test.ts` new; `agent-run-restore-service.test.ts`, `agent-run-termination-service.test.ts`, `agent-run-service.integration.test.ts` take the new port member).
- Local validation and result: IMP-01..IMP-03 pass.
- Next recipient or routing: API/E2E engineer (direct route, Small / Low).
- Remaining limitations or risks: see the handoff (the wake path, the loading window).
