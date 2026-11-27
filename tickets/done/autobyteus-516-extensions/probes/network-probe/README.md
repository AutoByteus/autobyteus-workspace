# Private Network probe (autobyteus-516, 2026-11-22)

Throwaway prototype of the "Private Network for Tailscale" idea, run entirely on
this Mac. Not production code. The founder's Tailscale account and devices were
not used; his running Tailscale was checked before and after (Running, 5 peers).

- `anet/main.go`: the "AutoByteus Network" program idea: one Tailscale `tsnet`
  node (library `tailscale.com` v1.104.7) in userspace mode, talking JSON lines on
  stdin/stdout (like the voice program), serving `/whoami` on its private address,
  which answers who the calling machine is and which account added it.
- `headscale-config.template.yaml`: a Headscale 0.29.7 coordination server on
  loopback (`127.0.0.1:18080`), relays from Tailscale's public relay map.
- `run-network-probe.mjs`: three machines: `ryan-mac` and `ryan-linux` (owner
  "ryan", one reusable join key), `bob-laptop` (teammate "bob", one-time key).

Tools (not in the repository): Go 1.27.4 and Headscale 0.29.7, downloaded and
checksum-verified into `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-probe-tools`
(kept for the Private Network stage; safe to delete).

Run:

```sh
T=/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-probe-tools
(cd anet && PATH=$T/go/bin:$PATH GOPATH=$T/gopath GOCACHE=$T/gocache GOTOOLCHAIN=local go build -o $T/anet .)
node run-network-probe.mjs $T "$(mktemp -d)"
```

## Result (Measured, 2026-11-22, darwin-arm64): 10/10 passed

- Three machines joined with join keys in 2.4 s, without administrator rights;
  no network device was created on the Mac (`ifconfig -l` unchanged); the real
  Tailscale untouched.
- `ryan-mac` lists the other machines with the account that added each and
  whether it is online.
- **Who is this connection** works: `ryan-linux` saw a call as
  `ryan-mac`/`ryan` (same owner → automatic pairing is possible); `ryan-mac`
  saw a call as `bob-laptop`/`bob` (another person → ask Allow).
- A restarted machine rejoins without any key (state kept): ready in 1.5 s,
  reachable from the others after 12.6 s.
- Removing `bob-laptop` on the coordination server cut its access after 11.1 s
  and removed it from the machine list.

## Not proved here (needs the founder's devices, in the Private Network stage)

Different networks and mobile data (direct vs relayed connections), the official
Android app, a real Tailscale account and its invites, forwarding to a real
AutoByteus server and the server's outgoing connections through the program.

## Findings for the design

1. The network program must run all the time while the extension is on and
   start with the node: the contract needs the optional `start` step in that
   stage (Voice Input starts its program on first use instead).
2. "Who is this connection" is available and reliable from the library: it is
   the basis for automatic pairing of the owner's machines and for showing a
   teammate's verified name on Allow. It changes the node access model (new
   identity source) and needs its own approval in that stage.
3. Expect ~11–13 s for a restart or a revocation to take effect.
