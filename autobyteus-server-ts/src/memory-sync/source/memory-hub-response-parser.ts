export const parseMemoryHubJsonResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  let parsed: unknown = null;
  if (text.trim()) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text };
    }
  }
  if (!response.ok) {
    const message = typeof parsed === "object" && parsed && "message" in parsed
      ? String((parsed as { message?: unknown }).message)
      : `Memory Hub request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  return parsed as T;
};
