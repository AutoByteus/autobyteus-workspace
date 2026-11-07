import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { THIS_COMPUTER_NETWORK_ID } from "../domain/models.js";

const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = 1000;

/** The default route of this computer: its interface and the hardware address of its gateway (the router). */
export type DefaultRoute = {
  interfaceName: string | null;
  gatewayHardwareAddress: string | null;
};

const NO_DEFAULT_ROUTE: DefaultRoute = { interfaceName: null, gatewayHardwareAddress: null };

/** Lower-case, two hex digits per byte (macOS `arp` prints `a:b:…`). `null` for anything that is not a usable hardware address. */
export const normalizeHardwareAddress = (value: string | null | undefined): string | null => {
  const parts = String(value ?? "").trim().toLowerCase().split(":");
  if (parts.length !== 6 || !parts.every((part) => /^[0-9a-f]{1,2}$/.test(part))) {
    return null;
  }
  const normalized = parts.map((part) => part.padStart(2, "0")).join(":");
  return normalized === "00:00:00:00:00:00" || normalized === "ff:ff:ff:ff:ff:ff" ? null : normalized;
};

/** `gw_<first 16 hex of sha256>` of the router's hardware address, or `this-computer` when the network cannot be recognised. */
export const localNetworkIdFor = (gatewayHardwareAddress: string | null): string =>
  gatewayHardwareAddress
    ? `gw_${createHash("sha256").update(gatewayHardwareAddress, "utf8").digest("hex").slice(0, 16)}`
    : THIS_COMPUTER_NETWORK_ID;

/** macOS `route -n get default` output → gateway and interface. */
export const parseMacosRouteGetDefault = (output: string): { gateway: string | null; interfaceName: string | null } => {
  const field = (name: string): string | null => {
    const match = output.match(new RegExp(`^\\s*${name}:\\s*(\\S+)\\s*$`, "m"));
    return match?.[1] ?? null;
  };
  return { gateway: field("gateway"), interfaceName: field("interface") };
};

/** macOS `arp -n <ip>` output → hardware address (`? (192.0.2.1) at a:b:c:d:e:f on en0 …`). */
export const parseMacosArp = (output: string): string | null => {
  const match = output.match(/\sat\s+([0-9a-fA-F:]+)\s/);
  return normalizeHardwareAddress(match?.[1]);
};

const hexToIpv4 = (littleEndianHex: string): string | null => {
  if (!/^[0-9a-fA-F]{8}$/.test(littleEndianHex)) {
    return null;
  }
  const bytes = [6, 4, 2, 0].map((offset) => Number.parseInt(littleEndianHex.slice(offset, offset + 2), 16));
  return bytes.join(".");
};

/** Linux `/proc/net/route` → the up default route with a gateway and the lowest metric. */
export const parseLinuxProcRoute = (content: string): { gateway: string | null; interfaceName: string | null } => {
  const RTF_UP = 0x1;
  const RTF_GATEWAY = 0x2;
  let best: { gateway: string; interfaceName: string; metric: number } | null = null;
  for (const line of content.split("\n").slice(1)) {
    const [iface, destination, gatewayHex, flagsHex, , , metric] = line.trim().split(/\s+/);
    if (!iface || destination !== "00000000" || !gatewayHex || !flagsHex) {
      continue;
    }
    const flags = Number.parseInt(flagsHex, 16);
    if ((flags & RTF_UP) === 0 || (flags & RTF_GATEWAY) === 0) {
      continue;
    }
    const gateway = hexToIpv4(gatewayHex);
    const metricValue = Number(metric ?? 0);
    if (gateway && (!best || metricValue < best.metric)) {
      best = { gateway, interfaceName: iface, metric: metricValue };
    }
  }
  return best ? { gateway: best.gateway, interfaceName: best.interfaceName } : { gateway: null, interfaceName: null };
};

/** Linux `/proc/net/arp` → hardware address of `ip` (complete entries only). */
export const parseLinuxProcArp = (content: string, ip: string): string | null => {
  for (const line of content.split("\n").slice(1)) {
    const [address, , flagsHex, hardwareAddress] = line.trim().split(/\s+/);
    if (address === ip && flagsHex && (Number.parseInt(flagsHex, 16) & 0x2) !== 0) {
      return normalizeHardwareAddress(hardwareAddress);
    }
  }
  return null;
};

const readMacosDefaultRoute = async (): Promise<DefaultRoute> => {
  const { stdout: routeOutput } = await execFileAsync("/sbin/route", ["-n", "get", "default"], { timeout: COMMAND_TIMEOUT_MS });
  const route = parseMacosRouteGetDefault(routeOutput);
  if (!route.gateway) {
    return { interfaceName: route.interfaceName, gatewayHardwareAddress: null };
  }
  try {
    const { stdout: arpOutput } = await execFileAsync("/usr/sbin/arp", ["-n", route.gateway], { timeout: COMMAND_TIMEOUT_MS });
    return { interfaceName: route.interfaceName, gatewayHardwareAddress: parseMacosArp(arpOutput) };
  } catch {
    return { interfaceName: route.interfaceName, gatewayHardwareAddress: null };
  }
};

const readLinuxDefaultRoute = async (): Promise<DefaultRoute> => {
  const route = parseLinuxProcRoute(await readFile("/proc/net/route", "utf8"));
  if (!route.gateway) {
    return { interfaceName: route.interfaceName, gatewayHardwareAddress: null };
  }
  try {
    return {
      interfaceName: route.interfaceName,
      gatewayHardwareAddress: parseLinuxProcArp(await readFile("/proc/net/arp", "utf8"), route.gateway),
    };
  } catch {
    return { interfaceName: route.interfaceName, gatewayHardwareAddress: null };
  }
};

/** Reads the default route on macOS and Linux; on other systems, or when it cannot be read, there is none. */
export const readDefaultRoute = async (platform: NodeJS.Platform = process.platform): Promise<DefaultRoute> => {
  try {
    if (platform === "darwin") {
      return await readMacosDefaultRoute();
    }
    if (platform === "linux") {
      return await readLinuxDefaultRoute();
    }
  } catch {
    // No default route (offline) or the system refused the read: the network is not recognised.
  }
  return NO_DEFAULT_ROUTE;
};
