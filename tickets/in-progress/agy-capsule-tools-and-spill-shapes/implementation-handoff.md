# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route (Small / Low); no architecture review
- Requirements doc: `tickets/in-progress/agy-capsule-tools-and-spill-shapes/requirements-doc.md`
- Investigation notes: `tickets/in-progress/agy-capsule-tools-and-spill-shapes/investigation-notes.md`
- Solution revision record: `tickets/in-progress/agy-capsule-tools-and-spill-shapes/solution-revision-record.md` (SR-001, SR-002)
- Design spec (required on every route): `tickets/in-progress/agy-capsule-tools-and-spill-shapes/design-spec.md` (SR-002: "Intended Change")
- Supplemental task artifacts: `solution-designer-handoff.md`, `follow-ups.md`, `evidence/INV-01-capsule-tools-probe.mjs`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence, when applicable: SR-001's list failed live (my Design Impact, `evidence/IMP-03-capsule-tools-variants.log`); SR-002 replaced it

## Current Implementation Summary

The capsule's `tools:` allowlist is unchanged (the CLI's eight registry names). Its comment and the module doc now say these are registry names, that the CLI shows the model `read_file`/`write_file`/`edit_file` for three of them, and that a list naming both a name and its alias fails to start. New: when the CLI's start message carries a `tools` array and an allowlist name is not in it, the factory logs one `AGY_CAPSULE_TOOL_NOT_IN_REGISTRY run=<runId> names=<comma list>` warning; nothing otherwise, never a failure or wait.

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/agy-capsule-tools-and-spill-shapes/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001, SR-002
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): Small
- Architecture risk (`Low`/`High`): Low
- Design classification section / evidence reference: design-spec.md, "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: one constant's comment, one helper and one warning line at start; the start-time call never throws; no data change.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): Direct API/E2E
- Lightweight implementation self-review completed for the direct route: `Yes`
- New design impact or escalation trigger: `None` (the earlier one, SR-001's list, was resolved by SR-002)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 / REQ-001 (AC-001) | allowlist unchanged: eight registry names, no aliases | `capsule/agy-native-tool-policy.ts` | Done; policy unit test (exact eight, unique, no aliases, no `call_mcp_tool`) |
| BEH-001 / REQ-002 (AC-002) | one warning when the start message's `tools` lacks an allowlist name; silent without a `tools` array; never fails | `backend/agy-agent-run-backend-factory.ts` `launch` → `agyNativeToolsMissingFromRegistry` | Done; factory tests: missing (one warning, start completes), all present, no field, non-array |
| BEH-001 (AC-003) | live: `init.tools` holds all eight, no warning; the agent's tools | real `createAgyRunCapsule` capsule + real agy 1.5.15 | Done: `evidence/IMP-04-capsule-live-ac003.log` |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Not touched: the scripted CLI's tool names, the journal, discovery code.

## Key Files Or Areas

`autobyteus-server-ts/src/agent-execution/backends/antigravity/capsule/agy-native-tool-policy.ts`, `.../backend/agy-agent-run-backend-factory.ts`; tests `tests/unit/agent-execution/backends/antigravity/agy-native-tool-policy.test.ts`, `agy-agent-run-backend-factory.test.ts`; doc `docs/modules/antigravity_cli_runtime.md`.

## Important Assumptions

- The start message's `tools` is the CLI's registry (agy 1.5.15); a newer CLI that changes the field's meaning would only produce a warning.
- The warning text is `run=<id> names=<list>` (the designer's message order); the requirements doc writes `names=… run=…`: no test or document depends on the order other than mine.

## Known Risks

- U-1 stays as before: an older CLI's reaction to the unchanged list is what it is today.
- The warning logs at every start of a run while a drift lasts (one line per start).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup
- Reviewed root-cause classification: Missing Invariant (the list was never checked against the CLI's registry)
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): No Refactor Needed
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): Yes, once: SR-001's list failed live; resolved by SR-002
- Evidence / notes: the check sits in the policy module (the owner of the list), the factory only calls it

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: `None`
- Changed source implementation files stayed within size guardrails: `Yes` (factory 176 lines, policy 20)
- Notes: none

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: design-spec.md, "Legacy Removal / Persisted Data"
- Implementation follows the approved decision: `Yes`
- Notes: existing capsules keep their written text; the list is unchanged

## Environment Or Dependency Notes

- macOS, node v22.21.1. The new worktree needed `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild`.
- The live probes ran the real `agy` 1.5.15 against scratch folders under /tmp/s588 with synthetic prompts, and **added small synthetic conversations to the local agy history**. The scratch capsule's `.agents/mcp_config.json` was removed so the dead MCP URL did not matter.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-03 | INV-01 probe with listed variants of the `tools:` line on the real agy 1.5.15 | be6ce32545 (probe only) | macOS, live CLI | no repo code (the SR-001 finding) | SR-001 / SR-002 | Pass (finding) | `evidence/IMP-03-capsule-tools-variants.log` | `five+view_file -> RESULT ERROR: … tool name conflict: multiple tools resolved with name "read_file"` |
| IMP-04 | `node IMP-02-capsule-live-probe.mjs /tmp/s588/real/capsule-path.json` with a capsule from the real `createAgyRunCapsule` | 0f74222c52 | macOS, real agy 1.5.15 | capsule list, CLI registry, agent tools, write/edit/run_command | AC-003 | Pass | `evidence/IMP-04-capsule-live-ac003.log`, `evidence/IMP-02-capsule-live-probe.mjs` | `allowlist names missing from init.tools (the factory warns when non-empty): []`; `TURN 1 ANSWER: read_file, write_file, edit_file, run_command, generate_image, manage_task`; `a.txt: "alpha\ngamma\n"` |
| IMP-05 | `node ./scripts/typecheck.mjs` | 0f74222c52 | macOS, node 22 | all of the server | gate | Pass | `evidence/IMP-05-typecheck.log` | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)` |
| IMP-06 | `pnpm test:unit` | tree of 0f74222c52 (before a test-typing-only edit) | macOS, node 22 | the whole unit suite | AC-001, AC-002, regressions | Pass | `evidence/IMP-06-unit-suite.log` | `Test Files  1078 passed | 5 skipped (1083)`, `Tests  8995 passed | 9 skipped (9004)` |
| IMP-07 | `npx vitest run tests/unit/agent-execution/backends/antigravity` | 0f74222c52 | macOS, node 22 | policy, factory, capsule tests | AC-001, AC-002 | Pass | `evidence/IMP-07-antigravity-unit.log` | `Tests  395 passed | 6 skipped (401)` (before the typing edit; the factory file alone after it: 31 passed) |

- Not run, and why: the gated e2e files (the scripted CLI emits no `tools` field, so the warning cannot show there; the change touches no e2e path). Left to API/E2E if it wants the transport suite.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: backend start-up check; no rendered frontend.

## Downstream Coverage Hints / Suggested Scenarios

- Start a real Antigravity run through the built server and confirm there is no `AGY_CAPSULE_TOOL_NOT_IN_REGISTRY` line and the agent can read, write, edit and run a command.
- A fake `tools` registry missing one name (the factory unit test shows it) gives one warning and a started run.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Optional live run through the built server (the live probe here used the CLI directly with the real capsule).
