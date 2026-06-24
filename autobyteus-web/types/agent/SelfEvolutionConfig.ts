export type SelfEvolutionTriggerStrategyName = 'manual_only' | 'scheduled' | 'signal_based'
export type SelfEvolutionEvolverStrategyName = 'single_agent' | 'agent_team'

export interface SelfEvolutionEffectiveConfig {
  enabled: boolean
  triggerStrategy: SelfEvolutionTriggerStrategyName
  evolverStrategy: SelfEvolutionEvolverStrategyName
  evolverAgentDefinitionId?: string | null
  resolvedAt: string
  sourceTrace: Array<{ source: string; fields: string[] }>
}
