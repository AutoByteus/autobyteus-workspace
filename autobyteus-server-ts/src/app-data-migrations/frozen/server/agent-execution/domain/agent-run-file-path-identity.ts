export const normalizeAgentRunFilePathDisplay = (value: string): string =>
  value.replace(/\\/g, "/").trim();
