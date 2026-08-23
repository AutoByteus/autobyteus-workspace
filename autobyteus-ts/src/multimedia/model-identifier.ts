export type HostScopedMultimediaModelIdentifier = {
  modelName: string;
  host: string;
};

export const buildHostScopedMultimediaModelIdentifier = (
  modelName: string,
  hostUrl: string,
): string => {
  let host = hostUrl;
  try {
    host = new URL(hostUrl).host || hostUrl;
  } catch {
    // Preserve the existing fallback for non-URL host values.
  }
  return `${modelName}@${host}`;
};

export const parseHostScopedMultimediaModelIdentifier = (
  identifier: string,
): HostScopedMultimediaModelIdentifier | null => {
  const separatorIndex = identifier.lastIndexOf('@');
  if (separatorIndex <= 0 || separatorIndex === identifier.length - 1) return null;
  return {
    modelName: identifier.slice(0, separatorIndex),
    host: identifier.slice(separatorIndex + 1),
  };
};
