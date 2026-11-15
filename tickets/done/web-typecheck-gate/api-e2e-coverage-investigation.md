# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: /Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/tickets/in-progress/web-typecheck-gate/requirements-doc.md
- Investigation Notes: /Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/tickets/in-progress/web-typecheck-gate/investigation-notes.md
- Solution Revision Record: /Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/tickets/in-progress/web-typecheck-gate/solution-revision-record.md
- Design Spec: /Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/tickets/in-progress/web-typecheck-gate/design-spec.md
- Supplemental Task Artifacts: `evidence/INV-01…05`, `follow-ups.md`
- Design Review Report: N/A — not applicable
- Architecture Review Revision Record: N/A — not applicable
- Implementation Handoff: /Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/tickets/in-progress/web-typecheck-gate/implementation-handoff.md
- Implementation Revision Record: /Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/tickets/in-progress/web-typecheck-gate/implementation-revision-record.md
- Code Review Report / Revision Record: N/A — not applicable (Small + Low, direct route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: /Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/tickets/in-progress/web-typecheck-gate/api-e2e-revision-record.md
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff (IR-001), direct route
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

Two changes on `codex/web-typecheck-gate` at head 25aa717ba: (A) 47d21e36a, two added lines in the web cross-package test (import `createTestRunWorkspaceSkills`, pass `workspaceSkills: createTestRunWorkspaceSkills({ runId })`); (B) afaeb9ed5, three TESTING.md edits making every TypeScript change run both typechecks. To prove: the desktop release build's web typecheck passes at the unchanged baseline 93 in 40 (AC-001, AC-006), the diff is as narrow as approved (AC-002), the test still passes (AC-003), the other release-build checks pass (AC-004), TESTING.md says what the design says (AC-005), and the branch merges cleanly with no release (AC-007). The design's escalation trigger: a fresh-start count other than 93 in 40, or a fixture need the gate does not build, returns a Design Impact.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (release workflow builds the desktop app from a fresh install: API-01, API-02), SCN-002 (a role reads TESTING.md to choose checks: API-03).
- Real-use scenarios added: none. The release runner's command is the real trigger, run exactly as TESTING.md documents it.
- Unsupported/Contrived scenarios: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 web typecheck of the desktop build | Changed (FAIL to PASS) | INV-01, IMP-01 | Fresh-start build (API-01) |
| BEH-002 TESTING.md check selection | Changed | design-spec Concrete Examples | Read against design (API-03) |
| BEH-003 the test's runtime behavior | Preserved | INV-05, IMP-02 | Reused IMP-02 |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | none | n/a | none | none |
| API / transport / contract | No | none | n/a | none | none |
| Frontend component / state | No | none | n/a | none | none |
| Browser integration / user journey | No | none | n/a | none | none |
| Authentication / session / permissions | No | none | n/a | none | none |
| Desktop renderer / web-equivalent UI | No | none | n/a | none | none |
| Desktop shell / Electron-specific | No | none (the build ran and packaged, no shell code changed) | API-01, API-02 | none | none |
| Process / lifecycle | No | release build only | API-01 | the runner's OS and secrets | not testable here |
| Persisted-data transition | No | none | n/a | none | none |
| Worker / queue / distributed | No | none | n/a | none | none |
| External integration | No | none | n/a | none | none |

The one affected boundary is the release build's type gate (build input).

## Project Execution Discovery

- Assigned task worktree: /Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate
- Project type and runtime stack: pnpm workspace, TypeScript, Nuxt/Electron web app, Node server. Node 22.23.3, pnpm 10.28.2 (shim `/tmp/wtg-bin/pnpm`; machine default is Node 26 with no pnpm).
- Project testing guideline path(s): /Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/TESTING.md (root; read in full: Test layers, Choosing the path, Rerun by impact, Fresh-start build, Environments). No closer `TESTING*.md`. `AGENTS.md` at the root, DESIGN.md rule 12, RELEASE.md read.
- Conflicting, missing, or unclear project instructions: none. The documented Fresh-start command and verify steps worked as written. FU-001 (RELEASE.md main-checkout path) is already recorded.
- Changed build-input paths (`git diff --name-only 88f295aa0 HEAD -- . ':!tickets'`): `TESTING.md`, `autobyteus-web/tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts`. Neither matches a listed path; the test file matches the guideline's last trigger (a new import of another workspace package in a file the web build type-checks). Fresh-start build case: API-01, API-02.
- Required environment variables or secrets available: N/A (signing secrets not needed; `CSC_IDENTITY_AUTO_DISCOVERY=false`)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| TESTING.md "Fresh-start build" | Release-runner proof | `git clone --no-local`, `pnpm install --frozen-lockfile`, `pnpm build:electron:mac -- --arm64` with the listed env, then the Prisma and terminal-runtime verify steps |
| .github/workflows/release-desktop.yml | The job's order and verify steps | Install, build, "Verify bundled Prisma ARM64 engine target", "Verify packaged terminal runtime ARM64" (incl. spawn probe on darwin/arm64), then signing-policy verify (needs a signed bundle) |
| autobyteus-web/package.json:45-50 | `build:electron:mac` | guards, `typecheck`, `prepare-server`, `generate:electron`, `transpile-electron`, `tsc -p build/tsconfig.json`, `node build/dist/build.js --mac` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Fresh clone | /tmp/wtg-fresh/clone | `git clone --no-local <worktree>`, checkout 25aa717ba | about 5 min, one heavy run, nothing else ran alongside | n/a | delete /tmp/wtg-fresh |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| None | n/a | the build writes only inside the clone | clone removed after the report |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| autobyteus-web/tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts | Native-to-projection event sequence (2 tests) | REQ-002, AC-003, BEH-003 | Still Valid (assertions unchanged, setup updated by commit A) | IMP-02 2/2 | None |
| autobyteus-web/tsconfig.cross-package-tests.json (the gate) | Compiles four web tests with server src | REQ-001, AC-001 | Still Valid | API-01 `cross-package tests ... 0 errors` | None |
| autobyteus-server-ts/tests/fixtures/run-workspace-skills-fixtures.ts | Test run's skill holder | REQ-002 | Still Valid | imported cleanly in API-01 | None |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| IMP-01 / IMP-02 / IMP-03 / IMP-04 | AC-001, AC-003, AC-004 | web typecheck, test, server typecheck, guards | Reused | the implementation checks | Commit tested: IMP-01 at 47d21e36a, the rest at afaeb9ed5; head 25aa717ba adds only ticket documents under `tickets/` (`git diff --name-only afaeb9ed5 25aa717ba`), nothing they exercise. IMP-01's gate also reran inside API-01 on the head. Their logs carry the header and the count lines |
| API-01 | AC-001, AC-006, AC-004 (guards) | Release build from a fresh clone | Journey | fresh clone of 25aa717ba, `pnpm install --frozen-lockfile`, then `cd autobyteus-web && NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64` | TESTING.md Fresh-start build, DEC-005 |
| API-02 | AC-006 | Release job's verify steps | Journey | the workflow's Prisma and terminal-runtime steps (with spawn probe) on the API-01 build | Completes the job's verifiable steps |
| API-03 | AC-002, AC-005 | Diff and TESTING.md | Existing Test (doc review) | `git diff 47d21e36a^ HEAD`, read TESTING.md rows against design "Concrete Examples", anchor check, cast/`@ts-` grep | Doc and diff criteria |
| API-04 | AC-007 | Merge | Journey | `git fetch origin personal`; `git merge-tree --write-tree HEAD origin/personal` | Merge-ready |

- Test progress log needed: Yes

## Durable Coverage To Add / Update / Remove

None. The existing test is the durable coverage and the commit already updated it; TESTING.md is the durable rule.

## Desktop Application Validation Plan

Not applicable beyond the build: no shell behavior changed.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Signing, notarization, macOS signing-policy verify, Intel x64, Linux, Windows, Android builds | Need the runner's secrets or other OSes; no code in them changed | The change is a test-file type fix compiled before signing | No | None. The next release run exercises them |
| Build-only release run on a branch | TESTING.md requires it only for a change to a build step or gate; none changed | none | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: Yes
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: No
- Reroute Required Before Validation Execution: No
