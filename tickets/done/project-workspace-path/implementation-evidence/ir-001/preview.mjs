// Implementation-only browser preview. Same owned built backend/Nuxt surface as projects-feature-probe.
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
const root = process.cwd();
const out = path.join(root, 'tickets/in-progress/project-workspace-path/implementation-evidence/ir-001');
const data = await fs.mkdtemp(path.join(os.tmpdir(), 'project-path-preview-'));
const free = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const backendPort = await free(), frontendPort = await free();
const backend = `http://127.0.0.1:${backendPort}`, frontend = `http://127.0.0.1:${frontendPort}`;
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('ENABLE_') && !k.startsWith('AUTOBYTEUS_') && !k.startsWith('BACKEND_')));
const db = pathToFileURL(path.join(data, 'db', 'preview.db')).href;
for(const dir of ['db', 'logs', 'memory', 'temp_workspace', 'registered-folder']) await fs.mkdir(path.join(data,dir));
Object.assign(env, {APP_ENV:'development', DB_TYPE:'sqlite', DATABASE_URL:db, AUTOBYTEUS_SERVER_HOST:backend,
  AUTOBYTEUS_LOG_DIR:path.join(data,'logs'), AUTOBYTEUS_MEMORY_DIR:path.join(data,'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR:path.join(data,'temp_workspace')});
await fs.writeFile(path.join(data,'.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${db}\nAUTOBYTEUS_SERVER_HOST=${backend}\n`);
// Owned registration fixture for inspecting picker => path; no user data or filesystem service involved.
await fs.writeFile(path.join(data,'workspaces.json'), JSON.stringify({agent_ws_preview: path.join(data,'registered-folder')}));
const processes = [];
const start = (command,args,cwd,env,name) => {const log=createWriteStream(path.join(out,name+'.log')); const c=spawn(command,args,{cwd,env,detached:true,stdio:['ignore','pipe','pipe']}); c.stdout.pipe(log); c.stderr.pipe(log); c.once('close',()=>log.end()); processes.push(c); return c;};
let stopping = false;
async function stop(){if(stopping)return; stopping=true; for(const c of processes.reverse()) {if(c.exitCode!==null || c.signalCode) continue; process.kill(-c.pid,'SIGTERM'); await Promise.race([new Promise(r=>c.once('close',r)),new Promise(r=>setTimeout(r,8000))]); if(c.exitCode===null&&!c.signalCode) process.kill(-c.pid,'SIGKILL');} await fs.rm(data,{recursive:true,force:true}); await fs.writeFile(path.join(out,'preview-cleanup.json'),JSON.stringify({dataRemoved:true,processes:processes.map(c=>({pid:c.pid,exitCode:c.exitCode,signal:c.signalCode}))},null,2)); process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
const migration=start('pnpm',['exec','prisma','migrate','deploy','--schema','./prisma/schema.prisma'],path.join(root,'autobyteus-server-ts'),env,'preview-migrate');
await new Promise((resolve,reject)=>migration.once('close',code=>code===0?resolve():reject(new Error('migrate failed'))));
start(process.execPath,['dist/app.js','--host','127.0.0.1','--port',String(backendPort),'--data-dir',data],path.join(root,'autobyteus-server-ts'),env,'preview-backend');
start('pnpm',['dev','--host','127.0.0.1','--port',String(frontendPort)],path.join(root,'autobyteus-web'),{...env,NODE_ENV:'development',BACKEND_NODE_BASE_URL:backend},'preview-frontend');
await fs.writeFile(path.join(out,'preview-target.json'),JSON.stringify({data,backend,frontend,pid:process.pid},null,2));
console.log(JSON.stringify({data,backend,frontend,pid:process.pid}));
