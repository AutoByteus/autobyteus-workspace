export enum SkillAccessMode {
  PRELOADED_ONLY = 'PRELOADED_ONLY',
  NONE = 'NONE'
}

export function resolveSkillAccessMode(
  requestedMode: SkillAccessMode | string | null | undefined,
  preloadedSkillCount: number
): SkillAccessMode {
  void preloadedSkillCount;

  if (
    requestedMode === undefined ||
    requestedMode === null ||
    requestedMode === SkillAccessMode.PRELOADED_ONLY
  ) {
    return SkillAccessMode.PRELOADED_ONLY;
  }

  if (requestedMode === SkillAccessMode.NONE) {
    return SkillAccessMode.NONE;
  }

  throw new Error(`Unsupported skill access mode '${requestedMode}'.`);
}
