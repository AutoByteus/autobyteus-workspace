# Design Spec

## Basis

- SR-001. Requirements approved by the Solution Designer within the direction (requirements-doc.md, DEC-001…005).
- Authorities read: architecture-design, design-principles (7, 11, 13, 16, 17), `DESIGN.md` (rules 11, 12), design cases 1 and 21.
- **Data contract:** no stored or exchanged shape changes. The Team, run, Org and run-status stream contracts are unchanged; a page-side state is added in A.

## Task Size And Architectural Risk

- Size: `Large`. Five items across `autobyteus-web` (Team stream recovery, run open, status placeholder, Org refactor, localization) and `autobyteus-server-ts` (one handler); about 20 files.
- Risk: `High`.
  - A changes the Team stream's lifecycle: an automatic recovery that runs concurrently with the user's selection, sends and Stops, and replaces a live service and context.
  - B changes a concurrent commit rule.
- Escalation triggers:
  - the replacement cannot run without a selection intent;
  - a send waiting across the replacement cannot reach the new service without a new contract.

## Design

### A: the Team stream recovers by itself (REQ-001, REQ-002)

| D | Owner | Change |
| --- | --- | --- |
| D-A1 | New `services/runOpen/teamStreamAutoRecovery.ts` | One recovery per Team root. It starts when the Team's service enters `reopen_required` (the store's `onStreamRecoveryRequired`). Its `LiveStreamReconnectScheduler` (the same cadence and page-resume rules as the Org and every stream) attempts `reopenTeamRunAfterStreamLoss({ teamRunId, selectRun: false })`: success → `connected()` and end; failure → `connectionLost()`. `onPersistentFailure` (the fifth failure) marks the Team's recovery `exhausted`. It ends on success or on `disconnectTeamStream`. The store starts it without importing the coordinator statically (no store ↔ coordinator cycle; for example the store takes a recovery starter from a plugin or a lazy import) |
| D-A2 | `teamRunOpenCoordinator.reopenTeamRunAfterStreamLoss` | Single-flight per Team: a second call while one runs awaits it. A user's reselect then, when it succeeded, selects the recovered context (its intent rules as today); when it failed, it runs its own attempt |
| D-A3 | `agentTeamRunStore` | `streamRecoveryNoticesByRootTeamRunId` becomes the Team's recovery state: `recovering` or `exhausted`. `ensureTeamStreamConnected` no longer throws `TEAM_STREAM_REOPEN_REQUIRED`: during recovery it waits, like a connecting stream, for the Team's **current** service (`teamStreamingServices.get`, which is the replacement after commit) to be ready, within the same 10 s, then `MessageNotDeliveredError('not_sent')` (540) |
| D-A4 | Desktop `TeamWorkspaceView.vue`, phone `components/mobile/runScreen/MobileRunTargetView.vue` | Show `WorkspaceRecoveryNotice` only for `exhausted`, with a new key `workspace.team.recovery.exhausted` (en, zh-CN), wording parallel to the Org's. The English literal goes |
| D-A5 | `tests/e2e/fixtures/stop-generation-wire.mjs` | `schedule()` keeps one FIFO queue per link and direction: each frame is due at `max(arrival + latency, previous due)`, and one timer drains the queue in order. Never a per-frame `setTimeout` computed from a second clock read |

- Unchanged:
  - the gap check;
  - `enterReopenRequired`;
  - the verified replacement (`replaceFailedTeamStream` with the hydrated candidate and expected base);
  - Stop settlement.
- While recovering, members keep their last status: nothing writes them until the replacement's snapshot.

### B: opening a run (REQ-004, REQ-005)

| D | Owner | Change |
| --- | --- | --- |
| D-B1 | `agentRunOpenCoordinator.ts` | The status at open: for an active run, `normalizeAgentRuntimeStatus(useRunStatusStore().statusOf(runId))` when known, else `Initializing`; for a stopped run, `Offline` (as today). The stream's first `AGENT_STATUS` follows as today |
| D-B2 | `agentRunOpenCoordinator.ts` | When the context changed between `expectedContext` and the commit: read the candidate once more with the new expected context. If it changed again, do not replace it: patch nothing, select the current context (when `selectRun`), connect as today, and return committed. The `Agent activity … changed` conflict follows the same rule. "changed before projection commit" is no longer thrown |

### C: no Initializing placeholder for existing contexts (REQ-003)

| D | Owner | Change |
| --- | --- | --- |
| D-C1 | `runHistoryLoadActions.ts` | For an existing context (standalone `:330`, Team `:370-388`): keep `isLocked` and the reconnect. Drop `applyActiveRuntimePlaceholder`; the stream's snapshot sets the status |
| D-C2 | `agentRuntimeStatusState.ts` | `applyActiveRuntimePlaceholder` loses its last callers and is removed |
| D-C3 | `services/runRecovery/activeRunRecoveryCoordinator.ts` and its spec | Removed: no production caller (Principle 7) |

### D and E (REQ-006, REQ-007)

| D | Owner | Change |
| --- | --- | --- |
| D-D1 | `MessagePrimaryActionButton.vue` | Labels from localization keys (en, zh-CN). The `title` override stays |
| D-D2 | `team-tool-approval-command-handler.ts` | `activeRun` non-null and required; `teamRunId` only for log text, or dropped from logs; the null branch removed; the caller and spec adjusted |
| D-D3 | `CollaborationMessagesOrgRoot.integration.spec.ts:177` | An explicit 20 s timeout on that test |
| D-E1 | `agentOrgContextsStore.ts`, `agentOrgStreamingService.ts` | Each split by an owned concern into a sibling module, under 500 lines, no behavior change. Candidates: the store's recovery and readiness helpers; the service's frame processing (`processFrame` and its command answers). The implementation chooses the seam that one concern owns, and records it |
| D-E2 | `agentOrgConnectionLostError.ts` | Renamed `agentOrgCommandFailures.ts`; its 4 importers updated |

## Change Scope

- In scope:
  - the files above, and the web and server specs that cover them;
  - the stop-generation wire;
  - the two probes' cases for A and C;
  - localization.
- Left alone:
  - the server's stream order;
  - the Org stream's recovery;
  - the run-status feed;
  - the send and Stop answers;
  - stores outside these paths.
- Follow-ups: none yet.

## Removal

- `applyActiveRuntimePlaceholder`.
- `activeRunRecoveryCoordinator` and its spec.
- The `TEAM_STREAM_REOPEN_REQUIRED` throw on send.
- The English recovery literal.
- The null-run branch.
- The old file name.
- The wire's per-frame timers.
- The temporary investigation edits in the wire: `KEEP`, `through` and `from-node`. These are the Solution Designer's and are reverted before handoff.

## Guidance

- **AC-001:** create the real gap deterministically, for example a probe wire option that withholds one Team frame, or a node test double. Test on desktop and phone.
- **AC-004:** run the 540 probe's SDD-12 and SDD-09 on the old code (expect the failure) and on the new code.
- **Reproductions:** keep the reproduction of each item failing on the old code (Task "Done when").
