// Sequential implementation of the approved API-REV-003 rerun plan. Stops at the first nonpassing runner.
import fs from 'node:fs/promises';import{createWriteStream}from'node:fs';import{spawn}from'node:child_process';import{resolve}from'node:path';
const ticket=resolve('tickets/in-progress/backend-port-conflict-20261024'),out=resolve(ticket,'evidence/API-REV-003');
const cases=[['API-05','API-05-conflict-recovery.mjs'],['API-06B','API-06B-desktop-native-current.mjs'],['API-07','API-07-packaged-ipc.mjs'],['API-09','API-09-desktop-visibility.mjs'],['API-09B','API-09B-selection-lifecycle.mjs'],['API-10','API-10-provider-unavailable.mjs']];
for(const[id,file]of cases){
 const resultFile=resolve(out,id+'-result.json');if(await fs.access(resultFile).then(()=>true,()=>false))throw Error('Refusing duplicate case output '+id);
 await fs.appendFile(resolve(ticket,'api-e2e-test-progress.md'),`| ${new Date().toISOString()} | ${id} | Started | | Integrated9b10fcd4d; ${file}; output evidence/API-REV-003. |\n`);
 const log=createWriteStream(resolve(out,id+'-run.log'));
 const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,TEST_API_EVIDENCE_DIR:out};
 const child=spawn(process.execPath,[resolve(ticket,'evidence',file)],{cwd:process.cwd(),env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
 const code=await new Promise((r,j)=>{child.once('error',j);child.once('close',r)});await new Promise(r=>log.end(r));
 const result=await fs.readFile(resultFile,'utf8').then(JSON.parse,()=>null);const passed=code===0&&result?.result==='Pass';
 await fs.appendFile(resolve(ticket,'api-e2e-test-progress.md'),`| ${new Date().toISOString()} | ${id} | Completed | ${passed?'Pass, integrated':'Runner failed; classify before rerun'} | Exit${code}, ${id}-result.json / run.log; inspect exact proof/cleanup. |\n`);
 const report=resolve(ticket,'api-e2e-execution-coverage-report.md');let text=await fs.readFile(report,'utf8');const at=text.indexOf('Post-repository scorecard50/');if(at<0)throw Error('Current report insertion marker missing');text=text.slice(0,at)+`| ${id} | C + ${file}, TEST_API_EVIDENCE_DIR=evidence/API-REV-003; ${id}-result.json/run.log | ${passed?'Pass':'Nonpass, classification pending'} on integrated9b10fcd4d; exit${code}. |\n\n`+text.slice(at);await fs.writeFile(report,text);
 console.log(JSON.stringify({id,code,result:result?.result,error:result?.error??null}));if(!passed){process.exitCode=1;break;}
}
