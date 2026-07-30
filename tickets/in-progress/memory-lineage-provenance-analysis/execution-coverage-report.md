# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/memory-context-and-lineage-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/use-case-data-flow-spine-map.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/provenance-methodology-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/compacted-memory-message-role-analysis.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: `1`
- Trigger: `code_reviewer` source-review `Pass`, `CRR-002`, for `IR-002` at implementation commit `394885c1090cfc8313f2864a2dbca541575bec2f`
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: This file, round 1

## Investigation And Execution Basis

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes` — discovery first reproduced the expected stale-suite baseline, current-contract durable coverage replaced it, focused checks preceded affected and full E2E, and lifecycle/provider validation followed the confidence gate.
- Existing coverage decisions revised during execution, with evidence:
  - The old v4/gate/manifest/old-strategy assertions were confirmed stale and were replaced rather than used to force compatibility.
  - Two server E2E assertions were updated to the reviewed current contract: manager-owned proposal/accept/commit with lineage, and typed aggregate throw for failed required migrations.
  - A broad full-E2E process-spawn failure was classified as an unrelated transient only after its exact two-test file passed immediately in isolation.
  - An initial process-global ultra-low compaction ratio also affected built-in compactor agents. The owned run was stopped and deleted; the successful live journey used the same low ratio only in the parent run's supported `llmConfig`.
- Reroute required before or during execution: `No`
- Notes: No production implementation source changed in this stage. The API/E2E-owned changes are durable tests plus the three API/E2E reports and retained value-safe evidence.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

The stale runtime gate test and v4/tolerant-reader expectations were removed. Replacement coverage asserts the one required reset, strict schema v5, absent-lineage no-memory behavior, and no runtime compatibility branch.

## Changed Boundary And Evidence Matrix

Evidence paths below are relative to:
`/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e`.

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type (`Durable`/`Temporary`/`Live`/`Browser`/`Desktop`) | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | AC-002; active-only Event Monitor | active raw reader -> run-history GraphQL | server unit/API E2E | Durable | Pass | `server-memory-run-history-graphql-e2e-01.log`; `server-affected-unit-integration-current-core-02.log` |
| SCN-002 | REQ-003/004; AC-003; C1 accept/commit and exact R(n) archive | strategy proposal -> manager acceptance -> file stores | core real-file tests plus credential-backed built server | Durable + Live | Pass | `core-memory-suite-current-02.log`; `live-provider-compaction-journey-01.log` |
| SCN-003 | AC-007/008; no-compaction snapshot/render equality | finalized WorkingContext -> snapshot/provider render | core unit/integration | Durable | Pass | `core-memory-suite-current-02.log` |
| SCN-004 | AC-007; compacted memory with retained/current content | current-tail projection -> canonical composition | core unit/integration | Durable | Pass | `core-memory-suite-current-02.log` |
| SCN-005 | AC-007/008; tool protocol survives compaction | planner/finalizer/snapshot/provider-neutral message | core unit/integration | Durable | Pass | `core-memory-suite-current-02.log`; `core-agent-runtime-integration-current-02.log` |
| SCN-006 | AC-007/008; multimodal composition/restore | media/tool structures -> v5 snapshot | core snapshot/restore integration | Durable | Pass | `core-memory-suite-current-02.log` |
| SCN-007 | REQ-007; AC-007; recurrent C2 and 1,000-tail bounded current output | lineage tail/current loader/projector/archive | core real-file long-chain plus live C1/C2 | Durable + Live | Pass | `lineage-1000-current-output-01.log`; `live-provider-compaction-journey-01.log` |
| SCN-008 | REQ-008; AC-008/009; exact reset, startup gate, v5/no-lineage and interrupt recovery | migration runner -> `startConfiguredServer`; runtime -> file restore | server lifecycle, core native runtime, actual built server | Durable + Live | Pass | `server-migration-suite-01.log`; `server-startup-migration-gate-02.log`; `runtime-interrupt-reset-followup-02.log`; `server-actual-startup-secret-e2e-current-build-01.log` |
| SCN-009 | REQ-009; AC-010; external runtimes remain evidence-only | storage-only runtime recorder | affected integration/full E2E | Durable | Pass | `server-affected-unit-integration-current-core-02.log`; `root-test-e2e-current-03.log` |
| SCN-010 | AC-004–006; one-to-three episodes share one lineage | parser/normalizer/acceptance/output rows | core durable tests plus live provider | Durable + Live | Pass | `core-memory-suite-current-02.log`; live result produced one episode in each of C1/C2 |
| SCN-011 | AC-004–006; at most twenty semantics share lineage | parser/normalizer/acceptance/output rows | core durable tests plus live provider | Durable + Live | Pass | `core-memory-suite-current-02.log`; live result produced four semantics in each of C1/C2 |
| SCN-012 | REQ-006; AC-004/005/012; typed direct/root resolution and integrity outcomes | lineage store + raw archive manifest resolver | real-file core tests and server origin service | Durable | Pass | `lineage-resolver-suite-01.log`; `server-scope-origin-suite-01.log` |
| SCN-013 | AC-011; runner/parser failure and same-ID retry without mutation | pending executor -> strategy/parser -> manager | core real-file/runtime tests | Durable | Pass | `core-memory-suite-current-02.log`; `core-agent-runtime-integration-current-02.log` |
| SCN-014 | AC-002; active rewrite expires cursor without archive fallback | raw rotation -> Event Monitor cursor/API | server projection/GraphQL E2E | Durable | Pass | `server-memory-run-history-graphql-e2e-01.log` |
| SCN-015 | REQ-010; AC-014; natural one-boundary compactor golden | planner-selected context -> renderer -> compactor prompt | core golden/unit | Durable | Pass | `core-memory-suite-current-02.log` |
| SCN-016 | REQ-011; AC-015; common body policy with separate Work Evidence envelope | core renderer -> compactor and server projection adapters | core/server golden/unit | Durable | Pass | `core-memory-suite-current-02.log`; `work-evidence-presentation-01.log` |

## Additional Repository Coverage Execution

The coverage investigation is authoritative for the complete command sequence. These were selected lifecycle steps, broad reruns, and provider-backed checks after the post-repository confidence gate.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | focused native interrupt/reset/follow-up test-name run, then full `agent-runtime.test.ts` | `autobyteus-ts`; controllable LLM, real runtime/file stores | SCN-008 cancellation fence through reset and follow-up | Pass: focused 1 pass/11 skipped; full 12/12 | `runtime-interrupt-reset-followup-02.log`; `core-agent-runtime-integration-current-02.log` |
| 2 | focused migration/runner and exported startup-gate suites | `autobyteus-server-ts`; current worktree core | SCN-008 required failure non-exposure and startable statuses | Pass: 7 migration tests and 1 startup-gate test | `server-migration-suite-01.log`; `server-startup-migration-gate-02.log` |
| 3 | current build plus actual-server startup/secret E2E | root/server; freshly built current packages | real process startup/restart with successful required migration results | Pass: 2 files / 8 tests | `server-build-current-core.log`; `server-actual-startup-secret-e2e-current-build-01.log` |
| 4 | `pnpm test:e2e` | root; deterministic server E2E | broad API/process/filesystem regression | Target scenarios pass; 47 files/164 tests passed, 14 files/49 tests skipped; one unrelated managed-gateway spawn test failed transiently | `root-test-e2e-current-03.log` |
| 5 | isolated managed-gateway recovery file rerun | server Vitest | failure-origin check for the unrelated broad-run failure | Pass: 1 file / 2 tests | `server-managed-gateway-recovery-rerun-01.log` |
| 6 | `pnpm secrets:import ... --dry-run`, then confirmed execution | root; user-authorized owner-private source, isolated SQLite/vault | project-authoritative, value-safe live-provider setup | Pass: 9 planned/configured, no values emitted | `live-provider-secret-import-dry-run.log`; `live-provider-secret-import-execution.log` |
| 7 | temporary built-server/GraphQL/WebSocket two-turn compaction journey | current server; OpenAI `gpt-5.4-mini`; parent-only ratio `0.0001` | live C1/C2 provider/stream/manager/filesystem/v5 chain | Pass | `live-provider-compaction-journey-01.log` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | 98% | +4 | Every SCN-001–016 passed; critical interrupt/reset/startup and live recurrent compaction were directly executed | Only explicit out-of-scope crash atomicity and subjective semantic quality remain |
| Changed-boundary execution directness | 93% | 98% | +5 | Real file stores, exported startup caller, actual built server, GraphQL/WebSocket turns and live manager publication | None material within the approved reachable paths |
| Cross-boundary integration realism and mock gap | 90% | 98% | +8 | Actual provider/vault/server/stream/compactor/lineage path supplements deterministic runtime and API integration | Non-target dependencies remain mocked only in the failure non-exposure test |
| Environment, configuration, identity, and fixture fidelity | 94% | 96% | +2 | Project importer, isolated SQLite/vault, current build, standalone/direct/nested scopes, Prisma and actual child process | Temporary worktree dependency links were required; an ultra-low global ratio was too broad and was replaced by parent-run config |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 97% | +4 | Wrong/blank boundaries, retry non-mutation, integrity failures, deletion failure, startup rejection, reset/bootstrap/follow-up and isolated flake rerun | Process termination during multi-file publication remains explicitly out of scope |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | N/A | No UI, renderer, browser, preload, IPC, window or packaging source changed | N/A |
| Durable regression coverage quality and relevance | 96% | 96% | 0 | Current-contract tests replace obsolete compatibility assertions and cover the real owners | Proportional changed-test review remains the next workflow gate |

- Overall post-repository confidence: `93%`
- Overall final confidence: `97%`
- Calculation method: Simple mean of the six applicable category scores, rounded to the nearest whole percent. The genuinely inapplicable UI/browser/desktop category is excluded.
- Confidence change produced by broader validation: `+4 percentage points`; caller/process/provider sequencing and the real C1/C2 publication path moved from mocked/indirect to direct.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - No journal or crash-atomic contract exists for termination between multi-file publication writes; this is explicitly out of scope.
  - The live provider run proves schema-valid recurrent publication, not subjective long-form summary quality.
  - The documented process-global ratio applies to built-in compactor agents too; the successful low-ratio test therefore used a parent-run override rather than claiming an ultra-low global ratio is production-safe.
  - Repository `tsconfig.json` includes tests while fixing `rootDir` to `src`; it is not a valid all-tests typecheck. The authoritative build config and full build pass.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required` — lifecycle, broader API/process E2E, and credential-backed built-server/WebSocket validation.
- Material deviation from the planned mode or rationale: The user authorized the existing owner-private assignment source and suggested a low trigger ratio, so a real-provider C1/C2 journey was added. The low ratio was scoped to the parent run after the process-global form also affected compactor agents.
- Confidence gap or residual risk actually addressed: real interrupt/reset/follow-up sequencing; startup failure non-exposure; actual process startability; active-only API projections; and real provider -> streaming -> compactor -> manager -> filesystem publication.
- If `Not Required`, direct evidence that made broader validation unnecessary: `N/A`
- If `Blocked`, exact unavailable dependency or access and attempted alternatives: `N/A`
- Startup order, commands, and readiness results:
  1. Build current core/shared SDK/server packages.
  2. Dry-run and execute the documented `pnpm secrets:import` against a test-owned absolute SQLite URL.
  3. Start the freshly built server against the isolated runtime/database and wait for its normal listen marker.
  4. Create an agent definition and native run by GraphQL, connect its real agent WebSocket, and send two turns.
  5. Wait for running/idle plus assistant/compaction events and verify persisted lineage/archive/output/snapshot files.
  6. Terminate the run/server and delete all owned live data.
- Environment choices that materially affected the run: macOS arm64; Node `22.23.1`; pnpm `10.28.2`; OpenAI `gpt-5.4-mini`; parent-run `compaction_ratio=0.0001`; `max_tokens=128`; built-in compactor kept its normal threshold.
- Seed data, fixtures, identities, authentication, permissions, or session state: Two short deterministic user messages; one generated test agent definition; a temporary workspace; an isolated imported secret vault. No shared development, packaged-app, or home runtime data was modified.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Credential import | Dry run and execution identify/configure the target without value output | 9 create actions planned and 9 secrets configured; evidence remained value-free | import logs | Pass |
| Built-server startup | Required migrations finish before normal listen | Fresh built server reached readiness against the isolated database/runtime | live harness readiness plus startup/build logs | Pass |
| First WebSocket turn | Real provider response triggers C1 | Stream showed turn, assistant, token and `COMPACTION_STATUS` events; C1 had `previousCompactionId: null` | `live-provider-compaction-journey-01.log` | Pass |
| Second WebSocket turn | Real provider response triggers recurrent C2 | C2 linked directly to C1 and used a distinct archive | same | Pass |
| Publication inspection | Each record has bounded output, provider/model metadata and a non-empty referenced archive; snapshot is v5 | Each record had 1 episode, 4 semantics and a one-record archive; snapshot schema was 5 with 3 messages | same | Pass |
| Value safety and cleanup | No secret values in evidence; no owned state/process remains | Evidence scanner passed; database, key, runtime, workspace, probe and processes removed | cleanup checks | Pass |

## Desktop Application Validation (When Applicable)

- Validation approach executed and any deviation from the investigation: `N/A`; backend/process/file boundaries were exercised directly.
- Browser-tested web-equivalent behavior and evidence: `N/A`; no renderer behavior changed.
- Shell-specific or lifecycle behavior and evidence: Server lifecycle was exercised without launching Electron; no preload/IPC/window/package behavior changed.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: Electron wrapping was not run and creates no material uncertainty for this backend-only ticket.

## Platform / Runtime Targets

- Operating system / platform: macOS (`darwin`, arm64)
- Runtime and relevant framework versions: Node `v22.23.1`; pnpm `10.28.2`; Vitest `4.0.18`; Fastify built server; Prisma `5.22.0`
- Browser / engine and version, when applicable: `N/A`
- Device, viewport, locale, timezone, or accessibility settings, when applicable: `N/A`; execution timezone `Europe/Berlin`

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: Raw evidence and current-format state are `Directly Usable — No Migration`; pre-lineage episode/semantic/snapshot/manifest files are `Discard or Rebuild`.
- Representative existing data exercised: standalone, direct team-member and nested team-member run trees with all four obsolete files plus byte-recorded active/archive raw traces and manifests; missing targets; forced deletion/discovery failure.
- Direct-use, discard/rebuild, or migration result and evidence: Exactly the four obsolete derived files were removed, raw evidence was byte-preserved, missing targets were idempotent, and failure was `FAILED`. Runner persisted attempted results and blocked startup for non-startable required results.
- Migration completion/recovery evidence, only when `Migration Required`: `N/A`; this is a required discard/reset lifecycle, not content transformation.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: Only explicitly excluded crash interruption between normal multi-file publication steps.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/compaction-response-parser.test.ts` | Updated | AC-003/006/011 exact response schema | Pass | Removes stale aliases/extras |
| `autobyteus-ts/tests/unit/memory/compaction-result-normalizer.test.ts` | Updated | bounded current replacement | Pass | Current fields/bounds only |
| `autobyteus-ts/tests/unit/memory/agent-compaction-summarizer.test.ts` | Updated | runner metadata and current result | Pass | No old citation/ID contract |
| `autobyteus-ts/tests/unit/memory/working-context-compaction-prompt-builder.test.ts` | Updated | SCN-015 / AC-014 | Pass | Natural one-boundary golden |
| `autobyteus-ts/tests/unit/memory/compacted-memory-context-projector.test.ts` | Updated | exact current-tail projection | Pass | No historical retriever authority |
| `autobyteus-ts/tests/unit/memory/working-context-message-window-planner.test.ts` | Updated | M(n-1)+R(n), R(n)-only archive | Pass | Current plan shape |
| `autobyteus-ts/tests/unit/memory/working-context-compaction-strategy-registry.test.ts` | Updated | proposal-only strategy | Pass | No legacy `compact()` |
| `autobyteus-ts/tests/unit/memory/structured-json-compaction-strategy.test.ts` | Updated | IDless/no-write proposal | Pass | Manager remains owner |
| `autobyteus-ts/tests/unit/memory/file-store.test.ts` | Updated | current raw/archive/snapshot store | Pass | Obsolete manifest assertions removed |
| `autobyteus-ts/tests/unit/memory/memory-manager-working-context-snapshot-persistence.test.ts` | Updated | manager publication/v5 persistence | Pass | Real accepted current state |
| `autobyteus-ts/tests/unit/memory/working-context-tool-protocol-repairer.test.ts` | Updated | finalized tool protocol | Pass | Current provenance helpers |
| `autobyteus-ts/tests/unit/memory/working-context-snapshot-serializer.test.ts` | Updated | strict schema v5 | Pass | Tool/media/ranges and invalid roots |
| `autobyteus-ts/tests/unit/memory/working-context-snapshot-bootstrapper.test.ts` | Updated | v5/current-tail/no-lineage bootstrap | Pass | No v4/archive replay |
| `autobyteus-ts/tests/integration/memory/working-context-snapshot-restore.test.ts` | Updated | exact v5 logical restore | Pass | Current-only integration |
| `autobyteus-ts/tests/unit/memory/pending-compaction-executor.test.ts` | Updated | AC-011 accept/retry non-mutation | Pass | Real file-backed manager seams |
| `autobyteus-ts/tests/unit/memory/working-context-compaction-output-validator.test.ts` | Updated | accepted current proposal | Pass | Current output contract |
| `autobyteus-ts/tests/unit/memory/file-compaction-lineage-store.test.ts` | Added | append/current-tail invariants | Pass | Includes 1,000-record bounded-head proof |
| `autobyteus-ts/tests/unit/memory/compaction-lineage-resolver.test.ts` | Added | SCN-012 direct/root/integrity | Pass | Typed kind and no guessing |
| `autobyteus-ts/tests/unit/memory/readable-memory-presentation.test.ts` | Added | shared condensed renderer | Pass | Redaction/serialization/omission |
| `autobyteus-ts/tests/integration/agent/runtime/agent-runtime.test.ts` | Updated | real interrupt/reset/bootstrap/follow-up | Pass | Trusted raw fence and untrusted exclusion |
| `autobyteus-server-ts/tests/unit/app-data-migrations/reset-pre-lineage-memory-app-data-migration.test.ts` | Added | exact discard/reset | Pass | Raw byte preservation and failures |
| `autobyteus-server-ts/tests/unit/app-data-migrations/app-data-migration-runner.test.ts` | Updated | attempted-result persistence/startability | Pass | Required aggregate throw |
| `autobyteus-server-ts/tests/unit/server-runtime-app-data-migration-gate.test.ts` | Added | real `startConfiguredServer` failure gate | Pass | Bootstrap/build/listen non-invocation |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Updated | SCN-016 / AC-015 | Pass | Work Evidence envelope stays separate |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/compaction-lineage-scope-resolver.test.ts` | Added | standalone/team-member scope | Pass | Explicit runtime-neutral scope |
| `autobyteus-server-ts/tests/unit/memory-lineage/agent-memory-origin-service.test.ts` | Added | server origin service | Pass | Typed resolver wiring |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` | Updated | scope/provider factory wiring | Pass | Fails before acceptance when unavailable |
| `autobyteus-server-ts/tests/unit/agent-execution/compaction/memory-compactor-agent-launch-resolver.test.ts` | Updated | fixed built-in and parent launch fallback | Pass | No arbitrary-agent fallback |
| `autobyteus-server-ts/tests/unit/agent-execution/compaction/server-compaction-agent-runner.test.ts` | Updated | execution metadata/runner | Pass | Provider/model/runtime evidence |
| `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` | Updated | real manager accept/commit current contract | Pass | Replaces lineage-less old-strategy setup |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-legacy-path-columns-drop-startup.e2e.test.ts` | Updated | typed required-migration aggregate | Pass | Reads persisted attempted results from error |

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/compacted-memory-schema-gate.test.ts` | Runtime v4 gate/reset/manifest ownership | REQ-008, AC-009, reviewed clean-cut removal plan | Replaced by the required startup reset, strict v5 serializer/bootstrap and no-lineage tests; retaining a unit test for the deleted class would protect invalid compatibility |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated: 31 exact paths listed in the preceding table.
- Paths removed: `autobyteus-ts/tests/unit/memory/compacted-memory-schema-gate.test.ts`
- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: This report, the coverage investigation's stale-coverage table, and the repository diff/status identify the deleted path and its replacements.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `.../evidence/api-e2e/core-memory-suite-current-02.log` | Final core memory suite | Retained | 33 files / 148 tests pass |
| `.../evidence/api-e2e/core-agent-runtime-integration-current-02.log` | Native runtime lifecycle | Retained | 1 file / 12 tests pass |
| `.../evidence/api-e2e/lineage-resolver-suite-01.log` | Resolver/integrity | Retained | 2 files / 18 tests pass |
| `.../evidence/api-e2e/lineage-1000-current-output-01.log` | Long-chain bounded current output | Retained | 1 file / 8 tests pass |
| `.../evidence/api-e2e/server-migration-suite-01.log` | Reset/runner | Retained | 2 files / 7 tests pass |
| `.../evidence/api-e2e/server-startup-migration-gate-02.log` | Startup failure gate | Retained | 1 test passes |
| `.../evidence/api-e2e/server-affected-unit-integration-current-core-02.log` | Broad affected server checks | Retained | 12 files / 62 tests pass |
| `.../evidence/api-e2e/server-memory-run-history-graphql-e2e-01.log` | Memory/run-history API | Retained | 4 files / 18 tests pass |
| `.../evidence/api-e2e/root-test-e2e-current-03.log` | Full deterministic E2E | Retained | Target pass set plus one disclosed transient |
| `.../evidence/api-e2e/server-managed-gateway-recovery-rerun-01.log` | Transient-origin recheck | Retained | Exact file 2/2 pass |
| `.../evidence/api-e2e/live-provider-secret-import-dry-run.log` | Value-safe import preview | Retained | No secret values |
| `.../evidence/api-e2e/live-provider-secret-import-execution.log` | Value-safe isolated-vault import | Retained | No secret values |
| `.../evidence/api-e2e/live-provider-compaction-journey-01.log` | Real-provider C1/C2 summary | Retained | Value-safe PASS JSON |

All evidence paths are beneath:
`/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e`.

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Worktree `node_modules` symlinks and temporary main-server core link | Execute installed dependencies while resolving implementation under review | Current core/server/SDK builds and tests passed | Worktree links removed; main link restored to `../../autobyteus-ts` |
| Temporary native runtime/provider probe | Exercise built server, GraphQL, WebSocket, real provider and persisted files without adding credential-gated durable coverage | `live-provider-compaction-journey-01.log` | Probe file removed |
| Isolated `api-e2e-live-compaction.db` plus adjacent vault key/runtime/workspace | Safely import user-authorized credentials and avoid shared state | Import and live journey passed | Database, key, runtime and workspace removed |
| Initial process-global ratio `0.0001` | First attempt to force compaction | Too broad: built-in compactor agents also reached the threshold | Owned server stopped; runtime deleted; successful rerun used parent-run ratio |
| First two broad root-E2E setup attempts | Discover missing package-local links and stale `dist`/current-contract E2E expectations | Setup corrected and final suites passed | Links/state cleaned; discovery logs retained and labeled non-authoritative |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Native runtime LLM in deterministic interrupt journey | Controllable project LLM harness | Exact interrupt timing, wrong/blank boundary variants and follow-up must be deterministic | Closed by separate real OpenAI C1/C2 journey for provider execution; interrupt timing itself remains deterministic |
| Non-target startup work in required-failure test | Hoisted spies/doubles around bootstrap, app construction and listener | The critical assertion is that these boundaries are not invoked after the real exported caller receives a required migration failure | No material gap; successful startup/restart used the actual built server |
| Provider in most durable compaction tests | Deterministic runner results | Exact archive/lineage/bounds/failure assertions require stable payloads | Closed materially by the credential-backed OpenAI run; subjective provider quality remains out of scope |
| OpenAI provider in live journey | Not mocked | User-authorized managed-secret import made the real boundary available | None for transport/schema-valid publication |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | SCN-001–SCN-016 | Every approved scenario and critical acceptance criterion has direct durable and/or lifecycle evidence; final confidence is 97% and no applicable category is below 90% |
| Pass after focused recheck | Broad non-target managed-gateway recovery | Full E2E observed one `spawn ... ENOENT` timeout; the exact file immediately passed 2/2 and the Node binary existed before/after |
| Out Of Scope | Normal publication crash atomicity | Requirements explicitly add no journal/recovery contract for process termination between multi-file writes |
| Out Of Scope | Subjective live summary evaluation | Live output was schema-valid and published correctly; semantic quality benchmarking is not an acceptance criterion |
| Out Of Scope | Browser/Electron UI | No UI/renderer/preload/IPC/window/package behavior changed |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Core/server/SDK worktree dependency links | Created by this stage | Removed | Complete |
| Main workspace server-to-core link | Temporarily repointed by this stage | Restored to `../../autobyteus-ts` | Complete |
| Live built-server process and native/compactor runs | Created by live probe | Terminated/stopped | No owned process remains |
| Live SQLite database and `.secret.key` | Created by importer for this stage | Deleted after successful run | Complete |
| Live runtime root, agent definition, memory and logs | Created by live probe | Recursively deleted | Complete |
| Temporary live workspace and probe file | Created by live probe | Deleted | Complete |
| Server test DB sidecars and temp workspace | Created by deterministic suites | Removed | Complete |
| Evidence logs and reports | Created by this stage | Retained, value-safe | Intended |

## Preliminary Classification

`N/A` — final result is `Pass`; there is no implementation, test, requirement, or design failure to route. The process-global ultra-low ratio observation was a corrected test-setup scope issue and is not represented as proof that such a production setting is safe.

## Recommended Recipient

`code_reviewer` for the separate proportional review of the 31 added/updated durable test files and the one stale test removal.

## Evidence / Notes

- The discovery memory suite reproduced the handoff baseline exactly: 17 failed / 14 passed files and 28 failed / 85 passed tests. Those failures encoded removed contracts and were not implementation defects.
- Final core memory coverage is 33 files / 148 tests passed.
- Final affected server selection is 12 files / 62 tests passed; memory/run-history GraphQL is 4 files / 18 tests passed.
- Core build, server `tsconfig.build.json` typecheck, full server build and built-in bootstrap smoke all passed.
- The live-provider output summary was scanned along with captured server output by the project's value-safe evidence scanner before being retained.
- No API key value, imported assignment value, raw provider response, or user home runtime data appears in the retained live evidence.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: `97%`
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required — completed` through lifecycle, API/process E2E, and credential-backed built-server/WebSocket execution
- Critical acceptance criteria lacking direct proof: `None`
- Required next recipient: `code_reviewer` for proportional test-code review
- Notes: All SCN-001–016 pass. Durable tests changed, so test-code review is required before delivery.
