#!/bin/bash
# IMP-11 dev-stack check of the Projects-owned record (IR-002). Usage: imp11.sh <phase: create|after-restart> <dataDir>
G=http://127.0.0.1:8000/graphql; D=$2
q() { curl -s $G -H 'content-type: application/json' -d "$1"; echo; }
if [ "$1" = create ]; then
  echo "## createProject"
  P=$(q '{"query":"mutation($i: CreateProjectInput!){createProject(input:$i){projectId}}","variables":{"i":{"name":"AutoByteus","description":"d","workspaces":[{"workspaceRootPath":"/tmp/pln-ws/autobyteus-folder","description":"repo"}]}}}' | python3 -c 'import json,sys;print(json.load(sys.stdin)["data"]["createProject"]["projectId"])')
  echo "projectId=$P"; echo "$P" > /tmp/pln-shots/imp11-project
  echo "## prepareAgentRun under the Project"
  q "{\"query\":\"mutation(\$i: CreateAgentRunInput!){prepareAgentRun(input:\$i){success message runId}}\",\"variables\":{\"i\":{\"agentDefinitionId\":\"project-task-manager\",\"workspaceRootPath\":\"/tmp/pln-ws/autobyteus-folder\",\"llmModelIdentifier\":\"test-model\",\"autoExecuteTools\":false,\"runtimeKind\":\"autobyteus\",\"initialSummary\":\"started under AutoByteus\",\"projectId\":\"$P\"}}}"
  echo "## prepareAgentRun with an unknown Project"
  q '{"query":"mutation($i: CreateAgentRunInput!){prepareAgentRun(input:$i){success message runId}}","variables":{"i":{"agentDefinitionId":"project-task-manager","workspaceRootPath":"/tmp/pln-ws/autobyteus-folder","llmModelIdentifier":"test-model","autoExecuteTools":false,"runtimeKind":"autobyteus","projectId":"project_missing"}}}'
fi
P=$(cat /tmp/pln-shots/imp11-project)
echo "## projectRunHistory ($1)"
q "{\"query\":\"{ projectRunHistory(projectId: \\\"$P\\\") { agentDefinitions { agentName runs { runId summary } } scopes { rootKind rootRunId } } }\"}"
echo "## stored files"
cd $D && python3 -c "
import json,glob
print('project_runs.json:', json.dumps(json.load(open(glob.glob('projects/*/project_runs.json')[0]))))
rows=json.load(open(glob.glob('**/run_history_index.json',recursive=True)[0]))
print('index row keys:', sorted(set(k for r in rows for k in r)))
for f in glob.glob('**/agents/*/run_metadata.json',recursive=True): print('metadata keys:', sorted(json.load(open(f)).keys()))
"
