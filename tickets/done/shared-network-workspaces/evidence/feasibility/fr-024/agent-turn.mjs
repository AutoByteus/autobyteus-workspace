// Designer feasibility: actual application WebSocket -> real native CLI/model.
// This driver does NOT write/read the project file. Only the instructed agent
// does that. The outer runner separately asserts filesystem bytes and traces.
import WebSocket from 'ws';

const [url, prompt, commandId] = process.argv.slice(2);
const events = [];
const started = Date.now();
let sent = false, busy = false, tools = 0, succeeded = 0, settled = false;
const socket = new WebSocket(url);
function finish(error) {
  if (settled) return;
  settled = true;
  clearTimeout(timer);
  console.log(JSON.stringify({url, commandId, prompt, seconds:(Date.now()-started)/1000, tools, succeeded, events, error:error || null}));
  process.exitCode = error ? 1 : 0;
  socket.close();
  const closeTimer = setTimeout(()=>socket.terminate(),1000);
  closeTimer.unref();
}
const timer = setTimeout(()=>finish('Native agent turn timeout after 180s'),180000);
socket.on('message',raw=>{
  let v;
  try { v=JSON.parse(raw.toString()); } catch { return; }
  if (v.type==='CONNECTED' && !sent) {
    sent = true;
    socket.send(JSON.stringify({type:'SEND_MESSAGE',payload:{message_id:commandId,dedupe_key:'agent_run_input:shared-probe:'+commandId,context_file_paths:[],image_urls:[],content:prompt}}));
    return;
  }
  if (!sent || settled) return;
  events.push(v);
  if (v.type==='TOOL_EXECUTION_STARTED') {tools++;busy=true;}
  if (v.type==='TOOL_EXECUTION_SUCCEEDED') succeeded++;
  if (v.type==='AGENT_STATUS' && ['running','processing','executing_tool'].includes(v.payload?.status)) busy=true;
  if (v.type==='TOOL_APPROVAL_REQUESTED') return finish('Unexpected approval request under selected autoExecuteTools=true; do not silently change permission policy');
  if (v.type==='ERROR' || v.type==='TOOL_EXECUTION_FAILED') return finish(v.type+': '+JSON.stringify(v.payload));
  if (v.type==='AGENT_STATUS' && v.payload?.status==='error') return finish('Agent error status: '+JSON.stringify(v.payload));
  if (v.type==='AGENT_STATUS' && v.payload?.status==='idle' && busy) {
    setTimeout(()=>finish(tools>0 && succeeded>0 ? null : 'Agent finished without observed successful native tool activity'),500);
  }
});
socket.on('error',error=>finish(error.message));
socket.on('close',()=>{if(!settled)finish('Socket closed before completed native agent turn');});
