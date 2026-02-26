import type { AgentTeam } from '../../agent-team/agent-team.js';
import { AgentTeamStatus } from '../../agent-team/status/agent-team-status.js';
import {
  AgentEventRebroadcastPayload,
  AgentTeamStatusUpdateData,
  SubTeamEventRebroadcastPayload,
  type AgentTeamStreamEvent
} from '../../agent-team/streaming/agent-team-stream-events.js';
import { StreamEventType } from '../../agent/streaming/events/stream-events.js';
import { ToolApprovalRequestedData } from '../../agent/streaming/events/stream-event-payloads.js';
import type { StreamEvent } from '../../agent/streaming/stream-events.js';
import { AgentStatus } from '../../agent/status/status-enum.js';
import type { Task } from '../../task-management/task.js';
import { TaskStatus } from '../../task-management/base-task-plan.js';
import {
  TasksCreatedEventSchema,
  TaskStatusUpdatedEventSchema,
  type TasksCreatedEvent,
  type TaskStatusUpdatedEvent
} from '../../task-management/events.js';

const isAgentEventPayload = (data: unknown): data is AgentEventRebroadcastPayload => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const candidate = data as Record<string, unknown>;
  return 'agent_name' in candidate && 'agent_event' in candidate;
};

const isSubTeamEventPayload = (data: unknown): data is SubTeamEventRebroadcastPayload => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const candidate = data as Record<string, unknown>;
  return 'sub_team_node_name' in candidate && 'sub_team_event' in candidate;
};

const isTeamStatusPayload = (data: unknown): data is AgentTeamStatusUpdateData => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  return 'new_status' in (data as Record<string, unknown>);
};

export type NodeData = {
  type: 'team' | 'subteam' | 'agent';
  name: string;
  role?: string | null;
  children: Record<string, NodeData>;
};

export type UiHistoryEvent =
  | { event_type: 'ui_user_message'; data: { content: string } }
  | { event_type: 'ui_tool_decision'; data: { content: string } };

export type HistoryEvent = StreamEvent | UiHistoryEvent;

type AgentTeamLike = {
  name: string;
  role?: string | null;
  runtime?: {
    context?: {
      config?: {
        nodes?: Array<{ nodeDefinition?: { role?: string | null; name?: string } }>;
      };
    };
  };
};

export class TuiStateStore {
  teamName: string;
  teamRole: string | null;
  focusedNodeData: NodeData | null = null;
  version = 0;

  nodeRoles: Record<string, string>;
  nodes: Record<string, NodeData>;
  agentStatuses: Record<string, AgentStatus> = {};
  teamStatuses: Record<string, AgentTeamStatus>;
  agentEventHistory: Record<string, HistoryEvent[]> = {};
  teamEventHistory: Record<string, AgentTeamStreamEvent[]> = {};
  pendingApprovals: Record<string, ToolApprovalRequestedData> = {};
  speakingAgents: Record<string, boolean> = {};
  taskPlans: Record<string, Task[]> = {};
  taskStatuses: Record<string, Record<string, TaskStatus>> = {};
  private dirty = false;

  constructor(team: AgentTeam) {
    const teamLike = team as unknown as AgentTeamLike;
    this.teamName = teamLike.name;
    this.teamRole = teamLike.role ?? null;

    this.nodeRoles = this.extractNodeRoles(teamLike);
    this.nodes = this.initializeRootNode();
    this.teamStatuses = { [this.teamName]: AgentTeamStatus.UNINITIALIZED };
    this.teamEventHistory = { [this.teamName]: [] };
  }

  processEvent(event: AgentTeamStreamEvent): void {
    this.version += 1;
    this.dirty = true;

    if (event.event_source_type === 'TEAM' && isTeamStatusPayload(event.data)) {
      this.teamStatuses[this.teamName] = event.data.new_status as AgentTeamStatus;
    }

    this.processEventRecursively(event, this.teamName);
  }

  getTreeData(): Record<string, NodeData> {
    return JSON.parse(JSON.stringify(this.nodes)) as Record<string, NodeData>;
  }

  getHistoryForNode(nodeName: string, nodeType: string): HistoryEvent[] {
    if (nodeType === 'agent') {
      return this.agentEventHistory[nodeName] ?? [];
    }
    return [];
  }

  getPendingApprovalForAgent(agentName: string): ToolApprovalRequestedData | null {
    return this.pendingApprovals[agentName] ?? null;
  }

  getTaskPlanTasks(teamName: string): Task[] | null {
    return this.taskPlans[teamName] ?? null;
  }

  getTaskPlanStatuses(teamName: string): Record<string, TaskStatus> | null {
    return this.taskStatuses[teamName] ?? null;
  }

  clearPendingApproval(agentName: string): void {
    delete this.pendingApprovals[agentName];
  }

  appendUserMessage(agentName: string, content: string): void {
    if (!content.trim()) {
      return;
    }
    if (!this.agentEventHistory[agentName]) {
      this.agentEventHistory[agentName] = [];
      if (!this.findNode(agentName)) {
        const agentRole = this.nodeRoles[agentName] ?? 'Agent';
        this.addNode(agentName, { type: 'agent', name: agentName, role: agentRole, children: {} }, this.teamName);
      }
    }
    this.agentEventHistory[agentName].push({
      event_type: 'ui_user_message',
      data: { content }
    });
    this.version += 1;
    this.dirty = true;
  }

  getLastUserMessage(agentName: string): string | null {
    const history = this.agentEventHistory[agentName];
    if (!history || history.length === 0) {
      return null;
    }
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const event = history[i] as HistoryEvent;
      if (event.event_type === 'ui_user_message') {
        return (event as UiHistoryEvent).data.content ?? null;
      }
    }
    return null;
  }

  appendToolDecision(agentName: string, content: string): void {
    if (!content.trim()) {
      return;
    }
    if (!this.agentEventHistory[agentName]) {
      this.agentEventHistory[agentName] = [];
      if (!this.findNode(agentName)) {
        const agentRole = this.nodeRoles[agentName] ?? 'Agent';
        this.addNode(agentName, { type: 'agent', name: agentName, role: agentRole, children: {} }, this.teamName);
      }
    }
    this.agentEventHistory[agentName].push({
      event_type: 'ui_tool_decision',
      data: { content }
    });
    this.version += 1;
    this.dirty = true;
  }

  consumeDirty(): boolean {
    const dirty = this.dirty;
    this.dirty = false;
    return dirty;
  }

  markDirty(): void {
    this.dirty = true;
  }

  setFocusedNode(nodeData: NodeData | null): void {
    this.focusedNodeData = nodeData;
  }

  private extractNodeRoles(team: AgentTeamLike): Record<string, string> {
    const roles: Record<string, string> = {};
    const nodes = team.runtime?.context?.config?.nodes ?? [];
    for (const nodeConfig of nodes) {
      const role = nodeConfig?.nodeDefinition?.role;
      const name = nodeConfig?.nodeDefinition?.name;
      if (role && name) {
        roles[name] = role;
      }
    }
    return roles;
  }

  private initializeRootNode(): Record<string, NodeData> {
    return {
      [this.teamName]: {
        type: 'team',
        name: this.teamName,
        role: this.teamRole,
        children: {}
      }
    };
  }

  private processEventRecursively(event: AgentTeamStreamEvent, parentName: string): void {
    if (!this.teamEventHistory[parentName]) {
      this.teamEventHistory[parentName] = [];
    }
    this.teamEventHistory[parentName].push(event);

    if (event.event_source_type === 'TASK_PLAN') {
      this.processTaskPlanEvent(event.data, parentName);
      return;
    }

    if (isAgentEventPayload(event.data)) {
      const agentName = String(event.data.agent_name ?? '');
      const agentEvent = event.data.agent_event as StreamEvent;

      if (!this.agentEventHistory[agentName]) {
        this.agentEventHistory[agentName] = [];
        const agentRole = this.nodeRoles[agentName] ?? 'Agent';
        this.addNode(agentName, { type: 'agent', name: agentName, role: agentRole, children: {} }, parentName);
      }

      this.agentEventHistory[agentName].push(agentEvent);

      if (agentEvent.event_type === StreamEventType.AGENT_STATUS_UPDATED) {
        const data = agentEvent.data as { new_status?: AgentStatus };
        if (data?.new_status) {
          this.agentStatuses[agentName] = data.new_status;
          delete this.pendingApprovals[agentName];
        }
      } else if (agentEvent.event_type === StreamEventType.ASSISTANT_CHUNK) {
        this.speakingAgents[agentName] = true;
      } else if (agentEvent.event_type === StreamEventType.ASSISTANT_COMPLETE_RESPONSE) {
        this.speakingAgents[agentName] = false;
      } else if (agentEvent.event_type === StreamEventType.TOOL_APPROVAL_REQUESTED) {
        this.pendingApprovals[agentName] = agentEvent.data as ToolApprovalRequestedData;
      } else if (
        agentEvent.event_type === StreamEventType.TOOL_APPROVED ||
        agentEvent.event_type === StreamEventType.TOOL_DENIED
      ) {
        delete this.pendingApprovals[agentName];
      }
      return;
    }

    if (isSubTeamEventPayload(event.data)) {
      const subTeamName = String(event.data.sub_team_node_name ?? '');
      const subTeamEvent = event.data.sub_team_event as AgentTeamStreamEvent | undefined;
      if (!this.findNode(subTeamName)) {
        const role = this.nodeRoles[subTeamName] ?? 'Sub-Team';
        this.addNode(subTeamName, { type: 'subteam', name: subTeamName, role, children: {} }, parentName);
      }

      if (subTeamEvent?.event_source_type === 'TEAM' && isTeamStatusPayload(subTeamEvent.data)) {
        this.teamStatuses[subTeamName] = subTeamEvent.data.new_status;
      }

      if (subTeamEvent) {
        this.processEventRecursively(subTeamEvent, subTeamName);
      }
    }
  }

  private processTaskPlanEvent(eventData: unknown, teamName: string): void {
    const created = TasksCreatedEventSchema.safeParse(eventData);
    if (created.success) {
      const data = created.data as TasksCreatedEvent;
      if (!this.taskPlans[teamName]) {
        this.taskPlans[teamName] = [];
      }
      if (!this.taskStatuses[teamName]) {
        this.taskStatuses[teamName] = {};
      }
      this.taskPlans[teamName].push(...data.tasks);
      for (const task of data.tasks) {
        this.taskStatuses[teamName][task.task_id] = TaskStatus.NOT_STARTED;
      }
      return;
    }

    const updated = TaskStatusUpdatedEventSchema.safeParse(eventData);
    if (updated.success) {
      const data = updated.data as TaskStatusUpdatedEvent;
      if (!this.taskStatuses[teamName]) {
        this.taskStatuses[teamName] = {};
      }
      this.taskStatuses[teamName][data.task_id] = data.new_status;

      if (data.deliverables && this.taskPlans[teamName]) {
        for (const task of this.taskPlans[teamName]) {
          if (task.task_id === data.task_id) {
            task.file_deliverables = data.deliverables;
            break;
          }
        }
      }
    }
  }

  private addNode(nodeName: string, nodeData: NodeData, parentName: string): void {
    const parent = this.findNode(parentName);
    if (parent) {
      parent.children[nodeName] = nodeData;
    } else {
      console.error(`Could not find parent node '${parentName}' to add child '${nodeName}'.`);
    }
  }

  private findNode(nodeName: string, tree?: Record<string, NodeData>): NodeData | undefined {
    const treeData = tree ?? this.nodes;
    for (const [name, nodeData] of Object.entries(treeData)) {
      if (name === nodeName) {
        return nodeData;
      }
      if (Object.keys(nodeData.children).length) {
        const found = this.findNode(nodeName, nodeData.children);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }
}
