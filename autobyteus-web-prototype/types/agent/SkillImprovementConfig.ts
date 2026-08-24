export type SkillImprovementTriggerStrategyName = 'manual_only' | 'scheduled' | 'signal_based'
export type SkillImprovementImproverStrategyName = 'single_agent' | 'agent_team'

export interface SkillImprovementEffectiveConfig {
  enabled: boolean
  triggerStrategy: SkillImprovementTriggerStrategyName
  improverStrategy: SkillImprovementImproverStrategyName
  improverAgentDefinitionId?: string | null
  resolvedAt: string
  sourceTrace: Array<{ source: string; fields: string[] }>
}
