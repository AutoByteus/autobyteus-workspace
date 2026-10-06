// Investigation-only controlled probe of unchanged production source. Not an app E2E.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript');
const source = 'autobyteus-web/composables/useEventMonitorFilePreview.ts';
const emitted = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const path = '/Users/test-owned/project/publish-brief.md';
const metadata = { workspaceId: 'owned-ws', workspaceRootPath: '/Users/test-owned/project' };
async function probe(name, embedded, config, mapped) {
  const calls = { capabilityChecks: 0, mappingChecks: 0, previews: [], panels: 0, tabs: [] };
  const dependencies = {
    '~/composables/useLocalization': { useLocalization: () => ({ t: key => key }) },
    '~/stores/fileExplorer': { useFileExplorerStore: () => ({ openFilePreview: async (...args) => calls.previews.push(args) }) },
    '~/stores/mobileWorkStore': { useMobileWorkStore: () => ({ currentContext: null }) },
    '~/stores/windowNodeContextStore': { useWindowNodeContextStore: () => ({ isEmbeddedWindow: embedded }) },
    '~/stores/workspace': { useWorkspaceStore: () => ({ activeWorkspaceMetadata: metadata, activeWorkspace: { workspaceId: metadata.workspaceId, absolutePath: metadata.workspaceRootPath } }) },
    '~/stores/activeContextStore': { useActiveContextStore: () => ({ activeWorkspaceTarget: { kind: 'agent_run_task_team_member', context: { config } } }) },
    '~/utils/fileExplorer/absoluteWorkspacePathMapping': { mapAbsolutePathToWorkspaceRelative: () => { calls.mappingChecks++; return mapped; } },
    '~/utils/fileExplorer/localFileCapability': { hasTrustedElectronLocalFileCapability: () => { calls.capabilityChecks++; return true; } },
    '~/utils/remoteAccess/mobileRuntime': { isMobileRemoteAccessRuntime: () => false },
    '~/types/mobileWork': { mobileWorkContextKey: () => { throw new Error('Unexpected mobile path'); } },
    '~/composables/useRightPanel': { useRightPanel: () => ({ openRightPanel: () => calls.panels++ }) },
    '~/composables/useRightSideTabs': { useRightSideTabs: () => ({ setActiveTab: tab => calls.tabs.push(tab) }) },
  };
  const module = { exports: {} };
  vm.runInNewContext(emitted, {
    module, exports: module.exports,
    require: name => { if (!(name in dependencies)) throw new Error('Unexpected dependency: ' + name); return dependencies[name]; },
    console, window: { setTimeout: () => 0 },
  }, { filename: source });
  const result = await module.exports.useEventMonitorFilePreview().openPath({
    id: 'test-owned-action', rawCandidate: path, normalizedCandidate: path,
    sourceKind: 'prose', displayLabel: 'publish-brief.md', previewType: 'Text',
  });
  return { name, result, calls };
}
(async () => {
  const rows = [
    await probe('Embedded Electron: known config workspaceId but absent target metadata', true, { workspaceId: 'owned-ws', workspaceMetadata: null }, null),
    await probe('Embedded Electron: target lacks ID/metadata, legacy workspace getter still resolves', true, { workspaceId: null, workspaceMetadata: null }, null),
    await probe('Embedded Electron control: complete selected metadata', true, { workspaceId: 'owned-ws', workspaceMetadata: metadata }, null),
    await probe('Browser control: mapped selected workspace', false, { workspaceId: 'owned-ws', workspaceMetadata: metadata }, { workspaceId: 'owned-ws', relativePath: 'publish-brief.md' }),
    await probe('Remote control: unmapped outside workspace', false, { workspaceId: 'owned-ws', workspaceMetadata: metadata }, null),
  ];
  for (const row of rows.slice(0, 2)) {
    assert.equal(row.result.status, 'unavailable');
    assert.equal(row.result.message, 'workspace.components.conversation.segments.renderer.MarkdownRenderer.file_available_on_host');
    assert.equal(row.calls.capabilityChecks, 0);
    assert.equal(row.calls.previews.length, 0);
  }
  assert.equal(rows[2].result.status, 'opened');
  assert.equal(rows[2].calls.previews[0][0], path);
  assert.equal(rows[2].calls.previews[0][2].accessIntent.readOnly, true);
  assert.equal(rows[3].result.path, 'publish-brief.md');
  assert.equal(rows[4].result.status, 'unavailable');
  assert.equal(rows[4].calls.previews.length, 0);
  const receipt = { source, sourceRevision: '30c3f40d5721124c466d464004b004053173280c', assertions: 'passed', boundary: 'Unchanged production launcher; controlled stores/runtime bridge/mapping/panel. No user app/data reads; no filesystem byte access; not a product reproduction.', rows };
  fs.writeFileSync('tickets/in-progress/electron-host-file-open/evidence/baseline-owner-probe.json', JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
