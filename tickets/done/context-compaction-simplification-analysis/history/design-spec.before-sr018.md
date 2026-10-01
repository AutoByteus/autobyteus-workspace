# Context-compaction simplification — design spec

## Solution And Approval Basis

- Package/current round: `context-compaction-simplification-analysis` / **SR-017** (settings/default revision; original full architecture SR-013).
- Approved requirements: **SR-012 plus SR-017 settings amendment**, REQ-001–009 / AC-001–012. Original SR-012 approval captured in SR-013 by user **“Correct. approve”** after the consolidated scope and first/repeated-compaction explanation.
- Approved behavior supplements: `proposed-compaction-prompt.md` (SR-008/prompt-v5, exact literal) and `output-format-and-coverage.md`. Approval includes useful-detail guidance, single tagged Markdown output, preservation and clean replacement. No new user behavior is introduced by this design.
- Design status: **Partially revised — overall recovery hold**. SR-017 explicitly removes the old model-settings import and DS-006; its replacement is ordinary missing-setting defaults, not a new migration/admission framework. Affected settings design below is revised against that approval, but production removal/review/validation has not occurred. Candidate-v6 remains unapproved and API-F005/F004 remain open. The latest migration guideline also changes touched-format reader conventions; the existing strict-v5 snapshot assumptions need a focused standards/reader audit before claiming the full revised package ready. No new history transformation is inferred from that audit. Historical independent review applies only to its recorded basis.
- Canonical evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/investigation-notes.md`, especially E13-1–6.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`; branch `codex/context-compaction-simplification-analysis`; current refreshed base `origin/personal` at `cb01dea2392e4bd7233855218e9a1a5b65ec3530`, HEAD `599cc4776a2da6c746be9719064fd1a7efdfa36e` (SR-016; original design basis retained in history); finalization target `origin/personal` via Delivery Engineer.

## Historical Current-State Read (SR-013 investigation basis)

Native runtime threshold observation requests compaction; the pending executor captures working context, selects a registered strategy (only `structured-json` ships), and invokes a separately launched compactor AgentRun. Its six-array JSON may receive one corrective generation. Normalized episodes/facts become stored rows and lineage membership, then are rendered into one text region and saved in the working-context snapshot. The next request already consumes that text region, not the category records.

Resume deserializes the saved v5 messages but additionally loads category membership to validate a lineage/summary-presence invariant. The result is not used to rebuild summary text. Commit currently prunes active traces before the replacement snapshot is durable. The same source also already supplies the useful window planner, tool-safe finalizer, snapshot serializer, raw archive primitives and failure gate that this design retains.

## Task Size And Architectural Risk (Mandatory)

- **task_size: Large.** This is a clean-cut core runtime refactor plus direct-provider response metadata, server model/settings wiring, current configuration/default handling without a legacy import, and limited frontend/settings/status cleanup. The initial source-reference inventory has 59 matched files, extended by a final shared-contract/history audit; not all are modifications, and source/test/content counts alone do not determine size.
- **architectural_risk: High.** Shared core configuration/result APIs change; restore loses a persisted-category dependency; commit ordering/commit point changes; seven direct adapter families need explicit completion status; a child-agent lifecycle is removed; model settings move ownership; exposed GraphQL strategy queries/deep exports disappear.
- Payload versus structure: the prompt is one unchanged approved text payload. The structural changes above—not that prompt or the volume of research—justify Large/High.
- Escalate if implementation finds another production category/lineage consumer, requires snapshot schema changes, needs cross-run retrieval, cannot honor a current-format user-selected model or the SR-017 parent-model default, or needs a new user-facing recovery/retention policy. Return to Solution Designer; do not silently add fallback algorithms or widen migration.

## Architecture Investigation Evidence

| Source / probe | Exact reference | Observation | Decision supported | Remaining uncertainty |
| --- | --- | --- | --- | --- |
| Post-approval core/provider/settings inspection | Investigation E13-1/2; `sr013-source-inventory.json` | Existing BaseLLM and availability/secret construction suffice; terminal metadata currently discarded | Fresh direct LLM per attempt; metadata belongs in adapters | No live-provider quality/cost benchmark |
| Commit/archive/restore source | E13-3 | Snapshot already holds text; archive copy can precede pruning | One snapshot authority; staged evidence copy and durable snapshot commit | Target fault tests still required |
| Six unchanged-source probes | E13-4; script/log/results under `design-investigation-probes/` | Representative snapshot reuse, old gate rejection, archive-copy sequencing and deduplicated corpus confirmed | No conversation-data migration; reuse current storage owners | Synthetic fixtures, not production census or crash/power-loss test |
| RPA server source, read-only | E13-2, external SHA/file hashes | Response schema has no stop reason; generation config is generic | Unknown status remains explicit; no provider exclusion or invented guarantee | Deployed hosts may differ |
| Current readers and startup | E13-1/5 | Historical category inspection independent; `setDurably` exists; builtin bootstrap overwrites template config | Historical evidence only: SR-017 now leaves old preferences inert and removes the import | External SDK consumers not enumerated |

## Intended Change

Replace the categorized/agent-based algorithm with one direct summary path:

```text
existing trigger and authorization
  -> existing history-window plan
  -> one direct LLM request with approved prompt
  -> extract one marked Markdown body
  -> validate finalized context
  -> safely replace saved working context
  -> continue the same run
```

No second algorithm, generic compaction framework, second summary file, category output or new long-term-memory subsystem. Keep data on disk independent from what is placed in the next model request.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | Approved IDs | Trigger / current basis | Change or preservation | Target path / spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001–006/008/009; AC-001/003–007/010/011 | Native run threshold/hard-cap observation; llm-phase and assembler | Automatic one-call summary, retained safe context | Run -> LLM phase -> MemoryManager/PendingExecutor -> direct summarizer -> commit -> dispatch; DS-001 |
| BEH-003 | System | REQ-001/003/006/009; AC-002/004/007/011 | Later threshold crossing after previous summary | Previous summary plus newly eligible history -> one replacement | Same DS-001; no extra loop |
| BEH-005 | System/user retry | REQ-004/005; AC-005/006/011 | Actual provider/output/precommit failure and existing user retry | Keep baseline; explicit failure; no autonomous correction | DS-001, DS-004 status/authorized retry |
| BEH-004 | User | REQ-007; AC-008 | Normal supported strict-v5 resume | Restore saved text directly; no re-summary/category prerequisite | Resume service -> native factory -> snapshot bootstrap -> tool repair -> dispatch; DS-002 |
| BEH-002 | User | REQ-007/008; AC-009/010 | Existing Memory Inspector/settings | Old records remain readable; useful controls remain without algorithm/agent workflow | Inspector -> AgentMemoryService -> existing file readers; DS-003. Settings -> settings owner -> direct construction; DS-005 |

## Relevant Supplemental Task Artifacts

All owned paths are under the canonical ticket directory stated above.

| Artifact | Purpose / related IDs | Relationship / status |
| --- | --- | --- |
| `requirements-doc.md` | All intended behavior | Approved SR-012, captured SR-013 |
| `proposed-compaction-prompt.md`, `output-format-and-coverage.md` | REQ-001/004–006/009, AC-002/005–007/011 | Approved literal and output/detail contract; do not rewrite during implementation |
| `compaction-prompt-proposal.md`, `prompt-refinement-notes.md` | Prompt rationale | Earlier feasibility is superseded by this spec where technical detail differs |
| `simplification-design-direction.md` | Keep/remove discussion | Direction accepted; this spec finalizes its previously pending technical choices |
| `upstream-compaction-research.md`, `upstream-prompts/README.md`, `upstream-experiments/` | Comparative source/prompt evidence | Pinned five-project evidence, not dependencies or quality rankings |
| `design-investigation-probes/` | E13-4 and earlier four probes | Reproduction logs/source hashes; no target implementation claim |
| `analysis-report.md`, `history/`, `solution-revision-record.md` | Evolution | Historical, not competing current specs |
| External `memory-compaction-file-backed-redesign` ticket | Earlier three-output WIP | Read-only, premise superseded for this package. Its reviews do not approve this design; do not merge competing implementation |
| Product and independent review artifacts | N/A | Product not requested; this design not independently reviewed yet |

## Task Design Health Assessment (Mandatory)

- Posture: **Behavior Change / Refactor / Cleanup**.
- Issue: **Yes**. Root causes: boundary/ownership confusion, duplicated representations, overly category-specific shared structures, and unnecessary strategy/child-agent coordination.
- Refactor now: **Yes**. Adding only a text strategy leaves the accepted-result/category writer/restore coupling intact. Moving only the prompt leaves all unnecessary execution and persistence work.
- Response: one owner-controlled compaction sequence; direct generation; tight summary payload; snapshot authority; explicit removal inventory below.
- Preserve: distinct window planning, provider construction, structural validation, evidence storage and existing user retry. Simplification does not make the pending executor a provider/storage god object.
- Deferrals: genuine long-term memory, RPA protocol expansion, unrelated archive-format compatibility, power-loss durability improvements and global settings redesign. Residual model quality/provider visibility and external API consumer risk are disclosed below.

## Terminology

- **Continuation summary**: one Markdown body describing task state; not an episodic/semantic record or backup.
- **Snapshot**: existing serialized current working context, including summary, head/recent messages and provenance.
- **Attempt**: one authorized logical generation; transport retries inside the provider SDK are not additional compaction reasoning passes.
- **Archive preparation**: durable copy of selected evidence before removing it from active storage. A complete archive segment is evidence, not proof that a summary committed.

## Design Reading Order

Read intended flow and behavior map, persisted-state decision and DS-001 details, then ownership/removals, concrete interfaces/files and validation sequence. Repeated mandatory template checks below reference the same owners instead of introducing extra layers.

## Legacy Removal Policy (Mandatory)

**No backward-compatibility execution paths. Remove replaced code.** Preserve directly readable user data, not the old algorithm. No JSON-to-Markdown fallback, dual writers/readers selected by format, legacy strategy option, hidden child-agent retry, or compactor-agent lookup during normal execution. Current snapshot schema stays v5 precisely because its message representation is already sufficient.

## Persisted Data / State Transition Decision

| Subject / location | Existing shape, evidence and volume | Decision and required invariants |
| --- | --- | --- |
| Per-run `working_context_snapshot.json` | v5 `{schema_version,agent_id,messages}`; summary is ordinary text in existing provenance. Four earlier probes and six SR-013 probes; representative replacement 898 bytes. Production count/volume not sampled | **Directly Usable — No Migration.** Same serializer and schema; validate 0 or 1 summary regions independent of category/lineage. No heading-based old/new reader. Preserve meaningful text, identity, provenance and tool structure |
| `episodic.jsonl`, `semantic.jsonl` | Existing independent Memory Inspector readers | **Not Affected in stored shape.** Stop compaction writes; retain historical files/readers. New runs may have none |
| `compaction_lineage.jsonl` | Only replaced runtime output membership dependency in inspected production callers | **Directly Usable as untouched historical data; unused by current compaction.** Remove active code/exports; do not delete or rewrite old files |
| Raw active/numbered segments/manifest | Existing normalized records and deduplicating corpus reader; synthetic 3 records/266-byte archive | **Not Affected in schema.** Write ordering changes, not historical serialization. Current segments are run-root `raw_traces_000001.jsonl`; old locations remain handled by existing unrelated archive reader |
| Retired builtin compactor model/configuration | At most one `agents/autobyteus-memory-compactor/agent-config.json`; no current-runtime consumer needed after removal | **No Migration — old preference carry-forward deliberately dropped (SR-017).** Leave source files untouched/inert; do not read/copy/validate them for compaction or startup. Absent current setting means parent-model defaults; explicit current-format settings remain authoritative |

No acceptable history loss. No bulk migration, network export or inspection of user content. Upgrade work is independent of the number of saved conversations. Snapshot/trace content keeps existing privacy/access boundaries. Concurrent old/new binaries writing one run are outside the approved scope; deploy coordinated versions with old processes stopped. Basic filesystem atomic-rename semantics are reused, not claimed to provide fsync/power-loss durability.

### Current Settings and Defaults — No Import (SR-017)

- Keep current optional setting `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS`, `{ "modelIdentifier": string|null, "llmConfig": object|null }`. Absence is a valid default, not incomplete initialization: same semantics as `{modelIdentifier:null,llmConfig:null}`. Do not persist a default merely to mark completion.
- Resolve the parent model identifier from the actual current parent LLM at each attempt. With no explicit current override, use that same model/provider via `createAvailableLlm` and existing credential ownership. No new credential store or secret copying, child run, reused parent conversation or parent-object mutation.
- Selected-model defaults supply unspecified generation options; keep existing compaction prompt, tool prohibition and output-cap rules. Existing current settings may explicitly override supported generation fields or model. This is not a requirement to copy the parent's entire LLM configuration or invent a universal temperature field for providers that do not support one.
- Keep ratio/budget/diagnostic controls and the existing optional model/config editor. Default label remains “inherit/use parent model.” A missing current setting renders that default and works without a Save/init step. User changes alone invoke normal validated durable saving; an existing current-format setting is not wiped or guessed to be legacy-imported.
- **Remove** `S/startup/compaction-model-settings-migration.ts`, its direct await/import in `S/application-platform/runtime/build-application-platform-runtime.ts`, and obsolete migration-specific tests. Do not register a replacement migration. Remove any requirement to initialize or validate this setting globally at startup.
- Never read the old builtin definition for selection. An old custom model/config is deliberately not carried forward. Do not delete the old definition, category/trace files, or old child histories.
- Missing current settings use defaults. Invalid current settings fail at normal settings/compaction use through existing error reporting, not application startup; valid but unavailable explicit choices remain explicit errors, not silent fallback. No new migration-status reader, readiness flag, sentinel value, recovery UI or initialization journal.
- Strategy configuration remains removed; an old unused environment entry has no algorithm-selection meaning and needs no conversion.

### Persisted-Data Guideline Check (SR-017)

Reviewed canonical `autobyteus-server-ts/docs/design/data_migration_guideline.md` on the refreshed base; section 2 now has ten checks. This records the narrow no-import decision, not full completion of the wider format audit.

1. **Need:** no settings conversion is needed once the user accepts fresh parent-model defaults instead of old preference preservation. No new conversation conversion is proposed.
2. **Availability:** remove the old-file read/write dependency and its pre-listener failure path entirely. Actual current credential/schema prerequisites remain owned by their existing services; no blanket promise to ignore unrelated platform failures.
3. **Source/target:** old defaultLaunchConfig shape and current tuple/factory/UI inspected. There is no conversion target to establish; current tuple absence is valid. No installed private data inspected.
4. **Disposition:** old preferences ignored, old files unchanged; explicit current overrides retained; current invalid settings rejected at use. No migration status/result exists for this removed path.
5. **Commit/retry:** ordinary current-setting save uses existing `setDurably`. No upgrade write, backup, hash, marker or progress journal. Existing snapshot/raw commit sequence is separate.
6. **Current-only:** runtime reads only the current setting plus current parent model, with no old-file fallback. Remove the unregistered converter; no SQL/source-shape adapter or new migration entry. Already released unrelated migrations remain untouched.
7. **Cost:** zero old-compactor file reads/parses/copies/writes at startup or compaction; no history scan or default-initialization write. Ordinary setting access is independent of history size. These are target bounds to verify after removal, not a measured completed implementation.
8. **References:** selected model/provider goes through existing availability and credential construction. No references to old compactor identity or historical categories are needed by this setting. Existing run/tool provenance remains separately validated.
9. **Evidence:** source confirms absent current value already inherits the supplied parent and UI already handles absence. Target startup/no-old-read/default-save tests still required. Existing 14 import tests are historical tests of code to remove, not no-import acceptance. Full snapshot-reader convention alignment remains under investigation.
10. **Lessons/review:** eliminate the known unnecessary startup lockout by removing its obsolete dependency, not by adding fallback/retry machinery. Earlier registered-migration alternative is now rejected as unnecessary under the user's approved reset choice. No need to copy predecessor migration mechanisms when no transformation is designed. Applicable architecture/source/API review remains required for the revised package.

## Data-Flow Spine Inventory

| ID | Scope | Behaviors | Start -> end | Governing owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end | BEH-001/003/005 | Active native run -> one reduced valid next request | PendingCompactionExecutor with MemoryManager state boundary |
| DS-002 | Primary end-to-end | BEH-004 | Resume request -> restored native run ready for next request | Existing resume/factory and snapshot bootstrap |
| DS-003 | Primary end-to-end, preserved | BEH-002 | Memory Inspector -> stored historical/current content | AgentMemoryService |
| DS-004 | Return-event | BEH-001/005 | Attempt state -> existing progress/failure UI and user retry admission | CompactionRuntimeReporter + existing gate |
| DS-005 | Primary settings/configuration | BEH-001/005 via REQ-008 | Existing settings -> next direct model construction | ServerSettingsService / server compaction model factory |
| DS-006 | **Retired by SR-017** | REQ-008 / AC-012 | No old-settings conversion; no replacement startup flow | N/A — absence uses current defaults |

## Primary Execution Spine(s)

- DS-001: `Run / LLM phase -> threshold gate and request assembler -> PendingCompactionExecutor -> window planner -> DirectLlmCompactionSummarizer -> finalizer/validator -> MemoryManager commit -> parent dispatch`.
- DS-002: `Resume service -> native backend/factory -> SnapshotBootstrapper -> saved messages + active raw tool repair -> final validation -> next request`.
- DS-003: `Memory Inspector -> existing GraphQL/service -> AgentMemoryService -> existing snapshot/category/raw readers -> rendered view`.
- DS-005: `CompactionConfigCard -> existing settings API -> validated durable model setting -> server LLM factory callback -> fresh direct LLM for next attempt`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Main subjects / governing owner | Off-spine concerns |
| --- | --- | --- | --- |
| DS-001 | Existing automatic gate authorizes an attempt. Capture immutable context/fingerprint. Plan settled prefix and protected retained suffix. Summarizer builds one request and returns validated body plus invocation metadata. Builder composes replacement; validator checks invariants. Commit prepares evidence, saves snapshot, installs state and cleans active duplicates. Parent continues only after commit | Attempt, context window, summary, accepted context; PendingExecutor and MemoryManager | Provider construction, prompt formatting, status, storage |
| DS-002 | Load same strict-v5 snapshot. Validate identity, message/provenance shape and at-most-one summary. Do not read categories/lineage. Use existing raw-tool fact repair then validate/save as today. No model call just to resume | Saved working context; bootstrapper | Existing raw store and tool repair |
| DS-003 | Existing service directly reads requested category files and snapshot. No new writes means empty categories are ordinary; old content still reads | Run memory view; AgentMemoryService | Existing access/node routing unchanged |
| DS-004 | Preserve requested/started/completed/failed events and operation/turn correlation. Failure before commit keeps baseline and existing explicit user retry; no hidden repair generation. Cleanup warnings after commit do not relabel the accepted summary failed | Attempt state; reporter/gate | Frontend status presentation |
| DS-005 | Missing current setting uses the current parent model by default. Settings UI can save an explicit current model/config override. Each new attempt resolves current settings once; in-flight invocation does not change. No startup import or initialization step | Compaction model settings; server settings/factory | Model catalogue, availability, secrets, durable app config |

## Spine Actors / Main-Line Nodes

No new service hierarchy: retain MemoryManager as authoritative working-context/state entrypoint, its existing coordinator for gate/baseline/commit state, PendingCompactionExecutor for attempt sequencing, and the existing storage owners. Add only a concrete direct summarizer and small marked-output parser, with a factory callback at the existing dependency-construction boundary.

## Ownership Map

- **MemoryManager:** current context and raw evidence public boundary. Keeps all baseline/prepare/commit calls going through its coordinator. No public callers directly mutate its snapshot/archive stores.
- **MemoryManagerCompactionCoordinator:** pending state, baseline freshness and completion state. Remove lineage dependence; keep fingerprint and operation authorization checks before acceptance and commit.
- **PendingCompactionExecutor:** plan -> call -> validate -> commit -> status. Owns no model credentials, file paths or category schemas.
- **DirectLlmCompactionSummarizer:** approved prompt/input assembly, request budget preflight, one invocation, completion/framing extraction, per-attempt model cleanup. No run storage/tools/agent manager.
- **AcceptedCompactionBuilder / validator:** pure candidate construction and preserved head/tail/tool/budget invariants; no artifact IDs or category writes.
- **AcceptedCompactionCommitter:** bounded storage sequence behind coordinator; no inference/provider logic.
- **Server model factory:** settings + model availability + secret-aware LLM creation. No conversation summary persistence or parent LLM mutation.

## Thin Entry Facades / Public Wrappers

MemoryManager is not an empty wrapper: it owns working context and coordinates gate/storage state. The server-injected `createLlm` callback is a construction boundary, not a runtime algorithm selector. Existing GraphQL settings endpoints remain transport only. No new compaction repository facade or generic strategy adapter is justified.

## Removal / Decommission Plan (Mandatory)

All paths below are repository-relative; `C` = `autobyteus-ts/src/memory/compaction`, `M` = `autobyteus-ts/src/memory`, `S` = `autobyteus-server-ts/src`.

| Remove/decommission | Why / replacement | Scope |
| --- | --- | --- |
| C/agent-compaction-summarizer.ts, compaction-agent-runner.ts, structured-json-compaction-strategy.ts | DirectLlmCompactionSummarizer and direct executor plan; no child or algorithm wrapper | This change |
| C/compaction-response-parser.ts, compaction-result-normalizer.ts, compaction-result.ts; correction-prompt branch | Single tagged body parser; no six-array normalization or correction call | This change |
| C/default-working-context-compaction-strategy-registry.ts, working-context-compaction-strategy-registry.ts, working-context-compaction-strategy-resolver.ts, working-context-compaction-strategy.ts, working-context-compaction-strategy-setting.ts | One algorithm; useful diagnostics move to concrete compaction contract | This change |
| M/projection/compacted-memory-message-builder.ts, compacted-memory-context-projector.ts, compacted-memory-projection-bundle.ts, current-compaction-output-loader.ts | Summary text directly finalized; no category projection or restore gate | This change; final source-reference audit must find no live importer |
| M/lineage/* and M/store/file-compaction-lineage-store.ts; AgentConfig.compactionLineageScope and factory wiring | No categorized output lineage authority. Existing operation IDs and raw archive membership remain separate | This change; historical files untouched |
| S/agent-execution/compaction/server-compaction-agent-runner.ts, compaction-run-output-collector.ts, memory-compactor-agent-launch-resolver.ts | Server direct model creation; no launch/subscribe/post/wait/terminate child lifecycle | This change |
| S/agent-execution/backends/autobyteus/compaction-lineage-scope-resolver.ts | Compaction is local to already-identified run/store; not category membership per scope | This change; retain actual team execution identity elsewhere |
| S/config/working-context-compaction-strategy-setting.ts; S/api/graphql/types/working-context-compaction-strategy.ts and registration | Remove getWorkingContextCompactionStrategies/getEffectiveWorkingContextCompactionStrategyId | This change, coordinated client/server release |
| Web stores/workingContextCompactionStrategyCatalog.ts; selector/query/store/status references | Keep useful settings/status; remove nonexistent algorithm/child/fact data | This change |
| Builtin memory-compactor registry entry and template directory; recursion-disabling special case; related asset smoke assertions | Prompt becomes core literal module, not agent package | This change; old persisted definitions/history remain data |
| Obsolete exports/tests/docs for above | No empty facades, deprecated aliases, or tests pinning removed behavior | This change |

Retain `message-budget-strategy.ts`: it is an actual cost-calculation boundary, not an alternate compaction algorithm. Retain independent category item/read types and Memory Inspector readers; do not blanket-delete memory storage or retrieval code not required by this refactor.

## Return Or Event Spine(s)

DS-004 retains event phases, operation/turn IDs, timing/budget/selection sizes and errors. Replace child-run/task IDs, strategy names and episode/fact counts with model/provider, summary character/estimated-token counts and completion status. Update runtime reporter, shared strict presentation DTO, server event normalization and frontend typed consumers together. Detailed logs must not dump user history, summary or secrets by default; record counts and existing opt-in diagnostics policy. Reporter failures after commit must not revert or classify a committed summary as failed.

The shared `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` COMPACTION_STATUS schema is strict, with required nullable fields. Change it, its package tests, both team/collaboration projectors, and current web stream adapters as one contract change; dropping producer fields alone is invalid. Preserve unrelated provider/session/boundary/trigger fields used by other runtime backends. In contrast, existing historical raw-event projection and Event Monitor still read old fact counts: retain that historical read/display capability and optional history-view fields where used, with no new writes or dependency from live compaction. Do not delete historical data readers merely because names match the removal search. Historical decoding remains in the existing run-history owner, not a new legacy compaction path. Test both new live statuses and old stored event/history presentation.

## Bounded Local / Internal Spines

1. Pending owner retains existing initial-ready -> in-progress -> completed or awaiting-user-retry transition. No added semantic retry loop.
2. Direct summarizer: fresh LLM -> build/preflight -> send once -> evaluate terminal/framing result -> cleanup in finally. Parent AbortSignal is checked before call, after await and immediately before commit; a late provider result after cancellation cannot mutate state.
3. Committer: prevalidate/preallocate -> stage archive copy -> write snapshot -> install/complete -> prune archived duplicates. All commit steps after model await are synchronous local ownership operations; no new cross-run transaction engine.

## Off-Spine Concerns Around The Spine

| Concern | Spines / owner served | Decision / risk if misplaced |
| --- | --- | --- |
| Model catalogue, availability, keys, Gemini runtime | DS-001/005 server construction | Reuse createAvailableLlm; never embed credentials or model discovery in core memory |
| Input rendering and Unicode safety | DS-001 summarizer | Existing renderer/builder; role labels/history boundary remain source framing, not executable instructions |
| Parent and compactor request budgets | DS-001 executor/summarizer | Existing token estimates/capacity helpers, two distinct budgets; do not conflate replacement size with available summarizer input |
| Snapshot/archive persistence | DS-001/002 committer/bootstrap | Existing owners; no provider calls from storage |
| Historical inspection | DS-003 service | Preserve current read path; never make it an active compaction prerequisite |
| Default settings | DS-005 factory/UI | In-memory defaults when current setting is absent; no startup work or historical read |
| Status/diagnostics | DS-004 reporter | Preserve events without category/child metadata; no duplicate attempt state in UI |

## Ownership Boundaries

Generation returns a candidate, not authorization to commit. Coordinator verifies current fingerprint/operation remains valid. File stores own filesystem details; committer uses staged-archive and snapshot boundaries. Server factory owns current settings and existing secret ownership; the LLM phase supplies the current parent model identifier for each attempt, while core owns summary content and invocation safety. A callback is injected for testability/provider construction—not a registry or capability plugin.

## Boundary Encapsulation Map

| Boundary | Internal mechanisms | Callers / forbidden bypass |
| --- | --- | --- |
| MemoryManager | coordinator, working-context controller, commit storage | Executor uses capture/prepare/commit; must not write category/snapshot/archive files directly |
| DirectLlmCompactionSummarizer | prompt builder/parser, fresh BaseLLM | Executor supplies selected units/budget/signal; no AgentRunManager or tools |
| Server compaction model factory | settings reader + createAvailableLlm | Native backend config construction only; no direct vault/API-client bypass |
| ServerSettingsService | validation + durable AppConfig | Existing UI/API current-value saving only; no compaction-settings import or startup initialization |

## Dependency Rules

Core memory may depend on existing core LLM/message/budget abstractions, never server/GraphQL/agent-manager modules. Server compaction construction may depend on core types and existing model/secret services, never on the old builtin agent at runtime. The executor must not know provider-specific stop-reason strings. Adapters normalize them. No business/runtime reader branches on old-vs-new summary headings. No caller bypasses MemoryManager to set a context during an attempt. Removing lineage does not remove baseline freshness, raw provenance or tool identity checks.

## Interface Boundary Mapping

### Tight core contracts

Names are concrete, not a second strategy API:

```ts
// memory-compaction-configuration.ts
// Existing disabled variant stays. Enabled config replaces runner with summarizer.
{ kind: 'enabled'; policy: CompactionPolicy; summarizer: DirectLlmCompactionSummarizer }

// direct-llm-compaction-summarizer.ts: constructor dependency, fresh instance per call
createLlm(input: { parentModelIdentifier: string }): Promise<BaseLLM>
// Resolve current settings and effective bounded config before construction.

summarize(input: {
  units: readonly WorkingContextMessageUnit[];
  summaryBudgetTokens: number;
  parentModelIdentifier: string;
  operationId: string;
  executionTurnId: string;
  signal: AbortSignal;
}): Promise<{ summary: string; execution: CompactionExecutionMetadata }>

// working-context-compaction-proposal.ts: one authoritative candidate
{
  selectedNewRawTraceIds: string[];
  retainedMessages: Message[];
  summary: string;
  budgetAssessment: CompactionBudgetAssessment;
  execution: CompactionExecutionMetadata;
}
// Accepted result retains operation/compaction ID, baseline fingerprint,
// selected raw IDs, finalizedContext, budgetAssessment; no category rows/lineage.
```

`CompactionExecutionMetadata` in `compaction-execution.ts`: model identifier, provider, attempt invocation identifier, completion status and existing usage observation if available. Keep operation/turn identity in the owner/request; do not duplicate parent IDs, child runtime IDs or prompt content into many shapes. Diagnostics share this type and reference actual invocation metadata, not last-run mutable state.

### Input and output details

- At attempt start, use the current LLM phase instance’s `llmInstance.model.modelIdentifier` as the parent identifier, not a run-creation-time capture. The factory reads the current model setting once: explicit model wins; null inherits this current parent. Null llmConfig uses selected-model defaults; explicit config uses existing normalized overrides, never parent tools/system/extensions. An in-flight attempt keeps its resolved model/config fixed. Test a parent model change between attempts and a settings change before a later attempt.
- Executor invokes existing planner directly with the captured baseline and planning budget; remove the StructuredJsonCompactionStrategy forwarding/normalizing layer rather than renaming it to another strategy.
- Preserve complete user/prior-summary and assistant natural-language content in rendering. Existing `maxItemChars` is restricted to tool argument/result presentation values (document this narrowed use); no blanket 2,000-character clipping of instructions or summary. Reuse Unicode-safe formatting. Preserve exact useful tool names/paths/IDs and label excerpting; raw full evidence remains stored.
- Render the **actual selected** prefix with existing source boundaries; never reread the full archive or include retained tail twice. First pass has no prior summary; later passes include the provenance-marked earlier summary once.
- Use the approved literal as the summarizer system instruction. Ship it as `compaction-summary-prompt.ts` string constant for normal TS packaging, with a test comparing its text to the approved fixture. No dependency on a builtin agent Markdown loader or prompt auto-generation.
- Task prompt may state the numeric summary budget from existing planning, separately from the unchanged literal. No unapproved extra semantic instructions, JSON repair text, tool schema or parent system prompt is installed as compactor authority.
- Compute summarizer input capacity from the **fresh compactor model/config**, not parent model metadata. Reuse resolveLlmRequestCapacity without the parent-only active-context override. Count rendered system+user request with existing estimator and safety margin. If unavailable capacity or oversized input, report `input_budget_exceeded`/`input_capacity_unavailable` before generation; do not silently drop user constraints, spawn a helper or recursively summarize chunks.
- Summary budget is the existing replacement reserve; final candidate still must meet the actual post-compaction target. The injected factory selects an explicit positive configured output cap, otherwise 8,192, clamped to the selected model maximum when known, before constructing the adapter (some adapters cache this value in their constructor). The summarizer inspects this already-effective config for capacity; it must not mutate a constructed adapter or create a second model merely to change its limit. Reserve that full generation allowance during request-capacity calculation (reasoning may consume output tokens). It is not proof of summary quality. Preserve provider generation settings except invocation-controlled system, tools, response format, stop sequences, conversation continuation, stream/count and output-limit keys. Enforce controlled request fields through existing provider request builders; adapter request tests prove extraParams cannot reintroduce tools/old response format or override the cap.
- Send one system message plus one source-history user message through `BaseLLM.sendMessages`; pass no tools. Generate unique logicalConversationId per attempt (not parent conversation ID), with the parent abort signal. Existing provider kwarg filtering handles identity for other adapters.
- Cleanup fresh LLM in finally; never cleanup/mutate the parent instance. Provider cleanup errors are diagnostics, do not mask the invocation error or discard a valid summary. Native remote cleanup is capped at 10 seconds per isolated conversation using AbortSignal.timeout and optional AutobyteusRequestOptions on client.cleanup, matching its other request methods; no cleanup retry scheduler. Fresh direct calls have one conversation to clean.
- Extract from **response.content**, never reasoning. Require exactly one literal opening and closing marker in correct order, one nonempty body, no nested/multiple blocks. Ignore exterior prose. Trim only outer body whitespace; preserve inner Markdown. Six exact level-2 headings must occur once, in the approved order, with content/bullets or `(none)` under each. Do not parse six arrays or create per-heading stores. Reject malformed structure rather than guessing or adding missing facts. Markers/headings do not establish semantic fidelity.

### Completion status contract

Extend `CompleteResponse` only with `completionStatus: 'complete' | 'incomplete' | 'unknown'` (default unknown) and nullable `completionReason` for diagnostics. No streaming redesign is required: compaction uses the non-streaming methods. Existing callers may ignore this additive metadata. Each direct adapter sets it from its provider response; no compaction-owned provider switch.

| Adapter family | Normalize for this direct text call |
| --- | --- |
| OpenAI-compatible and subclasses | `stop` -> complete; length/content_filter/tool_calls/function_call or observed non-text tool output -> incomplete; absent/unrecognized -> unknown |
| OpenAI Responses | completed without refusal/tool output -> complete; incomplete/failed/cancelled or incomplete_details -> incomplete; other/missing -> unknown |
| Anthropic | end_turn or stop_sequence -> complete; max_tokens/model_context_window_exceeded/tool_use/pause_turn/refusal -> incomplete; unknown stays unknown |
| Gemini | STOP with text/no tool call -> complete; known non-STOP finish/block reason -> incomplete; absent/unspecified -> unknown |
| Mistral | stop -> complete; length/model_length/tool_calls/error -> incomplete; unknown stays unknown |
| Ollama | done+stop with no tool call -> complete; length or unfinished response/tool call -> incomplete; absent information -> unknown |
| AutoByteus RPA | current documented local response has no terminal reason -> unknown; network/explicit errors fail normally. No claim of portable generation-cap enforcement across RPA hosts |

Reject incomplete even when the closing tag is present. Unknown remains eligible only if framing/content/budget checks pass, matching the approved **known-incomplete** rejection requirement. Do not infer natural stop from token counts or claim tags detect every truncation. No remote RPA contract change or model exclusion in this task.

### Candidate construction and safe commit

Builder uses the baseline's preserved system messages, directly creates the summary user region with `createCompactedMemoryUserMessage`, marks the existing retained natural messages, applies the existing provider-native stale-thinking cleanup, and finalizes. Preserve the leading system head exactly and existing handling of other system messages (the current builder gathers system messages before the summary), with finalizer/planner ownership unchanged; do not promise unchanged original positions or invent a new role protocol.

Validator checks unchanged baseline/fingerprint, no input alias/mutation, exactly one new summary, structural/provenance validity, protected retained content/tool identities and parent post-compaction budget. Provider-native thinking redaction remains the explicit existing exception; no other tail changes. Selected raw IDs must equal the planner's selected source set, be unique/nonempty and exclude retained raw IDs.

Safe commit order, entirely behind MemoryManager:

1. Assert pending operation/authorized attempt, non-aborted signal and unchanged fingerprint. Validate/serialize candidate and preallocate the isolated in-memory WorkingContext copy before I/O.
2. `store.prepareCompactionArchive(selectedIds)` validates active membership and durably creates/reuses the selected evidence archive COPY **without pruning active data**. Keep current associated system-instruction archival policy. Return its boundary identity and archived IDs. Verify reused archive membership actually contains every selected trace; never trust boundary-name equality alone.
3. Write candidate through existing atomic snapshot-store replacement. This is the durable **commit point**. Before it succeeds, any error leaves old snapshot and active traces usable. The prepared archive may remain as an extra evidence copy and is safely reusable.
4. Install the preallocated context with a no-I/O, no-copy/no-callback operation; clear pending/advance existing threshold state using validated values. No fallible work that could pretend the previous snapshot remains authoritative after this point.
5. Best-effort prune only records proven present in that completed archive and not referenced by the committed snapshot. Pruning failure leaves duplicates and a warning, not a failed compaction or second model invocation. Corpus reader already deduplicates by ID.
6. Emit completed status safely and allow parent dispatch. Reporter failure is diagnostic; it cannot undo committed state.

Restart: old snapshot before commit, new snapshot after commit. If pruning failed, duplicate active/archive evidence may remain after restart. It does not change the restored snapshot, and corpus reads deduplicate IDs. Do not add an archive-wide restore scan, cleanup queue or durable journal merely to remove these copies. Normal successful commits prune their prepared selection; a completed boundary can be reused if that same selection is attempted after a precommit failure. Report retained duplicate bytes/cleanup failure as a diagnostic where known. No automatic inference re-run on restart.

## Interface Boundary Check

| Interface | Singular / explicit identity | Risk / correction |
| --- | --- | --- |
| summarize(input) | Yes; operationId + executionTurnId, one run-bound summarizer | Low; unique remote invocation identity separate from parent |
| MemoryManager capture/prepare/commit | Yes; current run/store plus operation/fingerprint | Low after lineage removal; retain checks |
| prepareCompactionArchive / prune prepared archive | Yes; selected raw IDs / durable archive boundary | Verify membership, never accept an arbitrary filesystem path |
| Model settings value | Yes; one modelIdentifier or explicit inherit | Model identity is not runtime kind/agent definition |
| Existing inspection API | Unchanged supported run identity | Do not broaden selectors or access scope |

## Main Domain Subject Naming Check

Use “summary”, “attempt”, “working context”, “model settings” and “raw archive”. Keep serialized `compacted_memory` provenance name to avoid needless data transformation; its meaning is a compacted context region, not episodic/semantic ownership. Remove category/child names from current compaction execution contracts; existing historical view-only fields are not execution authority. `MessageBudgetStrategy` remains accurately named for its separate concern.

## Existing Capability / Subsystem Reuse Check

| Need | Reuse/extend | New code only where justified |
| --- | --- | --- |
| Trigger/window/head/tail | Existing policy/gate/planner/unit builder/budget | None |
| Summarization | BaseLLM, existing renderer/Unicode helpers | Concrete direct summarizer + small tagged-body parser + literal prompt module |
| Persistence | Snapshot controller/store, raw store/archive owner | Two-phase archive API on existing owner; no new storage subsystem |
| Provider completion | Existing direct adapters/CompleteResponse | Two additive fields, not a provider framework |
| Model settings/UI | ServerSettingsService, durable AppConfig, current catalogue and ModelConfigSection/SearchableGroupedSelect | One current-setting codec/factory with absence defaults; no migration or algorithm selector |
| Status/history | Current reporter and AgentMemoryService | Remove stale fields, preserve actual outcomes |

## Subsystem / Capability-Area Allocation

Core memory/compaction owns attempt and summary transformation. Core memory/store owns evidence and snapshot filesystem operations. Core llm owns provider normalization. Server agent-execution/compaction owns dependency construction; server settings owns explicit current configuration; no compaction-specific startup transition. Existing web settings/status components own presentation. No new top-level subsystem or speculative future-memory extension points.

## Draft File Responsibility Mapping

Initial candidates were a Markdown strategy, separate summary store and server child-agent adapter replacement. Tightening removes the first two: executor directly plans, existing snapshot remains authority. The final mapping below uses only a direct summarizer, output parser, literal module and server current-setting codec/factory as focused responsibilities; remove the earlier proposed importer. Existing builder/committer remain because candidate construction and durable commit are distinct real policies.

## Reusable Owned Structures Check

`working-context-compaction-proposal.ts` owns the one summary proposal/accepted result. `compaction-execution.ts` owns invocation metadata/diagnostics formerly trapped in strategy/agent types. `CompleteResponse` owns provider completion status; no duplicate compaction-specific response object with provider strings. Archive preparation identity belongs to existing store contracts, not the public summary DTO.

## Shared Structure / Data Model Tightness Check

No parallel summary+episodes+facts fields, child IDs, category lineage or copied serialized snapshot on proposal. `summary` is the candidate body; accepted state contains the finalized context rather than another duplicate summary string. Budget assessment retains existing orthogonal measurements. Model settings use one compound value so ordinary user saves update model/config together; absence supplies defaults without writes. Completion status and native reason are separate normalized meaning versus diagnostic provenance, not two authorities.

## Final File Responsibility Mapping

| File/group | Owner / concrete responsibility | Change |
| --- | --- | --- |
| C/direct-llm-compaction-summarizer.ts | One model request, preflight, abort/cleanup, parse result | Add, replaces child summarizer |
| C/compaction-summary-parser.ts | Exact marked-body/heading validation with typed errors | Add, replaces six-array parser/normalizer |
| C/compaction-summary-prompt.ts | Approved literal exported as runtime constant | Add; remove agent template dependency |
| C/compaction-execution.ts | Direct invocation metadata and plan/result diagnostics | Add; extracts useful types from removed strategy/runner files |
| C/pending-compaction-executor.ts | Existing attempt sequence; direct planner/summarizer; safe status handling | Modify |
| C/working-context-compaction-proposal.ts, accepted-compaction-builder.ts, accepted-compaction-committer.ts | Tight summary candidate, pure finalized construction, safe evidence/snapshot commit | Modify |
| C/memory-compaction-configuration.ts, compaction-runtime-settings.ts | Enabled direct summarizer; existing controls without strategy ID | Modify |
| C/working-context-compaction-prompt-builder.ts, compaction-conversation-history-renderer.ts | Source framing; remove correction path, limit excerpts only to tool values | Modify |
| C/working-context-compaction-output-validator.ts | Existing and strengthened retained-context/single-summary checks; rename strategy-specific diagnostics | Modify |
| M/memory-manager.ts, memory-manager-compaction-coordinator.ts, memory-manager-working-context-controller.ts | Public ownership, lineage removal, preallocated install after snapshot commit | Modify |
| M/store/base-store.ts, file-store.ts, run-memory-file-store.ts, raw-trace-archive-manager.ts | Stage/reuse validated copies, prune the prepared selection behind owner | Modify; existing manifest schema |
| M/restore/working-context-snapshot-bootstrapper.ts, working-context-provenance.ts | Category-independent v5 restore and summary-region count | Modify; serializer schema unchanged |
| Core agent/context/agent-config.ts, agent/factory/agent-factory.ts, agent/loop/llm-phase.ts, agent/llm-request-assembler.ts, agent/compaction/compaction-runtime-reporter.ts | New dependency wiring, no lineage construction, signal propagation and current status | Modify |
| Core llm/utils/response-types.ts and seven direct adapters | Normalize nonstreaming completion status; no parent streaming redesign | Modify; subclasses inherit shared OpenAI-compatible behavior |
| Core clients/autobyteus-client.ts and llm/api/autobyteus-llm.ts | Bounded cleanup request options for isolated direct-call lifecycle | Modify; no remote API schema change |
| S/agent-execution/compaction/compaction-llm-factory.ts | Current-setting + availability/secret-aware LLM construction, controlled config | Add |
| S/config/compaction-model-settings.ts | Single-setting codec/current model configuration contract | Add |
| S/startup/compaction-model-settings-migration.ts; autobyteus-server-ts/tests/unit/startup/compaction-model-settings-migration.test.ts | Obsolete old preference import and import-specific tests | Remove (SR-017, relative to current branch) |
| S/services/server-settings-service.ts; S/application-platform/runtime/build-application-platform-runtime.ts | Keep explicit current setting validation/saving; remove import/await of old settings converter from platform preparation | Modify |
| S/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts | Inject direct summarizer factory for runs/team members; no builtin recursion exception | Modify |
| S/built-in-agents/built-in-agent-registry.ts; GraphQL schema/queries; asset-copy/smoke scripts | Stop registering/syncing compactor; remove algorithm endpoints and obsolete assets | Modify/removals listed above |
| Web components/settings/CompactionConfigCard.vue; stores/serverSettings.ts; graphql/queries/server_settings_queries.ts; localization/messages/{en,zh-CN}/settings.ts | Remove strategy control/read gating, add direct model/inherit selection and generation-config reuse; retain other controls | Modify |
| autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts and tests/agent-presentation-contracts.test.mjs | Current strict COMPACTION_STATUS contract and schema tests; remove obsolete live fields and add direct-summary diagnostics | Modify with all producers/consumers; rebuild shared package |
| S/services/agent-streaming/team-agent-event-websocket-projector.ts; S/agent-collaboration/execution/events/{agent-presentation-event,agent-presentation-message-projector,collaboration-agent-presentation-adapter}.ts; S/agent-team-execution/domain/team-agent-event.ts | Current event-to-presentation mapping | Modify with strict DTO, not independently |
| Web services/agentStreaming/{teamStreamDtoAdapters,handlers/compactionActivityProjection}.ts and related status handlers/types/components | Present current direct-summary status; no child-flow expectation | Modify; preserve optional historical display fields actually consumed |
| S/run-history/projection/{historical-replay-event-types,run-projection-types,event-monitor-active-trace-page-projection,transformers/raw-trace-to-historical-replay-events}.ts and related Event Monitor API/web presentation | Independent existing historical metadata reader | Preserve historical meaning/read path; audit shared type seams, not blanket-delete fact fields |
| test-support/live-e2e/live-e2e-harness.ts and compaction scenario/result fixtures/callers | Realistic long-run/constraint-retention validation | Replace child-run/JSON-repair assertions with one direct-call/summary continuation assertions; retain useful evidence and Unicode fixtures |
| Tests/docs/export files | Match the single implemented path and approved prompt; delete removed-API tests | Modify/remove; exact validation guidance below |

## Applied Patterns

Factory callback at server construction; provider adapters at existing LLM boundary; existing state gate for attempts; existing storage ownership. No compaction registry, generic workflow engine, new repository facade or memory plug-in framework.

## Target Subsystem / Folder / File Mapping

Use existing `memory/compaction`, `memory/store`, `memory/restore`, `llm/api`, server `agent-execution/compaction`, `config` and existing web settings folders; remove the obsolete compaction-specific `startup` module. The final table provides exact file paths; removal table is equally normative. The approved prompt is embedded in a TS constant so package build does not need a new Markdown-copy pipeline. Keep core exports and server asset smoke checks consistent; no dead imports or alias exports.

## Folder Boundary Check

| Folder | Structural depth / check |
| --- | --- |
| Core memory/compaction | Domain transformation/control with focused policy files; no raw provider clients or category stores |
| Core memory/store and restore | Persistence and lifecycle respectively; existing separation retained |
| Core llm/api | Provider boundary; completion mapping stays here |
| Server agent-execution/compaction | Construction only; not child-runtime management |
| Server config | Current-setting codec/defaults only; no historical translation or new startup owner |
| Web settings | Presentation and existing setting interaction; no migration or summary parsing |

No new one-folder-per-step decomposition. Existing layout is readable once obsolete strategy/category/agent modules are removed.

## Concrete Examples / Shape Guidance

- Repeated pass: `[summary A, messages 101–160, recent 161–180]` -> summarize `A + 101–160` once -> `[summary B, recent 161–180]`. Numbers illustrate selection, not a new fixed window rule.
- Response `Here is the summary\n<compaction_summary>...six headings...</compaction_summary>\nDone` -> store only the inner body. Two blocks or known incomplete status -> failure; do not pick the first valid-looking answer.
- Old saved `## Episodic memory ... ## Semantic memory ...` remains ordinary snapshot text on resume. New compaction later updates it through the same direct summarizer; no old parser, re-render or version branch.
- After archive copy but before snapshot rename: resume old snapshot; active records still present. After rename but before pruning: resume new snapshot; duplicate raw evidence is harmless and cleanup is local.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Add markdown strategy alongside structured-json | Rejected | Remove algorithm registry/path and shared categorized result |
| Accept old six-array JSON as fallback | Rejected | One tagged Markdown contract; existing user retry on invalid output |
| Keep child agent only for exceptional models/repair | Rejected | Existing direct adapters, known/unknown completion handling, normal failure |
| Runtime reads old builtin config if new setting absent | Rejected | Use current parent/model defaults without reading legacy data |
| Preserve retired model choice through startup copy or a newly registered migration | Rejected by explicit SR-017 decision | Leave old files inert; current settings begin at defaults unless explicitly set |
| New snapshot version plus bulk summary conversion | Rejected as unnecessary | Same v5 text/provenance reader, category-independent validation |
| Separate summary file plus snapshot copy | Rejected | Existing snapshot is single continuation authority |
| Delete old records to prove simplification | Rejected | Stop new category processing; retain independent historical data |

## Derived Layering

N/A — the ownership and production paths above explain the change without another layer taxonomy.

## Change / Refactor Sequence

1. Pin approved prompt in core runtime module and fixtures. Define tight direct summary/result/metadata/config contracts. Add provider nonstreaming completion metadata with isolated adapter tests; do not alter parent output parsing/streaming semantics.
2. Implement direct summarizer, controlled configuration, accurate input preflight, tagged output validation, cancellation and cleanup. Replace executor strategy resolution with direct planning/invocation.
3. Simplify accepted builder/coordinator; remove category/lineage dependencies. Implement staged raw copy and atomic-snapshot commit, preallocated install, postcommit cleanup/status isolation; implement category-independent restore.
4. Remove the earlier startup model-settings importer and its call/tests. Keep direct server construction with absence defaults and optional current settings/UI controls. Verify no old-config access/default-persist step on startup or attempt. Do not migrate run histories. Validate node binding/load/error/save semantics without a strategy catalogue.
5. Delete all replaced modules, exports, GraphQL strategy queries, builtin package and stale live-status fields together. Rebuild shared presentation contracts and update server/web adapters atomically. Keep history readers/data, including historical Event Monitor metadata. Update tests/docs/build smoke wiring. Intermediate compile seams may exist during implementation but no dual runtime remains in the completed package.
6. Validate the complete single path before handoff. Delivery performs coordinated shared-contract/server/core/web integration and release. Stop old processes before activating new ones; do not deploy old server with new web or vice versa. Old code rollback after new compactions is not guaranteed because old lineage gates reject new snapshots; keep a release rollback/data backup plan rather than a runtime fallback.

## Key Tradeoffs

A single marked Markdown payload is much smaller operationally than six-array generation/storage/projection, but cannot guarantee factual completeness. Keeping context planner/validator/store ownership preserves necessary safety without keeping obsolete categories. The same v5 serialization avoids history migration; it does not justify unsafe write ordering. SR-017 deliberately drops old compactor preference carry-forward, eliminating the settings migration and all agent-definition dependence; current model controls remain optional. RPA unknown status preserves provider coverage without pretending its API exposes information it does not.

## Risks

- Semantic loss remains possible despite tags/headings; compare first/repeated summaries on representative histories. No quality superiority claim from source inspection.
- Token counts are estimates; provider limits/unknown completion differ. Do not retry with silent truncation or another algorithm. Surface failure with model/budget diagnostics.
- Input expansion after removing blanket clipping may reveal undersized compactor models; fail explicitly before dispatch rather than lose constraints. Users retain model choice.
- Staged archive copies may temporarily duplicate data. Cleanup is guarded by actual committed-snapshot provenance; storage leak is preferable to deleting required evidence after a failed commit.
- Power-loss/fsync behavior and concurrent old/new writers are not redesigned. Existing per-file atomic replacement is the stated guarantee.
- External deep-import consumers may break. Audit known workspace callers, document removed APIs and use independent review; no compatibility facade.
- External old file-backed redesign must not be merged into this implementation. Independent reviewer receives this approved basis, not stale review artifacts.

## Guidance For Implementation

Implement only this approved scope. Do not perform new live-model calls against user histories without an appropriate controlled test setup. Use synthetic/consented fixtures and preserve provenance of expected facts.

| Validation | Required observations / approved IDs |
| --- | --- |
| Prompt/parser unit | Exact approved literal; one block/six sections; exterior prose ignored; absent/empty/multiple/nested/incomplete marker rejected; content never taken from reasoning. AC-011 |
| One-call lifecycle | Current-parent inheritance versus explicit override across attempts; fresh LLM, no child AgentRun/tools/category parser; one logical call; provider request cannot override system/tools/cap; signal abort and cleanup paths. AC-006 |
| Provider adapter units | complete/incomplete/unknown mappings for each family including closing-tag+length result rejected; RPA unknown explicit; no assumption of RPA output cap/stop metadata. AC-005 |
| Input rendering/capacity | Long user/prior summary middle constraints survive; tool excerpts labeled; actual rendered input+reserved output fits selected compactor model or fails pre-call. AC-004/007 |
| First/repeated compaction integration | One summary, unchanged required head/recent/tool groups (except existing native thinking cleanup), previous constraints/corrections preserved; final budget; no new category/lineage files. AC-001–004/007 |
| Commit fault injection | Failure during archive prepare or snapshot write leaves old snapshot+active; completed archive reused; abort before commit blocks mutation; after commit pruning/reporter failure cannot trigger semantic retry or claim rollback; retained evidence never pruned. AC-005 |
| Resume/history integration | Supported old combined-summary v5 with old files; same snapshot with no category/lineage files; new Markdown snapshot; all use same reader without generation. Reject unsupported schema/identity/protocol errors appropriately. Historical category and raw views remain. AC-008/009 |
| Settings/default/API/startup | Absent current key needs no Save/setup/write and uses each attempt's actual parent model/provider; old valid/custom/malformed config never read or imported and stays byte-unchanged; startup does not invoke converter; explicit current model/config saving survives restart; unavailable selection errors without fallback. No fresh compactor credentials required for inherited model. AC-010/012 |
| Settings/status UI | No strategy catalogue blocking controls; inherited/model selection and config, threshold/override/debug, current node binding, loading/errors/saves; progress/failure display has no child-run/fact links. AC-010 |
| Source/build audit | Removed symbols have no production imports/exports; server/core build and builtin assets smoke pass; native run and team-member construction use same direct path; independent inspection still works |
| Model quality | Report separately from deterministic plumbing. On controlled histories evaluate first/repeated critical constraints, latest requests, approvals, exact references, honest completion, enough detail and compression size. No claims of guaranteed semantic completeness |

Use repository Vitest non-watch commands and web tests with `--run`; record exact commands/results. Original SR-013 evidence was six design probes plus earlier research. Later implementation/source/API reports and SR-016 rebase checks retain their scoped historical results; SR-017 no-import delta has source investigation but no new executable acceptance. Architecture Reviewer independently reviews this High-risk package; subsequent routing is determined by tools, not this document.
