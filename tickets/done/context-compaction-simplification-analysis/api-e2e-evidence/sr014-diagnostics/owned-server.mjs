// Temporary broader-validation launcher. Uses repository bootstrap, not a replacement server.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startBuiltTestServer, removeOwnedTestRuntime, resolveTestDatabaseLocation } from '../../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../../..');
const runtimeRoot=path.join(root,'autobyteus-server-ts/tests/.tmp/sr014-diagnostic-owned');
const databaseUrlOverride='file:./db/sr014-diagnostic-owned.db';
const database=resolveTestDatabaseLocation(databaseUrlOverride);
if(fs.existsSync(runtimeRoot)||fs.existsSync(database.databasePath)) throw new Error('Owned target exists: refuse reuse');
let server;
const stopFile=path.join(here,'stop-owned-server');
try {
 server=await startBuiltTestServer({runtimeRoot,databaseUrlOverride,environment:{LMSTUDIO_HOSTS:'http://localhost:1234'}});
 fs.writeFileSync(path.join(here,'owned-server.json'),JSON.stringify({serverUrl:server.serverUrl,runtimeRoot,database:server.database,pid:server.child.pid},null,2));
 console.log('OWNED_SERVER_READY',server.serverUrl,server.child.pid);
 await new Promise(resolve=>{
   const timer=setInterval(()=>{fs.writeFileSync(path.join(here,'owned-server.log'),server.output());if(fs.existsSync(stopFile)){clearInterval(timer);resolve();}},1000);
   process.once('SIGTERM',()=>{clearInterval(timer);resolve();});
   process.once('SIGINT',()=>{clearInterval(timer);resolve();});
 });
} finally {
 if(server){await server.stop();fs.writeFileSync(path.join(here,'owned-server.log'),server.output());}
 await removeOwnedTestRuntime(runtimeRoot,database);
 fs.writeFileSync(path.join(here,'owned-server-cleanup.json'),JSON.stringify({stopped:true,runtimeRemoved:!fs.existsSync(runtimeRoot),databaseRemoved:!fs.existsSync(database.databasePath)}));
 fs.rmSync(stopFile,{force:true});
 console.log('OWNED_SERVER_CLEANUP_COMPLETE');
}
