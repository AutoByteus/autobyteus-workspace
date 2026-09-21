import type { ExistingRunModelSelection } from '~/types/agent/ExistingRunModelConfigDraft'
import { cloneExistingRunSelection, existingRunSelectionsEqual } from './existingAgentModelConfigDraft'

export type ExistingHierarchicalModelConfigScope<K extends string = string> = Readonly<{
  scopeKind: K
  address: string
  parentAddress: string | null
  runtimeKind: string
  originalSelection: ExistingRunModelSelection
  draftSelection: ExistingRunModelSelection
  linkedToParentAtDraftStart: boolean
  directlyEdited: boolean
}>

export type ExistingHierarchicalModelConfigDraft<K extends string = string> = Readonly<{
  scopesByAddress: Readonly<Record<string, ExistingHierarchicalModelConfigScope<K>>>
  childAddressesByParent: Readonly<Record<string, readonly string[]>>
}>

export type ExistingHierarchicalModelConfigPatch<K extends string = string> = Readonly<{
  scopeKind: K
  scopeAddress: string
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
}>

export const createExistingHierarchicalModelConfigDraft = <K extends string>(
  scopes: readonly Omit<ExistingHierarchicalModelConfigScope<K>, 'draftSelection' | 'directlyEdited'>[],
): ExistingHierarchicalModelConfigDraft<K> => {
  const scopesByAddress: Record<string, ExistingHierarchicalModelConfigScope<K>> = {}
  const childAddressesByParent: Record<string, string[]> = {}
  for (const scope of scopes) {
    if (!scope.address || scopesByAddress[scope.address]) throw new Error(`Duplicate or invalid configured scope '${scope.address}'.`)
    if (scope.parentAddress && !scopesByAddress[scope.parentAddress]) throw new Error(`Configured scope parent '${scope.parentAddress}' was not found.`)
    scopesByAddress[scope.address] = { ...scope,
      originalSelection: cloneExistingRunSelection(scope.originalSelection),
      draftSelection: cloneExistingRunSelection(scope.originalSelection), directlyEdited: false }
    if (scope.parentAddress) (childAddressesByParent[scope.parentAddress] ??= []).push(scope.address)
  }
  return { scopesByAddress, childAddressesByParent }
}

export const updateExistingHierarchicalScopeModelConfig = <K extends string>(
  draft: ExistingHierarchicalModelConfigDraft<K>,
  address: string,
  selection: ExistingRunModelSelection,
  directlyEdited = true,
): ExistingHierarchicalModelConfigDraft<K> => {
  if (!draft.scopesByAddress[address]) throw new Error(`Configured scope '${address}' was not found.`)
  const scopesByAddress: Record<string, ExistingHierarchicalModelConfigScope<K>> = { ...draft.scopesByAddress }
  const update = (currentAddress: string, inherited: ExistingRunModelSelection, direct: boolean): void => {
    const scope = scopesByAddress[currentAddress]!
    scopesByAddress[currentAddress] = { ...scope, draftSelection: cloneExistingRunSelection(inherited),
      directlyEdited: scope.directlyEdited || direct }
    for (const childAddress of draft.childAddressesByParent[currentAddress] ?? []) {
      const child = scopesByAddress[childAddress]!
      if (!child.linkedToParentAtDraftStart || child.directlyEdited) continue
      update(childAddress, inherited, false)
    }
  }
  update(address, selection, directlyEdited)
  return { ...draft, scopesByAddress }
}

export const planExistingHierarchicalModelConfigPatches = <K extends string>(
  draft: ExistingHierarchicalModelConfigDraft<K>,
): ExistingHierarchicalModelConfigPatch<K>[] => Object.values(draft.scopesByAddress)
  .filter((scope) => !existingRunSelectionsEqual(scope.originalSelection, scope.draftSelection))
  .sort((left, right) => left.address.localeCompare(right.address))
  .map((scope) => ({ scopeKind: scope.scopeKind, scopeAddress: scope.address,
    ...cloneExistingRunSelection(scope.draftSelection) }))
