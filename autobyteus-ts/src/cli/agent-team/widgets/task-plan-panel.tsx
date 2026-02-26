import React from 'react';
import { Box, Text } from 'ink';
import type { Task } from '../../../task-management/task.js';
import { TaskStatus } from '../../../task-management/base-task-plan.js';
import { TASK_STATUS_ICONS, LOG_ICON } from './shared.js';

export const TaskPlanPanel: React.FC<{
  tasks: Task[] | null;
  statuses: Record<string, TaskStatus> | null;
}> = ({ tasks, statuses }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>No task plan has been published yet.</Text>
      </Box>
    );
  }

  const sorted = [...tasks].sort((a, b) => a.task_name.localeCompare(b.task_name));
  const idToName = new Map(sorted.map((task) => [task.task_id, task.task_name]));

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>Task Plan</Text>
      {sorted.map((task) => {
        const status = statuses?.[task.task_id] ?? TaskStatus.NOT_STARTED;
        const statusIcon = TASK_STATUS_ICONS[status] ?? '❓';
        const deps = task.dependencies?.length
          ? task.dependencies.map((dep) => idToName.get(dep) ?? dep).join(', ')
          : 'None';
        return (
          <Box key={task.task_id} flexDirection="column" marginTop={1}>
            <Text>
              {statusIcon} {task.task_name} ({task.assignee_name})
            </Text>
            <Text dimColor>ID: {task.task_id}</Text>
            <Text dimColor>Depends on: {deps}</Text>
            {task.file_deliverables && task.file_deliverables.length ? (
              <Box flexDirection="column" marginTop={1}>
                <Text>Deliverables:</Text>
                {task.file_deliverables.map((deliverable, index) => (
                  <Text key={`${task.task_id}-del-${index}`}>
                    {LOG_ICON} {deliverable.file_path} — {deliverable.summary}
                  </Text>
                ))}
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
};
