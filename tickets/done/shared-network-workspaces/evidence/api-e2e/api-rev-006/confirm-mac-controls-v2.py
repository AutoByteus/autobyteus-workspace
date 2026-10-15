exec((__import__('pathlib').Path(__file__).resolve().parent/'mac-common.py').read_text())
OUT='mac-controls-confirm-v2-result.json';prior=json.loads((E/'mac-controls-result.json').read_text());r['priorCases']=prior['cases'];r['baseline']=prior['baseline'];r['scope']='Retains immediate chmod/cached access observation; refusal asserted only once normal nonroot fresh open actually observes denial, not instant cache invalidation'
try:
 m('chmod 000 '+SRC);start=time.monotonic()
 for n in range(120):
  q=m('cat '+ROOT+'/project/preexisting.txt',10,False)
  if q['rc']!=0 and 'Permission denied' in q['stderr']:break
  time.sleep(1)
 else:raise RuntimeError('denied access not observed in bounded observation')
 r['deniedAfterSeconds']=time.monotonic()-start;save()
 def refuse_status():
  q=m(B+' status --yes --json',30,False);assert q['rc']!=0 and not json.loads(q['stdout'])['hostReady'] and 'permission denied' in q['stderr'];return q
 case('actual denied nonroot access yields not-ready public status',refuse_status)
 def refuse():
  q=m(B+' reconnect --yes --json',60,False);assert q['rc']!=0 and 'permission denied' in q['stderr'];assert m('sudo -n cat '+Q(STATE+'/hosted-filesystem.json'))['stdout']==r['baseline']['bindingBytes'];return q
 case('actual denied nonroot access yields reconnect refusal',refuse)
finally:
 m('chmod 755 '+SRC)
 # Allow the ordinary client metadata interval to settle; no flush/remount/workaround.
 for n in range(120):
  q=m('cat '+ROOT+'/project/preexisting.txt',10,False)
  if q['rc']==0:break
  time.sleep(1)
 else:raise RuntimeError('restored access not observed')
 r['restored']=m(B+' reconnect --yes --json',90);case('restored mode nonroot mounted RW',lambda:mounted_proof('controls-final'))
r['result']='Pass scoped controls; initial premature assertion retained';save()
