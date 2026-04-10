import { describe, expect, it } from 'vitest';

import zhCnShellMessages from '../zh-CN/shell';

describe('zh-CN shell catalog', () => {
  it('uses the approved 智能体 glossary for shared navigation labels', () => {
    expect(zhCnShellMessages['shell.navigation.agents']).toBe('智能体');
    expect(zhCnShellMessages['shell.navigation.agentTeams']).toBe('智能体团队');
    expect(zhCnShellMessages['shell.mobile.agent']).toBe('智能体');
  });
});
