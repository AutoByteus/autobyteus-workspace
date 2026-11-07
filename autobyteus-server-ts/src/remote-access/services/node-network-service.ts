import { promises as dns } from "node:dns";
import os from "node:os";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { runsInContainer } from "../../server-addressing/runs-in-container.js";
import {
  RemoteAccessError,
  THIS_COMPUTER_NETWORK_ID,
  type NodeNetwork,
} from "../domain/models.js";
import {
  getAllowedLocalNetworkStore,
  type AllowedLocalNetworkStore,
} from "../stores/allowed-local-network-store.js";
import { readComputerName } from "./computer-name.js";
import { localNetworkIdFor, readDefaultRoute, type DefaultRoute } from "./default-route.js";
import {
  classifyInterfaces,
  flattenNetworkInterfaces,
  listTailscaleRangeTunnelAddresses,
  type InterfaceAddress,
} from "./network-interface-classifier.js";
import { isPhoneUnreachableLocalOnlyHost } from "./pairing-url-policy.js";
import { normalizeNodeBaseUrl } from "./url-normalization.js";

const NETWORK_ID_PATTERN = /^(?:gw_[0-9a-f]{16}|this-computer)$/;

/** The facts this service reads from the computer; replaced in tests. */
export type NodeNetworkFactsSource = {
  runsInContainer(): boolean;
  configuredBaseUrl(): string;
  networkInterfaces(): InterfaceAddress[];
  reverseLookup(address: string): Promise<string | null>;
  defaultRoute(): Promise<DefaultRoute>;
  computerName(): Promise<string>;
};

const reverseLookupWithShortTimeout = async (address: string): Promise<string | null> => {
  const resolver = new dns.Resolver({ timeout: 1000, tries: 1 });
  try {
    const names = await resolver.reverse(address);
    return names[0] ?? null;
  } catch {
    return null;
  }
};

const systemFactsSource: NodeNetworkFactsSource = {
  runsInContainer,
  configuredBaseUrl: () => appConfigProvider.config.getBaseUrl(),
  networkInterfaces: () => flattenNetworkInterfaces(os.networkInterfaces()),
  reverseLookup: reverseLookupWithShortTimeout,
  defaultRoute: () => readDefaultRoute(),
  computerName: () => readComputerName(),
};

/** The configured base URL, unless it is one a phone can never reach (loopback, `localhost`, `host.docker.internal`). */
const phoneReachableConfiguredBaseUrl = (raw: string): string | null => {
  try {
    const normalized = normalizeNodeBaseUrl(raw);
    return isPhoneUnreachableLocalOnlyHost(new URL(normalized).hostname) ? null : normalized;
  } catch {
    return null;
  }
};

/**
 * This computer's network facts as one node sees them, and the local networks the owner allowed phones on.
 * It runs no Tailscale command and changes nothing on the network.
 */
export class NodeNetworkService {
  constructor(
    private readonly facts: NodeNetworkFactsSource = systemFactsSource,
    private readonly allowedStore: AllowedLocalNetworkStore = getAllowedLocalNetworkStore(),
  ) {}

  async getNodeNetwork(): Promise<NodeNetwork> {
    const configuredBaseUrl = phoneReachableConfiguredBaseUrl(this.facts.configuredBaseUrl());
    const computerName = await this.facts.computerName();

    if (this.facts.runsInContainer()) {
      // A container sees only its own interfaces; the desktop composes ways from the host's facts.
      return {
        computerName,
        runsInContainer: true,
        configuredBaseUrl,
        tailscale: null,
        vpnAddresses: [],
        localNetwork: {
          networkId: THIS_COMPUTER_NETWORK_ID,
          addresses: [],
          allowed: await this.allowedStore.isAllowed(THIS_COMPUTER_NETWORK_ID),
        },
      };
    }

    const entries = this.facts.networkInterfaces();
    const tunnelAddresses = listTailscaleRangeTunnelAddresses(entries);
    const [defaultRoute, reverseNameList] = await Promise.all([
      this.facts.defaultRoute(),
      Promise.all(tunnelAddresses.map((address) => this.facts.reverseLookup(address))),
    ]);
    const reverseNames = new Map(tunnelAddresses.map((address, index) => [address, reverseNameList[index] ?? null]));
    const classified = classifyInterfaces({
      entries,
      reverseNames,
      defaultRouteInterfaceName: defaultRoute.interfaceName,
    });

    let localNetwork: NodeNetwork["localNetwork"] = null;
    if (classified.localAddresses.length > 0) {
      const networkId = localNetworkIdFor(defaultRoute.gatewayHardwareAddress);
      localNetwork = {
        networkId,
        addresses: classified.localAddresses,
        allowed: await this.allowedStore.isAllowed(networkId),
      };
    }

    return {
      computerName,
      runsInContainer: false,
      configuredBaseUrl,
      tailscale: classified.tailscale,
      vpnAddresses: classified.vpnAddresses,
      localNetwork,
    };
  }

  async setLocalNetworkAllowed(networkId: string, allowed: boolean): Promise<void> {
    if (!NETWORK_ID_PATTERN.test(networkId)) {
      throw new RemoteAccessError("REMOTE_ACCESS_NETWORK_ID_INVALID", "Unknown local network ID.", 400);
    }
    await this.allowedStore.setAllowed(networkId, allowed);
  }
}

let singleton: NodeNetworkService | null = null;

export const getNodeNetworkService = (): NodeNetworkService => {
  singleton ??= new NodeNetworkService();
  return singleton;
};
