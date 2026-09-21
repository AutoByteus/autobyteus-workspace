import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  CollaborationLaunchConfigurationResolver,
} from "../../../src/agent-collaboration/services/collaboration-launch-configuration-resolver.js";
import type { AgentLaunchConfiguration } from "../../../src/agent-team-execution/domain/team-run-config.js";
import type { ResolvedAgentOrgDefinition } from "../../../src/agent-collaboration/definition/resolved-collaboration-topology.js";
import type { ResolvedFlatTeamDefinition } from "../../../src/agent-team-definition/services/flat-team-definition-resolver.js";

const rootConfiguration: AgentLaunchConfiguration = {
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  llmModelIdentifier: 'root-model',
  llmConfig: { temperature: 0.4 },
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  workspaceRootPath: '/workspace/root',
};

const topology = {
  definition: {} as ResolvedAgentOrgDefinition['definition'],
  definitionId: 'delivery-org',
  members: [{
    kind: 'agent',
    memberName: 'requirements',
    agentDefinitionId: 'requirements-agent',
    absolutePath: ['requirements'],
  }, {
    kind: 'agent_team',
    memberName: 'software',
    teamDefinitionId: 'software-team',
    absolutePath: ['software'],
    team: {
      definition: {} as ResolvedFlatTeamDefinition["definition"],
      definitionId: 'software-team',
      mountPath: ['software'],
      coordinator: {
        kind: 'agent',
        memberName: 'architect',
        agentDefinitionId: 'architect-agent',
        absolutePath: ['software', 'architect'],
      },
      members: [{
        kind: 'agent',
        memberName: 'architect',
        agentDefinitionId: 'architect-agent',
        absolutePath: ['software', 'architect'],
      }, {
        kind: 'agent',
        memberName: 'implementer',
        agentDefinitionId: 'implementer-agent',
        absolutePath: ['software', 'implementer'],
      }],
    },
  }],
} as ResolvedAgentOrgDefinition;

describe('CollaborationLaunchConfigurationResolver AgentOrg placement equality', () => {
  it('preserves omission as inheritance and explicit null as provider-config clearing', () => {
    const resolved = new CollaborationLaunchConfigurationResolver().resolveOrg({
      topology,
      rootConfiguration,
      teamOverrides: [{
        address: '/software',
        configuration: {
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          llmModelIdentifier: 'team-model',
          llmConfig: null,
          autoExecuteTools: true,
          workspaceRootPath: '/workspace/software',
        },
      }],
      agentOverrides: [{
        address: '/software/implementer',
        configuration: {
          llmModelIdentifier: 'agent-model',
          llmConfig: { reasoningEffort: 'high' },
        },
      }],
    });

    expect(resolved.root).toEqual(rootConfiguration);
    expect(resolved.agents.get('/requirements')).toEqual(rootConfiguration);
    expect(resolved.teams.get('/software')).toEqual({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: 'team-model',
      llmConfig: null,
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      workspaceRootPath: '/workspace/software',
    });
    expect(resolved.agents.get('/software/architect')).toEqual(resolved.teams.get('/software'));
    expect(resolved.agents.get('/software/implementer')).toEqual({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: 'agent-model',
      llmConfig: { reasoningEffort: 'high' },
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      workspaceRootPath: '/workspace/software',
    });
  });
});
