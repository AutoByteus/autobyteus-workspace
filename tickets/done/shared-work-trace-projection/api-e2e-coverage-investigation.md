# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection/tickets/done/shared-work-trace-projection/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection/tickets/done/shared-work-trace-projection/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection/tickets/done/shared-work-trace-projection/proposed-design.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection/tickets/done/shared-work-trace-projection/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection/tickets/done/shared-work-trace-projection/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection/tickets/done/shared-work-trace-projection/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review passed and routed the shared Agent Work Trace Projection ticket to API/E2E coverage investigation and execution.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Yes

## Current Requirement And Design Basis

The approved task is a clean-cut ownership/path refactor for work-trace projection. The current behavior to prove is:

- The shared Agent Work Trace Projection capability is the owner of raw-trace-to-readable-work-trace projection (`REQ-WT-001`, `REQ-WT-008`, `REQ-WT-010`).
- The public production boundary is `AgentWorkTraceProjectionService.ensureCurrent({ target, memoryDir })`; consumers must not instantiate shared projection internals directly.
- Generated work traces and manifest must be written to the shared per-run layout `<memoryDir>/work_traces/` using `work_traces_manifest.json`, `work_trace_active.md`, and archive-index files such as `work_trace_000001.md` (`REQ-WT-002`, `REQ-WT-003`, `AC-WT-001`, `AC-WT-002`).
- Rendering must preserve readable information for messages, reasoning, tool calls/results/errors, and compaction boundary events, with backend/internal fields redacted (`REQ-WT-004`, `AC-WT-003`).
- Archive projection reuse must preserve unchanged archive file metadata while active projections refresh (`REQ-WT-005`, `AC-WT-005`).
- Self-evolution must be a consumer of the shared package, refresh it before companion triggering, and pass only manifest/root/file paths to the companion prompt and metadata (`REQ-WT-006`, `REQ-WT-007`, `REQ-WT-011`, `AC-WT-004`).
- Obsolete self-evolution projection owner files, old domain/store/renderer/reader names, and the old generated path `<memoryDir>/self_evolution/work_traces/` must not remain as production owners, wrappers, fallbacks, or dual-write/read paths (`REQ-WT-009`, `AC-WT-006`, design legacy-removal policy).
- The active raw trace source must be discovered/read through `RawTraceFileSourceService` / `RunMemoryFileStore` so the active file is the canonical `raw_traces_active.jsonl`; this ticket must not revive production fallback to old `raw_traces.jsonl` (`REQ-WT-012`, `AC-WT-011`).
- Memory compaction consumption is intentionally out of scope; this ticket prepares a shared boundary only.

The implementation handoff's Legacy / Compatibility Removal Check is clean: no backward-compatibility mechanisms introduced, no legacy old behavior retained, obsolete files removed, no production `self_evolution/work_traces` target, and only app-data migration code references old `raw_traces.jsonl`. Code review confirmed the same with a pass.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Shared `src/agent-work-traces/` capability and `AgentWorkTraceProjectionService.ensureCurrent({ target, memoryDir })` | Added | Requirements `REQ-WT-001`, design primary spine DS-WT-001, implementation handoff "What Changed", code review pass | Retain/execute durable projection service coverage; add static validation that production consumers do not bypass the public boundary. |
| Work trace disk root `<memoryDir>/work_traces/` with common manifest/files | Changed | `REQ-WT-002`, `REQ-WT-003`, `AC-WT-001`, `AC-WT-002`, design disk-layout examples | Execute projection coverage that asserts shared root/manifest/file names and absence of old generated directory. |
| Readable rendering semantics and redaction | Preserved under shared owner | `REQ-WT-004`, `AC-WT-003`, design guidance to preserve rendering semantics | Execute existing moved projection coverage for user/worker/tool rendering and hidden backend fields. |
| Archive and active raw trace source handling | Changed owner / Preserved semantics | `REQ-WT-005`, `REQ-WT-012`, `AC-WT-005`, `AC-WT-011`, implementation use of `RawTraceFileSourceService` | Execute archive+active coverage and static scan for old active filename fallback outside app-data migrations. |
| Self-evolution projection ownership | Removed | `REQ-WT-006`, `REQ-WT-009`, `AC-WT-006`, design removal/decommission plan, implementation removed old files | Treat old self-evolution projection test/file assertions as stale/replaced; static scan for removed owner names/imports. |
| Self-evolution path-only companion evidence package | Preserved / Changed paths | `REQ-WT-007`, `REQ-WT-011`, `AC-WT-004`, design self-evolution consumer spine | Execute self-evolution companion/session/integration coverage for path-only prompt/metadata and per-click projection refresh. |
| Future memory compaction dependency on work traces | Preserved as out of scope / Prepared | Requirements out-of-scope and `REQ-WT-010`, design dependency rules | No compaction tests in this stage; static dependency scan confirms no self-evolution dependency is required for future consumers. |
| Old `<memoryDir>/self_evolution/work_traces/` generated-cache fallback/dual path | Removed / Rejected | Requirements out-of-scope migration note; design backward-compatibility rejection log; implementation compatibility check | Do not add compatibility coverage. Static scans and projection test negative assertion prove absence of retained path. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` / active projection scenario | Calls `AgentWorkTraceProjectionService.ensureCurrent`, writes `raw_traces_active.jsonl`, asserts `<memoryDir>/work_traces/`, manifest path, active file metadata, shared heading, message/tool rendering, backend-field redaction, no `targetKey`, and no `<memoryDir>/self_evolution/work_traces/` directory. | `REQ-WT-001` through `REQ-WT-004`, `REQ-WT-008`, `REQ-WT-009`, `REQ-WT-012`; `AC-WT-001` through `AC-WT-003`, `AC-WT-006`, `AC-WT-009`, `AC-WT-011`. | Still Valid | Source inspection shows this is the moved shared-owner durable coverage and uses `raw_traces_active.jsonl`. It asserts the current shared path and rejects the old generated path. | Execute in final focused validation. |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` / archive + active catch-up scenario | Writes archive manifest/segment plus active file, asserts chronological archive then active files, archive filename, active filename, rendered content, and unchanged archive generatedAt reuse while active file refreshes. | `REQ-WT-001`, `REQ-WT-002`, `REQ-WT-003`, `REQ-WT-005`, `REQ-WT-012`; `AC-WT-002`, `AC-WT-005`, `AC-WT-011`; design DS-WT-003. | Still Valid | Existing test covers the most important edge behavior for archive reuse and active refresh through the shared projection service. | Execute in final focused validation. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` / companion post and message builder path-only scenarios | Builds/posts companion request using shared package-shaped fixture under `<memoryDir>/work_traces/`, asserts prompt contains manifest/root/file paths and package tree, metadata contains path keys, and prompt does not inline raw traces or prior internal state. | `REQ-WT-006`, `REQ-WT-007`, `REQ-WT-011`; `AC-WT-004`; design self-evolution consumer spine. | Still Valid | Source inspection confirms path-only behavior with shared paths; no production projection ownership is asserted here. | Execute in final focused validation. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` / session state scenarios | Persists/reuses/restores/replaces companion session and retains self-evolution session fields pointing at work trace paths. | `REQ-WT-006`, `REQ-WT-011`; self-evolution session state remains consumer-owned. | Still Valid | These scenarios are broader self-evolution coverage and still valid because self-evolution-specific state can remain under `<memoryDir>/self_evolution/` while pointing at shared work-trace paths. | Execute with self-evolution focused suite. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts` / per-click projection refresh scenario | Mocks shared projection service, verifies `ensureCurrent` is called before each companion trigger, companion run is reused, each request uses latest summary hash, and record stores latest `evidenceSummaryHash`. | `REQ-WT-006`, `REQ-WT-007`; `AC-WT-004`, `AC-WT-008`, `AC-WT-009`. | Still Valid | Source inspection confirms self-evolution is a consumer and this integration coverage proves sequencing without asserting projection internals. | Execute in final focused validation. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts` / completed/stale/timeout/error flows | Protects self-evolution lifecycle behavior around the changed trigger path. | `REQ-WT-006`; `AC-WT-008`. | Still Valid | These are existing behavior regression scenarios that should remain green after migration. | Execute with focused self-evolution suite. |
| Removed `autobyteus-server-ts/tests/self-evolution/self-evolution-work-trace-projection-service.test.ts` | Former authoritative projection test for `SelfEvolutionWorkTraceProjectionService` and old `<memoryDir>/self_evolution/work_traces/` path. | Obsolete under `REQ-WT-006`, `REQ-WT-008`, `REQ-WT-009`; design removal/decommission plan; backward-compatibility rejection log. | Replace | `git show HEAD:...` confirms the removed test asserted `SelfEvolutionWorkTraceProjectionService` and old generated root. Current shared test preserves rendering/archive assertions while changing the owner/path. | No additional action; replacement coverage is `tests/agent-work-traces/agent-work-trace-projection-service.test.ts`. |
| `autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts` / raw trace active-file API scenarios | Existing GraphQL API e2e coverage for raw trace file metadata, active raw trace selection, segment selection, imported read-only memory sources, and old selector fallback to current active file selection. | Raw trace API boundary is not changed by this ticket, but it is adjacent evidence for `RawTraceFileSourceService` / active filename behavior supporting `REQ-WT-012`. | Still Valid for raw-trace API; Out Of Scope as durable work-trace projection coverage | Test is not about work traces, but executing it gives broader API evidence that the raw trace file-source boundary remains healthy on canonical `raw_traces_active.jsonl`. | Execute as broader API validation if local environment supports it. |
| `autobyteus-server-ts/tests/unit/app-data-migrations/raw-trace-active-file-name-migration.test.ts` and app-data migration source | Migration-only old `raw_traces.jsonl` handling. | Requirements permit old filename handling only in completed app-data migration context, not projection runtime. | Out Of Scope | Static scans show old filename production references only in migration files; this ticket must not add projection fallback tests around migration behavior. | Static scan only; no final execution needed. |
| Other self-evolution tests under `autobyteus-server-ts/tests/self-evolution/` | Eligibility, configuration, GraphQL, record lifecycle, notifications, manual triggers. | Broad self-evolution behavior mostly outside this projection migration. | Out Of Scope for this focused ticket | No changed projection boundary assertion beyond the listed focused tests. | Not scheduled unless focused suite uncovers a wider failure. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-work-trace-projection-service.test.ts` (removed by implementation) | `SelfEvolutionWorkTraceProjectionService` is the projection owner and `workTraceRootPath` is `<memoryDir>/self_evolution/work_traces`. | Approved design makes self-evolution a consumer, creates shared `agent-work-traces`, writes only `<memoryDir>/work_traces`, and rejects wrappers/dual paths/fallbacks. | `REQ-WT-006`, `REQ-WT-008`, `REQ-WT-009`; `AC-WT-001`, `AC-WT-006`, `AC-WT-009`; proposed-design removal plan and compatibility rejection log; code review removed/verified obsolete file. | `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` covers equivalent projection/rendering/archive behavior under the shared owner/path. | N/A; replacement exists. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing reviewed durable coverage already covers the required current behaviors. | N/A | No additional repository-resident durable coverage is needed during API/E2E. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | None. | N/A | The implementation-stage test updates are valid and code-reviewed. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A for this API/E2E stage | No additional durable coverage removal is needed after code review. | N/A | The obsolete old self-evolution projection test was already removed by implementation and replaced by shared projection coverage before code review. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TV-WT-STATIC-001 | Repository `rg` scans for old owner names/files, old generated path, forbidden dependency directions, consumer imports of projection internals, and old active raw trace fallback outside migrations. | Confirms architecture/legacy constraints that are acceptance criteria but not all best expressed as runtime tests. | Static validation is execution evidence for this ticket; adding brittle grep tests is unnecessary because durable behavior tests already cover the primary runtime boundaries. |
| TV-WT-BUILD-001 | Source build typecheck with `tsc -p tsconfig.build.json --noEmit`. | Confirms changed production source and imports typecheck. | This is a validation command, not new durable coverage. |
| TV-WT-API-001 | Existing GraphQL memory-view e2e test, if runnable locally. | Confirms adjacent raw trace API/file-source behavior on `raw_traces_active.jsonl` remains healthy. | It already exists as durable API coverage; no new test artifact is needed for this ticket. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Future memory compaction consumption of shared work traces | Explicitly out of scope for this ticket. | Future compaction may need manifest/schema additions. | Follow-up memory compaction redesign should consume `AgentWorkTraceProjectionService` directly. |
| External readers outside this repository expecting `<memoryDir>/self_evolution/work_traces/` | Repository cannot prove external integration behavior; approved design intentionally rejects compatibility and old generated files are regenerable from canonical raw traces. | Unknown external clients may need docs/release awareness. | Delivery should update durable docs or explicitly record no-impact after integrated-state refresh. |
| Full repository `pnpm -C autobyteus-server-ts run typecheck` | Implementation and code review both recorded a pre-existing TS6059 `rootDir`/`tests` include mismatch unrelated to this change; source build typecheck is the scoped executable check. | Repo-level typecheck remains unavailable as a pass/fail signal until config is fixed. | Keep the blocker noted for delivery; do not reroute this ticket because source build typecheck passes. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None found in investigation. | N/A | Upstream requirements/design explicitly reject compatibility, implementation handoff's Legacy / Compatibility Removal Check is clean, and code review found no findings. | N/A |

## Execution Plan

1. Do not add, update, or remove repository-resident durable coverage during API/E2E; existing reviewed coverage is valid.
2. Execute the focused durable coverage suite:
   - `tests/agent-work-traces/agent-work-trace-projection-service.test.ts`
   - `tests/self-evolution/self-evolution-companion-session-service.test.ts`
   - `tests/self-evolution/self-evolution-service.integration.test.ts`
3. Execute the adjacent GraphQL memory-view e2e suite to verify raw trace file-source/API behavior using `raw_traces_active.jsonl`, if the local test environment supports it.
4. Run source build typecheck: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`.
5. Run static validation scans for old owner names/files, old generated path retention, forbidden dependency direction, consumer direct use of internals, and old active raw trace fallback outside app-data migrations.
6. Record all command results and evidence in the canonical execution coverage report.
7. On pass with no repository-resident durable coverage changes after code review, hand the cumulative package to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing implementation-stage durable coverage is valid and sufficient for the approved shared projection scope. API/E2E will execute it plus static and adjacent API checks, without creating compatibility-only coverage or touching repository-resident coverage after code review.
