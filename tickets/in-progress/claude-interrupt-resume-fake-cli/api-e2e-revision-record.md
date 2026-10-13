# API/E2E Revision Record

## Revision Index
| Revision | Trigger | Related upstream | Prior result/confidence | Current result/confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | IR-001 initial validation / round 1 | SR-001, SR-002, IR-001 | N/A | Fail / 75.8% |
| API-REV-002 | CRR-001 Local Fix / round 2 | SR-001, SR-002, IR-001, CRR-001 | Fail / 75.8% | Pass / 97.5% |

## API-REV-001 — Public Query Repair Exposes Incomplete MCP Cleanup Double
- Triggering role/report: Implementation Engineer, implementation-handoff.md; source 1f01e802, upstream artifacts checkpoint 40f993916c.
- Baseline history: no previous completed API result. Initial missing Query method no longer fails. Newly observed API-F001 affects all eight target cases, package AC-001/004 and REQ-005.
- Coverage decisions: original target assertions valid, file now Needs Update only for deficient MCP authority dependency. No durable API edit applied. Lifecycle units Still Valid; client/session regression group and typecheck independently planned, not executed before failure-origin route.
- Executed LIFE-001 17 passed; target-1 and serial target-2 each 8 failed/1 skipped, exit 1, no unhandled markers. All error trees contain missing deactivateForRun and retained-session assertion only. API-CL01..04 frames retained. No physical child/IO/body assertion failure.
- Execution correction/limit: target-1 accidentally overlapped tail of lifecycle; explicit fresh serial target-2 reproduced same defect, first target not clean serial proof. No overlap hidden or source assertion changed.
- Temporary execution methods: ticket-only clean-env/resource wrapper and per-case reporter; no modified test/probe source. Gates absent, private HOME/TMPDIR removed; resources observed clean except manager component failure intentionally retains exact session in dying test process.
- Broader validation: Not Required for conclusive local fixture failure-origin investigation; repository rework/rerun/regressions/probes still required. Paid inference/browser/desktop would not fix missing mock method.

### Prior Failure Resolution
None — first API round. Upstream missing initializationResult was a solution/implementation finding, not a prior API pass/fail history.

- Canonical investigation/report/ledger completed and reconciled.
- Prior result/confidence: N/A. Current: **Fail / 75.8%**. Failure: **API-F001**.
- Preliminary Local Fix recommended owner: API/E2E test fixture, subject to Code Reviewer focused origin/owner confirmation. No production change made or authorized.
- Remaining scope: target cleanup fails; broad regressions/typecheck/three operational probes and acceptance repeats after repair; live inference/other OS excluded; Delivery integrated rerun/user verification/merge/push pending, no release requested.
- Route: get_handoff_rules failure-origin review to /software_engineering_team/code_reviewer; successful Small/Low test-code review remains Not Required — direct low-risk route, not applicable to this failure request.


## API-REV-002 — Typed No-Exposure Authority Restores Exact Session Cleanup
- Trigger: Code Reviewer CRR-001 Fail/Local Fix, code-review-report.md and code-review-revision-record.md, independent origin receipt, checkpoint c53d1e85b2. API/E2E owner confirmed; requirements/design/Small-Low unchanged.
- Durable delta: separate baseline fix eff597d4ce1f40f1fbe489a6b9a340d6623e2a77, target file 7 additions/1 deletion only. Current authority type, both required methods, truthful no-entry deactivation 0, remove this shape-hiding cast. Narrow conformance deviation from SR-002 unchanged-double expectation documented, not new product/architecture authority.
- Cases reused: API-CL01..04, WS-INT/BUSY/RACE/BG/LIVE, LIFE-001/REG-001/TYPE-001 and planned PROBE-*; extra TYPE-DELTA focused compile check. No durable case added/removed; 57 current matchers and all original case bodies/live gate unchanged.
- Prior failures rechecked first: target-3 8/1 exit 0; target-4/5 each 8/1 exit 0, target-5 exact acceptance argv without reporter flags. All fresh clean HOME/TMPDIR, serial. Lifecycle-r2 17 passes in 5 files, scoped regressions 109 passes in 4 files, production typecheck exit 0, focused compile zero introduced diagnostics/same 7 baseline limitations.
- Broad validation: Required Lifecycle after post-repository 94.2% confidence; final 3 operational harness probes pass and close body/cleanup/setup error-preservation/private-cwd gap. Final 97.5%, every executable critical AC proven, no category below 90%.

### Prior Failure Resolution
| Prior case / finding | Previous classification | Current resolution | Evidence |
| --- | --- | --- | --- |
| API-F001 — all 8 ungated target cases, API-REV-001 | CRR-001 Local Fix / test fixture | **Executably resolved**, exact MCP component/session cleanup now passes; reviewer repair-review closure pending | eff597d4ce; target-3/4/5 logs/events/resource receipts; repair patch and preservation inventory |
| First-round target/lifecycle overlap limitation | Execution deviation, not product finding | Current lifecycle and all target runs completed serially, no current result depends on overlap | lifecycle-r2 and target-3/4/5 timeline in ledger/receipts |

### In-flight temporary probe correction
Initial PROBE-SETUP failed because observation required session during normal pre-create close(empty). Preserve logs; corrected only temporary observer to guard existence/delegate real calls. Reran unresolved setup first (1 pass/2 name exclusions), full group 3 pass; all 3 cwd removed, sibling removed. Not a product/target defect; no original assertion weakened. Same API round, no separate completed failure result inferred.

- Canonical investigation/report/ledger updated in place and reconciled; prior API-REV-001 history unchanged.
- Prior result/confidence **Fail / 75.8%**; current **Pass / 97.5%** (post-repository 94.2% → final 97.5%). No unresolved in-scope failure or external dependency.
- Remaining limits: live paid case skipped, other OS not certified, 7 baseline focused test-typing diagnostics excluded; Delivery integrated rerun/user verification/merge/push not complete, release not requested.
- Return: separately requested proportional repair test-code review required by CRR-001 failure-rework workflow. Initial Small/Low policy remains Not Required — direct low-risk route; generic Delivery condition not satisfied while repair review pending, so return to requesting Code Reviewer when no matching handoff rule. No Delivery handoff yet.
