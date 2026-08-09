# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/persisted-lineage-inventory.md` (evidence-only; approval `N/A`)
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `code_reviewer` source-review pass `CRR-001` for production/test commit `9bcac525850d8e65d1ac4c792401b77c7ee0d396`, approved under `SR-001`, `ARCH-REV-001`, and `IR-001`
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: This file, round 1

## Current Requirement And Design Basis

Native compaction must preserve its accepted lifecycle and next-request continuation while removing every compacted-output-to-raw-origin dependency. One complete contracted `lineageRecord` exists before commit. The committer keeps archive -> output write/verification -> lineage append -> context install -> snapshot write -> pending clear order and propagates each failure without executing later effects. Exact selected raws move from active storage into a complete manifest-backed archive; unselected raws remain active; the native raw owner derives a canonical `native_compaction_selection:<full-sha256>` identity from sorted normalized-ID JSON and returns no descriptor.

The current-output loader remains authoritative on the lineage tail's exact episode/semantic membership and must not consult raw archives. New schema-version-1 rows omit `rawTraceArchiveFile` and any substitute raw locator/membership. Valid existing schema-version-1 JSON supersets containing that obsolete field are `Directly Usable — No Migration`: normal reads project recognized retained fields without exposing the extra or rewriting the file. Resolver/types/query/export/server-origin contracts and their origin-only tests are removed with no stub, replacement provenance, compatibility branch, or future-memory placeholder. Generic archive manager, provider-boundary rotation, enumeration, complete corpus, snapshot/restore, and raw history remain intact.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / DS-001, DS-003 accepted lifecycle | Changed + Preserved | REQ-001/002/005; AC-001/002/003; CRR-001 | Directly prove complete accepted record, exact commit order, unchanged failure propagation, snapshot/pending behavior, and normal continuation. |
| BEH-002 / DS-002 current output | Preserved | REQ-001/004; AC-001/004/006 | Directly prove exact tail output membership, missing/misordered rejection, and zero raw-archive reads. |
| BEH-003 / BLS-001 raw archive | Changed + Preserved | REQ-002/005; AC-002/007 | Prove canonical order-independent full digest, exact active/archive membership, rejection without mutation, and generic/provider non-interference. |
| BEH-004 origin contract | Removed | REQ-003/005; AC-005/008 | Validate removal decisions and static absence; origin-only suites remain deleted with no replacement. |
| BEH-005 / BLS-002 lineage shape/direct use | Changed | REQ-004/006; AC-003/004/006/007 | Preserve new-row contraction and old-row no-rewrite coverage through the normal store. |
| BEH-006 future memory concern | Preserved absence | REQ-005; AC-007/008 | Static/diff checks; no speculative durable test or placeholder. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Core compaction value/effect sequence, lineage normalizer/store, raw command | Unit and integration Vitest with real stores/files | Commit-phase failures are not directly ordered across every effect | Add durable owner-level sequence/failure coverage |
| API / transport / contract | Removed unsupported internal contract; no supported API changed | Core/server origin types/service deleted | Static call graph/build/search | None; no supported GraphQL/REST caller existed | None |
| Frontend component / state | No | None | Repository search/upstream evidence | None | None |
| Browser integration / user journey | No | None | N/A | No browser boundary created or changed | None |
| Authentication / session / permissions | No | None | N/A | None | None |
| Desktop renderer / web-equivalent UI | No | No product surface for removed origin contract | N/A | None | None |
| Desktop shell / Electron-specific integration | No | None | N/A | None | None |
| Process / lifecycle | Yes | Pending native compaction and subsequent provider dispatch | Pending executor and runtime integration suites | No live model needed if deterministic runtime spine and real storage are exercised | Repository lifecycle integration |
| Persisted-data transition | Yes | Recognized lineage record shape contracts; physical old row remains | Real JSONL fixture/no-rewrite tests and aggregate read-only inventory | Representative fixture rather than user-data mutation | Isolated direct-use test; never rewrite real app data |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | No production provider boundary changed; generic raw archive shared | Deterministic provider-boundary and runtime tests | Provider/model variance unrelated to changed native wrapper | None unless repository regressions reveal a gap |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification`
- Project type and runtime stack: pnpm TypeScript monorepo; core `autobyteus-ts` uses Vitest/Node and synchronous real filesystem stores; server uses TypeScript, Vitest, Prisma/SQLite, and a sanitized bootstrap smoke during build.
- Conflicting, missing, or unclear project instructions: No conflict. `autobyteus-server-ts/AGENTS.md` requires `vitest run ... --no-watch`; core Vitest is also run explicitly with `run --no-watch` to avoid watch mode.
- Required environment variables or secrets available: `N/A`; selected repository validation uses deterministic fixtures, temp directories, and no provider account.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/autobyteus-server-ts/AGENTS.md` | Closest test instructions | Use `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/README.md` | Workspace setup | pnpm workspace; install via locked dependency graph. |
| `autobyteus-ts/package.json` and `tsconfig*.json` | Core build/type authority | Build uses clean dist, `tsc -p tsconfig.build.json`, runtime-dependency verification; test-inclusive config includes known unrelated backlog. |
| `autobyteus-ts/vitest.config.ts` | Core runner | Node environment, `tests/setup.ts`, 20s default timeout, tickets/temp excluded. |
| `autobyteus-server-ts/package.json`, `vitest.config.ts`, and Prisma global setup | Server build/test authority | Build prepares shared core and Prisma then runs sanitized bootstrap; tests use isolated SQLite and serial forked files. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Core focused/unit/integration | worktree root | `pnpm -C autobyteus-ts exec vitest run <files> --no-watch` | Existing installed locked dependencies; OS temp dirs | Vitest summary | Test hooks remove temp dirs |
| Core broader memory suites | worktree root | `pnpm -C autobyteus-ts exec vitest run tests/unit/memory tests/integration/memory tests/integration/agent/... --no-watch` | Deterministic LLM/runtime harnesses, real files | Vitest summary | Test hooks/process exit |
| Core/server source build | worktree root | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-server-ts build` | Server build prepares shared packages and Prisma | Exit 0/bootstrap smoke | Ignored build output |
| Static removal check | worktree root | scoped `rg`/`find` over active source/tests/build output | Durable docs intentionally stale until delivery | Empty or allowlisted output | No resource |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| New/old lineage rows | Manual JSONL fixture plus `FileCompactionLineageStore` | Synthetic IDs/content only; exact byte comparison | Temp dir removal |
| Native raw selection | `RunMemoryFileStore` with synthetic active traces | No user memory root | Temp dir removal |
| Accepted compaction sequence | Real accepted value/models with instrumented owner-boundary doubles | No file/process needed for failure table | In-memory only |
| Native successful lifecycle | Existing manager/pending/runtime fixtures with real temp stores | No live provider/account | Test teardown |
| Generic/provider archive | Existing raw manager/provider-boundary fixtures | Synthetic traces only | Temp dir removal |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `Persisted Data / State Transition Decision`, `BLS-002`, handoff `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: A schema-version-1 JSONL row containing all retained head/output/audit fields plus obsolete `rawTraceArchiveFile`; current normalizer/store must return only retained fields, keep chain/scope validation, and leave exact file bytes unchanged.
- Evidence planned for the approved outcome: Retain and execute `file-compaction-lineage-store.test.ts` direct-use/no-rewrite case and current-output integration; static check that no migration/compatibility branch was introduced. Aggregate real-app-data evidence remains upstream and read-only.
- Migration-specific completion/recovery scenarios, only when `Migration Required`: `N/A`
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/file-compaction-lineage-store.test.ts` | Contracted new rows; old superset direct read/no rewrite; chain/head/current projection; corruption | AC-003/004/006/007; BLS-002 | Still Valid | Assertions match approved current reader/writer | Execute unchanged. |
| `autobyteus-ts/tests/unit/memory/run-memory-file-store.test.ts` | Exact native selection digest and active/archive membership; provider-boundary corpus | AC-002/007; BLS-001 | Needs Update | Positive case computes canonical key, but separate input orders and missing-selection no-mutation are not directly compared | Add order-independence and rejection/no-mutation assertions. |
| `autobyteus-ts/tests/unit/memory/raw-trace-archive-manager.test.ts` | Generic manager manifest/idempotency/old-layout/pending behavior | AC-007/008 | Still Valid | Generic provider/storage boundary is intentionally preserved | Execute unchanged. |
| `autobyteus-ts/tests/integration/memory/working-context-snapshot-restore.test.ts` | Recurrent C1/C2 commit, exact raw/archive/current output, snapshot, pending clear | AC-001/002/003/004/007 | Still Valid | Real store/manager path directly proves successful native commit and recurrence | Execute unchanged. |
| `autobyteus-ts/tests/unit/memory/pending-compaction-executor.test.ts` | Success reports only after durable commit; proposal/parser failure retains pending and surfaces | AC-001; DS-003 | Still Valid | Useful lifecycle evidence, but failures occur before accepted commit effects | Execute; add separate committer failure-order owner test. |
| No dedicated accepted-committer suite | Effect order and commit-phase failure cut-off | AC-001/002; DS-001/003 | Add Durable Coverage | Important preserved non-transactional sequence is currently source-only | Add `accepted-compaction-committer.test.ts`. |
| No dedicated current-output-loader suite | Exact output order/membership and raw-archive independence | AC-004 | Add Durable Coverage | Integration covers success, but missing/misordered and no-archive-call contract are not direct | Add `current-compaction-output-loader.test.ts`. |
| `autobyteus-ts/tests/integration/agent/memory-compaction-strategy-tool-lifecycle.test.ts` | Full tool-safe compaction then provider dispatch; origin-only block removed | AC-001/002/004/009 | Still Valid | Retained suite remains broad and current | Execute unchanged; do not restore origin assertions. |
| `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-compaction.test.ts` | Runtime compaction before next provider leg and invalid-output request blocking | AC-001 | Still Valid | Deterministic runtime boundary is representative | Execute unchanged. |
| `autobyteus-ts/tests/unit/memory/compaction-lineage-resolver.test.ts` | Direct/recursive origin and origin integrity | AC-005/008 removal | Stale / Remove | Entire capability is explicitly removed | Already removed; verify deletion. |
| `autobyteus-server-ts/tests/unit/memory-lineage/agent-memory-origin-service.test.ts` | Server origin service location and resolution | AC-005/008 removal | Stale / Remove | Unsupported service is explicitly removed | Already removed; verify deletion. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/compaction-lineage-resolver.test.ts` | Episode/semantic direct/recursive raw-origin lookup and origin-specific integrity errors | REQ-003/005 removes the unsupported capability with no replacement | AC-005/008, SR-001, ARCH-REV-001 | Retained current-output/raw-archive tests prove supported owners | No replacement origin contract is allowed. |
| `autobyteus-server-ts/tests/unit/memory-lineage/agent-memory-origin-service.test.ts` | Server run-location composition for origin lookup | The service has no supported product caller and is removed | AC-005/008 | Static absence/build plus retained server memory location owners | No replacement server API/service exists. |
| Origin block formerly in `memory-compaction-strategy-tool-lifecycle.test.ts` | Origin resolver returns roots for compacted outputs | Same removed capability; broad lifecycle remains valuable | AC-005/008/009 | Existing archive/current-output/tool/provider assertions in the retained scenario | Only the obsolete block is removed. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-001 | Exact accepted effect order on success and unchanged failure propagation/cut-off at every commit step | REQ-001/002/005; AC-001/002; DS-001/003 | `autobyteus-ts/tests/unit/memory/accepted-compaction-committer.test.ts` | Critical preserved non-transactional lifecycle should not remain source-only. |
| API-002 | Current tail output hydration, exact ordering/membership rejection, null-head behavior, and no raw archive access | REQ-001/004; AC-004/006; DS-002 | `autobyteus-ts/tests/unit/memory/current-compaction-output-loader.test.ts` | Direct owner-level evidence closes an important negative-path gap. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-003 | `run-memory-file-store.test.ts` exact native selection | Compare canonical boundary identity across reversed input orders; reject missing membership without manifest/active mutation | REQ-002/005; AC-002/007; BLS-001 | Preserve generic provider-boundary cases unchanged. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| Core resolver suite, server origin service suite, and broad-suite origin block | Assert an explicitly removed unsupported contract | REQ-003/005; AC-005/008/009 | Already removed in implementation commit; no origin replacement. Retain supported lifecycle/current-output/raw coverage. |

## Executable Scenario Map

| Scenario ID | Behavior / Boundary | Durable Or Execution Artifact | Requirement / Acceptance Criteria |
| --- | --- | --- | --- |
| API-004 | New contracted row plus old JSON-superset direct read/no rewrite and current head projection | Existing lineage store suite | REQ-004/006; AC-003/004/006/007 |
| API-005 | Recurrent C1/C2 native commit, selected/unselected raws, current output, snapshot and pending clear | Existing snapshot/restore integration | REQ-001/002/004; AC-001/002/003/004/007 |
| API-006 | Tool-safe/runtime compaction completes before the next provider request; invalid output blocks dispatch | Existing core runtime integration | REQ-001/005; AC-001/009 |
| API-007 | Generic raw manager and Codex/Claude provider-boundary rotation/enumeration remain unaffected | Existing core/server store and integration suites | REQ-002/005; AC-007/008 |
| API-008 | Removed resolver/types/queries/exports/server service/field absent from active source/tests/fresh dist, with no migration/future subsystem | Static executable check | REQ-003/005/006; AC-005/006/008/009 |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Core Vitest on the two added owner suites, updated run store, retained lineage/pending/snapshot/projector/raw-manager suites | worktree root / core Vitest | API-001 through API-005: exact commit/failure order, loader integrity/no raw reads, canonical selection, old/new lineage, recurrent snapshot | Pass — 9 files, 48 tests | `api-e2e-evidence/round-1/01-focused-core.log` |
| 2 | Core tool/runtime lifecycle plus server cross-runtime/provider-boundary suites | worktree root / deterministic LLM/runtime fixtures / isolated Prisma DB | API-004/API-006/API-007: next provider leg, invalid output blocking, generic Codex/Claude archive rotation/non-interference | Pass — core 2 files/3 tests; server 2 files/37 tests | `api-e2e-evidence/round-1/02-runtime-and-provider-regression.log` |
| 3 | Broad core memory plus two locally configured LM Studio integration files | worktree root / local model discovery | Broad memory regression plus opportunistic live model flows | Partial — 39 files/177 tests passed; two unrelated LM Studio inference cases timed out at their 20s test limit after local model discovery | `api-e2e-evidence/round-1/03-broader-core-memory.log` |
| 4 | Broad non-live `tests/unit/memory` + `tests/integration/memory` | worktree root / deterministic fixtures | Complete relevant core memory/raw/snapshot/lineage regression without external model dependency | Pass — 37 files, 174 tests | `api-e2e-evidence/round-1/03b-broader-core-memory-nonlive.log` |
| 5 | `pnpm -C autobyteus-ts build` | worktree root | Core source TypeScript, fresh dist, runtime dependency verification | Pass | `api-e2e-evidence/round-1/04-core-build.log` |
| 6 | `pnpm -C autobyteus-server-ts build` | worktree root | Shared builds, server TypeScript, Prisma generation, managed assets, sanitized bootstrap smoke | Pass | `api-e2e-evidence/round-1/05-server-build.log` |
| 7 | Scoped removed-symbol/field/deleted-file/no-migration search over active source/tests and fresh build output | worktree root | API-008 / AC-005/008 clean removal; exactly four intentional old/new-row test references | Pass | `api-e2e-evidence/round-1/06-static-removal-check.log` |
| 8 | Temporary targeted `tsc` config for the two added and one updated durable tests | worktree root / scratch config removed | Durable test TypeScript correctness independent of known global test backlog | Pass — exit 0, no diagnostics | `api-e2e-evidence/round-1/07-targeted-test-typecheck.log` |

The two LM Studio timeouts in order 3 do not exercise the changed lineage/raw wrapper or a required selected validation boundary. Their files were not changed, they rely on a locally running model service, and all deterministic native continuation/provider-boundary scenarios passed in orders 1, 2, and 4. They are retained as honest environment evidence rather than reclassified as an implementation failure.

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | API-001 through API-008 directly map executable AC-001 through AC-009; docs clauses are explicitly delivery-owned | Four current durable docs remain stale until delivery | Integrated-state docs sync |
| Changed-boundary execution directness | 99% | Direct committer, loader, run store, lineage store, real files, snapshot, pending and static-removal evidence | No material indirect changed boundary | None |
| Cross-boundary integration realism and mock gap | 96% | Real filesystem/store/manager plus deterministic `LlmPhase`, pending executor, tool lifecycle, next provider request, server Codex/Claude boundaries | Live LM Studio inference probe timed out and is not needed for the deterministic changed boundary | Selected lifecycle broader validation |
| Environment, configuration, identity, and fixture fidelity | 98% | Assigned commit/worktree, locked workspace, OS temp data, current schemas, isolated Prisma, fresh builds | Synthetic lineage/raw fixtures; intentional no user-data mutation | None material |
| Failure, edge-case, lifecycle, and recovery evidence | 99% | Every commit-step failure propagates unchanged and cuts off later effects; missing/misordered outputs, inexact selection, corrupt chain, invalid proposal, recurrence covered | Established partial effects are not rolled back by design | None in approved scope |
| User-surface, browser, and desktop-shell confidence | N/A | No supported UI/API/browser/desktop origin surface existed or changed; source/build/static call graph confirms absence | N/A | N/A |
| Durable regression coverage quality and relevance | 98% | Two narrow owner suites plus one cohesive store update; stale origin suites removed; focused/broad pass | Independent proportional test review pending | Code reviewer review |

- Overall post-repository confidence: `98.0%`
- Calculation method: Simple average of the six applicable numeric categories, rounded to one decimal. User/browser/desktop is genuinely inapplicable because no supported product surface existed or changed.
- Every critical acceptance criterion directly proven: `Yes` for the executable implementation scope; delivery-owned documentation clauses in AC-005/AC-009 remain explicitly pending and prevent final ticket completion, not API/E2E pass.
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Material residual risks: Existing old-row extra bytes remain inert; malformed/unsupported lineage and missing output rows remain integrity failures; commit effects remain non-transactional; two unrelated local LM Studio inference tests timed out; four durable docs remain delivery-owned.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Lifecycle` + deterministic provider/archive integration; browser/desktop/live model not selected.
- Specific confidence gap or residual risk addressed: Prove native compaction still completes before and permits the next provider request, invalid compaction blocks dispatch, and the shared generic Codex/Claude archive paths remain unaffected.
- Why the selected mode can materially improve confidence: The existing integration tests cross `LlmPhase`, tool completion, pending executor, compaction runner, real memory stores, lineage/current projection, status reporting, and the next LLM request; server integration crosses real raw store/manifest behavior for both external runtimes.
- Expected confidence after the selected validation: Approximately `98.5%`, no applicable category below `90%`.
- Browser-specific decision and rationale: Not selected; no frontend, API schema, renderer, browser storage, streaming, or desktop-shell boundary exists for the removed origin contract.
- If `Not Required`, evidence proving the real changed boundary without broader execution: `N/A`
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: `N/A`; the unrelated LM Studio timeouts do not block the selected deterministic lifecycle surface.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron/web client exists in the wider workspace, but this ticket changes no client, renderer, GraphQL, REST, preload, IPC, window, packaging, or shell source.
- Relevant README or development instructions: Root workspace README reviewed; frontend/desktop setup is unnecessary because no product surface reaches the removed origin contract.
- Web-equivalent behavior: None changed.
- Shell-specific or lifecycle behavior: None changed.
- Chosen validation approach and why it fits the project: Core runtime lifecycle and real store execution; no browser/Electron launch.
- Server/frontend setup when browser validation is used: `N/A`
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: No visual/UI claim will be made; user-surface confidence is based on confirmed absence of a supported product surface.

## Live Environment And Fixture Plan

- Startup order and commands: Focused core -> deterministic runtime/provider regression -> broad memory probe -> clean non-live broad rerun -> core/server builds -> static removal -> targeted test compile.
- Environment choices that materially affect the run: Node/pnpm locked workspace; deterministic Vitest; OS temp directories; server's isolated Prisma setup only if server tests become necessary.
- Health / readiness checks: Vitest/build exit codes, isolated Prisma reset, runtime completed/failed status events, and sanitized server bootstrap output.
- Seed data / fixtures: Synthetic lineage, output rows, selected/unselected raws, WorkingContext, snapshot, deterministic provider responses.
- Test identities, authentication, permissions, or session state: Synthetic run IDs; no authentication or live provider account.
- Requirement-linked journeys or scenarios: API-001 through API-008.
- DOM, screenshot, log, API, process, or other evidence to capture: Command logs, Vitest summaries, static search output, filesystem assertions.
- Owned processes and temporary state to clean up: Vitest subprocesses, ignored build output, OS temp dirs, temporary focused tsconfig.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| API-008 | Scoped active-tree/fresh-dist `rg` allowlist check | Removed symbols/exports/service/field absent while old-row fixture and delivery-owned docs are identified | Static removal inventory is release evidence; runtime behaviors live in durable tests. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Mutating real user lineage/raw archives | Unsafe and unnecessary; approved direct-use outcome is shape-based and upstream inventory is read-only | None if synthetic normal-store/no-rewrite coverage passes | Never rewrite user app data for validation. |
| Live LM Studio/provider compaction | Native storage/lineage code is deterministic and existing runtime harness crosses the real changed owners; live model variance adds little | Bounded model-output variance unrelated to change | Reconsider only if deterministic runtime path fails to cover continuation. |
| Browser/Electron | No supported product surface changed | Negligible | None. |
| Durable docs | Team assigns final integrated-state docs sync to delivery | Stale documentation until delivery | Carry four named files forward explicitly. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None | N/A | SR-001 / ARCH-REV-001 / CRR-001 fully specify clean removal and preserved constraints | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Post-repository confidence: `98.0%`
- Broader validation decision: `Required` — deterministic lifecycle/provider regression selected and completed; no browser/desktop/live model required.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Origin-only removals remain valid. The identified committer, loader, and order-independent native-selection gaps were closed with durable coverage; execution results are authoritative above.
