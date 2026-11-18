# Desktop release identity

One canonical UTF-8 JSON object and one LF, ordered fields:
`format, product, artifact, os, arch, version, channel, size, sha256, minWriter`.
Format/minWriter are 1. Product is `autobyteus-personal-desktop`; artifact
`AppImage`; os `linux`; arch `x64` or `arm64`. All fields are required; no
unknown, duplicate or differently cased fields, whitespace variants or noncanonical numbers.
Size is an integer in 1..2147483648. sha256 is 64 lowercase hex digits.
Version is canonical unsigned decimal major.minor.patch, optionally `-beta.N`;
channel must equal `stable` or `beta` accordingly. Numeric comparison must not
round: compare decimal components by length then lexically. Stable exceeds beta
at the same core. Only strictly newer releases are admitted. Stable preference
accepts only stable; beta preference accepts stable or beta.

The detached `.AppImage.release.json.sig` is exactly 88 ASCII standard-base64
bytes without LF, decoding to the 64-byte Ed25519 signature over the exact
`.AppImage.release.json` bytes. Record bound: 4096 bytes. No path, key, URL,
command or installer code in the record. The record covers the final entire
AppImage after all packaging/blockmap operations, never a pre-packaging input.

The nonroot writer and provisioner independently hash bytes received. Live
identity is the installed inode plus `user.autobyteus.release` (record bytes)
and `user.autobyteus.signature` (raw 64-byte signature) on that same inode.
A separate version file is not authoritative. Unknown/incomplete identity
requires repair, never version-zero admission.

First-install acquisition uses only build-pinned exact tagged identity and
bounded HTTPS sidecars (DS-003); never adjacent files or latest metadata.
Production and disposable build-only keys are separate trust domains.

## Local transaction lifetime

Writer IPC is one bounded JSON-line request, followed by signed-size payload and
EOF for stage/provision. A stage receipt names one opaque, single-use transaction
and the expected live digest; it never names a destination or executable command.
Completed stages have no wall-clock TTL. Consumption, discard, replacement,
writer restart or committed-baseline change invalidates them. Transfer deadlines
still bound incomplete requests. Activation re-verifies both inodes and admission.

The writer emits `code: "STAGE_GONE"` only for an absent/superseded receipt, not
channel/baseline/admission/integrity failures. The client preserves that typed
refusal. After confirmed old-baseline status, the session drops readiness and
only the matching provisional attempt marker. An ordinary quit still exits;
the next eligible automatic check may re-stage the cached release without a
permanent failure block. A manual restart exposes a localized retryable refusal
and safely reopens the old canonical image. Unknown status never means old.
