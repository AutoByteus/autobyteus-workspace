export type BrowserShellReadyState = 'domcontentloaded' | 'load';

export type BrowserHostBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BrowserShellTabSummary = {
  tab_id: string;
  title: string | null;
  url: string;
};

export type BrowserShellOpenTabRequest = {
  url: string;
  title?: string | null;
  reuseExisting?: boolean;
  waitUntil?: BrowserShellReadyState;
};

export type BrowserShellNavigateTabRequest = {
  tabId: string;
  url: string;
  waitUntil?: BrowserShellReadyState;
};

export type BrowserShellReloadTabRequest = {
  tabId: string;
  waitUntil?: BrowserShellReadyState;
};

export type BrowserShellSnapshot = {
  activeTabId: string | null;
  sessions: BrowserShellTabSummary[];
};
