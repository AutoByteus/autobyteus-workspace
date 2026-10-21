import { describe, expect, it } from 'vitest';
import type { TranslationCatalog } from '../../runtime/types';
import enAgentRuntimes from '../en/agentRuntimesSettings';
import enShell from '../en/shell';
import zhCnAgentRuntimes from '../zh-CN/agentRuntimesSettings';
import zhCnShell from '../zh-CN/shell';

const en = enAgentRuntimes as TranslationCatalog;
const zhCn = zhCnAgentRuntimes as TranslationCatalog;

describe('Agent Runtimes settings localization', () => {
  it('has the same keys in English and Simplified Chinese', () => {
    expect(Object.keys(zhCn).sort()).toEqual(Object.keys(en).sort());
  });

  it("words remote sign-in in both languages, naming the workspace's VNC Viewer tab as it is labelled", () => {
    const vncTab = { en: (enShell as TranslationCatalog)['shell.rightTabs.vncViewer'], zhCn: (zhCnShell as TranslationCatalog)['shell.rightTabs.vncViewer'] };
    expect(en['settings.agentRuntimes.node.remoteDesktopNote']).toBe(
      "Sign-in opens the browser on that node; finish it in the VNC Viewer. Update these runtimes on that node's computer.",
    );
    expect(en['settings.agentRuntimes.signIn.waitingOnNode']).toBe('Finish signing in to {{name}} in the browser on that node (VNC Viewer).');
    expect(en['settings.agentRuntimes.signIn.hintOnNode']).toBe('Sign in from its command line on that node.');
    for (const key of ['settings.agentRuntimes.node.remoteDesktopNote', 'settings.agentRuntimes.signIn.waitingOnNode']) {
      expect(en[key]).toContain(vncTab.en);
      expect(zhCn[key]).toContain(vncTab.zhCn);
    }
    expect(zhCn['settings.agentRuntimes.signIn.waitingOnNode']).toContain('{{name}}');
    expect(zhCn['settings.agentRuntimes.signIn.hintOnNode']).toBe('请在该节点的命令行中登录。');
  });
});
