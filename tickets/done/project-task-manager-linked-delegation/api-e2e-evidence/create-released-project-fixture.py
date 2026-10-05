import subprocess,tempfile,json,hashlib
from pathlib import Path
root=Path.cwd();e=root/'tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence';out=root/'autobyteus-server-ts/tests/fixtures/projects-released-array.json'
with tempfile.TemporaryDirectory(prefix='task-linked-released-writer-') as tmp:
 p=Path(tmp);a=p/'source.tar'
 with a.open('wb') as f:subprocess.run(['git','archive','HEAD','autobyteus-server-ts','autobyteus-ts'],stdout=f,check=True)
 subprocess.run(['tar','-xf',str(a),'-C',tmp],check=True)
 for name in ['autobyteus-server-ts','autobyteus-ts']:(p/name/'node_modules').symlink_to(root/name/'node_modules',target_is_directory=True)
 server=p/'autobyteus-server-ts';test=server/'tests/unit/projects/released-fixture-producer.test.ts'
 test.write_text('''import fs from 'node:fs/promises';import path from 'node:path';import {it,expect} from 'vitest';import {ProjectStore} from '../../../src/projects/stores/project-store.js';
it('writes a representative array through the exact HEAD ProjectStore writer',async()=>{const root=process.env.OWNED_FIXTURE_ROOT!;const store=new ProjectStore({getAppDataDir:()=>root});const stamp='2026-10-02T00:00:00.000Z';await store.updateRecords(()=>[{projectId:'cf622a33-4f56-4208-9baa-851813ba9570',name:'Released array witness',description:'Test-owned released-writer fixture',createdAt:stamp,updatedAt:stamp,workspaces:[],tasks:[{taskId:'f6d550e5-22d0-4aca-a4d3-8413a735546b',description:'Saved task from HEAD writer',status:'TODO',contextFiles:[],createdAt:stamp,updatedAt:stamp}]}]);const bytes=await fs.readFile(store.getFilePath());expect(Array.isArray(JSON.parse(bytes.toString()))).toBe(true);await fs.writeFile(process.env.OWNED_FIXTURE_OUT!,bytes);});''')
 import os
 env={**os.environ,'OWNED_FIXTURE_ROOT':str(p/'data'),'OWNED_FIXTURE_OUT':str(out)}
 with (e/'api-011-fixture-producer.log').open('w') as f:r=subprocess.run(['pnpm','exec','vitest','run','tests/unit/projects/released-fixture-producer.test.ts','--no-watch'],cwd=server,env=env,stdout=f,stderr=subprocess.STDOUT)
 if r.returncode:raise RuntimeError('HEAD writer failed; see log')
 head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();writer=subprocess.check_output(['git','show','HEAD:autobyteus-server-ts/src/projects/stores/project-store.ts'])
 (e/'api-011-fixture-provenance.json').write_text(json.dumps({'head':head,'producer':'Archived HEAD ProjectStore.updateRecords; real released array writer; no current schema/helper generation','fixture':str(out),'fixtureSha256':hashlib.sha256(out.read_bytes()).hexdigest(),'writerSha256':hashlib.sha256(writer).hexdigest(),'scope':'Representative released Project with saved TODO Task/no attachments; not every released malformed variant','dependencies':'Archived HEAD server/core source with shared installed node_modules; default isolated scratch DB reset; scratch removed'},indent=2)+'\n')
 print(out)
