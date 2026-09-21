// Implementation-scoped process check. Requires the current server production build.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const server = path.resolve(process.argv[2] ?? 'autobyteus-server-ts');
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'authoring-process-'));
const teamDir = path.join(root, 'agent-teams', 'team'), orgDir = path.join(root, 'agent-orgs', 'org');
const md = '---\nname: Process check\ndescription: Synthetic\n---\n\nInstructions stay unchanged.\n';
const team = { coordinatorMemberName: 'lead', members: [{ memberName: 'lead', ref: 'lead', refScope: 'shared' }], handoffs: [], avatarUrl: null, defaultLaunchConfig: null };
const org = { members: [{ memberName: 'team', ref: 'team', refType: 'agent_team', refScope: 'shared' }], handoffs: [], avatarUrl: null, defaultLaunchConfig: null };
try {
  for (const [dir, family, version, value] of [[teamDir, 'team', 2, team], [orgDir, 'org', 1, org]]) {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${family}-config.json`), JSON.stringify({ schemaVersion: version, ...value }));
    await fs.writeFile(path.join(dir, `${family}.md`), md);
  }
  const migrationUrl = pathToFileURL(path.join(server, 'dist/app-data-migrations/migrations/collaboration-definition-authoring-shape-app-data-migration.js')).href;
  const writerUrl = pathToFileURL(path.join(server, 'dist/run-history/store/atomic-run-package-file-commit-writer.js')).href;
  const code = `import { CollaborationDefinitionAuthoringShapeAppDataMigration as Migration } from ${JSON.stringify(migrationUrl)};
    import { AtomicRunPackageFileCommitWriter } from ${JSON.stringify(writerUrl)};
    const physical = new AtomicRunPackageFileCommitWriter();
    const writer = { write: async (input) => { const outcome = await physical.write(input);
      if (process.env.INTERRUPT === 'yes' && outcome.outcome === 'committed') process.exit(75);
      return outcome; } };
    const result = await new Migration({ getAgentTeamsDir: () => ${JSON.stringify(path.dirname(teamDir))},
      getAgentOrgsDir: () => ${JSON.stringify(path.dirname(orgDir))} }, writer).execute();
    console.log(JSON.stringify(result)); if (result.status !== 'SUCCEEDED') process.exitCode = 1;`;
  const run = (interrupt) => spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env: { ...process.env, INTERRUPT: interrupt } });
  const first = run('yes'); assert.equal(first.status, 75, first.stderr);
  const firstPath = path.join(teamDir, 'team-config.json'), secondPath = path.join(orgDir, 'org-config.json');
  assert.deepEqual(JSON.parse(await fs.readFile(firstPath, 'utf8')), team);
  assert.equal(JSON.parse(await fs.readFile(secondPath, 'utf8')).schemaVersion, 1);
  const before = await fs.stat(firstPath), bytes = await fs.readFile(firstPath);
  const retry = run('no'); assert.equal(retry.status, 0, retry.stderr);
  const result = JSON.parse(retry.stdout.trim().split('\n').at(-1));
  assert.equal(result.summary.skippedCount, 1); assert.equal(result.summary.migratedCount, 1);
  assert.deepEqual(JSON.parse(await fs.readFile(secondPath, 'utf8')), org);
  assert.deepEqual(await fs.readFile(firstPath), bytes); assert.equal((await fs.stat(firstPath)).mtimeMs, before.mtimeMs);
  assert.equal(await fs.readFile(path.join(teamDir, 'team.md'), 'utf8'), md);
  assert.equal(await fs.readFile(path.join(orgDir, 'org.md'), 'utf8'), md);
  console.log(JSON.stringify({ firstExit: first.status, ordinaryRelaunchExit: retry.status, result: result.summary, firstConfigZeroWrite: true, markdownPreserved: true }));
} finally { await fs.rm(root, { recursive: true, force: true }); }
