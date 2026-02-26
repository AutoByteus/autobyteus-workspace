/**
 * Team-specific event handlers.
 * 
 * Layer 3 of the agent streaming architecture - handles team-only events:
 * INTER_AGENT_MESSAGE, SYSTEM_TASK_NOTIFICATION
 */

import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { InterAgentMessageSegment, SystemTaskNotificationSegment } from '~/types/segments';
import type { Task, TaskStatus, FileDeliverable } from '~/types/taskManagement';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { 
  InterAgentMessagePayload, 
  SystemTaskNotificationPayload,
  TeamStatusPayload,
  TaskPlanEventPayload,
  TaskPlanTaskPayload,
  TaskPlanDeliverablePayload,
} from '../protocol/messageTypes';
import { findOrCreateAIMessage } from './segmentHandler';

/**
 * Handle INTER_AGENT_MESSAGE event.
 */
export function handleInterAgentMessage(
  payload: InterAgentMessagePayload,
  context: AgentContext
): void {
  const aiMessage = findOrCreateAIMessage(context);
  
  const segment: InterAgentMessageSegment = {
    type: 'inter_agent_message',
    senderAgentId: payload.sender_agent_id,
    recipientRoleName: payload.recipient_role_name,
    content: payload.content,
    messageType: payload.message_type,
  };
  
  aiMessage.segments.push(segment);
}

/**
 * Handle SYSTEM_TASK_NOTIFICATION event.
 */
export function handleSystemTaskNotification(
  payload: SystemTaskNotificationPayload,
  context: AgentContext
): void {
  const aiMessage = findOrCreateAIMessage(context);
  
  const segment: SystemTaskNotificationSegment = {
    type: 'system_task_notification',
    senderId: payload.sender_id,
    content: payload.content,
  };
  
  aiMessage.segments.push(segment);
}

/**
 * Handle TEAM_STATUS event.
 */
export function handleTeamStatus(
  payload: TeamStatusPayload,
  context: AgentTeamContext
): void {
  const normalizedStatus = String(payload.new_status || AgentTeamStatus.Uninitialized).toLowerCase();
  context.currentStatus = normalizedStatus as AgentTeamStatus;
}

function normalizeTaskStatus(status?: string): TaskStatus {
  const normalized = String(status || '').toLowerCase();
  switch (normalized) {
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'blocked':
      return 'blocked';
    case 'failed':
      return 'failed';
    case 'queued':
    case 'not_started':
    default:
      return 'not_started';
  }
}

function mapDeliverable(payload: TaskPlanDeliverablePayload): FileDeliverable {
  let timestamp = payload.timestamp || '';
  try {
    if (timestamp) {
      timestamp = new Date(timestamp).toISOString();
    }
  } catch {
    // Keep original value if parsing fails.
  }
  return {
    filePath: payload.file_path,
    summary: payload.summary,
    authorAgentName: payload.author_agent_name,
    timestamp,
  };
}

function mapTask(payload: TaskPlanTaskPayload): Task {
  return {
    taskId: payload.task_id,
    taskName: payload.task_name,
    assigneeName: payload.assignee_name,
    description: payload.description,
    dependencies: payload.dependencies || [],
    fileDeliverables: (payload.file_deliverables || []).map(mapDeliverable),
  };
}

/**
 * Handle TASK_PLAN_EVENT.
 */
export function handleTaskPlanEvent(
  payload: TaskPlanEventPayload,
  context: AgentTeamContext
): void {
  if (payload.event_type === 'TASKS_CREATED' && payload.tasks) {
    const tasks = payload.tasks.map(mapTask);
    context.taskPlan = tasks;
    const statuses: Record<string, TaskStatus> = {};
    tasks.forEach(task => {
      statuses[task.taskId] = 'not_started';
    });
    context.taskStatuses = statuses;
    return;
  }

  if (payload.event_type === 'TASK_STATUS_UPDATED' && payload.task_id) {
    const statuses = context.taskStatuses || {};
    statuses[payload.task_id] = normalizeTaskStatus(payload.new_status);
    context.taskStatuses = statuses;

    if (payload.deliverables && context.taskPlan) {
      const task = context.taskPlan.find(t => t.taskId === payload.task_id);
      if (task) {
        task.fileDeliverables = payload.deliverables.map(mapDeliverable);
      }
    }
  }
}
