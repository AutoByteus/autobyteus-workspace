# IMP-18; 2026-10-26; run from task worktree; bounded R3 implementation self-review.
import json, re, subprocess
from pathlib import Path
W=Path.cwd(); E=W/'tickets/in-progress/nfs-guide-install-commands/evidence'
BASE='0c27b150d2fd01a573b49aa45597ff78e5b6fc0d'
def old(p): return subprocess.check_output(['git','show',BASE+':'+p],text=True)
p='autobyteus-web/components/settings/NfsGuideCard.vue'; before=old(p); after=(W/p).read_text()
assert before.split('<script setup')[1]==after.split('<script setup')[1]
assert before.splitlines()[:50]==after.splitlines()[:50]
removed={'advanced','limitations','deferred'}; shortened={'workspaceHint','trustDetail','outageDetail'}
locales={}
for locale in ['en','zh-CN']:
 p=f'autobyteus-web/localization/messages/{locale}/settings.ts'; b=old(p); a=(W/p).read_text()
 def unrelated(s): return '\n'.join(l for l in s.splitlines() if not any('NfsGuideCard.'+k+'"' in l for k in removed|shortened))
 assert unrelated(b)==unrelated(a)
 for k in removed: assert 'NfsGuideCard.'+k+'"' not in a
 for k in shortened: assert 'NfsGuideCard.'+k+'"' in a
 locales[locale]={'removed':sorted(removed),'shortened':sorted(shortened),'otherLinesUnchanged':True}
commands='autobyteus-web/utils/nfsLauncherCommands.ts'
assert old(commands)==(W/commands).read_text()
for p in ['autobyteus-web/components/settings/NodeManager.vue','autobyteus-web/components/settings/DockerNodeStartGuideCard.vue','autobyteus-web/utils/dockerNodeLauncherCommands.ts','pnpm-lock.yaml','autobyteus-web/package.json']:
 assert old(p)==(W/p).read_text()
paths=subprocess.check_output(['git','diff','--name-only',BASE,'HEAD','--',':(exclude)tickets'],text=True).splitlines()
assert len(paths)==5
sizes={p:len([l for l in (W/p).read_text().splitlines() if l.strip()]) for p in paths if p.endswith(('.vue','.ts')) and '__tests__' not in p}
assert all(v<=500 for v in sizes.values())
# Check real product references, not historical evidence or the negative tests.
scan=subprocess.run(['rg','-n','NfsGuideCard\\.(advanced|limitations|deferred)', 'autobyteus-web/components','autobyteus-web/localization','autobyteus-web/utils'],capture_output=True,text=True)
assert scan.returncode==1,scan.stdout
j={'check':'IMP-18','date':'2026-10-26','commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'base':BASE,'result':'Pass','nonTicketDelta':paths,'commandHelperAndPinUnchanged':True,'componentCardsAndEntireScriptUnchanged':True,'parentDockerAndDependencyInputsUnchanged':True,'localeDelta':locales,'nonemptySourceLines':sizes,'deadKeyProductReferences':0,'scope':'Small/Low; no runtime, API, persistence or policy changes; no refactor/new compatibility path','limitations':'Focused structural self-review, not independent API acceptance'}
(E/'IMP-18-self-review.json').write_text(json.dumps(j,indent=2)+'\n');print(json.dumps(j,indent=2))
