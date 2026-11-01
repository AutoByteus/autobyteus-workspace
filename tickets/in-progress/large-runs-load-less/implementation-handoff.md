# Implementation Handoff — `large-runs-load-less` (autobyteus-358)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large/High), ARCH-REV-002 Pass on SR-002. This round ends in a **Design Impact** (QR-004 missed after DEC-001 a, the design's named escalation trigger), routed to the Solution Designer.
- Requirements doc: `tickets/in-progress/large-runs-load-less/requirements-doc.md` (SR-001)
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md`
- Design spec: `.../design-spec.md` (SR-002)
- Supplemental task artifacts: `evidence/M-*`, `evidence/probes/*.mjs`
- Design review report: `.../design-review-report.md` (ARCH-REV-002 Pass)
- Architecture review revision record: `.../architecture-review-revision-record.md`
- Triggering rework report: N/A (initial round)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `.../implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`; architecture-review: `ARCH-REV-002`; code-review, API/E2E, delivery: `N/A`
- Triggering finding IDs: `N/A`

Steps 1–6 and 8 of the Change / Refactor Sequence are implemented and checked; step 7 (DS-006) is implemented, but its measurement misses QR-004 (see Known Risks and the Design Impact below). Commits on `codex/large-runs-load-less` over `origin/personal` @ `efd28d5c4a`:

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

## Routing Classification (Mandatory)

- Task size: `Large`; Architecture risk: `High` (design spec "Task Size And Architectural Risk")
- Classification confirmed or changed: `Confirmed`
- Evidence: the change touches three view contracts, a new GraphQL query, the readiness admission boundary, and the web contexts of all three root kinds (106 files).
- Selected route: `Solution Designer` (Design Impact); after the decision, code review.
- Lightweight self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: **Yes — QR-004 missed after DEC-001 (a)**; the profile shows the design's cause attribution for item 163 does not hold for this build (below).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Views and snapshots carry no message log; the Team tab loads its participant's messages when shown | Server: `services/agent-streaming/*-view-projector.ts`, snapshot types (`agent-org-run.ts`, `standalone-agent-run-root.ts`, `root-team-run.ts`), `api/graphql/types/collaboration-participant-messages.ts`. Web: `services/collaborationMessages/*`, contexts forward `communication` events, `CollaborationMessagesSection.vue` loads on show | Hub view 2,790,524 → 176,226 bytes (QR-001 met). Order newest first then ID; live merge by ID (owner spec) |
| BEH-002 | Team/Org open stages the focused member only; others on open; Team-tab messages on show | `services/runHydration/memberLoader.ts`; `teamRunContextHydrationService.ts` (open and recovery focused-only); `agentOrgContextHydration.ts` (`focus`); `agentOrgContextsStore.ts`; `teamMemberProjectionHydrationService.ts` and `agentRunCollaborationChildHydration.ts` reduced to load-target adapters | One member request at open (specs: team hydration, org hydration, org Apollo). Browser measurement on a large seeded Team/Org not run (M-151) |
| BEH-003 | One view read per hub selection; Settings shares it | `agentRunCollaborationStore.viewFor`, `syncHost` reuses a settled stored view; `existingRunConfigStore.readAgentCanonical` | Hub click: 0 view requests (the history row read it once), 1 participant request (QR-002 met) |
| BEH-004 | Admission by structure; messages validated where read; damaged log reported then | `run-history/services/root-run-package-current-validator.ts` (`scanOne`, tree-only), `root-run-package-readiness-index.ts` (`admitCurrent`); records owners validate tree + log | Scan 85 ms at 100.4 MB vs 89 ms base (QR-003 met). Damaged log: query fails with reason, view opens (org unit, team API integration) |
| BEH-005 | Unbroken-token conversation opens in proportion to its size | `composables/useOncePerFrame.ts`, `AgentConversationFeed.vue` `onUpdated` | **QR-004 missed**: 85.9 s (before 87.0 s); see Known Risks |

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

## Known Risks

- **QR-004 is missed, and the design's cause attribution does not hold (Design Impact).** DS-006 is implemented: `onUpdated` schedules at most one scroll check per frame. L-010 unbroken still takes 85,946 ms (before: 87,014 ms). The CPU profile of this build (`evidence/IMP-L010-unbroken-after.cpuprofile`) puts 87.6 of 88.7 s of self time in `AgentConversationFeed.vue` `scrollToBottom` → `writeScrollTop` (`el.scrollTop = el.scrollHeight`). That time comes as 23 separate calls of 3.9–7.1 s each, starting from scheduler callbacks (`nextTick` and frame callbacks). Each forced layout of the conversation is itself what costs seconds; the number of layout reads per frame is not the problem. Coalescing reads cannot reach QR-004, and the design names this case as its escalation (DEC-001 b becomes a question for the user). What causes each layout to cost seconds (for example CSS line breaking of 60 KB unbroken tokens) was not investigated further in this round.
- Member loads not tied to one selection (D-IMP-4): a member opened and then left can finish loading into its own context. It shows nothing new to the user.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Performance, with a behaviour change of loading moments only.
- Root cause classification: Boundary or ownership issue, plus duplicated policy. The refactor decision was "Refactor Needed Now".
- Implementation matched the reviewed assessment: `Yes` for DS-001…DS-005; **`No` for DS-006**: the profiled cause (repeated reads) is not the remaining cost.
- Routed as `Design Impact`: `Yes`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the removed contract fields and the old query are gone; web and server ship together).
- Legacy old behaviour kept in scope: `No`.
- Dead code in the touched files and modules removed: `Yes` (listed above).
- Dead code found elsewhere, added to `follow-ups.md`: none. FU-001 is pre-existing failing tests (below).
- Shared structures stay tight: `Yes`.
- Size guard: `Yes`. `AgentConversationFeed.vue` is at 500 non-blank lines (base 498; the per-frame logic lives in `useOncePerFrame.ts`). `existingRunConfigStore.ts` stays at its base 503. No other changed source file is over 500.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`. No stored format changed; only reads, views and queries.

## Environment Or Dependency Notes

- `generated/graphql.ts` was regenerated against this branch's server. It also picks up `projectRunHistory` (autobyteus-347), which the previous generation did not include.
- FU-001 (`follow-ups.md`): 6 server integration tests fail on base `efd28d5c4a` as well. The cause is in the tests (they predate autobyteus-347 and the model-settings change), not in this ticket.
- The test-owned seed `/tmp/ab358-seed` is kept for the measurements that follow the design decision.

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
| IMP-10 | probes on the seed | `e66b453d5b` | Chrome headless, load in evidence | hub view, click, scan, L-010 | QR-001…QR-004 | QR-001/002/003 met; **QR-004 missed** | IMP-M156-startup-scan-after.log, IMP-hub-after-S/, IMP-L010-unbroken-after/, IMP-L010-unbroken-after.cpuprofile | `176226`, click ops, `85` vs `89` ms, `85945` ms |

- Not run, and why: the suites from a clean clone (AC-008), until the design decision on QR-004 settles the code; the M-151 browser measurement on a large seeded Team/Org (request counts are covered by specs; left to API/E2E); the gated live suites.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces: the Team tab (loading and error states), the mobile message screens, member open, and the conversation feed.
- Surface used: the repository's browser probe (`delegated-copies-large-hub-probe.mjs`) against a probe-owned real stack and the test-owned seed. S-ROWS passed: every Team and member row with its status and Task summary. S-001 passed: hub and copy open.
- Not inspected by hand: the new loading and error states of the Team tab (covered by component specs only), and the mobile screens in a browser.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002 live: send a message while a participant's Team tab is loading, and across a reconnect.
- AC-003: open a large Team and a large Org, count member requests, then open another member.
- AC-006: open a run whose stored log is damaged. Its Team tab shows the reason; resume is refused.

## API / E2E / Executable Coverage Investigation And Execution Still Required

All of the above, after the QR-004 decision and the code review.
