// Metadata only. Never return arbitrary gh diagnostics, API bodies or auth material.
import { spawnSync } from 'node:child_process';
import { createHash, createPublicKey } from 'node:crypto';
import { userInfo } from 'node:os';

export const repo = 'AutoByteus/autobyteus-workspace', base = 'repos/' + repo;
export const envName = 'desktop-release-signing', envPath = base + '/environments/' + envName;
export const pub = 'DESKTOP_RELEASE_PUBLIC_KEY', priv = 'DESKTOP_RELEASE_PRIVATE_KEY';
export const lock = 'DESKTOP_RELEASE_PROVISIONING_CLAIM', pattern = 'v*.*.*';
export function requireState(ok, message) { if (!ok) throw Error(message); }
export function gh(args, input, maxBuffer = 2**20, spawn = spawnSync) {
  const result = spawn('gh', args, { input, maxBuffer, timeout: 30000, stdio:['pipe','pipe','pipe'],
    env:{HOME:userInfo().homedir, PATH:'/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin', GH_HOST:'github.com', GH_PROMPT_DISABLED:'1', GH_NO_UPDATE_NOTIFIER:'1'} });
  requireState(!result.error && result.status === 0, 'GitHub request failed or its result is unknown. Inspect permissions and state; do not retry writes blindly.');
  return result.stdout;
}
export function api(path, method='GET', body, jq) {
  const args=['api','--hostname','github.com','--method',method,path];
  if(body!==undefined) args.push('--input','-');
  // gh prints strings unquoted; serialize projections explicitly.
  if(jq) args.push('--jq','('+jq+') | @json');
  const out=gh(args, body===undefined ? undefined : JSON.stringify(body)).toString().trim();
  try { return out ? JSON.parse(out) : undefined; }
  catch { throw Error('GitHub returned unreadable metadata; stop and inspect.'); }
}
export function paged(path, field, project='.',request=api) {
  const all=[],seen=new Set(); let expected;
  for(let page=1;page<=50;page++){
    const data=request(path+(path.includes('?')?'&':'?')+'per_page=100&page='+page,'GET',undefined,
      '{total_count,items:(.'+field+' | map('+project+'))}');
    requireState(Number.isSafeInteger(data.total_count) && data.total_count>=0 && Array.isArray(data.items),'Incomplete GitHub inventory');
    expected ??= data.total_count;
    requireState(data.total_count===expected && all.length+data.items.length<=expected,'Inventory changed during inspection');
    for (const item of data.items) {
      const key=typeof item==='string'?item:item?.id??item?.name;
      requireState(key!==undefined && !seen.has(key),'Duplicate or indeterminate GitHub inventory');
      seen.add(key);all.push(item);
    }
    if(all.length===expected) return all;
    requireState(data.items.length===100,'Truncated GitHub inventory');
  }
  throw Error('Inventory exceeds inspection limit');
}
export function anchor(pem) {
  requireState(typeof pem==='string' && /^-----BEGIN PUBLIC KEY-----\n[A-Za-z0-9+/=\n]+\n-----END PUBLIC KEY-----\n?$/.test(pem),'Expected exactly one desktop public SPKI PEM');
  let key; try { key=createPublicKey(pem); } catch { throw Error('Invalid desktop public key'); }
  requireState(key.asymmetricKeyType==='ed25519' && key.export({type:'spki',format:'pem'}).trim()===pem.trim(),'Invalid Ed25519 public anchor');
  return createHash('sha256').update(key.export({type:'spki',format:'der'})).digest('hex');
}
export function inventory(request=api) {
  const list=(p,f,project)=>paged(p,f,project,request);
  const repository=request(base,'GET',undefined,'{full_name,admin:.permissions.admin}');
  requireState(repository.full_name===repo && repository.admin===true,'Official repo admin inspection required');
  const names=(path,field)=>list(path,field,'.name').map(n=>n.toUpperCase());
  const vars=names(base+'/actions/variables','variables');
  const forbidden=(list,allowed=[])=>requireState(!list.some(n=>[priv,pub,lock].includes(n)&&!allowed.includes(n)),'Conflicting desktop trust scope; stop and inspect');
  forbidden(vars,[pub,lock]);
  forbidden(names(base+'/actions/organization-variables','variables'));
  forbidden(names(base+'/actions/secrets','secrets'));
  forbidden(names(base+'/actions/organization-secrets','secrets'));
  let environment=null,secret=null,policies=[];
  for(const entry of list(base+'/environments','environments','{name,id}')){
    requireState(entry.name.toLowerCase()!==envName || entry.name===envName,'Conflicting signing environment name');
    const path=base+'/environments/'+encodeURIComponent(entry.name);
    forbidden(names(path+'/variables','variables'));
    const secrets=list(path+'/secrets','secrets','{name,created_at,updated_at}');
    forbidden(secrets.map(s=>s.name.toUpperCase()),entry.name===envName?[priv]:[]);
    if(entry.name===envName) {
      environment=request(path); requireState(environment.id===entry.id && environment.name===envName,'Environment identity changed');
      secret=secrets.find(s=>s.name.toUpperCase()===priv)??null;
      requireState(!secret || secret.name===priv,'Noncanonical signing secret declaration');
      if(environment.deployment_branch_policy?.custom_branch_policies)
        policies=list(path+'/deployment-branch-policies','branch_policies','{name,type}');
    }
  }
  const value=name=>request(base+'/actions/variables/'+name,'GET',undefined,'.value');
  const publicVar=vars.includes(pub)?request(base+'/actions/variables/'+pub,'GET',undefined,'{value,updated_at}'):null;
  const claim=vars.includes(lock)?value(lock):null;
  requireState(!vars.includes(pub) || (typeof publicVar?.value==='string' && publicVar.value.length && Number.isFinite(Date.parse(publicVar.updated_at))),'Cannot inspect declared public anchor');
  requireState(!vars.includes(lock) || (typeof claim==='string' && claim.length),'Cannot inspect declared provisioning claim');
  return {pem:publicVar?.value??null,publicUpdated:publicVar?.updated_at,claim,environment,secret,policies};
}
export function checkPolicy(s) {
  const e=s.environment,p=e?.deployment_branch_policy;
  requireState(Number.isSafeInteger(e?.id) && p?.custom_branch_policies===true && p.protected_branches===false &&
    Array.isArray(e.protection_rules) && e.protection_rules.every(r=>r.type==='branch_policy') &&
    s.policies.length===1 && s.policies[0].type==='tag' && s.policies[0].name===pattern,
    'Desktop signing environment must allow only the release tag pattern and have no other gates');
}
export function complete(s) {
  checkPolicy(s);
  requireState(s.secret?.name===priv && Number.isFinite(Date.parse(s.secret.created_at)) && Number.isFinite(Date.parse(s.secret.updated_at)),'Missing scoped desktop signing secret or timestamps');
  return anchor(s.pem);
}
