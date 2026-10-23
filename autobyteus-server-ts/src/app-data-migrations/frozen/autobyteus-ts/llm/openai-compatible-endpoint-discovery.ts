const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} is required.`);
  }
  return normalized;
};

export const normalizeOpenAICompatibleEndpointBaseUrl = (value: string): string => {
  const normalized = normalizeRequiredString(value, 'baseUrl').replace(/\/+$/, '');

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new Error('baseUrl must be a valid absolute URL.');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('baseUrl must use http:// or https://.');
  }

  return parsedUrl.toString().replace(/\/+$/, '');
};
