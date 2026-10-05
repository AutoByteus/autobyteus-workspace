export interface ChatTargetOption {
  key: string
  kind: 'agent' | 'team'
  id: string
  name: string
  initials: string
  description: string
}

export const initialsFor = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AI'

export const filterTargets = (targets: readonly ChatTargetOption[], query: string): ChatTargetOption[] => {
  const q = query.trim().toLowerCase()
  if (!q) return [...targets]
  return targets.filter((target) => target.name.toLowerCase().includes(q) || target.id.toLowerCase().includes(q))
}

export const filterWorkspaceOptions = <T extends { name: string; path: string }>(items: readonly T[], query: string): T[] => {
  const q = query.trim().toLowerCase()
  if (!q) return [...items]
  return items.filter((item) => item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q))
}
