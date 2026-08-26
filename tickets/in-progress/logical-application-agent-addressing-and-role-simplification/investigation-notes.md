# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: `Complete — Design-ready; SR-003 CRR-003 completion-lifecycle reconciliation`
- Investigation Goal: inventory public/internal/persisted target and role consumers, prove the clean current-schema transition, and reconcile the supported cold application-work completion failure exposed by API-REV-001 / CRR-003.
- Scope Classification: `Large`
- Scope Classification Rationale: versioned SDK contracts, URL transport, authorization/input/streaming, maintained applications, packages, persistence projection, and durable coverage are affected.
- Scope Summary: logical root/member public address; one private exact descriptor; role-field contraction; no migration; completion-coupled application-worker work with abort-before-failure lifecycle control deadlines.
- Questions Resolved: current selector redundancy, exact translator owner, downstream bypasses, role derivability, persisted data, package/test surface, live-worker timeout reachability, completion owner, nested bridge lifecycle, and bounded startup/stop disposition.

## Request Context

The user approved this as the separate second simplification ticket, emphasizing clear boundaries, simple data-flow spines, explicit dependencies, and removal of redundant attributes. The provider-composition and execution-scope tickets are now finalized on Personal and form a preserved source baseline rather than work to reopen here.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification/tickets/in-progress/logical-application-agent-addressing-and-role-simplification`
- Current Branch: `codex/logical-application-agent-addressing-and-role-simplification`
- Current Worktree: same as root
- Bootstrap Base Branch: exact current `origin/personal`.
- Remote Refresh Result: `origin/personal=4108786f4058ca83fd036df84666a2c846fd6401`; fetched and independently verified before refresh.
- Prior Ticket Source Basis: `0811503a6c547698e7b77e1064d98890101acc1b`; prior solution commit `d23f39d1b7eea49091d81ba9a4ee4f1745cda6ce`.
- Refresh Result: prior solution commit protected at `codex/logical-application-agent-addressing-and-role-simplification-pre-current-personal-refresh`; the one ticket-doc commit rebased onto current Personal as `9e0f16975f5fbe9fcb84c924b8c75b2d9ac88a1d` before SR-002 edits.
- Expected Base / Finalization Target: `origin/personal@4108786f4058ca83fd036df84666a2c846fd6401` / the dedicated ticket branch.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: target wire schema intentionally breaks cleanly; no aliases or version branches.

## Supplemental Task Artifact Inventory

| Artifact | Purpose | Captured | Core Support | IDs | Status | Approval | Follow-Up |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `logical-application-agent-addressing-contract.md` | normative contracts and data decision | public/private shapes, ownership, URL, projection | requirements/design | REQ-001–007 | Current | Approved | Architecture review |
| `logical-application-agent-addressing-transition-inventory.md` | exact change/proof map | packages/files/tests/generated outputs | design | all | Current | N/A | Architecture review |
| `current-personal-refresh-analysis.md` | exact current-base rebootstrap and source revalidation | boot result, spines, current-owner intersection, material premises, persistence, transition delta | all | all | Current | N/A | Architecture review |
| `application-worker-operation-completion-contract.md` | normative SR-003 internal completion contract | operation classes, owners, state machines, spines, allowed/forbidden dependencies, proof | requirements/design | REQ-008; AC-018 | Current | N/A; derived technical correction | Architecture re-review |
| upstream `future-architecture-simplification-review.md` | triggering evidence | six spines and candidate target | all | all | Read-only | N/A | None |

## Source Log

| Date | Type | Source / Command | Why | Findings | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-08-26 | Doc | design principles | canonical architecture rules | spine/ownership/structure/persistence rules | Applied |
| 2026-08-26 | Code | SDK binding/event/URL/address files | public shape | three-way kind duplicates binding; member uses run ID | Replace |
| 2026-08-26 | Code | authorization, host, stream source | translator flow | auth loads binding but input reloads and stream reinterprets address | Descriptor is sole output |
| 2026-08-26 | Code | binding launch/store/domain | role/persistence | all Team members assigned same role; JSON cast leaks extras; physical column NOT NULL | current projectors + constant column |
| 2026-08-26 | Code | Agent provisioning/metadata normalization and mixed member handle | producer persistence | Agent and Team contexts set role constants; run metadata persists context | project smaller producer |
| 2026-08-26 | Code | execution-event journal | pending event data | producer/binding stored as JSON; all needed smaller fields exist | current projectors |
| 2026-08-26 | Code | Brief/Socratic services/UI | real application use | Socratic manually maps `/tutor` to run ID; apps reverse-map producer to member | simplify target only |
| 2026-08-26 | Command | `rg` exact type/field/helper occurrences | close transition | 157 target-related occurrences in supported app/SDK/server/test surface | supplement |
| 2026-08-26 | Data | filesystem search for `applications/*/db/platform.sqlite` | representative deployed row | no local live platform database available | use repository representative fixtures + exact store semantics |
| 2026-08-26 | Git | fetch, ref verification, backup branch, one-commit rebase, merge-base check | reuse old ticket safely on current Personal | exact base `4108786f...`; old work preserved; no production edit | Recorded in refresh supplement |
| 2026-08-26 | Code | current scope contracts/kernel, provider builder/authority, general supervisor | revalidate surrounding ownership | finalized separate execution families and provider/session authority remain compatible | Preserve |
| 2026-08-26 | Code | current application run ownership and Studio stopped-run model-config owners/tests | inspect newly merged intersection | address/role fixtures change; active ownership and terminal-release behavior stay fixed | Add exact test rows |
| 2026-08-26 | Code | current authorization/host/stream/scope-contract trace | verify dependency direction | scope contract imports a complete orchestration descriptor merely for streaming | define scope-owned narrow resolved target |
| 2026-08-26 | Evidence | `evidence/solution/sr-002-current-personal-source-audit.log` | durable command/source correlation | current contract, spines, role producers, persistence, Socratic use, current tests captured | Handoff |
| 2026-08-26 | Runtime evidence | API-REV-001 Studio/standalone cold/restart JSON and logs | establish product reachability | three real cold/reentry mutations returned at ~30 seconds while accepted work later committed; warm repeat completed normally | CRR-003 trace |
| 2026-08-26 | Review/evidence | `code-review-report.md` CRR-003 and `evidence/code-review/crr-003-failure-origin-focused.log` | classify failure origin | two independent fixed live-correlation deadlines; all relevant sources blob-identical to reviewed Personal; not an addressing regression | Design Impact |
| 2026-08-26 | Code | application engine client/controller/launcher/worker entry/bridge/protocol/gateway/REST | trace full mutation and control spines | synchronous outward API; correlation clients own timers without commit/cancel authority; startup/stop callers already own worker unwind | completion contract |
| 2026-08-26 | Code | Socratic `lesson-runtime-service.ts`, Brief `brief-run-launch-service.ts`, GraphQL/frontend clients | inspect mutation sequencing and retry behavior | handlers await nested capability; app state may be written before capability returns; frontend awaits once and has no automatic retry protocol | do not add app-local workaround |
| 2026-08-26 | Code | `application-worker-supervisor.ts`, `json-line-frame-writer.ts`, engine state registry/tests | inspect close/deadline mechanics | supervisor can await SIGTERM/SIGKILL close; client close rejects pending; bridge lacks close/write-failure cleanup | exact transition/proof |
| 2026-08-26 | Evidence | `evidence/solution/sr-003-application-worker-completion-source-audit.log` | retain complete CRR/API/source/callsite/test trace | 1,449-line exact audit of the reachable failure and target owners | Architecture re-review |

## Relevant Existing Behavior And Production Paths

| Behavior | Kind | Trigger / Contract | Current Path | Outcome | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | send/subscribe with public target | SDK address -> IPC/URL -> authorization | binding/runtime/member validated | contracts/auth |
| BEH-002 | User | Socratic tutor session | `/tutor` -> binding lookup -> extract agentRunId -> member builder | correct tutor but manual physical projection | lesson model |
| BEH-003 | System | send input | authorize -> reload binding -> inspect old target -> scope command | accepted/rejected/not available; current scope/provider ownership is otherwise explicit | host service/current scope contracts |
| BEH-004 | System | open stream | URL/address -> lease descriptor -> complete authorization descriptor crosses into scope source -> source inspects address.kind | root/all or selected member events; creates a mixed-level type dependency | stream subscription/source/scope contracts |
| BEH-005 | Contract | binding/event/publication | launch/context -> members/producers with role constants | roles always derivable | launch/provisioning/member handle |
| BEH-006 | Operational | restart/recovery | JSON.parse cast summaries/producers/context | extra roles reappear; current data works | stores/metadata |
| BEH-007 | Contract | package/devkit maintained app build and synchronous cold application mutation | workspace contracts -> built/vendor copies -> app; UI -> REST -> host client -> worker -> host bridge -> execution -> response | one address contract is distributed; current independent 30-second timers can report failure before a later commit | packages/copies plus API-REV-001/CRR-003 |

## Product-Reachability Premises

| Premise | Classification | Independent Trigger | Forward Trace | Consequence |
| --- | --- | --- | --- | --- |
| MP-001: Application manually chooses stale/wrong Team run ID | `Reachable` | supported Socratic application code maps `/tutor` from binding members | logical role -> app-selected runId -> public target -> authorization/stream | unnecessary physical coupling and invalid-target risk |
| MP-002: Downstream interpretation can diverge | `Reachable` | supported input and stream contracts both authorize old address | authorization -> host reload or stream address branch -> scope | one exact translation output is required |
| MP-003: Existing JSON supersets restart | `Reachable` | current binding/journal/metadata writers and recovery readers | stored extra role -> current reader -> recovery/stopped-run/publication | current-schema projection must preserve retained meaning |
| MP-004: Dynamic task Agent is publicly addressable | `Not Reachable` for current product | no binding member or supported SDK selection surface | dynamic task agents stay RootTeamRun-local | do not add generic IDs/task routing |
| MP-005: Old JSON requires migration | `Not Reachable` as a migration premise | current old rows contain all retained fields | parse current fields and ignore extras | no migration needed |
| Root target is ambiguous | `Not Reachable` after authorization | bindingId independently identifies binding runtime subject | null root -> binding -> exact subject | no public kind needed |
| MP-006: live cold mutation exceeds internal 30-second correlation deadline and later commits | `Reachable` | supported Studio/standalone cold launch or same-data reentry followed by RequestHint/launch | UI -> synchronous GraphQL -> host client timeout; nested capability/worker continues -> durable transcript/artifact | false HTTP 500 and manual duplicate-work risk |
| MP-007: an async status/idempotency/cancellation protocol is required for this observed path | `Not Reachable` as a required design premise | current supported caller awaits one synchronous result and the observed worker/host transports remain alive | retain correlation until actual nested/outer completion | no new public protocol is needed; such a proposal is a Requirement Gap |
| MP-008: lifecycle deadlines may reject while worker continues | `Reachable` mechanically at current client, but preventable at the existing lifecycle owner | startup load or stop deadline | explicit control request -> deadline -> client close -> supervisor stop wait -> failure | preserve bounded lifecycle without ambiguous live worker |

## Design Health Assessment Evidence

- Change posture: behavior change/refactor.
- Root cause: shared structure looseness plus boundary/ownership issue for addressing; duplicated policy/coordination and missing completion invariant for the SR-003 live-worker timeout.
- Refactor: required for the clean address contract. For SR-003, a bounded transport/lifecycle refactor is required because increasing the timeout would preserve competing deadline ownership and false failure semantics.

| Evidence | Observation | Implication | Follow-Up |
| --- | --- | --- | --- |
| Address union | three kinds encode only root/member after binding lookup | collapse shape | Adopt |
| Auth + consumers | same selector interpreted multiple times | descriptor must be authoritative | Adopt |
| Team member/producer roles | constants/derivable | remove | Adopt |
| JSON stores | raw casts/spreads keep obsolete extras | add current-schema projectors | Adopt |
| Provider runtimeKind | distinct provider execution policy | exclude | Preserve |
| Two request timers | transport clients expire correlation but do not own cancellation/commit | move application-work completion authority to controller/real response; remove bridge timer | Adopt |
| Engine lifecycle | launcher/controller already close client and await supervisor on failure/stop | isolate explicit abort-before-failure deadline in one control-request owner | Adopt |
| Maintained apps | synchronous handlers await nested capability; no automatic retry/status protocol | keep schemas/business services unchanged | Preserve |

## Relevant Files / Components

| Component | Current Responsibility | Finding | Implication |
| --- | --- | --- | --- |
| SDK contracts | public address/binding/event | loose/redundant shapes | exact new schema |
| backend address builders | local binding checks | member helper takes physical ID | logical member helper |
| frontend validator/parser/connection | wire validation/equality | old union logic | exact root/member logic |
| authorization service | binding authority | correct owner; descriptor must own the authorized address/binding evidence while delegating exact runtime shape to scope contract | strengthen descriptor without leaking it into scope |
| orchestration host | input command | reloads/reinterprets | consume descriptor |
| stream runtime source | runtime event attach | inspects address again and receives a higher-level descriptor | consume only the scope-owned resolved execution target |
| application execution scope contracts | narrow outward capabilities | currently import the full authorization-service descriptor for streaming | own `ResolvedApplicationAgentExecutionTarget`; remove higher-layer import |
| run ownership / Studio model config | stopped-run mutation authority | current-Personal additions intersect only fixtures/projections | preserve active lock, recovery, terminal release, and no post-terminal dispatch |
| binding/event stores + metadata | persistence | raw casts allow old shape to remain authoritative | current-schema codecs |
| maintained apps | business target/artifact use | manual physical mapping, role copying | simplify/contract update |
| application engine controller/client | outward work dispatch and frame correlation | controller awaits work, but client independently expires it | completion-coupled application work |
| worker host bridge/entry | nested host capability correlation and worker teardown | second fixed timer; no bridge close/write-failure cleanup | retain until response/close; explicit close |
| engine launcher/supervisor | worker creation, definition load, failure unwind | bounded lifecycle is legitimate but must abort before timeout escapes | one control-request deadline owner |
| gateway/REST/frontends | synchronous application API | await one result; no async status/idempotency protocol | unchanged |

## Runtime / Probe Findings

Initial addressing investigation was static. API-REV-001 later supplied direct runtime proof: Studio RequestHint returned HTTP 500 after 30,070 ms while durable messages increased from 8 to 10; cold Brief and standalone Socratic restart showed the same 30-second failure/later-effect pattern, while a warmed Brief repeat returned 200 in 422 ms. CRR-003 correlated the failure to both fixed request timers and verified the relevant engine/bridge/app sources are blob-identical to Personal, so it is not IR-002 regression. No local live platform database was found during the earlier persistence audit; representative address-role row proof remains fixture plus restart based.

## External / Public Source Findings

None; contracts are repository-owned.

## Reproduction / Environment Setup

- Dedicated worktree refreshed so exact current Personal is its merge base.
- Prior ticket solution protected before the one-documentation-commit rebase; no production source was edited.
- Read-only source investigation used Git, `rg`, `sed`, `find`, and exact current-path inspection. Commands and selected output are retained in `evidence/solution/sr-002-current-personal-source-audit.log`.

## Findings From Code / Docs / Data / Logs

1. Binding identity is sufficient to discover Agent versus Team; only root versus member remains a caller choice.
2. Binding member address is canonical/stable and maps to the exact run ID; the application should express this logical intent.
3. Authorization is already on every send/stream path and owns liveness/application membership; strengthening it reduces, rather than adds, coordination.
4. Team member role carries no independent information. Producer role is derivable where an enclosing subject exists and unused by supported context-only consumers. Producer `agentRunId` remains necessary for event correlation.
5. A new producer memberAddress is not required: events include/bind to a binding whose member map remains authoritative, and adding it would expand persisted schemas unnecessarily.
6. Current-Personal provider/session composition, execution-scope lifecycle, application-run ownership, and stopped-run model configuration already have explicit owners. The target needs no new service, lifecycle, registry, or cross-family lookup.
7. The complete authorization descriptor is orchestration evidence, not an execution-scope contract. A scope-owned resolved execution target removes the current upward type dependency while preserving one authorization pass.
8. The application GraphQL/command/route surface is synchronous: gateway/controller/worker/application code returns the handler result, not an admission token. The worker bridge is a nested synchronous capability adapter.
9. Neither correlation transport owns cancellation, commit, or retry. Their independent timers are therefore misplaced policy and can delete the only response correlation while work remains live.
10. The proportionate existing-contract correction is to keep application work correlated until a real terminal transport event. A new async/idempotency/cancellation protocol would change product behavior and is not required by the reachable evidence.
11. Startup/stop are distinct lifecycle-control work. They may stay deadline-bounded only through one owner that terminates and awaits the worker before propagating timeout.
12. Brief/Socratic services must not be patched with local retries or larger timeouts; the invariant belongs at the shared engine/bridge boundary.

## Persisted Data Transition Evidence

- Stores: `__autobyteus_run_bindings.summary_json`, `__autobyteus_run_binding_members`, `__autobyteus_execution_event_journal.binding_json/producer_json`, Agent `run_metadata.json.applicationExecutionContext`.
- Current old shapes: binding members and producers include `runtimeKind`; all retained target/producer/binding fields are already present.
- Normal target: exact current-schema projectors reconstruct only recognized fields and ignore extras for every row, regardless of origin/version.
- Direct-use semantics: `Yes`; run IDs, member addresses, display names, binding/runtime subject, event identity, and execution context are preserved.
- Physical constraint: `runtime_kind TEXT NOT NULL`; retain column and write derived `AGENT_TEAM_MEMBER` constant.
- Address persistence: none found; Socratic target is computed in read response and held transiently in frontend.
- Migration benefit/cost: a rewrite removes bytes only, adds I/O/failure/rollback risk, and provides no runtime correctness benefit.
- Decision: `Directly Usable — No Migration`.

## Constraints / Dependencies / Compatibility Facts

- Clean contract replacement; old URLs/frames are rejected, not decoded.
- Binding physical IDs remain internal/public correlation data but no longer form target input.
- Current-schema projectors are not version adapters; they have one output schema and no version check.
- Generated/vendored copies must be regenerated, not hand-maintained as a second authority.
- Current `ApplicationExecutionScope` still exposes exactly seven capabilities; this ticket changes only the streaming capability's input value and does not add a capability.
- `ApplicationRunOwnershipService`, `StudioRunModelConfigService`, provider/model validators, Agent Tools MCP authorities, and general/application identity separation are preservation constraints.
- `ApplicationGraphqlRequest`, command/route contracts, JSON-RPC frame schema, maintained application mutation schemas, and application persisted data remain unchanged by SR-003.
- Application-work and nested capability requests have no deadline. Startup load and stop are the only deadline-bearing requests and must use abort-before-failure semantics.
- JSON-RPC IDs remain request-lifetime correlation only; no public idempotency or retry semantics are inferred from them.

## Open Unknowns / Risks

- Architecture review must validate the scope-owned resolved-target type and forbid the scope contract from importing the higher-level authorization service.
- Coverage investigation must enumerate all generated outputs and ensure old target literals are gone.
- A real worker/process failure can still surface a transport error; SR-003 does not invent an automatic retry promise. The current platform quiesce/drain and worker-close behavior remains authoritative. Any new cross-process exactly-once or user-visible indeterminate/reconciliation contract requires separate user approval.

## Notes For Architecture Reviewer

The key address boundary is `public logical address -> authorization -> complete orchestration descriptor -> descriptor.runtime -> execution-scope capability`; no consumer may use both the resolved result and a second address/binding interpretation. The scope owns the narrow resolved-target value but never the authorization lookup. The smaller producer intentionally does not add memberAddress. The persisted-data decision depends on explicit current-schema projection and unchanged physical schema, not on a TypeScript cast or compatibility branch. SR-003 adds one orthogonal but requirement-grounded completion spine: `synchronous application request -> retained host correlation -> worker handler -> retained nested capability correlation -> real execution acceptance -> exact responses`. Application-work transports own correlation, the controller owns completion semantics, and a new control-request concern owns only startup/stop abort-before-failure deadlines. No public async/idempotency/cancellation contract is added. ARCH-REV-002 remains the passed address-design baseline; the reviewer must now judge the bounded CRR-003 reconciliation.
