# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/requirements-doc.md`.
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/investigation-notes.md`.
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/solution-revision-record.md`.
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/design-spec.md`.
- Supplemental Task Artifacts Reviewed: all 13 factual supplements indexed below, including the SR-003 correlation evidence. Diagnostic capsule/workspace/log files are contextual, not normative or forwarding prerequisites. `investigation-result.md` is the historical SR-001 approval hold; `solution-handoff.md` is the current cumulative handoff.
- Relevant Solution Revision IDs: SR-001 (behavior baseline), SR-002 (approval), SR-003 (reviewed design).
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: ARCH-REV-001.
- Current Review Round: 1; date: 2026-10-03.
- Trigger: Solution Designer's Architecture Design Complete / Medium / High request.
- Prior Review Round Reviewed: N/A — neither canonical review artifact existed; no prior Pass inferred.
- Latest Authoritative Round: 1, this report.
- Current-State Evidence Basis: independent read of current source at worktree HEAD `98d8fb36a632ce0f46136cda20129d1fe1ee0ac8`, branch `codex/antigravity-tool-argument-visibility`; approved cumulative package; native raw and typed evidence. No production source/test modifications or implementation validation performed.

Path shorthand below: `server/` means this worktree's `autobyteus-server-ts/`; `agy/` means `server/src/agent-execution/backends/antigravity/`; `web/` means `autobyteus-web/`. Evidence root is `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/`.

Independent evidence checks (read-only, not implementation tests):
- Parsed every inventoried JSON/JSONL evidence artifact and read the three reproducibility scripts without rerunning their writes/probes.
- Rechecked eight distinct probe tool steps: each has exactly one DONE/MODEL/PLANNER_RESPONSE at index minus one, matching native name/object args and every typed summary value; all probe full-transcript ordinals are unique. Replacement/write/read/search/command omissions are upstream of AutoByteus.
- Rechecked both selected production replacements (987/1346): actual content/options are in the planner; canonical saved calls contain only TargetFile.
- Rechecked all 14 recorded long-command mismatch steps against the original conversation and saved calls, read-only: each summary is a 512-character exact prefix plus Unicode ellipsis, and each strictly longer matched native CommandLine corroborates that prefix. No command text copied into this report. Original source now has 1,456 rows with unique indexes; this later read does not replace the earlier captured snapshots or their counts.
- ACTIVE timing evidence contains the actual typed replacement input, including false and numeric ranges. The probe script reads it when ACTIVE arrives; it is not a terminal-only inference.

## Routing Classification Review

- Task size: Medium.
- Architectural risk: High.
- Classification rationale reviewed: four provider production-file changes plus focused fixtures/tests/docs; undocumented source correlation and an abortable asynchronous seam before first publication create real association/lifecycle risk. Evidence volume alone does not justify escalation.
- Independent Architecture Review required by the classification: Yes.
- Classification evidence or correction required: None. No shared schema, recorder, frontend redesign or historical transformation is included.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: Confirmed.
- Approved requirements / intended behavior understood: exact available native input fields/types/content for future newly recorded calls, with live/saved parity and trustworthy summary fallback. SR-002 records explicit future-only approval conditional on feasibility; native typed inputs and ACTIVE evidence establish that feasibility, not universal completeness.
- Relevant existing behavior and evidence confirmed: converter forwards `tool_info.parameters`; sequencer persists the first ready call and does not overwrite its arguments at terminal; history and Activity propagate that stored Record. Rendering is not the original omission.
- Scope guardrail confirmed: UC-001–004; existing argument surfaces only; no output/diff recovery, past-call repair, allowlist expansion, other-runtime change, native-file rewrite or tool replay.
- Approved change, preserved behavior, and outside scope understood: execution, identities/names, result/status conventions, MCP projection, native image output, background lifecycle and old saved traces remain governed by existing owners.
- Every prospective blocking Design Impact finding is traceable to approved authority: Yes — no blocking findings.
- Remaining material ambiguity: None for this design. Unsupported provider shapes decline detail rather than creating new matching machinery.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | Pass | Pass — Agent Package Creator file-change request; user expands Activity Arguments; selected production calls plus real probe. | Pass — DS-001/002 lookup precedes STARTED; actual supplied content/options retained, native execution untouched. | Confirmed | None |
| BEH-002 | User/System | Pass | Pass — configured native read/search/shell operations inspected through Activity; coverage/raw probe; 14 independently rechecked shortened commands. | Pass — same provider capture boundary; exact typed values with only the evidenced CommandLine corroboration exception; MCP excluded by original name. | Confirmed | None |
| BEH-003 | User | Pass | Pass — reopen saved run through history; sequencer, writer, raw normalizer and replay/activity projection source. Factory restore retains exact conversation binding. | Pass — DS-003 consumes ordinary saved inputs, including future calls after restore, without reading native transcripts on reopen or modifying old calls. | Confirmed | None |
| BEH-004 | System/Operational/User | Pass | Pass — approved optional-evidence fallback and Stop/Terminate/failure preservation; current guarded readers, backend lifecycle and REQ-003/AC-005–006. | Pass — DS-004 either resolves safely or selects summary once; immediate abort plus post-await same-turn check prevents stopped-turn publication. | Confirmed | None |

Complete relevant path confirmed: Agent request/input dispatch → bound AGY backend/capsule → provider planner/tool → ordered step queue → canonical converter → shared recorder/publication → live Activity. Saved path: normal history read → raw normalization/tool interaction → replay/projection → web hydration → Arguments. Source evidence stays inside the provider boundary; old history has no source-recovery path.

## Supplemental Artifact Coherence Verdict

All rows use the evidence-root shorthand above. Investigation notes hold the canonical absolute-path inventory, including the later SR-003 supplement; requirements and design link the evidence they use. Historical approval-pending statements are explicitly identified as original intake history and superseded by SR-002/003, not current approval authority.

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| production-coverage.json | Pass | Pass | Pass | Pass | Pass — factual captured snapshot | None |
| production-selected-calls.json | Pass | Pass | Pass | Pass | Pass — selected examples, not unique screenshot identity | None |
| native-comparison.json | Pass | Pass | Pass | Pass | Pass — actual supplied fields, not prompt wishes | None |
| analyze.py | Pass | Pass | Pass | Pass | Pass — investigation script, not product code | None |
| native-probe/probe.py | Pass | Pass | Pass | Pass | Pass — completed diagnostic reproduction | None |
| native-probe/launch.json | Pass | Pass | Pass | Pass | Pass — captured launch/version context | None |
| native-probe/stdout.jsonl | Pass | Pass | Pass | Pass | Pass — raw CLI events | None |
| native-probe/transcript_full.jsonl | Pass | Pass | Pass | Pass | Pass — actual typed source | None |
| native-probe/transcript.jsonl | Pass | Pass | Pass | Pass | Pass — contrasting serialized-value source, not selected decoder | None |
| native-probe/summary.json | Pass | Pass | Pass | Pass | Pass — SUCCESS distinguished from requested-stop exit | None |
| native-probe/timing-probe.py | Pass | Pass | Pass | Pass | Pass — timing reproduction script | None |
| native-probe/timing-evidence.json | Pass | Pass | Pass | Pass | Pass — ACTIVE/DONE snapshots, not fix validation | None |
| architecture-correlation-evidence.json | Pass | Pass | Pass | Pass | Pass — later native-only snapshot/corroboration | None |

The 684 original total calls and 681 later native calls have different snapshot times/populations; they are not a contradiction. No supplement defines additional approved behavior. Product UI/UX supplements: N/A — existing interaction retained.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for current task posture | Pass | Design explicitly identifies bug fix/input-observability improvement. | None |
| Root-cause classification explicit and evidence-backed | Pass | Missing Invariant: summary treated as full input; converter/native raw evidence, not UI filtering. | None |
| Refactor/no-refactor/deferred decision explicit | Pass | No broad refactor; narrow native reader separates recognition from lifecycle and guarded IO. | None |
| Decision supported by concrete sections | Pass | Four-file mapping, allowed dependencies, first-snapshot reuse, clean replacement and sequence align with current owners. | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end request/execution/inspection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Return/event capture, recording and publication | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Primary saved-history inspection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Bounded local lookup/read/cancel/convert | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

DS-001 and DS-003 span the supported business paths rather than only edited files. DS-004 adds the material local scan/await loop without replacing DS-002. The backend governs lifecycle, the converter canonical sequencing; transport is not misidentified as recovery owner.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Clear? | Internal Mechanisms Stay Internal? | Caller Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| AGY backend | Pass | Pass | Pass | Pass | AgentRun uses backend; converter/reader are internal provider mechanisms. |
| Native input reader / brain-file IO | Pass | Pass | Pass | Pass | Recognition uses guarded file boundary; no raw IO in converter/history/UI. |
| Canonical recording/history | Pass | Pass | Pass | Pass | Ordinary event/Record input is sole durable authority; no parallel archive or native-source fetch on reopen. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Clear? | Forbidden Shortcuts Explicit? | Direction Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend → converter/native reader → brain scan | Pass | Pass | Pass | Pass | Backend sequences; reader recognizes; brain concern frames/guards/aborts. Type-only lookup imports do not transfer IO ownership. |
| Recorder/history/web | Pass | Pass | Pass | Pass | Depend on canonical arguments only; provider filesystem access and recorder rewrites expressly forbidden. |

## Interface Boundary Verdict

| Interface / Method | Subject Clear? | Responsibility Singular? | Identity Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| getPendingNativeToolArgumentLookup(message) | Pass | Pass | Pass | Low | Pass |
| readAgyNativeToolArguments(conversationId, lookup, options) | Pass | Pass | Pass | Low | Pass |
| Guarded reverse complete-line scan | Pass | Pass | Pass | Low | Pass |
| convert(message, nativeArgumentsOrNull) | Pass | Pass | Pass | Low | Pass |

The query must preserve existing protocol-error handling, exclude original `call_mcp_tool`, and avoid IO for repeat/terminal steps. The synchronous conversion boundary is retained; low-level scanner naming may be tightened by implementation without changing responsibilities or abort/bounds contract.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Checked? | Reuse / Extension Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Exact native-input recognition | Pass | Pass | Pass | Pass | No existing native argument reader; dedicated provider reader avoids backend format logic. |
| Guarded filesystem access | Pass | Pass | N/A | Pass | Extend agy-brain-file, preserve image/task whole-file semantics. |
| Sequencing/cancellation/recording/UI | Pass | Pass | N/A | Pass | Existing queue, converter openTools, writer and projections reused. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Ownership Clear? | Reuse/Extend/New Sound? | Supports Right Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Antigravity backend/stream | Pass | Pass | Pass | Pass | All production changes stay inside the existing provider boundary. |
| Memory/history/web | Pass | Pass | Pass | Pass | No new provider knowledge or schema; existing arbitrary-input flow reused. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Evaluated? | Shared File Choice Sound? | Shared Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider-file guard/framing | Pass | Pass | Pass | Pass | Extend existing brain-file concern rather than repeat direct fs policy. |
| Native lookup request / first-call state | Pass | Pass | Pass | Pass | One explicit reader-owned request type; converter openTools snapshot reused, no duplicate registry. |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundancy Removed? | Overlap Controlled? | Core/Specialization Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Native lookup: conversation + step + original name + summary | Pass | Pass | Pass | Pass | Pass | Compound source identity; summary corroborates, never searches by target path. |
| Existing arguments Record / openTools payload | Pass | Pass | Pass | N/A | Pass | Actual JSON object or truthful summary selected once; no schema/version/completeness DTO. |

## File Responsibility Mapping Verdict

| File | Responsibility Clear? | Matches Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| agy/stream/agy-native-tool-arguments-reader.ts (Add) | Pass | Pass | Pass | Pass | Typed JSON/ordinal/single-call/name/summary recognition only. |
| agy/stream/agy-brain-file.ts (Modify) | Pass | Pass | Pass | Pass | Guarded asynchronous bounded framing/descriptor ownership; no planner rules. |
| agy/stream/agy-stream-event-converter.ts (Modify) | Pass | Pass | Pass | Pass | Eligibility and stable first snapshot/canonical events; no IO. |
| agy/backend/agy-agent-run-backend.ts (Modify) | Pass | Pass | Pass | Pass | Conversation binding, ordered lookup, abort and post-await checks; no transcript parsing. |
| Reader/converter/lifecycle units; server transport E2E/fixture | Pass | Pass | N/A | Pass | Isolated sources and canonical/saved paths; existing test-owned HOME pattern. |
| server/docs/modules/antigravity_cli_runtime.md | Pass | Pass | N/A | Pass | Current provider observation/fallback/future-only documentation. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Clear? | Folder Matches Boundary? | Mixed-Layer / Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| agy/backend and agy/stream | Pass | Pass | Low | Pass | Existing split retained; one concrete reader near image/task readers; no generic shared provider-format folder. |
| server/tests/unit/agent-execution/backends/antigravity and tests/e2e/runtime | Pass | Pass | Low | Pass | Matches existing fixture/testing boundaries. |

## Removal / Decommission Completeness Verdict

| Item | Obsolete Piece Named? | Replacement Clear? | Removal Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Unconditional native-summary-as-full-input assignment | Pass | Pass | Pass | Pass | Replace with one first-capture policy; valid unavailable-detail summary remains approved outcome. |
| Terminal-only enrichment / alternate decoders / history recovery | Pass | N/A | Pass | Pass | Rejected proposals, not existing code to delete; no accidental new machinery. |
| MCP/image/background/current history | Pass | N/A | Pass | Pass | Explicitly preserved, not obsolete. No source-file removal needed. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention? | Clean-Cut Removal Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Native capture | No | Pass | Pass | Structural recognition, not version branches. Null outcome is approved evidence fallback, not a legacy mode. |
| Stored history | No | Pass | Pass | Generic Record readers remain truthful for partial old objects; no provider-dependent historical reader/backfill. |

## Persisted-Data Transition Verdict

| Stored Subject | Approved Decision | Representative Reader/Semantic/Invariant Evidence Sufficient? | Choice Proportionate? | Migration Safety Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Existing tool_call.tool_args | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Writer forwards Record; RawTraceItem serializes tool_args; normalizer accepts object; interaction/replay/projected Activity forwards it. Same identity/status semantics, richer future contents only. |
| Native source / user workspace | Not Affected by AutoByteus writes | Pass | Pass | N/A | Pass | Optional read-only evidence; no repair, rewrite or replay. |

Representative old calls contain truthful TargetFile-only objects and remain readable. New full typed objects fit the same field and generic readers. The first-observation constraint is addressed before publication, not through a migration. No startup history audit, admission gate, journals or predecessor-schema machinery is warranted; user explicitly rejected old-call repair.

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup / Removal Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Scanner/reader → converter → backend → transport/persistence/reopen → native/rendered checks | Pass | Pass | Pass | Pass |

Reader bounds, fallback and line framing precede lifecycle wiring. No dual runtime mode or temporary storage is introduced. The implementation must retain existing image/task reader exports and run the specified preserved-boundary regressions.

## Example Adequacy Verdict

| Topic | Example Needed? | Present And Clear? | Avoided Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Call-specific edit and saved parity | Yes | Pass | Pass | Pass | Exact conversation/step/planner match; latest-same-path, result-as-input and terminal-only alternatives rejected. |
| Ellipsis corroboration | Yes | Pass | Pass | Pass | Full suffix comes solely from matched typed input, never generated from summary. |
| Reverse scan / ownership | Yes | Pass | Pass | Pass | Concrete chunk/row sizes and ordinal stopping; bounded local spine separate from business path. |

## Material Premise Validation (Only When Needed)

No finding relies on a reviewer-invented failure scenario. Two material lifecycle details supporting the proposed mechanisms are recorded explicitly.

### MP-001 — Newly emitted native step may lie beyond a fixed transcript tail

- Related approved authority: REQ-001–003; AC-003–005.
- Relevant behavior IDs: BEH-002–004.
- Initiating basis kind: User / Contract.
- Independent initiating trigger/contract: user requests supported Agent work involving a configured background `run_command` and subsequent tool work; the existing Antigravity runtime contract states later step updates can be withheld until that command/result boundary. This contract predates the proposed scanner.
- Support evidence: `server/docs/modules/antigravity_cli_runtime.md` background/withheld-step contract; existing converter/background monitor and lifecycle tests implement that supported runtime behavior. Activity inspection is the exposed product surface, not direct manual transcript editing.
- Forward path: Agent request → AGY planner/native execution → provider accumulates later steps in its transcript while withholding stream publication → provider emits withheld step updates → ordered backend queue receives an earlier step while later source rows already exist → first canonical publication/Activity.
- Lifecycle preconditions/consequence: a current newly observed step need not be at EOF; a fixed-tail-only resolver can miss otherwise safely available actual inputs. The design does not assume a particular tail distance or invent new parallel-call support.
- Scenario validity: Supported Normal Scenario under the established background contract.
- Reachability: Reachable.
- Review consequence/proportionate response: accept one reverse scan bounded by opened-file snapshot size and chunk/row memory, with ordinal stopping/abort; no polling, watcher, global scan or guessed chunk-file recovery.

### MP-002 — User Stop can occur while optional first-input capture is pending

- Related approved authority: REQ-003–004; AC-005–006.
- Relevant behavior IDs: BEH-004; preserved lifecycle for BEH-001–003.
- Initiating basis kind: User.
- Independent initiating trigger: user activates the ChatComposer “Stop generation” primary control on an active Agent run (or the existing run termination control). The action is supported independently of the new reader.
- Support evidence: `web/components/chat/ChatComposer.vue` calls target.interrupt; activeContextStore binds that target to agentRunStore.interruptGeneration and AgentStreamingService; AgentRun interrupt state calls the backend. Backend `interrupt`/`terminate` immediately set cancellation/process state and queue existing interruption; runtime docs define user Stop as a turn boundary; lifecycle tests preserve no late success.
- Forward target path: Agent request → bound AGY turn → first native step queued → optional asynchronous source scan → user Stop routes to backend interrupt → backend cancels/stops provider and aborts owned read → read settles/closes descriptor → same-turn/cancellation/liveness check declines conversion → existing queued interruption is delivered.
- Lifecycle preconditions/consequence: observation is asynchronous while Stop remains actionable; without fencing, the stopped turn could publish an obsolete STARTED/success after cancellation. No artificial hidden-state mutation is required.
- Scenario validity: Supported Explicit Edge Scenario, expressly covered by AC-006.
- Reachability: Reachable.
- Review consequence/proportionate response: accept a backend-owned AbortController, finally cleanup and post-await same-turn checks. No new recovery/restart protocol. Process-close/shutdown aborts are separately covered by the existing lifecycle contract and AC-006, not inferred from Stop to create extra machinery.

## Unresolved Approved-Behavior Or Current-State Gaps

None. Undocumented provider-format variability is an acknowledged residual risk with an approved unresolved outcome, not an unanswered requirement or an assertion of universal association.

## Review Decision

**Pass** — behavior basis confirmed; design is implementation-ready within the approved future-only scope. No blocking finding or unsupported in-scope mechanism identified. This is an architecture pass, not an implementation, completeness, API/E2E, delivery or release pass.

## Findings

None.

## Classification

N/A — Pass; no failure-origin classification. Preserve task_size Medium / architectural_risk High.

## Recommended Recipient

`get_handoff_rules` returned the primary Pass destination **/implementation_engineer**, the Fail/Blocked destination /solution_designer (not applicable), and a separate informational Pass condition after primary handoff success. Route implementation work only to /implementation_engineer; the later /solution_designer notice is informational, not duplicate forwarding. The implementation package must include the cumulative approved core artifacts and all still-relevant evidence, with ARCH-REV-001 and SR-001–003 identified. No historical repair or new policy is authorized.

## Residual Risks

- Provider layout is internal/undocumented; observed single-call adjacency does not promise arbitrary AGY versions or multi-call/changed shapes. Such detail must stay unresolved.
- Reverse framing, UTF-8/CRLF, row bounds, duplicate/ordinal rejection, source consistency, final-symlink/containment guards and descriptor/abort cleanup still require executable implementation checks. Read-only evidence is not proof these are correctly coded.
- The asynchronous first-event seam must be tested for ACTIVE-first and DONE/ERROR-first, repeat steps, pending Stop/process-close, ordered result/background closure and immutable argument reuse. Keep existing clocks/lifecycle/error/result conventions and original-name MCP exclusion intact.
- Fake-CLI tests must isolate HOME before provider modules load and prove real canonical STARTED, saved JSON and reopen without the optional source. Resume tests must distinguish new enriched calls from untouched old calls.
- A representative real native capture through the implemented backend and rendered/reopened Activity checks remain downstream work. Do not count summary fallback as full-input success or the prior direct CLI probe as post-fix validation.
- Scanning total IO is bounded by snapshot size, not a performance SLA; the 2 MiB row cap is a technical safe-read limit, not full-input coverage for arbitrary payload sizes. No new retention, compatibility, threat-model or migration obligation is introduced.

## Latest Authoritative Result

- Review Decision: Pass.
- Material-Premise Gate: Pass.
- Notes: ARCH-REV-001, SR-001–003; approved future-only native input capture; no findings; Medium / High; implementation and downstream validation pending.
