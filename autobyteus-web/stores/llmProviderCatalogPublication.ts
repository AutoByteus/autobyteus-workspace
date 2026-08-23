import type { ProviderModelCatalogSnapshot } from './llmProviderConfigSupport'

export type ProviderRequestTokens = Readonly<Record<string, number>>

export const indexProviderCatalogSnapshots = (
  snapshots: readonly ProviderModelCatalogSnapshot[],
): Record<string, ProviderModelCatalogSnapshot> => Object.fromEntries(
  snapshots.map(snapshot => [snapshot.ownerProvider.id, snapshot]),
)

export const captureRuntimeProviderRequestTokens = (
  runtimeKind: string,
  requestIdsByKey: Readonly<Record<string, number>>,
): ProviderRequestTokens => {
  const prefix = `${runtimeKind}:`
  return Object.fromEntries(Object.entries(requestIdsByKey)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, requestId]) => [key.slice(prefix.length), requestId]))
}

export const mergeWholeCatalogProviders = (
  runtimeKind: string,
  incomingProviders: Readonly<Record<string, ProviderModelCatalogSnapshot>>,
  currentProviders: Readonly<Record<string, ProviderModelCatalogSnapshot>>,
  providerTokensAtReadStart: ProviderRequestTokens,
  currentRequestIdsByKey: Readonly<Record<string, number>>,
): Record<string, ProviderModelCatalogSnapshot> => {
  const providerIds = new Set([
    ...Object.keys(incomingProviders),
    ...Object.keys(currentProviders),
  ])
  const published: Record<string, ProviderModelCatalogSnapshot> = {}
  for (const providerId of providerIds) {
    const tokenAtReadStart = providerTokensAtReadStart[providerId] ?? 0
    const currentToken = currentRequestIdsByKey[`${runtimeKind}:${providerId}`] ?? 0
    const snapshot = currentToken === tokenAtReadStart
      ? incomingProviders[providerId]
      : currentProviders[providerId]
    if (snapshot) published[providerId] = snapshot
  }
  return published
}
