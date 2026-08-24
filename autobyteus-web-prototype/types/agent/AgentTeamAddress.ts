export type AgentTeamAddress = string;

export const parseAgentTeamAddress = (value: unknown): AgentTeamAddress => {
  if (typeof value !== 'string' || !value || value !== value.trim()
    || !value.startsWith('/') || value.startsWith('./')) {
    throw new Error(`Invalid AgentTeam address '${String(value)}'.`);
  }
  if (value !== '/' && (value.endsWith('/') || value.includes('//') || value.includes('\\'))) {
    throw new Error(`Invalid AgentTeam address '${value}'.`);
  }
  const segments = value === '/' ? [] : value.slice(1).split('/');
  if (segments.some((segment) => !segment || segment !== segment.trim()
    || segment === '.' || segment === '..')) {
    throw new Error(`Invalid AgentTeam address '${value}'.`);
  }
  return value;
};

export const memberAddressBasename = (address: string): string => {
  const normalized = parseAgentTeamAddress(address);
  return normalized === '/' ? '/' : normalized.split('/').at(-1) ?? normalized;
};

export const parentAgentTeamAddress = (address: AgentTeamAddress): AgentTeamAddress | null => {
  const normalized = parseAgentTeamAddress(address);
  if (normalized === '/') return null;
  const segments = normalized.slice(1).split('/');
  segments.pop();
  return segments.length === 0 ? '/' : parseAgentTeamAddress(`/${segments.join('/')}`);
};
