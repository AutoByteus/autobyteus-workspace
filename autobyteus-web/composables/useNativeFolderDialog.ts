export async function pickFolderPath(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.electronAPI?.showFolderDialog) {
    return null;
  }

  try {
    const result = await window.electronAPI.showFolderDialog();
    if (result.canceled || !result.path) {
      return null;
    }
    return result.path;
  } catch (error) {
    console.error('Failed to open folder dialog:', error);
    return null;
  }
}
