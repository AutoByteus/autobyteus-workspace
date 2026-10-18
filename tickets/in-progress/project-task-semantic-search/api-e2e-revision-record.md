# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer pass handoff, `code-review-report.md` CRR-002; round 1 | SR-004, SR-006, ARCH-REV-002, IR-002, CRR-002 | N/A | Fail / 87% (requirement proof 50%) |
| API-REV-002 | Code reviewer pass handoff CRR-004 (IR-003); round 2 | SR-007, ARCH-REV-003, IR-003, CRR-004 | Fail / 87% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline validation; the default model's relevance floor fails at 1,000-Task scale

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-002, Pass), round 1.
- Triggering finding or case IDs: reviewer holds C-08 (LEAF-IR floor on a realistic backlog) and C-09 (`listTasks` per search at 1,000 Tasks); RSK-002, RSK-005/RSK-009; packaging smoke.
- Related revision IDs: SR-004, SR-006, ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002.
- Why this baseline was recorded: first complete API/E2E result.
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts` (API-D01). No existing test changed or removed.
- Cases added, changed, removed, or rechecked: API-R01…R08, API-D01, API-L01…L05 (see the execution report's Cases).
- Commands, environment, fixture, or broader-validation delta: packaged macOS arm64 desktop build (isolated instance), Docker image built from the worktree (linux/arm64), 1,000-Task synthetic backlogs plus real product-domain text, all three catalog models at score level.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/`.
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 87% overall (requirement and acceptance-criteria proof 50%).
- New or remaining failure IDs: F-001 (AC-004; AC-001 at 1,000-Task scale) with the default model LEAF-IR.
- Recommended owner: failure-origin review by the code reviewer; preliminary `Design Impact` → Solution Designer.
- Remaining risks, blocked evidence, or untested scope: Windows/Linux/macOS x64 desktop packaging and Docker amd64 not built here (release workflow); two pre-existing agent-status WebSocket cadence integration cases fail independently of this change; observations O-1…O-4 in the report.

### API-REV-002 — Rerun by impact on IR-003 (Granite default); F-001 resolved

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-004, Pass), round 2.
- Triggering finding or case IDs: FO-001 / F-001 resolved upstream as SR-007 (Granite default, DEC-011, re-based QR-003/QR-004), O-1 applied; reviewer holds C-12 (thin AC-001 margin) and C-13 (re-based QR measurements).
- Related revision IDs: SR-007, ARCH-REV-003, IR-003, CRR-003, CRR-004.
- Why this revision was recorded: the round-2 result on `9f0df7eab3`.
- Coverage decisions or durable test paths changed: none by API/E2E this round. The implementation changed one line of API-D01 (`DEFAULT_EMBEDDING_MODEL_ID`) and added the scale assertions to the gated quality test.
- Cases added, changed, removed, or rechecked (plan: investigation § Round 2 Rerun Plan):
  - Rerun: API-D01/R05, API-R06 (default model at scale), API-R08, API-L02a, API-L03a, API-L02b, API-L03b, API-L04, API-L03c, API-L02e (QR-002), API-L03d, API-L02f (O-1), API-L02g.
  - Reused: IMP-01 (API-R01), IMP-02 (API-R02/R03), IMP-04, IMP-05.
  - Still valid from round 1: API-R04, API-R07, API-L01, API-L02c/c2/d/h, API-L05.
- Commands, environment, fixture, or broader-validation delta:
  - packaged build of `9f0df7eab3` (`iso-60493-231f`);
  - real-text 1,000-Task backlog in the app (`API-PROBE-add-repo-backlog.mjs`, texts hash `e02495c6df5ad586`);
  - quieter host (load average 12–50).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-001 (API-L04): AC-004 6/12 and 4/12, AC-001 87.3% at 1,000 Tasks with LEAF-IR | Design Impact (failure origin FO-001) | Resolved by SR-007 / IR-003. Granite default: AC-001 96.8% / 93.7% / 92.1%, AC-004 23/24 on all three backlogs; the board shows the no-match state | API-L04, API-R06 |

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (§ Round 2 Rerun Plan, meta), `api-e2e-execution-coverage-report.md` (whole report, latest round), `api-e2e-test-progress.md`, `evidence/` (`*r2*`, `*round2*` files; `probes/API-PROBE-add-repo-backlog.mjs`).
- Prior result and confidence: Fail, 87%.
- Current result and confidence: Pass, 95%.
- New or remaining failure IDs: none.
- Recommended owner: code reviewer (proportional test-code review of API-D01).
- Remaining risks, blocked evidence, or untested scope:
  - C-12: AC-001 margin of 2.1 points on the real-text backlog;
  - C-10: drift of the real-text backlog;
  - Windows, Linux and macOS x64 packaging and Docker amd64 untested;
  - RSK-002 proxy downloads;
  - observations O-2…O-4.
