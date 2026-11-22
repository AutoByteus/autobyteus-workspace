"""Sample what agents did after each restart notice in the work journals (autobyteus-585)."""
import re, sys, os, json
ROOT = sys.argv[1]
HEADER = "[Platform notice — application restarted]"
ENTRY = re.compile(r"^\[(\d\d:\d\d:\d\d)\] ([A-Za-z][A-Za-z ]{0,30}):(.*)$")
INCOMING = {"User", "Notice"}
ACTION = {"Command", "Write file", "Edit file", "Tool", "Run JavaScript", "Create project task", "Browser",
          "Load skill", "Search web", "Read file", "Search"}
rows = []
for dirpath, _, files in os.walk(ROOT):
    for f in files:
        if not (f.startswith("work_journal") and f.endswith(".md")): continue
        p = os.path.join(dirpath, f)
        lines = open(p, encoding="utf-8", errors="replace").read().split("\n")
        runtime = next((l.split("·")[0].replace("Runtime", "").strip() for l in lines[:3] if l.startswith("Runtime")), "?")
        entries = []
        for l in lines:
            m = ENTRY.match(l)
            if m: entries.append([m.group(1), m.group(2), m.group(3).strip()])
            elif entries: entries[-1][2] += "\n" + l
        for i, (t, kind, text) in enumerate(entries):
            if kind != "Notice" or HEADER not in text: continue
            interrupted = "previous turn was interrupted" in text
            reason = re.search(r"reason: ([^)]*)\)", text)
            prev = entries[i - 1][1] if i else None
            # a notice carried by a user's input: a User entry in the same second, just before or after
            carried = any(entries[j][1] == "User" and entries[j][0] == t for j in (i - 1, i + 1) if 0 <= j < len(entries))
            after = []
            for t2, k2, x2 in entries[i + 1:]:
                if k2 in INCOMING and not (k2 == "User" and t2 == t): break
                after.append((k2, x2))
            acted = any(k in ACTION for k, _ in after)
            texts = [x for k, x in after if k == "Agent"]
            rows.append(dict(file=os.path.relpath(p, ROOT), runtime=runtime, time=t, interrupted=interrupted,
                             reason=reason.group(1) if reason else "?", carried=carried, acted=acted,
                             first_agent_text=(texts[0][:300] if texts else ""), n_after=len(after)))
json.dump(rows, open(sys.argv[2], "w"), indent=1)
from collections import Counter
print("notices:", len(rows))
for key in ("runtime", "reason", "interrupted", "carried"):
    print(key, dict(Counter(r[key] for r in rows)))
print("continued (acted after notice):", sum(r["acted"] for r in rows), "/", len(rows))
c = Counter((r["runtime"], r["interrupted"], r["acted"]) for r in rows)
for k, v in sorted(c.items(), key=str): print("  runtime=%s interrupted=%s acted=%s: %d" % (*k, v))
