import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(new URL('../../../autobyteus-server-ts/package.json',import.meta.url));const WebSocket=require('ws');
const seed=JSON.parse(await fs.readFile(new URL('runtime-seed.json',import.meta.url)));
const agentRunId=seed.executionTree.root_team.members[0].agent_run_id;
const draftOwner={kind:'team_member_draft',teamDraftId:'probe-draft',memberAddress:'/worker'};
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=','base64');
const form=new FormData();form.set('owner',JSON.stringify(draftOwner));form.set('file',new Blob([bytes],{type:'image/png'}),'image.png');
const upload=await fetch('http://127.0.0.1:3421/rest/context-files/upload',{method:'POST',body:form});if(!upload.ok)throw Error(await upload.text());const attachment=await upload.json();
const final=await fetch('http://127.0.0.1:3421/rest/context-files/finalize',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({draftOwner,finalOwner:{kind:'team_member_final',teamRunId:seed.teamRunId,agentRunId},attachments:[attachment]})});if(!final.ok)throw Error(await final.text());const {attachments}=await final.json();
console.log({agentRunId,attachments});await fs.writeFile(new URL('runtime-attachments.json',import.meta.url),JSON.stringify(attachments));
const ws=new WebSocket(`ws://127.0.0.1:3421/ws/agent-team/${seed.teamRunId}`);
let sent=false;let done;const finished=new Promise(r=>done=r);
ws.on('message',raw=>{const event=JSON.parse(String(raw)); console.log(JSON.stringify(event));
 if(event.type==='CONNECTED'&&!sent){sent=true;const id=randomUUID();ws.send(JSON.stringify({type:'SEND_MESSAGE',payload:{agent_run_id:agentRunId,message_id:id,dedupe_key:id,content:'Describe the attached validation image briefly.',context_file_paths:attachments.map(x=>x.locator),image_urls:[]}}));}
 if(JSON.stringify(event).includes('Attachment received.'))setTimeout(()=>{ws.close();done();},500);
});
const timeout=setTimeout(()=>{ws.close();done();},15000);await finished;clearTimeout(timeout);
