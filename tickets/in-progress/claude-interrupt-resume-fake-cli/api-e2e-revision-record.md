# API/E2E Revision Record

## Revision Index
| Revision | Trigger | Related upstream | Prior result/confidence | Current result/confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | IR-001 initial validation / round 1 | SR-001, SR-002, IR-001 | N/A | Fail / 75.8% |

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
