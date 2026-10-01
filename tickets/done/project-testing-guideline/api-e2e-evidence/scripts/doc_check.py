"""Temporary doc probe: TESTING.md scripts, links, anchors; discoverability links (AC-006/AC-007)."""
import json, re, sys, pathlib
root = pathlib.Path(sys.argv[1])
doc = (root / "TESTING.md").read_text()
out = {"lines": len(doc.splitlines())}

def scripts(pkg_dir):
    p = root / pkg_dir / "package.json"
    return set(json.loads(p.read_text()).get("scripts", {})) if p.exists() else None

def slug(h):
    s = h.strip().lower()
    s = re.sub(r"[^\w\- ]", "", s)
    return s.replace(" ", "-")

def anchors(path):
    text = path.read_text()
    return {slug(m.group(2)) for m in re.finditer(r"^(#{1,6})\s+(.+)$", text, re.M)}

# pnpm commands: `pnpm -C <dir> <script>` and root `pnpm <script>`
checks = []
for m in re.finditer(r"pnpm(?: --silent)? -C ([\w\-/]+) ([\w:\-<>]+)", doc):
    d, s = m.group(1), m.group(2)
    if s in ("exec",) or "<" in s: checks.append((d, s, "skip-generic")); continue
    checks.append((d, s, s in (scripts(d) or set())))
for m in re.finditer(r"(?<![-\w])pnpm(?: --silent)? (test:[\w:\-]+|secrets:import|isolated-app|dev)\b", doc):
    checks.append((".", m.group(1), m.group(1) in scripts(".")))
for m in re.finditer(r"`(test:e2e:[\w:\-]+)`", doc):
    checks.append(("autobyteus-web", m.group(1), m.group(1) in scripts("autobyteus-web")))
probe_scripts = sorted(s for s in scripts("autobyteus-web") if s.startswith("test:e2e:"))
out["probe_scripts_available"] = len(probe_scripts)
out["script_checks"] = [{"dir": d, "script": s, "exists": e} for d, s, e in checks]

links = []
for m in re.finditer(r"\]\(([^)\s]+)\)", doc):
    target = m.group(1)
    if target.startswith("http"): continue
    path, _, anchor = target.partition("#")
    p = (root / path).resolve()
    ok = p.exists()
    aok = None
    if ok and anchor:
        aok = anchor in anchors(p)
    links.append({"target": target, "exists": ok, "anchor_ok": aok})
out["links"] = links

disc = {}
for f in ["README.md", "autobyteus-server-ts/AGENTS.md", "autobyteus-web/AGENTS.md", "docs/isolated-app-instances.md"]:
    text = (root / f).read_text()
    found = re.findall(r"\]\(([^)]*TESTING\.md[^)]*)\)", text)
    resolved = [((root / f).parent / t.split("#")[0]).resolve() == (root / "TESTING.md").resolve() for t in found]
    disc[f] = {"links": found, "resolve": resolved}
out["discoverability"] = disc
print(json.dumps(out, indent=1))
