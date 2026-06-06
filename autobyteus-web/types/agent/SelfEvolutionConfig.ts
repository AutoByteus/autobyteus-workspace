export type SelfEvolutionTriggerStrategyName = 'manual_only' | 'scheduled' | 'signal_based'
export type SelfEvolutionEvolverStrategyName = 'single_agent' | 'agent_team'

export interface SelfEvolutionConfigOverride {
  enabled?: boolean | null
  triggerStrategy?: SelfEvolutionTriggerStrategyName | null
  evolverStrategy?: SelfEvolutionEvolverStrategyName | null
  evolverAgentDefinitionId?: string | null
}

export interface SelfEvolutionEffectiveConfig {
  enabled: boolean
  triggerStrategy: SelfEvolutionTriggerStrategyName
  evolverStrategy: SelfEvolutionEvolverStrategyName
  evolverAgentDefinitionId?: string | null
  resolvedAt: string
  sourceTrace: Array<{ source: string; fields: string[] }>
}
