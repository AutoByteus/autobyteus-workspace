import { AgentContext } from '~/types/agent/AgentContext';
import type {
  AgentTeamContext,
  AgentTeamMemberNode,
  SubTeamMemberNode,
  TeamMemberNode,
} from '~/types/agent/AgentTeamContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  createTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';

const ROOT_TEAM_RUN_ID = 'root-team-run-1';
const NOW = '2026-08-10T12:00:00.000Z';

const agent = (address: string, displayName: string): AgentTeamMemberNode => ({
  kind: 'agent',
  address,
  displayName,
  agentDefinitionId: `${displayName.toLowerCase()}-definition`,
  agentRunId: `${displayName.toLowerCase()}-persistent-run`,
  currentStatus: AgentStatus.Idle,
});

const agentContext = (node: AgentTeamMemberNode): AgentContext => {
  const config = {
    agentDefinitionId: node.agentDefinitionId,
    agentDefinitionName: node.displayName,
    llmModelIdentifier: 'gpt-5.6-luna',
    runtimeKind: 'autobyteus' as const,
    workspaceId: null,
    workspaceMetadata: null,
    autoExecuteTools: true,
    skillAccessMode: 'NONE' as const,
    isLocked: true,
    llmConfig: null,
  };
  const state = new AgentRunState(node.agentRunId, {
    id: node.agentRunId,
    messages: [],
    createdAt: NOW,
    updatedAt: NOW,
    agentDefinitionId: node.agentDefinitionId,
    agentName: node.displayName,
    llmModelIdentifier: config.llmModelIdentifier,
  });
  state.currentStatus = AgentStatus.Idle;
  return new AgentContext(config, state);
};

const walk = (node: TeamMemberNode, visit: (candidate: TeamMemberNode) => void): void => {
  visit(node);
  if (node.kind === 'agent_team') node.children.forEach((child) => walk(child, visit));
};

export const buildCurrentTaskExecutionTeam = (): AgentTeamContext => {
  const teacher = agent('/Teacher', 'Teacher');
  const studentOne = agent('/StudentStudyGroup/student_one', 'student_one');
  const labOne = agent('/StudentStudyGroup/LabGroup/lab_one', 'lab_one');
  const labTwo = agent('/StudentStudyGroup/LabGroup/lab_two', 'lab_two');
  const labGroup: SubTeamMemberNode = {
    kind: 'agent_team',
    address: '/StudentStudyGroup/LabGroup',
    displayName: 'LabGroup',
    teamDefinitionId: 'lab-group-definition',
    teamRunId: 'lab-group-persistent-run',
    coordinatorAddress: labOne.address,
    children: [labOne, labTwo],
  };
  const studentTwo = agent('/StudentStudyGroup/student_two', 'student_two');
  const studyGroup: SubTeamMemberNode = {
    kind: 'agent_team',
    address: '/StudentStudyGroup',
    displayName: 'StudentStudyGroup',
    teamDefinitionId: 'study-group-definition',
    teamRunId: 'study-group-persistent-run',
    coordinatorAddress: studentOne.address,
    children: [studentOne, labGroup, studentTwo],
  };
  const rootTeam: SubTeamMemberNode = {
    kind: 'agent_team',
    address: '/',
    displayName: 'Nested Classroom Test Team',
    teamDefinitionId: 'nested-classroom-definition',
    teamRunId: ROOT_TEAM_RUN_ID,
    coordinatorAddress: teacher.address,
    children: [teacher, studyGroup],
  };
  const memberNodesByAddress = new Map<string, TeamMemberNode>();
  const agentExecutionsByKey = new Map<string, AgentContext>();
  walk(rootTeam, (node) => {
    memberNodesByAddress.set(node.address, node);
    if (node.kind === 'agent') {
      const address = createTeamExecutionAddress({
        rootTeamRunId: ROOT_TEAM_RUN_ID,
        memberAddress: node.address,
      });
      agentExecutionsByKey.set(serializeTeamExecutionAddress(address), agentContext(node));
    }
  });
  return {
    teamRunId: ROOT_TEAM_RUN_ID,
    config: {
      teamDefinitionId: rootTeam.teamDefinitionId,
      teamDefinitionName: rootTeam.displayName,
      runtimeKind: 'autobyteus',
      workspaceId: null,
      workspaceMetadata: null,
      llmModelIdentifier: 'gpt-5.6-luna',
      llmConfig: null,
      autoExecuteTools: true,
      skillAccessMode: 'NONE',
      memberOverrides: {},
      isLocked: true,
    },
    rootTeam,
    memberNodesByAddress,
    agentExecutionsByKey,
    focusedExecutionAddress: createTeamExecutionAddress({
      rootTeamRunId: ROOT_TEAM_RUN_ID,
      memberAddress: teacher.address,
    }),
    isActive: true,
    isSubscribed: true,
  };
};

export const taskAgentAddress = (input: {
  memberAddress?: string;
  taskTeamRunIds?: string[];
  taskAgentRunId?: string;
} = {}): TeamExecutionAddress => createTeamExecutionAddress({
  rootTeamRunId: ROOT_TEAM_RUN_ID,
  taskTeamRunIds: input.taskTeamRunIds ?? [],
  memberAddress: input.memberAddress ?? '/Teacher',
  taskAgentRunId: input.taskAgentRunId ?? 'task-agent-run-1',
});

export const taskTeamCoordinatorAddress = (input: {
  nested?: boolean;
  taskTeamRunIds?: string[];
} = {}): TeamExecutionAddress => createTeamExecutionAddress({
  rootTeamRunId: ROOT_TEAM_RUN_ID,
  taskTeamRunIds: input.taskTeamRunIds ?? (input.nested ? ['task-team-outer', 'task-team-inner'] : ['task-team-outer']),
  memberAddress: input.nested
    ? '/StudentStudyGroup/LabGroup/lab_one'
    : '/StudentStudyGroup/student_one',
  taskAgentRunId: null,
});

type TaskStatus = 'active' | 'awaiting_review' | 'accepted';

const eventName = (status: TaskStatus): string => status === 'active'
  ? 'TASK_DELEGATION_ACTIVATED'
  : status === 'awaiting_review'
    ? 'TASK_DELEGATION_SUBMITTED'
    : 'TASK_DELEGATION_REVIEWED';

export const taskAgentEvent = (input: {
  status?: TaskStatus;
  address?: TeamExecutionAddress;
  senderAddress?: TeamExecutionAddress;
  taskId?: string;
  description?: string;
} = {}) => {
  const status = input.status ?? 'active';
  const address = input.address ?? taskAgentAddress();
  const senderAddress = input.senderAddress ?? createTeamExecutionAddress({
    rootTeamRunId: ROOT_TEAM_RUN_ID,
    taskTeamRunIds: address.taskTeamRunIds,
    memberAddress: '/StudentStudyGroup/student_one',
  });
  const taskId = input.taskId ?? 'task-agent-0001';
  return {
    type: 'TASK_DELEGATION_EVENT',
    payload: {
      event_type: eventName(status),
      execution_address: address,
      senderAddress,
      taskId,
      taskLabel: 'Task Agent exercise',
      description: input.description ?? 'Solve the delegated classroom exercise.',
      status,
      decision: status === 'accepted' ? 'accept' : null,
      updatedAt: status === 'active' ? NOW : status === 'awaiting_review' ? '2026-08-10T12:01:00.000Z' : '2026-08-10T12:02:00.000Z',
      target: { kind: 'agent', address: address.memberAddress },
      execution: {
        kind: 'task_agent',
        taskAgentInstance: {
          taskAgentRunId: address.taskAgentRunId,
          owningTeamRunId: address.taskTeamRunIds.at(-1) ?? address.rootTeamRunId,
          taskId,
        },
      },
      referenceFiles: [],
      taskArguments: {
        target: { kind: 'agent', address: address.memberAddress },
        description: input.description ?? 'Solve the delegated classroom exercise.',
        reference_files: [],
      },
    },
  } as const;
};

export const taskTeamEvent = (input: {
  nested?: boolean;
  status?: TaskStatus;
  taskId?: string;
  taskTeamRunIds?: string[];
  senderAddress?: TeamExecutionAddress;
  description?: string;
} = {}) => {
  const nested = input.nested ?? false;
  const status = input.status ?? 'active';
  const address = taskTeamCoordinatorAddress({ nested, taskTeamRunIds: input.taskTeamRunIds });
  const targetAddress = nested ? '/StudentStudyGroup/LabGroup' : '/StudentStudyGroup';
  const taskId = input.taskId ?? (nested ? 'task-team-inner-0002' : 'task-team-outer-0001');
  const taskTeamRunId = address.taskTeamRunIds.at(-1)!;
  const senderAddress = input.senderAddress ?? createTeamExecutionAddress({
    rootTeamRunId: ROOT_TEAM_RUN_ID,
    taskTeamRunIds: address.taskTeamRunIds.slice(0, -1),
    memberAddress: nested ? '/StudentStudyGroup/student_one' : '/Teacher',
  });
  const description = input.description ?? (nested
    ? 'Coordinate the nested laboratory exercise.'
    : 'Coordinate the study-group exercise.');
  return {
    type: 'TASK_DELEGATION_EVENT',
    payload: {
      event_type: eventName(status),
      execution_address: address,
      senderAddress,
      taskId,
      taskLabel: nested ? 'Nested lab task' : 'Study-group task',
      description,
      status,
      decision: status === 'accepted' ? 'accept' : null,
      updatedAt: status === 'active' ? NOW : status === 'awaiting_review' ? '2026-08-10T12:01:00.000Z' : '2026-08-10T12:02:00.000Z',
      target: {
        kind: 'agent_team',
        address: targetAddress,
        coordinatorAddress: address.memberAddress,
      },
      execution: {
        kind: 'task_team',
        taskTeamInstance: {
          taskTeamRunId,
          parentTeamRunId: address.taskTeamRunIds.at(-2) ?? address.rootTeamRunId,
          taskId,
        },
      },
      tasks: [{
        taskId,
        taskLabel: nested ? 'Nested lab task' : 'Study-group task',
        description,
        status,
        referenceFiles: [],
        taskArguments: {
          target: { kind: 'agent_team', address: targetAddress },
          description,
          reference_files: [],
        },
      }],
    },
  } as const;
};

export const currentTaskExecutionRootTeamRunId = ROOT_TEAM_RUN_ID;
