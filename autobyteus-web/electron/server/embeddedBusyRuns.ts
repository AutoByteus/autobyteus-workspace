/** Main asks only its embedded node, with that launch's credential. Missing evidence is never idle. */
export async function fetchBusyRuns(baseUrl: string, credential: string | null): Promise<{ busy: number; unknown: number } | null> {
  if (!credential) return null
  try {
    const res = await fetch(`${baseUrl}/rest/busy-runs`, { headers: { authorization: `Bearer ${credential}` },
      redirect: 'error', signal: AbortSignal.timeout(10_000) })
    if (res.status !== 200) return null
    const { busy, unknown } = await res.json()
    return Number.isSafeInteger(busy) && busy >= 0 && Number.isSafeInteger(unknown) && unknown >= 0 ? { busy, unknown } : null
  } catch { return null }
}
