/** Opens a web address outside the app: the desktop app's own handler, or a new browser tab without an opener. */
export const openExternalLink = (url: string): void => {
  if (window.electronAPI?.openExternalLink) {
    try {
      window.electronAPI.openExternalLink(url);
      return;
    } catch (e) {
      console.error('Failed to open link using electronAPI.openExternalLink. Falling back to window.open.', e);
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer');
};
