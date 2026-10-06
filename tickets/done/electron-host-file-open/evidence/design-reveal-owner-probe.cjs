// Investigation-only actual-source probe. Not component/native or post-fix validation.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const ts = require('../../../../autobyteus-web/node_modules/typescript');
const sources = {};
function evaluate(path, dependencies, globals = {}) {
  const source = fs.readFileSync(path, 'utf8');
  sources[path] = crypto.createHash('sha256').update(source).digest('hex');
  const exports = {};
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    }, ...globals,
  }, { filename: path });
  return exports;
}
const rows = [];
const targetFor = (kind, id) => kind === 'standalone'
  ? { kind: 'standalone_agent', context: { state: { runId: id } } }
  : { kind: kind === 'team' ? 'standalone_team_member' : 'agent_org_task_team_member',
      context: { state: { runId: 'member' } },
      collaborationMessages: { rootKind: kind === 'team' ? 'agent_team' : 'agent_org', rootRunId: id } };
function tabSubject(target) {
  const unmount = [];
  const source = evaluate('autobyteus-web/composables/useRightSideTabs.ts', {
    vue: {
      ref: (value) => ({ value }), computed: (get) => ({ get value() { return get(); } }),
      watch: () => {}, onBeforeUnmount: (fn) => unmount.push(fn),
    },
    '~/stores/browserShellStore': { useBrowserShellStore: () => ({ browserAvailable: false }) },
    '~/stores/activeContextStore': { useActiveContextStore: () => ({ get activeWorkspaceTarget() { return target.value; } }) },
    '~/utils/layout/workspaceSurfaceOrder': { getWorkspaceToolOrder: () => ['files', 'teamMembers', 'progress'] },
  }, { useLocalization: () => ({ t: (key) => key, resolvedLocale: { value: 'en' } }) });
  return { tabs: source.useRightSideTabs(), unmount: () => unmount.splice(0).forEach((fn) => fn()) };
}
for (const kind of ['standalone', 'team', 'org']) {
  for (const explicit of [false, true]) {
    const subject = tabSubject({ value: targetFor(kind, 'fresh') });
    subject.tabs[explicit ? 'selectTabExplicitly' : 'setActiveTab']('files');
    subject.tabs.useContextualDefaultTab();
    const expected = explicit ? 'files' : kind === 'standalone' ? 'progress' : 'teamMembers';
    assert.equal(subject.tabs.activeTab.value, expected);
    rows.push({ kind, lifecycle: 'first host mount', selection: explicit ? 'explicit' : 'passive', actual: subject.tabs.activeTab.value });
    subject.unmount();
  }
  const target = { value: targetFor(kind, 'old') };
  const subject = tabSubject(target);
  subject.tabs.useContextualDefaultTab();
  subject.unmount();
  target.value = targetFor(kind, 'new');
  subject.tabs.selectTabExplicitly('files');
  subject.tabs.useContextualDefaultTab();
  assert.equal(subject.tabs.activeTab.value, 'files');
  rows.push({ kind, lifecycle: 'new scope with host unmounted', selection: 'explicit', actual: 'files' });
  subject.unmount();
}
const strip = evaluate('autobyteus-web/utils/layout/responsiveStripActivation.ts', {});
const policy = evaluate('autobyteus-web/utils/layout/responsiveLayoutPolicy.ts', { './responsiveStripActivation': strip });
for (const width of [992, 1440]) {
  const state = policy.resolveResponsiveWorkspaceShellState({
    viewportWidth: width, viewportHeight: 635, leftPanelPreference: 'visible', leftPanelPreferredWidth: 320,
    rightPanelPreference: 'visible', rightPanelPreferredWidth: 450, rightPanelResizeIntent: 'automatic',
  });
  assert.equal(state.rightPanel.presentation, width === 992 ? 'strip' : 'docked');
  rows.push({ lifecycle: 'visible dock preference', width, presentation: state.rightPanel.presentation,
    stripActivation: state.rightPanel.stripActivation });
}
const receipt = {
  revision: cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sources, assertions: 'passed', caseCount: rows.length,
  boundary: 'Unchanged actual tabs/policy source transpiled; controlled stores, simple reactive reads and lifecycle hooks. No Vue DOM host, watcher scheduling, Electron, file bytes or user data. Evidence for explicit intent/policy only; not D2 implementation validation.',
  rows,
};
fs.writeFileSync('tickets/in-progress/electron-host-file-open/evidence/design-reveal-owner-probe.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
