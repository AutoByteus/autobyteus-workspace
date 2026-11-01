# Implementation Handoff — `large-runs-load-less` (autobyteus-358)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large/High). ARCH-REV-002 Pass on SR-002; after IR-001's Design Impact (QR-004), ARCH-REV-003 Pass on SR-003 (DS-007, DEC-004); after CRR-003's Design Impact (CR-002), ARCH-REV-005 Pass on SR-004/SR-005 (reload only when a message could have been missed; `live_sequence_id`); after CRR-004's Design Impact (CR-003), ARCH-REV-006 Pass on SR-006 (the Team open read names the running Team's live sequence). Route now: code review (targeted).
- Requirements doc: `tickets/in-progress/large-runs-load-less/requirements-doc.md` (SR-001)
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md`
- Design spec: `.../design-spec.md` (SR-006; DS-002 reload rule revised by SR-004, SR-005 and SR-006)
- Supplemental task artifacts: `evidence/M-*`, `evidence/probes/*.mjs`
- Design review report: `.../design-review-report.md` (ARCH-REV-006 Pass)
- Architecture review revision record: `.../architecture-review-revision-record.md`
- Triggering rework report: CRR-004 (`code-review-report.md`, CR-003) → `solution-handoff.md` "SR-006 Revision", `design-review-report.md` ARCH-REV-006

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002 adds DS-007 to IR-001; IR-003 is CR-001's Local Fix; IR-004 implements SR-004/SR-005 for CR-002; IR-005 implements SR-006 for CR-003)
- Implementation revision record: `.../implementation-revision-record.md`
- Current implementation revision ID: `IR-005`
- Related solution revision IDs: `SR-002` … `SR-006`; architecture-review: `ARCH-REV-002`, `ARCH-REV-003`, `ARCH-REV-005`, `ARCH-REV-006`; code-review: `CRR-001` … `CRR-004`; API/E2E: API-08 (round 1); delivery: `N/A`
- Triggering finding IDs: CR-003 (CRR-004); before it CR-002 (CRR-003; API-08) and AR-005

All steps of the Change / Refactor Sequence are implemented and checked, and every QR is met. Commits on `codex/large-runs-load-less` over `origin/personal` @ `efd28d5c4a`:

| Commit | Content |
| --- | --- |
| `22adbff621` | Ticket docs as received |
| `f48bdfc0ab` | Server: records owners, `collaborationParticipantMessages`, tree-only inspections and snapshots, contracts without message fields (dist rebuilt), structural readiness and per-package `admitCurrent` |
| `0d6a53914d` | Web: `CollaborationParticipantMessages`, `MemberLoader`, focused-only staging for Team/Org, Settings via `viewFor`, per-frame feed check, removal of the whole-log Team query |
| `cc7e204798` | Web tests for AC-004 and the per-frame check; Settings store kept at its size |
| `1cf03b9a0f` | Probes read messages through the participant query |
| `d13424916b` | `generated/graphql.ts` regenerated against this server |
| `5c727d1b20` | Docs; Org E2E helper binding |
| `e66b453d5b` | QR-002: a stopped hub's settled stored view is reused on selection |
| `3a1b4efb9a` | IR-001 records and evidence |
| `9800ecb9b7` | SR-003 and ARCH-REV-003 docs as received |
| `b58a3106c3` | DS-007: `long-unbroken-text` shaping for blocks with a run of at least 1,000 non-whitespace characters (QR-004) |
| `438ea7fb65` | CR-001: the mobile message screens show loading and unavailable states (AC-006) |
| `c8cb0d28f6` | SR-004, SR-005 and ARCH-REV-004/005 docs as received |
| `935c5c9fa9` | SR-005 server: `RootEventPublisher.liveSequenceId`; `live_sequence_id` in the Agent-root, Org and Team views and snapshots (stored: `null`); contracts and dist; protocol doc |
| `da91ae689a` | SR-004/SR-005 web: the participant owner keeps C with its live sequence; `reloadRoot` keeps the lists when nothing could have been missed; hub, Org and Team streams advance C |
| `585ae49761` | SR-006 and ARCH-REV-006 docs as received |
| `99cd853f79` | SR-006: `getTeamRunResumeConfig` gives `liveSequenceId` and `baseChangeSequence` (one read of the publisher); the Team commit rebuilds with them; `generated/graphql.ts` regenerated |

## Routing Classification (Mandatory)

- Task size: `Large`; Architecture risk: `High` (design spec "Task Size And Architectural Risk")
- Classification confirmed or changed: `Confirmed`
- Evidence: the change touches three view contracts, a new GraphQL query, the readiness admission boundary, and the web contexts of all three root kinds (106 files).
- Selected route: `Code Review`.
- Lightweight self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. IR-001's QR-004 escalation is resolved by DS-007 (SR-003). IR-004 (SR-004/SR-005) confirms `Large`/`High`: a contract field in three view contracts and the reload rule in the web contexts of all three root kinds. No new design impact.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Views and snapshots carry no message log; the Team tab loads its participant's messages when shown; a rebuild reloads them only when a message could have been missed (SR-004, SR-005) | Server: `services/agent-streaming/*-view-projector.ts`, snapshot types (`agent-org-run.ts`, `standalone-agent-run-root.ts`, `root-team-run.ts`), `api/graphql/types/collaboration-participant-messages.ts`. Web: `services/collaborationMessages/*`, contexts forward `communication` events, `CollaborationMessagesSection.vue` loads on show | Hub view 2,790,524 → 176,226 bytes (QR-001 met). Order newest first then ID; live merge by ID (owner spec). IR-004: `RootEventPublisher.liveSequenceId` → `live_sequence_id` in views and snapshots; `CollaborationParticipantMessages.advance` / `reloadRoot(kind, id, { liveSequenceId, baseChangeSequence })`; called from `agentRunCollaborationStore.publish`, `agentOrgContextsStore` commit, the Team snapshot effect, and `markCommittedTeamRunHydrationAuthority` with the Team open read's live sequence (SR-006: `getTeamRunResumeConfig` → `RootTeamRun.getLivePosition()` → `RootEventPublisher.getLivePosition()`). API-08 counts by spec: running-hub selection 1; new child with no message 0; with a message 1 |
| BEH-002 | Team/Org open stages the focused member only; others on open; Team-tab messages on show | `services/runHydration/memberLoader.ts`; `teamRunContextHydrationService.ts` (open and recovery focused-only); `agentOrgContextHydration.ts` (`focus`); `agentOrgContextsStore.ts`; `teamMemberProjectionHydrationService.ts` and `agentRunCollaborationChildHydration.ts` reduced to load-target adapters | One member request at open (specs: team hydration, org hydration, org Apollo). Browser measurement on a large seeded Team/Org not run (M-151) |
| BEH-003 | One view read per hub selection; Settings shares it | `agentRunCollaborationStore.viewFor`, `syncHost` reuses a settled stored view; `existingRunConfigStore.readAgentCanonical` | Hub click: 0 view requests (the history row read it once), 1 participant request (QR-002 met) |
| BEH-004 | Admission by structure; messages validated where read; damaged log reported then | `run-history/services/root-run-package-current-validator.ts` (`scanOne`, tree-only), `root-run-package-readiness-index.ts` (`admitCurrent`); records owners validate tree + log | Scan 85 ms at 100.4 MB vs 89 ms base (QR-003 met). Damaged log: query fails with reason, view opens (org unit, team API integration) |
| BEH-005 | Unbroken-token conversation opens in proportion to its size | DS-006: `composables/useOncePerFrame.ts`, `AgentConversationFeed.vue` `onUpdated`. DS-007: `utils/text/longUnbrokenRun.ts`, the `long-unbroken-text` class in `app.vue`, applied in `UserMessage.vue`, the `MarkdownRenderer.vue` html segment, `InterAgentMessageSegment.vue` and the Team-tab row in `CollaborationMessagesPanel.vue` | QR-004 met: 199 ms (base 87.0 s). Prose of the same size 294 ms (base 262 ms). Wrapping, copy and search unchanged |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server: `api/graphql/types/collaboration-participant-messages.ts` (new); `agent-org-run-manager.ts`, `standalone-agent-run-root-manager.ts`, `team-communication-projection-service.ts` (records owners); `agent-org-state-package-validator.ts`, `team-run-state-package-validator.ts` (tree-only validators); readiness validator and index; three projectors; `api/rest/agent-collaboration-references.ts`. Removed: `api/graphql/types/team-communication.ts`, dead `normalizeTeamCommunicationProjection` / `cloneTeamCommunicationProjection` / `TeamCommunicationProjection`.
- Contracts: `autobyteus-collaboration-stream-contracts/src/collaboration-participant-messages-dtos.ts` (new); message fields removed from the agent and org views, their correlation checks, and the Team snapshot payload; `dist/` rebuilt.
- Web: `services/collaborationMessages/{collaborationParticipantMessages,participantMessageRows,participantMessagesQuery}.ts`, `services/runHydration/memberLoader.ts`, `services/teamExecution/teamCollaborationMessagesView.ts`, `composables/useOncePerFrame.ts` (new); hub/Team/Org contexts and stores; Team tab panel loading and error states (en + zh-CN strings); mobile message screens. Removed: `teamCommunicationHydrationService.ts`, `teamCommunicationGraphqlDtoProjection.ts`, the whole-log query, `TeamExecutionViewSnapshotSeed`, `CollaborationMessagesPerspective`, Org `loadedRemoteAgents`, hub `hydratedChildren`.
- Tests: new server unit test for the query; contract tests; new web specs for the owner, the per-frame check and AC-004; `test-support/participantMessagesStub.ts`; existing specs updated to the new loading moments.

## Important Assumptions

- **D-IMP-1, the public scope for every root kind.** The query keeps both endpoints agents of the root for hub, Team and Org alike (`isPublicMessage`). The design said "for Agent roots", but all three view projectors applied it at base (`agent-collaboration-view-projector.ts:40`, `agent-org-execution-view-projector.ts:56`, `team-execution-view-projector.ts:67`), and the live view streams never publish other messages. So this keeps the Team tab as it was, and keeps the buffer-and-merge rule consistent.
- **D-IMP-2, the seam.** `listMessages()` keeps returning rows. The seam gained `messagesStatus()` and `loadMessages()`, and the Section calls `loadMessages()` when it shows a root, member or participant.
- **D-IMP-3, one shape for messages.** The participant result and the owner's lists use the stored message shape for every root kind; Team live events are converted. Reference IDs are derived on the client as the server derives them (sha256 of message ID and path).
- **D-IMP-4, member loads are shared.** A member load in flight is shared, and it is not tied to one selection. A superseded selection does not stop the member's own load from committing its stored state. Live tool decisions still win at commit.
- **D-IMP-5, Org focus at open.** Org staging takes the selection the context will show (`focus`). With no selection nothing is staged. A member loads when it is selected.
- **D-IMP-6, Settings reuses the hub's view.** `syncHost` reuses a published, historical (stopped) hub view instead of reading it again; a hub that was live is read again. That is what made QR-002 pass.
- **D-IMP-7, the Team snapshot's `live_sequence_id` is never null.** The design gives `string | null` for all three contracts, with `null` for stored views. A Team snapshot only ever comes from a live snapshot connection (`agent-team-stream-handler.ts`), and the Team has no stored view contract, so its field is a required string. The Agent-root and Org views keep `string | null`: their GraphQL inspections of a stopped root carry `null`.
- **D-IMP-8 (revised in IR-005), every Team commit rebuilds with its read's live sequence.** IR-004 gave `markCommittedTeamRunHydrationAuthority` a `'stored_rebuild' | 'rebuilt_by_stream_snapshot'` flag. With SR-006 the open read names the running Team's live sequence and base, so the flag is gone: every commit (open, restore, launch, recovery) calls `reloadRoot` with the candidate's `rebuild`. A stream recovery's read is taken between two equal checkpoints, so its base equals its candidate snapshot's, and the commit keeps what that snapshot rebuilt (same live sequence, B ≤ C). A stopped Team's read names none, so its commit reloads.
- **D-IMP-10, the Team open read's live sequence comes from the managed root.** `TeamRunHistoryService.getTeamRunResumeConfig` reads `getManagedTeamRun(id)?.getLivePosition()`: the same root whose presence makes `isActive` true and whose publisher the Team stream binds to. It reads `liveSequenceId` and `changeSequence` in one call (`RootEventPublisher.getLivePosition()`). An application-owned Team that the Studio service reports as active without a managed root names no live sequence, so its lists reload.
- **D-IMP-9, where C advances.** The hub and Org streaming services advance C after `applyEvent`: to the event's last sequence when it was applied, and to its sequence when it was a single event that returned `checkpoint_required` (a single event has no `change_sequence_through`; the contract allows it only on batches). The Team stream advances to the view's change sequence after every applied message. Each call names the live sequence of the context that applied it, so an event of another publisher never moves C.

## Known Risks

- **QR-004 (resolved in IR-002).** In IR-001 the per-frame check alone left the copy at 85.9 s. The profile showed 23 forced layouts of 3.9–7.1 s each. The cause SR-003 found (shaping of 60 KB single-word runs with kerning and ligatures) is addressed by DS-007, and the copy now opens in 199 ms. The class must live in `app.vue`'s global style: `assets/css/main.css` is not loaded (FU-002), and with the class there the copy still took 86.8 s.
- Not measured: the tool-call and reasoning renderers with long tokens (the architecture reviewer's residual recommendation). DS-007 covers the four renderers the design names.
- Member loads not tied to one selection (D-IMP-4): a member opened and then left can finish loading into its own context. It shows nothing new to the user.
- (Resolved in IR-005, CR-003.) Opening a running Team fetched a list loaded between the open and the stream snapshot twice; the open read now names the live sequence, so the snapshot keeps it.
- A Team root whose stream sees a new remote child recovers through a new snapshot without advancing C on that event, so that recovery reloads the lists (conservative; rare).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Performance, with a behaviour change of loading moments only.
- Root cause classification: Boundary or ownership issue, plus duplicated policy. The refactor decision was "Refactor Needed Now".
- Implementation matched the reviewed assessment: `Yes`. IR-001 found that DS-006 alone does not reach QR-004 and routed a Design Impact; SR-003 added DS-007, which does.
- Routed as `Design Impact`: `Yes` (IR-001); resolved by SR-003.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the removed contract fields and the old query are gone; web and server ship together).
- Legacy old behaviour kept in scope: `No`.
- Dead code in the touched files and modules removed: `Yes` (listed above).
- Dead code found elsewhere, added to `follow-ups.md`: FU-002, the unused `assets/css/main.css`. FU-001 is pre-existing failing tests (below). FU-005 (IR-004): the interrupt-result probe's Team snapshot lacks `remote_task_executions` on base.
- Shared structures stay tight: `Yes`.
- Size guard: `Yes`. `AgentConversationFeed.vue` is at 500 non-blank lines (base 498; the per-frame logic lives in `useOncePerFrame.ts`). `existingRunConfigStore.ts` stays at its base 503. IR-004: `teamExecutionViewState.ts` 499 (base 497), `agentOrgStreamingService.ts` 489. IR-005: `root-team-run.ts` 499 (base 499). No other changed source file is over 500.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`. No stored format changed; only reads, views and queries.

## Environment Or Dependency Notes

- `generated/graphql.ts` was regenerated against this branch's server. It also picks up `projectRunHistory` (autobyteus-347), which the previous generation did not include.
- FU-001 (`follow-ups.md`): 6 server integration tests fail on base `efd28d5c4a` as well. The cause is in the tests (they predate autobyteus-347 and the model-settings change), not in this ticket.
- The test-owned seed `/tmp/ab358-seed` was removed after the measurements, as the design asks.

## Checks Run

Evidence: `evidence/IMP-local-checks.log` (header, commit and counts per check).

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Criteria | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C <contract pkg> test` | `f48bdfc0ab` tree | macOS, node 22 | both contract packages | REQ-002 | Pass | IMP-local-checks.log | `# pass 38` / `# pass 21` |
| IMP-02 | server `typecheck` | `f48bdfc0ab` | isolated HOME | server src | all | Pass | same | exit 0 |
| IMP-03 | server `test:unit` | `f48bdfc0ab` tree | isolated HOME | server | all | Pass after fixes (2 failures explained) | same | `7666 passed` |
| IMP-04 | server `test:integration` + architecture | `f48bdfc0ab` | isolated HOME | server | AC-006 | Pass except FU-001 (base failures) | same | `480 passed`, 55 architecture |
| IMP-05 | server E2E changed by this ticket (scripted AGY) | dist at `1cf03b9a0f` | isolated HOME | views, query, Team tab reads | AC-002, AC-005 | Pass | same | 2 + 1 + 3 + 1 + 3 passed |
| IMP-06 | web Nuxt suite | `0d6a53914d` tree, plus reruns | isolated HOME | web | AC-002…AC-004 | Pass | same | `4920 passed` |
| IMP-07 | web Electron | `0d6a53914d` | isolated HOME | electron | — | Pass | same | `291 passed` |
| IMP-08 | web `typecheck` | `0d6a53914d` tree | isolated HOME | web | — | Pass (baseline 297) | same | `PASS` |
| IMP-09 | web guards, each alone | `0d6a53914d` tree | — | web | — | Pass | same | three `Passed` |
| IMP-10 | probes on the seed | `e66b453d5b` | Chrome headless, load in evidence | hub view, click, scan, L-010 (DS-006 only) | QR-001…QR-003 | QR-001/002/003 met (L-010 at 85.9 s led to SR-003) | IMP-M156-startup-scan-after.log, IMP-hub-after-S/, IMP-L010-unbroken-after/, IMP-L010-unbroken-after.cpuprofile | `176226`, click ops, `85` vs `89` ms |
| IMP-11 | L-010 unbroken and words | `b58a3106c3` | Chrome headless, load ~9 | the four renderers, the feed | QR-004, AC-007 | Pass: 199 ms unbroken, 294 ms words | IMP-L010-ds007.log, IMP-L010-unbroken-ds007/, IMP-L010-words-ds007/ | `clickToStoreLoadedMs=198.8` |
| IMP-12 | suites from a clean clone (`git clone` of the branch, `pnpm install --frozen-lockfile`, prebuild, build, nuxt prepare, then every suite) | `b58a3106c3` | isolated HOME | everything | AC-008 | see IMP-clean-clone.log | IMP-clean-clone.log | per-suite counts |
| IMP-13 | `vitest run components/mobile`, web typecheck, guards | `438ea7fb65` | isolated HOME | mobile message screens | AC-006 (CR-001) | Pass | IMP-CR001-mobile-states.log | `Tests  77 passed` |
| IMP-14 | contract packages `pnpm test` (dist rebuilt) | `935c5c9fa9` | isolated HOME | `live_sequence_id` in the three view contracts | SR-005 | Pass | IMP-IR004-checks.log | `# pass 39` / `# pass 21` |
| IMP-15 | server `typecheck` | `935c5c9fa9` | isolated HOME | server src | SR-005 | Pass | same | exit 0 |
| IMP-16 | server `test:unit` (full) | `da91ae689a` | isolated HOME | server | SR-005 | Pass | same | `7670 passed` |
| IMP-17 | server `test:integration` (full) | `da91ae689a` | isolated HOME | server | SR-005 | Pass except FU-001 (the same 6 base failures) | same | `480 passed` |
| IMP-18 | web `typecheck` | `da91ae689a` tree | isolated HOME | web | — | Pass (baseline 297) | same | `PASS` |
| IMP-19 | web Nuxt suite (full) | `da91ae689a` tree | isolated HOME | web | AC-002, SR-004, SR-005 | Pass | same | `4942 passed` |
| IMP-20 | web guards, each alone | `da91ae689a` tree | — | web | — | Pass | same | three passes |
| IMP-21 | targeted specs (owner, hub reloads, Team and Org streams, Team commit, publisher) | `da91ae689a` tree | isolated HOME | the reload rule, API-08 counts | CR-002, AR-005 | Pass | same | `3 passed` (hub reloads), `10 passed` (owner) |
| IMP-22 | mutation checks on the rule (temporary edits, restored) | `da91ae689a` tree | isolated HOME | `reloadRoot`, `advance`, the identity check | CR-002, AR-005 | Each mutation fails the tests | same | `5 failed`, `2 failed`, `2 failed` |
| IMP-23 | server `typecheck` | `99cd853f79` | isolated HOME | server src | SR-006 | Pass | IMP-IR005-checks.log | `tsc exit=0` |
| IMP-24 | server `test:unit` (full) | `99cd853f79` | isolated HOME | server | SR-006 | Pass | same | `7671 passed` |
| IMP-25 | server `test:integration` (full) | `99cd853f79` | isolated HOME | server | SR-006 | Pass except FU-001 (same 6) | same | `480 passed` |
| IMP-26 | web `typecheck` | `99cd853f79` | isolated HOME | web | — | Pass (baseline 297) | same | `PASS` |
| IMP-27 | web Nuxt suite (full) | `99cd853f79` | isolated HOME | web | AC-002, SR-006 | Pass | same | `4943 passed` |
| IMP-28 | web guards, each alone | `99cd853f79` | — | web | — | Pass | same | exit 0 ×3 |
| IMP-29 | targeted Team open specs (running keeps, stopped reloads) and server resume-config tests | `99cd853f79` | isolated HOME | the Team open read and commit | CR-003 | Pass | same | see log |
| IMP-30 | codegen against this branch's built server (temporary data folder, stopped and removed) | `99cd853f79` | 127.0.0.1:18358 | `generated/graphql.ts` | — | Two fields added only | same | `liveSequenceId`, `baseChangeSequence` |

- Not run, and why: the M-151 browser measurement on a large seeded Team/Org (request counts are covered by specs; left to API/E2E); the gated live suites (no provider proof needed). IR-004: the Electron suite (no Electron file changed); the API-08 browser probe on a seeded live hub (the counts are proven by `agentRunCollaborationParticipantReloads.spec.ts`; the recheck belongs to API/E2E).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces: the Team tab (loading and error states), the mobile message screens, member open, and the conversation feed.
- Surface used: the repository's browser probe (`delegated-copies-large-hub-probe.mjs`) against a probe-owned real stack and the test-owned seed. S-ROWS passed: every Team and member row with its status and Task summary. S-001 passed: hub and copy open.
- Not inspected by hand: the new loading and error states of the Team tab (covered by component specs only), and the mobile screens in a browser. IR-004 changes no rendered surface: only when the Team tab's lists are fetched again.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002 live: send a message while a participant's Team tab is loading, and across a reconnect.
- AC-003: open a large Team and a large Org, count member requests, then open another member.
- AC-006: open a run whose stored log is damaged. Its Team tab shows the reason; resume is refused.
- Team counts (SR-006): opening a running Team with its Team tab shown gives 1 participant request (the snapshot keeps it); a stopped Team gives 1.
- API-08 recheck (SR-004/SR-005): a running-hub selection gives 1 participant request; a new child or Save with no message in the reconnect window gives 0 more; with a message, 1, and it is shown. Also stop → resume of a hub while it is not selected, with a message before the attach: the list reloads and shows it. A server restart while a hub's Team tab is open reloads it too.

## API / E2E / Executable Coverage Investigation And Execution Still Required

All of the above, after the code review.
