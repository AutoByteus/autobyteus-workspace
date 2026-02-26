type ProcessorOption = { name: string; isMandatory: boolean };

type ProcessorRegistry = {
  getOrderedProcessorOptions: () => ProcessorOption[];
};

const mandatoryNameSet = (registry: ProcessorRegistry): Set<string> =>
  new Set(
    registry
      .getOrderedProcessorOptions()
      .filter((option) => option.isMandatory)
      .map((option) => option.name),
  );

const mandatoryNameList = (registry: ProcessorRegistry): string[] =>
  registry
    .getOrderedProcessorOptions()
    .filter((option) => option.isMandatory)
    .map((option) => option.name);

export const filterOptionalProcessorNames = (
  names: Iterable<string> | null | undefined,
  registry: ProcessorRegistry,
): string[] => {
  if (!names) {
    return [];
  }
  const mandatory = mandatoryNameSet(registry);
  const result: string[] = [];
  for (const name of names) {
    if (!mandatory.has(name)) {
      result.push(name);
    }
  }
  return result;
};

export const mergeMandatoryAndOptional = (
  names: Iterable<string> | null | undefined,
  registry: ProcessorRegistry,
): string[] => {
  const mandatory = mandatoryNameList(registry);
  const optional = filterOptionalProcessorNames(names, registry);
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const name of [...mandatory, ...optional]) {
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    merged.push(name);
  }
  return merged;
};
