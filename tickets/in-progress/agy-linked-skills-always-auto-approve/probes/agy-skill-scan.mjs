import fs from "node:fs"; import path from "node:path";
const roots = process.argv.slice(2);
const inside=(r,c)=>{const x=path.relative(r,c);return x===""||(x!==".."&&!x.startsWith(".."+path.sep)&&!path.isAbsolute(x));};
const check=(skillDir)=>{
  const trusted=fs.realpathSync(skillDir); const problems=[];
  if (fs.lstatSync(skillDir).isSymbolicLink()) problems.push("skill dir itself is a symlink (provenance)");
  const walk=(d)=>{for(const n of fs.readdirSync(d).sort()){const e=path.join(d,n);const s=fs.lstatSync(e);
    if(s.isDirectory()){walk(e);continue;}
    if(!s.isFile()&&!s.isSymbolicLink()){problems.push(`non-regular entry: ${e}`);continue;}
    let c; try{c=fs.realpathSync(e);}catch(err){problems.push(`broken symlink: ${e} -> ${fs.readlinkSync(e)}`);continue;}
    if(!inside(trusted,c)) problems.push(`escapes skill root: ${e} -> ${c}`);
    else if(!fs.statSync(c).isFile()) problems.push(`symlink to non-file: ${e} -> ${c}`);
    else if(fs.statSync(c).size>32*1024*1024) problems.push(`too large: ${e}`);}};
  try{walk(fs.realpathSync(skillDir));}catch(err){problems.push(`walk error: ${err.message}`);}
  return problems;
};
const scan=(dir,seen=new Set())=>{ if(!fs.existsSync(dir))return; const rp=fs.realpathSync(dir); if(seen.has(rp))return; seen.add(rp);
  for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const p=path.join(dir,ent.name); let isDir=ent.isDirectory(); if(ent.isSymbolicLink()){try{isDir=fs.statSync(p).isDirectory()}catch{}}
    if(!isDir) continue; if(!fs.existsSync(path.join(p,"SKILL.md"))) continue;
    const pr=check(p); if(pr.length) console.log(`FAIL ${p}\n  - ${pr.join("\n  - ")}`); else console.log(`ok   ${p}`);}
  const nested=path.join(dir,"skills"); if(fs.existsSync(nested)&&fs.statSync(nested).isDirectory()) scan(nested,seen);
};
for(const r of roots) scan(r);
