import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { AgentStatus } from '../../../agent/status/status-enum.js';
import { AgentTeamStatus } from '../../../agent-team/status/agent-team-status.js';
import { ToolApprovalRequestedData } from '../../../agent/streaming/events/stream-event-payloads.js';
import type { HistoryEvent } from '../state-store.js';
import type { Task } from '../../../task-management/task.js';
import { TaskStatus } from '../../../task-management/base-task-plan.js';
import {
  AGENT_STATUS_ICONS,
  TEAM_STATUS_ICONS,
  SUB_TEAM_ICON,
  TEAM_ICON,
  DEFAULT_ICON,
  USER_ICON
} from './shared.js';
import { buildHistoryLines, wrapHistoryLines } from './focus-pane-history.js';
import { TaskPlanPanel } from './task-plan-panel.js';
import type { NodeData } from '../state-store.js';


export const FocusPane: React.FC<{
  focusedNode: NodeData | null;
  agentStatuses: Record<string, AgentStatus>;
  teamStatuses: Record<string, AgentTeamStatus>;
  history: HistoryEvent[];
  lastUserMessage: string | null;
  pendingApproval: ToolApprovalRequestedData | null;
  tasks: Task[] | null;
  taskStatuses: Record<string, TaskStatus> | null;
  availableHeight: number;
  availableWidth: number;
  onSubmitMessage: (agentName: string, text: string) => void;
  onSubmitApproval: (agentName: string, invocationId: string, isApproved: boolean, reason?: string) => void;
}> = ({
  focusedNode,
  agentStatuses,
  teamStatuses,
  history,
  lastUserMessage,
  pendingApproval,
  tasks,
  taskStatuses,
  availableHeight,
  availableWidth,
  onSubmitMessage,
  onSubmitApproval
}) => {
  const [inputValue, setInputValue] = useState('');
  const focusedType = focusedNode?.type ?? 'team';
  const focusedName = focusedNode?.name ?? 'team';
  const historyLines = buildHistoryLines(history);

  useEffect(() => {
    setInputValue('');
  }, [focusedName, focusedType, pendingApproval?.invocation_id]);

  useInput((input, key) => {
    if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
      return;
    }

    if (key.backspace || key.delete) {
      setInputValue((value) => value.slice(0, -1));
      return;
    }

    if (key.return) {
      const trimmed = inputValue.trim();
      if (!focusedNode || focusedType !== 'agent') {
        setInputValue('');
        return;
      }

      if (pendingApproval) {
        if (!trimmed) {
          return;
        }
        const lower = trimmed.toLowerCase();
        if (['y', 'yes', 'approve', 'approved'].includes(lower)) {
          onSubmitApproval(focusedName, pendingApproval.invocation_id, true, 'User approved via TUI.');
        } else if (['n', 'no', 'deny', 'denied'].includes(lower)) {
          onSubmitApproval(focusedName, pendingApproval.invocation_id, false, 'User denied via TUI.');
        } else {
          onSubmitApproval(focusedName, pendingApproval.invocation_id, false, trimmed);
        }
        setInputValue('');
        return;
      }

      if (trimmed) {
        onSubmitMessage(focusedName, trimmed);
        setInputValue('');
      }
      return;
    }

    if (input) {
      setInputValue((value) => value + input);
    }
  });

  const status =
    focusedType === 'agent'
      ? agentStatuses[focusedName] ?? AgentStatus.UNINITIALIZED
      : teamStatuses[focusedName] ?? AgentTeamStatus.UNINITIALIZED;
  const icon =
    focusedType === 'agent'
      ? AGENT_STATUS_ICONS[status as AgentStatus] ?? DEFAULT_ICON
      : focusedType === 'subteam'
        ? TEAM_STATUS_ICONS[status as AgentTeamStatus] ?? SUB_TEAM_ICON
        : TEAM_STATUS_ICONS[status as AgentTeamStatus] ?? TEAM_ICON;

  const rootHeight = Math.max(10, availableHeight);
  const rootWidth = Math.max(24, availableWidth);
  const innerHeight = Math.max(6, rootHeight - 4); // border + padding
  const headerLines = focusedNode?.role ? 2 : 1;
  const approvalLines = pendingApproval ? 1 : 0;
  const lastMessageLines = lastUserMessage ? 1 : 0;
  const inputBoxHeight = 3; // border + single line
  const spacingLines = 2;
  const historyBoxHeight = Math.max(
    6,
    innerHeight - headerLines - approvalLines - lastMessageLines - inputBoxHeight - spacingLines
  );
  const historyContentHeight = Math.max(1, historyBoxHeight - 4); // border + padding
  const rootInnerWidth = Math.max(10, rootWidth - 4); // root border + padding
  const historyContentWidth = Math.max(10, rootInnerWidth - 4); // history border + padding
  const wrappedHistory = wrapHistoryLines(historyLines, historyContentWidth);
  const maxHistoryLines = Math.max(1, historyContentHeight - 1);
  const historyToShow = wrappedHistory.slice(-maxHistoryLines);
  const historyText = historyToShow.join('\n');
  const inputWidth = Math.max(10, rootInnerWidth - 4);
  const inputPreview = wrapHistoryLines([inputValue], inputWidth).slice(-1)[0] ?? '';
  const lastMessagePreview = lastUserMessage
    ? wrapHistoryLines([lastUserMessage], inputWidth).slice(0, 1)[0]
    : null;

  return (
    <Box flexDirection="column" height={rootHeight} width={rootWidth} borderStyle="round" padding={1}>
      <Text>
        {icon} {focusedType}: {focusedName}
      </Text>
      {focusedNode?.role ? <Text dimColor>Role: {focusedNode.role}</Text> : null}
      {focusedType === 'agent' ? (
        <>
          {pendingApproval ? (
            <Text color="yellow">
              Approval requested: {pendingApproval.tool_name}. Enter y/n or reason.
            </Text>
          ) : null}
          <Box flexDirection="column" marginTop={1} height={historyBoxHeight} borderStyle="round" padding={1}>
            <Text dimColor>Recent events:</Text>
            {historyToShow.length === 0 ? (
              <Text dimColor>No events yet.</Text>
            ) : (
              <Text>{historyText}</Text>
            )}
          </Box>
          {lastMessagePreview ? (
            <Text dimColor>
              {USER_ICON} Last message: {lastMessagePreview}
            </Text>
          ) : null}
          <Box marginTop={1} borderStyle="round" paddingX={1}>
            <Text>
              {USER_ICON} {pendingApproval ? 'Decision' : 'Message'}:{' '}
              <Text color="cyan">{inputPreview}</Text>
            </Text>
          </Box>
        </>
      ) : (
        <Box flexDirection="column" marginTop={1} flexGrow={1} borderStyle="round" padding={1}>
          <Text>Children:</Text>
          {Object.values(focusedNode?.children ?? {}).map((child) => {
            const childStatus =
              child.type === 'agent'
                ? agentStatuses[child.name] ?? AgentStatus.UNINITIALIZED
                : teamStatuses[child.name] ?? AgentTeamStatus.UNINITIALIZED;
            const childIcon =
              child.type === 'agent'
                ? AGENT_STATUS_ICONS[childStatus as AgentStatus] ?? DEFAULT_ICON
                : TEAM_STATUS_ICONS[childStatus as AgentTeamStatus] ?? DEFAULT_ICON;
            return (
              <Text key={`${child.name}-child`}>
                {childIcon} {child.name} ({child.type})
              </Text>
            );
          })}
          <TaskPlanPanel tasks={tasks} statuses={taskStatuses} />
        </Box>
      )}
    </Box>
  );
};
