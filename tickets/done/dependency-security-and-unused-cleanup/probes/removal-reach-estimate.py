# Read-only estimate on a pnpm v9 lockfile: which package snapshots become unreachable when given
# direct dependencies are removed from given importers.
import sys, re, yaml
lock = yaml.safe_load(open(sys.argv[1]))
removals = {
 'autobyteus-web': ['chart.js','vue-chartjs','diff-match-patch','html2canvas','jsonrepair','markdown-it-katex','markdown-it-prism','nuxt-electron','@vitejs/plugin-vue','concurrently','xmldom'],
 'autobyteus-ts': ['dotenv','ts-node'],
 'autobyteus-application-frontend-sdk': ['@types/node'], 'autobyteus-team-stream-contracts': ['@types/node'],
 'autobyteus-agent-presentation-contracts': ['@types/node'], 'autobyteus-collaboration-stream-contracts': ['@types/node'],
}
extra = {'autobyteus-web': ['monaco-editor']} if len(sys.argv) > 2 and sys.argv[2] == '--with-doubtful' else {}
snaps = lock['snapshots']
def key(name, ver): return f"{name}@{ver}"
def roots(skip):
    out = []
    for imp, d in lock['importers'].items():
        for sec in ('dependencies','devDependencies','optionalDependencies'):
            for name, spec in (d.get(sec) or {}).items():
                if name in skip.get(imp, []): continue
                v = spec['version']
                if v.startswith('link:'): continue
                out.append(key(name, v))
    return out
def reach(start):
    seen = set(); stack = list(start)
    while stack:
        k = stack.pop()
        if k in seen or k not in snaps: continue
        seen.add(k)
        s = snaps[k] or {}
        for sec in ('dependencies','optionalDependencies'):
            for n, v in (s.get(sec) or {}).items(): stack.append(key(n, v))
    return seen
skip = {k: v + extra.get(k, []) for k, v in removals.items()}
for k, v in extra.items(): skip.setdefault(k, v)
before = reach(roots({})); after = reach(roots(skip))
gone = before - after
base_names = lambda s: {re.sub(r'\(.*$', '', x).rsplit('@', 1)[0] for x in s}
gone_pk = {re.sub(r'\(.*$', '', x) for x in gone}
print(f"manifest entries removed: {sum(len(v) for v in skip.values())}  distinct names: {len({n for v in skip.values() for n in v})}")
before_pk = {re.sub(r"\(.*$", "", x) for x in before}
print("installed package versions before:", len(before_pk), " no longer installed:", len(gone_pk))
print("no longer installed:", ' '.join(sorted(gone_pk)))
