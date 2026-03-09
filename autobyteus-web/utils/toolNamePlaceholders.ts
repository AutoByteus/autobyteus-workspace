export const isPlaceholderToolName = (value: string | null | undefined): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized === 'missing_tool_name' ||
    normalized === 'tool_call' ||
    normalized === 'unknown_tool'
  );
};
