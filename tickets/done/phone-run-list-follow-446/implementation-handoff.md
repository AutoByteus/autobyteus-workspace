# Implementation Handoff — autobyteus-446

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-list-follow-446/tickets/in-progress/phone-run-list-follow-446/`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-list-follow-446`, branch `codex/phone-run-list-follow-446`, base `origin/personal` `a85bf4f38d`.
Commits: `7e19222841` (contracts), `3599ba3755` (server), `8e686b7f36` (web), `e8270ed84e` (baseline test fix, unrelated spec), `ff9a0c7b0c` (contracts doc-comment wrap; `dist/*.js` differs only in that comment); the ticket documents and evidence follow in one docs commit (named in the handoff message).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: `Medium` / `Low` → direct implementation, no architecture review; this package goes directly to API/E2E (Small-or-Medium and Low rule). Lightweight self-review done (below).
- Requirements doc: `requirements-doc.md` (Approved, SR-001).
- Investigation notes: `investigation-notes.md`.
- Solution revision record: `solution-revision-record.md`.
- Design spec: `design-spec.md` (SR-002, `Ready`).
- Supplemental task artifacts: `evidence/repro/closed-task-rows-repro.mjs` (unchanged); `follow-ups.md` (FU-001, FU-002; nothing added).
- Design review report: `N/A — not applicable` (architecture review not selected).
- Architecture review revision record: `N/A — not applicable`.
- Triggering rework report: N/A (initial round).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review / code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

What the change does:

1. **Contracts** (`autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts`): `closedTaskExecutionsDigest(references)` returns `<count>:<8 hex>`, an FNV-1a 32-bit hash over the sorted, distinct keys `agent:<id>` / `team:<id>`, built with the contracts' own private `referenceKey` (so the server's and web's key copies, FU-002, do not matter). Exported from the index; `dist/` rebuilt and committed.
2. **Server**: `StandaloneAgentRunRoot.closedTaskExecutions()` (the same source the view uses; `openPackageSnapshotConnection` now reads it through the accessor). `StandaloneAgentRunRootManager.getAgentStatuses` answers `closedTaskExecutionsDigest` for active roots, `null` otherwise. The GraphQL `AgentRunCollaborationStatusesObject` gains the nullable field.
3. **Web**: the statuses query asks for the field; `readAgentRunCollaborationStatuses` maps it; `refreshListedStatuses` adds one re-read condition: `answer.closedTaskExecutionsDigest !== closedTaskExecutionsDigest(context.view.closed_task_executions)` → `inspect(host)`. When the digests match it applies the states as before (no view read). `generated/graphql.ts` regenerated with `codegen:local`.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 8 production files in three packages (contracts 1, server 4 including the new status collector, web 3 + generated types), all inside existing owners; one additive nullable field on an internal query; no persistence, security or concurrency change. The extra server file is a move of existing code inside the same owner (below), not a new owner.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below).
- New design impact or escalation trigger: `None`. The digest is one function used on both sides; the root's closed set equals the view's (IMP-03 compares the node's digest with the digest of the projected view's `closed_task_executions` on a real root); Team hosts are left to validation as the design says.

## Lightweight Implementation Self-Review

- Correctness: the new condition sits after the existing "both inactive" and "active/children changed" checks; inactive answers carry `null`, and an inactive-vs-inactive pair is skipped before the digest compare, so a stopped host never triggers a re-read (unit: "an inactive answer … re-reads nothing"). A selected host (live stream) is excluded from the poll as before. A context that followed the close through live events computes the same digest as the node: no extra re-read (unit).
- Cost (AC-005): one extra string per active host on the existing 5 s read; ten matching refreshes send no view read (unit).
- Determinism: FNV over `codePointAt` with `Math.imul` and `>>> 0` gives the same unsigned value in Node and browsers; pinned values in the contracts tests (`1:bb7f09af`, `2:0c0e8252`).
- No compatibility branch: `closedTaskExecutionsDigest ?? null` in the hydration map only turns the generated type's optional `undefined` into the field's declared `null`; a missing digest compares unequal and re-reads (DESIGN.md rule 9: no mixed versions).
- Dead code in touched files: none found (unused-import scan of the five touched production files; the moved status code left no unused import or helper in the root: `identityFor` and `createCollaborationAgentStatusSnapshot` still have callers there).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-002, BEH-004 | Rows of a closed Task leave every list whose open run is not the host, on the next poll | poll → `refreshListedStatuses` → `readAgentRunCollaborationStatuses` → `agentRunCollaborationStatuses` → `getAgentStatuses` (+ digest) → digest differs → `inspect(host)` → fresh view → `taskRows` | Fixed: phone with another run open, both rows (agent and Team) gone 3.2 s after the closes (IMP-07; still listed after 120 s in IMP-01). Desktop windows share the store path (unit IMP-12) |
| BEH-005 | Rows of a reopened Task return | Same path; the node's set shrinks → digest differs → re-read | Unit (store: "re-reads the view once when a closed Task was reopened"; server: digest returns to the empty set's after a reopen on a real root, IMP-03). Probe left to API/E2E |
| BEH-001 | Open host: live removal, unchanged | Live stream (untouched) | Preserved: 1 ms (IMP-07) |
| BEH-003 | Reload removes rows | Untouched | Preserved: `otherAfterReload: []` (IMP-07) |
| BEH-006 | Org hosts | Untouched (history read) | Preserved; suites green (IMP-08/10) |
| REQ-003 / AC-005 | No view read when nothing closed or reopened | Digest equal → `applyStatuses` | Unit: ten refreshes, ten states reads, no view read (IMP-12) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. No UI change; live streams, Team and Org hosts, poll timing and inactive hosts (FU-001) untouched; the three key copies untouched (FU-002).

## Key Files Or Areas

- `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts` (+ `dist/`), new test `tests/closed-task-executions-digest.test.mjs`.
- `autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-agent-run-root.ts` (accessor; status composition delegated), new `src/standalone-agent-run-root/services/standalone-root-agent-statuses.ts`, `services/standalone-agent-run-root-manager.ts`, `src/api/graphql/types/agent-run-collaboration.ts`; tests `tests/unit/api/graphql/agent-run-collaboration-statuses.test.ts`, `tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts`.
- `autobyteus-web/graphql/queries/collaboratorQueries.ts`, `generated/graphql.ts`, `services/agentCollaboration/agentRunCollaborationHydration.ts`, `stores/agentRunCollaborationStore.ts`; tests `stores/__tests__/agentRunCollaborationListedStatuses.spec.ts`, `services/agentCollaboration/__tests__/agentRunCollaborationStatuses.spec.ts`.
- Baseline fix (unrelated to this ticket's behavior): `autobyteus-web/pages/__tests__/mobile-root-shell.spec.ts`.

### Decision made inside the design (for review)

- **Root file size.** `standalone-agent-run-root.ts` had exactly 500 non-empty lines, so the design's one-line accessor would have taken it over the limit. The accessor must live on the root (only the root holds the task-execution lifecycle), so I split the file: the root's child-status composition (`getAgentStatusSnapshots`' body, 10 lines) moved unchanged into `collectStandaloneRootAgentStatusSnapshots` in `services/standalone-root-agent-statuses.ts`, beside the existing `collectStandaloneRootInputSnapshots`, which does the same job for input states. `getAgentStatusSnapshots()` keeps its signature and callers. Result: 495 non-empty lines. The existing root tests (55 in the folder) and the server unit suite cover the moved code.

## Important Assumptions

- ASM-001 (the node's host view marks closed executions when the Task closes) holds: IMP-03 checks it on a real root.

## Known Risks

- Team hosts: classified "not affected" by the design; validation adds the Team-host check (design Risks). Not exercised here.
- A 32-bit digest collision would leave one closure unseen until the next change or reload (design Key Tradeoffs).
- FU-001: a Task closed while its host run is stopped still needs a reload (unchanged, recorded).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix.
- Reviewed root-cause classification: Missing Invariant.
- Reviewed refactor decision: `No Refactor Needed` (the existing owner absorbs the rule); the one file split above is a size guardrail move, not a design refactor.
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as `Design Impact`: `N/A`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (none found; see self-review).
- Dead code found elsewhere, added to `follow-ups.md`: None.
- Shared structures remain tight: `Yes` (one nullable field; no list on the poll).
- Canonical shared design guidance was reapplied: `Yes`.
- Changed source files within size guardrails: `Yes`. Non-empty lines: root 500 → 495, manager 476 → 480, store 428 → 431, resolver 135 → 139, hydration 84 → 87, contracts file 241 → 256, new collector 36. No production delta above 220 lines.

## Persisted Data Transition Check

- Approved decision: `Not Affected` (the digest is computed on demand). Followed: `Yes`. Deviation: `None`.

## Environment Or Dependency Notes

- macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2. No dependency or lockfile change. The contracts package changed (a build input): fresh-start build IMP-13.

## Checks Run

Evidence paths are relative to the ticket folder's `evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `node evidence/repro/closed-task-rows-repro.mjs --output-dir=… --wait-s=120` (before any change) | `a85bf4f38d` | as above, headless Chrome | the phone run list path, before | BEH-002 (fail expected) | Pass (reproduced) | `IMP-01-repro-baseline/` (`README.md`, `repro-summary.json`, `repro-stdout.log`, screenshots) | `"goneAfterMs":{"host":2,"other":null}` |
| IMP-02 | `pnpm -C autobyteus-collaboration-stream-contracts test` | `8e686b7f36` | as above | the contracts package incl. the digest | AC-005 (determinism) | Pass | `IMP-02-contracts-tests.log` | `# tests 48`, `# pass 48`; ok 13–17 (digest) |
| IMP-03 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/api/graphql/agent-run-collaboration-statuses.test.ts tests/unit/standalone-agent-run-root --no-watch` | `ff9a0c7b0c` | as above | manager answer, resolver, real root close/reopen, the moved status collector | REQ-001, REQ-002, ASM-001 | Pass | `IMP-03-server-focused-tests.log` | `Test Files  10 passed (10)`, `Tests  59 passed (59)`; "Task DONE …" and "reactivation …" lines |
| IMP-04 | `pnpm -C autobyteus-server-ts typecheck` | `8e686b7f36` | as above | server `src` and tests | — | Pass | `IMP-04-server-typecheck.log` | `production errors: 0`, `PASS` |
| IMP-05 | `pnpm -C autobyteus-web typecheck` | `8e686b7f36` | as above | web app, Electron main, build scripts, cross-package tests | — | Pass | `IMP-05-web-typecheck.log` | `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`, `PASS` |
| IMP-06 | `pnpm -C autobyteus-web codegen:local` | `8e686b7f36` | as above | `generated/graphql.ts` from the built schema | — | Pass | `IMP-06-codegen.log` | `closedTaskExecutionsDigest?: Maybe<Scalars['String']['output']>;` |
| IMP-07 | `node evidence/repro/closed-task-rows-repro.mjs --output-dir=… --wait-s=120` (after the fix) | `8e686b7f36` | as above, builds IMP-11 | the phone run list path | AC-001, AC-004, BEH-003 | Pass | `IMP-07-repro-after-fix/` (`README.md`, `repro-summary.json`, `repro-stdout.log`, screenshots) | `"goneAfterMs":{"host":1,"other":3242}`, `"otherStillShownAtEnd":[]` |
| IMP-08 | `pnpm -C autobyteus-web test:nuxt --run` (full) | `8e686b7f36` | as above | every web spec | REQ-003 | Fail → 1 pre-existing failure, fixed (IMP-09) | `IMP-08-web-unit-full.excerpt.log`, `IMP-08-web-unit-full.log.gz` | `Test Files  1 failed \| 726 passed (727)`; `mobile-root-shell.spec.ts` |
| IMP-09 | rerun of `pages/__tests__/mobile-root-shell.spec.ts` after the baseline fix | `e8270ed84e` | as above | the pairing screen spec | — | Pass | `IMP-09-baseline-fix-mobile-root-shell.log` | `Tests  2 passed (2)`; the Cause section |
| IMP-10 | `pnpm -C autobyteus-server-ts test:unit` | `e8270ed84e` | as above | the whole server unit suite | REQ-003 | Pass | `IMP-10-server-unit-suite.excerpt.log`, `IMP-10-server-unit-suite.log.gz` | `Test Files  964 passed \| 5 skipped (969)`, `Tests  8202 passed` |
| IMP-11 | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `8e686b7f36` | as above | server `dist`, the served phone bundle | — | Pass | `IMP-11-builds.log` | `served phone bundle files with closedTaskExecutionsDigest: 1` |
| IMP-12 | `pnpm -C autobyteus-web test:nuxt --run services/agentCollaboration stores/__tests__/agentRunCollaboration` | `ff9a0c7b0c` | as above | the statuses read, `refreshListedStatuses`, the collaboration context and stores | REQ-001, REQ-002, AC-002 (shared store), AC-005 | Pass | `IMP-12-web-collaboration-specs.log` | `Test Files  16 passed (16)`, `Tests  108 passed (108)`; the five "closed-set digest (autobyteus-446)" lines |
| IMP-13 | Fresh-start build (TESTING.md): fresh clone, `pnpm install --frozen-lockfile`, `pnpm build:electron:mac -- --arm64` (runner env), then the job's Prisma and packaged-terminal verify steps | `ff9a0c7b0c` | as above | the whole desktop release build from `pnpm install` alone (guards, typecheck, server prepare, packaging) | — | Pass | `IMP-13-fresh-start-build.log` | `install=0`, `build=0`, `PRISMA_OK`, `ok: node-pty spawn probe`, `TERMINAL_OK` |

- Not run, and why: signing, notarization, x64 and other operating systems in IMP-13 (they need the runner). The design's step-4 phone probe case (`MSP-*`: AC-001 durable, AC-003 reopen, AC-006 hidden then shown, AC-005 network log, AC-002 desktop window) and the Team-host check are API/E2E's (they own probe authoring). Electron main-process tests: no Electron change.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable` as a visual change: no UI element changed. The rendered phone bundle was exercised for behavior by the reproduction (IMP-07): the rows leave the list by themselves.

## Downstream Coverage Hints / Suggested Scenarios

- The design's MSP case in `mobile-shell-probe.mjs` in the shape of the reproduction: AC-001 (≤ 10 s, another run open), AC-003 (reopen Task A: its row returns), AC-004 (open host ≤ 1 s), AC-006 (list hidden when the Task closes: no read while hidden; shown → rows gone ≤ 10 s), AC-005 (network log: one `GetAgentRunCollaborationStatuses` per tick and no `GetAgentRunCollaboration` while nothing changes).
- AC-002 in a desktop window whose open run is not the host, if the probe's desktop context allows it.
- Team host: a Team member delegates a Task; the Task closes while another run is open; the rows leave (design Risks).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The probe case and the Team-host check above. The fresh-start build check (IMP-13) is recorded here; delivery still runs `pnpm release:test` only if RELEASE.md asks for a build-step change (no build step changed here).
