// Investigation-only controlled probe of unchanged production source. Not an app E2E.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript');
const source = 'autobyteus-web/composables/useEventMonitorFilePreview.ts';
const cp = require('node:child_process');
const crypto = require('node:crypto');
let emitted;
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
  const revisions = ['3d59992a4^', '3d59992a4', 'v1.4.69', 'v1.4.70', 'HEAD'];
  const entries = [];
  for (const ref of revisions) {
    const raw = cp.execFileSync('git', ['show', `${ref}:${source}`], { encoding: 'utf8' });
    emitted = ts.transpileModule(raw, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const rows = [
      await probe('Embedded: config ID known, target metadata absent, getter resolves', true, { workspaceId: 'owned-ws', workspaceMetadata: null }, null),
      await probe('Embedded: target ID/metadata absent, getter resolves', true, { workspaceId: null, workspaceMetadata: null }, null),
      await probe('Embedded success control: target metadata complete', true, { workspaceId: 'owned-ws', workspaceMetadata: metadata }, null),
      await probe('Remote refusal control: path outside workspace', false, { workspaceId: 'owned-ws', workspaceMetadata: metadata }, null),
    ];
    const expected = ['3d59992a4^', 'v1.4.69'].includes(ref) ? 'opened' : 'unavailable';
    for (const row of rows.slice(0, 2)) {
      assert.equal(row.result.status, expected, `${ref}: ${row.name}`);
      assert.equal(row.calls.capabilityChecks, expected === 'opened' ? 1 : 0);
      assert.equal(row.calls.previews.length, expected === 'opened' ? 1 : 0);
    }
    assert.equal(rows[2].result.status, 'opened');
    assert.equal(rows[3].result.status, 'unavailable');
    const commit = cp.execFileSync('git', ['rev-parse', `${ref}^{commit}`], { encoding: 'utf8' }).trim();
    const commitMetadata = cp.execFileSync('git', ['show', '-s', '--format=%aI | %cI | %s', `${ref}^{commit}`], { encoding: 'utf8' }).trim();
    entries.push({ ref, commit, commitMetadata, sourceSha256: crypto.createHash('sha256').update(raw).digest('hex'), rows });
  }
  const receipt = { source, assertions: 'passed: 20 controlled historical owner cases', boundary: 'Historical production source via git show; controlled dependencies, same inputs. Not a packaged app, native IPC or user-runtime reproduction.', entries };
  fs.writeFileSync('tickets/in-progress/electron-host-file-open/evidence/historical-owner-probe.json', JSON.stringify(receipt, null, 2) + '\n');
  for (const row of entries) console.log(`${row.ref} ${row.commit}: missing-metadata=${row.rows[0].result.status}, complete-metadata=${row.rows[2].result.status}, remote-outside=${row.rows[3].result.status}`);
  console.log(receipt.assertions);
})().catch(error => { console.error(error); process.exitCode = 1; });
