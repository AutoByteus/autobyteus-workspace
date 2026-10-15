# IR009 local implementation checks

Final 14-command result: checks-result.json / run-local-checks.py. Seven Go packages
race + vet,70 top-level passes/212 first-level subcases; standalone installer child
skip is parent-invoked, not another standalone pass. Python18/17pass/1 Go-child skip.
Shell syntax, expected unqualified publish refusal, four CGO_DISABLED CLI builds,
native version and all test-package builds for Darwinamd64/Linuxarm64+amd64.
Linux-specific runtime tests not executed; common Linux shape/backend/config and
Docker lifecycle unit regressions executed on Darwin. No Linux product claim.

Focused tests: config source variants/roundtrip, strict complete plist/mapping,
fd held during command/closed afterward, command/plist/correlation/replacement/
permission failures, real installed trusted diskutil metadata read on own directory;
setup complete pending reuse, stale NewSource, unbound absent/existing, malformed/
old/mixed/hosted conflict, bind-save before later failure, persisted bytes unchanged
on mismatch, no-effects reconnect and detach with unavailable source.

Ten copied mutations fail intended durable tests; mutation-result.json + logs.
No production source left mutated. Copies outside forbidden source trees, all
owned test directories cleaned. Production size/scope/input and retained-candidate
hashes verified by audit-source.py / source-audit.json.

Important limits: new-source binding test begins immediately after nonroot creation
using Apply's real bindSource helper, then actual Apply fails at trusted probe
binary lookup. It is not privileged child creation or successful public setup.
Plan tests stop at backend selection after source/parent capture, before global
NFS config/ports. Detach fixture stops at mount observation. No synthesized unit
identity is claimed as public whole-host reboot or real volume replacement proof.

Initial compile and rerun harness error, intermediate passing checks and final
results all retained in attempts.md and candidate-1/attempt-2. Final source/current
metadata rebuilt and independently recomputed; no stale baseline claimed current.

No live app/data/profile/provider/VM/mount/export/job/container operation. No API,
E2E, independentphysical, signing/publication or release validation in this round.
CRR012 Fail/API005 Fail57.14% remain authoritative; API-F005-first gate remains.
