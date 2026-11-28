# Follow-ups

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-002); first noted in `evidence/implementation/IMP-002-checks.md` | The web suite's demo coverage spec (`autobyteus-web/scripts/__tests__/mobileBuildChecks.spec.ts`, autobyteus-584) fails: the mutation `SetUsageLimitSwitchEnabled` (`graphql/mutations/modelRoutingMutations.ts`) is neither answered by the phone demo nor listed in `unreachable-operations.json` | `evidence/api-e2e/API-001-003-suites/web-suite-failures.txt`: `"unanswered": ["SetUsageLimitSwitchEnabled"]`; the mutation is on the base `ea787a37b1` (autobyteus-646) | This ticket changes neither file; the base fails the same way | No | Answer `SetUsageLimitSwitchEnabled` in the phone demo, or list it in `unreachable-operations.json` with its reason, so the demo coverage spec and the whole web suite pass again | |

The web suite's other failure, the fixed-px font audit on `components/settings/nodes/NodeRow.vue` line 39, is already
autobyteus-541's FU-001 (`tickets/done/team-stream-recovery-541/follow-ups.md`); it is not repeated here.
