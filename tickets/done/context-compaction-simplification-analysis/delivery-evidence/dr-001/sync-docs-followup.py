from pathlib import Path
import json,shutil
r=Path('/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis'); e=r/'tickets/in-progress/context-compaction-simplification-analysis/delivery-evidence/dr-001'; paths=json.loads((e/'docs-changed-paths.json').read_text())
for name in ['autobyteus-web/docs/settings.md','autobyteus-web/docs/agent_execution_architecture.md']:
 p=r/name; s=p.read_text().replace('(`requested`, `started`, `completed`, `failed`).','(`requested`, `started`, `completed`, `failed`, `stopped`).')
 if name.endswith('settings.md'):
  a=s.index('### Compaction Lifecycle Activity And Center Feed'); b=s.index('Native AutoByteus memory ingestion persists',a)
  s=s[:a]+'''### Compaction Lifecycle Activity And Center Feed

See the canonical [execution architecture](./agent_execution_architecture.md#compaction-lifecycle-activity-and-center-feed)
for Activity versus center-feed phases, active-raw history windows, and bounded
retention of already-loaded native terminal rows. These rows are not LLM input
or durable native cold-replay evidence.

'''+s[b:]
 p.write_text(s)
p=r/'autobyteus-server-ts/docs/modules/agent_work_traces.md'; rel=str(p.relative_to(r)); before=e/'before'/rel; before.parent.mkdir(parents=True,exist_ok=True); assert not before.exists(); shutil.copy2(p,before)
s=p.read_text(); old='''separator pair. The stable task, natural-sizing guidance, and response schema
remain in the built-in Memory Compactor system prompt; only the single bounded
correction prefix restates the schema after typed returned-content validation
failure. Native compaction never reads Work Evidence Markdown or manifests as
memory input or provenance.'''; assert old in s
s=s.replace(old,'''separator pair. The stable task and six-heading Markdown-envelope contract live
in the bundled direct-compaction system prompt. The isolated tool-free LLM
strategy owns at most three attempts, not a child-agent correction run or
category-JSON repair. Native compaction never reads Work Evidence Markdown or
manifests as memory input or provenance.'''); p.write_text(s); paths.append(rel)
(e/'docs-changed-paths.json').write_text(json.dumps(paths,indent=2)+'\n'); shutil.copy2('/tmp/dr001-docs-followup.py',e/'sync-docs-followup.py')
print('updated phase tables, duplicate activity summary, Work Evidence boundary; docs total',len(paths))
