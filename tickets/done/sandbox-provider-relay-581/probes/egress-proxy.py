#!/usr/bin/env python3
"""autobyteus-581 probe: an egress proxy for a sandbox on an internal Docker network.

usage: python3 -I egress-proxy.py LISTEN_PORT ALLOW_HOST:PORT [ALLOW_HOST:PORT ...] LOGFILE

Lets a sandbox reach the public internet (HTTPS CONNECT and plain HTTP), refuses every private, loopback,
link-local, carrier-grade and unique-local address (the user's computer, home network and other nodes),
except the listed host:port pairs (the relay node). Decides on the RESOLVED address, so a public name that
resolves to a private address is refused too. Logs one JSON line per request: target, decision. No bodies.
"""
import asyncio, ipaddress, json, socket, sys, time

PORT = int(sys.argv[1]); LOG = sys.argv[-1]; ALLOW = set(sys.argv[2:-1])
FORBIDDEN = 403


def log(**kw):
    kw["t"] = round(time.time(), 1)
    with open(LOG, "a") as f:
        f.write(json.dumps(kw) + "\n")


def private(ip):
    a = ipaddress.ip_address(ip)
    return a.is_private or a.is_loopback or a.is_link_local or a.is_reserved or a.is_multicast or a.is_unspecified \
        or (a.version == 4 and a in ipaddress.ip_network("100.64.0.0/10"))


async def decide(host, port):
    if f"{host}:{port}" in ALLOW:
        return "allow-listed", None
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError:
        return "deny-unresolved", None
    addrs = {i[4][0] for i in infos}
    if any(private(a) for a in addrs):
        return "deny-private", None
    return "allow-public", sorted(addrs)[0]


async def pipe(r, w):
    try:
        while (b := await r.read(65536)):
            w.write(b); await w.drain()
    except Exception:
        pass
    finally:
        w.close()


async def handle(r, w):
    try:
        head = (await r.readuntil(b"\r\n\r\n")).decode("latin-1")
    except Exception:
        w.close(); return
    first = head.split("\r\n", 1)[0]
    method, target = first.split(" ")[:2]
    if method == "CONNECT":
        host, _, port = target.rpartition(":")
    else:  # plain HTTP with an absolute URI
        rest = target.split("://", 1)[-1]
        hostport = rest.split("/", 1)[0]
        host, _, port = hostport.partition(":")
        port = port or "80"
    host = host.strip("[]")
    decision, addr = await decide(host, int(port))
    log(method=method, target=f"{host}:{port}", decision=decision)
    if decision.startswith("deny"):
        w.write(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"); await w.drain(); w.close(); return
    try:
        ur, uw = await asyncio.open_connection(addr or host, int(port))
    except Exception as e:
        log(target=f"{host}:{port}", decision="upstream-error", error=type(e).__name__)
        w.close(); return
    if method == "CONNECT":
        w.write(b"HTTP/1.1 200 Connection Established\r\n\r\n"); await w.drain()
    else:
        uw.write(head.encode("latin-1")); await uw.drain()
    await asyncio.gather(pipe(r, uw), pipe(ur, w))


async def main():
    server = await asyncio.start_server(handle, "0.0.0.0", PORT)
    log(decision="started", allow=sorted(ALLOW))
    await server.serve_forever()

asyncio.run(main())
