# IMP-09 (autobyteus-260): read-only shape parameters of the AutoByteus Project's open Tasks, so the after-size
# measurement synthesizes data with the user's shapes. Numbers only: lengths and counts, never text. Opens files read-only;
# writes nothing under the data root. Usage: python3 -I IMP-09-shape-parameters.py > IMP-09-shape-parameters-output.json
import json, glob, os
ROOT = os.path.expanduser('~/.autobyteus/server-data/projects')
for pdir in glob.glob(ROOT + '/project_*'):
    if not os.path.exists(pdir + '/project.json'): continue
    if json.load(open(pdir + '/project.json'))['taskKeys']['prefix'] != 'autobyteus': continue
    rows = []
    for tdir in sorted(glob.glob(pdir + '/tasks/*')):
        f = tdir + '/task.json'
        if not os.path.exists(f): continue
        t = json.load(open(f))
        if t['status'] not in ('TODO', 'IN_PROGRESS'): continue
        lines = [l.strip() for l in t['description'].strip().split('\n') if l.strip()]
        res = tdir + '/agent_run_resources.json'
        entries = json.load(open(res)).get('agentRunResources', []) if os.path.exists(res) else []
        assigned = [e for e in entries if e.get('role') == 'assigned']
        rows.append({
            'status': t['status'],
            'firstLineChars': len(lines[0]) if lines else 0,
            'descriptionBytes': len(t['description'].encode('utf-8')),
            'comments': len(t.get('comments') or []),
            'dependsOn': len(t.get('dependsOnTaskIds') or []),
            'partOf': bool(t.get('partOfTaskId')),
            'openAssignments': sum(1 for e in assigned if e.get('closedAt') is None),
            'openTeamAssignments': sum(1 for e in assigned if e.get('closedAt') is None and (e.get('agentRun') or {}).get('kind') == 'team'),
        })
    print(json.dumps({'project': 'autobyteus', 'openTasks': len(rows), 'tasks': rows}))
