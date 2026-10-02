from pathlib import Path
import json,shutil
root=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis')
ev=root/'tickets/in-progress/context-compaction-simplification-analysis/delivery-evidence/dr-001'
changed=[]
def write(path,text):
 p=root/path; before=ev/'before'/path; before.parent.mkdir(parents=True,exist_ok=True)
 if before.exists(): raise RuntimeError('beforeimage exists '+path)
 shutil.copy2(p,before); p.write_text(text); changed.append(path)
def replace(path,old,new):
 text=(root/path).read_text(); assert text.count(old)==1,(path,old[:50],text.count(old)); write(path,text.replace(old,new))
def section(path,start,end,new):
 text=(root/path).read_text(); a=text.index(start); b=text.index(end,a); write(path,text[:a]+new+'\n\n'+text[b:])
core='autobyteus-ts/docs/agent_memory_design.md'
old=(root/core).read_text()
planning=old[old.index('### Trigger-Aligned Planning Budget'):old.index('### Failed-Pending Attempt And Turn Admission')]
recovery=old[old.index('## 10. LLM Request Recovery Boundary'):old.index('## 11. Natural Compactor Conversation')].replace('## 10.', '## 8.')
shared=old[old.index('## 12. Shared Readable Value And Tool Policy'):old.index('## 14. Runtime Settings')].replace('## 12.','## 9.').replace('## 13.','## 10.').replace('semantic\nworking-context strategies','direct\nworking-context compaction').replace('select the native\nstrategy, write episodic/semantic memory, resolve or inject AutoByteus compacted\nmemory','run native\ncompression, write episodic/semantic memory, resolve or inject AutoByteus compacted\nmemory')
text='''# AutoByteus Agent Memory Design

## 1. Purpose And Authority Boundaries

Native memory separates three authorities:

- **WorkingContext** contains the finalized provider-neutral messages used for
  the next parent request, including zero or one compacted-memory region.
- **Raw traces** and their archives retain original activity evidence.
- **Readable presentation** derives bounded model/human-facing copies without
  rewriting canonical evidence.

A native compaction now produces one validated Markdown summary body. Current
continuation authority is `working_context_snapshot.json`, not an episodic or
semantic bundle or a lineage head. Existing category and lineage files remain
historical data; normal compaction and restore neither consult nor append them.
There is no new manifest, compaction pointer, or compatibility strategy branch.
External Codex/Claude provider sessions remain their own continuation authority.

## 2. Direct Compression Boundary

```ts
interface CompressionStrategy {
  compress(content: string): Promise<string>;
}
```

`PendingCompactionExecutor` captures the live baseline, plans a detached message
window, and builds the complete input **before** calling the strategy once.
`CompactionContentBuilder` renders the selected natural conversation, including
any prior compacted-memory region and new settled raw-backed units. Its plain
START/END target-history separators enclose the renderer's XML history boundary.
Private reasoning and backend call IDs are omitted; settled tool interactions
retain readable names, arguments and result/error facts. Renderer boundary
imitations are escaped.

Derived input copies normalize CR/CRLF, remove non-useful C0 controls except
newline/tab, replace lone UTF-16 surrogates, and preserve valid pairs and
multilingual text. Surrogate-safe head/tail omission never mutates stored raw
facts. Literal U+FFFD and valid emoji are not globally forbidden. A completed
input-construction failure is typed `input_construction_failure` before any
summary generation; it is not a reason to sanitize canonical history.

`DirectLlmCompressionStrategy` owns the provider envelope and bounded generation:

- each attempt creates an isolated LLM using current compaction model settings
  (or the then-current parent model identifier when no model is selected);
- it sets the bundled `COMPACTION_SUMMARY_PROMPT` and sends the prepared content
  as the user message with no tools or child Agent/Team runtime;
- provider capacity is checked before dispatch;
- one `compress` execution has at most **three** generation attempts with
  abortable 1s/2s backoffs; each provider call requests `single_attempt` transport
  so SDK retries cannot multiply those attempts;
- abort ends the operation rather than authorizing another attempt;
- known incomplete output, provider errors and invalid summary content do not
  become accepted memory; cleanup is bounded and cannot reverse a success;
- it returns only the validated, untagged summary body.

The parser accepts exactly one `<compaction_summary>...</compaction_summary>`
block, ignores exterior prose, and requires these exact `##` headings in order:

1. Goal and constraints
2. Decisions and findings
3. Completed work
4. Current state
5. Open work and next steps
6. Essential references

The body starts with the first heading. Each section must contain specific
bullets or `(none)`; duplicate/missing/reordered headings or envelope markers
inside the body fail validation. There is no six-array JSON schema, corrective
child run, numeric word/bullet quota or prompt-level target-summary budget.
Provider output caps and final WorkingContext fit checks still apply. Structural
acceptance does not guarantee model factual fidelity or future continuation.

The former structured-JSON strategy, registry/resolver, category normalization,
child-agent runner and built-in Memory Compactor synchronization are removed
from this path. Old `AUTOBYTEUS_COMPACTION_STRATEGY` and compactor-agent selector
values are inert; old on-disk agent configuration is not imported or deleted.

## 3. Composition, Planning And Thresholds

`MemoryCompactionConfiguration` has closed `disabled` and `enabled` variants.
Enabled composition carries one `CompactionPolicy` and a strategy factory with
execution control; disabled has neither. Direct core construction defaults to
disabled. The server composes native runs with the direct strategy. The generic
LLM path always resolves request capacity; disabled runs skip automatic
compaction, not provider capacity checks. No special compactor child exists.

'''+planning+'''## 4. Failure, Held Input And Retry Permission

A pending operation receives one automatic initial execution. Exhausted
failure retains that operation with a new failure epoch and exposes
`Compaction failed — send a message to retry`. A later accepted **user-origin**
message supplies one permit for that exact failed operation/epoch. Agent/system
messages, same-turn continuations, queued input accepted before failure, and
stale/duplicate permits are not retry authority. There is no background loop.

For a pre-parent gate, accepted input A remains held with its identity, text and
attachments; it has not been dispatched to the parent. A user message B accepted
after the failure permits retry. Success resumes A before B, once each, with no
resend required. Further failure keeps the recovery gate and advances the epoch;
it does not turn queued B into future retry credit. Existing consumed reads,
tool results and follow-up work must not be replayed. A failure after a visible
final response is a **next-turn** gate, not a replay of the completed response.

This is live in-memory queue ownership, not durable same-ID workflow replay or
a promise to resume held input across backend restart. Standalone, Team and Org
adapters project the same recovery facts; stream loss is not input authority.

## 5. Accepted Replacement And Commit Point

A successful replacement summarizes the prior compacted region plus a nonempty
selected settled raw prefix, then retains the planned recent units. Framework
validation checks required leading system messages, media, provenance,
complete tool protocol, zero/one compacted-memory region and final fit. The
strategy neither assigns persistent output IDs nor writes storage.

Publication is owned by `MemoryManager` and `AcceptedCompactionCommitter`:

1. Recheck operation/attempt identity and baseline fingerprint; copy and validate
   the finalized context and serialize the complete snapshot.
2. Prepare/copy and validate the selected raw archive while active evidence is
   still intact; collect retained raw IDs and check cancellation.
3. Atomically replace `working_context_snapshot.json` — the durable commit point.
4. Install the already-owned context, clear the pending operation and set the
   threshold episode without intervening validation, I/O or caller callbacks.
5. Prune prepared active raw records afterwards. Prune failure is diagnostic:
   active duplicates may remain, but committed success is not reclassified.

Failure before snapshot replacement does not publish a new live context or
summary. Prepared archive evidence can remain; no deletion of active evidence
is required before the commit point. Completed/failed/stopped observations are
terminal-latched; late output after cancellation cannot reopen or commit the
operation. This is per-file atomic replacement, **not** multi-file transaction,
whole-machine-power-loss durability, or a universal shutdown guarantee.

## 6. Versionless Snapshot And Restore

New snapshots write exactly:

```json
{ "agent_id": "...", "messages": [] }
```

The normal reader projects current known fields. Obsolete root `schema_version`
and extra root fields have no admission meaning; current identity, message
shapes, provenance, media and tool facts remain mandatory. A historic payload is
not admitted merely because its root version is ignored. Zero or one compacted
region is validated without opening category or lineage files.

Explicit existing-run restore requires a snapshot. Bootstrap decodes the safe
current shape and identity, installs it for ordinary active-raw tool-protocol
repair, then fully validates and saves the repaired current snapshot. It does
not invoke compaction or regenerate a summary merely to reopen a run.

For each unmatched native tool call, `(turn_id, tool_call_id)` is the durable
identity. A matching committed active-raw result is reused. Otherwise ordinary
repair appends one canonical interrupted result and reconstructs its provider-
safe message. Repeated repair converges; an abandoned tool is not assumed to
have succeeded. Archived raw history is not replayed as new conversation work.
New-run initialization remains a separate path.

The active JSONL reader preserves complete earlier records and truncates only a
malformed final physical record from a partial append. Earlier malformed records
remain integrity errors; relaxing root-version handling does not relax raw facts.

Anthropic native assistant-turn metadata remains private working context. Within
an active tool cycle, ordered blocks including signed/redacted thinking replay
with matching tool results. Before a new independent turn the request assembler
removes earlier replayable thinking atomically while retaining text/tool-use/
results. Compaction is deferred while continuation needs that signed history;
accepted client-authored compaction removes stale thinking and validates protocol.
Outward events must not project private metadata. This does not add a root
snapshot version.

## 7. Files And Frozen Historical Migration

Current native writes use `working_context_snapshot.json`, active raw traces,
`raw_traces_manifest.json` and immutable `raw_traces_<index>.jsonl` archives.
`episodic.jsonl`, `semantic.jsonl` and `compaction_lineage.jsonl` are not current
write/restore dependencies; existing files remain inspectable historical data.
There is no new migration for the direct summary/versionless-writer cutover.

The already-registered server migration
`20260731_migrate_native_working_context_snapshots_v5` remains a historical
converter with a **frozen migration-owned** codec, independent of the relaxed
runtime reader. Exact native location/identity classification, missing-snapshot
no-op and nonempty-lineage byte-preservation eligibility remain unchanged.
Absent/empty-lineage historical v1/v3/v4/strict-v5 inputs use same-location active
raw backing; unsupported/unsourced/old-compacted/incomplete units are omitted,
and the frozen candidate is validated before replacement and obsolete category/
manifest cleanup. Raw evidence and lineage are not rewritten by conversion.

Before that conversion, an exact current versionless successor shape with the
correct identity is preserved **whole-location byte-for-byte**, including valid
pending tool intents, partial result batches and raw-ahead recovery states. This
is a frozen shape guard, not request-ready full validation; normal bootstrap owns
repair. Invalid versionless-current data fails per item without falling through
to historical conversion-to-empty. Migration warnings/failures remain recorded
and retryable while startup continues. Do not reset a successful migration ledger
or invent another historical reader to force the cutover.

'''+recovery+shared+'''## 11. Runtime Settings And Provider Boundaries

| Setting | Meaning |
| --- | --- |
| `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` | Optional JSON tuple `{modelIdentifier, llmConfig}`. Null model uses the then-current parent identifier; null config uses selected-model defaults. |
| `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO` | Optional post-response threshold ratio override. |
| `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE` | Optional effective context budget override. |
| `AUTOBYTEUS_COMPACTION_DEBUG_LOGS` | Detailed diagnostics. |

Absent model settings select defaults without writing a setting. The server
clones selected-model defaults and applies permitted generation overrides, then
forces the approved system prompt, no stop sequences, controlled request fields
and tool-free single-attempt transport. The hard output cap is a positive
configured/default cap (fallback 8192), clamped to advertised model capacity.
Credential-bearing and request-control values are not arbitrary model overrides.
A numeric generation key is not a credential. No parent LLM instance, tools,
conversation state or parent retry policy is mutated.

See [server memory ownership](../../autobyteus-server-ts/docs/modules/agent_memory.md),
[settings](../../autobyteus-web/docs/settings.md#server-settings-working-context-compaction)
and [frontend recovery/activity](../../autobyteus-web/docs/agent_execution_architecture.md#run-level-compaction-activity).

## 12. Key Source Owners

- `src/memory/compaction/compression-strategy.ts`
- `src/memory/compaction/direct-llm-compression-strategy.ts`
- `src/memory/compaction/compaction-content-builder.ts`
- `src/memory/compaction/compaction-summary-prompt.ts`
- `src/memory/compaction/compaction-summary-parser.ts`
- `src/memory/compaction/pending-compaction-executor.ts`
- `src/memory/compaction/accepted-compaction-builder.ts`
- `src/memory/compaction/accepted-compaction-committer.ts`
- `src/memory/memory-manager-compaction-coordinator.ts`
- `src/agent/compaction/compaction-recovery-controller.ts`
- `src/memory/working-context-snapshot-serializer.ts`
- `src/memory/restore/working-context-snapshot-bootstrapper.ts`
- `src/memory/migration/native-working-context-snapshot-shapes.ts`
- `src/memory/presentation/unicode-safe-text.ts`

Server composition is in
`autobyteus-server-ts/src/agent-execution/compaction/compaction-llm-factory.ts`;
startup conversion and its ledger remain in `src/app-data-migrations/` there.
'''
write(core,text)
write('autobyteus-ts/docs/agent_memory_design_nodejs.md','''# AutoByteus Agent Memory Design (Node.js)

The canonical TypeScript/Node.js memory architecture is maintained in
[Agent Memory Design](./agent_memory_design.md). Use that document for direct
compression, input recovery, snapshot publication/restore, frozen historical
migration and provider-native metadata boundaries. This entry point intentionally
does not duplicate the contract.

The former structured-JSON child-agent/category/lineage design is not the current
runtime. Existing historical files are preserved; see the canonical document for
the distinction between normal runtime reads and historical startup conversion.
''')
# Server module: replace native ownership only, leave external recorder/tool contracts intact.
p='autobyteus-server-ts/docs/modules/agent_memory.md'; s=(root/p).read_text()
a=s.index('## Runtime Ownership'); b=s.index('Codex and Claude runs are recorded',a)
s=s[:a]+'''## Runtime Ownership

Native AutoByteus runs use the core `MemoryManager`. The canonical
[core memory design](../../../autobyteus-ts/docs/agent_memory_design.md) owns
planning, provider-safe content construction, direct `compress(content)` output,
validation, snapshot publication and repair. Server composition uses
`src/agent-execution/compaction/compaction-llm-factory.ts` to construct an isolated
tool-free LLM per attempt, not a visible child agent. There is no strategy catalog,
registered algorithm selector, category-output projector or live lineage head.

`AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` is the optional current model/config tuple.
Missing/null selection uses the then-current parent model identifier and selected-
model defaults without a settings write. Controlled prompt/tool/transport fields
are excluded; the parent instance and its ordinary retry policy stay unchanged.
The existing trigger-ratio, active-context override and diagnostic settings remain.
Old built-in Memory Compactor definitions/settings are not imported or deleted.

One strategy execution permits at most three isolated generation attempts.
Planning/input construction happens before generation. Exhaustion retains the
same pending operation and exposes a fresh failure epoch. A later accepted user
message supplies one retry permit; pre-failure queued input and agent/system
messages do not. At a pre-parent gate A stays held, then B can authorize recovery
so A dispatches before B once each. Post-response failure is a next-turn gate.
These are live-queue semantics, not durable workflow replay after restart.

The committer prepares/copies archive evidence while active raw remains intact,
atomically replaces the versionless snapshot as the commit point, installs the
owned context and clears the pending operation, then prunes. Prune failure may
leave active duplicates and cannot reverse committed success. No category or
lineage write occurs. Per-file atomicity does not promise whole-machine power-loss
safety or transactionality across every memory file.

Native lifecycle phases include `requested`, `started`, `completed`, `failed` and
`stopped`, correlated by operation/requested-turn/execution-turn identities.
Termination aborts execution and drains the concrete backend event pump before
close within its bounded policy. Late summary output cannot reopen a stopped
operation. Root Team/Org shutdown freezes its known member scope and coordinates
preparation before teardown. This is not a new universal immediate-preparation
latency guarantee: first-auto preparation/quiescence timeout coverage remains a
separate unproved diagnostic boundary. Client reconciliation retains terminal
native rows for loaded contexts; it is not durable native cold replay. See
[frontend execution](../../../autobyteus-web/docs/agent_execution_architecture.md#run-level-compaction-activity).

'''+s[b:]
s=s.replace('- `raw_traces_<zero-padded-index>.jsonl` — immutable raw-trace archives, including one exact-new-activity archive per successful native compaction.','- `raw_traces_<zero-padded-index>.jsonl` — immutable raw-trace archives. Native compaction prepares selected new activity before snapshot commit; a failed preparation/publication can leave copied archive evidence without a successful new summary.')
s=s.replace('- `episodic.jsonl` and `semantic.jsonl` — immutable native compacted output rows.','- `episodic.jsonl` and `semantic.jsonl` — historical compacted output rows; current direct compaction does not append them.')
a=s.index('- `compaction_lineage.jsonl`'); b=s.index('Startup app-data migration',a)
s=s[:a]+'''- `compaction_lineage.jsonl` — historical append-only lineage, not current continuation authority and not a normal compaction/restore dependency.
- `working_context_snapshot.json` — native continuation state: versionless `{agent_id, messages}` with finalized messages and provenance. The normal reader ignores obsolete root version/extras but requires current shapes, identity and repairable tool facts. Codex/Claude recording does not write it.

There is no current compacted-memory manifest or pointer. The destructive
`20260730_reset_pre_lineage_memory` path is removed. Normal restore accepts
current known fields with zero/one compacted region independently of historical
category/lineage presence. It performs ordinary active-raw unmatched-tool repair
before full validation and normal save; it does not generate a new summary.

'''+s[b:]
anchor='The old monolithic `raw_traces_archive.jsonl` file'
pos=s.index(anchor)
s=s[:pos]+'''The registered native converter is frozen historical code, not the normal
versionless reader. Its migration-owned shape guard first preserves an exact
current versionless successor and the entire location byte-for-byte, including
valid pending tool intents, partial tool batches and raw-ahead recovery states.
Invalid versionless-current data fails the item unchanged rather than being
converted to empty historical data. The guard does not run full request-ready
validation; ordinary bootstrap owns repair. No new migration or successful-ledger
reset is required for the direct-summary cutover.

'''+s[pos:]
write(p,s)
section('autobyteus-server-ts/docs/ARCHITECTURE.md','## Native Working-Context Compaction','## Agent Work Trace Projection','''## Native Working-Context Compaction

Native memory now compresses selected WorkingContext content with one isolated,
tool-free LLM strategy (`compress(content): Promise<string>`). The executor owns
planning and provider-safe input construction; the strategy owns up to three
single-attempt provider generations and exact six-heading Markdown-envelope
validation. It does not launch a child agent, select a registered strategy, repair
JSON category arrays or write episodic/semantic/lineage output.

The accepted snapshot `{agent_id, messages}` is the continuation authority. Raw
archive preparation precedes atomic snapshot replacement; in-memory installation
and pending clear follow that commit point, with best-effort active pruning last.
This is per-file atomicity, not a multi-file or whole-power-loss guarantee.
Normal restore reads current known fields, repairs unmatched native tools from
active raw facts and validates/saves without category or lineage dependencies.
The existing historical startup migration retains its frozen conversion rules and
preserves exact current versionless successor locations unchanged; no new migration
or successful-ledger reset accompanies this cutover.

Failure retains a pending operation and a failure epoch. A newly accepted user
message after failure permits retry; a pre-parent held A resumes before later B
once each on success. Completed-response failures gate the next turn instead of
replaying work. Root termination and client terminal activity reconciliation are
identity-scoped, retain facts and reject late output. Native in-memory terminal
retention is not native cold replay or a general immediate shutdown guarantee.

Server composition uses the optional `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` tuple,
falling back to the then-current parent model identifier and selected-model
defaults. Old strategy/compactor-agent settings are inert. Ordinary parent and
external-provider request/session policies are not replaced.

See [core memory design](../../autobyteus-ts/docs/agent_memory_design.md),
[server memory](modules/agent_memory.md),
[settings](../../autobyteus-web/docs/settings.md#server-settings-working-context-compaction)
and [frontend activity/recovery](../../autobyteus-web/docs/agent_execution_architecture.md#run-level-compaction-activity)
for the authoritative ownership and limitations.''')
# Settings plus duplicate activity summary in one write.
p='autobyteus-web/docs/settings.md'; s=(root/p).read_text(); a=s.index('## Server Settings: Working-Context Compaction'); b=s.index('## Server Migrations:',a)
s=s[:a]+'''## Server Settings: Working-Context Compaction

Settings -> Server Settings -> Basics contains the node-bound Compaction card:

- optional model selection and generation configuration are one persisted JSON
  tuple, `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` (`modelIdentifier`, `llmConfig`);
- null/missing model means the then-current parent model identifier; null config
  means selected-model defaults, not a copy of the parent's mutable LLM instance;
- trigger ratio, active-context token override and detailed logs remain separate
  existing settings.

Reading an absent tuple or saving unrelated controls does not materialize model
settings. Editing/saving or clearing model selection is explicit. Model/config
validation follows the bound server catalog; stale node responses must not
replace current drafts. A failed initial settings read exposes Retry rather than
claiming a clean usable configuration.

Save sends changed valid fields sequentially through the existing per-setting
mutation, stopping on the first failure. Prior successful writes remain saved;
failed/unsent fields stay dirty for remaining-only retry. This is not a transaction
across all controls. The model/config pair is saved as a single setting value.

There is no strategy or compactor-agent selector. The server creates a fresh
isolated tool-free LLM for each direct summary attempt and enforces its prompt,
output cap and request controls; credential-bearing values are not accepted as
arbitrary model overrides. Numeric generation controls are not credentials.
Old strategy settings and old Memory Compactor files are not imported/deleted.
The card retains full-width controls and stacked navigation on narrow screens.

See [core memory design](../../autobyteus-ts/docs/agent_memory_design.md) for
summary format, retry ownership and current storage boundaries.

'''+s[b:]
a=s.index('### Run-Level Compaction Activity'); b=s.index('\n---',a)
s=s[:a]+'''### Run-Level Compaction Activity

The canonical [execution/activity contract](./agent_execution_architecture.md#run-level-compaction-activity)
covers requested/started/completed/failed/stopped phases, held-input recovery,
identity-scoped termination and retained terminal rows. Native retained in-memory
activity is not durable native cold replay; provider-boundary rows remain separate.
'''+s[b:]; write(p,s)
p='autobyteus-web/docs/agent_execution_architecture.md'; s=(root/p).read_text(); a=s.index('### Compaction Lifecycle Activity And Center Feed'); b=s.index('### System Instruction Activity',a)
s=s[:a]+'''### Compaction Lifecycle Activity And Center Feed

Native compaction projects one Activity row per operation with requested/start
and terminal completed/failed/stopped phases, timestamps and diagnostic facts.
It is runtime feedback, not LLM-facing text or a replacement memory artifact.
Requested/queued phases stay out of the center feed so pending tool protocol is
not split; execution starts a new visual boundary after the preceding tool
block. Terminal rows may remain visible, with failure details or neutral Stopped
presentation as appropriate.

Historical conversation content is sourced from the backend replay bundle. Event
Monitor reads the active-raw recent window (newest 100 canonical replay events)
and does not page archives. Hydration may retain uncovered terminal native
Activity already loaded in memory under guarded replacement; it must not invent
native compaction cards on cold reopen from Offline or latest status alone.
Provider compaction-boundary traces remain their separate durable evidence family.
See [Run-Level Compaction Activity](#run-level-compaction-activity) for identity,
termination, retention and recovery rules.

'''+s[b:]
a=s.index('### Run-Level Compaction Activity'); b=s.index('\n---',a)
s=s[:a]+'''### Run-Level Compaction Activity

`AgentRunState` holds latest status; `AgentActivityStore` holds operation rows.

- The shared `compactionPhase` contract has `requested`, `started`, `completed`,
  `failed`, `stopped`. Native operation identity is `compaction_operation_id`;
  requested/execution turn IDs and isolated LLM invocation metadata enrich it.
  There is no child compactor run/task identity in the direct strategy.
- Provider-native boundary identities remain separate. Run-scoped Activity keys
  use actual run IDs, not display conversation IDs or parsed Team route strings.
- Only `started` animates. `stopped` is neutral/static; known completed/failed
  outcomes and accumulated diagnostic facts are retained, not reclassified.
- A confirmed terminate action reconciles only unresolved native operations for
  the exact captured context/service/generation/node/member identities. Team/Org
  reconciliation covers all loaded retained members of the root, not just the
  selected member. Retired/replaced contexts and failed commands cannot mutate
  successors. Org retires its stream before the mutation and reconciles success
  before historical marking/inspection refresh; it cannot depend on a late event.
- Backend terminal latching/pump drain and client reconciliation are complementary.
  A late summary cannot resurrect a stopped row or produce a false completion.
- Projection replacement is revision-guarded and atomic within the Activity store.
  It preserves uncovered terminal native rows already held in memory and applies
  the existing bounded 100-item window. This is not durable native cold replay.
  Cold readers must not synthesize a native compaction event from Offline.
- Failure uses backend recovery facts to display `Compaction failed — send a
  message to retry`. Accepted A held before parent dispatch keeps its content,
  identity and attachments. Later user B can permit the exact failed epoch;
  successful recovery dispatches A then B once each. Stale permits, agent/system
  input and input queued before failure are not retry authority. A failure after
  visible final output gates the next turn, without replaying consumed work.
- Queue ownership is live-runtime only; no same-ID replay across backend restart,
  universal model success or immediate preparation/shutdown latency is promised.
  Detailed budget figures remain runtime diagnostics, not a live debug panel.
'''+s[b:]
s=s.replace('requested`, `started`, `completed`, `failed`','requested`, `started`, `completed`, `failed`, `stopped`') if False else s
# Replace any legacy phase table list without duplicating the new list.
s=s.replace('requested/started/completed/failed', 'requested/started/completed/failed/stopped')
write(p,s)
replace('autobyteus-web/docs/memory.md','## Memory Home','''## Current Native Compaction And Historical Categories

Current native compaction stores a six-section Markdown summary inside Working
Context, whose versionless snapshot is the continuation authority. It does not
append new Episodic/Semantic records or depend on a lineage head. Existing category
files remain historical inspection data; an empty category tab is not evidence
that current compaction failed. Raw traces/archives remain original work evidence.
Normal reopen uses snapshot decode, active-raw tool repair, validation and save;
it does not generate another summary. Imported memory remains an inspection
corpus, not automatic native continuation state.

See [core memory design](../../autobyteus-ts/docs/agent_memory_design.md).

## Memory Home''')
p='autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md'; s=(root/p).read_text(); a=s.index('When memory has a failed pending compaction'); b=s.index('`AgentRuntime.submitEvent',a)
s=s[:a]+'''When compaction exhausts its bounded direct-generation attempts, it retains the
pending operation with a fresh failure epoch. A later accepted user-origin input
may grant one exact retry permit; agent/system input, stale/duplicate permits and
input queued before failure cannot. At a pre-parent gate input A remains held
with its identity/content/attachments. After B grants recovery, success resumes A
before B once each. Exhaustion retains the gate; B is not future retry credit.
After-visible-final-response failure gates the next turn rather than replaying
completed work. This is in-memory admission, not a durable deferred-message
store or same-ID workflow across backend restart. See
[Memory Design](./agent_memory_design.md#4-failure-held-input-and-retry-permission).

'''+s[b:]
a=s.index('  - executes an authorized pending compaction'); b=s.index('  - reads one complete',a)
s=s[:a]+'''  - executes an authorized pending compaction before parent dispatch; pre-parent
    input remains held rather than being silently consumed on final failure;
  - constructs and validates provider-safe compaction input before generation;
    `input_construction_failure` makes no summary call, blocks parent dispatch
    and retains the user-authorized recovery gate;
'''+s[b:]; write(p,s)
p='autobyteus-server-ts/docs/modules/agent_definition.md'; s=(root/p).read_text()
s=s.replace('- `memory-compactor/` syncs the shared `agents/autobyteus-memory-compactor/` definition with display name **Memory Compactor**.\n','').replace('- the Memory Compactor is synchronized at fixed id `autobyteus-memory-compactor` without creating a user-selectable server-setting default;\n','')
a=s.index('Do not add separate one-off'); b=s.index('\n## Notes',a)
s=s[:a]+'''Do not add separate one-off built-in-agent bootstrappers or scatter platform
templates under feature-runtime folders. Native compaction now constructs an
isolated tool-free LLM directly; it has no synchronized Memory Compactor agent,
registry-selected algorithm or child Agent runtime. Old compactor-agent files and
removed selector/strategy setting values are inert for compaction and are neither
imported nor deleted. The optional current model/config tuple is server-owned,
not an AgentDefinition selector. The Daily Assistant is not auto-featured;
featured placement stays an operator choice in Settings.
'''+s[b:]; write(p,s)
section('autobyteus-server-ts/docs/modules/agent_tools.md','The product-owned built-in definition ID `autobyteus-memory-compactor`','Claude Agent SDK and Codex App Server','''Direct native compaction bypasses Agent construction entirely and sends no tool
schemas to its isolated LLM. The former exact-ID Memory Compactor empty-tool
exception is removed. It must not be used to infer tool exposure for ordinary
agents: even an ordinary empty persisted `toolNames` set receives the native
four-tool baseline and applicable Team tools.''')
replace('autobyteus-ts/docs/llm_module_design.md','''This hardening still matters to compaction when the selected visible compactor
agent uses a local model and sends a large request before the next parent-agent
LLM leg is allowed to continue.''','''This hardening also applies when direct compaction selects an isolated local LLM
and sends a large request before the next parent leg. Compaction calls additionally
request `single_attempt` transport so their maximum three strategy-owned attempts
are not multiplied by SDK retries. This compaction-specific control does not
change ordinary parent request retry policy; there is no visible compactor agent.''')
replace('autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md','''- `AppDataMigrationRunner` attempts every registered pending migration''','''- That historical converter uses a frozen migration-owned codec. Before conversion
  it preserves exact current versionless successor locations byte-for-byte,
  including valid pending tool intents, partial batches and raw-ahead states.
  Invalid versionless-current data fails unchanged rather than converting to
  empty. Normal bootstrap, not this guard, repairs protocol and saves current
  `{agent_id, messages}` snapshots. Direct compaction adds no new migration and
  must not reset a successful ledger record.
- `AppDataMigrationRunner` attempts every registered pending migration''')
replace('autobyteus-server-ts/docs/modules/agent_execution.md','''converts, or resets history. Existing memory/compaction lineage remains in
place; ordinary later execution uses its existing runtime algorithm with the
selected model, without promising identical future compaction timing.''','''converts, or resets history. Existing WorkingContext and raw evidence remain in
place; historical category/lineage files are not rewritten or made current
continuation dependencies. Ordinary later execution uses its runtime compaction
path with the selected model, without promising identical future timing.''')
(ev/'docs-changed-paths.json').write_text(json.dumps(changed,indent=2)+'\n')
shutil.copy2('/tmp/dr001-docs.py',ev/'sync-docs.py')
print(json.dumps({'updated':len(changed),'paths':changed},indent=2))
