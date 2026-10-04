# Product Design Requested — agent memory UI
## Result / request authority
- Purpose: New Request.
- Stable solution package: runtime-work-transfer-analysis; current revision SR-008.
- User explicitly requests Product Team at /product_team: “could you brain storm on this memory UI part … product team could work on the UI part … visualize the UI”.
- Requested outcome: collaborate with the user to brainstorm and visualize the agent-memory experience so the memory concepts and open product choices become easier to understand and decide.
- This request does NOT prescribe a Product mode, repository, ticket/bootstrap procedure or final screen structure. Product owns those choices and its artifacts.
- Requirements status: Draft. User has confirmed memory-first priority and notes-first/drill-down reading; full behavior, ownership and final visuals have not been approved.
- Recipient specified by user: /product_team. Sender: /solution_designer.
- No implementation, finalized architecture, independent review, backend rewrite or runtime-switch feature is being handed off.

## Context / user intent
Initial pain: Codex allowance exhaustion stops work; the user wants a different runtime to continue. Conversation clarified the underlying feature: complete runtime-independent agent memory first. Runtime switching will later consume it, perhaps by sending a crafted read-in instruction to a fresh executor. Runtime-switch UI/detection/takeover are deferred.
Human analogy: a worker uses their own toolkit, leaves a detailed journal and useful work notes; a successor first reads the notes, follows references to detailed journal entries when necessary, then continues using their own tools.

## Essential distinctions — do not collapse these
1. Runtime-dependent raw traces: existing tool/event representations.
2. Runtime-independent work trace / journal: faithful chronological recorded work in Markdown, understandable without source-runtime protocol knowledge. A common JSON envelope or Markdown formatting alone is insufficient.
3. Work notes: selective agent-generated observations, decisions/reasons, accomplishments, uncertainties and pending work for portions of the journal. Not an exhaustive log.
4. Consolidated notes: coherent higher-level understanding across notes, incorporating corrections and progress, with links downward.
5. Episodic/semantic memory: requested next layers; precise product behavior still open.
6. Runtime working context: active context owned by a particular executor, not the portable durable-memory authority.
User sometimes says “work nodes”; terminology itself is open for clarification, not a graph UI requirement.

## Focused product exploration
Use the requested brainstorming/visualization to help the user reason about:
- How people enter and navigate an agent's memory, and understand which agent/work/run scope they are viewing.
- How a readable overview/consolidated note leads to a specific work note, then journal entries and supporting artifacts.
- How the interface distinguishes journal versus notes versus episodes/facts without presenting every technical layer as a mandatory top-level tab.
- How to communicate what work is covered, what is newer/unprocessed, what is being generated, and what failed or lacks evidence.
- How corrections, superseded conclusions and unresolved work appear without erasing history.
- What memory belongs to: a continuing work history versus accumulation across independent runs of an agent definition. Last user question is unresolved; use product examples to explore, do not silently decide shared memory.
- Which proposed controls (if any) for generating/rebuilding notes, editing/correcting memory or sharing are actually wanted. These are questions, not approved CRUD/regeneration/sharing requirements.
- How episodic/semantic memory should be understandable/useful; naming, hierarchy and release scope remain open.

Critical journey: select relevant agent/work history → understand consolidated notes/current state → inspect individual note → follow evidence into detailed journal/artifacts → return with context intact.
Relevant alternates for discussion: no recorded work; journal exists but no notes; partial/stale coverage; summarizer unavailable; failed generation; conflicting/corrected facts; missing source artifact; histories from different runtimes.
This is exploration, not a fixed UI brief. Please surface alternatives and unresolved decisions rather than turning mock fixture content into agreed behavior.

## Requirements and evidence references
Relevant IDs: BEH-003,005; UC-004–007; SCN-006–009; REQ/AC-002,003,005,008–014; DEC-004–011.
Deferred switching IDs: REQ-001,004,006,007 and transfer scenarios. Do not re-center design on a runtime picker.
Recent history: commit e6ff6068734842868f08f8c6c4290b9cc17b6f59 (September 26) removed episodic/semantic generation from native context compaction, replacing it with a direct continuation summary. This memory product should not reinstate that runtime coupling.
Existing work-trace renderer passes tool names/arguments/results through and omits/truncates some content. Do not imply portable journaling and complete memory are already implemented.
Original evidence must remain available; note layers should retain sources. No false certainty/completion, permission escalation, or automatic sharing assumed.

## Existing frontend context (source inspected, not a live UI review)
Within the code workspace below:
- autobyteus-web/pages/memory.vue
- autobyteus-web/components/memory/MemoryHome.vue: existing Agents / Agent Teams / Agent Orgs catalog and search; Agent cards group entries and show run counts.
- autobyteus-web/components/memory/MemoryInspector.vue: existing Working Context, Episodic, Semantic and Raw Traces inspection tabs; imported read-only corpus indication.
- Related components: AgentMemoryDetail.vue, CollaborationMemoryDetail.vue, RawTracesTab.vue, WorkingContextTab.vue, EpisodicTab.vue, SemanticTab.vue.
- Stores: memoryExplorerStore.ts and memoryInspectorStore.ts.
Existing UI grouping by agent does not establish semantic sharing of memory between its runs. Backend physical storage is run-scoped.
These are context/reference paths, not instructions to copy the existing tab structure or a substitute for Product's investigation.
No live screenshots, approved prototype or final visual baseline exists for this request.

## Workspace, canonical artifacts and ownership
Solution code/reporting workspace:
 /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis
Branch: codex/runtime-work-transfer-analysis.
Base: refreshed origin/personal @ 806907faeb567d2b703e10fe984fcd01be0b41fd.
Finalization target if later authorized: origin/personal; no merge/release authorized.
Product owns its separate lifecycle/artifacts; do not edit this requirements authority to imply approval.
Canonical absolute paths:
- /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/analysis-result.md
- This handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/product-design-request.md
Design/review/implementation artifacts: N/A — not applicable.

## Expected return
A Product-owned exploration/result with durable artifact/review links, visual material appropriate to the user's request, clarified user decisions, remaining alternatives/questions and accurate approval status. Return context to /solution_designer for requirements integration. Do not imply exploratory visuals authorize implementation or assume user confirmation before it occurs.

## Routing
get_handoff_rules completed: returned architecture-complete and delivery-receipt-gap routes only; none matches Product Design Requested. Routing this explicit collaborator request to the user-provided canonical /product_team address, not an inferred internal route. No additional recipient. Send status is confirmed by the send_message_to tool result.
