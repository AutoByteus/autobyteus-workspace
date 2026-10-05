# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/requirements-doc.md`, **Approved focused REQ-BL-008**.
- Upstream Investigation Notes: same canonical ticket directory, `investigation-notes.md`, E-001–056 and current SR-014 supplement inventory; evidence-only SR-015 clarification incorporated.
- Upstream Solution Revision Record: same directory, `solution-revision-record.md`, cumulative SR-001–015; SR-015 adds evidence only, no authority/design change.
- Reviewed Design Spec: same directory, `design-spec.md`, **SR-014** cumulative architecture. SD-AP-001 (SR-007) plus scoped direct **SD-AP-002 (SR-014)** governs. REQ-BL-007 broader unapproved proposal is archived/withdrawn, not blanket-approved.
- Supplemental Task Artifacts Reviewed: current `solution-design-handoff.md`; IR-004 implementation handoff/investigation/revision; CRR-004 code-review report/revision and projection/preservation/log evidence; API-REV-003 investigation/report/ledger/revision and relevant actual Manager/stream/deletion evidence; cumulative source/reference inventories and historic DI-001/002 probes. Exact prior approved requirements, unapproved REQ-BL-007 and held SR-013 design archives inspected as history. No behavior-defining/Product supplement; screenshots evidence-only. Full reference manifest: `solution-history/sr-014-reference-files.json` (228 unique existing paths; manifest/rules and evidence-only scope clarification added to routing package).
- Relevant Solution Revision IDs: SR-007 prior approval; SR-008–011 prior reviewed designs; SR-012/013 proposal/clarification holds; **SR-014 current approved scoped correction**; SR-015 evidence-only acceptance clarification, not a new architecture revision. Historical discoveries remain non-authoritative.
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-005**.
- Current Review Round / Latest Authoritative Round: **5**, 2026-10-03.
- Trigger: Solution Designer requests independent cumulative Large/High review after CRR-004 / API-REV-003 **API-UC-001** responsibility feedback and scoped direct user approval SD-AP-002. Independently confirmed **CRF-003/FAPI-005** is carried as an OPEN implementation-owned correction, not recast as an architecture finding.
- Prior Review Round Reviewed: **ARCH-REV-004 / round4 Pass on SR-011 only**; ARCH-REV-001–003 retain their historical bases. DI-001/002 design resolutions and SD-DI-003 migration-need correction remain cumulative, not executable certificates. Prior envelope-driven migration-necessity judgment remains withdrawn.
- Current-State Evidence Basis: independent read-only source/evidence inspection in `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`, branch `codex/project-task-manager-linked-delegation`, HEAD/base `806907faeb567d2b703e10fe984fcd01be0b41fd`, finalization `origin/personal`. Reviewer checkpoint **165 tracked modifications / 46 untracked entries**; counts are not an exhaustive source inventory/readiness. Preserve ongoing IR-004/API changes and reported scoped closures. API-REV-003 remains **Fail /64.29%**; CRR-002 whole-source Pass is historical at the affected projection boundary. This reviewer ran no tests/probes/providers/apps/native child/migrations, read no credentials/user profile, made no source/test/specialist-artifact edits/reset/staging/commits/finalization. Only the two canonical reviewer artifacts are written.
- Review references: architecture-reviewer skill, shared design principles, mandatory templates, examples9/10, repository migration guideline/TESTING.md and server/web AGENTS. Source paths below are relative to this worktree's `autobyteus-server-ts/` unless indicated otherwise.

### Independently Checked Code / Evidence Basis

RV-E01–15 are retained historical pinned-base observations from ARCH-REV-001/002; RV-E16–20 are ARCH-REV-003 vendor/source/check snapshots; RV-E21–24 are ARCH-REV-004 persistence/consumer checks. **Do not read their old obstruction/source-stage statements as descriptions of today's implementation.** RV-E25–30 are this round's current checks. Source/evidence inspection is not executable acceptance.

| Review evidence | Sources / decisive observation |
| --- | --- |
| RV-E01 | `src/projects/stores/project-store.ts` and `services/project-task-service.ts`: bare-array authority, recognized-field projection, UUID Task creation, Project-scoped lookup, saved-byte resolution, metadata-only status and metadata/context deletion. No existing Task-to-run link. |
| RV-E02 | `src/agent-tools/task-delegation/task-delegation-tool-{input-parsers,parameter-schemas}.ts`, shared `task-delegation-command.ts`, Project tool manifest and GraphQL `project-tasks.ts`: strict described-work input; shared tool projection currently omits assignments; status writes belong to the Task tool, not the existing GraphQL edit input. |
| RV-E03 | `src/agent-collaboration/execution/task/root-task-execution-{lifecycle,adapter}.ts`; Team, Org and Agent-root task adapters: preparation precedes queued activation, commit performs tree durability/materialization and eager release; exact prepared Agent/Team binding exists but the outer contract exposes only ingress. |
| RV-E04 | `src/agent-team-execution/domain/prepared-task-execution.ts`, local task Agent/Team registries and `src/agent-collaboration/execution/backends/root-agent-execution-registry.ts`: releaseWork queues input without awaiting acceptance; quiet shutdown is reversible; task-Team quiet shutdown removes its active entry before finish. New forced completion cannot simply reuse that policy. |
| RV-E05 | `src/agent-collaboration/collaborators/{message-recipient-resolution,collaborator-admission}.ts`, `execution/task/task-copy-host.ts`, three subject indexes and Team message delivery: own-Team resolution precedes root-wide reuse; copies can be hosted at the root; catalog source snapshots already support fresh copies without global collaborator entries. |
| RV-E06 | `src/agent-collaboration/execution/services/active-collaboration-root-directory.ts`, three root managers, Team root materializer and frozen termination scopes: current directory reserves message authority after construction; failure paths can ignore termination failure. Real prepare/commit/finish and frozen resource scopes exist. Directory absence alone is not proof of resource release. |
| RV-E07 | Shared execution records/parser: exact AgentRun/TeamRun identities, optional provenance/source and tolerant known-field projection; task-copy source and containment differ from runtime liveness. New stamps must survive every current writer. |
| RV-E08 | `src/persistence/file/store-utils.ts`, atomic run-package writer, app-data runner, Team V2 predecessor, migration guideline and both startup entrypoints: lock/rename and observed commit are established primitives; atomic writer is lock-free; runner skips terminal success/warning success and handles failed definitions; Team migration admits missing-tree skips. Existing unrelated platform prerequisites remain distinct from the proposed Project conversion. |
| RV-E09 | Built-in registry/config and shared manifests: normal shipped Agent template mechanism and explicit tools exist. TESTING.md requires test-owned data and an isolated worktree-built desktop for the real product journey. |
| RV-E10 | `src/agent-execution/services/agent-run-activation-candidate.ts:47–71`, `runtime/agent-run-activation-registry.ts` claim/markPrepared/completeAbort/stop snapshot and Manager private prepare/cleanup: failed abort is memoized; attach precedes storing the private run; preparation can reject without returned authority; no current published lookup reaches a missing-run quarantine. Confirms DI-001 independently of its probe. |
| RV-E11 | `configured-agent-execution-handle.ts:157–201`, configured activation planner and `flat-team-execution-manager.ts:128–154`: candidate held only in returned closure, published run assigned after fallible bindEvents, no-run termination appears complete; partial Team omits rejecting member and suppresses rollback failures. |
| RV-E12 | `agent-run-resource-manager.ts`, activation registry removal, `managed-agent-run-termination.ts` and Manager finish: resources/active run can be removed before cleanup proof; wrong/missing attachment lookup reports already released; failed finish rejection is cached terminal. Outer retained handle alone does not repair these failures. |
| RV-E13 | Backend factory interface and native factory: Promise-only create/restore; native Agent is started and awaited before backend return. Codex client manager/cleanup and actual `codex-app-server-client.ts:93–108`: workspace-key refcounts and early removal obscure exact failed-generation cleanup; the lower client itself clears the child before close completes. The design's concrete-child retained-proof obligation applies below the lease, not just to the manager map. |
| RV-E14 | Claude session/process cleanup, AGY stream-process stop and ACP process stop: cached close / late opening require retained exact controls; AGY signals after clearing child and logs group faults; ACP waits for exit without a final unresolved-exit deadline. SR-009 names bounded, non-materializing failure proof rather than assuming every async close proves release. |
| RV-E15 | IR-001 investigation/handoff/history and unchanged-class probe/log: confirms failed-abort obstruction and successful idempotent control, no providers or product acceptance. E-033–038 and the current inventory correctly retain its evidence-only status. |
| RV-E16 | Installed published `@anthropic-ai/claude-agent-sdk/package.json`, `sdk.d.ts` and `sdk.mjs`: version **0.3.280**, hashes independently match E-041 (`ef4c2c0…24955` / `b7ac9c0…abfa76`). Public spawn hook, `SpawnOptions`/`SpawnedProcess` and `Query.initializationResult()` exist. Source confirms void close, permanent cleanupPromise and swallowed 2s disposal race. The public initialization method observes the existing promise, not a second initialize. |
| RV-E17 | Vendor default local spawn/initialize/close inspected source-only: command/args/cwd/env and forwarded signal, all3 pipes/windowsHide; UTF-8 stderr tail, delayed SDK-facing exit; hook bypasses local stderr/debug-file setup but retains option/env/argument and generic error handlers. EOF 2s, POSIX TERM then 5s KILL / Windows later KILL. Node [official event contracts](https://nodejs.org/api/child_process.html#class-childprocess) distinguish successful spawn, error, actual exit, later IO close and signal attempt; v22 URL fetch unavailable, so no latest-runtime validation claim. Source reading is not private runtime access. |
| RV-E18 | Current dirty `claude-sdk-client.ts` option builder/open/createSdkQuery, streaming-session input/close, `claude-session.ts` open/close callbacks, `claude-session-process.ts`, manager/cleanup/diagnostics and MCP state/config: MCP/module/auth/queue are awaited before stream ownership; raw Query validation occurs after awaited creation. SessionProcess trusts void close/pump, nulls state; cleanup short-circuits process→listeners→skills. Current manager exact retry cannot compensate for hidden child authority. Confirms DI-002 allocation need, not target correctness. |
| RV-E19 | IR-002 handoff/investigation/history/inventory and real pinned-SDK **fake-child** probe/log independently read, not rerun: disposal ~2005ms with no exit; signals2→2 on repeat. Empty typecheck log supplies no independent exit evidence; focused-round2 shows 3 files/34 tests, initial log 13 failed/39 passed. All are obstruction/partial evidence, not provider/product/upgrade/source-review acceptance. |
| RV-E20 | Current partial `agent-run-activation-operation.ts` and `root-task-dispatch.ts` retain opaque controls and plan/register/reserve/prepare/stamp/seed order in progress. Full IR-002 source inventory and remaining local TODOs are preserved. SR-010 retains DI-001 target authority and explicitly allocates concrete Claude opening/process/session changes; no implementation defect or unverified TODO is silently resolved by this review. |
| RV-E21 | Canonical migration guideline reread, especially checklist need item and §3: optional facts with truthful absence and tolerant known-field projection require no historical transformation. Guideline diff is empty. Approved Data Continuity leaves shape/transition to architecture and knows no historic link to infer; it does **not prescribe a migration or a particular container**. Shared principle5 requires evidence-backed need, not schema-change inference. |
| RV-E22 | Independently read `git show HEAD:.../projects/stores/project-store.ts`: released authority is Project-row array; normalizer preserves recognized Project/Task/context facts with absent tasks/context empty. Current dirty Store/schema still use object envelope and migration-recovery diagnostic. SR-011's existing rows plus optional node collection can satisfy one-file atomicity and deletion retention without transforming those rows; this is verified design reasoning, not target execution. |
| RV-E23 | Current ProjectService/TaskService, Store wrappers, generic `readJsonFile`/`updateJsonFile`, source search for `projects.json`, and migration registry/definition: Store owns metadata/full logical-state access; sole extra production-path writer found is this ticket's unshipped converter. Project Delete uses metadata-only update; current full-state wrapper can retain independent lifetimes. Converter ID/import/registration absent from pinned HEAD, present in partial source. Removal must include definition/decoder/registry/import and converter-specific tests, not released migrations/ledgers. |
| RV-E24 | Current SR-011 core/inventory/history/handoff aligned around physical array versus logical projection, subject discrimination, no-write read and exact normal save, first real lifetime fact, last-Project Delete and scoped invalid-data handling. Source advancement independently observed; current Claude client now contains beginStreamingSession but no sessionStore option, so RV-MP-009 distinction remains. Current partial code and historical local logs are not acceptance. |
| RV-E25 | Current focused requirements/SD-AP-002, E-048–055, SR-012–014 history and exact archives: business-role prompt plus business-facing ordinary results approved; attachment/content access retained; new completion-report/self-DONE/notifier protocol explicitly deferred. Broader REQ-BL-007 never approved. |
| RV-E26 | Current `project-task-tool-manifest.ts`, contract, built-in `project-task-manager/{agent.md,agent-config.json}`, native/MCP shared manifest: one serializer echoes full Task/lifetimes for read and mutation; prompt explicitly inspects/retries cleanup. Existing seven-tool configuration has no new completion notifier. Source still requires scoped correction; this formerly conforming prompt is not a retroactive old-source violation. |
| RV-E27 | Current `project-task-service.ts:updateTask/toView`, `project-task-runtime-release.ts`, link/purpose/reference types and Store: atomic DONE+closure, commit latch, async exact-root release and repeated-DONE retry retain internal state. Link.error can describe cleanup as well as dispatch; raw projection would mislabel business failure. Service postcommit toView can fail, so compact output must not fabricate success/rollback. |
| RV-E28 | Current Agent adapter commitActivation, persisted shared parseTaskExecution, Agent/Org view/event projectors, strict collaboration DTOs, stream handler, Agent GraphQL wrapper and web hydration: stamp survives valid persisted reader; raw snapshot/indexed source goes to strict public DTO without taskLifetime. Started event and reconnect snapshot can reject before sidebar hydration. Team has its own snake-case allowlist projection; no blanket live Org/Team failure inferred. |
| RV-E29 | CRR-004 independent log (1 failed/4 passed; unrecognized taskLifetime), valid stamped/unstamped regression, API-REV-003 actual saved-UUID/Codex/MCP worker/stream correlation and current reports/history; IR-004 scoped corrections. Confirms existing finding origin/review gap, not our own live rerun or source closure. 228 manifest paths exist; current branch/HEAD/status confirmed. API confidence/closures/dependencies remain exactly as reported. |
| RV-E30 | SR-015/E-056 and `solution-scope-clarification.md` arrived during this review via concurrent designer-owned document updates. No approved baseline/design change: existing ordinary saved-ID worker visibility → explicit DONE after illustrative test wait → actual protected release and existing stopped/non-active view. Delay is test orchestration, never a production timer, completion proof or new notifier. 512/517 pre-edit non-review paths stayed byte-identical; five designer core docs changed plus this evidence-only file. No source/test/provider mutation by reviewer. |

## Routing Classification Review

- Task size: **Large — confirmed**.
- Architectural risk: **High — confirmed**.
- Rationale: cumulative Task/runtime durability and private/provider ownership, all-three-root admission/restore, lifetime-local helpers, same-array closure/fence and concurrency/teardown blast radius justify the independent gate. Prompt simplification alone is small, but does not downsize the cumulative solution.
- Independent Architecture Review required: **Yes**; no routing inconsistency.
- Classification evidence/correction: current design classification and retained RV-E01–24 plus RV-E25–29 support the route. No correction or gate waiver.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**.
- Approved requirements understood: **REQ-BL-008 = SD-AP-001 plus scoped SD-AP-002**, REQ-001–013 / AC-001–016 / BEH-001–010 / DEC-001–007. New authority is role/context separation, not blanket approval of the withdrawn REQ-BL-007 proposal. Specific response keys/mapper allocation are architecture decisions; business descriptions/context and exact follow-up remain available.
- Relevant existing behavior/evidence: prior full-path review reused for unchanged runtime contracts; current prompt/shared manifest/service/reader→event→strict DTO→web paths independently checked (RV-E25–29). Existing no-ID fresh-copy delegation, unlinked root-wide reuse, idle lifecycle, Task/Project Delete and durable data are preservation controls, not obsolete behavior.
- Scope guardrail: UC-001–004; no Project-page UI, assignment/sidebar redesign, scheduling/auto-acceptance, role permissions, global collaboration rewrite, arbitrary OS resource management or durable-work deletion. Existing worker visibility must still function; fixing it is not a new UI feature.
- Approved change/preserved outcome: Manager manages business work from information actually available; prompt must contain no resource supervision/platform lessons. Explicit DONE still atomically closes lifetimes and immediately initiates protected platform cascade. Internal pending/failed/proven-release receipts and exact cleanup-only retry remain truthful; ordinary mutation acknowledgement proves recorded status only. No automatic report/notification, worker self-DONE protocol or cleanup retry scheduler.
- Blocking Design Impact scope traceability: **Yes**; no architecture blocker remains. CRF-003/FAPI-005 remains an independent implementation finding under preserved REQ-005/AC-002/006, not resolved here.
- Remaining material ambiguity: **None for current design/approval**. User explicitly accepts absent completion awareness; missing worker message is not evidence to add a platform detector. Current API-UC-001 design response is scoped/approved; previous design conformance is not retroactively penalized. No-migration and DI-001/002 design resolutions retained; actual source/provider/API gates are separate.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass — ordinary Chat/@ Manager; catalog/prompt/config, RV-E09/26/29 | Pass — normal built-in/catalog launch, no new UI; DS-001 | Confirmed | None at design gate |
| BEH-002 | Contract | Pass | Pass — select/create/reuse real Project Task, RV-E01/26/27 | Pass — Task authority, compact returned identity and preserved content reads; DS-001 | Confirmed | None |
| BEH-003 | Contract | Pass | Pass — linked/no-ID delegate contract, RV-E02/03 and retained current shared parser | Pass — exclusive presence-sensitive source, unique node resolution/fresh copies; DS-002 | Confirmed | None |
| BEH-004 | System | Pass | Pass — saved text/context, RV-E01/03/29 | Pass — dispatch-time saved packet; missing bytes fail, no silent context omission; DS-002 | Confirmed | None |
| BEH-005 | Contract | Pass | Pass — exact dispatch/read/worker observation, RV-E03/07/28/29 | Pass — reserve before resources, stamped tree/accepted seed, exact business refs and typed public projection; DS-002/004/007 | Confirmed | CRF-003 source/UI correction downstream, not architecture closure |
| BEH-006 | Manager/System | Pass | Pass — available results or explicit user business DONE, RV-E25–27 | Pass — business-only prompt; explicit IN_PROGRESS/DONE; platform release; DS-001/003/004 | Confirmed | Implement scoped prompt/output correction |
| BEH-007 | Operational | Pass | Pass — approved pending/failure/retry/late input/reopen, RV-E03/04/06/27 | Pass — permanent fence, exact private+published scope/proof/retry, separate internal receipts; DS-003–005/007 | Confirmed | None at design gate; executable joins retained |
| BEH-008 | User | Pass | Pass — supported edit/Delete, RV-E23/27 and bounded API last-Delete evidence | Pass — metadata/context Delete only, node lifetime/history retained; DS-001/004/006 | Confirmed | None; active-work/restart joins not certified |
| BEH-009 | Contract | Pass | Pass — worker/member helper/delegation, RV-E05 and approved cascade | Pass — transitively scoped copies/protected borrowing/fences; DS-005 | Confirmed | None |
| BEH-010 | Contract/Operational | Pass | Pass — ordinary business Manager role/absent report, direct SD-AP-002; RV-E25–29 | Pass — shared read/mutation business DTOs, platform-only release, no notifier/self-DONE/scheduler; DS-001/003/004 | Confirmed | Implement and independently validate current delta |

## Supplemental Artifact Coherence Verdict

No behavior-defining/Product supplement. Evidence-only `solution-scope-clarification.md` (SR-015/E-056) is linked by current core artifacts and reviewed without changing the SR-014 architecture result. Current investigation inventory and cumulative handoff preserve specialist ownership and distinguish historical statuses from the current design. Archives are historical, not competing requirements.

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Current SR-014 core/handoff/inventory; exact approved/unapproved/held archives | Pass | Pass | Pass | Pass — current scoped authority explicit | Pass | None blocking; minor historical carryover noted below |
| IR-004 implementation handoff/investigation/history and inventories | Pass | Pass | Pass | Pass — prior design implementation, current corrections outstanding | Pass | Preserve all dirty source/evidence; not current delta acceptance |
| CRR-004 report/history/projection/preservation evidence | Pass | Pass | Pass | Pass — distinct API-UC-001 upstream role correction and CRF-003 source owner | Pass | Carry CRF-003 OPEN to Implementation/source re-review |
| API-REV-003 investigation/report/ledger/history and actual stream/Manager/data evidence | Pass | Pass | Pass | Pass — Fail64.29%, bounded passes/dependencies preserved | Pass | Independent API/UI/platform revalidation remains required |
| Evidence-only SR-015 scope confirmation | Pass | Pass | Pass | Pass | Pass | Same authority/design; test-controlled 30/50s wait is illustrative, actual release/stopped view and protected history still required |
| Historic candidate/Claude obstruction probes/check logs | Pass | Pass | Pass | Pass | Pass | Retain evidence-only; never convert to product/target acceptance |
| Repository policies/current source/tests; screenshots/discovery | Pass | Pass | Pass | Pass | Pass | Policies govern; screenshots evidence, discovery superseded; Delivery not reached |

**Non-blocking document hygiene:** design-spec's short “Relevant Supplemental Task Artifacts” paragraph still contains the SR-011-era IR-002/N/A-source-review posture, and some historic evidence rows say unperformed. These are superseded by its explicit current approval/status header, SR-014 gate section, current E-048–055 inventory and cumulative handoff attaching the actual IR-004/CRR-004/API reports. Current result/finding/owner/gates are unambiguous; do not follow that old paragraph as a gate waiver. Consolidating those historical passages would improve readability; it does not require a technical redesign, new approval or blocker.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature/behavior change, explicit design health section | None |
| Root-cause classification is explicit and evidence-backed | Pass | Missing Task/run invariant, containment-vs-ownership mismatch, opaque SDK release-proof boundary and designer-manufactured format incompatibility; RV-E01/03/05/16–18/21–23 | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Bounded refactor now, including actual Manager/factory/private/resource owners; unrelated UI/scheduler/global rewrite deferred | None |
| Refactor decision is supported by concrete design or residual-risk rationale | Pass | Identity plan/registered preparation, opaque Manager operation, synchronous concrete factory control, retained component/lease receipts, current-array/logical-state/gate/routing changes plus concrete Claude pre-options opening/public-hook owner and independent cleanup appear in final file map/sequence; RV-E10–18 independently confirm need | None |
| Current business/public projection boundary correction | Pass | RV-E26–29: business Agent mixed with platform supervision; raw internal stamped tree crosses strict public boundary. SR-014 concretely separates shared read/mutation output and introduces typed Agent/Org projection, retaining runtime authority | None blocking; main health paragraph retains prior runtime root causes |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary — Manager and metadata workflows | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary — dispatch through actual accepted ingress | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Primary — DONE through actual provider release/result | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Return/event — business acknowledgements/assignments, separate internal release receipts and existing public worker view | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Bounded local — ownership/address/wake admission | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Bounded current read/write under DS-001–004 — array projection/atomic save, no converter | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Bounded local — Manager private/published activation and physical release, parents DS-002/003/005 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Primary chains span the real caller, subject authority, critical downstream boundary and business result. DS-007 now explicitly reaches Claude opening → public SDK hook → exact child → observed exit/IO/components under DS-002/003/005. Local gates/FIFO/helper/retry loops supplement rather than replace them; Query disposal is not a shortened release spine.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| ProjectTaskService | Pass | Pass | Pass | Pass | Sole Task/lifetime subject boundary; store/reducers/context/effect remain internal. |
| Exact collaboration root | Pass | Pass | Pass | Pass | Public releaseTaskLifetime; no Task-service traversal of host registries. |
| Shared root task lifecycle | Pass | Pass | Pass | Pass | Owns plan/register/reserve/prepare/commit/publish and wake/force sequencing via private subject adapters. No provider readiness await holds the root FIFO. |
| Local private/partial/published preparation aggregate | Pass | Pass | Pass | Pass | Registered before async member preparation; includes rejecting member without requiring returned Team/candidate. |
| AgentRunManager | Pass | Pass | Pass | Pass | Opaque pre-await operation; candidate privacy, exact-generation publication versus release, retained retired cleanup. No direct root registry/backend access. |
| ClaudeSdkClient / opening control | Pass | Pass | Pass | Pass | Synchronous begin before lazy options/MCP/module/auth/queue; owns Query/child privately through supported hook. Session/root never receive transport, child or PID. Stream requestClose is not release proof. |
| Factory/provider acquisition and resource attachment | Pass | Pass | Pass | Pass | Synchronous control before awaits; one concrete factory/backend release owner, exact holders and per-component proof; no shared-service/global stop. |
| Shared Task tool manifest / Agent–Org public wire projection | Pass | Pass | Pass | Pass | Tools use TaskService only; business read/mutation serializers do not become lifecycle owners. Typed recursive allowlist maps internal snapshots/events without mutating stamps; strict validation remains after mapping. GraphQL reuses existing wrapper; Team separate protocol. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Task / runtime cross-subject boundary | Pass | Pass | Pass | Pass | Neutral lifetime port injected at composition; root code imports no Projects implementation. |
| Task authority / persistence | Pass | Pass | Pass | Pass | Pure reducers under one physical-array transaction; root/file locks are not nested across authorities. |
| Runtime facade / physical resources | Pass | Pass | Pass | Pass | Subject-private adapter/index/registries; no whole-root Stop for Task completion. |
| Persistence / existing migration boundary | Pass | Pass | Pass | Pass | One current array/subject-variant decoder and exact serializer. Remove unshipped ticket converter/import/registration; existing released migrations and strict classifiers remain independent/unchanged. |
| Manager / factory / provider internals | Pass | Pass | Pass | Pass | Configured/standalone callers use Manager; factory and concrete child boundaries retain exact controls. Claims and raw private runs/backends do not escape. No Project policy below root port. |
| Claude session / client / public SDK facade | Pass | Pass | Pass | Pass | Session uses opaque opening; client uses public query/hook/initialization contract and Node child authority internally. No mixed session-to-SDK-private transport/child dependency, argument/protocol clone or global process tracker for Task cleanup. |
| Business caller / internal runtime / public DTO | Pass | Pass | Pass | Pass | Manager receives business data, not proof-management duties. No prompt-to-provider bypass; serializers do not patch service state. Agent/Org share one public camel-case mapper, never private fields or Team wire protocol. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| delegate_task / saved-work resolution | Pass | Pass | Pass | Low | Pass |
| reserveExecution / admitExecution / recordDispatch | Pass | Pass | Pass | Low | Pass |
| acquireAdmission / assertOpen | Pass | Pass | Pass | Low | Pass |
| TaskExecutionActivationPlan / synchronous root beginActivation | Pass | Pass | Pass | Low | Pass |
| PreparedTaskExecutionActivation | Pass | Pass | Pass | Low | Pass |
| AgentRunManager.beginActivation / opaque operation | Pass | Pass | Pass | Low | Pass |
| AgentRunManager.releaseExactRun(expectedRun) | Pass | Pass | Pass | Low | Pass |
| Backend factory beginPreparation / exact provider lease | Pass | Pass | Pass | Low | Pass |
| ClaudeSdkClient.beginStreamingSession / ClaudeSdkSessionOpening | Pass | Pass | Pass | Low | Pass |
| SDK public SpawnedProcess facade / stream requestClose | Pass | Pass | Pass | Low | Pass |
| Root.releaseTaskLifetime | Pass | Pass | Pass | Low | Pass |
| Task status/update/read projection | Pass | Pass | Pass | Low | Pass |
| Shared ordinary mutation acknowledgement / business Task list / public tree mapping | Pass | Pass | Pass | Low | Pass |

Ingress AgentRun and execution TeamRun remain different identities. No generic ID guessing or second payload authority. Post-acceptance uncertainty is not the existing proven-no-work null result. A reserved/failed link may legitimately lack a tree/candidate; it represents an attempted dispatch and reachable cleanup target, not a successful assignment. Manager release validates the published generation even after retirement; run-ID-only lookup is not cleanup proof.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Manager discovery / shared tools | Pass | Pass | N/A | Pass | Existing templates and native/MCP manifests. |
| Task state/context | Pass | Pass | Pass | Pass | Existing subject; physical-array variants, tight logical state/reducers/effect concern. Collection is node state, never a metadata Project/tombstone. |
| Fresh workers/helpers | Pass | Pass | N/A | Pass | Existing prepared copies/catalog snapshots, not a parallel spawning engine. |
| Lifetime admission | Pass | Pass | Pass | Pass | Whole-root gate cannot permanently close one Task while preserving siblings. |
| Stop/retry / root lookup | Pass | Pass | Pass | Pass | Extend actual receipt/provider/root-directory boundaries plus Manager private operation and concrete factory control, not just outer handle retention. |
| Claude SDK acquisition / exact physical release | Pass | Pass | Pass | Pass | Extend existing SDK client/session capability with two concrete concerns: asynchronous opening and child/facade proof. Reuse pinned public API/option builder, not protocol clone/vendor fork/new process launcher. |
| Format evolution / need avoidance | Pass | Pass | N/A | Pass | No migration needed: existing Project rows remain current, optional lifetime absence means zero. Generic atomic writer suffices; no new startup owner. |
| Business outputs and public worker visibility | Pass | Pass | Pass | Pass | Existing manifest owns two concrete output shapes; existing streaming capability gets one tight Agent/Org mapper. No new diagnostic Agent/API/UI, notifier or universal mapper. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Projects | Pass | Pass | Pass | Pass | Business Task/lifetime authority, not runtime tree owner. |
| Shared collaboration and subject roots | Pass | Pass | Pass | Pass | Neutral sequence/ownership; concrete physical adapters. |
| Agent/Team preparation registries, Manager and provider/resource owners | Pass | Pass | Pass | Pass | Exact private/partial/published generation and actual physical release; independent cleanup stages retain proof. |
| Claude runtime-management client and provider session | Pass | Pass | Pass | Pass | Client owns exact opening/child adaptation; session owns pump/binding/frames and union of unreleased generations. Existing skill/MCP authorities stay independent, no Task state below root. |
| Tools / built-ins / migrations | Pass | Pass | Pass | Pass | Contracts/content/current state remain distinct concerns; migration subsystem only loses the unshipped ticket addition. |
| Existing Agent/Org streaming presentation | Pass | Pass | Pass | Pass | DTO translation only; root/history retains runtime identity/ownership, web retains existing hydration. Team snake-case mapper remains separate. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Business lifetime types/reducers/current array schema | Pass | Pass | Pass | Pass | Projects domain/store; physical Project-or-collection union versus logical state is explicit, no runtime manager dependency or old/new decoder. |
| Neutral stamp/port/gate | Pass | Pass | Pass | Pass | Shared collaboration task owner; no per-root duplicate policy. |
| Recipient algorithm and source-copy mechanics | Pass | Pass | Pass | Pass | Existing resolver/index port strengthened, not copied. |
| Manager operation / backend preparation control | Pass | Pass | Pass | Pass | Shared private authority has one claim/cancel/publication/retry state; concrete provider release state owns a different physical concern, not a parallel Task lifetime. |
| Claude opening result / exact child receipt | Pass | Pass | Pass | Pass | Opening owns acquisition/cancellation, process owner owns concrete exit/IO/signal proof; each release callback kept once until success. No second global MCP/skill registry or process ledger. |
| Shared read/mutation business DTOs and Agent/Org public tree mapping | Pass | Pass | Pass | Pass | Two local manifest projections avoid native/MCP duplication; one concern-owned typed recursive mapper avoids repeated raw-to-public conversion. No all-protocol shared base. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Delegate input union | Pass | Pass | Pass | Pass | Pass | Present Task ID or described work; no optional-field soup. |
| Logical ProjectState / physical Project-or-lifetime-collection / lifetime links | Pass | Pass | Pass | Pass | Pass | Logical object is not disk envelope. Zero-or-one node collection has one subject/field, omitted with no facts; Project identity wins subject discrimination. Exact root/reference, no copied Task/provider/member tree or fake metadata ID. |
| Runtime lifetime stamp / inherited membership | Pass | Pass | Pass | Pass | Pass | Root tree owns existence/containment; node lifetime collection owns closure/business association through TaskService. Cross-reference agreement is required, not competing runtime authority. |
| Private operation / resource-release result variants | Pass | Pass | Pass | Pass | Pass | Released requires settled acquisition and all component proof; pending/quarantined/published are explicit. Tagged new/native/external restore avoids optional-field guessing. Exact leases distinguish holder and generation. |
| Claude opening / child / component receipts | Pass | Pass | Pass | Pass | Pass | One opening generation and exact child proof; input/Query close request, actual exit and owned IO/pump/component settlement are distinct facts, not overlapping success flags. Successful receipt compacts provider pointers; failed generation stays exact and nonreopenable. |
| Business assignment vs mutation acknowledgement vs internal lifetime | Pass | Pass | Pass | Pass | Pass | Exact tagged root/run/ingress and dispatchOutcome suffice for follow-up; accepted is not completed/released. No copied resource tree, mixed link.error, private lifetime IDs or one-for-all result envelope. Full internal proof remains. |
| Public Agent/Org tree DTO vs internal stamped records | Pass | Pass | Pass | Pass | Pass | Explicit current-field allowlist preserves every child/nested Task/source/member identity; omission of private ownership on wire is translation, not deleting durable authority or loosening validation. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| projects/domain types/reducers; stores schema/store | Pass | Pass | Pass | Pass | Current semantics versus physical transactions separated. |
| project-task-service; runtime/project-task-runtime-release | Pass | Pass | Pass | Pass | Business policy versus owned release effect; effect has no independent store/status authority. |
| lifetime port/gate; root lifecycle/adapter | Pass | Pass | Pass | Pass | Actual admitted count and sequence, not empty pass-throughs. |
| Three subject adapters/indexes/facades/materializers | Pass | Pass | Pass | Pass | Concrete existing paths and strengthening are named. |
| Exact registries / preparation aggregates / root directory | Pass | Pass | Pass | Pass | Partial/rejecting controls registered before resources; root release uses preparation-plus-tree union. |
| Agent activation operation/candidate/Manager/registry | Pass | Pass | Pass | Pass | Public privacy/claim sequence versus internal derived registry facts; no root bypass. |
| Concrete factories/acquisition and resource manager | Pass | Pass | Pass | Pass | Retained provider/attachment receipts before awaits; exact successful-only release. Existing native/Codex/Claude/AGY/ACP/Grok paths named. |
| runtime-management/claude/client/{claude-sdk-session-opening,claude-sdk-process-owner}.ts; existing client/stream/session/process/manager/cleanup/diagnostics | Pass | Pass | Pass | Pass | Add/Modify paths named: lazy option acquisition versus exact child/facade versus run binding/pump/component cleanup. Source-like detail covers graceful timings, stderr/error/debug replacement and retry, not a vague lowest-owner instruction. |
| Tool schemas/manifest; Manager template; ticket converter removal | Pass | Pass | Pass | Pass | Contract/content distinct; converter/decoder/registration removal named, not a new conversion owner. |
| agent-tools/project-tasks/project-task-tool-manifest.ts; built-in Project Task Manager agent.md | Pass | Pass | Pass | Pass | Manifest owns business read/acknowledgement mapping shared native/MCP; prompt positive business duties only, no platform lessons/resource inspection or new protocol. |
| services/agent-streaming/collaboration-execution-tree-dto-projection.ts and existing Agent/Org projectors | Pass | Pass | Pass | Pass | Concrete Add/Modify path and recursive variants specified; snapshot/start/collaborator events share mapped child shapes. GraphQL already reuses wrapper; CRF-003 remains OPEN in source. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| projects/{domain,stores,services,runtime} | Pass | Pass | Low | Pass | Small owned structures; not a generic Project orchestrator. |
| agent-collaboration/{execution/task,collaborators} | Pass | Pass | Low | Pass | Neutral lifetime sequence versus address policy. |
| Agent/Team/Org subject-root folders | Pass | Pass | Low | Pass | Existing private resource/tree machinery remains local. |
| agent-execution/{services,runtime,backends}; provider-specific lower controls | Pass | Pass | Low | Pass | Manager public authority, private registry and concrete acquisition remain distinct; no generic ResourceBag/global resource ledger. |
| runtime-management/claude/client + existing agent-execution/backends/claude/session | Pass | Pass | Low | Pass | Physical SDK integration stays client-private; session depends on opaque opening, not child or private transport. Bounded split, not generic process infrastructure. |
| built-in-agents / agent-tools / existing migration folder | Pass | Pass | Low | Pass | Content/contracts separated. Existing released migrations retain frozen history; this ticket adds none. |
| services/agent-streaming public DTO projection | Pass | Pass | Low | Pass | Existing presentation boundary, not projects/runtime ownership or generic shared resource folder. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Ticket envelope decoder/converter/registry addition and nonarray-to-empty coercion | Pass | Pass | Pass | Pass | Keep current physical array/Project variant; remove unshipped conversion and metadata-only update that loses lifetimes. Existing non-array authority errors, never reset or envelope fallback. |
| Eager unchecked adapter seed release | Pass | Pass | Pass | Pass | Shared awaited, guarded actual acceptance across all three roots. |
| Required-description-only and metadata-only-DONE descriptions | Pass | Pass | Pass | Pass | Updated strict modes and truthful Task projection. |
| Linked helper fallback / late-restore bypass | Pass | Pass | Pass | Pass | Scoped resolver and closure checks. |
| Terminal failed abort/finish, early detach/lease deletion and partial Team suppressed errors | Pass | Pass | Pass | Pass | Success-only terminal receipts and retained exact controls; no disposal on quarantine. |
| Promise-only factory/current Manager preparation path | Pass | Pass | Pass | Pass | Current configured and standalone callers adopt synchronous retained controls; no duplicate fallback path. |
| Promise-only Claude streaming acquisition / void-close-as-proof / pump-only CLOSED / first-error cleanup | Pass | Pass | Pass | Pass | Replace with synchronous opening, requestClose versus release, retained failed generations and component receipts. No default-spawn fallback/private SDK runtime access; catalog query remains a separate current concern. |
| Manager platform/cleanup prompt paragraphs and full raw ordinary lifetime result | Pass | Pass | Pass | Pass | Replace by business-only duties and distinct manifest DTOs; keep business content/context reads, full internal cleanup/retry tests and authority. |
| Raw Agent/Org snapshot/started-child/collaborator passthrough to strict DTO | Pass | Pass | Pass | Pass | Typed public projection at existing boundary, not stamp deletion/child dropping/schema relaxation or Team protocol replacement. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Project physical state | No | Pass | Pass | One current array with Project/node-state subjects; missing collection is valid empty semantics, not a legacy decoder. No array/object fallback, version or write-on-read. |
| Optional ownership stamp | No | Pass | Pass | Truthful absence means unlinked; tolerant projection is not a historical branch. |
| No-ID delegation / borrowed unowned runs | No | Pass | Pass | Approved current variants; preserve rather than remove. |
| Candidate successful abort / unlinked standalone restore | No | Pass | Pass | Current successful semantics and privacy preserved; failure retry is cleanup only, never reconstruction. |
| Claude SDK ownership replacement | No | Pass | Pass | Pinned supported hook for all runtime streaming sessions; no linked-only/default fallback/vendor fork/private introspection. Existing catalog metadata query is a different current subject, not a compatibility cleanup path. |
| Frozen released schemas | No | Pass | Pass | Historical knowledge remains in migrations only. |
| Business/wire projection correction | No | Pass | Pass | One current output per subject; no legacy raw diagnostics fallback or strict-schema bypass. Internal/public forms serve distinct owners, not competing persistent truths. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| projects.json / optional node lifetime collection | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing Project rows retain their meaning. No historical link/new fact must be recovered; absent collection truthfully zero. Normal first real lifetime write appends facts, not prepopulation or conversion. |
| Existing execution trees | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Absent stamps genuinely unlinked; present stamps validated on requested operation, no history rewrite. |
| Context/history/output/workspaces | Not Affected by format | Pass | Pass | N/A | Pass | Runtime-only cleanup; intentional existing Delete/source cleanup remains distinct. |
| Built-in Manager definition | Normal template bootstrap | Pass | Pass | N/A | Pass | No user-definition migration or feature-default change. |
| Private/provider opening/child/generation receipts | Not Affected — in-memory | Pass | Pass | N/A | Pass | No pointer/PID/provider journal or new migration/startup gate. |
| Current prompt/business output/public wire mapper | Not Affected on disk | Pass | Pass | N/A | Pass | Pure output translation and role content changes do not transform storage meaning or require a migration. Stamps/history kept internally; previous No Migration decision retained. |

**Correction:** prior ARCH-REV-001–003 accepted a designer-created envelope incompatibility as migration need. Atomic DONE+closure and deletion retention require coherent one-file state, **not an object container**. That prior necessity verdict is withdrawn; historical results remain on their original bases. SR-011 satisfies guideline need/avoidance policy through one current `ProjectStateRecord[]` decoder and exact serializer, with Store-private logical `{projects,taskLifetimes}` projection. Subject variants are not version-specific compatibility. Existing Project rows always retain Project interpretation even with unknown extras; recognized collection/fence facts validate rather than filter away. Serialize at most one collection only when facts exist, and preserve it on every metadata update including last-Project Delete. No read/startup write or array/object fallback.

`readJsonFile` default `[]` / locked `updateJsonFile` remain sufficient. Validate the logical result then serialize physical array before atomic replacement; observed commit receives validated logical state without I/O/throw. Invalid JSON/non-array/critical lifetime state stays preserved and yields a requested-capability diagnostic, not "run migration recovery" or unlinked/global startup lockout. No ticket converter/audit/backup/journal, historical inference or live-profile replay/reset. Remove only the unshipped ticket definition/decoder/import/registration/tests; no released migration/strict classifier/terminal ledger changes. Stopped-writer deployment assumption retained, not a downgrade/dual-writer compatibility promise. E-025 is shape evidence only; read/write growth and both startup boundaries remain untested downstream obligations.

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Current physical array/logical state, converter removal and metadata-writer retention | Pass | Pass | Pass | Pass |
| Identity plan / registered aggregate / pre-resource reservation / stamp / guarded publication | Pass | Pass | Pass | Pass |
| Manager/candidate/factory/resource and concrete provider controls | Pass | Pass | Pass | Pass |
| Claude opening / public-hook physical proof / session cleanup, preserving partial worktree | Pass | Pass | Pass | Pass |
| Scoped helper admission / restore / approvals | Pass | Pass | Pass | Pass |
| Forced exact release / failed receipts / tool projection | Pass | Pass | Pass | Pass |
| SR-014 scoped prompt/output and open projection correction | Pass | Pass | Pass | Pass |

Steps are implementation sequencing, not authorization to ship an intermediate unfenced pipeline. RV-E03/04/06 and RV-E10–14 make pre-await lower ownership, pre-resource reservation, cancellation-before-drain and actual guarded publication necessary parts of the change, not optional follow-up cleanup. Complete those authorities before dependent implementation relies on them; preserve the substantial IR-002 partial source rather than restarting/resetting it. The design explicitly says to repair a concrete lower close owner if it discards the proof; retaining a higher manager/client object alone is not sufficient.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Linked/unlinked input | Yes | Pass | Pass | Pass | Concrete exclusive payloads, no project_id override. |
| A/B copies/helper/borrowing scope | Yes | Pass | Pass | Pass | Fresh assignments versus deduplicated lifetime helper; no global duplicate entry. |
| DONE/reopen/old exact run ID | Yes | Pass | Pass | Pass | Immutable completed fence, new lifetime/copies only. |
| Admission and force-release ordering | Yes | Pass | Pass | Pass | Numbered sequence states identity-only planning, synchronous registration, pre-resource reservation, durability, acceptance and uncertainty. |
| Private/partial/rejected preparation and shared-client lease | Yes | Pass | Pass | Pass | Operation/result interfaces plus concrete provider rules and focused verification witnesses; no candidate publication/global stop workaround. |
| Claude pre-options opening / hook / actual exit vs disposal / independent retry | Yes | Pass | Pass | Pass | Concrete control, state/order and facade contract distinguish physical proof, normal launch semantics and success-only receipts; focused real-child/failure controls specified, not claimed executed. |
| Business read vs mutation/internal proof; recursive public worker DTO | Yes | Pass | Pass | Pass | Exact list/acknowledgement shapes and dispatch mapping specified; source/child recursion/start-event/GraphQL tests named, raw passthrough/private stamp exposure rejected. |

## Material Premise Validation (Only When Needed)

Most lifecycle premises are already explicitly approved by SCN-005–010. The following records make the risk-dependent judgments auditable; they introduce no new product scenarios or policy.

### RV-MP-001 — DONE overlaps an owned materialization or deferred first input

- Related approved authority: REQ-005/007/009/010/012; AC-004/007–009/011; SCN-005/006/008.
- Relevant behavior IDs: BEH-005–007/009.
- Initiating basis kind: **Contract**.
- Independent initiating contract: explicit completion can cancel active owned work; concurrent/repeated dispatch and no helper escape are expressly covered by AC-009/011. Manager uses `create_or_update_task` to complete the real Task while its worker is doing approved delegation/helper work.
- Support evidence: approved scenario/acceptance basis; RV-E02–05 show status writes, asynchronous preparation, queued activation and deferred microtasks are ordinary paths, not test-created states.
- Forward path: Chat Manager/worker → delegate_task or send_message_to(address) → root preparation/activation or helper admission; concurrently Manager status tool → TaskService DONE commit. Preparation or input publication may still be outstanding at closure.
- Lifecycle preconditions / consequence: open linked lifetime with asynchronous owned admission; unchecked seed/helper creation could begin work after completion or evade cleanup.
- Scenario validity / Reachability: Supported Explicit Edge Scenario / **Reachable**.
- Review consequence: accept per-lifetime admitted count, synchronous close latch, current closure checks at actual acceptance and cancellation before bounded drain/frozen exact release. SR-009 registers exact controls and durable attempt before provider acquisition; pending continuations remain owned and cannot block initiation on other targets. Late result writes cannot reset closure/cleanup. No outer-root gate closure, grace wait or automatic seed replay is justified.

### RV-MP-002 — A worker's helper is physically outside the assigned Team

- Related approved authority: REQ-007/012; AC-011–013; SCN-008–010.
- Relevant behavior IDs: BEH-003/007/009.
- Initiating basis kind: **Contract**.
- Independent initiating contract: approved worker/member collaboration to obtain help, followed by Manager completion of all Task-owned work.
- Support evidence: public send_message_to(address) and delegate_task semantics, RV-E05; current copy-host rule chooses the root for an address outside the sender's own Team.
- Forward path: user asks Manager to execute Task → assigned Team member sends to eligible external helper address → ordinary root-address admission (target: lifetime helper copy) → helper's further collaboration/delegation → explicit DONE.
- Lifecycle preconditions / consequence: root hosts a sibling helper/copy outside the assigned Team's containment. Stopping only that Team misses the helper; root-wide same-definition reuse would undermine independent Task stop scope.
- Scenario validity / Reachability: Supported Normal Scenario / **Reachable**.
- Review consequence: accept transitive immutable lifetime ownership, scoped helper lookup/copy, separately hosted forest enumeration and borrowed-unowned exclusion. Definitions, first-creator provenance and timestamps are not cleanup authority.

### RV-MP-003 — Project startup conversion interrupted (superseded target)

- Related approved authority: data continuity; migration guideline; BEH-002/005/007 and former DS-006.
- Initiating basis kind: **Operational**.
- Independent initiating basis: supported application Quit/restart is real; it does not independently require a Project format conversion.
- Support evidence: former SR-008–010 converter proposal; revised policy/source/need analysis RV-E21–23 and current DS-006 explicitly withdraw that unshipped converter.
- Forward current target path: upgraded application starts with existing runner definitions, **no ticket Project converter**; requested ProjectStore read accepts current Project arrays without write. No ticket target replacement/unfinished migration record can be produced on this target path.
- Lifecycle preconditions / consequence: the old claimed state depended on the proposed incompatible envelope/converter itself, not a required old-data fact or meaning change. Existing atomic normal updates and durable lifetime checks still apply to ordinary business restart; no migration replay machinery follows.
- Scenario validity / Reachability: **Obsolete for this target / Not Reachable**; historical migration witness only, not a current feature requirement.
- Review consequence: remove this ticket's converter/decoder/registration and converter-specific tests, retain existing released migration runner/ledger untouched. No ticket migration original/backup/journal/restart-to-convert matrix. Historical premise resolution recorded in ARCH-REV-004; use normal-read/write/closed-restart controls instead.

### RV-MP-004 — Private preparation abort fails, then repeated DONE must reach it

- Related approved authority: REQ-005/007/009/010/012; AC-004/007–009/011; SCN-006/008; incoming DI-001.
- Relevant behavior IDs: BEH-005–007/009.
- Initiating basis kind: **Contract**.
- Independent initiating contract: user-approved explicit completion during owned work, failed cleanup and safe repeated DONE. A working Task's member brings/delegates a helper while Manager completes that Task; this does not require the Manager to issue concurrent first-dispatch tools.
- Support evidence: approved AC-008/009/011 and RV-E03/10/11. Probe merely reproduces the memoization obstruction; it is not the initiating basis.
- Forward path: Manager starts real Task → active worker requests helper/copy → adapter/provider preparation → Manager DONE invokes exact abort → provider release cannot confirm inactivity → pinned-base private candidate caches quarantine → later repeated DONE must retry the same private resource.
- Lifecycle preconditions / consequence: resources may exist before candidate/tree result; published-run lookup cannot reach them, and failed abort was terminal at the independently inspected pinned base; partial controls are not yet validated. Outer root retention alone cannot implement required retry.
- Scenario validity / Reachability: Supported Explicit Edge Scenario / **Reachable** under the governing failed-cleanup contract.
- Review consequence: DI-001 is **resolved in design** by pre-resource durable reservation, registered root aggregate and opaque pre-await Manager/factory controls; failed release coalesces only its current attempt and retries cleanup, never acquisition/publication. Successful abort remains idempotent. Requires target executable proof later.

### RV-MP-005 — A partial Team rejects before returning its prepared result

- Related approved authority: REQ-007/009/012; AC-004/008/011; SCN-006/008; DI-001.
- Relevant behavior IDs: BEH-005–007/009.
- Initiating basis kind: **Contract**.
- Independent initiating contract: supported Task delegation/helper Team composition with truthful failed dispatch/cleanup, not an arbitrary malformed Team fixture.
- Support evidence: ordinary member-by-member Team preparation and native/provider-backed asynchronous activation; RV-E11/13. A provider preparation rejection exercises the approved failure alternate.
- Forward path: worker delegates/brings valid Team → root plans complete Team/ingress/member IDs → members prepare sequentially → a later provider preparation rejects, possibly after acquisition → rollback must include that rejecting member and prior members → any failed cleanup remains reachable on repeated DONE.
- Lifecycle preconditions / consequence: no normal prepared Team result exists; only collecting returned activations loses the failing member, and first-error/suppressed rollback can lose other failed controls.
- Scenario validity / Reachability: Supported Explicit Edge Scenario / **Reachable**.
- Review consequence: accept registered aggregate/member controls before awaits, all-started-member cleanup and retained partial proofs independent of Team factory result. Aggregate success requires every owned member/local assembly; no broader root Stop.

### RV-MP-006 — Last-holder provider close fails without authority to release another holder

- Related approved authority: REQ-007/009/012; AC-008/012/013; SCN-006/009/010.
- Relevant behavior IDs: BEH-007/009.
- Initiating basis kind: **Contract**.
- Independent initiating contract: user-approved independent Task runtimes and cleanup retry while Manager, other Tasks and borrowed work remain usable.
- Support evidence: ordinary Codex workspace-shared client acquisition/release and early manager/client removal, RV-E13; concrete run cleanup invokes it. Shared-provider identity is a physical dependency, not Task ownership.
- Forward path: Task A acquires a run-scoped holder → DONE A releases its thread/holder → last-holder client close cannot establish completion → retained exact-generation receipt must be retried; subsequent unrelated holder acquisition must not be decremented or stopped by that retry.
- Lifecycle preconditions / consequence: failure may occur below the manager lease, where the pinned-base client cleared its child before close completed; IR-002 exact lease/terminal proof work remains unvalidated. Bare workspace key, missing entry or retained client object alone cannot prove old process release or authorize touching a replacement.
- Scenario validity / Reachability: Supported Explicit Edge Scenario / **Reachable** under the exact cleanup/failure contract.
- Review consequence: accept typed holder/generation lease, once-only decrement and concrete-child retained release proof; provider control retains failed close before lower authority discards it. Design's concrete close-owner repair directive applies here. No global clientManager.close or process census. Validate normal nonlast-holder release as the Task-B liveness control.


### RV-MP-007 — Claude Query disposal cannot certify failed Task cleanup or its retry

- Related approved authority: REQ-007/009/010/012; AC-007–009/011–013; SCN-006/008; incoming DI-002.
- Relevant behavior IDs: BEH-005–007/009.
- Initiating basis kind: **Contract**.
- Independent product-supported contract: Manager explicitly completes linked work and can safely repeat DONE when owned provider cleanup cannot establish success. Existing ordinary Chat/@ Manager and `create_or_update_task` exercise that approved failure/retry contract; not arbitrary OS orphan recovery.
- Support evidence: approved cleanup alternate and RV-E16–19. Fake-child failure only reproduces vendor behavior; it does not establish product reachability/frequency.
- Forward path: Manager delegates real saved Task to Claude Agent/Team/member/helper → owned run sends work through ClaudeSession/SessionProcess/SDK Query → explicit Manager DONE → Task atomic closure → exact root/Agent release → session cleanup → Query.close/disposal; a stop attempt cannot establish exit → repeated DONE must retry the same owned physical authority.
- Lifecycle preconditions / consequence: actual local child was acquired; SDK cleanup can finish its 2s race with no observed child exit and permanently cache that disposal. Reporting released from stream/pump/Query completion loses the exact retry obligation.
- Scenario validity / Reachability: Supported Explicit Edge Scenario / **Reachable**, governed by the approved failed-cleanup contract and concrete caller path.
- Review consequence: DI-002 is **resolved in design only** by the supported hook-owned exact child/facade, actual exit plus separate IO/pump/component proofs, bounded EOF/escalation and cleanup-only retry. Independent skill/MCP/listener stages proceed despite process failure. No vendor-private bypass, OS census, PID-only/global stop, reacquisition or durable-work deletion. Required real-child/provider validation remains downstream.

### RV-MP-008 — DONE arrives while the owned Claude opening has not returned a stream

- Related approved authority: REQ-005/007/009/010/012; AC-004/007–009/011; SCN-006/008; RV-MP-001 and DI-002.
- Relevant behavior IDs: BEH-005–007/009.
- Initiating basis kind: **Contract**.
- Independent product-supported contract: an already active Task worker/member obtains recursive helper work while Manager assesses and completes that same Task. No assumption that Manager concurrently dispatches its own initial tool call is needed.
- Support evidence: ordinary helper/delegate path RV-E03/05/20 and current Claude lazy open RV-E18; SDK module/auth/options/MCP/serial queue and initialization are asynchronous ordinary lifecycle stages.
- Forward path: Task worker requests helper copy → registered/reserved activation → helper seed/normal lazy ensureOpen → current session builds MCP/options and SDK client awaits module/auth/queue → Manager DONE closes lifetime and cancels exact operation while stream/Query may not yet be returned → pending/late continuation must remain owned and nonpublishable.
- Lifecycle preconditions / consequence: an outer returned streaming session does not yet exist; registering only after the await leaves a cleanup reachability hole. A child acquired before a later SDK/binding failure likewise cannot depend on successful wrapping.
- Scenario validity / Reachability: Supported Explicit Edge Scenario / **Reachable**.
- Review consequence: accept synchronous opening before lazy options, cancellation checks at each awaited boundary and hook, pre-spawn receipt/immediate child retention, raw Query retention before validation and public startup settlement observation. Acquisition unsettled remains pending; cancelled continuations cannot seed/frame/tool-wake or reopen. Retain exact failed generations until proof; observe one iterator only.

### RV-MP-009 — SDK session-store deferred-spawn branch is not a current product scenario

- Related approved authority: preservation of current Claude streaming create/resume semantics; no new session-store integration or provider feature in this ticket.
- Relevant behavior IDs: BEH-003/007/009.
- Initiating basis kind: **User**.
- Independent initiating surface/action: existing Chat/@ launches or resumes a Claude run, with application-built runtime options.
- Support evidence: current `buildQueryOptions` supplies create/resume/model/tools/cwd/env/MCP but **no sessionStore**. Pinned `query` takes its deferred-spawn branch only for resume/continue with sessionStore. The public hook and vendor branch alone do not establish product use.
- Forward path: Chat/@ → configured Claude run → SessionProcess → application option builder → pinned query's ordinary local spawn. The verified path does not enter the optional session-store deferred branch.
- Lifecycle preconditions / consequence: a synthetic SDK sessionStore or direct SDK caller could defer spawn, but that would add an initiating state not produced by the approved application path.
- Scenario validity / Reachability: Technically Possible but Unsupported/Contrived for this ticket / **Not Reachable** on the verified current and preserved target option path.
- Review consequence: no session-store adoption, deferred-spawn recovery engine or separate product failure matrix is justified. SR-010's public initialization observer is accepted only as bounded startup/cancellation tracking of the existing Query together with the ordinary asynchronous opening in RV-MP-008; it is not a reinitialize call, new SDK mode or evidence of deferred product acquisition. Hook closure guard/retained continuation proof already follow the supported cancellation contract. Contract-level injected-hook tests do not establish a new product journey.

### RV-MP-010 — Last-Project deletion must not erase closed runtime lifetime facts

- Related approved authority: REQ-005/007–011; AC-006–010; SCN-006/007; preserved metadata/context Delete and durable runtime history.
- Relevant behavior IDs: BEH-005–008.
- Initiating basis kind: **User**.
- Independent exposed surface/action: Projects detail Delete Project confirmation (or existing deleteTask/Project GraphQL mutation); user deliberately deletes business metadata, optionally after Manager has completed the Task. This is an existing supported action, not manual internal-file deletion.
- Support evidence: `ProjectDetail.vue` delete confirmation/call, GraphQL `projects.ts:200–201`, current ProjectService.deleteProject and TaskService.deleteTask; approved SCN-007 and RV-E23. User expects existing context deletion but no hidden runtime stop/history erasure.
- Forward target path: Manager DONE commits Task+closed lifetime → user confirms Delete of the final Project → ProjectService.updateRecords removes metadata/owned context → Store full-state wrapper retains independent node collection in the same physical array → restart/requested exact stamped target consults retained closed lifetime while Project listing is empty.
- Lifecycle preconditions / consequence: lifetime facts exist but the final metadata row no longer does. Embedding facts only in deleted Project/Task rows would lose history/fence; interpreting the collection as a Project would expose a fake UI row.
- Scenario validity / Reachability: Supported Normal Scenario / **Reachable**.
- Review consequence: accept zero-or-one node lifetime collection, Store-private Project projection and full-state retained writes; lifetime-only array valid, no Project ID/tombstone/duplicate payload/second store/deletion guard. Verify no metadata writer can drop facts and closed targets cannot revive after restart; deletion itself remains noncancelling.

No machinery or finding depends on arbitrary external orphan-process discovery, hostile data mutation, manual deletion of internal files or unsupported concurrent old/new writers. Those are outside the approved/guideline operating basis and are not promoted by available technical hooks.

### RV-MP-011 — Ordinary linked worker must remain visible through the existing public stream

- Related approved authority: REQ-005/013; AC-002/006/014; SCN-001/002/011, existing Chat/sidebar visibility.
- Relevant behavior IDs: BEH-001/005/010.
- Initiating basis kind: **User**.
- Independent exposed surface/action: user opens ordinary Chat/@ Project Task Manager and asks it to execute a saved Task, then observes/follows the actual worker in existing collaboration UI. This coherent product goal precedes any mapper or test.
- Support evidence: approved paths, API-REV-003 actual saved UUID/attachment/Codex/MCP worker+marker and WS correlation, CRR-004; RV-E28/29 source confirmation. Synthetic unit reproduces this established shape, not its originating basis.
- Forward path: Chat/@ Manager → saved-ID delegate → Agent adapter stamps/persists child → live started event or reconnect/inspection snapshot → Agent view projector raw tree/source → strict DTO parse → web hydration/sidebar. Current source rejects private taskLifetime before hydration; GraphQL shares projector. Org uses same boundary in source, but no separate live failure alleged.
- Lifecycle preconditions/consequence: normal successful linked child exists with valid internal stamp, yet outward projection fails/disconnects and concrete child is absent. Worker execution/history are not shown to have failed.
- Scenario validity / Reachability: **Supported Normal Scenario / Reachable** for confirmed Agent witness.
- Review consequence: accept narrow typed Agent/Org recursive public projection preserving identity/source/all nested children and unchanged strict DTO. Keep internal stamps; cover started event/snapshot/GraphQL/reconnect/UI and Team/Org controls. **CRF-003/FAPI-005 remains OPEN implementation-owned**, not closed by architecture allocation or a stamp-removed diagnostic control.

### RV-MP-012 — Business completion acknowledgement while actual release remains pending or failed

- Related approved authority: REQ-006–009/013; AC-007/008/014/015; SCN-005/006/011.
- Relevant behavior IDs: BEH-006/007/010.
- Initiating basis kind: **User / governing completion contract**.
- Independent exposed surface/action: after available work results or explicit user business instruction, Manager patches DONE through create_or_update_task; repeated explicit DONE is the approved safe retry trigger.
- Support evidence: direct SD-AP-002, Task tool/service/release owner, RV-E26/27 and prior provider failure witnesses. Compact output cannot establish its own semantics.
- Forward target path: ordinary native/MCP command → TaskService locked atomic DONE+closure → observed gate close → release effect starts exact registered roots → provider/component attempt/proof recorded internally; service authoritative returned Task → shared manifest business acknowledgement. Physical completion may settle later or fail. A fallible postcommit view may itself throw; do not infer rollback or manufacture acknowledgement from that exception.
- Lifecycle preconditions/consequence: business commitment and physical release are different events. Returning business status is not false release success, provided full platform pending/failure/proof/exact retry is retained; raw mixed error must not become an unrelated business failure. Manager does not supervise resource deadlines.
- Scenario validity / Reachability: **Supported Normal Scenario / Reachable**, including the already-approved lifecycle failure alternate.
- Review consequence: accept separate manifest business read/mutation projections and internal diagnostic authority. Preserve concise truthful operation/indeterminate errors and repeated-DONE cleanup-only retry; no new scheduler/diagnostic Agent/tool/UI or hidden suppression is authorized.

### RV-MP-013 — Worker finishes without a completion report

- Related approved authority: REQ-006/013; AC-016; SCN-012; SD-AP-002 explicitly defers reliable report/self-update conventions; SR-015/E-056 reaffirms, no authority change.
- Relevant behavior IDs: BEH-006/010.
- Initiating basis kind: **User-supported work / communication limitation**.
- Independent exposed surface/action: user asks Manager through Chat/@ to delegate long-running business work to an Agent/Team. The user explicitly identifies that completed work may not be reported and does not request a platform detector in this ticket.
- Support evidence: direct user evidence E-054, requirements focused delta/SCN-012 and existing ordinary communication; no current guaranteed notification contract established.
- Forward path: Manager delegates saved work → worker/Team executes → no completion message enters Manager conversation → Manager has only available business information. Runtime quiet/shutdown is not business acceptance. Later explicit user instruction/available work result may justify an actual DONE command → unchanged platform closure/cascade.
- Lifecycle preconditions/consequence: absence of report leaves business knowledge unknown; promising guaranteed awareness/auto-DONE would invent behavior beyond the scoped instruction.
- Scenario validity / Reachability: **Supported Normal Scenario / Reachable** as an explicitly accepted limitation, not a platform notification defect.
- Review consequence: positive business prompt may clarify uncertainty but must not promise completion reports, self-DONE/report conventions, scheduled status polling or auto-notification. Those mechanisms lack current approval and are not required for explicit DONE release. No new platform machinery accepted.

## Unresolved Approved-Behavior Or Current-State Gaps

**None blocking the current architecture decision.** Current scoped authority and target owners/contracts are concrete. Executable gaps are explicitly retained, not filled by inference: CRF-003/FAPI-005 source/UI correction, current business native/MCP/prompt/bootstrap contracts, full protected multi-root/provider/cascade/race/recovery/Stop/data joins and exact provider/native-host capabilities. RV-MP-009 optional vendor sessionStore remains unsupported/not configured; no new mode matrix. Non-blocking historic-paragraph hygiene is recorded above.

## Review Decision

**Pass — cumulative SR-014 is ready for dependent implementation corrections against Approved focused REQ-BL-008 / SD-AP-001 + scoped SD-AP-002.** Business-only Manager prompt, shared ordinary business projections and platform-only exact lifecycle authority align with the design principles. This is design readiness, **not current source/API/product acceptance**; CRF-003/FAPI-005 stays OPEN.

## Findings

**None — no new or remaining blocking architecture finding.**

- **API-UC-001:** current upstream responsibility correction resolved **in design**, scoped approval verified; business context preserved and unapproved broader REQ-BL-007 restrictions withdrawn. Not a retroactive source violation under old requirements.
- **CRF-003/FAPI-005:** existing OPEN **implementation-owned Local Fix**, retained verbatim in ownership/disposition. Current typed public mapping is actionable, but correction/source re-review/actual API UI proof has not happened here. No duplicate architecture finding or closure invented.
- **DI-001/002 and SD-DI-003:** design resolutions retained; previous no-migration correction and withdrawal of manufactured envelope need stand. Prior implementation/source/test scope closures are preserved only at their recorded stage.
- Minor superseded supplement/evidence-stage prose is non-blocking document hygiene, not missing current input/authority or an invented product concern.

## Classification

**N/A — Pass; no failure classification.** Preserve task_size=Large / architectural_risk=High and reviewed downstream gates.

## Recommended Recipient

Fresh post-result handoff rules select the sole current Pass primary `/software_engineering_team/implementation_engineer`; Fail/Blocked condition does not apply. Informational `/software_engineering_team/solution_designer` applies **only after primary success**. Current cumulative231-reference primary handoff confirmed **accepted=true / DELIVERED** to `implementation_engineer_1e43277cb7f1437abb3cb117c3a3eba2`. Only after that success, required informational Pass confirmed **accepted=true / DELIVERED** to `/software_engineering_team/solution_designer`, exact `solution_designer_4369c3e671e34a2dadd670c5b652afaa`. No duplicate Implementation/API forwarding or recipient polling.

## Residual Risks

- **CRF-003/FAPI-005 remains OPEN**: fix existing raw internal/public boundary, retain internal stamp/child and strict DTO, re-review source and independently verify actual snapshot/start event/GraphQL/sidebar/reconnect; inspect/test nested Team/member/further delegation and distinct Team/Org controls. A snapshot unit or contract rebuild alone is not source/UI acceptance. SR-015/E-056 acceptance witness also requires actual released resources and truthful existing stopped/non-active view after explicit DONE; an illustrative wait is not a production timer or proof of finished work.
- Implement business-only prompt and shared native/MCP read/mutation projections together. Preserve business context/assignment inspectability, concise truthful business/indeterminate errors, full internal cleanup proof/error/exact retry and bootstrap/default behavior. Do not delete platform proof tests or install a completion-awareness/report/self-DONE/polling protocol. Mutation DONE acknowledgement is not physical success.
- API-REV-003 remains **Fail /64.29%**, not rescored. Reported FAPI-001–004 execution resolutions and CRF-001/002 source closures retained; CRR-002 whole-package source Pass is historical at affected boundary. Overlapping selected suite counts are not whole-suite green; earlier broad non-green evidence remains not fully origin-certified.
- Actual Codex gpt-6.1-sol low/MCP saved-Task attachment work, sampled explicit DONE/repeat and completed-assignment last-Project Delete are bounded real substeps, not all-three-root/native+MCP/real-provider recursive owned forest acceptance. Missing requested AGY4.8 (3.8 available, not substituted) and native remote host remain exact API dependencies; authorized importer dependency was resolved in the API-owned cleaned instance. Reviewer accesses no credentials or apps.
- Prove provider-resource-zero when DONE wins reservation, private/rejecting/partial/late preparation retention, guarded actual seed acceptance, helper sibling hosting, lifetime-local reuse/protected borrowing, sender/recipient/deferred restore/approval/input fences, root Stop/quiet generation and exact failure/retry. Retained wrappers do not substitute for actual lower child/session/client/skill/MCP proof. Protect Manager/root/B/borrowed/shared provider services and durable work.
- Keep Directly Usable—No Migration: actual reported startup/no-write/faithful-array/ordinary first-write/last-Delete passes are bounded. Atomic DONE/closure, active-work Delete/reopen/restart, closed-generation no-wake and protected data joins remain. No envelope fallback/converter/replay/reset/version/new journal/global Stop/destructive cleanup; released migrations frozen and unchanged.
- Canonical design's short SR-011-era supplement/N/A paragraph and historic unperformed statements should be consolidated for clarity; current header/inventory/SR-014 gates/handoff and actual specialist reports control. This minor stale prose does not waive source/API work or require redesign.
- All cumulative dirty implementation/API edits preserved. Implementation self-check → independent source re-review → independent API/E2E; only later actual Large/High success can enter proportional durable-test review and Delivery docs/user verification/finalization/applicable release/cleanup. No deployment requested or reviewer executable certificate.

## Latest Authoritative Result

- Review Decision: **Pass**.
- Material-Premise Gate: **Pass** — supported role/work/explicit DONE/worker-view scenarios traced forward; no unsupported machinery introduced.
- Notes: **ARCH-REV-005 / SR-014 / focused REQ-BL-008**. Strong architecture alignment now: coherent spines, exact subject ownership, shared business/public projections, bounded internal lifecycle authority and no manufactured migration. Not an assertion that every historical revision or current implementation strongly complies. API-UC-001 design-resolved; CRF-003/FAPI-005 OPEN; API Fail64.29% and all residual gates retained. ARCH-REV-004 and earlier history apply only to their reviewed bases. Evidence-only SR-015/E-056 included without new architecture revision, timer/notifier or acceptance claim. Only reviewer artifacts written; this canonical report remains authoritative.
