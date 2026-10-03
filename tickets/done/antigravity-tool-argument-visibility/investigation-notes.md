# Investigation Notes — Antigravity tool argument visibility

## Investigation Meta
- Package: `antigravity-tool-argument-visibility`; date: 2026-10-03; current revision: SR-003.
- Current status: requirements Approved (USER-APPROVAL-2026-10-03-FUTURE-ONLY); architecture evidence extended at SR-003. Original intake findings below remain historical. No implementation performed.
- Repository mode: Git; workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility`.
- Branch: `codex/antigravity-tool-argument-visibility`.
- Refreshed base: `origin/personal` @ `98d8fb36a632ce0f46136cda20129d1fe1ee0ac8`.
- Finalization target: `origin/personal`; no merge, commit, release or deployment performed/authorized.
- Bootstrap succeeded: `git fetch origin personal`, then `git worktree add -b codex/antigravity-tool-argument-visibility /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility origin/personal`.
- Shared checkout was behind the refreshed base and had unrelated modifications; left untouched. Root/parent AGENTS.md absent; relevant server/web AGENTS.md and root TESTING.md read.

## Initial Request And Clarifications
User suspects the Antigravity backend/adapter because a successful Agent Package Creator `replace_file_content` Activity card shows only a path. Requests investigation of why content arguments are absent, analogous tools and a direct runtime probe if useful. No implementation scope approval or Product Design request received.

Screenshot inspected at `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_c57fdd5438cd4fa18e8d7ea3a738750a/solution_designer_88d48b8de0b74a6faaf3d3e6e40ad701/context_files/ctx_06be0b068054__image.png`. Its target path is the exploratory-requirements-visualizer SKILL.md under product-ui-ux-designer. The displayed invocation ID is truncated; multiple calls match this target, so no unique screenshot-call identity is claimed.

## Product And Domain Understanding
Antigravity is a supported alternate Agent runtime. Native CLI events become canonical AgentRun events, are persisted through the shared memory writer and projected into live Activity and reopened history. `tool_info.parameters` in the native stream is a display summary, empirically not a complete tool-input object. The provider's full local transcript has actual planner `tool_calls[].args`; those records are separate from stream tool summaries. MCP calls have their own wrapper projection and are not interchangeable with native tools.

## Source Log
All repository-relative paths below are rooted at `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility` unless an installed/original path is explicitly absolute.

| Source / command | Why consulted | Finding |
| --- | --- | --- |
| `git remote -v`; `git symbolic-ref refs/remotes/origin/HEAD`; `git fetch origin personal`; `git rev-parse origin/personal`; `git worktree list` | Authoring isolation and baseline. | Refreshed personal base and dedicated worktree; no original checkout edits. |
| `.codex/skills/solution-designer/SKILL.md`, requirements standards/templates; server/web AGENTS.md; `TESTING.md` | Role boundaries, approval and validation rules. | Investigation before approved design; only native reproduction performed, no implementation validation claim. |
| User screenshot | Visible symptom and supported journey. | Expanded replacement Arguments contain exactly TargetFile; green SUCCESS. |
| `/Users/normy/.autobyteus/server-data/memory/agents/agent_package_creator_0cc60bc5ef864c279c03f388349720fa/run_metadata.json` | Locate actual runtime binding. | antigravity_cli, model gemini-3.8-flash-high, provider conversation 738a76ed-5cb0-4705-b131-aaaad04573c3, selected workspace autobyteus-agents. |
| Same run's `raw_traces_active.jsonl`; `python3 /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/analyze.py` | Determine whether fields were lost by rendering/history. | 1,409 trace rows, 684 tool calls; summary-only inputs already persisted. Checksums/snapshot capture time in production-coverage.json. |
| `/Users/normy/.gemini/antigravity-cli/brain/738a76ed-5cb0-4705-b131-aaaad04573c3/.system_generated/logs/transcript_full.jsonl` and `transcript.jsonl` | Compare actual provider inputs with stored summaries. | 684 tool-bearing planner records, each containing one call in this run. Every canonical tool step matched same-name prior planner call. Full transcript has typed input objects; ordinary transcript serializes many values as JSON strings and is not type-equivalent. |
| Original brain `.system_generated/steps/987/output.txt`, planner 986 and GENERIC 987 | Path-matching replacement input/result evidence. | Actual TargetContent, ReplacementContent, lines/options and a genuine edit diff exist; canonical tool arguments have path only and output null. Selected relevant examples copied without unrelated conversation text. |
| `agy --version`; `agy --help`; `agy models`; executable `/Users/normy/.local/bin/agy` | Verify local CLI capability rather than rely on documentation version. | Installed AGY 1.2.16; stream-json/new-project/custom agent/add-dir available; selected live probe model supported. No install/update performed. |
| `python3 /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/native-probe/probe.py` | Direct CLI, bypassing all AutoByteus components. | 8 native calls, both ACTIVE and DONE; summary-only input keys before any adapter. SUCCESS, file actually changed. |
| `python3 /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/native-probe/timing-probe.py` | Verify whether detailed inputs can exist while call is live. | One independent replacement: full typed planner input already readable at ACTIVE and DONE. Feasibility observation, not a cross-version/timing guarantee. |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts:92-139` | Current producer normalization. | Reads info.parameters and forwards it as arguments for native calls. No native argument detail reader. It does not filter content fields out of a complete parameter object. |
| Installed `/Applications/AutoByteus.app/Contents/Resources/server/dist/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js` | Avoid attributing behavior only to unreleased source. | Same parameter passthrough at installed runtime boundary. |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` and `agy-stream-message.ts` | Provider transport/parser. | Native JSON objects retained; parser does not discard nested argument fields. Lines bounded at 2 MiB; no truncation of JSON fields to paths. |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-payload.ts:53-55`, `runtime-tool-trace-sequencer.ts:40-79,160-176,210-225` | Persistence behavior. | First call-ready observation persists input object; later terminal events do not replace persisted call arguments. Enriching terminal-only fields would not automatically repair saved history. |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts:76-110`, `historical-replay-events-to-activities.ts:21-35` | History reconstruction. | Uses stored interaction.arguments then forwards them as Activity arguments; no native transcript input recovery on reopen. |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleParsers.ts`, `toolLifecycleHandler.ts:87-152`, `toolActivityProjection.ts`; `autobyteus-web/components/progress/ToolActivityItem.vue:52,151-162` | Renderer investigation. | Copies/merges structured arguments and JSON.stringify prints them; no replace/write-specific suppression of content. Canonical persisted evidence and direct native probe establish the upstream omission. |
| `agy-brain-file.ts`, `agy-step-output-reader.ts`, runtime docs | Existing provider evidence conventions. | Internal provider-file reads already guarded for images/background tasks; these do not recover native inputs. Layout documented internally as undocumented AGY internals. |
| `agy-stream-event-converter.test.ts:531-534` and write fixture at 161-162 | Coverage limitations. | Existing native tests accept summary/path-only fixtures, so passing them does not establish complete native input capture. No new tests or source edits performed. |

## Relevant Existing Behavior And Supported Product Paths
| Behavior | Kind / supported trigger | Product sequence and current outcome | Evidence / confidence |
| --- | --- | --- | --- |
| BEH-001 | User/System; Agent Package Creator changes a file using a configured native tool. | Tool runs; user expands Arguments; only TargetFile visible for replacement/write. | Screenshot + actual trace + direct CLI; high. |
| BEH-002 | User/System; configured native read/search/shell call. | User inspects Arguments; stream summary omits supplied options. | Actual call comparison plus independent native probe; high for observed tools. |
| BEH-003 | User; reopen saved runtime history. | AutoByteus projects stored arguments, which are already incomplete. | Actual saved traces and current history source; high; no new UI re-open automation claimed. |
| BEH-004 | Operational/System; optional internal provider evidence unavailable. | Current converter can operate from valid stream without argument detail files. Existing image/background readers tolerate missing internal evidence. | Current source and documented runtime conventions; proposed detailed-input fallback needs approval. |

Scenario validity: SCN-001–003 are supported ordinary product scenarios. SCN-004 is a proposed extension of the existing supported best-effort provider evidence convention; explicit operational edge scope, pending approval. The CLI probes are diagnostic evidence of those native tool operations, not a newly approved user-facing CLI entry surface.

## Findings And Root Cause
### F-001 — Native stream contains summaries, not complete inputs
Direct AGY 1.2.16 reproduction bypassed the adapter, memory, server transport and UI entirely. For native `replace_file_content`, ACTIVE and DONE both contain only TargetFile. The full transcript contains the target text, replacement, StartLine/EndLine, AllowMultiple, Instruction and Description. The file changed from BEFORE_MARKER_7831 to AFTER_MARKER_7831.

Representative raw event: step 6, `tool_info = {name: replace_file_content, parameters: {TargetFile: <disposable marker path>}}`. Not a UI truncation, argument-generation failure or proof the tool executed without content.

### F-002 — Adapter faithfully passes the incomplete stream and has no native-input enrichment
`AgyStreamEventConverter.tool()` reads `info.parameters`, presents it as `arguments`, and emits start/terminal events. For native calls, the adapter does not consult the actual planner input. MCP projection and image result resolution are explicit separate cases. Installed binary code has the same behavior as refreshed source. Root cause is **summary-only provider stream plus an integration completeness gap**, not the adapter stripping content from a full object.

### F-003 — Persistence and Activity propagate the upstream omission
Matching path examples include step 987 (planner 986) and 1346 (planner 1345), with full provider inputs but path-only canonical traces. Recorded summary inputs are then projected in history and JSON-rendered without relevant filtering. Native input recovery only at terminal would not ensure live/saved parity: the shared sequencer keeps first persisted call arguments. This is a verified current constraint for later design, not approval to refactor the shared recorder.

### F-004 — Substantive omissions are broader than replacement
Production evidence snapshot: **684/684** canonical calls matched exactly one immediately prior same-name planner call, with MCP wrapper name projection accounted for. This is empirical evidence for this snapshot, not a general correlation algorithm contract.

| Native tool | Actual run count | Stored input keys | Substantive inputs omitted when supplied |
| --- | --- | --- | --- |
| replace_file_content | 141 | TargetFile | TargetContent, ReplacementContent, StartLine, EndLine, AllowMultiple, Instruction, Description on all 141. |
| write_to_file | 15 | TargetFile | CodeContent, Overwrite, Description on all 15; ArtifactMetadata on 6. |
| view_file | 251 | AbsolutePath | StartLine/EndLine on 200. |
| grep_search | 97 | Query, SearchPath | CaseInsensitive/MatchPerLine on all 97; Includes on 10, IsRegex on 1. |
| run_command | 142 | CommandLine | Cwd/WaitMsBeforeAsync on all 142; RunPersistent on 56. |
| find_by_name | 8 | Pattern, SearchDirectory | No extra substantive fields in this actual run; independent direct probe omitted its supplied Type and MaxDepth. |
| list_dir | 18 | DirectoryPath | No substantive input omission established; only provider presentation metadata omitted. |
| manage_task | 4 | Action, TaskId | No substantive input omission established; observed saved capsule is not reason to expand new-run allowlist. |
| MCP get_handoff_rules | 8 | empty object | Correct: actual nested Arguments empty. Other nonempty MCP inputs were not directly probed in this investigation. |

Native full records also contain toolAction/toolSummary, omitted from summaries. Those presentation metadata fields are separate from substantive input omissions; do not inflate the count of tools with missing execution input by counting metadata alone. Image generation was not directly invoked to avoid unnecessary expensive outputs; existing input/result behavior must be preserved, not assumed universally incomplete.

### F-005 — Recoverable evidence exists, with internal-format and lifecycle caveats
Provider full transcript path: `<brain>/<conversation>/.system_generated/logs/transcript_full.jsonl`; `PLANNER_RESPONSE.tool_calls[].args` contains typed values. Standard `transcript.jsonl` in the direct probe instead stores serialized JSON per value (for example boolean false as string `"false"`). Production standard logs have mixed encoding across records; naive reparsing of every string risks corrupting legitimate strings. Full typed evidence is preferable as a feasibility observation, not yet a selected authoritative design.

Timing probe conversation d2a55064-ba8d-429f-bdd5-69e7fe75b5e5: actual replacement inputs already available at ACTIVE and DONE. Full inputs are not universally absent until turn completion. Reliable matching for parallel/multi-call plans, repeated paths, alternate tools, file rotation/partial writes, bounded access and missed timing must still be verified in architecture. No public provider guarantee was established. No assumption that stepIndex-1 alone is safe for all future sessions.

### F-006 — Adjacent result/output gap, not approved fix scope
Replacement and write stream DONE events lack output; canonical result contains provider_state DONE and output null. Actual provider step output includes the replacement diff. Direct view_file output is just a line/byte-count summary even though provider step output has the viewed text. This is a related observability limitation, not proof of execution failure, and not automatically authority to alter results. Requirements deliberately focus on input arguments; output/diff recovery and historical backfill are separately approvable expansions.

## Structural And Payload Surface Inventory
- Payload surfaces: native stream `tool_info.parameters`, full transcript planner `tool_calls[].args`, standard transcript per-value serialized strings, canonical event arguments, raw tool_call.tool_args, projected Activity arguments and UI JSON rendering.
- Structural surfaces: native CLI transport/converter; guarded provider evidence filesystem reads; shared first-observation recorder and history projection; existing Activity UI.
- Current API/persistence schema change: none performed. Whether future design needs contract/schema changes remains unclassified until approval and architecture investigation; input completeness might fit existing objects, but that is not a complete design conclusion.
- Existing readers/writers: converter consumes provider stream; AGY writes its own transcripts; memory sequencer writes canonical calls/results; history projection and UI read canonical inputs. No current general argument-detail reader.

## Runtime, Probe, Or Reproduction Findings
1. Main native reproduction: `python3 /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/native-probe/probe.py`; custom allowlisted agent, independent --new-project, disposable task-local workspace, AGY 1.2.16, gemini-3.8-flash-low. Eight calls (write, view, replace, grep, find, list, printf shell, view) reproduce the native summary limitation. Full details copied from the probe's own transcript. Provider conversation: a5fcdebd-7b3b-44f7-a504-8affe0873386. SUCCESS, 20.88 s reported turn duration. No synthetic transport mocked.
2. Timing probe: `python3 /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/native-probe/timing-probe.py`; one native replacement; full planner arguments snapshot at both ACTIVE and DONE; file became TIMING_AFTER_6042; provider SUCCESS.
3. Each own CLI process was explicitly stopped after provider result because stream-json input remained open. Process exit 1 and `stream input cancelled: context canceled` are consequences of requested shutdown, not false proof of a failed tool. Main reproduction stopped its own process group; timing probe PID 85011 stopped. No background tasks requested.
4. Original Agent Package Creator PID 26026, conversation 738a76ed-5cb0-4705-b131-aaaad04573c3, remained live/unchanged when checked. Production metadata/history and provider logs were read only; no tool replay or user-file mutation.
5. New native sessions necessarily wrote their own AGY global brain/project/history metadata; those identified diagnostic records remain as probe evidence. No global registry or original conversation cleanup attempted. Test fixture files remain within this ticket's evidence directory.
6. These are investigation probes, not completed implementation/API-E2E or rendered-product acceptance checks. No production code edits, test suite pass claim, app restart or deployment.

## Stakeholder And User Evidence
User screenshot and actual run independently show supported inspection of a successful native edit. User explicitly requests broad investigation; no explicit fix-scope approval. Observed omission matters to users understanding what a tool actually changed or where/how it searched/ran.

## External Contracts, Standards, And Dependencies
Installed AGY native stream protocol observed directly; no version-admission change proposed. Provider transcripts are internal artifacts with no externally verified stability guarantee. Existing docs explicitly note guarded brain accesses for image/background functionality. No public-web claim or unverified release-version assumption is used.

## Persisted Data And State Facts
Original raw active traces: 1,409 rows/684 tool calls; source sizes/hashes in production-coverage.json. Provider full transcript has 1,418 rows at capture. Both remain in original locations, untouched. Canonical first-call input object is durable; terminal records contain results but not revised input payloads. Existing incomplete history can be read as-is; no migration/backfill approved. No loss, reset or alteration of existing data acceptable under proposed scope.

## Product Design Request Context / Findings
Product Design request: Not stated. UI/UX prototype, separate repository, review URL and Product artifacts: N/A — existing JSON inspection retained. No Product handoff.

## Supplemental Artifact Inventory
Canonical evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence`. All listed supplements are factual evidence owned by Solution Designer, related to REQ-001–004 / AC-001–006, and do not define behavior or require separate approval.

| Absolute artifact path | Purpose / scope | Status |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/production-coverage.json` | Actual-run counts, omission keys, source checksums and mapping coverage. | Captured; 684 matched, zero unmatched. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/production-selected-calls.json` | Two relevant original replacements, typed provider input/result versus canonical traces; unrelated reasoning excluded. | Captured. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/native-comparison.json` | Field-by-field direct CLI summary versus actual input. | Captured. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/analyze.py` | Reproducible evidence comparison command; reads original logs, writes only owned evidence files. | Investigation script, not product implementation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/native-probe/probe.py` | Standalone native CLI reproduction. | Completed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/native-probe/launch.json` | Exact CLI argv/cwd/prompt/version. | Captured. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/native-probe/stdout.jsonl` | Raw independent native events before any AutoByteus conversion. | Captured. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/native-probe/transcript_full.jsonl` | Own native session's actual typed input evidence. | Captured. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/native-probe/transcript.jsonl` | Own session's contrasting serialized-value transcript. | Captured. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/native-probe/summary.json` | Conversation binding, provider SUCCESS, requested-shutdown exit and final marker content. | Captured. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/native-probe/timing-probe.py` | Independent live detail-availability probe. | Completed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/native-probe/timing-evidence.json` | Exact command/prompt, snapshots, native stream, provider result, PID and final marker. | Captured. |

CLI debug/stderr logs and capsule/workspace fixtures also remain local diagnostic artifacts. They are not a normative supplement or forwarding prerequisite; no broad original transcript copy or credentials file was created.

## Assumptions, Unknowns, And Risks
- RISK-001: internal transcript layout/encoding is not a promised provider API. Need proportionate safe fallback rather than runtime failure or invented content.
- UNKNOWN-001: reliable association across parallel/multi-call plans, partial writes, larger transcripts and changed versions. Samples have one call per plan; only these observed relationships are confirmed.
- UNKNOWN-002: larger-input limits and capture performance should be determined in architecture; no arbitrary performance/size requirement is approved.
- RISK-002: first persisted summary will remain summary if only terminal enrichment is implemented. Architecture must address this under REQ-002 without assuming a shared recorder rewrite is necessary.
- UNKNOWN-003: old complete native transcripts may permit historical recovery, but that is outside proposed scope. No claim old canonical history repairs itself.
- Scope approval pending; output/diff expansion separately identified. No architectural task-size/risk classification before completed design.

## Architecture Investigation Findings / Notes For Architecture
Current-state factual investigation only: converter native passthrough, guarded brain-file helper, full typed planner inputs and recorder first-observation semantics. SCN-001–004 need approval before target path/structure decisions. No authoritative source-selection, dependency, migration or lifecycle design authored. Timing evidence shows feasibility for one live input capture but is not a universal contract. Review/implementation/validation/delivery artifacts: N/A — not yet applicable.

## Requirement Implications
Evidence justifies proposing broader native input completeness, exact JSON values, live/saved parity, trusted call association and graceful summary-only fallback, while preserving existing execution and historical data. It does not justify changing tool results, native allowlist, other runtime integrations or historical data without separate user approval.

## Approval And Architecture Investigation — SR-002 / SR-003 (2026-10-03)

### Approval Capture
The user accepted the presented future-only scope, explicitly leaving previous calls as-is, conditional on fixability. Exact approval quote/reference is in requirements-doc.md. The follow-up asks for feasibility confidence, not a scope reversal. Full native inputs and the prior ACTIVE snapshot positively satisfy that condition. SR-001 REQ/AC intent is unchanged; no new behavior-defining supplements.

### Additional Source And Lifecycle Read
- Reconfirmed isolated worktree HEAD/base 98d8fb36a632ce0f46136cda20129d1fe1ee0ac8, branch codex/antigravity-tool-argument-visibility. Upstream has advanced, but `git diff --stat HEAD..origin/personal -- <Antigravity backend, memory sequencer, history projection, ToolActivityItem paths>` showed no relevant delta at inspection. No rebase or shared-checkout edit.
- Read architecture-design standards, design-principles and mandatory design template from the bundled skill at the original skill root (skills are not present in the worktree checkout).
- `agy-agent-run-backend.ts`: ordered Promise eventQueue awaits handleMessage/deliver; cancellation sets cancelled/process state immediately, then queues interruption. Adding async read before conversion requires both cancellation of reads and a post-await same-turn check; it must not re-open a stopped turn.
- `agy-agent-run-backend-factory.ts`: creation/restoration already binds the exact conversation returned by init; restore rejects conversation conflicts. The new lookup should bind to this ID, not target paths or run display names.
- `agy-brain-file.ts`: existing guarded regular-file reads, UUID check and realpath containment. New transcript I/O must stay behind this provider-filesystem boundary and preserve existing image/background reader behavior.
- `external-runtime-memory-writer.ts`, raw-trace-item.ts and raw-trace-record-normalizer.ts: tool arguments are ordinary Record objects; current writer and reader carry their JSON keys/types without a version branch or exact parameter-key schema. The first-observation sequencer remains the persistence constraint; no terminal rewrite is needed if first events are enriched.
- FileChangeEventProcessor and file-change-tool-semantics.ts: native replace_file_content/write_to_file names are not converted to legacy edit_file/write_file mutations. Additional uppercase native inputs must not be renamed to path/content/patch or used to invent diffs. Native image handling has separate guarded result resolution; preserve it and exercise existing regressions.
- Data Migration Guideline `autobyteus-server-ts/docs/design/data_migration_guideline.md`, sections 1–3 and migration/lessons inventory: schema unchanged and user rejects old-history recovery. Existing summary-only objects remain directly usable by normal generic readers. No transformation, predecessor migration alteration, startup/admission audit or history backfill is needed. Predecessor-source dispositions are N/A because no predecessor data is transformed.
- Fake native image E2E uses a test-owned HOME before imports (`agy-native-image-step-output.e2e.test.ts:14-23`); use that existing isolation pattern for new provider evidence fixtures. Do not plant test files in the real user's brain directory.

### F-007 — Command summaries are additionally lossy, not merely missing fields
A later read-only architecture snapshot checked 681 native calls (the original Agent Package Creator continued independently after the initial 684-total-call snapshot). Strict same-name adjacent single-call, DONE planner, object input and summary equality succeeded for 667; 14 run_command inputs disagreed only because CommandLine was truncated to a 512-character prefix plus a literal Unicode ellipsis. In every one, the full actual command is longer and begins with that exact prefix. No other mismatch was found.

Evidence: evidence/architecture-correlation-evidence.json. It includes source size 3,034,540 bytes, maximum complete JSON row 22,772 bytes, mismatch step IDs/lengths and prefix corroboration without copying unrelated commands. Native probe maximum row: 2,988 bytes. This is evidence clarification under unchanged REQ-001 (actual input strings) and REQ-003 (verified association), not approval to guess missing command tails. Full actual input must come from typed provider records; ellipsis agreement only corroborates the current observed display-summary transformation.

### Transcript Layout / Bounded Access Findings
`find <own/original brain>/.system_generated/logs/chunks -maxdepth 3 -type f` showed numbered transcript_full byte chunks; the original conversation had 30 files, and parsing a complete chunk as independent JSONL failed at a split string. These are not per-step input records and cannot safely be chosen by stepIndex/filename. Use the typed full transcript as the one authoritative native-input source, not standard serialized-value logs or alternate chunk-layout decoders.

A fixed tail-only lookup is insufficient as a general design: existing Antigravity runtime docs explain that tool step updates can be withheld behind a background command and then delivered together. A requested newly emitted step may be earlier than a small latest-file window. The design therefore uses asynchronous reverse scanning over the bound conversation's single full-transcript snapshot, with bounded chunks/row memory, rather than declaring every out-of-tail step missing or repeatedly loading an unbounded full file synchronously. This is a target decision documented in design-spec.md, supported by the existing withheld-event scenario, not a newly invented concurrency product feature.

### Architecture Evidence Supplement
- Absolute artifact: /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/tickets/in-progress/antigravity-tool-argument-visibility/evidence/architecture-correlation-evidence.json.
- Owner: Solution Designer; purpose: stricter native association and lossy-summary/row-size evidence; scope: REQ-001–004 / AC-001–006; status: captured; approval applicability: factual evidence only.

### Remaining Evidence Boundaries
Current examples have one tool per planner. Multi-call, duplicate-index, changed-format or otherwise ambiguous evidence is deliberately unresolved under the approved fallback; no new parallel-call matching engine is required. Async I/O correctness, cancellation, bounded line framing, actual canonical persistence and rendered/reopened parity still need executable validation by their downstream owners; investigation is not an implementation pass. Undocumented provider-format risk remains explicitly high for independent architecture review.

### Completed Architecture Result
Design-spec.md at SR-003 is Ready / Architecture Design Complete: task_size Medium, architectural_risk High because of the provider-internal mapping and abortable pre-publication read seam, not evidence volume. Current approved requirements remain SR-001 intent approved at SR-002. Independent architecture review is required if the matching rule returns that route. No source/test implementation was performed by Solution Designer.
