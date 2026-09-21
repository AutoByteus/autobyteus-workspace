#!/usr/bin/env python3
import hashlib, json, urllib.error, urllib.request
from pathlib import Path
BASE='http://127.0.0.1:51381'
team='software_engineering_team_18262a8ace9447e29f7f92b8940a94fd'
member='%2Fsolution_designer'
tfile='ctx_e14b3d2aed9f__image.png'
org='nested_classroom_test_team_50a66215ad3648688d73998834c9ceb4'
agent='student_one_600a8c0f902c4bfb87c03e6bbb73aae5'
ofile='ctx_c2e359d21475__image.png'
cases=[
 ('team_valid_before',f'/rest/team-runs/{team}/members/{member}/context-files/{tfile}',200),
 ('team_malformed_member',f'/rest/team-runs/{team}/members/not-rooted/context-files/{tfile}',400),
 ('team_unsafe_filename',f'/rest/team-runs/{team}/members/{member}/context-files/..%2Fsecret.txt',400),
 ('team_missing_owner',f'/rest/team-runs/missing-containing-team/members/{member}/context-files/{tfile}',404),
 ('team_cross_owner_member',f'/rest/team-runs/{team}/members/%2FStudentStudyGroup%2Fstudent_one/context-files/{tfile}',404),
 ('team_missing_exact_file',f'/rest/team-runs/{team}/members/{member}/context-files/ctx_missing__exact.png',404),
 ('team_valid_after',f'/rest/team-runs/{team}/members/{member}/context-files/{tfile}',200),
 ('org_valid_before',f'/rest/agent-org-runs/{org}/agent-runs/{agent}/context-files/{ofile}',200),
 ('org_unsafe_filename',f'/rest/agent-org-runs/{org}/agent-runs/{agent}/context-files/..%2Fsecret.txt',400),
 ('org_missing_owner',f'/rest/agent-org-runs/missing-org/agent-runs/{agent}/context-files/{ofile}',404),
 ('org_cross_owner_agent',f'/rest/agent-org-runs/{org}/agent-runs/api_e2e_engineer_450b25f17f2245fe89b9c52cd17038ae/context-files/{ofile}',404),
 ('org_missing_exact_file',f'/rest/agent-org-runs/{org}/agent-runs/{agent}/context-files/ctx_missing__exact.png',404),
 ('org_valid_after',f'/rest/agent-org-runs/{org}/agent-runs/{agent}/context-files/{ofile}',200),
]
out=[]
for name,path,expected in cases:
 req=urllib.request.Request(BASE+path,method='GET')
 try:
  with urllib.request.urlopen(req,timeout=15) as resp:
   body=resp.read(); status=resp.status; headers=dict(resp.headers)
 except urllib.error.HTTPError as e:
  body=e.read(); status=e.code; headers=dict(e.headers)
 row={'name':name,'path':path,'expected':expected,'status':status,'pass':status==expected,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'contentType':headers.get('Content-Type'),'bodyPreview':body[:240].decode('utf-8','replace') if status!=200 else None}
 out.append(row); print(name,status,'PASS' if row['pass'] else 'FAIL',len(body),row['sha256'][:16])
p=Path('tickets/in-progress/application-startup-latency-analysis/validation/api-e2e/live-rest-matrix.json')
p.write_text(json.dumps({'base':BASE,'cases':out,'allPass':all(x['pass'] for x in out)},indent=2)+'\n')
if not all(x['pass'] for x in out): raise SystemExit(1)
