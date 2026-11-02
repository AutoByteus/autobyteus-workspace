# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (REQ-001..003, AC-001..005)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md`
- Supplemental Task Artifacts: `solution-designer-handoff.md`, `follow-ups.md`, `evidence/INV-01..03`
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IMP-01..03); Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- Code Review Report / Code Review Revision Record: `N/A — not applicable` (direct route)
- Delivery Revision Record / Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: the implementation engineer's direct-route handoff, code commit `aa93bdcdfb`, branch tip validated `b0e11cd4df` (documents only after the code commit; `git diff aa93bdcdfb b0e11cd4df -- . ':!tickets'` is `DESIGN.md` only)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The web type gate (`pnpm -C autobyteus-web typecheck`) compiles the server's source in its cross-package tests project, which reads `autobyteus-ts` (untracked `dist/`) and the Prisma client. On a clean runner (install only) it failed and blocked the beta's five desktop builds. The change: one server script `prepare:source` (= `prepare:shared` + `prisma generate`) called by the server's `prebuild`, `pretypecheck` and `typecheck:update-baseline`, and by the web's `prepare:shared-types`. Required: clean clone + `pnpm install --frozen-lockfile` passes the web gate (AC-001) and the server gate (AC-002) with the baselines unchanged; a built machine is unchanged (AC-003); the build-only release run passes (AC-004, delivery's); the guide documents (AC-005, designer's).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (the web gate on a fresh clone), SCN-002 (the server gate on a fresh clone); SCN-003 is a source check of documents.
- Real-use scenarios added: the same gates on an already built machine (a developer's checkout), and the gates at the base commit on a clean clone to show the failure the fix removes (the original incident).
- Not tested (`Technically Possible but Unsupported/Contrived`): none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 web gate prepare step | Changed | REQ-001, AC-001/003 | clean-clone and built-machine runs |
| Server `pretypecheck`/`prebuild`/`typecheck:update-baseline` | Changed (one owner) | REQ-002, AC-002 | clean-clone server gate; server build |
| `pretest` | Preserved (`prepare:shared`) | design | not exercised (no test run needs Prisma here) |
| BEH-002 guide documents | Added | REQ-003, AC-005 | source check |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | | | | |
| API / transport / contract | No | | | | |
| Frontend component / state | No | | | | |
| Browser integration / user journey | No | | | | |
| Authentication / session / permissions | No | | | | |
| Desktop renderer / web-equivalent UI | No | | | | |
| Desktop shell | No | | | | |
| Process / lifecycle (build chain) | Yes | package scripts run by the gates and the release chain | implementation clean-clone runs (IMP-01..03) | other runner operating systems (the five release runners) | clean-clone CLI runs here; the release run (AC-004) is delivery's |
| Persisted-data transition | No | | | | |
| Worker / queue / distributed | No | | | | |
| External integration (GitHub runners) | Yes (indirectly) | | | the release workflow itself | AC-004 by delivery |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order` (branch `codex/clean-runner-build-order`)
- Project type and runtime stack: pnpm monorepo, TypeScript, Nuxt web, Fastify server
- Project testing guideline path: `/Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order/TESTING.md` (line 110 asks for a clean clone with the frozen install for a change to a build step or gate); `DESIGN.md` rule 12; `RELEASE.md` (build-only release run, `pnpm release:test`)
- Conflicting, missing, or unclear project instructions: none
- Required environment variables or secrets available: `N/A` (none needed)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md`, `DESIGN.md` rule 12 | prove a build-step change from a clean clone | `git clone`, `pnpm install --frozen-lockfile`, then the gate |
| `autobyteus-web/package.json`, `autobyteus-server-ts/package.json` | the changed scripts | web `typecheck` runs `prepare:shared-types` then `nuxt prepare` then the gate |
| `RELEASE.md` | AC-004 | `pnpm release:test --ref <branch>` is delivery's; I did not dispatch it (it needs a pushed branch and GitHub runners) |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Fresh clone of the branch tip | `/tmp/api-crb-fix` | `git clone --branch codex/clean-runner-build-order <worktree>` | no node_modules, no build output | `git status` clean | remove the folder |
| Fresh clone of the base | `/tmp/api-crb-base` | clone + `git checkout aa93bdcdfb^` | same | | remove the folder |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| none | | clones in `/tmp`, nothing touches `~/.autobyteus` or a running app | folders removed |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/scripts/typecheck.mjs` and the shared `scripts/typecheck-gate/` | the gate itself: production 0 errors, test baseline | REQ-001/002 | Still Valid | gate output | none |
| `autobyteus-server-ts/scripts/typecheck.mjs` | server gate | REQ-002 | Still Valid | | none |
| a CI job that type-checks from a clean runner | does not exist | | Not Testable In Scope | follow-up FU-1 | none |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 | clean clone, web gate | Journey | `git clone`; `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-web typecheck` | independent rerun of IMP-01 on the branch tip |
| API-02 | AC-002 | same clone, server gate | Journey | `pnpm -C autobyteus-server-ts typecheck` | independent rerun of IMP-02 |
| API-03 | AC-003 | built machine | Journey | same clone after API-01/02: web typecheck again; `pnpm -C autobyteus-server-ts build` | independent rerun of IMP-03 |
| API-04 | AC-001, AC-002 | base commit, clean clone | Temporary Probe | same steps at `aa93bdcdfb^`; the web gate must fail | proves the clean-clone steps can fail (the original incident) |
| API-05 | AC-005 | documents | Journey | source check of `DESIGN.md`, `TESTING.md`, `RELEASE.md`, `docs/design-cases.md` | designer's documents |

- Test progress log needed: `Yes` (five cases)

## Durable Coverage To Add

None. The change is package scripts; the proof is the gate itself run from a clean clone. A permanent clean-runner CI job is follow-up FU-1.

## Durable Coverage To Update

None

## Durable Coverage To Remove

None

## Desktop Application Validation Plan

Not applicable.

## Live Environment And Fixture Plan

- Startup order and commands: as the Planned Cases.
- Evidence to capture: the three gate outputs and the base failure.
- Owned processes and temporary state to clean up: the two clones.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-004 the build-only release run on five runners | belongs to delivery by design; it needs the pushed branch and GitHub runners | other operating systems, `prisma generate` and the longer prepare on the runners | No | delivery runs `pnpm release:test --ref codex/clean-runner-build-order` before the merge |

## Ambiguities Or Reroute Triggers

None

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: none
