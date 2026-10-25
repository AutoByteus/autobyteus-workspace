# IMP-10 / IR002: current focused repository checks, no installer execution.
# From task worktree: python3 tickets/in-progress/nfs-guide-install-commands/evidence/IMP-10-checks.py
import pathlib, subprocess, json, os, datetime
w=pathlib.Path.cwd(); e=w/'tickets/in-progress/nfs-guide-install-commands/evidence'; s=pathlib.Path(json.loads((e/'IMP-08-environment.json').read_text())['scratch'])
env={'PATH':os.environ['PATH'],'HOME':str(s/'home'),'TMPDIR':str(s/'tmp')}
c=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
checks=[('unit',['pnpm','-C','autobyteus-web','test:nuxt','utils/__tests__/nfsLauncherCommands.spec.ts','components/settings/__tests__/NfsGuideCard.spec.ts','components/settings/__tests__/NodeManager.spec.ts','components/settings/__tests__/DockerNodeStartGuideCard.spec.ts','utils/__tests__/dockerNodeLauncherCommands.spec.ts','--run','--maxWorkers=2']),('typecheck',['pnpm','-C','autobyteus-web','exec','tsc','--noEmit','--skipLibCheck','--target','es2022','--module','esnext','--moduleResolution','bundler','utils/nfsLauncherCommands.ts'])]
checks += [(k,['pnpm','-C','autobyteus-web',k]) for k in ['guard:web-boundary','guard:localization-boundary','audit:localization-literals']]
results=[]
for name,cmd in checks:
 date=datetime.datetime.now(datetime.timezone.utc).isoformat(); p=e/('IMP-10-'+name.replace(':','-')+'.log')
 with p.open('w') as f:
  f.write(f'IMP-10 / {name}; {date}; commit {c}; macOS arm64 Node22 private HOME/TMPDIR\nCommand: {cmd!r}\n'); f.flush()
  r=subprocess.run(cmd,cwd=w,env=env,stdout=f,stderr=subprocess.STDOUT)
  f.write(f'\nexit={r.returncode}\n')
 results.append({'check':name,'command':cmd,'date':date,'commit':c,'exit':r.returncode,'log':p.name}); print(name,r.returncode,flush=True)
(e/'IMP-10-checks.json').write_text(json.dumps(results,indent=2)+'\n')
raise SystemExit(int(any(r['exit'] for r in results)))
