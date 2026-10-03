# Design Spec — Antigravity Future Tool Argument Capture

## Solution And Approval Basis
- Package: `antigravity-tool-argument-visibility`; solution revision: SR-003.
- Design status: **Ready — Architecture Design Complete; independent review required by risk classification**.
- Approved basis: SR-001 requirements REQ-001–004 / AC-001–006 / SCN-001–004, approval captured at SR-002 as USER-APPROVAL-2026-10-03-FUTURE-ONLY. User explicitly leaves previous calls unchanged and approves fixing future calls if feasible. Full typed input and ACTIVE-timing probes establish feasibility; no intended-behavior change in this design.
- Canonical requirements, investigation and history are sibling `requirements-doc.md`, `investigation-notes.md` and `solution-revision-record.md` under `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/`.
- Behavior-defining supplements: None. Product UI/UX package: N/A — not requested.
- Worktree/branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility`, `codex/antigravity-tool-argument-visibility`; refreshed base origin/personal @ 98d8fb36a632ce0f46136cda20129d1fe1ee0ac8; finalization target origin/personal.

## Current-State Read
The supported AGY backend binds one exact provider conversation at launch/restore. Its ordered event queue sends each native tool step through a synchronous converter. Native `tool_info.parameters` is a display summary, not actual full input. The first canonical tool-start observation is persisted; later terminal payloads do not replace those saved arguments. Live and historical Activity read that same structured input object. Current UI JSON formatting is not the source of loss.

AGY already writes typed actual input in `.system_generated/logs/transcript_full.jsonl`. Evidence shows one DONE PLANNER_RESPONSE immediately preceding each observed native tool step, with one matching tool call. The full input is available at ACTIVE in the timing probe. Read-only image/background evidence access already belongs to this provider adapter. See investigation F-001–F-007 and the SR-003 architecture evidence section. No native argument recovery owner exists today.

## Task Size And Architectural Risk
- `task_size: Medium`: one provider integration, approximately four production files plus focused unit/E2E fixture/test/documentation work. No frontend redesign, shared recorder change, API schema or migration.
- `architectural_risk: High`: new dependence on an undocumented provider input-record/correlation contract, including lossy command summaries; pre-publication asynchronous filesystem work must preserve cancellation and ordered first-observation semantics. Incorrect association would present the wrong content, and a late-only solution would silently fail saved parity. These are material provider-contract and lifecycle risks despite bounded implementation scope.
- Content inventory (684 original calls / several evidence JSON files) is **not** the reason for size/risk. Actual structural delta is the AGY evidence-read/pre-conversion path.
- Escalation: any required shared recorder/schema/API change, old-history rewrite, new tool/result policy, cross-runtime effect, or broader source/association mechanism returns Design Impact or Requirement Gap to Solution Designer. Do not silently enlarge the route.

## Architecture Investigation Evidence
| Evidence | Observation | Decision supported | Remaining boundary |
| --- | --- | --- | --- |
| Canonical investigation F-001–005; native-probe/stdout.jsonl and transcript_full.jsonl | Stream summaries omit real inputs; full transcript retains typed values. | Resolve from one typed source before first event, not renderer heuristics. | Internal format, not a public release guarantee. |
| native-probe/timing-evidence.json | Full replacement input readable at ACTIVE. | Pre-publication capture is feasible. | Delayed/malformed data falls back; no endless wait. |
| evidence/architecture-correlation-evidence.json; F-007 | 681 later native calls: 667 exact summary agreements, 14 commands truncated to prefix plus Unicode ellipsis; all have one preceding same-name call. | Exact structural association plus corroborated summary matching; do not reject verified longer command inputs solely for display truncation. | Ambiguous/multi-call/changed records unresolved. |
| agy-agent-run-backend.ts; runtime-tool-trace-sequencer.ts | Ordered async queue; cancellation immediate; first arguments persist once. | Backend coordinates optional async lookup; converter freezes first native arguments; post-await cancellation check. | Must be proven by downstream executable tests. |
| agy-brain-file.ts; native image E2E test | Existing read guard and test-owned HOME pattern. | Extend provider-file boundary and isolated fixtures, not raw fs access in UI/history. | Preserve whole-file reader limits/behavior for existing consumers. |
| Runtime docs on withheld steps; chunks inventory | Steps can be delivered late; numbered chunks are split byte data, not per-step input files. | Bounded-memory async reverse scan of the full file, not fixed-tail-only lookup or guessed chunk filename. | No guarantee that arbitrary future layouts remain supported. |
| Generic raw trace writer/normalizer; migration guideline §§1–3 | Current Record input shape already accepts full objects and partial summaries. | No historical transformation or admission gate. | Existing old calls intentionally stay incomplete. |

## Intended Change
Capture full verified native input once at the first newly observed native step, before emitting TOOL_EXECUTION_STARTED. Carry that same input through terminal/background-close events and ordinary persistence/history. If evidence cannot be resolved safely, freeze the available stream summary instead. This is one current capture policy with an approved unavailable-detail outcome, not parallel old/new runtime modes.

## Relevant Behavior And Production-Path Map
| Behavior | Approved intent / ACs | Supported trigger | Existing evidence | Target path / lifecycle |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001,004; AC-001,002 | User asks configured Agent to edit/write; inspects Activity. | Actual creator run + native probes. | DS-001/002: native step → backend lookup → converter first snapshot → ordinary recorder/publisher → Activity. |
| BEH-002 | REQ-001,004; AC-003,006 | Configured read/search/command/native call occurs. | Actual omissions and lossy commands. | Same DS-001/002, preserving native names and typed fields; MCP bypasses enrichment; native image results unchanged. |
| BEH-003 | REQ-002,004; AC-004 | User reopens a run containing future newly recorded calls, including new calls after resume. | Shared sequencer and history projection. | DS-003: first enriched trace → normal history projection → reopened Activity; never reread provider files for old cards. |
| BEH-004 | REQ-003,004; AC-005,006 | Optional detail cannot be safely resolved, or user stops while lookup is pending. | Existing guarded evidence convention and backend cancellation. | DS-004: resolve or decline → stable summary/full choice; cancellation → existing interruption, with no stale publication. |

## Relevant Supplemental Task Artifacts
All canonical evidence supplements remain listed with absolute paths in investigation notes. This design uses production-coverage.json and production-selected-calls.json (actual problem), native-comparison.json, native-probe/launch.json, stdout.jsonl, transcript_full.jsonl, transcript.jsonl, summary.json, timing-evidence.json (source/timing/encoding), and architecture-correlation-evidence.json (association/truncation/size). Probe/analyze scripts make the observations reproducible. They are factual evidence, not production code or normative supplements; approval applicability N/A. No independent review exists yet; architecture review Pending, code/API-E2E/delivery artifacts N/A — not applicable at design phase.

## Task Design Health Assessment
- Posture: Bug Fix / input-observability behavior improvement.
- Current design issue: Yes, **Missing Invariant** at provider normalization: display summaries are treated as complete tool input.
- Broad refactor needed now: **No**. Existing backend owns lifecycle, converter owns canonical translation, brain-file boundary owns guarded reads and recorder/history already carry arbitrary typed inputs. These ownership boundaries remain coherent.
- Response: add one native-input reader, add guarded asynchronous JSONL scan support within the existing provider-file concern, and a pre-conversion seam with first-observation snapshot reuse. Do not load files in the pure converter or teach history/renderer provider formats.
- No deferred structural refactor required. Residual risk is undocumented provider format and its availability, handled by strict recognition/fallback and independent review.

## Terminology / Design Reading Order
- **Native input**: typed `tool_calls[0].args` actually supplied by the provider planner, not inferred file contents.
- **Summary**: provider stream parameters, possibly missing fields or a shortened command.
- **Lookup identity**: exact bound conversation ID + native tool step index + native tool name; summary corroborates, never selects by path alone.
Read current state/behavior map, then spines/ownership, lookup/cancellation policy, file mapping and validation guidance. No new product concepts.

## Legacy Removal Policy
No backward-compatibility wrappers, version profiles or legacy runtime readers. Replace unconditional native-summary-as-full-input assignment with the single pre-publication capture policy. The approved missing-detail summary outcome is operational fallback, not CLI-version compatibility. Do not remove valid MCP/image paths or the generic ability to read old summary objects.

## Persisted Data / State Transition Decision
- Subject: raw tool_call.tool_args in existing memory JSONL and projected history; original snapshot 1,409 rows / 684 total calls, later provider full source approximately 3 MiB. Representative summary-only and full typed objects are captured in evidence.
- Change: richer contents inside the **same Record-valued input field**, not new required fields, new meaning for trace identity, or a physical-store/schema change.
- Writer/reader proof: ExternalRuntimeMemoryWriter forwards toolArgs, RawTraceItem serializes it as tool_args, normalizer accepts an object and history projects it; no exact parameter-key/version branch is imposed. Existing summaries retain truthful partial-input meaning and remain readable.
- Decision: **Directly Usable — No Migration**. Existing data is not reset, backfilled or repaired. Future tool traces may contain more fields while old traces remain identical.
- Migration guideline consulted: autobyteus-server-ts/docs/design/data_migration_guideline.md. No transformation or admission change; predecessor source dispositions/migration steps, journals, rollback and startup gates: N/A — none required. This intentionally avoids whole-history audits and user lockout.
- Constraints protected: REQ-002–004 / AC-004–006. No additional retention/privacy/rebuild policy introduced.

## Data-Flow Spine Inventory
| Spine | Scope | Behaviors | Start → end | Governing owner | Purpose |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001,002 | Agent request → visible native call inputs | Existing AgentRun / AGY backend boundary | Supported future native edit/read/search/command workflow. |
| DS-002 | Return-Event | BEH-001,002,004 | Native stdout → canonical recorded/published events → Activity | AGY backend + converter, then existing event pipeline | First-event truth and unchanged status/result path. |
| DS-003 | Primary End-to-End | BEH-003 | Reopen saved run → history projection → Activity arguments | Existing run-history service | Saved parity without native-source recovery or old rewrite. |
| DS-004 | Bounded Local | BEH-004 | Lookup request → safe source match/decline → same-turn conversion | AGY backend and native argument reader | Guarded asynchronous evidence read and cancellation. |

## Primary Execution And Return/Event Spines
- DS-001: User Agent request → AgentRun input dispatch → AGY backend/capsule → AGY planner/native tool execution → provider step publication → AutoByteus Activity inspection.
- DS-002: AgyStreamProcess parsed step → AgyAgentRunBackend ordered queue/pre-conversion lookup → AgyStreamEventConverter canonical start/terminal → existing event processors + runtime memory recorder → existing WebSocket publisher → tool lifecycle/Activity JSON presentation.
- DS-003: User reopens run → run-history read service → raw trace normalization/tool interaction builder → historical replay/Activity projection → existing web hydration → JSON arguments.

## Spine Narratives / Main-Line Nodes / Ownership Map
DS-001 execution is unchanged; only its returned native input evidence improves. DS-002 backend coordinates lookup before conversion, while the converter remains the sole authority for canonical first/terminal sequencing. The ordinary pipeline persists and publishes exactly that object. DS-003 does not know Antigravity transcript formats: it reads the captured canonical input. DS-004 is an internal evidence scan attached to the backend, not another recorder/event bus.

Main-line ownership: AgentRun owns run/input lifecycle; AGY backend owns exact provider binding, ordered queue and read cancellation; converter owns native first-call argument choice and canonical identities/statuses; recorder owns durable trace sequence; existing publication/history/UI owners remain unchanged. AgyStreamProcess is the thin transport/parser, not an input-recovery or persistence owner.

## Bounded Local Spine / Off-Spine Concerns
DS-004: first native step request → async guarded reverse JSONL scan → recognized adjacent planner input or null → same-turn/cancel check → canonical conversion. The native reader owns source recognition and matching, not turn state.

| Concern | Serves | Responsibility / reason | Must not become |
| --- | --- | --- | --- |
| Native input reader | AGY backend/converter; DS-004 | Resolve exact native input from current bound source or decline safely. | Second event history or tool executor. |
| Guarded brain JSONL scan | Native input reader | Safe regular-file access, bounded chunk/row framing and abort. | Provider-specific planner matcher. |
| Existing image reader/background monitor | Existing converter/backend | Their existing output/task concerns, unchanged. | Generic native input recovery owner. |
| Existing memory writer and renderer | Canonical events | Store/show objects already resolved by provider owner. | Provider filesystem consumers. |

## Lookup And First-Observation Policy (Implementation-Defining)
1. A first native `step_update` with tool state ACTIVE/DONE/ERROR is eligible. MCP provider name `call_mcp_tool` is never eligible, even if projected name is generate_image. Ignore repeated/already-terminal steps for detail lookup. Converter exposes a narrow `getPendingNativeToolArgumentLookup(message)` query of its own turn/start state; malformed/conflicting messages retain existing protocol-error handling and cannot trigger an unrelated-file read.
2. Backend binds the reader to its validated conversation UUID. Lookup includes safe integer nonnegative stepIndex, original native toolName and the current structured summary object. No target-path search, latest same-name tool search or cross-conversation enumeration.
3. Read only `.system_generated/logs/transcript_full.jsonl` under that exact conversation. Resolve containment; reject an unsafe conversation/file path or non-regular file, open without following the final symlink and close in all outcomes. Preserve existing whole-file read semantics for other consumers.
4. Use asynchronous reverse JSONL scanning from a file-descriptor snapshot of the current file, **64 KiB chunks and a 2 MiB maximum complete row**. Never Buffer/readFile the whole transcript synchronously. Total search is bounded by the opened file's snapshot size, memory by chunk/row limits. A requested earlier withheld step remains searchable beyond the latest window. Stop at the relevant ordinal range/BOF or abort; no global history scan, polling watcher, new background task or timer waiting for details. Invalid partial/oversized/unsafe evidence yields null rather than failing the turn.
5. Discard an incomplete trailing record; frame complete lines correctly across UTF-8/chunk boundaries and CRLF. Recognize current records by structure, not CLI release/version. Follow the observed ordered step-index range; malformed relevant records or inconsistent index ordering/duplicates at the candidate range are unresolved rather than heuristic matches. Check the candidate and its neighboring ordinal boundary enough to reject a duplicate candidate before accepting it.
6. Exactly one DONE PLANNER_RESPONSE at `stepIndex - 1`, from MODEL, with exactly one tool call of the same native name and object args is the supported current shape. Multi-call, absent, duplicate, mismatched, future or ambiguous shapes return null. This is strict recognition of the evidenced internal layout, not a claimed public universal correlation guarantee.
7. Corroborate every summary field with the actual input by own key and deep typed value agreement. The one evidenced lossy exception is run_command.CommandLine: a nonempty literal prefix followed by Unicode ellipsis may corroborate a strictly longer actual CommandLine beginning with exactly that prefix. Do not generate the missing suffix; take the full string only from the matched typed record. No generic fuzzy matching, path normalization, trimming/coercion or standard-log per-value reparsing. Other discrepancies are unresolved.
8. Converter accepts the resolved object (or null) as an optional input to its existing synchronous convert boundary. On first native observation, select the full verified object or current summary and retain it in the existing open-tool snapshot before emitting STARTED. Terminal and background close reuse that same argument snapshot. Do not enrich only terminal events, re-read terminal inputs, mutate previously persisted traces or create a duplicate arguments registry.
9. Missing/malformed/unsafe/out-of-budget source, source replacement/truncation preventing a consistent scan, thrown reader error or unrecognized shape returns null. Keep actual available summary inputs with unchanged provider result/status semantics. A fallback is not recorded as a full-input verification pass.

## Cancellation And Lifecycle Policy
Backend starts one abortable lookup only for an eligible first native step while its current turn remains live. Capture that exact turn identity before awaiting. User Stop/Terminate, process close and runtime shutdown abort the pending source read through an AbortController owned by the existing backend. Always close the descriptor; clear lookup handle in finally. After await, recheck same turn, cancellation and process liveness before conversion/publication. A canceled read emits no stale success/start; existing interrupt/close events retain their existing queue order. Resolve faults to null locally, not to backend-wide process failure. No change to AGY idle/startup clocks or provider tool execution.

## Ownership Boundaries / Encapsulation / Dependency Rules
- AgentRun callers use AgyAgentRunBackend, never its evidence reader/converter directly.
- Backend coordinates its converter query and optional async evidence read; these are internal provider mechanisms, not public competing owners.
- Native reader uses the brain-file boundary; no direct filesystem access in converter, UI, recorder, history or other runtimes.
- Brain scanner owns only IO/line framing/abort; native reader owns JSON/ordinal/tool/input recognition. No AGY planner shapes in generic memory/domain code.
- Do not alter source messages in place or renormalize native arguments to lowercase legacy tool fields. Keep MCP projection and native-image result selection where they already live.
- No new shared event DTO, GraphQL/WebSocket field, persistence schema, factory policy or tool allowlist change.

## Interface Boundary Mapping / Check
| Internal interface | Subject / responsibility | Identity / result | Check |
| --- | --- | --- | --- |
| Converter.getPendingNativeToolArgumentLookup(message) | Whether this provider step needs first-input capture. | Validated native step index/name/summary for its current bound turn, or null. | Singular; Low selector ambiguity. |
| readAgyNativeToolArguments(conversationId, lookup, {signal, brainRoot?}) | Match actual input for one bound native step. | Explicit conversation + step + native name; Promise<Record or null>. brainRoot override test-only injection, not a new product setting. | Singular; compound identity. |
| Provider-file reverse scan | Safe bounded complete-line visitation for one opened file snapshot. | Path confined by native reader, chunk/row bounds, AbortSignal; closed descriptor in all outcomes. | Concrete IO seam; no tool identity guesses. |
| Converter.convert(message, nativeArgumentsOrNull) | Canonical sequence/first argument snapshot. | Existing source message and optional verified input; existing AgentRunEvent[] return. | Remains synchronous; existing callers/tests need no asynchronous conversion migration. |

Exact low-level scanner function name/signature may be tightened during implementation within the above responsibility and abort/bounds contract; no broad reusable filesystem framework is required. Request/resolution types belong to the native reader and are imported type-only by the converter/backend.

## Removal / Decommission Plan And Compatibility Rejection
| Candidate | Disposition / replacement |
| --- | --- |
| Unconditional native summary assignment | Replace with first verified-input selection/snapshot. The summary outcome remains only for approved unresolved evidence. |
| Terminal-only enrichment/recorder rewrites | Rejected: first persisted input would remain incomplete; pre-publication capture suffices. |
| CLI-version branches, standard-transcript per-value decoder or guessed chunk filename | Rejected: no stable typed source identity or safe uniform encoding. One structurally recognized full source. |
| Native-source history/backfill path | Rejected: user explicitly leaves past calls as-is. Normal generic current readers suffice. |
| New recorder/archive/side-channel UI input fetch | Rejected: duplicate authority; existing canonical event and history paths are reused. |
| Existing MCP, image, background-task and generic history paths | Preserve; not obsolete within this scope. |

## Naming / Existing Capability Reuse / Subsystem Allocation
| Concern | Owner / decision | Naming and reuse rationale |
| --- | --- | --- |
| Provider input evidence | Existing AGY runtime; Extend | `agy-native-tool-arguments-reader` describes one concrete concern. Not a generic ToolHistoryManager. |
| Guarded provider IO | Existing agy-brain-file; Extend | Existing authoritative brain read concern, with async line-scan support; no new global filesystem subsystem. |
| First-call translation | Existing stream converter; Extend | Reuse openTools first snapshot, not overlapping state. |
| Lifecycle/cancellation | Existing backend; Extend | Reuse ordered eventQueue and turn cancellation; no second loop owner. |
| Canonical recording/projection/UI | Reuse unchanged | Existing Record inputs already accept the actual data. |

## Draft → Reusable Structures → Final File Responsibility / Folder Mapping
Draft placed source access with the backend; tighten it into one dedicated native-reader file so lifecycle orchestration does not grow format logic. Reuse the existing brain-file guard and converter openTools state. The only shared new shape is an explicit native lookup request imported type-only; no kitchen-sink ToolEvent/history DTO or overlapping full/partial input store.

All production paths below are under `autobyteus-server-ts/src/agent-execution/backends/antigravity/`:
| Path / action | Concrete responsibility | Boundary / placement | Must not contain |
| --- | --- | --- | --- |
| stream/agy-native-tool-arguments-reader.ts — Add | Recognize typed full planner input for one native lookup, with summary corroboration and null outcome. | Provider evidence adapter, next to existing image/task readers. | Canonical event sequencing, tool execution or old-history persistence. |
| stream/agy-brain-file.ts — Modify | Guarded asynchronous bounded reverse line scan/descriptor lifecycle; preserve existing exports' behavior. | Provider-file boundary; shared low-level safety policy. | Planner/MCP/turn semantics or alternate source-layout compatibility. |
| stream/agy-stream-event-converter.ts — Modify | Eligible lookup query, optional resolved input and first native snapshot reuse. | Canonical producer; stays synchronous/pure with respect to IO. | Filesystem reads or shared recorder mutation. |
| backend/agy-agent-run-backend.ts — Modify | Bind exact conversation, await evidence before conversion, abort/read cleanup and post-await turn check. | Existing ordered provider lifecycle owner. | Transcript parsing or redefined status/output conventions. |
| tests/unit/agent-execution/backends/antigravity/agy-native-tool-arguments-reader.test.ts — Add | Typed input, association/truncation/bounds/fallback fixtures using disposable roots. | Provider evidence tests. | Real-home file mutation. |
| Existing converter/turn-lifecycle unit tests — Extend | First-event/terminal identity and argument snapshots; MCP/image/interrupt regressions. | Existing producer/lifecycle tests. | New product contracts. |
| tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts — Add; tests/fixtures/agy-failure-cli.mjs — Extend | Real server capture/persistence/reopen with summary stream and test-owned typed transcript; restored future calls/old trace preservation. | Existing AGY fake-CLI harness and test-owned HOME. | Changes to nonselected fake scenarios or real credentials. |
| docs/modules/antigravity_cli_runtime.md — Update during implementation/delivery | Explain native input capture, strict source/fallback and future-only effect. | Existing runtime documentation. | Claims of guaranteed future provider compatibility. |

Folder boundary: retain current backend/stream split, with a compact reader near existing guarded evidence readers. No source moves or new nested subsystem required for these four files. The file guard remains shared by image/background/native input readers; no native planner shape is promoted into cross-runtime common code.

## Applied Patterns / Derived Layering
Existing provider Adapter + ordered queue + nullable evidence resolution. IO/shape/sequence responsibilities are separate but stay inside one provider boundary. No additional factory/registry/service locator or global watcher/cache.

## Concrete Examples
Good: `(conversation C, native step 6, replace_file_content)` → one typed planner at step 5 with matching TargetFile → exact TargetContent/ReplacementContent/range/options → STARTED and terminal share those inputs → same saved arguments.
Bad: search latest replacement to the same path, attach a diff/result as an input, recover only on DONE, or read the current edited file to guess original content.
Long command: summary `prefix…` + independently matched longer actual CommandLine → display/store the actual command; never concatenate an invented tail.

## Change / Refactor Sequence
1. Implement/verify the guarded async reverse-line primitive and dedicated reader with disposable file tests; preserve existing image/task access semantics.
2. Add converter request/first-snapshot seam and tests without any IO inside converter.
3. Wire backend lookup/cancellation; test pending Stop/process-close and event ordering before running provider/system checks.
4. Extend isolated fake-CLI server E2E to assert canonical full STARTED/terminal input, raw saved object and reopened parity, while old traces remain unchanged.
5. Run an independent real-native future-call probe through the implemented AutoByteus backend using disposable workspace/session; compare provider actual input to canonical and saved input. Earlier direct CLI evidence is not proof that the new code works.
6. Verify existing rendered Activity presents these native objects and regression checks retain MCP/image/background/error behavior. Sync runtime documentation. No migration, old-history repair or release policy change.

## Key Tradeoffs / Risks
- Internal typed source enables a real fix today without changing provider execution, but source availability/structure cannot be guaranteed across AGY changes. Decline unsafe/unrecognized details instead of failing normal work or presenting guessed inputs.
- Async bounded scanning avoids whole-file sync stalls and fixed-tail loss on withheld events, but introduces a read-await lifecycle seam; independent review and abort/order tests are essential.
- Single-call ordinal recognition intentionally does not add a speculative parallel-plan matching engine. Ambiguous records remain summaries. This is the approved non-guarantee, not silent fabrication.
- 2 MiB row bound is a technical read-safety limit, aligned with existing native stream-line budgeting and far above observed largest 22,772-byte row. Oversized row data is unresolved, not silently truncated full input. There is no new product input-size SLA.
- No historical repair means past cards remain incomplete as explicitly requested. Enriched future calls increase ordinary argument bytes in history; no extra archive or duplicated source history is created.

## Guidance For Implementation And Verification
Trace every change to REQ/AC IDs; preserve IDs and current approval. Do not implement result/diff recovery, CLI tool expansion, global source discovery or shared recorder migration. If association/lifecycle evidence cannot support this design, return Design Impact rather than claiming all fields recovered.

Implementation-scoped checks: reader fixtures for typed false/zero/empty/multiline/arrays, repeated same-path edits with distinct steps, wrong conversation/name/index, duplicate/multi-call plans, malformed/partial/oversized rows, lossy command prefix, unsafe paths and aborted scan; first-observation-only resolution, DONE-only first observation, identical terminal/background arguments and thrown reader safe fallback.

API/E2E owner: use real server WebSocket/history paths with test-owned HOME and fixtures, verify saved inputs survive after optional native evidence disappears, test resumed future calls without old-trace mutation, then real native capture and one rendered Activity inspection. Failure/unavailable detail is a truthful fallback result, not a completeness pass. Preserve selected MCP open_tab projection, native image result, background task and interruption regressions. Existing tests that accept only TargetFile are insufficient to validate this fix.

Delivery owns integrated verification, docs sync, explicit user verification and repository/release/cleanup gates. This document completes design only; no implementation, executable validation or delivery success is claimed.
