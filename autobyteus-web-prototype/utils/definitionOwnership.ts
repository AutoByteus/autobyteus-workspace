export type DefinitionOwnershipScope = 'SHARED' | 'TEAM_LOCAL' | 'APPLICATION_OWNED'

export interface DefinitionOwnershipRecord {
  ownershipScope?: DefinitionOwnershipScope | string | null
}

export interface ApplicationOwnershipProvenance {
  ownerApplicationName?: string | null
  ownerLocalApplicationId?: string | null
  ownerApplicationId?: string | null
  ownerPackageId?: string | null
}

export const normalizeDefinitionOwnershipScope = (
  value: DefinitionOwnershipScope | string | DefinitionOwnershipRecord | null | undefined,
): DefinitionOwnershipScope => {
  const rawValue = typeof value === 'object' && value !== null
    ? value.ownershipScope
    : value
  const normalizedValue = typeof rawValue === 'string'
    ? rawValue.trim().toUpperCase()
    : rawValue

  if (normalizedValue === 'TEAM_LOCAL' || normalizedValue === 'APPLICATION_OWNED') {
    return normalizedValue
  }
  return 'SHARED'
}

export const formatApplicationOwnershipName = (
  provenance: ApplicationOwnershipProvenance,
): string => (
  provenance.ownerApplicationName?.trim()
  || provenance.ownerLocalApplicationId?.trim()
  || provenance.ownerApplicationId?.trim()
  || provenance.ownerPackageId?.trim()
  || 'Application bundle'
)

export const formatApplicationOwnershipLabel = (
  provenance: ApplicationOwnershipProvenance,
): string => {
  const applicationName = formatApplicationOwnershipName(provenance)
  const packageId = provenance.ownerPackageId?.trim()
  return packageId && packageId !== applicationName ? `${applicationName} · ${packageId}` : applicationName
}
