# Code Review Revision Record — token-meter-accuracy

The latest `code-review-report.md` remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md` | Implementation Review round 1 / IR-001 handoff | N/A | Fail (`Local Fix`) | CR-F-001 |
| CRR-002 | same | Implementation Review round 2 / IR-002 Local Fix | Fail (`Local Fix`) | Pass | CR-F-001 (resolved) |
| CRR-003 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/api-e2e-test-review-report.md` | Proportional test-code review / API-REV-001 Pass | Pass (implementation review, CRR-002) | Pass | None |
| CRR-004 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md` | Implementation Review round 3 / IR-003 (D-11, DR-002) | Pass (CRR-002; test review CRR-003) | Pass | None |
| CRR-005 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md` | Implementation Review round 4 / IR-004 (D-12 revert, D-13 note, D-9 refetch fix) | Pass (CRR-004, superseded) | Pass | C-11 (review gap, resolved) |
| CRR-006 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md` (§ Round 5) | API/E2E Failure-Origin Review / API-REV-002 Fail (F-API-002-01) | Pass (CRR-005) | Fail — Design Impact | F-API-002-01; CRR-005 RR-7 acceptance (review gap) |
| CRR-007 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md` (§ Round 6) | Implementation Review round 6 / IR-005 (D-13 clear rule) | Fail — Design Impact (CRR-006) | Fail — Design Impact | F-API-002-01 (resolved for a loaded baseline); CR-F-002 (new) |
| CRR-008 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md` (§ Round 7) | Implementation Review round 7 / IR-006 (SR-014 mark rule) | Fail — Design Impact (CRR-007) | Pass | CR-F-002 (resolved) |
| CRR-009 | `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/api-e2e-test-review-report.md` (§ Round 2) | Proportional test-code review / API-REV-003 Pass | Pass (CRR-008) | Pass | None |

## Revision Entries

### CRR-001 — Initial baseline: runtime implementation sound; DEC-005 clear bypassed on direct upgrade

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-001); N/A
- Relevant solution revision IDs: SR-001–SR-005; SR-006 (evidence-only integration note)
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail` — `Local Fix`, routed to `/software_engineering_team/implementation_engineer`
- What changed in the review result and why:
  - **Initial baseline.** D-1 to D-10 were verified against code. The checks covered the D-10 awaited emission and the P4 delayed-read test, the live-sum remainder, the revision freshness guards, the strict contracts (`dist` in sync), the Codex reading-only save and the AGY per-step mapping.
  - **Reviewer-run checks pass:** 1,035 targeted server unit tests, typecheck, the web store and panel specs, and both contract packages.
  - **One blocking gap.** On a supported direct upgrade from a ledger-era release, the legacy consolidation rebuilds pre-fix Claude readings after the Prisma clear.
- Supported product scenario / material-premise basis changes:
  - SCN-CR-01 / CR-MP-01 added: a direct upgrade under `data_migration_guideline.md` § supported upgrade range. Classified Supported Explicit Edge Scenario, Reachable.
  - C-03 to C-07 rejected as unsupported, unreachable or accepted residual.
  - C-02 is a non-blocking recommendation.

#### Prior Finding Resolution

None

- New or remaining finding IDs: CR-F-001 (Medium, blocking)
- Material score or classification changes: N/A (baseline). API/E2E Readiness and Cleanup Completeness score 8.5; all other categories ≥ 9.0. Task size `Large` and architectural risk `High` are preserved.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - SR-006 / AF-16 integration conflict with `origin/personal` (AGY converter, `token_usage.md`).
  - Live E2E and desktop verification are still pending.
  - Store size pressure at 499 lines.

### CRR-002 — CR-F-001 resolved; implementation review passes

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. The delta `aa9d949e1..f78921e5f` covers only CR-F-001:
  - one migration-owned conditional;
  - one test;
  - one docs sentence;
  - handoff and record updates.

  No spine, interface or data-shape change.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-002); CR-F-001
- Relevant solution revision IDs: SR-001–SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` — `Local Fix` (CRR-001)
- Current authoritative result: `Pass`
- What changed in the review result and why: CR-F-001 was verified in the code and by a reviewer rerun (70 files / 470 pass; typecheck clean). The legacy consolidation now applies the DEC-005 clear to `claude_agent_sdk` ledger rows, and the new test covers the direct-upgrade path. Scores for API/E2E Readiness and Cleanup Completeness rose from 8.5 to 9.0.
- Supported product scenario / material-premise basis changes: None. SCN-CR-01 / CR-MP-01 is unchanged; its consequence is resolved.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-F-001 | Open (Medium, blocking) | Resolved | IR-002, commit `f78921e5f` | Evidence: <ul><li>`legacy-token-usage-row.ts`: readings are null only when `runtime_kind === "claude_agent_sdk"`.</li><li>New consolidation test: the Claude row ends with null readings, exact totals and one report; the Codex row keeps its reading.</li><li>Reviewer rerun of `tests/unit/app-data-migrations`, `token-usage` and `startup`: 470 pass.</li></ul> |

- New or remaining finding IDs: None. Non-blocking C-02 and the store size pressure remain recorded as recommendations.
- Material score or classification changes: overall 9.2 → 9.3; all categories ≥ 9.0. Task size `Large` and architectural risk `High` are preserved.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (primary); `/software_engineering_team/implementation_engineer` (informational)
- Remaining risks or uncertainty:
  - The SR-006 / AF-16 integration conflict is for delivery.
  - Live E2E and desktop verification are pending.

### CRR-003 — Proportional API/E2E test-code review passes

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/api-e2e-test-review-report.md`. The implementation `code-review-report.md` is unchanged (CRR-002 remains authoritative for source).
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review). The scope is the 12 durable test paths changed in `f78921e5f..2acf9b394`. That range contains test-only commits; no product source changed.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-001, Pass, 95%); LIVE-001–005, DESK-001–003
- Relevant solution revision IDs: SR-001–SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (implementation review, CRR-002)
- Current authoritative result: `Pass` (test-code review)
- What changed in the review result and why: the changed tests are coherent and requirement-aligned:
  - They reuse the probe fixtures and Studio server helpers.
  - The three baseline fixes are justified; the global facet wipe is safe under `fileParallelism: false`.
  - Obsolete assertions are removed with the removed behavior.
  - The live suites are gated and isolated. The Codex suite uses a temporary `CODEX_HOME` with a symlinked auth file, matching the documented Grok pattern.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None. No prior test-review findings exist.

- New or remaining finding IDs: None. Two non-blocking notes: Codex live suite record cleanup; a conditional reading-drop assertion.
- Material score or classification changes: None. Large / High preserved.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - TESTING.md does not list the `RUN_RUNTIME_TOKEN_USAGE_E2E` gate or the Codex suite (delivery docs sync).
  - SR-006 / AF-16 integration conflicts with `origin/personal`.
  - AC-010 is user verification.

### CRR-004 — D-11 native compaction reading reset passes review

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md`
- Review entry point and round: Implementation Review, round 3
- Review scope: `Full Re-Audit` of the affected area. D-11 adds a payload field and changes the fold rule (DS-005). The re-audit covered the delta `989f31780..1d93c9002` (code commit `5b48c2b47`) and what merge `168900db7` brought into the token-usage, Claude and native paths. The native threshold emission survived the merge (`llm-phase.ts:218`).
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-003); DR-002, SR-008 / D-11, AC-011
- Relevant solution revision IDs: SR-001–SR-008
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-001–IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: DR-001, DR-002
- Prior authoritative result: `Pass` (CRR-002 implementation; CRR-003 test review)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - D-11 is implemented as designed. The native converter alone maps `autobyteus_compaction` to `context_reading_reset`, and the payload builder defaults it to `false`.
  - For a latest reset observation, the fold nulls prompt and percent and keeps the window and threshold. The call, tokens, cost and revision still count. The fold has no ingestion-kind branch.
  - The meter hides the context card on an unknown prompt (`hasCurrentPrompt`).
  - The upstream test is adapted, not weakened.
  - Reviewer rerun: 801 pass; typecheck clean.
- Supported product scenario / material-premise basis changes: AC-011 / BEH-005 clarification (approved in SR-008). Candidates C-08 (flag visible on the standalone socket, unused), C-09 (failed attempt hides the reading: approved edge) and C-10 (eager conversion: not reachable) were all rejected.

#### Prior Finding Resolution

None open. CR-F-001 remains resolved; IR-003 did not regress it (the migration and consolidation tests pass).

- New or remaining finding IDs: None. The refactoring proposal R-1–R-4 is tracked separately in `project_task_7257984e-19b4-452a-a65b-99316d879bc1`.
- Material score or classification changes: none (9.3 / 10). Large / High preserved.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (affected-scope validation, per SR-008); `/software_engineering_team/implementation_engineer` (informational)
- Remaining risks or uncertainty:
  - AC-011 user check of a native compaction.
  - Uncommitted Solution Designer and architecture artifacts in the worktree.
  - The live suites were not rerun on the re-integrated base (delivery noted this in DR-002).

### CRR-005 — D-11 reverted (D-12), "Compacted" note (D-13), standalone refetch fix

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md`
- Review entry point and round: Implementation Review, round 4
- Review scope: `Full Re-Audit` of the affected area, delta `ab1265c7f..fdf44f205`. It reverts a payload field and fold rule, adds a new frontend owner, and changes the D-9 trigger.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-004); SR-009–SR-011, REQ-012, AC-011, AC-012
- Relevant solution revision IDs: SR-001–SR-011
- Relevant architecture-review revision IDs: ARCH-REV-005, ARCH-REV-006
- Relevant implementation revision IDs: IR-001–IR-004
- Relevant API/E2E revision IDs: API-REV-001 (D-11 affected-scope validation was put on hold by SR-009)
- Relevant delivery revision IDs: DR-001, DR-002
- Prior authoritative result: `Pass` (CRR-004 for D-11, now superseded)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - **D-12:** an exact revert of IR-003. There is no diff against `989f31780` in the four server files, and no `context_reading_reset` remains. The upstream test is adapted to "reading kept".
  - **D-13:** an owned marks module (pure read, exact-run revision); a trigger on newly completed operations only; panel scoping by runtime and by the card's run.
  - **Ordering and replay:** checked against the code. Egress coalesces only content, so compaction status and token usage keep their order. There is no connect-time compaction replay.
  - **D-9 refetch fix:** the standalone roll-up refetch now keys on the host's exact `revision`.
  - **Reviewer rerun:** web 68 pass; server 74 files pass; typecheck 0 errors.
- Supported product scenario / material-premise basis changes:
  - BEH-005 is now per D-12, and AC-012 is added.
  - C-11 is recorded as an earlier review gap. My CRR-001 search for consumers of the old freshness key (`stores/`, `services/`, `components/`) did not cover `composables/`, so a standalone panel would stay stale after a Codex reading-only save or a Claude remainder.
  - C-12 (ordering) and C-13 (replay) are rejected as not reachable. C-14 (store size) is a non-blocking note tied to follow-up R-3.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| C-11 (review gap, not raised in CRR-001) | Undetected | Resolved | IR-004, `d6a89cbdd` | `useTokenUsageWorkspaceScope.ts` watches the host `revision`; a panel test fails under the old `usageReportCount` rule (mutation-checked by the implementer); no other freshness consumer of `usageReportCount` remains in `autobyteus-web` |

- New or remaining finding IDs: None open. C-14 is a non-blocking note.
- Material score or classification changes: none (9.3 / 10). Large / High preserved.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (validation); `/software_engineering_team/implementation_engineer` (informational)
- Remaining risks or uncertainty:
  - RR-7: the note can clear early, which is accepted.
  - The note is a live-session hint only.
  - AC-011 and AC-012 user checks are pending.
  - Delivery's integration remains unpushed.

### CRR-006 — Failure origin: D-13 note cleared by the Claude manual-compaction remainder

- Canonical review report updated: `code-review-report.md` § Round 5 (failure-origin)
- Review entry point and round: API/E2E Failure-Origin Review, round 5
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` § Round 2 (API-REV-002); F-API-002-01 / DESK-004d; REQ-012 / AC-012
- Relevant solution revision IDs: SR-009–SR-011
- Relevant architecture-review revision IDs: ARCH-REV-006
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: DR-002
- Prior authoritative result: `Pass` (CRR-005)
- Current authoritative result: `Fail` — `Design Impact`
- What changed in the review result and why:
  - The failure is confirmed against code. A completed manual `/compact` on Claude marks the run at revision R. The reading-less turn-end remainder (`reconcileClaudeSdkResult`, which saves on every result) publishes R+1 about 8 ms later, and the D-13 rule "any newer exact-run revision clears" removes the note before it renders.
  - The cause is systematic: a manual compaction turn has no main-loop call, and the summariser emits no stream events (P3).
  - IR-004 matches D-13 exactly, so this is not an implementation defect. The D-13 Trigger premise and RR-7's "rare" classification are wrong for a supported scenario.
- Supported product scenario / material-premise basis changes:
  - Claude manual `/compact` is classified as a Supported Normal Scenario. Basis: the chat input, the SDK-native command, and production `ClaudeCompactionOperationTracker` ownership.
  - The RR-7 premise is reclassified from "rare" to "every completed manual Claude compaction".

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CRR-005 acceptance of RR-7 | Accepted residual | Reopened as a review gap (not an implementation finding) | ARCH-REV-006 RR-7; D-13 § Trigger | The source facts were available at CRR-005: result saves always bump the revision, and `/compact` turns have no main-loop call. My C-12 analysis covered only the reverse ordering |

- New or remaining finding IDs: F-API-002-01 (Design Impact)
- Material score or classification changes: no scorecard in a failure-origin round. Classification Large / High preserved.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - Claude auto-compaction note path not executable in the app.
  - Live AGY blocked by quota.
  - DESK-004d UI evidence is a single retained sample; the conclusion rests on the trace plus a deterministic code path.

### CRR-007 — D-13 call-count rule verified; null-baseline gap remains

- Canonical review report updated: `code-review-report.md` § Round 6
- Review entry point and round: Implementation Review, round 6
- Review scope: `Targeted Delta Review` of `3f5963143..d35a1e5cc`, limited to the D-13 marks owner and its specs
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-005); F-API-002-01, CRR-006
- Relevant solution revision IDs: SR-012, SR-013
- Relevant architecture-review revision IDs: ARCH-REV-007, ARCH-REV-008
- Relevant implementation revision IDs: IR-005
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: DR-002
- Prior authoritative result: `Fail` — Design Impact (CRR-006)
- Current authoritative result: `Fail` — Design Impact (CR-F-002)
- What changed in the review result and why:
  - The call-count clear rule is correct when the exact-run baseline exists, and resolves the DESK-004d shape. My reviewer rerun passes (68).
  - Remaining gap: a standalone host's exact summary is hydrated only by live events. A Claude `/compact` that is the first token event of the app session therefore marks with a `null` baseline, and the remainder's first summary clears it.
  - The store spec "keeps a mark made before any exact summary until the first one arrives" asserts this clearing.
- Supported product scenario / material-premise basis changes: added the reopened standalone Claude run with `/compact` as the first action, classified as a Supported Normal Scenario.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-API-002-01 | Open (Design Impact) | Resolved when an exact baseline exists; still occurs with a null baseline (now tracked as CR-F-002) | SR-012, IR-005 `8dd8fdf3e` | Store and panel specs: a remainder with the same count keeps the note, and the next counted call clears it. The mutation back to `revision` fails 4 cases (per the implementer) |

- New or remaining finding IDs: CR-F-002 (Medium, Design Impact)
- Material score or classification changes: Runtime Correctness and API/E2E Readiness fall below 9.0 for this round because of CR-F-002. Large / High preserved.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: RR-7 (narrowed, accepted).

### CRR-008 — Event-sourced compaction mark; CR-F-002 resolved

- Canonical review report updated: `code-review-report.md` § Round 7
- Review entry point and round: Implementation Review, round 7
- Review scope: `Targeted Delta Review` of `d35a1e5cc..3205b12f6`, limited to the D-13 marks owner and its two live store entry points
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-006); CR-F-002
- Relevant solution revision IDs: SR-014
- Relevant architecture-review revision IDs: ARCH-REV-009
- Relevant implementation revision IDs: IR-006
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: DR-002
- Prior authoritative result: `Fail` — Design Impact (CRR-007)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The mark is a boolean, cleared only by the run's own live `reports_model_call: true` event. No baseline is needed.
  - I verified that the flag survives the standalone, team and presentation paths.
  - The ordering premises for native, Claude and Codex/AGY hold, and child isolation is tested.
  - Reviewer rerun: 68 pass.
- Supported product scenario / material-premise basis changes: none. The reopened standalone Claude `/compact` scenario is now covered by a test.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-F-002 | Open (Medium, Design Impact) | Resolved | SR-014, IR-006 `c0f1b9a80` | Store case "keeps a mark made with no exact summary loaded through a remainder event and a fetched summary"; Team and child cases; mutations (clear regardless of the flag; no team clear) fail, per the implementer |
| F-API-002-01 | Resolved with a loaded baseline (CRR-007) | Resolved | IR-006 | A remainder event with `false` never clears |

- New or remaining finding IDs: None. C-14 (store size) is a non-blocking note.
- Material score or classification changes: back to 9.3 / 10, with every category ≥ 9.0. Large / High preserved.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`; `/software_engineering_team/implementation_engineer` (informational)
- Remaining risks or uncertainty: RR-7 (accepted); the Claude auto-compaction note path is not executable in the app (API-REV-002).

### CRR-009 — Proportional test-code review after API-REV-003 passes

- Canonical review report updated: `api-e2e-test-review-report.md` § Round 2. `code-review-report.md` is unchanged; CRR-008 remains authoritative for source.
- Review entry point and round: Successful API/E2E test-code review, round 2
- Review scope: `N/A` (test review). Two durable paths changed since API-REV-001: `autobyteus-compaction-token-reading-live.e2e.test.ts` (added) and `token-usage-runtime-graphql.e2e.test.ts` (window fix).
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` § Round 3 (API-REV-003, Pass, 94%); LIVE-006, DESK-005a–e
- Relevant solution revision IDs: SR-010–SR-014
- Relevant architecture-review revision IDs: ARCH-REV-005–ARCH-REV-009
- Relevant implementation revision IDs: IR-004–IR-006
- Relevant API/E2E revision IDs: API-REV-002, API-REV-003
- Relevant delivery revision IDs: DR-002
- Prior authoritative result: `Pass` (CRR-008)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The new native live suite asserts the AC-011 facts and the event order D-13 still depends on: the summary call reports a model call and is saved before `completed`.
  - The window fix removes a real ordering flake.
  - Non-blocking: stale comment wording about the superseded revision rule in the new suite's header.
  - The pre-existing standalone roll-up child-call refresh observation is forwarded as a separate-ticket candidate.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None. No test-review findings were open.

- New or remaining finding IDs: None
- Material score or classification changes: None. Large / High preserved.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - Failed Claude compaction was not reproducible in round 3; it was proven in round 2.
  - The Claude auto-compaction note path cannot run in the app.
  - Live AGY is quota-blocked.
  - RR-7 is accepted.
  - TESTING.md is missing the live gates.
  - AC-011 and AC-012 user checks are pending.
