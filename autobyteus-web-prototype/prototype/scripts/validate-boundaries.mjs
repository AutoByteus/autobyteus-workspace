#!/usr/bin/env node
import { access, readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const failures = []
const checks = []
const record = (name, pass, evidence) => { checks.push({ name, pass, evidence }); if (!pass) failures.push(name) }

const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const dependencyNames = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies })
record('No Electron/native runtime dependency', !dependencyNames.some(name => name === 'electron' || name.startsWith('@electron/')), dependencyNames.filter(name => /electron/i.test(name)))

const prohibitedRoots = ['electron', 'src-electron', 'server', 'backend', 'docker', 'packaging']
for (const directory of prohibitedRoots) {
  let exists = true
  try { await access(resolve(root, directory), constants.F_OK) } catch { exists = false }
  record(`No copied production ${directory} root`, !exists, exists ? resolve(root, directory) : 'absent')
}

const plugin = await readFile(resolve(root, 'plugins/00.prototype-state.client.ts'), 'utf8')
record('Browser external request boundary is explicit', plugin.includes('Prototype boundary blocked external request'), 'plugins/00.prototype-state.client.ts')
record('WebSocket boundary is local and scripted', plugin.includes('class PrototypeWebSocket'), 'plugins/00.prototype-state.client.ts')
record('Scenario state is resettable', plugin.includes('setScenario(') && plugin.includes('reset()'), 'window.__AUTOBYTEUS_PROTOTYPE__')

const sourceFixture = JSON.parse(await readFile(resolve(root, 'prototype/fixtures/source-state-snapshots.json'), 'utf8'))
record('Source evidence contains no page-capture errors', Object.values(sourceFixture.snapshots).every(value => Array.isArray(value.errors) && value.errors.length === 0), 'prototype/fixtures/source-state-snapshots.json')
record('Source evidence uses controlled loopback mock', sourceFixture.mockBaseUrl === 'http://127.0.0.1:4310', sourceFixture.mockBaseUrl)

const topLevel = await readdir(root)
record('Prototype has independently runnable Nuxt entry points', ['app.vue', 'nuxt.config.ts', 'package.json'].every(name => topLevel.includes(name)), ['app.vue', 'nuxt.config.ts', 'package.json'])

const result = { generatedAt: new Date().toISOString(), root, checks, failures }
await mkdir(resolve(root, 'evidence/runtime'), { recursive: true })
await writeFile(resolve(root, 'evidence/runtime/boundary-validation.json'), `${JSON.stringify(result, null, 2)}\n`)
for (const check of checks) process.stdout.write(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}\n`)
if (failures.length) process.exitCode = 1
