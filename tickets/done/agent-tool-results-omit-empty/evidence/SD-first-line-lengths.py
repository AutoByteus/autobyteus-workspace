# Read-only (autobyteus-260): first-line lengths of every stored Project Task description. Numbers only.
import json, glob, os, statistics
ROOT = os.path.expanduser('~/.autobyteus/server-data/projects')
lens = []
for f in glob.glob(ROOT + '/project_*/tasks/*/task.json'):
    d = json.load(open(f)).get('description', '')
    lines = [l.strip() for l in d.strip().split('\n') if l.strip()]
    lens.append(len(lines[0]) if lines else 0)
lens.sort(); n = len(lens)
print('tasks', n, 'median', statistics.median(lens), 'p90', lens[int(n * 0.9)], 'max', lens[-1],
      '<=120', sum(l <= 120 for l in lens), '<=160', sum(l <= 160 for l in lens), '<=200', sum(l <= 200 for l in lens), 'empty', sum(l == 0 for l in lens))
