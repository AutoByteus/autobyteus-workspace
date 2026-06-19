import { execFileSync } from 'child_process'

export interface CodeSignInvocation {
  targetPath: string
  identity: string
  keychain?: string
  entitlements?: string
  hardenedRuntime?: boolean
  requirements?: string
  timestamp?: string
  additionalArguments?: string[]
}

export interface VerifyInvocation {
  appPath: string
  strictVerify?: boolean | string[]
}

export function signPath(invocation: CodeSignInvocation): void {
  const args = ['--sign', invocation.identity, '--force']
  if (invocation.keychain) args.push('--keychain', invocation.keychain)
  appendCommonArguments(args, invocation)
  if (invocation.entitlements) args.push('--entitlements', invocation.entitlements)
  args.push(invocation.targetPath)
  runCodesign(args)
}

export function verifySignedApp(invocation: VerifyInvocation): void {
  const args = ['--verify', '--deep']
  if (invocation.strictVerify !== false) {
    if (Array.isArray(invocation.strictVerify) && invocation.strictVerify.length > 0) {
      args.push(`--strict=${invocation.strictVerify.join(',')}`)
    } else {
      args.push('--strict')
    }
  }
  args.push('--verbose=2', invocation.appPath)
  runCodesign(args)
}

function appendCommonArguments(args: string[], invocation: CodeSignInvocation): void {
  if (invocation.requirements) {
    if (invocation.requirements.startsWith('=')) {
      args.push(`-r${invocation.requirements}`)
    } else {
      args.push('--requirements', invocation.requirements)
    }
  }

  if (invocation.hardenedRuntime !== false) args.push('--options', 'runtime')

  if (!isTimestampDisabled()) {
    args.push(invocation.timestamp ? `--timestamp=${invocation.timestamp}` : '--timestamp')
  }

  if (invocation.additionalArguments?.length) args.push(...invocation.additionalArguments)
}

function isTimestampDisabled(): boolean {
  return process.env.NO_TIMESTAMP === '1' || process.env.CSC_DISABLE_TIMESTAMP === 'true'
}

function runCodesign(args: string[]): void {
  try {
    execFileSync('codesign', args, { stdio: 'pipe' })
  } catch (error: any) {
    const stdout = error.stdout?.toString?.() ?? ''
    const stderr = error.stderr?.toString?.() ?? ''
    throw new Error(`codesign ${args.join(' ')} failed\n${stdout}${stderr}`.trim())
  }
}
