# Follow-ups

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | API/E2E Engineer, api-e2e-execution-coverage-report.md (API-001); first noted in implementation-handoff.md Observations | The web suite's fixed-px font audit (`autobyteus-web/tests/integration/app-font-size-fixed-px-audit.integration.test.ts`) fails: `components/settings/nodes/NodeRow.vue` line 39 uses `text-[11px]` | the whole web suite on this branch: 817 files passed, 1 failed (this one); the class is on the base `80420a8bf6` unchanged (from `aba07b35e3`, autobyteus-581, WIP) | This ticket changes neither file; the base fails the same way | No | Replace `NodeRow.vue`'s `text-[11px]` with the typography scale's class (or add a reviewed exception), so the font audit and the whole web suite pass again | |
