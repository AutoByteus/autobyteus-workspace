# Checks the stage of an AUTOBYTEUS_NPM_BEFORE rebuild: no direct dependency of the staged server package was installed at a version
# published after the bound, and which direct dependencies had newer stable versions the bound kept out.
# usage: python3 API-05-published-before-check.py <stageDir> <bound ISO UTC, e.g. 2026-10-30T12:00:00+00:00>
import json, os, sys, datetime, urllib.request
stage, bound = sys.argv[1], datetime.datetime.fromisoformat(sys.argv[2])
pkg = json.load(open(os.path.join(stage, 'package.json')))
def times(name):
    with urllib.request.urlopen('https://registry.npmjs.org/' + name.replace('/', '%2F')) as r: return json.load(r)['time']
over, excluded, checked = [], [], 0
for d in sorted(pkg.get('dependencies', {})):
    p = os.path.join(stage, 'node_modules', d, 'package.json')
    if not os.path.exists(p): print('missing', d); continue
    v = json.load(open(p))['version']
    try: t = times(d)
    except Exception as e: print('not on the registry (workspace package):', d); continue
    checked += 1
    published = datetime.datetime.fromisoformat(t[v].replace('Z', '+00:00'))
    if published > bound: over.append((d, v, t[v]))
    later = [k for k, x in t.items() if k not in ('created', 'modified') and '-' not in k and datetime.datetime.fromisoformat(x.replace('Z', '+00:00')) > bound]
    if later: excluded.append((d, v, len(later)))
print('direct registry dependencies checked:', checked)
print('installed at a version published after the bound:', over)
print('had stable versions published after the bound, kept out by it:', excluded)
