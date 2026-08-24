export interface VncHostConfig {
  id: string;
  name: string;
  url: string;
}

const normalizeUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('ws://') && !trimmed.startsWith('wss://')) {
    return `ws://${trimmed}`;
  }
  return trimmed;
};

export const parseCommaSeparatedHosts = (value: string): VncHostConfig[] => {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => ({
      id: `vnc-${index}`,
      name: entry,
      url: normalizeUrl(entry),
    }));
};
