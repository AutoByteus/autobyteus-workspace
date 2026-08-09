# AgentTeam Hierarchical Communication And Handoffs — Design Specification

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

The production application path has an existing semantic compatibility boundary that SR-011 did not map. `@autobyteus/application-sdk-contracts` declares backend-definition V4 and frontend-SDK V4; its V4 launch, binding, target, and producer/event contracts contain `memberRouteKey`, `memberPath`, `teamPath`, and generic run fields. `parseApplicationManifest` requires frontend SDK V4, `parseApplicationBackendManifest` requires both V4 SDK values, and `ApplicationBackendDefinitionLoader` requires exported definition V4. `FileApplicationBundleProvider` already excludes parser failures into `ApplicationCatalogDiagnostic`; import validation fails them and application availability quarantines a diagnosed application. Therefore changing V4 types in place would make a supported installed old V4 bundle look current. Separately, `ApplicationPlatformStateStore.listExistingPlatformDatabasePaths()` enumerates physical platform databases without catalog membership, which is the correct durable migration inventory seam.

CRR-022 exposed one narrower migration-design defect after SR-012 implementation. The stable flat writer stored `memberName` as presentation and normalized `memberRouteKey` independently; the maintained safe fixture contains `Program Manager` / `program_manager` and `QA Specialist` / `qa_specialist`. The predecessor `memberTree` schema likewise accepted `memberName` independently from structural `memberRouteKey`/`memberPath`. `AppDataMigrationRunner.runPending()` skips a migration whose ID is already `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`. A read-only operational inventory found predecessor member-tree files and a terminal `20260517_team_run_metadata_member_tree` record, while the ticket-owned `20260801_team_canonical_identity` ID was absent. SR-013 assigned final TeamRun conversion to the later pending canonical owner and passed complete ARCH-REV-008.

CRR-025 exposes the analogous token rollout gap after IR-014. The pre-ticket `20260703_token_usage_execution_address_backfill` definition is required on startup and writes legacy `{segments}` JSON. Current target code changes the converter under that same ID, so a normal predecessor start records terminal status and target `runPending()` executes the corrected converter zero times. Strict current token readers then normalize the old payload to `null`. A read-only operational snapshot confirms the production-reachable state: the old token ID is `SUCCEEDED`, `20260801...` is absent, and roughly 139k Team token rows retain `{segments}`. In addition, the migration database boundary exposes only independent row updates; a forced second-write failure leaves the first row committed. The pending canonical aggregate must therefore own target token conversion and delegate one all-or-nothing batch to a transaction-owning migration store.

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

SR-012 closes ARCH-REV-006 / DR-004 at the existing application compatibility boundary. `@autobyteus/application-sdk-contracts` advances the breaking backend-definition and frontend-SDK semantic contracts from V4 to V5. Application manifest schema V4, backend bundle envelope V1, and iframe transport V4 remain independently versioned because their own shapes do not change; their SDK compatibility declarations point to V5. Existing application/backend manifest parsers, catalog diagnostics/quarantine, package validation, and backend definition loader reject V4 before application execution. Project-owned SDK source/dist, both application sources, build scripts, vendor copies, and importable outputs advance atomically. Physical application platform-database discovery and canonical migration remain store-owned and catalog-independent, so excluded V4 code cannot hide durable data. No V4 adapter or external bundle edit is designed. The user-approved requirements basis remains authoritative; implementation remains blocked until architecture re-review passes.

SR-013 corrects CRR-022 / CR-F-011 without changing the target model. One pure migration-only flat decoder owns historical display/route interpretation. Stable `20260517_team_run_metadata_member_tree` uses it for flat-to-predecessor conversion when pending. Ticket-owned `20260801_team_canonical_identity` remains separately pending and becomes the sole owner of schema-v3 replacement: it converts predecessor trees directly and composes the same flat decoder in memory for a residual/repaired safe flat file left behind when `20260517` is already terminal with warnings. It validates normalized route/path agreement and topology but never compares `memberName` with the address basename. Therefore fresh flat input, already-terminal predecessor output, and terminal-warning residual flat input all have an executable path without rerunning a completed ID or requiring a listening API; invalid structural data still blocks before mutation, and current repositories remain v3-only. The user explicitly approved SR-013 for architecture re-review without changing the coordinator-required operational AgentTeam invariant or adding later AgentOrg container scope.

SR-014 changes no protocol, data model, owner, or data-flow spine. It records the user's exact natural-language implementation copy in one file and forbids provider paraphrase or duplicate full-text authorities. AutoByteus, Codex App Server, and Claude Agent SDK inject the same rendered block through their existing system-instruction seams; only `{{member_address}}` varies. The user explicitly classified this as a pure-text implementation clarification with no additional architecture review.

SR-015 corrects CRR-025 / CR-F-013 and makes the CR-F-014 transaction contract executable without changing target identity or runtime behavior. `20260801_team_canonical_identity` is the one independently pending target canonical record for both rooted TeamRun and token semantic identity. After its TeamRun/task items are current, it invokes a migration-local token migrator that preserves IR-014's strict task index and row planner, plans every row before mutation, and submits one immutable update batch to a Prisma/SQLite transaction-owning store. The historical `20260703_token_usage_execution_address_backfill` definition is removed from the current registry; its durable record remains untouched evidence. Both token legacy-column cleanup definitions are ordered after and require exact `20260801...` success. The existing server gate remains the single pre-listen decision because the canonical aggregate cannot return `SUCCEEDED` when the token item fails. No new migration ID, status reset, second gate, per-row commit, or runtime legacy reader is added.

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
| BEH-014 | conversation/task/event/token each encode task/member route variants | one `TeamExecutionAddress` + contextual resolver (`DS-007`, `DS-008`) | Exact persistent/task attribution without a route side channel |
| BEH-015 | fresh/terminal TeamRun predecessor plus terminal `20260703...` token record with old `{segments}`; target converter currently hidden under the skipped old ID and row writes are independent | shared TeamRun decoder -> pending `20260801...` TeamRun/task conversion -> strict token planning -> one store transaction -> exact canonical gate -> target-only readers (`DS-009A`–`DS-009D`, `DS-013A`–`DS-013D`) | Display divergence is safe; token task chains remain exact; completed IDs never rerun; plan/transaction failure mutates zero token rows and blocks startup |
| BEH-016 | transports/SDK/web expose route/path bundles and scoped routes; exact V4 application manifest/backend-definition/frontend-SDK gates admit those legacy SDK shapes | target DTOs + recursive `rootTeam` + address/execution indexes + exact V5 application SDK admission (`DS-007`, `DS-008`, `DS-012`) | Observable UI/API behavior preserved with one identity model; V4 bundles excluded before execution while their durable DBs remain migration-visible |
| BEH-017 | memory scope name conflates concrete lineage with topology | execution resolver -> storage-private `ancestorTeamRunIds` (`DS-008`) | Physical memory/context paths remain unchanged |
| BEH-018 | no single required imported nested-Team scenario spans all three live runtimes with fixed test models and isolated secrets | staged package import -> fresh per-runtime TeamRun -> collaboration/task/restore spines -> redacted matrix evidence (`DS-011`) | Real provider lifecycle parity is proved without mutating source packages or operational data; unavailable/skipped is not Pass |

## Relevant Supplemental Task Artifacts

| Artifact | Authority |
| --- | --- |
| [agent-team-addressing-handoff-contract.md](./agent-team-addressing-handoff-contract.md) | Normative recipient grammar, AgentTeam coordinator targeting, handoff authoring/projection, intrinsic Team tools, filesystem-like system instruction, and shared message/task behavior |
| [agent-team-collaboration-system-instruction.md](./agent-team-collaboration-system-instruction.md) | Normative exact Agent-facing renderer template and AutoByteus/Codex/Claude system-instruction injection contract |
| [team-run-canonical-identity-refactor.md](./team-run-canonical-identity-refactor.md) | Normative SR-015 rooted schema, recipient/handoff seam, execution address, corrected TeamRun/token predecessor migration chains, exact V5 application SDK admission, API/frontend/storage contract, case spines, and verification seams |
| [nested-classroom-live-validation-contract.md](./nested-classroom-live-validation-contract.md) | Normative downstream fixture staging/import, isolated-secret preparation, three-runtime/model matrix, live assertions, evidence, result classification, and cleanup |

Requirements remain authoritative if wording conflicts. SR-013 passed ARCH-REV-008; SR-015 is the active architecture re-review delta for CR-F-013/CR-F-014. SR-014 changes only the exact Agent-facing copy and remains user-approved for implementation after the migration gate is cleared.

## Task Design Health Assessment (Mandatory)

- Change posture: `Comprehensive Refactor`.
- Design issue signal: `Yes`.
- Root causes: parallel identity authorities, kind-ambiguous run fields, root/nested shape asymmetry, copied/localized child state, duplicated execution locators, an omitted semantic version boundary at application admission, and two persisted-transition ownership omissions: historical display/structure semantics were conflated, and target token semantics were attached to a terminal predecessor ID behind a per-row persistence boundary.
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
- current V4 backend-definition/frontend-SDK exports, declarations, manifests, definitions, or generated/vendored project artifacts outside explicit incompatibility fixtures.

Legacy shapes remain only in migration input modules/fixtures under a narrow explicit source allowlist. Definition-local `memberName`, unrelated filesystem paths, address-derived storage encoding, and opaque provider payload keys are not active mounted identity and may remain.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

| Data class | Outcome | Reason |
| --- | --- | --- |
| AgentTeam definitions/handoffs | Directly usable | Local authoring names remain valid; missing handoffs mean `[]` |
| TeamRun metadata | Migration required | Must validate/remove parallel identities and emit uniform rooted v3 tree |
| Communication/task JSON | Migration required | Replace path/task bundles with `TeamExecutionAddress` |
| Token usage DB | Migration required | Replace duplicate execution-address schema transactionally |
| External-channel bindings | Migration required | Replace route/path pair with address selector |
| Application platform DBs | Migration required | Convert discovered launch/run identity transactionally from physical store inventory, independent of bundle admission |
| Installed application bundle code | Compatibility rejection; no migration | Exact V5 backend-definition/frontend-SDK contracts are admitted; V4 code remains unmodified and excluded/quarantined until independently upgraded |
| Derived indexes/caches | Discard/rebuild | They are views of migrated authoritative data |
| Agent memory directories | Directly usable | Concrete run-ID lineage remains truthful |
| Final context files/locators | Directly usable | Derive same storage segments from address |
| Opaque provider raw payloads | Directly usable | Historical display data, never routing input |

### Migration Plan

1. Keep the dependency order `20260517_team_run_metadata_member_tree` -> `20260801_team_canonical_identity` -> pending token legacy-column cleanup -> later derived/index migrations. Registry array order, not the date embedded in an ID, is authoritative.
2. Let `AppDataMigrationRunner` preserve its terminal-record rule. If `20260517...` or historical `20260703_token_usage_execution_address_backfill` is `SUCCEEDED`/`SUCCEEDED_WITH_WARNINGS`, never reset it or depend on changed code under it. Remove the old token definition from the current registry. `20260801...` remains independently pending for the supported predecessor and is the sole target canonical record.
3. Keep one pure migration-only TeamRun flat decoder in the prerequisite-converter module. It accepts only flat v1 with direct Agent entries, one non-empty display `memberName`, and one non-empty one-segment structural `memberRouteKey`; rejects nested route/memberTree/Team fields; requires any optional hybrid `memberPath` to equal the route; preserves display `memberName` exactly; constructs `memberPath:[memberRouteKey]`; and preserves genuine Agent facts. It never derives structural identity from the display name.
4. When `20260517...` is pending, it uses that decoder, validates the complete staged predecessor through the corrected canonical converter, then backs up and atomically replaces flat input with predecessor `memberTree`. In `20260801...`, accept already-current v3, predecessor `memberTree`, or residual flat v1. Decode residual flat in memory, validate route/path/topology/run/coordinator invariants, and write only final v3. No intermediate or fallback form reaches current runtime.
5. Within `20260801...`, finish every TeamRun/task-record item before token planning. If a TeamRun/task identity source is invalid, record an actionable dependency failure and do not invoke token persistence. Otherwise build the strict task-Team index from current task records, list token rows in deterministic ID order, and use the IR-014 planner to classify every row as exact-current/standalone skip, canonical mutation, or failure.
6. If any task-index or row plan fails, append its precise details, call no token mutation method, return the canonical aggregate `FAILED`, and leave all token rows unchanged. If every plan is valid, serialize one immutable `TokenUsageCanonicalExecutionAddressUpdate[]` containing only required mutations.
7. Give `TokenUsageCanonicalExecutionAddressMigrationStore` one mutation method: `applyCanonicalExecutionAddressBatch(updates)`. Its Prisma implementation opens one transaction, applies updates in stable row-ID order, requires exactly one affected row per update, reads/verifies the targeted root/address values before commit, and throws on any mismatch. The transaction then commits every update or rolls back every update. Per-row `updateTokenUsageLedgerRow` is removed.
8. Only after the batch commits may token row details count as `MIGRATED`. On transaction failure, the token item reports zero migrated rows plus one actionable database failure (and affected row identities as bounded detail), `20260801...` returns `FAILED`, and the migration record remains retryable. A crash after commit but before record completion is recovered idempotently: the next non-terminal/stale retry sees exact-current rows, performs no duplicate mutation, and can complete the record.
9. Enumerate other canonical subjects through their established store owners. Application platform databases come from `ApplicationPlatformStateStore.listExistingPlatformDatabasePaths()`, not the admitted bundle catalog. Files use final validation + backup + same-directory atomic rename; application databases retain their store-owned transactions.
10. Retarget both pending token legacy-column cleanup definitions to require exact `20260801_team_canonical_identity` success. A cleanup ID already terminal in supported predecessor history remains untouched; a pending cleanup cannot drop route/path inputs before the target token transaction succeeds.
11. `server-runtime.ts` keeps one targeted pre-listen check: `20260801...` must be exactly `SUCCEEDED`. Missing, `FAILED`, `RUNNING`, or `SUCCEEDED_WITH_WARNINGS` blocks bootstrap/listen with canonical record/item details; unrelated migration warnings remain non-blocking.
12. Rebuild derived indexes only after authoritative conversion, then start strict target-only repositories, exact V5 application admission, generated contracts, SDKs, integrations, and web client.

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
| DS-012 | Project application build/import/catalog/open/launch or startup migration encounters an application subject | Every project-owned artifact is V5-consistent; V5 code is admitted, V4 code is diagnosed before execution, and every physical platform DB is migrated regardless of admission | Application SDK contracts + application bundle provider/loader + application storage migration |
| DS-013A–D | Startup encounters legacy/current token rows with absent or terminal historical token record | Pending canonical owner commits exact addresses once, or zero rows change and the exact startup gate remains closed | `20260801...` canonical aggregate + token migrator/planner/index + transaction-owning migration store |

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

### DS-012 — Application SDK V5 cut and admission cases

DS-012 is a bounded application compatibility spine, not another Team identity owner. It reuses the repository's current exact gates and keeps durable-state migration orthogonal to executable bundle admission.

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
  -> regenerate backend dist + UI vendor contracts + importable-package outputs
  -> package-consistency verifier compares every declared/current contract value and forbidden field inventory
  -> terminal: all project-owned executable/importable artifacts are internally V5-consistent
```

`APPLICATION_MANIFEST_VERSION_V4`, `APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1`, and `APPLICATION_IFRAME_CONTRACT_VERSION_V4` remain unchanged. They version independent envelope/transport shapes; application manifest V4 and backend bundle V1 now declare frontend/backend SDK compatibility V5. Generated/vendored files are outputs of the source build, not alternate hand-maintained authorities.

#### DS-012B — Old installed bundle discovery

```text
ApplicationPackageRegistrySnapshot
  -> FileApplicationBundleProvider scans applications/<localApplicationId>/application.json
  -> parseApplicationManifest sees ui.frontendSdkContractVersion = "4"
     OR parseApplicationBackendManifest sees backendDefinition/frontendSdk = "4"
  -> compatibility parse failure carries manifest path + field + observed value + required "5" + rebuild/reinstall action
  -> existing createDiagnostic adds application/package/root identity
  -> record is absent from snapshot.applications
  -> diagnostic is present in snapshot.diagnostics
  -> ApplicationAvailabilityService exposes QUARANTINED detail
  -> catalog/open/asset/backend launch cannot reach application execution
```

Package import/update validation uses the same provider and fails the operation with the same actionable message. No V4 type adapter, UI load, worker start, handler invocation, or external package edit occurs.

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

If manifests claim V5 but the loaded definition reports V4, the loader terminates that load with application ID, entry-module path, observed value, required V5, and rebuild/reinstall guidance. No lifecycle hook or handler runs.

#### DS-012D — Durable application DB migration independent of admission

```text
startup required canonical-identity migration
  -> ApplicationPlatformStateStore.listExistingPlatformDatabasePaths()
  -> enumerate <appData>/applications/*/db/platform.sqlite without consulting bundle catalog
  -> recover applicationId from storage metadata/known tables/readable storage key
  -> unreadable identity: record path-specific required-item failure and block
  -> readable identity: run platform-owned canonical identity converter transaction
  -> validate target columns/JSON + record item result
  -> repeat for V5-admitted, V4-quarantined, missing-bundle, and persisted-only subjects alike
  -> all durable items succeed -> allow target catalog/services bootstrap
  -> any required item fails -> no server listen
```

Bundle code is not migrated. Catalog status cannot add, remove, or mark complete a database migration subject. The converter does not load an application backend definition or application-owned migration script to transform platform-owned identity.

#### DS-012E — Package and canonical-identity verification

```text
source/build inventory
  -> assert no current V4 backend-definition/frontend-SDK export/declaration outside rejection fixtures
  -> assert SDK source/dist + app source/vendor/importable versions all equal V5
old-version fixtures
  -> application-manifest SDK V4 rejected
  -> backend manifest backend/frontend V4 rejected
  -> manifest-V5/definition-V4 load rejected before hooks/handlers
target-version fixtures
  -> exact V5 package admitted
  -> launch AgentTeam -> canonical binding members -> canonical target/input -> canonical producer event -> frontend validator accepts
migration fixture
  -> same old V4 bundle's platform DB is still discovered and converted
```

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
  -> physical Prisma schema migration + Prisma initialization
  -> AppDataMigrationRunner skips historical 20260703 record unchanged
  -> independently pending 20260801 canonical owner converts/validates TeamRun + task records
  -> token migrator builds strict task-Team index and plans every legacy/current row
  -> migration store applies/verifies one immutable batch in one transaction
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
  -> batch store is never called; token rows remain unchanged
  -> 20260801 records FAILED -> exact gate blocks bootstrap/listen
```

No row fallback, partial best effort, or `SUCCEEDED_WITH_WARNINGS` result is permitted for this required item.

#### DS-013C — Transaction write/verification failure

```text
all row plans valid -> immutable update batch
  -> store opens one Prisma/SQLite transaction
  -> earlier update succeeds inside transaction
  -> later update or read-back verification fails
  -> transaction rolls back all updates
  -> summary reports migratedCount=0 and database failure
  -> 20260801 records FAILED -> exact gate remains closed
```

A durable SQLite test forces the later failure and proves the earlier row's root/address columns are unchanged after rollback.

#### DS-013D — Repair, retry, and exact-current idempotence

```text
operator repairs the invalid source or transient persistence fault
  -> normal startup retries non-terminal 20260801
  -> already-current TeamRun/application/token subjects skip
  -> remaining token plans commit in one transaction
  -> exact-current second run produces no update batch
  -> 20260801 exact SUCCEEDED; unrelated warning remains non-blocking; startup opens once
```

A process interruption after token commit but before migration-record completion is the same idempotent retry case; no status reset or runtime compatibility reader is needed.

### DS-007 — Concrete execution round trip

```text
Agent/task runtime event
  -> TeamRunEvent {executionAddress}
  -> child/root bridges forward unchanged
  -> WebSocket execution_address
  -> frontend canonical serialization key
  -> command returns same execution address
  -> TeamExecutionResolver selects exact persistent/task run
```

## Spine Narratives (Mandatory)

- **Root launch:** definition composition and launch inputs meet once in the TeamRun-tree compiler. Persisted output is already the executable aggregate; no later table join is required.
- **Persistent child:** parent manager selects `index.getAgentTeam(childAddress)`, passes the same metadata/index plus `teamAddress`, and materializes only exact direct children. The node's `teamRunId` is the concrete child ID.
- **Restore:** strict v3 parse validates/freeze tree, then uses the same root/child construction as launch. Current definitions are not consulted.
- **Task AgentTeam:** selected persistent node supplies logical addresses, coordinator, and genuine Agent configuration. Factory creates a fresh active execution tree/run directory and registers it by task TeamRun ID. It must not localize addresses.
- **Message:** AgentTeam target maps once to `coordinatorAddress`; root manager keeps handle/config mechanics private.
- **Task:** eligibility is tested only after shared resolution by comparing `parentAddress(recipient.address)` with caller Team address.
- **History/UI:** logical tree is keyed by address; concrete live/history contexts are keyed by execution address so persistent/task instances at one address do not collide.
- **Migration:** the runner owns ID ordering/terminal skips; one migration-only decoder owns flat semantics; stable `20260517...` owns its pending flat-to-predecessor record transition; pending `20260801...` owns final v3 replacement from predecessor or terminal-warning residual flat input. Display-name divergence is accepted, structural contradiction blocks before source mutation, and legacy decoding ends before current repositories start.
- **Handoff completion:** Team runtime guarantees both tools and the instruction. Retrieval is deterministic projection; only the Agent evaluates natural language and decides applicability. Delivery remains owned by `send_message_to`, so retrieval never claims that a handoff occurred.
- **Live validation:** API/E2E owns staging/import, secret isolation, one fresh run per runtime, public observation, redaction, failure classification, and cleanup. The production design does not acquire a test-only package or credential owner.
- **Application V5 build:** the contracts package is the sole semantic-version/type source; downstream SDK/application artifacts are generated consumers and must agree before the checkpoint is accepted.
- **Old bundle:** existing parser/provider/diagnostic/quarantine ownership excludes V4 from the executable catalog before UI assets, worker start, lifecycle hooks, or handlers.
- **Exact V5 launch:** all three exact gates pass in order—application manifest, backend bundle manifest, then loaded definition—before application behavior is exposed.
- **Application durable state:** the physical storage store enumerates platform DBs without catalog membership, and the required migration finishes before V5 catalog/services start. Code compatibility never decides whether data exists.

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
| app-data runner/record repository | Ordered execution, terminal-ID skip, retry records/status | TeamRun field interpretation |
| migration-only flat decoder | One pure flat-v1 -> structural predecessor interpretation, preserving display name | Migration records, file mutation, canonical address construction, or runtime parsing |
| stable `20260517...` prerequisite | Pending flat-v1 -> predecessor-memberTree record transition using the shared decoder | Canonical v3 ownership or completed-record normalization |
| ticket-owned `20260801...` canonical migration | Predecessor or residual-flat -> strict v3, item mutation/evidence, exact startup result | Runtime fallback or duplicate display/route interpretation |
| frontend projection | Recursive display and derived address/execution maps | Alternate route identity |
| live validation harness | Isolated package/secret/runtime setup, public scenario orchestration, redacted evidence, cleanup | Production identity or provider behavior, secret values, source-package mutation |
| `@autobyteus/application-sdk-contracts` | V5 backend-definition/frontend-SDK constants and canonical application identity types | Bundle discovery, migration, worker lifecycle |
| application manifest/backend manifest parsers | Exact declared-version validation and actionable incompatibility error text | SDK type translation or durable DB discovery |
| `FileApplicationBundleProvider` + availability service | Catalog exclusion, diagnostic identity, quarantine/import validation | V4 adaptation or application execution |
| backend definition loader | Exact V5 exported-definition check before exposures/hooks/handlers | Manifest compatibility negotiation |
| application platform state store + canonical migration | Physical DB enumeration, transactional conversion, required item evidence | Executable bundle admission or external bundle rewrite |

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
| Task execution identity | Task identity + active task execution directory |
| Cross-boundary concrete locator | `TeamExecutionAddress` |
| Physical memory lineage | Storage `ancestorTeamRunIds` |
| Application SDK semantic target | `@autobyteus/application-sdk-contracts` V5 constants/types |
| Executable application admission | Existing application/backend manifest parsers, bundle provider diagnostics, and definition loader |
| Application platform DB inventory | `ApplicationPlatformStateStore.listExistingPlatformDatabasePaths()` independent of catalog |
| Flat-v1 interpretation | one pure migration-only prerequisite decoder reused by both migration definitions |
| Predecessor-memberTree interpretation and canonicalization | `20260801...` canonical converter only |
| Target token semantic conversion record/result | `20260801...` canonical aggregate token item |
| Historical token `{segments}` interpretation and row planning | migration-local token planner + strict task-Team index |
| Token database atomic mutation | `TokenUsageCanonicalExecutionAddressMigrationStore.applyCanonicalExecutionAddressBatch` |
| Migration ID order/terminal semantics | App-data registry + runner/record repository |

## Thin Entry Facades / Public Wrappers (If Applicable)

- AutoByteus `get_handoff_rules` serializes only `GetHandoffRulesResult`; its MCP adapter returns the same JSON text and a deep-equal `structuredContent` object. Neither adds service-envelope fields.
- AutoByteus/MCP `send_message_to` wrappers independently preserve the existing delivery envelope and operation codes; rejected delivery envelopes alone set `isError`.
- Provider bootstrap/tool resolvers consume the Team runtime's composed intrinsic exposure; they do not ask package configuration independently whether the Team protocol tools exist.
- AutoByteus/MCP task and communication parameter schemas/manifests expose `recipient_address` consistently; no adapter translates `recipient_name` or `recipient_path`.
- GraphQL/REST/WebSocket converters rename/shape transport fields but do not parse alternative logical addresses.
- Frontend action/store facades serialize `TeamExecutionAddress` through one utility; they do not synthesize scoped routes.
- Storage locator facades derive physical segments after exact execution resolution; they do not expose directory lineage as topology.
- Application bundle scanners retain the existing `ApplicationCatalogDiagnostic` shape; compatibility parser errors put manifest/entry path, field, observed value, required V5, and rebuild/reinstall action in `message`, while the diagnostic already supplies application/package/root identity. No parallel compatibility service or negotiation DTO is added.
- Application package import/update validation uses the same provider scan as catalog refresh, so it cannot accept a package catalog would quarantine.
- Backend definition loading checks V5 before exposures, hooks, or handlers become callable; adapters do not convert V4 exports.

## Removal / Decommission Plan (Mandatory)

1. Introduce target types/validators and characterization tests.
2. Cut producers to rooted v3 nodes and canonical address/execution values.
3. Cut root/persistent/task runtime consumers.
4. Cut durable stores through migration and target-only repositories; remove the historical `20260703...` token definition from current registry authority, compose token conversion into `20260801...`, and replace per-row token writes with one transaction-owning batch store.
5. Cut transports plus application SDK contracts to V5, application admission gates, project application sources/build scripts, integrations, and frontend atomically.
6. Regenerate SDK `dist`, both application backend/UI vendor outputs, and importable packages; reject the checkpoint if their declared versions or identity fields disagree.
7. Delete legacy runtime types, current V4 SDK exports, localizers, prefixers, mappers, aliases, fallback tests, and dead exports.
8. Enforce a repository-wide allowlist scan.

Do not retain an old-field compatibility DTO, dual writer, route-key adapter, or localized-child fallback “temporarily.”

## Return Or Event Spine(s) (If Applicable)

- `get_handoff_rules` success returns exactly `{handoffs:[{when,recipient_address}]}` or `{handoffs:[]}`; provider-native tool errors carry impossible internal binding failures.
- `send_message_to` alone retains the approved `{accepted,code,message,result}` delivery/rejection envelope.
- Exact-run message codes remain unchanged.
- Shared syntax/tree failures have identical codes for message and task entry before task wrapping.
- Team communication participants and runtime events carry `TeamExecutionAddress` values.
- Child/root event bridges forward execution address unchanged; no prefix repair occurs.
- Historical projections store sufficient concrete identity to rehydrate an inactive task execution without reading live handles.
- V4 application manifest/backend/definition rejection returns no application execution result; catalog/import surfaces carry an actionable incompatibility diagnostic and the availability surface reports `QUARANTINED`. Exact V5 acceptance proceeds normally.
- A compatibility diagnostic does not suppress or complete the independent per-database migration result.

## Bounded Local / Internal Spines (If Applicable)

- `TeamRunTreeIndex` build: DFS validate uniqueness -> populate address/node/run/coordinator/direct-child maps -> freeze.
- Handoff binding/projection: context builder alone filters top-level `handoffs` where `from === caller.memberAddress`; guidance projector preserves bound edge order, flattens each `rules` item in order, and emits `{when,recipient_address:to}`.
- Coordinator target: AgentTeam recipient -> exact `coordinatorAddress` -> Agent node validation -> private handle lookup.
- Task eligibility: derive caller Team and recipient parent -> exact equality -> reject caller -> activate selected kind.
- Storage locator: execution address -> concrete run resolution -> `ancestorTeamRunIds`/Agent run ID -> unchanged filesystem path.
- Application compatibility: parse exact declaration -> fail with observed/required/action or admit; loaded definition repeats the exact V5 assertion before callable behavior.
- Application durable inventory: physical platform DB paths -> application ID recovery -> per-DB transaction/result; catalog membership is never an input.
- Token canonical item: TeamRun/task readiness -> strict task-Team index -> deterministic row plans -> no-mutation failure or immutable batch -> one store transaction/update-count/read-back verification -> committed summary or total rollback.

## Off-Spine Concerns Around The Spine

- Provider prompt timing differs, but the same mandatory filesystem-like completion protocol is composed at each provider's established system-instruction seam.
- Definition cache refresh affects only new runs.
- Handoffs remain natural-language guidance, not deterministic policy.
- Opaque provider tool arguments may contain old-looking keys but stay untyped history.
- Application database discovery is dynamic and each physically discovered database needs its own durable migration result even when its bundle is absent or V4-incompatible.
- Application manifest V4, backend bundle V1, and iframe V4 are independent envelope/transport versions and must not be renamed merely to match SDK V5; only compatibility declarations advance.
- Generated/vendored/importable outputs are repository-resident release artifacts and require consistency proof, not best-effort rebuild instructions.
- Data volume is unknown; converters must be bounded/observable and restartable.

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
10. Application SDK contracts own semantic version/type identity; bundle parsers/loaders own admission; application storage/migration owns durable DB discovery. None may substitute for another.
11. The `20260801...` app-data definition owns target canonical sequencing/status; the token migration store alone owns database transaction mechanics. The runner, planner, and server gate may not bypass either boundary.

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
| application SDK source -> SDK/app artifacts | exact V5 constants + canonical identity types | stale V4 export, hand-authored divergent vendor type |
| bundle -> executable catalog/worker | exact V5 compatibility declarations/definition | V4 payload adapter or version guessing |
| application storage -> migration | physical DB path + recovered application ID | admitted-bundle requirement |
| token planner -> token migration store | immutable validated `{id,rootTeamRunId,executionAddressJson}` batch | legacy parser callbacks, per-row commit API, migration-record mutation |
| canonical migration -> startup | one `20260801...` status with token item detail | inference from historical `20260703...` status or unrelated warnings |

## Dependency Rules

- `agent-collaboration` address domain has no dependency on TeamRun execution, providers, task delegation, or storage.
- TeamRun execution may depend on address/handoff domain and definition graph, never on frontend/transport.
- Shared recipient resolver may depend on rooted index interfaces but returns no execution-domain object.
- Team capability composer may depend on the presence of a bound Team collaboration context and canonical server-owned tool definitions; provider bootstraps consume its result rather than recomputing availability.
- Handoff guidance projector depends only on immutable caller-bound outgoing edges, performs no second caller filter, and returns no delivery/service/provider result type.
- Task delegation depends on the shared resolver and AgentTeam execution interfaces; Agent collaboration does not import task types.
- Migration input modules may depend on legacy schemas; current domain/store modules may not.
- Storage encoding depends on address derivation and exact run identity after contextual resolution, not on provider adapters.
- Frontend types mirror target transport contracts and do not import migration compatibility types.
- Application SDK backend/frontend packages depend on the contracts package V5 types; contracts do not depend on server bundle discovery or migration.
- Bundle parsers depend on V5 constants, not on backend/frontend SDK implementations. The bundle provider aggregates parser errors into existing diagnostics; availability consumes diagnostics but does not reinterpret versions.
- Canonical application DB migration depends on physical application storage and store-owned legacy/current schemas, never on the application catalog, backend bundle, worker loader, or application-owned migrations.
- Canonical token planning depends on already-current TeamRun/task records and migration-only legacy token input types. The current token repository never imports the planner.
- `20260801...` may compose the token migrator; the migrator may depend on the strict task index/planner and token migration store; the store depends only on Prisma/current database configuration and owns the transaction. The planner/store never update app-data migration records or decide startup.
- Token legacy-column cleanup depends on exact `20260801...` success, not on historical `20260703...`; server startup depends on exact `20260801...` status, not on cleanup or unrelated warnings.
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
| GraphQL/REST | `memberAddress`, `coordinatorAddress`, typed run IDs, execution address as applicable |
| WebSocket | `execution_address` with stable serializer |
| frontend topology | `rootTeam` + derived `memberNodesByAddress` |
| frontend runtime | execution-address serialized key |
| external binding | `targetMemberAddress` |
| storage scope | private `{rootTeamRunId,ancestorTeamRunIds}` |
| token canonical update plan | immutable `{id,rootTeamRunId,executionAddressJson}` rows built only after full plan validity |
| token migration store mutation | `applyCanonicalExecutionAddressBatch(readonly updates[])` as the sole write API; one verified transaction |
| canonical startup status | exact `20260801_team_canonical_identity` aggregate including token item |
| application backend definition contract | exact `"5"`; current canonical launch/binding/target/event types |
| application frontend SDK contract | exact `"5"`; canonical validators/client types |
| application manifest | schema `"4"`, `ui.frontendSdkContractVersion: "5"` |
| application backend bundle manifest | envelope `"1"`, `sdkCompatibility: {backendDefinitionContractVersion:"5",frontendSdkContractVersion:"5"}` |
| iframe transport | unchanged protocol `"4"` |
| incompatible bundle result | absent from launchable catalog + existing diagnostic/quarantine with path, observed/required version, and rebuild/reinstall action |

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
- Application compatibility versions name distinct semantic/protocol layers; V5 is not copied onto unchanged envelope types.
- Old bundle rejection is an admission result, not a migrated or adapted current contract.

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
- current exact application manifest/backend manifest/definition gates, catalog diagnostics/quarantine, and package validation;
- application platform state's physical DB enumeration; and
- existing SDK/application build pipelines for deterministic regeneration.

Do not add a new provider-neutral topology service or a persisted profile/binding subsystem.

## Subsystem / Capability-Area Allocation

| Area | Target responsibility |
| --- | --- |
| `agent-collaboration/domain` | `AgentTeamAddress`, recipient-address expression, authored handoff edge |
| `agent-communication/services` | operation contracts, exact handoff guidance projection, send dispatch/delivery result |
| `agent-team-definition` | authoring schema and recursive graph resolution |
| `agent-team-execution/domain` | rooted node types, metadata aggregate, execution address |
| `agent-team-execution/services` | tree compiler/index, recipient resolver, execution resolver |
| `agent-execution/shared` + Team member instruction composition | intrinsic Team tool exposure, canonical name de-duplication, provider-neutral filesystem-like completion protocol |
| `agent-team-execution/backends/mixed` | concrete persistent/task lifecycle and private handles |
| `run-history/store` | strict v3 schema/store and metadata migration input |
| `task-delegation` | direct eligibility, minimal task identity, fresh task executions |
| `app-data-migrations` | stable TeamRun prerequisite, one pending `20260801...` canonical aggregate including token semantic conversion, strict token planner/index, transaction-owning token migration store, ordered record lifecycle, exact startup gate, and evidence |
| API/SDK/integration | target-only DTOs/contracts |
| `application-sdk-contracts` | Own exact backend-definition/frontend-SDK V5 constants and canonical application identity shapes; retain independent unchanged envelope/iframe constants |
| `application-bundles` + worker loader | Exact V5 declaration/export admission, existing diagnostic/quarantine/package-validation surfaces |
| project applications/builds | V5 source manifests/definitions and generated/vendor/importable artifact consistency |
| application storage migration | Catalog-independent physical platform DB inventory and transactional canonical conversion |
| web | recursive projection and execution-keyed runtime state |
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
| `agent-team-execution/services/team-run-tree-compiler.ts` | Compile definition closure + launch input into rooted tree/handoffs |
| `agent-team-execution/services/team-run-tree-index.ts` | Derive exact lookup view |
| `agent-team-execution/services/team-run-metadata-mapper.ts` | Map current aggregate without legacy normalization |
| `agent-team-execution/services/team-recipient-resolver.ts` | Resolve one minimal recipient |
| `agent-team-execution/domain/team-execution-address.ts` | Validate/serialize concrete locator |
| `agent-team-execution/services/team-execution-resolver.ts` | Resolve persistent/task execution contextually |
| mixed child/task factories | Share persistent root tree; materialize task IDs without localization |
| `team-run-member-tree-prerequisite-converter.ts` | Own one pure migration-only flat decoder; require direct Agent/one-segment structural route/non-empty display name, preserve display, emit/validate predecessor; expose no runtime reader |
| `team-run-metadata-member-tree-migration.ts` | Keep stable ID; when pending, use the shared decoder and own predecessor backup/atomic replacement; never own terminal-record normalization |
| `team-canonical-identity-migration.ts` + metadata converter | Keep separate pending `20260801...` ID; accept v3/predecessor/residual flat, derive v3 addresses only from agreeing route/path, finish TeamRun/task items, compose the token semantic migrator, and own the one aggregate status consumed by startup |
| `token-usage-execution-address-backfill-migration.ts` | Rename/move to `token-usage-canonical-execution-address-migrator.ts`; remove `AppDataMigrationDefinition`/historical ID ownership; preserve IR-014 index/planning orchestration and return canonical item details to `20260801...` |
| `token-usage-execution-address-backfill-planner.ts` | Rename to target-neutral migration-local canonical planner if practical; keep `{segments}` parsing isolated here and preserve exact nested task-Team reconstruction/fail-closed behavior |
| `token-usage-task-team-run-index.ts` | Keep strict current task-record indexing, ordered ancestor validation, and actionable duplicate/conflict/unreadable issues |
| new `token-usage-canonical-execution-address-migration-store.ts` | Own deterministic row scan plus `applyCanonicalExecutionAddressBatch`; Prisma implementation updates and verifies the immutable batch inside one transaction; expose no per-row mutation method |
| `app-data-migration-registry.ts` | Remove the current definition registered as `20260703_token_usage_execution_address_backfill`; keep `20260801...` before both pending token legacy-column cleanup definitions |
| token legacy path/route column-drop migrations | Require exact `TEAM_CANONICAL_IDENTITY_MIGRATION_ID` success before schema cleanup; never infer target readiness from the historical token record |
| `server-runtime.ts` | Keep one exact-`20260801...` pre-listen gate; include the canonical record/token item detail in actionable failure logging; ignore unrelated warning statuses |
| web store/builders | Consume `rootTeam`, derive address index, key runtime by execution address |
| downstream live-test support/evidence | Reuse the supported package import, TeamRun launch, runtime catalog, `pnpm secrets:import`, and live E2E isolation patterns; no production test hook |
| `autobyteus-application-sdk-contracts/src/index.ts`, `manifests.ts`, binding/event contract modules | Replace V4 backend-definition/frontend-SDK constants and legacy route/path identity fields with V5 canonical address/execution contracts; retain independent manifest V4, bundle V1, iframe V4 |
| `autobyteus-application-backend-sdk` target-address/launch-profile helpers and dist | Consume V5 `memberAddress`, typed IDs, and execution address; remove route/path helper signatures; rebuild |
| `autobyteus-application-frontend-sdk` validators/startup and dist | Validate V5 canonical application event/target shapes; keep iframe V4 bootstrap transport; rebuild |
| server application/backend manifest parsers | Require V5 compatibility values and emit standard actionable incompatibility text |
| `FileApplicationBundleProvider` / `ApplicationAvailabilityService` | Exclude invalid record, retain diagnostic identity, quarantine unavailable application; no V4 adapter |
| `ApplicationBackendDefinitionLoader` | Require exported definition V5 before callable exposures/hooks/handlers |
| `ApplicationPlatformStateStore` + canonical migration | Inventory every physical platform DB independent of catalog; recover identity/convert/report/block |
| `applications/brief-studio` and `applications/socratic-math-teacher` source/build/vendor/dist/importable trees | Advance source declarations/definitions/scripts to V5 and regenerate all artifacts from workspace SDK output |
| package-consistency/identity coverage | Compare all project-owned V5 declarations/artifacts; test V4 rejection, V5 acceptance, canonical launch/binding/target/event, and old-bundle DB discovery |

## Reusable Owned Structures Check

`AgentTeamAddress`, `ResolvedTeamRecipient`, `HandoffInstruction`, `GetHandoffRulesResult`, `TeamExecutionAddress`, and the rooted node union are reusable because multiple independent consumers need exactly the same semantics. They remain deliberately narrow. The send delivery envelope is operation-specific rather than a shared base for read-only guidance. `TeamRunTreeIndex`, active task execution tree, provider handles, and storage scope are owned internal views and are not promoted into public shared contracts.

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
- Application compatibility diagnostics reuse the existing catalog diagnostic rather than adding a second status model.
- Physical application DB inventory does not duplicate the application catalog because it answers a different question: which durable stores exist, not which code can execute.

## Final File Responsibility Mapping

Implementation should prefer modifying the existing owners above. New files are justified only for:

1. a discriminated rooted node/current metadata contract if the existing module cannot remain coherent;
2. a derived tree index;
3. one concrete execution-address domain/resolver pair; and
4. store-owned migration input/converter modules;
5. one token canonical-address migration store because an atomic batch transaction is a real persistence owner rather than helper indirection; and
6. a focused package-consistency verifier only if no existing build/test module can own the cross-artifact assertion.

No new broad `agent-team-topology` subsystem, repository, facade, or orchestration layer is designed.

## Applied Patterns (If Any)

- **Aggregate snapshot:** one root TeamRun file restored atomically.
- **Discriminated union:** illegal Agent/AgentTeam fields are unrepresentable.
- **Derived index:** performance view with no persistence authority.
- **Functional core / imperative shell:** pure address/tree validation and conversion inside lifecycle/storage shells.
- **Anti-corruption migration boundary:** legacy schemas terminate before current runtime.
- **Thin adapter:** providers/transports preserve shared domain result.
- **Action-oriented projection:** LLM tools expose the smallest next-decision shape instead of internal service metadata.

## Target Subsystem / Folder / File Mapping

The detailed repository inventory and target seams are recorded in [investigation-notes.md](./investigation-notes.md). The principal implementation surface is:

- `autobyteus-server-ts/src/agent-collaboration/`
- `autobyteus-server-ts/src/agent-team-definition/`
- `autobyteus-server-ts/src/agent-team-execution/`
- `autobyteus-server-ts/src/run-history/`
- `autobyteus-server-ts/src/task-delegation/` and Agent task tools
- `autobyteus-server-ts/src/app-data-migrations/`
- GraphQL/REST/WebSocket and project-owned application SDK/integration packages
- `autobyteus-web/stores/`, contexts, selectors, task projections, and builders
- memory/context storage components
- existing Agent-package import, secret-import CLI, and live E2E support used by the downstream [nested-classroom validation contract](./nested-classroom-live-validation-contract.md);
- `autobyteus-application-sdk-contracts/`, `autobyteus-application-backend-sdk/`, and `autobyteus-application-frontend-sdk/`;
- `autobyteus-server-ts/src/application-bundles/`, `application-engine/worker/`, `application-orchestration/`, and `application-storage/`; and
- `applications/brief-studio/` and `applications/socratic-math-teacher/`, including their generated/vendor/importable outputs.

## Folder Boundary Check

The target follows existing capability folders. Address is collaboration-shared; rooted execution is AgentTeam execution/run history; tasks remain task-owned; migration remains store-owned/coordinated; frontend remains a projection. There is no folder whose only purpose is to rename or forward another subsystem's value.

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

A full representative JSON and all twenty-one case spines are normative in [team-run-canonical-identity-refactor.md](./team-run-canonical-identity-refactor.md) §§5 and 10.

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
| change backend/frontend SDK shapes under V4 | existing exact gates would admit a normal old bundle as current |
| accept V4 and translate to V5 | recreates the mixed-version adapter explicitly excluded by the clean cut |
| bump manifest/bundle/iframe envelope versions to V5 mechanically | conflates independent unchanged protocols with the two breaking SDK semantics |
| derive application DB migration subjects from admitted catalog | hides durable state whenever bundle code is old, missing, or invalid |
| hand-edit only source or only generated application artifacts | permits importable/vendor runtime divergence from checked source |

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
8. Cut task Agent/AgentTeam identities/factories and active directories.
9. Introduce/carry `TeamExecutionAddress` through runtime and durable records.
10. Extract one TeamRun migration-only flat decoder; preserve stable `20260517...` as its pending predecessor-record owner; correct `20260801...` as the sole final-v3 owner from predecessor or residual flat input; implement DS-009A–D record/order/backup/byte-stability/idempotence coverage.
11. Move IR-014 token orchestration out of the historical `20260703...` app-data definition into a `20260801...`-composed canonical token migrator; remove the old definition from current registry, add the transaction-owning immutable batch store, retarget pending legacy-column cleanup, and implement DS-013A–D terminal-record/no-mutation/rollback/retry coverage.
12. Keep `server-runtime.ts` on the one exact `20260801...` pre-listen gate and prove token failure/missing/canonical-warning block while unrelated warnings do not. Then cut target-only repositories and remove normalizers.
13. Define backend-definition/frontend-SDK V5 in the contracts package; cut GraphQL/REST/WebSocket/application canonical identity types and backend/frontend SDK consumers.
14. Update exact application/backend manifest gates and definition loader; update both project application source manifests, backend definitions, and build scripts; regenerate SDK dist, application vendor/backend dist, and importable outputs; run V5 consistency and V4-rejection checks as one atomic checkpoint.
15. Cut frontend recursive projection and execution keys.
16. Cut memory/context selectors without moving files.
17. Delete legacy code/tests/exports; enforce allowlist scan including current V4 application SDK declarations outside rejection fixtures and the historical token ID outside explicit migration-history fixtures/docs.
18. Run implementation; TeamRun fresh/terminal-predecessor chains; token terminal-record/transaction rollback/retry chains; unsafe byte/row stability and exact startup gating; V4 rejection/V5 acceptance; package consistency; admission-independent application DB migration; canonical application launch/binding/event; API/frontend; restore; and storage evidence.
19. Execute DS-011 exactly through the imported nested-classroom live-validation contract and record all three runtime rows without skip-based Pass.
20. Reconcile durable documentation.

## Key Tradeoffs

- Cohesive rooted JSON is preferred over normalized tables because this is one atomic run aggregate.
- Per-Agent workspace repetition is preserved rather than assuming an unproven global invariant.
- Task AgentTeams materialize fresh execution state because they are concrete new runs, but logical addresses remain shared.
- Blocking migration reduces availability during upgrade but prevents routing against partially converted identity. Reusing pending `20260801...` for token semantics avoids a redundant migration/gate authority; the token store still owns the database transaction internally.
- Atomic project cut rejects mixed-version compatibility in exchange for one clean current contract. V5 is assigned only to the breaking backend-definition/frontend-SDK semantics; unchanged manifest/bundle/iframe versions retain their own numbers.
- Logical address and concrete run IDs both remain because they answer different questions.

## Risks

- missed route/path producer recreates a competing authority;
- display-only `memberName` could be reintroduced as structural validation, rejecting safe history;
- terminal prerequisite records could be mistakenly expected to rerun, or residual flat items could require an unavailable post-listen retry surface;
- the terminal historical token ID could remain registered as target authority, causing corrected conversion never to execute for supported predecessors;
- per-row token commits or premature `MIGRATED` details could leave/describe a partial database after later failure;
- a large token transaction could increase upgrade time; deterministic planning, mutation-only batching, bounded failure details, progress logging, and idempotent retry mitigate it without weakening atomicity;
- genuine route/path/topology contradictions could be weakened while accepting display divergence;
- task-chain conversion could merge equal logical addresses if run IDs/order are mishandled;
- dynamically discovered application DBs could be skipped;
- root-tree sharing could accidentally materialize siblings or leak mutable objects;
- task execution could accidentally persist a second logical tree;
- frontend state could collide if any map uses only member address;
- physical storage could move accidentally during naming cleanup;
- an over-broad result refactor could change `send_message_to` exact-run codes while simplifying the independent rule-query result; and
- provider-specific prompt/exposure logic could omit or weaken the intrinsic completion protocol;
- the external classroom fixture's obsolete prose could exercise a removed task selector unless the staged overlay is explicit; and
- live provider credentials, catalogs, rate limits, or processes could fail, requiring truthful Blocked/Fail evidence rather than a false pass;
- a stale project application manifest/vendor/importable copy could pass source compilation but fail or misbehave when imported;
- an old bundle could be correctly quarantined while its durable platform DB is incorrectly skipped if migration consumes the catalog; and
- a manifest could claim V5 while exporting a V4 backend definition, requiring the loader's final exact gate before callable behavior.

Mitigation is semantic-role-aware predecessor validators, one independently pending `20260801...` target owner, fresh/terminal TeamRun DS-009 and token DS-013 chain coverage, fail-not-guess planning, byte/row-stable rejection, one verified token transaction with forced-later-failure rollback proof, idempotence, exact three-level persistent/restored/task coverage, one execution serializer, source allowlist enforcement, exact V5 gate/diagnostic tests, source-to-generated package consistency checks, catalog-independent physical DB inventory tests, canonical application launch/binding/event round trips, byte/path storage preservation tests, exact handoff projection/order tests, provider prompt snapshots, intrinsic-exposure tests, independent send-envelope regression coverage, and the isolated/redacted/no-skip DS-011 live matrix.

## Guidance For Implementation

- Treat requirements and all four supplements as normative; this specification supplies ownership and sequence.
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
- Never compare historical TeamRun `memberName` with route/path or rewrite it to manufacture agreement; it is display-only input and is omitted from v3.
- Derive a predecessor node address only after normalized `memberRouteKey` and `memberPath` agree exactly; reject parent/duplicate/coordinator/run contradictions without mutation.
- Keep flat TeamRun interpretation in one migration-only decoder. `20260517...` owns the pending predecessor write; `20260801...` owns final v3 and may compose that decoder for residual flat input after a terminal record. Do not depend on terminal ID reruns, require a listening API for recovery, duplicate the decoder, or add a speculative third TeamRun migration.
- Treat DS-013A–D as normative. Remove `20260703_token_usage_execution_address_backfill` from current registry authority, compose the preserved strict token index/planner under `20260801...`, and never reset or reinterpret the historical record.
- Give the token migration store exactly one immutable batch mutation. Complete all planning first; use one transaction with affected-row and read-back verification; on failure roll back all rows and report zero migrated. Do not expose a per-row commit method.
- Retarget pending token legacy-column cleanup to exact `20260801...` success and keep the one existing exact canonical pre-listen gate; unrelated warnings stay non-blocking.
- Treat the five DS-012 case spines as normative: source/artifact build, old-bundle rejection, exact V5 launch, catalog-independent durable migration, and verification.
- Keep V5 constants/types in the contracts package; do not introduce a compatibility service, V4 adapter, or duplicated version literal policy.
- Reuse existing catalog diagnostics/quarantine. Every compatibility failure must name location/field, observed value, required V5, and rebuild/reinstall action before execution.
- Discover/migrate application platform DBs from physical storage before catalog admission and never load bundle code to convert platform-owned identity.
- Regenerate, do not selectively patch, SDK dist/vendor/importable outputs and fail consistency coverage on any stale V4 declaration.
- Do not alter delivery-owned dirty documentation/finalization files during solution design.
- Do not run live provider tests during design. SR-013 changes solution artifacts only; the user has authorized architecture re-review, but implementation and API/E2E execution remain blocked until that review passes.
