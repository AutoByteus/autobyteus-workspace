# Read-only shape inventory of stored task.json files (autobyteus-260). Prints key sets and counts only; no values.
import json, glob, os, collections
ROOT = os.path.expanduser('~/.autobyteus/server-data')
for label, pattern in [('project task.json', ROOT + '/projects/*/tasks/*/task.json'), ('ad-hoc task.json', ROOT + '/ad-hoc-tasks/*/task.json')]:
    shapes = collections.Counter(); notes = collections.Counter(); n = 0
    for f in glob.glob(pattern):
        n += 1
        try: d = json.load(open(f))
        except Exception: notes['unreadable'] += 1; continue
        shapes[tuple(sorted(d.keys()))] += 1
        desc = d.get('description')
        if not isinstance(desc, str) or not desc.strip(): notes['description missing/blank'] += 1
        if 'title' in d: notes['has title'] += 1
        if 'taskKey' not in d and label.startswith('project'): notes['no taskKey'] += 1
        if isinstance(desc, str) and desc != desc.strip(): notes['description not trimmed'] += 1
        if isinstance(desc, str) and '\r' in desc: notes['description has CR'] += 1
    print(label, 'files', n)
    for k, c in shapes.most_common(): print('  shape', c, list(k))
    for k, c in notes.items(): print('  note', k, c)
