# AutoByteus Runtime Restart Reproduction Evidence

## Artifact Status

- Status: Complete
- Evidence date: 2026-08-17
- Intended-behavior authority: N/A — this supplement records observed browser, filesystem, log, and source facts; `requirements.md` remains authoritative for intended behavior.
- Related behaviors: BEH-009, BEH-010
- Related requirements: REQ-012 through REQ-015
- Related acceptance criteria: AC-016 through AC-019
- Raw retained evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/live-browser-reproduction-autobyteus/`

## Question Tested

Does a configured native AutoByteus team member continue its persisted working context after a full API-server restart on `origin/codex/agent-team-universal-task-delegation`, and does the reported-working `origin/personal` branch behave differently under the same browser workflow?

## Isolation And Setup

Both runs used disposable app-data directories, disposable file databases, dedicated API/web ports, the real web UI, the requested agent package, and a full API process stop/start. Neither run read or mutated the production database.

Secrets were imported into each disposable database with the repository-supported form of the user-requested environment import:

```bash
pnpm secrets:import -- \
  --source /Users/normy/.autobyteus/server-data/.env \
  --database-url file:///private/tmp/<isolated-run>/autobyteus.db
```

Common selection:

- Agent package: `/Users/normy/autobyteus_org/autobyteus-agents`
- Team: `Classroom Simulation Team`
- Runtime: `AUTOBYTEUS`
- Model: DeepSeek V4 Flash (`deepseek-v4-flash`)
- Browser flow: create team conversation, send an exact marker, wait for acknowledgement, stop the API process fully, restart with the same isolated state, reopen the same conversation, ask for the marker.

## Base-Branch Rerun — Failing

- Source: `origin/codex/agent-team-universal-task-delegation`
- Commit: `2b0f8ea99296bb3f983c497d1f5c00a4d839f404`
- TeamRun ID: `classroom_simulation_team_dfac65f6192f4535813544a7513067d6`
- Professor AgentRun ID: `professor_471ca2122b3c4920b01e7e2afb4556b2`
- Marker: `BASE-NATIVE-RERUN-20260817-P8W6`
- Pre-restart response: `ACK BASE-NATIVE-RERUN-20260817-P8W6`
- Post-restart response: `I have no record of a marker. No prior context or file about a server-restart marker exists in this session, so I cannot truthfully reproduce one.`
- Result: **Fail** — visible local conversation history reopened, but the native LLM context did not continue.

Physical evidence:

1. `base/team-run-execution-tree.json` retains the same local TeamRun and AgentRun identities and correctly has `platformAgentRunId: null` for the native members.
2. `base/raw-traces.jsonl` contains the pre-restart marker turn and the post-restart recall turn, but both are numbered `turn_0001`; the second agent explicitly reasons that it has no prior context.
3. `base/working-context-snapshot-after-restart.json` contains the post-restart system/user/assistant exchange but no `BASE-NATIVE-RERUN` marker. The first post-restart turn replaced rather than appended to the earlier working-context state.
4. `base/server.log` records `Workspace with ID ... not found. Falling back to temp workspace`, followed by `Successfully created autobyteus agent run ...`; it does not record native AgentRun restoration.
5. `base/post-restart-browser.png` retains the final browser state showing the failed recall.

## Personal-Branch Control — Passing

- Source: `origin/personal`
- Commit: `acb8985930ccce49b632cdca22b92f5b237e35bf`
- TeamRun ID: `classroom_simulation_team_ece4a4cdd54e417bab501355f3b4a549`
- Professor AgentRun ID: `professor_643c95b1f45c4f27ade00f72ec1efb18`
- Marker: `PERSONAL-NATIVE-CONTROL-20260817-R5C3`
- Pre-restart response: `ACK PERSONAL-NATIVE-CONTROL-20260817-R5C3`
- Post-restart response: `PERSONAL-NATIVE-CONTROL-20260817-R5C3`
- Result: **Pass** — the first post-restart provider turn had the earlier semantic context.

Physical evidence:

1. `personal/server.log` records workspace re-establishment from `/Users/normy/autobyteus_org/autobyteus-agents`, `Successfully restored mixed team run ...`, `Agent ... restored and stored successfully`, and `Successfully restored autobyteus agent run ...`.
2. `personal/working-context-snapshot-after-restart.json` retains the pre-restart marker user/assistant messages and appends the post-restart recall user/assistant messages.
3. `personal/raw-traces.jsonl` shows the post-restart reasoning reading the exact earlier marker from conversational context.
4. `personal/post-restart-browser.png` retains the successful browser result.

## Source Comparison And Root Cause

The difference is not a DeepSeek model property, UI-history problem, or missing local run identity.

### Working personal path

```text
TeamRunService.restoreTeamRun
  -> TeamRunMetadataMapper.buildRestoreContext
     -> WorkspaceManager.ensureWorkspaceByRootPath
  -> AgentTeamRunManager.restoreTeamRun
  -> MixedTeamRunBackendFactory.restoreBackend
  -> configured MixedAgentMemberHandle
  -> AgentRunManager.restoreAgentRun
  -> AutoByteusAgentRunBackendFactory.restoreBackend
  -> agentFactory.restoreAgent(local AgentRun ID, same memory directory)
  -> WorkingContextSnapshotRestoreStep loads the prior native snapshot
```

### Failing V1 base path

```text
TeamRunService.restoreTeamRun
  -> AgentTeamRunManager.restoreTeamRun loads the V1 package/config
  -> AgentTeamRunManager.materializeRoot
  -> MixedTeamRunBackendFactory.createBackend  # fresh path even for restore
  -> configured MixedAgentMemberHandle sees native platformAgentRunId == null
  -> AgentRunManager.create/prepareNewAgentRun
  -> AutoByteusAgentRunBackendFactory.createBackend
  -> same local AgentRun ID is created as a fresh execution
  -> first post-restart turn overwrites the working-context snapshot
```

The V1 manager reconstructs configured identity from the execution tree but discards **materialization provenance**: it does not tell the mixed backend or configured member handles whether the root is new or restored. Native continuation cannot use external `platformAgentRunId` as that signal because native TeamRun nodes correctly have no external provider binding.

The V1 restore also computes a deterministic workspace ID without making the persisted workspace active. `AutoByteusAgentRunBackendFactory` performs a synchronous active-workspace lookup and silently falls back to the temp workspace when the ID has not been activated. `origin/personal` explicitly ensures the workspace before restoring the backend.

## Relationship To The Halted Partial Implementation

The current ticket implementation commit introduces unpublished AgentRun candidates and external-provider binding durability, but `AutoByteusAgentRunBackend.getPlatformAgentRunId()` returns the local AgentRun ID. The implemented handle currently treats any truthy candidate ID as a `TeamAgentPlatformBinding`; this is the concrete `CODE-FIND-001` failure recorded in `code-review-report.md`.

That local-ID adoption must be removed, but only gating binding adoption is insufficient: the base-branch browser rerun proves native restart continuity was already broken before the partial implementation. The corrected design therefore needs both:

1. external-runtime-only provider-binding staging/adoption; and
2. an explicit configured-member fresh-versus-restore materialization mode that selects native local-state restoration independently of provider binding.

## Persisted-State Conclusion

- Outcome: `Directly Usable — No Migration`.
- The V1 tree already contains the stable local AgentRun ID, runtime kind, workspace root path, and deterministic native memory location required for restoration.
- Existing native working-context snapshots and traces are directly usable by the normal native restore backend.
- No new persisted mode field is required: fresh versus restored is known at the `createTeamRun` / `restoreTeamRun` entrypoint and is process-local lifecycle provenance.
- A native history whose prior working-context snapshot has already been overwritten by a failed post-restart turn cannot be reconstructed by this fix.
- Legacy native `platformAgentRunId === local AgentRun ID` values are not provider identities and must not drive team restoration or new tree mutation; runtime kind and materialization provenance govern the native path.

## Retained File Index

`live-browser-reproduction-autobyteus/base/` contains the base run summary, browser screenshot, execution tree, raw traces, post-restart working-context snapshot, workspace registry, history index, and server log.

`live-browser-reproduction-autobyteus/personal/` contains the personal control summary, browser screenshot, legacy metadata, raw traces, post-restart working-context snapshot, workspace registry, history index, and server log.
