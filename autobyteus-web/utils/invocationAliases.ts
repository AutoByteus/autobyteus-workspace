export const buildInvocationAliases = (invocationId: string): string[] => {
  const trimmed = invocationId.trim();
  if (!trimmed) {
    return [];
  }

  const aliases = [trimmed];
  if (trimmed.includes(':')) {
    const base = trimmed.split(':')[0]?.trim();
    if (base && !aliases.includes(base)) {
      aliases.push(base);
    }
  }

  return aliases;
};

export const invocationIdsMatch = (
  left?: string | null,
  right?: string | null,
): boolean => {
  if (!left || !right) {
    return false;
  }

  const leftAliases = buildInvocationAliases(left);
  const rightAliases = buildInvocationAliases(right);
  return leftAliases.some((alias) => rightAliases.includes(alias));
};
