import { describe, expect, it } from 'vitest';

import enWorkspaceMessages from '../en/workspace';
import zhCnWorkspaceMessages from '../zh-CN/workspace';

describe('workspace history self-evolution localization cleanup', () => {
  it('does not retain row-action or persistent started-card localization keys', () => {
    const staleKeys = [
      'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.improve_skills_from_run',
      'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.improve_member_skills_from_run',
      'workspace.components.workspace.selfEvolution.SelfEvolutionComposerCta.started_summary',
      'workspace.components.workspace.selfEvolution.SelfEvolutionComposerCta.record_reference',
      'workspace.components.workspace.selfEvolution.SelfEvolutionComposerCta.open_evolver_run',
      'workspace.components.workspace.selfEvolution.SelfEvolutionComposerCta.opening_evolver_run',
      'workspace.components.workspace.selfEvolution.SelfEvolutionComposerCta.open_evolver_run_failed',
    ];

    for (const key of staleKeys) {
      expect(Object.prototype.hasOwnProperty.call(enWorkspaceMessages, key)).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(zhCnWorkspaceMessages, key)).toBe(false);
    }
  });
});
