// Reviewer diagnostic: simulated read-only metadata, intercept the first write.
// No git/gh subprocess, live API, key generation, backup or actual claim.
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { provision } from '../../../../scripts/desktop-package/generate-desktop-signing-key.mjs';
import { base, inventory, repo, lock } from '../../../../scripts/desktop-package/desktop-trust-state.mjs';
const home=mkdtempSync(join(tmpdir(), 'crr-preclaim-')), seen=[];
try {
  const request=path=>{
    seen.push(path);
    if(path===base) return {full_name:repo,admin:true};
    if(path.startsWith(base+'/releases') || path.startsWith(base+'/actions/runs') || path.startsWith(base+'/actions/workflows'))
      throw Error('simulated release-state inspection unavailable');
    return {total_count:0,items:[]};
  };
  provision({home,read:()=>inventory(request),write:(path,method,body)=>{
    if(path!==base+'/actions/variables' || method!=='POST' || body.name!==lock)throw Error('unexpected write');
    throw Error('first mutation would be claim POST (intercepted)');
  }});
} catch(e){console.log(e.message);}
finally{console.log('metadata paths read:',seen.join(', ')); console.log('temporary home entries:',readdirSync(home).length);rmSync(home,{recursive:true,force:true});}
