import { describe, expect, it } from 'vitest';
import enWorkspaceMessages from '../en/workspace';
import zhCnWorkspaceMessages from '../zh-CN/workspace';

const prefix = 'workspace.components.workspace.team.TeamDelegatedTasksSection.';
const lifecycleKeys = [
  'task_assigned',
  'result_submitted',
  'revised_result_submitted',
  'revision_requested',
  'revision_requested_for',
  'result_accepted',
  'task_interrupted',
  'status_in_progress',
  'status_awaiting_review',
  'status_revision_requested',
  'status_accepted',
  'status_interrupted',
  'task_delegator',
  'task_assignee',
  'system_lifecycle_event',
  'result_accepted_fallback',
  'updated_at',
].map((key) => `${prefix}${key}`);
const removedObsoleteKeys = [
  'description_unavailable',
  'technical_details',
  'task_type',
  'task_id',
  'agent_run_id',
  'agent_team_run_id',
  'target_kind',
  'target',
].map((key) => `${prefix}${key}`);

describe('Team task lifecycle catalogs', () => {
  it('keeps complete, non-empty English and Simplified Chinese lifecycle labels', () => {
    for (const key of lifecycleKeys) {
      expect(enWorkspaceMessages[key], `missing English key ${key}`).toBeTruthy();
      expect(zhCnWorkspaceMessages[key], `missing Simplified Chinese key ${key}`).toBeTruthy();
    }
  });

  it('removes obsolete task fallback and technical-detail labels from both catalogs', () => {
    for (const key of removedObsoleteKeys) {
      expect(enWorkspaceMessages).not.toHaveProperty(key);
      expect(zhCnWorkspaceMessages).not.toHaveProperty(key);
    }
  });
});
