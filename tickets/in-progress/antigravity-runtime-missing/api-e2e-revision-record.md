# API/E2E Revision Record
The canonical coverage investigation and execution report remain authoritative; this history is a delta locator.

## Revision Index
| ID | Trigger / upstream | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- |
| API-REV-001 | Implementation Complete / IR-001 / approved SR-003 | N/A / N/A | Fail (API-ENV-001) / 92.1% |
| API-REV-002 | CRR-001 confirmed Local Fix / cc001b07c | Fail / 92.1% | Fail, unresolved impact/disposition / 92.1% |
| API-REV-003 | User browser retest / SR-005 | Fail / 92.1% | API-008 Pass; overall Fail (historic incident hold) / 92.1% |

## API-REV-001 — Initial Version-Independent AGY Validation
- Round 1, 2026-09-27; triggering implementation-handoff.md / IR-001, source f590519ec and handoff 95637e21d. Related SR-003; ARCH-REV/CRR/DR N/A — not applicable. Triggering finding IDs N/A (initial baseline).
- Initial investigation, ledger and final execution report created in this ticket. Prior result/confidence N/A; no prior round inferred.
- API-001–006 all functionally pass. Focused backend 87, broad runtime final 68, frontend 19, controlled transport 2, installed factory restore 1, live tools/skill 2. Counts overlap discovery; do not sum as unique tests.
- Durable updates: agy-restore-live.test.ts (immutable bytes, current evidence, cleanup); codex-app-server-client.test.ts (strict env value assertion instead of obsolete reference equality). No source changes/removals. Initial Codex failure resolved within this round; evidence retained.
- Broader validation Required and completed: real installed 1.2.12 create/restore, workspace tools/skill, built API and unchanged rendered team selector with model and enabled launch draft.
- New finding API-ENV-001: initial owned backend inherited production SQL URL despite temporary data-dir. Stopped on detection, user notified, reran with explicit isolated SQL target. No pending schema migration logged, but absence of prior snapshot means zero SQL side effects unproven. Corrected rerun does not imply no original impact.
- Final score mean 92.1%; environment 75% prevents Pass; no AGY source defect identified. Result Fail / Local Fix (API-owned environment), pending focused failure-origin review. Medium/Low direct classification retained; this is not successful-test review or delivery.
- Cleanup complete for owned local processes/temp data, logs retained; provider synthetic metadata may remain. Installed app process not restarted/patched; production DB non-impact not claimed.
- Prior failure resolution: None (no prior completed round). Within-round Codex assertion resolved, initial browser harness retries resolved, API-ENV-001 unresolved.
- Canonical files: api-e2e-coverage-investigation.md; api-e2e-test-case-ledger.md; api-e2e-execution-coverage-report.md. Evidence: evidence/api-e2e/environment-incident.md and referenced logs/JSON/screenshot.
- Recommended recipient: Code Reviewer for focused failure-origin review; exact route subject to get_handoff_rules.

## Applied Handoff Rule
get_handoff_rules returned the failure-origin condition for completed failed validation. Selected sole recipient `/code_reviewer`; Medium/Low successful Delivery rule does not apply. Complete package and API-ENV-001 evidence attached for focused failure-origin review, not successful-test review. Validation/test/evidence commit 1499c590d; no push/release.

## API-REV-002 — Confirmed Origin Reconciliation / Informed Disposition Needed
- Trigger: Code Reviewer code-review-report.md and code-review-revision-record.md, CRR-001 / cc001b07c, finding API-ENV-001. Related SR-003, IR-001; architecture review/DR N/A. Medium/Low unchanged.
- Prior Fail / 92.1%; current **Fail / 92.1%**, environment 75%. Seven final scores unchanged: 95,95,95,75,95,95,95. No uplift for documentation or possible future acceptance.
- Prior-failure resolution: origin confirmed Local Fix/API-owned; containment and corrected isolation evidence reused; incident/report corrected for conditional coverage upsert, DB-associated vault/key bootstrap and application-data migrations. Actual conditional writes, non-impact and loss remain unproven. No technical closure.
- API-007 retained-source/log reconciliation complete. API-001–006 existing functional Pass evidence reused without full rerun; no source/test edits, production access, secret inspection/copy, backend start or recovery. Added future prelaunch checklist and retained-evidence hashes; checklist not claimed as executed retroactively.
- Canonical investigation, ledger, execution report and incident updated; incident-disposition-request.md created. Original logs retained unchanged. Missing historical pre-state cannot be reconstructed by another safe rerun or current timestamps.
- Current new issue: **Unclear upstream informed disposition**, not an unreviewed execution origin. Route bounded incident to Solution Designer for explicit informed user decision before progression. No inferred acceptance and no automatic preservation-constraint waiver.
- After successful resolution, CRR-001-requested separate proportional durable-test review remains pending; no successful-test/Delivery result here. Preserve this gate and reconcile future returned rules rather than silently using baseline direct-route exemption.
- Remaining risk API-ENV-001: unknown prior production SQL/key/app-data effects. No unauthorized forensic inspection or speculative rollback. No new resources requiring cleanup.

## API-REV-003 — Fresh Isolated Browser-Tool Team Run
- Trigger: exact user instruction relayed by Solution Designer in browser-retest-request.md / SR-005. Requirements SR-003, IR-001, Medium/Low unchanged; CRR-001 and SR-004 hold still apply. Prior API-REV-002 Fail/92.1%.
- Rechecked prior incident status: API-ENV-001 unknown effects remain unresolved; user authorized new execution, not acceptance/production inspection/recovery/release. No duplicate origin review.
- New API-008 Pass: checked dedicated child environment and canonical owned SQL/key/data/memory before server/frontend spawn; fresh root, ports 54253/54254. Real mounted browser tool selected AGY, loaded 14 models, selected Gemini 3.8 Flash (Low), clicked Run Team and sent synthetic prompt. Exact assistant RETEST-AGY-OK rendered, status Idle. Screenshot/DOM/backend/API evidence retained under evidence/api-e2e/retest.
- Source/test delta none; existing branch-built dist/current source reused, no broad suite rerun. Temporary prospective launcher/checklist evidence is not a durable product test. Nonfatal MCP discovery warnings do not invalidate tool-free response but do not prove MCP operations.
- Cleanup: public team termination, tab closure, owned process group stop, port checks, root/db/key/fixtures removal. No production application storage selected, installed backend restart/patch, secret copying or recovery. Provider synthetic metadata may remain.
- Current: focused functional Pass; **overall Fail/92.1%**, all seven final categories unchanged (95,95,95,75,95,95,95). Fresh execution does not close historical non-impact uncertainty. Reports/investigation/ledger updated; no future Pass inferred.
- Remaining API-ENV-001 user disposition and CRR-001 separate proportional durable-test review gate remain pending. Return truthful focused result to Solution Designer/caller; no Delivery/release or duplicate origin inquiry.
