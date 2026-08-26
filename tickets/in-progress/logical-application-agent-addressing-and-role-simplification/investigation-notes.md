# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: `Complete — Design-ready; SR-002 current-Personal refresh`
- Investigation Goal: inventory public/internal/persisted target and role consumers and prove the clean current-schema transition.
- Scope Classification: `Large`
- Scope Classification Rationale: versioned SDK contracts, URL transport, authorization/input/streaming, maintained applications, packages, persistence projection, and durable coverage are affected.
- Scope Summary: logical root/member public address; one private exact descriptor; role-field contraction; no migration.
- Questions Resolved: current selector redundancy, exact translator owner, downstream bypasses, role derivability, persisted data, package/test surface.

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

## Relevant Existing Behavior And Production Paths

| Behavior | Kind | Trigger / Contract | Current Path | Outcome | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | send/subscribe with public target | SDK address -> IPC/URL -> authorization | binding/runtime/member validated | contracts/auth |
| BEH-002 | User | Socratic tutor session | `/tutor` -> binding lookup -> extract agentRunId -> member builder | correct tutor but manual physical projection | lesson model |
| BEH-003 | System | send input | authorize -> reload binding -> inspect old target -> scope command | accepted/rejected/not available; current scope/provider ownership is otherwise explicit | host service/current scope contracts |
| BEH-004 | System | open stream | URL/address -> lease descriptor -> complete authorization descriptor crosses into scope source -> source inspects address.kind | root/all or selected member events; creates a mixed-level type dependency | stream subscription/source/scope contracts |
| BEH-005 | Contract | binding/event/publication | launch/context -> members/producers with role constants | roles always derivable | launch/provisioning/member handle |
| BEH-006 | Operational | restart/recovery | JSON.parse cast summaries/producers/context | extra roles reappear; current data works | stores/metadata |
| BEH-007 | Contract | package/devkit maintained app build | workspace contracts -> built/vendor copies -> app | one contract currently distributed | packages/copies |

## Product-Reachability Premises

| Premise | Classification | Independent Trigger | Forward Trace | Consequence |
| --- | --- | --- | --- | --- |
| MP-001: Application manually chooses stale/wrong Team run ID | `Reachable` | supported Socratic application code maps `/tutor` from binding members | logical role -> app-selected runId -> public target -> authorization/stream | unnecessary physical coupling and invalid-target risk |
| MP-002: Downstream interpretation can diverge | `Reachable` | supported input and stream contracts both authorize old address | authorization -> host reload or stream address branch -> scope | one exact translation output is required |
| MP-003: Existing JSON supersets restart | `Reachable` | current binding/journal/metadata writers and recovery readers | stored extra role -> current reader -> recovery/stopped-run/publication | current-schema projection must preserve retained meaning |
| MP-004: Dynamic task Agent is publicly addressable | `Not Reachable` for current product | no binding member or supported SDK selection surface | dynamic task agents stay RootTeamRun-local | do not add generic IDs/task routing |
| MP-005: Old JSON requires migration | `Not Reachable` as a migration premise | current old rows contain all retained fields | parse current fields and ignore extras | no migration needed |
| Root target is ambiguous | `Not Reachable` after authorization | bindingId independently identifies binding runtime subject | null root -> binding -> exact subject | no public kind needed |

## Design Health Assessment Evidence

- Change posture: behavior change/refactor.
- Root cause: shared structure looseness plus boundary/ownership issue.
- Refactor: required for clean contract; local field deletion alone would keep reinterpretation and bypasses.

| Evidence | Observation | Implication | Follow-Up |
| --- | --- | --- | --- |
| Address union | three kinds encode only root/member after binding lookup | collapse shape | Adopt |
| Auth + consumers | same selector interpreted multiple times | descriptor must be authoritative | Adopt |
| Team member/producer roles | constants/derivable | remove | Adopt |
| JSON stores | raw casts/spreads keep obsolete extras | add current-schema projectors | Adopt |
| Provider runtimeKind | distinct provider execution policy | exclude | Preserve |

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

## Runtime / Probe Findings

Static trace was sufficient. No local live platform database was found under repository or common application-support roots. Representative row proof must therefore use the repository's real SQLite store schema plus fixture rows shaped exactly like current writers; downstream API/E2E should additionally verify restart with written current data.

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

## Open Unknowns / Risks

- Architecture review must validate the scope-owned resolved-target type and forbid the scope contract from importing the higher-level authorization service.
- Coverage investigation must enumerate all generated outputs and ensure old target literals are gone.

## Notes For Architecture Reviewer

The key boundary is `public logical address -> authorization -> complete orchestration descriptor -> descriptor.runtime -> execution-scope capability`; no consumer may use both the resolved result and a second address/binding interpretation. The scope owns the narrow resolved-target value but never the authorization lookup. The smaller producer intentionally does not add memberAddress. The persisted-data decision depends on explicit current-schema projection and unchanged physical schema, not on a TypeScript cast or compatibility branch. The prior `ARCH-REV-001 Pass` reviewed the old source basis; it is historical evidence only and SR-002 requires a fresh current-base decision.
