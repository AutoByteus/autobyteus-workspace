# Read-only size measurement for autobyteus-260 (Solution Designer). Reads ~/.autobyteus/server-data/projects;
# writes nothing; prints numbers only (no Task content). Reproduces list_project_tasks' result shape from
# project-task-tool-manifest.ts at 8b34e8ae10 (taskBusinessRead) as compact JSON.
import json, glob, os, sys, urllib.parse
ROOT = os.path.expanduser('~/.autobyteus/server-data/projects')
def compact(v): return json.dumps(v, ensure_ascii=False, separators=(',', ':'))
def pretty(v): return json.dumps(v, ensure_ascii=False, indent=2)
def prune(v):
    if isinstance(v, dict):
        out = {}
        for k, x in v.items():
            x = prune(x)
            if x is None or x == [] or x == {}: continue
            out[k] = x
        return out
    if isinstance(v, list): return [prune(x) for x in v]
    return v
def nbytes(s): return len(s.encode('utf-8'))
results = []
for pdir in sorted(glob.glob(ROOT + '/project_*')):
    pf = os.path.join(pdir, 'project.json')
    if not os.path.exists(pf): continue
    project = json.load(open(pf)); pid = project['projectId']
    tasks = []
    for tf in glob.glob(pdir + '/tasks/*/task.json'):
        t = json.load(open(tf)); t['_dir'] = os.path.dirname(tf); tasks.append(t)
    by_id = {t['taskId']: t for t in tasks}
    parts = {}
    for t in tasks:
        p = t.get('partOfTaskId')
        if p and p in by_id: parts.setdefault(p, []).append(t['taskKey'])
    def assignments(t):
        f = os.path.join(t['_dir'], 'agent_run_resources.json')
        if not os.path.exists(f): return [], []
        try: d = json.load(open(f))
        except Exception: return [], []
        op, cl = [], []
        for e in d.get('agentRunResources', []):
            if e.get('role') != 'assigned': continue
            run = e.get('agentRun') or {}
            out = {'started': 'accepted', 'starting': 'not_confirmed', 'failed': 'failed'}.get(e.get('start'), 'not_confirmed')
            v = ({'kind': 'agent', 'agentRunId': run.get('agentRunId')} if run.get('kind') == 'agent'
                 else {'kind': 'team', 'teamRunId': run.get('teamRunId'), 'teamCoordinatorAgentRunId': run.get('coordinatorAgentRunId')})
            v.update({'assignedBy': e.get('assignedBy'), 'outcome': out})
            (op if e.get('closedAt') is None else cl).append(v)
        return op, cl
    def read(t):
        op, cl = assignments(t)
        cfs = [{'storedFilename': f['storedFilename'], 'displayName': f['displayName'], 'mimeType': f['mimeType'], 'sizeBytes': f['sizeBytes'],
                'locator': '/rest/projects/%s/tasks/%s/context-files/%s' % (urllib.parse.quote(pid, safe=''), urllib.parse.quote(t['taskId'], safe=''), urllib.parse.quote(f['storedFilename'], safe='')),
                'localPath': os.path.join(t['_dir'], 'context', f['storedFilename'])} for f in t.get('contextFiles', [])]
        r = {'projectId': pid, 'taskId': t['taskKey'], 'description': t['description'], 'status': t['status'],
             'dependsOn': [by_id[i]['taskKey'] for i in t.get('dependsOnTaskIds', []) if i in by_id],
             'partOf': by_id[t['partOfTaskId']]['taskKey'] if t.get('partOfTaskId') in by_id else None,
             'parts': sorted(parts.get(t['taskId'], [])), 'contextFiles': cfs}
        if t.get('comments'): r['comments'] = [c['text'] for c in t['comments']]
        r['assignments'] = op; r['closedAssignments'] = cl
        return r
    for label, keep in [('all', lambda t: True), ('open', lambda t: t['status'] in ('TODO', 'IN_PROGRESS')), ('DONE', lambda t: t['status'] == 'DONE')]:
        sel = [t for t in tasks if keep(t)]
        if not sel: continue
        res = {'projectId': pid, 'tasks': [read(t) for t in sel]}
        pr = prune(res)
        # Variant: context files as {displayName, localPath} only.
        slim = json.loads(compact(pr))
        for x in slim['tasks']:
            if 'contextFiles' in x: x['contextFiles'] = [{'name': f['displayName'], 'path': f['localPath']} for f in x['contextFiles']]
        desc = sum(nbytes(t['description']) for t in sel)
        results.append((project['taskKeys']['prefix'], label, len(sel), nbytes(compact(res)), nbytes(compact(pr)), nbytes(compact(slim)), desc))
print('prefix | tasks | n | now (compact) | omit-empty | +slim context files | of which descriptions')
for r in results: print(' | '.join(str(x) for x in r))
# Per-Task empty-field frequency, across all Tasks
cnt = {'dependsOn': 0, 'partOf': 0, 'parts': 0, 'contextFiles': 0, 'assignments': 0, 'closedAssignments': 0}; n = 0

# Pretty-print overhead on the same reconstructed result (AutoByteus Project, open Tasks) and on a synthesized
# dom_snapshot-shaped result (200 elements with role, name, tag, selector and a bounding box).
for pdir in glob.glob(ROOT + '/project_*'):
    pass
synthetic = {'tab_id': 't-1', 'elements': [{'element_id': 'e%d' % i, 'tag': 'button', 'role': 'button', 'name': 'Action %d' % i,
             'text': None if i % 3 else 'Click', 'selector': '#main > div:nth-child(%d) > button' % i,
             'bounding_box': {'x': 10 + i, 'y': 20 + i, 'width': 120, 'height': 32}} for i in range(200)]}
print('synthetic dom_snapshot: pretty', nbytes(pretty(synthetic)), 'compact', nbytes(compact(synthetic)), 'compact+omit-empty', nbytes(compact(prune(synthetic))))
