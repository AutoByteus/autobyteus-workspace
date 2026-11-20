import { NativeCommandProcessScope } from "autobyteus-ts";
import { describe, expect, it, vi } from 'vitest';
import { AutoByteusAgentRunBackendFactory } from '../../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js';
import { AgentRunConfig } from '../../../../../src/agent-execution/domain/agent-run-config.js';
import { AgentDefinition } from '../../../../../src/agent-definition/domain/models.js';
import { OFF_DISCOVERY } from "../../../../helpers/explicit-host-collaborators.js";

describe('native registered workspace resolution before provider acquisition',()=>{
 it('propagates a registered directory failure rather than falling back',async()=>{
  const workspaceManager={getRegisteredWorkspaceRootPath:vi.fn(async()=>'/ordinary/registered'),
   getOrCreateRunWorkspace:vi.fn(async()=>{throw Error('registered filesystem unavailable');}),getOrCreateTempWorkspace:vi.fn()};
  const createLLM=vi.fn();
  const factory=new AutoByteusAgentRunBackendFactory({ peerDiscovery: OFF_DISCOVERY, nativeCommandProcessScope: new NativeCommandProcessScope(),workspaceManager:workspaceManager as never,createLLM,
   agentDefinitionService:{getAgentDefinitionById:async()=>new AgentDefinition({id:'fixture',name:'Fixture',role:'test',description:'fixture'})} as never});
  await expect(factory.beginPreparation({kind:'new',runId:'registered-run',config:new AgentRunConfig({runtimeKind:'autobyteus',agentDefinitionId:'fixture',llmModelIdentifier:'',autoExecuteTools:false,workspaceId:'registered'})}).prepare()).rejects.toThrow('registered filesystem unavailable');
  expect(workspaceManager.getOrCreateRunWorkspace).toHaveBeenCalledWith('registered');
  expect(workspaceManager.getOrCreateTempWorkspace).not.toHaveBeenCalled();expect(createLLM).not.toHaveBeenCalled();
 });
});
