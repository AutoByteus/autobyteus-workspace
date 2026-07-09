import { describe, expect, it } from 'vitest';

import enWorkspaceMessages from '../en/workspace';
import zhCnWorkspaceMessages from '../zh-CN/workspace';

describe('workspace history skill-improvement localization cleanup', () => {
  it('does not retain row-action or persistent started-card localization keys', () => {
    const staleKeys = [
      'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.improve_skills_from_run',
      'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.improve_member_skills_from_run',
      'workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.started_summary',
      'workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.record_reference',
      'workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.open_improver_run',
      'workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.opening_improver_run',
      'workspace.components.workspace.skillImprovement.SkillImprovementComposerCta.open_improver_run_failed',
    ];

    for (const key of staleKeys) {
      expect(Object.prototype.hasOwnProperty.call(enWorkspaceMessages, key)).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(zhCnWorkspaceMessages, key)).toBe(false);
    }
  });
});
