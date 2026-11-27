import type { EventEmitter } from "node:events";
import { Bonjour } from "bonjour-service";

/** DNS-SD service type of AutoByteus nodes (contract §4b): `_autobyteus._tcp`. */
export const LOCAL_NETWORK_SERVICE_TYPE = "autobyteus";
/** A node ID as announced in TXT `id`. */
export const ANNOUNCED_NODE_ID = /^srv_[A-Za-z0-9_-]{32,}$/;

/** One announcement as it was published; `stop` withdraws it (goodbye packets). */
export type MdnsAnnouncement = Readonly<{ stop(callback?: () => void): void }>;

/** A service seen on the local network: its instance name, port, TXT record and addresses. */
export type MdnsService = Readonly<{ name: string; host: string; port: number; txt?: unknown; addresses?: readonly string[] }>;

export type MdnsBrowser = Readonly<{
  readonly services: readonly MdnsService[];
  /** Asks the network again (a fresh query). */
  update(): void;
  /** Drops the services whose records lapsed. */
  expire(): void;
  stop(): void;
}>;

/** The part of a DNS-SD/mDNS stack the announcer and browser use (the pure-JS `bonjour-service` in production). */
export type Mdns = Readonly<{
  publish(config: Readonly<{ name: string; type: string; port: number; txt: Readonly<Record<string, string>> }>): MdnsAnnouncement;
  find(config: Readonly<{ type: string }>): MdnsBrowser;
  destroy(callback?: () => void): void;
}>;

/** Makes an mDNS stack; `failed` hears a failure of its socket (the stack is then unusable). */
export type MdnsFactory = (failed: (error: Error) => void) => Mdns;

/**
 * A new mDNS stack on the local network's multicast group, created only while announcing or browsing. Its socket's
 * failures (port 5353 refused or taken) are reported, never thrown: the library would otherwise end the node.
 */
export const createBonjourMdns: MdnsFactory = (failed) => {
  const bonjour = new Bonjour({}, (error: Error) => failed(error));
  const socket = (bonjour as unknown as { server?: { mdns?: EventEmitter } }).server?.mdns;
  socket?.on("error", (error: Error) => failed(error));
  socket?.on("warning", () => undefined);
  return Object.freeze({
    publish: (config) => {
      const service = bonjour.publish({ ...config, txt: { ...config.txt } });
      return Object.freeze({ stop: (callback?: () => void) => { service.stop(callback); } });
    },
    find: (config) => {
      const browser = bonjour.find({ ...config });
      return Object.freeze({
        get services(): readonly MdnsService[] { return browser.services; },
        update: () => browser.update(),
        expire: () => browser.expire(),
        stop: () => browser.stop(),
      });
    },
    destroy: (callback) => {
      try { bonjour.destroy(callback); } catch { callback?.(); }
    },
  });
};
