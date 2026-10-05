// Evidence-only current catalog diagnostic; no migration/source/test fix or user data.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const w=process.cwd(),server=path.join(w,'autobyteus-server-ts');
const { TeamRunPackageCatalog, resetTeamRunPackageCatalog }=await import(pathToFileURL(path.join(server,'dist/run-history/services/team-run-package-catalog.js')));
const root=await fs.mkdtemp(path.join(os.tmpdir(),'crr-003-catalog-proof-'));
const source=path.join(server,'tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-001-persistent-only');
try {
 const value=JSON.parse(await fs.readFile(path.join(source,'team_run_execution_tree.json'),'utf8'));
 const validRoot=value.rootTeam.teamRunId;
 const vdir=path.join(root,'agent_teams',validRoot);
 const idir=path.join(root,'agent_teams','root-unresolved');
 await fs.mkdir(vdir,{recursive:true});await fs.mkdir(idir,{recursive:true});
 for(const name of ['team_run_execution_tree.json','task_delegation_records.json','team_communication_messages.json']) await fs.copyFile(path.join(source,name),path.join(vdir,name));
 const predecessorBytes='{"schemaVersion":3,"broken":true}\n';
 await fs.writeFile(path.join(idir,'team_run_metadata.json'),predecessorBytes);
 const catalog=new TeamRunPackageCatalog(root);await catalog.rebuild();
 const result={admitted:catalog.listAdmittedRootIds(),diagnostics:Object.fromEntries(catalog.getDiagnostics()),predecessorBytesUnchanged:(await fs.readFile(path.join(idir,'team_run_metadata.json'),'utf8'))===predecessorBytes};
 console.log(JSON.stringify(result,null,2));
 if(result.admitted.length || !result.predecessorBytesUnchanged || !result.diagnostics[validRoot]?.includes('address, defaultLaunchConfiguration') || !result.diagnostics['root-unresolved']?.includes('ROOT_RUN_PACKAGE_MISSING_TREE')) throw new Error('catalog witness did not hold');
} finally {resetTeamRunPackageCatalog(root);await fs.rm(root,{recursive:true,force:true});console.log('OWNED_SCRATCH_REMOVED=true');}
