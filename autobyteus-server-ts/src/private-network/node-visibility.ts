import type { ServerSettingsService } from "../services/server-settings-service.js";

/** "Visible on my private network" (contract §1 `visible`). Absent means off. */
export const PRIVATE_NETWORK_VISIBLE_SETTING = "PRIVATE_NETWORK_VISIBLE";
/** "Visible on my local network" (contract §1 `visibleOnLocalNetwork`, D-6). Absent means off. */
export const LOCAL_NETWORK_VISIBLE_SETTING = "LOCAL_NETWORK_VISIBLE";

export class NodeVisibilityError extends Error {
  constructor(readonly code: "LOCAL_NETWORK_NOT_ALLOWED", message: string) {
    super(message);
    this.name = "NodeVisibilityError";
  }
}

export type NodeVisibilityState = Readonly<{ privateNetwork: boolean; localNetwork: boolean }>;

/**
 * Whether other nodes may find this node (autobyteus-661 contract §1, §4, §4b; REQ-005, REQ-018): two owner
 * switches in `<data>/.env`, off by default. Turning the local one on needs this node to accept connections from its
 * local network (the existing allowed-local-network setting): a node that is found must also be reachable there.
 */
export class NodeVisibility {
  constructor(private readonly dependencies: Readonly<{
    settings: Pick<ServerSettingsService, "getBooleanSetting" | "setBooleanSetting">;
    /** Whether this node accepts connections from the local network it is on now. */
    localNetworkAllowed(): Promise<boolean>;
    /** Told after every change (the local network announcement follows the switch). */
    changed?(state: NodeVisibilityState): void;
  }>) {}

  state(): NodeVisibilityState {
    return Object.freeze({
      privateNetwork: this.dependencies.settings.getBooleanSetting(PRIVATE_NETWORK_VISIBLE_SETTING) === true,
      localNetwork: this.dependencies.settings.getBooleanSetting(LOCAL_NETWORK_VISIBLE_SETTING) === true,
    });
  }

  async set(change: Readonly<{ privateNetwork?: boolean | null; localNetwork?: boolean | null }>): Promise<NodeVisibilityState> {
    if (change.localNetwork === true && !await this.dependencies.localNetworkAllowed()) {
      throw new NodeVisibilityError("LOCAL_NETWORK_NOT_ALLOWED",
        "To be visible on the local network, this node must accept connections from this local network first.");
    }
    if (typeof change.privateNetwork === "boolean") this.dependencies.settings.setBooleanSetting(PRIVATE_NETWORK_VISIBLE_SETTING, change.privateNetwork);
    if (typeof change.localNetwork === "boolean") this.dependencies.settings.setBooleanSetting(LOCAL_NETWORK_VISIBLE_SETTING, change.localNetwork);
    const state = this.state();
    this.dependencies.changed?.(state);
    return state;
  }
}
