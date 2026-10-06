# API/E2E Revision Record — run-settings-ui-unification

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report
(`api-e2e-execution-coverage-report.md`) remain authoritative. This record holds the baseline and later deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md`, CRR-003 (held by CRR-004), resumed after CRR-005 | SR-006, SR-010, ARCH-REV-004, IR-003, CRR-005 | N/A | **Fail** / 86% |
| API-REV-002 | Code Reviewer, `code-review-report.md`, CRR-007 (round 4), IR-004 | SR-006, SR-010, IR-004, CRR-006/007 | Fail / 86% | **Fail** / 92% |
| API-REV-003 | Code Reviewer, `code-review-report.md`, CRR-009 (round 5), IR-005 | SR-006, SR-010, IR-005, CRR-008/009 | Fail / 92% | **Pass** / 95% |

## Revision Entries

### API-REV-001 — Baseline: live run-settings validation at `81f9ff178`

- **Triggering role, report path, and round:** Code Reviewer, `code-review-report.md`.
  - CRR-003 (head `c37b81de5`) started the run. It was held after N01–N03 by CRR-004.
  - Resumed by CRR-005 at head `81f9ff178`. Round 1.
- **Triggering finding or case IDs:** the review guardrail AF-009; the SR-010 slices S1–S6; DI-001, DI-002 and DI-004 checks.
- **Related revision IDs:** SR-006 (requirements), SR-009/SR-010 (design), ARCH-REV-003/004, IR-002/IR-003, CRR-003/004/005.
- **Why this baseline was recorded:** the first completed API/E2E result.
- **Coverage decisions or durable test paths changed:**
  - Added `autobyteus-web/tests/e2e/run-settings-live-probe.mjs` (R01–R11) and the script `test:e2e:run-settings-live`.
  - Added N02/N03 to `cross-scope-agent-mentions-live-probe.mjs`.
  - Updated the probe helpers and stale assertions in the menus-open-upward, polish and cross-scope probes.
  - Classified `chat-entry-live` C05/C08/C16/C18 as stale (`Needs Update`), owned by API/E2E on the rerun.
- **Cases added, changed, removed, or rechecked:** WEB and N01–N03 were run at both heads; R01–R11; the migrated probes; VIS.
- **Commands, environment, fixture, or broader-validation delta:**
  - Owned real stacks per probe (Claude SDK `haiku`; Codex `gpt-5.6-luna` for Fast mode).
  - R10 restarts the owned backend with Codex made unavailable.

#### Prior Failure Resolution

None.

- **Canonical artifacts and sections updated:** coverage investigation (all sections), execution coverage report, test-case ledger.
- **Prior result and confidence:** N/A.
- **Current result and confidence:** `Fail`, 86%.
- **New or remaining failure IDs:**
  - F-1 (R04, R05, R10): the "+"/carry start path does not load the copied runtime's model catalog or runtime availability. Copied Thinking/Fast and the display names are not shown, and copies on a disabled runtime are not blocked. The data itself copies correctly.
  - F-2 (cross-scope A01 F-04): the collaborator-view placeholder is now the generic mention placeholder (`Unclear`).
- **Recommended owner:**
  - F-1: `Local Fix` → Implementation Engineer.
  - F-2: `Unclear` → Code Reviewer to classify.
  - All goes through the Code Reviewer's failure-origin review. Probe maintenance → API/E2E on the rerun.
- **Remaining risks, blocked evidence, or untested scope:**
  - `fresh-run-auto-approval` B03–B07 were not reached (Nuxt re-optimization reload).
  - Older live probes are not green because of stale assertions and environment pointer/search issues (no product attribution).
  - VIS states 014/017/022/023/028/029/031/032/034–041 were not captured.

### API-REV-002 — Rerun at `83ab477e4`: CR-004 resolved, probes repaired, new F-3 footer overlap

- **Triggering role, report path, and round:** Code Reviewer, `code-review-report.md`, CRR-007 (round 4). API/E2E round 2.
- **Triggering finding or case IDs:**
  - CR-004 (= API/E2E F-1: R04, R05, R10).
  - CRR-006 items: F-2 (A01 F-04) and the stale or environment probe cases.
- **Related revision IDs:** IR-004, CRR-006, CRR-007; SR-010.
- **Why this revision was recorded:** a rerun after rework.
- **Coverage decisions or durable test paths changed:**
  - `run-settings-live-probe.mjs`: added R12 (DOM footer geometry at 1512/880/804/390) and the same check in R04.
  - `chat-entry-live-probe.mjs`: migrated C05/C06/C08/C16/C18 (REQ-004/005/018, AR-003); C03 picks its model before its search assertion.
  - menus-open-upward: anchor inside the composer (VIS-030); U03 re-hover.
  - Polish, menus and cross-scope probes: shared `openRuntimeList` pointer handling.
  - `fresh-run-auto-approval`: one retry only after a recorded Nuxt dependency reload; the first attempt is kept.
  - Cross-scope A01 F-04 aligned with base's mention-placeholder precedence.
- **Cases added, changed, removed, or rechecked:**
  - R12 added; R01–R11 rechecked.
  - WEB, N01–N03 and A01 rechecked.
  - All migrated probes rechecked.
- **Commands, environment, fixture, or broader-validation delta:** none beyond the probe repairs. Same owned real stacks.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-1 / R04 (copied Thinking/Fast and display name not shown) | Local Fix (CR-004) | Resolved | `run-settings-live-evidence.json` R04 `host` |
| F-1 / R05 (member summary without Fast) | Local Fix (CR-004) | Resolved | R05 `drafter` |
| F-1 / R10 (disabled runtime not blocked on copies) | Local Fix (CR-004) | Resolved | R10 `team`/`org` |
| F-2 / A01 F-04 | Unclear → not caused by this ticket (CRR-006) | Closed; assertion aligned with base | `round2-83ab477e4/cross-scope-mentions/` |
| Stale/env probe cases | Local Fix (API/E2E) | Resolved, except C05's pre-existing server residual | `round2-83ab477e4/*` |

- **Canonical artifacts and sections updated:** execution coverage report (rewritten for round 2), coverage investigation (meta, durable updates), ledger (seq 28–34).
- **Prior result and confidence:** Fail / 86%.
- **Current result and confidence:** **Fail** / 92%.
- **New or remaining failure IDs:** **F-3** (R12, R04). The New chat footer model trigger overlaps the Thinking and Fast chips at 804 and 880 px with a long Codex display name. It was already present at `81f9ff178` and missed in round 1.
- **Recommended owner:** `Local Fix` → Implementation Engineer, through the Code Reviewer's failure-origin review.
- **Remaining risks, blocked evidence, or untested scope:**
  - C05 oracle query hits a pre-existing server Codex client "unresolved cleanup" error; recommend a separate server ticket.
  - The CRR-007 Send-timing residual was not observed.
  - VIS states 014/017/022/023/028/029/031/032/034–041 were not captured.

### API-REV-003 — Rerun at `a92004c9e`: F-3 resolved; card geometry and R13 added; Pass

- **Triggering role, report path, and round:** Code Reviewer, `code-review-report.md`, CRR-009 (round 5). API/E2E round 3.
- **Triggering finding or case IDs:**
  - CR-005 (= API/E2E F-3: R12, R04).
  - The reviewer's request to render the saved-run card with a long model name.
- **Related revision IDs:** IR-005, CRR-008, CRR-009; SR-010.
- **Why this revision was recorded:** a rerun after rework.
- **Coverage decisions or durable test paths changed:**
  - `run-settings-live-probe.mjs`: added settings-card geometry checks.
    - R01: drawer row.
    - R02: Org card and Org member row.
    - R07: saved-run root and member cards, running and stopped, asserted at 880/804; 390 is recorded as an observation.
  - Added R13: VIS-017 tools, VIS-023/028 Org Fast mode row, VIS-014 unavailable.
- **Cases added, changed, removed, or rechecked:**
  - R13 added; R01–R12 rechecked.
  - WEB, N01–N03, polish, menus and `chat-entry-live` C03/C04/C12/C16 rechecked.
- **Commands, environment, fixture, or broader-validation delta:** none.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-3 / R12, R04 (footer overlap at 804/880) | Local Fix (CR-005) | Resolved: no overlap at 1512/880/804/390 | `run-settings-live/run-settings-live-evidence.json` R12/R04 `footer`; `R12-footer-*.png` |

- **Canonical artifacts and sections updated:** execution coverage report (rewritten for round 3), coverage investigation (meta, round-3 updates), ledger (seq 35–39).
- **Prior result and confidence:** Fail / 92%.
- **Current result and confidence:** **Pass** / 95%.
- **New or remaining failure IDs:** none.
- **Observations:**
  - O-1: saved-run cards at a 390 px window; locked values overflow by ≤ 19 px; outside the spec's responsive matrix; `Requirement Gap` candidate.
  - O-2: empty heading on the unavailable page for an unknown or deleted Org; `Unclear`.
  - O-3: "All 1 members".
- **Recommended owner:** Code Reviewer, for proportional test-code review.
- **Remaining risks, blocked evidence, or untested scope:**
  - C05 server residual (separate server ticket candidate).
  - VIS states 022/029/031/032/034/036/037/038 have no live capture; 039–041 are covered by the mocked probe.
