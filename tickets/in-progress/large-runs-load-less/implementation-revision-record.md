# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-002 (Pass) | N/A | `Initial Baseline` | `SR-002`, `ARCH-REV-002` | Steps 1–6, 8 done; step 7 misses QR-004 → `Design Impact` to the Solution Designer |
| IR-002 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-003 (Pass), after IR-001's Design Impact | IR-001 QR-004 | `Design Impact Rework` | `SR-003`, `ARCH-REV-003` | DS-007 done; QR-004 met; ready for code review |
| IR-003 | Code Reviewer / `code-review-report.md` / CRR-001 (Fail 9.3/10) | CR-001 | `Local Fix` | `CRR-001` | Mobile loading / unavailable states; CRR-002 Pass |
| IR-004 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-005 (Pass), after CRR-003's Design Impact | CR-002 (CRR-003, API-08); AR-005 | `Design Impact Rework` | `SR-004`, `SR-005`, `ARCH-REV-005`, `CRR-003` | Lists reload only when a message could have been missed; `live_sequence_id`; ready for targeted code review |

## Revision Entries

### IR-001 — Large runs load less: participant messages, member loader, structural admission

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, ARCH-REV-002 (Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`. The round ends in a `Design Impact` (QR-004).
- Prior authoritative result: `N/A`.
- Current authoritative result: `codex/large-runs-load-less` from `f48bdfc0ab` to `e66b453d5b` (commit table in the handoff), plus the IR-001 records commit.
- Related solution revision IDs: `SR-002`. Architecture review: `ARCH-REV-002`. Code review, API/E2E, delivery: `N/A`.
- Why recorded: the initial implementation handoff.
- Approved behaviour or requirement IDs affected: REQ-001…REQ-005; AC-001…AC-007 (AC-007 not met).
- Implementation delta:
  - Server records owners and the `collaborationParticipantMessages` query.
  - Views and snapshots without message logs; contracts updated.
  - Structural admission and per-package `admitCurrent`.
  - Web `CollaborationParticipantMessages` and `MemberLoader`; focused-only Team and Org staging.
  - Settings via `viewFor`; settled-view reuse on selection; the per-frame feed check.
  - Removals as listed in the handoff.
- Changed files or areas: see the handoff's Key Files Or Areas.
- Implementation-time corrections found by tests and measurements (all fixed in this round):
  - A member load whose context was replaced while its fetch failed now ends as superseded, not as an error (hub child spec).
  - The live-tool-authority check is decided at commit only. Retrying on a change caused an extra fetch (hub lazy-children spec).
  - The `MemberLoader` instance is per Pinia instance; a module singleton leaked state between tests and would not reset with the app's stores.
  - `useOncePerFrame` no longer cancels its frame on unmount. A pending frame does nothing once the component has unmounted, which avoids mismatched fake timers.
  - QR-002 was first measured at 2 view reads per click. Cause: the history row and the selection sync both read the view. `syncHost` now reuses a settled stored view (`e66b453d5b`).
- Local validation and result: `evidence/IMP-local-checks.log`; the handoff's Checks Run table.
- Next recipient or routing: `Design Impact` → `/software_engineering_team/solution_designer`. QR-004 is missed after DEC-001 (a), and the profile contradicts the DS-006 cause.
- Remaining limitations or risks: QR-004 (Design Impact); the clean-clone suites and the M-151 browser measurement are not run yet; FU-001 base test failures.

### IR-002 — DS-007: cheap shaping of very long unbroken runs (QR-004)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, ARCH-REV-003 (Pass) on SR-003, after IR-001's Design Impact.
- Triggering finding IDs: IR-001's QR-004 escalation.
- Classification: `Design Impact Rework`.
- Prior authoritative result: IR-001 at `3a1b4efb9a` (QR-004 missed: 85.9 s).
- Current authoritative result: `b58a3106c3`, plus the IR-002 records commit.
- Related solution revision IDs: `SR-003`. Architecture review: `ARCH-REV-003`. Code review, API/E2E, delivery: `N/A`.
- Approved behaviour or requirement IDs affected: REQ-005, AC-007, QR-004; DEC-004.
- Implementation delta:
  - `utils/text/longUnbrokenRun.ts`: `hasLongUnbrokenRun`, one linear scan for a run of at least 1,000 non-whitespace characters, using the Unicode whitespace set.
  - A global `long-unbroken-text` class in `app.vue` with all four designed properties; they were not measured one by one.
  - The class is bound in `UserMessage.vue` (message text), the `MarkdownRenderer.vue` html segment, `InterAgentMessageSegment.vue` (content wrapper) and the Team-tab row in `CollaborationMessagesPanel.vue`. DS-006 is kept.
- Implementation-time correction: the class was first placed in `assets/css/main.css`, which the app never loads; L-010 stayed at 86.8 s. Moved to `app.vue`, the same run gave 199 ms. The unused file is FU-002.
- Tests: helper unit spec (3); a component test in `UserMessage.spec.ts` and one in `MarkdownRenderer.spec.ts` (a long-token block gets the class, a prose block does not, the text is unchanged).
- Local validation and result: L-010 unbroken 199 ms, words 294 ms (`evidence/IMP-L010-ds007.log`). Web typecheck passes; the three guards each pass; related specs 101 passed. Suites from a clean clone: `evidence/IMP-clean-clone.log`.
- Next recipient or routing: `get_handoff_rules` → code review (Large/High).
- Remaining limitations or risks: tool-call and reasoning renderers not measured with long tokens (the reviewer's recommendation); M-151 browser measurement left to API/E2E; FU-001, FU-002.

### IR-003 — CR-001: mobile message screens show loading and unavailable states

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-001 (Fail, 9.3/10).
- Triggering finding IDs: CR-001 (blocking).
- Classification: `Local Fix`.
- Prior authoritative result: IR-002 at `a0330adab1` (review commit `e2aecff03e`).
- Current authoritative result: `438ea7fb65`, plus the IR-003 records commit.
- Related revision IDs: `CRR-001`; solution, architecture, API/E2E, delivery `N/A`.
- Approved behaviour or requirement IDs affected: AC-006 (never a silently empty log); design file mapping "loading and error states" for the mobile screens.
- Implementation delta:
  - `MobileTeamMessages.vue` reads `messagesStatus()`: a loading article while the focused member's list loads; an unavailable article with the server's reason on error; "No team messages yet" only for a loaded empty list.
  - The `MobileActivityDigest.vue` summary follows the same three states.
  - Both screens reuse the Team tab's `loading_messages` / `messages_unavailable` strings (en, zh-CN) through the new `services/collaborationMessages/participantMessagesStatusText.ts`. The mobile shell spec forbids the text `TeamCommunicationPanel` (the keys' namespace) in mobile files; that check is kept.
  - `test-support/participantMessagesStub.ts` can hold a root's load or fail it with a reason.
- Tests: three specs in `MobileTeamMessages.spec.ts`: loading, unavailable with the reason, and loaded empty. Each covers the screen and the digest summary.
- Local validation and result: `evidence/IMP-CR001-mobile-states.log`: mobile specs 77 passed; web typecheck passes; the three guards each pass.
- Next recipient or routing: `get_handoff_rules` → code review (targeted).
- Remaining limitations or risks: unchanged from IR-002; FU-003 (the code reviewer's) recorded.

### IR-004 — SR-004/SR-005: reload the Team tab's lists only when a message could have been missed

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, ARCH-REV-005 (Pass) on SR-005, after CRR-003 (`code-review-report.md`, failure-origin review of API-08) returned CR-002 as a Design Impact.
- Triggering finding IDs: CR-002; AR-005 (ARCH-REV-004, resolved by SR-005).
- Classification: `Design Impact Rework`.
- Prior authoritative result: IR-003 at `438ea7fb65` (CRR-002 Pass); API-08 measured two participant fetches per running-hub selection and one per new child or Save.
- Current authoritative result: `935c5c9fa9` (server, contracts) and `da91ae689a` (web), plus the IR-004 records commit.
- Related revision IDs: `SR-004`, `SR-005`; `ARCH-REV-004`, `ARCH-REV-005`; `CRR-003`; API/E2E round 1 (API-08); delivery `N/A`.
- Approved behaviour or requirement IDs affected: REQ-002, AC-002 (no message lost or doubled across rebuilds); DESIGN.md rule 3 (no avoidable repeated full-history transfer); DS-002.
- Implementation delta:
  - Server: `RootEventPublisher.liveSequenceId` (a random ID per instance) is given with every snapshot connection. The Agent-root, Org and Team views and snapshots carry it as `live_sequence_id`; stored inspections carry `null`. The Team snapshot field is a required string (D-IMP-7). Contracts and `dist/` rebuilt; protocol doc updated.
  - Web `CollaborationParticipantMessages`:
    - keeps, per root, the live sequence its lists follow and the change sequence C they are consistent through;
    - `advance(kind, id, liveSequenceId, sequence)` moves C within the same live sequence only;
    - `reloadRoot(kind, id, { liveSequenceId, baseChangeSequence })` keeps the lists, with their loads in flight, for the same non-null live sequence and B ≤ C. Otherwise it reloads and takes the new position (`null` forgets it).
    - `releaseRoot` forgets the position.
  - C advances in the hub and Org streaming services on applied events and on seen single `checkpoint_required` events, and in the Team stream after each applied message (D-IMP-9).
  - The rebuild is passed from the hub `publish`, the Org context commit, the Team snapshot effect (`reload_collaboration_messages` carries it) and the Team hydration commit. Builds read without a stream reload; a stream recovery does not reload a second time (D-IMP-8).
  - Docs: the reload rule in `agent_execution_architecture.md`, `settings.md` and `agent_artifacts.md`.
- Tests:
  - Owner spec (10): inspect→attach at an equal sequence keeps the list and its load in flight; a checkpoint reconnect with B = the checkpoint keeps it, and a message in the window reloads it; a gap (B > C) reloads during and after a load; a stored rebuild reloads; stop → resume with a message before the attach reloads and shows it; a new publisher with B ≤ the old C reloads, and the old stream's events do not move C; release forgets the position.
  - Hub store and stream (new `agentRunCollaborationParticipantReloads.spec.ts`, 3): the API-08 counts. Running-hub selection gives 1 fetch; a new child with no message gives 0 more, and with a message 1, which is shown; a dropped connection to a new publisher reloads and shows the message.
  - Team stream: a snapshot in the same live sequence the lists saw keeps them; another live sequence reloads them.
  - Org stream: C advances to a batch's last sequence and to a single checkpoint event's sequence.
  - Team commit: a stored build reloads; a recovery commit keeps.
  - Server: publisher identity per instance (`root-event-publisher-live-sequence.test.ts`); the live inspection names a sequence, the stored one `null`; contract tests (required field, `null` allowed for Agent/Org views).
  - Mutation checks: making `reloadRoot` always reload fails 5 tests; disabling `advance` fails 2; ignoring the live sequence fails 2.
- Fixtures: `live_sequence_id` added to every view and snapshot fixture (server, contracts, web specs, two web e2e page fixtures and one probe). FU-005 records that probe's other base staleness.
- Local validation and result: `evidence/IMP-IR004-checks.log`.
- Next recipient or routing: `get_handoff_rules` → code review (targeted, Large/High), then the API-08 recheck.
- Remaining limitations or risks: a running Team's open reads no live sequence (the GraphQL open), so a list loaded before its stream snapshot is fetched once more (as before; outside SR-005). FU-001 to FU-005.
