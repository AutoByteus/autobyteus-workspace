# Work Journal — investigation

- Package: work-journal (Step 1B of the runtime-independent memory program). Bootstrapped 2026-10-07.
- Workspace /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal; branch codex/work-journal; base origin/personal @ 88fad73cb; finalization target origin/personal (no merge authorized).
- Prior context: archived runtime-work-transfer-analysis (requirements-doc-SR-011-snapshot.md holds the earlier Step 1B draft: REQ-009, REQ-015–021, DEC-012–017). Step 1A (per-runtime compaction rotation) is complete for Claude, Codex, AGY, Grok and AutoByteus.
- U01 (User, 2026-10-07): wants to discuss how to build the journal. The journal must be runtime-independent; runtimes use different tool names for the same action (e.g. bash vs another shell tool name, read/write file), so the journal should no longer depend on specific tool names.

## J01 — real tool-name vocabulary by runtime (probes/tool-names-by-runtime.py → probes/tool-names-by-runtime.txt)
Scan of all raw_traces*.jsonl tool_call records under ~/.autobyteus/server-data/memory, grouped by run_metadata.json runtimeKind (team/org member dirs without run metadata are counted as "unknown"):
- Same intent, different names: shell — run_bash (AutoByteus 1993; Codex 9107 via adapter mapping), Bash (Claude 992), run_command (AGY 371); read — read_file / Read / view_file; write — write_file / Write / write_to_file; edit — edit_file / Edit / replace_file_content / replace_in_file; search — Grep / grep_search / find_by_name / list_dir; web — search_web / WebSearch, read_url / WebFetch.
- Already shared across runtimes (AutoByteus-provided tools exposed to every runtime): run_script, screenshot, open_tab, navigate_to, dom_snapshot, list_tabs, read_page, send_message_to, get_handoff_rules, generate_image/speech, create_or_update_task, etc.
- Runtime-internal concepts with no cross-runtime equivalent: Claude Skill, Agent, TaskOutput, Workflow; AGY manage_task; Codex js and speak; remote/ssh helpers (ssh_session_exec…).
- Volume: about 457K tool calls in team/org member dirs plus about 23K in standalone runs. Journal generation must be deterministic and cheap (no model calls).

## Discussion decisions (user, 2026-10-07)
- U02: "normalize the action" means mapping each tool call, at journal-generation time, to one plain semantic action with its key details. The journal shows plain labels, not internal tool names.
- U03 (confirmed: "Exactly like how you did it"): labels Command, Read file, Write file, Edit file, Search, Web search / Web page, Browser, Message to <teammate>, and "Tool: <name>" for everything else (nothing dropped or misfiled). Normalization happens when the journal is generated from raw traces (turn end for the open file, rotation for closed files, on demand for old runs); raw traces stay unchanged; deterministic, no model calls.
- Open: edit representation (diff vs summary); long-output policy.
- U04 (User): "Search" vs "Web search" was confusing → labels renamed: Search web (internet search), Read web page (URL fetch).
- U05 (User): Grep, Glob, grep_search, find_by_name, list_dir should all be Command. Recorded with the faithfulness rule: render the equivalent command built from the tool's arguments, show the tool's actual result, and keep the original tool name in the evidence link.
- U06 (User, confirmed): fold reading files (→ `cat`) and reading web pages (→ `curl`) into Command; keep Write file, Edit file, Search web, Browser and Message to <teammate> as plain actions, because no truthful command exists or the command form would hide the meaning. Principle: neutrality comes from plain language any human or runtime understands; never invent a command that did not truthfully correspond.
- U07 (User): write a detailed contract first that maps every tool name to the journal form, so nothing is missed; the user will review it.
- U08 (User): agreed that the Work Journal replaces the work trace.

## J02 — full tool inventory and offered tool lists (2026-10-07)
- probes/tool-inventory.py → probes/tool-inventory.json: every tool_call/tool_result under ~/.autobyteus/server-data/memory, attributed to a runtime via run_metadata.json or team/org execution trees (member launchConfiguration.runtimeKind, with team default). Codex 2,493 dirs / 65 names / 423,494 calls; Claude 269 / 39 / 43,671; AutoByteus 549 / 41+5 / ~10,000; AGY 44 / 27 / 3,910; Grok 1 / 2 / 2; unattributed 189 dirs / 784 calls.
- Offered lists from code/docs: Claude enabled built-ins Bash, Read, Edit, Write, Glob, Grep, NotebookEdit, WebFetch, WebSearch, Skill; disallowed now: AskUserQuestion, Agent, Task, Workflow, SendMessage, ListAgents (still present in historical data) (runtime-management/claude/client/claude-sdk-client.ts:96-102). AGY native: view_file, write_to_file, replace_file_content, grep_search, list_dir, find_by_name, run_command, generate_image (backends/antigravity/capsule/agy-native-tool-policy.ts:2-5), plus MCP via call_mcp_tool. Codex item families: command_execution→run_bash, file_change→edit_file, web_search→search_web (actions search/openPage/findInPage), mcp_tool_call and dynamic_tool_call keep tool names (backends/codex/items/codex-tool-item-family.ts, history normalizer). Grok built-ins: read_file, search_replace, grep, list_dir, run_terminal_command, web_search, web_fetch, todo_write, spawn_subagent, memory_search, search_tool, use_tool (~/.grok/docs/user-guide/01-getting-started.md:161-171, 07-mcp-servers.md:237-240); the adapter maps run_terminal_command→run_bash, write→write_file, search_replace→edit_file, use_tool→inner tool (backends/grok/grok-build-tool-projection.ts:103-112). AutoByteus native registry: read_file, write_file, edit_file, run_bash, start/get/stop background process, search_web, read_media_file, download_media, read_url (autobyteus-ts/src/tools/register-tools.ts).
- Data facts used by the contract: exit codes are recorded only by AutoByteus run_bash (result dict exitCode); Codex/Claude/AGY record output text and an error flag. Codex shell commands are wrapped `/bin/bash -lc '…'`. Codex search_web records action_type search/openPage/findInPage, and 1,439 records have no query. Older AGY write_to_file (344) and replace_file_content (182) records hold only the target path. Claude WebFetch takes a prompt and returns a summary.
- Contract drafted: work-journal-contract.md (behavior-defining supplement, Draft, user review pending).
- U09 (User): add examples per runtime showing how raw records become journal lines, including user/assistant messages.
- J03 (Examples, probes/pick-examples.py, probes/dump-example.py, probes/example-picks.json): one real turn per runtime selected by tool diversity — Claude (team solution_designer, 31 records), Codex (team solution_designer, 20), AGY (daily_assistant, 12), AutoByteus (daily_assistant, 34), Grok (the only Grok run, org solution_designer). Rendered in contract §10 with counts computed from the records (e.g. Codex output 177 lines → 137 omitted; Codex new-file patch 67 lines without @@; AutoByteus write 73 lines; AGY edit +3 −2; Grok system instruction 9,847 chars). New rules found and added: teammate-message envelope stripping (two variants), call/result pairing for parallel calls, tool_continuation and empty assistant skipped, Codex new-file detection by the absence of @@ hunks (kind add/update not stored in raw traces), Codex openPage without page content, Grok grep path null → ".", Grok grep result may be a summary.
- U10 (User): command neutrality is essential; any future runtime should normalize into the same journal format so a journal can be handed to any runtime (or person) as plain text to continue the work. Contract updated: principles 7 (universal commands only; rg replaced by grep/find) and 8 (one format for all runtimes; a new runtime adds only a translation table and tests).
- Bookkeeping (2026-10-08): at the user's request, /project_task_manager created Project Task project_task_0b4afc66-19d9-455f-87ac-a4282937935f in project AutoByteus (project_a1377344-25db-482a-97cc-ecfdb0fb495a), status IN_PROGRESS, with copies of requirements-doc.md and work-journal-contract.md as of 2026-10-08 attached. The delegation (ad_hoc_task_bbcea0e6-…) was marked DONE.
- Bookkeeping follow-up (2026-10-08): the Project Task Manager cannot assign an existing Project Task to an already running agent; its only assignment path, delegate_task, spawns a new copy. The user chose option (c): /project_task_manager created Project Task project_task_cc9c919e-ce28-4445-a25a-e577199941af "Link an existing agent or team run to a Project Task (no new copy)" (TODO, not dispatched). The Work Journal task is unchanged (IN_PROGRESS, "Owner: Solution Designer"). Delegation ad_hoc_task_bbcea0e6-… is closed again (DONE).

## Base refresh (2026-10-12)
- U11 (User): origin/personal advanced a lot; rebase the ticket branch on the latest. Worktree fast-forwarded 5316a0cad → beb6b3b49 (343 commits); ticket files untracked and untouched.
- Drift check (`git diff --stat 5316a0cad beb6b3b49`): no changes to agent-work-traces, server agent-memory recording, run-history projection or skill-improvement. Relevant changes:
  - autobyteus-ts/src/memory/output-limit-recovery-trace.ts adds the raw-trace type `output_limit_recovery` (a hidden note after an output-limited response; history replay does not project it). The contract §7 now covers it (proposed Notice line).
  - agent-tools task delegation: `delegate_task` gained `context_files`, `target_agent_run_id` and `target_team_run_id`; project-task tools gained context-file attachments. No tool names added or renamed (agent-tools manifests checked). Contract Q1 updated.
  - Other backend changes (AGY input text and token semantics, Claude/Codex/AutoByteus backend wiring, native compaction internals) do not alter tool names or raw-trace shapes used by the contract.

## Base refresh and re-analysis (2026-10-18)
- U12 (User): origin/personal changed a lot; rebase on the latest and analyze again. Worktree fast-forwarded beb6b3b49 → 55bff1f5e (715 commits); ticket files untouched.
- Unchanged: agent-work-traces (export code); skill improvement remains its only consumer (skill-improvement-service.ts:22,232); offered built-in lists (Claude claude-sdk-client.ts:99-105; AGY agy-native-tool-policy.ts:2-5; Codex families; Grok projection cases grok-build-tool-projection.ts:107-110). AGY stream converter changes add per-call token-usage events only (9e8e5bf269), which are not raw-trace work records.
- J04 (raw-trace content changes):
  - 5718c1301b (autobyteus-ts): an input tagged platform_input_preface is recorded as a separate system_task_notification (with sender_id) plus the user trace with its original content.
  - 02c1d8b92d (server): skill update notices are sent as platform notices, sender_id `system.skill_update_notifier` (system-task-notification-senders.ts), and recorded as system notices.
  - Inter-agent envelope changed (received-message-header.ts): `You received a message from the agent with sender address "<addr>" and sender run id "<runId>".` (address omitted when it does not reach the sender), then `\nmessage:\n<content>` plus an optional `\n\nReference files:\n- <path>` block (inter-agent-message-runtime-builders.ts:28-33; root-communication-runtime-builder.ts). There is no sender name any more.
- J05 (memory placement): agent-memory/domain/agent-run-memory-placement.ts + store/agent-memory-layout.ts: each agent run has exactly one memory directory (run part inside its root run's folder; task agent → agents/<agentRunId>/; task agent team member → agent_teams/<teamRunId>/<agentRunId>/). 6bcb206e4e: a task agent is a normal run with its own memory folder. Journal files therefore sit in each run's memory directory next to its raw traces; task agents are in scope (DEC-W5 updated).
- J06 (tool names/arguments):
  - Project tools split: create_or_update_project → create_project + update_project (285acae39a); create_or_update_task → create_task + update_task. Current list: list_projects, create_project, update_project, list_project_tasks, create_task, update_task.
  - send_message_to args: recipient_address | target_agent_run_id, content, message_type, reference_files (recipient_name only in older data).
  - delegate_task args: recipient_address | target_agent_run_id | target_team_run_id, task_id, description, reference_files.
  - Other tools present: agent/team definition management (list/get/create/update/delete), publish_artifacts, list_available_agents.
- J07 (data re-inventory, probes/tool-inventory.json; previous saved as probes/tool-inventory-2026-10-07.json): new names create_task/update_task (Claude 31/71, Codex 1/1), update_project (Claude 3). New argument shapes include AGY RunPersistent, ContentOffset, Append, find_by_name Type/Extensions; Claude Glob without path, WebSearch mode, WebFetch offset; delegate_task with task_id + target. Counts grew (Claude 492 dirs / 83,179 calls; AGY 81 / 14,750; Codex 2,617 / 438,011).
- Contract and requirements updated accordingly (envelope forms, notice senders, new tool names, argument mappings, scope incl. task agents).
- U13 (User): the contract must contain every command/tool from every runtime and how it converts; none may be missed. Finding: contract §8 summarized the long tail with patterns, so completeness was not checkable. Fixed: probes/build-tool-register.py generates work-journal-tool-register.md/.json from probes/tool-inventory.json (121 observed names, incl. the malformed name `find /Users/normy/eddie_project -maxdepth 3 -name` and missing names) plus each runtime's offered list (86 names). It has an explicit row per name (147 total: Command 21, Write file 4, Edit file 6, Search web 3, Browser 10, Message 2, unwrap 2, Tool 99), and the script exits non-zero on any missing entry. Contract §8–§9 now point to the register as the authoritative complete list.
- Platform notice (2026-10-18): skill file references/handoff-references.md changed (choose the handoff attachments: own documents plus what the receiver acts on; give the ticket folder path). Applies at this ticket's handoff.

## Two-category tool model (2026-10-18)
- U14 (User): listing every tool name cannot scale; any installed MCP server adds new names, so conversion must be generic.
- U15 (User): there are two categories, each runtime's built-in tools and MCP tools; AutoByteus's own shared tools are exposed to runtimes as MCP too. Everything other than the built-ins uses one generic rule; update the contract.
- U16 (User): define the rule from the raw traces, since every runtime is already converted into them. The adapter code that writes the raw traces is also valid evidence, as the origin of what they contain.
- J08 (raw-trace and adapter evidence):
  - **Names.** AutoByteus's shared tools are recorded under their plain names in every runtime. Adapters strip the autobyteus_agent_tools qualifier (agent-tools/mcp/agent-tools-mcp-tool-name.ts; Grok use_tool → inner name, grok-build-tool-projection.ts:73-77; AGY agy-mcp-tool-call.ts:23).
  - **Other MCP servers.** Their tools are recorded as `<server>.<tool>` in Codex (codex-thread-history-item-normalizer.ts:81-92; observed: plugin_management.search_plugins) and as `mcp__<server>__<tool>` in AGY. No `mcp__` name exists in today's raw traces.
  - **AGY wrapper.** 23 older AGY records keep `call_mcp_tool {ServerName, ToolName, Arguments}`, e.g. rt_1790338167958_10539b64…
  - **Result envelopes.** AGY wraps every result as `{provider_state, output}` (agy-stream-event-converter.ts:226-256; 14,588 records). MCP results are `{content, structuredContent, isError, _meta}` (Codex 1,978 and AutoByteus 286 records). Claude Read of an image returns content blocks with base64 data (2,208 records).
  - **Runtime attribution.** The journal selects the built-in table by the run's runtime from run metadata. 450 calls in folders without a runtime use the generic rule.
- Result: probes/classify-inventory.py → probes/inventory-classification.txt.
  - Built-in tables: work-journal-builtin-tools.json.
  - Of about 547,000 calls, about 492,000 map as built-ins (Codex 398,323; Claude 75,641; AGY 11,559; AutoByteus 7,432; Grok 1). The rest use the generic rule.
  - The exhaustive register (work-journal-tool-register.md/.json, probes/build-tool-register.py; U13) was removed as superseded.
- U17 (User): every tool, built-in or not, ends up in the same neutral form; the built-ins differ in name but are converted. The user trusts the Solution Designer's judgment and asks for its suggestion. Recorded as delegation of the open choices: contract D1–D4 decided, and requirements and contract approved within the user's direction.

## Contract validation round (2026-10-18)
- U18 (User): validate the contract once more for correctness and consistency. The point is that a journal from any runtime reads naturally to any other runtime, which can then continue with its own tools.
- J09 (validation evidence):
  - **Probes:**
    - probes/validate-contract.py → probes/validate-contract.json: per runtime and built-in, the argument key sets, argument types, result shapes, varied samples, errors and pairing; non-tool record types with keys and samples.
    - probes/count-runtime-texts.py → probes/runtime-texts.txt: counts of runtime texts.
    - Grok shapes come from ~/.grok/docs (read-only), grok-build-tool-projection.ts and tests/fixtures/grok-acp.
  - **Reads:**
    - Claude Read output `N\t…`, while AutoByteus read_file gives `N: …`.
    - AGY view_file usually records only "N lines, M bytes" (2,858 of 3,425).
    - Claude Read returns base64 image blocks 2,266 times.
    - AutoByteus read_media_file returns {uri, fileType}.
  - **Searches:**
    - Claude Grep's default mode is files_with_matches ("Found N files"), with extra options -A/-B/-C/-o/type/offset/multiline and !-globs.
    - AGY grep_search prints `file:text` without line numbers. Its options are CaseInsensitive/IsRegex/MatchPerLine/Includes (list or string).
    - AGY list_dir prints names with a trailing `/` for folders; AGY find_by_name has Excludes and prints names; Grok list_dir uses target_directory and prints a tree.
  - **Codex:**
    - 1,407 search_web calls carry no arguments; the query is in the result, and no results or page content are recorded.
    - 43 edit_file records have only a path.
    - 1,417 calls lack a result and 617 results lack a call.
  - **Runtime texts:**
    - Claude: persisted-output 352, rejection with "STOP what you are doing" 191, `<tool_use_error>` 719, file-state note 5,831, `Exit code N` error prefix 661.
    - AutoByteus: error prefix 384; interrupt texts 81 (shared with AGY); XML tool markup in assistant text 312, each followed by a real tool_call record; `**[User Requirement]**` banner 989 (legacy, hidden by the web UI, no longer in source).
    - AGY: `<truncated N lines>` 328.
    - `\r\n` line endings 2,127.
  - **Teammate envelopes:** 9,849 user records carry the older envelope without sender_id; 2,598 messages have Reference files.
  - **Non-tool record types missing from the contract:**
    - operation_boundary (184; its system note holds directives to the agent);
    - llm_request_recovery (67);
    - user media/message_id/dedupe_key and tags.
  - **Compaction details:** Claude records pre/post tokens and duration, AGY duration only, Codex neither.
  - **Legacy runtime kinds:** AUTOBYTEUS, CODEX.
- Result: contract SR-008 corrections 1–14 (contract §12); work-journal-builtin-tools.json adds read_media_file and _runtime_aliases; classify-inventory.py shows names exactly as recorded.
- U19 (User): asked whether to write the journal inside the adapters, or to convert raw traces. After discussion the user agreed that rendering from raw traces is better. Reasons:
  - it can be regenerated and fixed;
  - it covers the ~3,900 existing runs;
  - there is one format, not five;
  - there is one source of truth;
  - the live run path stays safe.

  Adapters stay fact recorders. Follow-ups to enrich raw traces: Codex exit code (the adapter reads it at codex-tool-payload-parser.ts:517-520 and drops it), Codex file-change kind, Grok exit code as a field. Recorded as DEC-W9.
- U20–U21 (User): asked where the journal is placed and confirmed it belongs inside each agent run. Recorded as DEC-W10: the run's memory folder beside its raw traces, in a `work_journal/` subfolder with numbering that matches the raw-trace files, plus a manifest. Evidence: run folder layout, e.g. agent_orgs/autobyteus_org_9f9d…/software_engineering_team_3e85…/solution_designer_a557…/ (raw_traces_000001/000002/active + manifest). The old export sits at agents/<run>/work_traces/{work_trace_active.md, work_traces_manifest.json} in 7 runs.

## Architecture investigation (2026-10-18, after approval SR-009)
Authorities read:
- skill references/architecture-design.md and references/design-principles.md;
- repository DESIGN.md;
- autobyteus-server-ts/docs/design/data_migration_guideline.md;
- autobyteus-server-ts/docs/design/collaboration_model.md (CM-8/CM-9, run storage);
- autobyteus-server-ts/AGENTS.md.

- J10 (current work-trace export, to be replaced):
  - The module is autobyteus-server-ts/src/agent-work-traces (396 lines):
    - domain/work-traces.ts;
    - services/agent-work-trace-{projection-service,renderer,source-reader,store}.ts.
  - **Behavior:**
    - `ensureCurrent` re-renders every raw file on each call (no reuse of closed files) into `<memoryDir>/work_traces/work_trace_{NNNNNN,active}.md` plus `work_traces_manifest.json` (schemaVersion 3).
    - It returns a package with summaryHash, a sha256 over the rendered contents.
  - **Why it drops information:** the renderer goes through the run-history replay projection (run-history/projection/transformers/raw-trace-to-historical-replay-events.ts `buildHistoricalReplayEvents`). That projection has only message, reasoning, tool and compaction events, which is why notices, system instructions and senders are lost (REQ-W2 evidence).
  - **Dead after removal:** the replay projection's options `interactionByIdentity`/`traceById`/`includedToolIdentityKeys` (lines 140-247) are passed only by the work-trace projection; run-history callers (local-memory-run-view-projection-provider.ts:48,65) pass none.
  - The autobyteus-ts presentation renderers (CondensedToolCallRenderer, ReadableValueRenderer) are also used by compaction-conversation-history-renderer.ts, so they stay.
- J11 (the only consumer, skill improvement):
  - **Service calls:** skill-improvement-service.ts:116-139 calls ensureCurrent for a live target only (`requireLiveTarget`) and stores `evidenceSummaryHash` in the record.
  - **Trigger message:** skill-improvement-improver-trigger-message-builder.ts:18-42 lists the manifest, root and files, with metadata keys `skill_improvement_work_trace_{manifest,root}_path`. Those keys are read nowhere else (tests only).
  - **Persisted state:** improver-session-service.ts:104-112,172 persists `workTraces{rootPath,manifestPath,lastSummaryHash}` and `lastRequest.workTraceSummaryHash` in `<memoryDir>/skill_improvement/improver_session.json`. These are only written and carried forward, never read for a decision.
  - **Store reader:** skill-improvement-improver-session-store.ts:28-33 parses with a strict `schemaVersion === 1` check.
  - **Data:** 3 improver_session.json files exist (e.g. agents/daily_assistant_07217644…/skill_improvement/improver_session.json); 4 record.json files.
  - **Built-in improver:** its texts describe "work trace" evidence (templates/retrospective-skill-improver/agent.md, SKILL.md, references/high-signal-trace-patterns.md). built-in-agent-bootstrapper.ts:110-160 re-copies templates at every startup, so updating the templates updates installs.
- J12 (raw-trace writers and timing):
  - **External runtimes** (Claude, Codex, AGY, Grok): AgentRunMemoryRecorder (agent-memory/services/agent-run-memory-recorder.ts) subscribes to run events and writes through a per-run promise queue; `waitForIdle(runId)` exposes that queue. ExternalRuntimeMemoryWriter → autobyteus-ts RunMemoryFileStore appends with appendFileSync.
  - **AutoByteus native:** writes raw traces inside autobyteus-ts (recorder `isRecordable` false). Native compaction archives through `pruneRawTracesById` → archiveAndRewriteActive (run-memory-file-store.ts:285-318).
  - **Rotation and manifest:** rotation rewrites the active file and adds a segment to raw_traces_manifest.json with `status: pending|complete`, record_count and first/last ids (autobyteus-ts memory/store/raw-trace-archive-manifest.ts).
  - **Reading:** RawTraceFileSourceService.listFiles(runId,"chronological") lists only complete segments plus active (raw-trace-file-source-service.ts:27-127). Its normalizer keeps every trace type and the fields the contract uses: content, tool name/id/args/result/error, media, fileAttachments, senderId, ts/seq/turnId and id (raw-trace-record-normalizer.ts).
- J13 (per-run attachment point):
  - **Attach:** every run passes AgentRunActivationRegistry.markPrepared → AgentRunResourceManager.attach (agent-execution/runtime/agent-run-activation-registry.ts:124-132), which attaches file changes, artifact relay and the memory recorder, and releases them on removal (agent-run-resource-manager.ts:56-128).
  - **Composition roots:** general-process-run-supervisor.ts:203-210 and application-platform/execution/application-execution-scope-kernel-builder.ts:96-102.
  - **Run API:** run.subscribeToEvents, run.runtimeKind (RuntimeKind enum: autobyteus, claude_agent_sdk, codex_app_server, antigravity_cli, grok_build) and run.config.memoryDir (agent-run.ts:149-159).
  - **Events:** TURN_COMPLETED, TURN_INTERRUPTED and COMPACTION_STATUS (agent-run-event.ts). AutoByteus native maps COMPACTION_STATUS too (autobyteus-stream-event-converter.ts:78).
- J14 (volumes):
  - 3,976 active raw files; 874 are over 1 MB (median of those 1.7 MB, p90 5.2 MB, max 28 MB).
  - 4,407 closed segments, the largest 35.7 MB.
  - A call and its result fall in different raw files for 618 of 336,652 calls in compacted runs (0.18%); 587 calls have no result anywhere.
- J15 (other readers of run folders):
  - **Memory sync** exports everything in a run folder except `.tmp/.partial/.lock/.swp/.swx` (memory-sync/shared/memory-sync-path-policy.ts:7,71-80), so work_journal/ travels with the run's memory. Atomic temp files are excluded.
  - **Memory explorer and run history** read raw-trace files only.
  - **Old export folders:** 7 exist, 6 at `<run>/work_traces/` and 1 at `<run>/self_evolution/work_traces/` (an older generation; self_evolution was removed by 20260623_remove_self_evolution_run_metadata).
- J16 (migration precedents): migrations/remove-external-runtime-working-context-snapshots-migration.ts (removal of derived files by walking the memory roots, symlinks skipped, item details); remove-external-messaging-data-migration.ts (deletion after a feature-removal approval). The runner skips terminal SUCCEEDED/SUCCEEDED_WITH_WARNINGS and continues after a failure (app-data-migration-runner.ts:56-75).
- J17 (no diff library): neither package depends on a diff library. Edit diffs are built locally from old/new text (trim common leading/trailing lines, then `-` old / `+` new).

## Supplement inventory (current, SR-010)
| Supplement | Purpose | Owner | Related IDs | Status / approval |
| --- | --- | --- | --- | --- |
| work-journal-contract.md | Behavior-defining journal format | Solution Designer | REQ-W1–W4, DEC-W1, DEC-W7, DEC-W8 | Approved (SR-010; D1–D4 under U17; corrections SR-008/SR-010 within direction) |
| work-journal-builtin-tools.json | Machine-readable copy of contract §4 (test oracle) | Solution Designer | REQ-W1 | Approved with the contract |
| probes/tool-inventory.json, inventory-classification.txt, validate-contract.json, runtime-texts.txt (+ scripts) | Evidence: real shapes and counts, read-only from user data | Solution Designer | AC-W1, AC-W2 | Evidence (not behavior-defining) |
| Superseded: work-journal-tool-register.md/.json, probes/build-tool-register.py | Exhaustive register | — | — | Removed in SR-006 |

## Content scope (2026-10-19)
- **U23 (User):** the journal should hold mostly user and agent, with tool calls and their results; compaction is runtime machinery.
- **U24:** asked whether the label should be `Agent:` or `assistant`. Recommended `Agent:`: `assistant` is chat-API vocabulary, and `Agent:` matches the product's own words.
- **U25–U27:** discussed notices. Recommended keeping `Notice:` lines (389 Claude background-task notices plus 8 platform skill-update notices are delivered into the agent's conversation and acted on) and the user-interrupted turn.
- **U28:** the user accepted the recommendation ("you have a good judgment based on your reasoning").
- **Recorded as requirements DEC-W11 and contract D5.** Omitted: system_instruction, provider_compaction_boundary, llm_request_recovery, output_limit_recovery. Kept: Notice and Turn interrupted by the user.
