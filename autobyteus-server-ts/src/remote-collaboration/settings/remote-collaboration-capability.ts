import type { ServerSettingsService } from "../../services/server-settings-service.js";

export const REMOTE_COLLABORATION_CAPABILITY_SETTING_KEY = "ENABLE_REMOTE_COLLABORATION";

export type RemoteCollaborationCapabilityState = Readonly<{
  enabled: boolean;
  settingKey: typeof REMOTE_COLLABORATION_CAPABILITY_SETTING_KEY;
  /** `DEFAULT_DISABLED` until the owner sets the switch (off by default, REQ-101). */
  source: "SERVER_SETTING" | "DEFAULT_DISABLED";
}>;

/**
 * The node's remote collaboration switch (REQ-101), `ENABLE_REMOTE_COLLABORATION` in `<data>/.env`, written
 * through the existing feature-capability setting mechanism. Absent or anything but `true` means off.
 */
export class RemoteCollaborationCapability {
  constructor(private readonly settings: Pick<ServerSettingsService, "getBooleanSetting" | "setBooleanSetting">) {}

  isEnabled(): boolean { return this.settings.getBooleanSetting(REMOTE_COLLABORATION_CAPABILITY_SETTING_KEY) === true; }

  getState(): RemoteCollaborationCapabilityState {
    const stored = this.settings.getBooleanSetting(REMOTE_COLLABORATION_CAPABILITY_SETTING_KEY);
    return Object.freeze({ enabled: stored === true, settingKey: REMOTE_COLLABORATION_CAPABILITY_SETTING_KEY,
      source: stored === null ? "DEFAULT_DISABLED" : "SERVER_SETTING" });
  }

  setEnabled(enabled: boolean): RemoteCollaborationCapabilityState {
    this.settings.setBooleanSetting(REMOTE_COLLABORATION_CAPABILITY_SETTING_KEY, enabled);
    return this.getState();
  }
}
