# Implementation Handoff — autobyteus-584 (ios-demo-operation-coverage)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: no architecture review (Small / Low, direct route). After implementation the package goes to API/E2E (`get_handoff_rules`: Small/Medium + Low, self-review done).
- Requirements doc: `requirements-doc.md` (SR-001, approved by the Solution Designer within the direction; user informed)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `handoff-architecture-design-complete.md`; `evidence/reproduction/`; `follow-ups.md` (FU-001, from this round)
- Design review report: N/A (direct route)
- Triggering rework report, revision record, or evidence: N/A (initial round)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-operation-coverage/tickets/in-progress/ios-demo-operation-coverage`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-operation-coverage`, `codex/ios-demo-operation-coverage`. Code commit `0d197a73b9`; documents and evidence in the commit after it (`git log`). Base `origin/personal` `90c4958a35` (the beta.4 tag).
- **The branch is not pushed.** Its upstream is set to `origin/personal`, so push with an explicit refspec: `git push origin HEAD:refs/heads/codex/ios-demo-operation-coverage`. A plain `git push` would push to the target branch.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review, code-review, API/E2E and delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

- **D-1** `autobyteus-web/demo/graphql/unreachable-operations.json`:
  - `AgentSemanticMemoryFolder`, `GlobalSemanticMemoryFolder`, `ListAgentEpisodes` and `ListMemoryGroupMembers` are listed with reason `memory`.
  - `ListAgentRunsWithMemory` is removed.
  - The list keeps its case-insensitive (`localeCompare`) order. The diff is these five lines.
- **D-2** `autobyteus-web/scripts/mobile-build-checks.mjs`:
  - `demoOperationCoverage(compiled, webRoot)` takes a `Set` of operation names. Its outcomes (`unanswered`, `stale`, `unexplained`, `compiled`) are unchanged.
  - `build-mobile-web.mjs` now passes `compiledOperations(mobileOutputDir)`, so the demo build behaves as before.
  - New `sourceOperations(webRoot)`: every operation name defined in `.ts`, `.vue`, `.js` and `.mjs` files.
    - It uses the module's one `OPERATION` pattern.
    - It skips folders named `node_modules`, `.nuxt`, `.output`, `dist*`, `electron-dist`, `generated`, `__tests__`, `tests` and `demo`: the same set as the investigation's measurement.
    - It returns 252 on this tree, as many as the demo build compiles.
- **D-3** `autobyteus-web/scripts/__tests__/mobileBuildChecks.spec.ts`:
  - New case: `demoOperationCoverage(sourceOperations(webRoot), webRoot)` on the real repository, expecting no unanswered, stale or unexplained names. A failure shows the names.
  - New fixture case for what `sourceOperations` reads and skips.
  - The four existing synthetic cases now pass `compiledOperations(build())`.
- **D-4** (TESTING.md row) is the API/E2E engineer's, as the design says. Not written here.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md`, Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed` (build tooling and one test; four files; no product code)
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`. R-1's trigger (the source set and the compiled set diverge) was not hit: 252 = 252 (IMP-04 with IMP-02).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-001 / AC-001 | The four listed with `memory`; the stale entry removed; the demo build answers all | `unreachable-operations.json` | IMP-04: "The demo answers all 252 compiled operations" |
| REQ-002 / AC-002 | A unit test applies the rule to the source, no build, names failures | `sourceOperations`, spec case | IMP-01: fails on the base list naming the four and `ListAgentRunsWithMemory`; IMP-02: passes after D-1 |
| REQ-003 / AC-003 | TESTING.md rule | — | API/E2E (owner of TESTING.md) |
| REQ-004 / AC-004 | Local proof; build-only iOS run; no tag | — | Local: IMP-02, IMP-04. The build-only run is left to API/E2E (see below) |
| Preserved | The demo build's own check | `build-mobile-web.mjs` passes the compiled set | IMP-04 |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

`autobyteus-web/demo/graphql/unreachable-operations.json`, `autobyteus-web/scripts/mobile-build-checks.mjs`, `autobyteus-web/scripts/build-mobile-web.mjs`, `autobyteus-web/scripts/__tests__/mobileBuildChecks.spec.ts`. `demoOperationCoverage` has no other callers (searched the web app and `autobyteus-ios`).

## Important Assumptions

- The phone build compiles every operation defined in the source (the investigation's measurement; confirmed again: `sourceOperations` 252, demo build 252).

## Known Risks

- R-1 (design): if the phone build ever stops compiling an operation defined in the source, the build check calls its list entry stale while the source check requires it. That shows at the next demo build.
- **FU-001** (found here, outside the Change Scope): while `autobyteus-web/dist-mobile-demo/` exists, the web typecheck aborts out of heap.
  - The cause: `nuxt.config.ts:261` excludes `../dist-mobile/**` but not `../dist-mobile-demo/**`, so vue-tsc loads the 13 MB demo bundle.
  - It bites anyone who follows the new TESTING row (run the demo build) and then typechecks. To typecheck after a demo build, move or delete `dist-mobile-demo/` first.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug fix (list) plus a missing local check.
- Implementation matched the reviewed assessment: `Yes`
- Evidence / notes: one rule, two inputs; the operation pattern has one owner (`OPERATION`).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the old `(publicDir, webRoot)` signature is gone; both callers updated).
- Legacy old-behavior retained in scope: `No`
- Dead code removed: `Yes` (the stale list entry).
- Changed source files within size guardrails: `Yes` (`mobile-build-checks.mjs` 90 lines, +23 net).

## Persisted Data Transition Check (When Applicable)

- `Not Affected`

## Lightweight Implementation Self-Review (direct route)

- The source scan uses the same `OPERATION` regex as the build scan, so "what counts as an operation" has one owner.
- The skipped folders match the investigation's measurement. The fixture case covers `node_modules`, `dist-mobile-demo`, `.nuxt`, `generated`, `__tests__`, `tests` and `demo`, plus a Markdown file that is not read. `dist-mobile-demo` matters most: it holds a compiled copy of every operation and would otherwise hide a missing source definition. `.output` and `electron-dist` are skipped by the same pattern but have no fixture.
- `demo/` is skipped: it holds the demo's own handlers, not operations the app sends.
- The real-source case resolves the web root from the spec's own location (`../..`), so it runs from any working directory.
- The spec runs in the web unit suite (`vitest.config.mts` sets no `include` and does not exclude `scripts/`; the spec runs under `// @vitest-environment node`).

## Environment Or Dependency Notes

- macOS, Node v22.23.1, 64 GB. `fseventsd` was using about 20 GB of RSS (not related to this change).

## Checks Run

Evidence: `tickets/in-progress/ios-demo-operation-coverage/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `vitest run scripts/__tests__/mobileBuildChecks.spec.ts` with the base list | tree = `0d197a73b9` minus D-1 | macOS, Node 22 | the source coverage case | AC-002 | Fail (expected) | `IMP-01-source-coverage-before-list.log` | `unanswered` the four, `stale` `ListAgentRunsWithMemory`; `1 failed \| 7 passed` |
| IMP-02 | same, after D-1 | `0d197a73b9` | macOS, Node 22 | the whole spec | AC-002 | Pass | `IMP-02-spec-after-list.log` | `Tests  8 passed (8)` |
| IMP-03 | `pnpm -C autobyteus-web typecheck` | `0d197a73b9` | macOS, Node 22 | web app, tests, cross-package | — | Pass (with `dist-mobile-demo/` moved aside); aborts while it exists (FU-001) | `IMP-03-web-typecheck.log` | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)` |
| IMP-04 | `autobyteus-ios/scripts/prepare-demo-web.sh --build` | `0d197a73b9` | macOS, Node 22 | the workflow's demo step: workspace deps build, `build:mobile-web --demo`, its coverage check, the copy into `DemoWeb/` | AC-001, AC-004 (local half) | Pass | `IMP-04-prepare-demo-web-build.log` | `The demo answers all 252 compiled operations` |

- Not run, and why:
  - The build-only iOS release workflow run (REQ-004 / AC-004). It is executable validation on GitHub Actions, which needs the branch pushed. The last iOS-workflow ticket (`ios-release-ui-test-flakiness`) left this run to API/E2E the same way.
    - Push: `git push origin HEAD:refs/heads/codex/ios-demo-operation-coverage` (explicit refspec; the upstream is `origin/personal`).
    - Dispatch (inputs checked in `release-ios.yml:7-30`): `gh workflow run release-ios.yml --ref codex/ios-demo-operation-coverage -f publish_app_store_connect=false -f release_ref=codex/ios-demo-operation-coverage`. Then `gh run list --workflow release-ios.yml --limit 1` and `gh run watch <id> --exit-status`.
    - Look for "Build the bundled demo" and the build/test job passing. No tag.
  - The whole web unit suite: the change touches only build scripts and their own spec (no app code). The spec ran (IMP-02); API/E2E may run the suite.

## Frontend Rendered-Result Check (When Applicable)

- Not applicable: no rendered surface changed (a build check and its list).

## Downstream Coverage Hints / Suggested Scenarios

- The TESTING.md row (D-4, REQ-003).
- The build-only iOS run (AC-004), as above.
- Optionally, a fresh-worktree run of `prepare-demo-web.sh --build`, as CI does.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: the build-only iOS release workflow run and the TESTING.md row.
