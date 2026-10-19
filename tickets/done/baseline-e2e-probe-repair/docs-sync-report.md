# Docs Sync Report — `baseline-e2e-probe-repair`

## Scope

- Ticket: `baseline-e2e-probe-repair` (Project Task `6834441c`), `task_size=Medium`, `architectural_risk=Low`, route `Direct Low-Risk` (architecture, source and test-code review `Not Applicable`)
- Trigger: API/E2E pass `API-REV-001` (95.4%) from `/software_engineering_team/api_e2e_engineer`
- Bootstrap base reference: `origin/personal` `516e592d7b`
- Integrated base reference used for docs sync: `origin/personal` `de532ceb43`, merged into `codex/baseline-e2e-probe-repair` as `cb7ceb8bc4`
- Post-integration verification reference: `evidence/delivery/post-integration-server-e2e.log` (7 files / 26 tests passed, clean env)

## Why Docs Were Updated

- Summary: no long-lived doc was changed in this ticket. The ticket is test-only. Its Scope Guardrail excludes "docs other than test-file headers", and critical AC-012 requires the branch diff to show only test files and one `package.json` script. One long-lived doc now overstates the memory-sync e2e coverage. It is recorded below as follow-up **FU-6**, with the proposed text, for the agent that manages the project's Tasks.
- Why this should live in long-lived project docs: N/A (no doc change made in this ticket).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/memory_sync.md` (Validation Coverage, line ~246) | Describes what `memory-sync-multiprocess.e2e.test.ts` covers; this ticket removed MP_001/MP_002 (DEC-003) | `Needs follow-up` (FU-6) | Product behavior described elsewhere in the doc is unchanged and still accurate. Only the coverage sentence overclaims: "covers both-path replacement eligibility plus no-delete retention, and proves the imported semantic member still resolves only through the canonical V2 target" was proven by the removed nested-layout cases and the removed second incremental `startMemorySync`. |
| `autobyteus-web/docs/chat.md` (Tests, `run-settings-live` probe) | R03 trigger changed (DEC-006) | `No change` | The probe summary (Agent/Team/Org Run, overrides, saved-run flows; needs Chrome, logged-in CLIs, prior server build) is still accurate; R03 is not described there. |
| `TESTING.md` (surfaces table) | New `test:e2e:interrupt-result-presentation` script | `No change` | The table names probes generically as `pnpm -C autobyteus-web test:e2e:<name>`, so the new script is covered. |
| `autobyteus-web/README.md` (probe script list) | New script | `No change` | The list is a selection, not a catalog. `existing-run-model-config` and `run-settings-live` are not listed there either. |
| `autobyteus-web/docs/agent_execution_architecture.md`, `settings.md` (interrupt result) | The interrupt-result probe was repaired | `No change` | They describe product behavior, which is unchanged; no probe reference to update. |
| `autobyteus-server-ts/tests/fixtures/app-data-migrations/team-run-execution-tree-v1/README.md` | Known drift | `Needs follow-up` (existing FU-5) | Already recorded by the Solution Designer. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| None | — | — | Scope Guardrail and AC-012 (see above) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Why the nested memory-sync layout cases were removed | Current Team V2 cannot hold a Team inside a Team, so the flat member directory is canonical and there is no layout to repair | `design-spec.md` DEC-003 | Test-file header of `memory-sync-multiprocess.e2e.test.ts` (in scope, already committed) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| MP_001 / MP_002 nested-layout cases in `memory-sync-multiprocess.e2e.test.ts` (incl. the second incremental `startMemorySync`) | Nothing (flat Team + standalone single sync and read-back remain) | Test-file header; FU-6 / OBS-2 for the doc and the coverage gap |

## Follow-Up FU-6 (docs, for the agent that manages the project's Tasks)

- File: `autobyteus-server-ts/docs/features/memory_sync.md`, Validation Coverage, the `memory-sync-multiprocess.e2e.test.ts` bullet.
- Proposed text: "starts two real backend server processes with isolated app-data directories, configures the hub and source through HTTP GraphQL, validates saved-mode connection testing, runs one source-to-hub sync over HTTP, asserts imported standalone and flat Team files and the sync manifest on the hub filesystem, and reads them back through the IMPORTED Memory Explorer source (sources, agents, Team runs and the Team member memory view)."
- Pair it with OBS-2 (no e2e now covers a second, incremental cross-process `startMemorySync`) if a coverage task is opened.

## No-Impact Decision

- Docs impact: not `No impact`. There is one in-ticket-unfixable inaccuracy (FU-6); every other reviewed doc is accurate.
- Rationale: see the table above.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, ticket archive, repository finalization.
- Notes: FU-6 and OBS-2 are non-blocking and go to the Solution Designer in the terminal message for routing with FU-1..FU-5.
