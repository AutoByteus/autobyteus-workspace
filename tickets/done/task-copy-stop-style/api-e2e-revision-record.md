# API/E2E Revision Record — task-copy-stop-style

## Revision Index
| Revision | Trigger | Upstream revisions | Prior result / confidence | Current result / confidence |
|---|---|---|---|---|
| API-REV-001 | Implementation / implementation-handoff.md IR-001; round 1 | R1, SR-001, SR-002, IR-001; ARCH-REV/CRR/DR N/A | N/A | Pass / 95% |

## API-REV-001 — Initial validated sidebar Stop presentation
- Initial baseline after completed coverage investigation; direct Small / Low route retained. No triggering failure IDs or previous API result inferred.
- Durable coverage updated: autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs DCP-001/002. Actual parent/copy CSS, keyboard/pending, exact wire target, Task-open readback and immediate ledger events added. Existing cases/model-edit/resume retained; no removals.
- UNIT-001 16/16 Pass; ROW-001 20/20 Pass; current server build/bootstrap Pass; DCP-001/002 2/2 Pass, zero browser page errors. Probe syntax/diff checks Pass. API-run failures None; no rerun required.
- Broader validation Required and Completed: isolated current-build Nuxt/backend/Chromium with scripted runtime, clean outer HOME/env, own SQLite/ports. Pending request only delayed, not replaced. Both parent survivals and Task TODO/closed=false retained, copy stopped and resumed. Confidence 81.4% repository → 95% final.
- Prior Failure Resolution: None. Upstream implementation's preview setup retry remains in IR-001 evidence, not an API failure. Old-token component negative control retained as regression proof.
- Canonical investigation, execution report (Acceptance-Criteria Proof), ledger and this baseline updated. Evidence: evidence/api-unit.log, api-row.log, api-build.log, api-browser-1.log, api-browser-1 JSON/30 PNGs/logs, api-cleanup.json.
- Remaining limitations: web-equivalent renderer, not Electron packaging/inference or installed app; Team group expands without selected=true in real journey (component/upstream fixture covers selected prop). No blocker/user-only check; AC-005 final receipt remains Delivery.
- Cleanup browser/services/data/HOMEs verified. SDK build outputs not staged; assigned pnpm shim retained for Delivery. FUP-001 out of scope. Recommended next owner Delivery per direct-route rule; test-code review Not Required — direct low-risk route.
