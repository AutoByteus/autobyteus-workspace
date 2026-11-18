#!/usr/bin/env node
// Regenerates (or checks) generated/graphql.ts from the CURRENT server schema, with no running app and no user data.
//
//   pnpm -C autobyteus-web codegen:local   build the server, print its schema in-process, regenerate generated/graphql.ts
//   pnpm -C autobyteus-web codegen:check   the same into a temporary file; exit 1 when it differs from the committed file
//
// The schema is printed from the BUILT server (autobyteus-server-ts/dist), so both commands build the server first: a stale
// build would otherwise print a stale schema and the check would pass falsely. `--schema-file <sdl>` skips the build and the
// print and uses a schema file the caller made (the server's architecture test builds the schema from source and passes it).
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const serverRoot = path.resolve(webRoot, '..', 'autobyteus-server-ts')
const committedFile = path.join(webRoot, 'generated', 'graphql.ts')
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

const args = process.argv.slice(2)
const check = args.includes('--check')
const schemaFlag = args.indexOf('--schema-file')
const givenSchemaFile = schemaFlag >= 0 ? path.resolve(args[schemaFlag + 1] ?? '') : null

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? webRoot,
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: 'inherit',
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Command failed (${result.status}): ${command} ${commandArgs.join(' ')}`)
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'codegen-local-'))
try {
  let schemaFile = givenSchemaFile
  if (!schemaFile) {
    run(pnpm, ['-C', serverRoot, 'build'])
    schemaFile = path.join(scratch, 'schema.graphql')
    run(process.execPath, [path.join(serverRoot, 'scripts', 'print-graphql-schema.mjs'), schemaFile])
  } else if (!fs.existsSync(schemaFile)) {
    throw new Error(`Schema file not found: ${schemaFile}`)
  }

  const output = check ? path.join(scratch, 'graphql.ts') : committedFile
  run(pnpm, ['exec', 'graphql-codegen', '--require', 'dotenv/config', '--config', 'codegen.ts'], {
    env: { BACKEND_GRAPHQL_BASE_URL: schemaFile, CODEGEN_OUTPUT: output },
  })

  if (check) {
    if (!fs.readFileSync(output).equals(fs.readFileSync(committedFile))) {
      console.error('autobyteus-web/generated/graphql.ts is out of date with the server schema. Run: pnpm -C autobyteus-web codegen:local')
      process.exitCode = 1
    } else {
      console.log('autobyteus-web/generated/graphql.ts is current.')
    }
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  fs.rmSync(scratch, { recursive: true, force: true })
}
