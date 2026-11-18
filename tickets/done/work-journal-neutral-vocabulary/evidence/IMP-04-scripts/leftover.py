import os, re, collections, sys
root = "/tmp/wjnv/shadow/before/memory"; base = "/tmp/wjnv/shadow/baseline/memory"
cls = collections.Counter(); other = collections.Counter()
HEAD = re.compile(r"^\[\d\d:\d\d:\d\d\] (Command: .*?)(?: \[↗\]\([^)]*\))?$")
for dp, dn, fn in os.walk(root):
    if os.path.basename(dp) == "imports": dn[:] = []; continue
    if os.path.basename(dp) != "work_journal": continue
    dn[:] = []
    for f in fn:
        if not f.endswith(".md"): continue
        with open(os.path.join(dp, f), encoding="utf-8") as fh:
            for line in fh:
                m = HEAD.match(line.rstrip("\n"))
                if not m or "SKILL.md" not in m.group(1): continue
                c = m.group(1)[len("Command: "):]
                if re.search(r"&&|;|\|\||\n", c): k = "chained (&& ; ||)"
                elif "|" in c and not re.match(r"^cat -n \S+ \| sed -n '\d+,(\d+|\$)p'", c): k = "piped"
                elif re.match(r"^(ls|find|grep|rg|wc|stat|file|test|\[)\b", c): k = "ls/find/grep/stat (not a read)"
                elif len(re.findall(r"\S*SKILL\.md", c)) > 1: k = "several skill files"
                elif re.match(r"^(cat|sed|head|nl|tail|bat)\b", c):
                    p = re.findall(r"(\S*/([^/\s]+)/SKILL\.md)", c)
                    folder = re.search(r"/([^/\s]+)/[^/\s]+/SKILL\.md", c)
                    k = "plain read, folder not a skills folder: " + (folder.group(1) if folder and not folder.group(1).endswith("skills") else "other form") if folder and not folder.group(1).endswith("skills") else "plain read, other form (" + c.split()[0] + ")"
                else: k = "other command (" + c.split()[0] + ")"
                cls[k] += 1
for k, v in cls.most_common(15): print(v, k)
