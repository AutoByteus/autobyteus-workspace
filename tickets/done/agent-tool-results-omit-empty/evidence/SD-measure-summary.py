# Read-only: list_project_tasks summary-mode size estimate (autobyteus-260). Numbers only.
import json, glob, os
ROOT = os.path.expanduser('~/.autobyteus/server-data/projects')
def c(v): return len(json.dumps(v, ensure_ascii=False, separators=(',', ':')).encode())
for pdir in glob.glob(ROOT + '/project_*'):
    if not os.path.exists(pdir + '/project.json'): continue
    pr = json.load(open(pdir + '/project.json'))
    if pr['taskKeys']['prefix'] != 'autobyteus': continue
    tasks = [json.load(open(f)) for f in glob.glob(pdir + '/tasks/*/task.json')]
    by = {t['taskId']: t for t in tasks}
    for label, keep in [('open', lambda t: t['status'] in ('TODO', 'IN_PROGRESS')), ('all', lambda t: True)]:
        out = []
        for t in tasks:
            if not keep(t): continue
            line = t['description'].strip().split('\n', 1)[0].strip()
            r = {'taskId': t['taskKey'], 'status': t['status'], 'summary': line[:159] + ('…' if len(line) > 160 else '')}
            d = [by[i]['taskKey'] for i in t.get('dependsOnTaskIds', []) if i in by]
            if d: r['dependsOn'] = d
            if t.get('partOfTaskId') in by: r['partOf'] = by[t['partOfTaskId']]['taskKey']
            if t.get('comments'): r['commentCount'] = len(t['comments'])
            # one open assignment, typical shape
            r['assignments'] = [{'kind': 'team', 'teamRunId': 'x' * 40, 'teamCoordinatorAgentRunId': 'y' * 50, 'assignedBy': 'z' * 50, 'outcome': 'accepted'}] if t['status'] == 'IN_PROGRESS' else None
            if r['assignments'] is None: del r['assignments']
            out.append(r)
        print(label, len(out), 'summary-mode bytes', c({'projectId': pr['projectId'], 'tasks': out}))
