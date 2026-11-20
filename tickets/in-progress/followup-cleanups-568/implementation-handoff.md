# Implementation Handoff — followup-cleanups-568 (autobyteus-568): five follow-up cleanups

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/followup-cleanups-568`, branch `codex/followup-cleanups-568` (pushed for the build-only run), base `origin/personal` `01ebb4ddce`. Ticket folder `tickets/in-progress/followup-cleanups-568/`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review not selected (Medium/Low, direct route); Solution Designer's `handoff-implementation.md`.
- Requirements doc: `requirements-doc.md` (REQ-001…005, AC-001…005; DEC-001…004).
- Investigation notes: `investigation-notes.md` (S-01…S-11).
- Solution revision record: `solution-revision-record.md` (SR-001).
- Design spec: `design-spec.md` (SR-001; D-1…D-5).
- Supplemental task artifacts: none.
- Design review report / architecture review revision record: `N/A — not applicable` (direct route).
- Triggering rework report: N/A (initial implementation).

## Current Implementation Summary

- **D-1:** the web's three dead GraphQL documents and the server's dead `approveToolInvocation` mutation are removed, with its types and unit-test case. Generated types are regenerated, and the demo list's entries and "unused" reason are gone.
- **D-2:** the port-inspector deadline case runs a `/bin/sh` child.
- **D-3:** the iOS keys-migration boundary test resolves symlinks.
- **D-4:** the Basics panel spec stubs and asserts its two newer cards.
- **D-5:** a new `select-ios-simulator.py` owns the simulator choice for the release workflow and the smoke, and the contract check guards it.

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Commits:
  - `eb7e4bf2af`: the change and the ticket documents. Every check below ran on it.
  - The next commit adds this handoff, the revision record, FU-003 and the evidence; it contains documents only.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - Scope: 14 files plus the new script, each change local to its owner.
  - The one contract change removes a mutation with no caller. `codegen:check`, both typechecks and the server tests show no hidden caller (R-002).
  - The chooser works on the runner (IMP-10).
  - The escalation trigger did not fire.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below).
- New design impact or escalation trigger: `None`.

### Lightweight self-review

- **D-1, as designed.** Two dead pieces are removed with it:
  - the resolver's `logger.info` and `logger.warn`, which only the mutation used (`logger.error` stays);
  - the test's `getAgentRun` mock and its reset, which only the deleted case used.
  - `restoreAgentRun` and `agentRunCollaborationMemberProjection` stay on the server (FU-001). The web docs saying the web does not call `RestoreAgentRun` stay true and are unchanged.
- **D-2, one deviation from the design's text:** the fixture runs `exec /bin/sleep 5`, not `exec sleep 5`.
  - The suite stubs `PATH` to the fixture folder only (`vi.stubEnv('PATH', root)`), so a bare `sleep` would not be found.
  - The absolute path is the same `exec` of the same program: same pid, no descendant.
  - `script()` gains an `interpreter` parameter (default `process.execPath`), so the other cases are unchanged.
  - Every assertion is kept.
- **D-3, as designed.** Both the root and each URL are resolved, so the two sides stay comparable, including Foundation's handling of `/private`.
- **D-4, as designed.** The `not.toContain('GitHub')` assertion now runs over stubs only.
- **D-5, as designed, with four details:**
  - (a) Only devices in state `Shutdown` or `Booted` count, as the awk copies required.
  - (b) A runtime key must be `com.apple.CoreSimulator.SimRuntime.iOS-…`, so watchOS and tvOS runtimes never match.
  - (c) The error carries `::error::`, as the workflow's did; in the smoke it is just a stderr line.
  - (d) The contract check also runs the chooser against a stand-in `xcrun` and a fixture: the exact name on 27.2 under the 27.2 SDK (not the 27.3 beta runtime, not iPhone 17e), the fallback with its notice, the bound under a 27.0 SDK, and no iPhone.
  - The README describes the chooser.
- **Untouched:** `portOwnerInspector.ts` and its deadline, the update cards' copy, `NativeNodeNameReadsTests.swift`, and the stale probes (FU-002).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001) | Remove the dead documents and the dead mutation | `autobyteus-web/graphql/mutations/agentMutations.ts`, `graphql/queries/collaboratorQueries.ts`, `generated/graphql.ts` (codegen), `demo/graphql/unreachable-operations.json`; `autobyteus-server-ts/src/api/graphql/types/agent-run.ts`, `tests/unit/api/graphql/types/agent-run.test.ts` | IMP-01…IMP-04, IMP-08 (249 compiled operations, all answered or listed) |
| BEH-002 (REQ-002) | The deadline case is deterministic under load; the deadline itself unchanged | `autobyteus-web/electron/server/__tests__/PortOwnerInspectorFaults.spec.ts` | IMP-07: 20/20 under a load average of 150–200 |
| BEH-003 (REQ-003) | The boundary test passes from any checkout path | `autobyteus-ios/AutoByteusMobileCoreTests/SavedNodeEntryKeysMigrationTests.swift` | IMP-09: worktree and `/tmp` clone, 56/56 each |
| BEH-004 (REQ-004) | The Basics spec matches the panel's cards | `autobyteus-web/components/settings/__tests__/ServerSettingsBasicsPanel.spec.ts` | IMP-06 |
| BEH-005 (REQ-005) | One exact simulator choice | `autobyteus-ios/scripts/select-ios-simulator.py` (new), `.github/workflows/release-ios.yml` ("Select available iOS simulator"), `autobyteus-ios/scripts/ios-simulator-smoke.sh`, `autobyteus-ios/scripts/ios-release-contract-check.py` (`check_simulator_wiring`, `check_simulator_chooser`), `autobyteus-ios/README.md` | IMP-05 (local, fixtures, negatives), IMP-10 (GitHub: iPhone 17 on iOS 27.2) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

As in the trace table.

## Important Assumptions

- The runner's `xcode-27` image keeps an "iPhone 17" device on its newest iOS runtime. If it does not, the chooser falls back to the first iPhone there and says so.

## Known Risks

- R-001 (design): extreme load on `sh`. IMP-07 ran at a load average of 150–200 and the child was always running well inside the deadline (elapsed 1008–1049 ms).
- R-002 (design): a hidden caller of the mutation. `codegen:check`, both typechecks and the suites found none.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Cleanup`
- Reviewed root-cause classification:
  - `Duplicated Policy Or Coordination` (the simulator choice);
  - `Local Implementation Defect` (the three tests);
  - dead code (D-1).
- Reviewed refactor decision: `Refactor Needed Now` (the chooser extraction only)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the chooser owns the rule; neither caller keeps a device match (the contract check enforces it).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The awk copies are removed, with no fallback to them.
- Dead code in the touched files and modules removed: `Yes`. This includes the logger methods and the test mock that only the mutation used.
- Dead code found elsewhere, added to `follow-ups.md`: none new. FU-001 and FU-002 are the Solution Designer's. FU-003 is a test flake (below), not dead code.
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Deviations from a design principle: `None`
- Changed source files within size guardrails: `Yes`. Files only shrink, except the contract check (+77 lines, about 360 in all) and the new chooser (about 90 lines).
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`.

## Environment Or Dependency Notes

- **Worktree setup:** `pnpm install --frozen-lockfile`, then a build of the web's workspace packages, then `codegen:local`.
- **iOS checks:** they ran on a simulator I created (iPhone 17, iOS 26.1) under this Mac's Xcode 26.1.1. I deleted it afterwards.
- **Machine load:** other work kept this Mac's load average at 100–175 during the suites. That load is behind FU-003's failure.

## Checks Run

Evidence folder: `tickets/in-progress/followup-cleanups-568/evidence/implementation/`. Every check ran on `eb7e4bf2af`.

| Check ID | Command Or Steps | Environment | Code It Exercises | Criteria | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-web codegen:check` | macOS 26.5.2, Node 22.23.1, pnpm 10.28.2 | the generated types against the built server's schema | AC-001 | Pass | `IMP-01-codegen-check.log` | `autobyteus-web/generated/graphql.ts is current.` |
| IMP-02 | `pnpm -C autobyteus-web typecheck` | as IMP-01 | the web app and tests | AC-001 | Pass | `IMP-02-web-typecheck.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)` |
| IMP-03 | `pnpm -C autobyteus-server-ts typecheck` | as IMP-01 | the server without the mutation | AC-001 | Pass | `IMP-03-server-typecheck.log` | `production errors: 0; test-file errors: 1006 in 315 files (baseline 1006 in 315 files)` |
| IMP-04 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/api/graphql/types/agent-run.test.ts` | as IMP-01 | `AgentRunResolver` | AC-001 | Pass | `IMP-04-server-agent-run-tests.log` | `exit=0`, every case passed |
| IMP-05 | `ios-release-contract-check.py`: on the commit, then with one break at a time, each restored. The breaks: the chooser ignores the SDK bound; the chooser matches a substring; the smoke uses an awk match again; the chooser is not executable. Then `select-ios-simulator.py` with the default name and with `IOS_SIMULATOR_NAME='iPhone 99'` | macOS 26.5.2, Python 3, Xcode 26.1.1 (simulator SDK 26.1) | the D-5 wiring and the chooser | AC-005 | Pass | `IMP-05-contract-check-and-chooser.log` | `iOS release contract checks passed.`; four `exit=1` (the beta runtime chosen: `'17-27-3-BETA'`; the substring: `'E-27-2'`; the missing smoke line; not executable). Locally: `Selected simulator: iPhone 17 (iOS 26.1)`; fallback: `No 'iPhone 99' simulator; using 'iPhone 17 Pro' (iOS 26.1).` |
| IMP-06 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run`; `pnpm exec vitest run --config ./electron/vitest.config.ts` | as IMP-01 | the web app incl. the Basics spec and `scripts/__tests__`; the Electron suite incl. the deadline spec | AC-002, AC-004 | Pass (Electron after a rerun; FU-003) | `IMP-06-web-unit-suite.log` | `Test Files  784 passed (784)`, `Tests  5886 passed \| 2 skipped`. Electron: the screenshot timing test failed twice at load ~105–175 (`expected 4710 to be less than or equal to 2500`), passed alone (`Tests  7 passed (7)`), then the full suite passed: `Test Files  68 passed \| 1 skipped (69)`, `Tests  535 passed \| 1 skipped (536)` |
| IMP-07 | 10 busy loops (one per core), then 20 × the deadline case alone (`-t 'enforces the real 1000ms'`) | as IMP-01; 10 cores; load average 151 → 197 | D-2 | AC-002 | Pass | `IMP-07-deadline-test-20x-under-load.log` | `run 1…20: exit=0 Tests  1 passed`; each `AC002 actual deadline receipt {"elapsedMs":1008…1049,…,"absent":true}` |
| IMP-08 | `autobyteus-ios/scripts/prepare-demo-web.sh --build` | as IMP-01 | the demo build's compiled-operation check after D-1 | AC-001 | Pass | `IMP-08-demo-build-check.log` | `The demo answers all 249 compiled operations (handled or listed as unreachable).` |
| IMP-09 | the iOS core tests (`-only-testing:AutoByteusMobileCoreTests`) in the worktree, then in `git clone --no-local <worktree> /tmp/autobyteus-568-ios` | a simulator I created (iPhone 17, iOS 26.1), Xcode 26.1.1 | D-3 and every core test | AC-003 | Pass | `IMP-09-ios-core-tests-plain-and-tmp.log` | both: `testOnlyTheStartUpCallSiteReferencesTheMigrationFolder]' passed`, `Executed 56 tests, with 0 failures`, `** TEST SUCCEEDED **` |
| IMP-10 | `gh workflow run release-ios.yml --ref codex/followup-cleanups-568 -f publish_app_store_connect=false` → run 44747687988; excerpts from its log and job list | GitHub: `xcode-27-arm64` (Xcode 27.2) | the chooser in the workflow step and in the smoke; the whole build-only release | AC-005 | Pass | `IMP-10-build-only-run.txt` | `Selected simulator: iPhone 17 (iOS 27.2), UDID D7F008F7-…` in "Select available iOS simulator" and again in the smoke; `** BUILD SUCCEEDED **`; `Executed 56 tests, with 0 failures`; `Executed 8 tests, with 0 failures`; `Smoke UI tests: executed and passed without skips`; `run: success`; both publish jobs `skipped` |

- Not run, and why: the archive/upload job (needs the founder's word; no upload in this ticket).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`. No rendered surface changes: only test files, dead GraphQL documents and CI scripts.

## Downstream Coverage Hints / Suggested Scenarios

- IMP-10 is the build-only run of this exact commit. API/E2E can reuse it.
- The Electron screenshot flake (FU-003) may recur on a busy machine. It is unrelated to this change.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E's validation of AC-001…005 on the package.
