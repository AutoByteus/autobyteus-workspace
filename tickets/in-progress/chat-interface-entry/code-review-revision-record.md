# Code Review Revision Record — chat-interface-entry

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 handoff | N/A | Pass | CR-001 (Low, non-blocking) |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 / API-REV-001 Fail | Pass | Fail (Design Impact + Unclear + Local Fix) | CR-001 (resolved by API/E2E), CR-002, CR-003, CR-004 |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 / IR-002 + IR-003 handoff | Fail (CRR-002) | Pass | CR-002, CR-003, CR-004 resolved; CR-001 pending test review |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional test-code review, round 1 / API-REV-002 Pass | Pass (CRR-003) | Pass | CR-001 verified resolved; advisories A-1..A-3 (non-blocking) |
| CRR-005 | `code-review-report.md` | Implementation Review, round 4 / IR-004 (D-16, UVF-001) | Pass (CRR-003/CRR-004) | Pass | None new |
| CRR-006 | `api-e2e-test-review-report.md` | Proportional test-code review, round 2 / API-REV-003 Pass | Pass (CRR-004/CRR-005) | Pass | None; advisories A-1..A-4; observation O-1 forwarded |
| CRR-007 | `api-e2e-test-review-report.md` | Proportional test-code review, round 3 / API-REV-004 Pass (desktop addendum) | Pass (CRR-006) | Not Applicable | None; observations O-2, O-3 forwarded |
| CRR-008 | `code-review-report.md` | Implementation Review, round 5 / IR-005 (D-17, UVF-002, R3) | Pass (CRR-005) | Fail (Local Fix) | CR-005 (new, Medium), CR-006 (new, Low) |
| CRR-009 | `code-review-report.md` | Implementation Review, round 6 / IR-006 (CRR-008 Local Fix) | Fail (CRR-008) | Pass | CR-005, CR-006 resolved |
| CRR-010 | `code-review-report.md` | API/E2E Failure-Origin Review, round 7 / API-REV-005 Fail | Pass (CRR-009) | Fail (Design Impact + Local Fix) | CR-007 (UF-04), CR-008 (UF-03) |
| CRR-011 | `code-review-report.md` | Implementation Review, round 8 / IR-007 + IR-008 (D-18, D-19) | Fail (CRR-010) | Pass | CR-007, CR-008 resolved; C-22 held for evidence |
| CRR-012 | `code-review-report.md` | Amendment of round 8 / user confirmation of the C-22 scenario | Pass (CRR-011) | Fail (Design Impact) | CR-009 (new, promoted from C-22) |
| CRR-013 | `code-review-report.md` | Implementation Review, round 9 / IR-009 (D-19 Agent Org amendment) | Fail (CRR-012) | Pass | CR-009 resolved |
| CRR-014 | `code-review-report.md` | API/E2E Failure-Origin Review, round 10 / API-REV-006 Fail | Pass (CRR-013) | Fail (Local Fix) | CR-010 (UF-05) |
| CRR-015 | `code-review-report.md` | Implementation Review, round 11 / IR-010 (CR-010 Local Fix) | Fail (CRR-014) | Pass | CR-010 resolved |
| CRR-016 | `api-e2e-test-review-report.md` | Proportional test-code review, round 4 / API-REV-007 Pass (covering API-REV-005..API-REV-007) | Pass (CRR-015) | Pass | None; advisories A-4..A-7 |

## Revision Entries

### CRR-001 — Initial implementation review: Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`
- Review entry point and round: Implementation Review, round 1.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/implementation-handoff.md`. There were no triggering findings.
- Relevant solution revision IDs: SR-003, SR-004, SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Pass`, scoring 9.3/10 with every category at 9.1 or above.
- What changed in the review result and why: this is the initial baseline. The review verified D-08 (mode chosen by run id), D-04 and D-13 (launch order and route sync on promotion), D-11 (installed-record catalog and ALL_INSTALLED bindings) and RSK-005 (change-driven redirect) in code, along with the dependency rules and the removals. The reviewer reran the targeted web tests (219) and server tests (144); all passed.
- Supported product scenario / material-premise basis changes: None. MP-001 to MP-007 are confirmed as recorded in ARCH-REV-003. Candidates C-01, C-02, C-03, C-04, C-06 and C-07 were rejected; C-05 was promoted as Low and non-blocking.

#### Prior Finding Resolution

None

- New or remaining finding IDs: CR-001 (Low, non-blocking; a stale `createDraftRun` mock in a regressions spec).
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: RSK-003 (live ALL_INSTALLED on Claude and AGY), live voice, packaged Daily Assistant seeding, and the hand-applied `generated/graphql.ts` delta.

### CRR-002 — API/E2E failure-origin review: F-01 implementation defect, F-02 Unclear, F-03 Design Impact

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`. See the "API/E2E Failure-Origin Review (Round 2)" section.
- Review entry point and round: API/E2E Failure-Origin Review, round 2.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-execution-coverage-report.md`. Findings F-01 (CE-08/C05), F-02 (CE-09/C07) and F-03.
- Relevant solution revision IDs: SR-003, SR-004, SR-007
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001, implementation review)
- Current authoritative result: Fail. The classifications are:
  - CR-004 / F-03: Design Impact.
  - CR-003 / F-02: Unclear.
  - CR-002 / F-01: Local Fix → implementation.
- What changed in the review result and why:
  - F-01 is confirmed in source. A live persisted run's thinking schema falls back to a runtime catalog that nothing loads, so `ChatThinkingControl` does not render. This is an earlier review gap.
  - F-02: no stream-close path exists in Chat-owned code. The leading hypothesis (H-1) is the pre-existing history reconcile disconnecting a prepared, not-yet-started run, but it is unconfirmed. The origin is held for evidence.
  - F-03 hits the design's RSK-003 escalation trigger. The ALL_INSTALLED name-collision policy for AGY workspace skills is a design decision.
- Supported product scenario / material-premise basis changes:
  - F-01: SCN-007/SCN-008, Supported Normal.
  - F-02: SCN-001-F, Supported Explicit Edge; origin Unclear.
  - F-03: Supported Explicit Edge under the RSK-003 governing contract.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Low, non-blocking) | Resolved (pending proportional test review) | API-REV-001 | API/E2E report: stale mock removed; the spec's 2 baseline failures are unchanged |

- New or remaining finding IDs: CR-002 (Medium, F-01), CR-003 (Unclear, F-02), CR-004 (High, F-03).
- Material score or classification changes: Runtime Correctness goes from 9.2 to 8.4 because of the F-01 review gap and F-03.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - The F-02 closer is unidentified; the evidence list is in the report.
  - The F-03 policy choice may need user or product input.

### CRR-003 — Round 3 implementation review (IR-002 / IR-003): Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`. See the "Round 3 Review (IR-002 / IR-003)" section and the updated scorecard.
- Review entry point and round: Implementation Review, round 3.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/implementation-handoff.md`. It addresses CR-002, CR-003 and CR-004 from CRR-002.
- Relevant solution revision IDs: SR-008, SR-009, SR-010
- Relevant architecture-review revision IDs: ARCH-REV-004, ARCH-REV-005, ARCH-REV-006
- Relevant implementation revision IDs: IR-002, IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-002)
- Current authoritative result: Pass, 9.3/10, with every category at 9.2 or above.
- What changed in the review result and why:
  - CR-002: the persisted-mode controls now request the run's runtime catalog, so the locked thinking control shows on a fresh load of a live run.
  - CR-003: the D-14 activation-pending marker in `agentRunStore` has every set and clear path the design lists. Reconcile skips marked runs, the SR-008 guard is removed cleanly, and the R-2 generation guard is in place. The live resend probe passed 14/14.
  - CR-004: D-15 request strength is implemented. Rule 1 covers the shared materializer and AGY. Rule 2 A skips; Rule 2 B yields to the configured source while the entry stays exclusive, and restores on failure. Release is keyed by holder (IC-1), and the link operations were extracted to `workspace-skill-links.ts`.
  - The reviewer reran 225 server tests (16 files) and 272 web tests (28 files); all passed.
- Supported product scenario / material-premise basis changes: C-08..C-11 were rejected (design-approved, infrastructure failure, or contrived timing). C-12 was promoted as a non-blocking delivery note: the merge-time test type fix.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved by API/E2E (pending test review) | Unchanged (pending proportional test review) | API-REV-001 | Uncommitted worktree change; out of scope for source review |
| CR-002 | Open (Local Fix) | Resolved | IR-002 | `chatRunModelControls.ts` L80–L90; spec test; live evidence |
| CR-003 | Open (Unclear) | Resolved | SR-010, IR-002, IR-003 | `agentRunStore.ts` marker; `runHistoryLoadActions.ts` L242–L259; unit tests; stale reproduction and resend 14/14 |
| CR-004 | Open (Design Impact) | Resolved | SR-008/SR-009, IR-002 | `workspace-skill-materializer.ts`, `workspace-skill-links.ts`, the AGY materializer; V-A..V-E unit and live |

- New or remaining finding IDs: none blocking. There is one delivery note (C-12).
- Material score or classification changes: Runtime Correctness goes from 8.4 to 9.2; Cleanup from 9.1 to 9.2.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - The D-14 marker has no timeout (design-approved).
  - The Windows re-point fallback is unit-tested only.
  - The merge-time type fix in the upstream AGY e2e test.

### CRR-004 — Proportional API/E2E test-code review: Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-test-review-report.md` (new). `code-review-report.md` is unchanged and stays authoritative for source review (CRR-003).
- Review entry point and round: Successful API/E2E test-code review, round 1.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-execution-coverage-report.md` (API-REV-002, Pass, 95%).
- Relevant solution revision IDs: SR-010
- Relevant architecture-review revision IDs: ARCH-REV-006
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003, source review)
- Current authoritative result: Pass (test-code review)
- What changed in the review result and why: three durable test paths were reviewed:
  - the live probe C01–C15 (added);
  - the `package.json` script (updated);
  - the CR-001 mock removal (updated).
  They are coherent, isolated, and requirement-aligned, and they match the execution evidence. `node --check` passes.
- Supported product scenario / material-premise basis changes: None. The probe cases reproduce scenarios already established upstream.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved by API/E2E (pending test review) | Resolved (verified) | API-REV-001/API-REV-002 | The worktree diff removes the `createDraftRun` mock line; no other change to the spec |

- New or remaining finding IDs: none blocking. Advisories A-1..A-3 are recorded in the test review report.
- Material score or classification changes: N/A (the scorecard does not apply to test review).
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - The durable test changes are uncommitted and must be committed at finalization.
  - Delivery note C-12 (the merge-time AGY e2e test argument).
  - Voice dictation is not automatable.
  - The Windows re-point fallback is unit-tested only.

### CRR-005 — Round 4 implementation review (IR-004, D-16 Chat model labels): Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`. See the "Round 4 Review (IR-004 / D-16)" section.
- Review entry point and round: Implementation Review, round 4.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` (IR-004). The origin is user verification finding UVF-001 (`user-verification-finding-001.md`, DR-002).
- Relevant solution revision IDs: SR-011, SR-012
- Relevant architecture-review revision IDs: ARCH-REV-007, ARCH-REV-008
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-002 (prior pass; a rerun is needed for D-16)
- Relevant delivery revision IDs: DR-002
- Prior authoritative result: Pass (CRR-003 source review; CRR-004 test review)
- Current authoritative result: Pass, 9.3/10.
- What changed in the review result and why: D-16 is verified.
  - One builder, `toChatModelOption` (catalog record first, then `existingRunChoiceLabelInput`), serves the catalog rows, search, the footer trigger and the persisted fixed list.
  - The shared `modelSelectionLabel` policy, with the mapping moved and its local copy removed.
  - The shared `compareRecommendedFirstBy` comparator.
  - One search predicate, `matchesModelQuery`.
  - Single-line truncation with the full text in `title` and `aria-label`.
  - The launch-form badge style.
  - The reviewer reran 14 files (74 tests); all passed.
- Supported product scenario / material-premise basis changes: SCN-002 is extended by REQ-021/AC-018 (user-approved). C-13..C-15 were rejected.

#### Prior Finding Resolution

None. No findings were open after CRR-004.

- New or remaining finding IDs: None.
- Material score or classification changes: None. The delta is Small/Low, and the package stays Large/High.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: the locale-dependent upstream spec (`TokenUsageMeterPanel.spec.ts`) is unrelated to this ticket.

### CRR-006 — Proportional API/E2E test-code review, round 2 (D-16 probe update): Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-test-review-report.md`. See the "Round 2 Delta" section and the latest result.
- Review entry point and round: Successful API/E2E test-code review, round 2.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` (API-REV-003, Pass, 95%); AC-018 / V-L1..V-L5.
- Relevant solution revision IDs: SR-011, SR-012
- Relevant architecture-review revision IDs: ARCH-REV-008
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-003
- Relevant delivery revision IDs: DR-002
- Prior authoritative result: Pass (CRR-004 test review; CRR-005 source review)
- Current authoritative result: Pass
- What changed in the review result and why:
  - The probe update was reviewed: `MODEL_ROW`, the C04 policy-label trigger check, and the new C16.
  - C16's independent oracle matches the shared label policy rule for rule and is cross-checked against the launch form (V-L5).
  - `node --check` passes.
- Supported product scenario / material-premise basis changes: SCN-002 is extended by REQ-021/AC-018 (user-approved).

#### Prior Finding Resolution

None. There were no open test-review findings; advisories A-1..A-3 are carried forward and A-4 was added.

- New or remaining finding IDs: None.
- Material score or classification changes: N/A.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - O-1: the fresh New chat trigger shows the raw identifier for about 0.6–3 s before the policy label. It is implementation behavior outside the approved requirement's scope; it goes to delivery for UVF-001 re-verification.
  - The probe update is uncommitted.

### CRR-007 — Proportional test-code review, round 3 (API-REV-004 desktop addendum): Not Applicable

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-test-review-report.md`. See the "Round 3" section and the latest result.
- Review entry point and round: Successful API/E2E test-code review, round 3.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` ("Round 4" section; API-REV-004, Pass, 95%); DT-00..DT-05.
- Relevant solution revision IDs: SR-012
- Relevant architecture-review revision IDs: ARCH-REV-008
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-004
- Relevant delivery revision IDs: DR-003, DR-004 (delivery merge refreshes)
- Prior authoritative result: Pass (CRR-006)
- Current authoritative result: Not Applicable
- What changed in the review result and why:
  - No durable test changed. The round-2 probe was committed unchanged in `030bab78d` (empty diff to HEAD).
  - No chat-owned source changed since `e9f2ce399`; the later commits are delivery merge refreshes of `origin/personal` and ticket docs.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None. There are no open test-review findings.

- New or remaining finding IDs: None.
- Material score or classification changes: N/A.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - O-1: the transient identifier label on a fresh New chat.
  - O-2: the `/` skill list is fetched once per session, so a skill added externally is missing until the Skills page is visited or the app restarts.
  - O-3: the runtime badge truncates at 1200 px.
  - All three are for user re-verification; none is a finding against the approved requirements.

### CRR-008 — Round 5 implementation review (IR-005, D-17 chat run view = product agent run view): Fail (Local Fix)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`. See the "Round 5 Review (IR-005 / D-17)" section, the findings and the latest result.
- Review entry point and round: Implementation Review, round 5.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` (IR-005). The origin is UVF-002 (`solution-designer-result-uvf-002.md`), the R3 supplement, and DEC-016.
- Relevant solution revision IDs: SR-013, SR-014
- Relevant architecture-review revision IDs: ARCH-REV-009, ARCH-REV-010
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: N/A for this round (API-REV-004 was the prior pass)
- Relevant delivery revision IDs: DR-005
- Prior authoritative result: Pass (CRR-005)
- Current authoritative result: Fail, `Local Fix` → implementation.
- What changed in the review result and why:
  - The D-17 frame, restorations, draft ⚙ (AR-011), header, box skill tagging, the shared right panel, the AR-010 tab rule and the removals are verified.
  - CR-005: the restored global config mode is never reset on the Chat launch and open paths (`…WithoutShellNavigation`). After ⚙ on one chat, a new chat opens on its settings panel instead of its conversation.
  - CR-006: `useSkillTagMenu` (agentInput) imports `composables/chat/useChatPopover`, against the design's Dependency Rules (AR-002).
  - The reviewer reran 58 web files: 441/442 pass, and the only failure is the baseline `org-definition-navigation`.
- Supported product scenario / material-premise basis changes: CR-005 rests on SCN-001/SCN-008 with ordinary sequential actions. C-18..C-20 were rejected; C-20 (design-spec file-mapping residue) is noted for the Solution Designer.

#### Prior Finding Resolution

None. No findings were open after CRR-005.

- New or remaining finding IDs: CR-005 (Medium), CR-006 (Low).
- Material score or classification changes: Ownership goes from 9.5 to 8.9, and Runtime Correctness from 9.2 to 8.6. The classification is Local Fix.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: the Team quick path should be checked for the same config-mode leak as part of the CR-005 fix.

### CRR-009 — Round 6 implementation review (IR-006, the CRR-008 Local Fix): Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`. See the "Round 6 Review" section and the latest result.
- Review entry point and round: Implementation Review, round 6.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` (IR-006); CR-005, CR-006.
- Relevant solution revision IDs: SR-014
- Relevant architecture-review revision IDs: ARCH-REV-010
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-008)
- Current authoritative result: Pass, 9.3/10.
- What changed in the review result and why:
  - CR-005: `pages/chat.vue` ties ⚙ to the context it was opened for and shows the conversation whenever Chat displays another context. A promotion keeps the settings. The Team quick path resets before launch. Regression tests were added.
  - CR-006: the popover moved to `composables/popover/useAnchoredPopover.ts`, and the skill-tag helpers to `utils/skills/skillTagMenu.ts`. `agentInput` has no `composables/chat` imports.
  - The reviewer reran 42 files (345 tests); all passed.
- Supported product scenario / material-premise basis changes: None. C-21 was rejected.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-005 | Open (Medium, Local Fix) | Resolved | IR-006 `59a20f21b` | `pages/chat.vue` config-context watchers; `launchTeamChat` `showChat()`; `chat.spec.ts` (3 new tests); `chatLaunchService.spec.ts`; live check L |
| CR-006 | Open (Low, Local Fix) | Resolved | IR-006 `59a20f21b` | Grep: agentInput imports only `ChatSkillMenu.vue` and `SkillTagChips.vue` from chat; `useAnchoredPopover` and `skillTagMenu` are the neutral owners |

- New or remaining finding IDs: None.
- Material score or classification changes: Ownership goes from 8.9 to 9.3, and Runtime Correctness from 8.6 to 9.2.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: the API/E2E probe must be updated for the removed run-view selectors.

### CRR-010 — API/E2E failure-origin review (API-REV-005): UF-04 Design Impact, UF-03 Local Fix

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`. See the "API/E2E Failure-Origin Review (Round 7)" section.
- Review entry point and round: API/E2E Failure-Origin Review, round 7.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` ("Round 5"; API-REV-005, Fail, 93%); UF-04 (C20, desktop Desk Team) and UF-03 (DT12/DT13).
- Relevant solution revision IDs: SR-008..SR-010 (D-15), SR-014 (D-17)
- Relevant architecture-review revision IDs: ARCH-REV-004..ARCH-REV-006, ARCH-REV-010
- Relevant implementation revision IDs: IR-002 (D-15 materializer), IR-005, IR-006
- Relevant API/E2E revision IDs: API-REV-005
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-009)
- Current authoritative result: Fail. CR-007 (UF-04) is `Design Impact`; CR-008 (UF-03) is `Local Fix` → implementation, sequenced by the Solution Designer.
- What changed in the review result and why:
  - UF-04 is confirmed in source. `reconcileUnresolved` (unchanged from base, and kept "unchanged" by D-15) throws on a ready, weak-held, materializer-owned link. That breaks the D-15 invariant that configured launches never regress because of a live ALL_INSTALLED chat. The rule for unresolved strong requests is undefined in the design. This is an earlier review gap (CRR-003).
  - UF-03: Chat's `llmConfig: null` launch meets the pre-existing `showMissingHistoricalConfig` rule on a live, read-only ⚙. It is not a review gap.
- Supported product scenario / material-premise basis changes: both are Supported Normal Scenarios (an imported package team next to the default Daily Assistant chat; ⚙ on a fresh live chat).

#### Prior Finding Resolution

None. No findings were open after CRR-009.

- New or remaining finding IDs: CR-007 (Medium, Design Impact), CR-008 (Low, Local Fix).
- Material score or classification changes: Runtime Correctness goes from 9.2 to 8.5.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - The policy choice for CR-007 (skip as discoverable, join, or another option) is the designer's.
  - The updated probe (C17–C20) is uncommitted; it needs the proportional test review after a passing API/E2E round.

### CRR-011 — Round 8 implementation review (IR-007 D-18, IR-008 D-19 one skill per name): Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`. See the "Round 8 Review" section and the latest result.
- Review entry point and round: Implementation Review, round 8.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` (IR-008); CR-007 (UF-04) and CR-008 (UF-03); REQ-022/023/024; AR-013; R-3.
- Relevant solution revision IDs: SR-015, SR-016, SR-017
- Relevant architecture-review revision IDs: ARCH-REV-011, ARCH-REV-012, ARCH-REV-013
- Relevant implementation revision IDs: IR-007, IR-008
- Relevant API/E2E revision IDs: API-REV-005 (the triggering failure)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-010)
- Current authoritative result: Pass, 9.3/10.
- What changed in the review result and why:
  - D-18: the default computation was extracted to a pure shared function, and the chat records explicit default thinking.
  - D-19:
    - a tiered one-per-name catalog in SkillService;
    - CONFIGURED, ALL_INSTALLED and AGY resolution plus every name-based operation read the catalog;
    - validation before commit on every import path, with the GraphQL `SKILL_NAME_CONFLICT` contract;
    - the issues query and banner;
    - Codex duplicate exposure;
    - the D-15 strength and re-point machinery removed.
  - UF-04 no longer reaches the unresolved branch.
  - The reviewer reran server 617/622 (5 baseline) and web 1176/1176.
- Supported product scenario / material-premise basis changes:
  - C-22 (org-owned agent private skill folders) is held for evidence and needs owner confirmation.
  - C-23..C-25 were rejected; C-26 and C-27 were accepted as local decisions within the design.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-007 | Open (Design Impact; UF-04) | Resolved | SR-016/SR-017 D-19; IR-008 `ec31ff371` | Catalog resolution for CONFIGURED (`catalogLookup`); a same-source join in the materializer; V-F live on Codex, Claude and Grok |
| CR-008 | Open (Local Fix; UF-03) | Resolved | SR-015 D-18; IR-007 `f4864638b` | `explicitChatModelConfig` / `applyModelConfigSchemaDefaults` / `getDefaultThinkingConfig`; IC-3 live |

- New or remaining finding IDs: None. C-22 is held for evidence.
- Material score or classification changes: Runtime Correctness goes from 8.5 to 9.2.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - C-22.
  - `skill-service.ts` size.
  - Catalog rescans.
  - The Codex dual listing when a stale default copy exists.
  - GitHub rejection unit-tested only.

### CRR-012 — Round 8 amendment: C-22 promoted to CR-009 on the user's confirmation (Design Impact)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md` (findings, classification and latest result).
- Review entry point and round: Implementation Review, round 8 (amendment).
- Triggering role, report path, and finding or scenario IDs: the user (product owner), 2026-09-29, in the reviewer conversation. The user confirmed that an Agent Org private agent with its own `skills/` folder is normal and must be supported, and that Agent Orgs, which contain agents and teams, must behave like teams. This is the evidence C-22 was held for.
- Relevant solution revision IDs: SR-016, SR-017
- Relevant architecture-review revision IDs: ARCH-REV-013
- Relevant implementation revision IDs: IR-008
- Relevant API/E2E revision IDs: API-REV-006 (in progress; not yet received)
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-011)
- Current authoritative result: Fail, `Design Impact` (CR-009).
- What changed in the review result and why:
  - C-22 is promoted.
  - Base and current `origin/personal` resolve org-agent private skills at run time (`resolveContextualSkill` via `agentDirPath`). D-19 removed that lookup, and its tier-2 scan omits `agent-orgs/*`. This is a regression introduced on this branch.
  - The Skills page listing gap for org skills already existed on `personal`.
- Supported product scenario / material-premise basis changes: org-owned agent and team skill folders are now a Supported Normal Scenario (user-confirmed).

#### Prior Finding Resolution

None. CR-007 and CR-008 remain resolved.

- New or remaining finding IDs: CR-009 (High, Design Impact).
- Material score or classification changes: Runtime Correctness goes from 9.2 to 8.6. The classification is Design Impact.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: the exact org layouts to scan (org agents, org-owned teams and their agents, any org-level skills folder) and the tier-2 order are for the designer to define.

### CRR-013 — Round 9 implementation review (IR-009, D-19 Agent Org layouts): Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`. See the "Round 9 Review" section and the latest result.
- Review entry point and round: Implementation Review, round 9.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` (IR-009); CR-009; DEC-017a; AR-014; AF-37.
- Relevant solution revision IDs: SR-018, SR-019
- Relevant architecture-review revision IDs: ARCH-REV-014, ARCH-REV-015
- Relevant implementation revision IDs: IR-009
- Relevant API/E2E revision IDs: N/A for this round
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-012)
- Current authoritative result: Pass, 9.3/10.
- What changed in the review result and why:
  - The pure `correlateAgentOrgOwnedMembers` core behind a behavior-preserving async reader and a new sync reader.
  - Tier 2 now includes `agent-orgs/*`: org agents' `skills/`, and org teams' shared and local-agent skills. There is no org-level folder, and only correlated folders are scanned.
  - App-data org roots come from config.
  - AGY roots follow the SR-018 table.
  - Import validation covers org packages.
  - The reviewer reran 301/302 server unit tests (1 baseline).
- Supported product scenario / material-premise basis changes: none beyond DEC-017a. C-28 and C-29 were rejected.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-009 | Open (High, Design Impact) | Resolved | SR-018/SR-019; ARCH-REV-015; IR-009 `0be1dd47e` | `skill-discovery.getAgentOrgSkillLocations`; the `skill-catalog` org root; correlation core and parity tests; `skill-catalog-agent-orgs.test.ts` (7 cases); live `ir9-org-probe` on Codex, Claude, Grok and AGY |

- New or remaining finding IDs: None.
- Material score or classification changes: Runtime Correctness goes from 8.6 to 9.2.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - `skill-service.ts` size (485).
  - Catalog rescan cost.
  - The org Skills page listing not rendered live.

### CRR-014 — API/E2E failure-origin review (API-REV-006): UF-05 implementation Local Fix

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`. See the "API/E2E Failure-Origin Review (Round 10)" section.
- Review entry point and round: API/E2E Failure-Origin Review, round 10.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` ("Round 6"; API-REV-006, Fail, 94%); UF-05 (C22e).
- Relevant solution revision IDs: SR-016..SR-019
- Relevant architecture-review revision IDs: ARCH-REV-013, ARCH-REV-015
- Relevant implementation revision IDs: IR-008 (web `be6c8977d`), IR-009
- Relevant API/E2E revision IDs: API-REV-006
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-013)
- Current authoritative result: Fail, `Local Fix` → implementation (CR-010).
- What changed in the review result and why:
  - UF-05 is confirmed in source. The tier-4 toast is raised from `SkillSourcesModal`'s flow, and the pre-existing `ToastContainer` `z-[100]` sits below the dialog overlay (`z-index: 1000`). The conflict dialog was raised to 1100 for the same stacking, but the toast was not.
  - This is a minor earlier review gap (CRR-011).
  - UF-04 and UF-03 are confirmed resolved live.
- Supported product scenario / material-premise basis changes: None (AC-020 alternate, supported normal).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-007 | Resolved (source) | Resolved (live-confirmed) | API-REV-006 | C20 on Codex and Claude; desktop DT-51 |
| CR-008 | Resolved (source) | Resolved (live-confirmed) | API-REV-006 | C05 `llmConfig` schema defaults; desktop DT-50 |
| CR-009 | Resolved (source) | Resolved (live-confirmed) | API-REV-006 | C23 on Codex, Claude and AGY; desktop Desk Org run |

- New or remaining finding IDs: CR-010 (Low).
- Material score or classification changes: Runtime Correctness goes from 9.2 to 9.0. The classification is Local Fix.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: none beyond the residuals. The durable test changes await the proportional test review after a passing API/E2E round.

### CRR-015 — Round 11 implementation review (IR-010, the CR-010 toast layer): Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`. See the "Round 11 Review" section.
- Review entry point and round: Implementation Review, round 11.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` (IR-010); CR-010 / UF-05.
- Relevant solution revision IDs: SR-016..SR-019 (D-19 web)
- Relevant architecture-review revision IDs: N/A for this delta
- Relevant implementation revision IDs: IR-010
- Relevant API/E2E revision IDs: API-REV-006
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-014)
- Current authoritative result: Pass, 9.3/10.
- What changed in the review result and why: the toast layer is now `z-[10000]`, above every overlay (the highest is 9999, verified by grep), and the new static guard plus render spec passes. The reviewer reran 18/18.
- Supported product scenario / material-premise basis changes: None. C-30 was rejected.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-010 | Open (Low, Local Fix) | Resolved | IR-010 `a98a15d05` | `ToastContainer.vue` `z-[10000]`; `ToastContainer.spec.ts`; implementer U6 (`elementFromPoint` = toast over the Sources dialog) |

- New or remaining finding IDs: None.
- Material score or classification changes: Runtime Correctness goes from 9.0 to 9.2.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: none new.

### CRR-016 — Proportional API/E2E test-code review, round 4 (D-17/D-18/D-19/DEC-017a test changes): Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/api-e2e-test-review-report.md`. See the "Round 4" section and the latest result.
- Review entry point and round: Successful API/E2E test-code review, round 4.
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` ("Round 7"; API-REV-007, Pass, 95%).
- Relevant solution revision IDs: SR-013..SR-019
- Relevant architecture-review revision IDs: ARCH-REV-010, ARCH-REV-013, ARCH-REV-015
- Relevant implementation revision IDs: IR-005..IR-010
- Relevant API/E2E revision IDs: API-REV-005, API-REV-006, API-REV-007
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-015 source review; CRR-007 last test review)
- Current authoritative result: Pass
- What changed in the review result and why:
  - The new D-19 GraphQL e2e (9 cases), the probe rewrite for D-17 and the new C17–C23, and the RD-01 stub fixes were reviewed. They are coherent, isolated and requirement-aligned, and the retired D-15 assertions are replaced, not kept.
  - The reviewer reran the server e2e plus two stubbed integration files (16/16) and the probe syntax check.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

None. There were no open test-review findings; A-2 is resolved, and A-5 to A-7 were added as advisories.

- New or remaining finding IDs: None.
- Material score or classification changes: N/A.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - The test changes are uncommitted.
  - Grok and the AutoByteus runtime were not rerun (stopped by the user).
  - O-1..O-7 are with delivery.
