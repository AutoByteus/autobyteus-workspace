# Read-only evidence corroboration, not a substitute for durable runtime assertions.
from pathlib import Path
import json,sys
from urllib.parse import urlsplit,parse_qs
base=Path(__file__).resolve().parent
surface=sys.argv[1]
d=json.loads((base/surface/'delegated-launch-defaults-evidence.json').read_text())
r={'surface':surface,'source':'delegated-launch-defaults-evidence.json','variants':[],'settings':{}}
for i,kind in [(1,'Agent'),(2,'Team'),(3,'Org')]:
 c=d['cases'][f'DCP-00{i}'];assert c['result']=='Pass';v=c['details']
 for variant,paint,stop in [('root',v['paint']['reference'],v['rootStop']),('copy',v['paint']['unselected'],v['stop'])]:
  assert paint['rest']['color']==paint['leave']['color']=='rgb(239, 68, 68)'
  assert paint['hover']['color']=='rgb(220, 38, 38)' and paint['hover']['background']=='rgb(254, 242, 242)'
  assert stop['pending']['disabled'] and stop['pending']['paint']['color']==stop['disabledHover']['color']=='rgb(153, 153, 153)'
  assert stop['disabledHover']['background']=='rgba(0, 0, 0, 0)' and stop['disabledHover']['hovered']
  assert stop['requests']==[stop['variables']] and stop['dialogs']==[] and stop['rowBefore']==stop['rowPending']
  assert stop['focus']['active'] and stop['focus']['visible']
  assert next(iter(stop['response']['data'].values()))['success']
  if variant=='copy':
   assert stop['reducedMotion']=='none' and stop['pending']['animation']=='pulse'
   assert v['resumedModels'], 'ordinary message must actually resume the copy'
   assert stop['taskBefore']['taskId']==stop['taskAfter']['taskId'] and stop['taskBefore']['status']==stop['taskAfter']['status']
   assert not stop['taskAfter']['root']['closed']
   h=stop['parentAfterCopyStop'];assert h.get('isActive',h.get('is_active')) is True
  else:
   h=stop['historyAfter'];assert h.get('isActive',h.get('is_active')) is False
  r['variants'].append({'host':kind,'control':variant,'redEnabledGrayDisabledIncludingHover':True,
   'exactOneNativeRequest':stop['variables'],'key':stop['key'],'realSuccess':True,
   'taskPreservedParentActiveAndResumed':variant=='copy','inactiveHistory':variant=='root'})
 target=v.get('sidebarTarget')
 if i==2:assert target['rootRunId']==v['teamRunId'] and target['kind']=='task_team'
 if i==3:
  url=v['rootStop']['urlAfter']; query=urlsplit(url.split('#',1)[1] if '#' in url else url).query
  assert parse_qs(query).get('mode')==['history']
  r['orgHistoryUrl']=url
c=d['cases']['SSR-001'];assert c['result']=='Pass';v=c['details']
assert v['launchesBefore']==v['launchesAfter']
assert v['firstSave']['url']==v['secondSave']['url']==v['cancelled']['url']==v['collaboratorSave']['url']
assert all(v[k]['expanded']=='true' for k in ['firstSave','secondSave','cancelled','collaboratorSave'])
r['settings']['noLaunchAndSameUrl']={'runId':v['runId'],'copyId':v['copyId'],'neighborId':v['neighborId'],
 'first':v['firstSave'],'repeat':v['secondSave']}
v=d['cases']['SSR-003']['details'];assert 'saved' in v['readFailure'] and 'refresh' in v['readFailure']
assert v['committed']['data']['updateDelegatedLaunchSelections']['success']
r['settings']['committedReadFailure']=v['readFailure']
r['settings']['readOnlyRecovered']=v['reconciled']
v=d['cases']['SSR-004']['details']
assert [x['selection']['llmConfig']['reasoning_effort'] for x in v['saves']]==['low','xhigh']
assert all(x['selection']['llmModelIdentifier']=='grok-4.7' for x in v['saves'])
r['settings']['sameModelConfiguration']=v['saves']
r['result']='Pass'
(base/f'{surface}-boundary-proof.json').write_text(json.dumps(r,indent=2)+'\n')
print(surface,'boundary evidence corroborated')
