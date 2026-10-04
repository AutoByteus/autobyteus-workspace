# API/E2E Revision Record — standalone-agent-run-root

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer`, `code-review-report.md`, CRR-002 (round 2 Pass) | SR-005 (req SR-002), ARCH-REV-003, IR-002, CRR-002 | N/A | Fail / 86% |
| API-REV-002 | `code_reviewer`, `code-review-report.md`, CRR-004 (round 4 Pass, CR-002 fix) | IR-003 (`782ec9f11`), CRR-003, CRR-004 | Fail / 86% | Fail / 87% |
| API-REV-003 | `code_reviewer`, `code-review-report.md`, CRR-006 (round 6 Pass, F-02 fix) | SR-006, ARCH-REV-004, IR-004 (`eccea069b`), CRR-005, CRR-006 | Fail / 87% | **Pass / 93%** |
| API-REV-004 | `code_reviewer`, CRR-008 (delivery re-entry DR-001) | DR-001, IR-005 (`3c7b62f53`), merge `1195f4356`, CRR-008 | Pass / 93% | **Pass / 93%** |
| API-REV-005 | User request (real app quit/relaunch, own package, all root types) | head `e43b5dc27` (docs-only since API-REV-004) | Pass / 93% | **Pass / 95%** |

## Revision Entries

### API-REV-001 — Baseline: AC-001 live gate passes; AC-007 fails on standalone collaborator pages

- Triggering role, report path, and round: `/code_reviewer`, `…/code-review-report.md`, CRR-002.
- Triggering finding or case IDs: none (first validation). The reviewer's coverage list was items 1–8.
- Related revision IDs: SR-005, ARCH-REV-003, IR-002, CRR-002.
- Why recorded: first completed API/E2E validation result.
- Coverage decisions or durable test paths changed: none. The predecessor E2E suites are unchanged; no durable tests were added.
- Cases: AE-01 to AE-11 plus static checks (see the ledger).
- Commands, environment, fixture, or broader-validation delta (baseline):
  - live Claude + Codex suites;
  - a temporary live probe;
  - the TESTING.md dev stack with pre-change data seeded on the clean base;
  - Playwright/CDP trusted input on an owned headless Chrome;
  - full server and web comparisons by test identity against the clean base.

#### Prior Failure Resolution

None.

- Canonical artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-evidence/`.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 86%.
- New or remaining failure IDs: **F-01**, AC-007 on standalone collaborator pages. The web routes the child page to the plain-run page query, which the server rejects. The routing is pre-existing.
- Recommended owner: `implementation_engineer` (preliminary `Local Fix`), via the failure-origin review by `code_reviewer`.
- Remaining risks, blocked evidence, or untested scope:
  - **O-01:** LE-O1 Codex Org termination was not accepted once (1 of 3 branch runs; base 2 of 2). Not reproduced.
  - **CG-05:** child-only usage reaches the open panel only on the next host report. This is held, not required.
  - Not run: AGY/Grok/LM Studio, the live Team-run member earlier page, and LE-F1 on Codex.

### API-REV-002 — F-01 resolved; O-01 reclassified as F-02 (Org Stop on Codex)

- Triggering role, report path, and round: `/code_reviewer`, `…/code-review-report.md`, CRR-004.
- Triggering finding or case IDs: F-01 (CR-002); rerun of AE-10 and AE-06.
- Related revision IDs: IR-003, CRR-003, CRR-004.
- Why recorded: the rerun after the F-01 fix, plus a reclassification of O-01 based on new frequency evidence.
- Coverage decisions or durable test paths changed: none by API/E2E. The fix owner added 3 web specs.
- Cases rechecked or added:
  - AE-10 rerun live (collaborator, host, collaborator-Team member);
  - AE-06 rerun;
  - O-01 frequency sampling (branch 10, base 12) and a temporary diagnostic, now reverted.
- Commands, environment, fixture, or validation delta:
  - pre-change data re-seeded on the clean base;
  - branch dev stack;
  - Playwright/CDP trusted input;
  - LE-O1 Codex runs repeated with `-t`.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-01 / AE-10 (AC-007, collaborator earlier page) | Local Fix (CR-002) | **Resolved.** The collaborator page uses `GetAgentRunCollaborationMemberEventMonitorActiveTracePage` and renders "From General Agent:" for the old and new headers. The host page passes; the Team member page resolves | `browser/r2-*`, `r2-ae10-team-member-page.json` |
| O-01 / AE-03 LE-O1 Codex | Residual risk | **Reclassified F-02 (Fail).** Branch 3 of 10 fail; base 0 of 12. Reason: the fence's Codex interrupt hits RPC -32600 "no active turn to interrupt" → `RUNTIME_COMMAND_FAILED` on every retry | `r2-o01-*.log`, `probes/tmp-o01-diagnostic.diff` |

- Canonical artifacts updated: the investigation (§ Round 2 Delta), the execution report (round 2), the ledger (#24–#33).
- Prior result and confidence: Fail, 86%.
- Current result and confidence: Fail, 87%.
- New or remaining failure IDs: **F-02**.
- Recommended owner: failure-origin review by `code_reviewer`. Preliminary `Unclear`, with `implementation_engineer` likely.
- Remaining risks, blocked evidence, or untested scope: CG-05 (held); AGY/Grok/LM Studio not run; the configured-Team member earlier page was not driven live.

### API-REV-003 — F-02 resolved; AC-001 gate passes on Claude, Codex (+AGY); Pass

- Triggering role, report path, and round: `/code_reviewer`, `…/code-review-report.md`, CRR-006.
- Triggering finding or case IDs: F-02 (AE-03 LE-O1 Codex); ARCH-REV-004 N-1 rerun list.
- Related revision IDs: SR-006, ARCH-REV-004, IR-004, CRR-005, CRR-006.
- Why recorded: the rerun after the F-02 fix.
- Coverage decisions or durable test paths changed: none by API/E2E.
- Cases rechecked:
  - LE-O1 Codex ×10 consecutive;
  - AC-001 suites on Claude and Codex, plus AGY (Grok attempted);
  - full server vs base;
  - F-4 warning census.
  - Carried forward: AE-06 through AE-11 (unchanged paths).
- Commands, environment, or validation delta: none beyond round 2. Grok was pinned with `GROK_E2E_MODEL=grok-4.7` for its rerun.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-02 / AE-03 LE-O1 Codex (Org Stop) | Unclear → SR-006 design fix | **Resolved.** 10/10 consecutive + 1/1 in the full suite; 0 F-4 warnings; server 0 new failures | `r3-le-o1-codex-*.log`, `r3-ae03-aic-codex.log`, `r3-ae05-server-compare.txt` |

- Canonical artifacts updated: the investigation (§ Round 3), the execution report (Round 3 Summary), the ledger (#34–#42).
- Prior result and confidence: Fail, 87%.
- Current result and confidence: **Pass, 93%**.
- New or remaining failure IDs: none.
- Recommended owner: `/code_reviewer` (proportional review; no API/E2E durable test changes).
- Remaining risks:
  - CG-05 (held);
  - Grok model/catalog unreliability on both sides;
  - LM Studio not run;
  - the live rejection-to-quiescence path not observed (unit-proven);
  - `agent-run.ts` at 498 effective lines;
  - the TESTING.md path sync (delivery).

### API-REV-004 — Delivery re-entry DR-001: native harness green; merge spot-checked; Pass

- Triggering role, report path, and round: `/code_reviewer`, CRR-008. Delivery `delivery-revision-record.md` DR-001.
- Triggering finding or case IDs: DR-001 (`pnpm test:native-input-history` could not resolve the moved root fixture).
- Related revision IDs: IR-005, CRR-008, merge `1195f4356`.
- Why recorded: a scoped rerun after the delivery integration and the harness import fix.
- Coverage decisions or durable test paths changed: none by API/E2E.
- Cases:
  - DR-001 harness (branch + base);
  - full server and web vs base;
  - live mention-suite spot-check, with a same-conditions upstream comparison.
- Delta: the merge brought upstream Claude compaction source changes (`307d0e775`), not only docs, so I spot-checked the server, web and live paths.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| DR-001 (delivery: native harness import) | Local Fix (IR-005) | **Resolved.** 2/2, guard passed, 12 base-identical warnings | `r4-native-input-history*.log` |

- Prior result and confidence: Pass, 93%.
- Current result and confidence: **Pass, 93%**.
- New or remaining failure IDs: none.
- Recommended owner: `/code_reviewer` (proportional test review → delivery).
- Remaining risks:
  - upstream live-model flakiness in the mention suite. It occurs on `1b9739cad` without this branch: Claude DI-001 lead handoff timeouts and Codex first-turn tool-call timeouts;
  - CG-05;
  - Grok and LM Studio;
  - `agent-run.ts` at 498 effective lines;
  - `TESTING.md:222` (delivery).

### API-REV-005 — Real desktop app quit/relaunch and crash relaunch with an imported test package; Pass

- Trigger: the user asked for a test that shuts the application down, restarts it and continues the conversations, using our own agent package (individual agent, Agent Team, Agent Org, collaborators) on one runtime.
- Delta: no code change. The surface is new: an isolated desktop app built from the worktree.
- Coverage decisions: no durable test changes. The test package is retained as a fixture: `api-e2e-evidence/r5/sar-test-agents/`.
- Cases: R5-A through R5-G (ledger #50–#60), all Pass.

#### Prior Failure Resolution

None.

- Prior result and confidence: Pass, 93%.
- Current result and confidence: **Pass, 95%**.
- Remaining risks:
  - Org list refresh after import;
  - ERROR-level missing-trace logs at Team/Org creation;
  - acronym title-casing in sender labels;
  - CG-05;
  - Grok and LM Studio;
  - `agent-run.ts` at 498 lines.
