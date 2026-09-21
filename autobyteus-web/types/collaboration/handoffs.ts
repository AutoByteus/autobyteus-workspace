export type HandoffEndpointOption = Readonly<{
  id: string
  kind: 'agent' | 'team'
  label: string
  address: string
  group: string
  coordinatorAddress?: string
}>

export type EditableHandoff = {
  id: string
  fromAddress: string
  toAddress: string
  when: string[]
}

export type DefinitionHandoff = Readonly<{
  from: string
  to: string
  rules: readonly string[]
}>

export const toEditableHandoffs = (handoffs: readonly DefinitionHandoff[] | null | undefined): EditableHandoff[] =>
  (handoffs ?? []).map((handoff, index) => ({
    id: `handoff-${index}-${handoff.from}-${handoff.to}`,
    fromAddress: handoff.from,
    toAddress: handoff.to,
    when: [...handoff.rules],
  }))

export const toDefinitionHandoffs = (handoffs: readonly EditableHandoff[]): DefinitionHandoff[] =>
  handoffs.map((handoff) => ({
    from: handoff.fromAddress,
    to: handoff.toAddress,
    rules: handoff.when.map((condition) => condition.trim()),
  }))
