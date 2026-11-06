// AE-01 — AC-002/AC-003 executable probe (temporary, not committed).
//
// Proves, against a real backend process started with the REAL buildServerProcessEnv output
// (the actual fixed function, 'inherit-caller' policy, production-shaped inputs):
//   AC-002: a program sharing that exact process env sees neither PORT nor SERVER_PORT.
//   AC-003: the real get-port-please@3.2.0 package, under that exact env, picks its own
//           HMR range (24678-24698), not the backend's test port.
//
// Usage: npx tsx ae-01-probe.mts <worktree-root>
import { spawn } from 'node:child_process'
import * as net from 'node:net'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'

const worktreeRoot = process.argv[2]
if (!worktreeRoot) { console.error('usage: ae-01-probe.mts <worktree-root>'); process.exit(2) }

const { buildServerProcessEnv } = await import(
  path.join(worktreeRoot, 'autobyteus-web/electron/server/serverRuntimeEnv.ts')
)

async function freePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port
      srv.close(() => resolve(port))
    })
  })
}

async function waitForHealth(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`timed out waiting for ${url}`)
}

function runChild(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env })
    let stdout = ''; let stderr = ''
    child.stdout.on('data', (d) => { stdout += d.toString() })
    child.stderr.on('data', (d) => { stderr += d.toString() })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}

async function main() {
  const port = await freePort()
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'abp-ae01-data-'))
  await fs.mkdir(path.join(dataDir, 'db'), { recursive: true })
  const publicServerUrl = `http://127.0.0.1:${port}`
  const databaseUrl = `file:${path.join(dataDir, 'db', 'production.db')}`
  // AppConfig requires an on-disk .env in the data dir (same as a real first launch /
  // verify-packaged-server-startup.mjs); buildServerProcessEnv's own DATABASE_URL/DB_TYPE/
  // AUTOBYTEUS_SERVER_HOST values below are what the real desktop launch actually passes.
  await fs.writeFile(path.join(dataDir, '.env'), [
    'DB_TYPE=sqlite',
    `DATABASE_URL=${databaseUrl}`,
    `AUTOBYTEUS_SERVER_HOST=${publicServerUrl}`,
    'LOG_LEVEL=INFO',
    '',
  ].join('\n'))

  // Production-shaped caller env: a real shell env, with any caller-provided PORT/SERVER_PORT
  // removed first so the assertion below means what AC-001's note requires.
  const callerEnv: NodeJS.ProcessEnv = { ...process.env }
  delete callerEnv.PORT
  delete callerEnv.SERVER_PORT

  const composedEnv = buildServerProcessEnv({
    policy: 'inherit-caller',
    callerEnv,
    loginShellPath: callerEnv.PATH ?? null,
    appDataDir: dataDir,
    publicServerUrl,
    runtimeOverrides: {},
  }) as NodeJS.ProcessEnv

  console.log(JSON.stringify({ step: 'composed-env', hasPort: 'PORT' in composedEnv, hasServerPort: 'SERVER_PORT' in composedEnv }))

  const appJs = path.join(worktreeRoot, 'autobyteus-server-ts/dist/app.js')
  const backend = spawn(process.execPath, [appJs, '--port', String(port), '--data-dir', dataDir], {
    env: composedEnv,
    cwd: path.join(worktreeRoot, 'autobyteus-server-ts'),
  })
  let backendOut = ''
  backend.stdout.on('data', (d) => { backendOut += d.toString() })
  backend.stderr.on('data', (d) => { backendOut += d.toString() })

  try {
    await waitForHealth(`${publicServerUrl}/rest/health`, 30000)
    console.log(JSON.stringify({ step: 'backend-healthy', port, pid: backend.pid }))

    // AC-002: a program sharing the backend's exact process env (the real sink shape —
    // autobyteus-ts's pty-session.ts spawns a shell with `environment ?? process.env`).
    const envCheck = await runChild('/bin/sh', ['-c', 'printf "PORT=[%s]\\nSERVER_PORT=[%s]\\n" "$PORT" "$SERVER_PORT"'], composedEnv)
    console.log(JSON.stringify({ step: 'env-check', ...envCheck }))

    // AC-003: the real get-port-please package, called exactly as Nuxt's vite-builder does,
    // under the backend's exact composed env.
    const getPortPleaseEntry = path.join(
      worktreeRoot,
      'node_modules/.pnpm/get-port-please@3.2.0/node_modules/get-port-please/dist/index.mjs',
    )
    const probeScript = `
      const { getPort } = await import(${JSON.stringify(getPortPleaseEntry)});
      const chosen = await getPort({ portRange: [24678, 24698] });
      console.log(JSON.stringify({ chosen }));
    `
    const getPortResult = await runChild(process.execPath, ['--input-type=module', '-e', probeScript], composedEnv)
    console.log(JSON.stringify({ step: 'get-port-please', ...getPortResult }))

    const parsed = JSON.parse(getPortResult.stdout.trim().split('\n').pop() || '{}')
    console.log(JSON.stringify({ step: 'result', chosenPort: parsed.chosen, backendTestPort: port }))
  } finally {
    backend.kill('SIGTERM')
    await new Promise((r) => setTimeout(r, 500))
    await fs.rm(dataDir, { recursive: true, force: true })
    console.log(JSON.stringify({ step: 'cleanup-done' }))
    console.log('--- backend log (tail) ---')
    console.log(backendOut.split('\n').slice(-20).join('\n'))
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
