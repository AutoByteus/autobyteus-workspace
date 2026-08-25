# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: `Design-ready`
- Investigation Goal: prove, narrow, or reject one concrete application execution owner and define a behavior-neutral boundary/lifecycle refactor grounded in current `origin/personal`.
- Scope Classification: `Large`
- Scope Classification Rationale: the change crosses both host assemblies, platform construction, Agent/Team execution, scoped MCP sessions, streaming, publication, recovery/reentry, lifecycle, and architecture tests.
- Scope Summary: encapsulate the existing graph-local execution family at its current platform-runtime lifetime; do not change multiplicity, product outcomes, wire contracts, persistence, or host responsibilities.
- Primary Questions Resolved:
  1. The graph-local family is a coherent mutable identity/lifecycle unit and is currently exposed through mixed-level return bags.
  2. One scope is justified because it owns construction identity, admission, scoped sessions, failure unwind, and ordered close—not because another abstraction is aesthetically desirable.
  3. Consumers need narrow Agent, Team, streaming, artifact, memory, readiness, and lifecycle capabilities; none needs a raw manager or registry.
  4. Existing outer drain order and internal Team-before-Agent/session cleanup are explicit and preservable.
  5. Normal application paths can remove global/ambient execution fallback and composition-time process rediscovery.

## Request Context

The user explicitly requested a new architecture-health ticket after the completed Universal Application Framework integration. The goal is to make application execution ownership, dependencies, full primary/return spines, and lifecycle easy to reason about, eliminate implicit or redundant dependencies, and keep layering derived from clear boundaries. No current product defect is asserted.

The code reviewer also asked for an adjacent evaluation of logical application Agent addressing and redundant `runtimeKind` fields. Investigation shows that is independently worthwhile but belongs to a separate versioned SDK/protocol/persistence ticket.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening`
- Current Branch: `codex/application-execution-scope-boundary-hardening`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: successful; `origin/personal=306de420ca8830478529b40bd6dfda6694b742a9` on 2026-08-25.
- Task Branch: `codex/application-execution-scope-boundary-hardening`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: ticket branch first; later integration into `personal` requires delivery flow and explicit authority.
- Bootstrap Blockers: None
- Notes For Downstream Agents: new future refactor ticket; do not reopen completed integration artifacts. No production edits before architecture pass.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `application-execution-scope-ownership-and-spine-map.md` | Canonical focused owner/lifetime/spine/dependency map | Current-to-target boundary and DS-001–DS-009 | requirements, design | REQ-001–REQ-010; AC-001–AC-011 | Design-ready | Intended-behavior detail; user-approved direction | Architecture review |
| `adjacent-application-agent-addressing-evaluation.md` | Separate-ticket evaluation | redundant public selectors/classification, future target, persistence unknown | requirements scope, design deferral | N/A | Investigated | Evidence/recommendation; approval N/A for this ticket | Bootstrap separately only on explicit request |
| `application-execution-scope-contracts.md` | Exact normative boundary | platform/scope inputs, seven capability signatures, consumer/admission/getter/assembly map | requirements, design | REQ-001–REQ-007, REQ-010; AC-001–AC-007, AC-010 | Design-ready | Intended structural detail; behavior-neutral | Architecture re-review |
| `application-execution-scope-transition-inventory.md` | Exact transition/proof inventory | every source/test path, AFB obligations/fixtures, verification matrix | design | REQ-004, REQ-007, REQ-010; AC-005–AC-011 | Design-ready | Intended structural detail; behavior-neutral | Architecture re-review |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-25 | Command/Setup | `git fetch origin personal`; `git worktree add -b codex/application-execution-scope-boundary-hardening ... origin/personal` | fresh isolated authority | dedicated worktree at `306de420...` | No |
| 2026-08-25 | Doc | `.codex/skills/solution-designer/design-principles.md`; design examples | canonical spine/ownership/reachability/removal rules | authoritative boundary forbids scope plus internal dependencies | No |
| 2026-08-25 | Doc | completed `universal-application-framework-latest-personal-integration` package | preserved behavioral and identity baseline | prior real split-authority failures are corrected; current behavior is healthy | No |
| 2026-08-25 | Code | `create-application-run-services.ts` | exact execution graph | constructs and returns ten mixed-level members; calls `getWorkspaceManager()` | No |
| 2026-08-25 | Code | `create-application-orchestration-services.ts` | exact raw consumers/process accessors | redistributes raw Agent/Team services/managers and returns fifteen outer/internal members; calls runtime/model/provider/client getters | No |
| 2026-08-25 | Code | `build-application-platform-runtime.ts`, runtime contracts, lifecycle contracts/lifecycle | lifetime and startup/shutdown | creates one session scope per runtime; public runtime already has only four projections; lifecycle enumerates execution leaves | No |
| 2026-08-25 | Code | Studio/standalone assembly roots and `general-process-run-supervisor.ts` | host multiplicity and authority separation | both build canonical definitions/MCP, separate general supervisor, then one platform runtime | No |
| 2026-08-25 | Code | orchestration host, binding launch/lifecycle gateway/recovery/reentry, engine launcher/delivery | primary and return spines | exact services needed by launch/input/observe/reentry; reentry keeps runtime identity | No |
| 2026-08-25 | Code | stream source/service, publication/projection/relay, activation/resource managers, scoped MCP scope/manager | graph-sensitive return paths | stream source has redundant Agent singleton fallback; publication/session/resource identity must remain exact | No |
| 2026-08-25 | Code | Agent/Team managers, RootTeam task capability paths | cleanup and nested Team ownership | Team-before-Agent order is real; RootTeam-local delegation remains self-contained | No |
| 2026-08-25 | Code | architecture boundary test, run-services/runtime-isolation/lifecycle/shutdown/stream tests | existing executable authority | AFB-004 construction authority points to old factory; focused tests expose current internals and exact stop order | Update in implementation |
| 2026-08-25 | Command | `rg` occurrence searches for global getters and raw service consumers | complete bypass inventory | one Agent manager fallback; ambient workspace/readiness getters in application assembly; no evidence for per-app manager registry | No |
| 2026-08-25 | Code | application binding/event contracts, target URL, backend/frontend SDK, authorization/mapper, Brief/Socratic | adjacent address evaluation | root kind and runtimeKind are derivable; public change crosses SDK/protocol/storage | Separate ticket |
| 2026-08-25 | Code/Data | `ApplicationRunBindingStore` schema/read/write and event journal | persistence impact of adjacent idea | summary/event JSON may tolerate field removal, but required physical member `runtime_kind` column makes future persistence choice material | Separate ticket, decision Undetermined |
| 2026-08-25 | Test attempt | `pnpm exec vitest --run ...` in server worktree | focused baseline | not executed because the isolated worktree has no `node_modules` and `vitest` is unavailable | Downstream installs/uses repo environment |
| 2026-08-25 | Review | `design-review-report.md` / ARCH-REV-001, AR-001–AR-002 | initial architecture review | ownership/spines accepted; exact contracts and closed path/proof inventory required | Resolved in SR-002 |
| 2026-08-25 | Code/Command | exact Agent/Team service signatures; artifact/memory/stream contracts; `rg` of builders, consumers, getters, AFB obligations, defaulting constructors, and durable-test constructors | close AR-001/AR-002 | seven exact capabilities, 8-field scope input, 12-field required platform input, 12-field orchestration result, 22 migrated plus three new graph-sensitive nested obligations (25 total), and closed source/test set recorded | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Start Studio server | server runtime -> `buildStudioServer` -> canonical definitions/MCP -> general supervisor -> one `buildApplicationPlatformRuntime` -> configure routes -> lifecycle prepare/recover | one runtime supports multiple maintained applications; general/application execution is separate | Studio composition and prior dual-host evidence |
| BEH-002 | Operational | Start standalone for selected package | standalone process setup/migrations/package validation -> canonical definitions/MCP -> general supervisor -> one selected platform runtime -> listen/recover | selected app gets same platform behavior without Studio-only surfaces | standalone host and prior evidence |
| BEH-003 | Contract | application launches/uses bound Agent or Team | orchestration -> binding/config -> graph-local services/managers -> binding; return via stream/publication/delivery; lifecycle drains then Team/Agent/session cleanup | exact binding authority, graph identity, RootTeam-local tasks, recovery, and cleanup | current source paths listed above |
| BEH-004 | Contract | public general Studio Agent/Team launch | public definition/run services -> `GeneralProcessRunSupervisor` | non-identical general managers/sessions using canonical definitions | supervisor/composition and completed integration evidence |

## Design Health Assessment Evidence

- Change posture: `Refactor`
- Candidate root cause classification: `Boundary Or Ownership Issue` and `File Placement Or Responsibility Drift`
- Refactor posture evidence summary: current behavior and graph identity are correct; the maintainability problem is that the identity/lifecycle owner is implicit across broad bags and leaf dependencies. A concrete owner is proportionate because it owns mutable state and exact cleanup, while a mere wrapper would be rejected.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| run-services factory | ten members at several abstraction levels | no authoritative encapsulation for one mutable family | replace, do not wrap |
| orchestration assembly | consumers receive services/managers/projection/memory/session leaves | authoritative-boundary bypass risk | use exact capabilities |
| lifecycle | session manager and shutdown coordinator separately enumerated | lifecycle knows internal leaves | use scope lifecycle projection |
| stream source | injected manager plus singleton fallback | redundant/implicit authority | remove fallback |
| application assembly | ambient process getters | dependencies not visible at composition boundary | named injection |
| current runtime/public contract | public runtime already exposes four narrow projections | outer boundary is healthy | preserve exactly |
| current shutdown coordinator | real Team-before-Agent sequencing/error aggregation/idempotence | genuine internal owner, not empty helper | retain under execution ownership |
| reentry source | worker reload and binding/event resumption; no manager reconstruction | per-app scope/registry not reachable | keep one scope per runtime |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `application-platform/runtime/create-application-run-services.ts` | execution graph assembly | broad ten-member object and ambient workspace lookup | remove; absorb into concrete scope |
| `application-platform/runtime/create-application-orchestration-services.ts` | outer orchestration assembly | mixed-level inputs/return and ambient readiness getters | consume scope capabilities; keep outer owners only |
| `application-platform/runtime/build-application-platform-runtime.ts` | outer runtime assembly | correct lifetime but directly creates session scope and rediscovery callbacks | construct one scope and receive named process dependencies |
| `application-platform/runtime/application-platform-lifecycle*.ts` | whole-platform lifecycle | exact outer order; leaf execution dependencies | replace leaves with execution lifecycle capability |
| `application-platform/runtime/application-run-shutdown-coordinator.ts` | Team-before-Agent stop | real concern in wrong folder/outer exposure | rename/move under execution ownership |
| `application-agent-streaming/...runtime-source.ts` | exact run event attachment | redundant global Agent fallback | inject exact managers privately in scope; remove fallback |
| `application-orchestration/...host/launch/gateway` | binding use cases | currently type-depend on raw Agent/Team service classes | use subject-specific scope contracts |
| `agent-tools/mcp/*application*scope*` | scoped MCP session lifecycle | process runtime creates factory; application owns scope/manager | scope owns created application scope/manager |
| `application-platform/runtime/application-platform-runtime.ts` | public outer handle | already exactly four projections | preserve unchanged |
| Studio/standalone roots | host/process assembly | own process getters today | resolve named shared dependencies and pass platform input |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-25 | Test | `pnpm exec vitest --run` with six focused suites | failed before collection: isolated worktree has no dependencies / `vitest` command unavailable | no behavioral result claimed; downstream runs baseline after dependency setup |

## External / Public Source Findings

None. Current repository code, accepted completed-ticket artifacts, and the user-approved design-health direction are authoritative.

## Reproduction / Environment Setup

- Required services/mocks/accounts: none for design investigation.
- Setup: remote refresh and dedicated worktree only.
- Dependencies were intentionally not installed merely to produce design artifacts.
- Cleanup: no runtime resources or temporary source files created.

## Findings From Code / Docs / Data / Logs

1. Current application construction is acyclic and functionally correct, but its owning subject is not represented as a concrete lifecycle boundary.
2. One scope per current runtime lifetime is `Reachable` and evidenced by both host builders. A per-mounted-app scope is `Unclear` and cannot justify routing machinery.
3. Scope quiescence is justified by supported host close: ingress closes and lifecycle must stop new session/work admission before draining. A small owner-local state (`open`, `quiesced`, `closed`) is sufficient; no generic lifecycle framework is needed.
4. Reverse construction unwind is an established lifecycle contract. Construction creates no run; only created scope/session resources require close on failure.
5. Public `ApplicationPlatformRuntime` and `GeneralProcessRunSupervisor` boundaries are healthy and should not be widened or unified.
6. The address/runtimeKind concern is a `Shared Structure Looseness` issue but independent of execution ownership. It needs a clean versioned contract and physical-store decision, so bundling is disproportionate.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject/location: packages, definitions, launch overrides, binding/global platform SQLite, artifact projections/history, registered application migrations.
- Relevant change: none; execution ownership changes object construction/lifetime only.
- Normal readers/writers: unchanged.
- Representative direct-read evidence: no DTO/schema/store method is in the primary ticket inventory.
- Required semantics/invariants preserved by direct use: `Yes`.
- Decision: `Not Affected`.
- Migration benefit/cost: no correctness benefit; any rewrite adds unapproved I/O/corruption/rollout risk.

Adjacent addressing is different: the physical binding member `runtime_kind` column makes that future ticket's decision `Undetermined`, as recorded in its supplement.

## Constraints / Dependencies / Compatibility Facts

- One scope per mounted app remains unsupported and excluded.
- General/application manager/session/task-root identity separation is mandatory.
- Current RootTeamRun-local delegation must remain unchanged.
- No compatibility wrapper, generic container, service locator, generic event bus, mode-switched builder, or global fallback.
- Address/producer/member contract simplification is separate.

## Open Unknowns / Risks

- Exact implementation type imports may require type-only domain extraction to avoid circular imports; architecture must preserve the specified subject boundaries rather than resolve cycles with a generic bag.
- Latest-base changes may add named process dependencies; delivery refresh must re-evaluate without weakening the boundary.

AR-001/AR-002 exactness resolution is recorded in the two SR-002 supplements. All seven scope capability contracts have one owner in the scope-contract file; type-only imports reference existing orchestration/streaming domain shapes without creating runtime construction dependencies.

## Notes For Architecture Reviewer

Review the scope as a real mutable owner: it must construct/private-own exact graph identity, gate admission, unwind construction, and close Teams/Agents/sessions. Reject an implementation that merely renames the current return object. Verify all DS-001–DS-009 spines, especially publication and RootTeam-local delegation, and keep the adjacent address contract outside this ticket.
