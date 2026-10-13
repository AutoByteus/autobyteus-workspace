// Measurement-only source swap: restore exact changed bytes even after probe failure.
import fs from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = process.cwd(), out = process.argv[2];
const paths = ['autobyteus-web/stores/agentRunCollaborationStore.ts','autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts'];
const changed = await Promise.all(paths.map(p=>fs.readFile(p)));
const baseline = paths.map(p=>execFileSync('git',['show',`3230db73f172690c4c8eb08f1cc5891c62ffcdbd:${p}`]));
const sha = b=>createHash('sha256').update(b).digest('hex');
const receipt = {baseline:'3230db73f172690c4c8eb08f1cc5891c62ffcdbd',changed:'b9cbb749182d95a63750f70369ec08956018c5e8', files:paths.map((path,i)=>({path,baseline:sha(baseline[i]),changed:sha(changed[i])}))};
try {
 for(let i=0;i<paths.length;i++)await fs.writeFile(paths[i],baseline[i]);
 const code = await new Promise((resolve,reject)=>{const c=spawn('pnpm',['-C','autobyteus-web','test:e2e:delegated-team-default-collapse','--baseline','--output-dir',out],{cwd:root,env:process.env,stdio:'inherit'});c.once('error',reject);c.once('exit',resolve)});
 receipt.probeExit=code;process.exitCode=code;
} finally {
 for(let i=0;i<paths.length;i++)await fs.writeFile(paths[i],changed[i]);
 receipt.restored=await Promise.all(paths.map(async(p,i)=>sha(await fs.readFile(p))===sha(changed[i])));
 await fs.writeFile(out+'-source-receipt.json',JSON.stringify(receipt,null,2));
}
