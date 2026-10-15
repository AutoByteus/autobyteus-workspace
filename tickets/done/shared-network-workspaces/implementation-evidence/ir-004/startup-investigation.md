# IR004 startup-boundary investigation (local implementation)

## Baseline reproduced personally

Current CRR003-input production hash c80ec19ffc7e496687b341738796f8c7c915af829209081779e43cffc88f5a85.
`baseline-binary.json` and `baseline-trace-result.json`: fresh credential-free
macOS26.6.2/25G83 native VM, one public create under077; mount_nfs74 after25.445s.
This repeats API-F001/CR002 without peers, injection or manual reconnect. Passive
loopback capture `baseline-trace-packets.log` shows TCP111 initially refused at
19:55:36.566, accepted two seconds later; the first RPC response comes later still.
No failure-time evidence establishes a required remote-lock/statd feature.

Primary Apple [activation source](https://github.com/apple-oss-distributions/NFS/blob/93733ffccece4daee73bf6306b291d1ae69130c0/nfsd/main.c)
shows launchctl completion/PID differs from later daemon service registration.
The [mount-helper source](https://github.com/apple-oss-distributions/NFS/blob/93733ffccece4daee73bf6306b291d1ae69130c0/mount_nfs/mount_nfs.c)
can emit remote-lock wording after EPROGUNAVAIL independently of locallocks.
These published sources explain the contracts, not exact guest binary identity.

## Rejected intermediate implementation evidence

- Candidate1 (`fixed-binary.json`): backend waits for TCP NFSv3 and MOUNTv3 NULL
  responses via legacy rpcinfo `-t`, with narrow startup conditions. Fresh
  `fixed-trace-result.json` passed12.439s, but `fixed-plain-result.json` failed10.916s
  with RPC Unable to send / Broken pipe. The first pass alone was insufficient.
- Candidate2 (`final-binary.json`, historical filename, NOT final accepted code):
  recognized that observed startup transport closure. `final-trace-result.json`
  still failed; legacy lookup reported Procedure unavailable. It was NOT treated
  as a blanket retry condition. `final-trace-packets.log` retains payload hex:
  port111 GETPORT query for100003/v3 at20:01:42.011713; query connection closes at
  timeout20:01:44.012666; new connection sends100003/v3 NULL TO PORT111 at
  20:01:44.013008; port111 replies accepted status3 at20:01:45.032573.
  Thus that diagnostic is not evidence that the real NFS NULL procedure is absent:
  the legacy helper addressed the wrong service after lookup failure. The later
  original GETPORT response contains port0; daemon registrations follow. This is
  specific observed protocol evidence, not an inferred statd/NLM requirement.
- Candidate3 (`transport-binary.json`) also failed12.949s with Procedure unavailable.
  Documented `-T tcp` takes the same implicit GETPORT path in this guest;
  `transport-trace-packets.log` captures the initial GETPORT, not its full later
  exchange. The complete wrong-port NULL is proven in candidate2 only. Changing the spelling alone does not
  repair the cold lookup behavior. No Procedure unavailable retry was added.
- Candidate4 explicitly reads the `rpcinfo -p` registration table, waits for both
  TCP v3 mappings, then sends NULL to those explicit ports with `-n` (same selected
  endpoint). A table alone is insufficient. This replaces implicit lookup entirely,
  not a fallback. Current-source execution is separately indexed in checks-and-limits.

The packet interpretation uses [ONC RPC record/call/reply definitions](https://www.rfc-editor.org/rfc/rfc5531.html#section-9)
and the [portmapper GETPORT contract](https://www.rfc-editor.org/rfc/rfc1833.html#section-3).
No vendor source or credentials were copied into production.

No alteration of nfsd ownership/enable/restart/update/start policy, source/UUID,
allowlist, mount flags, nonroot probe, pending receipts or supervisor lock policy.
RPC observation occurs only inside the existing Apple backend activation boundary;
no per-file/run/action outage isolation is added. DEC015/D001 remains deferred.

## Candidate4 trace and harness correction

`ports-trace-result.json`: public create PASS16.975s, source/mounted original
SHA, root executable/public modes, live launchd service, same source inode/UID/GID/
mode and source/mounted UUID all verified. Overall harness result is retained Fail:
the added private-mode assertion incorrectly required group0, whereas macOS inherits
root:admin (GID80) under Application Support. Owner0 and0700/0600 meet the contract;
no product permission change was needed. Harness corrected to check owner0/modes,
not irrelevant group0. Subsequent fresh runs never reuse this already-mounted VM.

`ports-trace-packets-rpc.json` is a limited decoder of complete IPv4 TCP records
from the retained hex dump (not a general reassembler). It observes two initial
DUMP timeouts, then incomplete registrations without NFS/MOUNT, then their daemon
registrations. `ports-trace-null-proof.json` indexes actual successful NULL replies
from ports2049/20048 before the mount path. Thus this is not a warm reconnect or
a test that merely waits for a command exit/PID/open port. Overall wall time is
not an outage or cold-start SLA; physical network proof remains outstanding.
