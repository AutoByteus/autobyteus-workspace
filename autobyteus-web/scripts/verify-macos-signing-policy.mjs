#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(scriptDir, '..')
const policy = require('../build/dist/macSigningPolicy.js')
const discovery = require('../build/dist/macSigningDiscovery.js')

function parseArgs(argv) {
  const args = { app: null }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--app') {
      args.app = argv[index + 1]
      index += 1
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  if (!args.app) throw new Error('Missing required --app <AutoByteus.app> argument')
  return args
}

function printHelp() {
  console.log('Usage: node scripts/verify-macos-signing-policy.mjs --app <path-to-AutoByteus.app>')
}

function runCodesign(args, options = {}) {
  try {
    return execFileSync('codesign', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    })
  } catch (error) {
    const stdout = error.stdout?.toString?.() ?? ''
    const stderr = error.stderr?.toString?.() ?? ''
    error.combinedOutput = `${stdout}${stderr}`
    throw error
  }
}

function verifyStructuralSignature(appPath) {
  runCodesign(['--verify', '--deep', '--strict', '--verbose=2', appPath])
}

function extractEntitlementKeys(subjectPath) {
  let output = ''
  try {
    output = runCodesign(['-d', '--entitlements', ':-', subjectPath])
  } catch (error) {
    output = error.combinedOutput ?? ''
    if (!/cannot read entitlement|entitlements.*not found|blob not found|code object is not signed/i.test(output)) {
      throw error
    }
  }

  return Array.from(output.matchAll(/<key>([^<]+)<\/key>/g), (match) => match[1]).filter(Boolean)
}

function expectedRootKeys() {
  const entitlementsPath = policy.resolveEntitlementsFile('root-app', webRoot)
  const fallbackPath = policy.resolveEntitlementsFile('root-app', process.cwd())
  const plistPath = fs.existsSync(entitlementsPath) ? entitlementsPath : fallbackPath
  const plist = fs.readFileSync(plistPath, 'utf8')
  return Array.from(plist.matchAll(/<key>([^<]+)<\/key>/g), (match) => match[1]).filter(Boolean)
}

function makeViolation(subject, observedKeys, reason) {
  return {
    path: subject.path,
    relativePath: subject.relativePath,
    observedKeys,
    expectedProfile: subject.entitlementProfile,
    reason,
  }
}

function verifyEntitlementPolicy(appPath) {
  const subjects = discovery.discoverMacSigningSubjects(appPath)
  const violations = []

  for (const subject of subjects) {
    const observedKeys = extractEntitlementKeys(subject.path)
    if (!subject.mayHaveEntitlementKeys && observedKeys.length > 0) {
      violations.push(makeViolation(
        subject,
        observedKeys,
        'non-app nested code must be signed without entitlement keys'
      ))
    }
  }

  for (const updaterPath of policy.mandatoryUpdaterPaths(appPath)) {
    if (!fs.existsSync(updaterPath.path)) {
      violations.push({
        path: updaterPath.path,
        relativePath: policy.toPolicyRelativePath(appPath, updaterPath.path),
        observedKeys: [],
        expectedProfile: 'none',
        reason: `mandatory updater executable is missing: ${updaterPath.name}`,
      })
      continue
    }

    const subject = policy.classifyMacSigningSubject(appPath, updaterPath.path)
    const observedKeys = extractEntitlementKeys(updaterPath.path)
    if (observedKeys.length > 0) {
      violations.push(makeViolation(
        subject,
        observedKeys,
        `${updaterPath.name} must not carry entitlement keys`
      ))
    }
  }

  const rootExecutable = path.join(appPath, 'Contents', 'MacOS', path.basename(appPath, '.app'))
  if (fs.existsSync(rootExecutable)) {
    const rootSubject = policy.classifyMacSigningSubject(appPath, rootExecutable)
    const rootKeys = extractEntitlementKeys(rootExecutable)
    const missingRootKeys = expectedRootKeys().filter((key) => !rootKeys.includes(key))
    if (missingRootKeys.length > 0) {
      violations.push(makeViolation(
        rootSubject,
        rootKeys,
        `root app executable is missing expected entitlement keys: ${missingRootKeys.join(', ')}`
      ))
    }
  }

  return { subjects, violations }
}

function printViolations(violations) {
  console.error(`[mac-signing-policy] Found ${violations.length} signing policy violation(s):`)
  for (const violation of violations) {
    const keys = violation.observedKeys.length > 0 ? violation.observedKeys.join(', ') : '(none)'
    console.error(`- ${violation.relativePath}`)
    console.error(`  expected profile: ${violation.expectedProfile}`)
    console.error(`  observed keys: ${keys}`)
    console.error(`  reason: ${violation.reason}`)
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const appPath = path.resolve(args.app)
  if (!fs.existsSync(appPath) || !appPath.endsWith('.app')) {
    throw new Error(`Invalid app bundle path: ${appPath}`)
  }
  if (process.platform !== 'darwin') {
    throw new Error('macOS signing policy verification requires macOS codesign')
  }

  verifyStructuralSignature(appPath)
  const { subjects, violations } = verifyEntitlementPolicy(appPath)
  if (violations.length > 0) {
    printViolations(violations)
    process.exit(1)
  }

  console.log(`[mac-signing-policy] Verified ${subjects.length} signing subject(s) in ${appPath}`)
  console.log('[mac-signing-policy] Squirrel and ShipIt have no entitlement keys')
}

try {
  main()
} catch (error) {
  console.error(`[mac-signing-policy] ${error.message}`)
  process.exit(1)
}
