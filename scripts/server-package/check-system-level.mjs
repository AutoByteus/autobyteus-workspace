#!/usr/bin/env node
// Fails when the image's system part changed without a new system level.
//
// The system part is what an image provides beyond its server package: the pinned chrome-vnc
// base images and the runtime stage of Dockerfile.monorepo from its `FROM … AS runtime` line
// through the end-of-system-part marker (system tools, agent CLIs). system-level.json records
// its level, the base image digest of each variant and the SHA-256 of these inputs. A server
// package records the level it needs; a node refuses a package that needs a higher level than
// its image provides. So any change to the inputs must raise the level. Node built-ins only.
//
//   node scripts/server-package/check-system-level.mjs [--dockerfile <path>] [--system-level <path>]
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dockerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../autobyteus-server-ts/docker')
const SYSTEM_PART_START = /^FROM \S+ AS runtime$/
const SYSTEM_PART_END = '# ---- end of the system part (system-level.json) ----'
const DEFAULT_DIGEST_ARG = /^ARG BASE_IMAGE_DIGEST=(\S+)$/m

function fail(message) {
  console.error(`check-system-level: ${message}`)
  process.exit(1)
}

const argv = process.argv.slice(2)
const option = (name, fallback) => {
  const index = argv.indexOf(`--${name}`)
  return index < 0 ? fallback : argv[index + 1]
}
const dockerfilePath = option('dockerfile', path.join(dockerDir, 'Dockerfile.monorepo'))
const systemLevelPath = option('system-level', path.join(dockerDir, 'system-level.json'))

const dockerfile = readFileSync(dockerfilePath, 'utf8')
const systemLevel = JSON.parse(readFileSync(systemLevelPath, 'utf8'))

const lines = dockerfile.split('\n')
const start = lines.findIndex((line) => SYSTEM_PART_START.test(line))
const end = lines.indexOf(SYSTEM_PART_END)
if (start < 0 || end < start) fail(`${dockerfilePath} has no runtime stage ending with '${SYSTEM_PART_END}'`)
const systemPart = lines.slice(start, end + 1).join('\n')

const defaultDigest = dockerfile.match(DEFAULT_DIGEST_ARG)?.[1]
if (defaultDigest !== systemLevel.baseImages?.default) {
  fail(`ARG BASE_IMAGE_DIGEST in ${dockerfilePath} (${defaultDigest}) must equal baseImages.default in ` +
    `${systemLevelPath} (${systemLevel.baseImages?.default})`)
}

const inputsSha256 = createHash('sha256')
  .update(JSON.stringify({ baseImages: systemLevel.baseImages, systemPart }))
  .digest('hex')
if (inputsSha256 !== systemLevel.systemInputsSha256) {
  fail(`the image's system part changed (base image digests or the Dockerfile runtime stage up to the ` +
    `end-of-system-part marker). Server packages built from it may need what older images lack, so raise ` +
    `"level" in ${systemLevelPath} to ${systemLevel.level + 1} and set "systemInputsSha256" to "${inputsSha256}".`)
}
console.log(`System level ${systemLevel.level}: the system part is unchanged (${inputsSha256})`)
