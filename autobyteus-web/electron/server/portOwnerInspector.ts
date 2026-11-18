import { execFile } from 'node:child_process'
import type { PortConflictDiagnostic } from '../../types/serverStatus'
export function parsePortOwners(output: string): PortConflictDiagnostic['owners'] {
  const owners = new Map<number, { pid: number; executable?: string }>()
  let current: { pid: number; executable?: string } | undefined
  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith('p')) {
      if (!/^p[1-9]\d*$/.test(line)) return []
      const pid = Number(line.slice(1))
      current = Number.isSafeInteger(pid) ? owners.get(pid) ?? { pid } : undefined
      if (current && owners.size < 8) owners.set(pid, current)
    } else if (line.startsWith('c') && current) {
      current.executable = line.slice(1).replace(/[\x00-\x1f\x7f-\x9f]/g, '').slice(0, 160)
    }
  }
  return [...owners.values()]
}
export async function inspectPortOwner(port: number): Promise<PortConflictDiagnostic> {
  const diagnostic: PortConflictDiagnostic = { kind: 'port-conflict', port, owners: [], inspection: 'unavailable', observedAt: new Date().toISOString() }
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !['darwin', 'linux'].includes(process.platform)) return diagnostic
  try {
    const output = await new Promise<string>((resolve, reject) => execFile('lsof',
      ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fpc'], { timeout: 1000, maxBuffer: 32768, encoding: 'utf8' },
      (error, stdout) => error ? reject(error) : resolve(stdout)))
    diagnostic.owners = parsePortOwners(output)
    if (diagnostic.owners.length) diagnostic.inspection = 'available'
  } catch { /* Advisory lookup failure must not obscure the bind conflict. */ }
  return diagnostic
}
