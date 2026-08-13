# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-spec.md`
- Supplemental Task Artifacts Reviewed: `agent-team-addressing-handoff-contract.md`; `agent-team-collaboration-system-instruction.md`; `team-run-canonical-identity-refactor.md`; `team-stream-execution-projection-contract.md`; `agent-segment-lifecycle-contract.md`; `agent-run-input-admission-contract.md`; `claude-agent-sdk-upgrade-contract.md`; `nested-classroom-live-validation-contract.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/solution-revision-record.md`
- Relevant Solution Revision IDs: cumulative `SR-001`–`SR-028`; current authority `SR-028`; `SR-025` remains an exact-copy clarification only, SR-026 remains the accepted common AgentRun input owner, and SR-027's dependency/capability cut is preserved
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-021`
- Current Review Round: `21`
- Trigger: complete cumulative SR-028 architecture re-review after ARCH-REV-020 returned `DR-013` / `DR-014` against the Claude one-string-query interrupt spine and current-authority navigation.
- Prior Review Round Reviewed: `ARCH-REV-020` / `Fail`
- Latest Authoritative Round: `21`
- Current-State Evidence Basis: current requirements, investigation, design, all eight supplements, solution/review lineage, `CRR-086`, API-REV-039's real Claude task-peer failure analysis/trace, the installed `@anthropic-ai/claude-agent-sdk@0.3.231` package metadata and public `sdk.d.ts`, the official upstream changelog, npm registry metadata, exact workspace manifests/lockfile, and direct inspection of the current Claude SDK client/session/MCP materializer plus the complete previously accepted cumulative production paths. The installed graph independently confirms Agent SDK `0.3.231`, Anthropic SDK `0.116.0`, MCP SDK `1.30.0`, Zod `4.3.6`, Claude Code parity `2.1.231`, the public `priority`/`streamInput` shapes without an exact active-turn selector, the `alwaysLoad` first-turn effect, and `Options.abortController`. Current source confirms the supported one-string query is interrupted by `AbortController.abort()`, exact execution settlement, registered-query/reference cleanup, active-state clear, and canonical interruption; `Query.interrupt()` belongs to the excluded streaming-control surface. The exact pins, peers, one lock resolution, root imports, ID continuity, supplement links/status, and 97-ahead/0-behind branch relationship to `origin/personal@54890a07f74e941a7a12b6daaa26364f4c927b72` were rechecked. Existing dirty SR-026 source/tests and downstream evidence were treated as protected state, not as proof that SR-028 is implemented.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`. SR-028 preserves the approved dependency/capability intent, the accepted AgentRun owner, the exact supported one-string-query interrupt, and coherent current-authority navigation.
- Approved requirements / intended behavior understood: `Yes`. The user approved the exact current mutually compatible packages while preserving the SR-026 AgentRun FIFO, Claude next-turn-only mechanics, one-string `query()`/resume/full-env/configured executable, canonical interrupt/output/tool meaning, and turn-1 intrinsic Team tools. No provider queue, exact-append fiction, compatibility branch, or data migration is approved.
- Relevant existing behavior and evidence confirmed: `Yes`. The latest public input type has `priority` but no exact active-turn ID; the solution's isolated probe records `now` as interruption and `next` as later queueing. The current product's supported interrupt path passes an `AbortController` in query options and calls `abort()` from `ClaudeSession`, then waits for settlement and emits canonical interruption. `Query.interrupt()` is an SDK control request documented in the installed type under the streaming-input/output control section and is not the current session mechanism. The latest SDK also backgrounds MCP connection unless the required descriptor uses `alwaysLoad:true`.
- Approved change, preserved behavior, and outside scope understood: `Yes`. Exact dependency pins and intrinsic-only `alwaysLoad:true` are bounded and coherent. AgentRun remains the only acceptance/FIFO/next-turn owner; provider streaming input, priority scheduling, SDK queue lifecycle, V2 compatibility, application/data migration, bundled-versus-external executable policy, and unrelated new SDK features remain outside scope.
- Remaining material ambiguity, if any: None. The explicit product interrupt has one owner and one mechanism; unrelated SDK streaming controls cannot act as a second path or fallback.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | Authored handoffs and immutable snapshot | Pass | Pass | Pass | Confirmed | None. |
| `BEH-002` | Public message recipient address | Pass | Pass | Pass | Confirmed | None. |
| `BEH-003` | Rooted/upward/cross-branch message reachability | Pass | Pass | Pass | Confirmed | None. |
| `BEH-004` | One rooted TeamRun aggregate | Pass | Pass | Pass | Confirmed | None. |
| `BEH-005` | Intrinsic sender-bound handoff guidance | Pass | Pass | Pass | Confirmed | None. |
| `BEH-006` | Provider-neutral collaboration instruction | Pass | Pass | Pass | Confirmed | None. |
| `BEH-007` | Preserved exact AgentRun message selector | Pass | Pass | Pass | Confirmed | None. |
| `BEH-008` | Self-contained v3 TeamRun restore | Pass | Pass | Pass | Confirmed | None. |
| `BEH-009` | AutoByteus/Codex/Claude tool parity | Pass | Pass | Pass | Confirmed | None. |
| `BEH-010` | Root-coordinator default entry | Pass | Pass | Pass | Confirmed | None. |
| `BEH-011` | Shared task recipient address plus direct-target policy | Pass | Pass | Pass | Confirmed | None. |
| `BEH-012` | Address-only shared collaboration boundary | Pass | Pass | Pass | Confirmed | None. |
| `BEH-013` | Tight rooted TeamRun node model and derived indexes | Pass | Pass | Pass | Confirmed | None. |
| `BEH-014` | Correlated Team events, one status model, strict wire, one browser execution owner | Pass | Pass | Pass | Confirmed | None. |
| `BEH-015` | Released-data and atomic token transition | Pass | Pass | Pass | Confirmed | None. |
| `BEH-016` | Canonical APIs/frontend and forward-only V5 application cut | Pass | Pass | Pass | Confirmed | None. |
| `BEH-017` | Physical storage lineage encapsulation | Pass | Pass | Pass | Confirmed | None. |
| `BEH-018` | Imported no-skip three-runtime live validation | Pass | Pass | Pass | Confirmed | None. |
| `BEH-019` | Exact-turn provider admission and one canonical segment fan-out | Pass | Pass | Pass | Confirmed | None. SR-024 limits production admission to the four verified current segment-producing names and preserves every other current route without a second registry. |
| `BEH-020` | One AgentRun input-admission and active-turn policy owner | Pass | Pass | Pass | Confirmed | None. The supported task-peer trigger reaches the exact live run; AgentRun owns acceptance/FIFO/start-append-wait/settlement, providers translate mechanics only, and result/event projection remains operation-owned. |
| `BEH-021` | Exact latest compatible Claude dependency and capability cut | Pass | Pass | Pass | Confirmed | None. Exact pins, Claude next-turn-only classification, one-string query/resume/env/executable behavior, intrinsic-only `alwaysLoad:true`, and AbortController-owned interruption are coherent. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `agent-team-addressing-handoff-contract.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `agent-team-collaboration-system-instruction.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `team-run-canonical-identity-refactor.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `team-stream-execution-projection-contract.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `agent-segment-lifecycle-contract.md` | Pass | Pass | Pass | Pass | Pass | None. It now owns only the exact four-family production policy; the rejected registry/open class/synthetic proof are explicit removals. |
| `agent-run-input-admission-contract.md` | Pass | Pass | Pass | Pass | Pass | None. Acceptance timing, FIFO/claim/result/terminal ordering, provider capability split, command observation, interruption/termination, caller/file/removal inventory, and no-persistence decision are explicit. |
| `claude-agent-sdk-upgrade-contract.md` | Pass | Pass | Pass | Pass | Pass | None. `CLAUDE-SDK-004`, file/removal mapping, and proof all preserve the exact AbortController/settlement/cleanup/canonical-event path and exclude streaming controls. |
| `nested-classroom-live-validation-contract.md` | Pass | Pass | Pass | Pass | Pass | None. R-058/AC-053 metadata and the exact no-skip Claude interrupt assertion are aligned. |

The investigation inventory, requirements inventory, design authority table, supplement metadata, and solution revision title/synopsis/index are aligned to SR-028. Historical SR-027 ready-result wording remains only inside its revision entry and does not compete with current authority.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The package classifies the cumulative refactor, provider-output and provider-input boundary defects, persisted transitions, forward-only application state, and downstream validation. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | CR-F-048 is correctly classified as a boundary/ownership plus duplicated-policy defect: current AgentRun, three providers, and the command registry choose different active-input behavior. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The run-local input refactor is required now; durable inbox/recovery and API/E2E-owned CR-F-043 remain explicitly outside/deferred. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | DS-001–DS-019, eight supplements, actual current caller/provider evidence, file/removal maps, input and Claude case spines, state/ordering rules, and no-skip downstream sequence make the cumulative target actionable. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001`–`DS-003` | Root launch, child materialization, restore | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004`–`DS-006` | Shared recipient resolution, message, Agent/Team task delegation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007`, `DS-014A`–`DS-016B` | Correlated Team wire, status, frontend execution, application producer binding | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-008` | History/memory/storage projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-009A`–`DS-009D`, `DS-013A`–`DS-013D` | TeamRun/task/token transition and startup gate | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-010` | Completion-time handoff guidance | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-011` | Three-runtime live validation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-012A`–`DS-012D` | Forward-only V5 project application cut | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-017A`–`DS-017G` | Provider admission, run lifecycle, fan-out, diagnostics | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-018A`–`DS-018I`, `INP-R1`–`INP-R2` | AgentRun input acceptance, FIFO, provider dispatch, command observation, interrupt/termination/restore, and result/lifecycle return paths | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-019A`–`DS-019H` | Exact dependency cut, Claude start/wait/interrupt/resume, turn-1 MCP, event/tool projection, verification | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

The complete primary path remains readable: browser/external/Team/application/compaction/skill caller -> exact `AgentRun.postUserMessage()` -> run-local admission/FIFO -> canonical turn choice -> explicit backend dispatch -> provider events -> internal entry settlement and operation-owned result/event projection. SR-028's install, start, wait, interrupt, resume, MCP, output/tool, and verification spines preserve that owner. DS-019D now follows the supported explicit interrupt -> AgentRun owner -> ClaudeSession approval flush -> `Options.abortController.abort()` -> exact execution settlement and registered-query/reference cleanup -> active-state clear -> canonical `TURN_INTERRUPTED` -> AgentRun terminal/drain path. No streaming control or fallback competes with it.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Rooted TeamRun aggregate and `TeamRunTreeIndex` | Pass | Pass | Pass | Pass | One immutable rooted topology, derived private indexes, no localized child copy. |
| `TeamRecipientResolver` and operation owners | Pass | Pass | Pass | Pass | Shared address result contains no runtime/config/handle state. |
| `TeamExecutionState` | Pass | Pass | Pass | Pass | Private indexes/transitions; typed immutable consumer views. |
| Team event/status/stream contract | Pass | Pass | Pass | Pass | One domain status model and one strict wire mapping. |
| Codex four-family exact-turn admission | Pass | Pass | Pass | Pass | The thread owns membership and first invocation; the opaque thread-emitted value closes downstream bypass. |
| AgentRun segment lifecycle | Pass | Pass | Pass | Pass | One run-owned state behind the queue and before all processors/listeners. |
| AgentRun input admission | Pass | Pass | Pass | Pass | `postUserMessage()` is the only public facade; private FIFO/claims/entry lifecycle stay inside AgentRun, while providers and callers cannot choose policy or retry. |
| Claude dependency/client/session/MCP boundary | Pass | Pass | Pass | Pass | Exact pins and intrinsic MCP ownership are bounded; `ClaudeSession` alone translates AbortController interruption and no streaming-control fallback crosses the boundary. |
| Migration/startup gate | Pass | Pass | Pass | Pass | Historical schema knowledge stays isolated. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Definitions -> compiler -> rooted TeamRun -> runtime | Pass | Pass | Pass | Pass | No definition reread or topology recompilation on restore. |
| Caller -> recipient resolver -> message/task operation | Pass | Pass | Pass | Pass | No flat roster or config/handle leak. |
| Provider source -> first provider gate -> AgentRun lifecycle -> consumers | Pass | Pass | Pass | Pass | No converter-local policy, broad-prefix construction, generic raw bypass, or parallel consumer lifecycle. |
| AgentRun lifecycle -> canonical processors/listeners | Pass | Pass | Pass | Pass | Consumers cannot read lifecycle state or reconstruct source facts. |
| Ordinary caller -> AgentRun input admission -> explicit backend mechanics | Pass | Pass | Pass | Pass | Callers stop at AgentRun; AgentRun alone selects start/append/wait; backends cannot queue, inspect active state for policy, fall back, retry, or construct public acceptance. |
| AgentRun interrupt -> Claude session -> current one-string query | Pass | Pass | Pass | Pass | AgentRun owns interruption/FIFO semantics; ClaudeSession owns the exact AbortController/settlement/cleanup mechanics; streaming input, receipts, priority, and fallbacks are forbidden. |
| Domain Team event -> strict mapper -> browser aggregate | Pass | Pass | Pass | Pass | No generic Team message or raw-key bypass. |
| Migration owners -> target-only repositories | Pass | Pass | Pass | Pass | No normal-runtime historical decoder or application compatibility path. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `RecipientAddressExpression` / `ResolvedTeamRecipient` | Pass | Pass | Pass | Low | Pass |
| `TeamExecutionAddress` | Pass | Pass | Pass | Low | Pass |
| `createTeamAgentExecutionBinding` / `TeamAgentStatusSnapshot` | Pass | Pass | Pass | Low | Pass |
| Correlated Team event union / strict Team stream DTOs | Pass | Pass | Pass | Low | Pass |
| `AgentSegmentSourceEvent` / canonical segment event | Pass | Pass | Pass | Low | Pass |
| Exact four-name set / `resolveCodexSegmentTurnAdmission` | Pass | Pass | Pass | Low | Pass |
| `CodexThreadEventMessage` | Pass | Pass | Pass | Low | Pass |
| `AgentRun.postUserMessage(message,{lifecycleObserver?})` | Pass | Pass | Pass | Low | Pass |
| `AgentRunBackend.inputCapabilities` / `dispatchInput` | Pass | Pass | Pass | Low | Pass |
| `AgentRunInputLifecycleObserver` | Pass | Pass | Pass | Low | Pass |
| Claude `query(prompt:string,{abortController,...})` / session interrupt / intrinsic MCP descriptor | Pass | Pass | Pass | Low | Pass |
| `TokenUsageCanonicalIdentityMigrationStore.applyCanonicalTeamIdentityTransaction` | Pass | Pass | Pass | Low | Pass |

The retained `CODEX_SEGMENT_TURN_OMISSION_UNLISTED` value is a local pure-function precondition/misuse result. It is not a production applicability branch, provider lifecycle state, downstream error, compatibility policy, or synthetic provider proof and therefore does not make MP-013 authoritative.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Serialized segment correlation | Pass | Pass | Pass | Pass | Reuses `AgentRunEventDispatchQueue` and first transformer. |
| Team WebSocket contract | Pass | Pass | Pass | Pass | Small transport-only shared package removes duplicate schemas. |
| Recipient resolution | Pass | Pass | Pass | Pass | Canonical address parser/index replace roster lookup. |
| Persisted transition | Pass | Pass | N/A | Pass | App-data migration framework is reused with isolated historical owners. |
| Frontend execution ownership | Pass | Pass | Pass | Pass | One aggregate replaces distributed mutation. |
| Codex native notification and raw debug facilities | Pass | Pass | N/A | Pass | Pending-MCP coordination and admitted-only raw capture remain behind the exact first boundary. |
| Ordinary input sequencing and active-turn choice | Pass | Pass | Pass | Pass | Reuses the existing `AgentRun.postUserMessage()`, `AgentTurnLifecycleState`, and `AgentRunEventDispatchQueue`; one small run-local state replaces provider/command coordination rather than adding a top-level service. |
| Claude one-string query interruption and first-turn intrinsic MCP | Pass | Pass | N/A | Pass | Intrinsic `alwaysLoad:true` reuses the exact materializer; interruption reuses the established AbortController/session path without adopting streaming control. |
| Future/unknown Codex item policy | Pass | Pass | N/A | Pass | No support subsystem is created; later provider evolution requires a concrete contract. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| AgentTeam definition/execution | Pass | Pass | Pass | Pass | Compiler, snapshot, index, and runtime context are separated. |
| Collaboration/task delegation | Pass | Pass | Pass | Pass | Shared recipient resolution; operation-specific delivery/eligibility. |
| Agent execution/provider backends | Pass | Pass | Pass | Pass | Exact provider facts and first-boundary admission feed one common run lifecycle. |
| Agent execution/input admission | Pass | Pass | Pass | Pass | AgentRun owns input acceptance/FIFO/turn association; backends translate one explicit command and internal callers observe entry facts only. |
| Claude dependency/client/session/MCP adaptation | Pass | Pass | Pass | Pass | Exact package/client/session/MCP responsibilities support the AgentRun owner without a second provider queue or interrupt policy. |
| Team stream/frontend | Pass | Pass | Pass | Pass | Exact domain/transport/projection owners. |
| Migration/token/storage | Pass | Pass | Pass | Pass | One canonical migration and one transaction-owning store. |
| Application SDK/build | Pass | Pass | Pass | Pass | Forward-only V5 with no predecessor machinery. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Canonical logical and concrete execution addresses | Pass | Pass | Pass | Pass | One serializer/parser per subject. |
| Team Agent binding/status snapshot | Pass | Pass | Pass | Pass | Shared by live, initial, overlay, and history producers. |
| Team wire DTO/schema | Pass | Pass | Pass | Pass | Transport-only mirror with exhaustive mapping. |
| Segment finite type/source/canonical values | Pass | Pass | Pass | Pass | Server domain owns semantics. |
| Codex four-name turn-admission value/predicate | Pass | Pass | Pass | Pass | One provider-owned set governs both production applicability and omission inheritance; no second registry remains. |
| Backend input capability/dispatch and entry lifecycle values | Pass | Pass | Pass | Pass | Narrow run-owned contracts serve three backends plus command/completion observers without exposing FIFO entries or creating a public result DTO. |
| Exact Claude/Anthropic/MCP dependency graph and intrinsic MCP descriptor | Pass | Pass | Pass | Pass | One exact compatible graph and one server-owned required descriptor avoid package/version or loading-policy duplication. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentTeamAddress` / recipient expression | Pass | Pass | Pass | Pass | Pass | Expression and canonical address are distinct. |
| Rooted TeamRun node union | Pass | Pass | Pass | Pass | Pass | Kind-specific IDs/coordinator remain genuine facts. |
| `TeamExecutionAddress` | Pass | Pass | Pass | Pass | Pass | Logical placement and concrete execution stay distinct. |
| Team event/status/wire model | Pass | Pass | Pass | Pass | Pass | One status meaning across event/non-event projections. |
| `AgentRunErrorEvidence` | Pass | Pass | Pass | Pass | Pass | Three real variants only; one downstream non-terminal diagnostic. |
| Segment source/canonical model | Pass | Pass | Pass | Pass | Pass | Start owns type; run owner enriches content; end stays minimal. |
| `CodexSegmentTurnAdmission` | Pass | Pass | Pass | Pass | Pass | Exact provider subject, immutable admitted value, no open event class. |
| `AgentRunBackendInputCapabilities` / `AgentRunBackendInputDispatch` | Pass | Pass | Pass | Pass | Pass | Capability says mechanics only; discriminated dispatch carries exactly start or exact-turn append. |
| `AgentRunInputLifecycle` | Pass | Pass | Pass | Pass | Pass | One entry-bound in-process lifecycle distinguishes admitted, forwarded, associated, and terminal outcomes without public/persisted identity. |
| Claude backend capability / query options / interrupt translation | Pass | Pass | Pass | Pass | Pass | Capability remains next-turn-only; one-string query options and AbortController interruption have one meaning and no overlapping product representation. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| TeamRun/compiler/index/runtime files | Pass | Pass | Pass | Pass | One rooted aggregate and derived indexes. |
| Recipient/parser/resolver and operation adapters | Pass | Pass | Pass | Pass | Shared placement stays operation-neutral. |
| Team event/status/projector/contract/frontend files | Pass | Pass | Pass | Pass | Exact producer-to-browser mapping. |
| `agent-segment-lifecycle-state.ts` / first transformer | Pass | Pass | Pass | Pass | State and transformer roles are exact. |
| AutoByteus/Claude converter/projector files | Pass | Pass | Pass | Pass | Required turns and minimal lifecycle facts assigned. |
| `codex/thread/codex-segment-turn-admission.ts` | Pass | Pass | Pass | Pass | Exact four-name applicability/inheritance, all-field equality, and immutable result only. |
| `codex-thread.ts` / notification handler / backend listener / converter | Pass | Pass | Pass | Pass | First-boundary branded-message cut and valid MCP ordering are explicit. |
| Codex debug/raw sink files | Pass | Pass | Pass | Pass | Sanitized rejection and admitted-only raw capture are separated. |
| Post-pipeline consumer files | Pass | Pass | Pass | Pass | Complete canonical-input/removal behavior assigned. |
| `agent-execution/input/agent-run-input-contract.ts` / `agent-run-input-admission-state.ts` | Pass | Pass | Pass | Pass | Shared narrow values and private state are separated under the AgentRun capability area. |
| `agent-run.ts` / event queue / turn lifecycle seam | Pass | Pass | Pass | Pass | Public admission, serialized selection/result/terminal ordering, and provider-I/O exclusion are assigned to the actual governing owner. |
| Backend adapters plus command/memory/completion/mixed-handle consumers | Pass | Pass | Pass | Pass | Mechanics, entry observation, trace timing, and activation-only overlays are assigned without a second policy owner. |
| `autobyteus-server-ts/package.json`, `autobyteus-ts/package.json`, `pnpm-lock.yaml` | Pass | Pass | N/A | Pass | Exact pins/peer graph and one lock resolution are actionable. |
| `claude-sdk-client.ts` / `claude-session.ts` / focused interruption tests | Pass | Pass | Pass | Pass | The map preserves complete query options, AbortController abort, exact settlement/reference cleanup, active-state clear, canonical interruption, and negative proof against `Query.interrupt()`/receipts. |
| `claude-agent-tools-mcp-materializer.ts` | Pass | Pass | N/A | Pass | Only the server-owned intrinsic HTTP MCP entry receives `alwaysLoad:true`. |
| Migration/transaction/schema files | Pass | Pass | Pass | Pass | Historical decoding, planning, transaction, verification, and gate are separated. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| AgentTeam domain/execution/collaboration | Pass | Pass | Low | Pass | Ownership-led placement. |
| Agent execution segment lifecycle | Pass | Pass | Low | Pass | State remains per AgentRun. |
| Agent execution input admission | Pass | Pass | Low | Pass | A focused `agent-execution/input/` capability groups narrow types/state while `AgentRun` remains the owner/facade. |
| Provider-local exact-turn admission | Pass | Pass | Low | Pass | Pure policy stays under the Codex thread/provider owner. |
| Claude runtime client/session and intrinsic MCP materializer | Pass | Pass | Low | Pass | Physical placement and the corrected interrupt/MCP responsibility split are coherent. |
| Team stream contracts/server/browser | Pass | Pass | Low | Pass | Transport package remains domain-free. |
| Migration/application/storage | Pass | Pass | Low | Pass | Historical/current concerns are separated. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Flat roster, representatives, localized child copies, route/path duplicates | Pass | Pass | Pass | Pass | Exact removal inventory exists. |
| Synthetic task instances and duplicated task/token identity | Pass | Pass | Pass | Pass | Task ID/execution address and token transaction replace them. |
| Generic Team messages, legacy status snapshots, browser reconstruction | Pass | Pass | Pass | Pass | Exact owners replace them. |
| Segment aliases/defaults/end-type/end-text/consumer lifecycle state | Pass | Pass | Pass | Pass | Complete consumer cut is explicit. |
| `RUNTIME_DIAGNOSTIC` and runtime/diagnostic transport/browser path | Pass | Pass | Pass | Pass | The unreachable fourth variant remains removed. |
| Converter-local admission, generic raw input, rejected-candidate raw capture | Pass | Pass | Pass | Pass | First-boundary ownership closes these bypasses. |
| Nine-name runtime exemption registry, open unknown-item branch, synthetic future cases | Pass | N/A | Pass | Pass | SR-024 names and removes them; established current non-segment paths remain operation-owned. |
| Provider-owned input selection/tails/queues and command busy/raw-event association | Pass | Pass | Pass | Pass | AgentRun input admission replaces Codex `inputSubmissionTail`, Claude active rejection, reliance on AutoByteus queue policy, `RUN_COMMAND_IN_PROGRESS`, singular in-flight assumptions, and raw-event association. |
| Old Claude/Anthropic/MCP versions and any SDK streaming-input/priority queue owner | Pass | Pass | Pass | Pass | Exact old resolutions and second provider queue policy are explicitly removed/forbidden. |
| Caller-owned active-run initializing/error and collaboration retry/fallback | Pass | Pass | Pass | Pass | Activation-only status remains; already-active input gets no caller overlay, alternate route, retry, or duplicate Team publication. |
| Application migration/V4 compatibility | Pass | Pass | Pass | Pass | Direct V5 rebuild only. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Runtime logical/execution identity | No | Pass | Pass | Current readers accept canonical values only. |
| Team collaboration/task tools | No | Pass | Pass | No aliases or flat selectors. |
| Segment/error/wire/browser contract | No | Pass | Pass | One current source/canonical contract and three evidence variants. |
| AgentRun input acceptance/provider dispatch | No | Pass | Pass | One current AgentRun queue and explicit backend command; no provider/caller compatibility path, queue, fallback, or dual acceptance meaning. |
| Claude SDK dependency and provider mechanics | No | Pass | Pass | Exact current pins only; no V2/old-version adapter, stream-input queue, priority mapping, or executable-selection fallback. |
| Application V5 | No | Pass | Pass | Unsupported predecessor state is rebuilt. |
| Released persisted data | No runtime compatibility | Pass | Pass | Historical knowledge is migration-local. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| TeamRun/history/communication/task/external structured data | `Migration Required` | Pass | Pass | Pass | Pass | One pending owner, validation, backup/atomic write, exact-success gate, retry/idempotence. |
| Token rows/schema/index | `Migration Required` | Pass | Pass | Pass | Pass | Complete preflight then one verified row+DDL transaction. |
| Project-owned application databases/artifacts | `Discard or Rebuild` | Pass | Pass | N/A | Pass | No supported predecessor cohort. |
| Derived indexes/caches | `Discard or Rebuild` | Pass | Pass | N/A | Pass | Rebuilt from canonical state. |
| Agent memory/context paths | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Physical bytes/locations preserved. |
| Agent segment lifecycle | `Not Affected` | Pass | Pass | N/A | Pass | State is non-persisted. |
| AgentRun input FIFO/sequence/observers | `Not Affected` | Pass | Pass | N/A | Pass | Live-process state begins empty on restore and adds no inbox, history, task, TeamRun, application, or frontend field. |
| Claude dependency/configuration cut | `Not Affected` | Pass | Pass | N/A | Pass | Manifest/lock/runtime option/MCP descriptor changes create no persisted subject or migration obligation. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Rooted identity, migration, repositories, API/frontend cut | Pass | Pass | Pass | Pass |
| Team domain/status/wire/frontend aggregate cut | Pass | Pass | Pass | Pass |
| Exact four-family Codex first-boundary admission -> handler -> converter | Pass | Pass | Pass | Pass |
| AgentRun lifecycle -> complete consumer cut | Pass | Pass | Pass | Pass |
| AgentRun input contract -> run-local state -> backend/command/caller cut | Pass | Pass | Pass | Pass |
| Exact Claude dependency graph -> client/session/type cut -> intrinsic MCP -> tests | Pass | Pass | Pass | Pass |
| Forward-only application V5 generation | Pass | Pass | Pass | Pass |
| Downstream code review/API-E2E/live sequence | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Rooted launch/restore/task execution | Yes | Pass | Pass | Pass | Concrete rooted and migration cases are present. |
| Shared message/task recipient resolution | Yes | Pass | Pass | Pass | Address-only result and operation split are explicit. |
| Team status initial/live/overlay/history | Yes | Pass | Pass | Pass | Event and non-event paths are distinguished. |
| Segment start/content/end and file consumer | Yes | Pass | Pass | Pass | Source/canonical and file-operation examples are clear. |
| Codex four-event admission and first-boundary ordering | Yes | Pass | Pass | Pass | Exact fields, rejection precedence, pending-MCP effects, opaque handoff, and admitted debug are explicit. |
| AgentRun active input/FIFO/result-event races/interrupt/termination | Yes | Pass | Pass | Pass | INP-001–INP-009 and INP-R1/R2 distinguish idle start, exact append, later-turn wait, several inputs, command observation, interruption, accepted/rejected termination, restore/failure, public acknowledgement, and private lifecycle. |
| Claude install/start/active-wait/interrupt/resume/turn-1 MCP/output-tool cut | Yes | Pass | Pass | Pass | Eight cases are clear; the interrupt example exactly preserves the verified AbortController/settlement/cleanup/canonical-event order and excludes the streaming-control alternative. |
| Unknown/future item provider scenario | No | N/A | Pass | Pass | MP-013 is recorded as Not Reachable and no synthetic case or runtime policy remains. |
| Persisted transition and rollback/retry | Yes | Pass | Pass | Pass | Fresh/terminal/failure/retry cases are complete. |

## Material Premise Validation (Only When Needed)

### `MP-008` — Ordinary AutoByteus content reaches Team projection without a repeated segment type

- Related approved requirement or established contract: Preserve normal AutoByteus streaming and strict Team presentation under `BEH-019`, `R-053`–`R-056`.
- Relevant behavior ID(s): `BEH-019`.
- Initiating basis kind: `User` / `System`.
- Independent product-supported initiating trigger or applicable governing contract: A user sends a supported prompt to an AutoByteus Agent or Team Agent.
- Support evidence: The native handler establishes type at start, while content carries turn/id/delta without type.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Agent/Team prompt -> AutoByteus turn -> native segment start/content -> server converter -> AgentRun queue -> Team adapter -> strict wire/browser.
- Lifecycle preconditions and material consequence at the claimed point: Valid content follows typed start; without the common owner, ordinary Team content rejects.
- Reachability: `Reachable`.
- Review consequence / proportionate response: The one AgentRun lifecycle and complete consumer cut are required and proportionate.

### `MP-009` — A supported post-provider-ingress AgentRun segment can lack a turn

- Related approved requirement or established contract: Exact-turn segment identity under `BEH-019`, `R-053`, and `R-054`.
- Relevant behavior ID(s): `BEH-019`.
- Initiating basis kind: `System` / `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: None. Supported providers own a turn before an AgentRun segment is constructed.
- Support evidence: AutoByteus requires the handler turn; Claude allocates/passes the session turn; Codex owns the active thread turn. A synthetic/permissive object does not establish a product trigger.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: No supported corrected path reaches AgentRun with a turnless segment.
- Lifecycle preconditions and material consequence at the claimed point: A fourth shared error variant would exist only for this unsupported state.
- Reachability: `Not Reachable`.
- Review consequence / proportionate response: No `RUNTIME_DIAGNOSTIC` or downstream runtime-diagnostic machinery exists.

### `MP-010` — Supported Codex segment notifications may omit a repeated turn while one active turn exists

- Related approved requirement or established contract: Codex provider parity and exact-turn admission under `BEH-019`, `R-053`, and `AC-049`.
- Relevant behavior ID(s): `BEH-019`.
- Initiating basis kind: `User` / `System`.
- Independent product-supported initiating trigger or applicable governing contract: A user starts a supported Codex Agent/Team turn; Codex App Server emits one of the four established direct segment-producing item/reasoning notifications.
- Support evidence: `CodexThread.activeTurnId` is current and source inspection establishes the four direct omission families.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Agent/Team prompt -> Codex `startInput` -> active turn -> exact native item/reasoning notification -> provider normalization -> AgentRun.
- Lifecycle preconditions and material consequence at the claimed point: Exact active turn exists; field omission must be distinguished from invalid/conflicting identity.
- Reachability: `Reachable`.
- Review consequence / proportionate response: One pure exact resolver, four-name set, all-field equality, and focused negative cases are justified.

### `MP-011` — A governed Codex item candidate can change provider state or emit a derived event before converter-local admission

- Related approved requirement or established contract: `R-053` and `AC-049` require invalid/inactive/conflicting segment candidates to stop before provider item/tracker/lifecycle mutation.
- Relevant behavior ID(s): `BEH-019`.
- Initiating basis kind: `Contract` / `System`.
- Independent product-supported initiating trigger or applicable governing contract: The exact provider admission contract applies when the Codex router delivers an actual governed `item/started` or `item/completed` notification to a running Codex Agent/Team turn.
- Support evidence: The current notification handler can add/remove pending MCP state and emit local completion before the backend converter.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Codex turn -> router -> thread -> notification handler -> backend listener -> converter.
- Lifecycle preconditions and material consequence at the claimed point: A governed current event is invalid/conflicting; late admission would allow provider mutation or local emission first.
- Reachability: `Reachable`.
- Review consequence / proportionate response: The one resolver runs in `CodexThread.handleAppServerNotification()` before the handler and only the admitted branded value proceeds.

### `MP-012` — Supported Codex raw-event capture can persist a candidate before converter-local rejection

- Related approved requirement or established contract: Rejected governed provider input permits only the sanitized internal reason record.
- Relevant behavior ID(s): `BEH-019`.
- Initiating basis kind: `Operational` / `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: An operator enables documented Codex raw-event capture while a governed current event traverses admission.
- Support evidence: The current converter raw debugger can persist the complete event before conversion.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Operator enables raw capture -> native event -> thread/handler/listener -> converter -> raw append.
- Lifecycle preconditions and material consequence at the claimed point: The governed candidate is rejected; late logging would violate sanitized-only handling.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Rejection returns before converter/debug; raw capture remains available only for admitted thread messages.

### `MP-013` — A future or otherwise-unlisted `item/*` notification must enter current segment-turn admission

- Related approved requirement or established contract: None beyond current `BEH-019` provider behavior; no approved compatibility/evolution contract establishes a future Codex event family.
- Relevant behavior ID(s): `BEH-019`.
- Initiating basis kind: `System` / `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: None. A possible future provider release or arbitrary method string is technical possibility only.
- Support evidence: Current source contains exactly four direct segment-producing names and established operation-owned paths for every other current event. No additional current native item family exists.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: None.
- Lifecycle preconditions and material consequence at the claimed point: The prior open unknown branch and nine-name exemption registry solved no supported current consequence.
- Reachability: `Not Reachable`.
- Review consequence / proportionate response: SR-024 removes the runtime branch, exemption registry, future-event rationale, and synthetic provider cases. The retained pure-function misuse reason does not create a production path or downstream mechanism. MP-013 now drives removal only.

### `MP-014` — A valid task-peer reverse reply can reach a still-active next-turn-only AgentRun, and waiting for provider forwarding can hold the sender's active tool call

- Related approved requirement or established contract: Exact provider-neutral peer delivery under `BEH-002`, `BEH-003`, `BEH-009`, `BEH-011`, `BEH-018`, and `BEH-020`; `R-057`; `AC-052`; Nested Classroom request/reply/submission/review assertions.
- Relevant behavior ID(s): `BEH-002`, `BEH-003`, `BEH-009`, `BEH-011`, `BEH-018`, `BEH-020`.
- Initiating basis kind: `User` / `System`.
- Independent product-supported initiating trigger or applicable governing contract: From the exposed Team workspace, the user launches the imported Nested Classroom Team and delegates to the child AgentTeam; its approved instruction directs `student_one` to message `student_two`, receive the reply, and complete task submission/review.
- Support evidence: API-REV-039's real Claude provider trace records `student_two` invoking its bound production `send_message_to` back to `./student_one`; rooted resolution reaches the correct task-scoped run while `student_one`'s Claude turn remains active. The tool call currently receives the provider-local active-turn rejection. AutoByteus and Codex complete the same supported row.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Team launch -> task delegation -> active task-Team coordinator turn -> peer `send_message_to` -> exact `student_two` AgentRun -> reverse bound `send_message_to` -> rooted resolver -> exact still-active `student_one` AgentRun -> `InterAgentMessageRouter` -> `AgentRun.postUserMessage` -> current Claude active-turn rejection / target AgentRun admission.
- Lifecycle preconditions and material consequence at the claimed point: The reply sender's tool call needs a prompt result while the recipient has not yet reached terminal. Blocking public acceptance until a next-turn-only backend can forward holds that sender call behind the recipient's terminal and can form the supported collaboration wait cycle; rejecting loses the required reply and prevents task submission/review.
- Reachability: `Reachable`.
- Review consequence / proportionate response: AgentRun may truthfully acknowledge only after it owns the in-memory FIFO entry, but must not await next-turn forwarding. One run-local queue with no collaboration retry, provider-specific Team route, or durable inbox is proportionate.

### `MP-015` — A valid provider can emit canonical start/terminal facts before the explicit input-dispatch promise result returns

- Related approved requirement or established contract: Truthful turn association, status, event order, and at-most-once input settlement under `BEH-014`, `BEH-019`, `BEH-020`, `R-054`, `R-057`, and `AC-052`.
- Relevant behavior ID(s): `BEH-014`, `BEH-019`, `BEH-020`.
- Initiating basis kind: `User` / `System`.
- Independent product-supported initiating trigger or applicable governing contract: A supported caller submits ordinary input to an idle Claude AgentRun through any existing input surface.
- Support evidence: Current `ClaudeSession.sendTurn()` allocates/sets the turn and synchronously emits `TURN_STARTED` before returning its `{turnId}` promise result; the AgentRun backend source listener immediately starts the canonical event-queue path. The design also requires a fast-terminal control for the same ordering boundary.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: supported input surface -> exact `AgentRun.postUserMessage` -> Claude explicit start primitive -> synchronous session `TURN_STARTED` -> backend converter/source listener -> AgentRun event queue, while the original backend dispatch result is still outstanding.
- Lifecycle preconditions and material consequence at the claimed point: An admitted FIFO head has been claimed for start; if its observer/claim does not exist before provider I/O, or if event/result applications use different serialization, the command can be orphaned, associated twice, or allow the next FIFO head to dispatch early.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Register the entry observer and claim before leaving the queue; apply source events and dispatch result through that same queue; retain early facts and settle once with exact turn equality. No second event buffer or provider-owned state is required.

### `MP-016` — A supported active Claude one-string query can be interrupted through the current product command path

- Related approved requirement or established contract: Preserve Claude session/interruption behavior while upgrading the exact dependency graph under `BEH-020`, `BEH-021`, `R-057`, `R-058`, `AC-052`, and `AC-053`.
- Relevant behavior ID(s): `BEH-020`, `BEH-021`.
- Initiating basis kind: `User` / `System`.
- Independent product-supported initiating trigger or applicable governing contract: A user or supported operational caller issues the existing interrupt command while an AgentRun-owned Claude turn is active.
- Support evidence: The current production backend delegates to `ClaudeSession.interrupt()`. The session's one-string query was started with `Options.abortController`; interruption calls that controller's `abort()`, awaits the active execution, and emits canonical `TURN_INTERRUPTED`. The installed latest public types retain `Options.abortController`.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: supported interrupt surface -> AgentRun interruption owner -> Claude backend -> active `ClaudeSession` one-string query -> `AbortController.abort()` -> active query settlement -> canonical terminal/interruption -> AgentRun FIFO drain.
- Lifecycle preconditions and material consequence at the claimed point: An active Claude turn and zero or more waiting AgentRun FIFO entries exist. Changing to an unproved streaming-control request can fail to terminate the active one-string query or create duplicate interruption ownership, preventing correct terminal/drain behavior.
- Reachability: `Reachable`.
- Review consequence / proportionate response: SR-028 preserves the established `AbortController` translation in DS-019D and `CLAUDE-SDK-004`, including exact settlement/cleanup/canonical ordering and negative proof against the streaming-control alternative. `DR-013` is resolved.

### `MP-017` — Latest Claude SDK priority/streaming input can provide exact active-turn append to AgentRun

- Related approved requirement or established contract: Provider mechanics must truthfully implement AgentRun's explicit capability boundary under `BEH-020`, `R-057`, and `AC-052`.
- Relevant behavior ID(s): `BEH-020`, `BEH-021`.
- Initiating basis kind: `Contract` / `System`.
- Independent product-supported initiating trigger or applicable governing contract: None. The latest public `SDKUserMessage` priority shape has no exact active-turn selector or expected-turn precondition.
- Support evidence: Installed current types expose `priority:"now" | "next" | "later"` and `streamInput`, while the isolated current-version probes show `now` interrupts/redirects and `next` queues later. Neither identifies the AutoByteus active turn.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: No supported path maps SDK priority/streaming input to exact `append_to_active_turn(expectedTurnId)`.
- Lifecycle preconditions and material consequence at the claimed point: Treating priority as exact append would either interrupt the active work or introduce a second provider-owned FIFO, contradicting the accepted AgentRun owner.
- Reachability: `Not Reachable`.
- Review consequence / proportionate response: Retain Claude `activeTurnAppend:"unsupported"`; do not add `streamInput`, priority scheduling, provider command lifecycle, or another queue. SR-027 is correct on this boundary.

### `MP-018` — A Team-bound Claude first turn can begin before its required intrinsic MCP tools are ready after the SDK upgrade

- Related approved requirement or established contract: Every Team-bound Agent intrinsically receives the collaboration/task tools on its first turn under `BEH-005`, `BEH-009`, `BEH-021`, `R-058`, and `AC-053`.
- Relevant behavior ID(s): `BEH-005`, `BEH-009`, `BEH-021`.
- Initiating basis kind: `User` / `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: A user launches or sends the first prompt to a Team-bound Claude Agent whose server-owned Agent Tools HTTP MCP descriptor supplies required Team tools.
- Support evidence: The latest SDK documents background MCP loading by default and exposes per-server `alwaysLoad:true` to include required tools in the first-turn prompt and wait for connection. The current materializer lacks that flag.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: TeamRun launch -> Team-bound Claude AgentRun -> first `start_turn` -> Claude query options with intrinsic Agent Tools MCP descriptor -> provider prompt/tool availability.
- Lifecycle preconditions and material consequence at the claimed point: Collaboration/task tools are required on turn 1; background connection can make them absent from that prompt.
- Reachability: `Reachable`.
- Review consequence / proportionate response: Set `alwaysLoad:true` only on the server-owned intrinsic Agent Tools HTTP MCP descriptor. Do not apply a global policy or legacy environment switch.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — SR-028 resolves `DR-013` and `DR-014`. The complete cumulative package has one rooted TeamRun aggregate, canonical logical/concrete identity, operation-neutral recipient resolution, operation-owned task lifecycle, intrinsic collaboration, one Team status/event/wire/frontend model, isolated released-data migration/token transaction, forward-only V5 application cut, one AgentRun segment lifecycle, exact Codex first boundary, one AgentRun input FIFO, and one coherent latest-Claude dependency/session/MCP adapter. Implementation may resume from the cumulative SR-028 authority, subject to focused and full source review before API/E2E.

## Findings

None. `DR-013` and `DR-014` are resolved by SR-028.

## Classification

`N/A — no unresolved architecture finding.`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must return public input acceptance only after FIFO ownership and before provider forwarding; `turnId` may be non-null only for the same atomically claimed exact-turn append.
- Claim, provider source events, result application, terminal drain, interrupt, failure, and termination must serialize through the one AgentRun queue while provider I/O remains outside; synchronous start/terminal-before-result controls are mandatory.
- Codex exact-turn steer, Claude/AutoByteus next-turn dispatch, command replay/multiple records, memory-on-forwarding, activation-only overlays, and caller-specific result codes must survive the removal of all provider/registry competing policies.
- Claude explicit interruption must use only the one-string query's `Options.abortController`, wait for exact execution and registered-query/reference cleanup before canonical `TURN_INTERRUPTED`, and permit FIFO drain only from the terminal fact; `Query.interrupt()`, receipts, streaming input, and fallback must remain outside the product path.
- `alwaysLoad:true` must remain limited to the server-owned intrinsic Agent Tools HTTP MCP descriptor; arbitrary external MCP servers must retain their existing loading policy.
- Input dispatch failure after public admission must remain an internal once-only lifecycle outcome: no retry/fallback, no second Team communication/member input, and no durable/frontend inbox.
- The already-accepted opaque Codex thread message, valid MCP ordering, sanitized rejection, admitted-only raw debug, segment fan-out, and no broad-prefix/raw fallback guarantees still require focused source proof.
- The cumulative rooted identity, Team event/status/frontend, migration/token transaction, storage, task activation, provider-tool, and V5 application work remains broad and requires full cumulative source review.
- `CR-F-043` remains API/E2E-owned and must not drive implementation machinery or be changed before source gates pass.
- The three-runtime live matrix remains no-skip; external provider unavailability is a truthful blocker/failure, not a Pass.
- The exact manifest/lock graph, peer satisfaction, root imports, source build/type checks, and focused tests are strong investigation evidence but are not SR-028 product implementation or live-matrix proof.
- Packaged/desktop server artifacts must be regenerated and verified from the exact dependency graph during implementation/delivery; stale ignored build output is not an accepted compatibility path.
- The solution designer disclosed that one malformed local inspection command exposed inherited environment values in private tool output. No repository/evidence write was found, but the user/operator should rotate any credential that may have appeared.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — `MP-016` and `MP-018` have independent supported user/contract paths; `MP-017` is `Not Reachable` and drives no provider queue or exact-append machinery. Earlier material-premise dispositions remain unchanged.
- Notes: `ARCH-REV-021` is current. `DR-001`–`DR-014` are resolved, and `CR-F-048` / `API-F-025` remains resolved at design level by SR-026/SR-028. Implementation may resume from the cumulative SR-028 authority; focused and full source review remain mandatory before API/E2E. `CR-F-043` remains API/E2E-owned.
