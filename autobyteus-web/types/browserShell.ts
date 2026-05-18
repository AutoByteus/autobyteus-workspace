export type BrowserShellReadyState = 'domcontentloaded' | 'load';
export type BrowserShellDeviceEmulationMode = 'desktop' | 'mobile';

export type BrowserHostBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BrowserShellDeviceEmulationProfile = {
  width: number;
  height: number;
  deviceScaleFactor: number;
};

export type BrowserShellDeviceEmulationState =
  | {
      mode: 'desktop';
      profile: null;
    }
  | {
      mode: 'mobile';
      profile: BrowserShellDeviceEmulationProfile;
    };

export type BrowserShellTabSummary = {
  tab_id: string;
  title: string | null;
  url: string;
  deviceEmulation?: BrowserShellDeviceEmulationState;
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

export type BrowserShellSetDeviceEmulationRequest = {
  tabId: string;
  mode: BrowserShellDeviceEmulationMode;
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
};

export type BrowserShellSnapshot = {
  activeTabId: string | null;
  sessions: BrowserShellTabSummary[];
};
