"""Shadow-render comparison: counts and neutral labels only (no journal text is printed beyond skill and tool names).
Usage: python3 -I analyze.py <before memory dir> <after memory dir>"""
import json, os, re, sys, collections
before_root, after_root = sys.argv[1], sys.argv[2]
HEAD = re.compile(r"^\[\d\d:\d\d:\d\d\] (.*?)(?: \[↗\]\([^)]*\))?$")
def journal_files(root):
    out = {}
    for dirpath, dirs, files in os.walk(root):
        if os.path.basename(dirpath) == "work_journal":
            dirs[:] = []
            for f in files:
                if f.endswith(".md"): out[os.path.relpath(os.path.join(dirpath, f), root)] = os.path.join(dirpath, f)
        elif os.path.basename(dirpath) == "imports": dirs[:] = []
    return out
def entries(path):
    heads = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            m = HEAD.match(line.rstrip("\n"))
            if m: heads.append(m.group(1))
    return heads
RULES = [
 ("skill load", r"^Load skill: "), ("message sent", r"^Message to "), ("task handed over", r"^Delegate task "),
 ("handoff rules", r"^Check handoff rules"),
 ("project board", r"^(Create project task|Update project task|Create or update project task|Read project task|List project tasks|Search project tasks|Create project:|Update project |Create or update project:|List projects|Project task:)"),
 ("browser", r"^Browser: "), ("media", r"^(Generate image|Edit image|Generate speech|Generate video)"),
 ("discovery/memory/artifacts/routing", r"^(List available agents|List peer nodes|List available agent runtimes|Search memory|Publish artifacts|Submit launch choices)"),
 ("claude-only", r"^(Update to-do list|Spawn sub-agent|Look up tools|Create task:|Update task |Read output of background task|Stop background task|Run workflow)"),
 ("codex-only", r"^(Run JavaScript|Reset JavaScript|Add JavaScript|Speak:)"),
 ("autobyteus-only", r"^(Download file|Download video|Convert video|Submit task result)"),
 ("qualified tool", r"^Tool: .* \(via [^)]*\)"),
]
RULES = [(n, re.compile(p)) for n, p in RULES]
b, a = journal_files(before_root), journal_files(after_root)
stats = collections.Counter(); byrule = collections.Counter(); changed_files_by_rule = collections.Counter()
skills = collections.Counter(); skill_cmd_before = 0; skill_cmd_after = 0; tool_after = collections.Counter(); tool_before = collections.Counter()
msg_outcomes = collections.Counter(); size_b = size_a = 0; runs_changed = set(); runs = set()
SKILLRE = re.compile(r"SKILL\.md"); TOOLNAME = re.compile(r"^Tool: (\S+)")
for rel, pa in a.items():
    pb = b.get(rel)
    runs.add(os.path.dirname(os.path.dirname(rel)))
    stats["files_after"] += 1; size_a += os.path.getsize(pa)
    if pb is None: stats["files_only_after"] += 1; continue
    stats["files_before"] += 1; size_b += os.path.getsize(pb)
    hb, ha = entries(pb), entries(pa)
    if len(hb) != len(ha): stats["entry_count_mismatch_files"] += 1
    stats["entries_after"] += len(ha); stats["entries_before"] += len(hb)
    file_rules = set(); file_changed = False
    for x, y in zip(hb, ha):
        if x != y:
            stats["entries_changed"] += 1; file_changed = True
            for name, rx in RULES:
                if rx.match(y): byrule[name] += 1; file_rules.add(name); break
            else: byrule["other"] += 1; file_rules.add("other")
            if y.startswith("Load skill: "):
                skills[y[len("Load skill: "):].split(" → ")[0]] += 1
                if x.startswith("Command:") and SKILLRE.search(x): skill_cmd_before += 1
        if y.startswith("Message to "):
            msg_outcomes[y.rsplit(" → ", 1)[-1].split(":")[0]] += 1
        m = TOOLNAME.match(y)
        if m: tool_after[m.group(1)] += 1
        m = TOOLNAME.match(x)
        if m: tool_before[m.group(1)] += 1
        if y.startswith("Command:") and SKILLRE.search(y): skill_cmd_after += 1
    if file_changed:
        stats["files_changed"] += 1; runs_changed.add(os.path.dirname(os.path.dirname(rel)))
        for r in file_rules: changed_files_by_rule[r] += 1
    elif open(pb, "rb").read() != open(pa, "rb").read(): stats["files_differ_without_entry_change"] += 1
out = {
 "runs_with_journals": len(runs), "runs_with_a_changed_file": len(runs_changed), **stats,
 "bytes_before": size_b, "bytes_after": size_a, "share_files_changed": round(stats["files_changed"] / max(1, stats["files_before"]), 4),
 "entries_changed_by_rule": dict(byrule.most_common()), "files_changed_by_rule": dict(changed_files_by_rule.most_common()),
 "skill_loads_total": sum(skills.values()), "skill_loads_from_command_reads": skill_cmd_before, "command_lines_naming_SKILL_md_left": skill_cmd_after,
 "skill_names_top20": skills.most_common(20), "message_outcomes": dict(msg_outcomes),
 "generic_tool_lines_before": sum(tool_before.values()), "generic_tool_lines_after": sum(tool_after.values()),
 "generic_tool_names_after_top25": tool_after.most_common(25),
 "tool_names_removed_from_generic_top25": [(k, v - tool_after.get(k, 0)) for k, v in tool_before.most_common(25)],
}
print(json.dumps(out, indent=2, ensure_ascii=False))
