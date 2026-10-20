const SOURCE_TIMEOUT_MS = 10_000;

/** One GET of a vendor's latest-version source, with a time-out; throws on any failure. */
export const fetchRuntimeSource = async (url: string, headers: Record<string, string> = {}): Promise<string> => {
  const response = await fetch(url, {
    headers: { "User-Agent": "AutoByteus", ...headers },
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Update source answered HTTP ${response.status}.`);
  return response.text();
};
