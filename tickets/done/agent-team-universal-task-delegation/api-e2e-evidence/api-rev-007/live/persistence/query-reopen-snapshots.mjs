import { readFile, writeFile } from 'node:fs/promises';
const [phase,outPath]=process.argv.slice(2); if(!phase||!outPath)throw new Error('usage');
const base=process.env.GRAPHQL_URL??'http://127.0.0.1:60312/graphql';
const providerDir=new URL('../provider/',import.meta.url);
const ids=[
  JSON.parse(await readFile(new URL('codex-direct-create.json',providerDir))).teamRunId,
  JSON.parse(await readFile(new URL('classroom-autobyteus-create.json',providerDir))).teamRunId,
];
const query=`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId isActive executionTree} getTaskDelegationRecords(teamRunId:$id){taskId delegatorAgentRunId recipientAddress targetAgentRunId targetTeamRunId status description createdAt updates{kind submissionId reviewId reviewedSubmissionId decision content createdAt} referenceFiles{referenceId path type createdAt updatedAt}} getTeamCommunicationMessages(teamRunId:$id){messageId senderAgentRunId receiverAgentRunId content messageType createdAt referenceFiles{referenceId path type createdAt updatedAt}}}`;
const gql=async(id)=>{const r=await fetch(base,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables:{id}})});const j=await r.json();if(!r.ok||j.errors?.length)throw new Error(JSON.stringify(j.errors??j));return j.data};
const runs=[];for(const id of ids)runs.push({teamRunId:id,data:await gql(id)});const result={phase,at:new Date().toISOString(),runs};await writeFile(outPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
