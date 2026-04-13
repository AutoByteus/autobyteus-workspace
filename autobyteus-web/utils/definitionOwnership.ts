export interface ApplicationOwnershipProvenance {
  ownerApplicationName?: string | null
  ownerLocalApplicationId?: string | null
  ownerApplicationId?: string | null
  ownerPackageId?: string | null
}

export const formatApplicationOwnershipName = (
  provenance: ApplicationOwnershipProvenance,
): string => (
  provenance.ownerApplicationName?.trim()
  || provenance.ownerLocalApplicationId?.trim()
  || provenance.ownerApplicationId?.trim()
  || 'Application bundle'
)

export const formatApplicationOwnershipLabel = (
  provenance: ApplicationOwnershipProvenance,
): string => {
  const applicationName = formatApplicationOwnershipName(provenance)
  const packageId = provenance.ownerPackageId?.trim()
  return packageId ? `${applicationName} · ${packageId}` : applicationName
}
