#!/usr/bin/env python3
"""IMP link check (autobyteus-517 FU-005, AC-004).

Checks every Markdown link in the repository (outside node_modules, dist and tickets) that points at
autobyteus-web/docs/settings.md or autobyteus-web/docs/agent_execution_architecture.md, with or without an anchor,
plus every same-file anchor link inside those two documents. An anchor must match a heading's GitHub slug.
Usage: python3 check-doc-anchors.py <repository root>
"""
import os
import re
import sys

root = os.path.abspath(sys.argv[1])
targets = {os.path.join(root, "autobyteus-web", "docs", name) for name in ("settings.md", "agent_execution_architecture.md")}
link = re.compile(r"\]\(([^)\s]+)\)")


def slugs(path):
    seen, out, fence = {}, set(), False
    for line in open(path, encoding="utf-8"):
        if line.lstrip().startswith("```"):
            fence = not fence
        if fence or not re.match(r"^#{1,6} ", line):
            continue
        text = re.sub(r"^#{1,6} ", "", line.strip())
        slug = re.sub(r"[^\w\- ]", "", text.lower().replace("`", "")).replace(" ", "-")
        count = seen.get(slug, 0)
        out.add(slug if count == 0 else f"{slug}-{count}")
        seen[slug] = count + 1
    return out


cache, checked, broken = {}, 0, []
for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in ("node_modules", "dist", ".git", "tickets", ".nuxt", ".output", "electron-dist")]
    for name in filenames:
        if not name.endswith(".md"):
            continue
        source = os.path.join(dirpath, name)
        for number, line in enumerate(open(source, encoding="utf-8", errors="replace"), start=1):
            for href in link.findall(line):
                if href.startswith(("http:", "https:", "mailto:")):
                    continue
                file_part, _, anchor = href.partition("#")
                target = source if file_part == "" else os.path.normpath(os.path.join(dirpath, file_part))
                if target not in targets or (file_part == "" and source not in targets):
                    continue
                checked += 1
                if not os.path.exists(target):
                    broken.append(f"{os.path.relpath(source, root)}:{number}: {href} (missing file)")
                    continue
                if anchor and anchor not in cache.setdefault(target, slugs(target)):
                    broken.append(f"{os.path.relpath(source, root)}:{number}: {href} (no such heading)")

print(f"checked {checked} links into settings.md / agent_execution_architecture.md")
for item in broken:
    print("BROKEN", item)
print("RESULT", "PASS" if not broken else f"FAIL ({len(broken)} broken)")
sys.exit(1 if broken else 0)
