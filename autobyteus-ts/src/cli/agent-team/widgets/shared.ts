import { AgentStatus } from '../../../agent/status/status-enum.js';
import { AgentTeamStatus } from '../../../agent-team/status/agent-team-status.js';
import { TaskStatus } from '../../../task-management/base-task-plan.js';

export const AGENT_STATUS_ICONS: Record<AgentStatus, string> = {
  [AgentStatus.UNINITIALIZED]: '⚪',
  [AgentStatus.BOOTSTRAPPING]: '⏳',
  [AgentStatus.IDLE]: '🟢',
  [AgentStatus.PROCESSING_USER_INPUT]: '💭',
  [AgentStatus.AWAITING_LLM_RESPONSE]: '💭',
  [AgentStatus.ANALYZING_LLM_RESPONSE]: '🤔',
  [AgentStatus.AWAITING_TOOL_APPROVAL]: '❓',
  [AgentStatus.TOOL_DENIED]: '❌',
  [AgentStatus.EXECUTING_TOOL]: '🛠️',
  [AgentStatus.PROCESSING_TOOL_RESULT]: '⚙️',
  [AgentStatus.SHUTTING_DOWN]: '🌙',
  [AgentStatus.SHUTDOWN_COMPLETE]: '⚫',
  [AgentStatus.ERROR]: '❗'
};

export const TEAM_STATUS_ICONS: Record<AgentTeamStatus, string> = {
  [AgentTeamStatus.UNINITIALIZED]: '⚪',
  [AgentTeamStatus.BOOTSTRAPPING]: '⏳',
  [AgentTeamStatus.IDLE]: '🟢',
  [AgentTeamStatus.PROCESSING]: '⚙️',
  [AgentTeamStatus.SHUTTING_DOWN]: '🌙',
  [AgentTeamStatus.SHUTDOWN_COMPLETE]: '⚫',
  [AgentTeamStatus.ERROR]: '❗'
};

export const TASK_STATUS_ICONS: Record<TaskStatus, string> = {
  [TaskStatus.NOT_STARTED]: '⚪',
  [TaskStatus.QUEUED]: '🕒',
  [TaskStatus.IN_PROGRESS]: '⏳',
  [TaskStatus.COMPLETED]: '✅',
  [TaskStatus.FAILED]: '❌',
  [TaskStatus.BLOCKED]: '🔒'
};

export const SUB_TEAM_ICON = '📂';
export const TEAM_ICON = '🏁';
export const AGENT_ICON = '🤖';

export const SPEAKING_ICON = '🔊';
export const DEFAULT_ICON = '❓';

export const USER_ICON = '👤';
export const ASSISTANT_ICON = '🤖';
export const TOOL_ICON = '🛠️';
export const PROMPT_ICON = '❓';
export const ERROR_ICON = '💥';
export const STATUS_ICON = '🔄';
export const LOG_ICON = '📄';
export const SYSTEM_TASK_ICON = '📥';
