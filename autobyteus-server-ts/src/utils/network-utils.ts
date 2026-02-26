import os from "node:os";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export function isPrivateIp(ip: string): boolean {
  if (typeof ip !== "string") {
    return false;
  }

  const octets = ip.split(".");
  if (octets.length !== 4) {
    return false;
  }

  for (const octet of octets) {
    if (!/^[0-9]+$/.test(octet)) {
      return false;
    }
    const num = Number(octet);
    if (!Number.isInteger(num) || num < 0 || num > 255) {
      return false;
    }
  }

  const [o1, o2] = octets.map((part) => Number(part));

  if (o1 === 10) {
    return true;
  }
  if (o1 === 172 && o2 >= 16 && o2 <= 31) {
    return true;
  }
  if (o1 === 192 && o2 === 168) {
    return true;
  }
  return false;
}

export function getLocalIp(): string | null {
  try {
    const interfaces = os.networkInterfaces();
    for (const addresses of Object.values(interfaces)) {
      if (!addresses) {
        continue;
      }
      for (const address of addresses) {
        if (address.family !== "IPv4" || address.internal) {
          continue;
        }
        if (isPrivateIp(address.address) && address.address !== "127.0.0.1") {
          logger.info(`Found local IP using network interfaces: ${address.address}`);
          return address.address;
        }
      }
    }

    logger.warn("No suitable local IP address found");
    return null;
  } catch (error) {
    logger.error(`Error reading network interfaces: ${String(error)}`);
    return null;
  }
}
