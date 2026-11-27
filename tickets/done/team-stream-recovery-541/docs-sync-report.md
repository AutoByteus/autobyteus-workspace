# Docs Sync Report — autobyteus-541 (team-stream-recovery-541)

## Scope

- Ticket: `team-stream-recovery-541` (Project Task `autobyteus-541`, the founder's "small follow-ups should be merged into one"): five items in the web app. A, a Team stream that needs recovery recovers by itself on desktop and phone (REQ-001, REQ-002); B, opening a run shows its real status and survives a concurrent build of the run's context (REQ-004, REQ-005); C, a history refresh no longer resets an existing run's or Team member's status to Initializing (REQ-003); D and E, the composer's "Send message" and "Stop generation" are localized, a dead server branch is removed, the Org store and streaming service are split under 500 lines, and a file is renamed (REQ-006, REQ-007); and the stop-generation probe's wire keeps frame order (REQ-008).
- Trigger: API-REV-002 `Pass` (round 2, 94 % final confidence, no category below 90 %), test-code review CRR-004 `Pass`; source review CRR-001 `Pass`, CRR-002 `Fail` (CR-001: a member navigation during a recovery was undone at the commit, API/E2E's F-1), CRR-003 `Pass`. Architecture review ARCH-REV-001 (design revised in SR-002). `task_size` `Large`, `architectural_risk` `High`, route `Code Review` (reviewed).
- Bootstrap base reference: `origin/personal` `80420a8bf6`.
- Integrated base reference used for docs sync: `origin/personal` `ff912496ff` (the v1.5.15-beta.3 release record), merged as `122cfdbcd3`.
- Post-integration verification reference: `evidence/delivery/` on the merged tree; the release/deployment report lists it.

## Why Docs Were Updated

- Summary: the ticket changed no product doc and added two design cases. `autobyteus-web/docs/agent_execution_architecture.md`, the web's streaming and run lifecycle reference, still said the opposite of what the code does:
  - "Team-stream recovery is an explicit history-selection workflow": it is now automatic, with the user's reselect joining it;
  - the reconnection section said a Team's `reopen_required` "stays terminal, with no retries": a recovery owner now retries, on the same schedule;
  - nothing said that a send during a recovery waits for the replacement and follows its member, that the page's own state is carried across the commit, or what the notice is and when it shows;
  - nothing said that a history refresh keeps the last status of an existing context (the `Initializing` placeholder it wrote is gone), or what status an opened live run shows and what an open does when another part of the page built the same context.
- Why this should live in long-lived project docs: a later change to the recovery, the Team store's commit or a refresh must keep the carried page state (a new page-local field on a member context must be added to the one list), the one direction (the store publishes, the owner drives, the coordinator commits through the store), the single-flight rule that makes a reselect join the recovery, and the refresh's no-placeholder rule, or a draft is lost, a second recovery starts, or a Send stays disabled for nothing again.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; Principle 7 (no dead code), Principle 11 (one owner per fact), Principle 16 (one composition root) | No change | The ticket applies existing rules: it removes `applyActiveRuntimePlaceholder`, `activeRunRecoveryCoordinator`, the null-run branch and the old file name, and records the two design lessons as cases |
| `TESTING.md` | Test layers; Fresh-start build; the probes | No change | It names neither the send-delivery nor the stop-generation probe; no build input changed |
| `RELEASE.md` | Finalization and release rules | No change | Read from the merged tree (`ff912496ff`); unchanged by the ticket |
| `docs/design-cases.md` | Design cases | Updated in the ticket (kept) | Cases 32 (a replacement that drops the page's own state) and 33 (a store that starts the work it publishes); checked against `replaceFailedTeamStream`, `carryAgentContextPageState` and `teamStreamRecoveryStore` |
| `autobyteus-web/docs/agent_execution_architecture.md` | The Team store, the reconnection owners, the status and refresh rules, the open path | Updated by delivery | Four edits (below) |
| `autobyteus-web/docs/agent_orgs.md` | The Org's own automatic recovery | No change | It describes the Org stream, which the ticket left alone (only the Org files were split by concern; no doc names the moved modules or the old file name) |
| `autobyteus-web/docs/agent_teams.md`, `agent_integration_minimal_bridge.md` | Member status and "refresh/reopen/recovery should preserve a selected live status" | No change | Both stay true: a refresh now keeps every existing context's last status |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `modules/agent_team_execution.md` | The Team stream's server contract | No change | The server change is behavior-neutral (REQ-007): the Team tool-approval handler loses an unreachable null-run branch and reworded log texts |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` (the `agentTeamRunStore.ts` section) | Behavior | The paragraph "Team-stream recovery is an explicit history-selection workflow" is replaced by four bullets. **The automatic recovery:** `onStreamRecoveryRequired` (a required option) publishes `required` to `stores/teamStreamRecoveryStore.ts` (`required`, `recovering`, `exhausted`; publishing with no owner throws); the one owner `services/runOpen/teamStreamAutoRecovery.ts`, started by `plugins/teamStreamRecovery.client.ts`, runs one recovery per Team on the shared reconnect schedule, each attempt being `reopenTeamRunAfterStreamLoss` with `selectRun: false`; the fifth consecutive failure sets `exhausted` and the attempts go on; it ends without counting a failure when the context is gone or the service no longer needs one; a stopped Team's open view is recovered too. **The verified replacement:** the two checkpoints around the focused member's hydration; it refuses to commit while the Team has open work (`TEAM_STREAM_RECOVERY_WAIT`) or when the checkpoint changed, so a gap in the middle of a long turn recovers only after the turn ends and the notice can show first; a user's own reselect that meets either still shows the localized wait or retry message; single-flight per Team (a reselect joins, then focuses its member); a member the user moved to during the read stays focused (`keepFocusAcrossRecovery`). **The page's own state:** `carryAgentContextPageState` at the one commit (the draft, a returned draft and its notice, `collaboratorAddFailure`, `submissionPending`; not `interruptPending`). **What the user sees meanwhile:** members keep their last status, Stop answers `not_sent`, a send waits up to 10 s in `ensureTeamStreamConnected` for the Team's current service and follows its member (`retargetLocalUserSubmissionContext`), the localized notice `workspace.team.recovery.exhausted` only at `exhausted` | REQ-001, REQ-002; DEC-001 |
| `autobyteus-web/docs/agent_execution_architecture.md` ("Live Run Stream Reconnection") | Behavior | The Team rule: `reopen_required` stays terminal for the service itself with no transport retries; a separate recovery owner, one scheduler per Team on this schedule, replaces the failed service | The old text said "no retries" |
| `autobyteus-web/docs/agent_execution_architecture.md` ("Runtime Status And Interrupt Authority") | Behavior | A history refresh of an existing run or Team changes no status (the context keeps the last status, the stream's snapshot sets the truth; no `Initializing` placeholder, which had overwritten the last status and disabled Send for nothing, for a standalone run and a Team member alike; a recovering stream is its owner's); opening a live run shows the run's own status as the page knows it (`runStatusStore.statusOf`), else `Initializing` until the stream's first status, never `Running`; a stopped run opens `Offline`; an open that meets a context built meanwhile reads once more, and if that changed again keeps and selects the current context; "changed before projection commit" is no longer thrown | REQ-003, REQ-004, REQ-005; DEC-002 to DEC-004 |

All statements were checked against the code at the merged state: `teamStreamRecoveryStore.ts`, `teamStreamAutoRecovery.ts`, `plugins/teamStreamRecovery.client.ts`, `teamRunOpenCoordinator.ts` (`recoverTeamStream`, `runTeamStreamRecovery`, `keepFocusAcrossRecovery`, `reopenTeamRunAfterStreamLoss`), `agentTeamRunStore.ts` (`ensureTeamStreamConnected`, `replaceFailedTeamStream`, `disconnectTeamStream`), `carryAgentContextPageState` in `types/agent/AgentContext.ts`, `teamRunContextHydrationService.ts` (the `TEAM_STREAM_RECOVERY_WAIT` and `_CHECKPOINT_CHANGED` errors), the callers of the localized wait and retry messages (`RunSectionPanel.vue`, `RunListPanel.vue`, `useMobileRunOpening.ts`), `runHistoryLoadActions.ts` (the removed placeholder), the diff of `agentRunOpenCoordinator.ts` against the base (the old `Running` status, the one-more read), and the English strings in `localization/messages/en/`. Delivery's own run of the probes showed the same figures the doc describes (recovery after 47 ms, the notice at the fifth failure after about 15 s, recovery at about 31 s).

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One direction for a Team's recovery | The store publishes the trigger, one owner created at the composition root drives the coordinator, the coordinator commits through the store; a missing owner fails loudly | `design-spec.md` D-A1, D-A2; ARCH-REV-001 AR-002 | `agent_execution_architecture.md`, `docs/design-cases.md` (case 33) |
| A replacement carries the page's own state | The one commit point moves the page-local fields of each member to the replacing context; a new field must join the list | D-A6, AR-001 | `agent_execution_architecture.md`, `docs/design-cases.md` (case 32) |
| A stable checkpoint is required | A recovery cannot commit while the Team has open work, so a long turn delays it | `implementation-handoff.md` Observations | `agent_execution_architecture.md` |
| A refresh writes no status | An existing context keeps its last status until its stream's snapshot | DEC-002 | `agent_execution_architecture.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "Team-stream recovery is an explicit history-selection workflow" | the automatic recovery, with the reselect joining it | `agent_execution_architecture.md` |
| `applyActiveRuntimePlaceholder` (a history refresh writing `Initializing`); the open's `Running` placeholder | the context's last status; the run's own status at open | `agent_execution_architecture.md` |
| `activeRunRecoveryCoordinator` (no production caller) | removed | (none: it was never documented) |
| The `TEAM_STREAM_REOPEN_REQUIRED` throw on a Team send; the English recovery literal | the send waits for the replacement; the localized notice at `exhausted` | `agent_execution_architecture.md` |
| `agentOrgConnectionLostError.ts` | `agentOrgCommandFailures.ts` | (no doc named the old file) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: docs changed (above).

## Delivery Continuation

- Result: `Pass` for the docs.
- Next delivery action: the verification record, handoff summary, release notes, archive, finalization.
- Notes: no discrepancy outside this ticket was found in the docs. The ticket's follow-ups FU-001 (the base's fixed-px font audit failure, `NodeRow.vue:39`, from autobyteus-581) and FU-002 (a Project Task link still loading its member when a recovery commits is rejected) are in `follow-ups.md`.
