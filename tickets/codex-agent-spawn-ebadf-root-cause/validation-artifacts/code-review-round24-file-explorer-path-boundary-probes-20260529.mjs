import fs from 'node:fs/promises';
import fss from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..', '..', '..');
const { WorkspaceFileExplorer } = await import(path.join(repoRoot, 'autobyteus-server-ts/dist/file-explorer/file-explorer.js'));

const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-path-boundary-review-'));
const workspaceRoot = path.join(parent, 'ws');
const siblingRoot = path.join(parent, 'ws-sibling');
await fs.mkdir(workspaceRoot, { recursive: true });
await fs.mkdir(siblingRoot, { recursive: true });
await fs.writeFile(path.join(siblingRoot, 'leak.txt'), 'leak');
await fs.writeFile(path.join(workspaceRoot, 'inside.txt'), 'inside');
await fs.mkdir(path.join(workspaceRoot, 'sub'), { recursive: true });
await fs.writeFile(path.join(workspaceRoot, 'sub', 'rename-me.txt'), 'rename');

const results = [];
try {
  const explorer = new WorkspaceFileExplorer(workspaceRoot);
  const rebuildSpyCalls = { count: 0 };
  const originalBuild = explorer.buildWorkspaceDirectoryTree.bind(explorer);
  explorer.buildWorkspaceDirectoryTree = async (...args) => {
    rebuildSpyCalls.count += 1;
    return originalBuild(...args);
  };

  try {
    await explorer.loadFolderChildren('../ws-sibling');
    results.push({ name: 'loadFolderChildren same-prefix sibling escape', pass: false, detail: 'unexpectedly succeeded' });
  } catch (error) {
    results.push({ name: 'loadFolderChildren same-prefix sibling escape', pass: /outside the workspace/.test(String(error?.message ?? error)), detail: String(error?.message ?? error) });
  }
  results.push({ name: 'loadFolderChildren did not rebuild tree on rejection', pass: rebuildSpyCalls.count === 0, detail: `rebuild calls=${rebuildSpyCalls.count}` });
  results.push({ name: 'loadFolderChildren did not cache tree on rejection', pass: explorer.getTree() === null, detail: `tree=${explorer.getTree() ? 'present' : 'null'}` });

  const rootNode = await explorer.loadFolderChildren('');
  const childNames = rootNode.children.map((child) => child.name).sort().join(',');
  results.push({ name: 'loadFolderChildren root still works', pass: childNames.includes('inside.txt') && childNames.includes('sub'), detail: childNames });

  try {
    await explorer.readFileContent('../ws-sibling/leak.txt');
    results.push({ name: 'readFileContent same-prefix sibling escape', pass: false, detail: 'unexpectedly succeeded' });
  } catch (error) {
    results.push({ name: 'readFileContent same-prefix sibling escape', pass: /outside the workspace/.test(String(error?.message ?? error)), detail: String(error?.message ?? error) });
  }

  const opExplorer = new WorkspaceFileExplorer(workspaceRoot);
  await opExplorer.buildWorkspaceDirectoryTree();
  try {
    await opExplorer.writeFileContent('../ws-sibling/write-leak.txt', 'bad');
    results.push({ name: 'writeFileContent same-prefix sibling escape', pass: false, detail: 'unexpectedly succeeded' });
  } catch (error) {
    results.push({ name: 'writeFileContent same-prefix sibling escape', pass: /outside the workspace/.test(String(error?.message ?? error)), detail: String(error?.message ?? error) });
  }
  results.push({ name: 'write did not create sibling leak', pass: !fss.existsSync(path.join(siblingRoot, 'write-leak.txt')), detail: `exists=${fss.existsSync(path.join(siblingRoot, 'write-leak.txt'))}` });

  try {
    await opExplorer.renameFileOrFolder('sub/rename-me.txt', '../../ws-sibling/renamed-leak.txt');
    results.push({ name: 'renameFileOrFolder newName traversal escape', pass: false, detail: 'unexpectedly succeeded' });
  } catch (error) {
    results.push({ name: 'renameFileOrFolder newName traversal escape', pass: /outside the workspace|path separator|invalid|relative|Access denied/i.test(String(error?.message ?? error)), detail: String(error?.message ?? error) });
  }
  results.push({ name: 'rename did not create sibling leak', pass: !fss.existsSync(path.join(siblingRoot, 'renamed-leak.txt')), detail: `exists=${fss.existsSync(path.join(siblingRoot, 'renamed-leak.txt'))}` });
  results.push({ name: 'rename original still exists after rejected escape', pass: fss.existsSync(path.join(workspaceRoot, 'sub', 'rename-me.txt')), detail: `exists=${fss.existsSync(path.join(workspaceRoot, 'sub', 'rename-me.txt'))}` });
} finally {
  await fs.rm(parent, { recursive: true, force: true });
}

for (const result of results) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}: ${result.detail}`);
}
if (results.some((result) => !result.pass)) {
  process.exitCode = 1;
}
