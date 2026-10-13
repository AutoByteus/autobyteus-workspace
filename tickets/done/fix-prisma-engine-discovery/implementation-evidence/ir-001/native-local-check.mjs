// Implementation-only integration: current built owner + worktree-installed host native CLI,
// private SQLite, deploy twice. Not Docker, API, retained-home recreation or E2E proof.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const appRoot = path.resolve('autobyteus-server-ts');
const built = path.join(appRoot, 'dist/startup/migrations.js');
const { resolvePrismaEnginePair, buildPrismaCommandEnv, runMigrations } = await import(pathToFileURL(built));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ab-prisma-native-local-'));
const receipt = { boundary: 'local implementation integration; not Docker/E2E', platform: process.platform, arch: process.arch,
  sourceSha256: createHash('sha256').update(fs.readFileSync(path.join(appRoot, 'src/startup/migrations.ts'))).digest('hex'),
  builtSha256: createHash('sha256').update(fs.readFileSync(built)).digest('hex'), root };
try {
  assert.equal(process.env.PRISMA_QUERY_ENGINE_LIBRARY, undefined);
  assert.equal(process.env.PRISMA_SCHEMA_ENGINE_BINARY, undefined);
  const cli = fs.realpathSync(path.join(appRoot, 'node_modules/prisma/build/index.js'));
  const engineManifest = fs.realpathSync(createRequire(cli).resolve('@prisma/engines/package.json'));
  const versionManifest = createRequire(engineManifest).resolve('@prisma/engines-version/package.json');
  receipt.engineRevision = JSON.parse(fs.readFileSync(versionManifest, 'utf8')).prisma.enginesVersion;
  const pair = resolvePrismaEnginePair(appRoot, {}, path.join(root, 'cache'));
  assert.equal(pair.source, 'bundled');
  assert.equal(pair.sourcePath, path.dirname(engineManifest));
  receipt.pair = pair;
  const databaseUrl = `file:${path.join(root, 'canonical.db')}`;
  process.env.DATABASE_URL = `file:${path.join(root, 'stale.db')}`;
  assert.equal(buildPrismaCommandEnv({appRoot, databaseUrl}).DATABASE_URL, databaseUrl);
  runMigrations({appRoot, databaseUrl});
  assert.ok(fs.statSync(path.join(root, 'canonical.db')).size > 0);
  assert.equal(fs.existsSync(path.join(root, 'stale.db')), false);
  runMigrations({appRoot, databaseUrl});
  assert.equal(fs.existsSync(path.join(root, 'stale.db')), false);
  receipt.deploys = 2;
  receipt.result = 'PASS';
} finally {
  fs.rmSync(root, {recursive: true, force: true});
  receipt.ownedFixtureRemoved = !fs.existsSync(root);
  console.log(JSON.stringify(receipt, null, 2));
}
