# AgentTeam Hierarchical Communication And Handoffs — Design Specification

Status: `Refined — SR-024 ready for complete architecture re-review of DR-012`.

## Current-State Read

SR-006 is the integrated collaboration baseline at `66b02ae7b9695b3ce21c6c0f01b76f9310bd0cd6`. It already establishes strict `/...` and `./...` recipient-address expressions behind the implemented `recipient_name` field, one minimal `{rootTeamRunId, memberAddress}` caller coordinate, one shared message/task recipient resolver, configured AgentTeam coordinator targeting, handoff retrieval, provider-visible send codes, and current-Team task eligibility. The field name remains a flat-roster artifact even though its value now denotes an address.

The integrated handoff boundary is still service-shaped rather than Agent-shaped. `GetHandoffRulesService` returns `{accepted,code,message,result:{member_address,handoffs:[{from,to,rules}]}}`; AutoByteus and MCP serialize that complete envelope; `MemberCollaborationContext` already contains only the caller's outgoing edges. Tool exposure remains driven by package `toolNames`. `member-collaboration-instruction-renderer.ts` explains the logical grammar but calls the public field `recipient_name`, does not explicitly introduce the filesystem metaphor with concrete examples, and merely suggests calling the tool “when needed.” Therefore the prompt cannot require a completion handoff consistently: some Team Agents do not receive the tool, and successful tool output contains transport/service facts the LLM does not need.

The older execution model underneath that boundary still represents one logical placement several ways:

- `memberName`, `memberPath`, and `memberRouteKey` coexist in recursive TeamRun state;
- AgentTeam coordinator identity has name/route variants;
- AgentTeam nodes carry generic `memberRunId` and duplicate `childTeamRunId` values;
- the root Team has a wrapper shape different from nested Teams;
- persistent child TeamRuns copy/localize paths and coordinator routes;
- conversation, task, event, token, integration, API, SDK, and frontend structures encode further route/path variants; and
- normal readers normalize legacy variants instead of requiring a completed migration.

The original recursive `memberTree` nevertheless has useful locality: genuine Agent definition, launch, platform, run, role, description, workspace-root, and application-context facts are naturally stored next to the Agent they configure. SR-007's proposed persisted `topology + launch profiles + bindings` separation was therefore over-normalized. SR-008 retains the recursive aggregate and removes only parallel authorities.

The application path has exact contract gates that SR-011 did not map. `@autobyteus/application-sdk-contracts` declares backend-definition V4 and frontend-SDK V4; its V4 launch, binding, target, and producer/event contracts contain `memberRouteKey`, `memberPath`, `teamPath`, and generic run fields. `parseApplicationManifest`, `parseApplicationBackendManifest`, and `ApplicationBackendDefinitionLoader` validate those declarations before execution. Changing the types under V4 would make the gates lie, so the semantic contracts still require an atomic V5 cut. The user has now explicitly confirmed that this application framework has no supported users or predecessor state. Therefore exact V5 validation is a current-contract boundary only: project-owned application source/artifacts/fixtures/databases are replaced directly, while application migration, predecessor readers, V4 adapters, special quarantine/upgrade workflow, and fallback are excluded.

CRR-022 exposed one narrower migration-design defect after SR-012 implementation. The stable flat writer stored `memberName` as presentation and normalized `memberRouteKey` independently; the maintained safe fixture contains `Program Manager` / `program_manager` and `QA Specialist` / `qa_specialist`. The predecessor `memberTree` schema likewise accepted `memberName` independently from structural `memberRouteKey`/`memberPath`. `AppDataMigrationRunner.runPending()` skips a migration whose ID is already `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`. A read-only operational inventory found predecessor member-tree files and a terminal `20260517_team_run_metadata_member_tree` record, while the ticket-owned `20260801_team_canonical_identity` ID was absent. SR-013 assigned final TeamRun conversion to the later pending canonical owner and passed complete ARCH-REV-008.

CRR-025 exposes the analogous token rollout gap after IR-014. The pre-ticket `20260703_token_usage_execution_address_backfill` definition is required on startup and writes legacy `{segments}` JSON. Current target code changes the converter under that same ID, so a normal predecessor start records terminal status and target `runPending()` executes the corrected converter zero times. Strict current token readers then normalize the old payload to `null`. A read-only operational snapshot confirms the production-reachable state: the old token ID is `SUCCEEDED`, `20260801...` is absent, and roughly 139k Team token rows retain `{segments}`. In addition, the migration database boundary exposes only independent row updates; a forced second-write failure leaves the first row committed. The pending canonical aggregate must therefore own target token conversion and delegate one all-or-nothing batch to a transaction-owning migration store.

CRR-050 is the current full-ticket structural result. It preserves the backend canonical identity/routing, migrations/startup, V5 application admission, providers, storage, and safe-launcher work, but finds two remaining authoritative-boundary failures. First, `TeamRunEvent` pairs an independent discriminator with an independent data union, task events erase exact domain types to `unknown`, the server mapper casts into generic `Record<string,unknown>`, and the browser checks only that `type` is a string. Member input also repeats one receiving execution as both `execution_address` and `recipient_address`. Second, frontend `TeamRunNodeBase` mixes immutable topology, concrete task execution, task lifecycle, presentation, and relationship facts; task Team materialization clones source topology with empty run-ID placeholders; thirty production callers reach into `agentExecutionsByKey`, including eleven raw-key parsers; and streaming, GraphQL restore, focus, history/navigation, status/timeline, and cleanup coordinate by shared mutation. Reachable API-F-012 through API-F-015 are consequences of these shapes, not separate local defects.

Before SR-016 design, the ticket branch was fetch/merge-refreshed onto the then-current personal base and preserved the distinction between workspace selection and execution focus: current-row presentation requires the selected root TeamRun and exact focused `TeamExecutionAddress`. On 2026-08-13 the solution designer freshly verified current HEAD `0d32ff25502838c28663fc765c3499fc83455eb1` against `origin/personal@54890a07f74e941a7a12b6daaa26364f4c927b72`; it is 90 commits ahead, zero behind, and has that remote tip as merge base. No new base refresh is required for SR-024.

ARCH-REV-010 then completed a full cumulative review of SR-017. It passed the rooted TeamRun aggregate, logical/concrete address ownership, shared message/task resolver, provider protocol, released-data migration and token transaction, task activation, frontend execution aggregate, cleanup inventory, and direct forward-only V5 application cut. It resolved CR-F-029/CR-F-030 at design level and left only DR-005/DR-006. DR-005 proves two supported Agent-status production paths were absent from the exact stream boundary: `AgentTeamStreamHandler.sendInitialStatusSnapshot()` projects persistent/task/task-Team Agent statuses directly through generic `ServerMessage`, and `MemberCommandStatusOverlayStore` manufactures initializing/error Team Agent events before AgentRun materialization through a generic builder. DR-006 identifies only a stale UC-019 sentence; the governing application outcome remains discard/rebuild. SR-018 closes these exact gaps and does not reopen accepted structure.

ARCH-REV-011 passed the complete cumulative SR-018 design. CRR-076 / API-F-024 later proved one remaining cross-runtime stream gap through the real imported AutoByteus Team browser path: native `SEGMENT_START` establishes segment type, native `SEGMENT_CONTENT` carries only segment/turn/delta, and the AutoByteus converter preserves that truthful lifecycle. The implemented Team domain/wire contract instead requires type on each content event, while its adapter is recreated per event and no common lifecycle owner enriches content. Codex/Claude and browser code also contain repeated/defaulted type behavior that would become parallel authorities. SR-019 therefore changes only the segment lifecycle seam: one `AgentRun`-owned state at the already-serialized common boundary admits minimal provider facts, validates start/content/end ordering, and emits self-contained canonical content to every downstream listener. CR-F-043 remains a later API/E2E-owned cleanup correction; solution and implementation work do not inspect or delete that residue.

ARCH-REV-012 accepts that single owner and every cumulative ARCH-REV-011 boundary, but finds the source-to-canonical cut incomplete at two seams. DR-007 proves that the default `FileChangeEventProcessor` and several listeners still interpret source/fallback segment shapes after the proposed transformer; notably file end reads type before its own invocation context and a repeated active start can replace accumulated file content. Memory/history, external-channel, compaction, and skill-improvement consumers also retain ID/type/turn aliases or terminal-end text recovery. SR-020 correctly completed that consumer cut, but accepted MP-009 without tracing a supported producer and invented `RUNTIME_DIAGNOSTIC` for a mechanically constructible turnless object. The user-required product-reachability audit for SR-021 proves valid segment output is turn-owned at each real ingress: AutoByteus has the required native handler turn, Claude has the session/projector turn, and Codex has the exact active thread turn. The original three `AgentRunErrorEvidence` variants already map the real production states: turn diagnostic, turn terminal, and runtime terminal. SR-021 therefore retains the complete DR-007 correction, classifies turnless segment output as Not Reachable after supported ingress, removes the fourth variant, and requires missing/empty/inactive/conflicting provider turn candidates to be rejected before enqueue with no Agent/browser event or lifecycle mutation.

ARCH-REV-016 completes a full cumulative SR-022 review. It resolves DR-009/DR-010 and preserves DR-007/DR-008 plus every earlier rooted identity, collaboration, migration/token, direct V5 application, Team stream/status/frontend, task, storage, AgentRun lifecycle, and complete-consumer boundary. DR-011 finds one remaining ownership-placement defect. The actual production path is client router -> `CodexThread.handleAppServerNotification()` -> `codex-thread-notification-handler.ts` -> backend listener -> `CodexThreadEventConverter`. Before the converter-local SR-022 call, MCP start/completion can add/remove pending state and emit `LOCAL_MCP_TOOL_EXECUTION_COMPLETED`; then converter raw debug can persist the complete candidate before conversion. The exact policy remains correct, but it must be invoked at the first per-thread boundary and its admitted immutable value must be the only message allowed downstream.

ARCH-REV-017 resolves DR-011 and every prior design finding. It accepts the first per-thread owner, rejection ordering, opaque admitted/derived value, valid MCP ordering, and admitted-only debug. DR-012 identifies one overreach introduced in SR-023: current source has exactly four segment-producing native names, while the proposed unknown-`item/*` branch and nine-name exemption registry are driven only by Not-Reachable MP-013. SR-024 removes that machinery. The exact four-name set is both production applicability and omission-inheritance authority; every other current native fact continues through its operation-owned route without segment admission or a second registry.

## Intended Change

Persist one schema-v3 TeamRun aggregate per root execution:

```text
TeamRunMetadataV3
├── schemaVersion / timestamps / root definition presentation
├── rootTeam: AgentTeam node at /
│   └── children: Agent | AgentTeam nodes recursively
└── handoffs: compiled canonical-address edges
```

Every node has exactly one `AgentTeamAddress`. Agent nodes keep genuine Agent-local launch/restoration facts and one `agentRunId`. AgentTeam nodes keep one `teamRunId`, one configured direct `coordinatorAddress`, and `children`. The root Team's `teamRunId` equals the metadata directory identity. No separate persisted topology, profile, binding, or index table exists.

Runtime derives a `TeamRunTreeIndex`. Root, persistent child, and restored TeamRuns share the same immutable root metadata/index and select their Team node by absolute address. A delegated AgentTeam is a new concrete execution and receives fresh typed run IDs, but it preserves every absolute address and configured coordinator. No local logical namespace or prefix rewrite remains.

One `TeamExecutionAddress` identifies concrete persistent/task execution across history, tasks, communication, events, tokens, WebSocket, SDKs, and frontend. Existing structured data converts through an ordered, backup-producing/transactional, idempotent, startup-blocking migration. Current readers accept only the current schema. Physical Agent memory and final context-file paths do not move.

At the public recipient-operation boundary, both `send_message_to` and `delegate_task` use `recipient_address`. Its raw `/...` or `./...` value is represented internally as `RecipientAddressExpression`; resolving it produces canonical `AgentTeamAddress`. “Path” describes the filesystem-like grammar, while “address” names the domain meaning. The old `recipient_name` and the discussed-but-rejected `recipient_path` are not aliases.

Team collaboration becomes an intrinsic runtime capability. Every Team-bound Agent receives `get_handoff_rules`, `send_message_to`, and one provider-neutral filesystem-like system-instruction block after package tools are resolved. The exact user-approved renderer template is owned by `agent-team-collaboration-system-instruction.md`: it explains the filesystem-like logical-address model and caller address first, then naturally tells the Agent to check configured handoff rules when it finishes its work or is blocked. The collaboration binding remains the sole exact-caller filter; the service consumes that already-bound outgoing edge set and flattens each rule into exactly `{when,recipient_address}`. Successful model-visible output is only `{handoffs:[...]}`. `send_message_to` retains its separate code-preserving delivery envelope because delivery confirmation is operationally meaningful. Standalone non-Team Agents keep their normal configured-tool policy.

SR-011 adds no production data field or runtime branch. It fixes the downstream live-validation environment and matrix needed to prove this design through real provider lifecycles.

SR-012 introduced the necessary V5 semantic version boundary after ARCH-REV-006 / DR-004. The current user clarification simplifies its rollout: `@autobyteus/application-sdk-contracts` still advances the breaking backend-definition and frontend-SDK contracts from V4 to V5, while independent unchanged application-manifest, backend-bundle, and iframe protocol versions stay unchanged. Project-owned SDK source/dist, both application sources, build scripts, vendor copies, importable outputs, fixtures, and fresh databases advance atomically. Existing manifest/definition parsers and loaders accept only the exact current declarations before execution. No application predecessor migration, V4 adapter, old-bundle compatibility/quarantine/upgrade workflow, external bundle edit, or database preservation path is designed.

SR-013 corrects CRR-022 / CR-F-011 without changing the target model. One pure migration-only flat decoder owns historical display/route interpretation. Stable `20260517_team_run_metadata_member_tree` uses it for flat-to-predecessor conversion when pending. Ticket-owned `20260801_team_canonical_identity` remains separately pending and becomes the sole owner of schema-v3 replacement: it converts predecessor trees directly and composes the same flat decoder in memory for a residual/repaired safe flat file left behind when `20260517` is already terminal with warnings. It validates normalized route/path agreement and topology but never compares `memberName` with the address basename. Therefore fresh flat input, already-terminal predecessor output, and terminal-warning residual flat input all have an executable path without rerunning a completed ID or requiring a listening API; invalid structural data still blocks before mutation, and current repositories remain v3-only. The user explicitly approved SR-013 for architecture re-review without changing the coordinator-required operational AgentTeam invariant or adding later AgentOrg container scope.

SR-014 changes no protocol, data model, owner, or data-flow spine. It records the user's exact natural-language implementation copy in one file and forbids provider paraphrase or duplicate full-text authorities. AutoByteus, Codex App Server, and Claude Agent SDK inject the same rendered block through their existing system-instruction seams; only `{{member_address}}` varies. The user explicitly classified this as a pure-text implementation clarification with no additional architecture review.

SR-025 refines only that user-facing copy and its prompt-section presentation. The shared renderer emits `## AgentTeam Addressing` followed by `## AgentTeam Collaboration`; the composer inserts those sibling sections after optional authored Team instructions and before working-environment guidance, without a `## Team Runtime` wrapper. The first section teaches the general directory/file/subdirectory analogy and address grammar before locating the current Agent; the second explains messaging, direct-child task delegation, and completion/blocked handoffs. Provider seams, runtime tools, caller binding, protocol behavior, owners, and all data-flow spines are unchanged. The user explicitly approved direct implementation without another architecture review.

SR-015 corrected CRR-025 / CR-F-013 and made the CR-F-014 transaction contract executable without changing target identity or runtime behavior. `20260801_team_canonical_identity` became the independently pending target record for rooted TeamRun and token semantic identity. SR-016 tightens that accepted ownership instead of retaining two later cleanup owners: the same canonical token item now performs semantic address conversion and physical removal of every obsolete Team-identity column in one verified Prisma/SQLite transaction. The historical `20260703_token_usage_execution_address_backfill` definition and both narrow token column-drop definitions are absent from the current registry; their durable terminal records remain untouched evidence. The existing exact canonical server gate remains the single pre-listen decision. No new migration ID, status reset, second gate, per-row commit, physical pre-conversion column drop, or runtime legacy reader is added.


SR-016 corrects CRR-050 / CR-F-028–CR-F-030 without replacing those accepted subsystems. One browser-safe `@autobyteus/team-stream-contracts` workspace package owns the exact strict `/ws/agent-team` server/client DTO unions, runtime schemas, and serializers. Server `TeamRunEvent`, Team Agent, and task events become correlated unions; the Team member ingress adapter exhaustively validates the established generic standalone Agent event into the correlated Team Agent variant before publication; every other producer constructs its exact variant; the mapper is exhaustive and cast-free after narrowing; Team egress accepts only the exact contract; and browser admission validates the complete message before any mutation. Agent/task/member-input variants have one receiving/execution authority, communication retains its semantically distinct sender and receiver, derived Agent collaboration duplicates are filtered, and current aliases/arbitrary fields/unproduced variants/no-op Team approval tokens are removed.

SR-017 does not reopen that model. It records the user's explicit forward-only application rule and removes a speculative subsystem from the solution: the application framework has no supported users or predecessor state, so project-owned source, manifests, definitions, generated/vendor/importable outputs, fixtures, and fresh databases move directly to V5/current shape. Ordinary exact parsers/loaders reject non-current input. `20260801...` has no application item, canonical startup does not enumerate application databases, and production/migration code contains no application predecessor decoder, compatibility adapter, special quarantine/upgrade workflow, dual reader, fallback, or database preservation path.

SR-018 closes the two remaining status producers with one smaller domain capability. `createTeamAgentExecutionBinding({executionAddress,agentRunId})` is the sole classifier/validator for persistent Agent, task Agent, and Agent inside a task AgentTeam. `TeamAgentStatusSnapshot {execution,details,statusHint}` is the sole immutable Agent-status projection value. Mixed persistent/task/task-Team handles and config-backed offline members construct it from their already-owned exact address and allocated AgentRun ID. `TeamRuntimeSnapshotService` projects the non-event connection/open/restore snapshot directly through the same exact Team Agent status projector and strict serializer used by the correlated live `AGENT_STATUS` arm; it does not manufacture a `TeamRunEvent`. For an unmaterialized send/delegation target, the mixed handle supplies that same binding to `MemberCommandStatusOverlayStore`, which stores only exact status details by a private canonical key and publishes through one narrow `createTeamAgentStatusEvent(snapshot)` correlated constructor. The first matching real correlated status removes the overlay. TeamRun/name/runtime/raw-ID/task-instance/execution duplicates, the legacy snapshot model, generic initial-status mapper, and generic command-start event builder are removed. UC-019 is corrected to migrate only supported released TeamRun/history/communication/task/token/external data; application databases remain unsupported discard/rebuild input.

SR-019 closes CR-F-042 without adding provider or Team-specific state. `AgentRun` constructs one non-persisted `AgentSegmentLifecycleState` beside its existing turn lifecycle state and passes it through the existing per-run `AgentRunEventDispatchQueue`. `AgentSegmentLifecycleEventTransformer` is the first default-pipeline transformer. It strictly admits the generic provider envelope as a minimal exact-turn source start/content/end union, processes command-accepted/turn/start/content/end/error/status facts in queue order, and enriches accepted content with the finite type established by its start. AutoByteus preserves native minimal facts; Codex reasoning and Claude text normalization add explicit semantic starts and all provider content/end facts omit type. Team, standalone, application, history, and browser paths consume only the canonical result and hold no lifecycle map or type default. The exact current state machine, replay/cleanup semantics, consumer cut, diagnostics, and proof obligations are normative in `agent-segment-lifecycle-contract.md`.

SR-020's DR-007 correction remains authoritative: it does not widen canonical end or add a second state machine. Same-type repeated active start is swallowed at the lifecycle owner, so no stateful consumer receives a second initialization. `FileChangeEventProcessor` keeps only file-operation projection context—exact run/turn/invocation, source tool, target, arguments, streamed content/status—and derives end behavior from that context rather than end type. Memory/history, compaction, skill improvement, external delivery, application projection, Team/standalone egress, browser presentation, coalescing, lifecycle/failure/command observers, and event-selective relays receive explicit target behavior, removals, and proofs.

SR-021 corrects only the speculative DR-008 response. Provider ingress is the authoritative exact-turn admission boundary: AutoByteus requires the native handler turn; Claude requires its allocated session/projector turn; Codex requires an explicit turn that matches `activeTurnId`, or uses that exact active turn only for a provider-owned allowed omission. A rejected candidate produces zero `AgentRunEvent`s, no Agent/browser error, no lifecycle mutation, and one sanitized internal protocol record. The AgentRun transformer therefore receives only exact-turn segment facts. An admitted ordering/shape violation may reuse the real non-terminal `TURN_DIAGNOSTIC`; the original `TURN_DIAGNOSTIC | TURN_TERMINAL | RUNTIME_GLOBAL` union remains exhaustive and runtime/diagnostic is invalid.

ARCH-REV-015 resolves DR-007 and DR-008 and returns only DR-009/DR-010. SR-022 removes stale current-authority promotion of provider rejection into downstream transport and makes the Codex omission contract executable. One provider-local `resolveCodexSegmentTurnAdmission` receives the native event name, params, and the exact active turn already exposed through the converter's injected lifecycle snapshot. Its active-turn-inheritance set is exactly `item/started`, `item/agentMessage/delta`, `item/completed`, and `item/reasoning/completed`. It inspects every present turn candidate at `params.turn_id`, `params.turnId`, `params.item.turn_id`, `params.item.turnId`, and `params.turn.id`; present invalid/empty fields reject, all normalized candidates must agree, and the agreed value must equal the active turn. With no explicit candidate, a governed event inherits. Inactive, conflict, or explicit-invalid governed input stops before item/reasoning tracker mutation and cannot fall through to a raw/generic event payload. The retained unlisted-omission result is pure-policy misuse vocabulary only; SR-024's production owner never invokes the resolver for an unlisted name. This is a narrow provider invariant, not a new shared lifecycle owner or error variant.

SR-023 keeps that exact resolver and moves only its invocation/accepted-value construction to the real owner. `CodexThread.handleAppServerNotification()` trims the native name, reads its owned `activeTurnId`, and applies the resolver to the exact four established segment-producing names before invoking the notification handler. Rejection calls a sanitized rejection logger and returns. Admission constructs one readonly listener-facing `native_admitted` message whose params are exactly `paramsWithExactTurn`; the handler uses that same object for pending-MCP coordination and original-event emission. Established local events are separately tagged `local_derived`. `CodexThread` owns the unexported brand/private constructors, and the backend listener and converter accept only this opaque thread-emitted union, so neither can receive raw native input, fabricate a value, or re-run admission. Converter raw JSONL/debug capture remains after the boundary and records admitted canonical/derived messages only; the generic file sink owns no provider policy. Every other current native event is wrapped readonly at the same thread boundary and preserves its existing operation-owned handling without entering the segment resolver. This corrects dominance without adding state, fallback, compatibility, or another error variant.

SR-024 applies the product-reachability rule to that accepted structure. It removes the rejected nine-name exemption registry, unknown-event governed branch, future-event rationale, and synthetic unknown-event coverage. The exact four-name constant alone decides whether the resolver runs. The resolver retains its previously accepted four reason values, but the unlisted-omission reason is only a pure-policy misuse guard; it does not establish a supported runtime event class or downstream proof requirement.

Frontend state is split by real subject without changing the one recursive disk aggregate. `TeamLaunchDraft` owns pre-launch configuration, logical member focus, and pending input without any copied definition topology or run/execution/conversation identity; the existing definition catalog supplies its read-only definition view. V5 `@autobyteus/application-sdk-contracts` owns the one exact `ApplicationExecutionContext` compile-time shape; the server aliases it, and server/browser metadata boundaries map and validate it through their existing canonical execution-address capabilities rather than casting a generic record. One `TeamRunFrontendProjectionBuilder` atomically projects a closed launch/open input—validated canonical metadata, exact root lifecycle, logical Agent focus, and one discriminated fresh/loaded/historical-unloaded identity-free Agent seed per metadata Agent—into run-ID-free immutable `TeamTopologySnapshot` (logical placement plus node-local effective launch configuration) and a paired `TeamExecutionState` (all concrete run/application bindings and lifecycle). Lifecycle is therefore supplied by its actual launch/resume owner rather than inferred from metadata, while seeds carry only workspace/dynamic hydration facts and cannot repeat metadata-owned run/config/application identity. Because `ApplicationExecutionContext.producer.executionAddress` is execution identity, the builder consumes it into concrete Agent executions rather than topology; task Agent variants preserve the stable application assignment while rebinding the producer to their exact task address. The server enforces the same invariant earlier at the existing AgentRun-construction boundary so task Agent runtime, published-artifact, and application-stream attribution are correct at source rather than repaired by the browser. `AgentTeamContext` is only `{topology,executions}`: it does not repeat root TeamRun ID/lifecycle, mutable launched config, hydration, or stream-session state. The execution aggregate's private index stores only five valid variants—persistent Team, persistent Agent, task Agent, task AgentTeam root, and real Agent inside a task AgentTeam—and every applicable run ID is server-allocated and non-empty. The root/task Team IDs derive from their execution addresses; only a child persistent Team stores its distinct child binding. Each task execution stores only its task ID; one private one-entry-per-task projection index supplies active status/timeline and derived history, so there is no copied task snapshot or second mutable history archive. Durable-confirmed activation may seed that projection, while later live result signals request a complete record refresh and never manufacture partial timeline state. Complete GraphQL snapshots enter one staged monotonic reconciliation with immutable base facts, append-only retention, and atomic terminal cleanup. The aggregate alone owns root lifecycle, Agent-context association, task graph/projection, focus, and cleanup; established AgentContext/projector ownership remains the one source of Agent-local conversation/status/tool state, which typed Team views read without copying. The aggregate returns typed external effects and subject-specific immutable views, never its concrete union/map, and does not fetch GraphQL or mutate navigation/token stores. The launch owner constructs a fresh paired context only after success, transfers logical focus/pending input once, and atomically replaces the draft; failure leaves the draft unchanged. Active configuration/relaunch views derive from immutable topology; all Agent/Team WebSocket connection state remains transport-owned rather than living on contexts. The `services/teamExecution/` capability owns this model, while streaming remains a thin typed transport adapter. Private pure transition/navigation-projector modules keep the lifecycle owner cohesive without creating alternate public coordinators.

The same tightness rule now applies to backend task execution and token persistence. `taskId` is the only task-management identity **inside its root TeamRun scope** and the activated task record's non-null `taskRun.address` is the concrete execution locator; a cross-root task lookup accepts `{rootTeamRunId,taskId}` rather than pretending IDs are global. `TaskAgentInstanceIdentity`, `TaskTeamInstanceIdentity`, their deterministic `task_agent_${taskId}` / `task_team_${taskId}` aliases, copied owner/parent/run/timestamp fields, generic `task_context`, and separate activation-result run-ID fields are removed. The active ledger may derive one non-persisted correlated `ActiveTaskExecutionBinding {kind,taskId,executionAddress}`; task-bound member context retains only `taskId` beside its already-owned execution address, which supplies root scope. Token storage likewise retains canonical `execution_address_json`, actual Agent `run_id`, task-operation `task_id`, and usage facts, while removing parallel root/member/task-run/task-instance columns. Root-Team queries derive the root from canonical JSON and use one named expression index, not another writable identity field. The exact contract and model are normative in `team-stream-execution-projection-contract.md` and `team-run-canonical-identity-refactor.md`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Current production spine | Target production path / spine IDs | Preserved or changed outcome |
| --- | --- | --- | --- |
| BEH-001 | Team config -> definition models/providers/GraphQL; handoffs absent before SR-006 | definition adapters -> graph resolver -> TeamRun-tree compiler (`DS-001`) | Authored handoffs round-trip and compile against mounted addresses |
| BEH-002, BEH-003 | flat `recipient_name` roster/representative -> message resolver -> nested handles | `recipient_address` -> `RecipientAddressExpression` parser -> shared recipient resolver -> root manager (`DS-004`) | Truthful rooted delivery with no misleading name field, representative, or parent gate |
| BEH-004 | route-bearing recursive config -> child copy/localization | rooted v3 tree -> derived index -> absolute child selection (`DS-001`–`DS-003`) | One logical address, uniform root/nested node, preserved lazy lifecycle |
| BEH-005, BEH-006 | configured rule tool -> service envelope; optional generic address prompt | intrinsic Team capability -> caller edge filter -> ordered `{when,recipient_address}` projection -> mandatory filesystem-like completion instruction (`DS-010`) | Sender-only action guidance with no service-envelope leakage or inline rule duplication |
| BEH-007 | exact run selector -> global router | unchanged exact-run branch before Team resolver (`DS-004`) | Existing routing/event behavior and codes remain byte-stable |
| BEH-008 | recursive route-bearing metadata -> normalizer/restore | blocking conversion -> strict v3 root tree -> index (`DS-003`, `DS-009`) | Run-stable handoffs/config/IDs restore without definition reread |
| BEH-009 | runtime-specific configured exposure; one generic envelope for rule lookup and delivery | intrinsic Team tool composition -> operation-specific result adapters (`DS-004`, `DS-010`) | Identical minimal handoff guidance across providers; unchanged send delivery/code meaning |
| BEH-010 | TeamRun default target -> root coordinator route | root node `coordinatorAddress` -> exact Agent node/handle (`DS-001`, `DS-004`) | Coordinator-led default Team entry remains unchanged |
| BEH-011 | flat `{kind,name}` task roster -> direct task activation | `recipient_address` -> same shared recipient -> direct-current-Team policy -> task factory (`DS-005`, `DS-006`) | Same public address field/resolution as messaging; current task eligibility/lifecycle preserved |
| BEH-012 | minimal SR-006 caller/recipient over route-bearing execution state | same minimal boundary over `AgentTeamAddress` and rooted index (`DS-004`–`DS-006`) | No config/run/handle/lifecycle leak through shared resolver |
| BEH-013 | `TeamRunConfig` mixes genuine local facts with redundant identity and generic IDs | v3 Agent/AgentTeam node union + local facts + derived index (`DS-001`–`DS-003`) | Useful locality retained; parallel identity removed |
| BEH-014 | conversation/task/event/token encode task/member variants; Team events/wire are uncorrelated/generic and duplicate receiver identity; connection snapshots and pre-run status overlays bypass the exact Team Agent contract | one Agent binding/status snapshot -> correlated live/status-overlay event or direct non-event snapshot projection -> exact Team stream DTO -> strict browser admission -> one execution owner (`DS-007`, `DS-014A`–`DS-014J`) | Exact persistent/task attribution and supported initial/pre-run status are structurally enforced from real producer to consumer |
| BEH-015 | fresh/terminal TeamRun predecessor plus terminal `20260703...` token record with old `{segments}`; target converter currently hidden under the skipped old ID and row writes are independent | shared TeamRun decoder -> pending `20260801...` TeamRun/task conversion -> strict token planning -> one store transaction -> exact canonical gate -> target-only readers (`DS-009A`–`DS-009D`, `DS-013A`–`DS-013D`) | Display divergence is safe; token task chains remain exact; completed IDs never rerun; plan/transaction failure mutates zero token rows and blocks startup |
| BEH-016 | transports/SDK/web expose route/path bundles; frontend additionally mixes draft/topology/task/presentation in optional mutable nodes and public raw-key maps; exact V4 application gates admit legacy SDK shapes | exact V5 application admission + identity-free `TeamLaunchDraft` + immutable `TeamTopologySnapshot` + private valid `TeamExecutionState` + typed views (`DS-012`, `DS-014`, `DS-015A`–`DS-015G`) | Observable pre-launch/UI/API behavior and latest selected-TeamRun gating are preserved without provisional/placeholder execution, raw-key parsing, or alternate identity |
| BEH-017 | memory scope name conflates concrete lineage with topology | execution resolver -> storage-private `ancestorTeamRunIds` (`DS-008`) | Physical memory/context paths remain unchanged |
| BEH-018 | no single required imported nested-Team scenario spans all three live runtimes with fixed test models and isolated secrets | staged package import -> fresh per-runtime TeamRun -> collaboration/task/restore spines -> redacted matrix evidence (`DS-011`) | Real provider lifecycle parity is proved without mutating source packages or operational data; unavailable/skipped is not Pass |
| BEH-019 | native AutoByteus content omits the start-owned type; provider/consumer paths repeat, default, or recover segment identity/type/text inconsistently; ticket code can mechanically construct a segment without a turn even though supported provider ingress owns an exact turn | provider exact-turn admission/rejection -> minimal source -> run-owned lifecycle admission/enrichment -> complete canonical processor/listener fan-out -> exact turn-diagnostic/transport/presentation (`DS-017A`–`DS-017G`) | Ordinary output and file/history/output projections remain correct without guessed identity/type/end text; unsupported turnless input stops before AgentRun; the real turn diagnostic stays observable and non-terminal; no second lifecycle owner exists |

## Relevant Supplemental Task Artifacts

| Artifact | Authority |
| --- | --- |
| [agent-team-addressing-handoff-contract.md](./agent-team-addressing-handoff-contract.md) | Normative recipient grammar, AgentTeam coordinator targeting, handoff authoring/projection, intrinsic Team tools, filesystem-like system instruction, and shared message/task behavior |
| [agent-team-collaboration-system-instruction.md](./agent-team-collaboration-system-instruction.md) | Normative exact Agent-facing renderer template and AutoByteus/Codex/Claude system-instruction injection contract |
| [team-run-canonical-identity-refactor.md](./team-run-canonical-identity-refactor.md) | Normative SR-024-aligned rooted schema, recipient/handoff seam, execution address, corrected TeamRun/token predecessor migration chains, direct forward-only V5 application target, complete status/stream/frontend boundary linkage, storage contract, case spines, and verification seams |
| [team-stream-execution-projection-contract.md](./team-stream-execution-projection-contract.md) | Normative correlated TeamRun events, shared Agent binding/status snapshot, strict shared Team WebSocket contract, immutable topology/concrete-execution model, `TeamExecutionState` ownership, nineteen case spines, removal inventory, and verification seams |
| [agent-segment-lifecycle-contract.md](./agent-segment-lifecycle-contract.md) | Normative minimal provider segment facts, sole run-owned lifecycle state, canonical content enrichment, exact order/replay/cleanup behavior, one downstream exact-turn diagnostic branch, exhaustive Codex provider-local turn admission, removals, and actual-boundary proof seams |
| [nested-classroom-live-validation-contract.md](./nested-classroom-live-validation-contract.md) | Normative downstream fixture staging/import, isolated-secret preparation, three-runtime/model matrix, live assertions, evidence, result classification, and cleanup |

Requirements remain authoritative if wording conflicts. ARCH-REV-017 resolves DR-001–DR-011 and reconfirms every cumulative accepted boundary. DR-012 is the current bounded Design Impact trigger; SR-024 removes only the product-unreachable unknown-event policy/exemption machinery while preserving the exact four-family first-boundary resolver, sole downstream diagnostic, opaque message, valid MCP ordering, and admitted-only debug. Rooted identity, migration, direct V5 application, Team status/event/wire, frontend execution, task activation, provider tool, storage, and the exact Agent-facing copy remain unchanged.

## Task Design Health Assessment (Mandatory)

- Change posture: `Comprehensive Refactor`.
- Design issue signal: `Yes`.
- Root causes: parallel identity authorities, kind-ambiguous run fields, root/nested shape asymmetry, copied/localized child state, duplicated execution locators, synthetic task-instance objects that restate a root-scoped task record/execution address, token columns that restate canonical JSON identity, prior migration/application boundary omissions already corrected, the corrected Team stream/frontend ownership gaps, and a segment-lifecycle cut that originally omitted current processors/listeners while admitting a mechanically constructible but product-unreachable turnless segment shape.
- Design-principle response:
  - one authority per meaning;
  - preserve genuine facts and useful locality;
  - semantic separation without unnecessary persisted normalization;
  - discriminated unions make illegal cross-kind fields unrepresentable;
  - derived indexes remain disposable runtime views;
  - migration owns legacy knowledge; current runtime is strict;
  - legacy-field equality is required only when fields carried the same historical meaning;
  - every supported predecessor state has a separately executable target migration-ID path;
  - one canonical aggregate record owns cross-store target identity, while each database store owns its transaction;
  - migration plans validate completely before the first mutation and summaries describe committed outcomes only;
  - cross-process contracts use one exact runtime-validated DTO/schema authority;
  - immutable topology and concrete execution are different subjects, not optional variants of one node;
  - the draft refers to the existing definition catalog instead of copying a second definition topology;
  - root/task Team run identity derives from the execution address; only a child persistent Team stores its distinct binding;
  - root-TeamRun-scoped task ID owns task management while the task record's execution address owns concrete execution; cross-root selection names both scope and ID and no synthetic instance identity is standardized;
  - canonical token execution JSON owns Team execution identity; a named expression index serves root-query performance without another writable root field, and one migration-store transaction owns row plus schema contraction;
  - application producer execution identity belongs to the concrete Agent execution, not immutable topology; task variants rebind that one context instead of carrying the persistent producer address;
  - one lifecycle owner exposes typed commands/queries while private pure modules support rather than bypass it;
  - the internal concrete union/index never escapes through a broad getter; consumers receive subject-specific immutable views;
  - execution projection lives in a `teamExecution` capability rather than under streaming transport, so launch/restore/history are not made transport dependents;
  - invalid wire or partially known execution state is rejected/absent instead of normalized or padded with placeholders;
  - lifecycle correlation belongs to the first common serialized run owner; providers state only externally known facts and downstream projections stay stateless;
  - start establishes segment type once, canonical content carries the derived fact for late consumers, and no consumer guesses or reparses it;
  - tool output contains only facts needed for the Agent's next decision;
  - Team-owned protocol capabilities are materialized by Team runtime rather than duplicated in package configuration;
  - thin adapters preserve operation-specific domain values; and
  - physical storage ownership is not confused with logical address.
- Why the refactor is proportionate: the user explicitly selected the comprehensive clean state and accepts migration/API/frontend work; leaving any project-owned path/route boundary would recreate the competing authority.

## Terminology

| Term | Meaning |
| --- | --- |
| `AgentTeamAddress` | Canonical absolute logical coordinate for an Agent or AgentTeam node; `/` is valid only for AgentTeam contexts |
| `recipient_address` | Sole public logical-recipient field on `send_message_to` and `delegate_task` |
| `RecipientAddressExpression` | Opaque parser-constructed `/...` or `./...` request value carried internally after validating external `recipient_address` and resolved immediately to `AgentTeamAddress` |
| `rootTeam` | Uniform root AgentTeam node in `team_run_metadata.json` |
| `coordinatorAddress` | Configured address of the direct Agent that coordinates an AgentTeam |
| rooted TeamRun tree | One self-contained execution snapshot containing nodes, local Agent facts, typed persistent IDs, and recursive children |
| `TeamRunTreeIndex` | In-memory exact-address view derived from the rooted tree; never serialized |
| persistent child TeamRun | Child AgentTeam execution already represented by a node `teamRunId` in root metadata |
| task AgentTeam | Fresh task-scoped concrete execution derived from a selected AgentTeam subtree with new typed run IDs and unchanged addresses |
| `TeamExecutionAddress` | Concrete persistent/task execution locator; not a second logical address |
| `ancestorTeamRunIds` | Storage-private concrete directory lineage |
| compiled handoff | Authored edge rebased/validated against the mounted root and persisted in `handoffs` |
| `HandoffInstruction` | Model-facing `{when,recipient_address}` decision row projected from one authored edge rule |
| application SDK contract V5 | Exact current semantic version for application backend definitions and frontend SDK identity shapes; independent of unchanged manifest/bundle/iframe envelope versions |

Target code and public contracts do not introduce `recipient_name`, `recipient_path`, `ingressAddress`, `CanonicalTeamPlacementAddress`, `MountedTeamTopology`, `TeamAgentLaunchProfile`, `TeamRunBindingSet`, `definitionSnapshot`, `effectiveHandoffs`, or `persistentBindings`.

## Legacy Removal Policy (Mandatory)

Remove rather than deprecate current production uses of:

- `recipient_name` and any `recipient_path` alias in recipient-oriented tool schemas, parsers, manifests, instructions, provider adapters, tests, or project documentation;
- mounted/current `memberName`, `memberPath`, `memberRouteKey` identity bundles;
- coordinator name/route and communication representative structures;
- generic `memberRunId` and duplicate `childTeamRunId`;
- persistent-child path stripping/rebasing/local tree copies and event prefixing;
- duplicate conversation/token/task execution address types;
- task logical name/path/route/template/coordinator bundles;
- integration/API/SDK route/path aliases;
- frontend route-key/scoped-route identity and compatibility maps; and
- normal-reader legacy normalization.
- the generic communication result envelope, caller/source repetition, and `HANDOFF_RULES_RETRIEVED` success code on the model-visible `get_handoff_rules` path; and
- package `toolNames` as a prerequisite for Team collaboration protocol tools; and
- current V4 backend-definition/frontend-SDK exports, declarations, manifests, definitions, or generated/vendored project artifacts; non-target literals may exist only in strict-parser tests, never production compatibility code.

Legacy shapes remain only in migration input modules/fixtures under a narrow explicit source allowlist. Definition-local `memberName`, unrelated filesystem paths, address-derived storage encoding, and opaque provider payload keys are not active mounted identity and may remain.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

| Data class | Outcome | Reason |
| --- | --- | --- |
| AgentTeam definitions/handoffs | Directly usable | Local authoring names remain valid; missing handoffs mean `[]` |
| TeamRun metadata | Migration required | Must validate/remove parallel identities and emit uniform rooted v3 tree |
| Communication/task JSON | Migration required | Replace path/task bundles with `TeamExecutionAddress` |
| Token usage DB | Migration required | Replace duplicate execution-address schema transactionally |
| External-channel bindings | Migration required | Replace route/path pair with address selector |
| Application platform DBs | Discard/rebuild | Unused feature has no supported predecessor cohort; recreate project fixtures/databases directly in current schema and add no migration reader |
| Application bundle code/artifacts | Direct target replacement | Move all project-owned source/generated/vendor/importable outputs atomically to exact V5; non-target external inputs are unsupported |
| Derived indexes/caches | Discard/rebuild | They are views of migrated authoritative data |
| Agent memory directories | Directly usable | Concrete run-ID lineage remains truthful |
| Final context files/locators | Directly usable | Derive same storage segments from address |
| Opaque provider raw payloads | Directly usable | Historical display data, never routing input |

### Migration Plan

1. Keep the registry order `20260517_team_run_metadata_member_tree` -> the two pre-existing token model/provider backfills -> `20260801_team_canonical_identity` -> later unrelated derived/index migrations. Registry array order, not the date embedded in an ID, is authoritative. The token backfills are attempted first but are not canonical prerequisites under the established runner. For the provider-name backfill, have its migration-local database execute `SELECT *` for the complete ledger/candidate rows; pass only `id`, `runtime_kind`, `model_provider`, `provider_name`, and `model_identifier` into classification; and snapshot the discovered physical row by lexically sorted column name while excluding only `provider_name`. After each guarded update, re-read and require the exact same column set and values for every other field. This works before contraction and on a later retry after contraction without statically naming any removed identity/display column.
2. Let `AppDataMigrationRunner` preserve its terminal-record rule. If `20260517...`, historical `20260703_token_usage_execution_address_backfill`, or either historical narrow column-drop ID is `SUCCEEDED`/`SUCCEEDED_WITH_WARNINGS`, never reset it or depend on changed code under it. Remove the old semantic converter and both narrow column-drop definitions from the current registry. `20260801...` remains independently pending for the supported predecessor and is the sole target canonical record for semantic conversion plus physical Team-identity schema contraction.
3. Keep one pure migration-only TeamRun flat decoder in the prerequisite-converter module. It accepts only flat v1 with direct Agent entries, one non-empty display `memberName`, and one non-empty one-segment structural `memberRouteKey`; rejects nested route/memberTree/Team fields; requires any optional hybrid `memberPath` to equal the route; preserves display `memberName` exactly; constructs `memberPath:[memberRouteKey]`; and preserves genuine Agent facts. It never derives structural identity from the display name.
4. When `20260517...` is pending, it uses that decoder, validates the complete staged predecessor through the corrected canonical converter, then backs up and atomically replaces flat input with predecessor `memberTree`. In `20260801...`, accept already-current v3, predecessor `memberTree`, or residual flat v1. Decode residual flat in memory, validate route/path/topology/run/coordinator invariants, and write only final v3. No intermediate or fallback form reaches current runtime.
5. Within `20260801...`, finish every TeamRun/task-record item before token planning. If a TeamRun/task identity source is invalid, record an actionable dependency failure and do not invoke token persistence. Otherwise build the strict task-Team index from current task records, list token rows in deterministic ID order, and use the IR-014 planner to classify every row as exact-current/standalone skip, canonical mutation, or failure.
6. If any task-index or row plan fails, append its precise details, call no token mutation method, return the canonical aggregate `FAILED`, and leave token rows, columns, and indexes unchanged. If every plan is valid, serialize one immutable `TokenUsageCanonicalExecutionAddressUpdate[]` containing only required address mutations.
7. Give `TokenUsageCanonicalIdentityMigrationStore` one mutation method: `applyCanonicalTeamIdentityTransaction(updates)`. Its Prisma/SQLite implementation opens one transaction, applies required `execution_address_json` updates in stable row-ID order, requires exactly one affected row per update, and verifies exact canonical JSON. In that same transaction it removes every still-present obsolete Team identity column (`team_run_path_json`, `member_path_json`, `member_route_key`, `root_team_run_id`, `member_agent_run_id`, `task_agent_instance_id`, `task_agent_run_id`), removes the obsolete root-column index, installs exactly one non-partial `token_usage_ledger_events_execution_root_observed_at_idx` over `json_extract(execution_address_json,'$.rootTeamRunId'), observed_at`, and verifies row count, unique usage IDs, current addresses, final columns, and required indexes. Actual Agent `run_id`, task-operation `task_id`, and all usage/presentation/cost facts remain unchanged. Per-row or independent column-drop APIs are removed.
8. Do not add a Prisma migration that drops those input columns before app-data conversion. Historical Prisma migrations still establish the predecessor physical table on a fresh install; the target `schema.prisma` and generated client omit obsolete fields while the migration-local raw store alone reads and removes them after planning. SQLite DDL and row changes are one transaction, so any update, drop, index, or verification failure rolls back both data and schema. An empty row-update list still runs when obsolete columns remain; an exact-current/clean table skips.
9. Only after the combined transaction commits may token row/column details count as `MIGRATED`. On failure, the token item reports zero migrated rows/columns plus one actionable database failure (and affected row identities as bounded detail), `20260801...` returns `FAILED`, and the migration record remains retryable. A crash after commit but before record completion is recovered idempotently: the next non-terminal/stale retry sees exact-current rows and target columns/indexes, performs no duplicate mutation, and can complete the record.
10. Enumerate only supported released canonical subjects through their established store owners. Files use final validation + backup + same-directory atomic rename. Do not call `ApplicationPlatformStateStore.listExistingPlatformDatabasePaths()` from canonical migration: application project fixtures/databases are reset/rebuilt directly to current schema and are not migration items.
11. `server-runtime.ts` keeps one targeted pre-listen check: `20260801...` must be exactly `SUCCEEDED`. Missing, `FAILED`, `RUNNING`, or `SUCCEEDED_WITH_WARNINGS` blocks bootstrap/listen with canonical record/item details; unrelated migration warnings remain non-blocking.
12. Start strict target-only repositories, exact V5 application admission, generated contracts, SDKs, integrations, and web client only after canonical success. Token root-Team lookup uses raw SQL with `WHERE json_extract(execution_address_json,'$.rootTeamRunId') = ?` and chronological ordering through `token_usage_ledger_events_execution_root_observed_at_idx`; it does not reintroduce a Prisma/writable root field.

For TeamRun metadata, route/path are the sole duplicated structural pair. Historical `memberName` is presentation, not a third identity assertion. Genuine Agent fields, role/description, timestamps, handoff rule text/order, configured coordinator meaning, and concrete run IDs remain preserved under their target owners.

## Data-Flow Spine Inventory

| Spine ID | Trigger | Terminal outcome | Owner |
| --- | --- | --- | --- |
| DS-001 | Root TeamRun launch | Root manager has immutable v3 metadata/index | AgentTeam execution |
| DS-002 | Persistent child materialization | Exact child manager shares root snapshot | Mixed AgentTeam runtime |
| DS-003 | TeamRun restore | Historical root/children become executable without definition reread | Run history + AgentTeam execution |
| DS-004 | `send_message_to(recipient_address)` | Exact Agent receives once and event carries execution address | Agent collaboration + Team delivery |
| DS-005 | `delegate_task(recipient_address)` to Agent | Task Agent created under current lifecycle | Task delegation |
| DS-006 | `delegate_task(recipient_address)` to AgentTeam | Task AgentTeam with fresh IDs enters through configured coordinator | Task delegation + task Team factory |
| DS-007 | Runtime event / client command | Exact persistent/task execution round trips | Team events/WebSocket/frontend |
| DS-008 | History/memory hydration | Exact rooted node and physical files are projected | Run history + storage |
| DS-009A–D | Startup over fresh flat, terminal-prerequisite, unsafe, or retry/current TeamRun data | Canonical v3 succeeds or startup blocks with byte-stable evidence | App-data runner + stable prerequisite + canonical migration |
| DS-010 | Team Agent completes work or stops blocked | Applicable handoffs are delivered or the Agent completes normally | Team runtime instruction + Agent collaboration |
| DS-011 | Downstream live validation starts | Three fresh imported nested-classroom TeamRuns produce redacted passing evidence across AutoByteus, Codex, and Claude, or the matrix reports a truthful blocker/failure | API/E2E environment + execution ownership |
| DS-012A–D | Project application source/artifact build, exact validation, launch, or consistency check | Every project-owned artifact/database is target-consistent; exact V5 code launches and non-target input stops at ordinary strict validation; no application migration/compatibility path exists | Application SDK contracts + build outputs + existing exact manifest/definition parsers/loaders |
| DS-013A–D | Startup encounters legacy/current token rows with absent or terminal historical token record | Pending canonical owner commits exact addresses once, or zero rows change and the exact startup gate remains closed | `20260801...` canonical aggregate + token migrator/planner/index + transaction-owning migration store |
| DS-014A–J | Live Agent/task/communication/member-input/external/control event, exact client command, initial Agent-status snapshot, pre-run command-status overlay, or invalid raw Team message | Exact current DTO is admitted and applied to its one owner, or invalid input mutates nothing | shared Agent binding/status snapshot + correlated TeamRun events where an event exists + `@autobyteus/team-stream-contracts` + strict server/browser adapters |
| DS-015A–G | Draft launch/failure plus fresh/live/restored/focused/terminal frontend Team execution | Identity-free launch draft, immutable topology, one valid concrete execution state, and typed UI views | launch owner + frontend `TeamExecutionState` aggregate + private transitions/navigation projector |
| DS-016A–B | Persistent or task-scoped Team AgentRun is constructed with an application assignment | `AgentRunConfig` contains a producer address equal to that exact concrete execution, or construction fails before the run exists | existing `MixedAgentMemberHandle` AgentRun-construction boundary |
| DS-017A–G | Provider segment, provider turn-admission failure, exact-turn lifecycle violation, file/history/output consumer, late subscription, or turn/run cleanup | Valid provider input becomes one exact-turn source and then one canonical event consumed by the complete fan-out; invalid turn identity stops before AgentRun; admitted lifecycle violations may become the existing non-terminal turn diagnostic | provider session/converter ingress + run-owned lifecycle/first transformer + consumer-specific projection owners + strict transports |

## Primary Execution Spine(s)

### DS-001 — Root launch

```text
API/frontend definition ID + Agent launch inputs
  -> AgentTeamDefinitionService loads definition closure
  -> TeamDefinitionGraphResolver validates references/cycles
  -> TeamRunTreeCompiler assigns addresses/coordinators/handoffs and Agent facts
  -> TeamRunLaunchIdentityAssignment assigns agentRunId/teamRunId
  -> TeamRunMetadataV3 validator/writer
  -> TeamRunTreeIndex derives exact lookup
  -> TeamRunExecutionContext {rootTeamRunId, teamAddress:"/", metadata, index, taskTeamRunIds:[]}
  -> MixedTeamManager materializes direct children
```

### DS-004/DS-005/DS-006 — Shared recipient spine, separate operations

```text
caller {rootTeamRunId, memberAddress} + wire recipient_address: string
  -> RecipientAddressExpressionParser
  -> parsed recipientAddress: RecipientAddressExpression
  -> caller-relative/root-absolute resolver
  -> AgentTeamAddress
  -> TeamRecipientResolver exact rooted-index lookup
  -> ResolvedTeamRecipient
       Agent {kind:"agent",address}
       AgentTeam {kind:"agent_team",address,coordinatorAddress}
  -> send: root-manager private handle resolution and delivery
  -> task: direct-current-Team eligibility, exact node selection, task runtime allocation
```

The resolver result is identical for both operations and contains no node/config/run/handle/lifecycle object.

### DS-010 — Completion-time handoff guidance

```text
TeamRun member materialization
  -> Team capability composer adds bound get_handoff_rules + send_message_to
  -> provider system-instruction seam renders caller address + filesystem-like protocol
  -> Agent completes assigned work or reaches a blocked stopping point
  -> get_handoff_rules()
  -> bound outgoing handoffs
  -> Team collaboration binding supplies exact caller.outgoingHandoffs
  -> HandoffGuidanceProjector flattens edge/rule order
  -> {handoffs:[{when,recipient_address}]}
  -> Agent evaluates each when
  -> every distinct applicable destination in first-applicable order: send_message_to({recipient_address,...}) once
  -> accepted delivery permits handoff claim; otherwise report failure
  -> no applicable row: complete normally
```

The prompt carries stable protocol only, never the handoff set or complete topology. The tool result carries only the two facts needed at the decision point. Provider adapters serialize that result without adding a generic service envelope.

### DS-011 — Imported nested-classroom live validation

```text
isolated app-data root + isolated secret database
  -> copy nested-classroom-test into one test-owned package root
  -> apply only the recorded test overlay for current recipient syntax/handoffs
  -> importAgentPackage(LOCAL_PATH, absolute staged root)
  -> for each runtime row: create a fresh root TeamRun with one effective member configuration
       autobyteus       -> gpt-5.6-luna
       codex_app_server -> gpt-5.6-luna + reasoning_effort:medium
       claude_agent_sdk -> authenticated catalog-exposed Claude model, exact ID recorded
  -> observe rooted topology + intrinsic tools/instruction + minimal handoff result
  -> exercise AgentTeam message coordinator + nested relative/root delivery
  -> exercise task-AgentTeam delegate/submit/review + distinct execution identity
  -> terminate/restore where supported
  -> redact and record one attributable evidence row
  -> all three pass, or report truthful Blocked/Fail and clean isolated state
```

The fixture source and `$HOME/.autobyteus/server-data/.env` are read-only inputs. `pnpm secrets:import` targets only the isolated database. No live result is inferred from adapter mocks, and no skipped row can satisfy the terminal condition.

### DS-012 — Forward-only application SDK V5 cut

DS-012 is a bounded target-artifact spine, not a compatibility or migration subsystem. The application framework has no supported user/predecessor cohort. The contracts package owns the exact current semantic version/types; project builds own generated outputs; existing parsers/loaders own ordinary target validation; and fresh project fixtures/databases are created directly in the current schema.

#### DS-012A — Project-owned V5 artifact production

```text
@autobyteus/application-sdk-contracts source
  -> define BACKEND_DEFINITION_CONTRACT_VERSION_V5 = "5"
  -> define FRONTEND_SDK_CONTRACT_VERSION_V5 = "5"
  -> replace V4 route/path identity types with canonical address/execution types
  -> build contracts dist
  -> build backend SDK + frontend SDK against that dist
  -> update brief-studio + socratic-math-teacher source application.json
  -> update their backend/bundle.json + backend definition + build scripts
  -> regenerate backend dist + UI vendor contracts + importable-package outputs + fresh target-schema test DBs
  -> package-consistency verifier compares every declared/current contract value and forbidden field inventory
  -> terminal: all project-owned executable/importable artifacts are internally V5-consistent
```

`APPLICATION_MANIFEST_VERSION_V4`, `APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1`, and `APPLICATION_IFRAME_CONTRACT_VERSION_V4` remain unchanged. They version independent envelope/transport shapes; application manifest V4 and backend bundle V1 now declare frontend/backend SDK compatibility V5. Generated/vendored files are outputs of the source build, not alternate hand-maintained authorities.

#### DS-012B — Exact target validation

```text
application package input
  -> parseApplicationManifest requires current envelope + frontendSdkContractVersion = "5"
  -> parseApplicationBackendManifest requires current bundle envelope + both SDK declarations = "5"
  -> ApplicationBackendDefinitionLoader requires definitionContractVersion = "5"
  -> any mismatch is an ordinary exact-schema/load error before exposure/hook/handler execution
  -> exact target continues; invalid input stops
```

There is no version negotiation, V4-specific adapter, quarantine/upgrade/reinstall state machine, predecessor bundle reader, or external package rewrite. The parser may report the offending field and expected current value as normal validation information, but production owns no historical compatibility policy.

#### DS-012C — Exact V5 catalog and backend launch

```text
application.json manifestVersion = "4", frontendSdkContractVersion = "5"
  -> application manifest parser accepts unchanged manifest schema + exact frontend SDK target
  -> backend/bundle.json contractVersion = "1", sdkCompatibility = {backendDefinition:"5", frontendSdk:"5"}
  -> backend manifest parser accepts unchanged bundle envelope + exact SDK targets
  -> validated bundle enters catalog/open path
  -> ApplicationEngine creates isolated worker load request
  -> ApplicationBackendDefinitionLoader imports definition module
  -> validate definitionContractVersion = "5" before exposures, hooks, or handlers are made executable
  -> canonical application launch/binding/target/input/event adapters operate only on memberAddress/TeamExecutionAddress and typed run IDs
```

If manifests claim V5 but the loaded definition is not V5, the loader returns its ordinary exact-contract failure and no lifecycle hook or handler runs.

#### DS-012D — Target consistency and no-migration proof

```text
source/build inventory
  -> assert SDK source/dist + application source/vendor/importable declarations all equal V5
  -> assert canonical application address/execution types contain no removed route/path/generic-run fields
  -> assert fresh application test DB/fixtures use only the current schema
  -> assert `20260801...` inventory contains no application bundle/database item
  -> assert production has no application predecessor decoder, migration, V4 adapter, special quarantine/upgrade branch, or fallback
  -> exact V5 package launch exercises canonical binding/target/input/producer event end to end
```

Project-owned application databases may be deleted/recreated as test/setup data; production migration code never opens a predecessor application database. A strict-parser negative test may use a non-target version literal, but no production compatibility branch or migration follows from it.

### DS-009 — TeamRun predecessor migration cases

#### DS-009A — Fresh safe historical flat input

```text
startConfiguredServer
  -> AppDataMigrationRunner.runPending() sees no terminal 20260517 record
  -> TeamRunMetadataMemberTreeMigration reads flat memberMetadata
  -> prerequisite converter validates direct structural routes, preserves display memberName
  -> corrected canonical converter prevalidates staged predecessor memberTree
  -> backup flat file -> same-directory temp -> atomic rename to predecessor memberTree
  -> runner records 20260517 SUCCEEDED
  -> runner sees pending 20260801_team_canonical_identity
  -> canonical converter validates route/path + topology, ignores display-name divergence
  -> constructs/validates v3 rootTeam with /program_manager and /qa_specialist
  -> backup predecessor -> atomic replace -> record canonical SUCCEEDED
  -> exact startup gate -> derived indexes -> services/listen
```

The maintained `Program Manager`/`program_manager` and `QA Specialist`/`qa_specialist` fixture is the normative safe example. The display value is preserved only across the predecessor step and is absent from v3.

#### DS-009B — Already-terminal stable prerequisite

```text
operator upgrades application-data directory
  -> migration record repository returns 20260517 SUCCEEDED or SUCCEEDED_WITH_WARNINGS
  -> runPending() skips 20260517 definition; no revised old code executes
  -> pending 20260801_team_canonical_identity classifies each file
  -> predecessor memberTree: canonical route/path/topology validation ignores display memberName
     OR terminal-warning residual/repaired flat: shared flat decoder builds predecessor in memory
        -> same canonical validation, with no intermediate memberTree write
  -> backup original source -> atomic final-v3 replace -> canonical record SUCCEEDED
  -> exact startup gate -> derived indexes -> services/listen
```

`20260801...` is the executable v3 owner. It is a separate ticket-owned/unreleased ID and was absent from the inspected supported operational records; no third migration version is required. Reusing the single migration-only flat decoder closes terminal-warning recovery without duplicating flat semantics or adding a normal-reader fallback.

#### DS-009C — Unsafe flat or contradictory predecessor input

```text
runPending()
  -> stable prerequisite rejects flat nested route / Team fields before backup or replacement
     OR
  -> stable prerequisite is already terminal and canonical migration's shared flat decoder
     rejects the residual unsafe flat item before backup or replacement
     OR
  -> canonical migration rejects missing/disagreeing route/path, invalid parent/duplicate/coordinator/run identity
  -> item detail names file + node + structural invariant
  -> original source bytes remain unchanged; no accepted target is written
  -> 20260801 canonical status is FAILED (or cannot reach exact success)
  -> startConfiguredServer returns before index rebuild/bootstrap/listen
```

A different display `memberName` is never part of this failure set. The maintained unsafe nested fixture remains unsafe because flat v1 cannot reconstruct its topology, not because its label differs.

#### DS-009D — Partial retry and already-current idempotence

```text
next startup after source repair
  -> terminal stable prerequisite remains skipped
  -> failed canonical ID executes again
  -> strict v3 items compare equal and SKIP without new backup
  -> repaired predecessor or residual flat items validate, back up, and convert to final v3
  -> unresolved unsafe items remain byte-stable FAILED
  -> exact canonical SUCCEEDED alone releases startup
```

A fully current installation with terminal success records executes neither converter. A terminal-warning stable record never needs to rerun: the non-terminal canonical ID consumes repaired residual flat input through the shared migration-only decoder. Normal runtime never performs lazy conversion.

### DS-013 — Canonical token migration cases

#### DS-013A — Supported predecessor with terminal historical token record

```text
operator starts supported predecessor -> 20260703 token record becomes terminal with {segments}
  -> operator upgrades and starts target
  -> historical Prisma migrations establish/preserve predecessor token columns; target generated client omits them
  -> pre-existing model/provider backfills are attempted before canonical contraction; either may remain retryable
  -> AppDataMigrationRunner skips historical 20260703 and narrow column-drop records unchanged
  -> independently pending 20260801 canonical owner converts/validates TeamRun + task records
  -> token migrator builds strict task-Team index and plans every legacy/current row
  -> migration store applies/verifies one immutable address batch, removes all obsolete Team identity columns,
     replaces the old root-column index with `token_usage_ledger_events_execution_root_observed_at_idx` in one transaction
  -> 20260801 aggregate records SUCCEEDED
  -> exact canonical gate opens -> strict token reader/hierarchy observes TeamExecutionAddress
```

The same path applies when the old token record is absent: no current definition is registered under that historical ID, and pending `20260801...` directly owns any durable legacy rows or an empty/current database.

#### DS-013B — Invalid task index or token row

```text
20260801 reaches token item after current TeamRun/task conversion
  -> task index reports unreadable/missing/duplicate/conflicting mapping
     OR row planner reports irreconcilable root/chain/member/task-Agent identity
  -> planner returns actionable failures before mutation
  -> transaction store is never called; token rows, columns, and indexes remain unchanged
  -> 20260801 records FAILED -> exact gate blocks bootstrap/listen
```

No row fallback, partial best effort, or `SUCCEEDED_WITH_WARNINGS` result is permitted for this required item.

#### DS-013C — Transaction write/verification failure

```text
all row plans valid -> immutable update batch (possibly empty when only schema contraction remains)
  -> store opens one Prisma/SQLite transaction
  -> earlier update succeeds inside transaction
  -> later update, column drop, expression-index creation, or final verification fails
  -> transaction rolls back every row and schema/index mutation
  -> summary reports migrated rows/columns=0 and one database failure
  -> 20260801 records FAILED -> exact gate remains closed
```

A durable SQLite test forces a failure after an earlier row update and at least one schema operation, then proves the row, complete column set, and indexes are byte/structurally unchanged after rollback.

#### DS-013D — Repair, retry, and exact-current idempotence

```text
operator repairs the invalid source or transient persistence fault
  -> normal startup retries non-terminal 20260801
  -> already-current TeamRun/application/token subjects skip
  -> remaining token plans and obsolete-column contraction commit in one transaction
  -> exact-current second run sees no updates, no obsolete columns, and the exact expression index
  -> 20260801 exact SUCCEEDED; unrelated warning remains non-blocking; startup opens once
```

A process interruption after token commit but before migration-record completion is the same idempotent retry case; no status reset or runtime compatibility reader is needed.

### DS-007 — Concrete execution round trip

```text
runtime/record produces typed TeamExecutionAddress
  -> correlated TeamRun event or exact command DTO
  -> exhaustive Team stream mapper / strict shared serializer
  -> strict browser/server admission
  -> frontend TeamExecutionState or server TeamExecutionResolver
  -> typed exact execution result/effect
```

Serialization is private to the owning boundary; no intermediate consumer parses a key or reconstructs a route. DS-014 closes the asynchronous event boundary, while DS-015 closes browser execution ownership.

### DS-014 — Exact Team event and WebSocket cases

#### DS-014A — Agent event

```text
Agent runtime AgentRunEvent
  -> member bridge verifies raw AgentRun ID
  -> member bridge calls createTeamAgentExecutionBinding(exact address, verified allocated/raw AgentRun ID): address only for persistent/task Agent, address + genuine AgentRun ID for task-Team Agent
  -> TeamAgentEventAdapter validates/maps the exact correlated subtype, filters duplicate Agent collaboration events, and removes raw run identity from details
  -> correlated TeamRunAgentEvent
  -> exhaustive Team mapper over already-correlated details
  -> TeamStreamServerMessage
  -> shared serializer -> WebSocket -> shared strict browser parser
  -> TeamExecutionState validates/materializes the exact Agent execution, then dispatches status/timeline
```

#### DS-014B — Task activation/result submission/result review

```text
Task ledger transition
  -> serialize only this TeamRun's short activation critical section
  -> allocate exact taskRun.address and open bounded new-subtree TaskActivationEventBarrier before runtime start/post
  -> runtime accepts the work packet behind a closed execution gate, emits only synchronous held initialization, and acknowledges preparation-quiescent
  -> rejection/persist failure/overflow discards queue and settles fresh execution
  -> verify final barrier budget before durable write
  -> persist active record
  -> typed TASK_DELEGATION_ACTIVATED publication bypasses barrier
  -> publisher selects record.taskRun.address as the one concrete task executionAddress
  -> release queued runtime events FIFO immediately after activation, then open work execution; later task transitions publish directly
  -> activation carries only task ID + durable base content/sender/references/createdAt/taskRun.startedAt; its type implies active and initial updatedAt derives from startedAt
  -> result signals carry only task ID + event-specific correlation/decision/time; current/previous status, derived update/task-label/terminal fields, repeated base facts, and persistent target/task-Team coordinator ingress are absent
  -> remove duplicate TASK_DELEGATION_STATUS_UPDATED, currently emitted only after the same submission/review transition
  -> one-to-one strict TASK_DELEGATION_EVENT DTO
  -> browser admission
  -> TeamExecutionState validates target/run chain; activation seeds one durable-confirmed task projection
  -> later signals leave the complete projection untouched and return the root-bound task-record refresh effect
```

#### DS-014C — Communication

```text
accepted Team communication
  -> COMMUNICATION event {senderAddress,receiverAddress,...}
  -> exact TEAM_COMMUNICATION_MESSAGE DTO
  -> strict browser admission
  -> communication projection
  -> sender/receiver presentation through typed execution/topology queries
```

#### DS-014D — Member input

```text
accepted user/inter-Agent input
  -> MEMBER_INPUT event with one outer recipient executionAddress
  -> exact MEMBER_INPUT_MESSAGE payload with execution_address only
  -> strict browser admission
  -> TeamExecutionState resolves exact AgentContext
  -> transcript input once
```

#### DS-014E — Connection/lifecycle/acknowledgement/error

```text
Team session/lifecycle/command result/protocol failure
  -> successful server binding emits CONNECTED {session_id}
  -> bound-root lifecycle emits TEAM_RUN_LIFECYCLE {is_active}
  -> exact AGENT_COMMAND_ACK / ERROR builder
  -> shared strict serializer -> browser strict parser
  -> transport session / root persistent-Team lifecycle / command tracker / protocol diagnostic owner
```

The endpoint-bound WebSocket session already owns the root TeamRun scope, so neither control message repeats `team_id`/`team_run_id`. Low-level socket open does not mark the Team application stream ready; only the exact post-binding `CONNECTED` handshake does. Connection/subscription state never enters `AgentTeamContext`; root lifecycle enters only the root persistent-Team execution record.

Initial Agent status follows DS-014I immediately after `CONNECTED` and before the lifecycle snapshot. Connection readiness and status are separate concerns: the snapshot reuses the exact Agent-status projector but is not turned into a `TeamRunEvent`.

#### DS-014F — External user input

```text
accepted external-channel envelope + exact resolved recipient
  -> exact EXTERNAL_USER_MESSAGE with one execution_address
  -> shared serializer -> strict browser admission
  -> TeamExecutionState resolves exact AgentContext
  -> transcript projection once
```

#### DS-014G — Exact Team client command

```text
typed focused Agent execution
  -> Team client command factory requires exact executionAddress
  -> exact SEND_MESSAGE / INTERRUPT / APPROVE / DENY DTO
  -> shared strict serializer -> WebSocket -> strict server parser
  -> exact execution resolver + command owner
  -> delivery/lifecycle event, acknowledgement, or typed ERROR
```

SEND_MESSAGE generates message/dedupe IDs and explicit arrays; approval/denial uses invocation ID plus exact address and has no server-unused approval token.

#### DS-014H — Invalid message/command

```text
raw JSON
  -> strict complete union parser rejects unknown/missing/surplus/alias/invalid identity
  -> typed protocol diagnostic
  -> zero task refresh, execution/focus mutation, communication projection, transcript dispatch, or command execution
```

#### DS-014I — Initial connection/open/restore Agent status snapshot

```text
Team workspace connects/opens/restores a bound TeamRun
  -> AgentTeamStreamHandler emits exact CONNECTED {session_id}
  -> TeamRuntimeSnapshotService asks TeamRun.getLeafAgentStatusSnapshots()
  -> mixed persistent/task/task-Team managers enumerate materialized handles plus config-backed offline persistent Agents
  -> each runtime/config owner supplies exact TeamExecutionAddress + allocated AgentRun ID
  -> createTeamAgentExecutionBinding classifies/validates persistent_agent, task_agent, or task_team_agent
  -> one TeamAgentStatusDetails constructor removes TeamRun/name/runtime/raw-ID/task-instance/execution duplicates
  -> immutable TeamAgentStatusSnapshot {execution,details,statusHint}
  -> projectTeamAgentStatusMessage, the same projector used by the live AGENT_STATUS arm
  -> shared strict serializer -> WebSocket -> shared strict browser parser
  -> TeamExecutionState validates the binding and dispatches the same AgentContext status transition
  -> exact scoped TEAM_RUN_LIFECYCLE {is_active}
```

For a task Agent, the constructor requires `executionAddress.taskAgentRunId === allocated agentRunId` and transports no duplicate ID. For an Agent inside a task AgentTeam, it requires a non-empty task-Team run chain, null task-Agent ID, and the genuine member AgentRun ID supplied by the child mixed context/config; that ID appears exactly once in the binding. Persistent Agent bindings contain no run ID. `TeamRuntimeSnapshotService` never constructs a `TeamRunEvent`, never uses generic `ServerMessage`, and never parses or guesses a binding. `TeamRunLiveProjectionService` consumes the same immutable snapshot through a separate typed run-list mapper; it does not reuse the WebSocket DTO or strip a generic payload bag.

#### DS-014J — Pre-run send/delegation status overlay and replacement

```text
send_message_to or delegate_task selects an unmaterialized persistent/task/task-Team Agent handle
  -> handle already owns exact TeamExecutionAddress + allocated AgentRun ID before ensureReady()
  -> same createTeamAgentExecutionBinding constructor
  -> MemberCommandStatusOverlayStore receives the typed binding and exact initializing/error facts
  -> store keeps only TeamAgentStatusDetails by private canonical execution key
  -> TeamAgentStatusSnapshot {execution,details,statusHint}
  -> createTeamAgentStatusEvent(snapshot) constructs the correlated AGENT/AGENT_STATUS TeamRunEvent
  -> task activation barrier applies when this is a newly prepared task subtree
  -> same Team Agent status projector -> strict serializer/parser
  -> same TeamExecutionState/AgentContext status transition
  -> successful first matching real correlated AGENT_STATUS publication replaces status through the same path
  -> member bridge calls clearAcceptedLiveStatus(binding); exact binding equality deletes only that overlay
```

The overlay owns temporary pre-run status details, not execution identity. It accepts no display name, runtime kind, TeamRun ID, task instance, raw Agent ID, or fallback route shape. `createTeamAgentStatusEvent(snapshot)` is event-only; the connection-snapshot path does not call it.

### DS-015 — Frontend concrete execution cases

#### DS-015A — Launch draft to fresh persistent state

```text
definition/configuration UI -> TeamLaunchDraft
  -> logical member focus + pending input; no TeamExecutionAddress/AgentContext/run ID
  -> launch owner sends config
  -> server returns canonical metadata with real Team/Agent run IDs + exact active lifecycle
  -> launch owner assembles closed projection input with logical Agent focus + one fresh identity-free Agent seed per metadata Agent
  -> TeamRunFrontendProjectionBuilder validates/splits once
  -> run-ID/execution-address-free immutable TeamTopologySnapshot with logical/effective-launch root + private address index
  -> one PersistentTeamExecution/PersistentAgentExecution per metadata node; Agent execution consumes typed application producer context
  -> TeamExecutionState seed + exact initial focus/root lifecycle
  -> transfer pending input to exact real execution once
  -> replace selected draft with TeamRun context atomically
  -> typed workspace/history/navigation rows
```

#### DS-015B — Task Agent

```text
validated task event or active task record with taskAgentRunId
  -> locate immutable source Agent topology node
  -> preserve stable application assignment and rebind producer to the exact task execution
  -> create/update TaskAgentExecution + AgentContext
  -> execution stores one taskId reference; the single task-projection index supplies lifecycle/timeline/presentation
```

#### DS-015C — Task AgentTeam and nested task AgentTeam

```text
validated task event/record with ordered taskTeamRunIds
  -> locate immutable source AgentTeam topology node
  -> create TaskTeamExecution root with real last taskTeamRunId
  -> later exact Agent event/hydration with real AgentRun ID
  -> preserve the source Agent's stable application assignment and rebind producer to the exact task-Team-Agent execution
  -> create TaskTeamAgentExecution
  -> nested delegation appends one run ID and repeats
```

No topology subtree is cloned and no absent descendant receives an empty run ID.

#### DS-015D — Restore/hydration convergence

```text
open TeamRun -> resume owner obtains canonical metadata + exact lifecycle + requested logical Agent focus + complete loaded/historical-unloaded Agent seeds
  -> one projection builder creates immutable run-ID/execution-address-free topology + complete persistent execution/application-binding graph
  -> complete root-scoped durable task-record response parent-before-child
  -> TeamTaskProjectionMapper uses each taskRun.address as the enclosing execution, validates expected root plus the distinct delivery receiver against target kind/topology, and emits one all-or-nothing complete snapshot
  -> TeamExecutionState.reconcileTaskSnapshot
  -> stage a task-ID/address-unique monotonic merge: newer row replaces, older input preserves the existing row, equal-time conflict rejects, and a known row absent from a concurrent append-only response remains
  -> enclosing execution record owns concrete task identity; private graph alone derives parent/child edges from that address + topology
  -> exact Agent context/status hydration
  -> same valid state as equivalent live transitions
  -> restore focus only when concrete target exists; otherwise deterministic fallback
```

#### DS-015E — Focus/selection/presentation

```text
user selects typed execution row
  -> TeamExecutionState.focus validates concrete focusability
  -> workspace selection independently owns selected root TeamRun
  -> current row iff selected root and exact focus both match
  -> typed presentation/navigation queries drive desktop/mobile UI
```

#### DS-015F — Terminal cleanup

```text
complete root-scoped durable task-record reconciliation confirms terminal task plus every materialized descendant in the same staged candidate
  -> TeamExecutionState validates one-copy task projections and locates the exact task root
  -> reject the whole snapshot if a descendant is absent/stale/nonterminal; otherwise atomically retain terminal projections, then remove the exact concrete subtree + AgentContexts + graph edges
  -> repair focus atomically
  -> derived reactive navigation/history views recompute once from committed aggregate state
```

#### DS-015G — Draft launch failure

```text
TeamLaunchDraft -> launch/import/config/server failure
  -> no topology/execution context is constructed or registered
  -> draft config, logical focus, and pending input remain unchanged
  -> actionable error; retry requests one fresh server allocation
```

### DS-016 — Exact application producer binding at Team AgentRun construction

#### DS-016A — Persistent Team Agent

```text
MixedAgentMemberHandle.ensureReady
  -> handle derives exact persistent TeamExecutionAddress
  -> node-local ApplicationExecutionContext is null or its producer address must equal that address
  -> mismatch fails before AgentRunConfig / AgentRun creation
  -> matching context enters AgentRunConfig unchanged
  -> Agent runtime, published artifact, and application event/stream use that one producer
```

#### DS-016B — Task Agent or Agent inside a task AgentTeam

```text
MixedAgentMemberHandle.ensureReady
  -> handle derives exact task TeamExecutionAddress from runtime task-Team chain/task-Agent identity
  -> node-local ApplicationExecutionContext supplies only stable applicationId/bindingId/displayName/runtimeKind
  -> handle replaces producer.executionAddress with the exact task execution
  -> rebound context enters AgentRunConfig before AgentRun creation/restore
  -> Agent runtime, published artifact, and application event/stream attribute the task execution at source
```

Task versus persistent is decided only from the handle's already-typed concrete execution address (`taskTeamRunIds` non-empty or `taskAgentRunId` non-null). No lookup, root/local guess, browser repair, or second application binding is introduced.

### DS-017 — One AgentRun segment lifecycle and complete canonical fan-out

#### DS-017A — Native/provider source to canonical content

```text
AutoByteus native start(type) -> content(no type) -> end(no type)
  OR Codex/Claude normalized explicit start -> minimal content/end
  -> provider session supplies/resolves exact active turn
  -> provider converter rejects missing/empty/inactive/conflicting turn before enqueue
     OR emits generic AgentRunEvent with exact-turn minimal source fields
  -> AgentRunEventDispatchQueue serializes the run
  -> first AgentSegmentLifecycleEventTransformer strictly parses the candidate
  -> run-owned AgentSegmentLifecycleState records type at (turnId,segmentId)
  -> content is enriched once to {id,turn_id,segment_type,delta}
  -> remaining pipeline processors/finalizer -> listeners
```

AutoByteus uses its required native handler turn, Claude uses the turn allocated by `ClaudeSession` and passed to its projectors, and Codex uses the one DS-017D provider-local admission result. A rejected candidate produces zero AgentRun events and only the sanitized internal protocol record. The cached default pipeline owns no segment state. `AgentRun` passes its private state in the transformer input. Successful command acceptance with a known turn ID and explicit `TURN_STARTED` facts open/confirm the same turn inside the queue; a first exact segment start may refine an otherwise-anonymous active turn. No ID parsing, first-field-wins selection, broad item-prefix inheritance, or runtime-kind switch participates.

#### DS-017B — Team and standalone return paths

```text
canonical AgentRun segment/error event
  -> standalone Agent stream mapper -> strict Agent wire
  OR verified MixedAgentMemberHandle -> stateless TeamAgentEventAdapter
     -> correlated Team event -> strict Team projector/serializer
  -> strict browser parser
  -> exact {turnId,segmentId} segment transition OR exact diagnostic transition
  -> one AgentContext presentation update
```

Canonical content retains required type so a late subscriber that missed start can truthfully materialize the exact typed segment. Existing segments require type agreement. End without a local segment is a no-op. Error projection carries required nullable `error_scope`, `error_effect`, and `turn_id`; no adapter drops or reconstructs evidence.

#### DS-017C — Application streaming

```text
canonical standalone content OR correlated Team Agent content
  -> one pure projectTextDelta({segmentType,delta})
  -> exact text content becomes one application delta
  -> every non-text type produces no application text delta

canonical Agent error
  -> resolve AgentRunErrorEvidence once
  -> TURN_DIAGNOSTIC produces no application failure
  -> TURN_TERMINAL / RUNTIME_GLOBAL / established unclassified error preserve their established behavior
```

The application projector is a stateless representation boundary, not a segment or diagnostic registry.

#### DS-017D — Exact provider turn admission and invalid lifecycle facts

**Common provider-versus-AgentRun boundary:**

```text
provider native segment candidate
  -> provider session requires/resolves exact active turn
  -> provider-local rejection
     -> zero AgentRun events + sanitized internal protocol record; stop
  -> exact-turn source event enters AgentRun lifecycle transformer
  -> unknown type / content before start / conflicting start
     / content after end / retired-turn event / surplus source type
     -> reject before state change or listener dispatch
     -> optional TURN_DIAGNOSTIC {scope:turn,effect:diagnostic,turn_id:exact turn}
  -> lifecycle finalizer emits unchanged status
  -> exact standalone/Team/browser turn-diagnostic projection
```

**Codex first-native-boundary admission spine:**

```text
Codex client/router selects one CodexThread for native method + params
  -> CodexThread.handleAppServerNotification(method, params)
  -> native method belongs to exact four-name set?
     -> no: build readonly native_admitted copy; preserve operation-owned handling
     -> yes:
        -> exact activeTurnId := CodexThread.activeTurnId, else null
        -> resolveCodexSegmentTurnAdmission(nativeEventName, params, activeTurnId)
           -> collect every present candidate from
              params.turn_id / params.turnId /
              params.item.turn_id / params.item.turnId / params.turn.id
           -> any present non-string or blank
              => CODEX_SEGMENT_TURN_EXPLICIT_INVALID
           -> no non-empty active turn => CODEX_SEGMENT_TURN_INACTIVE
           -> multiple normalized values or single value != active
              => CODEX_SEGMENT_TURN_CONFLICT
           -> internal call outside exact set with omitted turn
              => CODEX_SEGMENT_TURN_OMISSION_UNLISTED
           -> rejection: sanitized reason record; return before every other effect
           -> admission: build readonly native_admitted using paramsWithExactTurn
  -> codex-thread-notification-handler consumes that admitted message
     -> valid MCP pending add/remove + local_derived completion where applicable
     -> emits original native_admitted message from the same canonical params
  -> backend listener -> CodexThreadEventConverter
  -> admitted/derived raw debug -> exact item/reasoning conversion
  -> segment-specific constructor emits minimal exact-turn source event
     OR normalization rejection returns zero events; never raw/generic fallback
```

The one production applicability and active-turn-inheritance set is:

```ts
const CODEX_ACTIVE_TURN_INHERITANCE_EVENTS = new Set([
  CodexThreadEventName.ITEM_STARTED,              // item/started
  CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA,  // item/agentMessage/delta
  CodexThreadEventName.ITEM_COMPLETED,            // item/completed
  CodexThreadEventName.ITEM_REASONING_COMPLETED,  // item/reasoning/completed
] as const);
```

`CodexThread` uses only membership in this set to decide whether the resolver runs. There is no open-class `item/*` predicate and no runtime registry of exemptions. The established current non-segment item, raw-response, status, token, thread, turn, and error paths skip segment-turn admission and retain their exact operation-owned routing. Broad `startsWith("item/")` segment construction is replaced by exact converter routing for the current supported event families.

The listener-facing boundary is closed and carries provenance rather than a generic raw notification:

```ts
const codexThreadEventMessageBrand: unique symbol = Symbol("CodexThreadEventMessage");

type CodexThreadEventMessage = Readonly<
  (
    | {
      source: "native_admitted";
      method: string;
      params: Readonly<JsonObject>;
    }
    | {
      source: "local_derived";
      method: string;
      params: Readonly<JsonObject>;
    }
  ) & { readonly [codexThreadEventMessageBrand]: true }
>;
```

`CodexThread` owns the unexported brand and the only private production constructors/emitters of this union; downstream code can import the opaque type but cannot structurally manufacture it. For any governed native name, the first variant can be constructed only from an accepted resolver result and uses its exact `paramsWithExactTurn`; for an exact non-governed name it carries one readonly shallow copy made at the same thread boundary. The notification handler accepts that admitted value rather than raw `(method,params)` arguments; it may request that `CodexThread` construct an established local-derived event, but it cannot invoke or bypass admission. `CodexAgentRunBackend` and `CodexThreadEventConverter` consume only `CodexThreadEventMessage`. Direct native-to-converter construction, generic listener input, and casts/fabricated branded values are removed from production and current tests.

These are exactly the current native names whose converter-produced families directly create source segment start/content/end facts. `ITEM_REASONING_COMPLETED` must be admitted before `CodexReasoningEventNormalizer` calls `CodexReasoningBlockTracker`, so the tracker is keyed by the same exact active turn. Later reasoning close actions already contain the tracker-owned turn and do not inherit again. Current reasoning delta/summary-part, plan, approval, file-output-log, raw-response, status, token, thread, and turn events either intentionally emit no source segment or own a different fact; they preserve those operation-owned routes without entering segment-turn admission.

Every explicit candidate must satisfy the invariant; a present invalid field is not treated as omission even if another field matches. Multiple agreeing candidate locations are accepted. Rejection occurs before the notification handler can add/remove pending MCP state, emit a local/original thread message, or touch item/reasoning state, and therefore before listener dispatch, converter/debug entry, segment normalization, AgentRun enqueue, or lifecycle mutation. `logCodexSegmentTurnAdmissionRejection()` records only `{runtimeKind,runId,nativeEventName,reasonCode}` and cannot call the raw-event sink. `logRawCodexThreadEventDetails()` remains converter-owned but accepts only the thread-emitted admitted/derived union, so documented raw-file/debug behavior remains for accepted messages and is structurally unreachable for rejected input. Provider turn rejection is not an Agent/browser event. An admitted exact-turn diagnostic never borrows another turn, guesses from an ID, or terminalizes the run, command, output collector, application stream, external reply, open browser segment/message, or tool. Raw rejected provider payloads and secrets never enter either record.

#### DS-017E — Replay and lifecycle cleanup

```text
same-type active START -> lifecycle-owner replay no-op; no processor/listener sees it
same-type START after END -> replay no-op
repeated END after END -> replay no-op
every accepted CONTENT arrival -> emit exactly once, even if bytes equal prior delta
TURN_COMPLETED / TURN_INTERRUPTED / turn-terminal ERROR -> retire that turn
explicit offline / runtime-global ERROR / accepted AgentRun.terminate -> clear run state
new distinct turn -> retire/clear prior turn, permit segment-ID reuse under new turn
```

The first admitted start is metadata-authoritative. The source has no content event ID, so byte equality never proves replay. Runtime snapshot reconciliation may open/confirm an identified turn before a batch and may perform terminal cleanup after ordered batch facts, but it never invents a segment start or pre-clears final content merely because the backend snapshot has advanced.

#### DS-017F — Complete processor/listener fan-out

```text
canonical AgentRun event
  -> default pipeline processors
     -> FileChangeEventProcessor: exact file-operation context, no end type
     -> Team communication/token processors: event-selective unchanged
  -> lifecycle-status finalizer
  -> ordered AgentRun listeners
     -> RuntimeMemoryEventAccumulator: exact text/reasoning transcript identity
     -> CompactionRunOutputCollector / ImproverRunCompletionWatcher:
        exact text-content aggregation, no end text
     -> direct/Team external-channel parser + collector:
        exact text fragments, turn-complete finalization, diagnostics ignored
     -> application / Team / standalone / browser strict projections
     -> file/artifact relays: event-selective unchanged
```

**File-change bounded local spine:**

```text
first canonical write/edit START
  -> insert exact run+turn+invocation file context once
canonical CONTENT
  -> exact context + stored source-tool agreement -> append -> streaming FILE_CHANGE
canonical END (no type)
  -> exact context -> pending FILE_CHANGE
canonical tool terminal / turn terminal / accepted run termination
  -> consume invocation / clear turn / pipeline-owned clear run
```

File context owns file-operation arguments, target, content, and status only; it cannot read `AgentSegmentLifecycleState`. Memory/history, compaction, skill, and external collectors use private compound identity only for their own transcript/output aggregation. They do not accept missing-start content, alias fields, missing-type-as-text, derived IDs/turns, or terminal text from end. `AgentRunEventPipeline` owns one narrow processor run-release hook invoked by `AgentRun` inside the existing queue after accepted termination.

#### DS-017G — Diagnostic return and consumer behavior

```text
AgentRun ERROR + AgentRunErrorEvidence
  -> LifecycleStatusEventTransformer preserves status for TURN_DIAGNOSTIC
  -> Team/standalone mapper emits exact required nullable evidence fields
  -> strict browser parser
     -> append visible turn-diagnostic row
     -> do not complete message/segment/tool or alter status
  -> external/application/compaction/skill/command/lifecycle observers
     -> ignore TURN_DIAGNOSTIC as terminal/failure evidence
```

`AgentRunErrorEvidence` remains the sole semantic authority and has exactly `TURN_DIAGNOSTIC`, `TURN_TERMINAL`, and `RUNTIME_GLOBAL`. Unclassified existing errors project explicit null evidence fields and retain their established behavior rather than being silently reclassified. Runtime scope plus diagnostic effect is invalid. The Team external-channel parser carries real evidence instead of setting it to null; turn-diagnostic handling returns before any pending-turn creation or deletion.

## Spine Narratives (Mandatory)

- **Root launch:** definition composition and launch inputs meet once in the TeamRun-tree compiler. Persisted output is already the executable aggregate; no later table join is required.
- **Persistent child:** parent manager selects `index.getAgentTeam(childAddress)`, passes the same metadata/index plus `teamAddress`, and materializes only exact direct children. The node's `teamRunId` is the concrete child ID.
- **Restore:** strict v3 parse validates/freeze tree, then uses the same root/child construction as launch. Current definitions are not consulted.
- **Task AgentTeam:** selected persistent node supplies logical addresses, coordinator, and genuine Agent configuration. Factory creates a fresh active execution tree/run directory and registers it by task TeamRun ID. It must not localize addresses.
- **Message:** AgentTeam target maps once to `coordinatorAddress`; root manager keeps handle/config mechanics private.
- **Task:** eligibility is tested only after shared resolution by comparing `parentAddress(recipient.address)` with caller Team address.
- **History/UI topology:** immutable rooted topology is address-keyed and never receives task or presentation mutation.
- **Pre-launch draft:** configuration, logical focus, and pending input remain run-identity-free; only a successful server allocation creates topology/execution state, while failure preserves the draft.
- **Frontend execution:** `TeamExecutionState` privately keys valid concrete executions by exact address, owns live/restore/focus/task-status/task-timeline/cleanup, associates the existing Agent-local projection owner without copying its state, and returns typed view rows; persistent/task instances at one logical address do not collide.
- **Team stream:** correlated domain variants map exhaustively to the strict shared wire union; browser admission finishes before any state mutation. Real producer output, not hand-authored browser mocks, defines the contract seam.
- **Initial Agent status:** a bound TeamRun enumerates one immutable status snapshot per concrete/offline Agent through mixed runtime owners; the snapshot enters the exact Agent-status projector directly because connection state is not a domain event.
- **Pre-run Agent status:** an unmaterialized mixed handle constructs the same execution binding from its already allocated identity, lets the overlay own only temporary details, publishes one correlated status event, and removes the overlay when real Agent status arrives.
- **Segment lifecycle and fan-out:** providers emit only explicit semantic facts; the first common serialized AgentRun transformer owns structural admission, correlation, derived content type, replay, cleanup, and diagnostic classification. Same-type active replay stops there. Default processors and every listener then consume only canonical facts; their file/transcript/output/presentation state remains subject-specific and cannot become lifecycle authority.
- **Migration:** the runner owns ID ordering/terminal skips; one migration-only decoder owns flat semantics; stable `20260517...` owns its pending flat-to-predecessor record transition; pending `20260801...` owns final v3 replacement from predecessor or terminal-warning residual flat input. Display-name divergence is accepted, structural contradiction blocks before source mutation, and legacy decoding ends before current repositories start.
- **Handoff completion:** Team runtime guarantees both tools and the instruction. Retrieval is deterministic projection; only the Agent evaluates natural language and decides applicability. Delivery remains owned by `send_message_to`, so retrieval never claims that a handoff occurred.
- **Live validation:** API/E2E owns staging/import, secret isolation, one fresh run per runtime, public observation, redaction, failure classification, and cleanup. The production design does not acquire a test-only package or credential owner.
- **Application V5 build:** the contracts package is the sole semantic-version/type source; downstream SDK/application artifacts and fresh project databases/fixtures are generated target consumers and must agree before the checkpoint is accepted.
- **Exact application validation/launch:** application manifest, backend bundle manifest, and loaded definition must all declare the target contract before application behavior is exposed. Invalid input stops through ordinary strict validation; no compatibility/quarantine/upgrade workflow exists.
- **Application state:** the unused feature has no supported predecessor state. Canonical migration never enumerates application databases; project fixtures/databases are reset/rebuilt directly to target.

## Spine Actors / Main-Line Nodes

| Actor | Main-line responsibility | Must not own |
| --- | --- | --- |
| `AgentTeamAddress` domain | Canonical absolute parsing/derivation/serialization | Tree existence, coordinator choice, task/runtime lookup |
| recipient-address-expression parser | Strict `/...` and `./...` request normalization | Persistence or operation policy |
| definition graph resolver | Definition closure/cycle/reference integrity | Run IDs, persistence, handles |
| TeamRun-tree compiler | Mount addresses, coordinator mapping, Agent facts, compiled handoffs | Provider handle creation, task lifecycle |
| metadata validator/mapper/store | Current v3 persistence/restore | Legacy guessing, runtime index authority |
| `TeamRunTreeIndex` | Exact derived node/direct-child/coordinator lookup | Persisted state or basename fallback |
| mixed manager/factories | Persistent lifecycle and private handles | Public address grammar or task policy |
| shared recipient resolver | One minimal Agent/AgentTeam result | Config/run/handle exposure or task eligibility |
| Team capability composer | Intrinsic Team tool exposure and de-duplication after configured package tools | Handoff lookup, message routing, provider-specific result mapping |
| Team collaboration-context builder | Exact `from === caller.memberAddress` filter and immutable outgoing edge binding | LLM projection, rule evaluation, delivery |
| handoff guidance projector | Stable edge/rule flattening of the already caller-bound outgoing set to `{when,recipient_address}` | Caller filtering, natural-language evaluation, delivery, provider prompt timing |
| collaboration instruction renderer | One provider-neutral filesystem-like protocol block using caller canonical address | Full roster/topology/rule injection or provider session lifecycle |
| task delegation | Direct eligibility, fresh task run IDs, task lifecycle | Second parser/address language |
| `TeamExecutionAddress` + resolver | Concrete locator serialization/contextual resolution | Logical tree authoring |
| task-activation sequence in `TaskDelegationService` | Serialize only the short per-TeamRun activation section, prepare one gated exact execution, require durable activation, publish activation before exposing its runtime events/work, and commit/abort the attempt | Event-buffer mechanics, generic Team event routing, frontend recovery, serialization of task work after activation |
| `TaskActivationEventBarrier` at TeamRun publication | Hold only events referring to one prepared task subtree; atomically publish its activation then drain FIFO, or discard all held events | Task ledger state, persistence, runtime creation/settlement, address guessing, transport retry |
| task event publisher | Publish the active record's non-null `taskRun.address` as the one concrete task-event identity | Reuse delivery receiver as task root or synthesize an address from event details |
| app-data runner/record repository | Ordered execution, terminal-ID skip, retry records/status | TeamRun field interpretation |
| migration-only flat decoder | One pure flat-v1 -> structural predecessor interpretation, preserving display name | Migration records, file mutation, canonical address construction, or runtime parsing |
| stable `20260517...` prerequisite | Pending flat-v1 -> predecessor-memberTree record transition using the shared decoder | Canonical v3 ownership or completed-record normalization |
| ticket-owned `20260801...` canonical migration | Predecessor or residual-flat -> strict v3, item mutation/evidence, exact startup result | Runtime fallback or duplicate display/route interpretation |
| `@autobyteus/team-stream-contracts` | Exact strict Team server/client DTO unions, Zod runtime schemas, serialization | Domain routing/topology/task policy, frontend state |
| `TeamAgentExecutionBinding` constructor | Classify and validate persistent/task/task-Team Agent identity from one exact execution address plus the runtime/config owner's allocated AgentRun ID | Tree lookup, route guessing, status details, transport serialization |
| `TeamAgentStatusSnapshot` + status-details constructor | One immutable status projection shared by live events, initial snapshots, overlays, and typed run-list mapping | Event publication, stream session, frontend status storage |
| `TeamAgentEventAdapter` at the member bridge | Verify AgentRun binding and exhaustively adapt/filter/reject standalone Agent events before Team publication | Generic Team payload admission, logical routing, or mixed-manager access |
| provider segment normalizers | Translate explicit provider/native semantics into minimal generic AgentRun start/content/end candidates | Segment correlation, inferred type, Team/runtime branching, or downstream contract padding |
| `AgentSegmentLifecycleState` + first pipeline transformer | Strictly parse segment candidates, own turn-scoped start/content/end correlation, derive canonical content type, replay decisions, cleanup, and safe diagnostic replacement | Provider decoding, Team/application/browser projection, persistence, reordering, or content deduplication |
| `AgentRunErrorEvidence` | Classify the real turn-diagnostic, turn-terminal, and runtime-global semantics once for every Agent-bound consumer | Runtime diagnostic invention, active-turn borrowing, transport/presentation policy, or unclassified-error reclassification |
| `FileChangeEventProcessor` + invocation context store | Derive file-operation progress from exact canonical identity and file context; own turn/run release of that context | Segment lifecycle, end-time type recovery, or repeated-start replacement |
| memory/history, compaction, skill-improvement, and external-channel consumers | Own only transcript or final-output accumulation from exact canonical content | Provider aliases, type/turn/ID defaults, end-text recovery, or lifecycle repair |
| `TeamRuntimeSnapshotService` | Sequence exact initial Agent-status messages and root lifecycle after binding by calling the shared status projector directly | Fake TeamRun events, binding construction/parsing, generic Team message creation |
| `MemberCommandStatusOverlayStore` | Own temporary pre-run initializing/error details and exact replacement on the first matching correlated live status | Agent execution identity construction, display/runtime metadata, fallback routing |
| frontend `TeamLaunchDraft` + launch owner | Pre-launch config/logical focus/pending input; success-only replacement with canonical execution context | TeamRun/AgentRun IDs, execution address, AgentContext, stream/history identity before allocation |
| frontend `TeamTopologySnapshot` | Immutable recursive root, private canonical-address index, typed topology queries | Task lifecycle, presentation mutation, draft or execution state |
| `TeamRunFrontendProjectionBuilder` | All-or-nothing closed launch/open input projection into one immutable topology and complete persistent execution seed | Lifecycle inference from metadata, context registration, live task mutation, or tolerant metadata normalization |
| frontend `TeamExecutionState` | Private concrete execution index/graph, Agent-context association, one task-projection index for active views and derived history, live/restore transitions, focus, cleanup, typed views over single-owned Agent state | Agent-local conversation/status/tool projection, second task/history archive, durable task storage, GraphQL fetching, navigation-store mutation, topology mutation |
| private execution transitions/navigation projector | Pure invariant-preserving transition and read-model derivation serving `TeamExecutionState` | Public mutation/query authority or raw-key exposure |
| existing `MixedAgentMemberHandle` construction boundary | Validate persistent application producer identity or rebind task producer identity before `AgentRunConfig` creation | SDK contract ownership, application-event consumer repair, or topology projection |
| live validation harness | Isolated package/secret/runtime setup, public scenario orchestration, redacted evidence, cleanup | Production identity or provider behavior, secret values, source-package mutation |
| `@autobyteus/application-sdk-contracts` | V5 backend-definition/frontend-SDK constants and canonical application identity types | Bundle discovery, migration, worker lifecycle |
| application manifest/backend manifest parsers | Exact current declared-version validation | SDK type translation, compatibility negotiation, or durable DB discovery |
| `FileApplicationBundleProvider` + availability service | Existing ordinary invalid-package handling and catalog publication | V4 adaptation, special upgrade/quarantine policy, or application migration |
| backend definition loader | Exact V5 exported-definition check before exposures/hooks/handlers | Manifest compatibility negotiation |
| application project build/test setup | Regenerate target artifacts and recreate target-schema fixtures/databases | Predecessor application discovery, conversion, or preservation |

## Ownership Map

| Meaning | Sole authority |
| --- | --- |
| Mounted logical node identity | `AgentTeamAddress` on rooted node |
| AgentTeam coordinator | `coordinatorAddress` on AgentTeam node |
| Persistent Agent execution | `agentRunId` on Agent node |
| Persistent AgentTeam execution | `teamRunId` on AgentTeam node |
| Agent launch/restoration facts | Genuine fields on Agent node |
| Handoff rules for run | Top-level metadata `handoffs` |
| Caller outgoing handoff scope | Team collaboration-context builder |
| Model-facing handoff choices | Pure handoff guidance projector over caller-bound outgoing edges |
| Team collaboration tool availability | Team runtime capability composer |
| Root/child structure | `rootTeam` / `children` |
| Derived address lookup | Disposable `TeamRunTreeIndex` |
| Task-management identity | `taskId` on `TaskDelegationRecord`, unique only within its root TeamRun ledger; cross-root selectors use `{rootTeamRunId,taskId}` |
| Activated task concrete execution | non-null `TaskDelegationRecord.taskRun.address`; active ledger derives a non-persisted `ActiveTaskExecutionBinding` |
| Task-bound caller context | existing `TeamExecutionAddress` plus nullable `taskId`; actual AgentRun binding remains the Agent runtime's `agentRunId` |
| Activated task's concrete event/record root | non-null `TaskDelegationRecord.taskRun.address` |
| Task activation ordering policy | `TaskDelegationService` activation sequence |
| Bounded exact-subtree event hold/release mechanics | TeamRun publication's `TaskActivationEventBarrier` |
| Cross-boundary concrete locator | `TeamExecutionAddress` |
| Physical memory lineage | Storage `ancestorTeamRunIds` |
| Application SDK semantic target and cross-process application execution-context type | `@autobyteus/application-sdk-contracts` V5 constants/types; server aliases rather than redeclares the shape |
| Executable application target validation | Existing application/backend manifest parsers and definition loader; exact V5 only |
| Application fixtures/databases | Project build/test setup creates current schema directly; no migration inventory |
| Flat-v1 interpretation | one pure migration-only prerequisite decoder reused by both migration definitions |
| Predecessor-memberTree interpretation and canonicalization | `20260801...` canonical converter only |
| Target token semantic conversion record/result | `20260801...` canonical aggregate token item |
| Segment lifecycle identity/type/order | run-owned `AgentSegmentLifecycleState` at the first common serialized AgentRun pipeline boundary |
| Canonical segment transport projection | admitted canonical AgentRun segment event; downstream mappers may rename fields but not correlate or infer them |
| Agent error scope/effect/turn classification | original `AgentRunErrorEvidence` with `TURN_DIAGNOSTIC`, `TURN_TERMINAL`, and `RUNTIME_GLOBAL`; provider turn-admission rejection is not an Agent error |
| File-change projection context | `FileChangeInvocationContextStore`; exact run/turn/invocation file-operation facts only, released by tool/turn/run lifecycle |
| Transcript/output/presentation accumulation | each established memory/history, compaction, skill, external, or browser owner; canonical identity only and no structural repair |
| Historical token `{segments}` interpretation and row planning | migration-local token planner + strict task-Team index |
| Token semantic conversion + schema contraction | `TokenUsageCanonicalIdentityMigrationStore.applyCanonicalTeamIdentityTransaction` under the `20260801...` token item |
| Token root-Team query acceleration | `token_usage_ledger_events_execution_root_observed_at_idx` over canonical `execution_address_json`; never a writable root identity column |
| Migration ID order/terminal semantics | App-data registry + runner/record repository |
| TeamRun event correlation | closed `TeamRunEvent` / task event unions |
| Team Agent execution binding across every status/event producer | `createTeamAgentExecutionBinding({executionAddress,agentRunId})` in the Team Agent domain |
| Team Agent status projection value | immutable `TeamAgentStatusSnapshot {execution,details,statusHint}` plus one status-details constructor |
| Initial connection/open/restore Agent-status sequencing | `TeamRuntimeSnapshotService`; status message projection remains owned by the Team Agent projector |
| Temporary pre-run Agent status | `MemberCommandStatusOverlayStore` owns details only; `createTeamAgentStatusEvent(snapshot)` owns correlated event construction |
| Team WebSocket wire spelling/admission | `@autobyteus/team-stream-contracts` |
| Frontend pre-launch state | `TeamLaunchDraft` / Team launch owner |
| Frontend immutable mounted structure and effective launch facts | `TeamTopologySnapshot` (run-ID/execution-address-free `teamDefinitionName` + logical/configuration `rootTeam` + private derived address index + typed queries) |
| Closed canonical metadata/lifecycle/focus/Agent-seed input -> paired frontend context | `TeamRunFrontendProjectionBuilder` (one all-or-nothing launch/restore builder) |
| Frontend persistent/task run/application bindings, lifecycle, and focus | `TeamExecutionState` |
| Frontend task status/timeline/history projection | `TeamExecutionState`'s one private task-ID projection index; active and history views derive from it |
| Frontend Agent-local conversation/status/tool state and Agent run ID | the associated `AgentContext` plus established Agent projector; never copied into a Team execution record |
| Team Agent runtime application producer binding | existing `MixedAgentMemberHandle` AgentRun-construction boundary |
| Frontend selected root subject | workspace/Agent selection store, composed with exact execution focus |
| Frontend Team stream connection/subscription | `TeamStreamingService` / WebSocket transport, never `AgentTeamContext` |

## Thin Entry Facades / Public Wrappers (If Applicable)

- AutoByteus `get_handoff_rules` serializes only `GetHandoffRulesResult`; its MCP adapter returns the same JSON text and a deep-equal `structuredContent` object. Neither adds service-envelope fields.
- AutoByteus/MCP `send_message_to` wrappers independently preserve the existing delivery envelope and operation codes; rejected delivery envelopes alone set `isError`.
- Provider bootstrap/tool resolvers consume the Team runtime's composed intrinsic exposure; they do not ask package configuration independently whether the Team protocol tools exist.
- AutoByteus/MCP task and communication parameter schemas/manifests expose `recipient_address` consistently; no adapter translates `recipient_name` or `recipient_path`.
- GraphQL/REST converters shape target fields without alternative logical addresses. Team WebSocket mapping/serialization and server/client admission use the one exact shared contract.
- The Team launch store/owner accepts `TeamLaunchDraft`, calls the supported launch surface, and only on canonical success constructs and registers the real topology/execution context plus transfers pending input. It exposes no temporary run/execution identity.
- `TeamStreamingService` is a thin orchestrator: strict parse -> exhaustive routing to established connection/ack/error/communication owners or `TeamExecutionState.applyExecutionMessage` for the exact execution-projection subset -> observe the already-committed aggregate change -> execute only typed Agent-dispatch/token/task-refresh effects. It never applies the change itself and owns no alias normalization, task materialization, focus mutation, or cleanup scheduler.
- `AgentTeamStreamHandler.sendInitialStatusSnapshot` is a thin session sequencer: request exact snapshots -> call the shared status projector -> send exact contract messages -> send root lifecycle. It does not build bindings, create TeamRun events, or map generic messages.
- Frontend actions/stores pass typed `TeamExecutionAddress` to `TeamExecutionState`; serialization stays private and no facade exposes a key.
- Storage locator facades derive physical segments after exact execution resolution; they do not expose directory lineage as topology.
- Application package scanning/import uses the existing strict manifest parsers; non-target declarations are ordinary invalid input and add no version-specific compatibility/quarantine/upgrade DTO or state machine.
- Backend definition loading checks exact V5 before exposures, hooks, or handlers become callable; adapters do not convert old exports.
- Application project build/test setup regenerates every source/dist/vendor/importable artifact and target-schema fixture/database together; canonical migration does not enumerate application state.

## Removal / Decommission Plan (Mandatory)

1. Preserve accepted rooted backend/migration/V5/provider/storage behavior with characterization coverage.
2. Add strict Team stream DTO/schema package and real producer-to-parser tests without a production dual path.
3. Add the exhaustive standalone-Agent -> correlated-Team-Agent ingress adapter; correlate TeamRun/task events; cut Team mapper/broadcaster/egress/client parsing atomically; delete generic Team payload, derived Agent collaboration duplication, aliases, duplicate receiver identity, and unused Team approval-token shapes.
4. Replace legacy leaf-status snapshots and command-start status bags with the shared binding/status snapshot. Cut the real connection/open/restore and pre-run overlay producers to the exact status projector/constructor in the same Team stream cut; remove the generic initial-status mapper and generic command-status builder.
5. Add identity-free `TeamLaunchDraft`, immutable `TeamTopologySnapshot`, valid execution union, and `TeamExecutionState`; construct persistent executions only after real server allocation and route live events plus GraphQL restore/hydration through the same transitions.
6. Cut focus/open/history/navigation/status/timeline/presentation/token/mobile/desktop consumers to typed aggregate queries/view rows.
7. Cut successful draft replacement/pending-input transfer to the launch owner and terminal cleanup to the aggregate; delete provisional run/execution identity and rebase code.
8. Delete the six old task tree/projection/router/restore modules, public topology/execution maps, run/application-execution bindings on frontend topology, duplicate `AgentTeamContext` root/lifecycle/config/hydration/subscription fields, `AgentContext` connection ownership, every raw-key parser, topology task fields, copied task snapshots/separate mutable task-history archives, mutable stored task labels, duplicate task-status event, empty placeholders, dormant route-key egress branches, and three unused route-key results.
9. Remove `TaskAgentInstanceIdentity`, `TaskTeamInstanceIdentity`, synthetic instance-ID factories/clone helpers/fields, copied task owner/parent/run/timestamp identity, generic Team `task_context`, separate task activation-result run IDs, and current task status/token/work-packet fields derived from the exact execution address. Replace internal active lookup with task ID or typed execution address by subject.
10. Contract token current storage to `execution_address_json` + actual Agent `run_id` + optional task-operation `task_id` + usage facts. Remove both narrow column-drop definitions/current registrations, obsolete Team identity columns/index, and all current repository/domain/DTO fields that mirror the canonical address; preserve only migration-local input parsing under the exact allowlist.
11. Regenerate/retain all already-required SDK/application outputs and reject any regression in V5/current canonical identity.
12. Add the run-owned segment lifecycle transformer before every processor/listener and cut provider source output to explicit start/minimal content/end. Make same-type active start an owner-level replay no-op.
13. Cut the complete downstream fan-out atomically: file change, lifecycle/error observers, memory/history, compaction, skill improvement, external channel, application, Team/standalone egress/coalescing, and browser. Remove end-type/end-text recovery, segment aliases/defaults/derived identity, repeated-start overwrite, evidence loss, and all-errors-terminal handling.
14. Preserve the original three-variant error-evidence owner and strict required-nullable wire projection; reject unsupported turn identity before AgentRun, prove the existing turn diagnostic is observable but mutation-free outside its visible row, and prove terminal/unclassified behavior is unchanged.
15. Enforce the exact-path current-production allowlist and full cumulative source review before API/E2E resumes.

Do not retain an old-field compatibility DTO, dual writer, route-key adapter, or localized-child fallback “temporarily.”

## Return Or Event Spine(s) (If Applicable)

- `get_handoff_rules` success returns exactly `{handoffs:[{when,recipient_address}]}` or `{handoffs:[]}`; provider-native tool errors carry impossible internal binding failures.
- `send_message_to` alone retains the approved `{accepted,code,message,result}` delivery/rejection envelope.
- Exact-run message codes remain unchanged.
- Shared syntax/tree failures have identical codes for message and task entry before task wrapping.
- Correlated TeamRun events carry singular exact execution identity by variant; communication alone carries both semantically distinct participants.
- Initial connection/open/restore Agent status carries the same exact binding/details/status hint without becoming a TeamRun event; pre-run overlay status is a real correlated event and is replaced by its matching live status.
- Child/root bridges forward those values unchanged; no prefix repair occurs.
- Exact strict Team DTOs cross WebSocket; rejected raw input causes no downstream mutation.
- Provider segment candidates first cross their session-owned exact-turn admission. Missing/empty/inactive/conflicting turn identity returns zero AgentRun events and only a sanitized internal protocol record. Admitted exact-turn candidates cross the run-owned lifecycle; accepted content returns with the start-owned finite type, while an exact-turn lifecycle violation may return the existing turn diagnostic without changing segment/run/consumer terminal state.
- `TeamExecutionState` atomically commits an aggregate-owned transition or reports unchanged/rejected, and returns only typed Agent-dispatch/token/task-refresh effects plus immutable query views; an unchanged post-activation task signal may request refresh without inventing state, and the aggregate does not mutate external stores.
- Team launch returns either a fully canonical execution context plus one pending-input transfer or an actionable failure that leaves the identity-free draft untouched; it never returns/promotes a provisional execution.
- Historical task records store sufficient concrete identity to converge through the same transition owner without reading live handles.
- Non-target application manifest/backend/definition input returns no application execution result through ordinary strict validation. Exact V5 acceptance proceeds normally; no compatibility status or application migration result exists.

## Bounded Local / Internal Spines (If Applicable)

- `TeamRunTreeIndex` build: DFS validate uniqueness -> populate address/node/run/coordinator/direct-child maps -> freeze.
- Handoff binding/projection: context builder alone filters top-level `handoffs` where `from === caller.memberAddress`; guidance projector preserves bound edge order, flattens each `rules` item in order, and emits `{when,recipient_address:to}`.
- Coordinator target: AgentTeam recipient -> exact `coordinatorAddress` -> Agent node validation -> private handle lookup.
- Task eligibility: derive caller Team and recipient parent -> exact equality -> reject caller -> activate selected kind.
- Storage locator: execution address -> concrete run resolution -> `ancestorTeamRunIds`/Agent run ID -> unchanged filesystem path.
- Application target validation: parse exact current declarations -> reject invalid input or admit; loaded definition repeats the exact V5 assertion before callable behavior.
- Application project state: regenerate source/dist/vendor/importable artifacts and recreate target-schema fixtures/databases; assert canonical migration has no application inventory.
- Token canonical item: TeamRun/task readiness -> strict task-Team index -> deterministic row plans -> no-mutation failure or immutable update batch -> one store transaction for row conversion + obsolete-column/index replacement + complete verification -> committed summary or total rollback.
- Team Agent ingress: raw standalone Agent event -> verify handle AgentRun binding -> exhaustive `TeamAgentEventAdapter` -> publish correlated Team event, filter collaboration duplicate, or emit typed admission error.
- Initial Agent-status projection: mixed persistent/task/task-Team enumeration -> shared binding constructor -> immutable `TeamAgentStatusSnapshot` -> shared status projector -> strict serializer; root lifecycle follows, and no event is synthesized.
- Pre-run status overlay: already-bound handle identity -> shared binding constructor -> overlay details by private key -> correlated status-event constructor -> shared status projector -> first real typed status deletes overlay.
- Task activation publication/state machine: per-TeamRun activation sequencer enters critical section -> prepare/bind exact task identity with its work-release gate closed -> derive `taskRun.address` -> open one exact-subtree barrier -> runtime accepts/enqueues the work packet, emits only synchronous held initialization, and acknowledges preparation-quiescent while task work/commands remain closed -> verify the final barrier budget -> build and durably persist the privately staged active record -> synchronously commit ledger/directory -> publish matching activation through the barrier -> drain related events FIFO -> close barrier -> open work-release gate -> leave critical section; any start/persist/limit failure -> abort barrier/gate -> settle/unregister prepared execution -> discard staged/starting entry -> leave critical section -> return `not_started`. No event can race budget validation and durable commit because the prepared runtime is quiescent until gate release.
- Team wire admission: raw frame -> strict shared parser -> exhaustive DTO adapter -> aggregate-owned synchronous transition -> minimal disposition/true external effects -> thin effect execution; rejection stops before every state/effect owner.
- Initial frontend projection: exact canonical metadata -> build immutable topology and complete persistent execution set in memory -> validate one-to-one/node/run/application invariants -> register one context or register nothing.
- Task-record reconciliation: GraphQL complete root-scoped response -> require every `taskRun.address` -> validate root/run chain/delivery receiver plus unique task/address and immutable base facts -> reject the whole response on one invalid row -> emit one discriminated complete snapshot of minimal projections -> stage a monotonic one-projection-per-task merge (newer replaces, older/missing preserves, equal-time conflict rejects) -> require every materialized terminal subtree descendant to be terminal in the same candidate -> atomically commit projection/graph/focus -> derive active and history views from the same projection index.
- Task graph parentage: task Agent -> source Agent by removing task-Agent ID; first-level task Team -> persistent source Team; nested task Team/task-Team Agent -> containing task Team by run-ID-chain prefix/tail plus topology validation.
- Team Agent application binding: derive exact persistent/task execution -> exact-map shared application context -> persistent equality check or task producer-address replacement -> construct `AgentRunConfig` -> artifacts/events inherit truthful source identity.
- Agent segment lifecycle: native provider event -> provider-owned exact-turn admission/rejection -> exact-turn generic candidate -> first strict pipeline transformer + private run state -> canonical start/content/end or existing exact-turn diagnostic -> remaining processors/finalizer/listeners. Same-type active replay stops at the owner; command acceptance/turn facts and termination update both run lifecycle states through the same queue.
- File change: first canonical write/edit start -> exact non-replacing file-context initialization -> matching tool-start enrichment that preserves identity/content/status -> exact content append -> end without type -> tool/turn/run release. It owns file-operation projection, never segment lifecycle.
- Transcript/output consumers: canonical content -> exact compound-identity memory/compaction/skill/external accumulation -> established turn/output terminal. End contributes no recovered type/text and diagnostics contribute no terminal transition.

## Off-Spine Concerns Around The Spine

- Provider prompt timing differs, but the same mandatory filesystem-like completion protocol is composed at each provider's established system-instruction seam.
- Definition cache refresh affects only new runs.
- Handoffs remain natural-language guidance, not deterministic policy.
- Opaque provider tool arguments may contain old-looking keys but stay untyped history.
- Application predecessor data is unsupported; no dynamic database discovery or migration result belongs to this ticket.
- Application manifest V4, backend bundle V1, and iframe V4 are independent envelope/transport versions and must not be renamed merely to match SDK V5; only compatibility declarations advance.
- Generated/vendored/importable outputs are repository-resident release artifacts and require consistency proof, not best-effort rebuild instructions.
- Data volume is unknown; converters must be bounded/observable and restartable.
- Segment provider source and canonical listener shapes are distinct stages of one current pipeline, not compatibility versions. Every post-transform processor/listener is on the canonical side. A late browser subscriber may use required canonical content type to create a missing local segment, but no server/browser source event is synthesized or defaulted.

## Ownership Boundaries

1. Collaboration owns address grammar and minimal recipient meaning; AgentTeam execution owns tree/lifecycle/handles.
2. Definition authoring owns local names; TeamRun compilation owns mounted absolute addresses.
3. Root metadata owns persistent node/config/run snapshot; derived indexes own no persistence.
4. Task delegation owns eligibility and fresh task executions; it consumes but does not redefine addresses.
5. Run history/store owns current metadata representation; migration owns historical shapes.
6. Public transports expose domain values but own no routing policy.
7. Storage owns concrete directory lineage and preserves physical layout.
8. Frontend owns projection/state keys, not another topology language.
9. Team runtime owns intrinsic collaboration capability exposure; Agent package configuration and provider adapters may not override or weaken it.
10. Application SDK contracts own semantic version/type identity; bundle parsers/loaders own ordinary current validation; project build/test setup owns fresh target artifacts/databases. No application migration or compatibility owner exists.
11. The `20260801...` app-data definition owns target canonical sequencing/status; the token migration store alone owns database transaction mechanics. The runner, planner, and server gate may not bypass either boundary.
12. The member bridge plus `TeamAgentEventAdapter` owns standalone-Agent-to-Team admission; Team domain publishers cannot bypass it with a generic Agent payload.
13. `@autobyteus/team-stream-contracts` owns wire validation/spelling only; Team domain and frontend execution owners cannot move routing or lifecycle policy into that package.
14. `TeamRunFrontendProjectionBuilder` owns the all-or-nothing initial split; after registration, only `TeamExecutionState` may mutate concrete frontend execution state.
15. `TeamExecutionState` owns live/restore/focus/cleanup transitions; streaming, GraphQL restore, navigation, history, and components cannot import private reducers or touch its index.
16. The workspace selection store owns which root TeamRun is selected; `TeamExecutionState` owns focus inside that run. Presentation composes both and neither writes the other.
17. V5 application SDK contracts own the shared context shape; `MixedAgentMemberHandle` alone binds that context to the concrete Agent execution before run construction. Downstream artifact/event consumers cannot repair a stale producer address.
18. `TaskDelegationService` owns activation ordering; TeamRun publication owns only the bounded barrier mechanics. Runtime factories, task event mappers, WebSocket transport, and frontend state cannot publish around, reproduce, or recover that ordering.
19. The Team Agent domain owns binding/status construction. Mixed handles/config-backed offline enumeration supply allocated facts; snapshot service, overlay store, event adapter, history projection, transport, and browser may consume but may not reconstruct or guess the binding.
20. `TeamRuntimeSnapshotService` owns initial status/lifecycle sequencing but not domain event creation. `MemberCommandStatusOverlayStore` owns temporary details/replacement but not execution identity. Both converge on the same Team Agent status projector and frontend Agent-status transition.
21. `AgentRun` owns segment lifecycle state and the existing dispatch queue owns its order. Provider normalizers and every post-pipeline processor/listener may consume canonical facts but may not own lifecycle correlation/defaults. File, transcript, output, and presentation accumulators own only their distinct projection subject.
22. `AgentRunErrorEvidence` alone classifies the real Agent error scope/effect/turn states. Team/standalone/application/external/browser/command/lifecycle consumers translate or act on the original three variants but cannot invent runtime diagnostic, borrow a turn, or drop evidence. Provider turn-admission rejection remains provider-local and emits no Agent error.

## Boundary Encapsulation Map

| Boundary | Allowed crossing value | Forbidden crossing value |
| --- | --- | --- |
| collaboration -> message/task | `ResolvedTeamRecipient` | TeamRun node/config, handle, run ID, owner path/route |
| handoff snapshot -> Agent tool | `{handoffs:[{when,recipient_address}]}` | caller address, source endpoint, graph edge wrapper, service envelope |
| metadata -> runtime | frozen v3 metadata + derived index | legacy decoder result, normalized route tree |
| task -> event/history | `TeamExecutionAddress` + task IDs | structural/local/source route bundle |
| runtime -> transport | address, coordinator address, typed IDs, execution address | generic member ID, path/route aliases |
| domain -> storage | exact logical/concrete selector | public `teamRunPath` topology claim |
| server -> frontend | recursive root projection + execution addresses | compatibility route maps |
| launch draft -> launch owner | config, logical focus address, pending input | temporary TeamRun/AgentRun/conversation ID or draft execution address |
| application SDK source -> SDK/app artifacts | exact V5 constants + canonical identity types | stale V4 export, hand-authored divergent vendor type |
| bundle -> executable catalog/worker | exact V5 declarations/definition | old payload adapter, version guessing, or compatibility state machine |
| application project setup -> target store | freshly created current-schema fixture/database | predecessor application DB reader or migration |
| token planner -> token migration store | immutable validated `{id,executionAddressJson}` batch plus the store-owned exact obsolete-column policy | legacy parser callbacks, copied root identity, per-row/drop API, migration-record mutation |
| canonical migration -> startup | one `20260801...` status with token item detail | inference from historical `20260703...` status or unrelated warnings |
| standalone Agent bridge -> Team event domain | correlated Agent binding (address-only persistent/task Agent; address + genuine run ID for task-Team Agent) + `TeamAgentEvent`, or explicit filtered/rejected result | raw `AgentRunEvent`, run ID inside event details, generic payload bag |
| mixed Agent handle/config owner -> Team Agent domain | exact `executionAddress` + allocated `agentRunId` into the one binding constructor; exact current status facts into the one details constructor | display/name/runtime/TeamRun/task-instance identity bundle, local/root fallback, independently parsed binding |
| TeamRun -> initial Team stream | immutable `TeamAgentStatusSnapshot` values + root lifecycle; direct shared status-projector call | fake TeamRun event, legacy `TeamLeafAgentStatusSnapshot`, generic `ServerMessage`, duplicate Agent/Team identity |
| unmaterialized handle -> pre-run status overlay | already-constructed binding + initializing/error facts | raw config/handle, display name, runtime kind, task instance, alternate identity parser |
| status overlay -> Team event domain | `createTeamAgentStatusEvent(snapshot)` and matching typed live-status replacement | generic event builder, cast, status-owned execution identity |
| provider converter -> AgentRun pipeline | generic AgentRun segment candidate containing only explicit start/content/end source facts | asserted canonical type on untrusted input, provider state map, guessed/defaulted type, Team branch |
| AgentRun segment lifecycle -> listeners | strict canonical start/content/end; content is `{id,turn_id,segment_type,delta}` | raw/minimal content, lifecycle state, replay buffer, alternate source shape |
| canonical segment -> file/memory/output consumers | exact canonical identity plus consumer-owned projection facts | end type/text recovery, provider aliases, derived turn/ID/type, access to lifecycle state |
| AgentRun error evidence -> projections/observers | exact original three-variant evidence; strict wire `{error_scope,error_effect,turn_id}` with required nullable fields | runtime-diagnostic invention, active-turn borrowing, evidence loss, diagnostic terminalization, transport inference |
| canonical segment -> browser/application | required finite type + exact turn/segment + event-specific facts | optional/arbitrary type, type inference, ID-only lookup, serialized identity key |
| task activation -> TeamRun publication | one prepared `taskRun.address`, bounded activation lease, and the matching typed activated event | unbounded/generic buffering, delivery receiver as subtree identity, transport timer, frontend missing-parent inference |
| Team domain -> Team wire | one narrowed `TeamRunEvent` variant mapped field-by-field | cast, arbitrary payload, duplicated execution identity |
| Team wire -> frontend transport | fully parsed `TeamStreamServerMessage` | partial `{type,payload}`, aliases, surplus fields |
| transport -> frontend execution | exact projection message command to `TeamExecutionState`; minimal disposition/true external effects back | redundant change DTO/apply step, internal map/key/reducer access, or transport-owned task mutation |
| canonical TeamRun metadata -> frontend context | one all-or-nothing `{topology,executions}` result | partial registration, topology run bindings, tolerant cast |
| GraphQL task record -> execution aggregate | flat validated `TeamTaskProjection` with `executionAddress = taskRun.address` | delivery receiver, parent, or nested task wrapper copied into projection |
| root selection + execution focus -> row presentation | independently read selected root ID and exact focused execution address | either owner mutating or substituting for the other |
| persisted application context -> AgentRun construction | exact shared type with persistent match or task-address rebind | generic object cast or consumer-side producer repair |

## Dependency Rules

- `agent-collaboration` address domain has no dependency on TeamRun execution, providers, task delegation, or storage.
- TeamRun execution may depend on address/handoff domain and definition graph, never on frontend/transport.
- Shared recipient resolver may depend on rooted index interfaces but returns no execution-domain object.
- Team capability composer may depend on the presence of a bound Team collaboration context and canonical server-owned tool definitions; provider bootstraps consume its result rather than recomputing availability.
- Handoff guidance projector depends only on immutable caller-bound outgoing edges, performs no second caller filter, and returns no delivery/service/provider result type.
- Task delegation depends on the shared resolver and AgentTeam execution interfaces; Agent collaboration does not import task types.
- Task delegation may control one task-specific activation-publication lease exposed by the TeamRun facade; it cannot access the barrier queue/listeners. The TeamRun publication barrier depends only on correlated Team events plus typed canonical execution-address subtree comparison and cannot import task persistence, frontend, or WebSocket code.
- Migration input modules may depend on legacy schemas; current domain/store modules may not.
- Storage encoding depends on address derivation and exact run identity after contextual resolution, not on provider adapters.
- `@autobyteus/team-stream-contracts` depends only on `zod` and exact transport DTO modules; it imports no server domain or frontend store. Server and web depend on it.
- The Team Agent binding/status domain depends only on canonical execution-address and Agent status vocabularies. Mixed handles, `TeamAgentEventAdapter`, `TeamRuntimeSnapshotService`, `MemberCommandStatusOverlayStore`, run-history projection, and the Team Agent projector depend on that boundary; none may declare a parallel binding/snapshot type.
- The segment domain/state depends only on AgentRun events, finite segment vocabulary, exact turn/segment identity, and existing error evidence. `AgentRun` passes the private state to the cached stateless pipeline; the segment transformer is first. Provider adapters do not depend on Team/application/browser code, and every downstream listener receives only post-lifecycle canonical events.
- `TeamRuntimeSnapshotService` may call `TeamRun.getLeafAgentStatusSnapshots()` and `projectTeamAgentStatusMessage()` but may not call the TeamRun event mapper or generic standalone/Team `ServerMessage` builders.
- `MemberCommandStatusOverlayStore` receives an already-built binding, stores exact details only, and may call `createTeamAgentStatusEvent(snapshot)`. After the member bridge has successfully published a real correlated `AGENT_STATUS`, it calls `clearAcceptedLiveStatus(binding)`; the store removes only an exact binding match. It may not import runtime config, topology, mixed managers, or route/address fallback logic.
- TeamRun event domain depends on Team execution/task domain types, never on the wire package. The server adapter alone maps domain events to wire DTOs.
- `TeamLaunchDraft` depends on definition/config/input types and canonical logical addresses only. It does not import `TeamExecutionAddress`, `AgentContext`, stream/history/token types, or canonical TeamRun metadata.
- Frontend protocol types come from the shared Team contract and import no migration compatibility types. `TeamExecutionState` depends on immutable frontend topology and Agent contexts; UI/stores depend only on its public typed API, not its private transitions/index.
- Application SDK backend/frontend packages depend on the contracts package V5 types; contracts do not depend on server bundle discovery, migration, or compatibility policy.
- Bundle parsers depend on V5 constants, not on backend/frontend SDK implementations. Ordinary invalid-package handling may report parser failure but does not reinterpret versions or start a compatibility workflow.
- Application project build/test setup creates the current storage schema directly; canonical app-data migration and current repositories never import or interpret a predecessor application database.
- Canonical token planning depends on already-current TeamRun/task records and migration-only legacy token input types. The current token repository never imports the planner.
- `20260801...` may compose the token migrator; the migrator may depend on the strict task index/planner and token migration store; the store depends only on raw SQLite/Prisma transaction capability and owns row conversion, obsolete-column removal, and index replacement as one transaction. The planner/store never update app-data migration records or decide startup.
- Pre-existing token model/provider backfills precede canonical contraction. Historical semantic/column-drop records are neither registered target owners nor startup prerequisites. Server startup depends only on exact `20260801...` status, not on those historical records or unrelated warnings.
- The iframe transport remains V4 and may be consumed by frontend SDK V5 because it is an independently versioned, unchanged protocol.

## Interface Boundary Mapping

| Interface | Target shape |
| --- | --- |
| message/task wire argument | `recipient_address: string` |
| parsed logical recipient input | `recipientAddress: RecipientAddressExpression` |
| shared caller | `{rootTeamRunId, memberAddress}` |
| shared recipient | Agent `{kind:"agent",address}` or AgentTeam `{kind:"agent_team",address,coordinatorAddress}` |
| handoff guidance | `{handoffs: readonly {when:string,recipient_address:AgentTeamAddress}[]}` |
| Team tool exposure | intrinsic `get_handoff_rules` + `send_message_to`, de-duplicated with configured tools |
| TeamRun metadata | `TeamRunMetadataV3 {rootTeam,handoffs,...}` |
| Agent node | address + Agent definition/run/platform/presentation/launch fields |
| AgentTeam node | address + Team definition/run/coordinator + children |
| execution locator | `{rootTeamRunId,taskTeamRunIds,memberAddress,taskAgentRunId}` |
| active task execution binding | derived/non-persisted `{kind:"task_agent"|"task_team",taskId,executionAddress}` |
| task-bound Team member context | existing execution address + nullable `taskId`; no instance identity object |
| Team Agent execution binding input | `{executionAddress:TeamExecutionAddress,agentRunId:string}` into the sole domain constructor |
| Team Agent execution binding output | `persistent_agent`/`task_agent` address-only, or `task_team_agent` address + genuine `agentRunId` |
| Team Agent status snapshot | immutable `{execution:TeamAgentExecutionBinding,details:TeamAgentStatusDetails,statusHint:AgentRunStatusHint}` |
| initial Team Agent status projection | `TeamAgentStatusSnapshot -> projectTeamAgentStatusMessage -> exact AGENT_STATUS TeamStreamServerMessage`; no TeamRun event |
| pre-run Team Agent status event | `createTeamAgentStatusEvent(snapshot) -> correlated TeamRun AGENT/AGENT_STATUS variant` |
| accepted-live status replacement | member bridge calls `MemberCommandStatusOverlayStore.clearAcceptedLiveStatus(binding)` only after successful correlated `AGENT_STATUS` publication; exact binding equality selects only that overlay |
| provider segment candidate | generic `AgentRunEvent` envelope whose start has `id/turn_id/segment_type/metadata?`, content has `id/turn_id/delta`, and end has `id/turn_id/terminal facts`; all values remain untrusted until the first transformer |
| canonical segment content | `{id:string,turn_id:string,segment_type:AgentSegmentType,delta:string}` after run-owned lifecycle admission/enrichment |
| segment lifecycle diagnostic with candidate turn | normal `ERROR` with code `AGENT_SEGMENT_LIFECYCLE_INVALID`, safe message, `error_scope:"turn"`, `error_effect:"diagnostic"`, exact candidate `turn_id`; `TURN_DIAGNOSTIC` evidence |
| provider segment candidate without authoritative turn | rejected at provider ingress before AgentRun enqueue; zero AgentRun events, no browser error, no lifecycle mutation, and one sanitized internal protocol record; no active-turn guessing or new domain error variant |
| Agent-bound error wire evidence | required `{error_scope:"turn"|"runtime"|null,error_effect:"diagnostic"|"terminal"|null,turn_id:string|null}` on both Team and standalone error DTOs; unclassified errors use explicit nulls |
| GraphQL/REST | `memberAddress`, `coordinatorAddress`, typed run IDs, execution address as applicable |
| Team WebSocket server/client | exact `TeamStreamServerMessage` / `TeamStreamClientMessage` strict unions; `execution_address` appears exactly where variant semantics require |
| frontend launch draft | `{draftId,config,focusedMemberAddress,pendingInputsByMemberAddress}` with no copied topology or run/execution identity |
| frontend projection input | canonical metadata + exact root lifecycle + initial logical Agent focus + one discriminated identity-free Agent seed per metadata Agent |
| frontend topology | immutable `TeamTopologySnapshot` with recursive `rootTeam` and typed lookup; no public map |
| frontend runtime | private `TeamExecutionState`; typed `TeamConcreteExecution` and `TeamExecutionNavigationRow` queries |
| external binding | `targetMemberAddress` |
| storage scope | private `{rootTeamRunId,ancestorTeamRunIds}` |
| token canonical update plan | immutable `{id,executionAddressJson}` rows built only after full plan validity; root is inside canonical JSON |
| token current identity | nullable `executionAddressJson` + actual Agent `runId` + optional operation `taskId`; no parallel Team columns |
| token migration store mutation | `applyCanonicalTeamIdentityTransaction(readonly updates[])` as the sole write/schema API; one verified transaction |
| canonical startup status | exact `20260801_team_canonical_identity` aggregate including token item |
| application backend definition contract | exact `"5"`; current canonical launch/binding/target/event types |
| application frontend SDK contract | exact `"5"`; canonical validators/client types |
| application manifest | schema `"4"`, `ui.frontendSdkContractVersion: "5"` |
| application backend bundle manifest | envelope `"1"`, `sdkCompatibility: {backendDefinitionContractVersion:"5",frontendSdkContractVersion:"5"}` |
| iframe transport | unchanged protocol `"4"` |
| invalid application package result | ordinary exact-parser/loader failure before execution; no compatibility/quarantine/upgrade state |

The server Agent-execution domain owns the closed seven-value `AgentSegmentType`. `@autobyteus/team-stream-contracts` owns only its exact process-boundary mirror (`agentSegmentTypeSchema` plus inferred DTO type), not a second semantic/lifecycle authority. Team start/content DTOs use that enum and non-null turn IDs instead of the current open-string/nullable-turn validators; one exhaustive server projection and package parity test prevent drift. The standalone browser contract consumes the same seven semantic values through its existing exact transport boundary.

### Application V5 canonical identity mapping

The contracts-package source owns these exact semantic replacements; backend/frontend SDKs and application code consume them rather than defining equivalents:

| Current V4 contract | Target V5 contract |
| --- | --- |
| `ApplicationRuntimeInput.targetMemberRouteKey` + `targetMemberPath` | optional `targetMemberAddress: string | null` containing serialized canonical `AgentTeamAddress` |
| `ApplicationTeamMemberLaunchConfig.memberName` + `memberRouteKey` | required `memberAddress: string` containing serialized canonical `AgentTeamAddress`; retain genuine model/runtime/workspace/definition configuration |
| `ApplicationAgentBinding.runtime.runId` | `agentRunId` |
| `ApplicationAgentTeamBinding.runtime.runId` | `teamRunId` |
| `ApplicationAgentTeamBindingMember.memberName/memberRouteKey/teamPath/runId` | `memberAddress`, `agentRunId`, retained `displayName` and genuine runtime kind |
| `ApplicationAgentTarget {kind:"AGENT_TEAM_MEMBER",memberRouteKey}` | `{kind:"AGENT_TEAM_MEMBER",memberAddress}` |
| `ApplicationExecutionProducer.runId/memberRouteKey/memberName/teamPath` | `executionAddress: TeamExecutionAddress`; retain presentation/runtime-kind facts only when independently meaningful |
| frontend target/event validators for route/path bundles | exact validators for the V5 address/execution shapes |

Representative target types:

```ts
type TeamExecutionAddress = {
  rootTeamRunId: string;
  taskTeamRunIds: string[];
  memberAddress: string;
  taskAgentRunId: string | null;
};

type ApplicationAgentBinding = ApplicationAgentBindingFields & {
  runtime: {
    subject: "AGENT_RUN";
    agentRunId: string;
    definitionId: string;
    members: [];
  };
};

type ApplicationAgentTeamBindingMember = {
  memberAddress: string;
  displayName: string;
  agentRunId: string;
  runtimeKind: "AGENT" | "AGENT_TEAM_MEMBER";
};

type ApplicationAgentTeamBinding = ApplicationAgentBindingFields & {
  runtime: {
    subject: "TEAM_RUN";
    teamRunId: string;
    definitionId: string;
    members: ApplicationAgentTeamBindingMember[];
  };
};

type ApplicationAgentTarget =
  | { kind: "AGENT_RUN" }
  | { kind: "AGENT_TEAM_RUN" }
  | { kind: "AGENT_TEAM_MEMBER"; memberAddress: string };

type ApplicationExecutionProducer = {
  executionAddress: TeamExecutionAddress;
  displayName: string | null;
  runtimeKind: "AGENT" | "AGENT_TEAM_MEMBER";
};
```

Every SDK `memberAddress` is the serialized canonical domain `AgentTeamAddress`; every SDK `TeamExecutionAddress` is the wire mirror of the one domain `TeamExecutionAddress`. The SDK contracts package defines these transport shapes but no second address parser or resolver. Server application orchestration validates/maps at the boundary. `memberName`, breadcrumb segments, and Team path are derived from `memberAddress` when presentation requires them. Neither SDK package receives TeamRun nodes, indexes, handles, or migration types.

## Interface Boundary Check

- One meaning has one field name across project-owned boundaries.
- Agent and AgentTeam fields are separated by a discriminated union.
- Shared recipient values are immutable and operation-neutral.
- Root/nested AgentTeam nodes use the same shape.
- Relative recipient strings never leave request parsing.
- Run IDs remain typed and never substitute for logical address.
- Current interfaces reject removed fields rather than ignore them.
- Model-facing handoff output has one condition and one directly reusable destination per row; it exposes no transport acknowledgement or redundant caller/source identity.
- Application semantic and envelope/transport versions name distinct current contract layers; V5 is not copied mechanically onto unchanged envelope types.
- Non-target package rejection is ordinary current validation, not a compatibility or migration result.

## Main Domain Subject Naming Check

- `AgentTeamAddress` is native and sufficient; “canonical” is its invariant, not a repeated type adjective.
- `recipient_address` is natural at the operation boundary because it names the recipient's logical location; `/...` and `./...` are address grammar, not a physical-path field.
- `RecipientAddressExpression` truthfully distinguishes an unresolved relative/absolute request value from resolved `AgentTeamAddress`.
- `agent_team` matches existing product/domain language and is clearer than generic `team`.
- `coordinatorAddress` matches the established coordinator concept; no “ingress” synonym is added.
- `rootTeam`, `children`, and `handoffs` reflect the JSON users inspect.
- `TeamExecutionAddress` truthfully identifies a concrete execution coordinate.
- `ancestorTeamRunIds` truthfully describes storage lineage.

## Existing Capability / Subsystem Reuse Check

Reuse and tighten:

- existing Agent collaboration address/handoff capability;
- `TeamDefinitionGraphResolver`;
- TeamRun launch identity assignment and run-ID factories;
- TeamRun metadata mapper/store and run-history ownership;
- mixed manager/member handles/lazy child lifecycle;
- task instance directories and task lifecycle;
- app-data migration registry, backup, atomic-write, and records;
- blocking operational DB migration phase;
- existing GraphQL/WebSocket generation and frontend state mechanisms; and
- current memory/context storage layout;
- current exact application manifest/backend manifest/definition gates and ordinary package validation; and
- existing SDK/application build pipelines for deterministic regeneration; and
- existing `AgentRun`, `AgentRunEventDispatchQueue`, pipeline/transformer/finalizer, turn lifecycle/error evidence, provider segment trackers/projectors, file-change context, memory recorder, compaction/skill/external output collectors, transport coalescing, application projection, and AgentContext presentation state.

Do not add a new provider-neutral topology service or a persisted profile/binding subsystem.

## Subsystem / Capability-Area Allocation

| Area | Target responsibility |
| --- | --- |
| `agent-collaboration/domain` | `AgentTeamAddress`, recipient-address expression, authored handoff edge |
| `agent-communication/services` | operation contracts, exact handoff guidance projection, send dispatch/delivery result |
| `agent-team-definition` | authoring schema and recursive graph resolution |
| `agent-team-execution/domain` | rooted node types, metadata aggregate, execution address, one Team Agent execution binding constructor, one exact status-details/snapshot value, and one correlated status-event constructor |
| `agent-team-execution/services` | tree compiler/index, recipient resolver, execution resolver |
| `agent-execution/shared` + Team member instruction composition | intrinsic Team tool exposure, canonical name de-duplication, provider-neutral filesystem-like completion protocol |
| `agent-execution/domain` + event pipeline | finite segment vocabulary, run-owned segment lifecycle state, first strict transformer, canonical self-contained events, original three-variant error evidence, and processor run-release lifecycle |
| provider Agent execution backends | explicit provider/native semantic conversion to minimal segment candidates; no lifecycle correlation or downstream padding |
| AgentRun default processors | file-change derives exact file-operation projection from canonical facts; Team communication/token remain event-selective |
| memory/history, compaction, skill-improvement, external-channel | exact canonical transcript/final-output accumulation under their established owners; no source fallback or lifecycle repair |
| standalone/Team/application/browser stream boundaries | exact canonical segment/error projection, strict admission, and non-terminal diagnostic presentation |
| `agent-team-execution/backends/mixed` | concrete persistent/task lifecycle and private handles |
| `run-history/store` | strict v3 schema/store and metadata migration input |
| `task-delegation` | direct eligibility, minimal task identity, fresh task executions |
| `app-data-migrations` | stable TeamRun prerequisite, one pending `20260801...` canonical aggregate including token semantic conversion, strict token planner/index, transaction-owning token migration store, ordered record lifecycle, exact startup gate, and evidence |
| API/SDK/integration | target-only DTOs/contracts |
| `application-sdk-contracts` | Own exact backend-definition/frontend-SDK V5 constants and canonical application identity shapes; retain independent unchanged envelope/iframe constants |
| `application-bundles` + worker loader | Exact V5 declaration/export validation through existing current parsers/loaders; no compatibility state machine |
| project applications/builds | V5 source manifests/definitions, generated/vendor/importable artifact consistency, and fresh target-schema fixtures/databases |
| `team-stream-contracts` workspace package | exact strict Team WebSocket DTOs, runtime schemas, parser, serializer |
| Team streaming service boundary | exact initial status/lifecycle sequencing plus one Team Agent status projector shared by live event and direct snapshot inputs; no generic Team message path |
| web Team launch | identity-free `TeamLaunchDraft`, supported launch call, success-only canonical context construction/input transfer, failure preservation |
| web `TeamExecutionState` | valid concrete execution aggregate, private index/graph, focus/lifecycle/presentation/cleanup, typed views |
| web `TeamTopologySnapshot` | immutable rooted projection constructed only from real run metadata, private derived address index, typed topology queries |
| memory/context storage | physical lineage and stable locator derivation |
| API/E2E live harness | staged package import, isolated secret DB/app data, required runtime/model matrix, public assertions, redacted evidence, cleanup |

## Draft File Responsibility Mapping

Proposed names may adapt to repository conventions, but ownership must remain:

| File/capability | Change |
| --- | --- |
| `agent-collaboration/domain/agent-team-address.ts` | Own branded absolute address and derivation helpers |
| `agent-collaboration/domain/recipient-address-expression.ts` | Define opaque `RecipientAddressExpression`, own its sole strict parser/factory, and resolve `/...` / `./...` into `AgentTeamAddress` |
| send/task tool parameter schemas, input parsers, and manifests | Replace current logical selector with `recipient_address`; reject `recipient_name` and `recipient_path` |
| `agent-team-execution/services/member-team-context-builder.ts` / collaboration-context builder | Sole exact-caller outgoing-edge filter; freeze the ordered result in the bound context |
| `agent-communication/services/get-handoff-rules-service.ts` | Return `GetHandoffRulesResult` directly; ordered edge/rule flattening of the bound outgoing set; throw typed internal error only when binding invariant is violated |
| `agent-communication/services/get-handoff-rules-tool-contract.ts` and no-argument schema | Describe the exact condition/destination result and mandatory completion use without restating rule content |
| AutoByteus/MCP `get_handoff_rules` wrappers | Serialize/project only the minimal result; use provider-native tool error on invariant failure |
| `agent-execution/shared/configured-agent-tool-exposure.ts` or renamed composer | Compose configured package tools with intrinsic Team tools exactly once after Team context exists |
| `agent-team-execution/services/member-collaboration-instruction-renderer.ts` | Render caller address, filesystem-like logical grammar/examples, coordinator behavior, and mandatory completion/blocked handoff lifecycle |
| `agent-team-execution/services/member-run-instruction-composer.ts` | Include the Team protocol whenever Team context exists; remove boolean gating for the intrinsic handoff/delivery tools |
| `agent-team-execution/domain/team-run-config.ts` or replacement node module | Define `TeamRunAgentNode` / `TeamRunAgentTeamNode` union |
| `run-history/store/team-run-metadata-types.ts` | Define current `TeamRunMetadataV3` persistence contract |
| `run-history/store/team-run-metadata-schema.ts` | Replace object-only application-context acceptance with exact SDK-owned field mapping and canonical producer-address validation; current schema v3 admits no surplus/generic context record |
| `agent-team-execution/services/team-run-tree-compiler.ts` | Compile definition closure + launch input into rooted tree/handoffs |
| `agent-team-execution/services/team-run-tree-index.ts` | Derive exact lookup view |
| `agent-team-execution/services/team-run-metadata-mapper.ts` | Map current aggregate without legacy normalization |
| `agent-team-execution/services/team-recipient-resolver.ts` | Resolve one minimal recipient |
| `agent-team-execution/domain/team-execution-address.ts` | Validate/serialize concrete locator |
| `agent-team-execution/services/team-execution-resolver.ts` | Resolve persistent/task execution contextually |
| mixed child factory | Share persistent root tree without localization |
| task Agent/task-Team materialization | Allocate real run IDs, compose exact `TeamExecutionAddress`, and derive `ActiveTaskExecutionBinding`; create no synthetic task instance identity |
| `team-run-member-tree-prerequisite-converter.ts` | Own one pure migration-only flat decoder; require direct Agent/one-segment structural route/non-empty display name, preserve display, emit/validate predecessor; expose no runtime reader |
| `team-run-metadata-member-tree-migration.ts` | Keep stable ID; when pending, use the shared decoder and own predecessor backup/atomic replacement; never own terminal-record normalization |
| `team-canonical-identity-migration.ts` + metadata converter | Keep separate pending `20260801...` ID; accept v3/predecessor/residual flat, derive v3 addresses only from agreeing route/path, finish TeamRun/task items, compose the token semantic migrator, and own the one aggregate status consumed by startup |
| `token-usage-execution-address-backfill-migration.ts` | Rename/move to `token-usage-canonical-execution-address-migrator.ts`; remove `AppDataMigrationDefinition`/historical ID ownership; preserve IR-014 index/planning orchestration and return canonical item details to `20260801...` |
| `token-usage-execution-address-backfill-planner.ts` | Rename to target-neutral migration-local canonical planner if practical; keep `{segments}` parsing isolated here and preserve exact nested task-Team reconstruction/fail-closed behavior |
| `token-usage-task-team-run-index.ts` | Keep strict current task-record indexing, ordered ancestor validation, and actionable duplicate/conflict/unreadable issues |
| `token-usage-canonical-execution-address-migration-store.ts` (rename to `token-usage-canonical-identity-migration-store.ts`) | Own deterministic raw row/schema scan plus `applyCanonicalTeamIdentityTransaction`; update addresses, remove the exact obsolete column/index set, install/verify `token_usage_ledger_events_execution_root_observed_at_idx`, and prove total rollback in one transaction; expose no per-row or independent drop method |
| `token-usage-provider-name-snapshot-backfill-migration.ts` / row projection | Be attempted before canonical contraction; database `SELECT *`, classify from the five semantic fields only, and preserve the dynamic lexically sorted physical row excluding only `provider_name`; name no unrelated legacy identity/display column and remain retry-safe after contraction |
| `app-data-migration-registry.ts` | Order pre-existing token model/provider backfills before `20260801...`; remove current registrations for historical `20260703_token_usage_execution_address_backfill` and both narrow token column-drop definitions |
| `token-usage-legacy-path-columns-drop-migration.ts` / `token-usage-legacy-route-column-drop-migration.ts` | Remove definitions/files from current source; terminal records may remain in persisted migration history only |
| `prisma/schema.prisma`, token domain/repository/projections | Omit redundant Team identity fields; write/read canonical address + actual Agent run/task facts; query root scope with raw `json_extract` SQL through the named expression index. Add no physical Prisma drop migration before app-data conversion |
| `server-runtime.ts` | Keep one exact-`20260801...` pre-listen gate; include the canonical record/token item detail in actionable failure logging; ignore unrelated warning statuses |
| new `autobyteus-team-stream-contracts` workspace package | Own exact strict `/ws/agent-team` server/client DTO schemas, parse, and serialize; no domain routing or UI dependency |
| new `agent-team-execution/domain/team-agent-execution-binding.ts` | Own `TeamAgentExecutionBinding` and the sole `createTeamAgentExecutionBinding({executionAddress,agentRunId})` classifier/validator; persistent/task Agent outputs contain no repeated run ID, task-Team Agent output contains the genuine allocated ID once |
| new `agent-team-execution/domain/team-agent-status.ts` | Own exact `TeamAgentStatusDetails`, `TeamAgentStatusSnapshot`, status-details construction from supported raw/current facts, status-hint derivation, and immutable snapshot construction; no name/runtime/Team/task identity fields |
| new `agent-execution/domain/agent-segment.ts` | Own finite segment type, exact turn/segment identity, strict source/canonical segment variant constructors, and safe payload validation vocabulary; no provider or Team dependency |
| new `agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-state.ts` | Own bounded non-persisted absent/active/ended state, turn retirement, replay decisions, content type enrichment, and cleanup for one AgentRun |
| new `agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.ts` | Be the first pipeline transformer; accept only provider-admitted exact-turn candidates, apply ordered state transitions, emit only the existing exact-turn diagnostic for admitted lifecycle violations, and expose no state to listeners |
| `agent-run.ts`, processor/transformer/pipeline contracts, `default-agent-run-event-pipeline.ts`, `dispatch-processed-agent-run-events.ts` | Construct/pass one segment state per run; synchronize command turn and accepted termination through the queue; transform before token/processors/finalizer/listeners; keep cached pipeline stateless; expose one narrow processor run-release hook invoked after accepted termination |
| `agent-run-error-evidence.ts`, `agent-turn-lifecycle-state.ts`, `lifecycle-status-event-transformer.ts`, `agent-run-canonical-failure-observer.ts`, command coordinator, and lifecycle observer | Preserve/exhaustively handle the original `TURN_DIAGNOSTIC`, `TURN_TERMINAL`, and `RUNTIME_GLOBAL` union; remove ticket-added `RUNTIME_DIAGNOSTIC`; turn diagnostic preserves status and never settles/fails, while terminal variants remain unchanged |
| new `codex/thread/codex-segment-turn-admission.ts` | Own the exact four-name production-applicability/inheritance set, all-five-field candidate collection, all-present validation/equality, active-turn comparison, four stable rejection reasons, and immutable admitted `{turnId,paramsWithExactTurn}` result; import no notification handler, converter, AgentRun lifecycle, Team, or debug sink; define no non-segment exemption registry or open unknown-event class |
| `codex-thread.ts`, `codex-app-server-message.ts`, and `codex-thread-notification-handler.ts` | Keep `CodexAppServerMessage` raw only from router to thread; make `CodexThread.handleAppServerNotification()` the only first per-thread native gate; invoke the resolver only when the native name belongs to the exact four-name set and otherwise preserve operation-owned routing; return immediately on governed rejection; privately brand/construct/emit the readonly `native_admitted | local_derived` union; pass the exact admitted params through pending-MCP handling and original emission; preserve valid MCP add/remove/derived-completion ordering; remove raw `(method,params)` handler, generic listener input, and casts/fabricated branded messages |
| `codex-thread-event-name.ts`, `codex-thread-event-converter.ts`, `codex-item-event-converter.ts`, `codex-item-event-payload-parser.ts`, `codex-reasoning-event-normalizer.ts`, `codex-reasoning-block-tracker.ts`, and `codex-segment-source-payload-normalizer.ts` | Consume only thread-emitted admitted/derived messages; remove converter-local admission and direct raw-native entry; pass the already canonical turn into reasoning tracking; return zero events on later segment normalization rejection; remove broad-prefix segment construction and generic/raw payload substitution |
| `codex-thread-event-debug.ts` and shared `runtime-raw-event-file-debug.ts` | Add the sanitized rejection logger beside Codex event diagnostics; keep the generic raw sink policy-free; call raw detail/file/debug capture only from converter consumption of admitted/derived thread messages. Rejected candidates neither serialize nor enqueue a raw write; admitted debug remains canonical and available |
| AutoByteus `LlmStreamingResponseHandler`/`SegmentEventData` + server converter; Codex provider-local admission/converters/trackers; Claude session/text/tool projectors | Require or resolve the provider-owned exact turn before AgentRun construction. AutoByteus rejects missing native turn, Claude uses its allocated session turn, and Codex uses only the exact four-event omission set or an all-fields-agreeing explicit turn equal to active. Rejection emits zero AgentRun events and one sanitized internal protocol record. Emit explicit finite start from known semantics and minimal content/end; preserve native AutoByteus untyped content; add Codex reasoning and Claude text starts; reject unknown types without `text` default or raw-payload fallthrough |
| `file-change-event-processor.ts`, `file-change-invocation-context-store.ts`, and payload accessors | Initialize exact run/turn/invocation file context without replacement on first canonical write/edit start; allow only a matching tool-start enrichment that preserves identity/content/status; content/end use exact context and stored source tool; end reads no type; clear on tool/turn/run terminal; remove overwrite/fallback |
| `runtime-memory-event-accumulator.ts` + `agent-run-memory-recorder.ts` | Preserve transcript/tool ordering while changing segment handling to exact canonical text/reasoning compound identity; remove segment fallback turn/ID/type and missing-start synthesis |
| `compaction-run-output-collector.ts` + `improver-run-completion-watcher.ts` | Aggregate exact canonical text content under compound identity, retain assistant-complete priority, ignore end text/type, and ignore `TURN_DIAGNOSTIC` as failure evidence |
| `channel-output-event-parser.ts`, `channel-run-output-eligibility.ts`, `channel-run-output-event-collector.ts` | Make direct/Team parsing exact, accumulate text content until turn completion, remove end-text/provider aliases, carry Team error evidence, and ignore diagnostics before pending-turn mutation |
| `team-agent-event.ts` + `team-agent-event-adapter.ts` | Define the exact correlated Team Agent union and `createTeamAgentStatusEvent(snapshot)`; exhaustively convert established standalone Agent events before Team publication through the shared binding/status constructors; filter derived Agent collaboration duplicates; remove raw run identity from details while retaining it only as the required task-Team-Agent binding |
| `team-run.ts`, `team-manager.ts`, `team-run-backend.ts`, `mixed-team-run-backend.ts`, `mixed-team-manager.ts`, mixed persistent/task/subteam/task-Team member handles | Change leaf-status enumeration to return `readonly TeamAgentStatusSnapshot[]`. Handles/config-backed offline members construct the binding from their exact execution address plus allocated context/node AgentRun ID, apply overlay details, and expose no legacy payload. Child/task Team handles forward the exact snapshots unchanged; delete identity prefixing/pass-through reconstruction. |
| `member-command-status-overlay-store.ts` | Accept an already-constructed `TeamAgentExecutionBinding`; store only exact `TeamAgentStatusDetails` by the private canonical execution key; publish initializing/error through `createTeamAgentStatusEvent(snapshot)`; expose `clearAcceptedLiveStatus(binding)` and remove only after a matching correlated live status is successfully published, without casts |
| `team-runtime-snapshot-service.ts` + `agent-team-stream-handler.ts` | Sequence `CONNECTED`, direct projection of every `TeamAgentStatusSnapshot` through `projectTeamAgentStatusMessage`, then scoped lifecycle. Return/send exact contract messages only; do not manufacture TeamRun events or generic `ServerMessage` |
| `team-agent-event-websocket-projector.ts` | Export one exact `projectTeamAgentStatusMessage(snapshot)` function; the correlated live `AGENT_STATUS` arm delegates to it and `TeamRuntimeSnapshotService` calls it directly. Other Agent variants remain exhaustive. |
| `run-history/services/team-run-live-projection-service.ts` | Map `TeamAgentStatusSnapshot` through a run-history-owned typed list DTO/projection, deriving presentation through the rooted Team index when needed; never strip a generic payload or reuse the Team wire DTO as history state |
| `task-agent-instance.ts`, `task-team-instance.ts`, task identity factories and clone helpers | Replace identity objects with kind-specific start requests that carry `taskId`, exact `executionAddress`, source node/config, and work message only; remove deterministic instance IDs and copied owner/parent/run/time fields |
| `task-delegation-activation-coordinator.ts`, task Agent/task-Team registries and directories | Prepare a derived `ActiveTaskExecutionBinding` with a closed work-release gate; index active resolution by task ID or typed execution address according to the query; expose starting entries only to cleanup; commit active visibility or settle/unregister exactly once |
| `task-delegation-service.ts`, ledger, records, settlement, notification, tool/provider result boundaries | Serialize only the short per-TeamRun activation section; privately stage one active candidate; require throwing durable activation persistence; use task ID/address rather than instance IDs; expose provider result only as `{task_id,status[,message]}`; synchronously promote, publish/release, then open work; abort every pre-publication failure without a durable/active remainder |
| `team-run.ts`, backend interfaces, mixed Team publication, and new focused `task-activation-event-barrier.ts` | Expose one task-specific activation lease; hold the exact subtree within count/UTF-8-byte bounds, let unrelated events bypass, publish matching activation then FIFO-drain, and keep queue/listeners private |
| `team-run-event.ts` + task publisher | Replace independent source/data and `unknown` publisher with three nonduplicated correlated domain/task variants and singular identity; activation emits exact durable base create/start facts once, result variants emit event-specific correlation/decision/time only, labels/status/terminal/update facts derive, and duplicate status publication is removed |
| Team mapper + new `team-agent-event-websocket-projector.ts` + Team broadcaster/egress/handler | Return/accept the exact Team contract, exhaustively map already-correlated Team variants, and strictly parse client commands. The dedicated Team Agent projector maps all correlated Agent details and never calls or changes the generic standalone-Agent mapper. Emit `CONNECTED {session_id}` only after TeamRun binding and scoped `TEAM_RUN_LIFECYCLE {is_active}` without duplicate TeamRun identity; generic `ServerMessage` may not enter Team egress |
| frontend protocol modules + `TeamStreamingService` | Import the exact Team contract; delete loose mirrored Team DTOs/aliases, type-only cast parser, redundant control-message TeamRun IDs, and frontend-only Team approval-token type/map/payload/casts; mark application readiness only from the exact `CONNECTED` handshake while retaining invocation-to-address tracking |
| standalone Agent mapper/models/coalescing + Team Agent adapter/domain/contract/projector | Consume admitted canonical segments; map the original three error-evidence variants to required nullable wire fields and reject runtime/diagnostic; keep Team adaptation stateless; coalesce only identical exact non-delta identity/type |
| `application-agent-stream-event-projector.ts` | Share one pure exact-text-delta projection between standalone/Team and suppress `TURN_DIAGNOSTIC` without hiding terminal/unclassified application failure |
| browser `messageTypes.ts`, strict parser, `teamStreamDtoAdapters.ts`, `segmentHandler.ts`, `segmentIdentity.ts`, `segmentTypes.ts`, `toolLifecycleHandler.ts`, `agentStatusHandler.ts` | Require canonical segment/error fields; exact segment identity/type; typed late subscription; visible non-terminal diagnostics; remove defaults/serialized-ID keys/evidence loss/all-errors-terminal behavior |
| new `teamClientMessageFactory.ts` | Construct exact Team commands from typed addresses, allocate message/dedupe/command identities, and supply explicit arrays/null before strict serialization |
| `TeamToolApprovalTracker.ts` | Rename to `TeamToolApprovalTargetTracker.ts`; retain only invocation-to-execution-address association and remove token storage/access/casts |
| new `TeamLaunchDraft.ts` + existing `teamRunConfigStore.ts` (prefer rename to `teamLaunchDraftStore.ts`) | Own one deep-readonly pre-launch config/logical focus/pending-input snapshot; query the existing definition catalog rather than copying topology; replace through typed edit actions, with no duplicate current Team config |
| `agentTeamContextsStore.ts` + Team selection | Context store contains launched contexts under real root TeamRun IDs only; selection discriminates `{kind:"team_draft",draftId}` from `{kind:"team_run",rootTeamRunId}`; launch success commits context/selection/pending-input transfer synchronously after complete validation, while failure preserves the draft |
| `AgentTeamContext.ts` | Compose only `topology: TeamTopologySnapshot` and `executions: TeamExecutionState`; remove duplicate root ID/lifecycle, launched config, hydration, and transport/session fields; expose neither topology nor execution indexes as maps |
| new `services/teamExecution/teamRunFrontendProjectionBuilder.ts` | Atomically validate/project one closed canonical metadata + root-lifecycle + initial-focus + exact per-Agent seed input into run-ID/execution-address-free topology plus one persistent execution record per metadata node; reject lifecycle inference, missing/duplicate/surplus seeds, non-Agent focus, and repeated seed run/config/application identity; map every SDK-owned application-context field, validate its producer through the frontend canonical execution-address capability, and place it on execution; shared by launch and restore; no partially registered context |
| new `services/teamExecution/teamTopologySnapshot.ts` | Own immutable run-ID/execution-address-free `teamDefinitionName` plus logical/effective-launch-configuration topology, private canonical-address index, and typed lookup/list/configuration views |
| new `services/teamExecution/teamExecutionModels.ts` | Own the five correlated concrete variants plus one minimal task projection and typed query/navigation/effect views; root persistent Team uses `{kind:"root"}`, child persistent Team alone carries `{kind:"child",teamRunId}`, task Team identity derives from the task-chain tail, task executions store only `taskId`, and each Agent variant alone owns its typed platform/application execution bindings |
| new `services/teamExecution/teamTaskProjectionMapper.ts` | Convert one complete root-scoped GraphQL response into the closed `TeamTaskProjectionSnapshot`; require every concrete `taskRun.address`; validate root/run chain plus Agent receiver == task address without task-Agent ID or AgentTeam receiver == configured coordinator ingress inside the task Team; reject all on one invalid row, drop delivery receiver/parent/presentation label, and expose no repository/fetch behavior |
| new `services/teamExecution/teamExecutionState.ts` + private `teamExecutionTransitions.ts` / `teamExecutionNavigationProjector.ts` | Own valid execution union, private lookup/graph, Agent-context association, one monotonic task-projection index for active views and derived history, live/restore/focus/cleanup, typed effects/views; read but do not copy Agent-local state, reject staged reconciliation conflicts atomically, and keep support modules aggregate-private rather than public coordinators |
| `AgentContext.ts`, Agent streaming service, Team streaming service | Keep Agent-local configuration/conversation/status/tool/composer state on AgentContext; move `isSubscribed`/`unsubscribe` into transport-owned session maps; Team construction uses permanent IDs only and removes identity reconciliation/promotion assignments |
| `application-orchestration/domain/models.ts` + focused application-context value functions | Alias the SDK-owned `ApplicationExecutionContext` rather than redeclaring it; exactly clone/validate the three-field context and canonical producer address, assert persistent equality, and construct task-address rebound copies for server metadata/AgentRun boundaries; no generic record or second logical-address parser |
| `mixed-agent-member-handle.ts` | At its existing AgentRun-construction boundary, derive one exact execution address; use the application-context value functions to validate persistent producer identity or rebind task/task-Team-Agent producer identity before constructing `AgentRunConfig`; do not add an application-orchestration facade or post-publication repair |
| hydration/open/history/navigation/mobile/token/presentation/event-monitor/approval consumers | Use typed aggregate commands/queries/view rows only; preserve selected-root + exact-focus predicate |
| old `teamTaskExecution*` modules | Delete/absorb; no forwarding wrappers, topology cloning, aliases, or placeholders |
| `agent-team-execution/domain/team-leaf-agent-status-snapshot.ts` | Delete; replaced by the shared binding/status snapshot with no duplicate Team/name/run/execution identity |
| `services/agent-streaming/team-stream-agent-identity-payload.ts` | Delete; direct snapshot projection uses the shared Team Agent status projector |
| `agent-team-execution/services/team-member-command-start-status-events.ts` | Delete; exact status details/snapshot plus `createTeamAgentStatusEvent(snapshot)` replace the generic payload/event builder |
| `backends/mixed/events/mixed-team-event-bridge.ts` status-snapshot forwarding symbol | Delete `forwardMixedTeamLeafAgentStatusSnapshot` (or the entire file if no other owned behavior remains); exact canonical snapshots require no prefix/rebase/pass-through adapter |
| downstream live-test support/evidence | Reuse the supported package import, TeamRun launch, runtime catalog, `pnpm secrets:import`, and live E2E isolation patterns; no production test hook |
| `autobyteus-application-sdk-contracts/src/index.ts`, `manifests.ts`, binding/event contract modules | Replace V4 backend-definition/frontend-SDK constants and legacy route/path identity fields with V5 canonical address/execution contracts; export the one exact `ApplicationExecutionContext {applicationId,bindingId,producer}` type; retain independent manifest V4, bundle V1, iframe V4 |
| `autobyteus-application-backend-sdk` target-address/launch-profile helpers and dist | Consume V5 `memberAddress`, typed IDs, and execution address; remove route/path helper signatures; rebuild |
| `autobyteus-application-frontend-sdk` validators/startup and dist | Validate V5 canonical application event/target shapes; keep iframe V4 bootstrap transport; rebuild |
| server application/backend manifest parsers | Require exact V5 current values and return ordinary strict validation failure for any mismatch |
| `FileApplicationBundleProvider` / `ApplicationAvailabilityService` | Retain general invalid-package/catalog behavior only; add no V4 adapter or special compatibility/quarantine/upgrade path |
| `ApplicationBackendDefinitionLoader` | Require exported definition V5 before callable exposures/hooks/handlers |
| `ApplicationPlatformStateStore` / application test setup | Keep current-schema runtime store; recreate project-owned fixtures/databases directly and expose no predecessor migration path |
| `applications/brief-studio` and `applications/socratic-math-teacher` source/build/vendor/dist/importable trees | Advance source declarations/definitions/scripts to V5 and regenerate all artifacts plus fresh target-schema fixtures/databases from workspace outputs |
| package-consistency/identity coverage | Compare all project-owned V5 declarations/artifacts; prove exact V5 launch/binding/target/event, ordinary invalid-version rejection, and absence of application migration/fallback production code |

## Reusable Owned Structures Check

`AgentTeamAddress`, `ResolvedTeamRecipient`, `HandoffInstruction`, `GetHandoffRulesResult`, `TeamExecutionAddress`, the rooted node union, finite Agent segment vocabulary/canonical segment variants, exact Team transport DTOs, and the concrete execution union are reusable because multiple independent consumers need exactly the same semantics. They remain deliberately narrow. The send delivery envelope is operation-specific rather than a shared base for read-only guidance. `TeamRunTreeIndex`, active task execution tree, provider handles, run-owned segment state, and storage scope are owned internal views and are not promoted into public shared contracts.

## Shared Structure / Data Model Tightness Check

- Caller context has exactly two fields.
- Recipient union has exactly kind/address plus configured coordinator for AgentTeam.
- Agent node excludes Team fields; AgentTeam node excludes Agent launch/platform fields.
- `address` is persisted once per node; derived name/path/route values are not fields.
- Concrete persistent run ID is persisted once under the correct node kind.
- Handoffs are stored once because they connect nodes rather than configure one node.
- Handoff tool rows are derived and ephemeral: `from` is bound, `to` is renamed by operation meaning, and every rule becomes one `when` row.
- `workspaceRootPath` remains Agent-local because current data supports that cardinality.
- `workspaceId` and `memoryDir` are derived and not invented in metadata.
- Indexes repeat keys only ephemerally for performance and are never serialized.
- V5 exists once per changed semantic contract in the contracts package; manifest/bundle/definition fields reference it, while unchanged envelope versions remain separate facts.
- Application validation reuses the ordinary exact parser/loader boundary rather than adding a compatibility status model.
- `ApplicationExecutionContext` has one SDK-owned cross-process type. Server application-domain imports alias it, metadata/frontend boundaries validate every field and canonical producer address, and no `Record<string,unknown>` version remains current.
- Application persistence is not a rollout authority: project-owned fixtures/databases are recreated from the current schema, and canonical migration performs no application database discovery.
- Each Team domain event variant owns exactly the identity meaningful to that event; member input does not repeat its receiver. Task activation carries the just-persisted base task facts once; later variants carry only transition/correlation facts, while label and terminal state derive.
- `TeamAgentExecutionBinding` is identical for live events, initial snapshots, overlays, and frontend status admission. Only the task-Team Agent variant adds `agentRunId`, because that fact is not encoded by its execution address; the constructor still receives/validates the allocated ID for all three kinds.
- `TeamAgentStatusSnapshot` composes the binding with exact status details/status hint once. Status details contain no execution address, TeamRun ID, Agent ID/name, runtime kind, or task aliases; connection/event/history owners project the same value for their own boundaries.
- Provider segment candidates contain only explicit source facts. The run state stores only `{turnId,segmentId,type,lifecycle}`; canonical content repeats type because independent late consumers need a self-contained projection. No provider source content or browser state stores a second inferred type.
- Same-type active replay is not another downstream fact: it is dropped at the lifecycle owner, so non-replacing file initialization and transcript/output consumers need no reset-merging policy.
- `AgentRunErrorEvidence` keeps the original three real variants; wire fields are one required-nullable projection of that authority, and runtime/diagnostic is rejected rather than promoted into a fourth domain state.
- File-change context, transcript buffers, output collectors, and browser segments are not duplicate lifecycle models: each retains only the distinct domain state it must project and receives exact canonical identity from AgentRun.
- The Team transport union is strict and correlated; it has no shared optional identity base, arbitrary record, or dual spelling.
- `TeamLaunchDraft` stores only config, logical focus, and pending input; it queries the existing definition catalog for a read-only topology view rather than copying another topology authority, and it cannot represent a run or execution.
- Topology contains no task/presentation fields. Each execution variant requires its applicable real run IDs; no shared optional base creates invalid combinations.
- Each concrete task execution stores only a task ID reference. One private task projection owns task content/status/timeline once and supplies both active and history views; no mutable history archive, copied task snapshot, or stored presentation label exists.
- Backend task management stores `taskId` once on the task record and concrete execution once as `taskRun.address`. The active binding is a derived discriminated view, not a persisted identity object; member context adds only nullable task ID to its already-owned execution address.
- Token rows store canonical execution JSON, actual Agent run ID, optional task-operation ID, and usage facts. Root/member/task run components are derived; the root expression index is query acceleration, not a writable identity field.
- Serialized execution keys repeat identity only privately for lookup and never become a consumer-facing structure or presentation fallback.

## Final File Responsibility Mapping

Implementation should prefer modifying the existing owners above. New files are justified only for:

1. a discriminated rooted node/current metadata contract if the existing module cannot remain coherent;
2. a derived tree index;
3. one concrete execution-address domain/resolver pair; and
4. store-owned migration input/converter modules;
5. one token canonical-identity migration store because atomic row conversion plus schema/index contraction is a real persistence owner rather than helper indirection; and
6. a focused package-consistency verifier only if no existing build/test module can own the cross-artifact assertion;
7. one small `@autobyteus/team-stream-contracts` package because server/browser share a real runtime-validated transport boundary; and
8. one frontend `TeamLaunchDraft` model/launch owner because pre-launch editing is a different lifecycle from execution; and
9. one frontend `TeamExecutionState` aggregate with private pure transitions/navigation projection because concrete execution has a real lifecycle.
10. one focused `task-activation-event-barrier.ts` because synchronous task runtime events must be ordered behind durable activation at the existing TeamRun publication boundary; it is not a general event bus, retry queue, or task state owner.
11. one `team-agent-execution-binding.ts` because live events, connection snapshots, overlays, history, and frontend materialization require the same exact three-way execution identity invariant.
12. one `team-agent-status.ts` because status details/snapshot construction is reused by live, initial, overlay, and history producers while event/transport owners remain separate.
13. one focused Agent segment domain plus one run-owned lifecycle state/transformer pair because every provider and every standalone/Team/application/history/browser listener shares the same real start/content/end lifecycle invariant.

No new broad topology service, compatibility facade, generic state repository, or empty forwarding layer is designed. The Team Agent and Agent segment domain files own real reused invariants rather than forwarding; the contract package owns only transport; the draft owns no execution; the aggregate owns only browser concrete-execution state.

## Applied Patterns (If Any)

- **Aggregate snapshot:** one root TeamRun file restored atomically.
- **Discriminated union:** illegal Agent/AgentTeam fields are unrepresentable.
- **Derived index:** performance view with no persistence authority.
- **Functional core / imperative shell:** pure address/tree validation and conversion inside lifecycle/storage shells.
- **Anti-corruption migration boundary:** legacy schemas terminate before current runtime.
- **Thin adapter:** providers/transports preserve shared domain result.
- **Correlated protocol union:** source discriminator, exact payload, and runtime schema stay one variant from server mapping through browser admission.
- **Aggregate/state machine:** `TeamExecutionState` owns concrete execution transitions and invariants; private pure reducers/projectors support it.
- **Action-oriented projection:** LLM tools expose the smallest next-decision shape instead of internal service metadata.
- **Run-owned state machine:** one serialized aggregate owner correlates minimal lifecycle facts and emits stateless self-contained projections.

## Target Subsystem / Folder / File Mapping

The detailed repository inventory and target seams are recorded in [investigation-notes.md](./investigation-notes.md). The principal implementation surface is:

- `autobyteus-server-ts/src/agent-collaboration/`
- `autobyteus-server-ts/src/agent-team-definition/`
- `autobyteus-server-ts/src/agent-team-execution/`
- `autobyteus-server-ts/src/agent-execution/domain/` and `events/processors/segment-lifecycle/`, plus the existing AutoByteus/Codex/Claude normalizers;
- `autobyteus-server-ts/src/agent-execution/events/processors/file-change/`, lifecycle-status/error observers, `agent-memory/services/`, `agent-execution/compaction/`, `skill-improvement/services/`, `external-channel/runtime/`, application streaming, and standalone/Team streaming egress;
- `autobyteus-server-ts/src/run-history/`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/` and Agent task tools
- `autobyteus-server-ts/src/app-data-migrations/`
- GraphQL/REST and project-owned application SDK/integration packages
- new `autobyteus-team-stream-contracts/` workspace package plus Team WebSocket server/frontend adapters
- new `autobyteus-web/services/teamExecution/` capability (`teamTopologySnapshot`, `teamRunFrontendProjectionBuilder`, `teamExecutionModels`, `teamTaskProjectionMapper`, `teamExecutionState`, and aggregate-private transition/navigation projection modules), plus contexts and hydration/open/history/navigation/mobile/token/presentation consumers
- existing standalone/Team browser segment/error protocol, identity, handler, status presentation, and application stream projection modules;
- memory/context storage components
- existing Agent-package import, secret-import CLI, and live E2E support used by the downstream [nested-classroom validation contract](./nested-classroom-live-validation-contract.md);
- `autobyteus-application-sdk-contracts/`, `autobyteus-application-backend-sdk/`, and `autobyteus-application-frontend-sdk/`;
- `autobyteus-server-ts/src/application-bundles/`, `application-engine/worker/`, `application-orchestration/`, and `application-storage/`; and
- `applications/brief-studio/` and `applications/socratic-math-teacher/`, including their generated/vendor/importable outputs.

## Folder Boundary Check

The target follows capability ownership rather than placing domain state under transport. Address is collaboration-shared; rooted execution is AgentTeam execution/run history; tasks remain task-owned; migration remains store-owned/coordinated. The new Team stream package exists because a real process boundary needs one runtime-valid contract; it owns no business policy. New `autobyteus-web/services/teamExecution/` owns the immutable topology projection, all-or-nothing metadata projection builder, concrete execution aggregate, and its private pure reducers/projector. `services/agentStreaming/` owns only connection/session orchestration, strict message admission/routing, and exact client-command construction; it depends inward on the execution aggregate, never the reverse. Hydration/open/history/navigation consume the aggregate's public query/transition boundary and cannot import its private reducers. No folder exists only to rename or forward another subsystem's value.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

Canonical persisted outline:

```ts
type TeamRunNode =
  | Readonly<{
      kind: "agent";
      address: AgentTeamAddress;
      agentDefinitionId: string;
      agentRunId: string;
      platformAgentRunId: string | null;
      role: string | null;
      description: string | null;
      runtimeKind: RuntimeKind;
      llmModelIdentifier: string;
      llmConfig: Readonly<Record<string, unknown>> | null;
      autoExecuteTools: boolean;
      skillAccessMode: SkillAccessMode;
      workspaceRootPath: string | null;
      applicationExecutionContext: ApplicationExecutionContext | null;
    }>
  | Readonly<{
      kind: "agent_team";
      address: AgentTeamAddress;
      teamDefinitionId: string;
      teamRunId: string;
      coordinatorAddress: AgentTeamAddress;
      role?: string | null;
      description?: string | null;
      children: readonly TeamRunNode[];
    }>;
```

Root metadata is stored at:

```text
<memoryDir>/agent_teams/<rootTeamRunId>/team_run_metadata.json
```

and must satisfy:

```text
rootTeam.kind      = agent_team
rootTeam.address   = /
rootTeam.teamRunId = <rootTeamRunId directory identity>
```

A full representative persisted JSON and the migration/runtime identity case spines are normative in [team-run-canonical-identity-refactor.md](./team-run-canonical-identity-refactor.md) §§5 and 10. Exact Team event/status/frontend execution/application-producer models and the Team case spines are normative in [team-stream-execution-projection-contract.md](./team-stream-execution-projection-contract.md) §§4–13. Exact segment source/canonical shapes, state transitions, replay/cleanup behavior, complete consumer inventory, the sole downstream exact-turn diagnostic branch, and actual-boundary examples are normative in [agent-segment-lifecycle-contract.md](./agent-segment-lifecycle-contract.md) §§2–9.

## Backward-Compatibility Rejection Log (Mandatory)

| Rejected shortcut | Reason |
| --- | --- |
| keep `recipient_name` alias | the value is not a flat name and the alias preserves misleading public semantics |
| add `recipient_path` alias | “path” describes notation, not recipient-domain meaning; a second field recreates selector ambiguity |
| keep deprecated path/route fields | preserves the competing authority and contradictory states |
| tolerant current reader | guesses among contradictory historical values and spreads legacy knowledge |
| require legacy `memberName` to equal route/path | conflates independent historical display and structural meanings and rejects the maintained safe fixture |
| change only completed `20260517...` code | terminal migration records skip that ID, so supported predecessor output would never reach the correction |
| add a third migration ID | the separately pending/unreleased `20260801...` ID already owns canonical conversion across the supported TeamRun and token predecessor states |
| revise target token logic under terminal `20260703...` | supported predecessor records cause `runPending()` to skip it; keep the record historical and remove the definition from current registry authority |
| add a second token-specific startup gate | composing token conversion into `20260801...` makes the existing exact canonical gate complete; another gate would duplicate rollout policy |
| keep per-row token mutation API | it cannot express all-or-nothing database ownership and produces dishonest partial-success summaries on later failure |
| dual schema/write | makes partial migration observable and permanent |
| local/root resolver fallback | hides incorrect child construction and makes address nondeterministic |
| global basename search | breaks same-name disambiguation |
| coordinator fallback to first Agent | changes configured semantics |
| persisted topology/profile/binding tables | over-normalizes one JSON aggregate and repeats the join key |
| key frontend only by member address | collides persistent and task executions |
| store memory by logical address | breaks concrete-run ownership and existing paths |
| rewrite opaque provider history | treats display payload as routing data |
| keep a generic success envelope for `get_handoff_rules` | exposes transport/service machinery rather than the condition and destination the Agent needs |
| keep Team handoff tools configuration-gated | permits a system instruction that the Agent cannot execute and duplicates Team protocol in package configuration |
| edit the external nested-classroom package for tests | violates source-package scope and makes live evidence depend on mutable user data; stage an isolated test-owned package instead |
| treat unavailable provider row as skipped Pass | does not prove the user-required three-runtime behavior and hides environment/product failures |
| change backend/frontend SDK shapes under V4 | existing exact gates would falsely label old shapes as the current contract |
| accept V4 and translate to V5 | recreates a mixed-version adapter for a feature with no supported predecessor cohort |
| bump manifest/bundle/iframe envelope versions to V5 mechanically | conflates independent unchanged protocols with the two breaking SDK semantics |
| add or inventory application predecessor DB migration | creates preservation/legacy machinery for unused unsupported state; rebuild/reset project fixtures directly |
| add a V4-specific quarantine/upgrade/reinstall workflow | turns ordinary invalid target input into a compatibility subsystem the user explicitly rejected |
| hand-edit only source or only generated application artifacts | permits importable/vendor runtime divergence from checked source |
| keep generic Team `ServerMessage` and validate in consumers | leaves source/payload/identity agreement distributed and recreates API-F-015 |
| wrap initial connection status in a fake `TeamRunEvent` | connection snapshot is current state, not a newly published domain fact; call the same exact status projector directly |
| keep a second snapshot/overlay binding parser | permits live, initial, and pre-run status to disagree about task-Agent/task-Team-Agent identity; construct one binding at the runtime/config owner |
| keep `TeamLeafAgentStatusSnapshot` or generic command-start payload | repeats TeamRun, Agent name/run, task aliases, and execution identity beside the new exact binding/status details |
| accept camel/snake task aliases | preserves two current contracts and request-time compatibility logic |
| keep both member-input `execution_address` and `recipient_address` | creates two authorities for one receiver |
| wrap the public `agentExecutionsByKey` map | preserves the bypass instead of establishing one authoritative state owner |
| clone topology into task execution | conflates mounted structure with concrete runtime and requires invalid placeholder IDs |
| create missing task-Team children with empty IDs | represents an execution that does not exist and breaks focus/history invariants |
| make `TeamExecutionState` fetch GraphQL or mutate navigation directly | turns the aggregate into an orchestration blob; return only true external-work effects and derive navigation through its query boundary |
| reuse `AgentTeamContext`/`AgentContext` for a pre-launch draft | creates synthetic run/conversation identities and a cross-index promotion transaction; keep `TeamLaunchDraft` identity-free and construct execution after success |

## Derived Layering (If Useful)

```text
Address/handoff domain
  <- definition mounting + TeamRun-tree compilation
  <- metadata/current store + derived index
  <- persistent/task runtime and recipient/execution resolvers
  <- communication/task/events/history/storage
  <- API/SDK/integrations/frontend
```

Migration runs alongside store ownership before the current-store layer becomes active.

## Change / Refactor Sequence

1. Freeze SR-006 behavior and inventory all legacy identity producers/consumers.
2. Introduce `recipient_address` / `RecipientAddressExpression`, cut both recipient tools and provider manifests together, and tighten `AgentTeamAddress` plus pure derivation tests.
3. Replace `get_handoff_rules`' generic envelope with the ordered `{when,recipient_address}` projection; compose intrinsic Team communication tools; cut the filesystem-like completion instruction across AutoByteus/Codex/Claude seams.
4. Add rooted node/v3 metadata validators and derived index.
5. Refactor definition mounting, coordinator/handoff compilation, and typed ID assignment.
6. Cut metadata create/write/strict restore.
7. Cut persistent child/root runtime to shared tree/index.
8. Cut task Agent/AgentTeam factories and active directories to task ID + exact execution address; delete synthetic task instance identities and copied owner/parent/run/time fields.
9. Introduce/carry `TeamExecutionAddress` through runtime and durable records.
10. Extract one TeamRun migration-only flat decoder; preserve stable `20260517...` as its pending predecessor-record owner; correct `20260801...` as the sole final-v3 owner from predecessor or residual flat input; implement DS-009A–D record/order/backup/byte-stability/idempotence coverage.
11. Move IR-014 token orchestration out of historical `20260703...` into the `20260801...` token item; order the two required pre-existing token backfills before it; remove the old converter and both narrow column-drop definitions from current registry; give one store transaction ownership of canonical row updates, obsolete-column/index replacement, and verification; omit obsolete fields from target Prisma/domain/repository shapes; implement DS-013A–D terminal-record/no-mutation/data+schema rollback/retry coverage.
12. Keep `server-runtime.ts` on the one exact `20260801...` pre-listen gate and prove token failure/missing/canonical-warning block while unrelated warnings do not. Then cut target-only repositories and remove normalizers.
13. Preserve the implemented V5 application/GraphQL/REST canonical contracts; make V5 application SDK contracts own the exact `ApplicationExecutionContext` type, alias it from the server domain, replace metadata/browser generic-record casting with exact canonical-address-aware mapping, and at the existing `MixedAgentMemberHandle` AgentRun-construction boundary validate persistent application producer addresses and rebind task/task-Team-Agent producer addresses before `AgentRunConfig`; prove DS-016 source attribution. Add `@autobyteus/team-stream-contracts` as the only exact Team WebSocket DTO/schema/serializer owner.
14. Refactor task activation into prepare/start/commit-or-abort phases over derived `ActiveTaskExecutionBinding`; add the one TeamRun publication barrier; make activation persistence throw on failure instead of logging-and-continuing; and prove activation precedes synchronously emitted task-Agent/task-Team-child events while unrelated Team events bypass. Add the one Team Agent execution-binding constructor and exact status-details/snapshot value; cut live Agent admission, initial connection/open/restore snapshot enumeration, config-backed offline status, pre-run command overlays, and run-history list projection to those owners. Then add the exhaustive standalone-Agent -> correlated-Team-Agent ingress adapter, filter duplicate Agent collaboration events, correlate TeamRun/task events, and cut the Team mapper/broadcaster/egress/client handler plus browser admission atomically. Initial status calls the shared status projector directly without a TeamRun event; pre-run status uses `createTeamAgentStatusEvent(snapshot)` and clears on the first matching live status. Activation carries only the durable base create/start facts, result events carry only their event-specific correlation/decision/time facts, and presentation label/status/terminal/update state derives; duplicate status publication, generic `task_context`, and separate activation run-ID results are removed. Remove the unused Team approval-token shapes and implement DS-014A–J real producer-to-consumer and invalid-no-mutation seams.
15. Introduce identity-free `TeamLaunchDraft`, run-ID/execution-address-free immutable `TeamTopologySnapshot`, the five-variant concrete execution union, `TeamExecutionState`, one task-ID projection index, and one all-or-nothing `TeamRunFrontendProjectionBuilder`; move each persisted Agent node's application producer context into its paired concrete Agent execution, rebind task variants to their exact task addresses, reduce `AgentTeamContext` to topology/executions, keep stream session state transport-owned, construct the paired persistent context only after real server allocation, then route activation/task-refresh/Agent events and GraphQL restore/hydration through its transitions. Stage complete task-record merges atomically and derive history from the same retained projection.
16. Cut focus/open/history/navigation/status/timeline/presentation/approval/event-monitor/token/mobile/desktop callers to typed aggregate APIs; preserve selected-root + exact-focus behavior.
17. Cut successful draft replacement/pending-input transfer to the launch owner and terminal cleanup to the aggregate; implement DS-015 draft-success/failure, convergence, focus, and cleanup cases.
18. Delete old task projection/tree/router/restore files, public topology/execution maps and raw-key parsers, frontend-topology run bindings, duplicate context root/lifecycle/config/hydration/subscription fields, AgentContext connection ownership, copied task snapshots/separate mutable history, stored task labels, duplicate task-status event, legacy `TeamLeafAgentStatusSnapshot`, generic initial-status mapper, generic command-start status builder, redundant snapshot-prefix/pass-through symbol, synthetic task identities/context/result fields, redundant current token identity columns, provisional/empty identities and rebase code, mixed topology fields, wire aliases/duplicate identity, dormant route branches, dead route results, and the application database migrator; enforce the exact six-path released-data migration-only legacy allowlist plus existing V5 constraints.
19. Add the finite Agent segment domain, one run-owned state, and first pipeline transformer; preserve the original three-variant error evidence; synchronize command-turn/termination facts and processor run release through the existing queue. Cut AutoByteus/Claude to their required exact turns. Add the one Codex thread-owned pure `resolveCodexSegmentTurnAdmission` plus the exact four-name production-applicability/inheritance set; invoke the resolver only for those four names in `CodexThread.handleAppServerNotification()` before the handler, while every other current event keeps its operation-owned route. Replace generic listener/converter input with the opaque thread-branded admitted-native/local-derived union and private constructors. Prove governed rejection precedes pending-MCP mutation/derived emission/raw capture and valid MCP/non-segment/debug behavior remains. Then cut Codex conversion to exact current-family routing over the admitted turn without broad-prefix segment construction, re-resolution, or raw fallback; cut all three providers to explicit starts and minimal content/end; and make same-type active start a transformer-owned no-op.
20. Atomically cut the complete canonical fan-out: file change, lifecycle/failure/command observers, memory/history, compaction, skill improvement, external channel, application, standalone/Team/error/coalescing, and browser. Delete repeated/defaulted source type, file end-type/repeated-start overwrite, segment aliases/derived identity/end-text recovery, evidence loss, consumer lifecycle/defaults, serialized/ID-only browser identity, all-errors-terminal handling, and fabricated provider-type fixtures. Implement DS-017A–G and the complete supplement matrix, including one test per exact governed Codex name plus explicit-location agreement, blank/non-string, conflict, inactive, reasoning-tracker, sanitized-log, and no-raw-fallthrough seams. Do not add a synthetic unknown-name case.
21. Run implementation and full cumulative source review, including all retained migration/application/provider/storage evidence plus DS-014A–J/DS-015/DS-016/DS-017A–G. Keep API/E2E paused until Pass.
22. API/E2E first resolves CR-F-043 by removing only its owned disposable residue, correcting cleanup evidence, and repeating the protected-target audit; then resume affected/deterministic/API/browser/imported three-runtime execution through the existing coverage and live-validation contracts with no skip-based Pass.
23. Reconcile durable documentation.

## Key Tradeoffs

- Cohesive rooted JSON is preferred over normalized tables because this is one atomic run aggregate.
- Per-Agent workspace repetition is preserved rather than assuming an unproven global invariant.
- Task AgentTeams materialize fresh execution state because they are concrete new runs, but logical addresses remain shared.
- Blocking migration reduces availability during upgrade but prevents routing against partially converted identity. Reusing pending `20260801...` for token semantics avoids a redundant migration/gate authority; the token store still owns the database transaction internally.
- Atomic project cut rejects mixed-version compatibility in exchange for one clean current contract. V5 is assigned only to the breaking backend-definition/frontend-SDK semantics; unchanged manifest/bundle/iframe versions retain their own numbers.
- Logical address and concrete run IDs both remain because they answer different questions.
- One small Team stream contract package is accepted to remove duplicated server/browser protocol authority; it is deliberately transport-only.
- Task AgentTeam descendants appear only when concrete run IDs exist. Truthful partial materialization is preferred over a visually complete but invalid cloned tree.
- Pre-launch editing uses a separate draft rather than convenient `AgentContext` reuse. One explicit pending-input/focus transfer after launch is cheaper and clearer than synthetic run/conversation IDs plus identity rebasing.
- One frontend execution aggregate centralizes lifecycle authority; private pure reducers/projectors preserve separation of concerns without exposing alternate owners.
- One small per-AgentRun segment state is accepted because type is established once but required by independent later consumers. Keeping it at the first common serialized boundary is smaller than repeating state/defaults in three providers, Team, application, and browser layers.
- Consumer-specific file/transcript/output state remains because it models different subjects and outcomes; exact canonical input plus owner-level replay rejection is preferred over erasing valid projection state or giving it segment-lifecycle policy.

## Risks

- missed route/path producer recreates a competing authority;
- display-only `memberName` could be reintroduced as structural validation, rejecting safe history;
- terminal prerequisite records could be mistakenly expected to rerun, or residual flat items could require an unavailable post-listen retry surface;
- the terminal historical token ID could remain registered as target authority, causing corrected conversion never to execute for supported predecessors;
- per-row token commits, independent column drops, or premature `MIGRATED` details could leave/describe a partially converted database after later failure;
- a large token row+schema transaction could increase upgrade time; deterministic preflight, mutation only after complete planning, bounded failure details, progress logging, expression-index verification, and idempotent retry mitigate it without weakening atomicity;
- a physical Prisma drop migration or incorrectly ordered provider backfill could erase/read predecessor fields before canonical planning; the registry and target schema deliberately separate generated-client omission from app-data-owned physical contraction;
- a root-Team query could regress into a full ledger scan after removing `root_team_run_id`; the store-owned JSON-root expression index and query-plan coverage are required;
- deleting synthetic task identity could expose a caller that was using a copied field as hidden routing authority; the complete source inventory must move each caller explicitly to task ID, exact execution address, or actual Agent run ID by subject rather than add a replacement bundle;
- genuine route/path/topology contradictions could be weakened while accepting display divergence;
- task-chain conversion could merge equal logical addresses if run IDs/order are mishandled;
- speculative application database migration or compatibility machinery could survive despite the direct forward-only cut;
- root-tree sharing could accidentally materialize siblings or leak mutable objects;
- task execution could accidentally persist a second logical tree;
- frontend state could collide if any map uses only member address;
- physical storage could move accidentally during naming cleanup;
- an over-broad result refactor could change `send_message_to` exact-run codes while simplifying the independent rule-query result; and
- provider-specific prompt/exposure logic could omit or weaken the intrinsic completion protocol;
- the external classroom fixture's obsolete prose could exercise a removed task selector unless the staged overlay is explicit; and
- live provider credentials, catalogs, rate limits, or processes could fail, requiring truthful Blocked/Fail evidence rather than a false pass;
- a stale project application manifest/vendor/importable copy could pass source compilation but fail or misbehave when imported;
- application implementation could accidentally retain the removed database migrator or special V4 compatibility/quarantine workflow; source inventory must prove both absent; and
- a manifest could claim V5 while exporting a non-V5 backend definition, requiring the loader's final exact gate before callable behavior;
- strict Team wire admission could expose a real producer drift; rejection must be observable and mutation-free rather than normalized;
- connection/open/restore status could remain on a generic `ServerMessage` path or be disguised as a fake TeamRun event, leaving two projection authorities;
- a task-Team Agent snapshot/overlay could omit or guess its genuine member AgentRun ID even though the child runtime context already owns it, or a task Agent could repeat rather than validate the ID encoded by its execution address;
- the pre-run overlay could retain name/runtime/task aliases, fail to clear on real status, or clear a different same-address task execution if it does not key by the full canonical execution address;
- task runtime startup currently emits before durable activation; an unbounded or transport-owned workaround would either reorder unrelated Team events or recreate missing-parent inference. The exact-subtree bounded publication barrier, activation-specific throwing persistence, synchronous ledger commit, and forced start/persist/overflow cleanup proofs contain that risk at its producer owner;
- the contract package could become a wrong-domain shared module if routing/topology enters it;
- `TeamExecutionState` could become a coordination blob if it fetches GraphQL or mutates navigation instead of returning effects;
- consumer migration could leave a raw-map/key-parser bypass; removal and exact-path scans must be compile/review gates;
- task-Team child materialization could regress into empty-ID placeholders instead of awaiting a real Agent event/hydration;
- task events could recreate a second partial lifecycle/timeline overlay, or a stale complete query could erase a concurrently activated task/history row;
- `ApplicationExecutionContext.producer.executionAddress` could remain hidden in supposedly run-ID-free topology, or server/frontend task Agent contexts could retain the persistent producer address and misattribute runtime artifacts/events;
- pre-launch UI code could leak draft IDs into execution/history/stream identity or lose pending input/focus during successful replacement; and
- latest selected-TeamRun gating could be lost while moving focus, marking an identical-address row in another TeamRun current.
- segment state could be put after a processor/listener, causing some consumers to see raw content, or cached on the singleton pipeline and leak across runs;
- a runtime snapshot could pre-clear a turn before final ordered content in the same batch, or command acceptance/termination could update only one of the two run-owned lifecycle states;
- providers could retain repeated content/end type or invent text for unknown semantics, while browser/application code could preserve its old fallback and become a second authority; and
- file change could keep reading type from end or overwrite streamed context on repeated start; memory/history/output consumers could retain derived turn/ID/type or end-text fallbacks and remain hidden parallel authorities;
- a converter-local Codex gate could let the notification handler mutate pending MCP/emit a local completion and let converter debug persist the raw candidate before rejection; a generic listener/converter input or fabricated branded value could also bypass the first-boundary decision; and
- byte-equality deduplication could drop legitimate repeated deltas, while unbounded reorder buffering would conceal provider defects and leak state.

Mitigation is semantic-role-aware predecessor validators, one independently pending `20260801...` released-data owner, fresh/terminal TeamRun DS-009 and token DS-013 chain coverage, fail-not-guess planning, byte/row-stable rejection, one verified token row+schema transaction with forced post-update/post-DDL rollback proof, provider-before-canonical order and fresh-install coverage, canonical root-query/index-plan proof, idempotence, task-identity contraction scans, exact three-level persistent/restored/task coverage, one execution serializer, one Agent binding/status constructor set, real connection/open/restore plus pre-run/replacement DS-014I/J seams, exact six-path source allowlist enforcement, exact V5 target validation, source-to-generated/vendor/importable/fresh-database consistency and application no-migration scans, canonical application launch/binding/event round trips plus DS-016 persistent/task published-artifact and application-stream producer proof, byte/path storage preservation tests for supported released data, exact handoff projection/order tests, provider prompt snapshots, intrinsic-exposure tests, independent send-envelope regression coverage, all real producer/projection-to-serializer-to-strict-parser-to-consumer DS-014A–J seams, activation-base/post-activation-refresh contract tests, monotonic staged task reconciliation with concurrent-query/terminal-descendant proof, identity-free draft success/failure plus valid/live-restore/focus/cleanup DS-015 seams, DS-017A–G actual provider-to-complete-consumer seams, file context replay/end/cleanup proof, memory/compaction/skill/external exact-input proof, exact four-event first-boundary Codex admission with pending-MCP/local-event/raw-debug no-effect rejection and admitted MCP/debug controls, plus original three-variant error wire/presentation proof, explicit queue/order/snapshot/command/termination/replay proof, no-default/no-end-recovery/no-fabricated-type scans, exact-path removal scans, and the isolated/redacted/no-skip DS-011 live matrix after API-owned cleanup.

## Guidance For Implementation

- Treat requirements and all six supplements as normative; this specification supplies ownership and sequence.
- Build target validators before migration converters.
- Preserve genuine Agent fields byte/semantic-equivalently.
- Make root and nested AgentTeam nodes one type.
- Make persistent children share the root metadata/index; prove object/model sharing in tests.
- Make task AgentTeams allocate fresh typed IDs while preserving addresses/coordinator.
- Keep the shared recipient result minimal and identical for message/task.
- Keep authored/persisted handoff edges unchanged, but expose only ordered `{when,recipient_address}` rows to the Agent.
- Materialize Team communication tools from Team runtime after configured tool resolution; do not require package duplication or allow duplicate canonical names.
- Inject one semantic filesystem-like collaboration block for every Team-bound provider lifecycle and enforce the completion/blocked lookup instruction.
- Do not reuse or change the send delivery envelope merely to simplify `get_handoff_rules`.
- Keep provider handles, runtime configs, nodes, and lifecycle IDs private behind operation owners.
- Use one `TeamExecutionAddress` serializer everywhere.
- Implement the correlated TeamRun/task event unions before mapper cleanup; use exhaustive narrowing and `assertNever`, never casts.
- Implement the finite segment domain and run-owned lifecycle state before cutting any segment consumer. Pass that state through the existing queue/pipeline input; keep the cached pipeline stateless and make segment admission the first transformer.
- Providers emit only explicit semantic starts and minimal content/end. Preserve native AutoByteus content without type, add missing Codex reasoning/Claude text starts at their current creation owners, and reject unknown types rather than defaulting. Do not introduce a provider-specific Team branch.
- Treat every post-transform processor/listener as one clean canonical cut. File change uses non-replacing segment initialization, content-preserving matching tool enrichment, exact file context, and no end type; memory/history, compaction, skill, and external output use exact compound identity/content and no aliases/derived identity/end text. None reads the segment state.
- Team/standalone/application/browser code accepts only post-lifecycle canonical segment/error events. Keep Team/application adapters stateless; require type on canonical content; use exact turn+segment browser lookup and stored-type agreement; support late subscription only from required canonical type.
- Require authoritative provider turn admission before any provider mutation or AgentRun enqueue and preserve the original three `AgentRunErrorEvidence` variants. For Codex, invoke only the thread-owned `resolveCodexSegmentTurnAdmission` from `CodexThread.handleAppServerNotification()` when the name belongs to the exact four-event production-applicability/inheritance set. Every other current event keeps its operation-owned route without a non-segment exemption registry or unknown-event policy. Governed rejection must return before notification handling, pending MCP, local/original emission, listener/converter, reasoning, and raw debug. Forward only the immutable admitted canonical params through the opaque thread-branded union; do not re-resolve, structurally manufacture/cast the value, or permit generic/raw/direct converter input. Preserve admitted MCP coordination and admitted-event debugging. Require scope/effect/turn fields on Agent error wire DTOs (nullable only by established semantics), reject runtime/diagnostic, and keep the sole downstream turn diagnostic visible but non-terminal across browser/application/external/command/lifecycle/compaction/skill consumers.
- Apply command-accepted turn IDs, explicit turn facts, ordered terminal facts, and accepted termination to the segment state at the exact AgentRun queue boundary. Do not pre-clear final batch content from an already-advanced runtime snapshot, buffer/reorder missing starts, or dedupe equal content bytes.
- Implement `createTeamAgentExecutionBinding` and the exact status-details/snapshot constructors before changing any status producer. Every mixed persistent/task/task-Team handle and offline config-backed member must call that same boundary with its exact execution address and allocated AgentRun ID.
- Make `TeamRuntimeSnapshotService` project `TeamAgentStatusSnapshot` directly through the same `projectTeamAgentStatusMessage` used by the correlated live `AGENT_STATUS` arm. Do not manufacture a TeamRun event, use generic `ServerMessage`, or retain `TeamLeafAgentStatusSnapshot`/`team-stream-agent-identity-payload.ts`.
- Give `MemberCommandStatusOverlayStore` an already-constructed binding and exact status facts only. Publish through `createTeamAgentStatusEvent(snapshot)`, store only details by the full private execution key, and clear on the first matching typed real status. Delete the generic command-start status builder and all display/runtime/task aliases.
- Make `@autobyteus/team-stream-contracts` strict and transport-only. Team broadcaster/egress and browser/server command admission must accept its exact types, not generic records.
- Use one receiver/execution field per Agent/task/member-input variant; keep both communication participants only because they are semantically distinct.
- Keep task events semantically tight: activation publishes the durable base facts exactly once; later task events only signal a transition and request a complete record refresh. Derive labels/terminal state, and never create a partial task/timeline projection from an update event.
- Prepare and bind the exact task execution before starting it, then derive `taskRun.address` and open exactly one bounded publication barrier for that subtree. Durable activation persistence is mandatory: publish activation and drain FIFO only after persistence plus synchronous ledger/directory commit; otherwise discard held events, settle/unregister the new runtime, and return `not_started`. Do not buffer in WebSocket/browser code or materialize a missing task parent from a child event.
- Make topology immutable, run-ID/execution-address-free, and task-free. Construct only the five valid concrete execution variants with real run bindings; application producer context belongs to each concrete Agent execution and is rebound for task variants; absent task-Team Agents remain absent.
- Enforce the application producer invariant at source too: `MixedAgentMemberHandle` derives the exact address once, rejects a mismatched persistent context, and rebinds a task/task-Team-Agent context before `AgentRunConfig`. Do not repair producer identity in artifact/event consumers.
- Keep pre-launch configuration/focus/pending input in `TeamLaunchDraft`. Do not create a provisional TeamRun/AgentRun, execution address, AgentContext, or conversation. On launch success construct the canonical context and transfer once; on failure preserve the draft.
- Make `TeamExecutionState` the sole execution/focus/lifecycle owner. Keep its index private; consumers pass typed addresses and receive typed records/views/effects. Private reducers/projectors may support it but cannot become public mutation paths.
- Route live events, task-record restore/hydration, and terminal cleanup through the aggregate. Store each task projection once, let executions reference only task ID, merge append-only complete snapshots monotonically in a staged atomic candidate, and derive history rather than storing it again. Let the launch/context store only replace a draft with a fully constructed real topology/execution context and preserve selected root TeamRun as its separate workspace-selection fact.
- Delete, do not wrap, the old task tree/projection/router/restore modules and raw map/key parsers.
- Never compare historical TeamRun `memberName` with route/path or rewrite it to manufacture agreement; it is display-only input and is omitted from v3.
- Derive a predecessor node address only after normalized `memberRouteKey` and `memberPath` agree exactly; reject parent/duplicate/coordinator/run contradictions without mutation.
- Keep flat TeamRun interpretation in one migration-only decoder. `20260517...` owns the pending predecessor write; `20260801...` owns final v3 and may compose that decoder for residual flat input after a terminal record. Do not depend on terminal ID reruns, require a listening API for recovery, duplicate the decoder, or add a speculative third TeamRun migration.
- Treat DS-013A–D as normative. Remove `20260703_token_usage_execution_address_backfill` from current registry authority, compose the preserved strict token index/planner under `20260801...`, and never reset or reinterpret the historical record.
- Give the token migration store exactly one immutable transaction method. Complete all planning first; then atomically update exact addresses, remove every obsolete Team identity column/index, create/verify `token_usage_ledger_events_execution_root_observed_at_idx`, and validate retained rows/facts. On any failure roll back data and schema and report zero migrated rows/columns. Do not expose per-row commits or independent drop methods.
- Attempt provider/model backfills before canonical contraction without making them prerequisites, remove the old converter and both narrow cleanup definitions from current registry, and keep the one existing exact canonical pre-listen gate; unrelated warnings stay non-blocking.
- Use task ID for task management and `TeamExecutionAddress` for concrete resolution. Do not recreate task-instance aliases, copied task owner/run/time bundles, generic `task_context`, or activation-result run-ID fields in domain, work packets, status, token, wire, or provider contracts.
- Treat the four DS-012 case spines as normative: target artifact build, exact current validation, exact V5 launch, and target consistency/no-migration proof.
- Keep V5 constants/types in the contracts package; do not introduce a compatibility service, V4 adapter, version-specific quarantine/upgrade workflow, predecessor application reader, or duplicated version-literal policy.
- Keep invalid-package handling generic. A non-target declaration fails ordinary exact parsing/loading before execution; it does not start a compatibility lifecycle.
- Do not discover or migrate application platform DBs. Recreate project fixtures/databases directly in current schema and prove `20260801...` has no application item.
- Regenerate, do not selectively patch, SDK dist/vendor/importable outputs and fail consistency coverage on any stale V4 semantic declaration.
- Do not alter delivery-owned dirty documentation/finalization files during solution design.
- Do not run live provider tests during design. SR-023 changes solution artifacts only; implementation and API/E2E execution remain paused until architecture and focused/full source review pass. API/E2E owns CR-F-043 cleanup before any resumed live run.
