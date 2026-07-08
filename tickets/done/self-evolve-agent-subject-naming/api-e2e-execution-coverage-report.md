# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/api-e2e-coverage-investigation.md`
- Current Execution Round: 1
- Trigger: Coverage investigation after implementation code review passed.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: Round 1

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review passed; API/E2E coverage investigation required. | N/A | No | Pass | Yes | Added one durable projection stale-cache fixture before execution; all focused checks passed. |

## Execution Basis

Execution followed the round-1 coverage investigation. The changed boundary is a server-side projection/service/task-packet flow rather than a browser UI or public GraphQL schema change. The final executed suite therefore focused on durable projection coverage, self-evolution companion packet coverage, self-evolution executable service integration, source type/build checks, and static evidence-actor wording checks.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `No`
- New durable coverage needed: `Yes`
- Reroute required from investigation: `No`
- Notes: Investigation identified one missing durable regression: old schema-1 work trace manifests without `renderContext` must be treated as stale derived cache instead of reusing stale archived Markdown.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` / target-agent rendering, reasoning, tool call, compaction, redaction, manifest shape | Still Valid | Retained and executed. | Passed in focused run; projection suite reported 5 tests after added fixture. |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` / whitespace normalization and blank fallback | Still Valid | Retained and executed. | Passed in focused run. |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` / archived+active backfill and unchanged archive reuse | Still Valid | Retained and executed. | Passed in focused run. |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` / render-context archive invalidation/reuse | Needs Update | Added AWT-005 schema-1/no-render-context stale-cache fixture in same file. | New fixture passed and proves old manifests do not preserve stale `Old Name` labels. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` / concise path-only companion packet and direct-message grant | Still Valid | Retained and executed. | Passed in focused run; companion suite reported 5 tests. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts` / executable direct-edit flow | Still Valid | Retained and executed. | Passed in integration run; 5 tests. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-graphql-resolver.test.ts` and `manual-trigger-strategy.test.ts` | Still Valid but out of direct final scope | Inspected during investigation; not executed in final focused suite. | No changed assertion surface for work trace labels or companion packet wording. |
| Broad `autobyteus-server-ts/tests/e2e/**` runtime/API suites | Out Of Scope | Not executed. | Changed behavior is covered by local service/projection and companion executable tests; no public GraphQL/browser API shape changed. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

Added AWT-005 is not compatibility coverage; it protects clean-cut regeneration of derived cache files that lack the new render context so stale `worker`/old-label Markdown is not retained.

## Execution Surfaces / Modes

- Vitest server-side projection/service tests.
- Vitest self-evolution executable integration tests with deterministic fakes and local SQLite test database reset by the test harness.
- TypeScript source build checks.
- Full server build including built-in agents bootstrap smoke check.
- Scoped static grep for obsolete evidence-actor wording.

## Platform / Runtime Targets

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming`
- Branch: `codex/self-evolve-agent-subject-naming`
- Base/HEAD before local uncommitted changes: `be4260235f832bc7b34920079bb9f26aadc9e16b`
- OS: Darwin arm64 (`Darwin MacBookPro 25.2.0`)
- Node.js: `v22.23.1`
- pnpm: `10.28.2`

## Lifecycle / Upgrade / Restart / Migration Checks

- Old derived work trace cache lifecycle: covered by new AWT-005 fixture. A schema-1 work trace manifest without `renderContext` is seeded after an `Old Name` projection, then `ensureCurrent` with `New Name` regenerates the archived work trace and upgrades manifest output to schema 2 with render context metadata.
- Prisma test database migration lifecycle: focused Vitest runs reset and migrated the SQLite test database successfully before test execution.
- No installer/updater/restart behavior is in scope.

## Coverage Matrix

| Scenario ID | Behavior / Boundary | Durable / Temporary | Result | Evidence |
| --- | --- | --- | --- | --- |
| AWT-001 | Active raw trace projection uses target-agent labels for assistant/reasoning/tool-call/compaction and preserves `user:`. | Durable | Pass | `agent-work-trace-projection-service.test.ts`; focused run passed. |
| AWT-002 | Agent display-name whitespace normalization and blank-name fallback. | Durable | Pass | `agent-work-trace-projection-service.test.ts`; focused run passed. |
| AWT-003 | Archive+active backfill keeps work trace paths/file names and reuses unchanged archive when render context is unchanged. | Durable | Pass | `agent-work-trace-projection-service.test.ts`; focused run passed. |
| AWT-004 | Render-context fingerprint invalidates unchanged archive when normalized label changes, while equivalent normalized labels reuse cache. | Durable | Pass | `agent-work-trace-projection-service.test.ts`; focused run passed. |
| AWT-005 | Schema-1/no-render-context manifest is stale and regenerates archive under current target-agent label. | Durable added this round | Pass | New test `treats schema-1 archive manifests without render context as stale derived cache`; focused run passed. |
| SE-001 | Companion request remains path-only, references work trace manifest/files, and uses target-agent wording. | Durable | Pass | `self-evolution-companion-session-service.test.ts`; focused run passed. |
| SE-002 | Self-evolution executable flow refreshes work traces before each companion trigger and records latest summary hash. | Durable | Pass | `self-evolution-service.integration.test.ts`; integration run passed. |
| STATIC-001 | Built-in self-evolver guidance/docs/source no longer contain obsolete evidence-actor target-worker/future-worker/worker-message wording. | Temporary static check + build smoke | Pass | Scoped grep found only negative assertions; full build bootstrap smoke passed. |

## Test Scope

Focused final execution covered changed server-side projection, render cache lifecycle, self-evolution companion task-packet wording, deterministic self-evolution service execution, source build, built-in agents bootstrap, and scoped static wording. Full browser/UI/API E2E was not run because no public GraphQL/browser surface changed and no self-evolution live companion E2E exists for deterministic label rendering.

## Execution Setup / Environment

No extra temporary harness files were created. Commands were run from `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming`. The repository's test scripts built shared workspace packages through `pretest`; the server build ran Prisma client generation and built-in agents bootstrap smoke check.

## Tests Implemented Or Updated

- Updated `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` with new scenario:
  - `treats schema-1 archive manifests without render context as stale derived cache`
  - This seeds a schema-1 work trace manifest without `renderContext`, then verifies a subsequent projection with a new agent label regenerates archived Markdown with `New Name`, removes the stale `Old Name` output, and writes schema 2 render context metadata.

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| None. | N/A | N/A | N/A |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated: `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts`
- Paths removed: None
- If `Yes`, returned through `code_reviewer` before delivery: `Pending via this handoff`
- Post-API/E2E coverage code review artifact: Pending; recommended recipient is `code_reviewer`.

## Other Execution Artifacts

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/api-e2e-execution-coverage-report.md`

## Temporary Execution Methods / Scaffolding

No temporary files or scaffolding were left behind. Static grep was used only as execution evidence.

## Dependencies Mocked Or Emulated

- Self-evolution service integration uses deterministic fakes for target context resolution, companion session, work trace projection package, notification, and agent run manager as existing tests already did.
- Companion session tests use fake companion run methods and an in-memory direct-message grant registry.
- Projection tests use temporary filesystem directories and raw trace JSONL files.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First execution round. | N/A |

## Scenarios Checked

Commands executed:

1. `pnpm -C autobyteus-server-ts test tests/agent-work-traces/agent-work-trace-projection-service.test.ts tests/self-evolution/self-evolution-companion-session-service.test.ts --run`
   - Result: Pass.
   - Evidence: 2 test files passed; 10 tests passed (`agent-work-trace-projection-service.test.ts`: 5 tests, `self-evolution-companion-session-service.test.ts`: 5 tests).
2. `pnpm -C autobyteus-server-ts test tests/self-evolution/self-evolution-service.integration.test.ts --run`
   - Result: Pass.
   - Evidence: 1 test file passed; 5 tests passed.
3. `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
   - Result: Pass.
4. `git diff --check`
   - Result: Pass.
5. `pnpm -C autobyteus-server-ts build`
   - Result: Pass.
   - Evidence: build completed and built-in agents bootstrap smoke check passed.
6. `git grep -n "target worker\|future worker\|worker message\|worker messages\|worker reasoning\|worker tool\|worker:\\n" autobyteus-server-ts/src/built-in-agents/templates/skill-evolver autobyteus-server-ts/docs autobyteus-server-ts/src/self-evolution autobyteus-server-ts/src/agent-work-traces autobyteus-server-ts/tests || true`
   - Result: Pass with expected negative-assertion hits only:
     - `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts:130`
     - `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts:131`
     - `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts:483`

## Passed

- Projection durable coverage passed, including new schema-1 stale-cache fixture.
- Companion session durable coverage passed.
- Self-evolution executable service integration passed.
- Source build no-emit passed.
- Full build and built-in agents bootstrap smoke check passed.
- `git diff --check` passed.
- Scoped obsolete evidence-actor wording grep passed with only negative-test hits.

## Failed

None in this execution round.

## Not Tested / Out Of Scope

- Full `pnpm -C autobyteus-server-ts typecheck` was not rerun because implementation handoff and code review both recorded a known pre-existing TS6059 `rootDir`/test include failure in `tsconfig.json`. The changed source contract was checked with `tsconfig.build.json --noEmit`, and the relevant tests compiled/executed under Vitest.
- Broad browser/API E2E was not run because this ticket changes local server projection and self-evolution task-packet behavior without a public GraphQL/browser API contract change.

## Blocked

None.

## Cleanup Performed

- Projection tests create and remove temporary directories via existing `afterEach` cleanup.
- Vitest harness reset the test database for executed suites.
- No temporary execution scaffolding was left in the repository.

## Classification

- `Local Fix`: N/A
- `Design Impact`: N/A
- `Requirement Gap`: N/A
- `Unclear`: N/A

No failure classification is needed; all executed checks passed.

## Recommended Recipient

`code_reviewer`

Repository-resident durable coverage was added after the earlier code review, so the workflow must return through code review before delivery.

## Evidence / Notes

- The coverage investigation was written before durable coverage changes and final execution.
- The only API/E2E-stage code change was a narrow durable test fixture in `agent-work-trace-projection-service.test.ts`.
- No compatibility wrapper, dual worker/agent render mode, or legacy worker-label retention was found.
- Full build confirms built-in agent template assets still bootstrap after the implementation's static wording changes.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Focused executable coverage passed after adding durable schema-1 stale-cache coverage. Because durable coverage changed after code review, route to `code_reviewer` for coverage-code re-review before delivery.
