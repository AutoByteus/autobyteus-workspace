"""Run from task worktree root: python3 tickets/in-progress/restore-team-group-icon/evidence/api-e2e/audit.py"""
from pathlib import Path
import re
import subprocess

base = '4a51482a5ef8c678d69a3ffc995d6876fd170a2f'
files = ['workspace/history/WorkspaceTransientExecutionRow.vue', 'workspace/history/WorkspaceAgentOrgHistoryCollection.vue',
         'projects/ProjectTaskWorkers.vue', 'memory/CollaborationMemoryDetail.vue']
for file in files:
    path = 'autobyteus-web/components/' + file
    old = subprocess.check_output(['git', 'show', f'{base}:{path}']).decode()
    new = Path(path).read_text()
    strip_comments = lambda text: re.sub(r'<!--.*?-->', '', text, flags=re.S)
    assert strip_comments(old.replace('heroicons:bolt-20-solid', 'heroicons:user-group-20-solid')) == strip_comments(new), path
    assert old.count('heroicons:bolt-20-solid') == 1 and 'heroicons:bolt-20-solid' not in new
    print('PASS exact executable source delta:', path, '(one glyph; comments excepted)')
path = 'autobyteus-web/utils/runSettings/modelOptions.ts'
assert subprocess.check_output(['git', 'show', f'{base}:{path}']) == Path(path).read_bytes()
assert "service_tier: 'heroicons:bolt'" in Path(path).read_text()
print('PASS byte-identical Fast/service-tier bolt')
for commit, file in [('d64560aee9f828853c75a0abff7347ec4fbaf54b', files[0]),
                     ('c21d312c0ae952165535c51d6f6de676f6a30b59', files[1]),
                     ('7c2553f486f0a45ecc22d4903753af4de59e0050', files[3]),
                     ('4d469b0c5b8efe10a40dae00a7046680928bcaca', files[2])]:
    print(subprocess.check_output(['git', 'show', '-s', '--format=%H %cI %s', commit]).decode())
    diff = subprocess.check_output(['git', 'diff', commit + '^1', commit, '--', 'autobyteus-web/components/' + file]).decode()
    assert '+ ' in diff and 'bolt-20-solid' in diff
    print('\n'.join(line for line in diff.splitlines() if 'Icon ' in line))
print('PASS pinned source introduction/restyle; no installed-app timing inference')
