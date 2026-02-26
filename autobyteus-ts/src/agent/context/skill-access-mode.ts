export enum SkillAccessMode {
  GLOBAL_DISCOVERY = 'GLOBAL_DISCOVERY',
  PRELOADED_ONLY = 'PRELOADED_ONLY',
  NONE = 'NONE'
}

export function resolveSkillAccessMode(
  requestedMode: SkillAccessMode | string | null | undefined,
  preloadedSkillCount: number
): SkillAccessMode {
  if (
    requestedMode === SkillAccessMode.GLOBAL_DISCOVERY ||
    requestedMode === SkillAccessMode.PRELOADED_ONLY ||
    requestedMode === SkillAccessMode.NONE
  ) {
    return requestedMode;
  }

  if (preloadedSkillCount > 0) {
    return SkillAccessMode.PRELOADED_ONLY;
  }

  return SkillAccessMode.GLOBAL_DISCOVERY;
}
